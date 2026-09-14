# Class Record Archived Account State — Implementation Plan

Date: 2026-09-14

Status: Implemented and locally verified; exact-SHA CI/deployment evidence is recorded in the release handoff

Source analysis: `docs/feature-analysis/2026-09-14-class-record-archived-student-state-analysis.md`

## 1. Outcome and fixed decisions

The class-record system will retain every learner row and all academic evidence when an administrator archives the learner's account. Teacher and administrator workbooks will show the learner name with a strike-through and a visible `Archived account` label. The same state will appear in annual summaries, intervention/final-grade reports, and exported workbooks.

The implementation will not delete enrollment, participant, score, final-grade, annual-grade, or audit rows. It will not add an archive safeguard, a cascade, a backfill, or a database migration. It will not make archived-account state a grading permission rule.

The three learner dimensions remain orthogonal:

- `enrollmentState: "active" | "removed"` answers whether the learner is currently enrolled in the class.
- `eligibility` answers whether the learner belongs in the selected academic period's official record.
- `accountState: "active" | "archived"` answers whether the learner can still use the school account.

`accountState` is derived at read time from `users.status`: `DELETED` becomes `archived`; every other current status becomes `active`. Restoring the user therefore removes the marker on the next refetch without rewriting academic records.

## 2. Confirmed current evidence

### Archive owner

- `backend/src/modules/users/users.service.ts` `softDeleteUser` preserves an archived snapshot, changes only the user's lifecycle state to `DELETED`, records an audit event, and does not mutate academic data.
- Web and mobile archive confirmations currently describe lost login access or deleted status, but they do not explain that class-record evidence stays visible and will be marked.
- A read-only production check on 2026-09-14 confirmed the signed-in admin workflow and the existing wording. No live user or academic record was changed.

### Class-record owner

- `backend/src/modules/class-record/class-record.service.ts` builds the spreadsheet's active set from `enrollments.status = 'enrolled'`, unions historical participants/scores/final grades for removed rows, and currently omits `users.status`.
- `backend/src/modules/class-record/class-record-roster.service.ts` builds the period roster from participants, membership, scored learners, and final-grade learners, but selects only learner names.
- `backend/src/modules/academic-state/annual-grades.service.ts` selects learner names for annual summaries and omits account lifecycle state.
- `backend/src/modules/class-record/class-record.service.ts` final-grade and intervention responses join learner identity but omit account lifecycle state.

### Consumers

- The web workbook is shared by teacher class record, teacher class detail, and admin academic-record views. `TeacherClassRecordGradeGrid.tsx` filters only by enrollment history and gates editing on period eligibility.
- The mobile `AcademicWorkbook.tsx` is shared by teacher and admin flows. `MobileClassRecordWorkbook.tsx` filters only by enrollment history.
- Web and mobile academic workbook exports currently include eligibility and academic status but no account state.
- Annual summary, final-grade/intervention report, and history labels identify learners without an archived marker.

## 3. Alternatives considered

### A. Delete archived learners from each class record

Rejected. This would require destructive fan-out across enrollment, participant, score, final-grade, annual-grade, assessment, and audit relationships. It would erase or distort academic evidence and turn account lifecycle into an academic-record mutation.

### B. Mark archived learners but also block score correction

Rejected. The current authorization owner is period eligibility plus record state. Adding a second rule would conflate account access with teacher/admin evidence correction and could block legitimate correction of retained records.

### C. Preserve rows and present account state independently

Selected. This makes the learner's departure visible without changing academic membership, calculations, readiness, finalization, historical filters, or correction permissions.

## 4. Contract design

Add one response field to learner-bearing class-record contracts:

```ts
type AccountState = "active" | "archived";
```

The field is required in new backend responses and optional in web/mobile TypeScript types during rolling deployment compatibility. Clients treat a missing value as `active` until the backend is deployed.

Add `accountState` to:

1. Every `SpreadsheetStudentRow` returned by `GET /api/class-record/:id/spreadsheet`.
2. Every period-roster participant returned by `GET /api/class-record/:id/roster`.
3. Every annual-summary student returned by `GET /api/class-record/annual/:classId`.
4. The nested `student` object in final-grade and intervention-list responses.

Do not return raw `users.status`; the backend exposes only the bounded class-record semantic.

Compatibility and state transitions:

- `DELETED` -> `accountState: "archived"`.
- `ACTIVE`, `PENDING`, and `SUSPENDED` -> `accountState: "active"` for this feature. These states are not archived and should not be visually crossed out.
- Restore from `DELETED` -> marker disappears after the query is refreshed.
- Archive/restore does not change `enrollmentState`, `eligibility`, scores, calculations, revisions, or final grades.

