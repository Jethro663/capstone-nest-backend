from __future__ import annotations

import hashlib
import json
import logging
import re
from dataclasses import dataclass
from typing import Any

from sqlalchemy import bindparam, text as sa_text
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import AsyncSession

from . import ollama_client
from .embedding_provider import embed_texts, embedding_to_vector_literal

logger = logging.getLogger(__name__)


@dataclass
class IndexChunk:
    source_type: str
    source_id: str
    class_id: str
    chunk_text: str
    metadata: dict[str, Any]
    chunk_order: int
    lesson_id: str | None = None
    assessment_id: str | None = None
    question_id: str | None = None
    extraction_id: str | None = None


def estimate_token_count(text: str) -> int:
    return max(1, len(text.split()))


def chunk_text_for_indexing(
    text: str,
    *,
    max_chars: int = 2400,
    overlap_chars: int = 300,
) -> list[str]:
    normalized = re.sub(r"\s+", " ", (text or "").strip())
    if not normalized:
        return []
    if len(normalized) <= max_chars:
        return [normalized]

    chunks: list[str] = []
    start = 0
    while start < len(normalized):
        end = min(len(normalized), start + max_chars)
        if end < len(normalized):
            sentence_break = normalized.rfind(". ", start, end)
            paragraph_break = normalized.rfind(" ", start, end)
            best_break = sentence_break if sentence_break > start + 1200 else paragraph_break
            if best_break > start:
                end = best_break + 1
        chunks.append(normalized[start:end].strip())
        if end >= len(normalized):
            break
        start = max(0, end - overlap_chars)
    return [chunk for chunk in chunks if chunk]


def _stringify_content(content: Any) -> str:
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, dict):
        preferred_keys = ["text", "question", "prompt", "body", "caption", "title"]
        ordered_values = [str(content[key]).strip() for key in preferred_keys if content.get(key)]
        if ordered_values:
            return "\n".join(ordered_values)
        return json.dumps(content, ensure_ascii=True)
    if isinstance(content, list):
        return "\n".join(_stringify_content(item) for item in content if item)
    return str(content)


def build_lesson_chunks(rows: list[dict[str, Any]]) -> list[IndexChunk]:
    chunks: list[IndexChunk] = []
    for row in rows:
        block_text = _stringify_content(row["content"])
        if not block_text.strip():
            continue
        for idx, chunk_text in enumerate(chunk_text_for_indexing(block_text)):
            chunks.append(
                IndexChunk(
                    source_type="lesson_block",
                    source_id=str(row["block_id"]),
                    class_id=str(row["class_id"]),
                    lesson_id=str(row["lesson_id"]),
                    chunk_text=chunk_text,
                    chunk_order=idx,
                    metadata={
                        "classId": str(row["class_id"]),
                        "lessonId": str(row["lesson_id"]),
                        "lessonTitle": row["lesson_title"],
                        "lessonOrder": row["lesson_order"],
                        "blockType": row["block_type"],
                        "teacherId": str(row["teacher_id"]),
                        "subjectName": row["subject_name"],
                        "subjectCode": row["subject_code"],
                        "gradeLevel": row["grade_level"],
                        "isDraft": row["is_draft"],
                        "sourceExtractionId": str(row["source_extraction_id"])
                        if row["source_extraction_id"]
                        else None,
                    },
                )
            )
    return chunks


def build_extraction_chunks(rows: list[dict[str, Any]]) -> list[IndexChunk]:
    chunks: list[IndexChunk] = []
    for row in rows:
        structured = row["structured_content"]
        if isinstance(structured, str):
            structured = json.loads(structured)
        if not structured:
            continue

        lessons = structured.get("lessons") or []
        for lesson_index, lesson in enumerate(lessons):
            lesson_text = "\n\n".join(
                _stringify_content(block.get("content"))
                for block in lesson.get("blocks", [])
                if block.get("type") in {"text", "question"}
            ).strip()
            if not lesson_text:
                continue
            for idx, chunk_text in enumerate(chunk_text_for_indexing(lesson_text)):
                chunks.append(
                    IndexChunk(
                        source_type="extracted_module",
                        source_id=str(row["id"]),
                        class_id=str(row["class_id"]),
                        extraction_id=str(row["id"]),
                        chunk_text=chunk_text,
                        chunk_order=(lesson_index * 100) + idx,
                        metadata={
                            "classId": str(row["class_id"]),
                            "extractionId": str(row["id"]),
                            "teacherId": str(row["teacher_id"]),
                            "title": structured.get("title"),
                            "lessonTitle": lesson.get("title"),
                            "lessonIndex": lesson_index,
                            "subjectName": row["subject_name"],
                            "subjectCode": row["subject_code"],
                            "gradeLevel": row["grade_level"],
                            "isApplied": row["is_applied"],
                        },
                    )
                )
    return chunks


