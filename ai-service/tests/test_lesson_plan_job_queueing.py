"""
Tests for the lesson-plan job queueing boundary changes:
1. Public route POST /teacher/lesson-plans/jobs only creates the DB job row
   and does NOT schedule an in-process asyncio task.
2. Internal route POST /internal/teacher/lesson-plans/jobs/{job_id}/run
   triggers the actual generation, protected by require_internal_service.
3. Internal route rejects completed/running jobs (idempotency).
"""
from __future__ import annotations

import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from app.main import (
    _run_lesson_plan_generation_job,
    AI_JOB_TASKS,
)
from app.schemas import RequestUser


class LessonPlanQueueBoundaryTests(unittest.IsolatedAsyncioTestCase):
    """Verify that the public lesson plan route no longer schedules in-process tasks."""

    @patch("app.main._create_ai_generation_job", new_callable=AsyncMock)
    @patch("app.main.asyncio.get_running_loop")
    async def test_public_route_does_not_call_create_task(
        self,
        mock_get_loop: MagicMock,
        mock_create_job: AsyncMock,
    ) -> None:
        """
        After the refactor, POST /teacher/lesson-plans/jobs must NOT call
        asyncio.get_running_loop() or loop.create_task(). Execution is owned
        by the NestJS BullMQ worker.
        """
        mock_create_job.return_value = "test-job-id"

        # Import the route function directly and call it
        from app.main import queue_teacher_lesson_plan_job
        from app.schemas import GenerateLessonPlanRequest

        body = GenerateLessonPlanRequest(
            classId="class-1",
            anchorType="lesson",
            anchorId="lesson-1",
            teacherNote="test note",
        )
        user = RequestUser(id="teacher-1", email="t@school.edu", roles=["teacher"])

        # Mock the DB session
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.mappings.return_value.first.return_value = {
            "id": "class-1",
            "teacher_id": "teacher-1",
        }
        mock_db.execute.return_value = mock_result

        result = await queue_teacher_lesson_plan_job(body=body, user=user, db=mock_db)

        # The route should return 202 with the job envelope
        self.assertTrue(result["success"])
        self.assertEqual(result["data"]["jobId"], "test-job-id")
        self.assertEqual(result["data"]["status"], "pending")

        # CRITICAL: asyncio.get_running_loop should NOT have been called
        mock_get_loop.assert_not_called()

    async def test_public_route_does_not_register_in_ai_job_tasks(self) -> None:
        """After refactor, the job ID must not appear in AI_JOB_TASKS."""
        # Clear the global to ensure a clean test
        original_tasks = dict(AI_JOB_TASKS)
        AI_JOB_TASKS.clear()

        try:
            from app.main import queue_teacher_lesson_plan_job
            from app.schemas import GenerateLessonPlanRequest

            body = GenerateLessonPlanRequest(
                classId="class-1",
                anchorType="lesson",
                anchorId="lesson-1",
            )
            user = RequestUser(id="teacher-1", email="t@school.edu", roles=["teacher"])

            mock_db = AsyncMock()
            mock_result = MagicMock()
            mock_result.mappings.return_value.first.return_value = {
                "id": "class-1",
                "teacher_id": "teacher-1",
            }
            mock_db.execute.return_value = mock_result

            with patch("app.main._create_ai_generation_job", new_callable=AsyncMock, return_value="job-xyz"):
                await queue_teacher_lesson_plan_job(body=body, user=user, db=mock_db)

            self.assertNotIn("job-xyz", AI_JOB_TASKS)
        finally:
            AI_JOB_TASKS.update(original_tasks)


