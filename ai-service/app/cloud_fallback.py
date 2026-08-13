from __future__ import annotations

import logging
from typing import Any

import httpx

from .config import settings

logger = logging.getLogger(__name__)

_cloud_client: httpx.AsyncClient | None = None


def _get_cloud_client() -> httpx.AsyncClient:
    global _cloud_client
    if _cloud_client is None or getattr(_cloud_client, "is_closed", False):
        _cloud_client = httpx.AsyncClient(timeout=45)
    return _cloud_client


class CloudFallbackUnavailable(RuntimeError):
    pass


def _provider_name() -> str:
    base_url = settings.ai_cloud_fallback_base_url.strip().lower()
    if "openrouter.ai" in base_url:
        return "openrouter"
    return settings.ai_cloud_fallback_provider.strip().lower() or "openai"


def _is_supported_provider() -> bool:
    return _provider_name() in {"openai", "openrouter"}


def is_enabled() -> bool:
    return bool(settings.ai_cloud_fallback_enabled and settings.ai_cloud_fallback_api_key)


def get_status() -> dict[str, Any]:
    models: list[str] = []
    if settings.ai_cloud_fallback_model.strip():
        models.append(settings.ai_cloud_fallback_model.strip())
    vision_model = get_vision_model()
    if vision_model not in models:
        models.append(vision_model)
    embedding_model = get_embedding_model()
    if embedding_model not in models:
        models.append(embedding_model)
    return {
        "available": is_enabled(),
        "provider": _provider_name(),
        "models": [item for item in models if item],
    }


def get_text_model() -> str:
    return settings.ai_cloud_fallback_model.strip()


def get_vision_model() -> str:
    return settings.ai_cloud_fallback_vision_model.strip() or get_text_model()


def get_embedding_model() -> str:
    return settings.ai_cloud_fallback_embedding_model.strip()


def supports_text() -> bool:
    return bool(is_enabled() and get_text_model())


def supports_vision() -> bool:
    return bool(is_enabled() and get_vision_model())


def supports_embeddings() -> bool:
    return bool(is_enabled() and get_embedding_model())


def _headers() -> dict[str, str]:
    headers = {
        "Authorization": f"Bearer {settings.ai_cloud_fallback_api_key}",
        "Content-Type": "application/json",
    }
    referer = settings.ai_cloud_fallback_referer.strip()
    title = settings.ai_cloud_fallback_title.strip()
    if referer:
        headers["HTTP-Referer"] = referer
    if title:
        headers["X-Title"] = title
    return headers


def _embedding_headers() -> dict[str, str]:
    api_key = settings.ai_cloud_embedding_api_key.strip() or settings.ai_cloud_fallback_api_key.strip()
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    referer = settings.ai_cloud_fallback_referer.strip()
    title = settings.ai_cloud_fallback_title.strip()
    if referer:
        headers["HTTP-Referer"] = referer
    if title:
        headers["X-Title"] = title
    return headers


def _normalize_response_text(body: dict[str, Any]) -> str:
    content = body.get("choices", [{}])[0].get("message", {}).get("content", "")
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text":
                parts.append(str(item.get("text") or "").strip())
        return "\n".join(part for part in parts if part).strip()
    return str(content or "").strip()


