# AI Service Slice

Scope: `ai-service/` only.

## Rule IDs In Play

- `AI-1`, `AI-2`, `AI-3`
- `RESP-1`, `SEC-1`, `ERR-1`
- Often coupled with backend `ARCH-*`, `AUTH-*`, and `AUD-1`

## Entrypoints

- Install: `pip install -r requirements.txt`
- Dev server: `uvicorn app.main:app --reload --port 8000`
- Tests: `python scripts/run_tests.py`
- Eval suite: `python scripts/run_eval_suite.py`
- App entry: `app/main.py`
- Config: `app/config.py`
- Schemas: `app/schemas.py`
- Compose service/port: internal-only `ai-service:8000`

## Owning Paths

- `app/main.py`: stable ASGI entrypoint, shared lifecycle, most legacy routes, and readiness endpoints
- `app/routers/*`: extracted route owners; queue-bound extraction routes live in `app/routers/extractions.py`
- `app/config.py`: env-backed settings, URLs, models, timeouts, secrets
- `app/ollama_client.py`: model/task routing
- `app/mentor_service.py`, `app/student_tutor_service.py`: tutoring flows
- `app/quiz_generation_service.py`, `app/remedial_service.py`: teacher AI generation flows
- `app/retrieval_service.py`, `app/indexing_pipeline.py`, `app/embedding_provider.py`: retrieval/indexing
- `app/extraction_job_service.py`: pending/failure/cancellation extraction state transitions
- `app/extraction_pipeline.py` and related helpers: extraction execution
- `app/async_utils.py`: managed off-loop work and shutdown-safe executor ownership

## Working Rules

- This service is internal and not a public auth authority.
- Respect `AI-1`: do not add writes that mutate grades, enrollment, or official academic state.
- Respect `AI-2`: keep long-running generation or extraction work compatible with queued backend orchestration.
- Respect `AI-3`: AI logs and AI-generated state stay separate from official academic records.
- Respect `RESP-1`: preserve the backend-compatible envelope.
- Header contract with backend proxy is part of the API: `X-User-Id`, `X-User-Email`, `X-User-Roles`, optional `X-Internal-Service-Token`.
- Use Serena first for symbol-aware service, route, and reference discovery before broad file reads.
- `requirements.in` is the dependency input and `requirements.txt` is the generated, fully pinned runtime lock.

## Change Workflow

1. Start in the owning service module.
2. Wire route or schema changes through the owning `app/routers/*` module (or `app/main.py` for an unextracted route) and `app/schemas.py`.
3. Keep backend proxy compatibility first: paths, headers, timeouts, and envelope shape.
4. If DB reads or writes change, verify the backend schema contract before assuming new tables or columns exist.
5. Keep task-specific model routing in `app/ollama_client.py`, not scattered across handlers.

## Do Not Break

- Nest backend owns auth, RBAC, and forwarded-header policy.
- Extraction apply flows and AI content generation must stay compatible with retrieval reindexing.
- Shared-secret validation must stay compatible with `backend/src/modules/ai-mentor/ai-proxy.service.ts`.
- `next-frontend` and `mobile` reach AI through backend routes, not directly.
- Keep `/live` process-only and `/ready` dependency-aware so Compose and backend health checks preserve their current meaning.
- Extraction preparation must not schedule untracked `asyncio.create_task` work; NestJS BullMQ owns execution/retry/cancellation.
- Keep `app.main:app` as the stable ASGI import even when extracting routers.

## Verification

- Run `python scripts/run_tests.py` as the default verification entrypoint.
- Use `python scripts/run_eval_suite.py` when prompt or model behavior changes warrant a deeper AI-specific pass.
- At minimum verify the import/start path with `uvicorn app.main:app --reload --port 8000`.
- Recheck env usage after `app/config.py` changes.
- Verify backend proxy compatibility whenever an endpoint path, header, or envelope field changes.
