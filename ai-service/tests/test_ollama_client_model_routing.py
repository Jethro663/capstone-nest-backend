import unittest
from unittest.mock import patch

from app import ollama_client


class OllamaClientModelRoutingTests(unittest.TestCase):
    def test_all_text_tasks_use_canonical_cloud_model(self) -> None:
        text_tasks = [
            task
            for task, profile in ollama_client.TASK_PROFILES.items()
            if profile["model_kind"] == "text"
        ]

        with (
            patch.object(ollama_client.settings, "ai_runtime_mode", "cloud"),
            patch.object(ollama_client.settings, "ai_cloud_fallback_enabled", True),
            patch.object(ollama_client.settings, "ai_cloud_fallback_api_key", "test-key"),
            patch.object(
                ollama_client.settings,
                "ai_cloud_fallback_model",
                "google/gemini-3.7-flash",
            ),
        ):
            resolved = {
                task: ollama_client.get_task_model_name(task)
                for task in text_tasks
            }

        self.assertEqual(
            text_tasks,
            [
                "chat",
                "grading",
                "classification",
                "quiz_generation",
                "intervention",
                "text_extraction",
                "lesson_enrichment",
            ],
        )
        self.assertEqual(
            resolved,
            {task: "google/gemini-3.7-flash" for task in text_tasks},
        )

    def test_vision_and_embedding_models_remain_independent(self) -> None:
        with (
            patch.object(ollama_client.settings, "ai_runtime_mode", "cloud"),
            patch.object(ollama_client.settings, "ai_cloud_fallback_enabled", True),
            patch.object(ollama_client.settings, "ai_cloud_fallback_api_key", "test-key"),
            patch.object(
                ollama_client.settings,
                "ai_cloud_fallback_model",
                "google/gemini-3.7-flash",
            ),
            patch.object(
                ollama_client.settings,
                "ai_cloud_fallback_vision_model",
                "google/gemma-4-26b-a4b-it",
            ),
            patch.object(
                ollama_client.settings,
                "ai_cloud_fallback_embedding_model",
                "google/gemini-embedding-2-preview",
            ),
        ):
            self.assertEqual(
                ollama_client.get_task_model_name("vision_extraction"),
                "google/gemma-4-26b-a4b-it",
            )
            self.assertEqual(
                ollama_client.get_embedding_model_name(),
                "google/gemini-embedding-2-preview",
            )


if __name__ == "__main__":
    unittest.main()
