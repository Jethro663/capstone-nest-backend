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

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
