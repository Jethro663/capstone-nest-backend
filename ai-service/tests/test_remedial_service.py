import unittest
from unittest.mock import AsyncMock, MagicMock
from unittest.mock import patch

from app import remedial_service


class RemedialServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_load_assessment_concept_map_uses_expanding_bind(self) -> None:
        fake_rows = MagicMock()
        fake_rows.mappings.return_value = [
            {"assessment_id": "assessment-1", "concept_tags": ["Sets", "Union"]},
            {"assessment_id": "assessment-1", "concept_tags": '["Intersection", " "]'},
            {"assessment_id": "assessment-2", "concept_tags": None},
        ]
        fake_db = AsyncMock()
        fake_db.execute = AsyncMock(return_value=fake_rows)

        concept_map = await remedial_service._load_assessment_concept_map(
            fake_db,
            ["assessment-1", "assessment-2"],
        )

        query = fake_db.execute.await_args.args[0]
        self.assertIn("assessment_id IN", str(query))
        self.assertNotIn("ANY(", str(query))
        self.assertEqual(
            concept_map["assessment-1"],
            {"sets", "union", "intersection"},
        )
        self.assertEqual(concept_map["assessment-2"], set())

    def test_sanitize_plain_text_strips_html_and_collapses_whitespace(self) -> None:
        cleaned = remedial_service._sanitize_plain_text(
            "<p> Rational <strong>Expressions</strong> &nbsp; basics </p>",
        )

        self.assertEqual(cleaned, "Rational Expressions basics")

    def test_derive_question_focus_label_prefers_concise_concepts(self) -> None:
        self.assertEqual(
            remedial_service._derive_question_focus_label(
                'What does the conjunction "and" mean in set problems?',
            ),
            'conjunction "and" in set problems',
        )
        self.assertEqual(
            remedial_service._derive_question_focus_label(
                "If 25 students like both English and Mathematics, this represents which operation?",
            ),
            "intersection of sets",
        )

    def test_failed_retry_assessment_sql_requires_failed_attempts(self) -> None:
        self.assertIn(
            "aa.passed = false",
            remedial_service.FAILED_RETRY_ASSESSMENT_SQL,
        )

    def test_generated_guided_assessment_hints_are_student_friendly(self) -> None:
        draft = remedial_service._build_generated_guided_assessment_draft(
            ["________ are homogeneous and have the same properties throughout the sample"],
            [
                {
                    "assessmentId": "assessment-1",
                    "title": "Module 2 Quiz",
                    "reason": "Recent failed assessment.",
                }
            ],
            [
                {
                    "id": "question-1",
                    "type": "multiple_choice",
                    "content": "________ are homogeneous and have the same properties throughout the sample.",
                    "concept_tags": [
                        "________ are homogeneous and have the same properties throughout the sample"
                    ],
                    "explanation": "",
                    "options": [
                        {"id": "a", "text": "Homogeneous mixtures", "isCorrect": True},
                        {"id": "b", "text": "Compounds", "isCorrect": False},
                    ],
                }
            ],
        )

        self.assertIsNotNone(draft)
        hint = draft["questions"][0]["hint"]
        self.assertNotIn("________", hint)
        self.assertIn("homogeneous", hint.lower())
        self.assertIn("same properties", hint.lower())

    def test_generated_guided_assessment_review_hint_uses_lesson_evidence(self) -> None:
        draft = remedial_service._build_generated_guided_assessment_draft(
            ["water cycle sequence"],
            [
                {
                    "assessmentId": "assessment-1",
                    "title": "Water Cycle Quiz",
                    "reason": "Recent failed assessment.",
                }
            ],
            [
                {
                    "id": "question-1",
                    "type": "multiple_choice",
                    "content": "Which step happens after vapor cools near the end of the water cycle?",
                    "concept_tags": ["water cycle sequence"],
                    "explanation": "Condensation happens when water vapor cools into liquid water.",
                    "options": [
                        {"id": "a", "text": "Condensation", "isCorrect": True},
                        {"id": "b", "text": "Collection", "isCorrect": False},
                    ],
                }
            ],
            [
                {
                    "lessonId": "lesson-1",
                    "title": "Water Cycle Module",
                    "sourceReference": "Lesson 3, final steps",
                    "contentSnippet": "Near the last steps, vapor cools and changes back into liquid water.",
                    "reason": "Matches weak concepts: water cycle sequence",
                }
            ],
        )

        self.assertIsNotNone(draft)
        review_hint = draft["questions"][0]["reviewHint"]
        self.assertIn("Water Cycle Module", review_hint)
        self.assertIn("vapor cools", review_hint)
        self.assertNotIn("Condensation", review_hint)

    async def test_ensure_intervention_index_ready_reindexes_missing_class_chunks(self) -> None:
        fake_db = AsyncMock()

        with (
            patch.object(
                remedial_service,
                "get_class_index_status",
                AsyncMock(
                    side_effect=[
                        {"classId": "class-1", "chunksIndexed": 0, "needsReindex": True},
                        {"classId": "class-1", "chunksIndexed": 12, "needsReindex": False},
                    ]
                ),
            ) as mocked_status,
            patch.object(
                remedial_service,
                "reindex_class_content",
                AsyncMock(return_value={"classId": "class-1", "chunksIndexed": 12}),
            ) as mocked_reindex,
        ):
            result = await remedial_service._ensure_intervention_index_ready(
                fake_db,
                "class-1",
            )

        self.assertEqual(result["chunksIndexed"], 12)
        self.assertEqual(mocked_status.await_count, 2)
        mocked_reindex.assert_awaited_once_with(fake_db, "class-1")


if __name__ == "__main__":
    unittest.main()
