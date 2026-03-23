from __future__ import annotations

import json
import math
import re
from collections import Counter
from dataclasses import dataclass
from typing import Any

from sqlalchemy import bindparam, text as sa_text
from sqlalchemy.ext.asyncio import AsyncSession

from .embedding_provider import embed_texts, embedding_to_vector_literal

STOPWORDS = {
    "the",
    "and",
    "for",
    "with",
    "that",
    "from",
    "this",
    "have",
    "your",
    "into",
    "about",
    "what",
    "when",
    "where",
    "which",
}


@dataclass(frozen=True)
class RetrievalPolicy:
    preferred_source_types: tuple[str, ...]
    source_weights: dict[str, float]
    require_lesson_bias: bool = False
    diversity_key: str = "lessonId"


RETRIEVAL_POLICIES: dict[str, RetrievalPolicy] = {
    "general": RetrievalPolicy(
        preferred_source_types=("lesson_block", "extracted_module", "assessment_question"),
        source_weights={
            "lesson_block": 1.0,
            "extracted_module": 0.85,
            "assessment_question": 0.65,
        },
    ),
    "student_tutor": RetrievalPolicy(
        preferred_source_types=("lesson_block", "extracted_module", "assessment_question"),
        source_weights={
            "lesson_block": 1.25,
            "extracted_module": 1.0,
            "assessment_question": 0.45,
        },
        require_lesson_bias=True,
    ),
    "mentor_explain": RetrievalPolicy(
        preferred_source_types=("assessment_question", "lesson_block", "extracted_module"),
        source_weights={
            "assessment_question": 1.35,
            "lesson_block": 1.0,
            "extracted_module": 0.75,
        },
    ),
    "quiz_generation": RetrievalPolicy(
        preferred_source_types=("lesson_block", "extracted_module", "assessment_question"),
        source_weights={
            "lesson_block": 1.2,
            "extracted_module": 1.0,
            "assessment_question": 0.55,
        },
    ),
    "remedial": RetrievalPolicy(
        preferred_source_types=("lesson_block", "assessment_question", "extracted_module"),
        source_weights={
            "lesson_block": 1.15,
            "assessment_question": 1.0,
            "extracted_module": 0.8,
        },
    ),
}


def _keyword_set(text: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-zA-Z][a-zA-Z0-9]{2,}", (text or "").lower())
        if token not in STOPWORDS
    }


def _truncate_words(text: str, limit: int) -> str:
    tokens = re.findall(r"[A-Za-z0-9][A-Za-z0-9\-_/]*", text or "")
    return " ".join(tokens[:limit]).strip()


def build_query_variants(
    query_text: str,
    *,
    teacher_explanation: str | None = None,
    concept_hints: list[str] | None = None,
    student_message: str | None = None,
) -> list[str]:
    variants: list[str] = []
    base = (query_text or "").strip()
    if base:
        variants.append(base)

    concepts = [item.strip() for item in (concept_hints or []) if item and item.strip()]
    if concepts:
        variants.append(f"{base}\nConcept focus: {', '.join(concepts[:6])}".strip())

    if teacher_explanation:
        variants.append(
            "\n".join(
                filter(
                    None,
                    [
                        base,
                        "Teacher explanation focus:",
                        _truncate_words(teacher_explanation, 80),
                    ],
                )
            ).strip()
        )

    if student_message:
        variants.append(
            "\n".join(
                filter(
                    None,
                    [
                        base,
                        "Student follow-up:",
                        _truncate_words(student_message, 60),
                    ],
                )
            ).strip()
        )

    concept_seed = sorted(_keyword_set(base))[:12]
    if concept_seed:
        variants.append("Concept-focused retrieval: " + " ".join(concept_seed))

    deduped: list[str] = []
    seen: set[str] = set()
    for item in variants:
        normalized = " ".join(item.lower().split())
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        deduped.append(item)
    return deduped[:4] or [base or "class material"]


