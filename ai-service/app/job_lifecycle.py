from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any

from sqlalchemy import text as sa_text
from sqlalchemy.ext.asyncio import AsyncSession


class JobExecutionSuperseded(RuntimeError):
    """The durable job is cancelled or now owned by another worker lease."""


def _worker_lease_id(source_filters: Any) -> str | None:
    if not isinstance(source_filters, dict):
        return None
    runtime = source_filters.get("runtime")
    if not isinstance(runtime, dict):
        return None
    value = runtime.get("workerLeaseId")
    return str(value) if value else None


async def lock_active_job_execution(
    db: AsyncSession,
    *,
    job_id: str,
    execution_lease_id: str | None,
) -> dict[str, Any]:
    """Lock and validate the processing row before committing generated output."""
    result = await db.execute(
        sa_text(
            """
            SELECT id, status, source_filters
            FROM ai_generation_jobs
            WHERE id = :jobId
            FOR UPDATE
            """
        ),
        {"jobId": job_id},
    )
    row = result.mappings().first()
    if not row:
        raise JobExecutionSuperseded(f"AI job {job_id} no longer exists")

    status = str(row["status"])
    current_lease_id = _worker_lease_id(row.get("source_filters"))
    if status != "processing":
        raise JobExecutionSuperseded(
            f"AI job {job_id} is {status}, not active processing"
        )
    if execution_lease_id and current_lease_id != execution_lease_id:
        raise JobExecutionSuperseded(
            f"AI job {job_id} is owned by a newer worker lease"
        )
    return dict(row)


async def prepare_fenced_output_commit(
    db: AsyncSession,
    *,
    job_id: str,
    execution_lease_id: str | None,
    progress_callback: Callable[[str, int], Awaitable[None]] | None,
    status_message: str,
    progress_percent: int,
) -> dict[str, Any]:
    """Commit progress first, then hold the final lease fence through output commit.

    Progress callbacks persist and commit their own runtime update. Running one
    after ``FOR UPDATE`` would release the row lock and reopen a cancellation
    race before the output INSERT. Keep the callback before the final lock.
    """
    if progress_callback:
        await progress_callback(status_message, progress_percent)
    return await lock_active_job_execution(
        db,
        job_id=job_id,
        execution_lease_id=execution_lease_id,
    )
