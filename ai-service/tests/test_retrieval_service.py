import unittest

from app import retrieval_service


class RetrievalServiceTests(unittest.TestCase):
    def test_build_query_variants_adds_focus_variants(self) -> None:
        variants = retrieval_service.build_query_variants(
            "photosynthesis in leaves",
            teacher_explanation="Plants use sunlight, water, and carbon dioxide.",
            concept_hints=["chlorophyll", "glucose"],
            student_message="I do not understand the process.",
        )

        self.assertGreaterEqual(len(variants), 3)
        self.assertTrue(any("Concept focus" in item for item in variants))
        self.assertTrue(any("Teacher explanation focus" in item for item in variants))

    def test_student_tutor_policy_prefers_lesson_chunks(self) -> None:
        chunks = [
            {
                "id": "q-1",
                "sourceType": "assessment_question",
                "sourceId": "aq-1",
                "classId": "class-1",
                "lessonId": None,
                "assessmentId": "assessment-1",
                "questionId": "question-1",
                "extractionId": None,
                "chunkText": "Photosynthesis happens when plants make food.",
                "chunkOrder": 0,
                "metadataJson": {"assessmentTitle": "Quiz 1", "isPublished": True},
                "distance": 0.04,
            },
            {
                "id": "l-1",
                "sourceType": "lesson_block",
                "sourceId": "block-1",
                "classId": "class-1",
                "lessonId": "lesson-1",
                "assessmentId": None,
                "questionId": None,
                "extractionId": None,
                "chunkText": "Lesson: photosynthesis lets plants produce glucose using sunlight.",
                "chunkOrder": 0,
                "metadataJson": {"lessonTitle": "Photosynthesis", "isPublished": True},
                "distance": 0.08,
            },
        ]

        ranked = retrieval_service.rerank_chunks(
            "photosynthesis",
            chunks,
            policy_name="student_tutor",
        )

        self.assertEqual(ranked[0]["id"], "l-1")
        self.assertEqual(ranked[0]["sourceType"], "lesson_block")

    def test_mentor_policy_boosts_exact_question_match(self) -> None:
        chunks = [
            {
                "id": "lesson-1",
                "sourceType": "lesson_block",
                "sourceId": "block-1",
                "classId": "class-1",
                "lessonId": "lesson-1",
                "assessmentId": "assessment-1",
                "questionId": None,
                "extractionId": None,
                "chunkText": "Plants need sunlight and water.",
                "chunkOrder": 0,
                "metadataJson": {"lessonTitle": "Plant Processes", "isPublished": True},
                "distance": 0.03,
            },
            {
                "id": "question-1",
                "sourceType": "assessment_question",
                "sourceId": "question-1",
                "classId": "class-1",
                "lessonId": None,
                "assessmentId": "assessment-1",
                "questionId": "question-1",
                "extractionId": None,
                "chunkText": "What do plants need for photosynthesis?",
                "chunkOrder": 1,
                "metadataJson": {"assessmentTitle": "Plant Quiz", "isPublished": True},
                "distance": 0.07,
            },
        ]

        ranked = retrieval_service.rerank_chunks(
            "What do plants need for photosynthesis?",
            chunks,
            policy_name="mentor_explain",
            reference_question_id="question-1",
            reference_assessment_id="assessment-1",
        )

        self.assertEqual(ranked[0]["id"], "question-1")
        self.assertIn("metadata", ranked[0]["scoreBreakdown"])


if __name__ == "__main__":
    unittest.main()