## 5. Implementation phases

### Phase 1 — Backend contract and regression tests

Write failing tests first, observe the failures, then implement.

1. Add a small pure account-state mapper in `backend/src/modules/class-record/` so spreadsheet, roster, annual, and report projections share one definition.
2. Update `backend/src/modules/class-record/class-record.service.ts`:
   - select user status for active and historical spreadsheet learners;
   - emit `accountState` on every spreadsheet row;
   - include user status in final-grade, student-grade, and intervention joins, then map the nested identity to `accountState` without leaking raw status.
3. Update `backend/src/modules/class-record/class-record-roster.service.ts` to select user status and emit `accountState` for each participant.
4. Update `backend/src/modules/academic-state/annual-grades.service.ts` to select user status and emit `accountState` for each annual-summary learner.
5. Extend focused backend tests:
   - `class-record.service.spec.ts` proves an enrolled archived learner remains an active enrollment row with `accountState: "archived"`, and a removed archived learner remains a historical row with both states intact;
   - add or extend a roster service unit test proving archive state does not change eligibility/current enrollment;
   - add or extend annual-grade and final/intervention response tests to prove the marker is projected without changing academic values.

No schema file or migration changes are expected.

### Phase 2 — Web contracts and shared workbook presentation

Write failing rendering/export tests first, observe the failures, then implement.

1. Add the shared `AccountState` type and optional `accountState` fields in:
   - `next-frontend/src/types/class-record.ts`;
   - `next-frontend/src/types/academic-grading.ts`.
2. Update `TeacherClassRecordGradeGrid.tsx` and its CSS module:
   - strike only the learner name, not scores or grade values;
   - show a compact `Archived account` label beside/below the name;
   - expose `data-account-state` for deterministic tests;
   - leave current/historical filters based only on `enrollmentState`/`isRemoved`;
   - leave edit enablement based only on existing record state and `eligibility`.
3. Update `TeacherClassRecordWorkbook.tsx` so roster confirmation and score-dialog learner identities also show the marker without changing controls.
4. Update `AcademicAnnualSummary.tsx` so annual learner identity uses the same strike-through and label while all annual evidence actions remain unchanged.
5. Update teacher/admin report name formatters and PDF formatting so final/intervention evidence identifies archived learners.
6. Update `next-frontend/src/lib/academic-workbook-export.ts` so period, annual, and evidence sheets contain an `Account state` column with `Active` or `Archived account`.
7. Update relevant focused tests, including workbook visuals, annual summary, reports/PDF, and export row/column assertions.

Because the web workbook component is shared, these changes cover teacher standalone, teacher class-detail, and admin academic-record surfaces without duplicating business rules.

### Phase 3 — Mobile contracts and shared workbook presentation

Write failing component/export tests first, observe the failures, then implement.

1. Add matching optional fields in `mobile/src/types/class-record.ts` and `mobile/src/types/academic-grading.ts`.
2. Update `mobile/src/components/teacher/MobileClassRecordWorkbook.tsx`:
   - strike only archived learner names;
   - add visible `Archived account` text;
   - keep the learner in the current/historical filter chosen by enrollment state.
3. Update `mobile/src/components/academic/AcademicWorkbook.tsx` roster, score-selection, and identity summaries to show account state while preserving all existing eligibility-based disabled conditions.
4. Update `mobile/src/components/academic/AcademicAnnualPanel.tsx` so archived learners are explicitly identified in annual evidence.
5. Update `mobile/src/lib/academic-workbook-export.ts` with the same `Account state` columns and values as web.
6. Extend focused mobile workbook, academic workbook, annual-panel, and export tests.

### Phase 4 — Archive warnings

Update only the informational copy; do not add a blocker, checkbox, or second confirmation.

Use this student-specific warning on individual web/mobile archive actions:

> This learner will lose account access. Existing class-record rows, scores, grades, and audit evidence will be retained and marked “Archived account” for teachers and administrators. Archiving does not change class enrollment or period eligibility.

For bulk archive dialogs, use a plural equivalent and a conditional role note: affected student accounts retain and visibly mark class-record evidence; teacher/admin accounts have no learner class-record rows. Keep existing purge/restoration explanations.

Files:

- `next-frontend/app/(dashboard)/dashboard/admin/users/page.tsx`
- `mobile/src/screens/AdminUsersScreen.tsx`
- `mobile/src/screens/AdminUserDetailScreen.tsx`
- their existing focused tests or source-contract tests

