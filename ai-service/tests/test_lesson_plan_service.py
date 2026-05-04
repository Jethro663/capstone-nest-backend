import unittest

from app.lesson_plan_service import (
    _derive_class_profile,
    _normalize_lesson_plan_output,
)


class LessonPlanServiceTests(unittest.TestCase):
    def test_derive_class_profile_marks_excelling_when_class_is_stable_and_high_scoring(self):
        self.assertEqual(
            _derive_class_profile(
                {
                    "atRiskCount": 0,
                    "totalStudents": 25,
                    "averageBlendedScore": 92,
                }
            ),
            "excelling",
        )

    def test_derive_class_profile_marks_struggling_when_risk_rate_is_high(self):
        self.assertEqual(
            _derive_class_profile(
                {
                    "atRiskCount": 12,
                    "totalStudents": 20,
                    "averageBlendedScore": 68,
                }
            ),
            "struggling",
        )

    def test_normalize_lesson_plan_output_fills_required_dlp_sections(self):
        normalized = _normalize_lesson_plan_output(
            {
                "header": {"lessonTitle": "Decimals"},
                "classProfile": "mixed",
                "procedures": {
                    "review": ["Recall the place-value warmup."],
                },
            },
            fallback_header={
                "teacherName": "Teacher One",
                "schoolName": "Nexora High School",
            },
        )

        self.assertEqual(normalized["classProfile"], "mixed")
        self.assertEqual(normalized["header"]["lessonTitle"], "Decimals")
        self.assertEqual(normalized["header"]["teacherName"], "Teacher One")
        self.assertIn("objectives", normalized)
        self.assertIn("assessment", normalized)
        self.assertIn("reflection", normalized)
        self.assertIn("guidedPractice", normalized["procedures"])


if __name__ == "__main__":
    unittest.main()
