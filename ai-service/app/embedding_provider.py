from __future__ import annotations

import hashlib
import logging

from . import ollama_client
from .config import settings

logger = logging.getLogger(__name__)

DEGRADED_EMBEDDING_MODEL = "degraded:hash-embedding-v1"


class EmbeddingBatch(list):
    def __init__(
        self,
        embeddings: list[list[float]],
        *,
        provider: str,
        model: str,
        degraded: bool = False,
        warnings: list[str] | None = None,
    ) -> None:
        super().__init__(embeddings)
        self.provider = provider
        self.model = model
        self.degraded = degraded
        self.warnings = warnings or []


def _normalize_embedding(raw: list[float]) -> list[float]:
    values = [float(v) for v in raw[: settings.embedding_dimensions]]
    if len(values) < settings.embedding_dimensions:
        values.extend([0.0] * (settings.embedding_dimensions - len(values)))
    return values


def _hash_embedding(text: str) -> list[float]:
    values: list[float] = []
    seed = hashlib.sha256((text or "").encode("utf-8")).digest()
    counter = 0
    while len(values) < settings.embedding_dimensions:
        digest = hashlib.sha256(seed + counter.to_bytes(4, "big")).digest()
        values.extend((byte / 127.5) - 1.0 for byte in digest)
        counter += 1
    return values[: settings.embedding_dimensions]


def _provider_name() -> str:
    runtime_mode = (settings.ai_runtime_mode or "").strip().lower()
    if runtime_mode == "cloud" and settings.ai_cloud_fallback_enabled:
        base_url = settings.ai_cloud_fallback_base_url.strip().lower()
        return "openrouter" if "openrouter.ai" in base_url else "cloud"
    return "ollama"


def get_embedding_model_label(batch: object | None = None) -> str:
    if isinstance(batch, EmbeddingBatch):
        return batch.model
    return f"{_provider_name()}:{ollama_client.get_embedding_model_name()}"


def get_embedding_provider(batch: object | None = None) -> str:
    if isinstance(batch, EmbeddingBatch):
        return batch.provider
    return _provider_name()


async def embed_texts(texts: list[str]) -> EmbeddingBatch:
    if not texts:
        return EmbeddingBatch(
            [],
            provider=get_embedding_provider(),
            model=get_embedding_model_label(),
        )
    try:
        embeddings = await ollama_client.embed(texts)
        return EmbeddingBatch(
            [_normalize_embedding(item) for item in embeddings],
            provider=get_embedding_provider(),
            model=get_embedding_model_label(),
        )
    except Exception as exc:
        if not settings.ai_degraded_allowed:
            raise
        warning = f"Embedding provider failed; using degraded deterministic vectors: {exc}"
        logger.warning("[embedding] %s", warning)
        return EmbeddingBatch(
            [_hash_embedding(text) for text in texts],
            provider="degraded",
            model=DEGRADED_EMBEDDING_MODEL,
            degraded=True,
            warnings=[warning],
        )


def embedding_to_vector_literal(embedding: list[float]) -> str:
    return "[" + ",".join(f"{value:.8f}" for value in embedding) + "]"