### Phase 5 — Documentation closure

Update the source analysis report after implementation to replace its remaining `Unverified` items with the exact verification result or an explicit bounded limitation. Record the final decision that account state is informational and does not alter score-correction permissions.

## 6. Verification plan

### Focused red/green tests

1. Backend class-record spreadsheet, roster, annual summary, final grade, and intervention projection tests.
2. Web shared workbook, visual helper, annual summary, reports/PDF, and export tests.
3. Mobile shared workbook, academic workbook/annual panel, export, and admin archive-warning tests.

Each production change must be preceded by a focused failing assertion demonstrating the missing behavior, then rerun green after implementation.

### Static and build gates

- Backend: focused Jest; `npm run contract:admin`; `npm run lint`; `npm run test -- --ci`; `npm run build`.
- Web: focused Jest; `npm run typecheck`; `npm run lint`; `npm run test -- --ci`; `npm run build`.
- Mobile: focused Jest; `npm run test:release`; `npm run typecheck`; `npm run test`; `npm run build:rich-text`.
- Repository contract checks and any smallest-valid smoke selected by the repo workflow.

### Runtime acceptance

Use non-production fixture data where possible; do not archive a real production learner merely to prove the feature.

1. With an archived fixture learner that is still enrolled and period-eligible, verify teacher and admin workbooks show the learner in the current list with only the name crossed out and `Archived account` visible.
2. Verify scores, quarterly grade, annual grade, report rows, and export rows are unchanged except for the new account-state marker/column.
3. Verify score entry/correction remains available exactly when it was previously available by record state and eligibility.
4. Restore the fixture learner and refetch; verify the marker clears without modifying academic rows.
5. Verify a removed-and-archived learner remains under the historical filter and carries both meanings.

### Mobile packaging

Mobile source changes require a new Android release artifact using the existing release tooling.

1. Bump from `0.1.38` / versionCode `39` to `0.1.39` / versionCode `40` through the repository's established release files.
2. Build the release APK with `EXPO_PUBLIC_API_URL=https://capstone-backend-v2-production.up.railway.app/api`.
3. Run `npm run release:prepare` with release notes describing archived-account visibility, then `npm run release:verify` and `npm run test:release`.
4. Verify APK package, embedded version, install permission, alignment/signature, byte size, SHA-256, manifest, and public download path.
5. Keep Android evidence separate from iOS; no iOS artifact claim is made by this change.

## 7. Release, observation, and rollback

### Release

1. Review the final diff and ensure only task-owned files are staged; preserve unrelated user changes.
2. Commit on the current `developement` branch and capture the full commit SHA.
3. Fetch and verify the branch is not behind; push the exact commit to `origin/developement`.
4. Track GitHub Actions runs filtered by that exact SHA. Required CI and mobile gates must pass.
5. Track the Railway workflow/deployments for the same SHA until backend and frontend report success.
6. Verify live backend health, live frontend load, deployed warning copy, API `accountState`, and public APK manifest/download SHA for the released build.
7. Report physical-device testing only if actually performed; archive/package checks are not physical-device proof.

### Rollback

- UI/type-only rollback: revert the client marker/warning/export changes; missing optional `accountState` remains compatible.
- Backend rollback: revert the query projection. No stored data, schema, enrollment, or academic evidence requires restoration.
- Artifact rollback: restore the preceding APK and manifest pair together; never roll back only one member of the verified pair.

## 8. Risks and mitigations

- **State conflation:** keep account, enrollment, and eligibility fields distinct in names, types, tests, and filters.
- **Accidental grading block:** regression-test enabled controls for archived-but-eligible learners.
- **Partial consumer rollout:** use optional client fields and an active fallback; deploy backend before relying on the marker.
- **Invisible export drift:** add explicit account-state columns in all learner-bearing sheets and test header/value alignment.
- **Raw lifecycle leakage:** map status inside backend services and never expose raw `users.status` in class-record DTO shapes.
- **Performance regression:** add only the already-joined user status column; no new per-row query or archive fan-out.

## 9. Evidence boundary

The plan is implemented for every discovered Nexora-owned class-record consumer in backend, web, and mobile. Focused and whole-project local tests, static/build gates, and the Android artifact integrity checks passed before commit. Exact-SHA CI, deployment, live health/warning, and public artifact checks remain release gates and are reported in the final handoff; physical-device testing remains a separate claim. “Absolute” in release reporting means that all identified owners and consumers passed their explicit checks for the exact shipped SHA—not that unobservable external clients or all possible future states have been proven.
