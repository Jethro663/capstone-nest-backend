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
from .config import settings
from .media_utils import normalize_attachment_images
from .objective_grading import ObjectiveVerdict, evaluate_objective_answer
from .retrieval_service import similarity_search
from .schemas import RequestUser, TutorRecommendationDto

TUTOR_SESSION_KIND = "student_tutor"

TUTOR_SYSTEM_PROMPT = """You are J.A.K.I.P.I.R. ("Ja"), Nexora's student tutor.

You are helping a high-school student learn one weak topic at a time.

Rules:
- Use only the supplied class, lesson, and assessment context.
- Be warm, clear, and encouraging without sounding childish.
- Keep the language simple and concrete.
- Never reveal hidden answer keys directly. Use guided teaching instead.
- When asked for lesson content, return grounded explanations only.
- When asked for JSON, return valid JSON only with no markdown fence.
"""

TUTOR_PACKET_FORMAT: dict[str, Any] = {
    "type": "object",
    "properties": {
        "lessonPlan": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 3,
            "maxItems": 3,
        },
        "lessonBody": {"type": "string"},
        "questions": {
            "type": "array",
            "minItems": 3,
            "maxItems": 3,
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "question": {"type": "string"},
                    "expectedAnswer": {"type": "string"},
                    "hint": {"type": "string"},
                },
                "required": ["id", "question", "expectedAnswer", "hint"],
            },
        },
    },
    "required": ["lessonPlan", "lessonBody", "questions"],
}

TUTOR_PLAN_FORMAT: dict[str, Any] = {
    "type": "object",
    "properties": {
        "teachingGoal": {"type": "string"},
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
        "questionDifficulty": {"type": "string"},
        "answerGuardrail": {"type": "string"},
    },
    "required": [
        "teachingGoal",
        "likelyMisconceptions",
        "requiredEvidence",
        "questionDifficulty",
        "answerGuardrail",
    ],
}

TUTOR_EVALUATION_FORMAT: dict[str, Any] = {
    "type": "object",
    "properties": {
        "overallVerdict": {"type": "string", "enum": ["pass", "retry"]},
        "encouragement": {"type": "string"},
        "retryLesson": {"type": "string"},
        "results": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "questionId": {"type": "string"},
                    "decision": {
                        "type": "string",
                        "enum": ["correct_enough", "partially_correct", "unsupported"],
                    },
                    "isCorrectEnough": {"type": "boolean"},
                    "feedback": {"type": "string"},
                },
                "required": ["questionId", "decision", "isCorrectEnough", "feedback"],
            },
        },
        "nextQuestions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "question": {"type": "string"},
                    "expectedAnswer": {"type": "string"},
                    "hint": {"type": "string"},
                },
                "required": ["id", "question", "expectedAnswer", "hint"],
            },
        },
    },
    "required": ["overallVerdict", "encouragement", "retryLesson", "results", "nextQuestions"],
}


def _safe_json_loads(raw: str) -> dict[str, Any]:
    text = raw.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if len(lines) >= 3:
            text = "\n".join(lines[1:-1]).strip()
    return json.loads(text)


def _clip_text(value: str | None, max_len: int) -> str:
    text = (value or "").strip()
    if len(text) <= max_len:
        return text
    return f"{text[: max_len - 3].rstrip()}..."


def _is_chunk_grounded(chunk: dict[str, Any]) -> bool:
    score_breakdown = chunk.get("scoreBreakdown") or {}
    final_score = float(score_breakdown.get("final") or 0.0)
    semantic_score = float(score_breakdown.get("semantic") or 0.0)
    return (
        final_score >= settings.retrieval_min_final_score
        and semantic_score >= settings.retrieval_min_semantic_score
    )


def _grounding_status_from_chunks(chunks: list[dict[str, Any]]) -> str:
    if not chunks:
        return "insufficient"
    distinct_sources = {
        chunk.get("sourceReference") or chunk.get("id")
        for chunk in chunks
    }
    if len(distinct_sources) < settings.retrieval_min_distinct_sources:
        return "insufficient"
    return "grounded"


def _compose_low_grounding_reply(topic: str) -> str:
    safe_topic = topic.strip() or "this topic"
    return (
        "I need a bit more class evidence before I can confidently judge this.\n\n"
        f"For now, review the latest lesson notes on {safe_topic} and share one specific step you're unsure about.\n\n"
        "Ja's Study Tip: When evidence is limited, write the rule first, then test it with one small example."
    )


