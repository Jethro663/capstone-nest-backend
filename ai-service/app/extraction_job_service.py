from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import bindparam, text as sa_text
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import AsyncSession


def build_pending_extraction_content(
    *,
    target_section_count: int,
    extraction_style: str,
    retry_of_extraction_id: str | None = None,
) -> dict[str, Any]:
    audit: dict[str, Any] = {
        "requestedSectionCount": target_section_count,
        "finalSectionCount": 0,
        "extractionStyle": extraction_style,
        "reviewIssues": [],
        "reviewState": "pending",
    }
    if retry_of_extraction_id:
        audit["retryOfExtractionId"] = retry_of_extraction_id
    return {
        "title": "",
        "description": "",
        "sections": [],
        "mediaAssets": [],
        "audit": audit,
    }


async def create_pending_extraction(
    db: AsyncSession,
    *,
    file_id: str,
    class_id: str,
    teacher_id: str,
    target_section_count: int,
    extraction_style: str,
    retry_of_extraction_id: str | None = None,
) -> str:
    structured_content = build_pending_extraction_content(
        target_section_count=target_section_count,
        extraction_style=extraction_style,
        retry_of_extraction_id=retry_of_extraction_id,
    )
    result = await db.execute(
        sa_text(
            "INSERT INTO extracted_modules "
            "(file_id, class_id, teacher_id, raw_text, structured_content, extraction_status, progress_percent) "
            "VALUES (:fileId, :classId, :teacherId, '', :structuredContent, 'pending', 0) "
            "RETURNING id"
        ).bindparams(bindparam("structuredContent", type_=postgresql.JSONB)),
        {
            "fileId": file_id,
            "classId": class_id,
            "teacherId": teacher_id,
            "structuredContent": structured_content,
        },
    )
    await db.commit()
    return str(result.scalar_one())


async def mark_pending_extraction_failed(
    db: AsyncSession,
    extraction_id: str,
    reason: str,
) -> None:
    finished_at = datetime.now(timezone.utc).isoformat()
    await db.execute(
        sa_text(
            """
            UPDATE extracted_modules
            SET
              extraction_status = 'failed',
              error_message = :reason,
              progress_percent = 0,
              structured_content = jsonb_set(
                COALESCE(structured_content, '{}'::jsonb),
                '{audit}',
                COALESCE(structured_content -> 'audit', '{}'::jsonb)
                  || jsonb_build_object(
                    'queueCompensated', TRUE,
                    'reviewState', 'failed',
                    'errorMessage', :reason,
                    'workerFinishedAt', :finishedAt
                  ),
                TRUE
              ),
              updated_at = NOW()
            WHERE id = :id AND extraction_status = 'pending'
            """
        ),
        {
            "id": extraction_id,
            "reason": reason[:2000],
            "finishedAt": finished_at,
        },
    )
    await db.commit()


async def mark_extraction_cancelled(
    db: AsyncSession,
    extraction_id: str,
    structured_content: dict[str, Any],
) -> None:
    audit = structured_content.setdefault("audit", {})
    if not isinstance(audit, dict):
        audit = {}
        structured_content["audit"] = audit
    audit.update(
        {
            "cancelRequested": True,
            "cancelledByTeacher": True,
            "reviewState": "cancelled",
        }
    )
    await db.execute(
        sa_text(
            "UPDATE extracted_modules "
            "SET extraction_status = 'failed', error_message = :message, structured_content = :sc, updated_at = NOW() "
            "WHERE id = :id"
        ).bindparams(bindparam("sc", type_=postgresql.JSONB)),
        {
            "id": extraction_id,
            "message": "Extraction cancelled by teacher.",
            "sc": structured_content,
        },
    )
    await db.commit()
