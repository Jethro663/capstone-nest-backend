import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

from app import library_indexing_pipeline
from app.config import settings
from app.embedding_provider import EmbeddingBatch, EmbeddingProviderUnavailable


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


class LibraryIndexingTeacherPrivateTests(unittest.IsolatedAsyncioTestCase):
    async def test_index_library_file_supports_teacher_private_ai_enabled_files(self) -> None:
        file_row = {
            "id": "file-1",
            "file_path": "uploads/library/teacher-notes.pdf",
            "original_name": "Teacher Notes.pdf",
            "mime_type": "application/pdf",
            "size_bytes": 2048,
            "subject_key": "science",
            "grade_level": "7",
            "teacher_visible": False,
            "file_kind": "pdf",
            "content_hash": "hash-1",
            "teacher_id": "teacher-1",
            "class_id": "class-1",
            "scope": "private",
            "ai_enabled": True,
        }

        row_result = MagicMock()
        row_result.mappings.return_value.first.return_value = file_row

        insert_result = MagicMock()
        insert_result.scalar_one.return_value = "chunk-1"

        db = AsyncMock()
        db.execute = AsyncMock(
            side_effect=[
                row_result,
                MagicMock(),
                MagicMock(),
                insert_result,
                MagicMock(),
                MagicMock(),
            ]
        )
        db.commit = AsyncMock()

        with tempfile.TemporaryDirectory() as temp_dir:
            resolved_path = Path(temp_dir) / "teacher-notes.pdf"
            resolved_path.write_text("placeholder", encoding="utf-8")

            with patch.object(settings, "upload_dir", str(Path.cwd() / "tmp-uploads")), patch.object(
                library_indexing_pipeline,
                "_resolve_uploaded_path",
                return_value=resolved_path,
            ), patch.object(
                library_indexing_pipeline,
                "_extract_text",
                return_value="Cells use energy from food.",
            ), patch.object(
                library_indexing_pipeline,
                "sanitize_extracted_text",
                return_value=MagicMock(
                    cleaned_text="Cells use energy from food.",
                    warnings=[],
                ),
            ), patch.object(
                library_indexing_pipeline,
                "chunk_text_for_indexing",
                return_value=["Cells use energy from food."],
            ), patch.object(
                library_indexing_pipeline,
                "embed_texts",
                AsyncMock(return_value=[[0.1, 0.2, 0.3]]),
            ), patch.object(
                library_indexing_pipeline,
                "estimate_token_count",
                return_value=6,
            ):
                result = await library_indexing_pipeline.index_library_file(db, "file-1")

        self.assertEqual(result["fileId"], "file-1")
        self.assertEqual(result["chunksIndexed"], 1)
        insert_call = db.execute.await_args_list[3]
        insert_params = insert_call.args[1]
        self.assertEqual(insert_params["metadataJson"]["teacherId"], "teacher-1")
        self.assertEqual(insert_params["metadataJson"]["classId"], "class-1")
        self.assertEqual(insert_params["metadataJson"]["scope"], "private")
        self.assertTrue(insert_params["metadataJson"]["aiEnabled"])


