# AI Mentor and AI Workflow Guide

This document describes the current backend/FastAPI boundary. It replaces the old Ollama-only, echo-endpoint, and one-off migration instructions.

## Architecture

```text
Web / mobile
    │ authenticated /api requests
    ▼
NestJS AiMentorController
    ├── validates JWT, role, DTO, class policy, and ownership
    ├── reads/writes backend-owned workflow and audit state
    ├── enqueues durable teacher/extraction jobs in BullMQ
    └── calls AiProxyService with the internal shared secret
                     │
                     ▼
             FastAPI ai-service
             ├── retrieval/indexing
             ├── tutor, JA practice/review/ask
             ├── extraction and draft generation
             └── Ollama or OpenAI-compatible cloud runtime
```

Public clients never call FastAPI. NestJS remains responsible for auth, RBAC, official academic state, audit policy, queue ownership, and response contracts. FastAPI is an internal assistive execution engine.

## Current capabilities

- student tutor bootstrap, sessions, messages, and answer feedback
- JA hub, practice, review, and ask flows
- mentor explanations
- module extraction prepare/status/review/apply/retry/cancel
- class and library retrieval indexing
- teacher lesson-plan, quiz, and intervention draft jobs
- per-class AI policy
- admin analytics chat/history
- health and model readiness
- audit-safe job polling and results

The live backend exposed 59 `/api/ai` routes and FastAPI exposed 57 internal paths on July 18, 2026. Use the [exact route catalog](../docs/system-audit/2026-07-18-live-stack-and-route-inventory.md) instead of copying old endpoint tables.

## Runtime model

The local Compose stack uses:

| Component | Current default |
| --- | --- |
| Text model | `qwen2.5:3b` |
| Vision model | `gemma3:4b` |
| Embedding model | `nomic-embed-text` |
| FastAPI URL from backend | `http://ai-service:8000` |
| Ollama URL in containers | `http://ollama:11434` |
| Public API | NestJS `http://localhost:3000/api/ai/*` |
| FastAPI host publication | none in core Compose |

FastAPI supports `auto`, `cloud`, and `test` runtime modes. OpenAI-compatible cloud fallback is configured with `AI_CLOUD_FALLBACK_*` / OpenRouter-compatible variables. Local Compose is currently Ollama-backed; deployment mode must be verified from deployment environment rather than inferred from this guide.

## Start and verify

From the repository root:

```bash
cp .env.compose.example .env
# Replace every CHANGE_ME value.
docker compose up -d
docker compose ps backend ai-service ollama postgres redis
docker compose logs --tail=100 backend ai-service ollama
curl --fail http://localhost:3000/api/health/ready
```

Check FastAPI from inside its network boundary:

```bash
docker compose exec -T ai-service python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/ready').read().decode())"
```

The backend health endpoints are public. AI feature endpoints generally require a valid Nexora access token and appropriate role/ownership.

## Environment

The two services must share exactly the same `AI_SERVICE_SHARED_SECRET`. Never expose it through browser or Expo public variables.

Backend inputs:

- `AI_SERVICE_URL`
- `AI_SERVICE_SHARED_SECRET`
- `AI_DEGRADED_ALLOWED`
- per-flow `AI_SERVICE_TIMEOUT_*` budgets
- `REDIS_URL`
- `OLLAMA_BASE_URL` and model names for health/reporting compatibility

FastAPI inputs:

- `DATABASE_URL`
- `AI_SERVICE_SHARED_SECRET`
- `BACKEND_INTERNAL_URL`
- `AI_RUNTIME_MODE`
- `OLLAMA_BASE_URL` and `OLLAMA_*_MODEL`
- `AI_CLOUD_FALLBACK_*` when cloud fallback is enabled
- `UPLOAD_DIR`
- concurrency and retrieval timeout limits

Root Compose reads root `.env` and then applies service defaults from `backend/.env.docker` and `ai-service/.env.docker`.

## Durable job flow

Teacher generation and extraction work runs through the backend-owned `ai-teacher-generation` queue at worker concurrency 2.

Supported job names:

- `lesson-plan-generation`
- `quiz-generation`
- `intervention-recommendation-generation`
- `module-extraction`

Lifecycle:

1. A public NestJS route authenticates and validates the request.
2. Backend creates durable workflow state and enqueues the BullMQ job.
3. The NestJS worker claims the job and calls a protected internal FastAPI execution route.
4. FastAPI performs the bounded model/retrieval work and updates allowed workflow state.
5. Backend exposes job status/result, preview/apply, retry, or cancellation through authorized public routes.
6. Authorized review/apply flows decide whether generated drafts become backend-owned content.

Do not move execution to an untracked FastAPI `asyncio.create_task` or a detached Nest promise. Restart safety, retry/backoff, cancellation, audit metadata, and concurrency depend on BullMQ.

Other AI-related queues include `rag-indexing` and `library-indexing`. Performance recomputation remains a separate backend queue.

## Extraction flow

The active public flow is not the old synchronous “upload a PDF and immediately return lessons” design.

