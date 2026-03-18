# ai-service

Python FastAPI microservice handling AI mentor chat (JAKIPIR) and PDF module extraction for Nexora LMS.

## Quick Start

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate   # Linux / macOS
venv\Scripts\activate      # Windows

# Install dependencies
pip install -r requirements.txt

# Copy and configure env
cp .env.example .env

# Pull the embedding model used for retrieval/indexing
ollama pull nomic-embed-text

# Run development server
uvicorn app.main:app --reload --port 8000
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://postgres:200411@localhost:5432/capstone` | Async PostgreSQL DSN |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API endpoint |
| `OLLAMA_TEXT_MODEL` | `qwen2.5:3b` | Default text model for tutor, grading, quiz generation, and intervention suggestions |
| `OLLAMA_VISION_MODEL` | `gemma3:4b` | Vision/document model for scanned PDFs and image-based prompts |
| `OLLAMA_EMBED_MODEL` | `nomic-embed-text` | Ollama embedding model for retrieval and pgvector indexing |
| `OLLAMA_TIMEOUT_CHAT_S` | `60` | Ollama timeout for chat-style requests (seconds) |
| `OLLAMA_TIMEOUT_EXTRACTION_S` | `240` | Ollama timeout for extraction/document requests (seconds) |
| `OLLAMA_KEEP_ALIVE` | `15m` | Keeps the active model warm between requests |
| `UPLOAD_DIR` | `../backend/uploads` | Shared upload volume path |
| `MAX_RAW_TEXT` | `50000` | Max characters extracted from PDF |
| `LOG_LEVEL` | `INFO` | Logging level |

## Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/chat` | Chat with JAKIPIR AI mentor |
| `GET` | `/health` | Ollama health check |
| `POST` | `/extract` | Queue PDF module extraction |
| `GET` | `/extractions/{id}/status` | Poll extraction status |
| `GET` | `/extractions` | List extractions for a class |
| `GET` | `/extractions/{id}` | Get extraction details |
| `PATCH` | `/extractions/{id}` | Edit extraction before applying |
| `POST` | `/extractions/{id}/apply` | Apply extraction → create lessons |
| `DELETE` | `/extractions/{id}` | Delete unapplied extraction |
| `GET` | `/history` | Get AI interaction history |
