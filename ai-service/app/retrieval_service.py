from __future__ import annotations

import json
import math
import re
from typing import Any

from sqlalchemy import bindparam, text as sa_text
from sqlalchemy.ext.asyncio import AsyncSession

from .embedding_provider import embed_texts, embedding_to_vector_literal


def _keyword_set(text: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-zA-Z][a-zA-Z0-9]{2,}", (text or "").lower())
        if token not in {"the", "and", "for", "with", "that", "from", "this"}
    }


def rerank_chunks(query_text: str, chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    query_keywords = _keyword_set(query_text)

    def score(item: dict[str, Any]) -> tuple[float, float]:
        chunk_keywords = _keyword_set(item.get("chunkText", ""))
        overlap = len(query_keywords & chunk_keywords)
        metadata = item.get("metadataJson") or {}
        lesson_boost = 1 if metadata.get("lessonTitle") else 0
        published_boost = 1 if metadata.get("isPublished", True) else 0
        semantic_distance = float(item.get("distance") or 0)
        return (
            overlap + lesson_boost + published_boost - semantic_distance,
            -semantic_distance,
        )

    ranked = sorted(chunks, key=score, reverse=True)
    deduped: list[dict[str, Any]] = []
    seen = set()
    for item in ranked:
        key = (
            item.get("lessonId"),
            item.get("assessmentId"),
            item.get("questionId"),
            item.get("sourceType"),
            item.get("chunkOrder"),
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return deduped


async def similarity_search(
    db: AsyncSession,
    *,
    query_text: str,
    class_id: str,
    top_k: int = 8,
    lesson_ids: list[str] | None = None,
    assessment_ids: list[str] | None = None,
    source_types: list[str] | None = None,
    only_published: bool = False,
) -> list[dict[str, Any]]:
    embedding = (await embed_texts([query_text]))[0]
    params: dict[str, Any] = {
        "classId": class_id,
        "embedding": embedding_to_vector_literal(embedding),
        "topK": top_k * 2,
    }
    filters = ["c.class_id = :classId"]
    query = sa_text(
        """
        SELECT
          c.id,
          c.source_type,
          c.source_id,
          c.class_id,
          c.lesson_id,
          c.assessment_id,
          c.question_id,
          c.extraction_id,
          c.chunk_text,
          c.chunk_order,
          c.metadata_json,
          (e.embedding <=> :embedding::vector) AS distance
        FROM content_chunks c
        INNER JOIN content_chunk_embeddings e ON e.chunk_id = c.id
        WHERE __FILTERS__
        ORDER BY e.embedding <=> :embedding::vector ASC
        LIMIT :topK
        """
    )

    if lesson_ids:
        params["lessonIds"] = lesson_ids
        filters.append("c.lesson_id IN :lessonIds")
        query = query.bindparams(bindparam("lessonIds", expanding=True))
    if assessment_ids:
        params["assessmentIds"] = assessment_ids
        filters.append("c.assessment_id IN :assessmentIds")
        query = query.bindparams(bindparam("assessmentIds", expanding=True))
    if source_types:
        params["sourceTypes"] = source_types
        filters.append("c.source_type IN :sourceTypes")
        query = query.bindparams(bindparam("sourceTypes", expanding=True))
    if only_published:
        filters.append(
            """
            (
              c.metadata_json->>'isPublished' = 'true'
              OR c.metadata_json->>'isPublished' IS NULL
            )
            """
        )

    query = sa_text(query.text.replace("__FILTERS__", " AND ".join(filters)))
    if lesson_ids:
        query = query.bindparams(bindparam("lessonIds", expanding=True))
    if assessment_ids:
        query = query.bindparams(bindparam("assessmentIds", expanding=True))
    if source_types:
        query = query.bindparams(bindparam("sourceTypes", expanding=True))

    rows = await db.execute(query, params)

    raw_results = []
    for row in rows.mappings():
        metadata = row["metadata_json"]
        if isinstance(metadata, str):
            try:
                metadata = json.loads(metadata)
            except json.JSONDecodeError:
                metadata = {}
        raw_results.append(
            {
                "id": str(row["id"]),
                "sourceType": row["source_type"],
                "sourceId": str(row["source_id"]),
                "classId": str(row["class_id"]),
                "lessonId": str(row["lesson_id"]) if row["lesson_id"] else None,
                "assessmentId": str(row["assessment_id"])
                if row["assessment_id"]
                else None,
                "questionId": str(row["question_id"]) if row["question_id"] else None,
                "extractionId": str(row["extraction_id"])
                if row["extraction_id"]
                else None,
                "chunkText": row["chunk_text"],
                "chunkOrder": row["chunk_order"],
                "metadataJson": metadata or {},
                "distance": float(row["distance"]) if row["distance"] is not None else math.inf,
            }
        )

    return rerank_chunks(query_text, raw_results)[:top_k]
