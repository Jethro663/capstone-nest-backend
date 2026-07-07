import json
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from app.quiz_generation_service import (
    _build_quiz_apply_preview,
    apply_quiz_draft,
    generate_quiz_draft,
)
from app.schemas import GenerateQuizDraftRequest, RequestUser


class _Rows:
    def __init__(self, rows=None, scalar=None):
        self._rows = rows or []
        self._scalar = scalar

    def mappings(self):
        return self

    def first(self):
        return self._rows[0] if self._rows else None

    def __iter__(self):
        return iter(self._rows)

    def scalar_one(self):
        return self._scalar


class QuizApplyTests(unittest.IsolatedAsyncioTestCase):
    def test_apply_preview_blocks_unresolved_blocking_issues(self) -> None:
        preview = _build_quiz_apply_preview(
            structured_output={
                "title": "Unsafe quiz",
                "questions": [{"content": "Question?", "points": 1}],
                "qualityGate": "fail",
                "reviewRequired": True,
                "reviewIssues": [
                    {
                        "id": "issue-1",
                        "code": "invalid_multiple_choice_options",
                        "severity": "blocking",
                        "resolved": False,
                    }
                ],
            },
            source_filters={"assessmentType": "quiz", "passingScore": 60},
            existing_assessment_id=None,
        )

        self.assertFalse(preview["canApply"])
        self.assertIn("Resolve blocking review issues before applying.", preview["blockedReasons"])
        self.assertEqual(preview["assessment"]["questionCount"], 1)

    def test_apply_preview_is_idempotent_when_apply_result_exists(self) -> None:
        preview = _build_quiz_apply_preview(
            structured_output={
                "title": "Applied quiz",
                "questions": [{"content": "Question?", "points": 2}],
                "qualityGate": "pass",
                "reviewRequired": False,
                "reviewIssues": [],
                "audit": {
                    "applyResult": {
                        "assessmentId": "assessment-1",
                        "questionsCreated": 1,
                    }
                },
            },
            source_filters={"assessmentType": "quiz", "passingScore": 60},
            existing_assessment_id="assessment-1",
        )

        self.assertTrue(preview["canApply"])
        self.assertTrue(preview["alreadyApplied"])
        self.assertEqual(preview["applyResult"]["assessmentId"], "assessment-1")

    async def test_generate_quiz_draft_persists_output_without_creating_assessment(self) -> None:
        async def execute(statement, params=None):
            sql = str(statement)
            if "FROM classes c" in sql:
                return _Rows(
                    [
                        {
                            "id": "class-1",
                            "teacher_id": "teacher-1",
                            "subject_name": "Science",
                            "subject_code": "SCI",
                            "grade_level": "7",
                        }
                    ]
                )
            if "SELECT q.content" in sql:
                return _Rows([])
            if "INSERT INTO ai_generation_outputs" in sql:
                return _Rows(scalar="output-1")
            if "UPDATE ai_generation_jobs" in sql:
                return _Rows()
            if "INSERT INTO assessments" in sql:
                raise AssertionError("generation must not create an assessment before apply")
            return _Rows()

        fake_db = MagicMock()
        fake_db.execute = AsyncMock(side_effect=execute)
        fake_db.commit = AsyncMock()

        with (
            patch(
                "app.quiz_generation_service.similarity_search",
                AsyncMock(
                    return_value=[
                        {
                            "id": "chunk-1",
                            "sourceType": "lesson_block",
                            "sourceId": "lesson-1",
                            "sourceReference": "lesson:1",
                            "chunkText": "Plants make glucose through photosynthesis.",
                            "metadataJson": {"lessonTitle": "Photosynthesis"},
                            "selectionReason": "semantic match",
                            "scoreBreakdown": {"final": 0.9},
                        }
                    ]
                ),
            ),
            patch(
                "app.quiz_generation_service._build_quiz_blueprint",
                AsyncMock(
                    return_value={
                        "title": "Science Quiz",
                        "description": "Blueprint",
                        "conceptCoverage": ["photosynthesis"],
                        "questionBlueprints": [
                            {
                                "intent": "Check source understanding",
                                "difficulty": "easy",
                                "sourceCitation": "lesson:1",
                            }
                        ],
                        "blueprintSource": "fallback",
                    }
                ),
            ),
            patch(
                "app.quiz_generation_service.ollama_client.generate",
                AsyncMock(
                    return_value=json.dumps(
                        {
                            "title": "Science Quiz",
                            "description": "Review draft",
                            "questions": [
                                {
                                    "type": "true_false",
                                    "content": "Plants make glucose through photosynthesis.",
                                    "points": 1,
                                    "explanation": "The source says plants make glucose through photosynthesis.",
                                    "conceptTags": ["photosynthesis"],
                                    "options": [
                                        {"text": "True", "isCorrect": True, "order": 1},
                                        {"text": "False", "isCorrect": False, "order": 2},
                                    ],
                                }
                            ],
                        }
                    )
                ),
            ),
        ):
            result = await generate_quiz_draft(
                fake_db,
                RequestUser(id="teacher-1", email="teacher@example.com", roles=["teacher"]),
                GenerateQuizDraftRequest(
                    classId="class-1",
                    questionCount=1,
                    questionType="true_false",
                    assessmentType="quiz",
                    passingScore=60,
                    feedbackLevel="standard",
                ),
                existing_job_id="job-1",
            )

        self.assertIsNone(result["assessmentId"])
        self.assertEqual(result["outputId"], "output-1")

    async def test_apply_quiz_draft_returns_existing_apply_result_without_duplicates(self) -> None:
        apply_result = {"assessmentId": "assessment-1", "questionsCreated": 1}

        async def execute(statement, params=None):
            sql = str(statement)
            if "FROM ai_generation_jobs j" in sql:
                return _Rows(
                    [
                        {
                            "job_id": "job-1",
                            "teacher_id": "teacher-1",
                            "class_id": "class-1",
                            "source_filters": {"assessmentType": "quiz", "passingScore": 60},
                            "output_id": "output-1",
                            "structured_output": {
                                "title": "Applied quiz",
                                "questions": [{"content": "Question?", "points": 1}],
                                "qualityGate": "pass",
                                "reviewRequired": False,
                                "reviewIssues": [],
                                "audit": {"applyResult": apply_result},
                            },
                        }
                    ]
                )
            if "INSERT INTO assessments" in sql:
                raise AssertionError("idempotent apply must not insert another assessment")
            return _Rows()

        fake_db = MagicMock()
        fake_db.execute = AsyncMock(side_effect=execute)
        fake_db.commit = AsyncMock()

        result = await apply_quiz_draft(
            fake_db,
            job_id="job-1",
            user=RequestUser(id="teacher-1", email="teacher@example.com", roles=["teacher"]),
        )

        self.assertTrue(result["alreadyApplied"])
        self.assertEqual(result["applyResult"], apply_result)


if __name__ == "__main__":
    unittest.main()
