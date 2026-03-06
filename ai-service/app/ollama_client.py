"""
Ollama HTTP client – mirrors the NestJS OllamaService.
"""

import logging
from typing import Any

import httpx

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


def get_model_name() -> str:
    return settings.ollama_model
