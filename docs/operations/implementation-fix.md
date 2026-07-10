# Second-Round Implementation Fix Plan — 2026-07-10

## Scope

This replaces the first-round plan. The first-round work is already the baseline: performance component read batching, assessment visibility preloading, duplicate index chunk construction removal, Node/Python local bootstrap guardrails, and bounded mobile refresh concurrency.

This plan contains only additional evidence-backed opportunities found after that work. It favors changes that preserve current API output, academic calculations, permissions, audit events, and AI proxy behavior.

## Evidence and scale convention

The scale statements below are **reasoned query/write-count estimates from the inspected code**, not production latency measurements. Before merging any item, capture the current SQL statement count and elapsed time with a representative seeded fixture, then record the measured before/after result in the pull request.

| Symbol | Meaning |
| --- | --- |
| `S` | Score rows submitted in one bulk class-record request. |
| `R` | Candidate class records evaluated for one student standing. |
| `T` | Number of configured user statuses. |
| `J` | Stale AI jobs recovered in one maintenance pass. |
| `C` | Concept-mastery rows, capped at 8 by current code. |

## Non-negotiable rules

- Preserve the Nest `{ success, message, data }` response envelope.
- Preserve auth/RBAC, audit logging, score immutability, and official academic-record rules.
- Do not write AI output to grades, enrollment, or official academic records.
- Do not add caches, stored totals, or stale derived flags.
- Keep all backend DB calls through `DatabaseService` / `this.db`.
- Do not increase worker/database/AI concurrency merely because query work is reduced.

## Execution order

| Order | Finding | Risk | Why this order |
| --- | --- | --- | --- |
| 1 | Bulk class-record score upserts | Low | Local write-shape optimization with an existing unique conflict key. |
| 2 | Grouped user status counts | Low | Read-only admin aggregate with a stable response shape. |
| 3 | Class standing snapshot fan-out | Medium | Material read reduction, but grading semantics require exact equivalence tests. |
| 4 | AI stale-job runtime persistence | Medium | Reduces repeated background writes without changing job status authority. |
| 5 | Concept-mastery batch upsert | Low impact | Safe only when already touching the remedial flow. |
| 6 | Queue-backed indexing backfills | Operational decision | Changes asynchronous completion, retry, and operator workflow. |

## Plan completion and handoff

This document is complete as the second-round implementation handoff. Findings 1–5 are independently implementable under the listed invariants and verification gates. Finding 6 is intentionally not implementation-ready until an authorized product/operations owner answers its stated queue, progress, retry, cancellation, and response-contract questions.

Start each finding in its own change set. Do not combine a query/write optimization with Finding 6 or with unrelated refactors; this preserves an observable before/after result and makes rollback safe.

---

## 1. Batch class-record bulk score upserts

**Priority:** P1  
**Subsystem:** backend / class-record  
**Category:** unbounded concurrent writes

### Exact location and evidence

- `backend/src/modules/class-record/class-record.service.ts`, `bulkRecordScores` (around lines 762–825).
- The service validates every incoming score, then uses `Promise.all(dto.scores.map(...))`.
- Every score executes its own `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` statement.
- After all writes, the service emits one `ClassRecordScoresUpdatedEvent` and writes the existing audit entry.

### Scale context

**Expected structure:** today this path performs approximately `S` score-upsert statements at once. With a batch size of 25, a 40-student class changes from about 40 statements to 2 bounded statements; a 100-student class changes from about 100 to 4. The event and audit write remain unchanged.

### Best implementation

1. Keep the current validation loop unchanged.
2. Deduplicate the incoming payload by `studentId` before writing. Use the last supplied value only if the current API already permits duplicate IDs; otherwise reject duplicate IDs explicitly as validation hardening in a separate change.
3. Split score rows into bounded batches of 25–50 rows.
4. For each batch, issue one multi-row Drizzle `insert(classRecordScores).values(rows).onConflictDoUpdate(...)` using the existing `(classRecordItemId, studentId)` conflict target.
5. If callers require returned rows, use `.returning()` per batch and concatenate in input order. If no caller depends on score-row order, do not add ordering assumptions.
6. Emit the existing event once, with the unique student IDs from the original accepted payload, and preserve the audit action/metadata exactly.

### Dependencies

