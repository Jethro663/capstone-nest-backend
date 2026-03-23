from __future__ import annotations

import json
import logging
import re
from typing import Any

from fastapi import HTTPException
from sqlalchemy import bindparam, text as sa_text
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import AsyncSession

from . import ollama_client
from .retrieval_service import similarity_search
from .schemas import GenerateQuizDraftRequest, RequestUser

logger = logging.getLogger(__name__)

QUIZ_GENERATION_SYSTEM_PROMPT = """You generate grounded draft assessments for a high-school LMS.

RULES:
- Use only the provided source material.
- Output valid JSON only.
- Create questions that test understanding, not trivia.
- Avoid duplicating the provided existing questions.
- Prefer clear wording suitable for Grade 7-10 students.

JSON FORMAT:
{
  "title": "Assessment title",
  "description": "Short teacher-facing summary",
  "questions": [
    {
      "type": "multiple_choice",
      "content": "Question text",
      "points": 1,
      "explanation": "Why the correct answer is correct",
      "conceptTags": ["concept 1", "concept 2"],
      "options": [
        { "text": "Option A", "isCorrect": false, "order": 1 },
        { "text": "Option B", "isCorrect": true, "order": 2 }
      ]
    }
  ]
}
"""

QUIZ_GENERATION_FORMAT: dict[str, Any] = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "description": {"type": "string"},
        "questions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {"type": "string"},
                    "content": {"type": "string"},
                    "points": {"type": "integer"},
                    "explanation": {"type": "string"},
                    "conceptTags": {"type": "array", "items": {"type": "string"}},
                    "options": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "isCorrect": {"type": "boolean"},
                                "order": {"type": "integer"},
                            },
                            "required": ["text", "isCorrect", "order"],
                        },
                    },
                },
                "required": ["type", "content", "points", "explanation", "conceptTags", "options"],
            },
        },
    },
    "required": ["title", "description", "questions"],
}

QUIZ_BLUEPRINT_FORMAT: dict[str, Any] = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "description": {"type": "string"},
        "conceptCoverage": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 1,
            "maxItems": 8,
        },
        "questionBlueprints": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "intent": {"type": "string"},
                    "difficulty": {"type": "string"},
                    "sourceCitation": {"type": "string"},
                },
                "required": ["intent", "difficulty", "sourceCitation"],
            },
        },
    },
    "required": ["title", "description", "conceptCoverage", "questionBlueprints"],
}


def _normalize_question_text(value: str) -> str:
    return " ".join(re.findall(r"[a-z0-9]+", (value or "").lower()))


def _extract_json_payload(raw: str) -> str:
    cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    first = cleaned.find("{")
    last = cleaned.rfind("}")
    if first == -1 or last <= first:
        raise ValueError("Model output did not contain a JSON object")
    return cleaned[first : last + 1]


def _parse_generation_output(raw: str) -> dict[str, Any]:
    cleaned = _extract_json_payload(raw)
    parsed = json.loads(cleaned)
    if not isinstance(parsed.get("questions"), list) or not parsed["questions"]:
        raise ValueError("Generated output does not contain any questions")
    return parsed


def _dedupe_generated_questions(
    generated: list[dict[str, Any]],
    existing_texts: set[str],
) -> list[dict[str, Any]]:
    deduped: list[dict[str, Any]] = []
    seen_generated = set(existing_texts)
    for question in generated:
        normalized = _normalize_question_text(question.get("content", ""))
        if not normalized or normalized in seen_generated:
            continue
        seen_generated.add(normalized)
        deduped.append(question)
    return deduped


def _sanitize_prompt_text(value: str, *, max_chars: int) -> str:
    normalized = (value or "").replace("\r\n", "\n").replace("\r", "\n")
    normalized = re.sub(r"[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]", "", normalized)
    normalized = re.sub(r"[ \t]{2,}", " ", normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized).strip()
    if len(normalized) > max_chars:
        normalized = normalized[: max_chars - 3].rstrip() + "..."
    return normalized


