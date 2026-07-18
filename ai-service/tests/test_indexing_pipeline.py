import asyncio
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from app import indexing_pipeline
from app.embedding_provider import EmbeddingBatch, EmbeddingProviderUnavailable
from app.indexing_pipeline import IndexChunk, build_class_index_status, build_extraction_chunks


class IndexingPipelineTests(unittest.TestCase):
    def test_extraction_chunks_include_graph_hints_without_data_urls(self) -> None:
        rows = [
            {
                "id": "extraction-1",
                "class_id": "class-1",
                "teacher_id": "teacher-1",
                "subject_name": "Science",
                "subject_code": "SCI-8",
                "grade_level": "8",
                "is_applied": False,
                "structured_content": {
                    "title": "Cells Module",
                    "sections": [
                        {
                            "title": "Cell Structure",
                            "description": "Understand cell parts.",
                            "graphKeywords": ["cell", "membrane", "organelle"],
                            "figureReferences": ["figure:1"],
                            "lessonBlocks": [
                                {"type": "text", "content": {"text": "Cells contain organelles."}},
                                {
                                    "type": "image",
                                    "content": {
                                        "url": "data:image/png;base64,AAAAAAAA",
                                        "caption": "Figure 1: Cell diagram",
                                    },
                                },
                            ],
                            "assessmentDraft": {
                                "title": "Checkpoint",
                                "description": "Quick check",
                                "questions": [{"content": "What is a membrane?"}],
                            },
                        }
                    ],
                    "audit": {
                        "coherenceWarnings": ["Section order was normalized to maintain monotonic page progression."],
                    },
                },
            }
        ]

        chunks = build_extraction_chunks(rows)
        self.assertTrue(chunks)
        chunk_text = chunks[0].chunk_text
        self.assertIn("Section keywords:", chunk_text)
        self.assertIn("Figure references:", chunk_text)
        self.assertIn("Coherence context:", chunk_text)
        self.assertNotIn("data:image/png;base64", chunk_text)

    def test_build_class_index_status_marks_ready_lessons_that_need_indexing(self) -> None:
        status = build_class_index_status(
            "class-1",
            lesson_rows=[
                {
                    "lesson_id": "lesson-1",
                    "lesson_title": "Fractions",
                    "is_draft": False,
                    "source_updated_at": "2026-04-24T08:00:00+00:00",
                    "blocks_json": [
                        {
                            "id": "block-1",
                            "type": "text",
                            "content": {"text": "Fractions compare parts of a whole."},
                        }
                    ],
                }
            ],
            extraction_rows=[],
            assessment_rows=[],
            chunk_rows=[],
        )

        self.assertTrue(status["needsReindex"])
        self.assertEqual(status["chunksIndexed"], 0)
        self.assertEqual(status["sourceSummary"]["lessons"]["ready"], 1)
        self.assertEqual(status["readyLessons"][0]["status"], "ready_to_index")
        self.assertIn("Reindex", status["reason"])


