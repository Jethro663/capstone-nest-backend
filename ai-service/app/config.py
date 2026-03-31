from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:200411@localhost:5432/capstone"
    ollama_base_url: str = "http://localhost:11434"
    ollama_text_model: str = Field(
        default="qwen2.5:3b",
        validation_alias=AliasChoices("OLLAMA_TEXT_MODEL", "OLLAMA_MODEL"),
    )
    ollama_vision_model: str = Field(default="gemma3:4b", validation_alias="OLLAMA_VISION_MODEL")
    ollama_embed_model: str = "nomic-embed-text"
    embedding_dimensions: int = 768
    ollama_timeout_chat_s: int = Field(
        default=60,
        validation_alias=AliasChoices("OLLAMA_TIMEOUT_CHAT_S", "OLLAMA_TIMEOUT"),
    )
    ollama_timeout_extraction_s: int = Field(
        default=240,
        validation_alias=AliasChoices("OLLAMA_TIMEOUT_EXTRACTION_S", "OLLAMA_TIMEOUT"),
    )
    ollama_keep_alive: str = "15m"
    upload_dir: str = "../backend/uploads"
    max_raw_text: int = 50_000
    log_level: str = "INFO"
    ai_service_shared_secret: str = ""
    ai_degraded_allowed: bool = False
    retrieval_min_final_score: float = Field(
        default=2.2,
        validation_alias="RETRIEVAL_MIN_FINAL_SCORE",
    )
    retrieval_min_semantic_score: float = Field(
        default=0.2,
        validation_alias="RETRIEVAL_MIN_SEMANTIC_SCORE",
    )
    retrieval_min_distinct_sources: int = Field(
        default=1,
        validation_alias="RETRIEVAL_MIN_DISTINCT_SOURCES",
    )
    ai_cloud_fallback_enabled: bool = Field(
        default=False,
        validation_alias="AI_CLOUD_FALLBACK_ENABLED",
    )
    ai_cloud_fallback_provider: str = Field(
        default="openai",
        validation_alias="AI_CLOUD_FALLBACK_PROVIDER",
    )
    ai_cloud_fallback_model: str = Field(
        default="gpt-4o-mini",
        validation_alias="AI_CLOUD_FALLBACK_MODEL",
    )
    ai_cloud_fallback_api_key: str = Field(
        default="",
        validation_alias="AI_CLOUD_FALLBACK_API_KEY",
    )
    ai_cloud_fallback_base_url: str = Field(
        default="https://api.openai.com/v1",
        validation_alias="AI_CLOUD_FALLBACK_BASE_URL",
    )

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
