# Backend + AI Performance Audit

## Audit Summary

- Date: `2026-04-16`
- Repo: `capstone-nest-react-lms`
- Backend root: `backend`
- AI root: `ai-service`
- Findings recorded: `6`
- Severity counts: `{'high': 5, 'medium': 1}`

## Baseline Findings

- Inventory captured for all 31 backend modules and 22 ai-service app files via .agents/skills/backend-ai-performance-remediator/scripts/discover_targets.py.
- Backend baseline: `npm run build` passed in approximately 51s.
- Backend baseline: non-mutating `npx eslint "{src,apps,libs,test}/**/*.ts"` failed in approximately 67s with substantial pre-existing type-safety and test-mock lint debt, so lint is not a clean regression gate for this audit run.
- AI baseline: `python scripts/run_tests.py` passed 35 tests in 0.681s.
- AI baseline: `python -c "from app.main import app; print(app.title)"` passed and reported `Nexora AI Service`.

## Prioritized Findings

### 1. Performance diagnostics read the global incorrect-response table then filter in memory

- Priority: `P1`
- Severity: `high`
- Subsystem: `backend`
- Category: `overfetching`
- Files: backend/src/modules/performance/performance.service.ts
- Rationale: The diagnostics path is on a teacher-facing request surface and currently pays database and heap cost proportional to all incorrect responses, not just the requested class or student.
- Evidence: In `buildPerformanceDiagnostics`, the query at lines 805-840 fetches every `assessmentResponses` row where `isCorrect = false`, then lines 842-848 discard rows whose attempt does not match the target class or optional student.
- Expected impact: Reducing the query to the target class and student should materially lower diagnostics latency and memory pressure as response history grows.
- Verification target: Targeted performance service diagnostics coverage plus backend build; compare diagnostics latency on a populated class.
- Status: `fixed`

### 2. Class summary serializes missing snapshot recomputation on the read path

- Priority: `P1`
- Severity: `high`
- Subsystem: `backend`
- Category: `serialized-awaits`
- Files: backend/src/modules/performance/performance.service.ts
- Rationale: Cold or partially-populated performance summaries slow down linearly with class size because each missing snapshot is recomputed one after another before the summary can return.
- Evidence: Lines 483-530 in `buildClassRows` loop over every enrolled student and await `recomputeStudent` sequentially for missing snapshots; `getClassSummary` calls this method directly at lines 596-598. The same service already has a parallel helper in lines 427-439 (`recomputeStudentsForClass`) that uses `Promise.all`.
- Expected impact: Reusing bounded parallel recomputation or a batched preload path should reduce cold-summary latency for larger classes without changing the snapshot contract.
- Verification target: Performance service summary specs plus backend build; approximate before-vs-after timing on a class with many missing snapshots.
- Status: `fixed`

### 3. Extraction renders vision images for every PDF before deciding whether vision extraction is needed

- Priority: `P1`
- Severity: `high`
- Subsystem: `ai-service`
- Category: `unnecessary-recomputation`
- Files: ai-service/app/extraction_pipeline.py
- Rationale: Rendering page images is one of the heaviest extraction steps, but it runs even for text-rich PDFs that never enter the vision branch.
- Evidence: Lines 1603-1607 open the PDF, extract pages and embedded images, then call `_render_pdf_pages_to_images(doc)` unconditionally. The rendered `vision_images` are only consumed inside the `if uses_vision_extraction:` branch beginning at line 1618.
- Expected impact: Deferring page-image rendering until the vision branch should lower extraction CPU, memory use, and wall-clock time for the common text-first path.
- Verification target: Extraction pipeline tests plus AI import/startup sanity; compare approximate extraction time on a text-rich PDF.
- Status: `fixed`

### 4. Diagnostics fan out into per-concept reads and per-student mastery upserts

- Priority: `P2`
- Severity: `high`
- Subsystem: `backend`
- Category: `redundant-queries`
- Files: backend/src/modules/performance/performance.service.ts
- Rationale: After the initial diagnostics read, the service issues extra SQL inside loops for each top concept and again for each student-concept pair, which scales poorly on classes with broad mistake distributions.
- Evidence: Lines 917-926 execute a `content_chunks` lookup once per concept in `conceptsSorted`, and lines 945-971 perform nested `INSERT ... ON CONFLICT` writes to `student_concept_mastery` for every student/concept combination.
- Expected impact: Batching evidence lookups and mastery writes would reduce query chatter and make the diagnostics path less sensitive to class size and concept cardinality.
- Verification target: Targeted diagnostics tests plus backend build; inspect query count on a seeded diagnostics run.
- Status: `candidate`

### 5. Extraction and indexing flows perform large row-by-row writes and synchronous reindex work before returning

