# AI Service Stress Test Audit

## Stress-Test Summary

- Date: `2026-07-14`
- Repo: `capstone-nest-react-lms`
- Findings recorded: `25`
- Scenario count: `12`
- Status counts: `{'deferred': 3, 'fixed': 22}`

## Baseline

- Initial AI baseline passed 117/117 tests before remediation.
- Initial targeted backend queue/proxy baseline passed before remediation.
- All core Compose services were healthy before runtime probes.
- A real isolated Redis/BullMQ reproduction confirmed that a retained deterministic RAG job ID discarded a later request payload.
- Live bidirectional shared-secret probes rejected missing and wrong tokens before resource lookup.
- Independent review reproduced eight additional release blockers across lease retry timing, output fencing, redirect-secret handling, compensation ambiguity, embedding integrity, ambiguous commits, route typing, and model transitions; all were fixed and re-reviewed.

## Scenario Matrix Summary

### 1. BullMQ processor contracts - Inventory and execute all seven processor classes and their 13 accepted job names

- Load style: `repeated contract mutation`
- Expected result: Known jobs retry transient failures; unknown names fail once as unrecoverable.
- Failure signal: Silent acknowledgement or repeated retries of an unsupported job.
- Observability evidence: Processor unit tests plus full backend suite.
- Confidence: `high`

### 2. RAG and library indexing - Queue a replacement request while the same resource is actively indexing

- Load style: `concurrent repeated request`
- Expected result: One active job and one trailing latest job both execute.
- Failure signal: The later payload is suppressed by a retained job ID.
- Observability evidence: Isolated live Redis/BullMQ run produced execution order [1, 2].
- Confidence: `high`

### 3. Teacher AI durable jobs - Two workers attempt to claim one pending lesson, quiz, intervention, or extraction job

- Load style: `concurrent worker pressure`
- Expected result: Exactly one conditional UPDATE succeeds; the loser receives 409.
- Failure signal: Both workers invoke the model or extraction pipeline.
- Observability evidence: Concurrent route tests assert one runner invocation and one conflict.
- Confidence: `high`

### 4. Teacher AI durable lifecycle - A request is cancelled, a stale worker is reclaimed, or BullMQ redelivers after generated output committed but post-processing failed

- Load style: `lease takeover, cancellation, and partial-commit failure injection`
- Expected result: Only the current persisted worker lease may write; a newer attempt of the same BullMQ job can supersede a timed-out request; committed output is resumed without a second model call.
- Failure signal: Retries exhaust on 409, a stale worker completes a cancelled job, a poll mutates state, or the model is invoked twice for one durable output.
- Observability evidence: Lease supersession/fencing, read-only polling, durable cancellation, output-lock ordering, and ambiguous-commit regression tests.
- Confidence: `high`

### 5. Document extraction - Malformed attempts, stale retries, teacher cancellation, task cancellation, and already-applied records

- Load style: `failure injection and repeated execution`
- Expected result: 400 for malformed metadata, atomic retry claims, terminal idempotency, and no false completion.
- Failure signal: 500 conversion errors, duplicate work, stranded processing, or completed response after cancellation.
- Observability evidence: Extraction queueing and pipeline regression tests.
- Confidence: `high`

### 6. Vector retrieval - One or all query variants fail, the provider changes model, or a malformed vector is returned

- Load style: `partial dependency failure`
- Expected result: One strict finite embedding batch, current-model-only vector search, serial DB use, partial results preserved, and a 20-second aggregate deadline.
- Failure signal: Cross-model comparison, padded vectors, concurrent-session errors, multiplied provider timeouts, or silent empty context.
- Observability evidence: Dimension/finite checks, model-filter SQL, current-model freshness, one-batch embedding, aggregate timeout, partial, and total-failure tests.
- Confidence: `high`

### 7. Embedding and library indexing - Embedding provider times out during a replacement index

- Load style: `slow dependency and transaction failure`
- Expected result: No placeholder vector is stored or queried; the prior usable index survives and BullMQ retries.
- Failure signal: Hash vectors replace semantic vectors, incompatible models are compared, or a failed replacement empties the index.
- Observability evidence: Provider/degraded-batch rollback, no-DELETE, current-model filtering, and preservation tests.
- Confidence: `high`

