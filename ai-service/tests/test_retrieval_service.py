import unittest
from unittest.mock import AsyncMock, MagicMock, patch

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


class RetrievalTeacherOwnershipTests(unittest.IsolatedAsyncioTestCase):
    async def test_similarity_search_includes_teacher_owned_library_chunks_only_for_the_owner(self) -> None:
        teacher_owned_row = {
            "id": "teacher-chunk-1",
            "source_type": "library_file",
            "source_id": "file-1",
            "class_id": None,
            "library_file_id": "file-1",
            "subject_key": "science",
            "grade_level": "7",
            "lesson_id": None,
            "assessment_id": None,
            "question_id": None,
            "extraction_id": None,
            "chunk_text": "Teacher-only science notes.",
            "chunk_order": 0,
            "metadata_json": {
                "documentId": "library:file-1:chunk:0",
                "teacherId": "teacher-1",
                "scope": "private",
                "aiEnabled": True,
                "subjectKey": "science",
                "gradeLevel": "7",
                "isPublished": True,
            },
            "distance": 0.01,
        }
        general_row = {
            "id": "general-chunk-1",
            "source_type": "library_file",
            "source_id": "file-2",
            "class_id": None,
            "library_file_id": "file-2",
            "subject_key": "science",
            "grade_level": "7",
            "lesson_id": None,
            "assessment_id": None,
            "question_id": None,
            "extraction_id": None,
            "chunk_text": "General science notes.",
            "chunk_order": 0,
            "metadata_json": {
                "documentId": "library:file-2:chunk:0",
                "scope": "general",
                "subjectKey": "science",
                "gradeLevel": "7",
                "isPublished": True,
            },
            "distance": 0.02,
        }
        other_teacher_row = {
            "id": "other-teacher-chunk-1",
            "source_type": "library_file",
            "source_id": "file-3",
            "class_id": None,
            "library_file_id": "file-3",
            "subject_key": "science",
            "grade_level": "7",
            "lesson_id": None,
            "assessment_id": None,
            "question_id": None,
            "extraction_id": None,
            "chunk_text": "Another teacher's private notes.",
            "chunk_order": 0,
            "metadata_json": {
                "documentId": "library:file-3:chunk:0",
                "teacherId": "teacher-2",
                "scope": "private",
                "aiEnabled": True,
                "subjectKey": "science",
                "gradeLevel": "7",
                "isPublished": True,
            },
            "distance": 0.03,
        }

        def build_result(rows: list[dict[str, object]]) -> MagicMock:
            result = MagicMock()
            result.mappings.return_value = rows
            return result

        async def execute_side_effect(query, params=None):
            sql = str(query)
            if "c.metadata_json->>'teacherId' = :teacherId" in sql and "c.metadata_json->>'scope' = 'private'" in sql:
                return build_result([teacher_owned_row, general_row])
            return build_result([general_row, other_teacher_row])

        db = AsyncMock()
        db.execute = AsyncMock(side_effect=execute_side_effect)

        with patch.object(
            retrieval_service,
            "embed_texts",
            AsyncMock(return_value=[[0.1, 0.2, 0.3]]),
        ):
            results = await retrieval_service.similarity_search(
                db,
                query_text="science notes",
                class_id="class-1",
                subject_key="science",
                grade_level="7",
                top_k=5,
                policy_name="general",
                teacher_id="teacher-1",
            )

        self.assertIn("teacher-chunk-1", [item["id"] for item in results])
        self.assertIn("general-chunk-1", [item["id"] for item in results])
        self.assertNotIn("other-teacher-chunk-1", [item["id"] for item in results])

    async def test_similarity_search_excludes_library_chunks_for_extraction_only_source_types(self) -> None:
        class_row = {
            "id": "class-chunk-1",
            "source_type": "extracted_module",
            "source_id": "extraction-1",
            "class_id": "class-1",
            "library_file_id": None,
            "subject_key": "science",
            "grade_level": "7",
            "lesson_id": None,
            "assessment_id": None,
            "question_id": None,
            "extraction_id": "extraction-1",
            "chunk_text": "Class extraction content.",
            "chunk_order": 0,
            "metadata_json": {
                "documentId": "extraction:extraction-1:section:0",
                "teacherId": "teacher-1",
                "subjectKey": "science",
                "gradeLevel": "7",
                "isPublished": True,
            },
            "distance": 0.09,
        }
        teacher_row = {
            "id": "teacher-library-chunk",
            "source_type": "library_file",
            "source_id": "file-1",
            "class_id": None,
            "library_file_id": "file-1",
            "subject_key": "science",
            "grade_level": "7",
            "lesson_id": None,
            "assessment_id": None,
            "question_id": None,
            "extraction_id": None,
            "chunk_text": "Teacher-owned science notes.",
            "chunk_order": 0,
            "metadata_json": {
                "documentId": "library:file-1:chunk:0",
                "teacherId": "teacher-1",
                "scope": "private",
                "aiEnabled": True,
                "isPublished": True,
            },
            "distance": 0.01,
        }
        general_row = {
            "id": "general-library-chunk",
            "source_type": "library_file",
            "source_id": "file-2",
            "class_id": None,
            "library_file_id": "file-2",
            "subject_key": "science",
            "grade_level": "7",
            "lesson_id": None,
            "assessment_id": None,
            "question_id": None,
            "extraction_id": None,
            "chunk_text": "General science notes.",
            "chunk_order": 0,
            "metadata_json": {
                "documentId": "library:file-2:chunk:0",
                "scope": "general",
                "subjectKey": "science",
                "gradeLevel": "7",
                "isPublished": True,
            },
            "distance": 0.02,
        }

        def build_result(rows: list[dict[str, object]]) -> MagicMock:
            result = MagicMock()
            result.mappings.return_value = rows
            return result

        async def execute_side_effect(query, params=None):
            sql = str(query)
            if "c.source_type = 'library_file'" in sql:
                return build_result([class_row, teacher_row, general_row])
            return build_result([class_row])

        db = AsyncMock()
        db.execute = AsyncMock(side_effect=execute_side_effect)

        with patch.object(
            retrieval_service,
            "embed_texts",
            AsyncMock(return_value=[[0.1, 0.2, 0.3]]),
        ):
            results = await retrieval_service.similarity_search(
                db,
                query_text="science lesson",
                class_id="class-1",
                teacher_id="teacher-1",
                subject_key="science",
                grade_level="7",
                source_types=["extracted_module"],
                top_k=5,
                policy_name="general",
            )

        returned_ids = [item["id"] for item in results]
        self.assertEqual(returned_ids, ["class-chunk-1"])


if __name__ == "__main__":
    unittest.main()