def _build_blueprint_evidence(source_chunks: list[dict[str, Any]], *, strict: bool = False) -> str:
    max_chunks = 3 if strict else 5
    max_text_chars = 280 if strict else 520
    rendered: list[str] = []
    for item in source_chunks[:max_chunks]:
        metadata = item.get("metadataJson") or {}
        concept_tags = metadata.get("conceptTags") or []
        if not isinstance(concept_tags, list):
            concept_tags = []
        snippet = _sanitize_prompt_text(item.get("chunkText") or "", max_chars=max_text_chars)
        label = _sanitize_prompt_text(item.get("sourceReference") or item.get("sourceType") or "source", max_chars=140)
        concept_line = ", ".join(str(tag).strip() for tag in concept_tags[:4] if str(tag).strip())
        parts = [f"Citation: {label}"]
        if concept_line:
            parts.append(f"Concepts: {concept_line}")
        parts.append(f"Evidence snippet: {snippet}")
        rendered.append("\n".join(parts))
    return "\n\n".join(rendered)


def _parse_quiz_blueprint_output(raw: str) -> dict[str, Any]:
    cleaned = _extract_json_payload(raw)
    parsed = json.loads(cleaned)
    if not isinstance(parsed, dict):
        raise ValueError("Blueprint output is not a JSON object")
    if not isinstance(parsed.get("conceptCoverage"), list) or not parsed["conceptCoverage"]:
        raise ValueError("Blueprint output did not contain concept coverage")
    if not isinstance(parsed.get("questionBlueprints"), list) or not parsed["questionBlueprints"]:
        raise ValueError("Blueprint output did not contain question blueprints")
    return parsed


def _log_blueprint_parse_failure(
    *,
    raw: str,
    error: Exception,
    class_id: str,
    stage: str,
) -> None:
    logger.warning(
        "[quiz-blueprint] Parse failure for class %s at stage %s: %s | raw=%r",
        class_id,
        stage,
        str(error),
        _sanitize_prompt_text(raw, max_chars=500),
    )


def _fallback_quiz_blueprint(
    *,
    class_info: dict[str, Any],
    body: GenerateQuizDraftRequest,
    source_chunks: list[dict[str, Any]],
) -> dict[str, Any]:
    concept_coverage: list[str] = []
    for item in source_chunks[: max(body.question_count, 3)]:
        metadata = item.get("metadataJson") or {}
        raw_tags = metadata.get("conceptTags") or []
        if isinstance(raw_tags, list):
            for tag in raw_tags:
                normalized = str(tag).strip()
                if normalized and normalized not in concept_coverage:
                    concept_coverage.append(normalized)
        lesson_title = str(metadata.get("lessonTitle") or "").strip()
        if lesson_title and lesson_title not in concept_coverage:
            concept_coverage.append(lesson_title)
        if len(concept_coverage) >= 8:
            break
    if not concept_coverage:
        concept_coverage.append(str(class_info["subject_name"]))

    question_blueprints: list[dict[str, str]] = []
    difficulties = ["easy", "easy", "medium", "medium", "medium", "challenging"]
    selected_sources = source_chunks[: max(body.question_count, 3)] or source_chunks[:1]
    for index in range(body.question_count):
        source = selected_sources[index % len(selected_sources)]
        metadata = source.get("metadataJson") or {}
        focus = concept_coverage[index % len(concept_coverage)]
        citation = (
            source.get("sourceReference")
            or metadata.get("lessonTitle")
            or metadata.get("assessmentTitle")
            or source.get("sourceType")
            or "class material"
        )
        question_blueprints.append(
            {
                "intent": f"Check understanding of {focus} using grounded class material.",
                "difficulty": difficulties[min(index, len(difficulties) - 1)],
                "sourceCitation": str(citation),
            }
        )

    return {
        "title": body.title or f"{class_info['subject_name']} AI Draft Quiz",
        "description": "Fallback blueprint derived from selected class evidence.",
        "conceptCoverage": concept_coverage[:8],
        "questionBlueprints": question_blueprints,
        "blueprintSource": "fallback",
    }


