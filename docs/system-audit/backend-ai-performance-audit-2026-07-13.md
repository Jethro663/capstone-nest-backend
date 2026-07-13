# Repo-wide Performance and Architecture Audit

## Audit Summary

- Scope: `backend`, `ai-service`, `next-frontend`, `mobile`, and infrastructure/CI
- Date: `2026-07-13`
- Repo: `capstone-nest-react-lms`
- Backend root: `backend`
- AI root: `ai-service`
- Findings recorded: `12`
- Severity counts: `{'high': 3, 'low': 1, 'medium': 8}`

## Baseline Findings

- Backend build passed in approximately 28 seconds; migration integrity passed with 4 linear active migrations.
- Backend unit suite passed: 76 suites and 1003 tests in approximately 26 seconds.
- Backend lint failed with 3 errors and 5225 warnings; the three errors are isolated to file-upload cleanup and one regex escape.
- AI service imports successfully with AI_RUNTIME_MODE=test, but scripts/run_tests.py does not declare that required test runtime itself.
- AI full suite was stopped after more than five minutes after asyncio reported that executor threads did not finish joining within 300 seconds.
- The isolated tests.test_backend_uploads module passes both tests but does not terminate within a 10-second timeout when both tests run in one process.
- Next.js production build was stopped after several minutes with no progress beyond optimized build creation.
- Frontend unit suite passed: 124 suites and 506 tests, but Jest reported open asynchronous handles and exited only after approximately 90 seconds.
- Frontend lint failed with 66 errors and 5 warnings, including two react-hooks/set-state-in-effect performance errors.
- Mobile typecheck passed in approximately 12 seconds and 25 suites / 160 tests passed in approximately 24 seconds.
- docker compose config --quiet passed. No services or stateful runtime were started.

## Prioritized Findings

### 1. Student performance GET path recomputes and writes every class snapshot

- Priority: `P1`
- Severity: `high`
- Subsystem: `backend/performance`
- Category: `read-path-write-amplification`
- Files: backend/src/modules/performance/performance.service.ts:603, backend/src/modules/performance/performance.service.ts:1956
- Rationale: A student opening the summary causes per-class recomputation instead of reading the already-persisted snapshots. Cost and write contention scale with enrollment count, and the GET path can emit domain events and logs.
- Evidence: getStudentOwnSummary maps every active enrollment through recomputeStudent. Each recomputation performs two component reads sequentially, reads the existing snapshot, updates or inserts it, and may read intervention state and write a performance log.
- Expected impact: Make the common read path predictable and reduce database reads, writes, lock pressure, duplicate events, and latency fan-out.
- Verification target: Add a query-count regression test for getStudentOwnSummary and prove the common path is read-only; preserve event-driven snapshot refresh tests.
- Status: `candidate`

### 2. AI process lifecycle owns untracked background work and leaks during tests

- Priority: `P1`
- Severity: `high`
- Subsystem: `ai-service/orchestration`
- Category: `async-lifecycle`
- Files: ai-service/app/main.py:3390, ai-service/app/main.py:4390, ai-service/app/backend_uploads.py:66, ai-service/tests/test_backend_uploads.py:8
- Rationale: Untracked create_task extraction work is lost on restart and is not awaited or cancelled at shutdown. The test process also reproduces a stuck executor teardown, making failures expensive and CI unreliable.
- Evidence: Two extraction routes schedule _run() with create_task while newer intervention, quiz, and lesson-plan flows explicitly delegate execution to BullMQ. Full tests emitted an executor thread join warning after 300 seconds; tests.test_backend_uploads passed assertions but did not terminate within 10 seconds when run as a module.
- Expected impact: Reliable shutdown, bounded concurrency, restart-safe extraction jobs, faster tests, and one consistent backend-owned queue model.
- Verification target: A targeted extraction queue contract test, shutdown test with no pending tasks/threads, and an AI suite timeout below a documented threshold.
- Status: `candidate`

