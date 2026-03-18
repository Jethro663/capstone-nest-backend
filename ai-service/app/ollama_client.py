"""
Ollama HTTP client - mirrors the NestJS OllamaService.
"""

import logging
from typing import Any

import httpx
from fastapi import HTTPException

from .config import settings

logger = logging.getLogger(__name__)


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


async def generate(prompt: str, system: str | None = None) -> str:
    payload: dict[str, Any] = {
        "model": settings.ollama_model,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.3, "num_predict": 4096},
    }
    if system:
        payload["system"] = system

    async with httpx.AsyncClient(timeout=settings.ollama_timeout) as client:
        resp = await client.post(
            f"{settings.ollama_base_url}/api/generate",
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()["response"]


async def chat(messages: list[dict[str, str]]) -> str:
    payload = {
        "model": settings.ollama_model,
        "messages": messages,
        "stream": False,
        "options": {"temperature": 0.7, "num_predict": 1024},
    }
    async with httpx.AsyncClient(timeout=settings.ollama_timeout) as client:
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

    async with httpx.AsyncClient(timeout=settings.ollama_timeout) as client:
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
    return settings.ollama_model


def get_embedding_model_name() -> str:
    return settings.ollama_embed_model
