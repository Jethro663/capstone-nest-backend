"""
Nexora AI Service – FastAPI application.

All authentication is handled by the NestJS backend proxy.
User context is forwarded via X-User-Id, X-User-Email, X-User-Roles headers.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import json
import logging
import os
import uuid
from typing import Any

from fastapi import Body, Depends, FastAPI, Header, HTTPException, Query
from sqlalchemy import text as sa_text, bindparam
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .database import AsyncSessionLocal, get_db
from . import ollama_client
from .extraction_pipeline import run_extraction
from .indexing_pipeline import reindex_class_content
from .media_utils import normalize_attachment_images
from .mentor_service import explain_mistake
from .quiz_generation_service import generate_quiz_draft
from .retrieval_service import preview_retrieval
from .remedial_service import recommend_intervention_case
from .llamaindex_adapter import build_text_node, llamaindex_available
from .student_tutor_service import (
    bootstrap_student_tutor,
    continue_student_tutor_session,
    get_student_tutor_session,
    start_student_tutor_session,
    submit_student_tutor_answers,
)
from .ja_practice_service import (
    bootstrap_ja_ask,
    bootstrap_ja_practice,
    bootstrap_ja_review,
    generate_ja_ask_response,
    generate_ja_practice_session_packet,
    generate_ja_review_session_packet,
)
from .schemas import (
    ApplyExtractionRequest,
    ChatRequest,
    ExtractRequest,
    GenerateQuizDraftRequest,
    InterventionRecommendationRequest,
    MentorExplainRequest,
    RequestUser,
    StudentTutorAnswerRequest,
    StudentTutorMessageRequest,
    StudentTutorStartRequest,
    JaPracticeGenerateRequest,
    JaAskResponseRequest,
    JaReviewGenerateRequest,
    UpdateExtractionRequest,
)

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

app = FastAPI(title="Nexora AI Service", version="1.0.0")
AI_JOB_RUNTIME: dict[str, dict[str, Any]] = {}


@app.on_event("startup")
async def preload_ollama_models() -> None:
    try:
        await ollama_client.preload_model("chat")
    except Exception as err:
        logger.warning("Failed to preload text model: %s", err)
    try:
        await ollama_client.preload_model("vision_extraction")
    except Exception as err:
        logger.warning("Failed to preload vision model: %s", err)


def _set_ai_job_runtime(job_id: str, **values: Any) -> None:
    runtime = AI_JOB_RUNTIME.setdefault(job_id, {})
    runtime.update(values)
    runtime["updatedAt"] = datetime.now(timezone.utc).isoformat()


async def _persist_ai_job_runtime(
    db: AsyncSession,
    *,
    job_id: str,
    runtime_patch: dict[str, Any],
) -> dict[str, Any]:
    row = await db.execute(
        sa_text("SELECT source_filters FROM ai_generation_jobs WHERE id = :jobId"),
        {"jobId": job_id},
    )
    existing = row.mappings().first()
    source_filters = dict(existing["source_filters"] or {}) if existing else {}
    runtime = dict(source_filters.get("runtime") or {})
    runtime.update(runtime_patch)
    runtime["updatedAt"] = datetime.now(timezone.utc).isoformat()
    source_filters["runtime"] = runtime
    await db.execute(
        sa_text(
            """
            UPDATE ai_generation_jobs
            SET source_filters = :sourceFilters, updated_at = NOW()
            WHERE id = :jobId
            """
        ).bindparams(bindparam("sourceFilters", type_=postgresql.JSONB)),
        {
            "jobId": job_id,
            "sourceFilters": source_filters,
        },
    )
    await db.commit()
    return runtime


async def _record_ai_job_runtime(
    db: AsyncSession,
    *,
    job_id: str,
    **values: Any,
) -> None:
    _set_ai_job_runtime(job_id, **values)
    await _persist_ai_job_runtime(db, job_id=job_id, runtime_patch=values)


async def _run_with_retries(
    operation,
    *,
    max_attempts: int = 3,
    delay_seconds: float = 1.0,
) -> Any:
    last_error: Exception | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            return await operation(attempt)
        except Exception as err:  # pragma: no cover - controlled by callers
            last_error = err
            if attempt >= max_attempts:
                break
            await asyncio.sleep(delay_seconds * (2 ** (attempt - 1)))
    assert last_error is not None
    raise last_error


def _runtime_progress_for_status(status: str, runtime: dict[str, Any] | None) -> int:
    if runtime and isinstance(runtime.get("progressPercent"), int):
        return max(0, min(100, runtime["progressPercent"]))
    return {
        "pending": 5,
        "processing": 60,
        "completed": 100,
        "approved": 100,
        "rejected": 100,
        "failed": 100,
    }.get(status, 0)


async def _create_ai_generation_job(
    db: AsyncSession,
    *,
    job_type: str,
    class_id: str | None,
    teacher_id: str,
    source_filters: dict[str, Any],
) -> str:
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
              :jobType,
              :classId,
              :teacherId,
              'pending',
              :sourceFilters
            )
            RETURNING id
            """
        ).bindparams(bindparam("sourceFilters", type_=postgresql.JSONB)),
        {
            "jobType": job_type,
            "classId": class_id,
            "teacherId": teacher_id,
            "sourceFilters": source_filters,
        },
    )
    await db.commit()
    job_id = str(job_row.scalar_one())
    _set_ai_job_runtime(
        job_id,
        progressPercent=5,
        statusMessage="Queued",
        retryState={"attempt": 0, "maxAttempts": 3},
    )
    await _persist_ai_job_runtime(
        db,
        job_id=job_id,
        runtime_patch={
            "progressPercent": 5,
            "statusMessage": "Queued",
            "retryState": {"attempt": 0, "maxAttempts": 3},
        },
    )
    return job_id


