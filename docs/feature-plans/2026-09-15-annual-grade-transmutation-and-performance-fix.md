# Annual Grade Transmutation and Performance Analyze Implementation Plan

**Date:** 2026-09-15

**Status:** Direction A approved and implemented; release verification pending

**Evidence source:** `docs/feature-analysis/2026-09-15-annual-grade-transmutation-and-performance-analysis.md`

## 1. Decision summary and feature brief

Implement two isolated repairs in one bounded release:

1. Calculate an active-school-year official annual grade as `half-up round(sum of complete official period grades ÷ period count)`, then resolve that whole number through the exact active admin Transmutation Table. Persist a new immutable annual version whenever its source components, frozen quarter policy, or active-table computation changes.
2. Repair teacher Performance Analyze by generating PostgreSQL-valid, unqualified target and `excluded` column references in the existing `student_concept_mastery` upsert. Keep the existing monotonic merge behavior and prevent raw SQL from reaching teachers.

Direction A was approved by the user on 2026-09-15. Implementation and release verification follow this bounded plan.

## 2. Scope, non-goals, permissions, and assumptions

### In scope

- Annual calculation, snapshot, fingerprint, and active-year refresh owners in `backend/src/modules/academic-state/`
- Table validation/activation orchestration in `backend/src/modules/class-record/transmutation.service.ts` and its controller response
- Annual transition-readiness parity
- Existing teacher/admin web class-record surfaces and additive web/mobile contract typing
- The performance diagnostic mastery upsert, job error boundary, and teacher page failure state
- Focused unit/integration/frontend tests, builds, exact-SHA push, CI/deployment, and read-only/live acceptance checks
- One controlled, version-preserving reconciliation of the supplied active-year class after deployment

### Non-goals

- No change to quarterly scores, category weights, quarter transmutation, source selection, roster eligibility, remediation formula, promotion thresholds, or class-record finalization procedure.
- No mutation of `academic_year_policies` when an admin table changes.
- No closed-year annual recalculation and no in-place overwrite/deletion of historical annual rows.
- No new AI model, AI-service call, performance score formula, concept extraction rule, table/index migration, or LXP behavior.
- No mobile screen redesign or Android/iOS package release. Mobile consumes the corrected backend grade automatically; only additive type parity is allowed if required.
- No unrelated teacher dashboard, assessment, notification, or admin-settings work.

### Assumptions requiring approval

- “Active table” applies to annual official grades for every academic grade method in the **authoritative active school year**, including 2027-2028 `zero_based`; it does not replace each method’s quarterly policy.
- Calculation order is exactly `average → half-up whole-number round → active-table transmutation`.
- Table activation is rejected if its ranges do not resolve every integer from 0 through 100 exactly once.
- Closed years remain frozen even if a different table becomes active later.

## 3. Current-state evidence ledger

| Status | Evidence | Consequence |
|---|---|---|
| Confirmed | `calculateAnnualGrade` makes the rounded average the official grade. | Active bands cannot affect annual results. |
| Confirmed | Existing year policies are returned unchanged; only absent legacy policies inherit the active table. | Active-table changes are invisible to 2027-2028 annual calculation. |
| Confirmed | Annual fingerprints contain only base policy and components. | A table change cannot invalidate a current annual row. |
| Confirmed | Table activation only flips table rows and clears cache. | Existing annual rows remain current indefinitely. |
| Confirmed | Transition readiness independently repeats the same table-blind formula/fingerprint. | Fixing only annual creation would block or misclassify rollover. |
| Confirmed | Production target has 98, 96, 85, 70 → 87.25 → stored 87; active table maps 87 → 89. | The supplied defect is reproduced and Direction A has a concrete oracle. |
| Confirmed | The teacher web component renders backend `officialGrade`; it does not calculate 87. | The value defect is not a CSS/rendering bug. |
| Confirmed | Drizzle compiles the mastery merge to table-qualified target and `EXCLUDED` columns. | PostgreSQL rejects the Analyze job’s upsert. |
| Confirmed | Production unique index and data integrity are healthy; a valid unqualified `EXPLAIN` succeeds. | No schema/data repair is needed for Analyze. |
| Confirmed | Job status returns the stored Drizzle error and the page displays it verbatim. | Teachers receive a raw SQL log instead of a bounded recovery message. |

