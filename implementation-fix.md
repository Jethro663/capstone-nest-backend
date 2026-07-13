# Nexora Performance and Architecture Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Eliminate the verified performance, lifecycle, consistency, and extension-risk weaknesses from the 2026-07-13 repo-wide audit without changing public contracts or destabilizing unrelated work.

**Architecture:** Stabilize verification first, make derived performance data read-mostly, replace database and AI execution fan-out with bounded batch/queue paths, then extract only the first well-characterized seams from oversized owners. Every wave is independently testable and reversible.

**Tech Stack:** NestJS 11, Drizzle, PostgreSQL/pgvector, BullMQ/Redis, Next.js 16, React 19, Expo/React Native, FastAPI, Python 3.12, Ollama.

## Global Constraints

- Work on the current `developement` branch and preserve all unrelated dirty-worktree changes.
- No public route, DTO, response-envelope, authorization, or mobile API contract changes.
- No schema migration, cache policy, shared generated-contract package, or major dependency upgrade in this remediation.
- Mobile is a multi-role product: student, teacher, and admin role resolution remain supported.
- Use red-green TDD for behavior changes and characterization tests before structural extraction.
- Keep one bounded concern per change set; do not mix compatibility upgrades into performance changes.

---

## Wave 0 — Stabilize verification and resource lifecycle

### Task 0.1: AI test runtime and teardown

**Files:**
- Modify: `ai-service/scripts/run_tests.py`
- Modify: `ai-service/app/main.py`
- Modify: `ai-service/app/backend_uploads.py`
- Test: `ai-service/tests/test_backend_uploads.py`

**Interfaces:**
- The test runner must default `AI_RUNTIME_MODE` to `test` without overriding an explicitly supplied value.
- Shared HTTP clients and background/executor resources must close during FastAPI shutdown and test teardown.

- [x] Reproduce the combined `tests.test_backend_uploads` teardown timeout in the repository Python 3.13 environment, then verify the corrected lifecycle under Python 3.12 and 3.13 separately.
- [x] Add a failing teardown/lifecycle regression that runs both upload tests in one process.
- [x] Implement the smallest root-cause fix; do not replace asynchronous file I/O with event-loop-blocking large writes.
- [x] Verify the targeted module exits normally, then run the complete AI suite within the CI budget.

### Task 0.2: Bounded CI workloads

**Files:**
- Modify: `.github/workflows/ci.yml`

**Required budgets:**
- migration bootstrap: 10 minutes
- backend unit, backend e2e, and mobile: 15 minutes each
- frontend and AI service: 20 minutes each
- advisory quality reports: 30 minutes

- [x] Add job-level `timeout-minutes` values without changing job dependencies or release semantics.
- [x] Validate workflow syntax and confirm every job has an explicit budget.

### Task 0.3: Frontend render and timer lifecycle

**Files:**
- Modify/Test: `next-frontend/src/components/layout/SystemInfoButton.tsx`
- Modify/Test: `next-frontend/src/components/teacher/class-record/TeacherClassRecordWorkbook.tsx`
- Modify/Test: `next-frontend/src/providers/AuthProvider.tsx`
- Modify/Test: `next-frontend/src/lib/session-refresh.ts`

- [x] Add failing tests showing the system-info request starts from the open action, class-record selection is derived without an effect update, and timeout handles are cleared when the primary request wins.
- [x] Remove the two production `set-state-in-effect` violations and cancel losing timers.
- [x] Run targeted tests with fake timers, then the full Jest suite with `--detectOpenHandles`; it must exit without the open-handle warning.

### Task 0.4: Cleanup observability and lint signal

**Files:**
- Modify/Test: `backend/src/modules/file-upload/file-upload.service.ts`
- Modify/Test: `backend/src/modules/file-upload/storage/storage.service.ts`
- Modify: `next-frontend/eslint.config.mjs`
- Modify: `.github/workflows/ci.yml`

