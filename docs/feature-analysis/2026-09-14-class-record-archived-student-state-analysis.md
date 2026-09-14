# Class Record Archived-Student State Isolation Analysis

Date: 2026-09-14

Scope: account archival (`users.status = 'DELETED'`) as observed in teacher/admin class-record workbooks, rosters, reports, and exports

Discovery boundary: the original analysis was read-only. The separately authorized implementation and release are tracked in `docs/feature-plans/2026-09-14-class-record-archived-account-state.md`; no production learner was archived or reactivated for testing.

## 1. Executive verdict

### Verdict

The second approach is the safer design: **retain the learner and all academic evidence, but show a distinct “Archived account” state with the learner name crossed out**. Do not delete the learner's class-record scores, participant rows, final grades, revisions, or annual-grade evidence when the account is archived.

The current symptom has a confirmed root cause. Account archival changes `users.status` to `DELETED`, while the class-record spreadsheet defines a current learner only through `enrollments.status = 'enrolled'`. It neither selects nor tests `users.status`, so an archived learner with an enrolled row is returned as an ordinary active class-record row (`backend/src/modules/users/users.service.ts:1329-1389`; `backend/src/modules/class-record/class-record.service.ts:597-614`).

The feature is moderately-to-highly coupled because the visible row is backed by enrollment, a period-specific eligibility register, mutable score rows, finalized grade snapshots, immutable revisions, annual summaries, reports, web/mobile views, and exports. Physical row deletion would cross academic-history and audit boundaries, while a display-only route patch would leave other consumers inconsistent.

### Recommended state model

Keep the existing concepts separate:

| State                                    | Meaning                                                     | Owner                                             |
| ---------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------- |
| Enrollment state (`active` or `removed`) | Whether the learner is currently enrolled in this class     | Enrollment/class-record read model                |
| Period eligibility                       | Whether the learner belongs in this specific grading period | Period eligibility register                       |
| Account state (`active` or `archived`)   | Whether the underlying account is archived (`DELETED`)      | User lifecycle, projected into class-record reads |

`accountState` should be derived at read time from `users.status`; it should not be stored separately in every class record. This prevents stale copies, avoids a migration/backfill, and makes an audited Maintenance Access reactivation remove the archived presentation on the next refresh.

### Required user-facing behavior

- Web and mobile: keep the row and all grade values legible. Cross out the learner's **name only**, add a visible `Archived account` label, use a restrained muted row treatment, and provide equivalent screen-reader text. Do not use strike-through or reduced opacity as the only signal.
- Keep `Archived account` independent from `Removed from current class`; both labels may appear when both facts are true.
- Do not silently move an archived-but-still-enrolled learner into the existing `Historical learners` filter. The mismatch should remain visible until enrollment/period eligibility is corrected through its existing owner.
- Archive confirmation: warn, but do not block. Recommended copy: **“This learner will lose account access. Existing class-record rows, scores, grades, and audit evidence will be retained and marked ‘Archived account’ for teachers and administrators. Archiving does not change class enrollment or period eligibility.”**
- Keep scoring, finalization, averages, distribution, and annual-grade rules driven by the existing period eligibility and evidence. Account status is an identity/access fact, not retroactive proof that the learner was ineligible for a past period.

### Rejected alternatives

1. **Delete the learner from every class record — rejected.** Score/final-grade foreign keys cascade on user deletion, period participants and grade revisions use restrictive references, and the governed purge preview explicitly counts participant, score, final-grade, attempt, and enrollment evidence. Deleting record rows would erase or orphan academic evidence and can alter official reports (`backend/src/drizzle/schema/class-record.schema.ts:152-231`; `backend/src/drizzle/schema/academic-grading.schema.ts:76-125`; `backend/src/modules/admin-lifecycle/purge-lifecycle.service.ts:235-269`).
2. **Reuse `isRemoved`/`enrollmentState` — rejected.** Those fields mean removal from a class, not account archival. Reuse would misstate enrollment and hide archived-but-enrolled learners from the draft workbook's default Current view (`backend/src/modules/class-record/class-record.service.ts:638-685`; `next-frontend/src/components/teacher/class-record/class-record-visuals.ts:84-101`).
3. **Separate query-time account overlay — recommended.** It preserves every existing academic owner, is additive to clients, and reverses cleanly if the account is reactivated.

