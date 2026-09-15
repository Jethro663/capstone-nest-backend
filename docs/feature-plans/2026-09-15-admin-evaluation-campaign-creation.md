# Admin evaluation campaign creation implementation-redesign-solution plan

Date: 2026-09-15
Decision status: Direction A approved; Tasks 1-5 complete; Task 6 release verification in progress
Recommended direction: Direction A — guided, observable campaign builder
Authoritative evidence: `docs/feature-analysis/2026-09-15-admin-evaluation-campaign-creation.md`

## Goal

Make campaign creation on `/dashboard/admin/evaluations` reliably actionable: prevent known invalid inputs, preserve precise backend failures, and ensure campaign/assignment/audit writes complete atomically. Preserve the existing endpoint, DTO shape, roles, evaluation definitions, historical data, and mobile behavior.

## Keep / change / exclude

| Decision | Scope |
| --- | --- |
| Keep | `POST /lxp/system-evaluation-campaigns`, response envelope, form/audience/status enums, backend role authority, existing campaign cards/listing, student/teacher inbox contract, audit actions. |
| Change | Web builder scope input, client validation/error feedback, backend transaction ownership, and focused tests. |
| Extend within same invariant | Campaign status activation transaction, because it performs the same assignment/audit lifecycle. |
| Do not change | Database schema, migration history, evaluation questions/scoring, mobile screens, AI service, unrelated admin modules, existing campaign rows. |

## Direction options

1. **Direction A — guided, observable builder (recommended):** explicit role-wide/class scope, class selector, bounded inputs, inline errors, preserved API error, assigned-count success, atomic backend lifecycle.
2. **Direction B — minimal patch:** retain UUID field; add error/date/title handling and atomic backend lifecycle.
3. **Direction C — campaign wizard/recipient preview:** new preview contract and confirmation flow; defer unless separately requested.

Implementation below assumes explicit approval of Direction A.

## Contracts and invariants

- Public request remains `CreateSystemEvaluationCampaignPayload`; no new required field.
- Role-wide scope continues to omit `classId`; class scope supplies a class ID from `GET /classes/all`.
- Backend remains authoritative for role, form/audience compatibility, class access, and date range.
- An active campaign must not persist unless assignment creation and create-audit append also succeed.
- Activating an existing campaign must not persist active status unless assignments and status audit also succeed.
- Existing mobile consumers need no source change; shared-contract tests must remain green.
- No production data repair or cleanup is part of this change.

## Implementation tasks

### Task 1 — test-drive web admission and error evidence

Files:

- Modify `next-frontend/src/components/evaluations/system-evaluations-page.test.tsx`

RED tests:

- [x] End time equal to or before start time shows a specific error and does not call the create service.
- [x] A title longer than 160 characters cannot be submitted.
- [x] Selecting `Specific class` requires a class choice; role-wide scope omits `classId`.
- [x] A mocked backend 400 message such as `Campaign end date must be after start date.` appears instead of the generic toast.
- [x] A successful request reports the returned assignment count and refreshes existing campaign/evaluation data.
- [x] Failed requests retain entered values so the admin can correct them.

Run the focused test and record the expected failures before implementation.

### Task 2 — implement Direction A in the existing admin builder

Files:

- Modify `next-frontend/src/components/evaluations/system-evaluations-page.tsx`
- Reuse `next-frontend/src/services/class-service.ts`
- Reuse `next-frontend/src/lib/api-error.ts`

Steps:

- [x] Load active classes for admin scope with the existing paginated class service; do not add an endpoint.
- [x] Replace the raw UUID field with an explicit `Role-wide` / `Specific class` choice and labeled class selector.
- [x] Display classes using existing subject/section/year data while submitting only their ID.
- [x] Add required, 160-character, valid-date, and chronological-range checks adjacent to the affected controls.
- [x] Normalize validated dates within the campaign submit handler.
- [x] Catch the actual error and call `getApiErrorMessage(error, "Failed to create evaluation campaign")`.
- [x] Keep values on failure; reset them only after confirmed success.
- [x] Include `assignmentCount` in success feedback without promising recipients when the backend returns zero.
- [x] Keep the existing campaign list, filters, pagination, and result table unchanged.

### Task 3 — test-drive one atomic backend lifecycle

Files:

- Modify `backend/src/modules/lxp/system-evaluation.service.spec.ts`

RED tests:

- [x] `createCampaign` invokes the campaign insert, active assignment insert, and audit log through one transaction handle.
- [x] The audit helper receives that same transaction handle.
- [x] Draft creation records an audit but does not create assignments.
- [x] Active status transition performs update, assignment creation, and status audit through one transaction handle.
- [x] Validation and authorization failures occur before transaction/write work.

