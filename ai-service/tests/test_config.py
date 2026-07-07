import os
import tempfile
import unittest
from pathlib import Path

from app.config import Settings


class SettingsTests(unittest.TestCase):
    def test_settings_prefers_env_local_over_env(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            (tmp_path / ".env").write_text(
                "DATABASE_URL=postgresql+asyncpg://postgres:env@localhost:5432/envdb\n"
            )
            (tmp_path / ".env.local").write_text(
                "DATABASE_URL=postgresql+asyncpg://postgres:local@localhost:5432/localdb\n"
            )

            previous_cwd = Path.cwd()
            try:
                os.chdir(tmp_path)
                settings = Settings()
            finally:
                os.chdir(previous_cwd)

        self.assertEqual(
            settings.database_url,
            "postgresql+asyncpg://postgres:local@localhost:5432/localdb",
        )

    def test_settings_accepts_openrouter_aliases_for_cloud_fallback(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            (tmp_path / ".env").write_text(
                "OPENROUTER_API_KEY=test-openrouter-key\n"
                "OPENROUTER_BASE_URL=https://openrouter.ai/api/v1\n"
                "OPENROUTER_TEXT_MODEL=openrouter/auto\n"
                "OPENROUTER_VISION_MODEL=openrouter/vision\n"
                "OPENROUTER_EMBEDDING_MODEL=openrouter/embed\n"
                "OPENROUTER_HTTP_REFERER=https://nexora-lms.com\n"
                "OPENROUTER_X_TITLE=Nexora LMS\n"
            )

            previous_cwd = Path.cwd()
            try:
                os.chdir(tmp_path)
                settings = Settings()
            finally:
                os.chdir(previous_cwd)

        self.assertEqual(settings.ai_cloud_fallback_api_key, "test-openrouter-key")
        self.assertEqual(settings.ai_cloud_fallback_base_url, "https://openrouter.ai/api/v1")
        self.assertEqual(settings.ai_cloud_fallback_model, "openrouter/auto")
        self.assertEqual(settings.ai_cloud_fallback_vision_model, "openrouter/vision")
        self.assertEqual(settings.ai_cloud_fallback_embedding_model, "openrouter/embed")
        self.assertEqual(settings.ai_cloud_fallback_referer, "https://nexora-lms.com")
        self.assertEqual(settings.ai_cloud_fallback_title, "Nexora LMS")


if __name__ == "__main__":
    unittest.main()
