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
        self._body = body

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, *args, **kwargs):
        return _FakeResponse(self._body)


class CloudFallbackEmbeddingTests(unittest.IsolatedAsyncioTestCase):
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


if __name__ == "__main__":
    unittest.main()