## 4. End-to-end impact and consumer map

```text
Admin table preview/apply/reactivate
  -> server validation
  -> academic transaction + active table switch
  -> active-year current annual rows
  -> old versions invalidated, exact new snapshot inserted, audits recorded
  -> annual web/mobile views + exports
  -> remediation/back-subject consistency
  -> year-transition readiness

Teacher Analyze
  -> performance job
  -> diagnostics and concept rows
  -> valid atomic mastery upsert
  -> diagnostic output/result panel
  -> bounded failure state if another internal error occurs
```

| Provider/interface | Consumers | Planned effect |
|---|---|---|
| Base `AcademicPolicy` | Quarterly calculation/readiness | Unchanged and still frozen per school year. |
| New annual transmutation snapshot/helper | Annual service and transition readiness | One canonical table-aware calculation and fingerprint. |
| `subjectAnnualGrades.policy` JSON | Web/mobile types, history, audits | Add optional annual table provenance; existing rows remain readable. |
| `AnnualGradesService.refreshForClass` | Finalization and admin source repairs | Newly created annual rows always use the current table for the active year. |
| Active-table apply/activate | Admin web/mobile clients | Add annual refresh summary without removing existing table fields. |
| Annual-summary route | Teacher web/mobile | GET remains read-only; add an explicit active-year refresh endpoint used by the target web tab to reconcile pre-release rows. |
| Transition evidence matrix | Academic rollover | Compare against the same table-aware fingerprint and official grade. |
| Mastery conflict-set helper | Performance diagnostics | Compile to valid PostgreSQL with unchanged max/max/min rules. |
| Job status error contract | Teacher performance page | Stable public message; internal detail retained in bounded logs. |

## 5. Conflicts, invariants, risks, and design options

### Preserved invariants

- Backend remains the authority for official academic grades and active table state.
- Every annual result still requires one current, trusted source for each policy period.
- Existing annual versions are append-only evidence. Recalculation invalidates the prior current row and preserves its components/policy.
- Changing an annual result invalidates dependent current remediation/back-subject evidence through the existing service path.
- The admin table action, annual versions, and audit entries succeed or roll back together.
- Performance mastery upserts remain atomic and idempotent under concurrent/repeated Analyze requests.
- Teachers cannot see SQL, bind parameters, stack traces, or database topology.

### Design options

| Option | Benefit | Cost/risk | Decision |
|---|---|---|---|
| A. Annual-only table snapshot + active-year versioning | One persisted official result across all consumers; preserves quarters and history. | Requires coordinated backend policy, activation, readiness, and additive UI/type work. | **Approved and implemented** |
| B. Client/read-time transmutation | Small diff and immediately visible. | Splits official values across UI, DB, exports, mobile, remediation, and rollover; no audit trail. | Rejected |
| C. Rewrite frozen year policy | Reuses existing policy field globally. | Can change quarterly calculations and historical evidence, violating the established policy boundary. | Rejected |

For Analyze, keep the current upsert with static identifiers. Select-then-write is rejected because it creates races; excluded-only overwrite is rejected because it changes current aggregation semantics.

### Principal risks and controls