def _apply_deterministic_override(
    *,
    questions: list[dict[str, Any]],
    answers: list[str],
    llm_results: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], str, float]:
    result_map = {
        str(item.get("questionId")): dict(item)
        for item in llm_results
        if isinstance(item, dict) and item.get("questionId")
    }
    merged_results: list[dict[str, Any]] = []
    deterministic_hits = 0
    total_confidence = 0.0

    for idx, question in enumerate(questions):
        question_id = str(question.get("id") or f"q{idx + 1}")
        llm_item = result_map.get(
            question_id,
            {
                "questionId": question_id,
                "decision": "partially_correct",
                "isCorrectEnough": False,
                "feedback": "Please explain your answer with one more specific detail.",
            },
        )
        student_answer = answers[idx] if idx < len(answers) else ""
        verdict: ObjectiveVerdict = evaluate_objective_answer(
            question_text=str(question.get("question") or ""),
            expected_answer=str(question.get("expectedAnswer") or ""),
            student_answer=student_answer,
        )
        if verdict.is_objective:
            deterministic_hits += 1
            if verdict.is_correct:
                llm_item["decision"] = "correct_enough"
                llm_item["isCorrectEnough"] = True
                llm_item["feedback"] = (
                    llm_item.get("feedback")
                    or "Correct. Your answer matches the objective expectation."
                )
            elif verdict.confidence >= 0.9:
                llm_item["decision"] = "unsupported"
                llm_item["isCorrectEnough"] = False
                llm_item["feedback"] = (
                    "Your answer does not match the objective value expected for this question."
                )
            llm_item["verdictSource"] = "deterministic"
            llm_item["confidence"] = round(verdict.confidence, 4)
            total_confidence += verdict.confidence
        else:
            llm_item["verdictSource"] = "llm"
            llm_item["confidence"] = 0.65
            total_confidence += 0.65
        llm_item["questionId"] = question_id
        merged_results.append(llm_item)

    if deterministic_hits == len(questions) and questions:
        verdict_source = "deterministic"
    elif deterministic_hits > 0:
        verdict_source = "hybrid"
    else:
        verdict_source = "llm"

    average_confidence = round(total_confidence / max(len(merged_results), 1), 4)
    return merged_results, verdict_source, average_confidence


def _fallback_tutor_plan(recommendation: dict[str, Any]) -> dict[str, Any]:
    title = recommendation.get("title") or "this concept"
    reason = recommendation.get("reason") or "Recent class activity suggests this topic needs reinforcement."
    return {
        "teachingGoal": f"Help the student review {title} in simple steps.",
        "likelyMisconceptions": [
            _clip_text(reason, 120) or "The student may be mixing up the core idea.",
        ],
        "requiredEvidence": [
            _clip_text(recommendation.get("focusText") or title, 120) or title,
        ],
        "questionDifficulty": "easy guided practice",
        "answerGuardrail": "Do not reveal direct answers. Coach the student toward the idea first.",
    }


def _fallback_tutor_packet(
    *,
    recommendation: dict[str, Any],
    context_blocks: list[str],
) -> dict[str, Any]:
    title = recommendation.get("title") or "this topic"
    focus = recommendation.get("focusText") or title
    first_context = context_blocks[0] if context_blocks else ""
    first_context = first_context.split("] ", 1)[-1] if "] " in first_context else first_context
    evidence = _clip_text(first_context or focus, 220) or title

    return {
        "plan": _fallback_tutor_plan(recommendation),
        "lessonPlan": [
            f"Review the main idea behind {title}.",
            "Connect it to one concrete example from class.",
            "Check understanding with short guided practice.",
        ],
        "lessonBody": (
            f"We are focusing on {title}. Start with the most important idea in plain language, "
            f"then connect it to a concrete classroom example.\n\n"
            f"Use this evidence as a reference point: {evidence}\n\n"
            "If a detail still feels unclear, ask Ja to explain it in a simpler way before answering the practice questions."
        ),
        "questions": [
            {
                "id": "q1",
                "question": f"In your own words, what is the main idea behind {title}?",
                "expectedAnswer": "A short explanation that names the core idea correctly.",
                "hint": "Use one simple sentence first.",
            },
            {
                "id": "q2",
                "question": "Give one class-based example that matches this idea.",
                "expectedAnswer": "A relevant example that fits the concept.",
                "hint": "Think about a lesson, activity, or question you saw recently.",
            },
            {
                "id": "q3",
                "question": "What part of this topic still feels confusing to you?",
                "expectedAnswer": "A clear remaining question or uncertainty.",
                "hint": "Be specific about the step or word that feels unclear.",
            },
        ],
    }


def _slug(text: str) -> str:
    keep = [ch.lower() if ch.isalnum() else "-" for ch in text]
    compact = "".join(keep).strip("-")
    while "--" in compact:
        compact = compact.replace("--", "-")
    return compact[:48] or str(uuid.uuid4())


async def bootstrap_student_tutor(
    db: AsyncSession,
    user: RequestUser,
    *,
    class_id: str | None = None,
) -> dict[str, Any]:
    classes = await _get_student_classes(db, user.id)
    if not classes:
        return {
            "classes": [],
            "selectedClassId": None,
            "recentLessons": [],
            "recentAttempts": [],
            "recommendations": [],
            "history": [],
        }

    selected_class_id = class_id or classes[0]["id"]
    selected = next((item for item in classes if item["id"] == selected_class_id), None)
    if not selected:
        raise HTTPException(404, "Selected class is not available for this student")

    recent_lessons = await _get_recent_lessons(db, user.id, selected_class_id)
    recent_attempts = await _get_recent_attempts(db, user.id, selected_class_id)
    recommendations = await _build_recommendations(
        db,
        user.id,
        selected_class_id,
        recent_attempts=recent_attempts,
        recent_lessons=recent_lessons,
    )
    history = await _get_tutor_history(db, user.id, selected_class_id)

    return {
        "classes": classes,
        "selectedClassId": selected_class_id,
        "recentLessons": recent_lessons,
        "recentAttempts": recent_attempts,
        "recommendations": recommendations,
        "history": history,
    }


