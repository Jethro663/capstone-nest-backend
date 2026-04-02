from __future__ import annotations

import json
import re
from typing import Any

from fastapi import HTTPException
from sqlalchemy import bindparam, text as sa_text
from sqlalchemy.ext.asyncio import AsyncSession

from . import ollama_client
from .retrieval_service import similarity_search
from .schemas import RequestUser, TutorRecommendationDto
from .student_tutor_service import bootstrap_student_tutor

OBJECTIVE_TYPES = ("multiple_choice", "multiple_select", "true_false", "dropdown")
GUARDRAIL_PATTERNS = (
    r"ignore (all|the) (rules|instructions)",
    r"bypass",
    r"jailbreak",
    r"give (me )?(the )?exact answer",
    r"answer key",
    r"hack",
    r"admin password",
    r"system prompt",
)


async def bootstrap_ja_practice(
    db: AsyncSession,
    user: RequestUser,
    *,
    class_id: str | None = None,
) -> dict[str, Any]:
    data = await bootstrap_student_tutor(db, user, class_id=class_id)
    if not data.get("classes"):
        return {
            **data,
            "hasEvidence": False,
            "evidenceSummary": {
                "completedLessons": 0,
                "attempts": 0,
                "recommendations": 0,
            },
        }
    return {
        **data,
        "hasEvidence": bool(data.get("recentLessons") or data.get("recentAttempts")),
        "evidenceSummary": {
            "completedLessons": len(data.get("recentLessons") or []),
            "attempts": len(data.get("recentAttempts") or []),
            "recommendations": len(data.get("recommendations") or []),
        },
    }


async def _assert_student_class_access(
    db: AsyncSession,
    user_id: str,
    class_id: str,
) -> None:
    row = await db.execute(
        sa_text(
            """
            SELECT 1
            FROM enrollments
            WHERE student_id = :userId
              AND class_id = :classId
              AND status = 'enrolled'
            """
        ),
        {"userId": user_id, "classId": class_id},
    )
    if row.first() is None:
        raise HTTPException(403, "You do not have access to this class")


def _normalize_options(options_json: Any) -> list[dict[str, Any]]:
    options = options_json or []
    if isinstance(options, str):
        try:
            options = json.loads(options)
        except json.JSONDecodeError:
            options = []
    if not isinstance(options, list):
        return []
    normalized: list[dict[str, Any]] = []
    for row in options:
        if not isinstance(row, dict):
            continue
        option_id = row.get("id")
        text = row.get("text")
        if not option_id or text is None:
            continue
        normalized.append(
            {
                "id": str(option_id),
                "text": str(text),
                "order": int(row.get("order") or 0),
                "isCorrect": bool(row.get("isCorrect")),
            }
        )
    normalized.sort(key=lambda item: item["order"])
    return normalized


def _build_answer_key(
    *,
    question_type: str,
    options: list[dict[str, Any]],
) -> dict[str, Any] | None:
    correct_ids = [item["id"] for item in options if item["isCorrect"]]
    if question_type in {"multiple_choice", "true_false", "dropdown"}:
        if len(correct_ids) != 1:
            return None
        answer_key: dict[str, Any] = {"correctOptionId": correct_ids[0]}
        if question_type == "true_false":
            option_text = next(
                (
                    str(item["text"]).strip().lower()
                    for item in options
                    if item["id"] == correct_ids[0]
                ),
                "",
            )
            if option_text in {"true", "false"}:
                answer_key["correctValue"] = option_text == "true"
        return answer_key

    if question_type == "multiple_select":
        if len(correct_ids) == 0:
            return None
        return {"correctOptionIds": correct_ids}

    return None


