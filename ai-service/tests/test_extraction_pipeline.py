import unittest

from app.extraction_pipeline import (
    _attach_images_to_sections,
    _derive_section_assessment_draft,
    _detect_structure_with_rules,
    _merge_structured_chunks,
)
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

        self.assertEqual(len(merged["sections"]), 2)
        self.assertIn("duplicated display titles", " ".join(merged["audit"]["warnings"]).lower())
        self.assertIn("qualityGate", merged["audit"])
        self.assertIn("reviewRequired", merged["audit"])
        self.assertIn("confidenceBreakdown", merged["audit"])
        first_block = merged["sections"][0]["lessonBlocks"][0]
        self.assertEqual(first_block["metadata"]["sectionId"], "chunk-01-section-01-intro")

    def test_merge_structured_chunks_attaches_pdf_image_blocks(self) -> None:
        merged = _merge_structured_chunks(
            [
                {
                    "title": "Module A",
                    "description": "Demo module",
                    "sections": [
                        {
                            "sectionId": "chunk-01-section-01-ecosystem",
                            "sectionTitle": "Ecosystem",
                            "sectionDescription": "",
                            "sectionBody": "Figure 1 shows an ecosystem with organisms and environment interactions.",
                            "sectionKind": "lesson",
                            "chunkIndex": 1,
                            "pageStart": 1,
                            "pageEnd": 1,
                            "sourceMethod": "text",
                            "confidence": 0.8,
                        }
                    ],
                }
            ],
            page_images=[
                {
                    "pageNumber": 1,
                    "dataUrl": "data:image/png;base64,ZmFrZQ==",
                    "width": 100,
                    "height": 100,
                    "alt": "Extracted figure from page 1",
                }
            ],
        )

        blocks = merged["sections"][0]["lessonBlocks"]
        image_blocks = [block for block in blocks if block.get("type") == "image"]
        self.assertTrue(image_blocks)
        self.assertEqual(
            image_blocks[0]["content"]["url"],
            "data:image/png;base64,ZmFrZQ==",
        )
        self.assertEqual(merged["audit"]["imageAssignmentSummary"]["assigned"], 1)

    def test_low_confidence_image_assignment_stays_unassigned(self) -> None:
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
                            "sectionBody": "Cells are the basic unit of life.",
                            "sectionKind": "lesson",
                            "chunkIndex": 1,
                            "pageStart": 1,
                            "pageEnd": 1,
                            "sourceMethod": "text",
                            "confidence": 0.8,
                        }
                    ],
                }
            ],
            page_images=[
                {
                    "id": "img-1",
                    "pageNumber": 3,
                    "dataUrl": "data:image/png;base64,ZmFrZQ==",
                    "width": 100,
                    "height": 100,
                    "alt": "Extracted figure from page 3",
                    "anchorText": "Figure 4. A chloroplast diagram.",
                    "keywords": ["chloroplast", "diagram"],
                    "figureReferences": ["figure:4"],
                }
            ],
        )

        image_blocks = [
            block
            for block in merged["sections"][0]["lessonBlocks"]
            if block.get("type") == "image"
        ]
        self.assertFalse(image_blocks)
        self.assertEqual(merged["audit"]["imageAssignmentSummary"]["unassigned"], 1)
        self.assertTrue(merged["audit"]["reviewFlags"])

    def test_image_reuse_requires_explicit_citation(self) -> None:
        sections = [
            {
                "title": "Section 1",
                "description": "Figure 2 explains cellular transport.",
                "lessonBlocks": [
                    {"type": "text", "order": 0, "content": {"text": "Study Figure 2 carefully."}},
                ],
                "pageStart": 2,
                "pageEnd": 2,
                "graphKeywords": ["cellular", "transport"],
                "figureReferences": ["figure:2"],
            },
            {
                "title": "Section 2",
                "description": "Figure 2 is referenced in the summary.",
                "lessonBlocks": [
                    {"type": "text", "order": 0, "content": {"text": "As seen in Figure 2, diffusion occurs."}},
                ],
                "pageStart": 2,
                "pageEnd": 2,
                "graphKeywords": ["summary", "diffusion"],
                "figureReferences": ["figure:2"],
            },
        ]
        summary = _attach_images_to_sections(
            sections,
            [
                {
                    "id": "img-2",
                    "pageNumber": 2,
                    "dataUrl": "data:image/png;base64,ZmFrZQ==",
                    "width": 100,
                    "height": 100,
                    "alt": "Figure 2",
                    "anchorText": "Figure 2. Cell transport diagram.",
                    "keywords": ["cell", "transport", "diagram"],
                    "figureReferences": ["figure:2"],
                }
            ],
        )

        section1_images = [block for block in sections[0]["lessonBlocks"] if block.get("type") == "image"]
        section2_images = [block for block in sections[1]["lessonBlocks"] if block.get("type") == "image"]
        self.assertTrue(section1_images)
        self.assertTrue(section2_images)
        self.assertEqual(summary["reusedByCitation"], 1)

    def test_assessment_media_attaches_only_when_question_references_figure(self) -> None:
        draft = _derive_section_assessment_draft(
            section_title="Section 1",
            lesson_blocks=[
                {"type": "question", "order": 0, "content": {"text": "What is osmosis?"}},
                {"type": "question", "order": 1, "content": {"text": "Based on Figure 3, explain diffusion."}},
            ],
            image_url="data:image/png;base64,ZmFrZQ==",
        )

        self.assertIsNotNone(draft)
        if draft is None:
            return
        self.assertIsNone(draft["questions"][0]["imageUrl"])
        self.assertEqual(draft["questions"][1]["imageUrl"], "data:image/png;base64,ZmFrZQ==")


if __name__ == "__main__":
    unittest.main()
