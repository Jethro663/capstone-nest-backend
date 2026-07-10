# Nexora LMS/LXP - Architecture Elevation Plan (7.5/10 -> 9/10)

## Executive Summary & Prioritization
- Nexora already has one production-oriented reference path for long-running AI work: teacher lesson-plan generation now uses backend-owned BullMQ orchestration in `backend/src/modules/ai-mentor/` with durable job persistence in `backend/src/drizzle/schema/rag.schema.ts` and internal execution in `ai-service/app/main.py`.
- The main readiness gap is inconsistency: quizzes and intervention recommendations still run from in-process `asyncio.create_task(...)` inside `ai-service/app/main.py`, local-disk uploads are still spread across multiple controllers, refresh-token race protection is process-local in backend and partially deduped in clients, and operational checks are good but not yet fully deployment-chaos-oriented.
- Phase 1 should raise the score fastest by extending the lesson-plan hardening model to all teacher AI job paths, adding reproducible load testing, and moving file persistence to an object-storage abstraction. Phase 2 should then make refresh behavior multi-tab / multi-device safe and strengthen operational fail-fast and restart recovery.
- **Phase 1 (Fast-Track Priority: Workstreams 1, 2, 3)**: Harden all AI job paths, add classroom-burst load testing, migrate file storage to object storage.
- **Phase 2 (Workstreams 4, 5)**: Race-proof auth/session rotation, strengthen deployment-grade startup/readiness/chaos checks.

## User Review Required & Breaking Changes
> [!IMPORTANT]
> Breaking or contract-sensitive changes that need explicit review before implementation:
> - Add new object-storage environment variables across `backend/.env.example`, `ai-service/.env.example`, and root deployment docs/config. Proposed additions: `STORAGE_PROVIDER`, `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_PUBLIC_BASE_URL`, `STORAGE_SIGNED_URL_TTL_S`.
> - Drizzle schema changes are likely required for object storage and AI-job hardening metadata. The minimum likely targets are `backend/src/drizzle/schema/rag.schema.ts` (`aiGenerationJobs`, `aiGenerationOutputs`) and one or more file-bearing tables that currently store local paths. These must ship with a migration in `backend/drizzle/`.
> - `DELETE /api/ai/teacher/jobs/:jobId` semantics should be standardized across lesson plans, quizzes, and interventions so clients can distinguish `cancelled-before-execution`, `cancellation-requested`, and `already-completed` states.
> - If direct-to-object-storage uploads are introduced, frontend and mobile upload flows will change from pure multipart backend uploads to either pre-signed upload flows or backend-brokered pre-signed handshakes.

> [!WARNING]
> Operational risks to plan for:
> - File migration from local disk to object storage can create temporary download gaps unless a dual-read migration window is implemented.
> - Queue migration for quizzes and interventions can strand in-flight `AI_JOB_TASKS` work if rollout is done while ai-service background tasks are still active.
> - Readiness may become intentionally stricter; environments that currently boot with weak or missing config may start failing fast.
> - Load testing against shared developer databases or Redis instances can distort results and interfere with ongoing work unless isolated staging resources are used.

## Current State Analysis & Verified File Pointers
Document exact file paths, class names, functions, and database tables currently governing these flows (verified via codebase exploration):
- **Lesson Plan Queue Reference**:
  - `backend/src/modules/ai-mentor/ai-mentor.module.ts`: `AiMentorModule` registers BullMQ queue `ai-teacher-generation`.
  - `backend/src/modules/ai-mentor/ai-generation-queue.service.ts`: `AiGenerationQueueService.enqueueLessonPlanJob()` adds BullMQ job `lesson-plan-generation` with deterministic `jobId: lesson-plan:${jobId}`, `attempts: 3`, exponential backoff, `removeOnComplete: 100`, `removeOnFail: 200`; `cancelQueuedLessonPlanJob()` removes `waiting` / `delayed` / `prioritized` jobs.
  - `backend/src/modules/ai-mentor/processors/ai-generation.processor.ts`: `AiGenerationProcessor` is `@Processor('ai-teacher-generation', { concurrency: 2 })` and calls `AiProxyService.runInternalLessonPlanJob()`.
  - `backend/src/modules/ai-mentor/ai-proxy.service.ts`: `runInternalLessonPlanJob(jobId, meta)` posts to `/internal/teacher/lesson-plans/jobs/{jobId}/run` with a hard 300000 ms timeout and `X-Internal-Service-Token` when configured.
  - `ai-service/app/main.py`: `queue_teacher_lesson_plan_job()` only creates the DB job row; `run_teacher_lesson_plan_job()` is the internal worker route guarded by `require_internal_service` and stale-processing retry logic.
