import unittest
from unittest.mock import patch

from app import embedding_provider


class EmbeddingProviderTests(unittest.IsolatedAsyncioTestCase):
    async def test_embed_texts_returns_degraded_hash_vectors_when_runtime_fails(self) -> None:
        with (
            patch.object(embedding_provider.settings, "ai_degraded_allowed", True),
            patch.object(embedding_provider.settings, "embedding_dimensions", 8),
            patch("app.embedding_provider.ollama_client.embed", side_effect=RuntimeError("provider down")),
        ):
            result = await embedding_provider.embed_texts(["first", "second"])

        self.assertEqual(len(result), 2)
        self.assertEqual(len(result[0]), 8)
        self.assertEqual(len(result[1]), 8)
        self.assertNotEqual(result[0], result[1])
        self.assertTrue(result.degraded)
        self.assertEqual(result.provider, "degraded")
        self.assertEqual(result.model, "degraded:hash-embedding-v1")
        self.assertIn("provider down", result.warnings[0])

    async def test_embed_texts_raises_runtime_failure_when_degraded_mode_is_disabled(self) -> None:
        with (
            patch.object(embedding_provider.settings, "ai_degraded_allowed", False),
            patch("app.embedding_provider.ollama_client.embed", side_effect=RuntimeError("provider down")),
        ):
            with self.assertRaises(RuntimeError):
                await embedding_provider.embed_texts(["first"])


if __name__ == "__main__":
    unittest.main()
