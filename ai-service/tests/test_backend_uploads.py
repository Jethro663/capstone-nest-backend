import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app import backend_uploads


class BackendUploadsTests(unittest.IsolatedAsyncioTestCase):
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
                    content = b"s3-file-bytes"
                    def raise_for_status(self):
                        pass

                mock_client = mock_get_client.return_value
                mock_get = unittest.mock.AsyncMock(return_value=FakeResponse())
                mock_client.get = mock_get

                import uuid
                unique_s3_path = f"s3://library/math/quiz-{uuid.uuid4().hex}.pdf"
                result = await backend_uploads.materialize_backend_upload(unique_s3_path)
                self.assertIsNotNone(result)
                self.assertTrue(Path(result).exists())
                self.assertEqual(Path(result).read_bytes(), b"s3-file-bytes")
                self.assertTrue(mock_get.called)
                _, kwargs = mock_get.call_args
                self.assertTrue(kwargs.get("follow_redirects"), "Expected follow_redirects=True on client.get")


if __name__ == "__main__":
    unittest.main()