| Risk | Control |
|---|---|
| Invalid/gapped/overlapping bands create an undefined official grade. | Server validation proves exactly one match for each rounded integer 0-100 before activation. |
| Annual service and transition readiness calculate differently. | Share the annual snapshot and fingerprint helpers; assert the same 87→89 oracle in unit and integration tests. |
| Active-table switch partially commits while annual refresh fails. | Wrap table switch, versioning, dependent invalidation, and audit in `AcademicMutation` transaction/advisory lock. |
| Thousands of annual rows create a long transaction. | Process deterministic bounded batches, use bulk inserts/audit, and run the existing opt-in school-sized fixture before release. |
| Old annual rows lack new provenance. | Make snapshot metadata optional for compatibility; explicit active-year refresh versions old current rows. Closed history remains readable. |
| A teacher refresh mutates a closed year. | Refresh endpoint checks authoritative state and performs writes only for its active school year; GET stays read-only. |
| Performance fix silently alters counts. | Compile-test exact SQL and integration-test max/max/min conflict semantics. |
| Raw internal errors remain exposed. | Separate logged internal cause from public job status; frontend renders stable retry guidance. |

## 6. Recommended architecture, data flow, security, and error behavior

### Canonical annual snapshot

Add an annual-specific, backward-compatible policy snapshot type under the academic-state owner:

```text
basePolicy: existing frozen AcademicPolicy
annualTransmutation:
  tableId
  title
  updatedAt
  bands [{ minInitialGrade, maxInitialGrade, transmutedGrade }]
```

Store that snapshot in the existing `subject_annual_grades.policy` JSON. No database column or migration is required. Existing policy JSON remains valid because `annualTransmutation` is optional on reads; every newly computed active-year annual row must include it.

Central pure helpers will:

1. normalize/sort and validate an exact table snapshot;
2. calculate sum, divisor, raw average, rounded average, transmuted official grade, and remarks;
3. build the SHA-256 fingerprint from the complete annual policy snapshot and ordered source components.

The fingerprint remains a state-change detector, not a security credential.

### Active-table orchestration

- Move/reuse the current default table constant through a neutral pure helper so table administration and annual calculation have one fallback.
- `applyTable` and `activateTableById` validate server-side and execute as academic mutations.
- After selecting the candidate table, call an annual-service method scoped to `AcademicPolicyService.currentState().schoolYear`.
- Recalculate current annual rows in deterministic batches. Rows whose new fingerprint is unchanged remain untouched; changed rows use existing invalidation/dependent-evidence handling before bulk insertion and audit.
- Return existing table fields plus additive `annualRefresh: { schoolYear, classesScanned, gradesUpdated, gradesUnchanged, gradesBlocked, durationMs }`.
- The admin web page requires confirmation that active-year official annual grades will be re-evaluated, blocks invalid previews, and reports the returned counts. Historical table reactivation gets the same confirmation.

### Existing-row reconciliation and teacher presentation

- Add `POST /class-record/by-class/:classId/annual-summary/refresh` for Teacher/Admin. It verifies current access, refreshes only if the class belongs to the authoritative active year, and returns the same `AnnualSummary` envelope.
- The teacher web annual tab uses this explicit refresh operation, so the supplied pre-release 87 row becomes a new 89 version on first post-release annual load even if the active table itself is not toggled again.
- Keep the existing GET for read-only mobile/history compatibility.
- Show: `349 ÷ 4 = 87.250 → 87 rounded → 89 official`, followed by `TRANSMUTATION TABLE NEW`. History retains prior values and invalidation reasons.

### Performance SQL and error boundary

Extract a small conflict-set helper returning:

```sql
evidence_count = GREATEST(evidence_count, excluded.evidence_count)
error_count    = GREATEST(error_count, excluded.error_count)
mastery_score  = LEAST(mastery_score, excluded.mastery_score)
```

Static column identifiers are safe because they are source literals, not user input. Keep the three-column conflict target and `NOW()` timestamps. On worker failure, log a bounded event containing job ID, class ID, optional student ID, error class, and PostgreSQL cause; store/return a stable public message such as `Performance analysis could not be completed. Try again.` The page keeps the selected class/student and offers the existing Analyze action for retry.

## 7. Contract, schema, migration, and compatibility changes

