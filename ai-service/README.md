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

# Run development server
uvicorn app.main:app --reload --port 8000
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://postgres:200411@localhost:5432/capstone` | Async PostgreSQL DSN |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API endpoint |
| `OLLAMA_MODEL` | `llama3.2:3b` | LLM model name |
| `OLLAMA_TIMEOUT` | `120` | Ollama request timeout (seconds) |
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
