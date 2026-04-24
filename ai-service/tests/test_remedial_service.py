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
