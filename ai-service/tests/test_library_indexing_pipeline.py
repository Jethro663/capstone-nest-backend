import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app import library_indexing_pipeline
from app.config import settings


class LibraryIndexingPathResolutionTests(unittest.TestCase):
    def test_resolve_uploaded_path_uses_configured_upload_dir_for_backend_relative_paths(self) -> None:
        with tempfile.TemporaryDirectory() as upload_root:
            library_dir = Path(upload_root) / "library"
            library_dir.mkdir(parents=True, exist_ok=True)
            expected_path = (library_dir / "demo.pdf").resolve()
            expected_path.write_text("placeholder", encoding="utf-8")

            with patch.object(settings, "upload_dir", upload_root):
                resolved = library_indexing_pipeline._resolve_uploaded_path(
                    "uploads/library/demo.pdf"
                )

            self.assertEqual(resolved, expected_path)


if __name__ == "__main__":
    unittest.main()