### 3. Critical CI workloads have no timeout despite reproducible hangs

- Priority: `P1`
- Severity: `high`
- Subsystem: `ci/frontend/ai-service`
- Category: `verification-reliability`
- Files: .github/workflows/ci.yml:25, .github/workflows/ci.yml:92, .github/workflows/ci.yml:132, next-frontend/package.json:14, ai-service/scripts/run_tests.py
- Rationale: A hanging build or test can consume a runner until the platform default timeout, delaying feedback and hiding the actual failing subsystem.
- Evidence: Frontend build remained at optimized build creation for several minutes; frontend Jest reported open handles; AI tests exceeded five minutes. The corresponding CI jobs have no timeout-minutes guard.
- Expected impact: Fail-fast feedback, bounded machine usage, and clearer separation of code failures from lifecycle failures.
- Verification target: CI jobs terminate at explicit subsystem budgets and upload the last diagnostic output on timeout.
- Status: `candidate`

### 4. Class-record writes and section reads fan out per row or class

- Priority: `P1`
- Severity: `medium`
- Subsystem: `backend/class-record`
- Category: `database-fan-out`
- Files: backend/src/modules/class-record/class-record.service.ts:768, backend/src/modules/class-record/class-record.service.ts:1084
- Rationale: Bulk score updates launch one upsert per student without a concurrency bound, while adviser-section results issue one query per class. Larger sections multiply database round trips and pool pressure.
- Evidence: bulkRecordScores uses Promise.all over dto.scores with an individual insert/on-conflict query; listAdviserSection uses Promise.all over class IDs with an individual classRecords query.
- Expected impact: Fewer round trips, bounded pool usage, and more atomic bulk updates.
- Verification target: Existing class-record performance specs plus query-count assertions for representative section sizes and atomicity tests.
- Status: `candidate`

### 5. Academic rollover clones nested assets through long serial insert loops

- Priority: `P2`
- Severity: `medium`
- Subsystem: `backend/academic-state`
- Category: `long-transaction-serialization`
- Files: backend/src/modules/academic-state/academic-state.service.ts:494
- Rationale: The rare workflow is allowed to be slower than requests, but nested assessment, question, lesson, module, and section inserts can create a very long transaction and hold locks as content volume grows.
- Evidence: cloneClassLearningAssets contains nested for/await insert sequences for assessments/questions/options and lessons/blocks, plus serial module and section inserts. The module has no nearby spec in the inventory.
- Expected impact: Shorter rollover transactions and a clear scaling ceiling without changing academic semantics.
- Verification target: Fixture-based rollover benchmark at small/medium/large content volumes, rollback test, and exact cloned-count assertions.
- Status: `candidate`

### 6. Frontend effects and timeout races create avoidable render and handle pressure

- Priority: `P2`
- Severity: `medium`
- Subsystem: `next-frontend`
- Category: `client-lifecycle`
- Files: next-frontend/src/components/layout/SystemInfoButton.tsx:49, next-frontend/src/components/teacher/class-record/TeacherClassRecordWorkbook.tsx:219, next-frontend/src/providers/AuthProvider.tsx:69, next-frontend/src/lib/session-refresh.ts:10
- Rationale: State derived synchronously inside effects causes extra render passes, while Promise.race timers are not cancelled when the primary request wins. This is consistent with the open-handle warning from Jest.
- Evidence: ESLint flags synchronous setState in SystemInfoButton and TeacherClassRecordWorkbook. AuthProvider creates an uncancelled timeout for every current-user race; the frontend suite reports asynchronous operations left open.
- Expected impact: Cleaner render scheduling, fewer stale timers, faster test shutdown, and lower risk of state updates after navigation/unmount.
- Verification target: Targeted component/provider tests under fake timers, eslint clean for production files, and Jest exits without the open-handle warning.
- Status: `candidate`