- [x] Add failing tests for local unlink failure after a successful S3 upload.
- [x] Log a structured warning and increment a cleanup-failure metric without failing the successful upload.
- [x] Disable `no-explicit-any` only for test/e2e files; retain it for production code.
- [x] Fix remaining production lint errors, then remove frontend/backend lint `continue-on-error` only when lint exits zero.

### Task 0.5: Align mobile scope guidance

**Files:**
- Modify: `mobile/AGENTS.md`

- [x] Document student, teacher, and admin navigation ownership while retaining `mobile/` as the default target.
- [x] Verify role-resolution and navigation-manifest tests, typecheck, and the full mobile unit suite.

---

## Wave 1 — Remove performance-summary write amplification

### Task 1.1: Read persisted snapshots in one query

**Files:**
- Create: `backend/src/modules/performance/performance-snapshot-read.service.ts`
- Modify: `backend/src/modules/performance/performance.service.ts`
- Modify: `backend/src/modules/performance/performance.module.ts`
- Test: `backend/src/modules/performance/performance.service.spec.ts`

**Interfaces:**
- `PerformanceSnapshotReadService.findForStudentClasses(studentId: string, classIds: string[]): Promise<Map<string, PerformanceSnapshotSummary>>`
- Existing `getStudentOwnSummary(studentId)` response remains unchanged.

- [x] Add a failing regression proving a fully populated summary performs no recompute/upsert calls.
- [x] Add a failing regression proving all enrolled-class snapshots are loaded in one batched query.
- [x] Implement the read service and map snapshots by class ID.
- [x] Use synchronous recomputation only for missing pairs so the first response remains backward-compatible.
- [x] Verify subsequent reads of those pairs are read-only.

### Task 1.2: Parallelize independent component reads

**Files:**
- Modify/Test: `backend/src/modules/performance/performance.service.ts`

- [x] Add a failing orchestration test proving assessment and class-record component reads start before either resolves.
- [x] Replace the sequential awaits with one `Promise.all` while preserving snapshot and event semantics.
- [x] Run targeted performance tests, backend build, and the full backend suite.

---

## Wave 2 — Batch database fan-out safely

### Task 2.1: Batch class-record score upserts

**Files:**
- Modify/Test: `backend/src/modules/class-record/class-record.service.ts`
- Test: `backend/src/modules/class-record/class-record.service.performance.spec.ts`

- [x] Add a failing query-count test requiring one multi-row insert for bulk scores.
- [x] Build one `.values(dto.scores.map(...))` insert with the existing conflict key and `excluded.score` / `excluded.updated_at` update expressions.
- [x] Preserve pre-write validation, atomicity, returned rows, and one event containing all affected student IDs.

### Task 2.2: Batch adviser-section reads

**Files:**
- Modify/Test: `backend/src/modules/class-record/class-record.service.ts`

- [x] Add a failing test requiring one class-record query for all section class IDs.
- [x] Query with `inArray(classRecords.classId, classIds)` and group results by class ID in memory.
- [x] Preserve empty classes and ordering in the existing response.

### Task 2.3: Characterize academic rollover scale

**Files:**
- Create: `backend/src/modules/academic-state/academic-state.service.spec.ts`
- Modify only if evidence supports batching: `backend/src/modules/academic-state/academic-state.service.ts`

- [x] Add small, medium, and large content-graph fixtures with exact cloned-count and rollback assertions.
- [x] Record query count and approximate duration without inventing targets.
- [x] Batch only sibling inserts whose parent IDs are already known; preserve transaction order and foreign-key dependencies.
- [x] Stop without production changes if the fixture does not prove material serialized cost.

---

## Wave 3 — Move extraction execution to BullMQ

### Task 3.1: Prepare extraction records without in-process tasks

**Files:**
- Create: `ai-service/app/extraction_job_service.py`
- Modify/Test: `ai-service/app/main.py`
- Test: `ai-service/tests/test_ai_job_runtime.py`

**Interfaces:**
- Public `/extract` and retry endpoints keep their current `202` response shape.
- Preparation creates a pending extraction but never calls `asyncio.create_task`.

