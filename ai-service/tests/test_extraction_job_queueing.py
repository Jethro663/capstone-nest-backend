import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

from fastapi import HTTPException

from app.main import (
    RequestUser,
    extract_module,
    retry_extraction,
    run_internal_extraction,
)
from app.schemas import ExtractRequest, RetryExtractionRequest


def query_result(*, row=None, scalar=None):
    return SimpleNamespace(
        mappings=lambda: SimpleNamespace(first=lambda: row),
        scalar_one=lambda: scalar,
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

        run.assert_awaited_once_with(
            db,
            "extraction-1",
            "file-1",
            "teacher-1",
            target_section_count=5,
            extraction_style="faithful",
            raise_on_failure=True,
        )
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
                    "updated_at": datetime.now(timezone.utc) - timedelta(minutes=10),
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


if __name__ == "__main__":
    unittest.main()
