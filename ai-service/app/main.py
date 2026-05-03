"""
Nexora AI Service â€“ FastAPI application.

All authentication is handled by the NestJS backend proxy.
User context is forwarded via X-User-Id, X-User-Email, X-User-Roles headers.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
import json
import logging
import math
import os
import uuid
import time
from typing import Any

from fastapi import Body, Depends, FastAPI, Header, HTTPException, Query
from fastapi.responses import Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest
from sqlalchemy import text as sa_text, bindparam
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import AsyncSession

from .backend_uploads import materialize_backend_upload
from .config import settings
from .database import AsyncSessionLocal, get_db
from . import ollama_client
from .extraction_pipeline import run_extraction
from .indexing_pipeline import get_class_index_status, reindex_class_content
from .library_indexing_pipeline import (
    backfill_library_files,
    delete_library_file_chunks,
    index_library_file,
)
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
    AdminChatRequest,
    ChatRequest,
    DemoInterventionPlanRequest,
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
AI_JOB_TASKS: dict[str, asyncio.Task[Any]] = {}
AI_JOB_STALE_TIMEOUT_SECONDS = 10 * 60
AI_JOB_STALE_FAILURE_MESSAGE = (
    "AI generation timed out before completion. Please retry this job."
)
QUIZ_JOB_MAX_ATTEMPTS = 2
ADMIN_ANALYTICS_SESSION_TYPE = "admin_analytics_chat"
AI_HTTP_REQUESTS = Counter(
    "nexora_ai_http_requests_total",
    "Total AI service HTTP requests",
    ["method", "path", "status"],
)
AI_HTTP_LATENCY = Histogram(
    "nexora_ai_http_request_duration_seconds",
    "AI service HTTP request duration",
    ["method", "path"],
)
AI_READY = Gauge(
    "nexora_ai_ready",
    "AI service readiness state",
)
OLLAMA_AVAILABLE = Gauge(
    "nexora_ai_ollama_available",
    "Whether Ollama is reachable",
)

DEMO_INTERVENTION_PLAN_SYSTEM_PROMPT = """You generate concise, practical demo intervention plans for a school LMS.

Rules:
- Output valid JSON only.
- Keep wording teacher-facing and actionable.
- Focus on weak concepts and remediation sequencing.
- Questions must be answerable from Grade 7 lesson scope and include one correct option index.
"""

DEMO_INTERVENTION_PLAN_FORMAT: dict[str, Any] = {
    "type": "object",
    "properties": {
        "weakConcepts": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 1,
            "maxItems": 6,
        },
        "recommendedModules": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 1,
            "maxItems": 3,
        },
        "teacherSummary": {"type": "string"},
        "lxpQuestions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "prompt": {"type": "string"},
                    "options": {
                        "type": "array",
                        "items": {"type": "string"},
                        "minItems": 4,
                        "maxItems": 4,
                    },
                    "correctIndex": {"type": "integer"},
                    "explanation": {"type": "string"},
                },
                "required": ["id", "prompt", "options", "correctIndex", "explanation"],
            },
            "minItems": 6,
            "maxItems": 6,
        },
    },
    "required": ["weakConcepts", "recommendedModules", "teacherSummary", "lxpQuestions"],
}

ADMIN_ANALYTICS_SYSTEM_PROMPT = """You are Nexora's admin analytics assistant.

