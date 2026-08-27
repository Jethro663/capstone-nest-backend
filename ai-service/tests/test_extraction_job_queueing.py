import asyncio
import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

from fastapi import HTTPException

from app.main import (
    RequestUser,
    extract_module,
    fail_pending_internal_extraction,
    retry_extraction,
    run_internal_extraction,
)
from app.schemas import ExtractRequest, RetryExtractionRequest
from app.extraction_pipeline import ExtractionCancelled, ExtractionExecutionSuperseded


def query_result(*, row=None, scalar=None):
    return SimpleNamespace(
        mappings=lambda: SimpleNamespace(first=lambda: row),
        scalar_one=lambda: scalar,
        scalar_one_or_none=lambda: scalar,
    )


class ExtractionQueueBoundaryTests(unittest.IsolatedAsyncioTestCase):
    async def test_public_extract_prepares_pending_record_without_local_task(self) -> None:
        db = AsyncMock()
        db.execute = AsyncMock(
            side_effect=[
                query_result(
                    row={
                        "id": "file-1",
                        "file_path": "uploads/file.pdf",
                        "class_id": "class-1",
                        "teacher_id": "teacher-1",
                        "original_name": "file.pdf",
                    }
                ),
                query_result(scalar="extraction-1"),
            ]
        )
        user = RequestUser(id="teacher-1", email="teacher@test", roles=["teacher"])
        loop = Mock()

        with patch("app.main.asyncio.get_running_loop", return_value=loop):
            result = await extract_module(
                body=ExtractRequest(
                    fileId="file-1",
                    targetSectionCount=4,
                    extractionStyle="clean",
                ),
                user=user,
                db=db,
            )

        for call in loop.create_task.call_args_list:
            call.args[0].close()
        self.assertEqual(result["data"]["extractionId"], "extraction-1")
        loop.create_task.assert_not_called()

    async def test_retry_prepares_pending_record_without_local_task(self) -> None:
        db = AsyncMock()
        db.execute = AsyncMock(
            side_effect=[
                query_result(
                    row={
                        "id": "extraction-1",
                        "file_id": "file-1",
                        "class_id": "class-1",
                        "teacher_id": "teacher-1",
                        "structured_content": {"audit": {}},
                    }
                ),
                query_result(scalar="extraction-2"),
            ]
        )
        user = RequestUser(id="teacher-1", email="teacher@test", roles=["teacher"])
        loop = Mock()

        with patch("app.main.asyncio.get_running_loop", return_value=loop):
            result = await retry_extraction(
                extraction_id="extraction-1",
                body=RetryExtractionRequest(),
                user=user,
                db=db,
            )

        for call in loop.create_task.call_args_list:
            call.args[0].close()
        self.assertEqual(result["data"]["extractionId"], "extraction-2")
        loop.create_task.assert_not_called()


