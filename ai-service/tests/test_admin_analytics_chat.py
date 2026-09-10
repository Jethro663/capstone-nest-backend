import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from app.main import (
    RequestUser,
    _normalize_admin_assistant_response,
    admin_chat,
    admin_chat_history,
    admin_chat_session,
    admin_chat_session_delete,
    admin_chat_session_rename,
)
from app.schemas import AdminSessionUpdateRequest


class AdminAnalyticsChatRouteTests(unittest.IsolatedAsyncioTestCase):
    async def test_admin_response_rejects_an_approved_but_unfetched_source(self) -> None:
        parsed = _normalize_admin_assistant_response(
            {
                "reply": "The available learner report contains two records.",
                "sources": [
                    {"source": "audit-log", "filters": {}},
                ],
            },
            {
                "provenance": [
                    {
                        "source": "student-performance-report",
                        "label": "Student performance report",
                        "href": "/dashboard/admin/reports",
                        "fetchedAt": "2026-09-11T00:00:00.000Z",
                        "filters": {"gradingPeriod": "Q3"},
                        "recordCount": 2,
                        "total": 2,
                        "truncated": False,
                    }
                ]
            },
        )

        self.assertEqual(
            [source["source"] for source in parsed["sources"]],
            ["student-performance-report"],
        )

    async def test_admin_chat_returns_structured_payload_and_persists_admin_session_type(self) -> None:
        db = AsyncMock()
        db.execute = AsyncMock(
            side_effect=[
                SimpleNamespace(mappings=lambda: []),
                SimpleNamespace(),
            ]
        )
        db.commit = AsyncMock()
        user = RequestUser(id="admin-1", email="admin@school.edu", roles=["admin"])
        body = SimpleNamespace(
            message="Show me current at-risk trends.",
            session_id=None,
            context={
                "overview": {"stats": {"totalUsers": 12}},
                "reports": {"studentPerformance": []},
                "scope": {
                    "timeRange": "current_period",
                    "schoolYear": "2026-2027",
                    "gradingPeriod": "Q3",
                    "periodLabel": "Term 3",
                },
                "provenance": [
                    {
                        "source": "student-performance-report",
                        "label": "Student performance report",
                        "href": "/dashboard/admin/reports",
                        "fetchedAt": "2026-09-11T00:00:00.000Z",
                        "filters": {"gradingPeriod": "Q3"},
                        "recordCount": 2,
                        "total": 8,
                        "truncated": True,
                    }
                ],
            },
        )

        with patch(
            "app.main.ollama_client.generate",
            AsyncMock(
                return_value="""
                {
                  "reply": "2 students are currently flagged as at risk.",
                  "chart": {
                    "type": "bar",
                    "title": "At-risk students by class",
                    "labels": ["MATH-7", "SCI-7"],
                    "series": [{"name": "At-risk students", "data": [2, 1]}]
                  },
                  "sources": [
                    {
                      "source": "student-performance-report",
                      "filters": {"window": "latest"},
                      "window": "latest snapshot"
                    }
                  ],
                  "dataView": {
                    "title": "At-risk learners",
                    "columns": ["Class", "Learners"],
                    "rows": [["MATH-7", "2"]],
                    "total": 8,
                    "truncated": true
                  },
                  "suggestedPrompts": ["Compare with the last 30 days"],
                  "action": {
                    "kind": "navigate",
                    "target": "external_url",
                    "label": "Open an unsafe URL",
                    "description": "This target is not approved",
                    "draft": null
                  }
                }
                """
            ),
        ):
            result = await admin_chat(body=body, user=user, db=db)

        self.assertTrue(result["success"])
        self.assertEqual(result["data"]["sessionId"], result["data"]["sessionId"])
        self.assertEqual(result["data"]["chart"]["type"], "bar")
        self.assertEqual(
            result["data"]["sources"][0]["href"],
            "/dashboard/admin/reports",
        )
        self.assertEqual(
            result["data"]["sources"][0]["label"],
            "Student performance report",
        )
        self.assertTrue(result["data"]["sources"][0]["truncated"])
        self.assertEqual(result["data"]["dataView"]["rows"], [["MATH-7", "2"]])
        self.assertEqual(
            result["data"]["suggestedPrompts"],
            ["Compare with the last 30 days"],
        )
        self.assertIsNone(result["data"]["action"])
        db.execute.assert_any_await(unittest.mock.ANY, unittest.mock.ANY)
        insert_call = db.execute.await_args_list[-1]
        self.assertEqual(insert_call.args[1]["sessionType"], "admin_analytics_chat")
        self.assertIn("chart", insert_call.args[1]["ctx"])
        self.assertIn("sources", insert_call.args[1]["ctx"])
        db.commit.assert_awaited_once()

    async def test_admin_chat_loads_only_the_six_most_recent_prior_turns(self) -> None:
        db = AsyncMock()
        db.execute = AsyncMock(
            side_effect=[
                SimpleNamespace(
                    mappings=lambda: [
                        {
                            "input_text": "Newest question",
                            "output_text": "Newest answer",
                            "created_at": "2026-09-11T00:00:00.000Z",
                        }
                    ]
                ),
                SimpleNamespace(),
            ]
        )
        db.commit = AsyncMock()
        user = RequestUser(id="admin-1", email="admin@school.edu", roles=["admin"])
        body = SimpleNamespace(
            message="Continue the review.",
            session_id="11111111-1111-1111-1111-111111111111",
            context={
                "provenance": [
                    {
                        "source": "admin-dashboard-overview",
                        "label": "Admin dashboard overview",
                        "href": "/dashboard/admin",
                        "fetchedAt": "2026-09-11T00:00:00.000Z",
                        "filters": {},
                        "recordCount": 1,
                        "total": 1,
                        "truncated": False,
                    }
                ]
            },
        )

        with patch(
            "app.main.ollama_client.generate",
            AsyncMock(
                return_value='{"reply":"Review continued.","sources":[{"source":"admin-dashboard-overview","filters":{}}]}'
            ),
        ):
            await admin_chat(body=body, user=user, db=db)

        history_sql = str(db.execute.await_args_list[0].args[0])
        self.assertIn("ORDER BY created_at DESC LIMIT 6", history_sql)

    async def test_admin_chat_history_filters_for_admin_session_type(self) -> None:
        db = AsyncMock()
        db.execute = AsyncMock(
            return_value=SimpleNamespace(
                mappings=lambda: [
                    {
                        "id": "log-1",
                        "session_id": "session-1",
                        "session_type": "admin_analytics_chat",
                        "input_text": "Show me audit anomalies.",
                        "output_text": "No severe anomalies were found.",
                        "created_at": "2026-04-13T00:00:00.000Z",
                        "context_metadata": {
                            "title": "Audit watch",
                            "sources": [{"source": "audit-log", "filters": {}}],
                        },
                    }
                ]
            )
        )
        user = RequestUser(id="admin-1", email="admin@school.edu", roles=["admin"])

        result = await admin_chat_history(user=user, db=db)

        self.assertTrue(result["success"])
        self.assertEqual(result["data"][0]["sessionId"], "session-1")
        self.assertEqual(result["data"][0]["sessionType"], "admin_analytics_chat")
        self.assertEqual(result["data"][0]["title"], "Audit watch")

    async def test_admin_chat_session_returns_ordered_messages_with_chart_metadata(self) -> None:
        db = AsyncMock()
        db.execute = AsyncMock(
            return_value=SimpleNamespace(
                mappings=lambda: [
                    {
                        "id": "log-2",
                        "session_id": "session-1",
                        "session_type": "admin_analytics_chat",
                        "input_text": "Summarize usage.",
                        "output_text": "Assessment submissions increased.",
                        "created_at": "2026-04-13T00:00:00.000Z",
                        "context_metadata": {
                            "title": "Weekly activity",
                            "chart": {
                                "type": "line",
                                "title": "Usage trend",
                                "labels": ["Mon", "Tue"],
                                "series": [{"name": "Submissions", "data": [3, 5]}],
                            },
                            "sources": [
                                {
                                    "source": "system-usage-report",
                                    "label": "System usage report",
                                    "filters": {"dateFrom": "2026-09-04"},
                                    "window": "2026-09-11T00:00:00.000Z",
                                    "recordCount": 4,
                                    "total": None,
                                    "truncated": False,
                                    "href": "/dashboard/admin/reports",
                                }
                            ],
                            "dataView": {
                                "title": "Usage",
                                "columns": ["Day", "Submissions"],
                                "rows": [["Monday", "3"]],
                                "total": 1,
                                "truncated": False,
                            },
                            "suggestedPrompts": ["Compare with last week"],
                            "action": {
                                "kind": "navigate",
                                "target": "reports",
                                "label": "Open reports",
                                "description": "Review usage records",
                                "href": "/dashboard/admin/reports",
                                "draft": None,
                            },
                            "scope": {
                                "timeRange": "last_7_days",
                                "schoolYear": "2026-2027",
                                "gradingPeriod": "Q3",
                                "periodLabel": "Term 3",
                            },
                        },
                    }
                ]
            )
        )
        user = RequestUser(id="admin-1", email="admin@school.edu", roles=["admin"])

        result = await admin_chat_session(session_id="session-1", user=user, db=db)

        self.assertTrue(result["success"])
        self.assertEqual(result["data"]["sessionId"], "session-1")
        self.assertEqual(result["data"]["title"], "Weekly activity")
        self.assertEqual(result["data"]["messages"][1]["chart"]["type"], "line")
        self.assertEqual(result["data"]["messages"][1]["sources"][0]["source"], "system-usage-report")
        self.assertEqual(
            result["data"]["messages"][1]["sources"][0]["label"],
            "System usage report",
        )
        self.assertEqual(
            result["data"]["messages"][1]["dataView"]["rows"],
            [["Monday", "3"]],
        )
        self.assertEqual(
            result["data"]["messages"][1]["suggestedPrompts"],
            ["Compare with last week"],
        )
        self.assertEqual(
            result["data"]["messages"][1]["action"]["href"],
            "/dashboard/admin/reports",
        )
        self.assertEqual(
            result["data"]["messages"][1]["scope"]["periodLabel"],
            "Term 3",
        )

    async def test_admin_chat_session_rename_is_scoped_to_the_requesting_admin(self) -> None:
        db = AsyncMock()
        db.execute = AsyncMock(return_value=SimpleNamespace(first=lambda: ("log-1",)))
        db.commit = AsyncMock()
        user = RequestUser(id="admin-1", email="admin@school.edu", roles=["admin"])

        result = await admin_chat_session_rename(
            session_id="11111111-1111-1111-1111-111111111111",
            body=AdminSessionUpdateRequest(title="  Weekly operations  "),
            user=user,
            db=db,
        )

        self.assertEqual(result["data"]["title"], "Weekly operations")
        params = db.execute.await_args.args[1]
        self.assertEqual(params["uid"], "admin-1")
        self.assertEqual(params["sessionType"], "admin_analytics_chat")
        self.assertEqual(params["title"], "Weekly operations")
        db.commit.assert_awaited_once()

    async def test_admin_chat_session_delete_is_scoped_to_the_requesting_admin(self) -> None:
        db = AsyncMock()
        db.execute = AsyncMock(return_value=SimpleNamespace(first=lambda: ("log-1",)))
        db.commit = AsyncMock()
        user = RequestUser(id="admin-1", email="admin@school.edu", roles=["admin"])

        result = await admin_chat_session_delete(
            session_id="11111111-1111-1111-1111-111111111111",
            user=user,
            db=db,
        )

        self.assertEqual(
            result["data"]["sessionId"],
            "11111111-1111-1111-1111-111111111111",
        )
        self.assertTrue(result["data"]["deleted"])
        params = db.execute.await_args.args[1]
        self.assertEqual(params["uid"], "admin-1")
        self.assertEqual(params["sessionType"], "admin_analytics_chat")
        db.commit.assert_awaited_once()


if __name__ == "__main__":
    unittest.main()
