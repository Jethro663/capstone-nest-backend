import unittest

from app.indexing_pipeline import build_class_index_status, build_extraction_chunks


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