Rules:
- Output valid JSON only.
- You are speaking to LMS administrators, not students.
- Use a concise operations and reporting tone.
- Answer only from the supplied analytics context and prior session turns.
- If the context does not support a claim, say that the data is unavailable.
- Never invent totals, names, time windows, or trends.
- Do not provide study tips, tutoring language, or student-facing advice.
- Charts are optional and must use only bar, line, pie, or donut.
- Sources must name the approved LMS source that supports the answer.
"""

ADMIN_ANALYTICS_RESPONSE_FORMAT: dict[str, Any] = {
    "type": "object",
    "properties": {
        "reply": {"type": "string"},
        "chart": {
            "anyOf": [
                {"type": "null"},
                {
                    "type": "object",
                    "properties": {
                        "type": {"type": "string", "enum": ["bar", "line", "pie", "donut"]},
                        "title": {"type": "string"},
                        "labels": {
                            "type": "array",
                            "items": {"type": "string"},
                            "minItems": 1,
                            "maxItems": 16,
                        },
                        "series": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {"type": "string"},
                                    "data": {
                                        "type": "array",
                                        "items": {"type": "number"},
                                        "minItems": 1,
                                        "maxItems": 16,
                                    },
                                },
                                "required": ["name", "data"],
                            },
                            "minItems": 1,
                            "maxItems": 4,
                        },
                        "yAxisLabel": {"type": ["string", "null"]},
                        "xAxisLabel": {"type": ["string", "null"]},
                    },
                    "required": ["type", "title", "labels", "series"],
                },
            ]
        },
        "sources": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "source": {"type": "string"},
                    "filters": {"type": "object"},
                    "window": {"type": ["string", "null"]},
                },
                "required": ["source", "filters"],
            },
            "maxItems": 8,
        },
    },
    "required": ["reply", "sources"],
}
APPROVED_ADMIN_SOURCE_IDS = {
    "student-performance-report",
    "assessment-summary-report",
    "intervention-participation-report",
    "system-usage-report",
    "audit-log",
    "admin-dashboard-overview",
    "admin-overview-analytics",
    "performance-admin-analytics",
    "system-evaluations",
}


@app.on_event("startup")
async def preload_ollama_models() -> None:
    AI_JOB_TASKS.clear()
    await _cleanup_stale_ai_jobs()
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


async def _update_ai_job_status(
    db: AsyncSession,
    *,
    job_id: str,
    status: str,
    error_message: str | None = None,
    output_status: str | None = None,
) -> None:
    await db.execute(
        sa_text(
            """
            UPDATE ai_generation_jobs
            SET
              status = :status,
              error_message = :errorMessage,
              updated_at = NOW()
            WHERE id = :jobId
            """
        ),
        {
            "jobId": job_id,
            "status": status,
            "errorMessage": error_message,
        },
    )
    if output_status:
        await db.execute(
            sa_text(
                """
                UPDATE ai_generation_outputs
                SET
                  status = :status,
                  updated_at = NOW()
                WHERE job_id = :jobId
                """
            ),
            {
                "jobId": job_id,
                "status": output_status,
            },
        )
    await db.commit()


async def _cleanup_stale_ai_jobs() -> None:
    # ai_generation_jobs.updated_at is stored as a naive timestamp in Postgres,
    # so the cutoff must be naive as well to avoid asyncpg timezone comparison errors.
    cutoff = (
        datetime.now(timezone.utc).replace(tzinfo=None)
        - timedelta(seconds=AI_JOB_STALE_TIMEOUT_SECONDS)
    )
    async with AsyncSessionLocal() as db:
        rows = await db.execute(
            sa_text(
                """
                SELECT id
                FROM ai_generation_jobs
                WHERE status IN ('pending', 'processing')
                  AND updated_at < :cutoff
                """
            ),
            {"cutoff": cutoff},
        )
        stale_ids = [str(row["id"]) for row in rows.mappings()]
        if not stale_ids:
            return
        await db.execute(
            sa_text(
                """
                UPDATE ai_generation_jobs
                SET
                  status = 'failed',
                  error_message = :errorMessage,
                  updated_at = NOW()
                WHERE id IN :jobIds
                """
            ).bindparams(bindparam("jobIds", expanding=True)),
            {
                "jobIds": stale_ids,
                "errorMessage": AI_JOB_STALE_FAILURE_MESSAGE,
            },
        )
        await db.commit()
        for job_id in stale_ids:
            await _persist_ai_job_runtime(
                db,
                job_id=job_id,
                runtime_patch={
                    "progressPercent": 100,
                    "statusMessage": "Generation timed out",
                    "errorMessage": AI_JOB_STALE_FAILURE_MESSAGE,
                    "staleTimeoutAt": datetime.now(timezone.utc).isoformat(),
                },
            )


def _request_path_label(request) -> str:
    route = request.scope.get("route")
    route_path = getattr(route, "path", None)
    return route_path or request.url.path


def _should_skip_metrics_observation(path: str) -> bool:
    return path in {
        "/metrics",
        "/ready",
        "/health",
        "/health/ready",
        "/health/live",
        "/openapi.json",
        "/docs",
        "/redoc",
        "/favicon.ico",
    } or path.startswith(("/metrics/", "/docs/", "/redoc/"))


@app.middleware("http")
async def metrics_middleware(request, call_next):
    start = time.perf_counter()
    path = _request_path_label(request)
    if _should_skip_metrics_observation(path):
        return await call_next(request)
    status_code = 500
    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    finally:
        duration = time.perf_counter() - start
        AI_HTTP_REQUESTS.labels(request.method, path, str(status_code)).inc()
        AI_HTTP_LATENCY.labels(request.method, path).observe(duration)


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
    if runtime:
        raw_percent = runtime.get("progressPercent")
        if isinstance(raw_percent, (int, float, str)):
            try:
                parsed_percent = float(raw_percent)
                if not math.isfinite(parsed_percent):
                    raise ValueError("progressPercent must be finite")
                percent = int(parsed_percent)
                return max(0, min(100, percent))
            except (TypeError, ValueError, OverflowError):
                pass
    return {
        "pending": 5,
        "processing": 60,
        "completed": 100,
        "approved": 100,
        "cancelled": 100,
        "rejected": 100,
        "failed": 100,
    }.get(status, 0)


def _parse_iso_utc(value: Any) -> datetime | None:
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
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _should_mark_job_stale(
    *,
    status: str,
    updated_at: Any,
    runtime: dict[str, Any] | None,
    stale_after_seconds: int = AI_JOB_STALE_TIMEOUT_SECONDS,
) -> bool:
    if status not in {"pending", "processing"}:
        return False

    now = datetime.now(timezone.utc)
    runtime_updated_at = _parse_iso_utc((runtime or {}).get("updatedAt"))
    db_updated_at = (
        updated_at.astimezone(timezone.utc)
        if isinstance(updated_at, datetime)
        else _parse_iso_utc(updated_at)
    )
    freshest = runtime_updated_at or db_updated_at
    if freshest is None:
        return False
    return now - freshest > timedelta(seconds=stale_after_seconds)


def _normalize_intervention_structured_output(
    payload: dict[str, Any],
) -> dict[str, Any]:
    normalized = dict(payload or {})
    suggested_payload = normalized.get("suggestedAssignmentPayload")
    if not isinstance(suggested_payload, dict):
        suggested_payload = {}
    lesson_ids = suggested_payload.get("lessonIds")
    assessment_ids = suggested_payload.get("assessmentIds")
    if not isinstance(lesson_ids, list):
        lesson_ids = []
    if not isinstance(assessment_ids, list):
        assessment_ids = []
    suggested_payload["lessonIds"] = [str(item) for item in lesson_ids if item]
    suggested_payload["assessmentIds"] = [str(item) for item in assessment_ids if item]
    normalized["suggestedAssignmentPayload"] = suggested_payload
    return normalized


async def _create_ai_generation_job(
    db: AsyncSession,
    *,
    job_type: str,
    class_id: str | None,
    teacher_id: str,
    source_filters: dict[str, Any],
    max_attempts: int = 3,
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
        retryState={"attempt": 0, "maxAttempts": max_attempts},
    )
    await _persist_ai_job_runtime(
        db,
        job_id=job_id,
        runtime_patch={
            "progressPercent": 5,
            "statusMessage": "Queued",
            "retryState": {"attempt": 0, "maxAttempts": max_attempts},
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
    normalized_record = dict(record)

    if _should_mark_job_stale(
        status=str(normalized_record.get("status") or ""),
        updated_at=normalized_record.get("updated_at"),
        runtime=merged_runtime,
    ):
        now = datetime.now(timezone.utc)
        stale_runtime_patch = {
            "progressPercent": 100,
            "statusMessage": "Generation timed out",
            "errorMessage": AI_JOB_STALE_FAILURE_MESSAGE,
            "staleTimeoutAt": now.isoformat(),
        }
        _set_ai_job_runtime(job_id, **stale_runtime_patch)
        merged_runtime = await _persist_ai_job_runtime(
            db,
            job_id=job_id,
            runtime_patch=stale_runtime_patch,
        )
        await db.execute(
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
                "errorMessage": AI_JOB_STALE_FAILURE_MESSAGE,
            },
        )
        await db.commit()
        normalized_record["status"] = "failed"
        normalized_record["error_message"] = AI_JOB_STALE_FAILURE_MESSAGE
        normalized_record["updated_at"] = now

    return normalized_record, merged_runtime, assessment_id


async def _ensure_quiz_sources_ready(
    db: AsyncSession,
    *,
    class_id: str,
    job_id: str | None = None,
    lesson_ids: list[str] | None = None,
    extraction_ids: list[str] | None = None,
) -> tuple[dict[str, Any], dict[str, Any] | None]:
    if job_id:
        await _record_ai_job_runtime(
            db,
            job_id=job_id,
            progressPercent=12,
            statusMessage="Checking sources",
        )

    index_status = await get_class_index_status(db, class_id)
    reindex_result: dict[str, Any] | None = None

    if index_status.get("needsReindex"):
        if job_id:
            await _record_ai_job_runtime(
                db,
                job_id=job_id,
                progressPercent=24,
                statusMessage="Reindexing sources",
            )
        reindex_result = await reindex_class_content(db, class_id)
        index_status = await get_class_index_status(db, class_id)

    if int(index_status.get("chunksIndexed") or 0) <= 0:
        raise HTTPException(
            400,
            str(
                index_status.get("reason")
                or "No indexed class source content found. Reindex the class sources before generating."
            ),
        )

    selected_lesson_ids = {item for item in lesson_ids or [] if item}
    if selected_lesson_ids:
        ready_lessons = {
            str(item.get("lessonId")): item
            for item in index_status.get("readyLessons") or []
        }
        lesson_blockers = {
            str(item.get("lessonId")): item
            for item in index_status.get("lessonBlockers") or []
        }
        missing_selected = [
            ready_lessons.get(lesson_id) or lesson_blockers.get(lesson_id)
            for lesson_id in selected_lesson_ids
            if int((ready_lessons.get(lesson_id) or {}).get("chunkCount") or 0) <= 0
        ]
        if missing_selected:
            labels = [
                str(item.get("title") or item.get("lessonId") or "lesson")
                for item in missing_selected[:3]
                if item
            ]
            raise HTTPException(
                400,
                "Selected lessons are not indexed yet. Reindex the class sources or choose lessons with published readable content."
                + (f" Affected lessons: {', '.join(labels)}." if labels else ""),
            )

    selected_extraction_ids = {item for item in extraction_ids or [] if item}
    if selected_extraction_ids:
        ready_extractions = {
            str(item.get("extractionId")): item
            for item in index_status.get("readyExtractions") or []
        }
        extraction_blockers = {
            str(item.get("extractionId")): item
            for item in index_status.get("extractionBlockers") or []
        }
        missing_selected = [
            ready_extractions.get(extraction_id) or extraction_blockers.get(extraction_id)
            for extraction_id in selected_extraction_ids
            if int((ready_extractions.get(extraction_id) or {}).get("chunkCount") or 0) <= 0
        ]
        if missing_selected:
            labels = [
                str(item.get("title") or item.get("extractionId") or "extraction")
                for item in missing_selected[:3]
                if item
            ]
            raise HTTPException(
                400,
                "Selected extractions are not indexed yet. Reindex the class sources or choose completed extractions with usable content."
                + (f" Affected extractions: {', '.join(labels)}." if labels else ""),
            )

    return index_status, reindex_result


async def _run_quiz_generation_job(
    job_id: str,
    body: GenerateQuizDraftRequest,
    user: RequestUser,
) -> None:
    async with AsyncSessionLocal() as bg_db:
        try:
            await _update_ai_job_status(
                bg_db,
                job_id=job_id,
                status="processing",
                error_message=None,
            )
            await _record_ai_job_runtime(
                bg_db,
                job_id=job_id,
                progressPercent=10,
                statusMessage="Checking sources",
                retryState={"attempt": 0, "maxAttempts": QUIZ_JOB_MAX_ATTEMPTS},
            )
            index_status, preflight_reindex = await _ensure_quiz_sources_ready(
                bg_db,
                class_id=body.class_id,
                job_id=job_id,
                lesson_ids=body.lesson_ids,
                extraction_ids=body.extraction_ids,
            )

            async def _operation(attempt: int) -> dict[str, Any]:
                await bg_db.rollback()
                await _record_ai_job_runtime(
                    bg_db,
                    job_id=job_id,
                    retryState={"attempt": attempt, "maxAttempts": QUIZ_JOB_MAX_ATTEMPTS},
                )
                return await generate_quiz_draft(
                    bg_db,
                    user,
                    body,
                    existing_job_id=job_id,
                    progress_callback=lambda status_message, progress_percent: _record_ai_job_runtime(
                        bg_db,
                        job_id=job_id,
                        statusMessage=status_message,
                        progressPercent=progress_percent,
                        retryState={
                            "attempt": attempt,
                            "maxAttempts": QUIZ_JOB_MAX_ATTEMPTS,
                        },
                    ),
                )

            result = await _run_with_retries(
                _operation,
                max_attempts=QUIZ_JOB_MAX_ATTEMPTS,
                delay_seconds=1.0,
            )
            indexing = await reindex_class_content(bg_db, body.class_id)
            await _record_ai_job_runtime(
                bg_db,
                job_id=job_id,
                progressPercent=100,
                statusMessage="Draft ready",
                resultSummary={
                    "assessmentId": result.get("assessmentId"),
                    "outputId": result.get("outputId"),
                    "blueprintSource": result.get("blueprintSource"),
                    "indexStatus": index_status,
                    "preflightReindex": preflight_reindex,
                    "indexing": indexing,
                },
            )
        except asyncio.CancelledError:
            await bg_db.rollback()
            await _update_ai_job_status(
                bg_db,
                job_id=job_id,
                status="cancelled",
                error_message="Generation cancelled by teacher.",
                output_status="cancelled",
            )
            await _record_ai_job_runtime(
                bg_db,
                job_id=job_id,
                progressPercent=100,
                statusMessage="Generation cancelled",
                errorMessage="Generation cancelled by teacher.",
            )
            logger.info("[ai-job] Quiz generation %s cancelled", job_id)
            raise
        except Exception as exc:
            await bg_db.rollback()
            await _update_ai_job_status(
                bg_db,
                job_id=job_id,
                status="failed",
                error_message=str(exc),
            )
            await _record_ai_job_runtime(
                bg_db,
                job_id=job_id,
                progressPercent=100,
                statusMessage="Generation failed",
                errorMessage=str(exc),
            )
            logger.exception("[ai-job] Quiz generation %s failed", job_id)
        finally:
            AI_JOB_TASKS.pop(job_id, None)


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
                try:
                    return await recommend_intervention_case(
                        bg_db,
                        user,
                        case_id=case_id,
                        note=note,
                        existing_job_id=job_id,
                    )
                except Exception:
                    await bg_db.rollback()
                    raise

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
            await bg_db.rollback()
            await _update_ai_job_status(
                bg_db,
                job_id=job_id,
                status="failed",
                error_message=str(exc),
            )
            await _record_ai_job_runtime(
                bg_db,
                job_id=job_id,
                progressPercent=100,
                statusMessage="Generation failed",
                errorMessage=str(exc),
            )
            logger.exception("[ai-job] Intervention generation %s failed", job_id)
        finally:
            AI_JOB_TASKS.pop(job_id, None)

# ---------------------------------------------------------------------------
# JAKIPIR System Prompt
# ---------------------------------------------------------------------------

JAKIPIR_SYSTEM_PROMPT = """You are J.A.K.I.P.I.R â€” Just-in-time Adaptive Knowledge Instructor & Personalized Intelligence Resource. Your nickname is "Ja".

You are the AI Mentor of Nexora, a Learning Management System for Gat Andres Bonifacio High School (Grades 7â€“10, Philippines DepEd curriculum).

PERSONALITY:
- You have a perceptive, detective-like demeanor. You notice patterns, pick up on clues in what students say, and investigate their learning gaps like a case to be cracked.
- Use investigative language naturally: "I notice...", "That's an interesting clue...", "Let's piece this together...", "I've been observing your progress and...", "The evidence suggests..."
- You are a hype coach at heart â€” you genuinely celebrate student effort and achievements. You get excited about breakthroughs. But you maintain formality and professionalism.
- Be warm, supportive, and encouraging, but never condescending. Speak at a high school level.
- When a student is struggling, be empathetic and frame challenges as mysteries to solve together.

RULES:
1. ALWAYS end your response with a study tip or learning strategy under the heading "ðŸ“Œ Ja's Study Tip:". The tip should be practical and relevant to the conversation topic.
2. NEVER give direct answers to test or assessment questions. Instead, guide students with hints, analogies, and step-by-step reasoning.
3. When a student shares progress or success, celebrate it enthusiastically but professionally â€” like a detective who just cracked a big case.
4. Keep responses concise â€” aim for 2-4 paragraphs max, plus the study tip.
5. If the student greets you or asks who you are, introduce yourself briefly: "I'm Ja â€” your AI Mentor here at Nexora! Think of me as your personal learning detective. I'm here to help you crack the case on any topic you're studying."
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


def _is_admin(user: RequestUser) -> bool:
    return "admin" in [role.lower() for role in user.roles]


def _assert_admin_analytics_access(user: RequestUser) -> None:
    if not _is_admin(user):
        raise HTTPException(403, "Admin analytics chat is restricted to admin accounts.")