- Priority: `P2`
- Severity: `high`
- Subsystem: `ai-service`
- Category: `blocking-request-path`
- Files: ai-service/app/main.py, ai-service/app/indexing_pipeline.py, ai-service/app/library_indexing_pipeline.py, ai-service/app/quiz_generation_service.py
- Rationale: Teacher and internal indexing flows spend most of their time in repeated single-row inserts and then wait for a full class reindex synchronously, which increases tail latency and holds database sessions open for long stretches.
- Evidence: In `apply_extraction`, lines 2922-2939 insert lesson blocks one row at a time, lines 3019-3072 insert each assessment question one at a time, lines 3075-3101 insert options one at a time, and line 3134 waits for `reindex_class_content` before responding. `reindex_class_content` in `indexing_pipeline.py` inserts every content chunk one-by-one at lines 470-477, and `index_library_file` in `library_indexing_pipeline.py` does the same for library chunks at lines 187-209. `quiz_generation_service.py` repeats the row-by-row question and option inserts at lines 548-608.
- Expected impact: Using executemany-style inserts or SQLAlchemy bulk execution and moving the post-apply reindex behind a job boundary would shrink request latency and database round trips.
- Verification target: Extraction/indexing targeted tests plus AI import/startup sanity; compare approximate apply-extraction and reindex durations on a representative payload.
- Status: `candidate`

### 6. Backfill indexing paths serialize whole workloads and repeat chunk construction

- Priority: `P2`
- Severity: `medium`
- Subsystem: `ai-service`
- Category: `maintenance-flow-waste`
- Files: ai-service/app/main.py, ai-service/app/indexing_pipeline.py, ai-service/app/library_indexing_pipeline.py
- Rationale: Administrative backfills are forced through single-item loops, and class reindexing rebuilds the same chunk collections twice just to compute count metadata.
- Evidence: `/internal/index/backfill` loops over every class and awaits `reindex_class_content` sequentially at lines 2137-2140 in `main.py`. `backfill_library_files` does the same for every uploaded file at lines 328-331 in `library_indexing_pipeline.py`. Inside `reindex_class_content`, lines 444-448 build lesson, extraction, and question chunks, then lines 464-466 call the same chunk builders again just to derive counts before embedding.
- Expected impact: Caching per-run chunk lists and adding bounded concurrency to maintenance-only backfills would reduce administrative wall-clock time without changing public contracts.
- Verification target: Internal indexing route smoke checks plus AI import/startup sanity; compare approximate backfill duration on a multi-class dataset.
- Status: `candidate`

## Actual Edits

- Scoped backend performance diagnostics at the initial `assessmentResponses` read by constraining `attemptId` through a submitted-attempt subquery joined to the target class and optional student.
- Changed backend class-summary row assembly to bulk recompute missing snapshots with `recomputeStudentsForClass` and then re-read persisted snapshots instead of serial per-student recomputes on the response path.
- Changed AI extraction to render PDF page images only when the vision extraction branch is actually selected for low-text PDFs.
- Added backend regression tests for diagnostics query scoping and bulk snapshot recomputation, plus an AI extraction runtime regression test proving text-rich PDFs skip page rendering.

## Verification Run

- Inventory: `python .agents/skills/backend-ai-performance-remediator/scripts/discover_targets.py`
- Backend baseline: `npm run build`
- Backend baseline: `npx eslint "{src,apps,libs,test}/**/*.ts"`
- AI baseline: `python scripts/run_tests.py`
- AI baseline: `python -c "from app.main import app; print(app.title)"`
- Static hotspot scan: oversized-file, loop-plus-await, and call-site searches via `rg` and targeted file reads
- Backend targeted verification after edits: `npm test -- performance.service.spec.ts`
- Backend structural verification after edits: `npm run build`
- AI targeted verification after edits: `python -m unittest ai-service.tests.test_extraction_pipeline`
- AI structural verification after edits: `python scripts/run_tests.py`
- AI import/startup verification after edits: `python -c "from app.main import app; print(app.title)"`

## Before vs After

### Improved

- Performance diagnostics no longer start from the global incorrect-response set; the initial backend read is now constrained to submitted attempts in the requested class and optional student scope.
- Cold class summaries no longer recompute missing snapshots one-by-one inside `buildClassRows`; they reuse the existing bulk recompute helper and then read the refreshed snapshot set.
- Text-rich PDF extractions no longer pay the cost of page-image rendering before the pipeline decides whether the vision branch is needed.

### Stayed The Same

- Backend build remained green and AI tests/import remained green.
- Backend lint remains noisy due to existing unrelated violations, so post-fix verification should favor build plus targeted tests unless lint debt is cleaned first.

### Remaining Risks

- The heaviest backend and AI orchestration files remain large and will continue to attract duplicate logic until some flows are split out behind narrower helpers.
- Because no benchmark harness exists for these routes, several impacts are reasoned from query shape and control flow rather than measured with a dedicated latency suite.

## Second-Pass Clean Check

- Re-scanned the touched backend and AI files plus their direct regression tests after verification: `performance.service.ts`, `performance.service.spec.ts`, `extraction_pipeline.py`, and `test_extraction_pipeline.py`.
- Confirmed the implemented fixes stay within existing contracts: controller/service boundaries are unchanged, response envelopes are unchanged, and no official academic-record write path or auth surface was broadened.
- Confirmed the new backend query scope and bulk snapshot refresh do not move the original work elsewhere on the same request path, and the AI extraction guard simply defers an expensive step until the existing vision branch is chosen.