### 7. Several subsystem boundaries have collapsed into multi-thousand-line owners

- Priority: `P2`
- Severity: `medium`
- Subsystem: `cross-repo architecture`
- Category: `extension-risk`
- Files: backend/src/modules/lxp/lxp.service.ts, backend/src/modules/assessments/assessments.service.ts, backend/src/modules/ai-mentor/ai-mentor.controller.ts, ai-service/app/main.py, next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/page.tsx
- Rationale: Adding one feature requires editing giant orchestration owners with many unrelated responsibilities, which magnifies merge conflicts and the chance that a local edit changes distant behavior.
- Evidence: Largest owners include lxp.service.ts at 6352 lines, assessments.service.ts at 5350, ai-mentor.controller.ts at 2844, AI main.py at 5420 with more than 50 route decorators, and the teacher class page at 4453 with 15 effect callbacks.
- Expected impact: Smaller blast radii, clearer ownership, targeted tests, and safer incremental extension.
- Verification target: Characterization tests around extracted boundaries; no route, DTO, response-envelope, or authorization changes during decomposition.
- Status: `candidate`

### 8. Large lint baselines obscure new correctness and performance signals

- Priority: `P2`
- Severity: `medium`
- Subsystem: `quality-gates`
- Category: `signal-to-noise`
- Files: backend/eslint.config.mjs, next-frontend/eslint.config.mjs, .github/workflows/ci.yml:25
- Rationale: Thousands of existing warnings and advisory lint jobs make it difficult to distinguish a newly introduced unsafe access, empty cleanup path, or React performance error from historical debt.
- Evidence: Backend lint reports 5228 findings and frontend lint reports 71. CI intentionally continues on lint error for both subsystems.
- Expected impact: Prevent new debt immediately while paying down old debt in bounded waves rather than attempting a destabilizing all-at-once cleanup.
- Verification target: Diff-aware lint gate or frozen baseline count, then per-module cleanup with build/tests after each wave.
- Status: `candidate`

### 9. Storage cleanup failures are silently discarded

- Priority: `P2`
- Severity: `medium`
- Subsystem: `backend/file-upload`
- Category: `resource-leak-observability`
- Files: backend/src/modules/file-upload/file-upload.service.ts:383, backend/src/modules/file-upload/storage/storage.service.ts:112
- Rationale: S3 migration/upload succeeds even if the local file cannot be deleted, but the failure is invisible and can accumulate disk usage over time.
- Evidence: Both saveFileRecord and saveUploadedFile use empty catch blocks around fs.promises.unlink; these are two of the three backend lint errors.
- Expected impact: Detectable cleanup failures and bounded local disk growth without failing an otherwise successful remote upload.
- Verification target: Mock unlink failure, assert a structured warning/metric, and preserve successful upload response semantics.
- Status: `candidate`

### 10. Mobile scope documentation contradicts the implemented role architecture

- Priority: `P2`
- Severity: `medium`
- Subsystem: `mobile/repo-guidance`
- Category: `instruction-drift`
- Files: mobile/AGENTS.md:1, mobile/src/navigation/AppNavigator.tsx, mobile/src/navigation/teacher-route-manifest.ts, mobile/src/navigation/role-resolver.ts
- Rationale: Future agents are instructed to preserve a student-only app even though teacher/admin role resolution and teacher navigation are live. That can cause valid code to be removed or audits to miss half the app.
- Evidence: mobile/AGENTS.md states the app is student-scoped; AppNavigator exposes TeacherNavigator/TeacherTabs and resolveMobileRole returns admin, teacher, or student.
- Expected impact: Correct routing of future maintenance work and explicit ownership for role-specific mobile surfaces.
- Verification target: Update the product/slice contract after a user decision and keep role-resolution plus navigation manifest tests green.
- Status: `candidate`

### 11. Runtime dependencies emit deprecation warnings in verified test paths

