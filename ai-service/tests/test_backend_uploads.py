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


if __name__ == "__main__":
    unittest.main()