## 2. Feature anatomy

### Current flow

1. An administrator archives one suspended account through `DELETE /api/users/:id/soft-delete`, or archives several through `POST /api/users/bulk/lifecycle` (`backend/src/modules/users/users.controller.ts:200-211`, `247-262`).
2. `UsersService.softDeleteUser` snapshots selected account-related data, inserts an `archived_users` record, changes only the user row to `DELETED`, and writes the `user.archived` audit event. It does not change enrollment, class-record participant, score, or grade rows (`backend/src/modules/users/users.service.ts:1354-1389`).
3. `GET /api/class-record/:id/spreadsheet` joins enrolled class memberships to users but selects only identity fields. Since it filters only the enrollment, the account remains in `activeStudents` and is emitted with `isRemoved: false` and `enrollmentState: active` (`backend/src/modules/class-record/class-record.service.ts:597-614`, `676-728`).
4. The shared web grade grid renders eligibility/removal labels and enables score cells from workbook capability plus period eligibility; account status does not exist in the client type (`next-frontend/src/types/class-record.ts:104-134`; `next-frontend/src/components/teacher/class-record/TeacherClassRecordGradeGrid.tsx:316-412`).
5. Mobile's editable academic workbook likewise offers every spreadsheet learner and gates score actions on period eligibility, while its table filters only current versus removed learners (`mobile/src/components/academic/AcademicWorkbook.tsx:264-286`, `361-390`; `mobile/src/components/teacher/MobileClassRecordWorkbook.tsx:165-186`).

### Preserved academic behavior

- Removed learners with score, final-grade, or period-register history are deliberately reconstructed into the spreadsheet instead of discarded (`backend/src/modules/class-record/class-record.service.ts:616-685`).
- Period eligibility is explicitly documented as a register that is not reconstructed from today's enrollment (`backend/src/modules/class-record/class-record-roster.service.ts:24-25`).
- Readiness/finalization selects eligible participants from `class_record_participants`, not from account status (`backend/src/modules/class-record/class-record-readiness.service.ts:36-46`).
- Final-grade reports compute from stored finalized grades and should not change when an account is later archived (`backend/src/modules/class-record/class-record.service.ts:1574-1664`).

### Side effects and timing

There is no confirmed archive event consumed by class-record clients. Web reloads spreadsheet/roster/readiness when its shared hook refreshes; mobile invalidates its class-record queries through its refresh action (`next-frontend/src/hooks/use-teacher-class-record.ts:203-248`; `mobile/src/components/academic/AcademicWorkbook.tsx:79-113`). Therefore “automatic” means **visible on the next successful workbook fetch/refresh**, not a guaranteed live update in an already-open workbook. Real-time propagation is optional scope, not required for the safe minimum.

## 3. Cascade map

