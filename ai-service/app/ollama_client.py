"""
Ollama HTTP client - mirrors the NestJS OllamaService.
"""

import base64
import logging
import os
from typing import Any, Literal, TypedDict

import httpx
from fastapi import HTTPException

from .config import settings

logger = logging.getLogger(__name__)

TaskName = Literal[
    "chat",
    "grading",
    "classification",
    "quiz_generation",
    "intervention",
    "text_extraction",
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
        "timeout": settings.ollama_timeout_extraction_s,
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
        "num_predict": 3072,
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
}


def _get_profile(task: TaskName) -> dict[str, Any]:
    return TASK_PROFILES[task]


def _resolve_model_name(task: TaskName, images: list[OllamaImage] | None = None) -> str:
    profile = _get_profile(task)
    if images or profile["model_kind"] == "vision":
        return settings.ollama_vision_model
    return settings.ollama_text_model


def _resolve_timeout(task: TaskName) -> int:
    return _get_profile(task)["timeout"]


def _resolve_image_payload(images: list[OllamaImage] | None) -> list[str]:
    encoded: list[str] = []
    for image in images or []:
        if image.get("base64Data"):
            encoded.append(image["base64Data"])
            continue
        file_path = (image.get("filePath") or "").strip()
        if not file_path:
            continue
        with open(file_path, "rb") as file_obj:
            encoded.append(base64.b64encode(file_obj.read()).decode("utf-8"))
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
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.ollama_base_url}/api/tags")
            if resp.status_code != 200:
                return {"available": False, "models": []}
            body = resp.json()
            models = [m["name"] for m in body.get("models", [])]
            return {"available": True, "models": models}
    except Exception:
        return {"available": False, "models": []}


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
    model = _resolve_model_name(task, images)
    options = _build_request_options(
        task,
        temperature=temperature,
        num_predict=num_predict,
    )
    keep_alive_value = keep_alive if keep_alive is not None else settings.ollama_keep_alive
    timeout = _resolve_timeout(task)
    encoded_images = _resolve_image_payload(images)

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
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(
                f"{settings.ollama_base_url}/api/chat",
                json=payload,
            )
            resp.raise_for_status()
            body = resp.json()
            return body.get("message", {}).get("content", "")

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

    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(
            f"{settings.ollama_base_url}/api/generate",
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()["response"]


async def chat(
    messages: list[dict[str, Any]],
    *,
    task: TaskName = "chat",
    response_format: dict[str, Any] | str | None = None,
    keep_alive: str | None = None,
) -> str:
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
    async with httpx.AsyncClient(timeout=_resolve_timeout(task)) as client:
        resp = await client.post(
            f"{settings.ollama_base_url}/api/chat",
            json=payload,
        )
        resp.raise_for_status()
        body = resp.json()
        return body.get("message", {}).get("content", "")


async def embed(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    async with httpx.AsyncClient(timeout=settings.ollama_timeout_chat_s) as client:
        results: list[list[float]] = []
        for text in texts:
            body = await _post_embedding_request(client, text)
            embedding = _extract_embedding(body)
            if not embedding:
                raise HTTPException(
                    502,
                    "Ollama embedding response did not contain a usable vector.",
                )
            results.append(embedding)
        return results


async def _post_embedding_request(
    client: httpx.AsyncClient,
    text: str,
) -> dict[str, Any]:
    payload = {
        "model": settings.ollama_embed_model,
        "input": text,
    }
    endpoints = ("/api/embed", "/api/embeddings")
    last_error: httpx.HTTPStatusError | None = None

    for endpoint in endpoints:
        resp = await client.post(f"{settings.ollama_base_url}{endpoint}", json=payload)
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
    return settings.ollama_text_model


def get_vision_model_name() -> str:
    return settings.ollama_vision_model


def get_embedding_model_name() -> str:
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
    model = _resolve_model_name(task)
    payload = {
        "model": model,
        "prompt": "",
        "stream": False,
        "think": False,
        "keep_alive": settings.ollama_keep_alive,
        "options": {"num_predict": 1, "temperature": 0},
    }
    async with httpx.AsyncClient(timeout=_resolve_timeout(task)) as client:
        resp = await client.post(
            f"{settings.ollama_base_url}/api/generate",
            json=payload,
        )
        resp.raise_for_status()


def ensure_local_file(file_path: str) -> str:
    normalized = os.path.abspath((file_path or "").strip())
    if not os.path.exists(normalized):
        raise FileNotFoundError(f"Image file not found: {normalized}")
    return normalized