async def _fetch_recent_wrong_question_ids(
    db: AsyncSession,
    *,
    student_id: str,
    class_id: str,
    allowed_assessment_ids: list[str],
) -> list[str]:
    if not allowed_assessment_ids:
        return []
    rows = await db.execute(
        sa_text(
            """
            SELECT DISTINCT r.question_id
            FROM assessment_responses r
            INNER JOIN assessment_attempts aa ON aa.id = r.attempt_id
            INNER JOIN assessments a ON a.id = aa.assessment_id
            WHERE aa.student_id = :studentId
              AND aa.is_submitted = true
              AND a.class_id = :classId
              AND a.id IN :assessmentIds
              AND COALESCE(r.is_correct, false) = false
            ORDER BY r.question_id
            LIMIT 40
            """
        ).bindparams(bindparam("assessmentIds", expanding=True)),
        {
            "studentId": student_id,
            "classId": class_id,
            "assessmentIds": allowed_assessment_ids,
        },
    )
    return [str(row["question_id"]) for row in rows.mappings()]


async def _fetch_candidate_questions(
    db: AsyncSession,
    *,
    class_id: str,
    allowed_assessment_ids: list[str],
) -> list[dict[str, Any]]:
    if not allowed_assessment_ids:
        return []
    rows = await db.execute(
        sa_text(
            """
            SELECT
              q.id AS question_id,
              q.content AS question_content,
              q.type AS question_type,
              q.explanation AS question_explanation,
              q.concept_tags AS concept_tags,
              a.id AS assessment_id,
              a.title AS assessment_title,
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
            FROM assessment_questions q
            INNER JOIN assessments a ON a.id = q.assessment_id
            LEFT JOIN assessment_question_options o ON o.question_id = q.id
            WHERE a.class_id = :classId
              AND a.is_published = true
              AND a.id IN :assessmentIds
              AND q.type IN ('multiple_choice', 'multiple_select', 'true_false', 'dropdown')
            GROUP BY
              q.id,
              q.content,
              q.type,
              q.explanation,
              q.concept_tags,
              a.id,
              a.title
            ORDER BY a.created_at DESC, q."order" ASC
            """
        ).bindparams(bindparam("assessmentIds", expanding=True)),
        {
            "classId": class_id,
            "assessmentIds": allowed_assessment_ids,
        },
    )
    return [dict(row) for row in rows.mappings()]


async def _retrieve_priority_question_ids(
    db: AsyncSession,
    *,
    class_id: str,
    recommendation: TutorRecommendationDto | None,
    allowed_assessment_ids: list[str],
) -> list[str]:
    if not recommendation:
        return []
    focus_text = recommendation.focus_text.strip()
    if not focus_text:
        return []
    chunks = await similarity_search(
        db,
        query_text=focus_text,
        class_id=class_id,
        top_k=20,
        assessment_ids=allowed_assessment_ids or None,
        only_published=True,
        policy_name="student_tutor",
        reference_assessment_id=recommendation.assessment_id,
        reference_question_id=recommendation.question_id,
    )
    ordered_ids: list[str] = []
    seen: set[str] = set()
    for chunk in chunks:
        qid = chunk.get("questionId")
        if not qid or qid in seen:
            continue
        seen.add(qid)
        ordered_ids.append(str(qid))
    return ordered_ids


