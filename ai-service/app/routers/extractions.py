from __future__ import annotations

import json
import uuid
from collections.abc import Callable
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy import text as sa_text
from sqlalchemy import bindparam
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..extraction_job_service import (
    create_pending_extraction,
    mark_pending_extraction_failed,
)
from ..extraction_pipeline import ExtractionCancelled, run_extraction
from ..schemas import ExtractRequest, RequestUser


EXTRACTION_EXECUTION_LEASE_SECONDS = 16 * 60


def _safe_int(value: Any, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _parse_worker_attempt(meta: dict[str, Any]) -> int:
    raw_attempt = meta.get("attempt", 1)
    if isinstance(raw_attempt, bool):
        raise HTTPException(400, "Worker metadata attempt must be a positive integer")
    try:
        attempt = int(raw_attempt)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            400,
            "Worker metadata attempt must be a positive integer",
        ) from exc
    if attempt < 1:
        raise HTTPException(400, "Worker metadata attempt must be a positive integer")
    return attempt


async def _claim_extraction_execution(
    db: AsyncSession,
    *,
    extraction_id: str,
    allow_stale_processing: bool,
    allow_superseding_retry: bool,
    previous_lease_id: str | None,
    structured_content: dict[str, Any],
    runtime_patch: dict[str, Any],
) -> bool:
    claimed_content = dict(structured_content or {})
    audit = dict(claimed_content.get("audit") or {})
    audit.update(runtime_patch)
    claimed_content["audit"] = audit
    result = await db.execute(
        sa_text(
            f"""
            UPDATE extracted_modules
            SET
              extraction_status = 'processing',
              error_message = NULL,
              structured_content = :structuredContent,
              updated_at = NOW()
            WHERE id = :id
              AND (
                extraction_status IN ('pending', 'failed')
                OR (
                  :allowStaleProcessing = TRUE
                  AND extraction_status = 'processing'
                  AND updated_at < NOW() - INTERVAL '{EXTRACTION_EXECUTION_LEASE_SECONDS} seconds'
                )
                OR (
                  :allowSupersedingRetry = TRUE
                  AND extraction_status = 'processing'
                  AND structured_content -> 'audit' ->> 'workerLeaseId' = :previousLeaseId
                )
              )
            RETURNING id
            """
        ).bindparams(bindparam("structuredContent", type_=postgresql.JSONB)),
        {
            "id": extraction_id,
            "allowStaleProcessing": allow_stale_processing,
            "allowSupersedingRetry": allow_superseding_retry,
            "previousLeaseId": previous_lease_id,
            "structuredContent": claimed_content,
        },
    )
    claimed = result.mappings().first() is not None
    await db.commit()
    return claimed


def _as_utc_datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    else:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _superseding_bullmq_retry(
    audit: dict[str, Any],
    meta: dict[str, Any],
    attempt: int,
) -> tuple[bool, str | None]:
    current_job_id = str(audit.get("bullmqJobId") or "")
    requested_job_id = str(meta.get("bullmqJobId") or "")
    try:
        current_attempt = int(audit.get("attempt") or 0)
    except (TypeError, ValueError):
        current_attempt = 0
    previous_lease_id = str(audit.get("workerLeaseId") or "") or None
    allowed = bool(
        requested_job_id
        and requested_job_id == current_job_id
        and attempt > current_attempt
        and previous_lease_id
    )
    return allowed, previous_lease_id