| Area | Change |
|---|---|
| Annual formula | Active year uses average → half-up round → active-table transmutation. |
| Annual JSON snapshot | Optional additive `annualTransmutation` metadata within the existing policy JSON. |
| Fingerprint | Includes exact annual table snapshot plus existing base policy/components. |
| HTTP API | Add active-year annual refresh POST; add `annualRefresh` fields to apply/activate result while preserving table fields. |
| Admin request DTO | Replace controller `any[]` with validated band fields or equivalent explicit server validation. |
| Database migration | None expected. Existing tables/indexes support versioning and upsert. |
| Web types/UI | Add provenance/refresh result types and transparent calculation/activation states. |
| Mobile types | Mirror optional/additive fields only; no mobile screen or release artifact change. |
| Performance API | Preserve job routes/statuses; public `errorMessage` becomes stable and non-sensitive. |
| Compatibility | Old annual rows without provenance remain readable; GET route and existing table response fields remain valid. |

## 8. Ordered implementation phases with exact owners

### Phase 1 — annual calculation characterization (RED)

**Owners:**

- `backend/src/modules/academic-state/academic-policy.spec.ts`
- `backend/src/modules/academic-state/academic-policy.ts`

1. Add a failing pure test for Q1-Q4 `98,96,85,70`: raw 87.25, rounded 87, active-table official 89.
2. Add boundary cases for 0, passing threshold, 100, and a half-up average.
3. Add rejection cases for missing, overlapping, non-finite, out-of-range, and uncovered rounded bands.
4. Confirm legacy calls without an annual snapshot retain backward-compatible behavior only for reading/test fixtures; all active-year service writes must provide the snapshot.

```bash
npm --prefix backend test -- --runInBand src/modules/academic-state/academic-policy.spec.ts
```

### Phase 2 — annual snapshot and fingerprint seam (GREEN)

**Owners:**

- `backend/src/modules/academic-state/academic-policy.ts`
- new focused annual transmutation policy/provider file under `backend/src/modules/academic-state/`
- `backend/src/modules/academic-state/academic-policy.module.ts`
- `backend/src/drizzle/schema/academic-grading.schema.ts` (TypeScript JSON type only)

1. Define the annual table snapshot and result fields without changing the base quarterly policy.
2. Centralize default-band fallback, validation, calculation, and fingerprint construction.
3. Add a provider that reads one active table snapshot and builds the annual policy snapshot.
4. Export the provider from `AcademicPolicyModule` for annual service/readiness use.

### Phase 3 — annual persistence and readiness parity (RED/GREEN)

**Owners:**

- `backend/src/modules/academic-state/annual-grades.service.ts`
- `backend/src/modules/academic-state/annual-grades.service.spec.ts`
- `backend/src/modules/academic-state/academic-transition-readiness.ts`
- `backend/src/modules/academic-state/academic-transition-readiness.service.ts`
- relevant readiness unit tests and manual integration constructors

1. Add failing tests that a table snapshot changes the fingerprint and causes a new immutable annual version while unchanged context remains idempotent.
2. Make `refreshForClass` resolve the active table for the active year, calculate with the snapshot, and persist that snapshot.
3. Add a batched `refreshActiveSchoolYear` method that scopes to the authoritative active year, invalidates dependencies through existing helpers, inserts new versions, and returns counts.
4. Feed the same snapshot/fingerprint into transition readiness; test stale old-table rows are excluded until refreshed.
5. Keep closed-year paths on their persisted historical snapshot and never select the newly active table for mutation.

### Phase 4 — table activation governance (RED/GREEN)

**Owners:**

- `backend/src/modules/class-record/transmutation.service.ts`
- `backend/src/modules/class-record/class-record.controller.ts`
- new/focused transmutation service specs
- `backend/src/modules/class-record/class-record.module.ts` only if dependency wiring changes

