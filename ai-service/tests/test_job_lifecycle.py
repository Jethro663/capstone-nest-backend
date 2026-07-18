import unittest
from unittest.mock import AsyncMock, MagicMock

from app.job_lifecycle import (
    JobExecutionSuperseded,
    lock_active_job_execution,
    prepare_fenced_output_commit,
)
from app import main


class _Rows:
    def __init__(self, row):
        self._row = row

    def mappings(self):
        return self

    def first(self):
        return self._row


class JobLifecycleTests(unittest.IsolatedAsyncioTestCase):
    async def test_lock_accepts_only_matching_processing_lease(self) -> None:
        db = AsyncMock()
        db.execute = AsyncMock(
            return_value=_Rows(
                {
                    "id": "job-1",
                    "status": "processing",
                    "source_filters": {
                        "runtime": {"workerLeaseId": "lease-current"}
                    },
                }
            )
        )

        row = await lock_active_job_execution(
            db,
            job_id="job-1",
            execution_lease_id="lease-current",
        )

        self.assertEqual(row["id"], "job-1")
        self.assertIn("FOR UPDATE", str(db.execute.await_args.args[0]))

    async def test_lock_rejects_cancelled_job(self) -> None:
        db = AsyncMock()
        db.execute = AsyncMock(
            return_value=_Rows(
                {
                    "id": "job-1",
                    "status": "cancelled",
                    "source_filters": {
                        "runtime": {"workerLeaseId": "lease-current"}
                    },
                }
            )
        )

        with self.assertRaises(JobExecutionSuperseded):
            await lock_active_job_execution(
                db,
                job_id="job-1",
                execution_lease_id="lease-current",
            )

    async def test_lock_rejects_stale_worker_lease(self) -> None:
        db = AsyncMock()
        db.execute = AsyncMock(
            return_value=_Rows(
                {
                    "id": "job-1",
                    "status": "processing",
                    "source_filters": {
                        "runtime": {"workerLeaseId": "lease-new"}
                    },
                }
            )
        )

        with self.assertRaises(JobExecutionSuperseded):
            await lock_active_job_execution(
                db,
                job_id="job-1",
                execution_lease_id="lease-old",
            )

    async def test_superseded_worker_cannot_complete_after_takeover(self) -> None:
        db = AsyncMock()
        db.execute = AsyncMock(return_value=_Rows(None))

        changed = await main._update_ai_job_status(
            db,
            job_id="job-1",
            status="completed",
            execution_lease_id="lease-old",
        )

        self.assertFalse(changed)
        query = str(db.execute.await_args.args[0])
        self.assertIn("workerLeaseId", query)
        self.assertIn("status = 'processing'", query)

    async def test_output_progress_commits_before_final_cancellation_fence(self) -> None:
        state = {"status": "processing"}

        async def execute(_statement, _params):
            return _Rows(
                {
                    "id": "job-1",
                    "status": state["status"],
                    "source_filters": {
                        "runtime": {"workerLeaseId": "lease-current"}
                    },
                }
            )

        async def progress(_message: str, _percent: int) -> None:
            # Models a cancellation committed while the progress callback's
            # transaction is open. The subsequent lock must observe it.
            state["status"] = "cancelled"

        db = AsyncMock()
        db.execute = AsyncMock(side_effect=execute)

        with self.assertRaises(JobExecutionSuperseded):
            await prepare_fenced_output_commit(
                db,
                job_id="job-1",
                execution_lease_id="lease-current",
                progress_callback=progress,
                status_message="Saving output",
                progress_percent=88,
            )

    async def test_internal_worker_paths_declare_uuid_validation(self) -> None:
        schema = main.app.openapi()
        paths = (
            "/internal/teacher/lesson-plans/jobs/{job_id}/run",
            "/internal/teacher/quizzes/jobs/{job_id}/run",
            "/internal/teacher/interventions/jobs/{job_id}/run",
            "/internal/extractions/{extraction_id}/run",
        )

        for path in paths:
            with self.subTest(path=path):
                parameter = schema["paths"][path]["post"]["parameters"][0]
                self.assertEqual(parameter["in"], "path")
                self.assertEqual(parameter["schema"]["format"], "uuid")


if __name__ == "__main__":
    unittest.main()