- `backend/src/drizzle/schema/class-record.schema.ts`: `classRecordScores` unique key and numeric score type.
- `backend/src/modules/class-record/class-record.service.spec.ts`: closest bulk-score regression suite.
- `backend/src/modules/performance/performance-recompute-queue.service.ts`: downstream event consumer path; event payload must remain unchanged.
- Any frontend/mobile bulk-score editor: preserve validation error and result-array behavior.

### Cascading safeguards

- Do not remove `assertClassOwnership` or `assertEditable`.
- Do not bypass max-score validation; batching only changes persistence execution.
- Keep `updatedAt` set per row.
- Do not allow a partial batch to silently succeed if a later batch fails. Wrap all batches in one transaction only after confirming the current method’s partial-write behavior is not relied upon; otherwise return a clear failure and retain current semantics.
- Keep the event after successful writes only—never enqueue performance recomputation before score persistence succeeds.

### Verification

- Add tests for 1, 25, 26, and 100 scores; existing row update; duplicate student IDs; and a database failure during a later batch.
- Assert one event, unchanged student IDs, and unchanged audit log for all success cases.
- Run `npm test -- class-record.service.spec.ts --runInBand`, backend build, and non-mutating ESLint.
- Measure SQL statement count for a 40-student class-record update before/after.

### Completion condition

The same scores, event, audit data, permissions, and API result are produced with bounded database writes rather than one concurrent statement per student.

---

## 2. Replace per-status user counts with one grouped aggregate

**Priority:** P2  
**Subsystem:** backend / users  
**Category:** repeated aggregate queries

### Exact location and evidence

- `backend/src/modules/users/users.service.ts`, `getStatusCounts` (around lines 449–475).
- It iterates through `VALID_STATUSES` and executes one `COUNT(*)` query for each status.
- When filtering by role, each count repeats the same role subquery.

### Scale context

**Expected structure:** this changes approximately `T` aggregate queries to one grouped aggregate. With the current status set, the exact savings is `T - 1` count queries per request; the role subquery is also built once rather than repeated.

### Best implementation

1. Build the optional role subquery once.
2. Query `users.status, COUNT(*)` grouped by `users.status`, with that optional role restriction.
3. Convert returned rows into a map and project every `VALID_STATUSES` entry so absent statuses remain `0`.
4. Preserve the current object keys, role-filter semantics, and `includeStatusCounts` behavior.

### Dependencies

- `VALID_STATUSES` and `UserStatus` in `users.service.ts`.
- `userRoles` and `roles` schema relations used by the existing filter.
- User list/admin dashboard callers consuming the count object.

### Cascading safeguards

- Do not group by role or return only statuses present in the database; consumers may expect zero-valued keys.
- Preserve the current role filter exactly, including users with multiple roles.
- Do not change pagination/list queries in the same PR; isolate the aggregate rewrite.

### Verification

- Add tests with every status, missing statuses, role-filtered users, and a multi-role user.
- Compare old and new results against a seeded database fixture.
- Run `npm test -- users.service.spec.ts --runInBand`, backend build, and non-mutating ESLint.

### Completion condition

All user status count responses are identical while the endpoint uses one aggregate query instead of one query per status.

---

## 3. Consolidate class standing snapshot reads

**Priority:** P1  
**Subsystem:** backend / classes  
**Category:** per-record query fan-out

### Exact location and evidence

- `backend/src/modules/classes/classes.service.ts`, `getLatestStandingSnapshot` (around lines 2273–2330).
- The method loads class records, then for each record separately loads categories, items, a final grade, and student scores.
- The loop ends only after it finds a usable record, so the worst case grows with the number of class records/grading periods.

### Scale context

**Expected structure:** the existing worst case performs roughly 3–4 reads per record plus a score read for each record that has items—about `4R` to `5R` reads. The proposed shape is a fixed set of reads (records, categories, items, final grades, scores), independent of `R`. For four grading-period records, this is roughly 16–20 reads versus about 5, before accounting for relation loading.

### Best implementation

1. Retain the current class-record ordering (`updatedAt`, then `createdAt`, descending).
2. Fetch all candidate record IDs once.
3. Fetch categories and items for those IDs in two queries, grouped in memory by `classRecordId`.
4. Fetch the student’s final grades for those record IDs in one query.
5. Fetch the student’s scores for all candidate item IDs in one query.
6. Reuse the existing standing computation and iterate records in their existing order using the grouped data.

