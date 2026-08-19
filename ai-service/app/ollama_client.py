"""
Ollama HTTP client - mirrors the NestJS OllamaService.
"""

import asyncio
import base64
import logging
import os
from typing import Any, Literal, TypedDict

import httpx
from fastapi import HTTPException

from . import cloud_fallback
from .config import settings

logger = logging.getLogger(__name__)

_ollama_client: httpx.AsyncClient | None = None


def _get_ollama_client() -> httpx.AsyncClient:
    global _ollama_client
    if _ollama_client is None or getattr(_ollama_client, "is_closed", False):
        _ollama_client = httpx.AsyncClient(timeout=settings.ollama_timeout_extraction_s)
    return _ollama_client

TaskName = Literal[
    "chat",
    "grading",
    "classification",
    "quiz_generation",
    "intervention",
    "text_extraction",
    "lesson_enrichment",
    "vision_extraction",
    "vision_explanation",
]


class OllamaImage(TypedDict, total=False):
    filePath: str
    base64Data: str
    mimeType: str


TASK_PROFILES: dict[TaskName, dict[str, Any]] = {
    "chat": {
        "model_kind": "text",
        "temperature": 0.2,
        "num_predict": 768,
        "timeout": settings.ollama_timeout_chat_s,
    },
    "grading": {
        "model_kind": "text",
        "temperature": 0,
        "num_predict": 512,
        "timeout": settings.ollama_timeout_chat_s,
    },
    "classification": {
        "model_kind": "text",
        "temperature": 0,
        "num_predict": 256,
        "timeout": settings.ollama_timeout_chat_s,
    },
    "quiz_generation": {
        "model_kind": "text",
        "temperature": 0.2,
        "num_predict": 2048,
        "timeout": settings.ollama_timeout_quiz_generation_s,
    },
    "intervention": {
        "model_kind": "text",
        "temperature": 0.2,
        "num_predict": 1024,
        "timeout": settings.ollama_timeout_chat_s,
    },
    "text_extraction": {
        "model_kind": "text",
        "temperature": 0,
        "num_predict": 4096,
        "timeout": settings.ollama_timeout_extraction_s,
    },
    "vision_extraction": {
        "model_kind": "vision",
        "temperature": 0,
        "num_predict": 3072,
        "timeout": settings.ollama_timeout_extraction_s,
    },
    "vision_explanation": {
        "model_kind": "vision",
        "temperature": 0.2,
        "num_predict": 1024,
        "timeout": settings.ollama_timeout_chat_s,
    },
    "lesson_enrichment": {
        "model_kind": "text",
        "temperature": 0.2,
        "num_predict": 4096,
        "timeout": settings.ollama_timeout_enrichment_s,
    },
}


def _get_profile(task: TaskName) -> dict[str, Any]:
    return TASK_PROFILES[task]


def _runtime_mode() -> str:
    return settings.ai_runtime_mode.strip().lower() or "auto"


def _cloud_model_name(task: TaskName, images: list[OllamaImage] | None = None) -> str:
    profile = _get_profile(task)
    if images or profile["model_kind"] == "vision":
        return cloud_fallback.get_vision_model()
    return cloud_fallback.get_text_model()


def _resolve_model_name(task: TaskName, images: list[OllamaImage] | None = None) -> str:
    if _runtime_mode() == "cloud" and cloud_fallback.is_enabled():
        return _cloud_model_name(task, images)
    profile = _get_profile(task)
    if images or profile["model_kind"] == "vision":
        return settings.ollama_vision_model
    return settings.ollama_text_model


def _resolve_timeout(task: TaskName) -> int:
    return _get_profile(task)["timeout"]


async def _resolve_image_payload(images: list[OllamaImage] | None) -> list[str]:
    encoded: list[str] = []
    for image in images or []:
        if image.get("base64Data"):
            encoded.append(image["base64Data"])
            continue
        file_path = (image.get("filePath") or "").strip()
        if not file_path:
            continue

        def _read() -> str:
            with open(file_path, "rb") as file_obj:
                return base64.b64encode(file_obj.read()).decode("utf-8")

        encoded.append(await asyncio.to_thread(_read))
    return encoded


def _build_request_options(
    task: TaskName,
    *,
    temperature: float | None = None,
    num_predict: int | None = None,
) -> dict[str, Any]:
    profile = _get_profile(task)
    return {
        "temperature": profile["temperature"] if temperature is None else temperature,
        "num_predict": profile["num_predict"] if num_predict is None else num_predict,
    }