### 8. Tutor and JA Ask - Ollama times out after grounded citations have been retrieved

- Load style: `slow model response`
- Expected result: A visibly degraded, cited, lesson-grounded response is returned.
- Failure signal: Unhandled timeout or unsupported generated claims.
- Observability evidence: Tutor and JA timeout regression tests.
- Confidence: `high`

### 9. Tutor state - Concurrent messages or answer submissions target one session

- Load style: `concurrent state mutation`
- Expected result: A non-blocking PostgreSQL transaction advisory lock serializes turns before state load or returns 409.
- Failure signal: Lost round increment, stale latest-state overwrite, or a request blocked beyond its deadline waiting for the lock.
- Observability evidence: Try-lock-before-load unit test and live PostgreSQL advisory-lock SQL probe.
- Confidence: `high`

### 10. Backend to AI boundary - Missing, wrong, matching, and unconfigured shared-secret cases in both directions

- Load style: `header mismatch pressure`
- Expected result: Missing/wrong/unconfigured fail before resource access; matching token reaches lookup; signed-storage redirects omit the secret.
- Failure signal: Forwarded identity is accepted without the secret or a redirect receives the internal token.
- Observability evidence: Boundary tests, cross-origin redirect capture, and live status probes: AI 401/401/404, backend upload 403/403/404.
- Confidence: `high`

### 11. Queue handoff - AI creates a durable teacher job but Redis enqueue fails

- Load style: `partial dependency failure`
- Expected result: Backend atomically marks a still-pending job queueCompensated and returns 503; an ambiguously accepted queue item cannot execute it later.
- Failure signal: A compensated job is reclaimed after the caller was told queueing failed.
- Observability evidence: Teacher/extraction compensation marker and terminal-run tests plus controller coverage.
- Confidence: `high`

### 12. Timeout envelopes - Ollama, embeddings, or response-body streaming approaches route and worker deadlines

- Load style: `slow dependency`
- Expected result: Chat, tutor start, public generation, and internal workers have explicit tiered deadlines covering headers and body reads; indexing fetches abort.
- Failure signal: Backend aborts too early, a delayed body escapes the timer, or a worker hangs indefinitely.
- Observability evidence: Proxy and processor delayed-body timeout tests plus abort-signal tests.
- Confidence: `high`

## Prioritized Findings

### 1. Retained deterministic indexing IDs suppressed later requests

- Priority: `P0`
- Severity: `high`
- Status: `fixed`
- Category: `idempotency`
- Files: backend/src/modules/rag/rag-indexing.service.ts, backend/src/modules/file-upload/library-indexing.service.ts
- Evidence: Reproduced against real BullMQ; active-only dedup with keepLastIfActive passed a live two-run verification.

### 2. Teacher and notification custom job IDs used BullMQ-forbidden colons

- Priority: `P0`
- Severity: `high`
- Status: `fixed`
- Category: `queue contract`
- Files: backend/src/modules/ai-mentor/ai-generation-queue.service.ts, backend/src/modules/notifications/assessment-notification-dispatch.service.ts
- Evidence: IDs now use hyphens and are asserted by producer tests.

### 3. Teacher AI and extraction jobs could be claimed by concurrent workers

- Priority: `P0`
- Severity: `critical`
- Status: `fixed`
- Category: `idempotency`
- Files: ai-service/app/main.py, ai-service/app/routers/extractions.py
- Evidence: Conditional UPDATE RETURNING claims persist a unique workerLeaseId, permit one runner, and return 409 to the loser.

### 4. Process-local startup recovery and polling competed with BullMQ ownership

- Priority: `P0`
- Severity: `critical`
- Status: `fixed`
- Category: `durable orchestration`
- Files: ai-service/app/main.py
- Evidence: Removed process-local task recovery and poll-time status mutation; startup only preloads models, polling is read-only, and BullMQ remains the sole retry owner.

### 5. Worker lease expiry was shorter than the request budget and writes were not fenced

