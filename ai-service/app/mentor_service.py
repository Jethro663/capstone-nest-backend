from __future__ import annotations

import json
import time
import uuid
from typing import Any

from fastapi import HTTPException
from sqlalchemy import bindparam, text as sa_text
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import AsyncSession

from . import ollama_client
from .media_utils import normalize_attachment_images, resolve_backend_upload_path
from .retrieval_service import similarity_search
from .schemas import RequestUser

MENTOR_SYSTEM_PROMPT = """You are J.A.K.I.P.I.R ("Ja"), Nexora's grounded AI mentor.

RULES:
- Answer only from the supplied assessment and lesson context.
- Do not give the final answer directly.
- Explain the student's mistake in a supportive, high-school appropriate way.
- Give 2-4 short hints or reasoning steps.
- If the context is insufficient, say what is missing and recommend what to review next.
- End with a short "Ja's Study Tip:" line.
"""

MENTOR_ANALYSIS_FORMAT: dict[str, Any] = {
    "type": "object",
    "properties": {
        "mistakeSummary": {"type": "string"},
        "likelyMisconceptions": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 1,
            "maxItems": 4,
        },
        "requiredEvidence": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 1,
            "maxItems": 5,
        },
        "answerGuardrail": {"type": "string"},
    },
    "required": ["mistakeSummary", "likelyMisconceptions", "requiredEvidence", "answerGuardrail"],
}


def _normalize_options(options: Any) -> list[dict[str, Any]]:
    if isinstance(options, str):
        try:
            options = json.loads(options)
        except json.JSONDecodeError:
            return []
    return options if isinstance(options, list) else []


