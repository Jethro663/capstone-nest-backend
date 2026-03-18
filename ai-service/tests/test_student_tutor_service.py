import unittest
from unittest.mock import AsyncMock, patch

from app import student_tutor_service


class StudentTutorServiceTests(unittest.IsolatedAsyncioTestCase):
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


if __name__ == "__main__":
    unittest.main()