- **Target AI Workflows to Harden**:
  - `ai-service/app/main.py`: `queue_teacher_quiz_draft_job()` still schedules `_run_quiz_generation_job(...)` with `asyncio.create_task(...)` and `_TEACHER_BG_SEMAPHORE`.
  - `ai-service/app/main.py`: `queue_intervention_recommendation_job()` still schedules `_run_intervention_generation_job(...)` with `asyncio.create_task(...)` and `_TEACHER_BG_SEMAPHORE`.
  - `backend/src/modules/ai-mentor/ai-mentor.controller.ts`: currently proxies `POST /teacher/interventions/:caseId/jobs`, `POST /teacher/quizzes/jobs`, `POST /teacher/lesson-plans/jobs`, `DELETE /teacher/jobs/:jobId`, `POST /teacher/quizzes/jobs/:jobId/retry`, and `POST /teacher/quizzes/jobs/:jobId/cancel`.
  - `backend/src/drizzle/schema/rag.schema.ts`: `aiGenerationJobs` and `aiGenerationOutputs` are the existing persistent job/output tables.
  - `next-frontend/src/services/ai-service.ts`: current web consumer for create/status/result/delete/update flows.
  - `mobile/src/api/services/ai.ts`: current mobile consumer for quiz/intervention job create/status/result/delete and teacher AI policy reads/writes.
- **File Storage Implementations**:
  - `backend/src/modules/file-upload/file-upload.controller.ts`: uses `diskStorage(...)`, writes `filePath` as `${UPLOAD_DEST}/${filename}`, and serves downloads with `sendFile(...)`.
  - `backend/src/modules/file-upload/internal-uploads.controller.ts`: internal raw upload fetch endpoint rooted at `UPLOAD_ROOT`.
  - `backend/src/modules/file-upload/file-upload.service.ts`: saves file metadata and enforces access rules.
  - `backend/src/modules/file-upload/constants/file-upload.constants.ts`: `UPLOAD_ROOT` and `UPLOAD_DEST` constants.
  - Additional direct-disk upload/download surfaces verified in:
    - `backend/src/modules/assessments/assessments.controller.ts`
    - `backend/src/modules/classes/classes.controller.ts`
    - `backend/src/modules/class-templates/class-templates.controller.ts`
    - `backend/src/modules/content-modules/content-modules.controller.ts`
    - `backend/src/modules/discussion-board/discussion-board.controller.ts`
    - `backend/src/modules/profiles/profiles.controller.ts`
    - `backend/src/modules/sections/sections.controller.ts`
    - `backend/src/modules/teacher-profiles/teacher-profiles.controller.ts`
  - Web file consumers verified in `next-frontend/src/services/file-service.ts`, `next-frontend/src/services/module-service.ts`, and `next-frontend/src/services/assessment-service.ts`.
- **Auth & Refresh Token Rotation**:
  - `backend/src/modules/auth/token.service.ts`: `TokenService.validateAndRotate()` uses DB-backed opaque refresh tokens plus in-process `rotationGraceCache` (45-second cache).
  - `backend/src/modules/auth/auth.service.ts`: `refreshToken()` delegates to `TokenService.validateAndRotate()`; `logout()` revokes one token.
  - `backend/src/modules/auth/auth.controller.ts`: web refresh (`POST /auth/refresh`), mobile refresh (`POST /auth/mobile/refresh`), logout, mobile logout, and logout-all.
  - `backend/src/drizzle/schema/refresh-tokens.schema.ts`: authoritative `refresh_tokens` table.
  - `next-frontend/src/lib/api-client.ts`: request bootstrap and response refresh dedupe via `refreshPromise`; redirects to `/login` on session expiry.
  - `next-frontend/src/lib/session-refresh.ts`: low-level refresh request to `/api/auth/refresh`.
  - `next-frontend/src/providers/AuthProvider.tsx`: bootstraps current user after refresh and tracks auth state.
  - `mobile/src/api/client.ts`: request/response interceptors, `refreshPromise`, and `refreshSession()` for `/auth/mobile/refresh`.
  - `mobile/src/providers/AuthProvider.tsx`: bootstraps session snapshot and refreshes user state.
  - `mobile/src/api/storage.ts`: secure token persistence via `expo-secure-store` plus AsyncStorage fallback.
  - `mobile/src/navigation/AppNavigator.tsx`: auth gating point.