- Priority: `P0`
- Severity: `critical`
- Status: `fixed`
- Category: `idempotency`
- Files: ai-service/app/job_lifecycle.py, ai-service/app/main.py, ai-service/app/routers/extractions.py, ai-service/app/extraction_pipeline.py
- Evidence: Persisted 16-minute leases fence every write; a newer attempt of the same BullMQ job can atomically supersede the prior lease immediately after the 15-minute HTTP timeout instead of exhausting on 409.

### 6. BullMQ redelivery after output commit could invoke the model twice

- Priority: `P0`
- Severity: `critical`
- Status: `fixed`
- Category: `idempotency`
- Files: ai-service/app/main.py, ai-service/app/lesson_plan_service.py, ai-service/app/quiz_generation_service.py, ai-service/app/remedial_service.py
- Evidence: Output commits are lease-guarded and separated from final post-processing; BullMQ redelivery detects and resumes committed output without another generation call.

### 7. Progress persistence released the final output fence before INSERT

- Priority: `P0`
- Severity: `high`
- Status: `fixed`
- Category: `cancellation race`
- Files: ai-service/app/job_lifecycle.py, ai-service/app/lesson_plan_service.py, ai-service/app/quiz_generation_service.py
- Evidence: Progress now commits before the final FOR UPDATE; the lease/cancellation lock remains held continuously through output INSERT and commit.

### 8. Inner generation retries could duplicate output after an ambiguous commit

- Priority: `P0`
- Severity: `high`
- Status: `fixed`
- Category: `idempotency`
- Files: ai-service/app/main.py
- Evidence: A durable HTTP execution attempts output generation once; BullMQ owns retry and each redelivery checks for committed output before invoking the generator.

### 9. Internal teacher runners did not validate durable job type

- Priority: `P1`
- Severity: `high`
- Status: `fixed`
- Category: `queue contract`
- Files: ai-service/app/main.py
- Evidence: Lesson, quiz, and intervention routes reject a valid UUID whose persisted job_type does not match the route before any claim or model call.

### 10. Teacher AI helper failures were swallowed before BullMQ retry

- Priority: `P0`
- Severity: `high`
- Status: `fixed`
- Category: `retry`
- Files: ai-service/app/main.py
- Evidence: All generation helpers persist failure metadata and rethrow; focused tests cover lesson, quiz, and intervention.

### 11. Successful durable job creation could be orphaned by Redis enqueue failure

- Priority: `P0`
- Severity: `high`
- Status: `fixed`
- Category: `orchestration`
- Files: backend/src/modules/ai-mentor/ai-mentor.controller.ts, backend/src/modules/ai-mentor/ai-proxy.service.ts, ai-service/app/main.py
- Evidence: Pending-only compensation avoids overwriting a claimed job, lesson/quiz/intervention handoffs all compensate enqueue failure, and backend returns 503.

### 12. Ambiguously accepted queue jobs could execute after compensation returned 503

- Priority: `P0`
- Severity: `high`
- Status: `fixed`
- Category: `orchestration`
- Files: ai-service/app/main.py, ai-service/app/extraction_job_service.py, ai-service/app/routers/extractions.py
- Evidence: Compensation atomically persists queueCompensated on a still-pending teacher/extraction job, and internal runners treat the marker as terminal.

### 13. Shared-secret checks were optional on proxied user-context routes

- Priority: `P0`
- Severity: `critical`
- Status: `fixed`
- Category: `boundary auth`
- Files: ai-service/app/main.py, backend/src/modules/ai-mentor/ai-proxy.service.ts, backend/src/modules/file-upload/internal-uploads.controller.ts
- Evidence: Both services now fail closed; AI uses constant-time comparison; live bidirectional probes pass.

### 14. Backend upload redirects forwarded the internal shared secret to storage

- Priority: `P0`
- Severity: `high`
- Status: `fixed`
- Category: `boundary auth`
- Files: ai-service/app/backend_uploads.py
- Evidence: The authenticated first hop disables redirects; validated HTTP(S) storage redirects are fetched without X-Internal-Service-Token, including subsequent redirects.

### 15. Indexing workers had no HTTP deadline

- Priority: `P1`
- Severity: `high`
- Status: `fixed`
- Category: `timeout`
- Files: backend/src/modules/rag/processors/rag-indexing.processor.ts, backend/src/modules/file-upload/processors/library-indexing.processor.ts
- Evidence: AbortController deadlines remain active through response-body parsing, normalize timeout errors, and rethrow for exponential retry.

