from __future__ import annotations

import json
import re
from typing import Any

from fastapi import HTTPException
from sqlalchemy import bindparam, text as sa_text
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import AsyncSession

from . import ollama_client
from .retrieval_service import similarity_search
from .schemas import GenerateQuizDraftRequest, RequestUser

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


def _normalize_question_text(value: str) -> str:
    return " ".join(re.findall(r"[a-z0-9]+", (value or "").lower()))


def _parse_generation_output(raw: str) -> dict[str, Any]:
    cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    first = cleaned.find("{")
    last = cleaned.rfind("}")
    if first != -1 and last > first:
        cleaned = cleaned[first : last + 1]
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


async def generate_quiz_draft(
    db: AsyncSession,
    user: RequestUser,
    body: GenerateQuizDraftRequest,
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
        )
    elif body.extraction_ids:
        source_chunks = await similarity_search(
            db,
            query_text=body.teacher_note or class_info["subject_name"],
            class_id=body.class_id,
            top_k=max(8, body.question_count * 2),
            source_types=["extracted_module"],
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
        f"[{item.get('metadataJson', {}).get('lessonTitle') or item.get('metadataJson', {}).get('assessmentTitle') or item['sourceType']}]\n{item['chunkText']}"
        for item in source_chunks[: min(len(source_chunks), 10)]
    )

    prompt = f"""
Subject: {class_info["subject_name"]} ({class_info["subject_code"]})
Grade level: {class_info["grade_level"] or "Unknown"}
Teacher draft title: {body.title or f"{class_info['subject_name']} AI Draft Quiz"}
Requested question count: {body.question_count}
Preferred question type: {body.question_type}
Teacher note: {body.teacher_note or "[None]"}

Existing question texts to avoid:
{chr(10).join(sorted(existing_question_texts)[:30])}

Source material:
{source_material}
"""

    raw = await ollama_client.generate(prompt, QUIZ_GENERATION_SYSTEM_PROMPT)
    parsed = _parse_generation_output(raw)
    questions = _dedupe_generated_questions(parsed.get("questions", []), existing_question_texts)

    if not questions:
        raise HTTPException(400, "Generated questions were duplicates of existing content. Try a narrower source selection.")

    questions = questions[: body.question_count]

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

    await db.commit()

    return {
        "jobId": str(job_id),
        "outputId": str(output_id),
        "assessmentId": str(assessment_id),
        "title": structured_output["title"],
        "questionsCreated": len(questions),
        "message": "AI draft assessment created as an unpublished draft for teacher review.",
    }
