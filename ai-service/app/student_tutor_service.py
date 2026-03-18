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


def _safe_json_loads(raw: str) -> dict[str, Any]:
    text = raw.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if len(lines) >= 3:
            text = "\n".join(lines[1:-1]).strip()
    return json.loads(text)


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
        "lessonPlan": generated["lessonPlan"],
        "lessonBody": generated["lessonBody"],
        "questions": generated["questions"],
        "citations": context_bundle["citations"],
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
        "citations": context_bundle["citations"],
    }


async def continue_student_tutor_session(
    db: AsyncSession,
    user: RequestUser,
    *,
    session_id: str,
    message: str,
) -> dict[str, Any]:
    state, history = await _load_tutor_state(db, user.id, session_id)
    context_bundle = await _build_context_bundle(
        db,
        class_id=state["classId"],
        focus_text=state["recommendation"]["focusText"],
        lesson_id=state["recommendation"].get("lessonId"),
        assessment_id=state["recommendation"].get("assessmentId"),
    )
    prompt = f"""
Class: {state['classLabel']}
Current focus: {state['recommendation']['title']}
Reason this was recommended: {state['recommendation']['reason']}

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
    reply = await ollama_client.generate(prompt, TUTOR_SYSTEM_PROMPT)
    response_time_ms = int((time.time() - start) * 1000)
    next_state = {
        **state,
        "citations": context_bundle["citations"],
        "messageType": "follow_up",
    }
    await _log_tutor_turn(
        db,
        user_id=user.id,
        session_id=session_id,
        input_text=message,
        output_text=reply,
        context_metadata=next_state,
        response_time_ms=response_time_ms,
    )
    return {
        "sessionId": session_id,
        "stage": next_state["stage"],
        "completed": bool(next_state.get("completed")),
        "message": reply,
        "questions": next_state.get("questions") or [],
        "citations": context_bundle["citations"],
    }


async def submit_student_tutor_answers(
    db: AsyncSession,
    user: RequestUser,
    *,
    session_id: str,
    answers: list[str],
) -> dict[str, Any]:
    state, _history = await _load_tutor_state(db, user.id, session_id)
    questions = state.get("questions") or []
    if not questions:
        raise HTTPException(400, "This tutor session has no active practice questions")

    evaluation = await _evaluate_answers(
        class_label=state["classLabel"],
        recommendation=state["recommendation"],
        lesson_body=state.get("lessonBody") or "",
        questions=questions,
        answers=answers,
    )

    completed = evaluation.get("overallVerdict") == "pass"
    next_state = {
        **state,
        "completed": completed,
        "stage": "completed" if completed else "practice",
        "round": int(state.get("round") or 1) + 1,
        "messageType": "answer_evaluation",
    }
    if completed:
        next_state["questions"] = []
    else:
        next_state["questions"] = evaluation.get("nextQuestions") or questions

    message = _build_evaluation_message(evaluation)
    await _log_tutor_turn(
        db,
        user_id=user.id,
        session_id=session_id,
        input_text="\n".join(
            [f"Answer {idx + 1}: {value}" for idx, value in enumerate(answers)]
        ),
        output_text=message,
        context_metadata=next_state,
    )

    return {
        "sessionId": session_id,
        "stage": next_state["stage"],
        "completed": completed,
        "message": message,
        "results": evaluation.get("results") or [],
        "questions": next_state.get("questions") or [],
        "retryLesson": evaluation.get("retryLesson"),
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
                "focusText": "\n".join(
                    filter(
                        None,
                        [
                            title,
                            row["question_content"],
                            row["question_explanation"],
                            row["assessment_title"],
                        ],
                    )
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
                "focusText": "\n".join(filter(None, [title, chunk["chunkText"]])),
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
                "focusText": lesson["title"],
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

    chunks = await similarity_search(
        db,
        query_text=focus_text,
        class_id=class_id,
        top_k=5,
        lesson_ids=[lesson_id] if lesson_id else None,
        assessment_ids=[assessment_id] if assessment_id else None,
        only_published=True,
    )
    context_blocks = []
    citations = []
    for chunk in chunks:
        metadata = chunk.get("metadataJson") or {}
        label = metadata.get("lessonTitle") or metadata.get("assessmentTitle") or chunk["sourceType"]
        context_blocks.append(f"[{label}] {chunk['chunkText']}")
        citations.append(
            {
                "chunkId": chunk["id"],
                "label": label,
                "lessonId": chunk.get("lessonId"),
                "assessmentId": chunk.get("assessmentId"),
            }
        )

    class_label = f"{class_info['subject_name']} ({class_info['subject_code']})"
    if class_info["section_name"]:
        class_label = f"{class_label} - {class_info['section_name']}"

    return {
        "classLabel": class_label,
        "contextBlocks": context_blocks,
        "citations": citations,
    }


async def _generate_lesson_and_questions(
    *,
    class_label: str,
    recommendation: dict[str, Any],
    context_blocks: list[str],
) -> dict[str, Any]:
    prompt = f"""
Create a grounded tutoring packet for one student.

Class: {class_label}
Focus topic: {recommendation['title']}
Why it was recommended: {recommendation['reason']}
Focus query: {recommendation['focusText']}

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
"""
    raw = await ollama_client.generate(prompt, TUTOR_SYSTEM_PROMPT)
    parsed = _safe_json_loads(raw)
    questions = parsed.get("questions") or []
    if len(questions) != 3:
        raise HTTPException(502, "Tutor generation did not return exactly three practice questions")
    return {
        "lessonPlan": parsed.get("lessonPlan") or [],
        "lessonBody": parsed.get("lessonBody") or "",
        "questions": questions,
    }


async def _evaluate_answers(
    *,
    class_label: str,
    recommendation: dict[str, Any],
    lesson_body: str,
    questions: list[dict[str, Any]],
    answers: list[str],
) -> dict[str, Any]:
    prompt = f"""
Evaluate a student's tutoring answers.

Class: {class_label}
Focus topic: {recommendation['title']}
Lesson summary:
{lesson_body}

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
- Mark pass only if at least 2 answers are meaningfully correct and the student shows understanding.
- If retry, generate exactly 3 replacement questions.
- Keep encouragement brief.
"""
    raw = await ollama_client.generate(prompt, TUTOR_SYSTEM_PROMPT)
    parsed = _safe_json_loads(raw)
    if parsed.get("overallVerdict") not in {"pass", "retry"}:
        raise HTTPException(502, "Tutor evaluation returned an invalid verdict")
    if parsed.get("overallVerdict") == "retry" and len(parsed.get("nextQuestions") or []) != 3:
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
            "modelUsed": ollama_client.get_model_name(),
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
            status = "Good" if item.get("isCorrectEnough") else "Review"
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