- [x] Add failing tests proving creation/retry return pending IDs without scheduling local tasks.
- [x] Move preparation, retry, cancellation, and failure-state transitions into `extraction_job_service.py`.

### Task 3.2: Add the extraction queue contract

**Files:**
- Modify/Test: `backend/src/modules/ai-mentor/ai-generation-queue.service.ts`
- Modify/Test: `backend/src/modules/ai-mentor/processors/ai-generation.processor.ts`
- Modify/Test: `backend/src/modules/ai-mentor/ai-proxy.service.ts`
- Modify/Test: `backend/src/modules/ai-mentor/ai-mentor.controller.ts`

**Interfaces:**
- BullMQ job: `module-extraction`
- Payload: `{ extractionId: string; requestedByUserId: string; queuedAt: string }`
- Deterministic BullMQ ID: `extraction-<uuid>`
- Three attempts with exponential backoff.

- [x] Add failing queue, processor, compensation, retry, and cancellation tests.
- [x] Enqueue after AI preparation; on enqueue failure mark the pending record failed and retain the public service-unavailable behavior.
- [x] Remove waiting jobs on cancellation while preserving running-job cooperative cancellation.

### Task 3.3: Add internal extraction execution

**Files:**
- Modify/Test: `ai-service/app/main.py`
- Modify/Test: `backend/src/modules/ai-mentor/ai-proxy.service.ts`

**Interfaces:**
- `POST /internal/extractions/{extraction_id}/run`
- Protected by `X-Internal-Service-Token`.

- [x] Add failing shared-secret, execution, retry-after-restart, and terminal-failure tests.
- [x] Load the pending record and invoke the existing extraction pipeline.
- [x] Delete both extraction `create_task` paths only after the queue lifecycle is green.

---

## Wave 4 — Establish first bounded architecture seams

### Task 4.1: Backend seams

- [x] Keep the new performance snapshot reader as the first performance seam.
- [x] Extract assessment visibility and ownership queries into `AssessmentAccessService` behind the existing `AssessmentsService` facade.
- [x] Extract LXP system-evaluation campaign operations into `SystemEvaluationService` behind `LxpService`.
- [x] Add characterization tests before moves; routes, DTOs, RBAC, audit, and response shapes must remain identical.

### Task 4.2: AI router seam

- [x] Move the queue-bound extraction routes (`/extract` plus internal run/fail) into `ai-service/app/routers/extractions.py` and keep `app.main:app` as the stable ASGI entrypoint. CRUD/apply handlers remain a deliberately deferred second seam because they share the large normalization/apply graph.
- [x] Re-export any test-imported helpers temporarily and migrate tests in the same bounded change set.

### Task 4.3: Frontend and mobile seams

- [x] Extract teacher-class discussion state/effects into a route-local hook and component without changing behavior.
- [x] Split extraction and AI-draft screens from `mobile/src/screens/TeacherDeepParityScreens.tsx` while preserving exported screen names and navigation params.
- [x] Stop after these first seams and re-measure file size, test isolation, and dependency direction before further decomposition.

---

## Wave 5 — Coverage, ratchets, and dependency lifecycle

### Task 5.1: Characterization coverage and ratchets

- [x] Add module-local characterization coverage for academic-state, analytics, audit, RAG, and teacher services.
- [x] Enforce zero lint errors and no regression from the recorded warning baseline; warning cleanup remains incremental.

### Task 5.2: Isolated deprecation cleanup

- [x] Handle Starlette/httpx test-client compatibility in a Python-only compatibility change set.
- [x] Handle Winston/Loki transport compatibility in a backend-only compatibility change set.
- [x] Run full affected-subsystem suites and revert the isolated upgrade if compatibility is not proven.

---

## Final Verification and Completion