| Edge | Provider                            | Interface/state                                                                               | Consumer                                                                         | Effect                                                                                       | Risk                | Confidence | Evidence                                                                                                                                                                                                                                                        | Disposition                                                                           |
| ---- | ----------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| E01  | Web admin users list/detail         | Individual archive confirmation                                                               | User lifecycle API                                                               | Executes account archive; current warning omits class-record retention                       | Direct, medium      | Confirmed  | `next-frontend/app/(dashboard)/dashboard/admin/users/page.tsx:356-377`; `next-frontend/app/(dashboard)/dashboard/admin/users/[id]/page.tsx:318-355`                                                                                                             | Replace copy with non-blocking academic-retention warning                             |
| E02  | Web/mobile bulk admin actions       | `action: archive`                                                                             | `UsersService.bulkLifecycleAction`                                               | Repeats the same archive behavior per selected account                                       | Direct, medium      | Confirmed  | `backend/src/modules/users/users.service.ts:1430-1462`, `1572-1586`; `mobile/src/screens/AdminUsersScreen.tsx:222-247`                                                                                                                                          | Keep action; align warning copy on both clients                                       |
| E03  | User lifecycle                      | `softDeleteUser` transaction                                                                  | `users`, `archived_users`, audit                                                 | Changes account status but not academic membership/evidence                                  | Direct, high        | Confirmed  | `backend/src/modules/users/users.service.ts:1329-1389`                                                                                                                                                                                                          | Preserve mutation boundary; do not add class-record deletions                         |
| E04  | Enrollment schema                   | `enrollments.status`                                                                          | Spreadsheet and annual roster discovery                                          | Enrollment can remain `enrolled` after account becomes `DELETED`                             | Direct, high        | Confirmed  | `backend/src/drizzle/schema/base.schema.ts:425-446`; E03                                                                                                                                                                                                        | Project both facts rather than conflating them                                        |
| E05  | Class-record read model             | `GET /class-record/:id/spreadsheet`                                                           | Web/mobile workbooks                                                             | Omits user status and misclassifies archived learner as an ordinary active row               | Direct, high        | Confirmed  | `backend/src/modules/class-record/class-record.service.ts:597-614`, `676-728`                                                                                                                                                                                   | Select status for every participant identity and emit additive `accountState`         |
| E06  | Class-record history reconstruction | participant/score/final-grade union                                                           | Spreadsheet                                                                      | Intentionally retains removed learners with evidence                                         | Transitive, high    | Confirmed  | `backend/src/modules/class-record/class-record.service.ts:616-685`; `backend/src/modules/class-record/class-record.service.spec.ts:840-923`                                                                                                                     | Preserve; add account state to both active and removed identity queries               |
| E07  | Period roster                       | `GET /class-record/:id/roster`                                                                | Eligibility UI and score authorization                                           | Unions participant, membership, score, and final-grade identities, but omits user status     | Direct, high        | Confirmed  | `backend/src/modules/class-record/class-record-roster.service.ts:47-99`                                                                                                                                                                                         | Add the same semantic account state for consistent labels; do not rewrite eligibility |
| E08  | Readiness and score writes          | eligible participant IDs                                                                      | Finalization, manual/bulk score writes, sync                                     | Account archival alone does not exclude or block an eligible learner                         | Transitive, high    | Confirmed  | `backend/src/modules/class-record/class-record-readiness.service.ts:36-46`; `backend/src/modules/class-record/class-record-roster.service.ts:191-203`; `backend/src/modules/class-record/class-record.service.ts:960-978`                                       | Keep existing academic authority; archive marker is informational                     |
| E09  | Spreadsheet public contract         | `SpreadsheetStudentRow`                                                                       | Web and mobile types                                                             | Has removal/eligibility fields but no archive state                                          | Direct, high        | Confirmed  | `next-frontend/src/types/class-record.ts:104-134`; `mobile/src/types/class-record.ts:99-130`                                                                                                                                                                    | Add compatible optional field during rollout, then make required after parity         |
| E10  | Shared web workbook                 | `TeacherClassRecordWorkbook` and grade grid                                                   | Embedded teacher class page, standalone teacher page, admin academic-record page | One shared component serves teacher/admin views, so a shared row treatment reaches all three | Direct, medium      | Confirmed  | `next-frontend/app/(dashboard)/dashboard/admin/academic-records/[classId]/page.tsx:5-28`; `next-frontend/app/(dashboard)/dashboard/teacher/class-record/page.tsx:9-25`, `309-313`; `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/page.tsx:4287` | Implement once in shared grid/annual components, not route-local CSS                  |
| E11  | Web learner filters and cells       | Current/Historical filters; eligibility gate                                                  | Teacher/admin grade grid                                                         | `isRemoved` owns filtering; score buttons ignore account status                              | Direct, medium      | Confirmed  | `next-frontend/src/components/teacher/class-record/class-record-visuals.ts:84-101`; `next-frontend/src/components/teacher/class-record/TeacherClassRecordGradeGrid.tsx:350-412`                                                                                 | Preserve filters and eligibility gate; add orthogonal archived styling/label          |
| E12  | Mobile class-record surfaces        | Editable `AcademicWorkbook`; display `MobileClassRecordWorkbook`                              | Teacher/admin-capable mobile flows                                               | Archived learner is selectable and visually ordinary; table only understands removal         | Direct, medium      | Confirmed  | `mobile/src/components/academic/AcademicWorkbook.tsx:264-286`, `361-390`; `mobile/src/components/teacher/MobileClassRecordWorkbook.tsx:165-186`, `376-410`                                                                                                      | Add parity label/treatment; leave academic eligibility behavior unchanged             |
| E13  | Workbook exports                    | Period/evidence rows                                                                          | XLSX and mobile CSV                                                              | Exports retain scores but cannot identify archived accounts                                  | Operational, medium | Confirmed  | `next-frontend/src/lib/academic-workbook-export.ts:10-56`, `99-110`; `mobile/src/lib/academic-workbook-export.ts:9-55`                                                                                                                                          | Add `Account state` column without altering numeric evidence                          |
| E14  | Annual/final/intervention reads     | Identity projections joined to academic evidence                                              | Annual tab and class-record reports                                              | Archived learners remain in official evidence but have no visible account marker             | Transitive, medium  | Confirmed  | `backend/src/modules/academic-state/annual-grades.service.ts:960-1033`; `backend/src/modules/class-record/class-record.service.ts:1434-1470`, `1640-1664`                                                                                                       | Preserve counts/grades; project marker wherever learner identity is rendered          |
| E15  | Academic schema and governed purge  | Score/final-grade cascade FKs; participant/revision restrictive FKs; purge evidence inventory | Permanent deletion workflow                                                      | Physical deletion has a broad, mixed cascade/restrict blast radius                           | Persisted, critical | Confirmed  | `backend/src/drizzle/schema/class-record.schema.ts:152-231`; `backend/src/drizzle/schema/academic-grading.schema.ts:76-125`; `backend/src/modules/admin-lifecycle/purge-lifecycle.service.ts:235-269`                                                           | Keep permanent erasure separate from routine archive presentation                     |
| E16  | Client refresh                      | Explicit/refetch-driven data loads                                                            | Already-open workbook                                                            | Archive marker can remain stale until next successful fetch                                  | Operational, low    | Confirmed  | `next-frontend/src/hooks/use-teacher-class-record.ts:203-248`; `mobile/src/components/academic/AcademicWorkbook.tsx:79-113`                                                                                                                                     | Document refresh timing; real-time invalidation is optional                           |

