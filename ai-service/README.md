# Nexora AI Service

Internal FastAPI service for tutoring, retrieval/indexing, module extraction, quiz and lesson-plan drafting, remedial content, and other AI-assisted Nexora workflows.

Web and mobile clients do not call this service directly. NestJS proxies public AI routes, forwards user context, validates roles, and owns durable BullMQ orchestration.

## Runtime architecture

- `app/main.py` remains the stable ASGI entrypoint and owns shared lifecycle/readiness wiring.
- `app/routers/extractions.py` owns queue-bound extraction preparation and protected execution routes.
- `app/extraction_job_service.py` owns pending/failure/cancellation state transitions.
- `app/extraction_pipeline.py` owns extraction execution.
- `app/retrieval_service.py`, `app/indexing_pipeline.py`, and `app/embedding_provider.py` own RAG/indexing.
- `app/ollama_client.py` and `app/cloud_fallback.py` own model/runtime dispatch.
- `app/async_utils.py` provides managed off-loop work so shutdown and tests do not leak executor threads.

Public extraction preparation returns `202`, but execution is queued by the backend. FastAPI does not leave extraction work as an untracked `asyncio.create_task`.

## Local start

Python 3.12 is the supported CI baseline.

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env.local
uvicorn app.main:app --reload --port 8000
```

`requirements.in` is the human-edited dependency input; `requirements.txt` is the fully pinned generated lock used by CI and Docker builds.

For the root Compose stack, `ai-service/.env.docker` uses the internal Ollama service and shared upload volume.

## Runtime modes

- `auto`: prefer the available configured local runtime and use an enabled cloud fallback when appropriate.
- `cloud`: use an OpenAI-compatible provider such as OpenRouter; intended for deployments without Ollama.
- `test`: deterministic test runtime selected automatically by `scripts/run_tests.py` unless explicitly overridden.

The committed `.env.example` is a cloud-deployment template. Replace all placeholder credentials. The committed `.env.docker` is the local Compose template.

Key inputs:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | asyncpg PostgreSQL URL |
| `AI_SERVICE_SHARED_SECRET` | backend-to-AI internal token |
| `AI_RUNTIME_MODE` | `auto`, `cloud`, or `test` |
| `OLLAMA_BASE_URL` | local/container Ollama endpoint |
| `OLLAMA_TEXT_MODEL` | tutor/generation model |
| `OLLAMA_VISION_MODEL` | document/vision model |
| `OLLAMA_EMBED_MODEL` | retrieval embedding model |
| `AI_CLOUD_FALLBACK_ENABLED` | enables OpenAI-compatible fallback |
| `AI_CLOUD_FALLBACK_BASE_URL` | provider API root |
| `AI_CLOUD_FALLBACK_API_KEY` | provider credential |
| `BACKEND_INTERNAL_URL` | protected upload fetch and callbacks |
| `UPLOAD_DIR` | shared local upload path |
| `AI_TUTOR_MAX_INFLIGHT` | tutor concurrency bound |
| `AI_TEACHER_BG_MAX_CONCURRENCY` | teacher generation concurrency bound |

Backend and AI service must use the same `AI_SERVICE_SHARED_SECRET`. Never expose it through `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*` variables.

## Health and readiness

- `GET /live`: process liveness only.
- `GET /health`: dependency/runtime detail.
- `GET /ready`: actual traffic readiness, including database, AI/embedding runtime, and upload materialization.
- `GET /metrics`: Prometheus metrics.

Use `/ready` for orchestration. A live process can still be unable to serve AI traffic safely.

## Main endpoint groups

- Tutor/chat and student practice flows.
- Extraction preparation, polling, review, apply, retry, and cancellation.
- Protected internal extraction and teacher-generation execution routes.
- Retrieval/indexing and content-source status.
- Quiz, lesson-plan, remedial, and intervention generation.
- Health, readiness, and metrics.

The exact route contract is defined by FastAPI and the matching Nest proxy/controller tests. Preserve the `success/message/data` envelope expected by backend consumers.

## Verification

```bash
.venv/bin/python scripts/run_tests.py
uv pip check --python .venv/bin/python
AI_RUNTIME_MODE=test .venv/bin/python -c "from app.main import app; print(app.title)"
```

Use `python3 scripts/run_eval_suite.py` only when model/prompt behavior changes. Route, header, shared-secret, and envelope changes require matching backend proxy verification.

## Safety boundaries

- NestJS owns public auth, RBAC, audit policy, and official academic state.
- AI-generated content remains draft/reviewable until an authorized backend workflow applies it.
- Apply/reindex behavior must stay compatible with extraction state and retrieval indexing.
- Long-running work must remain bounded and restart-safe.

See `AGENTS.md` for change rules and the root README for Docker startup.