### 16. Class and library indexing transaction boundaries could lose usable vectors

- Priority: `P1`
- Severity: `high`
- Status: `fixed`
- Category: `data integrity`
- Files: ai-service/app/indexing_pipeline.py, ai-service/app/library_indexing_pipeline.py
- Evidence: Class reindex takes a per-class transaction advisory lock and commits; library replacement embeds before atomic delete/insert and rolls back on failure.

### 17. Retrieval and index-status code shared AsyncSession across concurrent tasks

- Priority: `P1`
- Severity: `high`
- Status: `fixed`
- Category: `concurrency`
- Files: ai-service/app/retrieval_service.py, ai-service/app/indexing_pipeline.py
- Evidence: Variants embed in one batch, DB operations are serial under a 20-second aggregate deadline, and partial degradation remains observable.

### 18. Placeholder and cross-model vectors could silently corrupt semantic retrieval

- Priority: `P0`
- Severity: `high`
- Status: `fixed`
- Category: `semantic integrity`
- Files: ai-service/app/embedding_provider.py, ai-service/app/indexing_pipeline.py, ai-service/app/library_indexing_pipeline.py, ai-service/app/retrieval_service.py
- Evidence: Hash fallback was removed; vector count, exact dimension, and finite values are enforced; failed indexing preserves the old index; retrieval and class freshness use only the current embedding_model.

### 19. Tutor and JA grounded calls propagated Ollama timeouts

- Priority: `P1`
- Severity: `medium`
- Status: `fixed`
- Category: `graceful degradation`
- Files: ai-service/app/student_tutor_service.py, ai-service/app/ja_practice_service.py
- Evidence: Both return explicit degraded responses that preserve citations and avoid new unsupported claims.

### 20. Concurrent tutor turns could overwrite latest session state

- Priority: `P1`
- Severity: `high`
- Status: `fixed`
- Category: `idempotency`
- Files: ai-service/app/student_tutor_service.py
- Evidence: Per-user/session PostgreSQL transaction try-lock is acquired before loading mutable state; overlap fails promptly with 409.

### 21. Performance recompute coalesced different student subsets

- Priority: `P1`
- Severity: `high`
- Status: `fixed`
- Category: `idempotency`
- Files: backend/src/modules/performance/performance-recompute-queue.service.ts
- Evidence: Stable hash of the sorted unique student set is now part of the time-window job ID.

### 22. Unknown BullMQ job names were acknowledged as successful

- Priority: `P1`
- Severity: `medium`
- Status: `fixed`
- Category: `queue contract`
- Files: backend/src/modules/ai-mentor/processors/ai-generation.processor.ts, backend/src/modules/discussion-board/discussion-board.processor.ts, backend/src/modules/notifications/processors/assessment-notification.processor.ts, backend/src/modules/performance/performance-recompute.processor.ts
- Evidence: All seven processor classes now reject unsupported contracts with UnrecoverableError.

### 23. Queue handoff after non-AI domain commits lacks a transactional outbox

- Priority: `P2`
- Severity: `medium`
- Status: `deferred`
- Category: `orchestration`
- Files: backend/src/modules/announcements/announcements.service.ts, backend/src/modules/discussion-board/discussion-board.service.ts, backend/src/modules/rag/rag-indexing.service.ts, backend/src/modules/file-upload/library-indexing.service.ts
- Evidence: A crash or Redis outage between domain persistence and queue insertion can still require reconciliation; a shared outbox is a schema-level redesign.

### 24. Runtime payload schemas are duplicated across backend and AI service

- Priority: `P2`
- Severity: `medium`
- Status: `deferred`
- Category: `contract fragility`
- Files: backend/src/modules/ai-mentor/ai-proxy.service.ts, ai-service/app/schemas.py
- Evidence: Current tests cover exercised envelopes, but generated cross-service contract fixtures are not yet present.

### 25. Production-scale Ollama saturation and long-document memory pressure remain unmeasured

