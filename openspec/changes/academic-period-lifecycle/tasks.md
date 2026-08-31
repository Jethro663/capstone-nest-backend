## 1. Policy and design

- [x] 1.1 Verify primary policy sources and revise the architectural analysis, OpenSpec design, and acceptance scenarios.
- [x] 1.2 Implement/test school-year policy, period labels, subject weights, adjusted transmutation, annual arithmetic, and remediation outcome functions.

## 2. Persistence and transaction boundary

- [x] 2.1 Add policy, participant, grade revision, transfer evidence, annual, SRC, back-subject, and reminder schemas; generate additive migration.
- [x] 2.2 Implement/test shared academic transaction locking, nested connection propagation, rollback, request isolation, and after-commit effects.
- [x] 2.3 Preserve legacy final-grade evidence and expose read-only migration audit plus explicit roster/source repair.

## 3. Complete period grading

- [x] 3.1 Implement participant reconciliation and enrollment capture without silently rewriting historical eligibility.
- [x] 3.2 Implement missing/zero/excused score semantics, modern exam weights, and common spreadsheet/preview/finalization computation.
- [x] 3.3 Implement readiness, completed-result sync, immutable period revisions, audited reopen, and dependent invalidation.

## 4. Annual grades and remediation

- [x] 4.1 Implement complete annual source selection across section transfers, duplicate-source resolution, and verified external period grades.
- [x] 4.2 Implement idempotent annual revisions, history, source invalidation, and one authoritative summary contract.
- [x] 4.3 Implement evidenced SRC results and promotion/retention/conditional/Grade-10 outcomes.
- [x] 4.4 Implement persistent back-subject scheduling and clearance with one active subject per student/year/period.

## 5. Assessment lifecycle

- [x] 5.1 Implement shared policy capabilities and audited admin period activation with year/period/version preconditions.
- [x] 5.2 Default draft period, allow future preparation, atomically create/reuse placement, and prohibit result-bearing period changes.
- [x] 5.3 Guard all student listing/open/start/upload/submit/core-release paths while preserving in-flight completion and historical viewing.
- [x] 5.4 Guard teacher score/question/rubric mutation and automatic score sync against finalized or closed-year records.

## 6. Safe year transition

- [x] 6.1 Replace existing-record counting with expected subject/student/period/annual/SRC readiness and repair blockers.
- [x] 6.2 Rebuild targets inside locked transition, enforce expected state/last period/next year, preserve clones and empty rosters, and reset first period.
- [x] 6.3 Group and deduplicate teacher reminders from shared readiness; defer notifications until commit.

## 7. Client delivery

- [x] 7.1 Update web contracts and System Settings period activation, transition readiness, and admin transfer/SRC/back-subject repair controls.
- [x] 7.2 Update web teacher creation/editor to selectable policy periods and server lifecycle capabilities.
- [x] 7.3 Update web workbook roster/exemption/readiness/history/annual summary and export parity.
- [x] 7.4 Update mobile contracts, admin academic controls, teacher creation/editor/workbook/annual flows and cache invalidation.

## 8. Verification and delivery audit

- [x] 8.1 Rehearse fresh/upgrade migrations and legacy repair against a disposable local PostgreSQL database.
- [x] 8.2 Exercise successful/blocked/rollback/concurrent transitions, notifications, and a production-sized synthetic fixture.
- [x] 8.3 Run backend build/lint/regressions, web build/lint/regressions/browser flows, mobile typecheck/tests/bundle verification.
- [x] 8.4 Audit every acceptance requirement against current source and verification evidence; update delivery notes and retain any honest platform limitations.

## Implementation and release-review evidence (2026-08-31)

- Implementation is present across backend, web, and mobile. Full acceptance mapping and remaining production decisions are in `docs/academic-period-lifecycle-verification.md`.
- Backend: 106 suites / 1,219 tests and 2 e2e suites / 5 tests passed. Production build, migration integrity, real production command and Docker entrypoint health passed. Lint has zero errors / 2,288 warnings within the existing limit.
- PostgreSQL 16 and 18: 29 lifecycle scenarios each, all 16 fresh migrations, legacy upgrade and repeat migration passed. PostgreSQL 18 scale rehearsal: 1,200 learners / 240 classes / 28,800 period grades / 9,600 annual results; readiness found the stale annual in 1,291 ms locally.
- Production snapshot read without writes, restored and migrated locally. Ten tables' original values remained unchanged, including every one of the 25 saved final grades. A separate original-schema restore verified snapshot recovery. Current-year audit has 53 readiness findings requiring school decisions; historical years have additional findings. These are a rollout hold, not a failed migration.
- Web: 154 suites / 646 tests exit normally without forced shutdown. TypeScript passes with zero diagnostics; lint passes without warnings; Next production build now enforces type safety. The admin dashboard test's previously unmocked HTTP call is fixed.
- Mobile: 39 suites / 213 tests and type checking pass. Android API 35 emulator verified admin controls, typed roster confirmation, missing/incomplete annual output, CSV creation/native sharing chooser, teacher workbook navigation, HPS/zero input and an evidenced exemption. Sharing was cancelled. The downloadable ARM64 APK is rebuilt as 0.1.9 / code 10 with a verified production API configuration and matching existing internal signing certificate. Physical ARM-device/iOS acceptance and production signing remain platform release requirements; the current APK uses the existing debug certificate.
- CI includes migration/runtime checks for both PostgreSQL versions and web type checking. Frontend deployment waits for the exact tested backend deployment to reach runtime success with configured health checks. Ten deployment-guard tests pass; the read-only CLI adapter and official configuration schema were verified.
- Strict OpenSpec and whitespace validation passed. No commit, push, production write or deployment occurred.
