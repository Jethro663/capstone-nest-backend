import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException

from app.main import RequestUser, apply_extraction, preview_apply_extraction


class ExtractionApplyTests(unittest.IsolatedAsyncioTestCase):
    async def test_apply_blocks_when_review_is_required(self) -> None:
        db = AsyncMock()
        db.execute = AsyncMock(
            return_value=SimpleNamespace(
                mappings=lambda: SimpleNamespace(
                    first=lambda: {
                        "id": "extract-1",
                        "extraction_status": "completed",
                        "is_applied": False,
                        "teacher_id": "teacher-1",
                        "class_id": "class-1",
                        "structured_content": {
                            "title": "Module",
                            "description": "",
                            "sections": [
                                {
                                    "title": "Section 1",
                                    "description": "",
                                    "lessonBlocks": [
                                        {"type": "text", "order": 0, "content": {"text": "Body"}}
                                    ],
                                }
                            ],
                            "audit": {
                                "qualityGate": "warn",
                                "reviewRequired": True,
                                "imageAssignmentSummary": {"unassigned": 1},
                            },
                            "mediaAssets": [
                                {
                                    "id": "image-1",
                                    "url": "data:image/png;base64,ZmFrZQ==",
                                    "selectedSectionIndex": None,
                                    "teacherReviewed": False,
                                    "candidateSections": [{"sectionIndex": 0, "score": 0.62}],
                                }
                            ],
                        },
                    }
                )
            )
        )
        user = RequestUser(id="teacher-1", email="teacher@test.com", roles=["teacher"])

        with self.assertRaises(HTTPException) as ctx:
            await apply_extraction(
                extraction_id="extract-1",
                body=SimpleNamespace(section_indices=None, lesson_indices=None),
                user=user,
                db=db,
            )

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("review", str(ctx.exception.detail).lower())

    async def test_apply_blocks_unresolved_blocking_review_issues(self) -> None:
        db = AsyncMock()
        db.execute = AsyncMock(
            return_value=SimpleNamespace(
                mappings=lambda: SimpleNamespace(
                    first=lambda: {
                        "id": "extract-1",
                        "extraction_status": "completed",
                        "is_applied": False,
                        "teacher_id": "teacher-1",
                        "class_id": "class-1",
                        "structured_content": {
                            "title": "Module",
                            "sections": [
                                {
                                    "title": "Section 1",
                                    "lessonBlocks": [{"type": "text", "order": 0, "content": {"text": "Body"}}],
                                }
                            ],
                            "audit": {
                                "qualityGate": "warn",
                                "reviewRequired": False,
                                "reviewIssues": [
                                    {
                                        "id": "issue-1",
                                        "code": "low-section-confidence",
                                        "severity": "blocking",
                                        "scope": "section",
                                        "message": "Review section",
                                        "sectionIndex": 0,
                                        "blockIndex": None,
                                        "resolved": False,
                                        "resolution": None,
                                    }
                                ],
                            },
                        },
                    }
                )
            )
        )
        user = RequestUser(id="teacher-1", email="teacher@test.com", roles=["teacher"])

        with self.assertRaises(HTTPException) as ctx:
            await apply_extraction(
                extraction_id="extract-1",
                body=SimpleNamespace(section_indices=None, lesson_indices=None),
                user=user,
                db=db,
            )

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("unresolved", str(ctx.exception.detail).lower())

    async def test_preview_apply_extraction_returns_exact_counts_without_writes(self) -> None:
        extraction_row = {
            "id": "extract-1",
            "extraction_status": "completed",
            "is_applied": False,
            "teacher_id": "teacher-1",
            "class_id": "class-1",
            "structured_content": {
                "title": "Module",
                "description": "",
                "sections": [
                    {
                        "title": "Section 1",
                        "description": "Desc",
                        "lessonBlocks": [
                            {
                                "type": "text",
                                "order": 0,
                                "content": {"text": "Body text that is long enough for preview validation."},
                            }
                        ],
                        "assessmentDraft": {
                            "title": "Checkpoint",
                            "questions": [{"content": "What is a cell?", "type": "short_answer", "points": 1}],
                        },
                    }
                ],
                "audit": {"qualityGate": "pass", "reviewRequired": False, "reviewIssues": []},
            },
        }
        db = AsyncMock()
        db.execute = AsyncMock(
            return_value=SimpleNamespace(mappings=lambda: SimpleNamespace(first=lambda: extraction_row))
        )
        db.commit = AsyncMock()
        user = RequestUser(id="teacher-1", email="teacher@test.com", roles=["teacher"])

        result = await preview_apply_extraction(
            extraction_id="extract-1",
            body=SimpleNamespace(section_indices=None, lesson_indices=None),
            user=user,
            db=db,
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["data"]["sectionsCreated"], 1)
        self.assertEqual(result["data"]["lessonsCreated"], 1)
        self.assertEqual(result["data"]["assessmentsCreated"], 1)
        db.commit.assert_not_called()

    async def test_apply_allows_teacher_reviewed_media_assets_and_reindexes(self) -> None:
        extraction_row = {
            "id": "extract-1",
            "extraction_status": "completed",
            "is_applied": False,
            "teacher_id": "teacher-1",
            "class_id": "class-1",
            "structured_content": {
                "title": "Module",
                "description": "Demo",
                "sections": [
                    {
                        "title": "Section 1",
                        "description": "Desc",
                        "lessonBlocks": [
                            {
                                "type": "text",
                                "order": 0,
                                "content": {
                                    "text": "Body text that is long enough to survive text-first apply filtering.",
                                },
                            },
                            {
                                "type": "image",
                                "order": 1,
                                "content": {
                                    "url": "data:image/png;base64,ZmFrZQ==",
                                    "caption": "Figure 1",
                                },
                                "metadata": {
                                    "mediaAssetId": "image-1",
                                    "assignmentConfidence": 0.82,
                                },
                            },
                        ],
                    }
                ],
                "audit": {
                    "qualityGate": "warn",
                    "reviewRequired": False,
                    "imageAssignmentSummary": {"unassigned": 0},
                },
                "mediaAssets": [
                    {
                        "id": "image-1",
                        "url": "data:image/png;base64,ZmFrZQ==",
                        "selectedSectionIndex": 0,
                        "teacherReviewed": True,
                        "candidateSections": [{"sectionIndex": 0, "score": 0.82}],
                    }
                ],
            },
        }

        def execute_side_effect(*args, **kwargs):
            query = str(args[0])
            params = args[1] if len(args) > 1 else {}
            if "FROM extracted_modules WHERE id = :id" in query:
                return SimpleNamespace(mappings=lambda: SimpleNamespace(first=lambda: extraction_row))
            if "SELECT id FROM classes WHERE id = :id" in query:
                return SimpleNamespace(first=lambda: {"id": "class-1"})
            if 'SELECT "order" FROM class_modules' in query:
                return SimpleNamespace(scalar=lambda: 0)
            if "SELECT id FROM class_modules WHERE class_id = :cid" in query:
                return SimpleNamespace(first=lambda: None)
            if 'INSERT INTO class_modules' in query:
                return SimpleNamespace(mappings=lambda: SimpleNamespace(first=lambda: {"id": "module-1", "title": "Module"}))
            if 'SELECT "order" FROM lessons' in query:
                return SimpleNamespace(scalar=lambda: 0)
            if 'INSERT INTO module_sections' in query:
                return SimpleNamespace(mappings=lambda: SimpleNamespace(first=lambda: {"id": "section-1", "title": "Section 1"}))
            if 'INSERT INTO lessons' in query:
                return SimpleNamespace(mappings=lambda: SimpleNamespace(first=lambda: {"id": "lesson-1", "title": "Section 1"}))
            if 'INSERT INTO lesson_content_blocks' in query:
                return SimpleNamespace()
            if 'INSERT INTO module_items' in query:
                return SimpleNamespace()
            if "UPDATE extracted_modules" in query:
                self.assertIn("mediaAssets", params["sc"])
                return SimpleNamespace()
            raise AssertionError(f"Unexpected query: {query}")

        db = AsyncMock()
        db.execute = AsyncMock(side_effect=execute_side_effect)
        db.commit = AsyncMock()
        user = RequestUser(id="teacher-1", email="teacher@test.com", roles=["teacher"])

        with patch("app.main.reindex_class_content", AsyncMock(return_value={"ok": True})):
            result = await apply_extraction(
                extraction_id="extract-1",
                body=SimpleNamespace(section_indices=None, lesson_indices=None),
                user=user,
                db=db,
            )

        self.assertTrue(result["success"])
        self.assertEqual(result["data"]["lessonsCreated"], 1)

    async def test_apply_is_idempotent_when_already_applied(self) -> None:
        db = AsyncMock()
        db.execute = AsyncMock(
            return_value=SimpleNamespace(
                mappings=lambda: SimpleNamespace(
                    first=lambda: {
                        "id": "extract-1",
                        "extraction_status": "applied",
                        "is_applied": True,
                        "teacher_id": "teacher-1",
                        "class_id": "class-1",
                        "structured_content": {
                            "title": "Module",
                            "sections": [],
                            "audit": {
                                "applyResult": {
                                    "alreadyApplied": False,
                                    "sectionsCreated": 1,
                                    "lessonsCreated": 1,
                                    "assessmentsCreated": 0,
                                }
                            },
                        },
                    }
                )
            )
        )
        db.commit = AsyncMock()
        user = RequestUser(id="teacher-1", email="teacher@test.com", roles=["teacher"])

        result = await apply_extraction(
            extraction_id="extract-1",
            body=SimpleNamespace(section_indices=None, lesson_indices=None),
            user=user,
            db=db,
        )

        self.assertTrue(result["success"])
        self.assertTrue(result["data"]["alreadyApplied"])
        self.assertEqual(result["data"]["lessonsCreated"], 1)

    async def test_apply_returns_success_with_indexing_warning_when_reindex_fails(self) -> None:
        extraction_row = {
            "id": "extract-1",
            "extraction_status": "completed",
            "is_applied": False,
            "teacher_id": "teacher-1",
            "class_id": "class-1",
            "structured_content": {
                "title": "Module",
                "description": "Demo",
                "sections": [
                    {
                        "title": "Section 1",
                        "description": "Desc",
                        "lessonBlocks": [
                            {
                                "type": "text",
                                "order": 0,
                                "content": {"text": "Body text that is long enough."},
                            }
                        ],
                    }
                ],
                "audit": {"qualityGate": "pass", "reviewRequired": False, "reviewIssues": []},
            },
        }

        def execute_side_effect(*args, **kwargs):
            query = str(args[0])
            if "FROM extracted_modules WHERE id = :id" in query:
                return SimpleNamespace(mappings=lambda: SimpleNamespace(first=lambda: extraction_row))
            if "SELECT id FROM classes WHERE id = :id" in query:
                return SimpleNamespace(first=lambda: {"id": "class-1"})
            if 'SELECT "order" FROM class_modules' in query or 'SELECT "order" FROM lessons' in query:
                return SimpleNamespace(scalar=lambda: 0)
            if "SELECT id FROM class_modules WHERE class_id = :cid" in query:
                return SimpleNamespace(first=lambda: None)
            if 'INSERT INTO class_modules' in query:
                return SimpleNamespace(mappings=lambda: SimpleNamespace(first=lambda: {"id": "module-1", "title": "Module"}))
            if 'INSERT INTO module_sections' in query:
                return SimpleNamespace(mappings=lambda: SimpleNamespace(first=lambda: {"id": "section-1", "title": "Section 1"}))
            if 'INSERT INTO lessons' in query:
                return SimpleNamespace(mappings=lambda: SimpleNamespace(first=lambda: {"id": "lesson-1", "title": "Section 1"}))
            return SimpleNamespace()

        db = AsyncMock()
        db.execute = AsyncMock(side_effect=execute_side_effect)
        db.commit = AsyncMock()
        user = RequestUser(id="teacher-1", email="teacher@test.com", roles=["teacher"])

        with patch("app.main.reindex_class_content", AsyncMock(side_effect=RuntimeError("index offline"))):
            result = await apply_extraction(
                extraction_id="extract-1",
                body=SimpleNamespace(section_indices=None, lesson_indices=None),
                user=user,
                db=db,
            )

        self.assertTrue(result["success"])
        self.assertEqual(result["data"]["indexing"]["ok"], False)
        self.assertIn("index offline", result["data"]["indexing"]["message"])


if __name__ == "__main__":
    unittest.main()