The unit tests should prove transaction ownership and call ordering. PostgreSQL provides rollback semantics when the transaction callback rejects; no custom compensation/delete path should be introduced.

### Task 4 — implement transaction-aware campaign writes

Files:

- Modify `backend/src/modules/lxp/system-evaluation.service.ts`

Steps:

- [x] Define the smallest database-handle type needed by respondent resolution, campaign/assignment writes, and audit insertion.
- [x] Allow `resolveRespondents` and `createAssignments` to receive the current database/transaction handle, defaulting only for read-only callers if necessary.
- [x] Wrap campaign insert, active assignment creation, and create audit in `this.db.transaction`.
- [x] Pass the transaction to `auditService.log`, using its existing optional database parameter.
- [x] Apply the same transaction ownership to active status transitions.
- [x] Preserve current `onConflictDoNothing`, assignment status, role selection, response shape, and audit action names.
- [x] Do not add a migration or alter existing rows.

### Task 5 — contract and regression verification

Files expected to remain unchanged but tested:

- `next-frontend/src/services/lxp-service.ts`
- `backend/src/modules/lxp/lxp.controller.ts`
- `backend/src/modules/lxp/lxp.service.ts`
- `mobile/src/api/services/evaluations.ts`

Commands:

```bash
cd backend
npm test -- --runInBand src/modules/lxp/system-evaluation.service.spec.ts src/modules/lxp/lxp.controller.spec.ts src/modules/lxp/lxp.service.spec.ts
npm run build

cd ../next-frontend
npm test -- --runInBand src/components/evaluations/system-evaluations-page.test.tsx src/services/__tests__/lxp-service.test.ts
npm run build

cd ../mobile
npm test -- --runInBand src/api/__tests__/admin-api.test.ts src/api/__tests__/evaluations-api.test.ts
```

Acceptance checks:

- [x] Role-wide payloads omit `classId` through the shared audience-independent payload branch.
- [x] Specific-class payloads contain only a class selected from the existing class list.
- [x] Invalid date order and missing class selection are blocked locally with actionable text.
- [x] Backend 4xx messages are visible and form data remains editable.
- [x] Successful create shows the backend assignment count and refreshes the list.
- [x] Transaction tests prove campaign activation cannot commit ahead of assignments/audit.
- [x] Existing web/mobile service contracts remain unchanged.

### Task 6 — finish and ship after approval

Use the `finish-and-ship` workflow only after Direction A is approved and Tasks 1-5 are green.

- [x] Recheck `git status`, branch, upstream, and `origin/developement...HEAD` before edits and before push.
- [x] Review the final diff for scope: only the two implementation files, their focused tests, and these two evidence/plan documents unless a proven test requires more.
- [x] Run repository quick validation plus the focused commands above.
- [ ] Commit with a scoped message and push the exact SHA to `origin/developement`.
- [ ] Correlate the pushed SHA with required GitHub Actions and Railway backend/frontend deployments.
- [ ] Verify the deployed route loads and preserves the redesigned controls and error behavior.
- [ ] Do not create a durable production campaign for acceptance. Use automated interaction tests and read-only live checks; request separate authorization if a real production campaign is ever required.
- [ ] Report exact SHA, test counts, CI/deployment status, and any acceptance evidence not obtained.

## Risk controls

| Risk | Control |
| --- | --- |
| Frontend diverges from backend validation | Keep server authority; mirror only stable DTO/date constraints and surface its returned message. |
| Class selector loads too much data | Reuse current paginated class service and request a bounded active list; retain role-wide selection if class lookup fails. |
| Transaction refactor accidentally uses root DB | Tests assert the same transaction handle for every write and audit call. |
| Shared mobile contract breaks | No DTO/route/envelope change; run mobile API contract tests. |
| Existing campaigns are modified | No data migration, cleanup, backfill, or production create. |
| Scope expands into evaluation responses | Keep question, response, score, and reporting code untouched. |

## Rollback plan

- Revert the scoped application commit if deployment validation fails.
- No schema rollback is required.
- No production data rollback should be needed because the release does not migrate or rewrite existing campaigns.
- If the class list cannot load, role-wide creation remains available and the UI reports the class-load issue; it must not accept raw identifiers as a silent fallback.

## Approval gate

Direction A was explicitly approved. Tasks 1-5 are complete and locally verified. Task 6 is authorized and must retain the no-production-campaign acceptance boundary.
