import unittest
from unittest.mock import patch

import httpx

from app import embedding_provider


class EmbeddingProviderTests(unittest.IsolatedAsyncioTestCase):
    async def test_embed_texts_rejects_wrong_dimension_provider_response(self) -> None:
        with (
            patch.object(embedding_provider.settings, "embedding_dimensions", 3),
            patch(
                "app.embedding_provider.ollama_client.embed",
                return_value=[[0.1, 0.2]],
            ),
        ):
            with self.assertRaisesRegex(
                embedding_provider.EmbeddingProviderUnavailable,
                "dimension",
            ):
                await embedding_provider.embed_texts(["lesson"])

    async def test_embed_texts_rejects_non_finite_provider_response(self) -> None:
        with (
            patch.object(embedding_provider.settings, "embedding_dimensions", 2),
            patch(
                "app.embedding_provider.ollama_client.embed",
                return_value=[[0.1, float("nan")]],
            ),
        ):
            with self.assertRaisesRegex(
                embedding_provider.EmbeddingProviderUnavailable,
                "finite",
            ):
                await embedding_provider.embed_texts(["lesson"])

    async def test_embed_texts_never_returns_hash_vectors_when_runtime_fails(self) -> None:
        with (
            patch.object(embedding_provider.settings, "ai_degraded_allowed", True),
            patch.object(embedding_provider.settings, "embedding_dimensions", 8),
            patch("app.embedding_provider.ollama_client.embed", side_effect=RuntimeError("provider down")),
        ):
            with self.assertRaisesRegex(
                embedding_provider.EmbeddingProviderUnavailable,
                "provider down",
            ):
                await embedding_provider.embed_texts(["first", "second"])

    async def test_embed_texts_raises_runtime_failure_when_degraded_mode_is_disabled(self) -> None:
        with (
            patch.object(embedding_provider.settings, "ai_degraded_allowed", False),
            patch("app.embedding_provider.ollama_client.embed", side_effect=RuntimeError("provider down")),
        ):
            with self.assertRaises(embedding_provider.EmbeddingProviderUnavailable):
                await embedding_provider.embed_texts(["first"])

    async def test_embed_texts_reports_provider_unavailable_when_ollama_times_out(self) -> None:
        with (
            patch.object(embedding_provider.settings, "ai_degraded_allowed", True),
            patch.object(embedding_provider.settings, "embedding_dimensions", 8),
            patch(
                "app.embedding_provider.ollama_client.embed",
                side_effect=httpx.ReadTimeout("embedding provider timed out"),
            ),
        ):
            with self.assertRaisesRegex(
                embedding_provider.EmbeddingProviderUnavailable,
                "timed out",
            ):
                await embedding_provider.embed_texts(["same lesson"])


if __name__ == "__main__":
    unittest.main()