- Priority: `P2`
- Severity: `medium`
- Status: `deferred`
- Category: `capacity`
- Files: load-tests/
- Evidence: Failure paths are deterministic and verified locally; a staging soak with production models and representative PDFs is still required.

## Actual Edits

- Hardened all seven BullMQ processor classes, job IDs, retry propagation, active-only deduplication, and unsupported-contract handling.
- Made BullMQ the sole durable execution owner; removed process-local recovery and poll-time state mutation.
- Added persisted worker leases, same-BullMQ newer-attempt supersession, and fenced claims, progress, output, completion, failure, and cancellation writes.
- Made committed generation output resumable on redelivery, kept the final output lock through commit, and removed inner retries around ambiguous output commits.
- Added strict worker metadata/job-type validation, durable cancellation, terminal queue-compensation markers, and quiz retry compensation.
- Added tiered backend-to-AI deadlines that include response-body reads plus abortable indexing calls with exponential BullMQ retries.
- Made the shared-secret boundary fail closed and stripped the internal token before following signed-storage redirects.
- Made class/library index replacement transaction-safe and removed unsafe placeholder embeddings; retrieval enforces exact finite dimensions, current-model vector filtering, one batch, serial DB work, and an aggregate deadline.
- Added grounded tutor and JA fallbacks plus non-blocking per-session concurrency serialization.
- Added load-tests/run-ai-pipeline-resilience-smoke.sh and focused regression coverage.

## Verification

- AI_RUNTIME_MODE=test ai-service/.venv/bin/python -m unittest discover -s ai-service/tests -p test_*.py: 169 tests passed.
- npm --prefix backend test -- --runInBand: 91 suites, 1063 tests passed.
- ./load-tests/run-ai-pipeline-resilience-smoke.sh: 138 AI and 151 backend tests passed.
- npm --prefix backend run build: passed, including migration integrity and source cleanliness.
- npm --prefix backend run lint: zero errors and 2204 baseline warnings.
- AI import smoke printed Nexora AI Service.
- Live Redis/BullMQ active-plus-trailing dedup run executed versions [1, 2].
- Live shared-secret probes returned AI 401/401/404 and backend upload 403/403/404.
- Live PostgreSQL advisory-lock statement completed inside a rolled-back transaction.
- Independent review found eight release blockers across two passes; every blocker was regression-tested, remediated, and closed by final read-only re-review.

## Before vs After

### Improved

- Duplicate and stale worker execution is prevented by persisted lease claims and fenced writes.
- Cancellation and output commits survive process restart and BullMQ redelivery.
- Slow requests terminate through body parsing and retry instead of hanging.
- Model timeouts return grounded fallbacks where safe; embedding outages preserve the prior index and return no incompatible context.
- The service boundary no longer accepts forwarded identity without the shared secret or leaks it to storage redirects.
- Replacement indexing preserves the previous usable vector set on failure and serializes same-class replacement.

### Stayed The Same

- Backend remains the public auth/RBAC and durable orchestration owner.
- AI service remains assistive and does not mutate official grades or enrollment.
- Existing public response envelopes remain compatible; degraded fields are additive.

### Remaining Risks

- Non-AI queue handoffs still need a transactional outbox or periodic reconciliation for crash consistency.
- Staging load against the deployed Ollama model and representative large documents is not part of deterministic CI.
- Cross-service runtime schemas remain manually synchronized.
- An embedding-model change safely hides old library vectors, but operators must run library backfill to restore that context.

## Confidence in LXP and AI Feature Readiness

- LXP: `high confidence for verified local failure paths`
- AI features: `high confidence for deterministic resilience; staging capacity verification pending`
- No official academic-state ownership moved into the AI service.
- Claims are bounded to direct execution, automated tests, and isolated local infrastructure probes.
- No production-readiness claim is made without a representative staging soak.

## Second-Pass Verification

- Full AI and backend test suites passed after the lease, output, redirect, compensation, and semantic-integrity fixes.
- The consolidated smoke passed after lifecycle, retrieval/model-transition, timeout, queue, and boundary-auth hardening were added.
- Backend compilation, migration integrity, source-clean checks, lint, Python compilation, and JSON validation completed successfully.
- Independent review found and then closed eight release blockers; the last model-transition review returned a non-blocking approval.
