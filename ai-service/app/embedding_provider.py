from __future__ import annotations

from . import ollama_client
from .config import settings


def _normalize_embedding(raw: list[float]) -> list[float]:
    values = [float(v) for v in raw[: settings.embedding_dimensions]]
    if len(values) < settings.embedding_dimensions:
        values.extend([0.0] * (settings.embedding_dimensions - len(values)))
    return values


async def embed_texts(texts: list[str]) -> list[list[float]]:
    embeddings = await ollama_client.embed(texts)
    return [_normalize_embedding(item) for item in embeddings]


def embedding_to_vector_literal(embedding: list[float]) -> str:
    return "[" + ",".join(f"{value:.8f}" for value in embedding) + "]"
