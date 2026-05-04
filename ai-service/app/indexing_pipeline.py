from __future__ import annotations

import hashlib
import json
import logging
import re
from datetime import datetime, timezone
from dataclasses import dataclass
from typing import Any

from sqlalchemy import bindparam, text as sa_text
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import AsyncSession

from .embedding_provider import (
    embed_texts,
    embedding_to_vector_literal,
    get_embedding_model_label,
    get_embedding_provider,
)

logger = logging.getLogger(__name__)


def _normalize_json_payload(value: Any, *, fallback: Any) -> Any:
    if value is None:
        return fallback
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return fallback
    return value


def _coerce_datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc) if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if not isinstance(value, str):
        return None
    normalized = value.strip()
    if not normalized:
        return None
    if normalized.endswith("Z"):
        normalized = normalized[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    return parsed.astimezone(timezone.utc) if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _to_iso_datetime(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.astimezone(timezone.utc).isoformat()


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
                        "documentId": f"lesson:{row['lesson_id']}:block:{row['block_id']}",
                        "classId": str(row["class_id"]),
                        "lessonId": str(row["lesson_id"]),
                        "lessonTitle": row["lesson_title"],
                        "lessonOrder": row["lesson_order"],
                        "blockType": row["block_type"],
                        "sourceReference": (
                            f"lesson:{row['lesson_id']} | block:{row['block_id']} | "
                            f"type:{row['block_type']} | order:{idx}"
                        ),
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

        sections = structured.get("sections")
        if not isinstance(sections, list):
            legacy_lessons = structured.get("lessons")
            if isinstance(legacy_lessons, list):
                sections = [
                    {
                        "title": lesson.get("title") if isinstance(lesson, dict) else f"Section {idx + 1}",
                        "description": lesson.get("description") if isinstance(lesson, dict) else "",
                        "lessonBlocks": lesson.get("blocks") if isinstance(lesson, dict) else [],
                        "assessmentDraft": lesson.get("assessmentDraft") if isinstance(lesson, dict) else None,
                    }
                    for idx, lesson in enumerate(legacy_lessons)
                ]
            else:
                sections = []

        for section_index, section in enumerate(sections):
            if not isinstance(section, dict):
                continue

            blocks = section.get("lessonBlocks")
            if not isinstance(blocks, list):
                blocks = section.get("blocks") if isinstance(section.get("blocks"), list) else []

            section_parts: list[str] = []
            section_description = str(section.get("description") or "").strip()
            if section_description:
                section_parts.append(section_description)
            graph_keywords = section.get("graphKeywords")
            if isinstance(graph_keywords, list):
                keyword_line = " ".join(
                    str(keyword).strip()
                    for keyword in graph_keywords
                    if isinstance(keyword, str) and keyword.strip()
                )
                if keyword_line:
                    section_parts.append(f"Section keywords: {keyword_line}")
            figure_references = section.get("figureReferences")
            if isinstance(figure_references, list):
                refs_line = " ".join(
                    str(reference).strip()
                    for reference in figure_references
                    if isinstance(reference, str) and reference.strip()
                )
                if refs_line:
                    section_parts.append(f"Figure references: {refs_line}")

            for block in blocks:
                if not isinstance(block, dict):
                    continue
                block_type = str(block.get("type") or "").strip().lower()
                content = block.get("content")
                if block_type in {"text", "question"}:
                    block_text = _stringify_content(content).strip()
                    if block_text:
                        section_parts.append(block_text)
                elif block_type == "image" and isinstance(content, dict):
                    caption = str(content.get("caption") or content.get("alt") or "").strip()
                    if caption:
                        section_parts.append(f"Image context: {caption}")

            assessment_draft = section.get("assessmentDraft")
            if isinstance(assessment_draft, dict):
                draft_title = str(assessment_draft.get("title") or "").strip()
                draft_description = str(assessment_draft.get("description") or "").strip()
                if draft_title:
                    section_parts.append(f"Section assessment draft: {draft_title}")
                if draft_description:
                    section_parts.append(draft_description)
                questions = assessment_draft.get("questions")
                if isinstance(questions, list):
                    for question in questions:
                        if not isinstance(question, dict):
                            continue
                        question_text = str(question.get("content") or "").strip()
                        if question_text:
                            section_parts.append(question_text)
                        options = question.get("options")
                        if isinstance(options, list):
                            option_lines = [
                                str(option.get("text")).strip()
                                for option in options
                                if isinstance(option, dict) and str(option.get("text") or "").strip()
                            ]
                            if option_lines:
                                section_parts.append("Options: " + " | ".join(option_lines))

            extraction_audit = structured.get("audit")
            if isinstance(extraction_audit, dict):
                coherence_warnings = extraction_audit.get("coherenceWarnings")
                if isinstance(coherence_warnings, list):
                    warning_text = " ".join(
                        str(item).strip()
                        for item in coherence_warnings
                        if isinstance(item, str) and item.strip()
                    )
                    if warning_text:
                        section_parts.append(f"Coherence context: {warning_text}")

            section_text = "\n\n".join(part for part in section_parts if part).strip()
            if not section_text:
                continue

            section_title = str(section.get("title") or f"Section {section_index + 1}")
            for idx, chunk_text in enumerate(chunk_text_for_indexing(section_text)):
                chunks.append(
                    IndexChunk(
                        source_type="extracted_module",
                        source_id=str(row["id"]),
                        class_id=str(row["class_id"]),
                        extraction_id=str(row["id"]),
                        chunk_text=chunk_text,
                        chunk_order=(section_index * 100) + idx,
                        metadata={
                            "documentId": f"extraction:{row['id']}:section:{section_index}",
                            "classId": str(row["class_id"]),
                            "extractionId": str(row["id"]),
                            "teacherId": str(row["teacher_id"]),
                            "title": structured.get("title"),
                            "sectionTitle": section_title,
                            "sectionIndex": section_index,
                            "blockType": "extracted_section",
                            "sourceReference": (
                                f"extraction:{row['id']} | section:{section_index} | chunk:{idx}"
                            ),
                            "subjectName": row.get("subject_name") or "Unknown subject",
                            "subjectCode": row.get("subject_code") or "Unknown code",
                            "gradeLevel": row.get("grade_level"),
                            "isApplied": bool(row.get("is_applied")),
                            "extractionAudit": structured.get("audit") or {},
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
                    "documentId": f"assessment:{row['assessment_id']}:question:{row['question_id']}",
                    "classId": str(row["class_id"]),
                    "assessmentId": str(row["assessment_id"]),
                    "questionId": str(row["question_id"]),
                    "assessmentTitle": row["assessment_title"],
                    "questionType": row["question_type"],
                    "questionOrder": row["question_order"],
                    "blockType": "assessment_question",
                    "sourceReference": (
                        f"assessment:{row['assessment_id']} | question:{row['question_id']} "
                        f"| order:{row['question_order']}"
                    ),
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


async def _fetch_lesson_status_rows(db: AsyncSession, class_id: str) -> list[dict[str, Any]]:
    rows = await db.execute(
        sa_text(
            """
            SELECT
              l.id AS lesson_id,
              l.title AS lesson_title,
              l."order" AS lesson_order,
              l.is_draft,
              GREATEST(
                COALESCE(l.updated_at, l.created_at),
                COALESCE(MAX(COALESCE(b.updated_at, b.created_at)), COALESCE(l.updated_at, l.created_at))
              ) AS source_updated_at,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', b.id,
                    'type', b.type,
                    'content', b.content
                  )
                  ORDER BY b."order"
                ) FILTER (WHERE b.id IS NOT NULL),
                '[]'::json
              ) AS blocks_json
            FROM lessons l
            LEFT JOIN lesson_content_blocks b ON b.lesson_id = l.id
            WHERE l.class_id = :classId
            GROUP BY l.id, l.title, l."order", l.is_draft, l.updated_at, l.created_at
            ORDER BY l."order" ASC
            """
        ),
        {"classId": class_id},
    )
    return [dict(row) for row in rows.mappings()]


async def _fetch_extraction_status_rows(db: AsyncSession, class_id: str) -> list[dict[str, Any]]:
    rows = await db.execute(
        sa_text(
            """
            SELECT
              e.id,
              e.file_id,
              e.class_id,
              e.teacher_id,
              e.extraction_status,
              e.structured_content,
              e.error_message,
              e.is_applied,
              COALESCE(e.updated_at, e.created_at) AS source_updated_at,
              f.original_name
            FROM extracted_modules e
            LEFT JOIN uploaded_files f ON f.id = e.file_id
            WHERE e.class_id = :classId
            ORDER BY e.created_at DESC
            """
        ),
        {"classId": class_id},
    )
    return [dict(row) for row in rows.mappings()]


async def _fetch_assessment_status_rows(db: AsyncSession, class_id: str) -> list[dict[str, Any]]:
    rows = await db.execute(
        sa_text(
            """
            SELECT
              a.id AS assessment_id,
              a.title AS assessment_title,
              COUNT(q.id) AS question_count,
              GREATEST(
                COALESCE(a.updated_at, a.created_at),
                COALESCE(MAX(COALESCE(q.updated_at, q.created_at)), COALESCE(a.updated_at, a.created_at))
              ) AS source_updated_at
            FROM assessments a
            LEFT JOIN assessment_questions q ON q.assessment_id = a.id
            WHERE a.class_id = :classId
            GROUP BY a.id, a.title, a.updated_at, a.created_at
            ORDER BY a.created_at DESC
            """
        ),
        {"classId": class_id},
    )
    return [dict(row) for row in rows.mappings()]


async def _fetch_chunk_status_rows(db: AsyncSession, class_id: str) -> list[dict[str, Any]]:
    rows = await db.execute(
        sa_text(
            """
            SELECT
              source_type,
              lesson_id,
              extraction_id,
              assessment_id,
              COUNT(*) AS chunk_count,
              MAX(COALESCE(updated_at, created_at)) AS last_indexed_at
            FROM content_chunks
            WHERE class_id = :classId
            GROUP BY source_type, lesson_id, extraction_id, assessment_id
            """
        ),
        {"classId": class_id},
    )
    return [dict(row) for row in rows.mappings()]


def build_class_index_status(
    class_id: str,
    *,
    lesson_rows: list[dict[str, Any]],
    extraction_rows: list[dict[str, Any]],
    assessment_rows: list[dict[str, Any]],
    chunk_rows: list[dict[str, Any]],
) -> dict[str, Any]:
    lesson_chunk_counts: dict[str, int] = {}
    extraction_chunk_counts: dict[str, int] = {}
    assessment_chunk_counts: dict[str, int] = {}
    lesson_chunks = 0
    extraction_chunks = 0
    question_chunks = 0
    chunks_indexed = 0
    last_indexed_at: datetime | None = None

    for row in chunk_rows:
        source_type = str(row.get("source_type") or "")
        chunk_count = int(row.get("chunk_count") or 0)
        chunks_indexed += chunk_count
        indexed_at = _coerce_datetime(row.get("last_indexed_at"))
        if indexed_at and (last_indexed_at is None or indexed_at > last_indexed_at):
            last_indexed_at = indexed_at

        if source_type == "lesson_block" and row.get("lesson_id"):
            lesson_id = str(row["lesson_id"])
            lesson_chunk_counts[lesson_id] = lesson_chunk_counts.get(lesson_id, 0) + chunk_count
            lesson_chunks += chunk_count
        elif source_type == "extracted_module" and row.get("extraction_id"):
            extraction_id = str(row["extraction_id"])
            extraction_chunk_counts[extraction_id] = extraction_chunk_counts.get(extraction_id, 0) + chunk_count
            extraction_chunks += chunk_count
        elif source_type == "assessment_question" and row.get("assessment_id"):
            assessment_id = str(row["assessment_id"])
            assessment_chunk_counts[assessment_id] = assessment_chunk_counts.get(assessment_id, 0) + chunk_count
            question_chunks += chunk_count

    latest_source_update_at: datetime | None = None
    ready_lessons: list[dict[str, Any]] = []
    lesson_blockers: list[dict[str, Any]] = []
    ready_extractions: list[dict[str, Any]] = []
    extraction_blockers: list[dict[str, Any]] = []
    assessments_with_questions = 0
    assessments_needing_index = 0
    total_assessment_questions = 0
    ready_sources_missing_index = 0

    for row in lesson_rows:
        lesson_id = str(row["lesson_id"])
        source_updated_at = _coerce_datetime(row.get("source_updated_at"))
        if source_updated_at and (
            latest_source_update_at is None or source_updated_at > latest_source_update_at
        ):
            latest_source_update_at = source_updated_at
        blocks = _normalize_json_payload(row.get("blocks_json"), fallback=[])
        if not isinstance(blocks, list):
            blocks = []
        readable_block_count = sum(
            1 for block in blocks if _stringify_content((block or {}).get("content")).strip()
        )
        chunk_count = lesson_chunk_counts.get(lesson_id, 0)

        if bool(row.get("is_draft")):
            lesson_blockers.append(
                {
                    "lessonId": lesson_id,
                    "title": row.get("lesson_title") or "Untitled lesson",
                    "reason": "Lesson is still in draft status.",
                    "updatedAt": _to_iso_datetime(source_updated_at),
                }
            )
            continue
        if not blocks:
            lesson_blockers.append(
                {
                    "lessonId": lesson_id,
                    "title": row.get("lesson_title") or "Untitled lesson",
                    "reason": "Lesson has no content blocks yet.",
                    "updatedAt": _to_iso_datetime(source_updated_at),
                }
            )
            continue
        if readable_block_count == 0:
            lesson_blockers.append(
                {
                    "lessonId": lesson_id,
                    "title": row.get("lesson_title") or "Untitled lesson",
                    "reason": "Lesson has no readable source content yet.",
                    "updatedAt": _to_iso_datetime(source_updated_at),
                }
            )
            continue

        if chunk_count == 0:
            ready_sources_missing_index += 1
        ready_lessons.append(
            {
                "lessonId": lesson_id,
                "title": row.get("lesson_title") or "Untitled lesson",
                "chunkCount": chunk_count,
                "status": "indexed" if chunk_count > 0 else "ready_to_index",
                "updatedAt": _to_iso_datetime(source_updated_at),
            }
        )

    for row in extraction_rows:
        extraction_id = str(row["id"])
        source_updated_at = _coerce_datetime(row.get("source_updated_at"))
        if source_updated_at and (
            latest_source_update_at is None or source_updated_at > latest_source_update_at
        ):
            latest_source_update_at = source_updated_at
        status = str(row.get("extraction_status") or "")
        structured_content = _normalize_json_payload(row.get("structured_content"), fallback=None)
        normalized_row = dict(row)
        normalized_row["structured_content"] = structured_content
        usable_chunks = (
            build_extraction_chunks([normalized_row])
            if status in {"completed", "applied"} and structured_content
            else []
        )
        chunk_count = extraction_chunk_counts.get(extraction_id, 0)
        title = (
            (structured_content or {}).get("title")
            if isinstance(structured_content, dict)
            else None
        ) or row.get("original_name") or extraction_id

        if status in {"pending", "processing"}:
            extraction_blockers.append(
                {
                    "extractionId": extraction_id,
                    "title": title,
                    "status": status,
                    "reason": "Extraction is still processing.",
                    "updatedAt": _to_iso_datetime(source_updated_at),
                }
            )
            continue
        if status == "failed":
            extraction_blockers.append(
                {
                    "extractionId": extraction_id,
                    "title": title,
                    "status": status,
                    "reason": str(row.get("error_message") or "Extraction failed before usable content was produced."),
                    "updatedAt": _to_iso_datetime(source_updated_at),
                }
            )
            continue
        if not structured_content or not usable_chunks:
            extraction_blockers.append(
                {
                    "extractionId": extraction_id,
                    "title": title,
                    "status": status or "completed",
                    "reason": "Extraction completed without usable structured content.",
                    "updatedAt": _to_iso_datetime(source_updated_at),
                }
            )
            continue

        if chunk_count == 0:
            ready_sources_missing_index += 1
        ready_extractions.append(
            {
                "extractionId": extraction_id,
                "title": title,
                "status": "indexed" if chunk_count > 0 else "ready_to_index",
                "chunkCount": chunk_count,
                "updatedAt": _to_iso_datetime(source_updated_at),
            }
        )

    for row in assessment_rows:
        source_updated_at = _coerce_datetime(row.get("source_updated_at"))
        if source_updated_at and (
            latest_source_update_at is None or source_updated_at > latest_source_update_at
        ):
            latest_source_update_at = source_updated_at
        question_count = int(row.get("question_count") or 0)
        total_assessment_questions += question_count
        if question_count <= 0:
            continue
        assessments_with_questions += 1
        assessment_id = str(row["assessment_id"])
        if assessment_chunk_counts.get(assessment_id, 0) == 0:
            assessments_needing_index += 1

    has_ready_sources = bool(ready_lessons or ready_extractions or assessments_with_questions)
    is_stale = False
    if has_ready_sources and latest_source_update_at is not None:
        is_stale = last_indexed_at is None or latest_source_update_at > last_indexed_at

    needs_reindex = bool(
        is_stale
        or ready_sources_missing_index > 0
        or assessments_needing_index > 0
        or (chunks_indexed == 0 and has_ready_sources)
    )

    reason: str | None = None
    if not has_ready_sources:
        if lesson_rows or extraction_rows or assessment_rows:
            reason = (
                "No usable class sources are ready yet. Publish lesson text, finish a completed "
                "extraction, or add assessment questions before generating."
            )
        else:
            reason = "This class has no source materials yet. Add lesson content before generating."
    elif chunks_indexed == 0:
        reason = "No indexed class source content found. Reindex the class sources before generating."
    elif is_stale:
        reason = "Class sources changed after the last index. Reindex the class sources to include the latest content."
    elif ready_sources_missing_index > 0 or assessments_needing_index > 0:
        reason = "Some ready class sources are not indexed yet. Reindex the class sources before generating."

    return {
        "classId": class_id,
        "chunksIndexed": chunks_indexed,
        "lessonChunks": lesson_chunks,
        "extractionChunks": extraction_chunks,
        "questionChunks": question_chunks,
        "lastIndexedAt": _to_iso_datetime(last_indexed_at),
        "latestSourceUpdateAt": _to_iso_datetime(latest_source_update_at),
        "isStale": is_stale,
        "needsReindex": needs_reindex,
        "reason": reason,
        "readyLessons": ready_lessons,
        "lessonBlockers": lesson_blockers,
        "readyExtractions": ready_extractions,
        "extractionBlockers": extraction_blockers,
        "sourceSummary": {
            "lessons": {
                "total": len(lesson_rows),
                "ready": len(ready_lessons),
                "blocked": len(lesson_blockers),
            },
            "extractions": {
                "total": len(extraction_rows),
                "ready": len(ready_extractions),
                "blocked": len(extraction_blockers),
            },
            "questions": {
                "assessments": len(assessment_rows),
                "assessmentsWithQuestions": assessments_with_questions,
                "questionCount": total_assessment_questions,
                "needsIndex": assessments_needing_index,
            },
        },
    }


async def get_class_index_status(db: AsyncSession, class_id: str) -> dict[str, Any]:
    lesson_rows = await _fetch_lesson_status_rows(db, class_id)
    extraction_rows = await _fetch_extraction_status_rows(db, class_id)
    assessment_rows = await _fetch_assessment_status_rows(db, class_id)
    chunk_rows = await _fetch_chunk_status_rows(db, class_id)
    return build_class_index_status(
        class_id,
        lesson_rows=lesson_rows,
        extraction_rows=extraction_rows,
        assessment_rows=assessment_rows,
        chunk_rows=chunk_rows,
    )


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
        return {
            "classId": class_id,
            "chunksIndexed": 0,
            "lessonChunks": 0,
            "extractionChunks": 0,
            "questionChunks": 0,
            "lastIndexedAt": None,
            "degraded": False,
            "warnings": [],
            "embeddingProvider": get_embedding_provider(),
            "embeddingModel": get_embedding_model_label(),
        }

    lesson_chunk_count = len(build_lesson_chunks(lesson_rows))
    extraction_chunk_count = len(build_extraction_chunks(extraction_rows))
    question_chunk_count = len(build_question_chunks(question_rows))
    embeddings = await embed_texts([chunk.chunk_text for chunk in chunks])
    embedding_model = get_embedding_model_label(embeddings)
    embedding_provider = get_embedding_provider(embeddings)
    embedding_degraded = bool(getattr(embeddings, "degraded", False))
    embedding_warnings = list(getattr(embeddings, "warnings", []) or [])
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
                "embeddingModel": embedding_model,
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
        "lastIndexedAt": _to_iso_datetime(datetime.now(timezone.utc)),
        "degraded": embedding_degraded,
        "warnings": embedding_warnings,
        "embeddingProvider": embedding_provider,
        "embeddingModel": embedding_model,
    }
