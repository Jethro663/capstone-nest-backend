import unittest

from app.extraction_pipeline import _detect_structure_with_rules, _merge_structured_chunks
from app.pdf_chunker import TextChunk


class ExtractionPipelineTests(unittest.TestCase):
    def test_detect_structure_with_rules_adds_provenance(self) -> None:
        chunk = TextChunk(
            index=1,
            total=1,
            text="Lesson 1: Cells\nCells are the basic unit of life.\n1. What is a cell?",
            context_header='Document: "Biology"',
            split_method="heading",
        )
        result = _detect_structure_with_rules(
            chunk,
            pages=[{"pageNumber": 1, "text": chunk.text, "charCount": len(chunk.text)}],
            sanitization_warning_count=0,
        )

        self.assertEqual(result["title"], "Lesson 1: Cells")
        self.assertTrue(result["sections"])
        self.assertTrue(result["sections"][0]["sectionId"].startswith("chunk-01-section-01"))
        self.assertGreater(result["sections"][0]["confidence"], 0)

    def test_merge_structured_chunks_preserves_duplicate_titles_via_section_ids(self) -> None:
        merged = _merge_structured_chunks(
            [
                {
                    "title": "Module A",
                    "description": "Demo module",
                    "sections": [
                        {
                            "sectionId": "chunk-01-section-01-intro",
                            "sectionTitle": "Introduction",
                            "sectionDescription": "",
                            "sectionBody": "Cells are small.",
                            "sectionKind": "lesson",
                            "chunkIndex": 1,
                            "pageStart": 1,
                            "pageEnd": 1,
                            "sourceMethod": "text",
                            "confidence": 0.8,
                        },
                        {
                            "sectionId": "chunk-02-section-01-intro",
                            "sectionTitle": "Introduction",
                            "sectionDescription": "",
                            "sectionBody": "Cells have membranes.",
                            "sectionKind": "lesson",
                            "chunkIndex": 2,
                            "pageStart": 2,
                            "pageEnd": 2,
                            "sourceMethod": "text",
                            "confidence": 0.76,
                        },
                    ],
                }
            ]
        )

        self.assertEqual(len(merged["lessons"]), 2)
        self.assertIn("duplicated display titles", " ".join(merged["audit"]["warnings"]).lower())
        self.assertIn("qualityGate", merged["audit"])
        self.assertIn("reviewRequired", merged["audit"])
        self.assertIn("confidenceBreakdown", merged["audit"])
        first_block = merged["lessons"][0]["blocks"][0]
        self.assertEqual(first_block["metadata"]["sectionId"], "chunk-01-section-01-intro")


if __name__ == "__main__":
    unittest.main()