### Dependencies

- `classRecords`, `classRecordCategories`, `classRecordItems`, `classRecordScores`, and `classRecordFinalGrades` schema definitions.
- `classes.service.spec.ts` standing-snapshot and student-class presentation coverage.
- Any teacher/student standing endpoint using this method.

### Cascading safeguards

- Preserve the first usable record selection exactly; this is not simply “newest grading period.”
- Preserve category-name normalization and weighting rules.
- Preserve absent-score behavior. An absent score must not become omitted data if it currently counts as zero.
- Select only the target student’s score/final-grade rows; do not load class-wide grade data.
- Do not persist the computed standing or add a cache.

### Verification

- Add fixtures with multiple records: no categories, incomplete scores, final grade present, and a later usable record.
- Assert output equality against the existing implementation for each fixture before removing old query code.
- Add query-count coverage proving a fixed query count regardless of record count.
- Run `npm test -- classes.service.spec.ts --runInBand`, backend build, and a student class-dashboard smoke.

### Completion condition

Standing output and grading semantics are unchanged, while query count no longer grows with class-record count.

---

## 4. Batch stale AI-job runtime persistence

**Priority:** P2  
**Subsystem:** ai-service  
**Category:** serialized background writes

### Exact location and evidence

- `ai-service/app/main.py`, stale AI-job recovery near lines 410–445.
- The database first marks all stale job IDs as failed in one `UPDATE ... WHERE id IN (...)`.
- It then loops through `stale_ids` and awaits `_persist_ai_job_runtime(...)` once per ID.

### Scale context

**Expected structure:** one durable status update already exists; the follow-up persistence is `J` sequential operations. A valid batch helper reduces durable follow-up writes to one while retaining `J` lightweight in-memory map updates. This is most valuable after outages or timeouts that create many stale jobs at once.

### Best implementation

1. Inspect `_persist_ai_job_runtime` to determine whether it writes database state, process-local state, or both.
2. Extract a `persist_ai_job_runtime_batch(db, job_ids, runtime_patch)` helper only if all stale jobs receive the same patch shape.
3. Use one database update for durable runtime metadata where the schema supports it.
4. Update `AI_JOB_RUNTIME` in memory with a simple local loop after the durable write; do not make process-local state authoritative.
5. Preserve the current status, error message, timestamp field, and logging behavior.

### Dependencies

- `_persist_ai_job_runtime`, `AI_JOB_RUNTIME`, `AI_JOB_TASKS`, and orphaned-job recovery in `ai-service/app/main.py`.
- AI job status routes and backend proxy handling.
- `ai-service/tests/test_ai_job_runtime.py`.

### Cascading safeguards

- The `ai_generation_jobs` table remains the source of truth.
- Do not change stale timeout duration or retry policy in this refactor.
- Do not use `asyncio.gather` on a single shared `AsyncSession` for parallel writes.
- Preserve recovery if a process restarts and has no matching in-memory task map.

### Verification

- Test zero, one, and many stale jobs.
- Assert every job is failed with the same existing error message and runtime patch.
- Assert an injected persistence failure does not leave in-memory state claiming success.
- Run `python -m unittest tests.test_ai_job_runtime` and the full AI test suite inside `ai-service/.venv`.

### Completion condition

Stale-job recovery preserves all visible status/runtime data with one durable batch write instead of one awaited persistence call per job.

---

## 5. Batch remedial concept-mastery upserts when touching the remedial flow

**Priority:** P3  
**Subsystem:** ai-service / remedial  
**Category:** small serialized write loop

### Exact location and evidence

- `ai-service/app/remedial_service.py`, near lines 875–900.
- The service upserts one `student_concept_mastery` row per concept in `list(concept_counts.items())[:8]`.
- The loop is capped at eight rows, so the absolute impact is small.

### Scale context

**Expected structure:** this changes at most `C` (maximum 8) sequential writes to one executemany call. It is a cleanup rather than a primary latency target.

### Best implementation

Convert the prepared concept rows to an executemany parameter list and execute the same `INSERT ... ON CONFLICT DO UPDATE` statement once.

### Dependencies and safeguards

