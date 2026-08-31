import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
from app.main import RequestUser, apply_extraction
from app.schemas import ApplyExtractionRequest


class ExtractionAcademicSettingsTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.writes = []
        self.state_version = 4
        self.locked = False
        self.row = {
            "id": "extraction", "teacher_id": "teacher", "class_id": "class",
            "extraction_status": "completed", "is_applied": False,
            "structured_content": {
                "title": "Module", "audit": {"qualityGate": "pass", "reviewRequired": False},
                "sections": [{"title": "Lesson", "lessonBlocks": [{"type": "text", "order": 1, "content": {"text": "A sufficiently detailed lesson body for extraction application."}}],
                              "assessmentDraft": {"title": "Checkpoint", "questions": [{"type": "short_answer", "content": "Explain your reasoning.", "points": 2}]}}],
            },
        }
        self.db = AsyncMock()
        self.db.execute.side_effect = self.execute
        self.user = RequestUser(id="teacher", email="teacher@example.test", roles=["teacher"])

    def execute(self, statement, params=None):
        query = str(statement)
        mapping = lambda row: SimpleNamespace(mappings=lambda: SimpleNamespace(first=lambda: row))
        if "pg_advisory_xact_lock" in query:
            return SimpleNamespace()
        if "FROM extracted_modules WHERE" in query:
            return mapping(self.row)
        if "SELECT version, school_year" in query:
            return mapping({"version": self.state_version, "school_year": "2026-2027"})
        if "AS workbook_locked" in query:
            return mapping({"school_year": "2026-2027", "is_active": True, "workbook_locked": self.locked, "policy": {"periods": [{"key": "Q1"}, {"key": "Q2"}, {"key": "Q3"}]}})
        if "SELECT id FROM classes" in query:
            return SimpleNamespace(first=lambda: {"id": "class"})
        if "SELECT id FROM class_modules" in query:
            return SimpleNamespace(first=lambda: None)
        if 'SELECT "order"' in query:
            return SimpleNamespace(scalar=lambda: 0)
        if "INSERT" in query or "UPDATE" in query:
            self.writes.append((query, params))
            if "INSERT INTO assessment_questions" in query:
                return SimpleNamespace(scalar_one=lambda: "question")
            return mapping({"id": "created", "title": "Created content"})
        raise AssertionError(f"Unexpected query: {query}")

    async def apply(self, **kwargs):
        with patch("app.main.reindex_class_content", AsyncMock(return_value={"ok": True})):
            return await apply_extraction("extraction", ApplyExtractionRequest(**kwargs), self.user, self.db)

    async def test_missing_period_fails_before_any_content_write(self):
        with self.assertRaises(HTTPException) as caught:
            await self.apply()
        self.assertEqual(caught.exception.status_code, 409)
        self.assertEqual(self.writes, [])
        self.db.commit.assert_not_called()

    async def test_stale_academic_version_fails_before_any_content_write(self):
        with self.assertRaises(HTTPException) as caught:
            await self.apply(assessmentSettings={"quarter": "Q2"}, academicStateVersion=3)
        self.assertEqual(caught.exception.status_code, 409)
        self.assertEqual(self.writes, [])

    async def test_workbook_locked_after_backend_validation_fails_before_writes(self):
        self.locked = True
        with self.assertRaises(HTTPException) as caught:
            await self.apply(assessmentSettings={"quarter": "Q2"}, academicStateVersion=4)
        self.assertEqual(caught.exception.status_code, 409)
        self.assertEqual(self.writes, [])

    async def test_validated_settings_reach_the_assessment_insert(self):
        settings = {"quarter": "Q2", "type": "exam", "maxAttempts": 3, "passingScore": 82,
                    "timeLimitMinutes": 27, "timedQuestionsEnabled": True, "questionTimeLimitSeconds": 45,
                    "strictMode": True, "randomizeQuestions": True, "closeWhenDue": False,
                    "classRecordCategory": "performance_task", "feedbackLevel": "detailed", "feedbackDelayHours": 7}
        result = await self.apply(assessmentSettings=settings, academicStateVersion=4)
        self.assertEqual(result["data"]["assessmentsCreated"], 1)
        insert = next(params for sql, params in self.writes if "INSERT INTO assessments" in sql)
        for key, value in settings.items():
            self.assertEqual(insert["assessmentType" if key == "type" else key], value)
        self.db.commit.assert_awaited_once()
