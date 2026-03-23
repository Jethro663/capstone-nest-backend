# AI Service Agent Guide

## Purpose
- Scope: `ai-service/` only.
- Stack: FastAPI, SQLAlchemy async, asyncpg, Pydantic, Ollama-backed generation/retrieval.
- Role: internal AI microservice behind Nest proxy; not a public auth authority.

## Entrypoints / run commands
- Install: `pip install -r requirements.txt`
- Dev server: `uvicorn app.main:app --reload --port 8000`
- Tests: `python -m unittest ai-service.tests.test_student_tutor_service`
- App entry: `app/main.py`
- Config: `app/config.py`
- Models/DTOs: `app/schemas.py`

## Architecture / folder map
- `app/main.py`: FastAPI routes, readiness, extraction flow, teacher AI jobs, chat endpoints.
- `app/config.py`: env-backed settings; source of truth for URLs, models, timeouts, secrets.
- `app/ollama_client.py`: model/task routing, availability checks, generation calls.
- `app/mentor_service.py`: grounded explain flows.
- `app/student_tutor_service.py`: tutor bootstrap/session/question/evaluation logic.
- `app/quiz_generation_service.py`: teacher quiz draft generation.
- `app/remedial_service.py`: intervention recommendation generation.
- `app/retrieval_service.py`, `app/indexing_pipeline.py`, `app/embedding_provider.py`: retrieval/indexing layer.
- `app/extraction_pipeline.py`, `app/rule_based_extractor.py`, `app/pdf_chunker.py`, `app/media_utils.py`, `app/content_sanitizer.py`: extraction/content handling.
- `app/database.py`: async session wiring.
- `tests/*`: current Python tests.

## Change workflow
- Start at the owning service module, then wire route/schema changes through `app/main.py` and `app/schemas.py`.
- Keep Nest proxy compatibility first: request/response shape, forwarded headers, timeout expectations.
- If a feature needs DB reads/writes, verify table/column contracts already exist in backend schema/migrations.
- For new generation flows, decide whether they belong in chat, tutor, quiz, remedial, retrieval, or extraction path before adding files.

## Patterns to follow
- Auth context comes from forwarded headers: `X-User-Id`, `X-User-Email`, `X-User-Roles`.
- Optional shared-secret gate uses `X-Internal-Service-Token`.
- Return envelope shape compatible with backend proxy consumers: `success`, `message`, `data`.
- Prefer async DB access through injected `AsyncSession`.
- Route schemas live in `app/schemas.py`; avoid ad hoc request parsing in handlers.
- Task-specific model selection stays in `ollama_client.py`; do not hardcode model choice in route handlers.
- Reindex class content after extraction apply or teacher AI content generation when current flows already do so.

## Do not break / invariants
- This service does not mint JWTs, own sessions, or replace Nest auth/RBAC.
- AI is guidance-only: no direct answers for assessment cheating paths, no unofficial record mutation.
- Official grades, enrollments, class records, and intervention state remain backend-governed.
- Extraction apply flow creates lesson content then refreshes retrieval index.
- Header contract with backend proxy must remain intact.
- Shared secret validation must stay compatible with backend `AiProxyService`.
- If degraded mode is enabled, readiness and fallback behavior must still be coherent.

## Where to add or modify code
- Route surface or response envelope: `app/main.py` and `app/schemas.py`.
- Chat / mistake explanations: `app/mentor_service.py`.
- Student tutor session logic: `app/student_tutor_service.py`.
- Teacher quiz draft generation: `app/quiz_generation_service.py`.
- Intervention recommendations: `app/remedial_service.py`.
- Retrieval/indexing behavior: `app/retrieval_service.py`, `app/indexing_pipeline.py`, `app/embedding_provider.py`.
- Extraction and document parsing: `app/extraction_pipeline.py`, `app/rule_based_extractor.py`, `app/pdf_chunker.py`, `app/media_utils.py`.
- Model routing/timeouts: `app/ollama_client.py`, `app/config.py`.

## Validation / tests
- Run targeted Python tests in `tests/`.
- At minimum verify server import/start path after route/schema changes: `uvicorn app.main:app --reload --port 8000`.
- Re-check env usage when changing `app/config.py`.
- Verify backend proxy compatibility for any changed endpoint path, header assumption, or envelope field.

## Cross-service touchpoints
- Backend `src/modules/ai-mentor/ai-proxy.service.ts` forwards user context and shared secret.
- Backend DB schema is the real contract for tables touched here; this repo folder does not define migrations.
- Backend upload directory is shared via `UPLOAD_DIR`, default `../backend/uploads`.
- `test-mobile` and `next-frontend` reach AI capabilities through backend routes, not directly.