- Preserve the eight-concept cap and current concept ordering.
- Preserve `evidence_count`, `error_count`, `mastery_score`, and timestamps exactly.
- Keep recommendation generation and its read-only academic boundary unchanged.
- Do not prioritize this ahead of Findings 1–4; it is a cleanup to bundle with remedial work.

### Verification

- Add tests for zero, one, and eight concepts plus conflict-update behavior.
- Run `python -m unittest tests.test_remedial_service` inside the virtual environment.

### Completion condition

Concept mastery values remain identical with one database execution for the capped concept set.

---

## 6. Move indexing backfills to a tracked queue — decision-gated

**Priority:** P2 operational  
**Subsystem:** backend + ai-service  
**Category:** request-held long-running work

### Exact location and evidence

- `ai-service/app/main.py`, `/internal/index/backfill` around lines 2800–2829: serially reindexes every active class inside one request.
- `ai-service/app/library_indexing_pipeline.py`, `backfill_library_files` around lines 341–368: serially indexes every eligible file inside one request.
- Existing backend queue boundaries: `backend/src/modules/rag` and `backend/src/modules/file-upload/library-indexing.service.ts`.

### Required product/operations decision

Before implementation, choose:

- Whether callers receive `202 Accepted` with a job ID instead of a completed results array.
- Where progress, retries, cancellation, and failure diagnostics are displayed.
- Whether rerunning a backfill deduplicates by source/version and how stale jobs are handled.

### Escalation trigger and open design questions

Do not migrate this endpoint merely because it is long-running. Escalate it to a queue design when any one of the following is observed in a reproducible environment or production telemetry:

- A backfill request exceeds 30 seconds or the configured proxy/request timeout.
- A run contains more than 10 classes or 25 library files.
- Operators need to retry a failed subset instead of rerunning the entire backfill.
- Concurrent backfills contend for the configured AI/database capacity or cause user-facing index requests to time out.

The required design answers are: which principal may start/cancel a job, whether `202` replaces the current completed-result response, where progress is persisted, what key deduplicates a class/file reindex, and which worker concurrency is safe for the configured database and embedding provider.

### Proposed implementation after approval

1. Add a dedicated BullMQ queue/job type owned by backend.
2. Make the internal endpoint enqueue work and return the existing envelope with `{ jobId, status: 'queued' }`.
3. Let the worker invoke existing single-class/file internal AI routes with existing shared-secret headers.
4. Persist job progress and failures in the established AI-job/runtime model or a new explicit indexing-job model.
5. Add status/cancel endpoints only after the contract is specified for web/mobile/admin consumers.

### Cascading safeguards

- Do not expose internal AI routes directly to clients.
- Do not execute multiple reindexes concurrently until database pool, embedding provider, and Ollama/cloud limits are measured.
- Preserve reindex idempotency and prevent duplicate jobs from racing on the same class/file.
- Treat this as a contract/operational change; use `contract-change-orchestrator` and `queue-ai-pipeline-auditor` before coding.

### Completion condition

Backfills no longer hold an HTTP request open, and operators can reliably observe, retry, and diagnose each unit of indexing work.

---

## Global verification gate

Run the narrowest checks for each item, then the affected subsystem gates:

```bash
cd backend && npm run build
cd backend && npx eslint "{src,apps,libs,test}/**/*.ts"
cd mobile && npm run typecheck
cd ai-service && ./.venv/bin/python scripts/run_tests.py
cd ai-service && ./.venv/bin/python -c "from app.main import app; print(app.title)"
```

For any query rewrite, add a query-count/integration assertion before claiming a performance gain. Never present estimated percentage improvements as measured results.

## Explicitly excluded from this round

- Increasing BullMQ, database-pool, HTTP, or embedding concurrency — protected by the capacity safeguards in Finding 6 and `AI-2`.
- Cache tables, stored derived values, or persisted eligibility flags — protected by `DATA-1` and `DATA-2`.
- Broad LXP/intervention logic rewrites — protected by `DOM-1`, `DOM-3`, `INT-1`, and `INT-2`.
- Changing grades, assessment attempts, or audit behavior — protected by `REC-1`, `AUD-1`, and the semantic-equivalence safeguards in Findings 1 and 3.
- Changing auth, API envelopes, or backend-to-AI headers — protected by `AUTH-1`, `AUTH-2`, `RESP-1`, `AI-1`, and `AI-3`.
