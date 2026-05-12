import unittest
from unittest.mock import AsyncMock, patch

from app import quiz_generation_service
from app.quiz_generation_service import (
    _build_blueprint_evidence,
    _build_quiz_blueprint,
    _fallback_quiz_blueprint,
    _prepare_quiz_questions_for_review,
    _parse_quiz_blueprint_output,
    _score_quiz_golden_eval,
    _validate_generated_questions,
)


class QuizGenerationValidationTests(unittest.IsolatedAsyncioTestCase):
    def test_prepare_quiz_questions_enforces_shape_and_provenance(self) -> None:
        source_chunks = [
            {
                "id": "chunk-1",
                "sourceType": "lesson_block",
                "sourceId": "lesson-1",
                "sourceReference": "lesson:1 | block:intro",
                "chunkText": "Photosynthesis lets plants make glucose using sunlight, water, and carbon dioxide.",
                "metadataJson": {"lessonTitle": "Photosynthesis"},
                "selectionReason": "semantic match",
                "scoreBreakdown": {"final": 0.92},
            }
        ]

        prepared = _prepare_quiz_questions_for_review(
            [
                {
                    "type": "multiple_choice",
                    "content": "What materials do plants use during photosynthesis?",
                    "points": 1,
                    "explanation": "The source says plants use sunlight, water, and carbon dioxide.",
                    "conceptTags": ["photosynthesis"],
                    "options": [
                        {"text": "Sunlight, water, and carbon dioxide", "isCorrect": True, "order": 1},
                        {"text": "Sunlight, water, and carbon dioxide", "isCorrect": False, "order": 2},
                    ],
                }
            ],
            source_chunks=source_chunks,
            question_type="multiple_choice",
            requested_count=1,
            existing_question_texts=set(),
        )

        self.assertEqual(prepared["qualityGate"], "fail")
        self.assertTrue(prepared["reviewRequired"])
        self.assertEqual(prepared["reviewIssues"][0]["code"], "invalid_multiple_choice_options")
        self.assertEqual(prepared["questions"][0]["provenance"]["chunkId"], "chunk-1")
        self.assertIn("Photosynthesis lets plants", prepared["questions"][0]["provenance"]["sourceSnippet"])

    def test_prepare_quiz_questions_refills_underfilled_output(self) -> None:
        source_chunks = [
            {
                "id": "chunk-1",
                "sourceType": "lesson_block",
                "sourceId": "lesson-1",
                "sourceReference": "lesson:1 | block:intro",
                "chunkText": "Fractions represent equal parts of a whole. A numerator counts selected parts.",
                "metadataJson": {"lessonTitle": "Fractions", "conceptTags": ["fractions"]},
                "selectionReason": "semantic match",
                "scoreBreakdown": {"final": 0.88},
            }
        ]

        prepared = _prepare_quiz_questions_for_review(
            [
                {
                    "type": "true_false",
                    "content": "Fractions can represent equal parts of a whole.",
                    "points": 1,
                    "explanation": "The source states this directly.",
                    "conceptTags": ["fractions"],
                    "options": [
                        {"text": "True", "isCorrect": True, "order": 1},
                        {"text": "False", "isCorrect": False, "order": 2},
                    ],
                }
            ],
            source_chunks=source_chunks,
            question_type="true_false",
            requested_count=2,
            existing_question_texts=set(),
        )

        self.assertEqual(len(prepared["questions"]), 2)
        self.assertEqual(prepared["qualityGate"], "warn")
        self.assertIn("underfilled_repaired", {issue["code"] for issue in prepared["reviewIssues"]})
        self.assertTrue(all(question.get("id") for question in prepared["questions"]))

    def test_score_quiz_golden_eval_flags_missing_required_source_and_forbidden_text(self) -> None:
        score = _score_quiz_golden_eval(
            {
                "questions": [
                    {"content": "Who discovered gravity?", "reviewIssues": []},
                ],
                "reviewIssues": [{"code": "weak_grounding"}],
            },
            expected_question_count=2,
            required_source_terms=["photosynthesis"],
            forbidden_terms=["gravity"],
            required_issue_codes=["weak_grounding"],
        )

        self.assertFalse(score["passed"])
        self.assertIn("question_count", score["failedChecks"])
        self.assertIn("required_source_terms", score["failedChecks"])
        self.assertIn("forbidden_terms", score["failedChecks"])

    def test_validate_generated_questions_filters_ungrounded_content(self) -> None:
        source_chunks = [
            {
                "id": "chunk-1",
                "chunkText": "Photosynthesis lets plants make glucose using sunlight, water, and carbon dioxide.",
            }
        ]
        questions = [
            {
                "content": "What materials do plants use during photosynthesis?",
                "explanation": "The process uses sunlight, water, and carbon dioxide.",
            },
            {
                "content": "Who discovered gravity on a falling apple?",
                "explanation": "This is about Isaac Newton.",
            },
        ]

        validated = _validate_generated_questions(questions, source_chunks)

        self.assertEqual(len(validated), 1)
        self.assertIn("photosynthesis", validated[0]["content"].lower())

    def test_parse_quiz_blueprint_accepts_fenced_json(self) -> None:
        raw = """```json
        {
          "title": "Biology Quiz",
          "description": "Quiz blueprint",
          "conceptCoverage": ["photosynthesis"],
          "questionBlueprints": [
            {"intent": "Check understanding", "difficulty": "easy", "sourceCitation": "lesson:1"}
          ]
        }
        ```"""

        parsed = _parse_quiz_blueprint_output(raw)

        self.assertEqual(parsed["title"], "Biology Quiz")
        self.assertEqual(parsed["conceptCoverage"][0], "photosynthesis")

    def test_parse_quiz_blueprint_accepts_leading_trailing_prose(self) -> None:
        raw = """
        Here is the requested object.
        {
          "title": "Chemistry Quiz",
          "description": "Quiz blueprint",
          "conceptCoverage": ["atoms"],
          "questionBlueprints": [
            {"intent": "Check atoms", "difficulty": "easy", "sourceCitation": "lesson:2"}
          ]
        }
        End.
        """

        parsed = _parse_quiz_blueprint_output(raw)

        self.assertEqual(parsed["title"], "Chemistry Quiz")

    def test_build_blueprint_evidence_truncates_oversized_chunks(self) -> None:
        evidence = _build_blueprint_evidence(
            [
                {
                    "sourceReference": "lesson:1 | block:text",
                    "chunkText": "A" * 2000,
                    "metadataJson": {"conceptTags": ["atoms"]},
                }
            ]
        )

        self.assertIn("Citation: lesson:1 | block:text", evidence)
        self.assertLess(len(evidence), 900)

    def test_fallback_blueprint_is_deterministic(self) -> None:
        blueprint = _fallback_quiz_blueprint(
            class_info={"subject_name": "Science", "subject_code": "SCI-7"},
            body=type(
                "Body",
                (),
                {"question_count": 3, "title": None},
            )(),
            source_chunks=[
                {
                    "sourceReference": "lesson:1",
                    "sourceType": "lesson_block",
                    "metadataJson": {"conceptTags": ["atoms"], "lessonTitle": "Matter"},
                }
            ],
        )

        self.assertEqual(blueprint["blueprintSource"], "fallback")
        self.assertEqual(len(blueprint["questionBlueprints"]), 3)
        self.assertIn("atoms", blueprint["conceptCoverage"])

    async def test_build_quiz_blueprint_falls_back_after_two_parse_failures(self) -> None:
        with patch.object(
            quiz_generation_service.ollama_client,
            "generate",
            AsyncMock(side_effect=["not json", "still not json"]),
        ):
            blueprint = await _build_quiz_blueprint(
                class_info={"id": "class-1", "subject_name": "Science", "subject_code": "SCI-7", "grade_level": "7"},
                body=type(
                    "Body",
                    (),
                    {"question_count": 2, "question_type": "multiple_choice", "teacher_note": None, "title": None},
                )(),
                source_chunks=[
                    {
                        "sourceReference": "lesson:1",
                        "sourceType": "lesson_block",
                        "chunkText": "Atoms are small units of matter.",
                        "metadataJson": {"conceptTags": ["atoms"], "lessonTitle": "Matter"},
                    }
                ],
                existing_question_texts=set(),
            )

        self.assertEqual(blueprint["blueprintSource"], "fallback")
        self.assertEqual(len(blueprint["questionBlueprints"]), 2)


if __name__ == "__main__":
    unittest.main()
