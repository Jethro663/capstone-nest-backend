import unittest
from unittest.mock import patch

from app import cloud_fallback


class _FakeResponse:
    def __init__(self, body):
        self._body = body

    def raise_for_status(self) -> None:
        return None

    def json(self):
        return self._body


class _FakeAsyncClient:
    def __init__(self, body):
        self._bodies = body if isinstance(body, list) else [body]
        self.requests = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, *args, **kwargs):
        self.requests.append({"args": args, "kwargs": kwargs})
        body = self._bodies.pop(0)
        return _FakeResponse(body)


class CloudFallbackEmbeddingTests(unittest.IsolatedAsyncioTestCase):
    def tearDown(self) -> None:
        cloud_fallback._cloud_client = None

    async def test_embed_texts_accepts_values_style_embedding_items(self) -> None:
        body = {
            "data": [
                {
                    "index": 0,
                    "embedding": {
                        "values": [0.1, 0.2, 0.3],
                    },
                }
            ]
        }

        with (
            patch.object(cloud_fallback.settings, "ai_cloud_fallback_enabled", True),
            patch.object(cloud_fallback.settings, "ai_cloud_fallback_api_key", "test-key"),
            patch.object(
                cloud_fallback.settings,
                "ai_cloud_fallback_embedding_model",
                "google/gemini-embedding-2-preview",
            ),
            patch("app.cloud_fallback.httpx.AsyncClient", return_value=_FakeAsyncClient(body)),
        ):
            result = await cloud_fallback.embed_texts(["intervention focus"])

        self.assertEqual(result, [[0.1, 0.2, 0.3]])

    async def test_embed_texts_reorders_indexed_embeddings(self) -> None:
        body = {
            "data": [
                {"index": 1, "embedding": [0.4, 0.5]},
                {"index": 0, "embedding": [0.1, 0.2]},
            ]
        }

        with (
            patch.object(cloud_fallback.settings, "ai_cloud_fallback_enabled", True),
            patch.object(cloud_fallback.settings, "ai_cloud_fallback_api_key", "test-key"),
            patch.object(
                cloud_fallback.settings,
                "ai_cloud_fallback_embedding_model",
                "google/gemini-embedding-2-preview",
            ),
            patch("app.cloud_fallback.httpx.AsyncClient", return_value=_FakeAsyncClient(body)),
        ):
            result = await cloud_fallback.embed_texts(["first", "second"])

        self.assertEqual(result, [[0.1, 0.2], [0.4, 0.5]])

    async def test_embed_texts_retries_missing_batch_vectors_one_by_one(self) -> None:
        fake_client = _FakeAsyncClient(
            [
                {"data": [{"index": 0, "embedding": [0.1, 0.2]}]},
                {"data": [{"index": 0, "embedding": [0.9, 1.0]}]},
            ]
        )

        with (
            patch.object(cloud_fallback.settings, "ai_cloud_fallback_enabled", True),
            patch.object(cloud_fallback.settings, "ai_cloud_fallback_api_key", "test-key"),
            patch.object(
                cloud_fallback.settings,
                "ai_cloud_fallback_embedding_model",
                "google/gemini-embedding-2-preview",
            ),
            patch("app.cloud_fallback.httpx.AsyncClient", return_value=fake_client),
        ):
            result = await cloud_fallback.embed_texts(["first", "second"])

        self.assertEqual(result, [[0.1, 0.2], [0.9, 1.0]])
        self.assertEqual(fake_client.requests[0]["kwargs"]["json"]["input"], ["first", "second"])
        self.assertEqual(fake_client.requests[1]["kwargs"]["json"]["input"], ["second"])

    async def test_generate_text_accepts_openrouter_provider_alias(self) -> None:
        fake_client = _FakeAsyncClient(
            {
                "choices": [
                    {
                        "message": {
                            "content": "OpenRouter reply",
                        }
                    }
                ]
            }
        )

        with (
            patch.object(cloud_fallback.settings, "ai_cloud_fallback_enabled", True),
            patch.object(cloud_fallback.settings, "ai_cloud_fallback_api_key", "test-key"),
            patch.object(cloud_fallback.settings, "ai_cloud_fallback_provider", "openrouter"),
            patch.object(cloud_fallback.settings, "ai_cloud_fallback_base_url", "https://openrouter.ai/api/v1"),
            patch.object(cloud_fallback.settings, "ai_cloud_fallback_model", "openrouter/auto"),
            patch("app.cloud_fallback.httpx.AsyncClient", return_value=fake_client),
        ):
            result = await cloud_fallback.generate_text(prompt="Hello")

        self.assertEqual(result, "OpenRouter reply")


if __name__ == "__main__":
    unittest.main()