def build_question_chunks(rows: list[dict[str, Any]]) -> list[IndexChunk]:
    chunks: list[IndexChunk] = []
    for row in rows:
        options = row.get("options_json") or []
        if isinstance(options, str):
            try:
                options = json.loads(options)
            except json.JSONDecodeError:
                options = []
        option_text = "\n".join(
            f"- {item.get('text', '').strip()}"
            for item in options
            if item.get("text")
        )
        explanation = row.get("explanation") or ""
        concept_tags = row.get("concept_tags") or []
        if isinstance(concept_tags, str):
            try:
                concept_tags = json.loads(concept_tags)
            except json.JSONDecodeError:
                concept_tags = []
        content_parts = [row["content"]]
        if option_text:
            content_parts.append(f"Options:\n{option_text}")
        if explanation:
            content_parts.append(f"Explanation:\n{explanation}")
        chunk_text = "\n\n".join(part for part in content_parts if part)
        if not chunk_text.strip():
            continue
        chunks.append(
            IndexChunk(
                source_type="assessment_question",
                source_id=str(row["question_id"]),
                class_id=str(row["class_id"]),
                assessment_id=str(row["assessment_id"]),
                question_id=str(row["question_id"]),
                chunk_text=chunk_text,
                chunk_order=int(row["question_order"] or 0),
                metadata={
                    "classId": str(row["class_id"]),
                    "assessmentId": str(row["assessment_id"]),
                    "questionId": str(row["question_id"]),
                    "assessmentTitle": row["assessment_title"],
                    "questionType": row["question_type"],
                    "questionOrder": row["question_order"],
                    "teacherId": str(row["teacher_id"]),
                    "subjectName": row["subject_name"],
                    "subjectCode": row["subject_code"],
                    "gradeLevel": row["grade_level"],
                    "isPublished": row["is_published"],
                    "conceptTags": concept_tags,
                },
            )
        )
    return chunks


async def _fetch_lesson_rows(db: AsyncSession, class_id: str) -> list[dict[str, Any]]:
    rows = await db.execute(
        sa_text(
            """
            SELECT
              l.id AS lesson_id,
              l.title AS lesson_title,
              l."order" AS lesson_order,
              l.is_draft,
              l.source_extraction_id,
              c.id AS class_id,
              c.teacher_id,
              c.subject_name,
              c.subject_code,
              s.grade_level,
              b.id AS block_id,
              b.type AS block_type,
              b.content
            FROM lessons l
            INNER JOIN classes c ON c.id = l.class_id
            LEFT JOIN sections s ON s.id = c.section_id
            INNER JOIN lesson_content_blocks b ON b.lesson_id = l.id
            WHERE l.class_id = :classId
              AND l.is_draft = false
            ORDER BY l."order" ASC, b."order" ASC
            """
        ),
        {"classId": class_id},
    )
    return [dict(row) for row in rows.mappings()]


async def _fetch_extraction_rows(db: AsyncSession, class_id: str) -> list[dict[str, Any]]:
    rows = await db.execute(
        sa_text(
            """
            SELECT
              e.id,
              e.class_id,
              e.teacher_id,
              e.is_applied,
              e.structured_content,
              c.subject_name,
              c.subject_code,
              s.grade_level
            FROM extracted_modules e
            INNER JOIN classes c ON c.id = e.class_id
            LEFT JOIN sections s ON s.id = c.section_id
            WHERE e.class_id = :classId
              AND e.extraction_status IN ('completed', 'applied')
              AND e.structured_content IS NOT NULL
            ORDER BY e.created_at DESC
            """
        ),
        {"classId": class_id},
    )
    return [dict(row) for row in rows.mappings()]