class InternalExtractionExecutionTests(unittest.IsolatedAsyncioTestCase):
    async def test_internal_route_executes_existing_pending_record(self) -> None:
        db = AsyncMock()
        db.execute = AsyncMock(
            return_value=query_result(
                row={
                    "id": "extraction-1",
                    "file_id": "file-1",
                    "teacher_id": "teacher-1",
                    "extraction_status": "pending",
                    "structured_content": {
                        "audit": {
                            "requestedSectionCount": 5,
                            "extractionStyle": "faithful",
                        }
                    },
                }
            )
        )

        with patch("app.routers.extractions.run_extraction", new=AsyncMock()) as run:
            result = await run_internal_extraction(
                extraction_id="extraction-1",
                meta={"bullmqJobId": "extraction-extraction-1", "attempt": 1},
                _auth=None,
                db=db,
            )

        run.assert_awaited_once()
        self.assertEqual(run.await_args.args[:4], (db, "extraction-1", "file-1", "teacher-1"))
        self.assertEqual(run.await_args.kwargs["target_section_count"], 5)
        self.assertEqual(run.await_args.kwargs["extraction_style"], "faithful")
        self.assertTrue(run.await_args.kwargs["execution_lease_id"])
        self.assertTrue(run.await_args.kwargs["raise_on_failure"])
        self.assertEqual(result["data"]["status"], "completed")

    async def test_internal_route_is_idempotent_for_completed_record(self) -> None:
        db = AsyncMock()
        db.execute = AsyncMock(
            return_value=query_result(
                row={
                    "id": "extraction-1",
                    "file_id": "file-1",
                    "teacher_id": "teacher-1",
                    "extraction_status": "completed",
                    "structured_content": {"audit": {}},
                }
            )
        )

        with patch("app.routers.extractions.run_extraction", new=AsyncMock()) as run:
            result = await run_internal_extraction(
                extraction_id="extraction-1",
                meta={"attempt": 2},
                _auth=None,
                db=db,
            )

        run.assert_not_awaited()
        self.assertEqual(result["data"]["status"], "completed")

    async def test_internal_route_is_idempotent_for_applied_record(self) -> None:
        db = AsyncMock()
        db.execute = AsyncMock(
            return_value=query_result(
                row={
                    "id": "extraction-1",
                    "file_id": "file-1",
                    "teacher_id": "teacher-1",
                    "extraction_status": "applied",
                    "structured_content": {"audit": {"applyResult": {}}},
                }
            )
        )

        with patch("app.routers.extractions.run_extraction", new=AsyncMock()) as run:
            result = await run_internal_extraction(
                extraction_id="extraction-1",
                meta={"attempt": 2},
                _auth=None,
                db=db,
            )

        run.assert_not_awaited()
        self.assertEqual(result["data"]["status"], "applied")

    async def test_internal_route_rejects_retry_for_fresh_processing_record(self) -> None:
        db = AsyncMock()
        db.execute = AsyncMock(
            return_value=query_result(
                row={
                    "id": "extraction-1",
                    "file_id": "file-1",
                    "teacher_id": "teacher-1",
                    "extraction_status": "processing",
                    "structured_content": {"audit": {}},
                    "updated_at": datetime.now(timezone.utc),
                }
            )
        )

        with patch("app.routers.extractions.run_extraction", new=AsyncMock()) as run:
            with self.assertRaises(HTTPException) as context:
                await run_internal_extraction(
                    extraction_id="extraction-1",
                    meta={"attempt": 2},
                    _auth=None,
                    db=db,
                )

        self.assertEqual(context.exception.status_code, 409)
        run.assert_not_awaited()

    async def test_internal_route_allows_retry_for_stale_processing_record(self) -> None:
        db = AsyncMock()
        db.execute = AsyncMock(
            return_value=query_result(
                row={
                    "id": "extraction-1",
                    "file_id": "file-1",
                    "teacher_id": "teacher-1",
                    "extraction_status": "processing",
                    "structured_content": {"audit": {}},
                    "updated_at": datetime.now(timezone.utc) - timedelta(minutes=20),
                }
            )
        )

        with patch("app.routers.extractions.run_extraction", new=AsyncMock()) as run:
            result = await run_internal_extraction(
                extraction_id="extraction-1",
                meta={"attempt": 2},
                _auth=None,
                db=db,
            )

        run.assert_awaited_once()
        self.assertEqual(result["data"]["status"], "completed")

    @patch(
        "app.routers.extractions._claim_extraction_execution",
        new_callable=AsyncMock,
        return_value=True,
    )
    async def test_same_bullmq_job_newer_attempt_supersedes_live_extraction_lease(
        self,
        claim: AsyncMock,
    ) -> None:
        db = AsyncMock()
        db.execute = AsyncMock(
            return_value=query_result(
                row={
                    "id": "extraction-1",
                    "file_id": "file-1",
                    "teacher_id": "teacher-1",
                    "extraction_status": "processing",
                    "structured_content": {
                        "audit": {
                            "bullmqJobId": "bull-extract-1",
                            "attempt": 1,
                            "workerLeaseId": "lease-old",
                        }
                    },
                    "updated_at": datetime.now(timezone.utc),
                }
            )
        )

        with patch("app.routers.extractions.run_extraction", new=AsyncMock()) as run:
            result = await run_internal_extraction(
                extraction_id="extraction-1",
                meta={"bullmqJobId": "bull-extract-1", "attempt": 2},
                _auth=None,
                db=db,
            )

        self.assertEqual(result["data"]["status"], "completed")
        run.assert_awaited_once()
        self.assertTrue(claim.await_args.kwargs["allow_superseding_retry"])
        self.assertEqual(claim.await_args.kwargs["previous_lease_id"], "lease-old")

    @patch(
        "app.routers.extractions._claim_extraction_execution",
        new_callable=AsyncMock,
        return_value=True,
    )
    async def test_superseded_execution_returns_a_clean_terminal_response(
        self,
        _claim: AsyncMock,
    ) -> None:
        db = AsyncMock()
        db.execute = AsyncMock(
            return_value=query_result(
                row={
                    "id": "extraction-1",
                    "file_id": "file-1",
                    "teacher_id": "teacher-1",
                    "extraction_status": "pending",
                    "structured_content": {"audit": {}},
                    "updated_at": datetime.now(timezone.utc),
                }
            )
        )

        with patch(
            "app.routers.extractions.run_extraction",
            new=AsyncMock(
                side_effect=ExtractionExecutionSuperseded(
                    "Extraction extraction-1 lost its worker lease"
                )
            ),
        ):
            result = await run_internal_extraction(
                extraction_id="extraction-1",
                meta={"bullmqJobId": "bull-extract-1", "attempt": 1},
                _auth=None,
                db=db,
            )

        self.assertTrue(result["success"])
        self.assertEqual(result["data"]["status"], "superseded")

    async def test_queue_compensated_extraction_is_terminal_if_enqueue_was_ambiguous(
        self,
    ) -> None:
        db = AsyncMock()
        db.execute = AsyncMock(
            return_value=query_result(
                row={
                    "id": "extraction-1",
                    "file_id": "file-1",
                    "teacher_id": "teacher-1",
                    "extraction_status": "failed",
                    "structured_content": {
                        "audit": {"queueCompensated": True}
                    },
                }
            )
        )

        with patch("app.routers.extractions.run_extraction", new=AsyncMock()) as run:
            result = await run_internal_extraction(
                extraction_id="extraction-1",
                meta={"bullmqJobId": "bull-extract-1", "attempt": 1},
                _auth=None,
                db=db,
            )

        self.assertEqual(result["data"]["status"], "failed")
        run.assert_not_awaited()

    async def test_failure_compensation_persists_terminal_audit_marker_atomically(
        self,
    ) -> None:
        db = AsyncMock()

        await fail_pending_internal_extraction(
            extraction_id="extraction-1",
            payload={"reason": "ambiguous Redis enqueue failure"},
            _auth=None,
            db=db,
        )

        statement = str(db.execute.await_args.args[0])
        self.assertIn("queueCompensated", statement)
        self.assertIn("extraction_status = 'pending'", statement)

    @patch(
        "app.routers.extractions._claim_extraction_execution",
        new_callable=AsyncMock,
        create=True,
        side_effect=[True, False],
    )
    async def test_two_pending_workers_execute_extraction_once(
        self,
        _mock_claim: AsyncMock,
    ) -> None:
        db = AsyncMock()
        db.execute = AsyncMock(
            return_value=query_result(
                row={
                    "id": "extraction-1",
                    "file_id": "file-1",
                    "teacher_id": "teacher-1",
                    "extraction_status": "pending",
                    "structured_content": {"audit": {}},
                }
            )
        )

        with patch("app.routers.extractions.run_extraction", new=AsyncMock()) as run:
            results = await asyncio.gather(
                run_internal_extraction(
                    extraction_id="extraction-1",
                    meta={"attempt": 1},
                    _auth=None,
                    db=db,
                ),
                run_internal_extraction(
                    extraction_id="extraction-1",
                    meta={"attempt": 1},
                    _auth=None,
                    db=db,
                ),
                return_exceptions=True,
            )

        self.assertEqual(run.await_count, 1)
        self.assertEqual(
            sorted(getattr(result, "status_code", 200) for result in results),
            [200, 409],
        )

    async def test_internal_route_rejects_malformed_worker_attempt(self) -> None:
        db = AsyncMock()
        db.execute = AsyncMock(
            return_value=query_result(
                row={
                    "id": "extraction-1",
                    "file_id": "file-1",
                    "teacher_id": "teacher-1",
                    "extraction_status": "pending",
                    "structured_content": {"audit": {}},
                }
            )
        )

        with patch("app.routers.extractions.run_extraction", new=AsyncMock()) as run:
            with self.assertRaises(HTTPException) as context:
                await run_internal_extraction(
                    extraction_id="extraction-1",
                    meta={"attempt": "not-an-int"},
                    _auth=None,
                    db=db,
                )

        self.assertEqual(context.exception.status_code, 400)
        run.assert_not_awaited()

    async def test_teacher_cancellation_is_not_reported_as_completed(self) -> None:
        db = AsyncMock()
        db.execute = AsyncMock(
            return_value=query_result(
                row={
                    "id": "extraction-1",
                    "file_id": "file-1",
                    "teacher_id": "teacher-1",
                    "extraction_status": "pending",
                    "structured_content": {"audit": {}},
                },
                scalar="extraction-1",
            )
        )

        with patch(
            "app.routers.extractions.run_extraction",
            new=AsyncMock(side_effect=ExtractionCancelled("teacher cancelled")),
        ):
            result = await run_internal_extraction(
                extraction_id="extraction-1",
                meta={"attempt": 1},
                _auth=None,
                db=db,
            )

        self.assertEqual(result["data"]["status"], "failed")
        self.assertIn("cancel", result["message"].lower())


if __name__ == "__main__":
    unittest.main()