async def start_student_tutor_session(
    db: AsyncSession,
    user: RequestUser,
    *,
    class_id: str,
    recommendation: TutorRecommendationDto,
) -> dict[str, Any]:
    await _ensure_student_class_access(db, user.id, class_id)
    context_bundle = await _build_context_bundle(
        db,
        class_id=class_id,
        focus_text=recommendation.focus_text,
        lesson_id=recommendation.lesson_id,
        assessment_id=recommendation.assessment_id,
    )
    generated = await _generate_lesson_and_questions(
        class_label=context_bundle["classLabel"],
        recommendation={
            "title": recommendation.title,
            "reason": recommendation.reason,
            "focusText": recommendation.focus_text,
        },
        context_blocks=context_bundle["contextBlocks"],
        citations=context_bundle["citations"],
    )
    session_id = str(uuid.uuid4())
    message = _build_start_message(generated)
    state = {
        "sessionKind": TUTOR_SESSION_KIND,
        "stage": "practice",
        "classId": class_id,
        "classLabel": context_bundle["classLabel"],
        "recommendation": {
            "id": recommendation.id,
            "title": recommendation.title,
            "reason": recommendation.reason,
            "focusText": recommendation.focus_text,
            "lessonId": recommendation.lesson_id,
            "assessmentId": recommendation.assessment_id,
            "questionId": recommendation.question_id,
            "sourceChunkId": recommendation.source_chunk_id,
        },
        "tutorPlan": generated.get("plan") or {},
        "lessonPlan": generated["lessonPlan"],
        "lessonBody": generated["lessonBody"],
        "questions": generated["questions"],
        "citations": context_bundle["citations"],
        "groundingStatus": context_bundle.get("groundingStatus", "grounded"),
        "round": 1,
        "completed": False,
        "messageType": "session_start",
    }
    await _log_tutor_turn(
        db,
        user_id=user.id,
        session_id=session_id,
        input_text=f"START {recommendation.title}",
        output_text=message,
        context_metadata=state,
    )
    return {
        "sessionId": session_id,
        "stage": "practice",
        "completed": False,
        "message": message,
        "recommendation": state["recommendation"],
        "lessonPlan": generated["lessonPlan"],
        "lessonBody": generated["lessonBody"],
        "questions": generated["questions"],
        "tutorPlan": generated.get("plan") or {},
        "citations": context_bundle["citations"],
        "groundingStatus": context_bundle.get("groundingStatus", "grounded"),
    }