async def generate_ja_practice_session_packet(
    db: AsyncSession,
    *,
    user: RequestUser,
    class_id: str,
    question_count: int,
    recommendation: TutorRecommendationDto | None,
    allowed_lesson_ids: list[str] | None,
    allowed_assessment_ids: list[str] | None,
) -> dict[str, Any]:
    await _assert_student_class_access(db, user.id, class_id)

    lesson_ids = [entry for entry in (allowed_lesson_ids or []) if entry]
    assessment_ids = [entry for entry in (allowed_assessment_ids or []) if entry]
    if not lesson_ids and not assessment_ids:
        raise HTTPException(
            400,
            "No visible class evidence is available for JA practice generation",
        )

    class_row = await db.execute(
        sa_text(
            """
            SELECT c.subject_name, c.subject_code, s.name AS section_name
            FROM classes c
            LEFT JOIN sections s ON s.id = c.section_id
            WHERE c.id = :classId
            """
        ),
        {"classId": class_id},
    )
    class_info = class_row.mappings().first()
    if not class_info:
        raise HTTPException(404, "Class not found")

    wrong_question_ids = await _fetch_recent_wrong_question_ids(
        db,
        student_id=user.id,
        class_id=class_id,
        allowed_assessment_ids=assessment_ids,
    )
    retrieval_priority_ids = await _retrieve_priority_question_ids(
        db,
        class_id=class_id,
        recommendation=recommendation,
        allowed_assessment_ids=assessment_ids,
    )
    candidate_rows = await _fetch_candidate_questions(
        db,
        class_id=class_id,
        allowed_assessment_ids=assessment_ids,
    )

    question_map: dict[str, dict[str, Any]] = {
        str(row["question_id"]): row for row in candidate_rows
    }
    ordered_ids: list[str] = []
    seen_ids: set[str] = set()

    def push_ids(ids: list[str]) -> None:
        for item_id in ids:
            if item_id in seen_ids or item_id not in question_map:
                continue
            seen_ids.add(item_id)
            ordered_ids.append(item_id)

    if recommendation and recommendation.question_id:
        push_ids([recommendation.question_id])
    push_ids(retrieval_priority_ids)
    push_ids(wrong_question_ids)
    push_ids(list(question_map.keys()))

    selected_items: list[dict[str, Any]] = []
    selected_question_ids: set[str] = set()
    for question_id in ordered_ids:
        row = question_map.get(question_id)
        if not row or question_id in selected_question_ids:
            continue
        qtype = str(row["question_type"])
        options = _normalize_options(row.get("options_json"))
        answer_key = _build_answer_key(question_type=qtype, options=options)
        if answer_key is None:
            continue

        citation = {
            "label": f"{row['assessment_title']}",
            "assessmentId": str(row["assessment_id"]),
            "questionId": question_id,
        }
        selected_items.append(
            {
                "id": f"q-{len(selected_items) + 1}",
                "itemType": qtype,
                "prompt": str(row["question_content"]),
                "options": [
                    {
                        "id": option["id"],
                        "text": option["text"],
                        "order": option["order"],
                    }
                    for option in options
                ],
                "answerKey": answer_key,
                "hint": "Use the strongest clue from your class material before answering.",
                "explanation": str(row.get("question_explanation") or "").strip() or None,
                "citations": [citation],
                "validation": {
                    "deterministic": True,
                    "sourceType": "assessment_question",
                    "assessmentId": str(row["assessment_id"]),
                    "questionId": question_id,
                },
            }
        )
        selected_question_ids.add(question_id)
        if len(selected_items) >= question_count:
            break

    if len(selected_items) < question_count:
        raise HTTPException(
            400,
            "Insufficient objective evidence to generate a complete JA practice session",
        )

    class_label = f"{class_info['subject_name']} ({class_info['subject_code']})"
    if class_info["section_name"]:
        class_label = f"{class_label} - {class_info['section_name']}"

    return {
        "classLabel": class_label,
        "groundingStatus": "grounded",
        "sourceSnapshot": {
            "allowedLessonCount": len(lesson_ids),
            "allowedAssessmentCount": len(assessment_ids),
            "candidateQuestionCount": len(candidate_rows),
            "selectedQuestionCount": len(selected_items),
            "recentWrongQuestionCount": len(wrong_question_ids),
        },
        "items": selected_items[:question_count],
    }


async def bootstrap_ja_ask(
    db: AsyncSession,
    user: RequestUser,
    *,
    class_id: str | None = None,
) -> dict[str, Any]:
    return await bootstrap_ja_practice(db, user, class_id=class_id)


async def bootstrap_ja_review(
    db: AsyncSession,
    user: RequestUser,
    *,
    class_id: str | None = None,
) -> dict[str, Any]:
    return await bootstrap_ja_practice(db, user, class_id=class_id)


def _is_guardrail_prompt(text: str) -> bool:
    normalized = (text or "").strip().lower()
    if not normalized:
        return False
    return any(re.search(pattern, normalized) for pattern in GUARDRAIL_PATTERNS)


def _format_citation(chunk: dict[str, Any]) -> dict[str, Any]:
    metadata = chunk.get("metadataJson") or {}
    label = (
        metadata.get("lessonTitle")
        or metadata.get("assessmentTitle")
        or metadata.get("title")
        or chunk.get("sourceReference")
        or "Class material"
    )
    return {
        "label": str(label),
        "lessonId": chunk.get("lessonId"),
        "assessmentId": chunk.get("assessmentId"),
        "questionId": chunk.get("questionId"),
        "sourceType": chunk.get("sourceType"),
    }