1. Add failing tests for server rejection of incomplete/ambiguous band sets and no partial state change.
2. Inject the annual service/audit owner and wrap apply/reactivate in `AcademicMutation`.
3. Switch the active table, refresh active-year annual versions, and audit old/new table IDs plus counts in one transaction.
4. Preserve the selected table fields in the response and append the annual refresh summary.
5. Add an integration failure test proving a refresh error rolls back the active-table switch.

### Phase 5 — annual refresh route and web clarity

**Owners:**

- `backend/src/modules/class-record/class-record.controller.ts`
- `next-frontend/src/services/class-record-service.ts`
- `next-frontend/src/hooks/use-teacher-class-record.ts`
- `next-frontend/src/types/academic-grading.ts`
- `mobile/src/types/academic-grading.ts` (type parity only)
- `next-frontend/src/components/teacher/class-record/AcademicAnnualSummary.tsx`
- `next-frontend/src/components/teacher/class-record/TeacherClassRecordWorkbook.module.css` only if existing styles cannot express the provenance line
- focused hook/component tests

1. Add the access-controlled active-year refresh POST and keep GET read-only.
2. Use POST when the web teacher opens/refreshes the annual tab; retain state/error behavior.
3. Render raw, rounded, official, and table-title provenance with existing compact table hierarchy.
4. Test the concrete 87→89 display, historical prior version, loading, incomplete, and failed refresh states.

### Phase 6 — admin activation UX

**Owners:**

- `next-frontend/app/(dashboard)/dashboard/admin/class-record/page.tsx`
- its focused page test
- `next-frontend/src/services/class-record-service.ts`
- `next-frontend/src/types/class-record.ts`
- matching mobile API type only if the additive response is modeled there

1. Replace inaccurate “future legacy policy only” text with the approved active-year annual scope and explicit frozen boundaries.
2. Disable apply when `previewData.isValid` is false; show the coverage problem next to the action.
3. Require a confirmation for upload activation and historical-table reactivation.
4. Display updated/unchanged/incomplete counts after success and retain the preview on failure.
5. Preserve the existing route, table preview, search, history, and download links.

### Phase 7 — performance SQL characterization and repair (RED/GREEN)

**Owners:**

- `backend/src/modules/performance/performance.service.ts`
- `backend/src/modules/performance/performance.service.spec.ts`

1. Add a `PgDialect` compile test proving the current expression contains illegal target-table qualification.
2. Introduce the unqualified static conflict-set helper and assert the compiled SQL exactly contains the three intended expressions and no `"student_concept_mastery"."..."` in the SET values.
3. Exercise diagnostic construction with mastery rows and verify one existing conflict keeps max evidence/error and min mastery semantics.
4. Run both student-scoped and whole-class cases; do not change concept extraction or the 500-response cap.

```bash
npm --prefix backend test -- --runInBand src/modules/performance/performance.service.spec.ts
```

### Phase 8 — performance error boundary and UI state

**Owners:**

- `backend/src/modules/performance/performance.service.ts`
- `backend/src/modules/performance/performance.service.spec.ts`
- `next-frontend/app/(dashboard)/dashboard/teacher/performance/page.tsx`
- `next-frontend/app/(dashboard)/dashboard/teacher/performance/page.test.tsx`

1. Log bounded internal job context and stop returning raw database query text to the teacher.
2. Keep failed status/progress behavior and expose a stable retry-safe message.
3. Test polling failure keeps class/student selection, clears `analyzing`, shows the safe message, and allows retry.
4. Keep successful student/whole-class result rendering unchanged.

### Phase 9 — integration and scale verification

**Owners:**

- `backend/test/academic-lifecycle.integration-spec.ts`
- existing disposable academic-test database only

1. Extend the annual fixture with two table snapshots; verify activation versions the active-year annual row and leaves the closed-year row unchanged.
2. Assert prior annual history/components are retained, current uniqueness holds, dependent remediation becomes non-current, and audit metadata names the table/counts.
3. Assert transition readiness accepts the new snapshot/fingerprint and rejects a stale table snapshot.
4. Run the opt-in 9,600-row fixture with activation/recalculation timing and no partial versions.