async def is_available() -> dict[str, Any]:
    cloud_status = cloud_fallback.get_status()
    try:
        client = _get_ollama_client()
        resp = await client.get(f"{settings.ollama_base_url}/api/tags", timeout=5.0)
        if resp.status_code == 200:
            body = resp.json()
            ollama_models = [m["name"] for m in body.get("models", [])]
            ollama_available = True
        else:
            ollama_models = []
            ollama_available = False
    except Exception:
        ollama_models = []
        ollama_available = False

    mode = _runtime_mode()
    if mode == "cloud":
        provider = cloud_status["provider"] if cloud_status["available"] else "none"
        models = cloud_status["models"] if cloud_status["available"] else []
        available = bool(cloud_status["available"])
    elif mode == "auto" and not ollama_available and cloud_status["available"]:
        provider = cloud_status["provider"]
        models = cloud_status["models"]
        available = True
    else:
        provider = "ollama" if ollama_available else "none"
        models = ollama_models if ollama_available else []
        available = bool(ollama_available)

    return {
        "available": available,
        "models": models,
        "provider": provider,
        "runtimeMode": mode,
        "ollamaAvailable": ollama_available,
        "ollamaModels": ollama_models,
        "cloudAvailable": bool(cloud_status["available"]),
        "cloudModels": cloud_status["models"],
        "cloudProvider": cloud_status["provider"],
    }


async def generate(
    prompt: str,
    system: str | None = None,
    *,
    task: TaskName = "chat",
    response_format: dict[str, Any] | str | None = None,
    images: list[OllamaImage] | None = None,
    temperature: float | None = None,
    num_predict: int | None = None,
    keep_alive: str | None = None,
) -> str:
    options = _build_request_options(
        task,
        temperature=temperature,
        num_predict=num_predict,
    )
    keep_alive_value = keep_alive if keep_alive is not None else settings.ollama_keep_alive
    timeout = _resolve_timeout(task)
    encoded_images = await _resolve_image_payload(images)

    if _runtime_mode() == "cloud" and cloud_fallback.is_enabled():
        return await cloud_fallback.generate_text(
            prompt=prompt,
            system=system,
            response_format=response_format,
            temperature=options.get("temperature", 0.0),
            timeout=min(timeout, 60),
            model=_cloud_model_name(task, images),
            images=images,
        )

    model = _resolve_model_name(task, images)

    if encoded_images:
        payload: dict[str, Any] = {
            "model": model,
            "stream": False,
            "think": False,
            "keep_alive": keep_alive_value,
            "messages": [
                {"role": "system", "content": system or ""},
                {"role": "user", "content": prompt, "images": encoded_images},
            ],
            "options": options,
        }
        if response_format is not None:
            payload["format"] = response_format
        try:
            client = _get_ollama_client()
            resp = await client.post(
                f"{settings.ollama_base_url}/api/chat",
                json=payload,
                timeout=timeout,
            )
            resp.raise_for_status()
            body = resp.json()
            return body.get("message", {}).get("content", "")
        except Exception:
            raise

    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "think": False,
        "keep_alive": keep_alive_value,
        "options": options,
    }
    if system:
        payload["system"] = system
    if response_format is not None:
        payload["format"] = response_format

    try:
        client = _get_ollama_client()
        resp = await client.post(
            f"{settings.ollama_base_url}/api/generate",
            json=payload,
            timeout=timeout,
        )
        resp.raise_for_status()
        return resp.json()["response"]
    except Exception as err:
        if images:
            raise
        try:
            fallback_text = await cloud_fallback.generate_text(
                prompt=prompt,
                system=system,
                response_format=response_format,
                temperature=options.get("temperature", 0.0),
                timeout=min(timeout, 60),
            )
            if fallback_text:
                logger.warning("Using cloud fallback for task=%s after Ollama failure: %s", task, err)
                return fallback_text
        except Exception:
            pass
        raise


async def chat(
    messages: list[dict[str, Any]],
    *,
    task: TaskName = "chat",
    response_format: dict[str, Any] | str | None = None,
    keep_alive: str | None = None,
) -> str:
    if _runtime_mode() == "cloud" and cloud_fallback.is_enabled():
        return await cloud_fallback.chat(
            messages=messages,
            response_format=response_format,
            temperature=float(_build_request_options(task).get("temperature", 0.0)),
            timeout=min(_resolve_timeout(task), 60),
            model=_cloud_model_name(task),
        )

    model = _resolve_model_name(task)
    keep_alive_value = keep_alive if keep_alive is not None else settings.ollama_keep_alive
    payload = {
        "model": model,
        "messages": messages,
        "stream": False,
        "think": False,
        "keep_alive": keep_alive_value,
        "options": _build_request_options(task),
    }
    if response_format is not None:
        payload["format"] = response_format
    try:
        client = _get_ollama_client()
        resp = await client.post(
            f"{settings.ollama_base_url}/api/chat",
            json=payload,
            timeout=_resolve_timeout(task),
        )
        resp.raise_for_status()
        body = resp.json()
        return body.get("message", {}).get("content", "")
    except Exception as err:
        merged_prompt = "\n\n".join(
            str(item.get("content", "")).strip() for item in messages if item.get("content")
        )
        try:
            fallback_text = await cloud_fallback.generate_text(
                prompt=merged_prompt,
                system=None,
                response_format=response_format,
                temperature=float(payload["options"].get("temperature", 0.0)),
                timeout=min(_resolve_timeout(task), 60),
            )
            if fallback_text:
                logger.warning("Using cloud fallback for chat task=%s after Ollama failure: %s", task, err)
                return fallback_text
        except Exception:
            pass
        raise


