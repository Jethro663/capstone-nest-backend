# ai-service

Python FastAPI microservice handling tutoring, extraction, retrieval/indexing, quiz drafting, and other AI-backed flows for Nexora LMS.

`ai-service` is an internal service. Web and mobile clients do not call it directly; the Nest backend proxies AI routes and forwards `X-User-*` headers plus the optional `X-Internal-Service-Token` shared secret.

## Quick Start

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate   # Linux / macOS
venv\Scripts\activate      # Windows

# Install dependencies
pip install -r requirements.txt

# Copy and configure local-only env
cp .env.example .env.local

# Pull the embedding model used for retrieval/indexing when using local Ollama
ollama pull nomic-embed-text

# Run development server
uvicorn app.main:app --reload --port 8000
```

## Testing

```bash
# Stable cross-platform test runner
python scripts/run_tests.py

# Focused config/runtime regression tests
./.venv/bin/python -m unittest tests.test_config tests.test_cloud_fallback
```

## Runtime Modes

- Local/dev fallback: Ollama-first for fully local development.
- Railway/production: OpenRouter-primary cloud runtime, with Ollama optional.

Recommended Railway baseline:

```env
AI_RUNTIME_MODE=cloud
AI_CLOUD_FALLBACK_PROVIDER=openrouter
AI_CLOUD_FALLBACK_ENABLED=true
AI_CLOUD_FALLBACK_BASE_URL=https://openrouter.ai/api/v1
AI_CLOUD_FALLBACK_API_KEY=CHANGE_ME_OPENROUTER_KEY
AI_CLOUD_FALLBACK_MODEL=openrouter/auto
OPENROUTER_EMBEDDING_MODEL=google/gemini-embedding-2-preview
```

If local Ollama is not available, production readiness should still succeed when the OpenRouter cloud runtime is configured correctly.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://postgres:CHANGE_ME_DB_PASSWORD@localhost:5432/capstone` | Async PostgreSQL DSN |
| `AI_SERVICE_SHARED_SECRET` | `` | Shared secret expected from backend `X-Internal-Service-Token` |
| `AI_DEGRADED_ALLOWED` | `false` | Allows degraded readiness when AI runtime is unavailable |
| `AI_RUNTIME_MODE` | `auto` | Runtime policy (`auto`, `cloud`, or local-first deployments) |
| `AI_CLOUD_FALLBACK_ENABLED` | `false` | Enables the OpenAI-compatible cloud runtime |
| `AI_CLOUD_FALLBACK_PROVIDER` | `openai` | Provider label; `openrouter` is supported and recommended on Railway |
| `AI_CLOUD_FALLBACK_BASE_URL` | `https://api.openai.com/v1` | OpenAI-compatible base URL; use `https://openrouter.ai/api/v1` for OpenRouter |
| `AI_CLOUD_FALLBACK_API_KEY` | `` | Primary cloud runtime API key; `OPENROUTER_API_KEY` alias is supported |
| `AI_CLOUD_FALLBACK_MODEL` | `gpt-4o-mini` | Primary text model; `OPENROUTER_TEXT_MODEL` alias is supported |
| `OPENROUTER_VISION_MODEL` | `` | Optional dedicated vision model; falls back to the text model if empty |
| `OPENROUTER_EMBEDDING_MODEL` | `google/gemini-embedding-2-preview` | Embedding model used for retrieval/indexing fallback |
| `OPENROUTER_HTTP_REFERER` | `` | Optional OpenRouter referer header |
| `OPENROUTER_X_TITLE` | `` | Optional OpenRouter title header |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API endpoint |
| `OLLAMA_TEXT_MODEL` | `qwen2.5:3b` | Default text model for tutor, grading, quiz generation, and intervention suggestions |
| `OLLAMA_VISION_MODEL` | `gemma3:4b` | Vision/document model for scanned PDFs and image-based prompts |
| `OLLAMA_EMBED_MODEL` | `nomic-embed-text` | Ollama embedding model for retrieval and pgvector indexing |
| `OLLAMA_TIMEOUT_CHAT_S` | `60` | Ollama timeout for chat-style requests (seconds) |
| `OLLAMA_TIMEOUT_EXTRACTION_S` | `240` | Ollama timeout for extraction/document requests (seconds) |
| `OLLAMA_KEEP_ALIVE` | `15m` | Keeps the active model warm between requests |
| `UPLOAD_DIR` | `../backend/uploads` | Shared upload volume path |
| `MAX_RAW_TEXT` | `50000` | Max characters extracted from PDF |
| `BACKEND_INTERNAL_URL` | `` | Internal backend URL used when ai-service must fetch uploads over HTTP instead of a shared local volume |
| `LOG_LEVEL` | `INFO` | Logging level |

Use `.env.example` as the committed template and keep real local credentials in the ignored `.env.local` file only.

## Readiness and Health

- `GET /live`: process liveness only
- `GET /health`: dependency detail/status surface
- `GET /ready`: production readiness gate used to decide whether the service can actually handle AI traffic safely

On Railway, prefer checking `/ready` when validating the deployment. A process can be alive while still being unready because the database, embedding runtime, upload materialization path, or cloud AI runtime is degraded.

## Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/chat` | Chat with JAKIPIR AI mentor |
| `GET` | `/health` | Dependency and runtime health details |
| `GET` | `/live` | Liveness probe |
| `GET` | `/ready` | Readiness probe |
| `POST` | `/extract` | Queue PDF module extraction |
| `GET` | `/extractions/{id}/status` | Poll extraction status |
| `GET` | `/extractions` | List extractions for a class |
| `GET` | `/extractions/{id}` | Get extraction details |
| `PATCH` | `/extractions/{id}` | Edit extraction before applying |
| `POST` | `/extractions/{id}/apply` | Apply extraction → create lessons |
| `DELETE` | `/extractions/{id}` | Delete unapplied extraction |
| `GET` | `/history` | Get AI interaction history |

## Verification

```bash
# Full unit test suite
python scripts/run_tests.py

# Import sanity
./.venv/bin/python -c "from app.main import app; print(app.title)"

# Startup path
uvicorn app.main:app --reload --port 8000
```

For Railway-focused verification, confirm that:

- `DATABASE_URL` uses the asyncpg form: `postgresql+asyncpg://...`
- backend and ai-service share the same `AI_SERVICE_SHARED_SECRET`
- OpenRouter envs are present when `AI_RUNTIME_MODE=cloud`
- `/ready` returns healthy with OpenRouter configured, even if local Ollama is absent