```bash
npm --prefix backend run test:academic
ACADEMIC_LARGE_FIXTURE=1 npm --prefix backend run test:academic
```

Use only the repository-approved disposable database URL. Never point integration tests at production.

### Phase 10 — local verification

Run focused gates first, then broader relevant gates:

```bash
npm --prefix backend test -- --runInBand src/modules/academic-state/academic-policy.spec.ts src/modules/academic-state/annual-grades.service.spec.ts src/modules/performance/performance.service.spec.ts
npm --prefix backend run test:academic
npm --prefix backend run lint
npm --prefix backend run build
npm --prefix next-frontend test -- --runInBand --runTestsByPath 'src/components/teacher/class-record/AcademicAnnualSummary.test.tsx' 'app/(dashboard)/dashboard/admin/class-record/page.test.tsx' 'app/(dashboard)/dashboard/teacher/performance/page.test.tsx'
npm --prefix next-frontend run typecheck
npm --prefix next-frontend run lint
npm --prefix next-frontend run build
```

Run any additional focused test path discovered while implementing dependency wiring. No mobile package build is triggered because no mobile runtime component changes.

### Phase 11 — review, commit, push, deploy, and reconciliation

1. Run `git diff --check`, scoped diff/stat, migration-integrity check, secret scan, and plan/report reconciliation.
2. Request code review before release; resolve only evidence-backed in-scope findings.
3. Commit all in-scope source, tests, report, and plan on `developement`; push only after all local gates pass.
4. Capture the exact pushed SHA and verify required GitHub Actions and both backend/frontend Railway deployments correspond to it and reach `SUCCESS`.
5. Verify public health/readiness and authenticated target flows. Run Performance Analyze for the supplied student and confirm a completed result with no new PostgreSQL qualification error.
6. Open the supplied class annual tab through the new refresh path. Verify a new current version records `87 rounded → 89 official`, the prior 87 remains non-current with an explicit reason, and the active table provenance is visible.
7. Run read-only post-deploy queries: one current annual row per identity, correct 89 target value, no closed-year mutation, valid annual fingerprints/readiness, and no new failed performance jobs caused by the mastery upsert.

Do not claim physical-browser acceptance if authenticated UI verification cannot be performed. Do not directly update production grade columns.

## 9. Verification matrix and acceptance criteria

| Requirement | Automated proof | Runtime/release proof |
|---|---|---|
| Annual order is average → round → transmute | Pure tests for 87.25→87→89 and boundaries | Target class current row becomes 89 |
| Active table is calculation state | Fingerprint/snapshot tests | Table title/id visible and read-only DB snapshot matches |
| Table change updates annuals | Service/integration test creates a new version | Activation result reports counts; current uniqueness remains one |
| Evidence/history is preserved | Integration asserts old row/components remain | Prior 87 row is non-current, not deleted |
| Closed years are frozen | Active/closed integration fixture | Read-only before/after counts/hashes unchanged |
| Transition readiness agrees | Stale/new fingerprint tests | Active-year readiness has no annual mismatch caused by the change |
| Invalid tables cannot govern grades | Band validation and rollback tests | Invalid preview cannot activate; old table remains active |
| Teacher sees transparent math | Component test for raw/rounded/official/table | Authenticated annual tab shows the exact chain |
| Analyze upsert is PostgreSQL-valid | `PgDialect` compile + integration semantics test | Supplied student job completes; Postgres log has no invalid FROM reference |
| Mastery semantics do not regress | Existing conflict keeps max/max/min | Read-only mastery row count/key integrity remains valid |
| Internal SQL is not leaked | Service/page failed-job tests | Teacher receives bounded retry message only |
| No unrelated regression | Backend/web lint, typecheck, tests, builds | Exact-SHA CI and Railway deploy success |

## 10. Rollout, rollback, observability, cleanup, and unverified boundaries

### Rollout order

