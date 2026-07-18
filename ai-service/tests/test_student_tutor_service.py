import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException

from app import student_tutor_service
from app.schemas import RequestUser


class StudentTutorServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_tutor_session_lock_uses_non_blocking_try_lock(self) -> None:
        lock_result = MagicMock()
        lock_result.scalar_one.return_value = True
        db = AsyncMock()
        db.execute = AsyncMock(return_value=lock_result)

        await student_tutor_service._acquire_tutor_session_lock(
            db,
            "student-1",
            "session-1",
        )

        statement = str(db.execute.await_args.args[0])
        self.assertIn("pg_try_advisory_xact_lock", statement)
        self.assertNotIn("SELECT pg_advisory_xact_lock(", statement)

    async def test_tutor_session_lock_rejects_overlapping_turn_promptly(self) -> None:
        lock_result = MagicMock()
        lock_result.scalar_one.return_value = False
        db = AsyncMock()
        db.execute = AsyncMock(return_value=lock_result)

        with self.assertRaises(HTTPException) as captured:
            await student_tutor_service._acquire_tutor_session_lock(
                db,
                "student-1",
                "session-1",
            )

        self.assertEqual(captured.exception.status_code, 409)
        self.assertIn("in progress", str(captured.exception.detail).lower())

    async def test_answer_submission_locks_session_before_loading_state(self) -> None:
        events: list[str] = []

        async def acquire_lock(*_args, **_kwargs) -> None:
            events.append("lock")

        async def load_state(*_args, **_kwargs):
            events.append("load")
            return ({"questions": []}, "")

        with (
            patch.object(
                student_tutor_service,
                "_acquire_tutor_session_lock",
                side_effect=acquire_lock,
                create=True,
            ),
            patch.object(
                student_tutor_service,
                "_load_tutor_state",
                side_effect=load_state,
            ),
        ):
            with self.assertRaisesRegex(Exception, "no active practice questions"):
                await student_tutor_service.submit_student_tutor_answers(
                    AsyncMock(),
                    RequestUser(
                        id="student-1",
                        email="student@example.com",
                        roles=["student"],
                    ),
                    session_id="session-1",
                    answers=["answer"],
                )

        self.assertEqual(events, ["lock", "load"])

    async def test_follow_up_timeout_returns_grounded_degraded_reply(self) -> None:
        state = {
            "classId": "class-1",
            "classLabel": "Science",
            "stage": "practice",
            "completed": False,
            "recommendation": {
                "title": "Photosynthesis",
                "reason": "Review the energy conversion steps.",
                "focusText": "Plants use sunlight to make glucose.",
                "lessonId": "lesson-1",
                "assessmentId": None,
            },
            "tutorPlan": {},
            "lessonBody": "Plants use sunlight to make glucose.",
            "questions": [],
        }
        context = {
            "groundingStatus": "grounded",
            "citations": [{"lessonId": "lesson-1", "title": "Photosynthesis"}],
        }

        with (
            patch.object(
                student_tutor_service,
                "_load_tutor_state",
                AsyncMock(return_value=(state, "")),
            ),
            patch.object(
                student_tutor_service,
                "_acquire_tutor_session_lock",
                AsyncMock(),
            ),
            patch.object(
                student_tutor_service,
                "normalize_attachment_images",
                AsyncMock(return_value=[]),
            ),
            patch.object(
                student_tutor_service,
                "_build_context_bundle",
                AsyncMock(return_value=context),
            ),
            patch.object(
                student_tutor_service.ollama_client,
                "generate",
                AsyncMock(side_effect=TimeoutError("Ollama timed out")),
            ),
            patch.object(
                student_tutor_service,
                "_log_tutor_turn",
                AsyncMock(),
            ) as log_turn,
        ):
            result = await student_tutor_service.continue_student_tutor_session(
                AsyncMock(),
                RequestUser(
                    id="student-1",
                    email="student@example.com",
                    roles=["student"],
                ),
                session_id="session-1",
                message="Can you explain that another way?",
            )

        self.assertTrue(result["degraded"])
        self.assertEqual(result["groundingStatus"], "grounded")
        self.assertIn("temporarily", result["message"].lower())
        self.assertEqual(result["citations"], context["citations"])
        self.assertEqual(log_turn.await_args.kwargs["model_used"], "fallback (timeout)")

    async def test_evaluate_answers_accepts_semantic_match(self) -> None:
        mocked_response = """
        {
          "overallVerdict": "pass",
          "encouragement": "You explained the idea clearly.",
          "retryLesson": "",
          "results": [
            {
              "questionId": "q1",
              "decision": "correct_enough",
              "isCorrectEnough": true,
              "feedback": "Your wording is different, but the idea is correct."
            }
          ],
          "nextQuestions": []
        }
        """
        with patch.object(
            student_tutor_service.ollama_client,
            "generate",
            AsyncMock(return_value=mocked_response),
        ) as mocked_generate:
            result = await student_tutor_service._evaluate_answers(
                class_label="Science",
                recommendation={"title": "Photosynthesis"},
                lesson_body="Plants make food using sunlight.",
                questions=[
                    {
                        "id": "q1",
                        "question": "What do plants use to make food?",
                        "expectedAnswer": "sunlight, water, and carbon dioxide",
                        "hint": "Think about the inputs.",
                    }
                ],
                answers=["Plants need light, water, and carbon dioxide."],
            )

        self.assertEqual(result["overallVerdict"], "pass")
        self.assertEqual(result["results"][0]["decision"], "correct_enough")
        self.assertEqual(result["gradingMode"], "hybrid")
        self.assertIn(result["verdictSource"], {"llm", "deterministic", "hybrid"})
        self.assertGreaterEqual(result["confidence"], 0.0)
        self.assertLessEqual(result["confidence"], 1.0)
        self.assertIn(result["groundingStatus"], {"grounded", "insufficient"})
        mocked_generate.assert_awaited_once()
        _, kwargs = mocked_generate.await_args
        self.assertEqual(kwargs["task"], "grading")
        self.assertEqual(
            kwargs["response_format"],
            student_tutor_service.TUTOR_EVALUATION_FORMAT,
        )

    async def test_evaluate_answers_uses_vision_task_when_images_exist(self) -> None:
        mocked_response = """
        {
          "overallVerdict": "retry",
          "encouragement": "Good start.",
          "retryLesson": "Check the labeled diagram again.",
          "results": [
            {
              "questionId": "q1",
              "decision": "partially_correct",
              "isCorrectEnough": false,
              "feedback": "You identified one part but missed the second label."
            }
          ],
          "nextQuestions": [
            {"id": "q1b", "question": "Prompt 1", "expectedAnswer": "A", "hint": "H1"},
            {"id": "q2b", "question": "Prompt 2", "expectedAnswer": "B", "hint": "H2"},
            {"id": "q3b", "question": "Prompt 3", "expectedAnswer": "C", "hint": "H3"}
          ]
        }
        """
        with patch.object(
            student_tutor_service.ollama_client,
            "generate",
            AsyncMock(return_value=mocked_response),
        ) as mocked_generate:
            result = await student_tutor_service._evaluate_answers(
                class_label="Math",
                recommendation={"title": "Geometry"},
                lesson_body="Triangles have three sides.",
                questions=[
                    {
                        "id": "q1",
                        "question": "Name the marked angle.",
                        "expectedAnswer": "acute angle",
                        "hint": "Look at the image.",
                    }
                ],
                answers=["It is an angle less than 90 degrees."],
                attachments=[{"base64Data": "ZmFrZQ==", "mimeType": "image/png"}],
            )

        self.assertEqual(result["overallVerdict"], "retry")
        _, kwargs = mocked_generate.await_args
        self.assertEqual(kwargs["task"], "vision_explanation")
        self.assertEqual(len(kwargs["images"]), 1)

    async def test_evaluate_answers_deterministic_override_for_objective_math(self) -> None:
        mocked_response = """
        {
          "overallVerdict": "retry",
          "encouragement": "Try once more.",
          "retryLesson": "Review powers with negative numbers.",
          "results": [
            {
              "questionId": "q1",
              "decision": "unsupported",
              "isCorrectEnough": false,
              "feedback": "This does not match the expected answer."
            }
          ],
          "nextQuestions": [
            {"id": "q1b", "question": "Prompt 1", "expectedAnswer": "A", "hint": "H1"},
            {"id": "q2b", "question": "Prompt 2", "expectedAnswer": "B", "hint": "H2"},
            {"id": "q3b", "question": "Prompt 3", "expectedAnswer": "C", "hint": "H3"}
          ]
        }
        """
        with patch.object(
            student_tutor_service.ollama_client,
            "generate",
            AsyncMock(return_value=mocked_response),
        ):
            result = await student_tutor_service._evaluate_answers(
                class_label="Math",
                recommendation={"title": "Integer powers"},
                lesson_body="Any even power of -1 is 1.",
                questions=[
                    {
                        "id": "q1",
                        "question": "What is -1 multiplied by itself 4 times?",
                        "expectedAnswer": "1",
                        "hint": "Consider parity of the exponent.",
                    }
                ],
                answers=["1"],
            )

        self.assertEqual(result["overallVerdict"], "pass")
        self.assertEqual(result["results"][0]["decision"], "correct_enough")
        self.assertEqual(result["verdictSource"], "deterministic")


if __name__ == "__main__":
    unittest.main()
