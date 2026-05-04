import unittest

from app.main import _normalize_structured_content


class ExtractionNormalizationTests(unittest.TestCase):
    def test_legacy_lessons_are_upconverted_to_sections(self) -> None:
        payload = {
            "title": "Legacy Module",
            "description": "Legacy Description",
            "lessons": [
                {
                    "title": "Lesson 1",
                    "description": "Desc 1",
                    "blocks": [
                        {
                            "type": "text",
                            "order": 0,
                            "content": {"text": "Body"},
                            "metadata": {},
                        }
                    ],
                }
            ],
        }

        normalized = _normalize_structured_content(payload)

        self.assertEqual(normalized["title"], "Legacy Module")
        self.assertEqual(len(normalized["sections"]), 1)
        self.assertEqual(normalized["sections"][0]["title"], "Lesson 1")
        self.assertEqual(
            normalized["sections"][0]["lessonBlocks"][0]["type"],
            "text",
        )

    def test_question_blocks_generate_assessment_draft_when_missing(self) -> None:
        payload = {
            "title": "Module",
            "description": "",
            "sections": [
                {
                    "title": "Section 1",
                    "description": "",
                    "lessonBlocks": [
                        {
                            "type": "question",
                            "order": 0,
                            "content": {"text": "What is a cell?"},
                            "metadata": {},
                        }
                    ],
                }
            ],
        }

        normalized = _normalize_structured_content(payload)
        draft = normalized["sections"][0]["assessmentDraft"]

        self.assertIsNotNone(draft)
        self.assertEqual(draft["type"], "quiz")
        self.assertEqual(len(draft["questions"]), 1)
        self.assertEqual(draft["questions"][0]["content"], "What is a cell?")

    def test_media_assets_and_section_graph_hints_are_preserved(self) -> None:
        payload = {
            "title": "Module",
            "description": "",
            "sections": [
                {
                    "title": "Section 1",
                    "description": "",
                    "graphKeywords": ["cell", "membrane"],
                    "figureReferences": ["figure:1"],
                    "lessonBlocks": [
                        {
                            "type": "image",
                            "order": 0,
                            "content": {
                                "url": "data:image/png;base64,ZmFrZQ==",
                                "caption": "Figure 1",
                            },
                            "metadata": {
                                "mediaAssetId": "image-1",
                                "assignmentConfidence": 0.82,
                            },
                        }
                    ],
                }
            ],
            "mediaAssets": [
                {
                    "id": "image-1",
                    "url": "data:image/png;base64,ZmFrZQ==",
                    "pageNumber": 1,
                    "caption": "Figure 1",
                    "anchorText": "Figure 1. Cell membrane.",
                    "keywords": ["cell", "membrane"],
                    "figureReferences": ["figure:1"],
                    "selectedSectionIndex": 0,
                    "assignmentConfidence": 0.82,
                    "assignmentBreakdown": {"explicitReference": 1.0},
                    "candidateSections": [{"sectionIndex": 0, "score": 0.82}],
                    "teacherReviewed": True,
                }
            ],
        }

        normalized = _normalize_structured_content(payload)

        self.assertEqual(normalized["sections"][0]["graphKeywords"], ["cell", "membrane"])
        self.assertEqual(normalized["sections"][0]["figureReferences"], ["figure:1"])
        self.assertEqual(normalized["mediaAssets"][0]["selectedSectionIndex"], 0)
        self.assertTrue(normalized["mediaAssets"][0]["teacherReviewed"])


if __name__ == "__main__":
    unittest.main()