async def continue_student_tutor_session(
    db: AsyncSession,
    user: RequestUser,
    *,
    session_id: str,
    message: str,
    attachments: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    state, history = await _load_tutor_state(db, user.id, session_id)
    prepared_images = normalize_attachment_images(attachments)
    context_bundle = await _build_context_bundle(
        db,
        class_id=state["classId"],
        focus_text=state["recommendation"]["focusText"],
        lesson_id=state["recommendation"].get("lessonId"),
        assessment_id=state["recommendation"].get("assessmentId"),
    )
    if context_bundle.get("groundingStatus") == "insufficient":
        reply = _compose_low_grounding_reply(state["recommendation"]["title"])
        next_state = {
            **state,
            "citations": context_bundle["citations"],
            "messageType": "follow_up",
            "groundingStatus": "insufficient",
            "attachmentCount": len(prepared_images),
        }
        await _log_tutor_turn(
            db,
            user_id=user.id,
            session_id=session_id,
            input_text=message,
            output_text=reply,
            context_metadata=next_state,
            model_used="grounding-guardrail",
        )
        return {
            "sessionId": session_id,
            "stage": next_state["stage"],
            "completed": bool(next_state.get("completed")),
            "message": reply,
            "questions": next_state.get("questions") or [],
            "citations": context_bundle["citations"],
            "groundingStatus": "insufficient",
        }
    prompt = f"""
Class: {state['classLabel']}
Current focus: {state['recommendation']['title']}
Reason this was recommended: {state['recommendation']['reason']}
Tutor plan:
{json.dumps(state.get('tutorPlan') or {}, ensure_ascii=False)}

Lesson summary:
{state.get('lessonBody') or ''}

Current practice questions:
{json.dumps(state.get('questions') or [], ensure_ascii=False)}

Conversation so far:
{history}

Student message:
{message}

Respond as Ja with a concise tutoring reply. If the student asks for the direct answer, refuse politely and guide them instead.
"""
    start = time.time()
    task_name = "vision_explanation" if prepared_images else "chat"
    reply = await ollama_client.generate(
        prompt,
        TUTOR_SYSTEM_PROMPT,
        task=task_name,
        images=prepared_images,
    )
    response_time_ms = int((time.time() - start) * 1000)
    next_state = {
        **state,
        "citations": context_bundle["citations"],
        "groundingStatus": context_bundle.get("groundingStatus", "grounded"),
        "messageType": "follow_up",
        "attachmentCount": len(prepared_images),
    }
    model_used = ollama_client.get_task_model_name(task_name, images=prepared_images)
    await _log_tutor_turn(
        db,
        user_id=user.id,
        session_id=session_id,
        input_text=message,
        output_text=reply,
        context_metadata=next_state,
        response_time_ms=response_time_ms,
        model_used=model_used,
    )
    return {
        "sessionId": session_id,
        "stage": next_state["stage"],
        "completed": bool(next_state.get("completed")),
        "message": reply,
        "questions": next_state.get("questions") or [],
        "citations": context_bundle["citations"],
        "groundingStatus": next_state["groundingStatus"],
    }


async def submit_student_tutor_answers(
    db: AsyncSession,
    user: RequestUser,
    *,
    session_id: str,
    answers: list[str],
    attachments: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    state, _history = await _load_tutor_state(db, user.id, session_id)
    questions = state.get("questions") or []
    if not questions:
        raise HTTPException(400, "This tutor session has no active practice questions")
    prepared_images = normalize_attachment_images(attachments)
    context_bundle = await _build_context_bundle(
        db,
        class_id=state["classId"],
        focus_text=state["recommendation"]["focusText"],
        lesson_id=state["recommendation"].get("lessonId"),
        assessment_id=state["recommendation"].get("assessmentId"),
    )

    evaluation = await _evaluate_answers(
        class_label=state["classLabel"],
        recommendation=state["recommendation"],
        lesson_body=state.get("lessonBody") or "",
        questions=questions,
        answers=answers,
        attachments=prepared_images,
        grounding_status=context_bundle.get("groundingStatus", "grounded"),
    )

    completed = evaluation.get("overallVerdict") == "pass"
    next_state = {
        **state,
        "completed": completed,
        "stage": "completed" if completed else "practice",
        "round": int(state.get("round") or 1) + 1,
        "messageType": "answer_evaluation",
        "groundingStatus": context_bundle.get("groundingStatus", "grounded"),
        "attachmentCount": len(prepared_images),
    }
    if completed:
        next_state["questions"] = []
    else:
        next_state["questions"] = evaluation.get("nextQuestions") or questions

    message = _build_evaluation_message(evaluation)
    model_used = ollama_client.get_task_model_name(
        "vision_explanation" if prepared_images else "grading",
        images=prepared_images,
    )
    await _log_tutor_turn(
        db,
        user_id=user.id,
        session_id=session_id,
        input_text="\n".join(
            [f"Answer {idx + 1}: {value}" for idx, value in enumerate(answers)]
        ),
        output_text=message,
        context_metadata=next_state,
        model_used=model_used,
    )

    return {
        "sessionId": session_id,
        "stage": next_state["stage"],
        "completed": completed,
        "message": message,
        "results": evaluation.get("results") or [],
        "questions": next_state.get("questions") or [],
        "retryLesson": evaluation.get("retryLesson"),
        "gradingMode": evaluation.get("gradingMode", "hybrid"),
        "verdictSource": evaluation.get("verdictSource", "llm"),
        "confidence": float(evaluation.get("confidence") or 0.6),
        "groundingStatus": evaluation.get("groundingStatus", next_state["groundingStatus"]),
    }


async def get_student_tutor_session(
    db: AsyncSession,
    user: RequestUser,
    *,
    session_id: str,
) -> dict[str, Any]:
    state, _ = await _load_tutor_state(db, user.id, session_id)
    rows = await db.execute(
        sa_text(
            """
            SELECT id, input_text, output_text, created_at, context_metadata
            FROM ai_interaction_logs
            WHERE user_id = :userId
              AND session_id = :sessionId
              AND session_type = 'mentor_chat'
            ORDER BY created_at ASC
            """
        ),
        {"userId": user.id, "sessionId": session_id},
    )
    messages = []
    for row in rows.mappings():
        metadata = row["context_metadata"] or {}
        if isinstance(metadata, str):
            metadata = json.loads(metadata)
        if metadata.get("sessionKind") != TUTOR_SESSION_KIND:
            continue
        messages.append(
            {
                "id": str(row["id"]),
                "userText": row["input_text"],
                "assistantText": row["output_text"],
                "createdAt": row["created_at"].isoformat() if row["created_at"] else None,
                "messageType": metadata.get("messageType"),
            }
        )

    return {
        "sessionId": session_id,
        "state": state,
        "messages": messages,
    }


async def _get_student_classes(db: AsyncSession, user_id: str) -> list[dict[str, Any]]:
    rows = await db.execute(
        sa_text(
            """
            SELECT
              c.id,
              c.subject_name,
              c.subject_code,
              s.name AS section_name,
              s.grade_level,
              ps.blended_score,
              ps.is_at_risk,
              ps.threshold_applied
            FROM enrollments e
            INNER JOIN classes c ON c.id = e.class_id
            LEFT JOIN sections s ON s.id = c.section_id
            LEFT JOIN performance_snapshots ps
              ON ps.class_id = c.id AND ps.student_id = e.student_id
            WHERE e.student_id = :userId
              AND e.status = 'enrolled'
              AND c.is_active = true
            ORDER BY c.subject_name ASC
            """
        ),
        {"userId": user_id},
    )
    return [
        {
            "id": str(row["id"]),
            "subjectName": row["subject_name"],
            "subjectCode": row["subject_code"],
            "sectionName": row["section_name"],
            "gradeLevel": row["grade_level"],
            "blendedScore": float(row["blended_score"]) if row["blended_score"] is not None else None,
            "isAtRisk": row["is_at_risk"],
            "thresholdApplied": float(row["threshold_applied"]) if row["threshold_applied"] is not None else None,
        }
        for row in rows.mappings()
    ]


async def _get_recent_lessons(
    db: AsyncSession, user_id: str, class_id: str
) -> list[dict[str, Any]]:
    rows = await db.execute(
        sa_text(
            """
            SELECT
              lc.lesson_id,
              lc.completed_at,
              lc.progress_percentage,
              l.title
            FROM lesson_completions lc
            INNER JOIN lessons l ON l.id = lc.lesson_id
            WHERE lc.student_id = :userId
              AND l.class_id = :classId
            ORDER BY lc.completed_at DESC
            LIMIT 5
            """
        ),
        {"userId": user_id, "classId": class_id},
    )
    return [
        {
            "lessonId": str(row["lesson_id"]),
            "title": row["title"],
            "completedAt": row["completed_at"].isoformat() if row["completed_at"] else None,
            "progressPercentage": row["progress_percentage"],
        }
        for row in rows.mappings()
    ]


async def _get_recent_attempts(
    db: AsyncSession, user_id: str, class_id: str
) -> list[dict[str, Any]]:
    rows = await db.execute(
        sa_text(
            """
            SELECT
              aa.id,
              aa.assessment_id,
              aa.attempt_number,
              aa.score,
              aa.passed,
              aa.submitted_at,
              a.title,
              a.passing_score
            FROM assessment_attempts aa
            INNER JOIN assessments a ON a.id = aa.assessment_id
            WHERE aa.student_id = :userId
              AND a.class_id = :classId
              AND aa.is_submitted = true
            ORDER BY COALESCE(aa.submitted_at, aa.started_at) DESC
            LIMIT 8
            """
        ),
        {"userId": user_id, "classId": class_id},
    )
    return [
        {
            "attemptId": str(row["id"]),
            "assessmentId": str(row["assessment_id"]),
            "title": row["title"],
            "attemptNumber": row["attempt_number"],
            "score": row["score"],
            "passed": row["passed"],
            "passingScore": row["passing_score"],
            "submittedAt": row["submitted_at"].isoformat() if row["submitted_at"] else None,
        }
        for row in rows.mappings()
    ]


async def _build_recommendations(
    db: AsyncSession,
    user_id: str,
    class_id: str,
    *,
    recent_attempts: list[dict[str, Any]],
    recent_lessons: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    weak_rows = await db.execute(
        sa_text(
            """
            SELECT
              q.id AS question_id,
              q.content AS question_content,
              q.explanation AS question_explanation,
              q.concept_tags,
              a.id AS assessment_id,
              a.title AS assessment_title,
              aa.score,
              aa.attempt_number
            FROM assessment_attempts aa
            INNER JOIN assessments a ON a.id = aa.assessment_id
            INNER JOIN assessment_responses r ON r.attempt_id = aa.id
            INNER JOIN assessment_questions q ON q.id = r.question_id
            WHERE aa.student_id = :userId
              AND a.class_id = :classId
              AND aa.is_submitted = true
              AND COALESCE(r.is_correct, false) = false
            ORDER BY COALESCE(aa.submitted_at, aa.started_at) DESC
            LIMIT 24
            """
        ),
        {"userId": user_id, "classId": class_id},
    )

    grouped: dict[str, dict[str, Any]] = {}
    for row in weak_rows.mappings():
        concept_tags = row["concept_tags"]
        if isinstance(concept_tags, str):
            try:
                concept_tags = json.loads(concept_tags)
            except json.JSONDecodeError:
                concept_tags = []
        if not isinstance(concept_tags, list):
            concept_tags = []
        primary_tag = str(concept_tags[0]).strip() if concept_tags else ""
        title = primary_tag or _truncate(row["question_content"], 58)
        rec_id = _slug(title)
        current = grouped.get(rec_id)
        if not current:
            grouped[rec_id] = {
                "id": rec_id,
                "title": title,
                "reason": f"Recent incorrect answers in {row['assessment_title']} suggest this concept needs review.",
                "focusText": _compose_focus_text(
                    [
                        title,
                        row["question_content"],
                        row["question_explanation"],
                        row["assessment_title"],
                    ]
                ),
                "questionId": str(row["question_id"]),
                "assessmentId": str(row["assessment_id"]),
                "lessonId": None,
                "sourceChunkId": None,
                "score": 2,
            }
        else:
            current["score"] += 2

    if len(grouped) < 3:
        chunk_seed = "\n".join(
            [item["title"] for item in grouped.values()] or [attempt["title"] for attempt in recent_attempts]
        ) or "recent class lessons"
        chunks = await similarity_search(
            db,
            query_text=chunk_seed,
            class_id=class_id,
            top_k=6,
            only_published=True,
        )
        for chunk in chunks:
            metadata = chunk.get("metadataJson") or {}
            title = metadata.get("lessonTitle") or metadata.get("assessmentTitle") or "Focused review"
            rec_id = _slug(title)
            if rec_id in grouped:
                grouped[rec_id]["score"] += 1
                grouped[rec_id]["sourceChunkId"] = grouped[rec_id].get("sourceChunkId") or chunk["id"]
                grouped[rec_id]["lessonId"] = grouped[rec_id].get("lessonId") or chunk.get("lessonId")
                continue
            grouped[rec_id] = {
                "id": rec_id,
                "title": title,
                "reason": "This published lesson is strongly related to your recent class activity and is a good next review target.",
                "focusText": _compose_focus_text([title, chunk["chunkText"]]),
                "questionId": chunk.get("questionId"),
                "assessmentId": chunk.get("assessmentId"),
                "lessonId": chunk.get("lessonId"),
                "sourceChunkId": chunk["id"],
                "score": 1,
            }

    if len(grouped) < 3:
        for lesson in recent_lessons:
            rec_id = _slug(lesson["title"])
            if rec_id in grouped:
                continue
            grouped[rec_id] = {
                "id": rec_id,
                "title": lesson["title"],
                "reason": "You completed this lesson recently, so this is a safe concept to reinforce with guided practice.",
                "focusText": _compose_focus_text([lesson["title"]], max_len=200),
                "questionId": None,
                "assessmentId": None,
                "lessonId": lesson["lessonId"],
                "sourceChunkId": None,
                "score": 0,
            }
            if len(grouped) >= 3:
                break

    ranked = sorted(grouped.values(), key=lambda item: item["score"], reverse=True)[:3]
    return [
        {key: value for key, value in item.items() if key != "score"}
        for item in ranked
    ]


async def _get_tutor_history(
    db: AsyncSession, user_id: str, class_id: str
) -> list[dict[str, Any]]:
    rows = await db.execute(
        sa_text(
            """
            SELECT id, session_id, input_text, output_text, created_at, context_metadata
            FROM ai_interaction_logs
            WHERE user_id = :userId
              AND session_type = 'mentor_chat'
            ORDER BY created_at DESC
            LIMIT 60
            """
        ),
        {"userId": user_id},
    )
    sessions: dict[str, dict[str, Any]] = {}
    for row in rows.mappings():
        metadata = row["context_metadata"] or {}
        if isinstance(metadata, str):
            try:
                metadata = json.loads(metadata)
            except json.JSONDecodeError:
                metadata = {}
        if metadata.get("sessionKind") != TUTOR_SESSION_KIND:
            continue
        if metadata.get("classId") != class_id:
            continue
        session_id = str(row["session_id"])
        current = sessions.get(session_id)
        if not current:
            sessions[session_id] = {
                "sessionId": session_id,
                "title": metadata.get("recommendation", {}).get("title") or "Tutor Session",
                "preview": _truncate(row["output_text"], 90),
                "updatedAt": row["created_at"].isoformat() if row["created_at"] else None,
                "completed": bool(metadata.get("completed")),
                "stage": metadata.get("stage"),
            }
    return list(sessions.values())[:8]


async def _build_context_bundle(
    db: AsyncSession,
    *,
    class_id: str,
    focus_text: str,
    lesson_id: str | None,
    assessment_id: str | None,
) -> dict[str, Any]:
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

    try:
        chunks = await similarity_search(
            db,
            query_text=focus_text,
            class_id=class_id,
            top_k=5,
            lesson_ids=[lesson_id] if lesson_id else None,
            assessment_ids=[assessment_id] if assessment_id else None,
            only_published=True,
            policy_name="student_tutor",
            reference_lesson_id=lesson_id,
            reference_assessment_id=assessment_id,
        )
    except Exception:
        chunks = []
    grounded_chunks = [chunk for chunk in chunks if _is_chunk_grounded(chunk)]
    selected_chunks = grounded_chunks or chunks[:1]
    grounding_status = _grounding_status_from_chunks(grounded_chunks)
    context_blocks = []
    citations = []
    for chunk in selected_chunks:
        metadata = chunk.get("metadataJson") or {}
        label = metadata.get("lessonTitle") or metadata.get("assessmentTitle") or chunk["sourceType"]
        context_blocks.append(f"[{label}] {chunk['chunkText']}")
        citations.append(
            {
                "chunkId": chunk["id"],
                "label": label,
                "lessonId": chunk.get("lessonId"),
                "assessmentId": chunk.get("assessmentId"),
                "scoreBreakdown": chunk.get("scoreBreakdown") or {},
                "selectionReason": chunk.get("selectionReason"),
                "sourceReference": chunk.get("sourceReference"),
            }
        )

    class_label = f"{class_info['subject_name']} ({class_info['subject_code']})"
    if class_info["section_name"]:
        class_label = f"{class_label} - {class_info['section_name']}"

    return {
        "classLabel": class_label,
        "contextBlocks": context_blocks,
        "citations": citations,
        "groundingStatus": grounding_status,
    }


async def _generate_lesson_and_questions(
    *,
    class_label: str,
    recommendation: dict[str, Any],
    context_blocks: list[str],
    citations: list[dict[str, Any]],
) -> dict[str, Any]:
    try:
        plan = await _plan_tutor_packet(
            class_label=class_label,
            recommendation=recommendation,
            context_blocks=context_blocks,
            citations=citations,
        )
        prompt = f"""
Create a grounded tutoring packet for one student.

Class: {class_label}
Focus topic: {recommendation['title']}
Why it was recommended: {recommendation['reason']}
Focus query: {recommendation['focusText']}

Planner output:
{json.dumps(plan, ensure_ascii=False)}

Grounded context:
{chr(10).join(context_blocks) if context_blocks else "[No additional context found]"}

Return valid JSON with this shape:
{{
  "lessonPlan": ["short step 1", "short step 2", "short step 3"],
  "lessonBody": "2-4 short paragraphs that teach the concept simply",
  "questions": [
    {{
      "id": "q1",
      "question": "plain-language practice question",
      "expectedAnswer": "short scoring guide for evaluator only",
      "hint": "gentle hint"
    }}
  ]
}}

Constraints:
- Exactly 3 questions.
- Questions must be easier than a normal graded assessment.
- expectedAnswer must be short and should not include long answer-key wording.
- Use only evidence that matches the planner's requiredEvidence.
- If evidence is weak, keep the lesson body conservative and say what idea the student should verify.
"""
        raw = await ollama_client.generate(
            prompt,
            TUTOR_SYSTEM_PROMPT,
            task="chat",
            response_format=TUTOR_PACKET_FORMAT,
        )
        parsed = _safe_json_loads(raw)
        questions = parsed.get("questions") or []
        if len(questions) != 3:
            raise HTTPException(502, "Tutor generation did not return exactly three practice questions")
        return {
            "plan": plan,
            "lessonPlan": parsed.get("lessonPlan") or [],
            "lessonBody": parsed.get("lessonBody") or "",
            "questions": questions,
        }
    except Exception:
        return _fallback_tutor_packet(
            recommendation=recommendation,
            context_blocks=context_blocks,
        )


async def _plan_tutor_packet(
    *,
    class_label: str,
    recommendation: dict[str, Any],
    context_blocks: list[str],
    citations: list[dict[str, Any]],
) -> dict[str, Any]:
    prompt = f"""
Build a tutoring plan before writing any lesson content.

Class: {class_label}
Focus topic: {recommendation['title']}
Why it was recommended: {recommendation['reason']}
Focus query: {recommendation['focusText']}

Available evidence blocks:
{chr(10).join(context_blocks) if context_blocks else "[No retrieved evidence found]"}

Available citations:
{json.dumps(citations, ensure_ascii=False)}

Return valid JSON only. The plan should identify the main teaching goal, likely misconceptions, required evidence, the intended question difficulty, and a short answer-guardrail for the tutor.
"""
    try:
        raw = await ollama_client.generate(
            prompt,
            TUTOR_SYSTEM_PROMPT,
            task="chat",
            response_format=TUTOR_PLAN_FORMAT,
        )
        return _safe_json_loads(raw)
    except Exception:
        return _fallback_tutor_plan(recommendation)


async def _evaluate_answers(
    *,
    class_label: str,
    recommendation: dict[str, Any],
    lesson_body: str,
    questions: list[dict[str, Any]],
    answers: list[str],
    attachments: list[dict[str, Any]] | None = None,
    grounding_status: str = "grounded",
) -> dict[str, Any]:
    prompt = f"""
Evaluate a student's tutoring answers.

Class: {class_label}
Focus topic: {recommendation['title']}
Lesson summary:
{lesson_body}

Recommendation packet:
{json.dumps(recommendation, ensure_ascii=False)}

Questions:
{json.dumps(questions, ensure_ascii=False)}

Student answers:
{json.dumps(answers, ensure_ascii=False)}

Return valid JSON:
{{
  "overallVerdict": "pass" or "retry",
  "encouragement": "brief supportive reaction",
  "retryLesson": "soft explanation only when verdict is retry",
  "results": [
    {{
      "questionId": "q1",
      "isCorrectEnough": true,
      "feedback": "brief feedback"
    }}
  ],
  "nextQuestions": [
    {{
      "id": "q1b",
      "question": "new easier or clarifying question",
      "expectedAnswer": "short scoring guide for evaluator only",
      "hint": "gentle hint"
    }}
  ]
}}

Rules:
- Accept paraphrases, short equivalent wording, and mathematically/scientifically equivalent answers.
- Use `decision = "correct_enough"` when the student's meaning matches the expected answer even if wording differs.
- Use `decision = "partially_correct"` when the student shows partial understanding and the answer is close but incomplete.
- Use `decision = "unsupported"` only when the answer clearly conflicts with the lesson or lacks the needed idea.
- If the lesson summary or question wording is insufficient to judge confidently, prefer `partially_correct` with feedback that asks for clarification.
- Mark pass only if at least 2 answers are meaningfully correct and the student shows understanding.
- If retry, generate exactly 3 replacement questions.
- Keep encouragement brief.
"""
    task_name = "vision_explanation" if attachments else "grading"
    raw = await ollama_client.generate(
        prompt,
        TUTOR_SYSTEM_PROMPT,
        task=task_name,
        response_format=TUTOR_EVALUATION_FORMAT,
        images=attachments,
    )
    parsed = _safe_json_loads(raw)
    if parsed.get("overallVerdict") not in {"pass", "retry"}:
        raise HTTPException(502, "Tutor evaluation returned an invalid verdict")
    merged_results, verdict_source, average_confidence = _apply_deterministic_override(
        questions=questions,
        answers=answers,
        llm_results=list(parsed.get("results") or []),
    )
    for result in merged_results:
        result["groundingStatus"] = grounding_status

    correct_count = sum(1 for item in merged_results if item.get("isCorrectEnough"))
    pass_threshold = 2 if len(questions) >= 2 else 1
    parsed["overallVerdict"] = "pass" if correct_count >= pass_threshold else "retry"
    parsed["results"] = merged_results
    parsed["gradingMode"] = "hybrid"
    parsed["verdictSource"] = verdict_source
    parsed["confidence"] = average_confidence
    parsed["groundingStatus"] = grounding_status
    if parsed["overallVerdict"] == "pass":
        parsed["nextQuestions"] = []
    elif len(parsed.get("nextQuestions") or []) != 3:
        raise HTTPException(502, "Tutor evaluation did not return three retry questions")
    return parsed


async def _load_tutor_state(
    db: AsyncSession, user_id: str, session_id: str
) -> tuple[dict[str, Any], str]:
    rows = await db.execute(
        sa_text(
            """
            SELECT input_text, output_text, context_metadata, created_at
            FROM ai_interaction_logs
            WHERE user_id = :userId
              AND session_id = :sessionId
              AND session_type = 'mentor_chat'
            ORDER BY created_at ASC
            """
        ),
        {"userId": user_id, "sessionId": session_id},
    )
    history_lines = []
    latest_state: dict[str, Any] | None = None
    for row in rows.mappings():
        metadata = row["context_metadata"] or {}
        if isinstance(metadata, str):
            try:
                metadata = json.loads(metadata)
            except json.JSONDecodeError:
                metadata = {}
        if metadata.get("sessionKind") != TUTOR_SESSION_KIND:
            continue
        history_lines.append(f"Student: {row['input_text']}")
        history_lines.append(f"Ja: {row['output_text']}")
        latest_state = metadata

    if latest_state is None:
        raise HTTPException(404, "Tutor session not found")
    return latest_state, "\n".join(history_lines[-12:])


async def _ensure_student_class_access(
    db: AsyncSession, user_id: str, class_id: str
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


async def _log_tutor_turn(
    db: AsyncSession,
    *,
    user_id: str,
    session_id: str,
    input_text: str,
    output_text: str,
    context_metadata: dict[str, Any],
    response_time_ms: int | None = None,
    model_used: str | None = None,
) -> None:
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
              'mentor_chat',
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
            "userId": user_id,
            "inputText": input_text[:2000],
            "outputText": output_text[:5000],
            "modelUsed": model_used or ollama_client.get_task_model_name("chat"),
            "responseTimeMs": response_time_ms,
            "sessionId": session_id,
            "contextMetadata": context_metadata,
        },
    )
    await db.commit()


def _build_start_message(payload: dict[str, Any]) -> str:
    plan_lines = "\n".join(
        [f"{idx + 1}. {item}" for idx, item in enumerate(payload.get("lessonPlan") or [])]
    )
    question_lines = "\n\n".join(
        [
            f"{idx + 1}. {item['question']}\nHint: {item.get('hint') or 'Think about the key idea we just reviewed.'}"
            for idx, item in enumerate(payload.get("questions") or [])
        ]
    )
    return (
        "I reviewed the clues from your class activity and built a short tutoring path for you.\n\n"
        f"Lesson plan:\n{plan_lines}\n\n"
        f"{payload.get('lessonBody')}\n\n"
        "Try these 3 guided questions next:\n"
        f"{question_lines}"
    )


def _build_evaluation_message(payload: dict[str, Any]) -> str:
    lines = [payload.get("encouragement") or "You made progress on this round."]
    results = payload.get("results") or []
    if results:
        lines.append("")
        for idx, item in enumerate(results):
            decision = item.get("decision")
            if decision == "correct_enough":
                status = "Good"
            elif decision == "partially_correct":
                status = "Almost"
            else:
                status = "Review"
            lines.append(f"{idx + 1}. {status}: {item.get('feedback')}")
    if payload.get("overallVerdict") == "pass":
        lines.append("")
        lines.append("You finished this tutoring path. Nice work staying with the process.")
    else:
        lines.append("")
        lines.append(payload.get("retryLesson") or "Let's tighten the idea one more time.")
        next_questions = payload.get("nextQuestions") or []
        if next_questions:
            lines.append("")
            lines.append("Here are 3 softer follow-up questions:")
            for idx, item in enumerate(next_questions):
                lines.append(
                    f"{idx + 1}. {item['question']}\nHint: {item.get('hint') or 'Use the explanation above.'}"
                )
    return "\n".join(lines)


def _truncate(value: str | None, max_len: int) -> str:
    text = (value or "").strip()
    if len(text) <= max_len:
        return text
    return f"{text[: max_len - 3].rstrip()}..."


def _compose_focus_text(parts: list[str | None], max_len: int = 900) -> str:
    joined = "\n".join(part.strip() for part in parts if part and part.strip())
    return _truncate(joined, max_len)