async def _vector_search(
    db: AsyncSession,
    *,
    query_text: str,
    class_id: str,
    limit: int,
    lesson_ids: list[str] | None = None,
    assessment_ids: list[str] | None = None,
    source_types: list[str] | None = None,
    only_published: bool = False,
) -> list[dict[str, Any]]:
    embedding = (await embed_texts([query_text]))[0]
    params: dict[str, Any] = {
        "classId": class_id,
        "embedding": embedding_to_vector_literal(embedding),
        "topK": limit,
    }
    filters = ["c.class_id = :classId"]
    query_text_template = """
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
          (e.embedding <=> CAST(:embedding AS vector)) AS distance
        FROM content_chunks c
        INNER JOIN content_chunk_embeddings e ON e.chunk_id = c.id
        WHERE __FILTERS__
        ORDER BY e.embedding <=> CAST(:embedding AS vector) ASC
        LIMIT :topK
        """
    expanding_binds = []

    if lesson_ids:
        params["lessonIds"] = lesson_ids
        filters.append("c.lesson_id IN :lessonIds")
        expanding_binds.append(bindparam("lessonIds", expanding=True))
    if assessment_ids:
        params["assessmentIds"] = assessment_ids
        filters.append("c.assessment_id IN :assessmentIds")
        expanding_binds.append(bindparam("assessmentIds", expanding=True))
    if source_types:
        params["sourceTypes"] = source_types
        filters.append("c.source_type IN :sourceTypes")
        expanding_binds.append(bindparam("sourceTypes", expanding=True))
    if only_published:
        filters.append(
            """
            (
              c.metadata_json->>'isPublished' = 'true'
              OR c.metadata_json->>'isPublished' IS NULL
            )
            """
        )

    query = sa_text(query_text_template.replace("__FILTERS__", " AND ".join(filters)))
    if expanding_binds:
        query = query.bindparams(*expanding_binds)

    rows = await db.execute(query, params)
    mapped: list[dict[str, Any]] = []
    for row in rows.mappings():
        metadata = row["metadata_json"]
        if isinstance(metadata, str):
            try:
                metadata = json.loads(metadata)
            except json.JSONDecodeError:
                metadata = {}
        mapped.append(
            {
                "id": str(row["id"]),
                "sourceType": row["source_type"],
                "sourceId": str(row["source_id"]),
                "classId": str(row["class_id"]),
                "lessonId": str(row["lesson_id"]) if row["lesson_id"] else None,
                "assessmentId": str(row["assessment_id"]) if row["assessment_id"] else None,
                "questionId": str(row["question_id"]) if row["question_id"] else None,
                "extractionId": str(row["extraction_id"]) if row["extraction_id"] else None,
                "chunkText": row["chunk_text"],
                "chunkOrder": row["chunk_order"],
                "metadataJson": metadata or {},
                "distance": float(row["distance"]) if row["distance"] is not None else math.inf,
            }
        )
    return mapped


def _lexical_score(query_keywords: set[str], chunk_text: str, metadata: dict[str, Any]) -> float:
    chunk_keywords = _keyword_set(chunk_text)
    if not query_keywords:
        return 0.0
    overlap = len(query_keywords & chunk_keywords)
    title_keywords = _keyword_set(
        " ".join(
            str(metadata.get(key) or "")
            for key in ("lessonTitle", "assessmentTitle", "title", "blockType")
        )
    )
    title_overlap = len(query_keywords & title_keywords)
    return (overlap * 1.0) + (title_overlap * 0.5)


def _reciprocal_rank(rank: int) -> float:
    return 1.0 / (rank + 10.0)