def _normalize_admin_chart(chart: Any) -> dict[str, Any] | None:
    if not isinstance(chart, dict):
        return None

    chart_type = chart.get("type")
    title = chart.get("title")
    labels = chart.get("labels")
    series = chart.get("series")
    if chart_type not in {"bar", "line", "pie", "donut"}:
        return None
    if not isinstance(title, str) or not title.strip():
        return None
    if not isinstance(labels, list) or not labels:
        return None
    normalized_labels = [str(item).strip() for item in labels if str(item).strip()]
    if not normalized_labels:
        return None
    if not isinstance(series, list) or not series:
        return None

    normalized_series: list[dict[str, Any]] = []
    for item in series[:4]:
        if not isinstance(item, dict):
            continue
        name = item.get("name")
        data = item.get("data")
        if not isinstance(name, str) or not name.strip():
            continue
        if not isinstance(data, list) or not data:
            continue
        numeric_data: list[float] = []
        for value in data[: len(normalized_labels)]:
            if isinstance(value, (int, float)):
                numeric_data.append(float(value))
            else:
                try:
                    numeric_data.append(float(value))
                except Exception:
                    numeric_data.append(0.0)
        if numeric_data:
            normalized_series.append(
                {
                    "name": name.strip(),
                    "data": numeric_data,
                }
            )

    if not normalized_series:
        return None

    return {
        "type": chart_type,
        "title": title.strip(),
        "labels": normalized_labels,
        "series": normalized_series,
        "yAxisLabel": chart.get("yAxisLabel") if isinstance(chart.get("yAxisLabel"), str) else None,
        "xAxisLabel": chart.get("xAxisLabel") if isinstance(chart.get("xAxisLabel"), str) else None,
    }


def _normalize_admin_sources(sources: Any) -> list[dict[str, Any]]:
    if not isinstance(sources, list):
        return []

    normalized: list[dict[str, Any]] = []
    for item in sources[:8]:
        if not isinstance(item, dict):
            continue
        source = item.get("source")
        if not isinstance(source, str) or not source.strip():
            continue
        filters = item.get("filters")
        window = item.get("window")
        normalized.append(
            {
                "source": source.strip(),
                "filters": filters if isinstance(filters, dict) else {},
                "window": window.strip() if isinstance(window, str) and window.strip() else None,
            }
        )
    return normalized


def _build_admin_analytics_prompt(
    message: str,
    context: dict[str, Any],
    history_rows: list[dict[str, Any]],
) -> str:
    prior_turns = [
        {
            "user": row.get("input_text", ""),
            "assistant": row.get("output_text", ""),
        }
        for row in history_rows[-6:]
    ]
    return (
        "Produce one JSON object that matches the required format exactly.\n\n"
        f"Admin question:\n{message.strip()}\n\n"
        f"Prior session turns:\n{json.dumps(prior_turns, ensure_ascii=False)}\n\n"
        f"Approved analytics context:\n{json.dumps(context, ensure_ascii=False, default=str)}"
    )


def _get_context_dict(context: dict[str, Any], *keys: str) -> dict[str, Any]:
    current: Any = context
    for key in keys:
        if not isinstance(current, dict):
            return {}
        current = current.get(key)
    return current if isinstance(current, dict) else {}


def _get_context_rows(context: dict[str, Any], *keys: str) -> list[dict[str, Any]]:
    current: Any = context
    for key in keys:
        if not isinstance(current, dict):
            return []
        current = current.get(key)
    if not isinstance(current, list):
        return []
    return [item for item in current if isinstance(item, dict)]


def _normalize_admin_sources_with_context(
    message: str,
    context: dict[str, Any],
    sources: Any,
) -> list[dict[str, Any]]:
    normalized_sources = [
        source
        for source in _normalize_admin_sources(sources)
        if source["source"] in APPROVED_ADMIN_SOURCE_IDS
    ]
    if normalized_sources:
        return normalized_sources

    prompt = message.lower()
    fallback_sources: list[dict[str, Any]] = []
    if "risk" in prompt or "at-risk" in prompt:
        report = _get_context_dict(context, "reports", "studentPerformance")
        fallback_sources.append(
            {
                "source": "student-performance-report",
                "filters": report.get("filters", {}),
                "window": report.get("generatedAt"),
            }
        )
    if "usage" in prompt or "activity" in prompt:
        report = _get_context_dict(context, "reports", "systemUsage")
        fallback_sources.append(
            {
                "source": "system-usage-report",
                "filters": report.get("filters", {}),
                "window": report.get("generatedAt"),
            }
        )
    if "assessment" in prompt or "subject" in prompt or "performance" in prompt:
        report = _get_context_dict(context, "reports", "assessmentSummary")
        fallback_sources.append(
            {
                "source": "assessment-summary-report",
                "filters": report.get("filters", {}),
                "window": report.get("generatedAt"),
            }
        )
    if "intervention" in prompt:
        report = _get_context_dict(context, "reports", "interventionParticipation")
        fallback_sources.append(
            {
                "source": "intervention-participation-report",
                "filters": report.get("filters", {}),
                "window": report.get("generatedAt"),
            }
        )
    if "audit" in prompt or "log" in prompt:
        fallback_sources.append(
            {
                "source": "audit-log",
                "filters": {"limit": 10},
                "window": context.get("fetchedAt"),
            }
        )
    if not fallback_sources:
        fallback_sources.append(
            {
                "source": "admin-dashboard-overview",
                "filters": {},
                "window": context.get("fetchedAt"),
            }
        )
    return fallback_sources


def _build_risk_snapshot_chart(context: dict[str, Any]) -> dict[str, Any] | None:
    rows = _get_context_rows(context, "reports", "studentPerformance", "rows")
    counts: dict[str, int] = {}
    for row in rows:
        if not row.get("isAtRisk"):
            continue
        label = str(row.get("subjectCode") or row.get("classId") or "Unknown").strip()
        counts[label] = counts.get(label, 0) + 1
    if not counts:
        return None

    labels = list(counts.keys())[:6]
    return {
        "type": "bar",
        "title": "At-risk learners by subject",
        "labels": labels,
        "series": [
            {
                "name": "At-risk learners",
                "data": [counts[label] for label in labels],
            }
        ],
        "yAxisLabel": "Learners",
        "xAxisLabel": "Subject",
    }


def _build_system_usage_chart(context: dict[str, Any]) -> dict[str, Any] | None:
    usage = _get_context_dict(context, "reports", "systemUsage", "data")
    metrics = [
        ("Lessons", usage.get("lessonCompletions")),
        ("Submissions", usage.get("assessmentSubmissions")),
        ("Opens", usage.get("interventionOpens")),
        ("Closures", usage.get("interventionClosures")),
    ]
    values = []
    labels = []
    for label, value in metrics:
        if isinstance(value, (int, float)):
            labels.append(label)
            values.append(float(value))
    if not values:
        return None

    return {
        "type": "bar",
        "title": "Weekly system usage snapshot",
        "labels": labels,
        "series": [{"name": "Events", "data": values}],
        "yAxisLabel": "Count",
        "xAxisLabel": "Metric",
    }


def _build_assessment_chart(context: dict[str, Any]) -> dict[str, Any] | None:
    rows = _get_context_rows(context, "reports", "assessmentSummary", "rows")
    values: list[tuple[str, float]] = []
    for row in rows:
        score = row.get("averageScore")
        if not isinstance(score, (int, float)):
            continue
        label = str(row.get("subjectCode") or row.get("title") or "Assessment").strip()
        values.append((label, float(score)))
    if not values:
        return None

    labels = [label for label, _ in values[:6]]
    return {
        "type": "bar",
        "title": "Assessment averages by subject",
        "labels": labels,
        "series": [{"name": "Average score", "data": [score for _, score in values[:6]]}],
        "yAxisLabel": "Average score",
        "xAxisLabel": "Subject",
    }


def _infer_admin_chart(
    message: str,
    context: dict[str, Any],
    chart: dict[str, Any] | None,
) -> dict[str, Any] | None:
    if chart is not None:
        return chart
    prompt = message.lower()
    if "risk" in prompt or "at-risk" in prompt:
        return _build_risk_snapshot_chart(context)
    if "usage" in prompt or "activity" in prompt:
        return _build_system_usage_chart(context)
    if "assessment" in prompt or "subject" in prompt or "performance" in prompt:
        return _build_assessment_chart(context)
    return None


def _needs_admin_reply_rewrite(reply: str) -> bool:
    lowered = reply.lower()
    return "json structure" in lowered or "provided in your json" in lowered


def _infer_admin_reply(message: str, context: dict[str, Any]) -> str | None:
    prompt = message.lower()
    if "risk" in prompt or "at-risk" in prompt:
        rows = _get_context_rows(context, "reports", "studentPerformance", "rows")
        at_risk_rows = [row for row in rows if row.get("isAtRisk")]
        if at_risk_rows:
            subject_count = len(
                {
                    str(row.get("subjectCode") or row.get("classId") or "Unknown")
                    for row in at_risk_rows
                }
            )
            return (
                f"The latest student performance sample shows {len(at_risk_rows)} at-risk learner records "
                f"across {subject_count} subject groupings. Use the chart to see where the current concentration is highest."
            )
    if "usage" in prompt or "activity" in prompt:
        usage = _get_context_dict(context, "reports", "systemUsage", "data")
        submissions = usage.get("assessmentSubmissions")
        completions = usage.get("lessonCompletions")
        if isinstance(submissions, (int, float)) and isinstance(completions, (int, float)):
            return (
                f"Current usage shows {int(submissions)} assessment submissions and {int(completions)} lesson completions "
                "in the active reporting window. The chart compares the main activity counters returned by the LMS."
            )
    if "assessment" in prompt or "subject" in prompt:
        rows = _get_context_rows(context, "reports", "assessmentSummary", "rows")
        if rows:
            top = rows[0]
            return (
                f"Assessment summary data is available for {len(rows)} rows. "
                f"The leading visible row is {top.get('subjectCode') or top.get('title') or 'the latest assessment'} "
                f"with an average score of {top.get('averageScore')}. The chart compares the available subject averages."
            )
    return None


async def _parse_or_repair_admin_analytics_response(raw: str) -> dict[str, Any]:
    try:
        parsed = json.loads(_extract_json_payload(raw))
    except Exception as parse_err:
        logger.warning(
            "[admin-analytics] Initial JSON parse failed, requesting repair: %s",
            parse_err,
        )
        repair_prompt = f"""
Repair this malformed JSON into valid JSON that strictly matches the required admin analytics schema.
Do not add commentary. Return one JSON object only.

Malformed JSON:
{raw}
"""
        repaired_raw = await ollama_client.generate(
            repair_prompt,
            ADMIN_ANALYTICS_SYSTEM_PROMPT,
            task="chat",
            response_format=ADMIN_ANALYTICS_RESPONSE_FORMAT,
            num_predict=768,
        )
        parsed = json.loads(_extract_json_payload(repaired_raw))

    reply = parsed.get("reply")
    if not isinstance(reply, str) or not reply.strip():
        raise ValueError("Admin analytics response did not contain a usable reply.")

    return {
        "reply": reply.strip(),
        "chart": _normalize_admin_chart(parsed.get("chart")),
        "sources": _normalize_admin_sources(parsed.get("sources")),
    }