- Priority: `P3`
- Severity: `low`
- Subsystem: `dependency-lifecycle`
- Category: `dependency-drift`
- Files: backend/src/common/logger/winston.config.ts, ai-service/requirements.in, ai-service/requirements.txt
- Rationale: Warnings are not current failures, but leaving them unresolved increases upgrade risk and hides more useful diagnostics.
- Evidence: Backend tests report a legacy Winston transport warning for LokiTransport; AI tests report Starlette TestClient deprecation for the installed httpx integration.
- Expected impact: Cleaner diagnostics and less disruptive future upgrades.
- Verification target: Isolated dependency compatibility branches with full affected-subsystem suites; do not mix these upgrades into performance fixes.
- Status: `candidate`

### 12. High-consequence modules lack nearby characterization specs

- Priority: `P2`
- Severity: `medium`
- Subsystem: `test-coverage`
- Category: `cascade-risk`
- Files: backend/src/modules/academic-state, backend/src/modules/analytics, backend/src/modules/audit, backend/src/modules/rag, backend/src/modules/teacher
- Rationale: The safest way to reduce giant services and batch database work is to lock behavior first; missing module-local specs make even small refactors harder to prove.
- Evidence: The inventory reports zero specs for academic-state, analytics, audit, rag, teacher, and additional small modules despite rollover, reporting, and AI boundary responsibilities.
- Expected impact: Safer staged refactors and lower probability that a one-line change cascades through academic or AI flows.
- Verification target: Characterization tests for public service methods and contract-focused tests before refactoring each uncovered module.
- Status: `candidate`

## Actual Edits

- No application, configuration, workflow, or test code was changed.
- Only dated audit artifacts were added under docs/system-audit/.

## Verification Run

- python3 .agents/skills/backend-ai-performance-remediator/scripts/discover_targets.py
- backend: npm run build (passed)
- backend: npx --no-install eslint "{src,apps,libs,test}/**/*.ts" (failed: 3 errors, 5225 warnings)
- backend: npm test -- --runInBand (passed: 76 suites, 1003 tests)
- ai-service: env AI_RUNTIME_MODE=test .venv/bin/python -c "from app.main import app; print(app.title)" (passed)
- ai-service: env AI_RUNTIME_MODE=test .venv/bin/python scripts/run_tests.py (stopped after executor shutdown warning and more than five minutes)
- ai-service: timeout 10s env AI_RUNTIME_MODE=test .venv/bin/python -m unittest tests.test_backend_uploads -v (assertions passed, process timed out during teardown)
- next-frontend: npm run build (stopped after several minutes without progress)
- next-frontend: npm run lint (failed: 66 errors, 5 warnings)
- next-frontend: npm test -- --runInBand (passed: 124 suites, 506 tests; open-handle warning)
- mobile: npm run typecheck (passed)
- mobile: npm test -- --runInBand (passed: 25 suites, 160 tests)
- docker compose config --quiet (passed)

## Before vs After

### Improved

- No runtime behavior was changed during this evidence-only audit.

### Stayed The Same

- Backend build, backend tests, frontend tests, mobile typecheck/tests, and Compose configuration remain green.
- The pre-existing dirty worktree was preserved.

### Remaining Risks

- Student performance reads still write and fan out per class.
- AI and frontend lifecycle checks can hang without explicit process budgets.
- Database bulk paths remain row-oriented or class-oriented.
- Large architectural owners and uncovered modules keep change blast radius high.
- Lint debt and mobile instruction drift remain unresolved.

## Second-Pass Clean Check

- No application source was edited, so backend/API envelopes, auth behavior, and AI proxy contracts were not changed.
- Findings distinguish reproduced failures from reasoned structural risk.
- Recommendations are staged: characterization and measurement first, bounded local changes second, contract or architecture migrations only with explicit gates.
- No service stack, database mutation, queue job, package install, or dependency upgrade was performed.
