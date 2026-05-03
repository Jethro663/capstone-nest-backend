import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException

from app.main import RequestUser, apply_extraction


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
                            {"type": "text", "order": 0, "content": {"text": "Body"}},
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


if __name__ == "__main__":
    unittest.main()