class LibraryIndexingFailureTests(unittest.IsolatedAsyncioTestCase):
    async def test_embedding_failure_preserves_existing_chunks(self) -> None:
        file_row = {
            "id": "file-1",
            "file_path": "uploads/library/teacher-notes.pdf",
            "original_name": "Teacher Notes.pdf",
            "mime_type": "application/pdf",
            "size_bytes": 2048,
            "subject_key": "science",
            "grade_level": "7",
            "teacher_visible": False,
            "file_kind": "pdf",
            "content_hash": "hash-1",
            "teacher_id": "teacher-1",
            "class_id": "class-1",
            "scope": "private",
            "ai_enabled": True,
        }
        row_result = MagicMock()
        row_result.mappings.return_value.first.return_value = file_row
        db = AsyncMock()

        async def execute_side_effect(statement, *_args, **_kwargs):
            if "FROM uploaded_files" in str(statement):
                return row_result
            return MagicMock()

        db.execute = AsyncMock(side_effect=execute_side_effect)

        with tempfile.TemporaryDirectory() as temp_dir:
            resolved_path = Path(temp_dir) / "teacher-notes.pdf"
            resolved_path.write_text("placeholder", encoding="utf-8")
            with (
                patch.object(
                    library_indexing_pipeline,
                    "materialize_backend_upload",
                    AsyncMock(return_value=str(resolved_path)),
                ),
                patch.object(
                    library_indexing_pipeline,
                    "_extract_text",
                    return_value="Cells use energy from food.",
                ),
                patch.object(
                    library_indexing_pipeline,
                    "sanitize_extracted_text",
                    return_value=MagicMock(
                        cleaned_text="Cells use energy from food.", warnings=[]
                    ),
                ),
                patch.object(
                    library_indexing_pipeline,
                    "chunk_text_for_indexing",
                    return_value=["Cells use energy from food."],
                ),
                patch.object(
                    library_indexing_pipeline,
                    "embed_texts",
                    AsyncMock(side_effect=TimeoutError("embedding timed out")),
                ),
            ):
                with self.assertRaisesRegex(TimeoutError, "embedding timed out"):
                    await library_indexing_pipeline.index_library_file(db, "file-1")

        executed_sql = [str(call.args[0]) for call in db.execute.await_args_list]
        self.assertFalse(
            any("DELETE FROM content_chunks" in statement for statement in executed_sql)
        )
        db.rollback.assert_awaited_once()

    async def test_degraded_embedding_batch_preserves_existing_chunks(self) -> None:
        file_row = {
            "id": "file-1",
            "file_path": "uploads/library/teacher-notes.pdf",
            "original_name": "Teacher Notes.pdf",
            "mime_type": "application/pdf",
            "size_bytes": 2048,
            "subject_key": "science",
            "grade_level": "7",
            "teacher_visible": False,
            "file_kind": "pdf",
            "content_hash": "hash-1",
            "teacher_id": "teacher-1",
            "class_id": "class-1",
            "scope": "private",
            "ai_enabled": True,
        }
        row_result = MagicMock()
        row_result.mappings.return_value.first.return_value = file_row
        db = AsyncMock()

        async def execute_side_effect(statement, *_args, **_kwargs):
            if "FROM uploaded_files" in str(statement):
                return row_result
            return MagicMock()

        db.execute = AsyncMock(side_effect=execute_side_effect)
        degraded = EmbeddingBatch(
            [[0.1, 0.2]],
            provider="degraded",
            model="degraded:hash-embedding-v1",
            degraded=True,
            warnings=["provider unavailable"],
        )

        with tempfile.TemporaryDirectory() as temp_dir:
            resolved_path = Path(temp_dir) / "teacher-notes.pdf"
            resolved_path.write_text("placeholder", encoding="utf-8")
            with (
                patch.object(
                    library_indexing_pipeline,
                    "materialize_backend_upload",
                    AsyncMock(return_value=str(resolved_path)),
                ),
                patch.object(
                    library_indexing_pipeline,
                    "_extract_text",
                    return_value="Cells use energy from food.",
                ),
                patch.object(
                    library_indexing_pipeline,
                    "sanitize_extracted_text",
                    return_value=MagicMock(
                        cleaned_text="Cells use energy from food.", warnings=[]
                    ),
                ),
                patch.object(
                    library_indexing_pipeline,
                    "chunk_text_for_indexing",
                    return_value=["Cells use energy from food."],
                ),
                patch.object(
                    library_indexing_pipeline,
                    "embed_texts",
                    AsyncMock(return_value=degraded),
                ),
            ):
                with self.assertRaisesRegex(EmbeddingProviderUnavailable, "Semantic"):
                    await library_indexing_pipeline.index_library_file(db, "file-1")

        executed_sql = [str(call.args[0]) for call in db.execute.await_args_list]
        self.assertFalse(
            any("DELETE FROM content_chunks" in statement for statement in executed_sql)
        )
        db.rollback.assert_awaited_once()


if __name__ == "__main__":
    unittest.main()