def build_extraction_router(
    get_current_user: Callable[..., RequestUser],
    require_internal_service: Callable[..., None],
):
    router = APIRouter()

    @router.post("/extract", status_code=202)
    async def extract_module(
        body: ExtractRequest,
        user: RequestUser = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ):
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
        if "admin" not in user.roles and str(file["teacher_id"]) != user.id:
            raise HTTPException(403, "You can only extract your own files")

        extraction_id = await create_pending_extraction(
            db,
            file_id=str(file["id"]),
            class_id=str(file["class_id"]),
            teacher_id=user.id,
            target_section_count=body.target_section_count,
            extraction_style=body.extraction_style,
        )
        return {
            "success": True,
            "message": "Extraction queued — poll GET /extractions/:id/status for progress",
            "data": {"extractionId": extraction_id, "status": "pending"},
        }

    @router.post("/internal/extractions/{extraction_id}/run")
    async def run_internal_extraction(
        extraction_id: uuid.UUID,
        meta: dict[str, Any] | None = Body(None),
        _auth: None = Depends(require_internal_service),
        db: AsyncSession = Depends(get_db),
    ):
        extraction_id = str(extraction_id)
        row = await db.execute(
            sa_text(
                "SELECT id, file_id, teacher_id, extraction_status, structured_content, updated_at "
                "FROM extracted_modules WHERE id = :id"
            ),
            {"id": extraction_id},
        )
        extraction = row.mappings().first()
        if not extraction:
            raise HTTPException(404, f'Extraction "{extraction_id}" not found')
        status = str(extraction["extraction_status"])
        if status in {"completed", "applied"}:
            return {
                "success": True,
                "message": f"Extraction already {status}",
                "data": {"extractionId": extraction_id, "status": status},
            }

        structured_content = extraction.get("structured_content") or {}
        if isinstance(structured_content, str):
            structured_content = json.loads(structured_content)
        audit = (
            structured_content.get("audit")
            if isinstance(structured_content, dict)
            else {}
        )
        audit = audit if isinstance(audit, dict) else {}
        if status == "failed" and audit.get("cancelRequested"):
            return {
                "success": True,
                "message": "Extraction was cancelled",
                "data": {"extractionId": extraction_id, "status": "failed"},
            }
        if status == "failed" and audit.get("queueCompensated") is True:
            return {
                "success": True,
                "message": "Extraction was not queued",
                "data": {"extractionId": extraction_id, "status": "failed"},
            }

        meta_dict = meta if isinstance(meta, dict) else {}
        attempt = _parse_worker_attempt(meta_dict)
        updated_at = _as_utc_datetime(extraction.get("updated_at"))
        is_stale_processing = bool(
            updated_at
            and datetime.now(timezone.utc) - updated_at
            > timedelta(seconds=EXTRACTION_EXECUTION_LEASE_SECONDS)
        )
        allow_superseding_retry, previous_lease_id = _superseding_bullmq_retry(
            audit,
            meta_dict,
            attempt,
        )
        if status == "processing":
            if attempt <= 1 or not (is_stale_processing or allow_superseding_retry):
                raise HTTPException(
                    409,
                    f"Extraction {extraction_id} is already processing",
                )

        execution_lease_id = str(uuid.uuid4())
        runtime_patch = {
            "broker": "bullmq",
            "attempt": attempt,
            "bullmqJobId": meta_dict.get("bullmqJobId"),
            "workerStartedAt": datetime.now(timezone.utc).isoformat(),
            "workerLeaseId": execution_lease_id,
        }
        claimed = await _claim_extraction_execution(
            db,
            extraction_id=extraction_id,
            allow_stale_processing=attempt > 1 and is_stale_processing,
            allow_superseding_retry=allow_superseding_retry,
            previous_lease_id=previous_lease_id,
            structured_content=structured_content,
            runtime_patch=runtime_patch,
        )
        if not claimed:
            raise HTTPException(
                409,
                f"Extraction {extraction_id} was claimed by another worker",
            )

        target_section_count = _safe_int(audit.get("requestedSectionCount"), 4)
        if target_section_count not in {3, 4, 5}:
            target_section_count = 4
        extraction_style = str(audit.get("extractionStyle") or "clean")
        if extraction_style not in {"faithful", "clean", "student_friendly"}:
            extraction_style = "clean"

        try:
            await run_extraction(
                db,
                extraction_id,
                str(extraction["file_id"]),
                str(extraction["teacher_id"]),
                target_section_count=target_section_count,
                extraction_style=extraction_style,
                execution_lease_id=execution_lease_id,
                raise_on_failure=True,
            )
        except ExtractionCancelled:
            return {
                "success": True,
                "message": "Extraction was cancelled",
                "data": {"extractionId": extraction_id, "status": "failed"},
            }
        return {
            "success": True,
            "message": "Extraction execution finished",
            "data": {"extractionId": extraction_id, "status": "completed"},
        }

    @router.post("/internal/extractions/{extraction_id}/fail")
    async def fail_pending_internal_extraction(
        extraction_id: uuid.UUID,
        payload: dict[str, Any] | None = Body(None),
        _auth: None = Depends(require_internal_service),
        db: AsyncSession = Depends(get_db),
    ):
        extraction_id = str(extraction_id)
        payload_dict = payload if isinstance(payload, dict) else {}
        reason = str(payload_dict.get("reason") or "Extraction queueing failed")
        await mark_pending_extraction_failed(db, extraction_id, reason)
        return {
            "success": True,
            "message": "Pending extraction marked failed",
            "data": {"extractionId": extraction_id, "status": "failed"},
        }

    return (
        router,
        extract_module,
        run_internal_extraction,
        fail_pending_internal_extraction,
    )