async def _load_ai_job_context(
    db: AsyncSession,
    job_id: str,
    user: RequestUser,
) -> tuple[dict[str, Any], dict[str, Any] | None, str | None]:
    job_row = await db.execute(
        sa_text(
            """
            SELECT
              j.id,
              j.job_type,
              j.class_id,
              j.teacher_id,
              j.status,
              j.source_filters,
              j.error_message,
              j.created_at,
              j.updated_at,
              o.id AS output_id,
              o.output_type,
              o.structured_output
            FROM ai_generation_jobs j
            LEFT JOIN ai_generation_outputs o ON o.job_id = j.id
            WHERE j.id = :jobId
            ORDER BY o.created_at DESC NULLS LAST
            LIMIT 1
            """
        ),
        {"jobId": job_id},
    )
    record = job_row.mappings().first()
    if not record:
        raise HTTPException(404, f'AI job "{job_id}" not found')

    is_admin = "admin" in [role.lower() for role in user.roles]
    if not is_admin and str(record["teacher_id"]) != user.id:
        raise HTTPException(403, "You can only view your own AI jobs")

    assessment_id: str | None = None
    if record["output_id"] and record["output_type"] == "assessment_draft":
        assessment_row = await db.execute(
            sa_text(
                """
                SELECT id
                FROM assessments
                WHERE ai_generation_output_id = :outputId
                ORDER BY created_at DESC
                LIMIT 1
                """
            ),
            {"outputId": str(record["output_id"])},
        )
        assessment_id = assessment_row.scalar()
        if assessment_id is not None:
            assessment_id = str(assessment_id)

    db_runtime = {}
    source_filters = record.get("source_filters") or {}
    if isinstance(source_filters, dict):
        db_runtime = source_filters.get("runtime") or {}
    memory_runtime = AI_JOB_RUNTIME.get(job_id) or {}
    merged_runtime = {**db_runtime, **memory_runtime} if (db_runtime or memory_runtime) else None
    return dict(record), merged_runtime, assessment_id


async def _run_quiz_generation_job(
    job_id: str,
    body: GenerateQuizDraftRequest,
    user: RequestUser,
) -> None:
    async with AsyncSessionLocal() as bg_db:
        try:
            await _record_ai_job_runtime(
                bg_db,
                job_id=job_id,
                progressPercent=20,
                statusMessage="Planning quiz blueprint",
                retryState={"attempt": 1, "maxAttempts": 3},
            )

            async def _operation(attempt: int) -> dict[str, Any]:
                await _record_ai_job_runtime(
                    bg_db,
                    job_id=job_id,
                    retryState={"attempt": attempt, "maxAttempts": 3},
                    statusMessage=f"Generating quiz draft (attempt {attempt}/3)",
                )
                return await generate_quiz_draft(
                    bg_db,
                    user,
                    body,
                    existing_job_id=job_id,
                )

            result = await _run_with_retries(_operation, max_attempts=3, delay_seconds=1.5)
            await _record_ai_job_runtime(
                bg_db,
                job_id=job_id,
                progressPercent=85,
                statusMessage=(
                    "Generating questions from fallback blueprint"
                    if result.get("blueprintSource") == "fallback"
                    else "Generating questions from quiz blueprint"
                ),
            )
            indexing = await reindex_class_content(bg_db, body.class_id)
            await _record_ai_job_runtime(
                bg_db,
                job_id=job_id,
                progressPercent=100,
                statusMessage="Draft ready for teacher review",
                resultSummary={
                    "assessmentId": result.get("assessmentId"),
                    "outputId": result.get("outputId"),
                    "blueprintSource": result.get("blueprintSource"),
                    "indexing": indexing,
                },
            )
        except Exception as exc:
            await bg_db.execute(
                sa_text(
                    """
                    UPDATE ai_generation_jobs
                    SET
                      status = 'failed',
                      error_message = :errorMessage,
                      updated_at = NOW()
                    WHERE id = :jobId
                    """
                ),
                {
                    "jobId": job_id,
                    "errorMessage": str(exc),
                },
            )
            await bg_db.commit()
            await _record_ai_job_runtime(
                bg_db,
                job_id=job_id,
                progressPercent=100,
                statusMessage="Generation failed",
                errorMessage=str(exc),
            )
            logger.exception("[ai-job] Quiz generation %s failed", job_id)


async def _run_intervention_generation_job(
    job_id: str,
    case_id: str,
    note: str | None,
    user: RequestUser,
) -> None:
    async with AsyncSessionLocal() as bg_db:
        try:
            await _record_ai_job_runtime(
                bg_db,
                job_id=job_id,
                progressPercent=20,
                statusMessage="Collecting intervention evidence",
                retryState={"attempt": 1, "maxAttempts": 3},
            )

            async def _operation(attempt: int) -> dict[str, Any]:
                await _record_ai_job_runtime(
                    bg_db,
                    job_id=job_id,
                    retryState={"attempt": attempt, "maxAttempts": 3},
                    statusMessage=f"Generating intervention recommendation (attempt {attempt}/3)",
                )
                return await recommend_intervention_case(
                    bg_db,
                    user,
                    case_id=case_id,
                    note=note,
                    existing_job_id=job_id,
                )

            result = await _run_with_retries(_operation, max_attempts=3, delay_seconds=1.5)
            await _record_ai_job_runtime(
                bg_db,
                job_id=job_id,
                progressPercent=100,
                statusMessage="Recommendation ready for teacher review",
                resultSummary={
                    "outputId": result.get("outputId"),
                    "caseId": result.get("caseId"),
                },
            )
        except Exception as exc:
            await bg_db.execute(
                sa_text(
                    """
                    UPDATE ai_generation_jobs
                    SET
                      status = 'failed',
                      error_message = :errorMessage,
                      updated_at = NOW()
                    WHERE id = :jobId
                    """
                ),
                {
                    "jobId": job_id,
                    "errorMessage": str(exc),
                },
            )
            await bg_db.commit()
            await _record_ai_job_runtime(
                bg_db,
                job_id=job_id,
                progressPercent=100,
                statusMessage="Generation failed",
                errorMessage=str(exc),
            )
            logger.exception("[ai-job] Intervention generation %s failed", job_id)

# ---------------------------------------------------------------------------
# JAKIPIR System Prompt
# ---------------------------------------------------------------------------

JAKIPIR_SYSTEM_PROMPT = """You are J.A.K.I.P.I.R — Just-in-time Adaptive Knowledge Instructor & Personalized Intelligence Resource. Your nickname is "Ja".

You are the AI Mentor of Nexora, a Learning Management System for Gat Andres Bonifacio High School (Grades 7–10, Philippines DepEd curriculum).

PERSONALITY:
- You have a perceptive, detective-like demeanor. You notice patterns, pick up on clues in what students say, and investigate their learning gaps like a case to be cracked.
- Use investigative language naturally: "I notice...", "That's an interesting clue...", "Let's piece this together...", "I've been observing your progress and...", "The evidence suggests..."
- You are a hype coach at heart — you genuinely celebrate student effort and achievements. You get excited about breakthroughs. But you maintain formality and professionalism.
- Be warm, supportive, and encouraging, but never condescending. Speak at a high school level.
- When a student is struggling, be empathetic and frame challenges as mysteries to solve together.

RULES:
1. ALWAYS end your response with a study tip or learning strategy under the heading "📌 Ja's Study Tip:". The tip should be practical and relevant to the conversation topic.
2. NEVER give direct answers to test or assessment questions. Instead, guide students with hints, analogies, and step-by-step reasoning.
3. When a student shares progress or success, celebrate it enthusiastically but professionally — like a detective who just cracked a big case.
4. Keep responses concise — aim for 2-4 paragraphs max, plus the study tip.
5. If the student greets you or asks who you are, introduce yourself briefly: "I'm Ja — your AI Mentor here at Nexora! Think of me as your personal learning detective. I'm here to help you crack the case on any topic you're studying."
6. If you don't know something or the question is outside academics, say so honestly and redirect to academic topics.
7. Use Filipino cultural context when appropriate (e.g., referencing DepEd subjects, local examples) but respond in English unless the student writes in Filipino."""