1. Upload/create the source through backend file/module flows.
2. Call `POST /api/ai/extract-module`.
3. Poll `GET /api/ai/extractions/:id/status` or fetch the extraction.
4. Review/edit the draft.
5. Preview the apply operation.
6. Apply through the authorized backend route.
7. Reindex affected retrieval content.
8. Retry or cancel through explicit routes when needed.

The backend and FastAPI share the upload volume in local Compose. FastAPI can also fetch protected material through `BACKEND_INTERNAL_URL`. Never expose raw upload paths publicly.

## Student learning flow

Tutor/JA routes are backend-authorized and use real lesson, assessment, performance, and retrieval context as allowed by the workflow. Generated explanations and practice are assistive:

- they do not modify official class-record scores
- they do not grant enrollment or roles
- they do not activate official interventions without backend teacher/admin policy
- interaction logs remain distinct from official academic records

LXP eligibility is based on backend performance rules and recomputation, not a single hard-coded score in the AI service.

## Teacher generation flow

Lesson-plan, quiz, and intervention jobs create reviewable drafts. Teachers use job status/result routes, may patch drafts, preview application, then apply through an authorized backend workflow. Queue retries must remain idempotent and cancellation-aware.

`POST /api/ai/teacher/quizzes/generate-draft` also exists, but new work must preserve the durable job contracts used by production flows rather than adding another detached long-running path.

## Persistence

Key backend schema tables in `src/drizzle/schema/ai-mentor.schema.ts` are:

- `ai_interaction_logs`
- `extracted_modules`

Additional AI, retrieval, job, policy, practice, and intervention state is spread across the relevant schema modules. The authoritative schema is `backend/src/drizzle/schema/`; do not resurrect removed migration names such as `0032_add_ai_mentor_module.sql`.

All active database changes are in the four current journaled migrations. Apply them with:

```bash
npm --prefix backend run check:migrations
node backend/run-migrations.js
```

## Important code

Backend:

| Path | Responsibility |
| --- | --- |
| `src/modules/ai-mentor/ai-mentor.controller.ts` | Public authenticated AI API |
| `src/modules/ai-mentor/ai-proxy.service.ts` | Shared-secret FastAPI client and contract boundary |
| `src/modules/ai-mentor/ai-generation-queue.service.ts` | Job creation/retry/cancel state |
| `src/modules/ai-mentor/processors/ai-generation.processor.ts` | BullMQ worker |
| `src/modules/ai-mentor/admin-analytics-chat.service.ts` | Backend-grounded admin analytics chat |
| `src/drizzle/schema/ai-mentor.schema.ts` | Interaction and extraction schema |

FastAPI:

| Path | Responsibility |
| --- | --- |
| `app/main.py` | Stable ASGI app, lifecycle, health, readiness |
| `app/routers/extractions.py` | Extraction routes |
| `app/extraction_job_service.py` | Extraction state transitions |
| `app/extraction_pipeline.py` | Extraction execution |
| `app/retrieval_service.py` | Retrieval |
| `app/indexing_pipeline.py` | Index construction |
| `app/embedding_provider.py` | Embeddings |
| `app/ollama_client.py` | Local model client |
| `app/cloud_fallback.py` | OpenAI-compatible fallback |
| `app/schemas.py` | Internal request/response models |

## Verification

Backend contract and queue changes:

```bash
cd backend
npm run lint
npm run build
npm run test -- --runInBand
```

Targeted specs are colocated under `src/modules/ai-mentor/*.spec.ts` and `processors/*.spec.ts`.

FastAPI changes:

```bash
cd ai-service
.venv/bin/python scripts/run_tests.py
AI_RUNTIME_MODE=test .venv/bin/python -c "from app.main import app; print(app.title)"
```

Prompt/model changes also require:

```bash
python3 scripts/run_eval_suite.py
```

After queue, shared-secret, route, header, or response-envelope changes, verify both services and one real client consumer. Backend and FastAPI paths are a single contract boundary.

## Troubleshooting

### Backend ready check reports AI failure

```bash
docker compose logs --tail=100 backend ai-service ollama
docker compose exec -T ai-service python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/ready').read().decode())"
```

Check model materialization, database access, upload storage, embedding runtime, and `AI_SERVICE_URL`.

### Public AI route returns unauthorized/forbidden

Authenticate through NestJS and use the correct role, ownership, class policy, and LXP/assessment context. Do not call FastAPI directly to bypass the backend guard.

### Internal request is rejected

Verify shared-secret equality without printing the value. Confirm the request targets the internal route and that the backend/FastAPI schemas still match.

### Job remains queued or retries

```bash
docker compose logs --tail=200 backend redis ai-service
docker compose exec -T redis redis-cli --scan --pattern 'bull:*:meta'
```

Inspect the job state, worker log, FastAPI readiness, retry reason, and idempotency. Do not delete Redis state until you understand the job and environment.

### Ollama is slow or clamps context

The current local text model reports a 2048 trained context while runtime configuration requests 8192, so Ollama clamps it. Treat this as a model/context policy decision; do not hide the warning by only increasing a timeout.

### Production behavior differs

Confirm `AI_RUNTIME_MODE` and cloud-fallback variables in the deployed environment. The checked local stack is Ollama-backed; this document does not claim a specific external deployment provider.