## 4. Isolation and ordered implementation cuts

### Seams and prerequisites

- **Identity seam (E03-E05):** `users.status` remains the only account lifecycle source of truth.
- **Academic seam (E07-E08):** enrollment and period eligibility remain the only academic participation authorities.
- **Presentation seam (E09-E14):** clients consume a semantic projection and never infer archive state from missing rows.
- No database migration, data cleanup, or backfill is required for the recommended approach.

### Ordered cuts

1. **Backend additive read contract — E05, E07, E09, E14.** Select `users.status` in all class-record identity projections and return `accountState: 'active' | 'archived'`. Do not filter archived identities and do not mutate enrollment, eligibility, scores, or grades.
2. **Web shared presentation — E10, E11.** Add one archived-row semantic state in the shared grade grid and annual identity cell; cross out the name, add text/badge, and keep grade values readable. Retain existing Current/Historical behavior.
3. **Mobile parity — E12.** Add the same state to the editable learner picker and read-only grid. The selected learner summary must say `Archived account`; existing eligibility continues to govern score actions.
4. **Archive warnings and exports — E01, E02, E13.** Use the same non-blocking warning in individual and bulk web/mobile entry points; add account state to exported period/evidence rows.
5. **Focused regression coverage — E03-E16.** Prove no academic rows are deleted, archived and removed states can coexist, official grade/report calculations are unchanged, and reactivation removes the marker on refetch.