- **Health & Config Validation**:
  - `backend/src/app.module.ts`: global `ConfigModule.forRoot(...)`, BullMQ root defaults, and module wiring.
  - `backend/src/config/database.config.ts`: DB pool env config (`DB_POOL_MAX`, `DB_IDLE_TIMEOUT_MS`, `DB_CONNECT_TIMEOUT_MS`, `DB_STATEMENT_TIMEOUT_MS`).
  - `backend/src/database/database.service.ts`: `pg.Pool` initialization and `ping()` health method.
  - `backend/src/modules/health/health.service.ts`: active DB/Redis/AI readiness checks, 15-second cache, dependency aggregation.
  - `backend/src/modules/health/health.controller.ts`: `/health/live`, `/health`, `/health/ready`.
  - `ai-service/app/config.py`: Pydantic settings, DB pool sizing, AI concurrency, and `validate_internal_secret()` fail-fast behavior.
  - `ai-service/app/main.py`: AI health and `/ready` endpoints.
  - `docker-compose.yml`: container healthchecks for Postgres, Redis, Ollama, backend, ai-service, frontend, Prometheus, and monitoring stack.
  - `monitoring/`: verified existing Prometheus, Loki, Tempo, Grafana dashboards, and alert provisioning files.

## Proposed Refactoring & File-by-File Changes
Group files logically by Workstream. For every file, specify exact line ranges or symbols to modify, add, or delete:

### Workstream 1: Harden All AI Job Paths [PRIORITY 1]
#### [MODIFY] `backend/src/modules/ai-mentor/ai-generation-queue.service.ts`
- **Exact Changes**: Generalize `enqueueLessonPlanJob()` into a queue service that supports at least three BullMQ job names backed by the existing `ai-teacher-generation` queue:
  - `lesson-plan-generation`
  - `quiz-generation`
  - `intervention-recommendation-generation`
- Add sibling methods:
  - `enqueueQuizJob(jobId: string, userId: string): Promise<void>`
  - `enqueueInterventionJob(jobId: string, userId: string): Promise<void>`
  - `cancelQueuedTeacherAiJob(kind: 'lesson-plan' | 'quiz' | 'intervention', jobId: string): Promise<boolean>`
- Use deterministic BullMQ ids:
  - `lesson-plan:${jobId}`
  - `quiz:${jobId}`
  - `intervention:${jobId}`
- Keep job options consistent with the lesson-plan reference, but make them shared constants in this file so attempts/backoff/removal settings do not drift.
- Add explicit queue-age timestamps in job payload metadata for observability and cancellation diagnostics.

#### [MODIFY] `backend/src/modules/ai-mentor/processors/ai-generation.processor.ts`
- **Exact Changes**: Replace the single-name guard with a dispatcher on `job.name`.
- Add internal branches that call new `AiProxyService` methods:
  - `runInternalQuizJob(jobId, meta)`
  - `runInternalInterventionJob(jobId, meta)`
- Preserve the current lesson-plan path exactly as the reference behavior.
- Keep `@Processor('ai-teacher-generation', { concurrency: 2 })` initially, but move concurrency to a named constant so staged tuning can be reviewed in one place.
- Add log fields for `job.name`, `job.id`, `attempt`, and queue wait age; continue avoiding prompt/user-content logging.

#### [MODIFY] `backend/src/modules/ai-mentor/ai-proxy.service.ts`
- **Exact Changes**:
  - Extract internal worker fetch into one reusable helper, e.g. `runInternalTeacherJob(path: string, meta, timeoutMs)`.
  - Keep lesson-plan timeout at 300000 ms.
  - Add dedicated internal timeouts for quizzes and interventions using explicit config values, not the generic path-based `forward()` timeout logic.
  - New env-backed settings to read here and document in `backend/.env.example`:
    - `AI_SERVICE_TIMEOUT_LESSON_PLAN_MS`
    - `AI_SERVICE_TIMEOUT_INTERNAL_QUIZ_MS`
    - `AI_SERVICE_TIMEOUT_INTERNAL_INTERVENTION_MS`

#### [MODIFY] `backend/src/modules/ai-mentor/ai-mentor.controller.ts`
- **Exact Changes**:
  - Mirror the lesson-plan enqueue behavior for `POST /teacher/quizzes/jobs` and `POST /teacher/interventions/:caseId/jobs`: create durable AI job through ai-service first, then enqueue backend-owned BullMQ execution.
  - Standardize `DELETE /teacher/jobs/:jobId` so it first attempts queue removal for any queue-owned teacher AI job and then falls back to downstream delete when already running.
  - Keep current envelope shape (`success/message/data`), but extend `data.statusMessage` vocabulary to support queue-aware cancellation and retry states consistently for all AI job types.
  - Add audit-log metadata that records queue-owned execution kind without logging prompts.

#### [MODIFY] `backend/src/modules/ai-mentor/ai-mentor.module.ts`
- **Exact Changes**: keep the single `ai-teacher-generation` queue registration, but update module comments and provider wiring to reflect that quizzes and interventions now also run through the same backend-owned queue.
- **Execution Note**: During Workstream 2, explicitly measure queue wait time by job type. If slow lesson-plan jobs create head-of-line blocking for quiz drafts or intervention jobs, add BullMQ priorities or split the queue into separate concurrency pools only after the load data proves it is necessary.

