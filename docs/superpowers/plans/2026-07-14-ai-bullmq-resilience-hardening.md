# AI and BullMQ Resilience Hardening Plan

> **For Codex:** Execute this plan with test-driven changes and verify every claim from fresh command output.

**Goal:** Ensure AI-backed BullMQ work remains restart-safe, time-bounded, authenticated, retryable, and observable when Ollama, embeddings, or the AI service slow down or fail.

**Architecture:** Keep durable orchestration in NestJS/BullMQ. Use BullMQ deduplication to serialize same-resource indexing while retaining the latest request, abort backend-to-AI indexing calls at a configured deadline, and preserve the AI service's existing degraded embedding/cloud fallbacks. Internal service routes must fail closed when the shared secret is absent.

**Tech stack:** NestJS 11, BullMQ 5, Jest, FastAPI, asyncio, unittest, PostgreSQL/pgvector, Ollama.

### Task 1: Lock down the internal shared-secret boundary

**Files:**
- Modify: `backend/src/modules/file-upload/internal-uploads.controller.spec.ts`
- Modify: `backend/src/modules/file-upload/internal-uploads.controller.ts`
- Modify: `backend/src/modules/ai-mentor/ai-proxy.service.spec.ts`
- Modify: `backend/src/modules/ai-mentor/ai-proxy.service.ts`

1. Add regression tests proving the raw-upload route rejects missing, wrong, and unconfigured secrets, while a configured matching secret succeeds.
2. Add a proxy test proving internal teacher jobs forward the configured secret and reject locally if it is absent.
3. Run the focused tests and confirm they fail for the unconfigured-secret cases.
4. Make both internal directions fail closed, then rerun the focused tests.

### Task 2: Make indexing queues repeatable and time-bounded

**Files:**
- Modify: `backend/src/modules/rag/rag-indexing.service.spec.ts`
- Modify: `backend/src/modules/rag/rag-indexing.service.ts`
- Create: `backend/src/modules/rag/processors/rag-indexing.processor.spec.ts`
- Modify: `backend/src/modules/rag/processors/rag-indexing.processor.ts`
- Create: `backend/src/modules/file-upload/library-indexing.service.spec.ts`
- Modify: `backend/src/modules/file-upload/library-indexing.service.ts`
- Create: `backend/src/modules/file-upload/processors/library-indexing.processor.spec.ts`
- Modify: `backend/src/modules/file-upload/processors/library-indexing.processor.ts`

1. Replace the old deterministic-ID expectation with tests for BullMQ-generated job IDs and `deduplication.keepLastIfActive` per class/file.
2. Add processor tests in which `fetch` remains pending until its abort signal fires; prove the processor rejects so configured retries/backoff can run.
3. Confirm the tests fail against the current retained-ID/no-timeout behavior.
4. Add explicit indexing deadlines, clear timers in `finally`, normalize timeout errors, and require a non-empty shared secret before any internal request.
5. Rerun all focused queue tests.

### Task 3: Verify graceful AI degradation and retrieval observability

**Files:**
- Modify: `ai-service/tests/test_embedding_provider.py`
- Modify: `ai-service/tests/test_retrieval_service.py`
- Modify: `ai-service/app/retrieval_service.py`
- Modify: `ai-service/app/indexing_pipeline.py`
- Modify: `ai-service/app/library_indexing_pipeline.py`
- Modify: `ai-service/app/student_tutor_service.py`
- Modify: `ai-service/app/ja_practice_service.py`

1. Add an explicit embedding-timeout test that verifies deterministic degraded vectors when degraded mode is enabled.
2. Add retrieval tests proving partial variant failure still returns results and total failure returns an empty result with a warning.
3. Confirm the missing-warning test fails.
4. Log variant failures without changing retrieval response contracts, then rerun the focused and full AI test suites.
5. Preserve prior library vectors when embedding fails, commit successful class reindexes, serialize one-session DB work, and return cited degraded tutor/JA responses on model timeout.

### Task 3B: Close durable-job and processor contract races

**Files:**
- Modify: `ai-service/app/main.py`
- Modify: `ai-service/app/routers/extractions.py`
- Modify: `ai-service/app/extraction_pipeline.py`
- Modify: `backend/src/modules/ai-mentor/ai-mentor.controller.ts`
- Modify: all seven BullMQ processor classes and focused specs

1. Add atomic conditional claims for teacher AI and extraction workers.
2. Propagate generation failures so BullMQ retries run.
3. Compensate durable teacher jobs when Redis enqueue fails.
4. Reject malformed worker metadata and unsupported queue names explicitly.
5. Serialize tutor session mutations and distinguish performance recompute subsets.

### Task 4: Add a repeatable resilience smoke entrypoint

**Files:**
- Create: `load-tests/run-ai-pipeline-resilience-smoke.sh`
- Modify: `load-tests/README.md`

1. Add a fail-fast script that runs focused backend auth/queue/proxy tests and focused AI extraction/retrieval/fallback tests.
2. Run it from the repository root and record the exact pass/fail totals.

### Task 5: Audit every processor and AI endpoint family, then document evidence

**Files:**
- Create: `docs/system-audit/2026-07-14-ai-bullmq-resilience-walkthrough.md`
- Create: `docs/system-audit/2026-07-14-ai-bullmq-stress-data.json`

1. Consolidate static inventory, isolated BullMQ reproduction, live auth probes, and independent stress-agent matrices.
2. Classify findings as safe immediate fix, conditional improvement, or deferred redesign.
3. Document all seven processor classes and every AI endpoint family against idempotency, deadline, backoff, degradation, and auth criteria.
4. Render the skill report and link it from the walkthrough.
5. Run the full focused smoke, relevant full suites, lint/type diagnostics, and an independent second-pass code review.
