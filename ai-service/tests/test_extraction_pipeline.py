import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from app.extraction_pipeline import (
    _build_structure_prompt,
    _cleanup_text_first_sections,
    _derive_section_assessment_draft,
    _detect_structure_with_rules,
    _evaluate_extraction_against_golden,
    _merge_structured_chunks,
    run_extraction,
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
            target_section_count=4,
        )

        self.assertEqual(result["title"], "Lesson 1: Cells")
        self.assertTrue(result["sections"])
        self.assertTrue(result["sections"][0]["sectionId"].startswith("chunk-01-section-01"))
        self.assertGreater(result["sections"][0]["confidence"], 0)

    def test_build_structure_prompt_includes_target_section_count(self) -> None:
        chunk = TextChunk(
            index=1,
            total=1,
            text="Lesson 1: Cells\nCells are the basic unit of life.",
            context_header='Document: "Biology"',
            split_method="heading",
        )

        prompt = _build_structure_prompt(chunk, 5)

        self.assertIn("Target 5 major instructional section(s)", prompt)
        self.assertIn("Never create filler sections", prompt)

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
        self.assertIn("sourceSnippet", first_block["metadata"]["provenance"])
        self.assertIn("instructionalRole", first_block["metadata"])
        self.assertTrue(merged["audit"]["reviewIssues"])

    def test_merge_structured_chunks_is_text_first_and_ignores_page_images(self) -> None:
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
        self.assertFalse(image_blocks)
        self.assertEqual(merged["audit"]["imageAssignmentSummary"]["assigned"], 0)
        self.assertEqual(merged["audit"]["imageAssignmentSummary"]["unassigned"], 0)
        self.assertEqual(merged["mediaAssets"], [])

    def test_text_first_cleanup_records_merge_actions(self) -> None:
        cleaned, cleanup_warnings, cleanup = _cleanup_text_first_sections(
            [
                {
                    "title": "Overview",
                    "description": "",
                    "lessonBlocks": [
                        {"type": "text", "order": 0, "content": {"text": "Cells are the basic unit of life."}},
                    ],
                    "assessmentDraft": None,
                },
                {
                    "title": "Fragment",
                    "description": "",
                    "lessonBlocks": [
                        {"type": "text", "order": 0, "content": {"text": "Cells are the basic unit of life."}},
                    ],
                    "assessmentDraft": None,
                },
            ]
            ,
            target_section_count=1,
        )

        self.assertEqual(cleanup_warnings, [])
        self.assertTrue(cleanup.get("applied"))
        self.assertTrue(cleanup.get("actions"))
        self.assertEqual(len(cleaned), 1)

    def test_merge_structured_chunks_caps_final_sections_to_requested_count(self) -> None:
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
                            "sectionBody": "Cells are the basic unit of life. They make up all living things.",
                            "sectionKind": "lesson",
                            "chunkIndex": 1,
                            "pageStart": 1,
                            "pageEnd": 1,
                            "sourceMethod": "text",
                            "confidence": 0.8,
                        },
                        {
                            "sectionId": "chunk-01-section-02-membrane",
                            "sectionTitle": "Membranes",
                            "sectionDescription": "",
                            "sectionBody": "Cell membranes control what enters and exits the cell.",
                            "sectionKind": "lesson",
                            "chunkIndex": 1,
                            "pageStart": 1,
                            "pageEnd": 1,
                            "sourceMethod": "text",
                            "confidence": 0.79,
                        },
                        {
                            "sectionId": "chunk-01-section-03-energy",
                            "sectionTitle": "Energy",
                            "sectionDescription": "",
                            "sectionBody": "Cells need energy to carry out basic life processes.",
                            "sectionKind": "lesson",
                            "chunkIndex": 1,
                            "pageStart": 1,
                            "pageEnd": 1,
                            "sourceMethod": "text",
                            "confidence": 0.78,
                        },
                    ],
                }
            ],
            target_section_count=2,
        )

        self.assertEqual(len(merged["sections"]), 2)
        self.assertEqual(merged["audit"]["requestedSectionCount"], 2)
        self.assertEqual(merged["audit"]["finalSectionCount"], 2)
        self.assertTrue(merged["audit"]["coherenceCleanup"]["actions"])

    def test_merge_structured_chunks_honors_student_friendly_style_and_review_issues(self) -> None:
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
                            "sectionBody": "Objectives\nExplain cells.\nExample: A cell is like a small factory.",
                            "sectionKind": "lesson",
                            "chunkIndex": 1,
                            "pageStart": 1,
                            "pageEnd": 1,
                            "sourceMethod": "text",
                            "confidence": 0.52,
                        }
                    ],
                }
            ],
            target_section_count=4,
            extraction_style="student_friendly",
        )

        first_block = merged["sections"][0]["lessonBlocks"][0]
        self.assertEqual(first_block["metadata"]["extractionStyle"], "student_friendly")
        self.assertIn(first_block["metadata"]["instructionalRole"], {"objective", "example", "explanation"})
        self.assertEqual(merged["audit"]["reviewState"], "needs_review")
        self.assertTrue(
            any(issue["code"] == "low-section-confidence" for issue in merged["audit"]["reviewIssues"])
        )

    def test_golden_eval_scores_required_text_and_hallucinations(self) -> None:
        output = {
            "sections": [
                {
                    "title": "Cells",
                    "lessonBlocks": [
                        {"type": "text", "content": {"text": "Cells are the basic unit of life."}}
                    ],
                }
            ],
            "audit": {"reviewIssues": [{"code": "low-section-confidence"}]},
        }
        expected = {
            "sectionCount": 1,
            "requiredText": ["basic unit of life"],
            "forbiddenText": ["mitochondria is magic"],
            "issueCodes": ["low-section-confidence"],
        }

        score = _evaluate_extraction_against_golden(output, expected)

        self.assertTrue(score["passed"])
        self.assertEqual(score["missingRequiredText"], [])
        self.assertEqual(score["hallucinatedText"], [])

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