#### [MODIFY] `ai-service/app/main.py`
- **Exact Changes**:
  - Stop using `asyncio.create_task(...)` for `queue_teacher_quiz_draft_job()` and `queue_intervention_recommendation_job()`.
  - Add internal worker entrypoints that match the lesson-plan pattern:
    - `POST /internal/teacher/quizzes/jobs/{job_id}/run`
    - `POST /internal/teacher/interventions/jobs/{job_id}/run`
  - Guard both with `require_internal_service`.
  - Reconstruct request bodies from `ai_generation_jobs.source_filters`, just as lesson plans already do.
  - Apply the same stale-processing retry override contract already used in `run_teacher_lesson_plan_job()`:
    - re-entry allowed only when `attempt > 1`
    - runtime indicates stale `workerStartedAt`
    - terminal paths record `workerFinishedAt`
  - Normalize runtime metadata (`broker`, `attempt`, `workerStartedAt`, `workerFinishedAt`, `bullmqJobId`) across quiz, intervention, and lesson-plan jobs.
  - Keep `AI_JOB_TASKS` only for job types that are still intentionally in-process after this migration; the target state for teacher generation jobs is zero reliance on `AI_JOB_TASKS`.

#### [MODIFY] `backend/src/drizzle/schema/rag.schema.ts`
- **Exact Changes**:
  - Extend `aiGenerationJobs.sourceFilters` and/or add new explicit columns only if current JSON persistence cannot represent queue metadata cleanly.
  - Preferred minimal change: keep queue runtime metadata out of core columns and in runtime/state payloads unless reporting or filtering requirements prove otherwise.
  - If reporting needs queue provenance, add one small explicit column like `broker` or `orchestrator`, then generate a migration in `backend/drizzle/`.

#### [MODIFY] `next-frontend/src/services/ai-service.ts`
- **Exact Changes**:
  - Keep current method names where possible to avoid broad UI churn.
  - If queue-aware cancellation introduces new `statusMessage` / `retryState` variants, update `normalizeJobEnvelope()` and `normalizeJobResultEnvelope()` to tolerate them.
  - Add explicit handling for a `cancellationRequested` or equivalent transitional state if Phase 1 keeps running-job cancellation asynchronous.

#### [MODIFY] `next-frontend/src/types/ai.ts`
- **Exact Changes**: update `AiGenerationJob` and related status/result types to reflect the final queue-state vocabulary produced by backend/ai-service for quizzes, interventions, and lesson plans.

#### [MODIFY] `mobile/src/api/services/ai.ts`
- **Exact Changes**:
  - Update normalized job and result parsing to accept the same queue-state vocabulary as web.
  - Preserve the current method surface (`createQuizDraftJob`, `createInterventionJob`, `getTeacherJobStatus`, `deleteTeacherJob`, `getQuizDraftJobResult`, `getInterventionJobResult`) so mobile consumers remain aligned with the backend contract.

#### [MODIFY] `mobile/src/types/ai.ts`
- **Exact Changes**: keep mobile `AiGenerationJob` and `AiGenerationJobResult` in sync with the backend job contract and the web `next-frontend/src/types/ai.ts` definitions.

#### [MODIFY] Tests
- `backend/src/modules/ai-mentor/ai-mentor.controller.spec.ts`: add queue-ownership cases for quizzes and interventions; verify enqueue-after-create, queue-first cancellation, and downstream fallback.
- `backend/src/modules/ai-mentor/processors/ai-generation.processor.spec.ts`: add dispatch coverage for quiz and intervention job names.
- `ai-service/tests/test_lesson_plan_job_queueing.py`: split or extend into cross-job queueing tests covering all queue-owned teacher AI paths.
- Add new ai-service tests for internal quiz/intervention worker routes, strict header auth, stale-processing retry re-entry, and terminal runtime markers.

### Workstream 2: Concurrency & Load Testing Suite [PRIORITY 2]
#### [NEW] `load-tests/k6/classroom-burst.js`
- **Exact Script Structure**:
  - k6 scenario `student_login_burst`: 30-50 VUs, short ramp, hits login and one protected fetch.
  - k6 scenario `student_assessment_flow`: parallel start/progress/submit calls against assessment endpoints.
  - k6 scenario `teacher_dashboard_polling`: lower VU count, repeated polling of dashboard / notifications / roster-like routes.
  - k6 scenario `teacher_ai_jobs`: 2-5 VUs creating quiz, lesson-plan, and intervention jobs while polling job status.
  - Thresholds to assert:
    - `http_req_failed < 0.02`
    - `p(95)<750` for core auth and class APIs
    - `p(99)<1500` for assessment start/submit
    - `checks{scenario:teacher_ai_jobs} > 0.95`