async def embed(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    if _runtime_mode() == "cloud" and cloud_fallback.is_enabled():
        return await cloud_fallback.embed_texts(texts)

    client = _get_ollama_client()
    _EMBED_CONCURRENCY = 6

    async def _embed_one(idx: int, text: str) -> tuple[int, list[float]]:
        body = await _post_embedding_request(
            client,
            text,
            timeout=settings.ollama_timeout_chat_s,
        )
        embedding = _extract_embedding(body)
        if not embedding:
            raise HTTPException(
                502,
                "Ollama embedding response did not contain a usable vector.",
            )
        return idx, embedding

    sem = asyncio.Semaphore(_EMBED_CONCURRENCY)
    results: list[list[float]] = [[] for _ in texts]

    async def _bounded(idx: int, text: str) -> None:
        async with sem:
            i, emb = await _embed_one(idx, text)
            results[i] = emb

    await asyncio.gather(*[_bounded(i, t) for i, t in enumerate(texts)])
    return results


async def _post_embedding_request(
    client: httpx.AsyncClient,
    text: str,
    *,
    timeout: int,
) -> dict[str, Any]:
    payload = {
        "model": settings.ollama_embed_model,
        "input": text,
    }
    endpoints = ("/api/embed", "/api/embeddings")
    last_error: httpx.HTTPStatusError | None = None

    for endpoint in endpoints:
        resp = await client.post(
            f"{settings.ollama_base_url}{endpoint}",
            json=payload,
            timeout=timeout,
        )
        if resp.status_code == 404 and endpoint != endpoints[-1]:
            logger.info(
                "Ollama endpoint %s returned 404, retrying with legacy embeddings endpoint",
                endpoint,
            )
            continue

        try:
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as err:
            last_error = err
            break

    if last_error is not None:
        detail = _build_embedding_error(last_error)
        raise HTTPException(last_error.response.status_code, detail) from last_error

    raise HTTPException(
        502,
        "Ollama embeddings are unavailable: no supported embedding endpoint responded.",
    )


def _extract_embedding(body: dict[str, Any]) -> list[float]:
    embeddings = body.get("embeddings", [])
    if embeddings and isinstance(embeddings, list):
        first = embeddings[0]
        if isinstance(first, list):
            return first
    embedding = body.get("embedding", [])
    return embedding if isinstance(embedding, list) else []


def _build_embedding_error(err: httpx.HTTPStatusError) -> str:
    status = err.response.status_code
    detail = ""
    try:
        payload = err.response.json()
        detail = payload.get("error") or payload.get("message") or ""
    except Exception:
        detail = err.response.text

    if status == 404:
        return (
            "Ollama embeddings are unavailable on this server. "
            "Checked /api/embed and /api/embeddings."
        )
    if status == 400 and "model" in detail.lower():
        return (
            f'Ollama embedding model "{settings.ollama_embed_model}" is not available. '
            "Pull the model first or update OLLAMA_EMBED_MODEL."
        )
    if detail:
        return f"Ollama embedding request failed: {detail}"
    return "Ollama embedding request failed."


def get_model_name() -> str:
    return settings.ollama_text_model


def get_task_model_name(task: TaskName, *, images: list[OllamaImage] | None = None) -> str:
    return _resolve_model_name(task, images)


def get_text_model_name() -> str:
    if _runtime_mode() == "cloud" and cloud_fallback.is_enabled():
        return cloud_fallback.get_text_model()
    return settings.ollama_text_model


def get_vision_model_name() -> str:
    if _runtime_mode() == "cloud" and cloud_fallback.is_enabled():
        return cloud_fallback.get_vision_model()
    return settings.ollama_vision_model


def get_embedding_model_name() -> str:
    if _runtime_mode() == "cloud" and cloud_fallback.is_enabled():
        return cloud_fallback.get_embedding_model()
    return settings.ollama_embed_model


def is_model_available(model_name: str, available_models: list[str]) -> bool:
    normalized = (model_name or "").strip().lower()
    candidates = {(item or "").strip().lower() for item in available_models}
    if normalized in candidates:
        return True
    return any(
        candidate == f"{normalized}:latest" or candidate.startswith(f"{normalized}:")
        for candidate in candidates
    )


async def preload_model(task: TaskName) -> None:
    if _runtime_mode() == "cloud" and cloud_fallback.is_enabled():
        return

    model = _resolve_model_name(task)
    payload = {
        "model": model,
        "prompt": "",
        "stream": False,
        "think": False,
        "keep_alive": settings.ollama_keep_alive,
        "options": {"num_predict": 1, "temperature": 0},
    }
    client = _get_ollama_client()
    resp = await client.post(
        f"{settings.ollama_base_url}/api/generate",
        json=payload,
        timeout=_resolve_timeout(task),
    )
    resp.raise_for_status()


def ensure_local_file(file_path: str) -> str:
    normalized = os.path.abspath((file_path or "").strip())
    if not os.path.exists(normalized):
        raise FileNotFoundError(f"Image file not found: {normalized}")
    return normalized