async def generate_ja_ask_response(
    db: AsyncSession,
    *,
    user: RequestUser,
    class_id: str,
    thread_id: str,
    message: str,
    quick_action: str | None,
    history: list[dict[str, str]] | None,
    allowed_lesson_ids: list[str] | None,
    allowed_assessment_ids: list[str] | None,
) -> dict[str, Any]:
    await _assert_student_class_access(db, user.id, class_id)

    if _is_guardrail_prompt(message):
        return {
            "blocked": True,
            "reason": "policy_guardrail",
            "reply": "That request breaks JA safety rules. Please ask for a concept explanation, guided hint, or class-based practice help instead.",
            "citations": [],
            "insufficientEvidence": False,
        }

    lesson_ids = [entry for entry in (allowed_lesson_ids or []) if entry]
    assessment_ids = [entry for entry in (allowed_assessment_ids or []) if entry]
    if not lesson_ids and not assessment_ids:
        raise HTTPException(400, "No visible class evidence is available for JA Ask")

    query_seed = message.strip()
    if quick_action:
        query_seed = f"{quick_action}: {query_seed}"

    chunks = await similarity_search(
        db,
        query_text=query_seed,
        class_id=class_id,
        top_k=6,
        lesson_ids=lesson_ids or None,
        assessment_ids=assessment_ids or None,
        only_published=True,
        policy_name="student_tutor",
    )

    if len(chunks) < 2:
        return {
            "blocked": False,
            "reason": None,
            "reply": "I cannot answer that confidently from your visible class sources yet. Try selecting a specific lesson or assessment context first.",
            "citations": [],
            "insufficientEvidence": True,
        }

    citations = [_format_citation(chunk) for chunk in chunks[:4]]
    source_context = "\n\n".join(
        f"[Source {idx + 1}] {chunk.get('chunkText', '')[:700]}"
        for idx, chunk in enumerate(chunks[:4])
    )
    history_context = "\n".join(
        f"{entry.get('role', 'user')}: {entry.get('content', '')[:280]}"
        for entry in (history or [])[-6:]
    )
    prompt = (
        "You are JA Ask in Nexora LMS. Answer using only the provided class sources.\n"
        "Rules:\n"
        "- Do not provide direct cheating answers.\n"
        "- If evidence is thin, say so.\n"
        "- Keep answer under 180 words.\n\n"
        f"Thread: {thread_id}\n"
        f"Student message: {message.strip()}\n"
        f"Quick action: {quick_action or 'none'}\n"
        f"Recent conversation:\n{history_context or 'n/a'}\n\n"
        f"Grounding sources:\n{source_context}\n"
    )
    reply = await ollama_client.generate(prompt=prompt, task="chat")
    clean_reply = (reply or "").strip()
    if not clean_reply:
        clean_reply = "I found relevant class sources, but I need you to narrow the question to one concept so I can explain it clearly."

    return {
        "blocked": False,
        "reason": None,
        "reply": clean_reply,
        "citations": citations,
        "insufficientEvidence": False,
    }


async def _fetch_review_attempt_questions(
    db: AsyncSession,
    *,
    student_id: str,
    class_id: str,
    attempt_id: str,
) -> list[dict[str, Any]]:
    rows = await db.execute(
        sa_text(
            """
            SELECT
              aa.id AS attempt_id,
              a.id AS assessment_id,
              a.title AS assessment_title,
              q.id AS question_id,
              q.content AS question_content,
              q.type AS question_type,
              q.explanation AS question_explanation,
              q.concept_tags AS concept_tags,
              COALESCE(r.is_correct, false) AS is_correct,
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
            INNER JOIN assessment_questions q ON q.assessment_id = a.id
            LEFT JOIN assessment_responses r
              ON r.attempt_id = aa.id
             AND r.question_id = q.id
            LEFT JOIN assessment_question_options o ON o.question_id = q.id
            WHERE aa.id = :attemptId
              AND aa.student_id = :studentId
              AND aa.is_submitted = true
              AND a.class_id = :classId
              AND a.is_published = true
              AND q.type IN ('multiple_choice', 'multiple_select', 'true_false', 'dropdown')
            GROUP BY
              aa.id,
              a.id,
              a.title,
              q.id,
              q.content,
              q.type,
              q.explanation,
              q.concept_tags,
              r.is_correct
            ORDER BY q."order" ASC
            """
        ),
        {
            "attemptId": attempt_id,
            "studentId": student_id,
            "classId": class_id,
        },
    )
    return [dict(row) for row in rows.mappings()]