#### [NEW] `load-tests/k6/config.js`
- **Exact Changes**: centralize base URL, seeded credentials, per-scenario headers, and environment-driven class / assessment IDs.

#### [NEW] `load-tests/k6/flows/auth.js`
- **Exact Changes**: reusable helpers for web-cookie login, mobile login, token extraction, and logout cleanup.

#### [NEW] `load-tests/k6/flows/assessments.js`
- **Exact Changes**: helpers for assessment attempt start/progress/submit using verified backend routes from `backend/src/modules/assessments/assessments.controller.ts`.

#### [NEW] `load-tests/k6/flows/teacher-ai.js`
- **Exact Changes**: helpers that call:
  - `/api/ai/teacher/quizzes/jobs`
  - `/api/ai/teacher/lesson-plans/jobs`
  - `/api/ai/teacher/interventions/{caseId}/jobs`
  - `/api/ai/teacher/jobs/{jobId}`
  - `/api/ai/teacher/jobs/{jobId}/result`

#### [NEW] `load-tests/README.md`
- **Exact Changes**: document required seeded IDs, environment variables, safe staging-only guidance, and result interpretation.

#### [MODIFY] `monitoring/prometheus.yml`
- **Exact Changes**: add or confirm scrape targets and labels for backend, ai-service, Redis exporter (if introduced), and k6 push/pull metrics path if the chosen setup needs it.

#### [MODIFY] `monitoring/grafana/dashboards/nexora-backend.json`
#### [MODIFY] `monitoring/grafana/dashboards/nexora-ai-service.json`
#### [MODIFY] `monitoring/grafana/dashboards/nexora-overview.json`
- **Exact Changes**: add panels for P95/P99 request latency, error-rate spikes, job queue wait time, AI job completion latency, and readiness degradation.

#### [MODIFY] `monitoring/grafana/provisioning/alerting/rules.yml`
- **Exact Changes**: add alerts for queue backlog, repeated AI job failures, readiness flapping, and elevated auth/assessment error rates during load runs.

#### [MODIFY] `backend/src/database/database.service.ts`
- **Exact Changes**: expose lightweight pool diagnostics suitable for logs/metrics during load tests (active, idle, waiting counts) without changing query behavior.

#### [MODIFY] `backend/src/config/database.config.ts`
- **Exact Changes**: document and optionally widen env-backed pool tuning for staged load testing (`DB_POOL_MAX`, `DB_IDLE_TIMEOUT_MS`, `DB_CONNECT_TIMEOUT_MS`, `DB_STATEMENT_TIMEOUT_MS`).

### Workstream 3: Object Storage Migration [PRIORITY 3]
#### [NEW] `backend/src/modules/file-upload/storage/storage.provider.ts`
- **Exact Implementation**: define the abstraction used across library files, assessment attachments, profile images, section/class/template images, discussion uploads, and module attachments.
- **Interface**:
  - `putObject(input): Promise<StoredObjectDescriptor>`
  - `deleteObject(key: string): Promise<void>`
  - `getSignedDownloadUrl(key: string, filename?: string): Promise<string>`
  - `getSignedUploadUrl(input): Promise<SignedUploadDescriptor>`
  - `resolvePublicUrl?(key: string): string | null`

#### [NEW] `backend/src/modules/file-upload/storage/local-storage.provider.ts`
- **Exact Implementation**: wrap existing local-disk behavior so development can keep using `UPLOAD_ROOT` with the new abstraction.

#### [NEW] `backend/src/modules/file-upload/storage/s3-storage.provider.ts`
- **Exact Implementation**: S3/R2-compatible provider using AWS SDK v3, path-key generation, signed upload/download URLs, content-type preservation, and explicit error mapping.

#### [NEW] `backend/src/modules/file-upload/storage/storage.module.ts`
- **Exact Implementation**: provider-selection module keyed by `STORAGE_PROVIDER=local|s3`.

#### [MODIFY] `backend/src/modules/file-upload/file-upload.module.ts`
- **Exact Changes**: import and export the new storage module/provider so file-owning modules can inject one storage interface instead of calling `diskStorage` or `sendFile` directly.

#### [MODIFY] `backend/src/modules/file-upload/file-upload.controller.ts`
- **Exact Changes**:
  - Remove direct dependency on `diskStorage(...)` for library uploads once pre-signed upload flow is ready, or keep backend-stream upload temporarily but persist via the storage provider instead of local path concatenation.
  - Replace `GET /files/:id/download` local `sendFile(...)` path with either:
    - `302` redirect to signed download URL, or
    - backend JSON envelope returning signed URL for the client to fetch.
  - Add a dedicated pre-signed upload handshake endpoint if Phase 1 chooses direct browser uploads.