async def explain_mistake(
    db: AsyncSession,
    user: RequestUser,
    *,
    attempt_id: str,
    question_id: str,
    message: str | None = None,
    attachments: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    attempt_row = await db.execute(
        sa_text(
            """
            SELECT
              aa.id AS attempt_id,
              aa.student_id,
              aa.is_returned,
              aa.assessment_id,
              aa.score,
              a.title AS assessment_title,
              a.class_id,
              a.feedback_level,
              a.feedback_delay_hours,
              c.subject_name,
              c.subject_code,
              c.teacher_id,
              s.grade_level,
              q.id AS question_id,
              q.content AS question_content,
              q.explanation AS question_explanation,
              q.image_url AS question_image_url,
              q.type AS question_type,
              q.points,
              q.concept_tags,
              r.student_answer,
              r.selected_option_id,
              r.selected_option_ids,
              r.is_correct,
              r.points_earned,
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
            FROM assessment_attempts aa
            INNER JOIN assessments a ON a.id = aa.assessment_id
            INNER JOIN classes c ON c.id = a.class_id
            LEFT JOIN sections s ON s.id = c.section_id
            INNER JOIN assessment_questions q ON q.assessment_id = a.id
            LEFT JOIN assessment_responses r
              ON r.attempt_id = aa.id AND r.question_id = q.id
            LEFT JOIN assessment_question_options o ON o.question_id = q.id
            WHERE aa.id = :attemptId
              AND q.id = :questionId
            GROUP BY
              aa.id, aa.student_id, aa.is_returned, aa.assessment_id, aa.score,
              a.title, a.class_id, a.feedback_level, a.feedback_delay_hours,
              c.subject_name, c.subject_code, c.teacher_id, s.grade_level,
              q.id, q.content, q.explanation, q.type, q.points, q.concept_tags,
              r.student_answer, r.selected_option_id, r.selected_option_ids,
              r.is_correct, r.points_earned
            """
        ),
        {"attemptId": attempt_id, "questionId": question_id},
    )
    row = attempt_row.mappings().first()
    if not row:
        raise HTTPException(404, "Assessment attempt question not found")

    is_admin = "admin" in [role.lower() for role in user.roles]
    if not is_admin and str(row["student_id"]) != user.id:
        raise HTTPException(403, "You can only ask Ja about your own returned work")
    if not row["is_returned"]:
        raise HTTPException(400, "This assessment has not been returned by the teacher yet")

    options = _normalize_options(row["options_json"])
    selected_text: str | None = None
    if row["selected_option_id"]:
        selected = next(
            (item for item in options if str(item.get("id")) == str(row["selected_option_id"])),
            None,
        )
        selected_text = selected.get("text") if selected else None
    elif row["selected_option_ids"]:
        selected_ids = set(row["selected_option_ids"])
        selected_values = [
            item.get("text", "").strip()
            for item in options
            if str(item.get("id")) in selected_ids
        ]
        selected_text = ", ".join(value for value in selected_values if value)
    elif row["student_answer"]:
        selected_text = row["student_answer"]

    correct_options = [item.get("text", "").strip() for item in options if item.get("isCorrect")]
    concept_tags = row.get("concept_tags") or []
    if isinstance(concept_tags, str):
        try:
            concept_tags = json.loads(concept_tags)
        except json.JSONDecodeError:
            concept_tags = []
    retrieval_query = "\n".join(
        filter(
            None,
            [
                row["question_content"],
                row["question_explanation"],
                message,
                " ".join(correct_options),
            ],
        )
    )
    chunks = await similarity_search(
        db,
        query_text=retrieval_query,
        class_id=str(row["class_id"]),
        top_k=6,
        only_published=True,
        policy_name="mentor_explain",
        teacher_explanation=row["question_explanation"],
        student_message=message,
        concept_hints=concept_tags if isinstance(concept_tags, list) else [],
        reference_assessment_id=str(row["assessment_id"]),
        reference_question_id=question_id,
    )

    context_blocks = []
    citations = []
    seen_citations = set()
    for chunk in chunks:
        metadata = chunk.get("metadataJson") or {}
        label = metadata.get("lessonTitle") or metadata.get("assessmentTitle") or chunk["sourceType"]
        context_blocks.append(f"[{label}] {chunk['chunkText']}")
        citation = {
            "chunkId": chunk["id"],
            "sourceType": chunk["sourceType"],
            "lessonId": chunk.get("lessonId"),
            "assessmentId": chunk.get("assessmentId"),
            "questionId": chunk.get("questionId"),
            "label": label,
            "scoreBreakdown": chunk.get("scoreBreakdown") or {},
            "selectionReason": chunk.get("selectionReason"),
            "sourceReference": chunk.get("sourceReference"),
        }
        citation_key = (
            citation["lessonId"],
            citation["assessmentId"],
            citation["questionId"],
            citation["label"],
        )
        if citation_key in seen_citations:
            continue
        seen_citations.add(citation_key)
        citations.append(citation)

    analysis_packet = await _build_mistake_analysis_packet(
        question_content=row["question_content"],
        student_answer=selected_text,
        teacher_explanation=row["question_explanation"],
        student_follow_up=message,
        context_blocks=context_blocks,
        correct_options=correct_options,
    )

    prompt = f"""
Assessment: {row["assessment_title"]}
Subject: {row["subject_name"]} ({row["subject_code"]})
Grade level: {row["grade_level"] or "Unknown"}

Question:
{row["question_content"]}

Student answer:
{selected_text or "[No answer recorded]"}

Correct answer(s):
{", ".join(correct_options) if correct_options else "[No explicit correct option stored]"}

Teacher explanation:
{row["question_explanation"] or "[No teacher explanation provided]"}

Student follow-up:
{message or "Explain why this answer is incorrect and what to review next."}

Mistake analysis packet:
{json.dumps(analysis_packet, ensure_ascii=False)}

Retrieved lesson context:
{chr(10).join(context_blocks) if context_blocks else "[No retrieved lesson chunks found]"}

Citations:
{json.dumps(citations, ensure_ascii=False)}
"""

    prepared_images = normalize_attachment_images(attachments)
    question_image_path = resolve_backend_upload_path(row["question_image_url"] or "")
    if question_image_path:
        prepared_images.append(
            {
                "filePath": question_image_path,
                "mimeType": "image/png",
            }
        )

    start = time.time()
    task_name = "vision_explanation" if prepared_images else "chat"
    reply = await ollama_client.generate(
        prompt,
        MENTOR_SYSTEM_PROMPT,
        task=task_name,
        images=prepared_images,
    )
    response_time_ms = int((time.time() - start) * 1000)

    suggested_next = next(
        (
            {
                "lessonId": item.get("lessonId"),
                "label": item.get("label"),
            }
            for item in citations
            if item.get("lessonId")
        ),
        None,
    )

    await db.execute(
        sa_text(
            """
            INSERT INTO ai_interaction_logs (
              user_id,
              session_type,
              input_text,
              output_text,
              model_used,
              response_time_ms,
              session_id,
              context_metadata
            )
            VALUES (
              :userId,
              'mistake_explanation',
              :inputText,
              :outputText,
              :modelUsed,
              :responseTimeMs,
              :sessionId,
              :contextMetadata
            )
            """
        ).bindparams(bindparam("contextMetadata", type_=postgresql.JSONB)),
        {
            "userId": user.id,
            "inputText": (message or row["question_content"])[:2000],
            "outputText": reply[:5000],
            "modelUsed": ollama_client.get_task_model_name(
                task_name,
                images=prepared_images,
            ),
            "responseTimeMs": response_time_ms,
            "sessionId": str(uuid.uuid4()),
            "contextMetadata": {
                "attemptId": attempt_id,
                "assessmentId": str(row["assessment_id"]),
                "questionId": question_id,
                "classId": str(row["class_id"]),
                "citations": citations,
                "analysisPacket": analysis_packet,
                "suggestedNext": suggested_next,
                "attachmentCount": len(prepared_images),
            },
        },
    )
    await db.commit()

    return {
        "reply": reply,
        "citations": citations,
        "analysisPacket": analysis_packet,
        "suggestedNext": suggested_next,
        "modelUsed": ollama_client.get_task_model_name(
            task_name,
            images=prepared_images,
        ),
    }


async def _build_mistake_analysis_packet(
    *,
    question_content: str,
    student_answer: str | None,
    teacher_explanation: str | None,
    student_follow_up: str | None,
    context_blocks: list[str],
    correct_options: list[str],
) -> dict[str, Any]:
    prompt = f"""
Analyze a student's mistake before explaining it.

Question:
{question_content}

Student answer:
{student_answer or "[No answer recorded]"}

Correct option text:
{", ".join(correct_options) if correct_options else "[No explicit option text stored]"}

Teacher explanation:
{teacher_explanation or "[No teacher explanation provided]"}

Student follow-up:
{student_follow_up or "[No follow-up message]"}

Retrieved evidence:
{chr(10).join(context_blocks) if context_blocks else "[No retrieved lesson chunks found]"}

Return valid JSON only. The packet must summarize the mistake, list likely misconceptions, identify which evidence is required for a grounded explanation, and state a guardrail that avoids leaking the full final answer.
"""
    raw = await ollama_client.generate(
        prompt,
        MENTOR_SYSTEM_PROMPT,
        task="grading",
        response_format=MENTOR_ANALYSIS_FORMAT,
    )
    cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    first = cleaned.find("{")
    last = cleaned.rfind("}")
    if first != -1 and last > first:
        cleaned = cleaned[first : last + 1]
    return json.loads(cleaned)
