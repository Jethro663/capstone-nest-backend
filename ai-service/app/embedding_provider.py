from __future__ import annotations

import logging
import math

from . import ollama_client
from .config import settings

logger = logging.getLogger(__name__)


class EmbeddingProviderUnavailable(RuntimeError):
    """Raised when no semantically compatible embedding can be produced."""


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
    if len(raw) != settings.embedding_dimensions:
        raise EmbeddingProviderUnavailable(
            "Embedding provider returned the wrong vector dimension "
            f"({len(raw)} instead of {settings.embedding_dimensions})"
        )
    values = [float(v) for v in raw]
    if not all(math.isfinite(value) for value in values):
        raise EmbeddingProviderUnavailable(
            "Embedding provider returned a non-finite vector value"
        )
    return values


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


def require_semantic_embeddings(
    batch: list[list[float]],
    *,
    expected_count: int | None = None,
) -> list[list[float]]:
    """Reject placeholder vectors before they can enter a real vector space."""

    provider = str(getattr(batch, "provider", "") or "").strip().lower()
    model = str(getattr(batch, "model", "") or "").strip().lower()
    if (
        bool(getattr(batch, "degraded", False))
        or provider == "degraded"
        or model.startswith("degraded:")
    ):
        raise EmbeddingProviderUnavailable(
            "Semantic embeddings are unavailable; degraded placeholder vectors "
            "cannot be stored or compared with provider embeddings"
        )
    if expected_count is not None and len(batch) != expected_count:
        raise EmbeddingProviderUnavailable(
            "Embedding provider returned an unexpected vector count "
            f"({len(batch)} instead of {expected_count})"
        )
    return batch


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
        warning = (
            "Embedding provider unavailable; semantic fallback vectors are disabled "
            f"to protect vector-space integrity: {exc}"
        )
        logger.warning("[embedding] %s", warning)
        raise EmbeddingProviderUnavailable(warning) from exc


def embedding_to_vector_literal(embedding: list[float]) -> str:
    return "[" + ",".join(f"{value:.8f}" for value in embedding) + "]"