### Compatibility

- Server-first deployment is safe if `accountState` is initially additive/optional; current clients ignore unknown response fields.
- Updated clients must treat a missing field as `active` only during the compatibility window.
- Do not rename or overload `isRemoved`, `enrollmentState`, or `eligibility`; existing web/mobile filters and grade logic depend on their current meanings.

### Validation

- Backend unit: an enrolled user with status `DELETED` remains present with `enrollmentState: active` and `accountState: archived`.
- Backend unit: a removed user with retained evidence can have both `enrollmentState: removed` and `accountState: archived`.
- Backend unit: archive performs no enrollment, participant, score, final-grade, or revision deletion/update.
- Web/mobile unit: archived label and accessible name render; active rows remain unchanged; filters do not misclassify archived accounts as removed.
- Web/mobile unit: current eligibility/workbook capability still controls editing and finalization; exports add status without changing score/grade cells.
- Integration: archive a suspended learner, refresh teacher and admin workbooks, confirm the marker on every period containing that learner, confirm preserved values, then reactivate under the existing authorized path and refresh to confirm the marker clears.

### Rollback

Rollback clients first, then remove the additive server field. Because the design writes no new class-record state and deletes nothing, rollback requires no data restoration or cleanup. The only lost behavior is the visual/archive warning projection.

## 5. Improvements

### Required decoupling

Use one shared semantic `accountState` projection instead of teaching each client to interpret the raw `DELETED` enum. This keeps identity lifecycle vocabulary out of grading policy and prevents web/mobile drift.

### Optional evidence-backed enhancements

1. Add an `Archived accounts` filter without changing Current/Historical semantics; useful for large rosters.
2. Include the number of affected class records in the archive confirmation if a future read-only impact-preview endpoint is justified. This remains a warning, never a safeguard.
3. Add server-pushed invalidation only if product requirements demand near-real-time cross-session updates; explicit refresh is the current proven model.

## 6. Verification and coverage boundary

- **Confirmed implementation:** the backend now derives `accountState` at read time for spreadsheet rows, period rosters, final/intervention grade identities, and annual summaries while stripping raw lifecycle status from public shapes. Web and mobile render/export the semantic state and show the non-blocking warning at individual, bulk, and Maintenance Access archive entry points.
- **Confirmed local evidence:** focused regressions passed across backend (30 tests), web (32 tests), and mobile (44 tests), plus 10 Android release-contract tests. Whole-project suites passed across backend (1,710 tests), web (864 tests), and mobile (706 tests). Backend/web production builds, admin contract checks, typechecks, lint gates, migration integrity, APK package/version/permission/alignment/signature checks, exact APK/manifest SHA and size matching, and embedded production API URL checks passed.
- **Resolved product decision:** archived account state is informational and does not alter score-entry, score-correction, finalization, enrollment, or period-eligibility authority. Current account status cannot prove historical academic ineligibility. If the school later wants archive to mean withdrawal, that requires a separate enrollment-lifecycle decision with a reason and effective period.
- **Bounded runtime limitation:** component/runtime tests exercise the rendered marker and unchanged eligibility behavior, but no real production learner was archived or reactivated and no physical Android device was used. The signed-in production admin session was used read-only to confirm the pre-release workflow. Exact-SHA CI, deployment, live warning, health, and public APK checks are release gates recorded in the final handoff.
- **Coverage boundary:** inspected current user archive entry points, user lifecycle mutation, class-record spreadsheet/roster/readiness/write paths, final/annual/report reads, schema deletion semantics, shared web teacher/admin consumers, mobile consumers, exports, tests, and governed purge evidence inventory. No additional dependency was found within the inspected scope after the final focused searches for `DELETED`, `isRemoved`, `enrollmentState`, class-record status projections, and archive events.
