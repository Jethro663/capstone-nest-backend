import asyncio
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from app import main
from app.main import (
    _normalize_intervention_structured_output,
    _ensure_quiz_sources_ready,
    _run_with_retries,
    _runtime_progress_for_status,
    _should_mark_job_stale,
)
from app.schemas import RequestUser


class AiJobRuntimeTests(unittest.IsolatedAsyncioTestCase):
    def test_runtime_progress_accepts_numeric_runtime_values(self) -> None:
        self.assertEqual(
            _runtime_progress_for_status("processing", {"progressPercent": "85"}),
            85,
        )
        self.assertEqual(
            _runtime_progress_for_status("processing", {"progressPercent": 125}),
            100,
        )
        self.assertEqual(
            _runtime_progress_for_status("processing", {"progressPercent": -5}),
            0,
        )

    def test_runtime_progress_uses_status_defaults_when_runtime_missing(self) -> None:
        self.assertEqual(_runtime_progress_for_status("pending", None), 5)
        self.assertEqual(_runtime_progress_for_status("processing", None), 60)
        self.assertEqual(_runtime_progress_for_status("completed", None), 100)
        self.assertEqual(_runtime_progress_for_status("cancelled", None), 100)
        self.assertEqual(_runtime_progress_for_status("unknown", None), 0)

    def test_runtime_progress_falls_back_when_runtime_percent_is_non_finite(self) -> None:
        self.assertEqual(
            _runtime_progress_for_status("processing", {"progressPercent": "1e309"}),
            60,
        )
        self.assertEqual(
            _runtime_progress_for_status("pending", {"progressPercent": float("inf")}),
            5,
        )

    async def test_run_with_retries_succeeds_after_retries(self) -> None:
        attempts = {"count": 0}

        async def operation(attempt: int) -> str:
            attempts["count"] = attempt
            if attempt < 3:
                raise RuntimeError("transient")
            return "ok"

        result = await _run_with_retries(
            operation,
            max_attempts=3,
            delay_seconds=0,
        )

        self.assertEqual(result, "ok")
        self.assertEqual(attempts["count"], 3)

    async def test_run_with_retries_raises_last_error(self) -> None:
        async def operation(_attempt: int) -> str:
            raise RuntimeError("persistent")

        with self.assertRaisesRegex(RuntimeError, "persistent"):
            await _run_with_retries(operation, max_attempts=3, delay_seconds=0)

    def test_normalize_intervention_output_ensures_assignment_payload(self) -> None:
        normalized = _normalize_intervention_structured_output(
            {"caseId": "case-1", "suggestedAssignmentPayload": None}
        )
        self.assertEqual(
            normalized["suggestedAssignmentPayload"],
            {"lessonIds": [], "assessmentIds": []},
        )

        normalized_with_values = _normalize_intervention_structured_output(
            {
                "caseId": "case-2",
                "suggestedAssignmentPayload": {
                    "lessonIds": ["lesson-1", None],
                    "assessmentIds": ["assessment-1"],
                    "note": "Keep this note",
                },
            }
        )
        self.assertEqual(
            normalized_with_values["suggestedAssignmentPayload"]["lessonIds"],
            ["lesson-1"],
        )
        self.assertEqual(
            normalized_with_values["suggestedAssignmentPayload"]["assessmentIds"],
            ["assessment-1"],
        )
        self.assertEqual(
            normalized_with_values["suggestedAssignmentPayload"]["note"],
            "Keep this note",
        )

    def test_should_mark_job_stale_for_pending_jobs_with_old_runtime_heartbeat(self) -> None:
        stale_runtime = {
            "updatedAt": (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat()
        }
        self.assertTrue(
            _should_mark_job_stale(
                status="pending",
                updated_at=datetime.now(timezone.utc),
                runtime=stale_runtime,
                stale_after_seconds=60,
            )
        )

    def test_should_not_mark_job_stale_for_recent_runtime_heartbeat(self) -> None:
        fresh_runtime = {
            "updatedAt": (datetime.now(timezone.utc) - timedelta(seconds=20)).isoformat()
        }
        self.assertFalse(
            _should_mark_job_stale(
                status="processing",
                updated_at=datetime.now(timezone.utc),
                runtime=fresh_runtime,
                stale_after_seconds=120,
            )
        )

    async def test_ensure_quiz_sources_ready_reindexes_once_when_status_is_stale(self) -> None:
        fake_db = AsyncMock()
        with (
            patch.object(
                main,
                "get_class_index_status",
                AsyncMock(
                    side_effect=[
                        {"classId": "class-1", "chunksIndexed": 0, "needsReindex": True, "reason": "Reindex required"},
                        {"classId": "class-1", "chunksIndexed": 4, "needsReindex": False, "reason": None},
                    ]
                ),
            ) as mocked_status,
            patch.object(
                main,
                "reindex_class_content",
                AsyncMock(return_value={"classId": "class-1", "chunksIndexed": 4}),
            ) as mocked_reindex,
            patch.object(main, "_record_ai_job_runtime", AsyncMock()) as mocked_runtime,
        ):
            status, reindex_result = await _ensure_quiz_sources_ready(
                fake_db,
                class_id="class-1",
                job_id="job-1",
            )

        self.assertEqual(status["chunksIndexed"], 4)
        self.assertEqual(reindex_result["chunksIndexed"], 4)
        self.assertEqual(mocked_status.await_count, 2)
        mocked_reindex.assert_awaited_once_with(fake_db, "class-1")
        self.assertEqual(mocked_runtime.await_count, 2)

    async def test_ensure_quiz_sources_ready_fails_fast_when_reindex_still_has_no_chunks(self) -> None:
        fake_db = AsyncMock()
        with (
            patch.object(
                main,
                "get_class_index_status",
                AsyncMock(
                    side_effect=[
                        {
                            "classId": "class-1",
                            "chunksIndexed": 0,
                            "needsReindex": True,
                            "reason": "No indexed class source content found. Reindex the class sources before generating.",
                        },
                        {
                            "classId": "class-1",
                            "chunksIndexed": 0,
                            "needsReindex": False,
                            "reason": "No indexed class source content found. Reindex the class sources before generating.",
                        },
                    ]
                ),
            ),
            patch.object(
                main,
                "reindex_class_content",
                AsyncMock(return_value={"classId": "class-1", "chunksIndexed": 0}),
            ),
            patch.object(main, "_record_ai_job_runtime", AsyncMock()),
        ):
            with self.assertRaisesRegex(Exception, "No indexed class source content found"):
                await _ensure_quiz_sources_ready(fake_db, class_id="class-1", job_id="job-1")

    async def test_run_intervention_generation_job_rolls_back_and_marks_failed(self) -> None:
        fake_db = AsyncMock()
        fake_session = AsyncMock()
        fake_session.__aenter__.return_value = fake_db
        fake_session.__aexit__.return_value = False

        with (
            patch.object(main, "AsyncSessionLocal", return_value=fake_session),
            patch.object(
                main,
                "recommend_intervention_case",
                AsyncMock(side_effect=RuntimeError("broken intervention query")),
            ),
            patch.object(main, "_record_ai_job_runtime", AsyncMock()) as mocked_runtime,
            patch.object(main, "_update_ai_job_status", AsyncMock()) as mocked_status,
        ):
            await main._run_intervention_generation_job(
                "job-1",
                "case-1",
                "note",
                RequestUser(id="teacher-1", email="teacher@lms.local", roles=["teacher"]),
            )

        self.assertGreaterEqual(fake_db.rollback.await_count, 4)
        mocked_status.assert_awaited_once_with(
            fake_db,
            job_id="job-1",
            status="failed",
            error_message="broken intervention query",
        )
        self.assertEqual(mocked_runtime.await_args_list[-1].kwargs["statusMessage"], "Generation failed")
        self.assertNotIn("job-1", main.AI_JOB_TASKS)

    async def test_delete_teacher_ai_job_cancels_running_task(self) -> None:
        fake_db = AsyncMock()
        job_task = asyncio.create_task(asyncio.sleep(60))
        main.AI_JOB_TASKS["job-1"] = job_task

        with (
            patch.object(
                main,
                "_load_ai_job_context",
                AsyncMock(return_value=({"id": "job-1", "output_id": None}, None, None)),
            ),
            patch.object(main, "_update_ai_job_status", AsyncMock()) as mocked_status,
            patch.object(main, "_record_ai_job_runtime", AsyncMock()) as mocked_runtime,
        ):
            result = await main.delete_teacher_ai_job(
                "job-1",
                user=RequestUser(id="teacher-1", email="teacher@lms.local", roles=["teacher"]),
                db=fake_db,
            )

        self.assertEqual(result["data"]["status"], "cancelled")
        self.assertTrue(job_task.cancelled() or job_task.done())
        mocked_status.assert_awaited_once()
        mocked_runtime.assert_awaited_once()
        self.assertNotIn("job-1", main.AI_JOB_TASKS)

    async def test_cleanup_stale_ai_jobs_uses_naive_cutoff_timestamp(self) -> None:
        fake_rows = MagicMock()
        fake_rows.mappings.return_value = []
        fake_db = AsyncMock()
        fake_db.execute = AsyncMock(return_value=fake_rows)
        fake_session = AsyncMock()
        fake_session.__aenter__.return_value = fake_db
        fake_session.__aexit__.return_value = False

        with patch.object(main, "AsyncSessionLocal", return_value=fake_session):
            await main._cleanup_stale_ai_jobs()

        cutoff = fake_db.execute.await_args_list[0].args[1]["cutoff"]
        self.assertIsNone(cutoff.tzinfo)


if __name__ == "__main__":
    unittest.main()