async def _fetch_question_rows(db: AsyncSession, class_id: str) -> list[dict[str, Any]]:
    rows = await db.execute(
        sa_text(
            """
            SELECT
              a.id AS assessment_id,
              a.title AS assessment_title,
              a.class_id,
              a.is_published,
              c.teacher_id,
              c.subject_name,
              c.subject_code,
              s.grade_level,
              q.id AS question_id,
              q.content,
              q.type AS question_type,
              q."order" AS question_order,
              q.explanation,
              q.concept_tags,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', o.id,
                    'text', o.text,
                    'isCorrect', o.is_correct,
                    'order', o."order"
                  )
                  ORDER BY o."order"
                ) FILTER (WHERE o.id IS NOT NULL),
                '[]'::json
              ) AS options_json
            FROM assessments a
            INNER JOIN classes c ON c.id = a.class_id
            LEFT JOIN sections s ON s.id = c.section_id
            INNER JOIN assessment_questions q ON q.assessment_id = a.id
            LEFT JOIN assessment_question_options o ON o.question_id = q.id
            WHERE a.class_id = :classId
            GROUP BY
              a.id, a.title, a.class_id, a.is_published,
              c.teacher_id, c.subject_name, c.subject_code, s.grade_level,
              q.id, q.content, q.type, q."order", q.explanation, q.concept_tags
            ORDER BY a.created_at DESC, q."order" ASC
            """
        ),
        {"classId": class_id},
    )
    return [dict(row) for row in rows.mappings()]


async def reindex_class_content(db: AsyncSession, class_id: str) -> dict[str, Any]:
    lesson_rows = await _fetch_lesson_rows(db, class_id)
    extraction_rows = await _fetch_extraction_rows(db, class_id)
    question_rows = await _fetch_question_rows(db, class_id)

    chunks = (
        build_lesson_chunks(lesson_rows)
        + build_extraction_chunks(extraction_rows)
        + build_question_chunks(question_rows)
    )

    await db.execute(
        sa_text(
            """
            DELETE FROM content_chunks
            WHERE class_id = :classId
            """
        ),
        {"classId": class_id},
    )
    await db.commit()

    if not chunks:
        return {"classId": class_id, "chunksIndexed": 0}

    lesson_chunk_count = len(build_lesson_chunks(lesson_rows))
    extraction_chunk_count = len(build_extraction_chunks(extraction_rows))
    question_chunk_count = len(build_question_chunks(question_rows))
    embeddings = await embed_texts([chunk.chunk_text for chunk in chunks])
    created = 0

    for chunk, embedding in zip(chunks, embeddings):
        content_hash = hashlib.sha256(
            f"{chunk.source_type}:{chunk.source_id}:{chunk.chunk_order}:{chunk.chunk_text}".encode(
                "utf-8"
            )
        ).hexdigest()

        insert_result = await db.execute(
            sa_text(
                """
                INSERT INTO content_chunks (
                  source_type,
                  source_id,
                  class_id,
                  lesson_id,
                  assessment_id,
                  question_id,
                  extraction_id,
                  chunk_text,
                  chunk_order,
                  token_count,
                  content_hash,
                  metadata_json
                )
                VALUES (
                  :sourceType,
                  :sourceId,
                  :classId,
                  :lessonId,
                  :assessmentId,
                  :questionId,
                  :extractionId,
                  :chunkText,
                  :chunkOrder,
                  :tokenCount,
                  :contentHash,
                  :metadataJson
                )
                RETURNING id
                """
            ).bindparams(bindparam("metadataJson", type_=postgresql.JSONB)),
            {
                "sourceType": chunk.source_type,
                "sourceId": chunk.source_id,
                "classId": chunk.class_id,
                "lessonId": chunk.lesson_id,
                "assessmentId": chunk.assessment_id,
                "questionId": chunk.question_id,
                "extractionId": chunk.extraction_id,
                "chunkText": chunk.chunk_text,
                "chunkOrder": chunk.chunk_order,
                "tokenCount": estimate_token_count(chunk.chunk_text),
                "contentHash": content_hash,
                "metadataJson": chunk.metadata,
            },
        )
        chunk_id = insert_result.scalar_one()
        await db.execute(
            sa_text(
                """
                INSERT INTO content_chunk_embeddings (
                  chunk_id,
                  embedding,
                  embedding_model,
                  embedded_at
                )
                VALUES (
                  :chunkId,
                  CAST(:embedding AS vector),
                  :embeddingModel,
                  NOW()
                )
                """
            ),
            {
                "chunkId": chunk_id,
                "embedding": embedding_to_vector_literal(embedding),
                "embeddingModel": "ollama:" + ollama_client.get_embedding_model_name(),
            },
        )
        created += 1

    await db.commit()
    logger.info("[index] Reindexed class %s with %d content chunk(s)", class_id, created)
    return {
        "classId": class_id,
        "chunksIndexed": created,
        "lessonChunks": lesson_chunk_count,
        "extractionChunks": extraction_chunk_count,
        "questionChunks": question_chunk_count,
    }
