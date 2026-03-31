from __future__ import annotations

from typing import Any

import httpx

from .config import settings


class CloudFallbackUnavailable(RuntimeError):
    pass


def is_enabled() -> bool:
    return bool(settings.ai_cloud_fallback_enabled and settings.ai_cloud_fallback_api_key)


async def generate_text(
    *,
    prompt: str,
    system: str | None = None,
    response_format: dict[str, Any] | str | None = None,
    temperature: float = 0.0,
    timeout: int = 45,
) -> str:
    if not is_enabled():
        raise CloudFallbackUnavailable("Cloud fallback is disabled or missing credentials.")
    provider = settings.ai_cloud_fallback_provider.strip().lower()
    if provider != "openai":
        raise CloudFallbackUnavailable(f'Unsupported cloud fallback provider "{provider}".')

    payload: dict[str, Any] = {
        "model": settings.ai_cloud_fallback_model,
        "messages": [
            {"role": "system", "content": system or ""},
            {"role": "user", "content": prompt},
        ],
        "temperature": temperature,
    }
    if response_format is not None:
        payload["response_format"] = {"type": "json_object"}

    headers = {
        "Authorization": f"Bearer {settings.ai_cloud_fallback_api_key}",
        "Content-Type": "application/json",
    }
    endpoint = settings.ai_cloud_fallback_base_url.rstrip("/") + "/chat/completions"
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(endpoint, headers=headers, json=payload)
        response.raise_for_status()
        body = response.json()
        return (
            body.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        )
