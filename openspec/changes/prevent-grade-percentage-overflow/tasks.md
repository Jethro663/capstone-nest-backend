## 1. Characterization and score primitives

- [x] 1.1 Add failing pure tests for bounded base/bonus/effective point calculation, item-level capping, finite/range validation, and the 20-awarded/10-possible plus 0/10 category example.
- [x] 1.2 Implement the shared academic score normalization primitive and route class-record calculation through it without changing missing, zero, excused, period, exam-weight, transmutation, or revision behavior.
- [x] 1.3 Add failing assessment tests for duplicate response IDs, invalid denominators, bounded attempt percentages, explicit reasoned bonuses, and idempotent retry behavior.

## 2. Persistence, migration, and audit

- [x] 2.1 Extend assessment-attempt and class-record-score schemas with point snapshots and explicit bonus evidence, plus bounded percentage/non-negative constraints.
- [x] 2.2 Add migration `0017_grade_score_invariants.sql` with evidence-preserving duplicate/range repair followed by response uniqueness and range constraints; update Drizzle metadata.
- [x] 2.3 Add a read-only grade-invariant audit command covering duplicate responses, denominator mismatches, out-of-range attempts/class-record/final/performance values, and ambiguous legacy evidence.
- [x] 2.4 Add migration/audit tests for fresh and upgraded databases and prove a second repair/audit run is idempotent.

## 3. Assessment scoring and contract

- [x] 3.1 Make assessment response normalization reject duplicate question IDs and make response persistence one-row-per-attempt/question within the academic transaction.
- [x] 3.2 Persist base/possible/bonus evidence for auto, manual-response, rubric, and direct grading while keeping legacy `score` equal to bounded `scorePercent`.
- [x] 3.3 Add explicit `bonusPoints` and required `bonusReason` validation to teacher grade-return APIs and include all score-breakdown fields in submit, return, attempt, result, history, and teacher-list responses.
- [x] 3.4 Update assessment statistics and reports to consume bounded percentage values and add regression tests for legacy/malformed rows.

## 4. Class record, standing, and performance

- [x] 4.1 Add bonus fields and reason validation to single/bulk manual class-record scoring and preserve source-attempt synchronization without surplus contribution.
- [x] 4.2 Replace `ClassesService` standing arithmetic with the canonical class-record calculation and add missing/zero/excused/over-HPS regression coverage.
- [x] 4.3 Replace performance class-record arithmetic with canonical finalized/complete grades, use assessment average only as fallback, and prevent synchronized evidence from being blended twice.
- [x] 4.4 Bound snapshot/log persistence and update reports, profiles, LXP, and JA consumers so no backend reader invents a point/percentage or official-grade formula.
- [x] 4.5 Add a deterministic recompute path for affected performance snapshots and verify repaired values remain within 0–100.

## 5. Web contract and role surfaces

- [x] 5.1 Update web assessment/class/class-record/performance/report types and services for `scorePercent` plus score breakdown while preserving the compatibility field.
- [x] 5.2 Add a shared web score presenter and failing tests proving 5/10 renders as `5/10` and `50%`, capped bonuses are disclosed, and no percent is divided by total points.
- [x] 5.3 Update teacher assessment review/posting, learner overview/history, assessment statistics, performance, and class-record workbook surfaces with explicit base/bonus entry and canonical output.
- [x] 5.4 Update student results/history/module/class/performance surfaces and admin academic-record/report/export surfaces to the shared contract.
- [x] 5.5 Add teacher, student, and admin integration/E2E coverage for the capped-bonus and percentage-display flow.

## 6. Mobile contract and role surfaces

- [x] 6.1 Update mobile assessment/class/class-record/performance types, services, hooks, and fixtures for the explicit score contract.
- [x] 6.2 Add a shared mobile score presenter and failing mapper tests proving a backend 50% result remains 50%, not 500%.
- [x] 6.3 Update student dashboard/progress/assessment/history/class/result screens and teacher detail/review/learner/class-record screens to use effective points and percentage.
- [x] 6.4 Add the explicit reasoned bonus workflow for mobile teachers and preserve supported admin shared academic-workbook behavior.
- [x] 6.5 Add mobile API, mapper, and screen regression tests for every affected role and verify query invalidation after grade mutations.

## 7. Planning review and specification gates

- [x] 7.1 Perform one complete self-review of proposal, design, specs, tasks, current symbol ownership, contract consumers, migration ordering, and rollback safety; resolve every contradiction or uncovered consumer before implementation proceeds past characterization tests.
- [x] 7.2 Run OpenSpec validation and search for placeholders, ambiguous `score/totalPoints` rendering, duplicate formula owners, and missing acceptance-test coverage.

## 8. Full verification and runtime acceptance

- [x] 8.1 Run targeted red/green tests after each implementation slice, then backend lint/build/full unit/e2e/seed smoke and fresh/upgrade PostgreSQL migration audits.
- [x] 8.2 Run web tests, type checking, lint, production build, dev smoke, and seeded Playwright role checks for teacher, student, and admin score surfaces.
- [x] 8.3 Run mobile type checking and full tests, then exercise the affected student/teacher/admin flows on Android with the production API contract.
- [x] 8.4 Re-run the final invariant audit and requirement-by-requirement completion review; confirm every stored/returned/displayed percentage is 0–100 and every OpenSpec task is complete.

## 9. APK and release provenance

- [x] 9.1 Increment the mobile build version as required, build the ARM64 release APK, verify package/version/signature/ABI/alignment/API URL/installability, and embed the artifact plus checksum/manifest in the repository's established release location.
- [x] 9.2 Review the final diff and scope, confirm `origin/developement...HEAD` divergence, commit all intended artifacts and implementation, and push `developement` without unrelated files.
- [x] 9.3 Watch the exact pushed commit through every GitHub Actions job and deployment log to terminal success; verify runtime health and the downloadable APK checksum before reporting completion.
