import unittest

from app.indexing_pipeline import build_extraction_chunks


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


if __name__ == "__main__":
    unittest.main()