class LessonPlanInternalExecutionTests(unittest.IsolatedAsyncioTestCase):
    """Verify the internal execution route behavior."""

    @patch("app.main._run_lesson_plan_generation_job", new_callable=AsyncMock)
    async def test_internal_route_calls_generation_runner(
        self,
        mock_run_job: AsyncMock,
    ) -> None:
        """
        POST /internal/teacher/lesson-plans/jobs/{job_id}/run should
        call _run_lesson_plan_generation_job with the reconstructed body.
        """
        from app.main import run_teacher_lesson_plan_job

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.mappings.return_value.first.return_value = {
            "id": "job-123",
            "job_type": "class_lesson_plan_generation",
            "class_id": "class-1",
            "teacher_id": "teacher-1",
            "status": "pending",
            "source_filters": {
                "anchorType": "lesson",
                "anchorId": "lesson-1",
                "teacherNote": "Focus on fractions",
                "header": {},
            },
        }
        mock_db.execute.return_value = mock_result

        # Bypass auth (tested separately)
        result = await run_teacher_lesson_plan_job(
            job_id="job-123",
            _auth=None,
            db=mock_db,
        )

        mock_run_job.assert_awaited_once()
        self.assertTrue(result["success"])
        self.assertEqual(result["data"]["jobId"], "job-123")

    @patch("app.main._persist_ai_job_runtime", new_callable=AsyncMock)
    @patch("app.main._run_lesson_plan_generation_job", new_callable=AsyncMock)
    async def test_internal_route_records_worker_metadata(
        self,
        mock_run_job: AsyncMock,
        mock_persist_runtime: AsyncMock,
    ) -> None:
        """Verify broker, bullmqJobId, and attempt are recorded in runtime."""
        from app.main import run_teacher_lesson_plan_job, AI_JOB_RUNTIME

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.mappings.return_value.first.return_value = {
            "id": "job-meta-test",
            "job_type": "class_lesson_plan_generation",
            "class_id": "class-1",
            "teacher_id": "teacher-1",
            "status": "pending",
            "source_filters": {},
        }
        mock_db.execute.return_value = mock_result

        result = await run_teacher_lesson_plan_job(
            job_id="job-meta-test",
            meta={"bullmqJobId": "bull-999", "attempt": 2},
            _auth=None,
            db=mock_db,
        )

        self.assertTrue(result["success"])
        self.assertIn("job-meta-test", AI_JOB_RUNTIME)
        runtime = AI_JOB_RUNTIME["job-meta-test"]
        self.assertEqual(runtime.get("broker"), "bullmq")
        self.assertEqual(runtime.get("bullmqJobId"), "bull-999")
        self.assertEqual(runtime.get("attempt"), 2)
        mock_persist_runtime.assert_awaited_once()

    async def test_internal_route_returns_200_for_completed_job(self) -> None:
        """Completed jobs should return 200 without re-running."""
        from app.main import run_teacher_lesson_plan_job

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.mappings.return_value.first.return_value = {
            "id": "job-done",
            "job_type": "class_lesson_plan_generation",
            "class_id": "class-1",
            "teacher_id": "teacher-1",
            "status": "completed",
            "source_filters": {},
        }
        mock_db.execute.return_value = mock_result

        with patch("app.main._run_lesson_plan_generation_job", new_callable=AsyncMock) as mock_run:
            result = await run_teacher_lesson_plan_job(
                job_id="job-done",
                _auth=None,
                db=mock_db,
            )

        # Should NOT re-run the job
        mock_run.assert_not_awaited()
        self.assertTrue(result["success"])
        self.assertEqual(result["data"]["status"], "completed")

    async def test_internal_route_rejects_running_job(self) -> None:
        """Running jobs should return 409 Conflict."""
        from fastapi import HTTPException as FastAPIHTTPException
        from app.main import run_teacher_lesson_plan_job

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.mappings.return_value.first.return_value = {
            "id": "job-active",
            "job_type": "class_lesson_plan_generation",
            "class_id": "class-1",
            "teacher_id": "teacher-1",
            "status": "running",
            "source_filters": {},
        }
        mock_db.execute.return_value = mock_result

        with self.assertRaises(FastAPIHTTPException) as ctx:
            await run_teacher_lesson_plan_job(
                job_id="job-active",
                _auth=None,
                db=mock_db,
            )

        self.assertEqual(ctx.exception.status_code, 409)

    @patch("app.main._persist_ai_job_runtime", new_callable=AsyncMock)
    @patch("app.main._run_lesson_plan_generation_job", new_callable=AsyncMock)
    async def test_internal_route_rejects_processing_job(
        self,
        mock_run_job: AsyncMock,
        mock_persist: AsyncMock,
    ) -> None:
        """Processing jobs should return 409 Conflict on attempt 1."""
        from fastapi import HTTPException as FastAPIHTTPException
        from app.main import run_teacher_lesson_plan_job

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.mappings.return_value.first.return_value = {
            "id": "job-proc",
            "job_type": "class_lesson_plan_generation",
            "class_id": "class-1",
            "teacher_id": "teacher-1",
            "status": "processing",
            "source_filters": {},
        }
        mock_db.execute.return_value = mock_result

        with self.assertRaises(FastAPIHTTPException) as ctx:
            await run_teacher_lesson_plan_job(
                job_id="job-proc",
                _auth=None,
                db=mock_db,
            )

        self.assertEqual(ctx.exception.status_code, 409)

    @patch("app.main._run_lesson_plan_generation_job", new_callable=AsyncMock)
    async def test_internal_route_allows_stale_processing_job_on_retry(
        self,
        mock_run_job: AsyncMock,
    ) -> None:
        """Processing jobs with stale timestamp (>6m ago) must allow re-entry on attempt > 1."""
        from app.main import run_teacher_lesson_plan_job
        from datetime import datetime, timezone, timedelta

        stale_time = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.mappings.return_value.first.return_value = {
            "id": "job-stale",
            "job_type": "class_lesson_plan_generation",
            "class_id": "class-1",
            "teacher_id": "teacher-1",
            "status": "processing",
            "source_filters": {"runtime": {"workerStartedAt": stale_time}},
        }
        mock_db.execute.return_value = mock_result

        result = await run_teacher_lesson_plan_job(
            job_id="job-stale",
            meta={"bullmqJobId": "bull-2", "attempt": 2},
            _auth=None,
            db=mock_db,
        )

        mock_run_job.assert_awaited_once()
        self.assertTrue(result["success"])

    async def test_internal_route_rejects_nonexistent_job(self) -> None:
        """Non-existent jobs should return 404."""
        from fastapi import HTTPException as FastAPIHTTPException
        from app.main import run_teacher_lesson_plan_job

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.mappings.return_value.first.return_value = None
        mock_db.execute.return_value = mock_result

        with self.assertRaises(FastAPIHTTPException) as ctx:
            await run_teacher_lesson_plan_job(
                job_id="nonexistent",
                _auth=None,
                db=mock_db,
            )

        self.assertEqual(ctx.exception.status_code, 404)




