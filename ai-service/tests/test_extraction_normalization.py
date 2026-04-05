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


if __name__ == "__main__":
    unittest.main()