def _normalize_admin_history_summary(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    sessions: dict[str, dict[str, Any]] = {}
    for row in rows:
        session_id_value = row.get("session_id")
        session_id = str(session_id_value).strip() if session_id_value is not None else ""
        if not session_id:
            continue
        created_at = row.get("created_at")
        input_text = (row.get("input_text") or "").strip()
        output_text = (row.get("output_text") or "").strip()
        existing = sessions.get(session_id)
        if existing is None:
            existing = {
                "sessionId": session_id,
                "sessionType": row.get("session_type"),
                "title": (input_text[:72] or "Admin analytics chat").strip(),
                "preview": (output_text[:140] or input_text[:140] or "No preview available").strip(),
                "updatedAt": created_at.isoformat() if isinstance(created_at, datetime) else created_at,
                "messageCount": 0,
            }
        existing["messageCount"] += 2
        normalized_created_at = (
            created_at.isoformat() if isinstance(created_at, datetime) else created_at
        )
        if normalized_created_at and (
            existing["updatedAt"] is None or str(normalized_created_at) > str(existing["updatedAt"])
        ):
            existing["updatedAt"] = normalized_created_at
            existing["preview"] = (output_text[:140] or input_text[:140] or existing["preview"]).strip()
        sessions[session_id] = existing

    return sorted(
        sessions.values(),
        key=lambda item: str(item.get("updatedAt") or ""),
        reverse=True,
    )


def _build_admin_session_payload(
    session_id: str,
    rows: list[dict[str, Any]],
) -> dict[str, Any]:
    messages: list[dict[str, Any]] = []
    title = "Admin analytics chat"
    updated_at = None

    for index, row in enumerate(rows):
        created_at = row.get("created_at")
        updated_at = created_at or updated_at
        input_text = (row.get("input_text") or "").strip()
        output_text = (row.get("output_text") or "").strip()
        context_metadata = row.get("context_metadata")
        if not isinstance(context_metadata, dict):
            context_metadata = {}

        if input_text:
            if title == "Admin analytics chat":
                title = input_text[:72].strip() or title
            messages.append(
                {
                    "id": f"{session_id}-user-{index}",
                    "role": "user",
                    "content": input_text,
                    "createdAt": created_at.isoformat() if isinstance(created_at, datetime) else created_at,
                }
            )

        if output_text:
            messages.append(
                {
                    "id": f"{session_id}-assistant-{index}",
                    "role": "assistant",
                    "content": output_text,
                    "createdAt": created_at.isoformat() if isinstance(created_at, datetime) else created_at,
                    "chart": _normalize_admin_chart(context_metadata.get("chart")),
                    "sources": _normalize_admin_sources(context_metadata.get("sources")),
                }
            )

    return {
        "sessionId": session_id,
        "title": title,
        "updatedAt": updated_at.isoformat() if isinstance(updated_at, datetime) else updated_at,
        "messages": messages,
    }


async def get_readiness_state(db: AsyncSession) -> dict[str, Any]:
    database_status = {"ok": True}
    try:
        await db.execute(sa_text("SELECT 1"))
    except Exception as err:
        database_status = {"ok": False, "message": str(err)}

    runtime_status = await ollama_client.is_available()
    ai_degraded_allowed = settings.ai_degraded_allowed
    ready = database_status["ok"] and (
        runtime_status["available"] or ai_degraded_allowed
    )
    AI_READY.set(1 if ready else 0)
    OLLAMA_AVAILABLE.set(1 if runtime_status["ollamaAvailable"] else 0)

    return {
        "ready": ready,
        "degradedMode": bool(ai_degraded_allowed and not runtime_status["available"]),
        "dependencies": {
            "database": database_status,
            "runtime": {
                "ok": runtime_status["available"],
                "provider": runtime_status["provider"],
                "mode": runtime_status["runtimeMode"],
                "models": runtime_status["models"],
            },
            "ollama": {
                "ok": runtime_status["ollamaAvailable"],
                "models": runtime_status["ollamaModels"],
            },
            "cloud": {
                "ok": runtime_status["cloudAvailable"],
                "provider": runtime_status["cloudProvider"],
                "models": runtime_status["cloudModels"],
            },
        },
        "configuredEmbeddingModel": ollama_client.get_embedding_model_name(),
        "frameworks": {
            "llamaIndexAvailable": llamaindex_available(),
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def _extract_json_payload(raw: str) -> str:
    cleaned = (
        raw.strip()
        .removeprefix("```json")
        .removeprefix("```")
        .removesuffix("```")
        .strip()
    )
    first = cleaned.find("{")
    last = cleaned.rfind("}")
    if first == -1 or last <= first:
        raise ValueError("Model output did not contain a JSON object")
    return cleaned[first : last + 1]


async def _parse_or_repair_demo_plan(raw: str) -> dict[str, Any]:
    try:
        return json.loads(_extract_json_payload(raw))
    except Exception as parse_err:
        logger.warning("[demo-ai] Initial JSON parse failed, requesting repair: %s", parse_err)

    repair_prompt = f"""
Repair this malformed JSON into valid JSON that strictly matches the required intervention plan schema.
Do not add commentary. Return one JSON object only.

Malformed JSON:
{raw}
"""
    repaired_raw = await ollama_client.generate(
        repair_prompt,
        DEMO_INTERVENTION_PLAN_SYSTEM_PROMPT,
        task="intervention",
        response_format=DEMO_INTERVENTION_PLAN_FORMAT,
        num_predict=512,
    )
    return json.loads(_extract_json_payload(repaired_raw))


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
    attachments = await normalize_attachment_images(
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
        user_message["_attachments"] = attachments
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
                "â€” like a detective without a magnifying glass! ðŸ” Please try again "
                "in a moment. In the meantime, review your notes â€” that's always a solid lead!\n\n"
                "ðŸ“Œ Ja's Study Tip: While waiting, try writing down one thing you learned "
                "today. It helps lock it into memory!"
            )
            model_used = "fallback (ollama-unavailable)"
    else:
        logger.info("Ollama unavailable for chat â€” returning fallback")
        reply = (
            "I'm currently recharging my detective instincts â€” Ollama (my brain!) "
            "isn't running right now. Ask your teacher to start it up, and I'll be "
            "right back on the case! ðŸ•µï¸\n\n"
            "ðŸ“Œ Ja's Study Tip: Use this downtime to quiz yourself on what you studied "
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
# POST /admin/chat
# ---------------------------------------------------------------------------


@app.post("/admin/chat")
async def admin_chat(
    body: AdminChatRequest,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _assert_admin_analytics_access(user)

    import time

    chat_session_id = body.session_id or str(uuid.uuid4())
    history_rows: list[dict[str, Any]] = []
    if body.session_id:
        rows = await db.execute(
            sa_text(
                "SELECT input_text, output_text, created_at FROM ai_interaction_logs "
                "WHERE user_id = :uid AND session_id = :sid "
                "AND session_type = :sessionType "
                "ORDER BY created_at ASC LIMIT 12"
            ),
            {
                "uid": user.id,
                "sid": body.session_id,
                "sessionType": ADMIN_ANALYTICS_SESSION_TYPE,
            },
        )
        history_rows = [dict(r) for r in rows.mappings()]

    prompt = _build_admin_analytics_prompt(
        body.message,
        body.context if isinstance(body.context, dict) else {},
        history_rows,
    )

    start = time.time()
    try:
        raw = await ollama_client.generate(
            prompt,
            ADMIN_ANALYTICS_SYSTEM_PROMPT,
            task="chat",
            response_format=ADMIN_ANALYTICS_RESPONSE_FORMAT,
            num_predict=768,
        )
        parsed = await _parse_or_repair_admin_analytics_response(raw)
        degraded = False
        reply = parsed["reply"]
        chart = _infer_admin_chart(body.message, body.context, parsed["chart"])
        sources = _normalize_admin_sources_with_context(
            body.message,
            body.context,
            parsed["sources"],
        )
        fallback_reply = _infer_admin_reply(body.message, body.context)
        if _needs_admin_reply_rewrite(reply) and fallback_reply:
            reply = fallback_reply
        message = "Admin analytics response generated."
    except Exception as err:
        logger.warning("[admin-analytics] Falling back to deterministic reply: %s", err)
        degraded = True
        reply = (
            "Admin analytics is temporarily unavailable. The request was recorded, but I could not "
            "generate a grounded summary from the current context."
        )
        chart = _infer_admin_chart(body.message, body.context, None)
        sources = _normalize_admin_sources_with_context(body.message, body.context, [])
        message = "Admin analytics fallback response generated."

    response_time_ms = int((time.time() - start) * 1000)
    model_used = ollama_client.get_task_model_name("chat")
    context_metadata = {
        "sessionId": chat_session_id,
        "sources": sources,
        "chart": chart,
        "contextKeys": sorted(list(body.context.keys())) if isinstance(body.context, dict) else [],
    }

    await db.execute(
        sa_text(
            "INSERT INTO ai_interaction_logs "
            "(user_id, session_type, input_text, output_text, model_used, "
            "response_time_ms, session_id, context_metadata) "
            "VALUES (:userId, :sessionType, :inputText, :outputText, "
            ":modelUsed, :responseTimeMs, :sessionId, :ctx)"
        ).bindparams(bindparam("ctx", type_=postgresql.JSONB)),
        {
            "userId": user.id,
            "sessionType": ADMIN_ANALYTICS_SESSION_TYPE,
            "inputText": body.message[:2000],
            "outputText": reply[:5000],
            "modelUsed": model_used,
            "responseTimeMs": response_time_ms,
            "sessionId": chat_session_id,
            "ctx": context_metadata,
        },
    )
    await db.commit()

    return {
        "success": True,
        "degraded": degraded,
        "message": message,
        "data": {
            "reply": reply,
            "sessionId": chat_session_id,
            "modelUsed": model_used,
            "chart": chart,
            "sources": sources,
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
        lesson_id=body.lesson_id,
        lesson_title=body.lesson_title,
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
    OLLAMA_AVAILABLE.set(1 if status["ollamaAvailable"] else 0)
    return {
        "success": True,
        "message": "AI health status",
        "data": {
            "runtimeAvailable": status["available"],
            "runtimeProvider": status["provider"],
            "runtimeMode": status["runtimeMode"],
            "ollamaAvailable": status["ollamaAvailable"],
            "configuredModel": ollama_client.get_text_model_name(),
            "configuredTextModel": ollama_client.get_text_model_name(),
            "configuredVisionModel": ollama_client.get_vision_model_name(),
            "configuredEmbeddingModel": ollama_client.get_embedding_model_name(),
            "embeddingModelAvailable": bool(status["available"]),
            "availableModels": available_models,
            "ollamaModels": status["ollamaModels"],
            "cloudAvailable": status["cloudAvailable"],
            "cloudProvider": status["cloudProvider"],
            "cloudModels": status["cloudModels"],
        },
    }


@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


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


@app.post("/demo/intervention-plan")
async def generate_demo_intervention_plan(
    body: DemoInterventionPlanRequest,
    _auth: None = Depends(require_internal_service),
):
    subject_id = (body.subject_id or "").strip().lower()
    if subject_id not in {"english", "science"}:
        raise HTTPException(400, "subjectId must be either 'english' or 'science'")

    module_catalog = {
        "english": [
            "Module 1: Reading for Main Idea and Supporting Details",
            "Module 2: Context Clues and Vocabulary",
            "Module 3: Paragraph Writing and Coherence",
        ],
        "science": [
            "Module 1: Scientific Inquiry and Variables",
            "Module 2: Ecosystems and Energy Flow",
            "Module 3: Cells and Organisms",
        ],
    }

    weak_concepts = [
        str(item).strip()
        for item in (body.weak_concepts or [])
        if str(item).strip()
    ][:6]
    module_scores = [int(value) for value in (body.module_scores or [])][:6]
    sorted_modules = module_catalog[subject_id]
    if module_scores:
        recommended_modules = [
            row["title"]
            for row in sorted(
                [
                    {"title": title, "score": module_scores[index] if index < len(module_scores) else 100}
                    for index, title in enumerate(sorted_modules)
                ],
                key=lambda row: row["score"],
            )[:2]
        ]
    else:
        recommended_modules = sorted_modules[:2]

    fallback_weak_concepts = weak_concepts or (
        ["Scientific reasoning fundamentals", "Cell and ecosystem concept transfer"]
        if subject_id == "science"
        else ["Main idea extraction", "Coherent paragraph development"]
    )

    def build_fallback_questions() -> list[dict[str, Any]]:
        questions: list[dict[str, Any]] = []
        for concept_index, concept in enumerate(fallback_weak_concepts[:4]):
            questions.append(
                {
                    "id": f"demo-fallback-{subject_id}-{concept_index + 1}-a",
                    "prompt": f'Which study strategy best improves "{concept}"?',
                    "options": [
                        f"Practice {concept} with examples and explain your reasoning.",
                        "Memorize random facts without checking understanding.",
                        "Skip feedback and move to unrelated topics.",
                        "Answer quickly without reading the question fully.",
                    ],
                    "correctIndex": 0,
                    "explanation": "Concept-focused practice with explanation improves retention and transfer.",
                }
            )
            questions.append(
                {
                    "id": f"demo-fallback-{subject_id}-{concept_index + 1}-b",
                    "prompt": f'After reviewing "{concept}", what should the learner do next?',
                    "options": [
                        "Take a short check question and review errors.",
                        "Assume mastery without any check.",
                        "Skip to a new topic immediately.",
                        "Repeat one sentence without application.",
                    ],
                    "correctIndex": 0,
                    "explanation": "A quick mastery check validates understanding and exposes remaining gaps.",
                }
            )
        return questions[:10]

    def build_fallback_response(reason: str) -> dict[str, Any]:
        logger.warning("[demo-ai] Falling back to deterministic demo plan: %s", reason)
        return {
            "success": True,
            "degraded": True,
            "message": "Demo fallback intervention plan generated because live AI is unavailable.",
            "data": {
                "source": "fallback",
                "weakConcepts": fallback_weak_concepts,
                "recommendedModules": recommended_modules,
                "teacherSummary": (
                    "Live AI timed out. Use this fallback remediation sequence, then retry for a live plan when AI is stable."
                ),
                "lxpQuestions": build_fallback_questions(),
            },
        }

    prompt = f"""
Generate a remediation plan for a public LMS demo.

Subject: {subject_id}
Quarter exam score: {body.quarter_exam_score}
Weak concepts: {json.dumps(weak_concepts or ['Concept reinforcement needed'], ensure_ascii=False)}
Recommended module candidates: {json.dumps(recommended_modules, ensure_ascii=False)}

Return one JSON object that matches the required format exactly.
- Use exactly 6 lxpQuestions.
- Each lxpQuestion must have exactly 4 options and a valid correctIndex (0-3).
- Keep language at Grade 7 level.
"""
    try:
        raw = await ollama_client.generate(
            prompt,
            DEMO_INTERVENTION_PLAN_SYSTEM_PROMPT,
            task="intervention",
            response_format=DEMO_INTERVENTION_PLAN_FORMAT,
            num_predict=1024,
        )
    except Exception as err:
        return build_fallback_response(f"live generation request failed: {err}")

    try:
        parsed = await _parse_or_repair_demo_plan(raw)
    except Exception as err:
        return build_fallback_response(f"invalid live JSON payload: {err}")

    questions = parsed.get("lxpQuestions")
    if not isinstance(questions, list) or len(questions) == 0:
        return build_fallback_response("live payload had no remediation questions")

    return {
        "success": True,
        "message": "Demo live AI intervention plan generated",
        "data": {
            "source": "live",
            "weakConcepts": parsed.get("weakConcepts") or weak_concepts or ["Concept reinforcement needed"],
            "recommendedModules": parsed.get("recommendedModules") or recommended_modules,
            "teacherSummary": parsed.get("teacherSummary") or "Live AI remediation summary generated.",
            "lxpQuestions": questions,
        },
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
    subject_key: str | None = Query(None, alias="subjectKey"),
    grade_level: str | None = Query(None, alias="gradeLevel"),
    include_library: bool = Query(True, alias="includeLibrary"),
    db: AsyncSession = Depends(get_db),
    _auth: None = Depends(require_internal_service),
):
    data = await preview_retrieval(
        db,
        query_text=query_text,
        class_id=class_id,
        subject_key=subject_key,
        grade_level=grade_level,
        include_library=include_library,
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
# GET /index/classes/:id/status
# ---------------------------------------------------------------------------


@app.get("/index/classes/{class_id}/status")
async def get_index_class_status(
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
        raise HTTPException(403, "You can only view index status for your own classes")

    data = await get_class_index_status(db, class_id)
    return {
        "success": True,
        "message": "Class index status retrieved",
        "data": data,
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


@app.post("/internal/index/library-files/{file_id}")
async def internal_index_library_file(
    file_id: str,
    payload: dict[str, Any] | None = Body(default=None),
    _authorized: None = Depends(require_internal_service),
    db: AsyncSession = Depends(get_db),
):
    data = await index_library_file(db, file_id)
    return {
        "success": True,
        "message": "Library file indexed via internal service",
        "data": {
            **data,
            "requestedBy": payload or {},
        },
    }


@app.delete("/internal/index/library-files/{file_id}/chunks")
async def internal_delete_library_file_chunks(
    file_id: str,
    _authorized: None = Depends(require_internal_service),
    db: AsyncSession = Depends(get_db),
):
    data = await delete_library_file_chunks(db, file_id)
    return {
        "success": True,
        "message": "Library file chunks deleted",
        "data": data,
    }


@app.post("/internal/index/library/backfill")
async def internal_backfill_library_index(
    payload: dict[str, Any] | None = Body(default=None),
    _authorized: None = Depends(require_internal_service),
    db: AsyncSession = Depends(get_db),
):
    data = await backfill_library_files(db)
    return {
        "success": True,
        "message": "Library indexing backfill completed",
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
# Extraction normalization helpers
# ---------------------------------------------------------------------------

VALID_EXTRACTION_BLOCK_TYPES = {"text", "image", "video", "question", "file", "divider"}
VALID_ASSESSMENT_TYPES = {"quiz", "exam", "assignment", "file_upload"}
VALID_QUESTION_TYPES = {
    "multiple_choice",
    "multiple_select",
    "true_false",
    "short_answer",
    "fill_blank",
    "dropdown",
}
LOW_CONFIDENCE_REVIEW_THRESHOLD = 0.85
VERY_SHORT_APPLY_TEXT_THRESHOLD = 20


def _safe_int(value: Any, fallback: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return fallback
    return parsed


def _normalize_block_content(content: Any) -> dict[str, Any] | str:
    if isinstance(content, dict):
        return content
    if isinstance(content, str):
        return {"text": content}
    if content is None:
        return {"text": ""}
    return {"text": str(content)}


def _normalize_string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def _normalize_media_candidate(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    section_index = raw.get("sectionIndex")
    if not isinstance(section_index, int):
        return None
    score = raw.get("score")
    if not isinstance(score, (int, float)):
        return None
    payload = {
        "sectionIndex": section_index,
        "score": round(float(score), 4),
    }
    if isinstance(raw.get("explicitMatch"), bool):
        payload["explicitMatch"] = bool(raw.get("explicitMatch"))
    if isinstance(raw.get("scoreBreakdown"), dict):
        payload["scoreBreakdown"] = {
            str(key): round(float(value), 4)
            for key, value in raw.get("scoreBreakdown", {}).items()
            if isinstance(value, (int, float))
        }
    return payload


def _normalize_media_asset(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    media_id = str(raw.get("id") or "").strip()
    url = str(raw.get("url") or raw.get("dataUrl") or "").strip()
    if not media_id or not url:
        return None
    selected_section_index = raw.get("selectedSectionIndex")
    if not isinstance(selected_section_index, int):
        selected_section_index = None
    assignment_confidence = raw.get("assignmentConfidence")
    candidate_sections = []
    if isinstance(raw.get("candidateSections"), list):
        for candidate in raw.get("candidateSections")[:3]:
            normalized = _normalize_media_candidate(candidate)
            if normalized is not None:
                candidate_sections.append(normalized)
    payload = {
        "id": media_id,
        "url": url,
        "pageNumber": _safe_int(raw.get("pageNumber"), 0) or None,
        "caption": str(raw.get("caption") or "").strip() or None,
        "anchorText": str(raw.get("anchorText") or "").strip() or None,
        "keywords": _normalize_string_list(raw.get("keywords")),
        "figureReferences": _normalize_string_list(raw.get("figureReferences")),
        "selectedSectionIndex": selected_section_index,
        "assignmentConfidence": (
            round(float(assignment_confidence), 4)
            if isinstance(assignment_confidence, (int, float))
            else None
        ),
        "assignmentBreakdown": (
            {
                str(key): round(float(value), 4)
                for key, value in raw.get("assignmentBreakdown", {}).items()
                if isinstance(value, (int, float))
            }
            if isinstance(raw.get("assignmentBreakdown"), dict)
            else {}
        ),
        "candidateSections": candidate_sections,
        "teacherReviewed": bool(raw.get("teacherReviewed")),
        "reviewState": str(raw.get("reviewState") or "").strip() or None,
    }
    if payload["pageNumber"] is None:
        payload.pop("pageNumber")
    if payload["caption"] is None:
        payload.pop("caption")
    if payload["anchorText"] is None:
        payload.pop("anchorText")
    if payload["reviewState"] is None:
        payload.pop("reviewState")
    return payload


def _synthesize_media_assets_from_sections(sections: list[dict[str, Any]]) -> list[dict[str, Any]]:
    media_assets: list[dict[str, Any]] = []
    for section_index, section in enumerate(sections):
        lesson_blocks = section.get("lessonBlocks") if isinstance(section.get("lessonBlocks"), list) else []
        for block_index, block in enumerate(lesson_blocks):
            if not isinstance(block, dict) or str(block.get("type") or "").strip().lower() != "image":
                continue
            content = block.get("content")
            metadata = block.get("metadata") if isinstance(block.get("metadata"), dict) else {}
            if not isinstance(content, dict):
                continue
            url = str(content.get("url") or "").strip()
            if not url:
                continue
            media_asset_id = str(metadata.get("mediaAssetId") or metadata.get("imageId") or f"image-{section_index + 1}-{block_index + 1}").strip()
            media_assets.append(
                {
                    "id": media_asset_id,
                    "url": url,
                    "pageNumber": _safe_int(metadata.get("pageNumber"), 0) or None,
                    "caption": str(content.get("caption") or content.get("alt") or "").strip() or None,
                    "anchorText": None,
                    "keywords": [],
                    "figureReferences": [],
                    "selectedSectionIndex": section_index,
                    "assignmentConfidence": (
                        round(float(metadata.get("assignmentConfidence")), 4)
                        if isinstance(metadata.get("assignmentConfidence"), (int, float))
                        else None
                    ),
                    "assignmentBreakdown": (
                        metadata.get("assignmentBreakdown")
                        if isinstance(metadata.get("assignmentBreakdown"), dict)
                        else {}
                    ),
                    "candidateSections": (
                        [{"sectionIndex": section_index, "score": round(float(metadata.get("assignmentConfidence")), 4)}]
                        if isinstance(metadata.get("assignmentConfidence"), (int, float))
                        else [{"sectionIndex": section_index, "score": 1.0}]
                    ),
                    "teacherReviewed": True,
                    "reviewState": "reviewed",
                }
            )
    return media_assets


def _normalize_extraction_block(block: Any, order_fallback: int) -> dict[str, Any]:
    if not isinstance(block, dict):
        return {
            "type": "text",
            "order": order_fallback,
            "content": {"text": str(block)},
            "metadata": {},
        }

    block_type = str(block.get("type") or "text").strip().lower()
    if block_type not in VALID_EXTRACTION_BLOCK_TYPES:
        block_type = "text"

    return {
        "type": block_type,
        "order": _safe_int(block.get("order"), order_fallback),
        "content": _normalize_block_content(block.get("content")),
        "metadata": block.get("metadata") if isinstance(block.get("metadata"), dict) else {},
    }


def _normalize_assessment_draft(draft: Any, *, section_title: str) -> dict[str, Any] | None:
    if not isinstance(draft, dict):
        return None

    raw_questions = draft.get("questions")
    if not isinstance(raw_questions, list):
        return None

    normalized_questions: list[dict[str, Any]] = []
    for index, raw_question in enumerate(raw_questions, start=1):
        if not isinstance(raw_question, dict):
            continue
        content = str(raw_question.get("content") or "").strip()
        if not content:
            continue
        question_type = str(
            raw_question.get("type") or draft.get("questionType") or "multiple_choice"
        ).strip().lower()
        if question_type not in VALID_QUESTION_TYPES:
            question_type = "multiple_choice"

        options_payload: list[dict[str, Any]] = []
        raw_options = raw_question.get("options")
        if isinstance(raw_options, list):
            for option_index, raw_option in enumerate(raw_options, start=1):
                if not isinstance(raw_option, dict):
                    continue
                option_text = str(raw_option.get("text") or "").strip()
                if not option_text:
                    continue
                options_payload.append(
                    {
                        "text": option_text,
                        "isCorrect": bool(raw_option.get("isCorrect")),
                        "order": _safe_int(raw_option.get("order"), option_index),
                    }
                )

        normalized_questions.append(
            {
                "content": content,
                "type": question_type,
                "points": max(1, _safe_int(raw_question.get("points"), 1)),
                "order": _safe_int(raw_question.get("order"), index),
                "explanation": str(raw_question.get("explanation") or "").strip() or None,
                "imageUrl": (
                    str(raw_question.get("imageUrl")).strip()
                    if isinstance(raw_question.get("imageUrl"), str)
                    else None
                ),
                "conceptTags": (
                    [str(tag) for tag in raw_question.get("conceptTags", []) if str(tag).strip()]
                    if isinstance(raw_question.get("conceptTags"), list)
                    else None
                ),
                "options": options_payload,
            }
        )

    if not normalized_questions:
        return None

    assessment_type = str(draft.get("type") or "quiz").strip().lower()
    if assessment_type not in VALID_ASSESSMENT_TYPES:
        assessment_type = "quiz"

    return {
        "title": str(draft.get("title") or f"{section_title} Checkpoint").strip(),
        "description": str(draft.get("description") or "").strip(),
        "type": assessment_type,
        "passingScore": _safe_int(draft.get("passingScore"), 60),
        "feedbackLevel": str(draft.get("feedbackLevel") or "standard").strip() or "standard",
        "questions": normalized_questions,
    }


def _derive_assessment_draft_from_blocks(
    *,
    section_title: str,
    blocks: list[dict[str, Any]],
) -> dict[str, Any] | None:
    question_blocks = [block for block in blocks if block.get("type") == "question"]
    if not question_blocks:
        return None

    normalized_questions: list[dict[str, Any]] = []
    for index, block in enumerate(question_blocks, start=1):
        content = block.get("content")
        question_text = ""
        if isinstance(content, dict):
            question_text = str(content.get("text") or "").strip()
        elif isinstance(content, str):
            question_text = content.strip()

        if not question_text:
            continue

        metadata = block.get("metadata") if isinstance(block.get("metadata"), dict) else {}
        normalized_questions.append(
            {
                "content": question_text,
                "type": "short_answer",
                "points": max(1, _safe_int(metadata.get("points"), 1)),
                "order": index,
                "explanation": None,
                "imageUrl": (
                    str(metadata.get("imageUrl")).strip()
                    if isinstance(metadata.get("imageUrl"), str)
                    else None
                ),
                "conceptTags": None,
                "options": [],
            }
        )

    if not normalized_questions:
        return None

    return {
        "title": f"{section_title} Checkpoint",
        "description": "Auto-generated checkpoint based on extracted question prompts.",
        "type": "quiz",
        "passingScore": 60,
        "feedbackLevel": "standard",
        "questions": normalized_questions,
    }


def _refresh_media_review_state(structured_content: dict[str, Any]) -> None:
    sections = structured_content.get("sections") if isinstance(structured_content.get("sections"), list) else []
    media_assets = structured_content.get("mediaAssets") if isinstance(structured_content.get("mediaAssets"), list) else []
    normalized_media_assets: list[dict[str, Any]] = []
    section_count = len(sections)

    for asset in media_assets:
        normalized = _normalize_media_asset(asset)
        if normalized is None:
            continue
        selected_index = normalized.get("selectedSectionIndex")
        if isinstance(selected_index, int) and (selected_index < 0 or selected_index >= section_count):
            normalized["selectedSectionIndex"] = None
            selected_index = None
        confidence = normalized.get("assignmentConfidence")
        if selected_index is None:
            normalized["teacherReviewed"] = False
            normalized["reviewState"] = "needs_teacher_assignment"
        elif not normalized.get("teacherReviewed") and isinstance(confidence, (int, float)) and confidence < LOW_CONFIDENCE_REVIEW_THRESHOLD:
            normalized["reviewState"] = "needs_teacher_review"
        elif normalized.get("teacherReviewed"):
            normalized["reviewState"] = "reviewed"
        else:
            normalized["teacherReviewed"] = True
            normalized["reviewState"] = "auto_assigned"
        normalized_media_assets.append(normalized)

    structured_content["mediaAssets"] = normalized_media_assets
    audit = structured_content.get("audit") if isinstance(structured_content.get("audit"), dict) else {}
    assigned = sum(1 for asset in normalized_media_assets if isinstance(asset.get("selectedSectionIndex"), int))
    unassigned = max(len(normalized_media_assets) - assigned, 0)
    needs_review = any(not bool(asset.get("teacherReviewed")) for asset in normalized_media_assets)
    image_summary = audit.get("imageAssignmentSummary") if isinstance(audit.get("imageAssignmentSummary"), dict) else {}
    image_summary.update(
        {
            "assigned": assigned,
            "unassigned": unassigned,
            "reusedByCitation": int(image_summary.get("reusedByCitation") or 0),
        }
    )
    audit["imageAssignmentSummary"] = image_summary
    review_flags = [str(flag) for flag in audit.get("reviewFlags", []) if str(flag).strip()]
    if unassigned > 0 and "image-unassigned" not in review_flags:
        review_flags.append("image-unassigned")
    if needs_review and "image-review-pending" not in review_flags:
        review_flags.append("image-review-pending")
    audit["reviewFlags"] = review_flags
    quality_gate = str(audit.get("qualityGate") or "pass").strip().lower()
    audit["reviewRequired"] = quality_gate == "fail" or needs_review
    structured_content["audit"] = audit


def _block_text_for_apply(block: dict[str, Any]) -> str:
    content = block.get("content")
    if isinstance(content, dict):
        return str(content.get("text") or "").strip()
    if isinstance(content, str):
        return content.strip()
    return ""


def _block_has_usable_content(block: dict[str, Any]) -> bool:
    block_type = str(block.get("type") or "").strip().lower()
    if block_type == "image":
        content = block.get("content")
        return isinstance(content, dict) and isinstance(content.get("url"), str) and bool(content.get("url").strip())
    if block_type == "divider":
        return False
    return bool(_block_text_for_apply(block))


def _prepare_section_for_apply(section_data: dict[str, Any], *, fallback_title: str) -> dict[str, Any]:
    section_title = str(section_data.get("title") or fallback_title).strip()
    section_description = str(section_data.get("description") or "").strip()
    blocks = section_data.get("lessonBlocks")
    if not isinstance(blocks, list):
        blocks = section_data.get("blocks")
    if not isinstance(blocks, list):
        blocks = []

    normalized_blocks: list[dict[str, Any]] = []
    seen_text_blocks: set[tuple[str, str]] = set()
    for idx, block in enumerate(blocks, start=1):
        normalized_block = _normalize_extraction_block(block, idx)
        block_type = str(normalized_block.get("type") or "text").strip().lower()
        text = _block_text_for_apply(normalized_block)
        if block_type == "text" and text and len(text) < VERY_SHORT_APPLY_TEXT_THRESHOLD:
            continue
        if block_type != "image":
            if not text:
                continue
            key = (block_type, re.sub(r"\s+", " ", text).strip().lower())
            if key in seen_text_blocks:
                continue
            seen_text_blocks.add(key)
        elif not _block_has_usable_content(normalized_block):
            continue
        normalized_blocks.append(normalized_block)

    if not section_title:
        raise HTTPException(400, "Selected extraction section is missing a title.")
    if not any(_block_has_usable_content(block) for block in normalized_blocks):
        raise HTTPException(400, f'Section "{section_title}" has no usable lesson blocks to apply.')

    return {
        "title": section_title,
        "description": section_description,
        "lessonBlocks": normalized_blocks,
        "assessmentDraft": _normalize_assessment_draft(
            section_data.get("assessmentDraft"),
            section_title=section_title,
        ),
    }


def _normalize_extraction_section(section: Any, index: int) -> dict[str, Any]:
    if not isinstance(section, dict):
        fallback_title = f"Section {index + 1}"
        blocks = [_normalize_extraction_block(section, 1)]
        return {
            "title": fallback_title,
            "description": "",
            "order": index + 1,
            "lessonBlocks": blocks,
            "assessmentDraft": _derive_assessment_draft_from_blocks(
                section_title=fallback_title,
                blocks=blocks,
            ),
            "confidence": None,
        }

    title = str(section.get("title") or section.get("sectionTitle") or f"Section {index + 1}").strip()
    description = str(section.get("description") or section.get("sectionDescription") or "").strip()
    order = _safe_int(section.get("order"), index + 1)
    raw_blocks = section.get("lessonBlocks")
    if not isinstance(raw_blocks, list):
        raw_blocks = section.get("blocks")
    if not isinstance(raw_blocks, list):
        raw_blocks = []
    lesson_blocks = [
        _normalize_extraction_block(block, block_index)
        for block_index, block in enumerate(raw_blocks, start=1)
    ]
    confidence = section.get("confidence")
    normalized_draft = _normalize_assessment_draft(
        section.get("assessmentDraft"),
        section_title=title,
    )
    if normalized_draft is None:
        normalized_draft = _derive_assessment_draft_from_blocks(
            section_title=title,
            blocks=lesson_blocks,
        )

    return {
        "title": title,
        "description": description,
        "order": order,
        "lessonBlocks": lesson_blocks,
        "assessmentDraft": normalized_draft,
        "confidence": float(confidence) if isinstance(confidence, (int, float)) else None,
        "graphKeywords": _normalize_string_list(section.get("graphKeywords")),
        "figureReferences": _normalize_string_list(section.get("figureReferences")),
    }


def _normalize_structured_content(payload: Any) -> dict[str, Any]:
    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except json.JSONDecodeError:
            payload = {}

    if not isinstance(payload, dict):
        payload = {}

    title = str(payload.get("title") or "Extracted Module").strip()
    description = str(payload.get("description") or "").strip()
    audit = payload.get("audit") if isinstance(payload.get("audit"), dict) else {}

    raw_sections = payload.get("sections")
    if not isinstance(raw_sections, list):
        legacy_lessons = payload.get("lessons")
        if isinstance(legacy_lessons, list):
            raw_sections = [
                {
                    "title": lesson.get("title") if isinstance(lesson, dict) else f"Section {idx + 1}",
                    "description": lesson.get("description") if isinstance(lesson, dict) else "",
                    "order": idx + 1,
                    "lessonBlocks": lesson.get("blocks") if isinstance(lesson, dict) else [],
                }
                for idx, lesson in enumerate(legacy_lessons)
            ]
        else:
            raw_sections = []

    sections = [
        _normalize_extraction_section(section, index)
        for index, section in enumerate(raw_sections)
    ]

    raw_media_assets = payload.get("mediaAssets")
    if not isinstance(raw_media_assets, list):
        raw_media_assets = []
    media_assets = []
    for asset in raw_media_assets:
        normalized_asset = _normalize_media_asset(asset)
        if normalized_asset is not None:
            media_assets.append(normalized_asset)
    if not media_assets:
        media_assets = _synthesize_media_assets_from_sections(sections)

    structured_content = {
        "title": title,
        "description": description,
        "sections": sections,
        "audit": audit,
        "mediaAssets": media_assets,
    }
    _refresh_media_review_state(structured_content)
    return structured_content


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

    file_path = await materialize_backend_upload(str(file["file_path"]))
    if not file_path or not os.path.exists(file_path):
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
        "message": "Extraction queued â€” poll GET /extractions/:id/status for progress",
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
    structured_content = _normalize_structured_content(
        extraction.get("structured_content"),
    )
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
        structured_content = _normalize_structured_content(
            item.get("structured_content"),
        )
        item["structured_content"] = structured_content
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
    structured_content = _normalize_structured_content(
        extraction_data.get("structured_content"),
    )
    extraction_data["structured_content"] = structured_content
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
            "SELECT id, extraction_status, is_applied, teacher_id, structured_content "
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
            f'Extraction is "{extraction["extraction_status"]}" - only completed extractions can be edited',
        )
    if extraction["is_applied"]:
        raise HTTPException(400, "This extraction has already been applied and cannot be edited")

    existing_content = _normalize_structured_content(extraction.get("structured_content"))
    raw_sections: list[Any]
    if body.sections is not None:
        raw_sections = [
            section.model_dump(by_alias=True)
            if hasattr(section, "model_dump")
            else dict(section)
            for section in body.sections
        ]
    elif body.lessons is not None:
        raw_sections = []
        for index, lesson in enumerate(body.lessons, start=1):
            lesson_payload = lesson.model_dump() if hasattr(lesson, "model_dump") else dict(lesson)
            raw_sections.append(
                {
                    "title": lesson_payload.get("title") or f"Section {index}",
                    "description": lesson_payload.get("description") or "",
                    "order": index,
                    "lessonBlocks": lesson_payload.get("blocks") or [],
                }
            )
    else:
        raw_sections = existing_content.get("sections") or []

    raw_media_assets: list[Any]
    if body.media_assets is not None:
        raw_media_assets = [
            asset.model_dump(by_alias=True)
            if hasattr(asset, "model_dump")
            else dict(asset)
            for asset in body.media_assets
        ]
    else:
        raw_media_assets = existing_content.get("mediaAssets") or []

    structured_content = _normalize_structured_content(
        {
            "title": body.title if body.title is not None else existing_content.get("title"),
            "description": (
                body.description
                if body.description is not None
                else existing_content.get("description")
            ),
            "sections": raw_sections,
            "audit": existing_content.get("audit") or {},
            "mediaAssets": raw_media_assets,
        }
    )

    await db.execute(
        sa_text(
            "UPDATE extracted_modules "
            "SET structured_content = :sc::jsonb, updated_at = NOW() "
            "WHERE id = :id"
        ),
        {"sc": json.dumps(structured_content), "id": extraction_id},
    )
    await db.commit()

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
        raise HTTPException(
            400,
            f'Extraction is "{extraction["extraction_status"]}" - only completed extractions can be applied',
        )
    if extraction["is_applied"]:
        raise HTTPException(400, "This extraction has already been applied")

    content = _normalize_structured_content(extraction["structured_content"])
    audit = content.get("audit") if isinstance(content.get("audit"), dict) else {}
    quality_gate = str(audit.get("qualityGate") or "pass").strip().lower()
    if quality_gate == "fail":
        raise HTTPException(400, "Extraction quality is too low to apply. Review or rerun the extraction first.")
    if bool(audit.get("reviewRequired")):
        raise HTTPException(400, "Extraction still requires teacher review before it can be applied.")
    all_sections = content.get("sections") or []
    if not all_sections:
        raise HTTPException(400, "No sections found in extraction result")

    selected_indices = (
        body.section_indices
        if body.section_indices is not None
        else body.lesson_indices
    )
    if selected_indices:
        invalid = [i for i in selected_indices if i < 0 or i >= len(all_sections)]
        if invalid:
            raise HTTPException(
                400,
                f"Invalid section indices: {invalid}. Valid range: 0-{len(all_sections) - 1}",
            )
        sections_to_apply = [(all_sections[i], i) for i in selected_indices]
    else:
        sections_to_apply = [(section, i) for i, section in enumerate(all_sections)]

    prepared_sections = [
        (
            _prepare_section_for_apply(
                section_data,
                fallback_title=f"Section {source_section_index + 1}",
            ),
            source_section_index,
        )
        for section_data, source_section_index in sections_to_apply
    ]

    class_id = extraction["class_id"]

    cls_row = await db.execute(
        sa_text("SELECT id FROM classes WHERE id = :id"),
        {"id": class_id},
    )
    if not cls_row.first():
        raise HTTPException(404, f'Class "{class_id}" not found')

    module_order_row = await db.execute(
        sa_text(
            'SELECT "order" FROM class_modules WHERE class_id = :cid ORDER BY "order" DESC LIMIT 1'
        ),
        {"cid": class_id},
    )
    module_order = (_safe_int(module_order_row.scalar(), 0)) + 1

    raw_module_title = str(content.get("title") or f"Extracted Module {module_order}").strip()
    module_title = raw_module_title
    suffix = 2
    while True:
        title_row = await db.execute(
            sa_text(
                "SELECT id FROM class_modules WHERE class_id = :cid AND lower(title) = lower(:title) LIMIT 1"
            ),
            {"cid": class_id, "title": module_title},
        )
        if not title_row.first():
            break
        module_title = f"{raw_module_title} ({suffix})"
        suffix += 1

    module_insert = await db.execute(
        sa_text(
            'INSERT INTO class_modules (class_id, title, description, "order", is_visible, is_locked, teacher_notes) '
            "VALUES (:classId, :title, :description, :order, false, true, :teacherNotes) "
            "RETURNING id, title"
        ),
        {
            "classId": class_id,
            "title": module_title,
            "description": str(content.get("description") or "").strip(),
            "order": module_order,
            "teacherNotes": (
                f"Created from extraction {extraction_id}. "
                "Hidden and locked by default until teacher review."
            ),
        },
    )
    module_row = module_insert.mappings().first()
    if not module_row:
        raise HTTPException(500, "Failed to create class module from extraction")
    module_id = str(module_row["id"])

    lesson_order_row = await db.execute(
        sa_text(
            'SELECT "order" FROM lessons WHERE class_id = :cid ORDER BY "order" DESC LIMIT 1'
        ),
        {"cid": class_id},
    )
    lesson_order = (_safe_int(lesson_order_row.scalar(), 0)) + 1

    created_lessons: list[dict[str, Any]] = []
    created_sections: list[dict[str, Any]] = []
    created_assessments: list[dict[str, Any]] = []
    allowed_feedback_levels = {"immediate", "standard", "detailed"}

    for section_offset, (section_data, source_section_index) in enumerate(
        prepared_sections,
        start=1,
    ):
        section_title = str(section_data.get("title") or f"Section {section_offset}").strip()
        section_description = str(section_data.get("description") or "").strip()
        section_insert = await db.execute(
            sa_text(
                'INSERT INTO module_sections (module_id, title, description, "order") '
                "VALUES (:moduleId, :title, :description, :order) "
                "RETURNING id, title"
            ),
            {
                "moduleId": module_id,
                "title": section_title,
                "description": section_description,
                "order": section_offset,
            },
        )
        module_section = section_insert.mappings().first()
        if not module_section:
            raise HTTPException(500, "Failed to create module section from extraction")
        module_section_id = str(module_section["id"])
        created_sections.append(
            {
                "id": module_section_id,
                "title": str(module_section["title"]),
                "sourceSectionIndex": source_section_index,
            }
        )

        lesson_insert = await db.execute(
            sa_text(
                'INSERT INTO lessons (title, description, class_id, "order", is_draft, source_extraction_id) '
                "VALUES (:title, :desc, :classId, :order, true, :extractionId) "
                "RETURNING id, title"
            ),
            {
                "title": section_title or f"Lesson {lesson_order}",
                "desc": section_description,
                "classId": class_id,
                "order": lesson_order,
                "extractionId": extraction_id,
            },
        )
        new_lesson = lesson_insert.mappings().first()
        lesson_order += 1
        if not new_lesson:
            raise HTTPException(500, "Failed to create lesson from extracted section")

        blocks = section_data.get("lessonBlocks")
        if not isinstance(blocks, list):
            blocks = []

        for idx, block in enumerate(blocks):
            normalized_block = _normalize_extraction_block(block, idx + 1)
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
                    "type": normalized_block.get("type"),
                    "order": _safe_int(normalized_block.get("order"), idx),
                    "content": normalized_block.get("content") or {},
                    "metadata": normalized_block.get("metadata") or {},
                },
            )

        await db.execute(
            sa_text(
                'INSERT INTO module_items (module_section_id, item_type, lesson_id, "order", is_visible, is_required, is_given, metadata) '
                "VALUES (:sectionId, 'lesson', :lessonId, 1, false, false, true, :metadata)"
            ).bindparams(bindparam("metadata", type_=postgresql.JSONB)),
            {
                "sectionId": module_section_id,
                "lessonId": new_lesson["id"],
                "metadata": {
                    "sourceExtractionId": extraction_id,
                    "sourceSectionIndex": source_section_index,
                    "sourceSectionTitle": section_title,
                },
            },
        )

        created_lessons.append({"id": new_lesson["id"], "title": new_lesson["title"]})

        assessment_draft = section_data.get("assessmentDraft")
        if assessment_draft and isinstance(assessment_draft.get("questions"), list):
            questions = assessment_draft["questions"]
            if questions:
                feedback_level = str(assessment_draft.get("feedbackLevel") or "standard").strip().lower()
                if feedback_level not in allowed_feedback_levels:
                    feedback_level = "standard"
                assessment_type = str(assessment_draft.get("type") or "quiz").strip().lower()
                if assessment_type not in VALID_ASSESSMENT_TYPES:
                    assessment_type = "quiz"

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
                          is_published,
                          ai_origin
                        )
                        VALUES (
                          :title,
                          :description,
                          :classId,
                          :assessmentType,
                          :totalPoints,
                          :passingScore,
                          :feedbackLevel,
                          false,
                          'ai_extraction_draft'
                        )
                        RETURNING id, title
                        """
                    ),
                    {
                        "title": str(assessment_draft.get("title") or f"{section_title} Checkpoint"),
                        "description": str(assessment_draft.get("description") or "").strip(),
                        "classId": class_id,
                        "assessmentType": assessment_type,
                        "totalPoints": sum(
                            max(1, _safe_int(question.get("points"), 1))
                            for question in questions
                        ),
                        "passingScore": max(1, _safe_int(assessment_draft.get("passingScore"), 60)),
                        "feedbackLevel": feedback_level,
                    },
                )
                assessment_row = assessment_insert.mappings().first()
                if not assessment_row:
                    raise HTTPException(500, "Failed to create assessment from section draft")
                assessment_id = str(assessment_row["id"])

                for question_index, question in enumerate(questions, start=1):
                    question_type = str(question.get("type") or "multiple_choice").strip().lower()
                    if question_type not in VALID_QUESTION_TYPES:
                        question_type = "short_answer"
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
                              image_url,
                              concept_tags
                            )
                            VALUES (
                              :assessmentId,
                              :type,
                              :content,
                              :points,
                              :order,
                              :explanation,
                              :imageUrl,
                              :conceptTags
                            )
                            RETURNING id
                            """
                        ).bindparams(bindparam("conceptTags", type_=postgresql.JSONB)),
                        {
                            "assessmentId": assessment_id,
                            "type": question_type,
                            "content": str(question.get("content") or "").strip(),
                            "points": max(1, _safe_int(question.get("points"), 1)),
                            "order": _safe_int(question.get("order"), question_index),
                            "explanation": (
                                str(question.get("explanation")).strip()
                                if isinstance(question.get("explanation"), str)
                                else None
                            ),
                            "imageUrl": (
                                str(question.get("imageUrl")).strip()
                                if isinstance(question.get("imageUrl"), str)
                                else None
                            ),
                            "conceptTags": (
                                [str(tag).strip() for tag in question.get("conceptTags", []) if str(tag).strip()]
                                if isinstance(question.get("conceptTags"), list)
                                else []
                            ),
                        },
                    )
                    question_id = question_insert.scalar_one()
                    options = question.get("options")
                    if isinstance(options, list):
                        for option_index, option in enumerate(options, start=1):
                            if not isinstance(option, dict):
                                continue
                            option_text = str(option.get("text") or "").strip()
                            if not option_text:
                                continue
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
                                    "text": option_text,
                                    "isCorrect": bool(option.get("isCorrect")),
                                    "order": _safe_int(option.get("order"), option_index),
                                },
                            )

                await db.execute(
                    sa_text(
                        'INSERT INTO module_items (module_section_id, item_type, assessment_id, "order", is_visible, is_required, is_given, metadata) '
                        "VALUES (:sectionId, 'assessment', :assessmentId, 2, false, false, false, :metadata)"
                    ).bindparams(bindparam("metadata", type_=postgresql.JSONB)),
                    {
                        "sectionId": module_section_id,
                        "assessmentId": assessment_id,
                        "metadata": {
                            "sourceExtractionId": extraction_id,
                            "sourceSectionIndex": source_section_index,
                            "sourceSectionTitle": section_title,
                        },
                    },
                )
                created_assessments.append(
                    {"id": assessment_id, "title": str(assessment_row["title"])}
                )

    await db.execute(
        sa_text(
            "UPDATE extracted_modules "
            "SET is_applied = true, extraction_status = 'applied', structured_content = :sc, updated_at = NOW() "
            "WHERE id = :id"
        ).bindparams(bindparam("sc", type_=postgresql.JSONB)),
        {"id": extraction_id, "sc": content},
    )
    await db.commit()
    index_result = await reindex_class_content(db, str(class_id))

    return {
        "success": True,
        "message": (
            f"Created module with {len(created_sections)} section(s), "
            f"{len(created_lessons)} lesson draft(s), and {len(created_assessments)} assessment draft(s)"
        ),
        "data": {
            "classId": class_id,
            "extractionId": extraction_id,
            "moduleId": module_id,
            "sectionsCreated": len(created_sections),
            "lessonsCreated": len(created_lessons),
            "assessmentsCreated": len(created_assessments),
            "totalSectionsAvailable": len(all_sections),
            "totalLessonsAvailable": len(all_sections),
            "sections": created_sections,
            "lessons": created_lessons,
            "assessments": created_assessments,
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


@app.get("/admin/history")
async def admin_chat_history(
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _assert_admin_analytics_access(user)

    rows = await db.execute(
        sa_text(
            "SELECT session_id, session_type, input_text, output_text, created_at, context_metadata "
            "FROM ai_interaction_logs "
            "WHERE user_id = :uid AND session_type = :sessionType "
            "ORDER BY created_at DESC LIMIT 60"
        ),
        {
            "uid": user.id,
            "sessionType": ADMIN_ANALYTICS_SESSION_TYPE,
        },
    )
    data = _normalize_admin_history_summary([dict(r) for r in rows.mappings()])

    return {
        "success": True,
        "message": "Admin chat history loaded.",
        "data": data,
    }


@app.get("/admin/sessions/{session_id}")
async def admin_chat_session(
    session_id: str,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _assert_admin_analytics_access(user)

    rows = await db.execute(
        sa_text(
            "SELECT id, session_id, session_type, input_text, output_text, created_at, context_metadata "
            "FROM ai_interaction_logs "
            "WHERE user_id = :uid AND session_id = :sid "
            "AND session_type = :sessionType "
            "ORDER BY created_at ASC"
        ),
        {
            "uid": user.id,
            "sid": session_id,
            "sessionType": ADMIN_ANALYTICS_SESSION_TYPE,
        },
    )
    data = [dict(r) for r in rows.mappings()]
    if not data:
        raise HTTPException(404, "Admin analytics session not found.")

    return {
        "success": True,
        "message": "Admin chat session loaded.",
        "data": _build_admin_session_payload(session_id, data),
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
        task = loop.create_task(
            _run_intervention_generation_job(job_id, case_id, body.note, user)
        )
        AI_JOB_TASKS[job_id] = task
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
        max_attempts=QUIZ_JOB_MAX_ATTEMPTS,
    )

    try:
        loop = asyncio.get_running_loop()
        task = loop.create_task(_run_quiz_generation_job(job_id, body, user))
        AI_JOB_TASKS[job_id] = task
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
    if job["output_type"] == "intervention_recommendation":
        result_data = _normalize_intervention_structured_output(result_data)
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
# DELETE /teacher/jobs/:id
# ---------------------------------------------------------------------------


@app.delete("/teacher/jobs/{job_id}")
async def delete_teacher_ai_job(
    job_id: str,
    user: RequestUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job, _runtime, assessment_id = await _load_ai_job_context(db, job_id, user)
    task = AI_JOB_TASKS.get(job_id)
    if task and not task.done():
        task.cancel()
        try:
            await asyncio.wait_for(task, timeout=2)
        except asyncio.CancelledError:
            pass
        except asyncio.TimeoutError:
            logger.warning("[ai-job] Timed out waiting for cancellation of %s", job_id)
        except Exception as err:
            logger.warning("[ai-job] Cancellation wait for %s ended with %s", job_id, err)
    AI_JOB_TASKS.pop(job_id, None)

    status_message = (
        "Draft removed"
        if job.get("output_id") or assessment_id
        else "Generation cancelled"
    )
    await _update_ai_job_status(
        db,
        job_id=job_id,
        status="cancelled",
        error_message="Generation cancelled by teacher.",
        output_status="cancelled",
    )
    await _record_ai_job_runtime(
        db,
        job_id=job_id,
        progressPercent=100,
        statusMessage=status_message,
        errorMessage="Generation cancelled by teacher.",
    )

    return {
        "success": True,
        "message": "AI generation job cancelled",
        "data": {
            "jobId": job_id,
            "jobType": job.get("job_type") or "quiz_generation",
            "status": "cancelled",
            "progressPercent": 100,
            "statusMessage": status_message,
            "assessmentId": assessment_id,
            "updatedAt": datetime.now(timezone.utc).isoformat(),
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
    index_status, _ = await _ensure_quiz_sources_ready(
        db,
        class_id=body.class_id,
        lesson_ids=body.lesson_ids,
        extraction_ids=body.extraction_ids,
    )
    data = await generate_quiz_draft(db, user, body)
    index_result = await reindex_class_content(db, body.class_id)
    return {
        "success": True,
        "message": "AI draft assessment created",
        "data": {
            **data,
            "indexStatus": index_status,
            "indexing": index_result,
        },
    }