def _build_image_content(images: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    content: list[dict[str, Any]] = []
    for image in images or []:
        base64_data = str(image.get("base64Data") or "").strip()
        if not base64_data:
            continue
        mime_type = str(image.get("mimeType") or "image/png").strip() or "image/png"
        data_url = (
            base64_data
            if base64_data.startswith("data:")
            else f"data:{mime_type};base64,{base64_data}"
        )
        content.append(
            {
                "type": "image_url",
                "image_url": {
                    "url": data_url,
                },
            }
        )
    return content


def _json_response_format(response_format: dict[str, Any] | str | None) -> dict[str, str] | None:
    if response_format is None:
        return None
    return {"type": "json_object"}


def _coerce_embedding_values(value: Any) -> list[float] | None:
    if isinstance(value, list):
        return [float(item) for item in value]
    if isinstance(value, dict):
        nested = value.get("values")
        if isinstance(nested, list):
            return [float(item) for item in nested]
    return None


async def generate_text(
    *,
    prompt: str,
    system: str | None = None,
    response_format: dict[str, Any] | str | None = None,
    temperature: float = 0.0,
    timeout: int = 45,
    model: str | None = None,
    images: list[dict[str, Any]] | None = None,
) -> str:
    if not is_enabled():
        raise CloudFallbackUnavailable("Cloud fallback is disabled or missing credentials.")
    provider = _provider_name()
    if not _is_supported_provider():
        raise CloudFallbackUnavailable(f'Unsupported cloud fallback provider "{provider}".')

    resolved_model = (model or (get_vision_model() if images else get_text_model())).strip()
    if not resolved_model:
        raise CloudFallbackUnavailable("Cloud fallback model is not configured.")

    user_content: list[dict[str, Any]] | str = prompt
    image_content = _build_image_content(images)
    if image_content:
        user_content = [{"type": "text", "text": prompt}, *image_content]

    payload: dict[str, Any] = {
        "model": resolved_model,
        "messages": [
            {"role": "system", "content": system or ""},
            {"role": "user", "content": user_content},
        ],
        "temperature": temperature,
    }
    json_format = _json_response_format(response_format)
    if json_format is not None:
        payload["response_format"] = json_format

    endpoint = settings.ai_cloud_fallback_base_url.rstrip("/") + "/chat/completions"
    client = _get_cloud_client()
    response = await client.post(endpoint, headers=_headers(), json=payload, timeout=timeout)
    response.raise_for_status()
    body = response.json()
    return _normalize_response_text(body)


def _normalize_chat_messages(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for message in messages:
        role = str(message.get("role") or "user").strip() or "user"
        content = message.get("content", "")
        attachments = message.get("_attachments")
        if isinstance(attachments, list) and attachments:
            parts: list[dict[str, Any]] = []
            if str(content or "").strip():
                parts.append({"type": "text", "text": str(content).strip()})
            parts.extend(_build_image_content(attachments))
            normalized.append({"role": role, "content": parts})
            continue
        normalized.append({"role": role, "content": str(content or "")})
    return normalized


async def chat(
    *,
    messages: list[dict[str, Any]],
    response_format: dict[str, Any] | str | None = None,
    temperature: float = 0.0,
    timeout: int = 45,
    model: str | None = None,
) -> str:
    if not supports_text():
        raise CloudFallbackUnavailable("Cloud fallback text model is not configured.")

    normalized_messages = _normalize_chat_messages(messages)
    resolved_model = (model or get_text_model()).strip()
    if any(
        isinstance(item.get("content"), list)
        for item in normalized_messages
        if isinstance(item, dict)
    ):
        resolved_model = (model or get_vision_model()).strip()

    payload: dict[str, Any] = {
        "model": resolved_model,
        "messages": normalized_messages,
        "temperature": temperature,
    }
    json_format = _json_response_format(response_format)
    if json_format is not None:
        payload["response_format"] = json_format

    endpoint = settings.ai_cloud_fallback_base_url.rstrip("/") + "/chat/completions"
    client = _get_cloud_client()
    response = await client.post(endpoint, headers=_headers(), json=payload, timeout=timeout)
    response.raise_for_status()
    body = response.json()
    return _normalize_response_text(body)


def _build_embedding_payload(texts: list[str]) -> dict[str, Any]:
    model = get_embedding_model()
    payload: dict[str, Any] = {
        "model": model,
        "input": texts,
    }
    if _provider_name() == "openrouter":
        # Gemini embedding models require task_type; OpenRouter passes this through to Google's API.
        # Without it, Google returns 400. Other OpenRouter-served models ignore unknown fields.
        if "gemini" in model.lower():
            payload["task_type"] = "RETRIEVAL_DOCUMENT"
    else:
        # OpenAI-compatible endpoints accept these; OpenRouter does not for most models.
        payload["dimensions"] = settings.embedding_dimensions
        payload["encoding_format"] = "float"
    return payload


async def _post_embedding_payload(
    client: httpx.AsyncClient,
    texts: list[str],
    *,
    timeout: int,
) -> dict[str, Any]:
    base_url = settings.ai_cloud_embedding_base_url.strip() or settings.ai_cloud_fallback_base_url.strip()
    endpoint = base_url.rstrip("/") + "/embeddings"
    response = await client.post(
        endpoint,
        headers=_embedding_headers(),
        json=_build_embedding_payload(texts),
        timeout=timeout,
    )
    if response.is_error:
        try:
            error_body = response.json()
        except Exception:
            error_body = response.text
        logger.error(
            "[cloud_fallback] embedding request failed %s — response body: %s",
            response.status_code,
            error_body,
        )
    response.raise_for_status()
    return response.json()


def _collect_embedding_response(
    body: dict[str, Any],
    *,
    text_count: int,
) -> list[list[float] | None]:
    ordered_embeddings: list[list[float] | None] = [None] * text_count
    fallback_embeddings: list[list[float]] = []

    data = body.get("data", [])
    if isinstance(data, list):
        for item in data:
            if not isinstance(item, dict):
                continue
            embedding = _coerce_embedding_values(item.get("embedding"))
            if embedding is None:
                continue
            index = item.get("index")
            if isinstance(index, int) and 0 <= index < text_count:
                ordered_embeddings[index] = embedding
            else:
                fallback_embeddings.append(embedding)

    if text_count == 1 and ordered_embeddings[0] is None:
        single_embedding = _coerce_embedding_values(body.get("embedding"))
        if single_embedding is not None:
            ordered_embeddings[0] = single_embedding

    if any(item is None for item in ordered_embeddings):
        extra_embeddings = body.get("embeddings")
        if isinstance(extra_embeddings, list):
            for item in extra_embeddings:
                embedding = _coerce_embedding_values(item)
                if embedding is not None:
                    fallback_embeddings.append(embedding)

    for index, embedding in enumerate(ordered_embeddings):
        if embedding is None and fallback_embeddings:
            ordered_embeddings[index] = fallback_embeddings.pop(0)

    return ordered_embeddings


async def embed_texts(texts: list[str]) -> list[list[float]]:
    if not supports_embeddings():
        raise CloudFallbackUnavailable("Cloud fallback embedding model is not configured.")
    if not texts:
        return []

    client = _get_cloud_client()
    body = await _post_embedding_payload(
        client,
        texts,
        timeout=settings.ollama_timeout_chat_s,
    )
    ordered_embeddings = _collect_embedding_response(body, text_count=len(texts))

    missing_indexes = [
        index for index, embedding in enumerate(ordered_embeddings) if embedding is None
    ]
    for index in missing_indexes:
        retry_body = await _post_embedding_payload(
            client,
            [texts[index]],
            timeout=settings.ollama_timeout_chat_s,
        )
        retry_embeddings = _collect_embedding_response(retry_body, text_count=1)
        if retry_embeddings and retry_embeddings[0] is not None:
            ordered_embeddings[index] = retry_embeddings[0]

    if any(item is None for item in ordered_embeddings):
        raise CloudFallbackUnavailable("Cloud embedding response did not contain a vector for each input.")
    return [item for item in ordered_embeddings if item is not None]
