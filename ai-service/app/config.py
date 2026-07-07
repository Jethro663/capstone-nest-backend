from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:CHANGE_ME_DB_PASSWORD@localhost:5432/capstone"
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
    ollama_timeout_quiz_generation_s: int = Field(
        default=150,
        validation_alias=AliasChoices(
            "OLLAMA_TIMEOUT_QUIZ_GENERATION_S",
            "OLLAMA_TIMEOUT_QUIZ_S",
            "OLLAMA_TIMEOUT",
        ),
    )
    ollama_keep_alive: str = "15m"
    upload_dir: str = "../backend/uploads"
    backend_internal_url: str = ""
    backend_upload_fetch_timeout_s: int = 60
    max_raw_text: int = 50_000
    db_pool_size: int = Field(default=10, validation_alias="DB_POOL_SIZE")
    db_max_overflow: int = Field(default=15, validation_alias="DB_MAX_OVERFLOW")
    db_pool_timeout_s: int = Field(default=30, validation_alias="DB_POOL_TIMEOUT_S")
    db_pool_recycle_s: int = Field(default=1800, validation_alias="DB_POOL_RECYCLE_S")
    db_pool_pre_ping: bool = Field(default=True, validation_alias="DB_POOL_PRE_PING")
    log_level: str = "INFO"
    ai_tutor_max_inflight: int = Field(
        default=8,
        validation_alias="AI_TUTOR_MAX_INFLIGHT",
    )
    ai_tutor_reject_status: int = Field(
        default=429,
        validation_alias="AI_TUTOR_REJECT_STATUS",
    )
    ai_tutor_retry_after_s: int = Field(
        default=5,
        validation_alias="AI_TUTOR_RETRY_AFTER_S",
    )
    ai_teacher_bg_max_concurrency: int = Field(
        default=2,
        validation_alias="AI_TEACHER_BG_MAX_CONCURRENCY",
    )
    ai_extraction_bg_max_concurrency: int = Field(
        default=1,
        validation_alias="AI_EXTRACTION_BG_MAX_CONCURRENCY",
    )
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
    ai_runtime_mode: str = Field(
        default="auto",
        validation_alias=AliasChoices("AI_RUNTIME_MODE", "ai_runtime_mode"),
    )
    ai_cloud_fallback_provider: str = Field(
        default="openai",
        validation_alias="AI_CLOUD_FALLBACK_PROVIDER",
    )
    ai_cloud_fallback_model: str = Field(
        default="gpt-4o-mini",
        validation_alias=AliasChoices("AI_CLOUD_FALLBACK_MODEL", "OPENROUTER_TEXT_MODEL"),
    )
    ai_cloud_fallback_vision_model: str = Field(
        default="",
        validation_alias="OPENROUTER_VISION_MODEL",
    )
    ai_cloud_fallback_embedding_model: str = Field(
        default="google/gemini-embedding-2-preview",
        validation_alias="OPENROUTER_EMBEDDING_MODEL",
    )
    ai_cloud_fallback_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("AI_CLOUD_FALLBACK_API_KEY", "OPENROUTER_API_KEY"),
    )
    ai_cloud_fallback_base_url: str = Field(
        default="https://api.openai.com/v1",
        validation_alias=AliasChoices("AI_CLOUD_FALLBACK_BASE_URL", "OPENROUTER_BASE_URL"),
    )
    ai_cloud_fallback_referer: str = Field(
        default="",
        validation_alias="OPENROUTER_HTTP_REFERER",
    )
    ai_cloud_fallback_title: str = Field(
        default="",
        validation_alias="OPENROUTER_X_TITLE",
    )

    @model_validator(mode="after")
    def validate_internal_secret(self):
        runtime_mode = (self.ai_runtime_mode or "").strip().lower()
        if runtime_mode not in {"development", "dev", "test", "testing"} and not (self.ai_service_shared_secret or "").strip():
            raise ValueError("AI_SERVICE_SHARED_SECRET must be set outside development runtime")
        return self

    model_config = {"env_file": (".env", ".env.local"), "extra": "ignore"}


settings = Settings()