class ExtractionRuntimeTests(unittest.IsolatedAsyncioTestCase):
    async def test_run_extraction_skips_page_rendering_for_text_rich_pdf(self) -> None:
        db = MagicMock()
        upload_row = MagicMock()
        upload_row.mappings.return_value.first.return_value = {
            "file_path": "uploads/test.pdf",
            "original_name": "Biology.pdf",
        }
        db.execute = AsyncMock(return_value=upload_row)
        db.commit = AsyncMock()

        doc = MagicMock()

        with (
            patch("app.extraction_pipeline._update_extraction", new=AsyncMock()),
            patch(
                "app.extraction_pipeline.materialize_backend_upload",
                new=AsyncMock(return_value="uploads/test.pdf"),
            ),
            patch("app.extraction_pipeline.os.path.exists", return_value=True),
            patch("app.extraction_pipeline.fitz.open", return_value=doc),
            patch(
                "app.extraction_pipeline._extract_pdf_pages",
                return_value=[
                    {
                        "pageNumber": 1,
                        "text": "This PDF already has enough extractable text for the text-first path.",
                        "charCount": 68,
                    }
                ],
            ),
            patch("app.extraction_pipeline._extract_pdf_embedded_images") as extract_images,
            patch("app.extraction_pipeline._render_pdf_pages_to_images") as render_pages,
            patch(
                "app.extraction_pipeline.ollama_client.is_available",
                new=AsyncMock(return_value={"available": False}),
            ),
            patch(
                "app.extraction_pipeline.sanitize_extracted_text",
                side_effect=RuntimeError("stop-after-branch-selection"),
            ),
        ):
            await run_extraction(db, "extract-1", "file-1", "user-1")

        extract_images.assert_not_called()
        render_pages.assert_not_called()
        doc.close.assert_called_once()

    async def test_run_extraction_uses_vision_fallback_for_scanned_pdf(self) -> None:
        db = MagicMock()
        upload_row = MagicMock()
        upload_row.mappings.return_value.first.return_value = {
            "file_path": "uploads/test.pdf",
            "original_name": "Scanned.pdf",
        }
        db.execute = AsyncMock(return_value=upload_row)
        db.commit = AsyncMock()

        doc = MagicMock()

        with (
            patch("app.extraction_pipeline._update_extraction", new=AsyncMock()),
            patch(
                "app.extraction_pipeline.materialize_backend_upload",
                new=AsyncMock(return_value="uploads/test.pdf"),
            ),
            patch("app.extraction_pipeline.os.path.exists", return_value=True),
            patch("app.extraction_pipeline.fitz.open", return_value=doc),
            patch(
                "app.extraction_pipeline._extract_pdf_pages",
                return_value=[{"pageNumber": 1, "text": "", "charCount": 0}],
            ),
            patch(
                "app.extraction_pipeline._render_pdf_pages_to_images",
                return_value=[{"base64Data": "ZmFrZQ==", "mimeType": "image/png"}],
            ) as render_pages,
            patch(
                "app.extraction_pipeline.ollama_client.is_available",
                new=AsyncMock(return_value={"available": True}),
            ),
            patch(
                "app.extraction_pipeline.ollama_client.generate",
                new=AsyncMock(
                    return_value='{"title":"Scanned Module","description":"","sections":[{"title":"Page 1","blocks":[{"type":"text","order":0,"content":{"text":"Scanned lesson text"}}]}],"audit":{}}'
                ),
            ),
        ):
            await run_extraction(db, "extract-1", "file-1", "user-1")

        render_pages.assert_called_once()

    async def test_run_extraction_rejects_scanned_pdf_without_vision(self) -> None:
        db = MagicMock()
        upload_row = MagicMock()
        upload_row.mappings.return_value.first.return_value = {
            "file_path": "uploads/test.pdf",
            "original_name": "Scanned.pdf",
        }
        db.execute = AsyncMock(return_value=upload_row)
        db.commit = AsyncMock()

        doc = MagicMock()

        with (
            patch("app.extraction_pipeline._update_extraction", new=AsyncMock()) as update_extraction,
            patch(
                "app.extraction_pipeline.materialize_backend_upload",
                new=AsyncMock(return_value="uploads/test.pdf"),
            ),
            patch("app.extraction_pipeline.os.path.exists", return_value=True),
            patch("app.extraction_pipeline.fitz.open", return_value=doc),
            patch(
                "app.extraction_pipeline._extract_pdf_pages",
                return_value=[{"pageNumber": 1, "text": "", "charCount": 0}],
            ),
            patch(
                "app.extraction_pipeline.ollama_client.is_available",
                new=AsyncMock(return_value={"available": False}),
            ),
        ):
            await run_extraction(db, "extract-1", "file-1", "user-1")

        final_update = update_extraction.await_args_list[-1].args[2]
        self.assertEqual(final_update["extraction_status"], "failed")
        self.assertIn("vision extraction is unavailable", final_update["error_message"].lower())

    async def test_run_extraction_stops_when_cancel_requested(self) -> None:
        db = MagicMock()
        upload_row = MagicMock()
        upload_row.mappings.return_value.first.return_value = {
            "file_path": "uploads/test.pdf",
            "original_name": "Biology.pdf",
        }
        cancel_row = MagicMock()
        cancel_row.mappings.return_value.first.return_value = {
            "structured_content": {"audit": {"cancelRequested": True}},
        }
        db.execute = AsyncMock(side_effect=[upload_row, cancel_row])
        db.commit = AsyncMock()

        doc = MagicMock()

        with (
            patch("app.extraction_pipeline._update_extraction", new=AsyncMock()) as update_extraction,
            patch(
                "app.extraction_pipeline.materialize_backend_upload",
                new=AsyncMock(return_value="uploads/test.pdf"),
            ),
            patch("app.extraction_pipeline.os.path.exists", return_value=True),
            patch("app.extraction_pipeline.fitz.open", return_value=doc),
            patch(
                "app.extraction_pipeline._extract_pdf_pages",
                return_value=[{"pageNumber": 1, "text": "Enough selectable text for extraction.", "charCount": 38}],
            ),
        ):
            await run_extraction(db, "extract-1", "file-1", "user-1")

        final_update = update_extraction.await_args_list[-1].args[2]
        self.assertEqual(final_update["extraction_status"], "failed")
        self.assertIn("cancelled", final_update["error_message"].lower())


if __name__ == "__main__":
    unittest.main()