- [x] Backend: non-mutating lint, build, 1,003+ unit tests, affected performance/query-count tests, and e2e where runtime prerequisites are available.
- [x] AI: import check and full suite under Python 3.12 with no pending-thread/task warning.
- [x] Frontend: lint, 506+ tests with no open handles, and production build within 20 minutes.
- [x] Mobile: typecheck and 160+ tests.
- [x] Infrastructure: `docker compose config --quiet` and CI workflow validation.
- [x] Re-scan touched files and direct dependents for response-envelope, auth, audit, queue, and derived-data regressions.
- [x] Confirm `git status` contains only the pre-existing dirty state plus intentional remediation files.

## Implementation Results — 2026-07-13

**Status:** Complete. All non-deferred remediation work and release gates passed on the current `developement` branch. Existing unrelated worktree changes were preserved.

### Delivered

- AI upload/extraction work now uses managed off-loop writes with self-closing workers; the test runner defaults to test runtime without overriding explicit configuration.
- Every CI job has an explicit timeout, and frontend/backend lint failures are blocking with warning-count ratchets.
- Performance summaries batch snapshot reads and avoid writes for populated snapshots; independent component reads run concurrently.
- Class-record score writes use one multi-row upsert, and adviser-section reads use one batched query while preserving response order and empty classes.
- Extraction preparation is task-free and execution is restart-safe through deterministic BullMQ jobs, protected internal execution, retry/backoff, compensation, and cancellation handling.
- Completion review restored exact system-evaluation RBAC precedence, clears stale discussion detail and suppresses invalid-route requests, and allows extraction retry re-entry only after the processing record is stale.
- First architecture seams now isolate performance snapshot reads, assessment access, system evaluations, extraction queue routes, teacher discussion state, and the two largest teacher mobile parity screens.
- Cleanup failures are observable through structured warnings and `storage_cleanup_failures_total`.

### Conditional decisions and bounded deferrals

- Academic rollover characterization proved linear parent-dependent inserts but did not justify a risky production rewrite; production code was intentionally left unchanged.
- Only the queue lifecycle extraction routes moved to the new router in this first seam. Moving the tightly coupled CRUD/apply graph is deferred until it has route-level characterization coverage.
- The first seams reduce coupling but do not make the largest owners small: `LxpService` is 6,089 lines, `AssessmentsService` 5,332, `app/main.py` 5,291, the teacher-class route 4,403, and `TeacherDeepParityScreens.tsx` 1,713. Continue decomposition one characterized capability at a time; a bulk rewrite would create the cascade risk this plan is designed to avoid.
- No dependency upgrade was necessary for the Starlette/httpx or Winston/Loki warnings: test clients/mocks were corrected and full affected suites passed.
- Backend lint retains a ratcheted legacy ceiling of 2,219 warnings (current: 2,218) and frontend retains 5 warnings; both have zero errors and CI prevents regression.
- The landing page uses `next/font/google`, so an offline sandbox cannot compile it. The production build passed with build-time network access; self-hosting those fonts is a low-risk follow-up, not a runtime blocker.

### Verification evidence

| Surface | Evidence |
| --- | --- |
| Backend | lint: 0 errors / 2,218 warnings (below the 2,219 ceiling); build passed; 86 suites / 1,034 unit tests passed; 2 suites / 5 e2e tests passed |
| AI service | Python 3.12.3: 117 tests passed in 4.8s; repository Python 3.13 environment: 117 tests passed; no pending-task/thread teardown warning |
| Frontend | lint: 0 errors / 5 baseline warnings; 126 suites / 511 tests passed with `--detectOpenHandles`; production build completed TypeScript and generated 66 static pages |
| Mobile | typecheck passed; 25 suites / 160 tests passed |
| Infrastructure | Compose config validated; CI YAML parsed and all timeout budgets matched; `git diff --check` passed |

## Completion Definition

The plan is complete only when every non-deferred checkbox is verified, public contracts remain unchanged, lifecycle checks terminate within their budgets, common performance reads are read-only, extraction execution is restart-safe through BullMQ, and no unrelated dirty-worktree changes are overwritten.
