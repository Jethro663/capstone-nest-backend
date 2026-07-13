from __future__ import annotations

import json
from collections.abc import Callable
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy import text as sa_text
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..extraction_job_service import (
    create_pending_extraction,
    mark_pending_extraction_failed,
)
from ..extraction_pipeline import run_extraction
from ..schemas import ExtractRequest, RequestUser


def _safe_int(value: Any, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


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
        extraction_id: str,
        meta: dict[str, Any] | None = Body(None),
        _auth: None = Depends(require_internal_service),
        db: AsyncSession = Depends(get_db),
    ):
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
        if status == "completed":
            return {
                "success": True,
                "message": "Extraction already completed",
                "data": {"extractionId": extraction_id, "status": "completed"},
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

        meta_dict = meta if isinstance(meta, dict) else {}
        attempt = int(meta_dict.get("attempt", 1))
        updated_at = _as_utc_datetime(extraction.get("updated_at"))
        is_stale_processing = bool(
            updated_at
            and datetime.now(timezone.utc) - updated_at > timedelta(minutes=6)
        )
        if status in {"processing", "running"}:
            if attempt <= 1 or not is_stale_processing:
                raise HTTPException(
                    409,
                    f"Extraction {extraction_id} is already running",
                )

        target_section_count = _safe_int(audit.get("requestedSectionCount"), 4)
        if target_section_count not in {3, 4, 5}:
            target_section_count = 4
        extraction_style = str(audit.get("extractionStyle") or "clean")
        if extraction_style not in {"faithful", "clean", "student_friendly"}:
            extraction_style = "clean"

        await run_extraction(
            db,
            extraction_id,
            str(extraction["file_id"]),
            str(extraction["teacher_id"]),
            target_section_count=target_section_count,
            extraction_style=extraction_style,
            raise_on_failure=True,
        )
        return {
            "success": True,
            "message": "Extraction execution finished",
            "data": {"extractionId": extraction_id, "status": "completed"},
        }

    @router.post("/internal/extractions/{extraction_id}/fail")
    async def fail_pending_internal_extraction(
        extraction_id: str,
        payload: dict[str, Any] | None = Body(None),
        _auth: None = Depends(require_internal_service),
        db: AsyncSession = Depends(get_db),
    ):
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