async def generate_quiz_draft(
    db: AsyncSession,
    user: RequestUser,
    body: GenerateQuizDraftRequest,
    *,
    existing_job_id: str | None = None,
) -> dict[str, Any]:
    class_row = await db.execute(
        sa_text(
            """
            SELECT c.id, c.teacher_id, c.subject_name, c.subject_code, s.grade_level
            FROM classes c
            LEFT JOIN sections s ON s.id = c.section_id
            WHERE c.id = :classId
            """
        ),
        {"classId": body.class_id},
    )
    class_info = class_row.mappings().first()
    if not class_info:
        raise HTTPException(404, "Class not found")

    is_admin = "admin" in [role.lower() for role in user.roles]
    if not is_admin and str(class_info["teacher_id"]) != user.id:
        raise HTTPException(403, "You can only generate quizzes for your own classes")

    source_chunks: list[dict[str, Any]]
    if body.lesson_ids:
        source_chunks = await similarity_search(
            db,
            query_text=body.teacher_note or class_info["subject_name"],
            class_id=body.class_id,
            top_k=max(8, body.question_count * 2),
            lesson_ids=body.lesson_ids,
            only_published=False,
            policy_name="quiz_generation",
        )
    elif body.extraction_ids:
        source_chunks = await similarity_search(
            db,
            query_text=body.teacher_note or class_info["subject_name"],
            class_id=body.class_id,
            top_k=max(8, body.question_count * 2),
            source_types=["extracted_module"],
            policy_name="quiz_generation",
        )
        source_chunks = [
            item for item in source_chunks if item.get("extractionId") in set(body.extraction_ids)
        ]
    else:
        source_chunks = await similarity_search(
            db,
            query_text=body.teacher_note or class_info["subject_name"],
            class_id=body.class_id,
            top_k=max(8, body.question_count * 2),
            only_published=True,
            policy_name="quiz_generation",
        )

    if not source_chunks:
        raise HTTPException(400, "No indexed source content found. Reindex the class or publish lessons first.")

    existing_questions_rows = await db.execute(
        sa_text(
            """
            SELECT q.content
            FROM assessment_questions q
            INNER JOIN assessments a ON a.id = q.assessment_id
            WHERE a.class_id = :classId
            """
        ),
        {"classId": body.class_id},
    )
    existing_question_texts = {
        _normalize_question_text(row["content"])
        for row in existing_questions_rows.mappings()
        if row["content"]
    }

    source_material = "\n\n".join(
        (
            f"[{item.get('metadataJson', {}).get('lessonTitle') or item.get('metadataJson', {}).get('assessmentTitle') or item['sourceType']}]\n"
            f"{_sanitize_prompt_text(item['chunkText'], max_chars=900)}"
        )
        for item in source_chunks[: min(len(source_chunks), 8)]
    )
    blueprint = await _build_quiz_blueprint(
        class_info=class_info,
        body=body,
        source_chunks=source_chunks,
        existing_question_texts=existing_question_texts,
    )

    prompt = f"""
Subject: {class_info["subject_name"]} ({class_info["subject_code"]})
Grade level: {class_info["grade_level"] or "Unknown"}
Teacher draft title: {body.title or f"{class_info['subject_name']} AI Draft Quiz"}
Requested question count: {body.question_count}
Preferred question type: {body.question_type}
Teacher note: {body.teacher_note or "[None]"}
Blueprint:
{json.dumps(blueprint, ensure_ascii=False)}

Existing question texts to avoid:
{chr(10).join(sorted(existing_question_texts)[:30])}

Source material:
{source_material}
"""

    raw = await ollama_client.generate(
        prompt,
        QUIZ_GENERATION_SYSTEM_PROMPT,
        task="quiz_generation",
        response_format=QUIZ_GENERATION_FORMAT,
    )
    parsed = _parse_generation_output(raw)
    questions = _dedupe_generated_questions(parsed.get("questions", []), existing_question_texts)
    questions = _validate_generated_questions(questions, source_chunks)

    if not questions:
        raise HTTPException(400, "Generated questions were duplicates of existing content. Try a narrower source selection.")

    questions = questions[: body.question_count]

    if existing_job_id:
        await db.execute(
            sa_text(
                """
                UPDATE ai_generation_jobs
                SET
                  status = 'processing',
                  error_message = NULL,
                  source_filters = :sourceFilters,
                  updated_at = NOW()
                WHERE id = :jobId
                """
            ).bindparams(bindparam("sourceFilters", type_=postgresql.JSONB)),
            {
                "jobId": existing_job_id,
                "sourceFilters": {
                    "lessonIds": body.lesson_ids,
                    "extractionIds": body.extraction_ids,
                    "questionCount": body.question_count,
                },
            },
        )
        job_id = existing_job_id
    else:
        job_row = await db.execute(
            sa_text(
                """
                INSERT INTO ai_generation_jobs (
                  job_type,
                  class_id,
                  teacher_id,
                  status,
                  source_filters
                )
                VALUES (
                  'quiz_generation',
                  :classId,
                  :teacherId,
                  'completed',
                  :sourceFilters
                )
                RETURNING id
                """
            ).bindparams(bindparam("sourceFilters", type_=postgresql.JSONB)),
            {
                "classId": body.class_id,
                "teacherId": user.id,
                "sourceFilters": {
                    "lessonIds": body.lesson_ids,
                    "extractionIds": body.extraction_ids,
                    "questionCount": body.question_count,
                },
            },
        )
        job_id = job_row.scalar_one()

    structured_output = {
        "title": parsed.get("title") or body.title or f"{class_info['subject_name']} AI Draft Quiz",
        "description": parsed.get("description") or "AI-generated draft assessment for teacher review.",
        "blueprint": blueprint,
        "blueprintSource": blueprint.get("blueprintSource", "model"),
        "questions": questions,
    }
    output_row = await db.execute(
        sa_text(
            """
            INSERT INTO ai_generation_outputs (
              job_id,
              output_type,
              target_class_id,
              target_teacher_id,
              source_filters,
              structured_output,
              status
            )
            VALUES (
              :jobId,
              'assessment_draft',
              :classId,
              :teacherId,
              :sourceFilters,
              :structuredOutput,
              'completed'
            )
            RETURNING id
            """
        ).bindparams(
            bindparam("sourceFilters", type_=postgresql.JSONB),
            bindparam("structuredOutput", type_=postgresql.JSONB),
        ),
        {
            "jobId": job_id,
            "classId": body.class_id,
            "teacherId": user.id,
            "sourceFilters": {
                "lessonIds": body.lesson_ids,
                "extractionIds": body.extraction_ids,
            },
            "structuredOutput": structured_output,
        },
    )
    output_id = output_row.scalar_one()

    assessment_insert = await db.execute(
        sa_text(
            """
            INSERT INTO assessments (
              title,
              description,
              class_id,
              type,
              total_points,
              passing_score,
              feedback_level,
              class_record_category,
              quarter,
              is_published,
              ai_origin,
              ai_generation_output_id
            )
            VALUES (
              :title,
              :description,
              :classId,
              :assessmentType,
              :totalPoints,
              :passingScore,
              :feedbackLevel,
              :classRecordCategory,
              :quarter,
              false,
              'ai_generated',
              :outputId
            )
            RETURNING id
            """
        ),
        {
            "title": structured_output["title"],
            "description": structured_output["description"],
            "classId": body.class_id,
            "assessmentType": body.assessment_type,
            "totalPoints": sum(int(question.get("points", 1)) for question in questions),
            "passingScore": body.passing_score,
            "feedbackLevel": body.feedback_level,
            "classRecordCategory": body.class_record_category,
            "quarter": body.quarter,
            "outputId": output_id,
        },
    )
    assessment_id = assessment_insert.scalar_one()

    for order, question in enumerate(questions, start=1):
        question_insert = await db.execute(
            sa_text(
                """
                INSERT INTO assessment_questions (
                  assessment_id,
                  type,
                  content,
                  points,
                  "order",
                  explanation,
                  concept_tags
                )
                VALUES (
                  :assessmentId,
                  :type,
                  :content,
                  :points,
                  :order,
                  :explanation,
                  :conceptTags
                )
                RETURNING id
                """
            ).bindparams(bindparam("conceptTags", type_=postgresql.JSONB)),
            {
                "assessmentId": assessment_id,
                "type": question.get("type", body.question_type),
                "content": question.get("content"),
                "points": int(question.get("points", 1)),
                "order": order,
                "explanation": question.get("explanation"),
                "conceptTags": question.get("conceptTags") or [],
            },
        )
        question_id = question_insert.scalar_one()
        for option_order, option in enumerate(question.get("options", []), start=1):
            await db.execute(
                sa_text(
                    """
                    INSERT INTO assessment_question_options (
                      question_id,
                      text,
                      is_correct,
                      "order"
                    )
                    VALUES (
                      :questionId,
                      :text,
                      :isCorrect,
                      :order
                    )
                    """
                ),
                {
                    "questionId": question_id,
                    "text": option.get("text"),
                    "isCorrect": bool(option.get("isCorrect")),
                    "order": int(option.get("order", option_order)),
                },
            )

    await db.execute(
        sa_text(
            """
            UPDATE ai_generation_jobs
            SET
              status = 'completed',
              error_message = NULL,
              updated_at = NOW()
            WHERE id = :jobId
            """
        ),
        {"jobId": job_id},
    )
    await db.commit()

    return {
        "jobId": str(job_id),
        "outputId": str(output_id),
        "assessmentId": str(assessment_id),
        "title": structured_output["title"],
        "blueprint": blueprint,
        "blueprintSource": structured_output["blueprintSource"],
        "sourceCitations": [
            {
                "chunkId": item["id"],
                "sourceReference": item.get("sourceReference"),
                "selectionReason": item.get("selectionReason"),
                "scoreBreakdown": item.get("scoreBreakdown") or {},
            }
            for item in source_chunks[: min(len(source_chunks), 6)]
        ],
        "questionsCreated": len(questions),
        "message": "AI draft assessment created as an unpublished draft for teacher review.",
    }


