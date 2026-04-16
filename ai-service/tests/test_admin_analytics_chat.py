import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from app.main import (
    RequestUser,
    admin_chat,
    admin_chat_history,
    admin_chat_session,
)


class AdminAnalyticsChatRouteTests(unittest.IsolatedAsyncioTestCase):
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
                  ]
                }
                """
            ),
        ):
            result = await admin_chat(body=body, user=user, db=db)

        self.assertTrue(result["success"])
        self.assertEqual(result["data"]["sessionId"], result["data"]["sessionId"])
        self.assertEqual(result["data"]["chart"]["type"], "bar")
        db.execute.assert_any_await(unittest.mock.ANY, unittest.mock.ANY)
        insert_call = db.execute.await_args_list[-1]
        self.assertEqual(insert_call.args[1]["sessionType"], "admin_analytics_chat")
        self.assertIn("chart", insert_call.args[1]["ctx"])
        self.assertIn("sources", insert_call.args[1]["ctx"])
        db.commit.assert_awaited_once()

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
                            "chart": {
                                "type": "line",
                                "title": "Usage trend",
                                "labels": ["Mon", "Tue"],
                                "series": [{"name": "Submissions", "data": [3, 5]}],
                            },
                            "sources": [{"source": "system-usage-report", "filters": {}}],
                        },
                    }
                ]
            )
        )
        user = RequestUser(id="admin-1", email="admin@school.edu", roles=["admin"])

        result = await admin_chat_session(session_id="session-1", user=user, db=db)

        self.assertTrue(result["success"])
        self.assertEqual(result["data"]["sessionId"], "session-1")
        self.assertEqual(result["data"]["messages"][1]["chart"]["type"], "line")
        self.assertEqual(result["data"]["messages"][1]["sources"][0]["source"], "system-usage-report")


if __name__ == "__main__":
    unittest.main()
