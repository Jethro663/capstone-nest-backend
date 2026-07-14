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
)
from app.schemas import GenerateLessonPlanRequest, GenerateQuizDraftRequest, RequestUser


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

    async def test_polling_old_pending_job_is_read_only(self) -> None:
        old_timestamp = datetime.now(timezone.utc) - timedelta(hours=2)
        rows = MagicMock()
        rows.mappings.return_value.first.return_value = {
            "id": "job-old",
            "job_type": "quiz_generation",
            "class_id": "class-1",
            "teacher_id": "teacher-1",
            "status": "pending",
            "source_filters": {
                "runtime": {"updatedAt": old_timestamp.isoformat()}
            },
            "error_message": None,
            "created_at": old_timestamp,
            "updated_at": old_timestamp,
            "output_id": None,
            "output_type": None,
            "structured_output": None,
        }
        fake_db = AsyncMock()
        fake_db.execute = AsyncMock(return_value=rows)

        job, _runtime, _assessment_id = await main._load_ai_job_context(
            fake_db,
            "job-old",
            RequestUser(
                id="teacher-1",
                email="teacher@lms.local",
                roles=["teacher"],
            ),
        )

        self.assertEqual(job["status"], "pending")
        self.assertEqual(fake_db.execute.await_count, 1)
        fake_db.commit.assert_not_awaited()

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
            with self.assertRaisesRegex(RuntimeError, "broken intervention query"):
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
            execution_lease_id=None,
        )
        self.assertEqual(mocked_runtime.await_args_list[-1].kwargs["statusMessage"], "Generation failed")

    async def test_run_quiz_generation_job_marks_failed_and_propagates(self) -> None:
        fake_db = AsyncMock()
        fake_session = AsyncMock()
        fake_session.__aenter__.return_value = fake_db
        fake_session.__aexit__.return_value = False
        body = GenerateQuizDraftRequest(classId="class-1")

        with (
            patch.object(main, "AsyncSessionLocal", return_value=fake_session),
            patch.object(
                main,
                "_ensure_quiz_sources_ready",
                AsyncMock(return_value=({"chunksIndexed": 1}, None)),
            ),
            patch.object(
                main,
                "_run_with_retries",
                AsyncMock(side_effect=RuntimeError("quiz model timed out")),
            ),
            patch.object(main, "_record_ai_job_runtime", AsyncMock()) as mocked_runtime,
            patch.object(main, "_update_ai_job_status", AsyncMock()) as mocked_status,
        ):
            with self.assertRaisesRegex(RuntimeError, "quiz model timed out"):
                await main._run_quiz_generation_job(
                    "quiz-job-1",
                    body,
                    RequestUser(
                        id="teacher-1",
                        email="teacher@lms.local",
                        roles=["teacher"],
                    ),
                )

        self.assertEqual(mocked_status.await_args_list[-1].kwargs["status"], "failed")
        self.assertEqual(
            mocked_runtime.await_args_list[-1].kwargs["statusMessage"],
            "Generation failed",
        )

    async def test_quiz_retry_resumes_persisted_output_after_post_commit_failure(self) -> None:
        fake_db = AsyncMock()
        fake_session = AsyncMock()
        fake_session.__aenter__.return_value = fake_db
        fake_session.__aexit__.return_value = False
        body = GenerateQuizDraftRequest(classId="class-1")
        generated_result = {
            "outputId": "output-1",
            "assessmentId": None,
            "blueprintSource": "model",
        }
        persisted_output = {
            "id": "output-1",
            "output_type": "assessment_draft",
            "structured_output": {"blueprintSource": "model"},
        }

        with (
            patch.object(main, "AsyncSessionLocal", return_value=fake_session),
            patch.object(
                main,
                "_ensure_quiz_sources_ready",
                AsyncMock(return_value=({"chunksIndexed": 1}, None)),
            ),
            patch.object(
                main,
                "_load_existing_generation_result",
                AsyncMock(side_effect=[None, persisted_output]),
                create=True,
            ),
            patch.object(
                main,
                "generate_quiz_draft",
                AsyncMock(return_value=generated_result),
            ) as mocked_generate,
            patch.object(
                main,
                "reindex_class_content",
                AsyncMock(
                    side_effect=[
                        RuntimeError("index unavailable after output commit"),
                        {"chunksIndexed": 1},
                    ]
                ),
            ),
            patch.object(main, "_record_ai_job_runtime", AsyncMock()),
            patch.object(main, "_update_ai_job_status", AsyncMock()),
        ):
            with self.assertRaisesRegex(
                RuntimeError,
                "index unavailable after output commit",
            ):
                await main._run_quiz_generation_job(
                    "quiz-job-resume",
                    body,
                    RequestUser(
                        id="teacher-1",
                        email="teacher@lms.local",
                        roles=["teacher"],
                    ),
                    execution_lease_id="lease-1",
                )

            await main._run_quiz_generation_job(
                "quiz-job-resume",
                body,
                RequestUser(
                    id="teacher-1",
                    email="teacher@lms.local",
                    roles=["teacher"],
                ),
                execution_lease_id="lease-2",
            )

        mocked_generate.assert_awaited_once()

    async def test_durable_quiz_generation_defers_ambiguous_commit_retry_to_bullmq(
        self,
    ) -> None:
        """One HTTP execution must not repeat a plain output INSERT after commit ambiguity."""
        fake_db = AsyncMock()
        fake_session = AsyncMock()
        fake_session.__aenter__.return_value = fake_db
        fake_session.__aexit__.return_value = False
        body = GenerateQuizDraftRequest(classId="class-1")

        with (
            patch.object(main, "AsyncSessionLocal", return_value=fake_session),
            patch.object(
                main,
                "_ensure_quiz_sources_ready",
                AsyncMock(return_value=({"chunksIndexed": 1}, None)),
            ),
            patch.object(
                main,
                "_load_existing_generation_result",
                AsyncMock(return_value=None),
            ),
            patch.object(
                main,
                "generate_quiz_draft",
                AsyncMock(side_effect=RuntimeError("commit outcome unknown")),
            ) as mocked_generate,
            patch.object(main, "_record_ai_job_runtime", AsyncMock()),
            patch.object(main, "_update_ai_job_status", AsyncMock()),
        ):
            with self.assertRaisesRegex(RuntimeError, "commit outcome unknown"):
                await main._run_quiz_generation_job(
                    "quiz-job-ambiguous",
                    body,
                    RequestUser(
                        id="teacher-1",
                        email="teacher@lms.local",
                        roles=["teacher"],
                    ),
                    execution_lease_id="lease-1",
                )

        mocked_generate.assert_awaited_once()

    async def test_run_lesson_plan_job_marks_failed_and_propagates(self) -> None:
        fake_db = AsyncMock()
        fake_session = AsyncMock()
        fake_session.__aenter__.return_value = fake_db
        fake_session.__aexit__.return_value = False
        body = GenerateLessonPlanRequest(
            classId="class-1",
            anchorType="lesson",
            anchorId="lesson-1",
        )

        with (
            patch.object(main, "AsyncSessionLocal", return_value=fake_session),
            patch.object(
                main,
                "_run_with_retries",
                AsyncMock(side_effect=RuntimeError("lesson model timed out")),
            ),
            patch.object(main, "_record_ai_job_runtime", AsyncMock()) as mocked_runtime,
            patch.object(main, "_update_ai_job_status", AsyncMock()) as mocked_status,
        ):
            with self.assertRaisesRegex(RuntimeError, "lesson model timed out"):
                await main._run_lesson_plan_generation_job(
                    "lesson-job-1",
                    body,
                    RequestUser(
                        id="teacher-1",
                        email="teacher@lms.local",
                        roles=["teacher"],
                    ),
                )

        self.assertEqual(mocked_status.await_args_list[-1].kwargs["status"], "failed")
        self.assertEqual(
            mocked_runtime.await_args_list[-1].kwargs["statusMessage"],
            "Generation failed",
        )

    async def test_delete_teacher_ai_job_persists_durable_cancellation(self) -> None:
        fake_db = AsyncMock()

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
        mocked_status.assert_awaited_once()
        mocked_runtime.assert_awaited_once()

    async def test_startup_does_not_reclassify_bullmq_owned_jobs(self) -> None:
        with (
            patch.object(
                main,
                "_cleanup_stale_ai_jobs",
                AsyncMock(),
                create=True,
            ) as mocked_cleanup,
            patch.object(
                main,
                "_recover_orphaned_jobs",
                AsyncMock(),
                create=True,
            ) as mocked_recover,
            patch.object(main.ollama_client, "preload_model", AsyncMock()) as mocked_preload,
        ):
            await main.preload_ollama_models()

        mocked_cleanup.assert_not_awaited()
        mocked_recover.assert_not_awaited()
        self.assertEqual(mocked_preload.await_count, 2)


if __name__ == "__main__":
    unittest.main()