#### [MODIFY] `backend/src/modules/file-upload/internal-uploads.controller.ts`
- **Exact Changes**: deprecate this controller once ai-service can fetch source files from signed download URLs or backend-brokered object reads. During migration, keep it as a local-storage compatibility path only.

#### [MODIFY] `backend/src/modules/file-upload/file-upload.service.ts`
- **Exact Changes**: stop treating `filePath` as a local absolute/relative disk contract. Introduce neutral storage metadata fields such as `storageKey`, `storageProvider`, and optional `storageBucket` or signed-url indirection.
- **Execution Note**: Preserve backward compatibility for existing rows that only contain local `filePath`. Until a backfill completes, reads and downloads must fall back to local-disk behavior whenever new object-storage metadata is absent or explicitly marked `local`.

#### [MODIFY] `backend/src/modules/file-upload/constants/file-upload.constants.ts`
- **Exact Changes**: keep file-type and size constants, but isolate local-only path constants behind the local-storage provider so other modules stop importing `UPLOAD_ROOT` / `UPLOAD_DEST` directly.

#### [MODIFY] Disk-owning controllers verified during exploration
- `backend/src/modules/assessments/assessments.controller.ts`
- `backend/src/modules/classes/classes.controller.ts`
- `backend/src/modules/class-templates/class-templates.controller.ts`
- `backend/src/modules/content-modules/content-modules.controller.ts`
- `backend/src/modules/discussion-board/discussion-board.controller.ts`
- `backend/src/modules/profiles/profiles.controller.ts`
- `backend/src/modules/sections/sections.controller.ts`
- `backend/src/modules/teacher-profiles/teacher-profiles.controller.ts`
- **Exact Changes**: replace direct `diskStorage(...)` and `sendFile(...)` usage with provider-backed writes and signed download/read flows. Do this incrementally behind a shared helper instead of bespoke per-controller logic.

#### [MODIFY] `backend/src/drizzle/schema/*` and migration files
- **Exact Changes**:
  - Identify every table currently storing local `filePath` / `imageUrl` / attachment path values and normalize them to object-storage-safe metadata.
  - Generate a migration in `backend/drizzle/` to add the minimum columns needed for provider/key metadata while preserving rollback safety.
  - Keep dual-read support during migration: if legacy `filePath` exists and new storage metadata is absent, fall back to local provider until backfill completes.

#### [MODIFY] `next-frontend/src/services/file-service.ts`
- **Exact Changes**: change download behavior to consume signed URLs or backend redirect semantics rather than assuming blob download from a same-origin file-serving endpoint forever.

#### [MODIFY] `next-frontend/src/services/module-service.ts`
#### [MODIFY] `next-frontend/src/services/assessment-service.ts`
- **Exact Changes**: update module attachment and assessment submission download flows to the new signed URL / redirect contract.

#### [MODIFY] `mobile/src/api/services/auth.ts`
#### [MODIFY] `mobile/src/api/services/ai.ts`
#### [MODIFY] mobile file-consuming services under `mobile/src/api/services/`
- **Exact Changes**: where mobile currently expects backend-hosted file bytes, update it to follow signed URLs safely and preserve auth expectations for protected downloads.

#### [MODIFY] `backend/.env.example`
#### [MODIFY] `ai-service/.env.example`
#### [MODIFY] `mobile/.env.example`
#### [MODIFY] `docker-compose.yml`
- **Exact Changes**: document and wire the new storage provider settings. Keep local dev fallback available in compose with `STORAGE_PROVIDER=local` unless an object-store emulator is added.

### Workstream 4: Auth & Session Race-Proofing
#### [MODIFY] `backend/src/modules/auth/token.service.ts`
- **Exact Changes**:
  - Move the current 45-second `rotationGraceCache` logic away from process-local `Map` dependence by adding a database-backed or Redis-backed grace-window strategy.
  - Keep the current atomic revoke-and-insert transaction, but add a short grace record that allows concurrent refreshes from the just-rotated token without forcing global logout on benign races.
  - Preserve hard reuse-attack handling for clearly stale or replayed tokens.

#### [MODIFY] `backend/src/drizzle/schema/refresh-tokens.schema.ts`
- **Exact Changes**: add the minimum metadata needed to represent refresh grace / replacement linkage, for example:
  - `replaced_by_token_hash`
  - `grace_expires_at`
  - `rotated_at`
- Generate a migration in `backend/drizzle/` and keep indexes aligned with the new lookup path.

#### [MODIFY] `backend/src/modules/auth/auth.service.ts`
- **Exact Changes**: keep `refreshToken()` thin, but make it consume the richer rotation result from `TokenService.validateAndRotate()` if the grace model starts returning additional state.