class LessonPlanInternalAuthTests(unittest.TestCase):
    """Verify strict internal token verification and settings fail-fast validation."""

    def test_internal_lesson_plan_run_rejects_missing_internal_token(self) -> None:
        """require_internal_service must reject missing or invalid tokens."""
        from fastapi import HTTPException as FastAPIHTTPException
        from app.main import require_internal_service, settings

        original_secret = settings.ai_service_shared_secret
        try:
            settings.ai_service_shared_secret = "test-secret-123"
            with self.assertRaises(FastAPIHTTPException) as ctx:
                require_internal_service(None)
            self.assertEqual(ctx.exception.status_code, 401)

            with self.assertRaises(FastAPIHTTPException) as ctx:
                require_internal_service("wrong-token")
            self.assertEqual(ctx.exception.status_code, 401)
        finally:
            settings.ai_service_shared_secret = original_secret

    def test_internal_lesson_plan_run_rejects_when_secret_is_empty(self) -> None:
        """require_internal_service must fail closed (reject) when secret is empty on server."""
        from fastapi import HTTPException as FastAPIHTTPException
        from app.main import require_internal_service, settings

        original_secret = settings.ai_service_shared_secret
        try:
            settings.ai_service_shared_secret = ""
            with self.assertRaises(FastAPIHTTPException) as ctx:
                require_internal_service("any-token")
            self.assertEqual(ctx.exception.status_code, 401)
        finally:
            settings.ai_service_shared_secret = original_secret

    def test_settings_reject_blank_shared_secret_outside_development(self) -> None:
        """Settings must raise ValueError if shared secret is empty outside development/test runtime."""
        from app.config import Settings

        for mode in ("auto", "local", "cloud", "production"):
            with self.subTest(mode=mode):
                with self.assertRaises(ValueError):
                    Settings(ai_runtime_mode=mode, ai_service_shared_secret="")


if __name__ == "__main__":
    unittest.main()
