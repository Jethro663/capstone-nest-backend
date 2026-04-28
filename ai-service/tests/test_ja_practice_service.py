import unittest
from unittest.mock import AsyncMock, patch

from app import ja_practice_service
from app.schemas import RequestUser


class JaPracticeServiceAskTests(unittest.IsolatedAsyncioTestCase):
    async def test_helper_prompt_without_chunks_returns_guidance_instead_of_insufficient_evidence(self) -> None:
        with (
            patch.object(
                ja_practice_service,
                "_assert_student_class_access",
                AsyncMock(return_value=None),
            ),
            patch.object(
                ja_practice_service,
                "similarity_search",
                AsyncMock(return_value=[]),
            ) as mocked_search,
            patch.object(
                ja_practice_service.ollama_client,
                "generate",
                AsyncMock(),
            ) as mocked_generate,
        ):
            result = await ja_practice_service.generate_ja_ask_response(
                db=AsyncMock(),
                user=RequestUser(
                    id="student-1",
                    email="student@example.com",
                    roles=["student"],
                ),
                class_id="class-1",
                thread_id="thread-1",
                message="Make a 5-minute study plan for tonight.",
                quick_action=None,
                lesson_id=None,
                lesson_title=None,
                history=[],
                allowed_lesson_ids=["lesson-1"],
                allowed_assessment_ids=[],
            )

        self.assertFalse(result["blocked"])
        self.assertFalse(result["insufficientEvidence"])
        self.assertIn("I can help with summaries", result["reply"])
        mocked_search.assert_awaited_once()
        mocked_generate.assert_not_awaited()

    async def test_selected_lesson_helper_prompt_retries_with_lesson_title_and_answers(self) -> None:
        helper_chunk = {
            "chunkText": "Equivalent fractions represent the same value in different forms.",
            "lessonId": "lesson-2",
            "assessmentId": None,
            "questionId": None,
            "sourceType": "lesson_block",
            "metadataJson": {"lessonTitle": "Equivalent Fractions"},
            "distance": 0.18,
            "scoreBreakdown": {"lexical": 0.82, "final": 4.6},
        }
        with (
            patch.object(
                ja_practice_service,
                "_assert_student_class_access",
                AsyncMock(return_value=None),
            ),
            patch.object(
                ja_practice_service,
                "similarity_search",
                AsyncMock(side_effect=[[], [helper_chunk]]),
            ) as mocked_search,
            patch.object(
                ja_practice_service.ollama_client,
                "generate",
                AsyncMock(return_value="Focus on the numerator and denominator relationship first."),
            ) as mocked_generate,
        ):
            result = await ja_practice_service.generate_ja_ask_response(
                db=AsyncMock(),
                user=RequestUser(
                    id="student-1",
                    email="student@example.com",
                    roles=["student"],
                ),
                class_id="class-1",
                thread_id="thread-2",
                message="Can you summarize this lesson for me?",
                quick_action=None,
                lesson_id="lesson-2",
                lesson_title="Equivalent Fractions",
                history=[],
                allowed_lesson_ids=["lesson-1", "lesson-2"],
                allowed_assessment_ids=["assessment-1"],
            )

        self.assertFalse(result["blocked"])
        self.assertFalse(result["insufficientEvidence"])
        self.assertEqual(len(result["citations"]), 1)
        self.assertEqual(result["citations"][0]["lessonId"], "lesson-2")
        self.assertIn("numerator and denominator", result["reply"])
        self.assertEqual(mocked_search.await_count, 2)
        _, first_kwargs = mocked_search.await_args_list[0]
        _, second_kwargs = mocked_search.await_args_list[1]
        self.assertEqual(first_kwargs["lesson_ids"], ["lesson-2"])
        self.assertEqual(first_kwargs["reference_lesson_id"], "lesson-2")
        self.assertEqual(second_kwargs["query_text"], "Equivalent Fractions")
        mocked_generate.assert_awaited_once()

    async def test_selected_lesson_helper_prompt_uses_lesson_block_fallback_when_search_misses(self) -> None:
        helper_chunk = {
            "chunkText": "Equivalent fractions show the same quantity with different numerators and denominators.",
            "lessonId": "lesson-2",
            "assessmentId": None,
            "questionId": None,
            "sourceType": "lesson_block",
            "metadataJson": {"lessonTitle": "Equivalent Fractions"},
            "distance": 0.05,
            "scoreBreakdown": {"lexical": 1.0, "final": 5.0},
        }
        with (
            patch.object(
                ja_practice_service,
                "_assert_student_class_access",
                AsyncMock(return_value=None),
            ),
            patch.object(
                ja_practice_service,
                "similarity_search",
                AsyncMock(side_effect=[[], []]),
            ) as mocked_search,
            patch.object(
                ja_practice_service,
                "_fetch_selected_lesson_fallback_chunks",
                AsyncMock(return_value=[helper_chunk]),
            ) as mocked_fallback,
            patch.object(
                ja_practice_service.ollama_client,
                "generate",
                AsyncMock(return_value="Equivalent fractions keep the value the same even when the numbers look different."),
            ) as mocked_generate,
        ):
            result = await ja_practice_service.generate_ja_ask_response(
                db=AsyncMock(),
                user=RequestUser(
                    id="student-1",
                    email="student@example.com",
                    roles=["student"],
                ),
                class_id="class-1",
                thread_id="thread-2b",
                message="Summarize main idea",
                quick_action="Summarize main idea",
                lesson_id="lesson-2",
                lesson_title="Equivalent Fractions",
                history=[],
                allowed_lesson_ids=["lesson-1", "lesson-2"],
                allowed_assessment_ids=["assessment-1"],
            )

        self.assertFalse(result["blocked"])
        self.assertFalse(result["insufficientEvidence"])
        self.assertEqual(result["citations"][0]["lessonId"], "lesson-2")
        self.assertIn("value the same", result["reply"])
        self.assertEqual(mocked_search.await_count, 2)
        mocked_fallback.assert_awaited_once()
        mocked_generate.assert_awaited_once()

    async def test_selected_lesson_helper_prompt_returns_lesson_specific_guidance_when_no_blocks_exist(self) -> None:
        with (
            patch.object(
                ja_practice_service,
                "_assert_student_class_access",
                AsyncMock(return_value=None),
            ),
            patch.object(
                ja_practice_service,
                "similarity_search",
                AsyncMock(side_effect=[[], []]),
            ) as mocked_search,
            patch.object(
                ja_practice_service,
                "_fetch_selected_lesson_fallback_chunks",
                AsyncMock(return_value=[]),
            ) as mocked_fallback,
            patch.object(
                ja_practice_service.ollama_client,
                "generate",
                AsyncMock(),
            ) as mocked_generate,
        ):
            result = await ja_practice_service.generate_ja_ask_response(
                db=AsyncMock(),
                user=RequestUser(
                    id="student-1",
                    email="student@example.com",
                    roles=["student"],
                ),
                class_id="class-1",
                thread_id="thread-2c",
                message="Make a study plan",
                quick_action="Make a study plan",
                lesson_id="lesson-2",
                lesson_title="Equivalent Fractions",
                history=[],
                allowed_lesson_ids=["lesson-1", "lesson-2"],
                allowed_assessment_ids=[],
            )

        self.assertFalse(result["blocked"])
        self.assertTrue(result["insufficientEvidence"])
        self.assertIn("Equivalent Fractions", result["reply"])
        self.assertNotIn("Pick one visible lesson context", result["reply"])
        self.assertEqual(mocked_search.await_count, 2)
        mocked_fallback.assert_awaited_once()
        mocked_generate.assert_not_awaited()

    async def test_selected_lesson_blocks_low_confidence_out_of_context_question(self) -> None:
        low_confidence_chunk = {
            "chunkText": "A Filipino lesson about epics and oral tradition.",
            "lessonId": "lesson-fil",
            "assessmentId": None,
            "questionId": None,
            "sourceType": "lesson_block",
            "metadataJson": {"lessonTitle": "Karunungang Bayan"},
            "distance": 1.6,
            "scoreBreakdown": {"lexical": 0.12, "final": 1.8},
        }
        with (
            patch.object(
                ja_practice_service,
                "_assert_student_class_access",
                AsyncMock(return_value=None),
            ),
            patch.object(
                ja_practice_service,
                "similarity_search",
                AsyncMock(return_value=[low_confidence_chunk]),
            ) as mocked_search,
            patch.object(
                ja_practice_service.ollama_client,
                "generate",
                AsyncMock(),
            ) as mocked_generate,
        ):
            result = await ja_practice_service.generate_ja_ask_response(
                db=AsyncMock(),
                user=RequestUser(
                    id="student-1",
                    email="student@example.com",
                    roles=["student"],
                ),
                class_id="class-1",
                thread_id="thread-3",
                message="Can you solve this algebra equation for me?",
                quick_action=None,
                lesson_id="lesson-fil",
                lesson_title="Karunungang Bayan",
                history=[],
                allowed_lesson_ids=["lesson-fil"],
                allowed_assessment_ids=[],
            )

        self.assertTrue(result["blocked"])
        self.assertEqual(result["reason"], "lesson_context_mismatch")
        self.assertIn("outside Karunungang Bayan", result["reply"])
        mocked_search.assert_awaited_once()
        mocked_generate.assert_not_awaited()


if __name__ == "__main__":
    unittest.main()