async def _build_quiz_blueprint(
    *,
    class_info: dict[str, Any],
    body: GenerateQuizDraftRequest,
    source_chunks: list[dict[str, Any]],
    existing_question_texts: set[str],
) -> dict[str, Any]:
    prompt = f"""
Build a quiz blueprint before writing any questions.

Subject: {class_info["subject_name"]} ({class_info["subject_code"]})
Grade level: {class_info["grade_level"] or "Unknown"}
Requested question count: {body.question_count}
Preferred question type: {body.question_type}
Teacher note: {body.teacher_note or "[None]"}

Existing question texts to avoid:
{_sanitize_prompt_text(chr(10).join(sorted(existing_question_texts)[:20]), max_chars=1200)}

Source evidence:
{_build_blueprint_evidence(source_chunks)}

Return valid JSON only. The blueprint must specify concept coverage and one question blueprint per requested question.
"""
    raw = await ollama_client.generate(
        prompt,
        QUIZ_GENERATION_SYSTEM_PROMPT,
        task="quiz_generation",
        response_format=QUIZ_BLUEPRINT_FORMAT,
    )
    try:
        parsed = _parse_quiz_blueprint_output(raw)
        parsed["blueprintSource"] = "model"
        return parsed
    except (json.JSONDecodeError, ValueError) as err:
        _log_blueprint_parse_failure(
            raw=raw,
            error=err,
            class_id=str(class_info["id"]),
            stage="quiz_blueprint_initial",
        )

    retry_prompt = f"""
Build a compact quiz blueprint.

Return one JSON object only. Do not include commentary. Keep every string short.

Subject: {class_info["subject_name"]} ({class_info["subject_code"]})
Grade level: {class_info["grade_level"] or "Unknown"}
Requested question count: {body.question_count}
Preferred question type: {body.question_type}

Existing question texts to avoid:
{_sanitize_prompt_text(chr(10).join(sorted(existing_question_texts)[:10]), max_chars=600)}

Compact source evidence:
{_build_blueprint_evidence(source_chunks, strict=True)}
"""
    retry_raw = await ollama_client.generate(
        retry_prompt,
        QUIZ_GENERATION_SYSTEM_PROMPT,
        task="quiz_generation",
        response_format=QUIZ_BLUEPRINT_FORMAT,
    )
    try:
        parsed = _parse_quiz_blueprint_output(retry_raw)
        parsed["blueprintSource"] = "model"
        return parsed
    except (json.JSONDecodeError, ValueError) as err:
        _log_blueprint_parse_failure(
            raw=retry_raw,
            error=err,
            class_id=str(class_info["id"]),
            stage="quiz_blueprint_retry",
        )
        return _fallback_quiz_blueprint(
            class_info=class_info,
            body=body,
            source_chunks=source_chunks,
        )


def _validate_generated_questions(
    questions: list[dict[str, Any]],
    source_chunks: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    evidence_seed = " ".join(item["chunkText"].lower() for item in source_chunks[:10])
    validated: list[dict[str, Any]] = []
    for question in questions:
        content = (question.get("content") or "").strip()
        explanation = (question.get("explanation") or "").strip()
        tokens = set(re.findall(r"[a-zA-Z][a-zA-Z0-9]{3,}", content.lower()))
        explanation_tokens = set(re.findall(r"[a-zA-Z][a-zA-Z0-9]{3,}", explanation.lower()))
        grounded_overlap = len(tokens & set(re.findall(r"[a-zA-Z][a-zA-Z0-9]{3,}", evidence_seed)))
        if grounded_overlap == 0 and explanation_tokens and len(explanation_tokens & set(re.findall(r"[a-zA-Z][a-zA-Z0-9]{3,}", evidence_seed))) == 0:
            continue
        validated.append(question)
    return validated