def _source_reference(item: dict[str, Any]) -> str:
    metadata = item.get("metadataJson") or {}
    block_type = metadata.get("blockType") or item.get("sourceType")
    parts = [
        metadata.get("lessonTitle") or metadata.get("assessmentTitle") or metadata.get("title"),
        f"block:{block_type}" if block_type else None,
        f"lesson:{item.get('lessonId')}" if item.get("lessonId") else None,
        f"question:{item.get('questionId')}" if item.get("questionId") else None,
        f"chunk:{item.get('chunkOrder')}",
    ]
    return " | ".join(str(part) for part in parts if part)


def _selection_reason(
    *,
    source_type: str,
    lexical_score: float,
    metadata_bonus: float,
    source_bonus: float,
    diversity_penalty: float,
) -> str:
    reasons = [f"preferred source={source_type}"]
    if lexical_score > 0:
        reasons.append("keyword overlap")
    if metadata_bonus > 0:
        reasons.append("metadata match")
    if source_bonus > 1:
        reasons.append("policy boost")
    if diversity_penalty < 0:
        reasons.append("diversity-capped")
    return ", ".join(reasons)


def rerank_chunks(
    query_text: str,
    chunks: list[dict[str, Any]],
    *,
    policy_name: str = "general",
    reference_lesson_id: str | None = None,
    reference_assessment_id: str | None = None,
    reference_question_id: str | None = None,
) -> list[dict[str, Any]]:
    policy = RETRIEVAL_POLICIES.get(policy_name, RETRIEVAL_POLICIES["general"])
    query_keywords = _keyword_set(query_text)

    lexical_order = sorted(
        chunks,
        key=lambda item: _lexical_score(query_keywords, item.get("chunkText", ""), item.get("metadataJson") or {}),
        reverse=True,
    )
    lexical_rank = {item["id"]: idx for idx, item in enumerate(lexical_order)}

    grouped_counts: Counter[str] = Counter()
    ranked: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    for vector_rank, item in enumerate(sorted(chunks, key=lambda candidate: float(candidate.get("distance") or math.inf))):
        if item["id"] in seen_ids:
            continue
        seen_ids.add(item["id"])

        metadata = item.get("metadataJson") or {}
        source_type = item.get("sourceType") or "unknown"
        distance = float(item.get("distance") or math.inf)
        lexical_score = _lexical_score(query_keywords, item.get("chunkText", ""), metadata)
        source_bonus = policy.source_weights.get(source_type, 0.4)
        metadata_bonus = 0.0

        if reference_question_id and item.get("questionId") == reference_question_id:
            metadata_bonus += 1.4
        if reference_assessment_id and item.get("assessmentId") == reference_assessment_id:
            metadata_bonus += 1.0
        if reference_lesson_id and item.get("lessonId") == reference_lesson_id:
            metadata_bonus += 1.2
        if policy.require_lesson_bias and item.get("lessonId"):
            metadata_bonus += 0.5
        if metadata.get("isPublished") is True:
            metadata_bonus += 0.35
        if metadata.get("sourceMethod") == "rule_based":
            metadata_bonus -= 0.25

        diversity_key_name = policy.diversity_key
        diversity_key = str(item.get(diversity_key_name) or metadata.get(diversity_key_name) or item["id"])
        diversity_penalty = -0.25 * grouped_counts[diversity_key]

        vector_rrf = _reciprocal_rank(vector_rank)
        lexical_rrf = _reciprocal_rank(lexical_rank.get(item["id"], len(chunks)))
        semantic_component = max(0.0, 1.0 - min(distance, 2.0))
        final_score = (
            (semantic_component * 2.0)
            + lexical_score
            + metadata_bonus
            + source_bonus
            + (vector_rrf * 3.0)
            + (lexical_rrf * 2.0)
            + diversity_penalty
        )

        grouped_counts[diversity_key] += 1
        enriched = {
            **item,
            "documentId": metadata.get("documentId") or f"{source_type}:{item.get('sourceId')}",
            "blockType": metadata.get("blockType") or source_type,
            "sourceReference": _source_reference(item),
            "scoreBreakdown": {
                "semantic": round(semantic_component, 4),
                "lexical": round(lexical_score, 4),
                "metadata": round(metadata_bonus, 4),
                "sourcePolicy": round(source_bonus, 4),
                "vectorRrf": round(vector_rrf, 4),
                "lexicalRrf": round(lexical_rrf, 4),
                "diversityPenalty": round(diversity_penalty, 4),
                "final": round(final_score, 4),
            },
            "selectionReason": _selection_reason(
                source_type=source_type,
                lexical_score=lexical_score,
                metadata_bonus=metadata_bonus,
                source_bonus=source_bonus,
                diversity_penalty=diversity_penalty,
            ),
        }
        ranked.append(enriched)

    ranked.sort(key=lambda item: item["scoreBreakdown"]["final"], reverse=True)

    deduped: list[dict[str, Any]] = []
    seen_source_keys: set[tuple[Any, ...]] = set()
    for item in ranked:
        source_key = (
            item.get("lessonId"),
            item.get("assessmentId"),
            item.get("questionId"),
            item.get("sourceType"),
            item.get("chunkOrder"),
        )
        if source_key in seen_source_keys:
            continue
        seen_source_keys.add(source_key)
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
    policy_name: str = "general",
    teacher_explanation: str | None = None,
    concept_hints: list[str] | None = None,
    student_message: str | None = None,
    reference_lesson_id: str | None = None,
    reference_assessment_id: str | None = None,
    reference_question_id: str | None = None,
) -> list[dict[str, Any]]:
    query_variants = build_query_variants(
        query_text,
        teacher_explanation=teacher_explanation,
        concept_hints=concept_hints,
        student_message=student_message,
    )

    candidate_pool: dict[str, dict[str, Any]] = {}
    for variant_index, variant in enumerate(query_variants):
        results = await _vector_search(
            db,
            query_text=variant,
            class_id=class_id,
            limit=max(top_k * 4, 12),
            lesson_ids=lesson_ids,
            assessment_ids=assessment_ids,
            source_types=source_types,
            only_published=only_published,
        )
        for item in results:
            current = candidate_pool.get(item["id"])
            if current is None or float(item.get("distance") or math.inf) < float(current.get("distance") or math.inf):
                candidate_pool[item["id"]] = {
                    **item,
                    "retrievalDiagnostics": {
                        "queryVariants": query_variants,
                        "matchedVariant": variant,
                        "variantIndex": variant_index,
                    },
                }

    ranked = rerank_chunks(
        query_text,
        list(candidate_pool.values()),
        policy_name=policy_name,
        reference_lesson_id=reference_lesson_id,
        reference_assessment_id=reference_assessment_id,
        reference_question_id=reference_question_id,
    )
    return ranked[:top_k]


async def preview_retrieval(
    db: AsyncSession,
    *,
    query_text: str,
    class_id: str,
    top_k: int = 8,
    policy_name: str = "general",
    lesson_ids: list[str] | None = None,
    assessment_ids: list[str] | None = None,
    source_types: list[str] | None = None,
    only_published: bool = False,
    teacher_explanation: str | None = None,
    concept_hints: list[str] | None = None,
    student_message: str | None = None,
    reference_lesson_id: str | None = None,
    reference_assessment_id: str | None = None,
    reference_question_id: str | None = None,
) -> dict[str, Any]:
    results = await similarity_search(
        db,
        query_text=query_text,
        class_id=class_id,
        top_k=top_k,
        lesson_ids=lesson_ids,
        assessment_ids=assessment_ids,
        source_types=source_types,
        only_published=only_published,
        policy_name=policy_name,
        teacher_explanation=teacher_explanation,
        concept_hints=concept_hints,
        student_message=student_message,
        reference_lesson_id=reference_lesson_id,
        reference_assessment_id=reference_assessment_id,
        reference_question_id=reference_question_id,
    )
    return {
        "queryText": query_text,
        "policy": policy_name,
        "count": len(results),
        "results": results,
    }