async def generate_ja_review_session_packet(
    db: AsyncSession,
    *,
    user: RequestUser,
    class_id: str,
    attempt_id: str,
    question_count: int,
    allowed_lesson_ids: list[str] | None,
    allowed_assessment_ids: list[str] | None,
) -> dict[str, Any]:
    await _assert_student_class_access(db, user.id, class_id)
    rows = await _fetch_review_attempt_questions(
        db,
        student_id=user.id,
        class_id=class_id,
        attempt_id=attempt_id,
    )
    if not rows:
        raise HTTPException(400, "No eligible submitted attempt found for JA Review")

    assessment_id = str(rows[0]["assessment_id"])
    if allowed_assessment_ids and assessment_id not in allowed_assessment_ids:
        raise HTTPException(403, "Assessment is outside visible JA review evidence")

    sorted_rows = sorted(
        rows,
        key=lambda item: (bool(item.get("is_correct")),),
    )
    selected_items: list[dict[str, Any]] = []
    for row in sorted_rows:
        qtype = str(row["question_type"])
        options = _normalize_options(row.get("options_json"))
        answer_key = _build_answer_key(question_type=qtype, options=options)
        if answer_key is None:
            continue
        is_correct = bool(row.get("is_correct"))
        helper_intro = (
            "You missed this before. Spot the clue you overlooked."
            if not is_correct
            else "You got this before. Lock in the reasoning pattern."
        )
        explanation = str(row.get("question_explanation") or "").strip()
        selected_items.append(
            {
                "id": f"r-{len(selected_items) + 1}",
                "itemType": qtype,
                "prompt": f"{row['question_content']}\n\nJA Coach: {helper_intro}",
                "options": [
                    {"id": opt["id"], "text": opt["text"], "order": opt["order"]}
                    for opt in options
                ],
                "answerKey": answer_key,
                "hint": "Review the teacher item statement and eliminate one weak option first.",
                "explanation": explanation or helper_intro,
                "citations": [
                    {
                        "label": str(row["assessment_title"]),
                        "assessmentId": assessment_id,
                        "questionId": str(row["question_id"]),
                    }
                ],
                "validation": {
                    "deterministic": True,
                    "sourceType": "assessment_question",
                    "assessmentId": assessment_id,
                    "questionId": str(row["question_id"]),
                    "attemptId": attempt_id,
                },
            }
        )
        if len(selected_items) >= question_count:
            break

    if not selected_items:
        raise HTTPException(
            400,
            "Insufficient objective assessment evidence for JA Review session",
        )

    class_row = await db.execute(
        sa_text(
            """
            SELECT c.subject_name, c.subject_code, s.name AS section_name
            FROM classes c
            LEFT JOIN sections s ON s.id = c.section_id
            WHERE c.id = :classId
            """
        ),
        {"classId": class_id},
    )
    class_info = class_row.mappings().first()
    class_label = "Class"
    if class_info:
        class_label = f"{class_info['subject_name']} ({class_info['subject_code']})"
        if class_info["section_name"]:
            class_label = f"{class_label} - {class_info['section_name']}"

    return {
        "classLabel": class_label,
        "groundingStatus": "grounded",
        "sourceSnapshot": {
            "attemptId": attempt_id,
            "assessmentId": assessment_id,
            "allowedLessonCount": len([entry for entry in (allowed_lesson_ids or []) if entry]),
            "allowedAssessmentCount": len([entry for entry in (allowed_assessment_ids or []) if entry]),
            "selectedQuestionCount": len(selected_items),
        },
        "items": selected_items,
    }