#### [MODIFY] `backend/src/modules/auth/auth.controller.ts`
- **Exact Changes**:
  - Keep route shapes stable (`/auth/refresh`, `/auth/mobile/refresh`).
  - Add explicit response headers or metadata only if needed for client race handling; prefer preserving the current envelope.
  - Review throttling limits relative to multi-tab refocus bursts.

#### [MODIFY] `next-frontend/src/lib/api-client.ts`
- **Exact Changes**:
  - Preserve `refreshPromise`, but harden it against edge cases where bootstrap refresh and 401-triggered refresh overlap.
  - Ensure `bootstrapPromise` and `refreshPromise` cannot clear each other’s successful token.
  - Add one request-level refresh mutex per browser session so parallel protected requests do not stampede refresh.

#### [MODIFY] `next-frontend/src/lib/session-refresh.ts`
- **Exact Changes**: centralize retry/backoff and failure classification for `/api/auth/refresh`; avoid multiple callers creating subtly different refresh behaviors.

#### [MODIFY] `next-frontend/src/providers/AuthProvider.tsx`
- **Exact Changes**: avoid redundant bootstraps across route transitions, preserve authenticated state when a refresh is already in-flight, and ensure `/auth/me` retries do not convert a transient race into a logout loop.

#### [MODIFY] `mobile/src/api/client.ts`
- **Exact Changes**:
  - Keep `refreshPromise`, but make it robust against app-refocus bursts and multiple 401 responses resolving out of order.
  - Prevent an older failed refresh from clearing tokens after a newer successful refresh has already persisted them.
  - Release any shared refresh mutex/promise in a `try/finally` path so temporary network failure or a 500 from `/auth/mobile/refresh` cannot deadlock the mobile client until force restart.

#### [MODIFY] `mobile/src/providers/AuthProvider.tsx`
- **Exact Changes**: make bootstrap, manual refresh, and login/logout flows version-aware so stale async completions cannot overwrite newer session state.

#### [MODIFY] `mobile/src/api/storage.ts`
- **Exact Changes**: keep secure persistence, but add atomic-ish session snapshot writing rules so `accessToken`, `refreshToken`, and serialized session cannot drift during rapid refreshes.

#### [MODIFY] `mobile/src/navigation/AppNavigator.tsx`
- **Exact Changes**: preserve current gating behavior, but ensure short-lived refresh states do not flip the navigator back to auth screens unnecessarily.

### Workstream 5: Deployment-Grade Operational Checks
#### [MODIFY] `backend/src/app.module.ts`
- **Exact Changes**:
  - Add explicit config validation for critical backend env vars instead of loading raw config only.
  - Fail boot when required secrets or URLs are absent.

#### [MODIFY] `backend/src/config/database.config.ts`
#### [MODIFY] other backend config files under `backend/src/config/`
- **Exact Changes**: validate numeric ranges and required presence for DB/Redis/AI settings. Today `database.config.ts` parses defaults, but there is no strict schema gate in `ConfigModule.forRoot(...)`.

#### [MODIFY] `ai-service/app/config.py`
- **Exact Changes**: extend the current `validate_internal_secret()` pattern into a fuller fail-fast config validation pass for storage settings, DB pool settings, and any new internal worker timeout settings.

#### [MODIFY] `backend/src/modules/health/health.service.ts`
- **Exact Changes**:
  - Keep active DB/Redis/AI probes.
  - Add queue-oriented signals where practical: Redis ping alone is not enough when BullMQ is backed up or workers are stalled.
  - Surface degraded-vs-not-ready distinction clearly in readiness payloads.

#### [MODIFY] `backend/src/modules/health/health.controller.ts`
- **Exact Changes**: preserve `/health/live` and `/health/ready`, but keep `/health/ready` as the single deployment readiness contract used by compose and staging.
- **Execution Note**: `/health/live` must remain a lightweight process/event-loop probe only. Do not add PostgreSQL, Redis, or AI-service dependency checks to liveness; keep active dependency checks strictly inside `/health/ready` to avoid orchestrator restart loops.

#### [MODIFY] `docker-compose.yml`
- **Exact Changes**:
  - Keep current healthchecks, but document a resilience test matrix for restarting Redis, Postgres, and ai-service mid-operation.
  - Consider adding restart/backoff expectations to service comments so staging operators know which failures are expected to self-heal.

#### [MODIFY] `monitoring/grafana/provisioning/alerting/rules.yml`
#### [MODIFY] `monitoring/prometheus.yml`
- **Exact Changes**: add queue backlog, readiness, restart-loop, and AI-runtime degradation alerts aligned with the new Phase 1 and Phase 2 guarantees.