1. Deploy backend first because it owns the additive snapshot/refresh and safe performance error contract.
2. Verify backend health and read-only invariants.
3. Deploy frontend against the backward-compatible backend response.
4. Reconcile/verify the supplied active-year class through the explicit refresh route.
5. Execute the supplied Performance Analyze flow and inspect bounded backend/PostgreSQL telemetry.

### Rollback

- Revert the exact release SHA and redeploy both affected services.
- If a newly activated table is wrong, reactivate the prior valid table through the governed action; this creates/restores versioned active-year annual results.
- Never delete the new or prior annual versions. They are audit evidence.
- Performance rollback needs no data cleanup because the schema and existing mastery rows do not change.

### Observability

- Table activation log/audit: old/new table ID, active year, class groups scanned, updated/unchanged/incomplete counts, duration, actor.
- Annual version audit: table ID/title, old/new annual IDs, old/new official grades, fingerprint, reason.
- Performance failure log: job/class/student scope, bounded error type/cause, no full SQL/parameters in the client response.
- Release evidence: exact commit SHA, CI run IDs, Railway deployment IDs/status, target annual before/after IDs/values, performance job ID/status.

### Cleanup

- No schema cleanup or destructive data task.
- Existing failed performance jobs remain historical evidence.
- Remove no legacy annual rows; optional provenance remains compatible.

### Unverified boundaries

- Authenticated post-fix rendering is unverified until deployment.
- The production-wide activation row count and duration are inherently time-sensitive and must be measured at execution.
- Direction A’s policy boundary is approved. Authenticated production acceptance and exact-SHA release evidence remain pending until deployment.

## 11. Implementation and local verification record

### Implemented

- Added a persisted annual-only transmutation snapshot and shared fingerprint helper without changing the frozen quarterly policy.
- Added exact integer coverage validation for active tables and a stable system-default fallback.
- Versioned active-year annual grades on table apply/reactivation in the existing academic transaction, with 400-row annual insert batches, dependent-evidence invalidation, audits, and rollback on failure.
- Added an access-checked active-year annual refresh POST for the teacher web annual tab; the existing GET remains read-only for compatibility.
- Kept transition readiness on the same annual snapshot, calculation, and fingerprint.
- Replaced the invalid qualified mastery-upsert expressions with PostgreSQL-valid unqualified target and `excluded` columns while preserving max/max/min semantics.
- Bounded internal failure logging and replaced client-visible SQL with a stable retry message.
- Updated the admin table impact/confirmation/result copy, invalid-preview guard, annual calculation explanation, and additive web/mobile types.

### Verified locally

- Focused backend: 6 suites, 74 tests passed before the final readiness case; the added readiness case also passed in its 15-test suite.
- Full backend: 166 suites, 1,729 tests passed.
- Full frontend: 195 suites, 877 tests passed.
- Frontend focused: admin table, teacher annual hook, and teacher performance page — 3 suites, 14 tests passed.
- Backend and frontend production builds passed; frontend and mobile typechecks passed; frontend lint passed; backend lint passed with zero errors under its configured existing warning budget.
- Disposable PostgreSQL integration: ordinary annual idempotency, active-table 87→89 versioning, and table-switch rollback all passed.
- Opt-in school-sized fixture: 1,200 students, 9,600 annual grades, readiness in 2,082 ms, and transactional table activation/versioning in 17,884 ms with 9,600 current transmuted rows and 9,600 preserved prior versions.
- No APK was built because the only mobile change is an erased TypeScript contract addition; there is no mobile runtime, dependency, native configuration, or bundled-asset change.

### Environment note

The repository's fresh-database migration path currently attempts to create `transmutation_tables` twice (baseline and migration 0005), and the long-lived local schema lacks the later `users.session_version` column. Both are pre-existing, out-of-scope migration-environment defects. Database-backed checks therefore used a disposable clone of the local schema with only that required test column added; the disposable database was removed after verification. No production or local development data was changed.
