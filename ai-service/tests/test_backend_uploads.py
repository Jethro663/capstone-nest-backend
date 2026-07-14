import asyncio
import tempfile
import threading
import unittest
import uuid
from pathlib import Path
from unittest.mock import patch

from app import backend_uploads


class BackendUploadsTests(unittest.IsolatedAsyncioTestCase):
    async def asyncTearDown(self) -> None:
        current_task = asyncio.current_task()
        pending_tasks = [
            task
            for task in asyncio.all_tasks()
            if task is not current_task and not task.done()
        ]
        non_main_threads = [
            thread
            for thread in threading.enumerate()
            if thread is not threading.main_thread() and thread.is_alive()
        ]
        self.assertEqual([], pending_tasks, f"Pending asyncio tasks: {pending_tasks}")
        self.assertEqual([], non_main_threads, f"Live worker threads: {non_main_threads}")

    async def test_materialize_backend_upload_resolves_uploads_prefixes_under_upload_dir(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            upload_root = Path(temp_dir)
            pdf_path = upload_root / "pdfs" / "lesson.pdf"
            pdf_path.parent.mkdir(parents=True)
            pdf_path.write_text("content", encoding="utf-8")

            with patch.object(backend_uploads.settings, "upload_dir", str(upload_root)):
                self.assertEqual(
                    await backend_uploads.materialize_backend_upload("uploads/pdfs/lesson.pdf"),
                    str(pdf_path),
                )
                self.assertEqual(
                    await backend_uploads.materialize_backend_upload("./uploads/pdfs/lesson.pdf"),
                    str(pdf_path),
                )

    async def test_materialize_backend_upload_s3_fetches_via_internal_endpoint(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            upload_root = Path(temp_dir)
            with (
                patch.object(backend_uploads.settings, "upload_dir", str(upload_root)),
                patch.object(backend_uploads.settings, "backend_internal_url", "http://localhost:3000"),
                patch("app.backend_uploads._get_upload_client") as mock_get_client,
            ):
                class FakeResponse:
                    status_code = 200
                    headers: dict[str, str] = {}
                    content = b"s3-file-bytes"
                    def raise_for_status(self):
                        pass

                mock_client = mock_get_client.return_value
                mock_get = unittest.mock.AsyncMock(return_value=FakeResponse())
                mock_client.get = mock_get

                unique_s3_path = f"s3://library/math/quiz-{uuid.uuid4().hex}.pdf"
                result = await backend_uploads.materialize_backend_upload(unique_s3_path)
                self.assertIsNotNone(result)
                self.assertTrue(Path(result).exists())
                self.assertEqual(Path(result).read_bytes(), b"s3-file-bytes")
                self.assertTrue(mock_get.called)
                _, kwargs = mock_get.call_args
                self.assertEqual(False, kwargs.get("follow_redirects"))

    async def test_materialize_backend_upload_does_not_forward_internal_secret_to_redirect(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            upload_root = Path(temp_dir)
            with (
                patch.object(backend_uploads.settings, "upload_dir", str(upload_root)),
                patch.object(backend_uploads.settings, "backend_internal_url", "http://backend:3000"),
                patch.object(backend_uploads.settings, "ai_service_shared_secret", "internal-secret"),
                patch("app.backend_uploads._get_upload_client") as mock_get_client,
            ):
                class FakeResponse:
                    def __init__(
                        self,
                        status_code: int,
                        *,
                        content: bytes = b"",
                        headers: dict[str, str] | None = None,
                    ) -> None:
                        self.status_code = status_code
                        self.content = content
                        self.headers = headers or {}

                    def raise_for_status(self) -> None:
                        pass

                storage_url = "https://storage.example.test/signed/document.pdf?signature=test"
                mock_client = mock_get_client.return_value
                mock_get = unittest.mock.AsyncMock(
                    side_effect=[
                        FakeResponse(302, headers={"Location": storage_url}),
                        FakeResponse(200, content=b"redirected-file-bytes"),
                    ]
                )
                mock_client.get = mock_get

                unique_s3_path = f"s3://library/math/redirect-{uuid.uuid4().hex}.pdf"
                result = await backend_uploads.materialize_backend_upload(unique_s3_path)

                self.assertIsNotNone(result)
                self.assertEqual(Path(result).read_bytes(), b"redirected-file-bytes")
                self.assertEqual(2, mock_get.await_count)

                first_call, redirected_call = mock_get.await_args_list
                self.assertEqual(False, first_call.kwargs["follow_redirects"])
                self.assertEqual(
                    "internal-secret",
                    first_call.kwargs["headers"]["X-Internal-Service-Token"],
                )
                self.assertEqual(storage_url, redirected_call.args[0])
                self.assertEqual(True, redirected_call.kwargs["follow_redirects"])
                self.assertNotIn("headers", redirected_call.kwargs)

    def test_resolve_http_redirect_url_accepts_relative_http_and_rejects_other_schemes(self) -> None:
        request_url = "http://backend:3000/api/internal/uploads/raw?path=test"

        self.assertEqual(
            "http://backend:3000/storage/document.pdf",
            backend_uploads._resolve_http_redirect_url(
                request_url,
                "/storage/document.pdf",
            ),
        )
        for location in ("s3://bucket/document.pdf", "file:///tmp/document.pdf"):
            with self.subTest(location=location):
                with self.assertRaises(ValueError):
                    backend_uploads._resolve_http_redirect_url(request_url, location)


if __name__ == "__main__":
    unittest.main()