class IndexingPipelineResilienceTests(unittest.IsolatedAsyncioTestCase):
    async def test_index_status_counts_only_the_current_embedding_model(self) -> None:
        rows = MagicMock()
        rows.mappings.return_value = []
        db = AsyncMock()
        db.execute = AsyncMock(return_value=rows)

        with patch.object(
            indexing_pipeline,
            "get_embedding_model_label",
            return_value="ollama:model-current",
        ):
            await indexing_pipeline._fetch_chunk_status_rows(db, "class-1")

        query, params = db.execute.await_args.args
        self.assertIn("e.embedding_model = :embeddingModel", str(query))
        self.assertEqual(params["embeddingModel"], "ollama:model-current")

    async def test_class_reindex_acquires_transaction_lock_before_source_reads(self) -> None:
        events: list[str] = []
        db = AsyncMock()

        async def execute(statement, *_args, **_kwargs):
            events.append(str(statement))
            return MagicMock()

        async def fetch_lesson_rows(*_args):
            events.append("fetch lesson rows")
            return []

        db.execute = AsyncMock(side_effect=execute)
        with (
            patch.object(
                indexing_pipeline,
                "_fetch_lesson_rows",
                side_effect=fetch_lesson_rows,
            ),
            patch.object(indexing_pipeline, "_fetch_extraction_rows", AsyncMock(return_value=[])),
            patch.object(indexing_pipeline, "_fetch_question_rows", AsyncMock(return_value=[])),
        ):
            await indexing_pipeline.reindex_class_content(db, "class-1")

        self.assertIn("pg_advisory_xact_lock", events[0])
        self.assertEqual(events[1], "fetch lesson rows")
        self.assertIn("class_content_reindex", events[0])

    async def test_non_empty_class_reindex_commits_replacement_chunks(self) -> None:
        chunk = IndexChunk(
            source_type="lesson_block",
            source_id="block-1",
            class_id="class-1",
            lesson_id="lesson-1",
            chunk_text="Photosynthesis uses sunlight.",
            chunk_order=0,
            metadata={"isPublished": True},
        )
        insert_result = MagicMock()
        insert_result.scalar_one.return_value = "chunk-1"
        db = AsyncMock()
        db.execute = AsyncMock(
            side_effect=[MagicMock(), MagicMock(), insert_result, MagicMock()]
        )

        with (
            patch.object(indexing_pipeline, "_fetch_lesson_rows", AsyncMock(return_value=[])),
            patch.object(indexing_pipeline, "_fetch_extraction_rows", AsyncMock(return_value=[])),
            patch.object(indexing_pipeline, "_fetch_question_rows", AsyncMock(return_value=[])),
            patch.object(indexing_pipeline, "build_lesson_chunks", return_value=[chunk]),
            patch.object(indexing_pipeline, "build_extraction_chunks", return_value=[]),
            patch.object(indexing_pipeline, "build_question_chunks", return_value=[]),
            patch.object(indexing_pipeline, "embed_texts", AsyncMock(return_value=[[0.1, 0.2]])),
        ):
            result = await indexing_pipeline.reindex_class_content(db, "class-1")

        self.assertEqual(result["chunksIndexed"], 1)
        db.commit.assert_awaited_once()

    async def test_degraded_embedding_batch_preserves_existing_class_chunks(self) -> None:
        chunk = IndexChunk(
            source_type="lesson_block",
            source_id="block-1",
            class_id="class-1",
            lesson_id="lesson-1",
            chunk_text="Photosynthesis uses sunlight.",
            chunk_order=0,
            metadata={"isPublished": True},
        )
        db = AsyncMock()
        db.execute = AsyncMock(return_value=MagicMock())
        degraded = EmbeddingBatch(
            [[0.1, 0.2]],
            provider="degraded",
            model="degraded:hash-embedding-v1",
            degraded=True,
            warnings=["provider unavailable"],
        )

        with (
            patch.object(indexing_pipeline, "_fetch_lesson_rows", AsyncMock(return_value=[])),
            patch.object(indexing_pipeline, "_fetch_extraction_rows", AsyncMock(return_value=[])),
            patch.object(indexing_pipeline, "_fetch_question_rows", AsyncMock(return_value=[])),
            patch.object(indexing_pipeline, "build_lesson_chunks", return_value=[chunk]),
            patch.object(indexing_pipeline, "build_extraction_chunks", return_value=[]),
            patch.object(indexing_pipeline, "build_question_chunks", return_value=[]),
            patch.object(indexing_pipeline, "embed_texts", AsyncMock(return_value=degraded)),
        ):
            with self.assertRaisesRegex(EmbeddingProviderUnavailable, "Semantic"):
                await indexing_pipeline.reindex_class_content(db, "class-1")

        executed_sql = [str(call.args[0]) for call in db.execute.await_args_list]
        self.assertFalse(any("DELETE FROM content_chunks" in sql for sql in executed_sql))
        db.rollback.assert_awaited_once()

    async def test_index_status_queries_do_not_share_one_session_concurrently(self) -> None:
        active = 0
        peak_active = 0

        async def tracked_fetch(*_args):
            nonlocal active, peak_active
            active += 1
            peak_active = max(peak_active, active)
            await asyncio.sleep(0)
            active -= 1
            return []

        with (
            patch.object(indexing_pipeline, "_fetch_lesson_status_rows", side_effect=tracked_fetch),
            patch.object(indexing_pipeline, "_fetch_extraction_status_rows", side_effect=tracked_fetch),
            patch.object(indexing_pipeline, "_fetch_assessment_status_rows", side_effect=tracked_fetch),
            patch.object(indexing_pipeline, "_fetch_chunk_status_rows", side_effect=tracked_fetch),
        ):
            await indexing_pipeline.get_class_index_status(AsyncMock(), "class-1")

        self.assertEqual(peak_active, 1)

    def test_build_class_index_status_reports_blockers_when_no_usable_sources_exist(self) -> None:
        status = build_class_index_status(
            "class-1",
            lesson_rows=[
                {
                    "lesson_id": "lesson-draft",
                    "lesson_title": "Draft lesson",
                    "is_draft": True,
                    "source_updated_at": "2026-04-24T08:00:00+00:00",
                    "blocks_json": [],
                }
            ],
            extraction_rows=[
                {
                    "id": "extraction-1",
                    "extraction_status": "failed",
                    "structured_content": None,
                    "error_message": "OCR failed",
                    "source_updated_at": "2026-04-24T08:05:00+00:00",
                    "original_name": "module.pdf",
                }
            ],
            assessment_rows=[],
            chunk_rows=[],
        )

        self.assertFalse(status["needsReindex"])
        self.assertEqual(status["sourceSummary"]["lessons"]["blocked"], 1)
        self.assertEqual(status["sourceSummary"]["extractions"]["blocked"], 1)
        self.assertIn("No usable class sources are ready yet", status["reason"])

    def test_build_class_index_status_tolerates_completed_extractions_without_subject_metadata(self) -> None:
        status = build_class_index_status(
            "class-1",
            lesson_rows=[],
            extraction_rows=[
                {
                    "id": "extraction-ready",
                    "class_id": "class-1",
                    "teacher_id": "teacher-1",
                    "extraction_status": "completed",
                    "structured_content": {
                        "title": "Fractions Module",
                        "sections": [
                            {
                                "title": "Equivalent Fractions",
                                "lessonBlocks": [
                                    {
                                        "type": "text",
                                        "content": {"text": "Equivalent fractions name the same value."},
                                    }
                                ],
                            }
                        ],
                    },
                    "error_message": None,
                    "source_updated_at": "2026-04-24T08:05:00+00:00",
                    "original_name": "fractions.pdf",
                }
            ],
            assessment_rows=[],
            chunk_rows=[],
        )

        self.assertTrue(status["needsReindex"])
        self.assertEqual(status["sourceSummary"]["extractions"]["ready"], 1)
        self.assertEqual(status["readyExtractions"][0]["status"], "ready_to_index")
        self.assertIn("Reindex", status["reason"])


if __name__ == "__main__":
    unittest.main()
