# AI Service Slice

Scope: `ai-service/` only.

## Rule IDs In Play

- `AI-1`, `AI-2`, `AI-3`
- `RESP-1`, `SEC-1`, `ERR-1`
- Often coupled with backend `ARCH-*`, `AUTH-*`, and `AUD-1`

## Entrypoints

- Install: `pip install -r requirements.txt`
- Dev server: `uvicorn app.main:app --reload --port 8000`
- Tests: `python -m unittest ai-service.tests.test_student_tutor_service`
- App entry: `app/main.py`
- Config: `app/config.py`
- Schemas: `app/schemas.py`

## Owning Paths

- `app/main.py`: FastAPI routes and readiness endpoints
- `app/config.py`: env-backed settings, URLs, models, timeouts, secrets
- `app/ollama_client.py`: model/task routing
- `app/mentor_service.py`, `app/student_tutor_service.py`: tutoring flows
- `app/quiz_generation_service.py`, `app/remedial_service.py`: teacher AI generation flows
- `app/retrieval_service.py`, `app/indexing_pipeline.py`, `app/embedding_provider.py`: retrieval/indexing
- `app/extraction_pipeline.py` and related helpers: extraction flow

## Working Rules

- This service is internal and not a public auth authority.
- Respect `AI-1`: do not add writes that mutate grades, enrollment, or official academic state.
- Respect `AI-2`: keep long-running generation or extraction work compatible with queued backend orchestration.
- Respect `AI-3`: AI logs and AI-generated state stay separate from official academic records.
- Respect `RESP-1`: preserve the backend-compatible envelope.
- Header contract with backend proxy is part of the API: `X-User-Id`, `X-User-Email`, `X-User-Roles`, optional `X-Internal-Service-Token`.

## Change Workflow

1. Start in the owning service module.
2. Wire route or schema changes through `app/main.py` and `app/schemas.py`.
3. Keep backend proxy compatibility first: paths, headers, timeouts, and envelope shape.
4. If DB reads or writes change, verify the backend schema contract before assuming new tables or columns exist.
5. Keep task-specific model routing in `app/ollama_client.py`, not scattered across handlers.

## Do Not Break

- Nest backend owns auth, RBAC, and forwarded-header policy.
- Extraction apply flows and AI content generation must stay compatible with retrieval reindexing.
- Shared-secret validation must stay compatible with `backend/src/modules/ai-mentor/ai-proxy.service.ts`.
- `next-frontend` and `test-mobile` reach AI through backend routes, not directly.

## Verification

- Run targeted Python tests in `tests/`.
- At minimum verify the import/start path with `uvicorn app.main:app --reload --port 8000`.
- Recheck env usage after `app/config.py` changes.
- Verify backend proxy compatibility whenever an endpoint path, header, or envelope field changes.