#### [NEW] `docs/operations/classroom-readiness-runbook.md`
- **Exact Changes**: document startup validation, readiness interpretation, manual rollback, queue drain checks, file-migration checks, and chaos-test pass criteria.

## Database Schema & Contract Drifts
- **Drizzle ORM schema modifications likely required**:
  - `backend/src/drizzle/schema/rag.schema.ts`
    - possibly extend `aiGenerationJobs` to capture orchestrator provenance or additional status metadata if JSON runtime state proves insufficient for reporting.
  - `backend/src/drizzle/schema/refresh-tokens.schema.ts`
    - add grace-window / replacement linkage fields to support safe concurrent refresh behavior without relying on process-local memory.
  - file-bearing schema files under `backend/src/drizzle/schema/`
    - add storage-provider-neutral metadata for object keys / provider / bucket instead of raw local paths where needed.
- **API payload / response changes to trace**:
  - Queue-owned teacher AI job states:
    - backend controllers in `backend/src/modules/ai-mentor/ai-mentor.controller.ts`
    - web consumer types/services in `next-frontend/src/types/ai.ts` and `next-frontend/src/services/ai-service.ts`
    - mobile consumer types/services in `mobile/src/types/ai.ts` and `mobile/src/api/services/ai.ts`
  - File upload/download contract changes:
    - backend `files`, module-attachment, assessment-attachment, profile-image, and related endpoints
    - web consumers in `next-frontend/src/services/file-service.ts`, `module-service.ts`, `assessment-service.ts`
    - mobile file consumers under `mobile/src/api/services/`
  - Refresh-token rotation semantics:
    - backend auth routes stay stable if possible, but web/mobile client handling in `next-frontend/src/lib/api-client.ts`, `next-frontend/src/providers/AuthProvider.tsx`, `mobile/src/api/client.ts`, and `mobile/src/providers/AuthProvider.tsx` must be updated in the same rollout.

## Verification & Deployment Test Plan
Provide exact, copy-pasteable terminal commands to verify every workstream:
1. **Automated Unit & Integration Tests**
```bash
cd /home/jethro/Documents/Projects/capstone-nest-backend/backend && npm run test
cd /home/jethro/Documents/Projects/capstone-nest-backend/backend && npm run build
cd /home/jethro/Documents/Projects/capstone-nest-backend/ai-service && python scripts/run_tests.py
cd /home/jethro/Documents/Projects/capstone-nest-backend/next-frontend && npm run test
cd /home/jethro/Documents/Projects/capstone-nest-backend/next-frontend && npm run build
cd /home/jethro/Documents/Projects/capstone-nest-backend/mobile && npm run typecheck
cd /home/jethro/Documents/Projects/capstone-nest-backend/mobile && npm run test
```

2. **Load & Concurrency Execution**
```bash
cd /home/jethro/Documents/Projects/capstone-nest-backend && docker compose up -d postgres redis ollama backend ai-service frontend
cd /home/jethro/Documents/Projects/capstone-nest-backend && k6 run load-tests/k6/classroom-burst.js
```
- Metrics to capture during the run:
  - backend API P95/P99 latency
  - ai-service readiness / degraded mode
  - Redis queue depth and retry spikes
  - Postgres pool saturation and waiters
  - teacher AI job completion latency and failure rate

3. **Storage Failover & Pre-signed URL Verification**
```bash
cd /home/jethro/Documents/Projects/capstone-nest-backend/backend && npm run build
cd /home/jethro/Documents/Projects/capstone-nest-backend/next-frontend && npm run build
cd /home/jethro/Documents/Projects/capstone-nest-backend/mobile && npm run typecheck
```
- Manual verification sequence:
  - upload one library file via web
  - download the same file via web
  - download the same file via mobile or a mobile API client
  - upload one assessment submission attachment
  - verify ai-service can still read indexed source material after storage migration

4. **Chaos Testing**
```bash
cd /home/jethro/Documents/Projects/capstone-nest-backend && docker compose stop redis
cd /home/jethro/Documents/Projects/capstone-nest-backend && docker compose start redis
cd /home/jethro/Documents/Projects/capstone-nest-backend && docker compose stop ai-service
cd /home/jethro/Documents/Projects/capstone-nest-backend && docker compose start ai-service
cd /home/jethro/Documents/Projects/capstone-nest-backend && docker compose stop postgres
cd /home/jethro/Documents/Projects/capstone-nest-backend && docker compose start postgres
```
- Expected outcomes to verify after each restart:
  - `/api/health/ready` returns to `200 OK` only after dependencies are actually usable
  - queue-owned teacher AI jobs retry cleanly without duplicate execution
  - no orphaned `processing` AI jobs remain without stale-retry recovery
  - web and mobile clients recover from transient refresh / request failures without logout loops
