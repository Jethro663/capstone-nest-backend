from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:200411@localhost:5432/capstone"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:3b"
    ollama_embed_model: str = "nomic-embed-text"
    embedding_dimensions: int = 768
    ollama_timeout: int = 120
    upload_dir: str = "../backend/uploads"
    max_raw_text: int = 50_000
    log_level: str = "INFO"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