# ---------------------------------------------------------------------------
# Dependency: Extract user context from proxy headers
# ---------------------------------------------------------------------------


def get_current_user(
    x_user_id: str = Header(...),
    x_user_email: str = Header(...),
    x_user_roles: str = Header(...),
    x_internal_service_token: str | None = Header(None),
) -> RequestUser:
    if settings.ai_service_shared_secret:
        if x_internal_service_token != settings.ai_service_shared_secret:
            raise HTTPException(401, "Invalid internal service token")
    return RequestUser(
        id=x_user_id,
        email=x_user_email,
        roles=x_user_roles.split(","),
    )


def require_internal_service(
    x_internal_service_token: str | None = Header(None),
) -> None:
    if not settings.ai_service_shared_secret:
        return
    if x_internal_service_token != settings.ai_service_shared_secret:
        raise HTTPException(401, "Invalid internal service token")


async def get_readiness_state(db: AsyncSession) -> dict[str, Any]:
    database_status = {"ok": True}
    try:
        await db.execute(sa_text("SELECT 1"))
    except Exception as err:
        database_status = {"ok": False, "message": str(err)}

    ollama_status = await ollama_client.is_available()
    ai_degraded_allowed = settings.ai_degraded_allowed
    ready = database_status["ok"] and (
        ollama_status["available"] or ai_degraded_allowed
    )

    return {
        "ready": ready,
        "degradedMode": bool(ai_degraded_allowed and not ollama_status["available"]),
        "dependencies": {
            "database": database_status,
            "ollama": {
                "ok": ollama_status["available"],
                "models": ollama_status["models"],
            },
        },
        "configuredEmbeddingModel": ollama_client.get_embedding_model_name(),
        "frameworks": {
            "llamaIndexAvailable": llamaindex_available(),
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# POST /chat
# ---------------------------------------------------------------------------


@app.post("/chat")
async def chat(
    body: ChatRequest,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    chat_session_id = body.session_id or str(uuid.uuid4())
    attachments = normalize_attachment_images(
        [item.model_dump(by_alias=True) for item in (body.attachments or [])]
    )

    ollama_messages: list[dict[str, str]] = [
        {"role": "system", "content": JAKIPIR_SYSTEM_PROMPT},
    ]

    # Load conversation history if session exists
    if body.session_id:
        rows = await db.execute(
            sa_text(
                "SELECT input_text, output_text FROM ai_interaction_logs "
                "WHERE user_id = :uid AND session_id = :sid "
                "AND session_type = 'mentor_chat' "
                "ORDER BY created_at DESC LIMIT 20"
            ),
            {"uid": user.id, "sid": body.session_id},
        )
        history = list(rows.mappings())
        history.reverse()
        for entry in history:
            ollama_messages.append({"role": "user", "content": entry["input_text"]})
            ollama_messages.append({"role": "assistant", "content": entry["output_text"]})

    user_message: dict[str, object] = {"role": "user", "content": body.message}
    if attachments:
        user_message["images"] = [item["base64Data"] for item in attachments]
    ollama_messages.append(user_message)

    health = await ollama_client.is_available()
    import time

    start = time.time()

    if health["available"]:
        try:
            reply = await ollama_client.chat(ollama_messages, task="chat")
            model_used = ollama_client.get_task_model_name(
                "chat",
                images=attachments,
            )
        except Exception as err:
            logger.warning("Ollama chat failed: %s", str(err))
            reply = (
                "Hmm, it seems my investigation tools are temporarily offline "
                "— like a detective without a magnifying glass! 🔍 Please try again "
                "in a moment. In the meantime, review your notes — that's always a solid lead!\n\n"
                "📌 Ja's Study Tip: While waiting, try writing down one thing you learned "
                "today. It helps lock it into memory!"
            )
            model_used = "fallback (ollama-unavailable)"
    else:
        logger.info("Ollama unavailable for chat — returning fallback")
        reply = (
            "I'm currently recharging my detective instincts — Ollama (my brain!) "
            "isn't running right now. Ask your teacher to start it up, and I'll be "
            "right back on the case! 🕵️\n\n"
            "📌 Ja's Study Tip: Use this downtime to quiz yourself on what you studied "
            "last. Self-testing is one of the most powerful study techniques!"
        )
        model_used = "fallback (ollama-offline)"

    response_time_ms = int((time.time() - start) * 1000)

    # Log interaction
    await db.execute(
        sa_text(
            "INSERT INTO ai_interaction_logs "
            "(user_id, session_type, input_text, output_text, model_used, "
            "response_time_ms, session_id, context_metadata) "
            "VALUES (:userId, 'mentor_chat', :inputText, :outputText, "
            ":modelUsed, :responseTimeMs, :sessionId, :ctx)"
        ).bindparams(bindparam("ctx", type_=postgresql.JSONB)),
        {
            "userId": user.id,
            "inputText": body.message[:2000],
            "outputText": reply[:5000],
            "modelUsed": model_used,
            "responseTimeMs": response_time_ms,
            "sessionId": chat_session_id,
            "ctx": {
                "sessionId": chat_session_id,
                "attachmentCount": len(attachments),
            },
        },
    )
    await db.commit()

    return {
        "success": True,
        "message": "Ja responded",
        "data": {
            "reply": reply,
            "sessionId": chat_session_id,
            "modelUsed": model_used,
        },
    }


# ---------------------------------------------------------------------------
# POST /mentor/explain
# ---------------------------------------------------------------------------


@app.post("/mentor/explain")
async def mentor_explain(
    body: MentorExplainRequest,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await explain_mistake(
        db,
        user,
        attempt_id=body.attempt_id,
        question_id=body.question_id,
        message=body.message,
        attachments=[item.model_dump(by_alias=True) for item in (body.attachments or [])],
    )
    return {
        "success": True,
        "message": "Grounded explanation generated",
        "data": data,
    }


# ---------------------------------------------------------------------------
# JA Practice
# ---------------------------------------------------------------------------


@app.get("/student/ja/practice/bootstrap")
async def ja_practice_bootstrap(
    class_id: str | None = Query(None, alias="classId"),
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await bootstrap_ja_practice(db, user, class_id=class_id)
    return {
        "success": True,
        "message": "JA practice bootstrap loaded",
        "data": data,
    }


@app.post("/student/ja/practice/sessions/generate")
async def ja_practice_generate(
    body: JaPracticeGenerateRequest,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await generate_ja_practice_session_packet(
        db,
        user=user,
        class_id=body.class_id,
        question_count=max(1, min(20, body.question_count)),
        recommendation=body.recommendation,
        allowed_lesson_ids=body.allowed_lesson_ids,
        allowed_assessment_ids=body.allowed_assessment_ids,
    )
    return {
        "success": True,
        "message": "JA practice session packet generated",
        "data": data,
    }


@app.get("/student/ja/ask/bootstrap")
async def ja_ask_bootstrap(
    class_id: str | None = Query(None, alias="classId"),
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await bootstrap_ja_ask(db, user, class_id=class_id)
    return {
        "success": True,
        "message": "JA Ask bootstrap loaded",
        "data": data,
    }


@app.post("/student/ja/ask/respond")
async def ja_ask_respond(
    body: JaAskResponseRequest,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await generate_ja_ask_response(
        db,
        user=user,
        class_id=body.class_id,
        thread_id=body.thread_id,
        message=body.message,
        quick_action=body.quick_action,
        history=[
            {"role": entry.role, "content": entry.content}
            for entry in (body.history or [])
        ],
        allowed_lesson_ids=body.allowed_lesson_ids,
        allowed_assessment_ids=body.allowed_assessment_ids,
    )
    return {
        "success": True,
        "message": "JA Ask response generated",
        "data": data,
    }


@app.get("/student/ja/review/bootstrap")
async def ja_review_bootstrap(
    class_id: str | None = Query(None, alias="classId"),
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await bootstrap_ja_review(db, user, class_id=class_id)
    return {
        "success": True,
        "message": "JA Review bootstrap loaded",
        "data": data,
    }


@app.post("/student/ja/review/sessions/generate")
async def ja_review_generate(
    body: JaReviewGenerateRequest,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await generate_ja_review_session_packet(
        db,
        user=user,
        class_id=body.class_id,
        attempt_id=body.attempt_id,
        question_count=max(5, min(20, body.question_count)),
        allowed_lesson_ids=body.allowed_lesson_ids,
        allowed_assessment_ids=body.allowed_assessment_ids,
    )
    return {
        "success": True,
        "message": "JA Review session packet generated",
        "data": data,
    }


# ---------------------------------------------------------------------------
# Student Tutor (legacy compatibility)
# ---------------------------------------------------------------------------


@app.get("/student/tutor/bootstrap")
async def student_tutor_bootstrap(
    class_id: str | None = Query(None, alias="classId"),
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await bootstrap_student_tutor(db, user, class_id=class_id)
    return {
        "success": True,
        "message": "Student tutor bootstrap loaded",
        "data": data,
    }


@app.post("/student/tutor/session")
async def student_tutor_start(
    body: StudentTutorStartRequest,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await start_student_tutor_session(
        db,
        user,
        class_id=body.class_id,
        recommendation=body.recommendation,
    )
    return {
        "success": True,
        "message": "Tutor session started",
        "data": data,
    }


@app.get("/student/tutor/session/{session_id}")
async def student_tutor_get_session(
    session_id: str,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await get_student_tutor_session(db, user, session_id=session_id)
    return {
        "success": True,
        "message": "Tutor session loaded",
        "data": data,
    }


@app.post("/student/tutor/session/{session_id}/message")
async def student_tutor_message(
    session_id: str,
    body: StudentTutorMessageRequest,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.session_id != session_id:
        raise HTTPException(400, "Session ID mismatch")
    data = await continue_student_tutor_session(
        db,
        user,
        session_id=session_id,
        message=body.message,
        attachments=[item.model_dump(by_alias=True) for item in (body.attachments or [])],
    )
    return {
        "success": True,
        "message": "Tutor follow-up generated",
        "data": data,
    }


@app.post("/student/tutor/session/{session_id}/answers")
async def student_tutor_answers(
    session_id: str,
    body: StudentTutorAnswerRequest,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.session_id != session_id:
        raise HTTPException(400, "Session ID mismatch")
    data = await submit_student_tutor_answers(
        db,
        user,
        session_id=session_id,
        answers=body.answers,
        attachments=[item.model_dump(by_alias=True) for item in (body.attachments or [])],
    )
    return {
        "success": True,
        "message": "Tutor answers evaluated",
        "data": data,
    }


# ---------------------------------------------------------------------------
# GET /health
# ---------------------------------------------------------------------------


@app.get("/health")
async def health():
    status = await ollama_client.is_available()
    available_models = status["models"]
    return {
        "success": True,
        "message": "AI health status",
        "data": {
            "ollamaAvailable": status["available"],
            "configuredModel": ollama_client.get_text_model_name(),
            "configuredTextModel": ollama_client.get_text_model_name(),
            "configuredVisionModel": ollama_client.get_vision_model_name(),
            "configuredEmbeddingModel": ollama_client.get_embedding_model_name(),
            "embeddingModelAvailable": ollama_client.is_model_available(
                ollama_client.get_embedding_model_name(),
                available_models,
            ),
            "availableModels": available_models,
        },
    }


@app.get("/live")
async def live():
    return {
        "success": True,
        "message": "AI service process is up",
        "data": {
            "status": "ok",
        },
    }


@app.get("/ready")
async def ready(db: AsyncSession = Depends(get_db)):
    state = await get_readiness_state(db)
    if not state["ready"]:
        raise HTTPException(503, "AI service dependencies are not ready")
    return {
        "success": True,
        "message": "AI service is ready",
        "data": state,
    }


# ---------------------------------------------------------------------------
# Internal diagnostics
# ---------------------------------------------------------------------------


@app.get("/internal/retrieval/preview")
async def internal_retrieval_preview(
    class_id: str = Query(..., alias="classId"),
    query_text: str = Query(..., alias="query"),
    policy: str = Query("general"),
    top_k: int = Query(8, alias="topK"),
    db: AsyncSession = Depends(get_db),
    _auth: None = Depends(require_internal_service),
):
    data = await preview_retrieval(
        db,
        query_text=query_text,
        class_id=class_id,
        top_k=top_k,
        policy_name=policy,
    )
    if data["results"]:
        first = data["results"][0]
        data["llamaIndexNodePreview"] = build_text_node(
            text=first["chunkText"],
            node_id=first["documentId"],
            metadata=first.get("metadataJson") or {},
        )
    return {
        "success": True,
        "message": "Retrieval preview generated",
        "data": data,
    }


@app.get("/internal/extractions/{extraction_id}/audit")
async def internal_extraction_audit(
    extraction_id: str,
    db: AsyncSession = Depends(get_db),
    _auth: None = Depends(require_internal_service),
):
    row = await db.execute(
        sa_text(
            """
            SELECT id, class_id, extraction_status, structured_content, error_message, updated_at
            FROM extracted_modules
            WHERE id = :id
            """
        ),
        {"id": extraction_id},
    )
    extraction = row.mappings().first()
    if not extraction:
        raise HTTPException(404, "Extraction not found")

    structured_content = extraction["structured_content"] or {}
    if isinstance(structured_content, str):
        structured_content = json.loads(structured_content)
    audit = structured_content.get("audit") or {}

    return {
        "success": True,
        "message": "Extraction audit loaded",
        "data": {
            "extractionId": str(extraction["id"]),
            "classId": str(extraction["class_id"]),
            "status": extraction["extraction_status"],
            "errorMessage": extraction["error_message"],
            "updatedAt": extraction["updated_at"].isoformat() if extraction["updated_at"] else None,
            "audit": audit,
            "lessonCount": len(structured_content.get("lessons") or []),
        },
    }


# ---------------------------------------------------------------------------
# POST /index/classes/:id
# ---------------------------------------------------------------------------


@app.post("/index/classes/{class_id}")
async def index_class(
    class_id: str,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    class_row = await db.execute(
        sa_text("SELECT id, teacher_id FROM classes WHERE id = :classId"),
        {"classId": class_id},
    )
    class_info = class_row.mappings().first()
    if not class_info:
        raise HTTPException(404, "Class not found")

    is_admin = "admin" in [role.lower() for role in user.roles]
    if not is_admin and str(class_info["teacher_id"]) != user.id:
        raise HTTPException(403, "You can only reindex your own classes")

    data = await reindex_class_content(db, class_id)
    return {
        "success": True,
        "message": "Class content indexed",
        "data": data,
    }


@app.post("/internal/index/classes/{class_id}")
async def internal_index_class(
    class_id: str,
    payload: dict[str, Any] | None = Body(default=None),
    _authorized: None = Depends(require_internal_service),
    db: AsyncSession = Depends(get_db),
):
    data = await reindex_class_content(db, class_id)
    return {
        "success": True,
        "message": "Class content indexed via internal service",
        "data": {
            **data,
            "requestedBy": payload or {},
        },
    }


@app.post("/internal/index/backfill")
async def internal_backfill_index(
    payload: dict[str, Any] | None = Body(default=None),
    _authorized: None = Depends(require_internal_service),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        sa_text(
            """
            SELECT id
            FROM classes
            WHERE is_active = true
            ORDER BY created_at ASC
            """
        )
    )
    class_ids = [str(row["id"]) for row in rows.mappings()]
    results = []
    for class_id in class_ids:
        results.append(await reindex_class_content(db, class_id))

    return {
        "success": True,
        "message": "Backfill indexing completed",
        "data": {
            "requestedBy": payload or {},
            "classesProcessed": len(results),
            "results": results,
        },
    }


# ---------------------------------------------------------------------------
# POST /extract
# ---------------------------------------------------------------------------


@app.post("/extract", status_code=202)
async def extract_module(
    body: ExtractRequest,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Validate file exists
    row = await db.execute(
        sa_text(
            "SELECT id, file_path, class_id, teacher_id, original_name "
            "FROM uploaded_files WHERE id = :id AND deleted_at IS NULL"
        ),
        {"id": body.file_id},
    )
    file = row.mappings().first()
    if not file:
        raise HTTPException(404, f'File "{body.file_id}" not found or deleted')

    is_admin = "admin" in user.roles
    if not is_admin and str(file["teacher_id"]) != user.id:
        raise HTTPException(403, "You can only extract your own files")

    file_path = resolve_uploaded_file_path(str(file["file_path"]))
    if not os.path.exists(file_path):
        raise HTTPException(404, "Physical file not found on server")

    # Create extraction record
    result = await db.execute(
        sa_text(
            "INSERT INTO extracted_modules "
            "(file_id, class_id, teacher_id, raw_text, extraction_status, progress_percent) "
            "VALUES (:fileId, :classId, :teacherId, '', 'pending', 0) "
            "RETURNING id"
        ),
        {"fileId": file["id"], "classId": file["class_id"], "teacherId": user.id},
    )
    await db.commit()
    extraction_id = result.scalar_one()

    # Run extraction in background on the active event loop.
    async def _run():
        from .database import AsyncSessionLocal

        async with AsyncSessionLocal() as bg_db:
            logger.info("[extract] Starting background extraction task %s for file %s", extraction_id, body.file_id)
            await run_extraction(bg_db, extraction_id, body.file_id, user.id)

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_run())
        logger.info("[extract] Queued extraction %s on running event loop", extraction_id)
    except RuntimeError as exc:
        logger.exception("[extract] Failed to schedule extraction %s: %s", extraction_id, exc)
        raise HTTPException(500, "Failed to schedule extraction task") from exc

    return {
        "success": True,
        "message": "Extraction queued — poll GET /extractions/:id/status for progress",
        "data": {
            "extractionId": extraction_id,
            "status": "pending",
        },
    }


# ---------------------------------------------------------------------------
# GET /extractions/:id/status
# ---------------------------------------------------------------------------


@app.get("/extractions/{extraction_id}/status")
async def get_extraction_status(
    extraction_id: str,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await db.execute(
        sa_text(
            "SELECT id, extraction_status, progress_percent, total_chunks, "
            "processed_chunks, error_message, model_used, is_applied, "
            "updated_at, teacher_id, structured_content "
            "FROM extracted_modules WHERE id = :id"
        ),
        {"id": extraction_id},
    )
    extraction = row.mappings().first()
    if not extraction:
        raise HTTPException(404, f'Extraction "{extraction_id}" not found')

    is_admin = "admin" in user.roles
    if not is_admin and str(extraction["teacher_id"]) != user.id:
        raise HTTPException(403, "You can only view your own extractions")
    structured_content = extraction.get("structured_content") or {}
    if isinstance(structured_content, str):
        try:
            structured_content = json.loads(structured_content)
        except json.JSONDecodeError:
            structured_content = {}
    audit = structured_content.get("audit") or {}

    return {
        "success": True,
        "message": f"Extraction is {extraction['extraction_status']}",
        "data": {
            "id": extraction["id"],
            "status": extraction["extraction_status"],
            "progressPercent": extraction["progress_percent"],
            "totalChunks": extraction["total_chunks"],
            "processedChunks": extraction["processed_chunks"],
            "errorMessage": extraction["error_message"],
            "modelUsed": extraction["model_used"],
            "isApplied": extraction["is_applied"],
            "updatedAt": str(extraction["updated_at"]) if extraction["updated_at"] else None,
            "qualityGate": audit.get("qualityGate"),
            "reviewRequired": bool(audit.get("reviewRequired")),
            "confidenceBreakdown": audit.get("confidenceBreakdown") or {},
            "repairNotes": audit.get("repairNotes") or [],
        },
    }


# ---------------------------------------------------------------------------
# GET /extractions
# ---------------------------------------------------------------------------


@app.get("/extractions")
async def list_extractions(
    class_id: str = Query(..., alias="classId"),
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    is_admin = "admin" in user.roles
    if is_admin:
        query = (
            "SELECT e.id, e.class_id, e.teacher_id, e.extraction_status, "
            "e.progress_percent, e.total_chunks, e.processed_chunks, "
            "e.error_message, e.model_used, e.is_applied, e.created_at, "
            "e.updated_at, e.structured_content, f.id AS file_id, f.original_name, f.mime_type, "
            "f.size_bytes "
            "FROM extracted_modules e "
            "LEFT JOIN uploaded_files f ON e.file_id = f.id "
            "WHERE e.class_id = :classId "
            "ORDER BY e.created_at DESC"
        )
        params = {"classId": class_id}
    else:
        query = (
            "SELECT e.id, e.class_id, e.teacher_id, e.extraction_status, "
            "e.progress_percent, e.total_chunks, e.processed_chunks, "
            "e.error_message, e.model_used, e.is_applied, e.created_at, "
            "e.updated_at, e.structured_content, f.id AS file_id, f.original_name, f.mime_type, "
            "f.size_bytes "
            "FROM extracted_modules e "
            "LEFT JOIN uploaded_files f ON e.file_id = f.id "
            "WHERE e.class_id = :classId AND e.teacher_id = :teacherId "
            "ORDER BY e.created_at DESC"
        )
        params = {"classId": class_id, "teacherId": user.id}

    rows = await db.execute(sa_text(query), params)
    data = []
    for row in rows.mappings():
        item = dict(row)
        structured_content = item.get("structured_content") or {}
        if isinstance(structured_content, str):
            try:
                structured_content = json.loads(structured_content)
            except json.JSONDecodeError:
                structured_content = {}
        audit = structured_content.get("audit") or {}
        item["qualityGate"] = audit.get("qualityGate")
        item["reviewRequired"] = bool(audit.get("reviewRequired"))
        item["confidenceBreakdown"] = audit.get("confidenceBreakdown") or {}
        item["repairNotes"] = audit.get("repairNotes") or []
        data.append(item)

    return {
        "success": True,
        "message": f"Found {len(data)} extraction(s)",
        "data": data,
    }


# ---------------------------------------------------------------------------
# GET /extractions/:id
# ---------------------------------------------------------------------------


@app.get("/extractions/{extraction_id}")
async def get_extraction(
    extraction_id: str,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await db.execute(
        sa_text(
            "SELECT e.*, f.id AS file_id, f.original_name "
            "FROM extracted_modules e "
            "LEFT JOIN uploaded_files f ON e.file_id = f.id "
            "WHERE e.id = :id"
        ),
        {"id": extraction_id},
    )
    extraction = row.mappings().first()
    if not extraction:
        raise HTTPException(404, f'Extraction "{extraction_id}" not found')

    is_admin = "admin" in user.roles
    if not is_admin and str(extraction["teacher_id"]) != user.id:
        raise HTTPException(403, "You can only view your own extractions")
    extraction_data = dict(extraction)
    structured_content = extraction_data.get("structured_content") or {}
    if isinstance(structured_content, str):
        try:
            structured_content = json.loads(structured_content)
        except json.JSONDecodeError:
            structured_content = {}
    audit = structured_content.get("audit") or {}
    extraction_data["qualityGate"] = audit.get("qualityGate")
    extraction_data["reviewRequired"] = bool(audit.get("reviewRequired"))
    extraction_data["confidenceBreakdown"] = audit.get("confidenceBreakdown") or {}
    extraction_data["repairNotes"] = audit.get("repairNotes") or []

    return {
        "success": True,
        "message": "Extraction details",
        "data": extraction_data,
    }


# ---------------------------------------------------------------------------
# PATCH /extractions/:id
# ---------------------------------------------------------------------------


@app.patch("/extractions/{extraction_id}")
async def update_extraction(
    extraction_id: str,
    body: UpdateExtractionRequest,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await db.execute(
        sa_text(
            "SELECT id, extraction_status, is_applied, teacher_id "
            "FROM extracted_modules WHERE id = :id"
        ),
        {"id": extraction_id},
    )
    extraction = row.mappings().first()
    if not extraction:
        raise HTTPException(404, f'Extraction "{extraction_id}" not found')

    is_admin = "admin" in user.roles
    if not is_admin and str(extraction["teacher_id"]) != user.id:
        raise HTTPException(403, "You can only view your own extractions")

    if extraction["extraction_status"] != "completed":
        raise HTTPException(
            400,
            f'Extraction is "{extraction["extraction_status"]}" — only completed extractions can be edited',
        )
    if extraction["is_applied"]:
        raise HTTPException(400, "This extraction has already been applied and cannot be edited")

    structured_content = {
        "title": body.title or "",
        "description": body.description or "",
        "lessons": [
            {
                "title": l.title,
                "description": l.description or "",
                "blocks": [
                    {
                        "type": b.type,
                        "order": b.order,
                        "content": b.content,
                        "metadata": b.metadata or {},
                    }
                    for b in l.blocks
                ],
            }
            for l in body.lessons
        ],
    }

    await db.execute(
        sa_text(
            "UPDATE extracted_modules "
            "SET structured_content = :sc::jsonb, updated_at = NOW() "
            "WHERE id = :id"
        ),
        {"sc": json.dumps(structured_content), "id": extraction_id},
    )
    await db.commit()

    # Re-fetch
    return await get_extraction(extraction_id, user, db)


# ---------------------------------------------------------------------------
# POST /extractions/:id/apply
# ---------------------------------------------------------------------------


@app.post("/extractions/{extraction_id}/apply", status_code=201)
async def apply_extraction(
    extraction_id: str,
    body: ApplyExtractionRequest,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await db.execute(
        sa_text(
            "SELECT id, extraction_status, is_applied, teacher_id, "
            "class_id, structured_content "
            "FROM extracted_modules WHERE id = :id"
        ),
        {"id": extraction_id},
    )
    extraction = row.mappings().first()
    if not extraction:
        raise HTTPException(404, f'Extraction "{extraction_id}" not found')

    is_admin = "admin" in user.roles
    if not is_admin and str(extraction["teacher_id"]) != user.id:
        raise HTTPException(403, "You can only view your own extractions")

    if extraction["extraction_status"] != "completed":
        raise HTTPException(400, f'Extraction is "{extraction["extraction_status"]}" — only completed extractions can be applied')
    if extraction["is_applied"]:
        raise HTTPException(400, "This extraction has already been applied")

    content = extraction["structured_content"]
    if isinstance(content, str):
        content = json.loads(content)
    if not content or not content.get("lessons"):
        raise HTTPException(400, "No lessons found in extraction result")

    all_lessons = content["lessons"]

    if body.lesson_indices:
        invalid = [i for i in body.lesson_indices if i < 0 or i >= len(all_lessons)]
        if invalid:
            raise HTTPException(
                400,
                f"Invalid lesson indices: {invalid}. Valid range: 0–{len(all_lessons) - 1}",
            )
        lessons_to_apply = [(all_lessons[i], i) for i in body.lesson_indices]
    else:
        lessons_to_apply = [(l, i) for i, l in enumerate(all_lessons)]

    class_id = extraction["class_id"]

    # Check class exists
    cls_row = await db.execute(
        sa_text("SELECT id FROM classes WHERE id = :id"),
        {"id": class_id},
    )
    if not cls_row.first():
        raise HTTPException(404, f'Class "{class_id}" not found')

    # Get last lesson order
    order_row = await db.execute(
        sa_text(
            'SELECT "order" FROM lessons WHERE class_id = :cid ORDER BY "order" DESC LIMIT 1'
        ),
        {"cid": class_id},
    )
    last_order_val = order_row.scalar()
    lesson_order = (last_order_val or 0) + 1

    created_lessons: list[dict] = []

    for lesson_data, _ in lessons_to_apply:
        result = await db.execute(
            sa_text(
                'INSERT INTO lessons (title, description, class_id, "order", is_draft, source_extraction_id) '
                "VALUES (:title, :desc, :classId, :order, true, :extractionId) "
                "RETURNING id, title"
            ),
            {
                "title": lesson_data.get("title", f"Lesson {lesson_order}"),
                "desc": lesson_data.get("description", ""),
                "classId": class_id,
                "order": lesson_order,
                "extractionId": extraction_id,
            },
        )
        new_lesson = result.mappings().first()
        lesson_order += 1

        blocks = lesson_data.get("blocks", [])
        for idx, block in enumerate(blocks):
            valid_types = {"text", "image", "video", "question", "file", "divider"}
            block_type = block.get("type", "text")
            if block_type not in valid_types:
                block_type = "text"

            await db.execute(
                sa_text(
                    'INSERT INTO lesson_content_blocks (lesson_id, type, "order", content, metadata) '
                    "VALUES (:lessonId, :type, :order, :content, :metadata)"
                ).bindparams(
                    bindparam("content", type_=postgresql.JSONB),
                    bindparam("metadata", type_=postgresql.JSONB),
                ),
                {
                    "lessonId": new_lesson["id"],
                    "type": block_type,
                    "order": block.get("order", idx),
                    "content": block.get("content", {}),
                    "metadata": block.get("metadata", {}),
                },
            )

        created_lessons.append({"id": new_lesson["id"], "title": new_lesson["title"]})

    # Mark extraction as applied
    await db.execute(
        sa_text(
            "UPDATE extracted_modules "
            "SET is_applied = true, extraction_status = 'applied', updated_at = NOW() "
            "WHERE id = :id"
        ),
        {"id": extraction_id},
    )
    await db.commit()
    index_result = await reindex_class_content(db, str(class_id))

    return {
        "success": True,
        "message": f"Created {len(created_lessons)} lesson(s) from extraction",
        "data": {
            "classId": class_id,
            "extractionId": extraction_id,
            "lessonsCreated": len(created_lessons),
            "totalLessonsAvailable": len(all_lessons),
            "lessons": created_lessons,
            "indexing": index_result,
        },
    }


# ---------------------------------------------------------------------------
# DELETE /extractions/:id
# ---------------------------------------------------------------------------


@app.delete("/extractions/{extraction_id}")
async def delete_extraction(
    extraction_id: str,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await db.execute(
        sa_text(
            "SELECT id, is_applied, teacher_id FROM extracted_modules WHERE id = :id"
        ),
        {"id": extraction_id},
    )
    extraction = row.mappings().first()
    if not extraction:
        raise HTTPException(404, f'Extraction "{extraction_id}" not found')

    is_admin = "admin" in user.roles
    if not is_admin and str(extraction["teacher_id"]) != user.id:
        raise HTTPException(403, "You can only delete your own extractions")

    if extraction["is_applied"]:
        raise HTTPException(400, "Cannot delete an extraction that has already been applied")

    await db.execute(
        sa_text("DELETE FROM extracted_modules WHERE id = :id"),
        {"id": extraction_id},
    )
    await db.commit()

    return {
        "success": True,
        "message": "Extraction deleted",
        "data": {"deleted": True, "id": extraction_id},
    }


# ---------------------------------------------------------------------------
# GET /history
# ---------------------------------------------------------------------------


@app.get("/history")
async def interaction_history(
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        sa_text(
            "SELECT * FROM ai_interaction_logs "
            "WHERE user_id = :uid ORDER BY created_at DESC LIMIT 20"
        ),
        {"uid": user.id},
    )
    data = [dict(r) for r in rows.mappings()]

    return {
        "success": True,
        "message": f"Found {len(data)} interaction(s)",
        "data": data,
    }


# ---------------------------------------------------------------------------
# POST /teacher/interventions/:id/jobs
# ---------------------------------------------------------------------------


@app.post("/teacher/interventions/{case_id}/jobs", status_code=202)
async def queue_intervention_recommendation_job(
    case_id: str,
    body: InterventionRecommendationRequest,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    case_row = await db.execute(
        sa_text(
            """
            SELECT ic.class_id, c.teacher_id, ic.status
            FROM intervention_cases ic
            INNER JOIN classes c ON c.id = ic.class_id
            WHERE ic.id = :caseId
            """
        ),
        {"caseId": case_id},
    )
    case_info = case_row.mappings().first()
    if not case_info:
        raise HTTPException(404, "Intervention case not found")

    is_admin = "admin" in [role.lower() for role in user.roles]
    if not is_admin and str(case_info["teacher_id"]) != user.id:
        raise HTTPException(403, "You do not have access to this intervention case")
    if case_info["status"] != "active":
        raise HTTPException(400, "Only active intervention cases can be recommended")

    job_id = await _create_ai_generation_job(
        db,
        job_type="remedial_plan_generation",
        class_id=str(case_info["class_id"]),
        teacher_id=user.id,
        source_filters={"caseId": case_id, "note": body.note},
    )

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(
            _run_intervention_generation_job(job_id, case_id, body.note, user)
        )
    except RuntimeError as exc:
        logger.exception("[ai-job] Failed to schedule intervention job %s: %s", job_id, exc)
        raise HTTPException(500, "Failed to schedule intervention generation job") from exc

    return {
        "success": True,
        "message": "Intervention recommendation job queued",
        "data": {
            "jobId": job_id,
            "jobType": "remedial_plan_generation",
            "status": "pending",
            "progressPercent": 5,
            "statusMessage": "Queued",
        },
    }


# ---------------------------------------------------------------------------
# POST /teacher/quizzes/jobs
# ---------------------------------------------------------------------------


@app.post("/teacher/quizzes/jobs", status_code=202)
async def queue_teacher_quiz_draft_job(
    body: GenerateQuizDraftRequest,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    class_row = await db.execute(
        sa_text(
            """
            SELECT c.id, c.teacher_id
            FROM classes c
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

    job_id = await _create_ai_generation_job(
        db,
        job_type="quiz_generation",
        class_id=body.class_id,
        teacher_id=user.id,
        source_filters={
            "lessonIds": body.lesson_ids,
            "extractionIds": body.extraction_ids,
            "questionCount": body.question_count,
            "questionType": body.question_type,
            "assessmentType": body.assessment_type,
            "title": body.title,
        },
    )

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_run_quiz_generation_job(job_id, body, user))
    except RuntimeError as exc:
        logger.exception("[ai-job] Failed to schedule quiz job %s: %s", job_id, exc)
        raise HTTPException(500, "Failed to schedule quiz generation job") from exc

    return {
        "success": True,
        "message": "Quiz draft generation job queued",
        "data": {
            "jobId": job_id,
            "jobType": "quiz_generation",
            "status": "pending",
            "progressPercent": 5,
            "statusMessage": "Queued",
        },
    }


# ---------------------------------------------------------------------------
# GET /teacher/jobs/:id
# ---------------------------------------------------------------------------


@app.get("/teacher/jobs/{job_id}")
async def get_teacher_ai_job_status(
    job_id: str,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job, runtime, assessment_id = await _load_ai_job_context(db, job_id, user)
    return {
        "success": True,
        "message": f'AI job is {job["status"]}',
        "data": {
            "jobId": str(job["id"]),
            "jobType": job["job_type"],
            "status": job["status"],
            "progressPercent": _runtime_progress_for_status(job["status"], runtime),
            "statusMessage": runtime.get("statusMessage") if runtime else None,
            "errorMessage": job["error_message"] or (runtime.get("errorMessage") if runtime else None),
            "retryState": runtime.get("retryState") if runtime else None,
            "outputId": str(job["output_id"]) if job["output_id"] else None,
            "assessmentId": assessment_id,
            "updatedAt": str(job["updated_at"]) if job["updated_at"] else None,
        },
    }


# ---------------------------------------------------------------------------
# GET /teacher/jobs/:id/result
# ---------------------------------------------------------------------------


@app.get("/teacher/jobs/{job_id}/result")
async def get_teacher_ai_job_result(
    job_id: str,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job, runtime, assessment_id = await _load_ai_job_context(db, job_id, user)
    if job["status"] not in {"completed", "approved"}:
        raise HTTPException(409, "AI generation result is not ready yet")
    if not job["output_id"]:
        raise HTTPException(404, "AI generation output not found")

    result_data = dict(job["structured_output"] or {})
    if job["output_type"] == "assessment_draft":
        result_data["assessmentId"] = assessment_id
    if runtime and runtime.get("resultSummary"):
        result_data["runtime"] = runtime["resultSummary"]

    return {
        "success": True,
        "message": "AI generation result retrieved",
        "data": {
            "job": {
                "jobId": str(job["id"]),
                "jobType": job["job_type"],
                "status": job["status"],
                "outputId": str(job["output_id"]),
                "assessmentId": assessment_id,
                "updatedAt": str(job["updated_at"]) if job["updated_at"] else None,
                "retryState": runtime.get("retryState") if runtime else None,
            },
            "result": {
                "outputId": str(job["output_id"]),
                "outputType": job["output_type"],
                "structuredOutput": result_data,
            },
        },
    }


# ---------------------------------------------------------------------------
# POST /teacher/interventions/:id/recommend
# ---------------------------------------------------------------------------


@app.post("/teacher/interventions/{case_id}/recommend")
async def recommend_intervention(
    case_id: str,
    body: InterventionRecommendationRequest,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await recommend_intervention_case(
        db,
        user,
        case_id=case_id,
        note=body.note,
    )
    return {
        "success": True,
        "message": "Intervention recommendation generated",
        "data": data,
    }


# ---------------------------------------------------------------------------
# POST /teacher/quizzes/generate-draft
# ---------------------------------------------------------------------------


@app.post("/teacher/quizzes/generate-draft")
async def teacher_generate_quiz_draft(
    body: GenerateQuizDraftRequest,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await generate_quiz_draft(db, user, body)
    index_result = await reindex_class_content(db, body.class_id)
    return {
        "success": True,
        "message": "AI draft assessment created",
        "data": {
            **data,
            "indexing": index_result,
        },
    }


def resolve_uploaded_file_path(raw_path: str) -> str:
    """Resolve backend-stored upload paths against ai-service UPLOAD_DIR robustly."""
    normalized = (raw_path or "").strip()
    upload_root = os.path.abspath(settings.upload_dir)

    candidates: list[str] = []
    if os.path.isabs(normalized):
        candidates.append(normalized)

    # Backend can store paths like "./uploads/pdfs/file.pdf" or "uploads/pdfs/file.pdf"
    normalized_slash = normalized.replace("\\", "/").lstrip("./")
    if normalized_slash.startswith("uploads/"):
        normalized_slash = normalized_slash[len("uploads/") :]

    candidates.extend(
        [
            os.path.abspath(normalized),
            os.path.join(upload_root, normalized_slash),
            os.path.join(upload_root, os.path.basename(normalized)),
        ]
    )

    seen: set[str] = set()
    deduped_candidates: list[str] = []
    for candidate in candidates:
        abs_candidate = os.path.abspath(candidate)
        if abs_candidate in seen:
            continue
        seen.add(abs_candidate)
        deduped_candidates.append(abs_candidate)

    for candidate in deduped_candidates:
        if os.path.exists(candidate):
            return candidate

    # Return the most likely candidate for error messaging.
    return deduped_candidates[0] if deduped_candidates else normalized

