# Teacher Frontend Fix Plan

## Status

Frontend and authorization items from the approved systemic-tighten scope are complete. One backend Performance diagnostics defect remains open and is intentionally not hidden by the UI.

## Delivered Work

### Academic-state read contract

- Granted Teachers read-only access to `GET /api/academic-state/current`.
- Kept impact preview and transition Admin-only.
- Added role-metadata tests and live Teacher `200`/Student `403` evidence.
- Kept editor quarter and publish behavior locked to verified backend state.

### Assessment editor reliability and hierarchy

- Added explicit quarter verification states and retry behavior.
- Added class-record workbook preflight before slot overview requests.
- Replaced missing-resource noise with setup guidance.
- Tightened the workbar while retaining save, preview, publish, scoring, warning, and keyboard behavior.

### Collection and partial-failure states

- Separated rejected, empty, and content states on Assessments, Calendar, Class Record, and Lessons.
- Preserved already loaded Class Record content across refresh failures.
- Scoped Performance diagnostics failure without blanking healthy panels.

### Safe recovery and role mismatch

- Added shared safe dashboard recovery and removed raw exception rendering.
- Redirected mismatched Teachers to their own home without logout or foreign content.

## Remaining Backend Remediation

### Correct Performance diagnostics upsert SQL

- Owner: `backend-performance`
- Source area: `backend/src/modules/performance/performance.service.ts`
- Problem: seeded `GET /api/performance/classes/:id/diagnostics` returns HTTP `500` from the concept-mastery conflict update.
- Fix intent: correct the Drizzle expression/reference without changing the public response contract.
- Verification:
  1. add a regression test that executes the conflicting update path;
  2. run it against PostgreSQL/pgvector, not a mock-only substitute;
  3. prove the seeded diagnostics endpoint returns `200`;
  4. rerun `multi-role-systemic-tighten.spec.ts` with the diagnostics allowlist removed;
  5. retain the scoped unavailable/retry UI as defense in depth.

No backend SQL change was made in this frontend-focused pass because the approved design explicitly kept that remediation independently owned.

## Verification Completed

- Academic-state backend tests: `2/2` passed.
- Assessment editor focused suite: `20/20` passed after the workbook-preflight regression was added.
- Full frontend Jest gate: `138` suites and `577` tests passed.
- Frontend lint: `0` errors and `5` pre-existing warnings.
- Frontend production build: passed with `66` pages.
- Backend build: passed with migration integrity reporting `4` migrations.
- Integrated Chromium gate: `10/10` passed; only the documented diagnostics failure was allowed.
- Responsive matrix: Class Record and editor had no document overflow at 390 px, 768 px, or 1280 px.
- Keyboard sweep: changed primary, filter, segmented, retry, and help controls showed a visual focus indicator.
