import unittest
from unittest.mock import AsyncMock, patch
from app.schemas import GenerateQuizDraftRequest
from app.quiz_generation_service import _quiz_source_filters, _build_quiz_apply_preview


class AssessmentSettingsTests(unittest.TestCase):
    def test_request_and_filters_retain_delivery_settings(self):
        settings = {"title": "Teacher title", "type": "exam", "quarter": "Q2", "maxAttempts": 3,
                    "strictMode": True, "randomizeQuestions": True, "feedbackDelayHours": 2}
        request = GenerateQuizDraftRequest(classId="class", assessmentSettings=settings,
                                          assessmentSettingsReviewed=True)
        filters = _quiz_source_filters(request)
        self.assertEqual(filters.get("assessmentSettings", {}).get("maxAttempts"), 3)
        self.assertTrue(filters.get("assessmentSettingsReviewed"))

    def test_preview_does_not_replace_teacher_settings_with_model_output(self):
        preview = _build_quiz_apply_preview(
            structured_output={"title": "Model title", "questions": [{"content": "Q", "points": 1}],
                               "qualityGate": "pass", "reviewRequired": False},
            source_filters={"assessmentSettings": {"title": "Teacher title", "type": "exam", "quarter": "Q2",
                                                     "maxAttempts": 3, "strictMode": True},
                            "assessmentSettingsReviewed": True},
            existing_assessment_id=None,
        )
        self.assertEqual(preview["assessment"]["title"], "Teacher title")
        self.assertEqual(preview["assessment"]["quarter"], "Q2")
        self.assertEqual(preview["assessment"]["maxAttempts"], 3)

    def test_legacy_preview_requires_settings_review(self):
        preview = _build_quiz_apply_preview(
            structured_output={"questions": [{"content": "Q", "points": 1}]},
            source_filters={}, existing_assessment_id=None,
        )
        self.assertFalse(preview["canApply"])
        self.assertTrue(preview.get("requiresSettingsReview"))

    def test_all_six_requested_question_types_retain_their_identity(self):
        from app.quiz_generation_service import _validate_question_shape
        for kind in ("dropdown", "fill_blank"):
            normalized, issues = _validate_question_shape({"type": kind, "content": "Pick ____.", "explanation": "Source explanation", "options": [{"text": "answer", "isCorrect": True}, {"text": "other", "isCorrect": False}]}, question_index=0)
            self.assertEqual(normalized["type"], kind)
            self.assertFalse(any(issue["code"] == "unsupported_question_type" for issue in issues))
            self.assertTrue(normalized["options"][0]["isCorrect"])


class AssessmentSettingsRetryTests(unittest.IsolatedAsyncioTestCase):
    async def test_retry_retains_all_teacher_settings_for_each_assessment_type(self):
        from app.main import RequestUser, retry_teacher_quiz_draft_job

        user = RequestUser(id="teacher", email="teacher@example.test", roles=["teacher"])
        for assessment_type in ("quiz", "exam", "assignment"):
            with self.subTest(assessment_type=assessment_type):
                settings = {
                    "title": "Teacher title", "description": "<p>Read carefully.</p>",
                    "type": assessment_type, "quarter": "Q2",
                    "classRecordCategory": "performance_task",
                    "classRecordItemId": "00000000-0000-4000-8000-000000000001",
                    "dueDate": "2026-09-15T04:00:00.000Z", "closeWhenDue": False,
                    "maxAttempts": 3, "timeLimitMinutes": 47,
                    "timedQuestionsEnabled": True, "questionTimeLimitSeconds": 75,
                    "randomizeQuestions": True, "strictMode": True,
                    "passingScore": 83, "feedbackLevel": "detailed", "feedbackDelayHours": 7,
                }
                filters = {
                    "assessmentSettings": settings, "assessmentSettingsReviewed": True,
                    "lessonIds": ["lesson"], "extractionIds": ["extraction"],
                    "questionType": "dropdown", "questionCount": 12,
                    "teacherNote": "Use practical examples.",
                }
                job = {"job_type": "quiz_generation", "class_id": "class", "source_filters": filters}
                queue = AsyncMock(return_value={"success": True})
                with patch("app.main._load_ai_job_context", AsyncMock(return_value=(job, {}, None))), \
                     patch("app.main.queue_teacher_quiz_draft_job", queue):
                    await retry_teacher_quiz_draft_job("original-job", user, AsyncMock())
                request = queue.await_args.args[0]
                retained = _quiz_source_filters(request)
                self.assertEqual(retained["assessmentSettings"], settings)
                self.assertTrue(retained["assessmentSettingsReviewed"])
                self.assertEqual(retained["retryOfJobId"], "original-job")
                for key in ("lessonIds", "extractionIds", "questionType", "questionCount", "teacherNote"):
                    self.assertEqual(retained[key], filters[key])
