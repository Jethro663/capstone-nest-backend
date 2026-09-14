# Admin Archive Purge and Teacher Notification Remediation Implementation Plan

**Implementation status:** Completed locally on 2026-09-14. Release verification remains governed by the rollout and acceptance gates in Sections 9–10.

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task, `superpowers:test-driven-development` for every behavior change, and `superpowers:verification-before-completion` before any completion or release claim.

**Goal:** Make governed multi-target class/section erasure work for evidence-bearing archived records, remove archived class/section context from the Teacher notification surface, and add governed multiple-user purge selection to the Admin Deleted users view.

**Architecture:** Keep the existing atomic, manifest-bound erasure workflow. Extend its fail-closed schema catalog through CASCADE-reachable descendants and explicitly clear only reviewed restrictive class-record children before deleting the parent. Separate lifecycle impact from notification audience, retire known teacher-context notifications through a reversible `hiddenAt` state, and reuse the existing `USER` batch-erasure dialog from the users list.

**Tech Stack:** NestJS 11, Drizzle ORM, PostgreSQL, Jest, Next.js 16 App Router, React 19, Testing Library, TypeScript, GitHub Actions, Railway.

## Global Constraints

- Preserve Admin RBAC, active Maintenance Access, erasure scope, exact confirmation, manifest expiry/hash, idempotency, atomic rollback, durable operation/item receipts, audit logging, and post-commit storage cleanup.
- Do not alter the restrictive academic-evidence foreign keys to global `ON DELETE CASCADE`; deletion remains available only through the governed erasure service.
- Do not partially delete a reviewed batch. One failure rolls back every target.
- Do not expose SQL text, parameters, credentials, confirmation phrases, target names, or deleted evidence in failure responses or receipts.
- Keep unknown notification metadata visible. Retire only confirmed lifecycle `targetType/targetId` and producer `metadata.classId` shapes.
- Preserve learner membership notices. Stop archive-event delivery to teachers/advisers and retire their older rows for the exact archived context.
- Do not change AI service or mobile UI. Update mobile contract types only if the additive erasure preview contract requires it.
- No Android/iOS packaging is required because no mobile runtime source is changed.

---

## 1. Decision Summary

Ship one coordinated remediation with three user-visible outcomes:

1. A class or section batch containing class-record legacy evidence previews that evidence and deletes it inside the reviewed transaction before the parent cascade.
2. Teachers/advisers no longer receive the archive lifecycle event, and older notification rows belonging to the archived class/section disappear consistently from inbox results and unread counts while lifecycle audit records remain.
3. Admin Deleted users rows support 1–50 selection and open the same governed `AdminErasureBatchDialog` already used for classes, sections, and individual accounts.

The canonical analysis is `docs/feature-analysis/2026-09-13-admin-lifecycle-blocker-dead-ends.md`. This plan resolves its prior unverified branches using authenticated preview, production operation/log evidence, production FK catalog inspection, and read-only target dependency counts.

## 2. Scope, Non-goals, Permissions, and Assumptions

### In scope

- Recursive CASCADE-reachable FK inspection and catalog hash coverage.
- Reviewed cleanup rules for restrictive descendants of `class_records`.
- Preview counts for legacy-grade evidence, period-grade revisions, and class-record participants.
- Target-scoped preview blockers/warnings while retaining compatible top-level aggregates.
- Safe failed-operation diagnostics with an operation ID.
- Notification `hiddenAt` schema, backfill, archive-time retirement, and list/count filtering.
- Explicit learner-vs-staff notification policy for class/section archive.
- Deleted-users selection and governed multi-user purge UI.
- Focused unit, real-PostgreSQL integration, contract, build, authenticated preview, CI, and deployment verification.

### Non-goals

- Partial-success erasure.
- Restoring archived classes or sections.
- A broad notification context normalization across every producer.
- A teacher audit-history UI.
- Purging live production school records as a verification technique.
- Mobile admin selection UI or APK work.

### Authorization and release assumption

The user explicitly authorized implementation and shipping after the plan is made and self-reviewed. Work stays on the current `developement` checkout, preserves unrelated changes, commits only scoped files, pushes `developement`, and verifies the exact pushed SHA through CI and Railway.

## 3. Evidence Ledger

| ID | Status | Evidence | Consequence |
|---|---|---|---|
| P1 | Confirmed | Production operations show failed CLASS ×29, repeated CLASS ×3, and SECTION ×3 executions; completed CLASS ×1 and SECTION ×1 executions occurred around them. | Batch support and the single route work; failure is target-data-dependent, not persistent client poisoning. |
| P2 | Confirmed | Repeated CLASS ×3 parameters resolve to ESP 10, Mathematics 7, and Science 7. Only Mathematics 7 has 4 class records and 8 legacy-evidence rows. | The evidence-bearing class is the batch and repeat-single culprit. |
| P3 | Confirmed | Failed SECTION ×3 contains Grade 7 - Section B, the only member with legacy evidence: 3 class records and 12 evidence rows. | The same transitive graph explains section failure. |
| P4 | Confirmed | Production FKs: `classes -> class_records` cascades, while three `class_record_id -> class_records` edges restrict/no-action: legacy evidence, grade revisions, and participants. | These children must be classified and explicitly deleted in the governed transaction. |
| P5 | Confirmed | `inspectSchema()` only selects FKs whose immediate parent is `classes`, `sections`, or `users`. | Current preflight/schema hash cannot see P4. |
| P6 | Confirmed | `applyCatalogDeletion()` clears only `academic_period_grade_revisions.class_id` before parent class/section deletion. | P4 children remain and PostgreSQL correctly rejects the cascade. |
| P7 | Confirmed | Current 29-class production preview succeeds with no blocker. | This incident is an execute-phase catalog defect, not a preview lifecycle blocker. |
| N1 | Confirmed | Class archive audience includes learners plus source/replacement teachers; section archive includes learners, adviser, linked-class teachers, and staff from learner plans. | `affectedUserIds` is not a valid notification audience. |
| N2 | Confirmed | Production has 12 unread teacher archive-event notifications and 9 teacher rows attached to inactive classes; 7 of those 9 are unread. | Both new archive events and prior context rows require remediation. |
| N3 | Confirmed | Notification list and unread count filter only by user/read state. | One shared persisted visibility state must govern both paths. |
| U1 | Confirmed | Deleted users show `Individual`, hide checkboxes/bulk bar, and route to profile; backend already accepts `USER` with 1–50 IDs. | The missing capability is isolated to the list UI. |

## 4. Impact and Consumer Map

| Provider/owner | Contract or state | Consumers | Required disposition |
|---|---|---|---|
| `backend/src/modules/admin-lifecycle/admin-erasure.catalog.ts` | Catalog version, restrictive relationship rules | Erasure schema check and delete executor | Bump catalog; add class-record descendant rules. |
| `backend/src/modules/admin-lifecycle/admin-erasure.service.ts` | Preview/schema hash/atomic delete/failure receipt | Admin controller, web and mobile types | Traverse cascades, clear descendants, attribute target blockers, sanitize failures. |
| `backend/src/modules/admin-lifecycle/purge-lifecycle.service.ts` | Per-target evidence counts | Manifest/preview UI | Count restrictive academic evidence explicitly. |
| `backend/src/modules/admin-lifecycle/admin-lifecycle.evidence.ts` | Typed evidence vocabulary | Student/class/section/purge planners | Add optional normalized counts without changing existing retained-evidence behavior. |
| `next-frontend/src/types/admin-lifecycle.ts` | Erasure preview contract | Shared dialog and pages | Accept schema version 3 and target blocker/warning fields. |
| `mobile/src/types/admin-lifecycle.ts` or equivalent | Erasure preview contract | Mobile admin contract check | Add compatible optional fields only; no runtime screen changes. |
| `next-frontend/src/components/admin/AdminErasureBatchDialog.tsx` | Preview rendering | Class, section, user purge entry points | Render target-owned blockers/warnings and global blockers distinctly. |
| `backend/src/drizzle/schema/announcements-notifications.schema.ts` | Notification row | Notifications service and API | Add nullable `hiddenAt`. |
| `backend/src/modules/notifications/notifications.service.ts` | Inbox/count/create/retirement behavior | Web/mobile notification providers | Exclude hidden rows; add scoped retirement method. |
| Class/section lifecycle planners | Affected users and context IDs | Lifecycle executor | Return learner recipients and staff/context retirement data separately. |
| `backend/src/modules/admin-lifecycle/admin-lifecycle.service.ts` | Notification creation after apply | Teachers, learners, notification service | Retire staff context and create learner-only archive notifications. |
| `next-frontend/app/(dashboard)/dashboard/admin/users/page.tsx` | Deleted-user selection | Admin users workflow | Reuse governed USER batch dialog with max 50 selected. |

## 5. Options, Conflicts, Invariants, and Risks

### Erasure options

1. Change evidence FKs to `ON DELETE CASCADE` — rejected. It makes ordinary class-record deletion destroy academic evidence outside the governed workflow.
2. Delete each selected target separately and skip failures — rejected. It violates the signed batch manifest, atomicity, and audit expectations.
3. Recursively inspect reachable relationships and explicitly delete reviewed restrictive children — selected. It closes the observed gap while retaining database protections elsewhere.

### Notification options

1. Filter only in Teacher web UI — rejected. Mobile, unread badges, pagination totals, and sockets would disagree.
2. Permanently delete notification rows — rejected. It is harder to roll back and erases delivery evidence unnecessarily.
3. Add nullable `hiddenAt`, backfill confirmed archived contexts, and retire exact contexts at archive time — selected. It is consistent, recoverable, and leaves lifecycle/audit records intact.

### Primary risks and controls

| Risk | Control |
|---|---|
| Recursive FK query loops or hashes irrelevant graph edges | Traverse only `CASCADE` edges from the three roots, retain visited OID paths, cap depth, and deduplicate final references. |
| Explicit deletes remove more evidence than previewed | Use target-bound subqueries through `class_records.class_id` and `classes.section_id`; test unrelated evidence survives. |
| Manifest drift after catalog change | Bump catalog and schema version; execute re-previews inside the lock/transaction. |
| Notification retirement hides unrelated rows | Scope by staff user IDs plus exact class/section IDs and known metadata keys only. |
| Backfill cannot identify every historic producer | Unknown shapes stay visible; production evidence defines the initial known set. |
| Multi-user UI bypasses safety | Use `AdminErasureBatchDialog` and batch endpoints, not `bulkLifecycle`. |
| Failure details leak SQL/PII | Whitelist only PostgreSQL code, constraint, table, and generic message; return operation ID. |

## 6. Recommended Data Flow and Error Behavior

### Erasure

```text
Selected archived roots
  -> recursive FK review from classes/sections/users through CASCADE descendants
  -> fail closed on any unclassified RESTRICT/NO ACTION edge
  -> preview explicit legacy evidence / revisions / participants per target
  -> signed manifest + exact confirmation
  -> lock roots and re-preview
  -> delete reviewed restricted class-record children by target-bound subquery
  -> delete parent roots atomically
  -> durable per-target receipt + audit + post-commit storage cleanup
```

For an unexpected database error, store `ERASURE_EXECUTION_FAILED` plus a safe cause summary and throw an HTTP 500 body containing only `{ code, message, operationId }`. Preserve existing HTTP exceptions such as 403/409 unchanged.

### Notifications

```text
Class/section archive plan
  -> learnerNotificationUserIds
  -> staffRetirementUserIds
  -> archivedContext { classIds, sectionIds }
  -> archive transaction hides matching staff notification rows
  -> archive transaction creates learner-only lifecycle rows
  -> inbox + total + unread count always require hiddenAt IS NULL
```

The archive action remains fully represented by `admin_lifecycle_operations`, `audit_logs`, and enrollment lifecycle events. Notification visibility is presentation state, not the audit source of truth.

## 7. Contract, Schema, Migration, and Compatibility

### Erasure preview contract

- Bump `schemaVersion` from 2 to 3.
- Add `blockers`, `warnings`, and `canExecute` to each `AdminErasureTargetPreview`.
- Add `globalBlockers` to `AdminErasureBatchPreview`.
- Retain top-level `blockers`, `warnings`, and `canExecute` as compatible aggregate fields.
- Web and mobile consumers accept the new additive fields in the same commit.

### Notification schema

- Add `notifications.hidden_at timestamptz NULL` and a user/visibility/created index suitable for inbox/count queries.
- Backfill `hidden_at` only for teacher recipients where either:
  - type is `academic_lifecycle_changed` and metadata action is `ARCHIVE_CLASS` or `ARCHIVE_SECTION`; or
  - `metadata.classId` identifies an inactive class.
- Do not delete notification rows.
- Drizzle schema, SQL migration, journal, and snapshot must be generated and integrity-checked together.

### Compatibility

- Existing notification API response shape gains a nullable field; current web/mobile structural types can ignore it.
- Existing single purge adapters remain unchanged.
- Existing erasure execute DTO stays compatible because clients submit the server-provided manifest hash, not a locally computed manifest.
- Unknown notification metadata remains visible.

## 8. Ordered Test-Driven Implementation Phases

### Task 1: Lock the erasure regression in real PostgreSQL

**Files:**

- Modify: `backend/test/admin-erasure.integration-spec.ts`

**Steps:**

- [x] Add a fixture that creates an archived class, class record, participant, legacy-grade evidence, and period-grade revision.
- [x] Add a two-class execution test where only one target has those descendants; assert preview counts, successful atomic deletion, durable two-item receipt, and survival of unrelated evidence.
- [x] Add a two-section execution test with the same nested graph under one linked class.
- [x] Add a two-user batch execution test to prove the already-supported backend contract.
- [x] Run the focused integration command and capture the expected FK failure before product code:

```bash
cd backend
npm run test:academic -- --runTestsByPath test/admin-erasure.integration-spec.ts
```

Expected RED: the evidence-bearing class/section parent delete fails on the restrictive class-record relationship.

### Task 2: Extend evidence vocabulary and transitive erasure catalog

**Files:**

- Modify: `backend/src/modules/admin-lifecycle/admin-lifecycle.evidence.ts`
- Modify: `backend/src/modules/admin-lifecycle/admin-lifecycle.evidence.spec.ts`
- Modify: `backend/src/modules/admin-lifecycle/admin-erasure.catalog.ts`
- Modify: `backend/src/modules/admin-lifecycle/admin-erasure.catalog.spec.ts`
- Modify: `backend/src/modules/admin-lifecycle/purge-lifecycle.service.ts`
- Modify: `backend/src/modules/admin-lifecycle/purge-lifecycle.service.spec.ts`

**Steps:**

- [x] First add unit expectations for `legacyGradeEvidence`, `gradeRevisions`, and `classRecordParticipants` counts and labels.
- [x] Add failing catalog tests that classify the three `class_record_id -> class_records` restrictions for CLASS and SECTION erasure.
- [x] Bump `ADMIN_ERASURE_CATALOG_VERSION` to 2 and add a `CLASS_RECORD_DESCENDANT` selector.
- [x] Query the three evidence groups by class-record IDs in `collectClassEvidence()` and aggregate through section evidence.
- [x] Run focused unit tests to GREEN:

```bash
cd backend
npx jest src/modules/admin-lifecycle/admin-lifecycle.evidence.spec.ts src/modules/admin-lifecycle/admin-erasure.catalog.spec.ts src/modules/admin-lifecycle/purge-lifecycle.service.spec.ts --runInBand
```

### Task 3: Make schema inspection recursive and deletion complete

**Files:**

- Modify: `backend/src/modules/admin-lifecycle/admin-erasure.service.ts`
- Modify: `backend/src/modules/admin-lifecycle/admin-erasure.service.spec.ts`
- Modify: `backend/test/admin-erasure.integration-spec.ts`

**Steps:**

- [x] Add failing service tests showing a restriction on a CASCADE-reachable descendant appears in `unclassified`, and a reviewed class-record restriction does not.
- [x] Replace the direct-only catalog query with a recursive CTE rooted at `classes`, `sections`, and `users`; follow only CASCADE child tables, prevent OID cycles, and return every relationship that references a reachable parent.
- [x] Add target-bound deletes, ordered before parent delete, for:

```sql
DELETE FROM academic_period_grade_revisions
WHERE class_record_id IN (<selected class-record subquery>)
   OR class_id IN (<selected class subquery>);

DELETE FROM academic_legacy_grade_evidence
WHERE class_record_id IN (<selected class-record subquery>);

DELETE FROM class_record_participants
WHERE class_record_id IN (<selected class-record subquery>);
```

- [x] Re-run the real-PostgreSQL test from Task 1; require GREEN for class, section, unrelated-row survival, and batch receipt assertions.

### Task 4: Attribute target blockers and make unexpected failures diagnosable

**Files:**

- Modify: `backend/src/modules/admin-lifecycle/admin-erasure.service.ts`
- Modify: `backend/src/modules/admin-lifecycle/admin-erasure.service.spec.ts`
- Modify: `backend/src/modules/admin-lifecycle/admin-lifecycle.types.ts` if its shared contract mirrors the preview
- Modify: `next-frontend/src/types/admin-lifecycle.ts`
- Modify: `mobile/src/types/admin-lifecycle.ts`
- Modify: `next-frontend/src/components/admin/AdminErasureBatchDialog.tsx`
- Modify: `next-frontend/src/components/admin/AdminErasureBatchDialog.test.tsx`

**Steps:**

- [x] Add RED tests for two targets sharing a blocker code; each target card must retain its own blocker while top-level aggregates remain compatible.
- [x] Add RED tests for nested Drizzle/PostgreSQL failures; safe details include operation ID, code, constraint, and table but exclude query parameters.
- [x] Implement schema version 3, `globalBlockers`, and target-level blocker/warning decisions.
- [x] Implement a bounded nested-cause walker and safe internal failure summary. Re-throw existing Nest HTTP exceptions; wrap only unexpected failures with an operation ID.
- [x] Render target-scoped failures inside each target card and global failures once.
- [x] Run backend, web component, and admin contract checks to GREEN.

### Task 5: Add recoverable notification visibility

**Files:**

- Modify: `backend/src/drizzle/schema/announcements-notifications.schema.ts`
- Add/generated: `backend/drizzle/0031_retire_archived_teacher_notifications.sql`
- Add/generated: `backend/drizzle/meta/0031_snapshot.json`
- Modify/generated: `backend/drizzle/meta/_journal.json`
- Modify: `backend/src/modules/notifications/notifications.service.ts`
- Modify: `backend/src/modules/notifications/notifications.service.spec.ts`

**Steps:**

- [x] Add RED tests proving `findByUser`, total, and unread count all exclude hidden rows.
- [x] Add a RED test for `hideArchivedTeacherContext()` scoped by staff IDs plus exact class/section context.
- [x] Add `hiddenAt` and the visibility index in the Drizzle schema.
- [x] Generate the migration, then append the narrow production-confirmed backfill with `apply_patch`.
- [x] Implement retirement with parameterized Drizzle SQL and idempotent `hiddenAt IS NULL` behavior.
- [x] Run migration integrity, notification unit tests, and backend build.

### Task 6: Separate class/section archive audience from staff retirement

**Files:**

- Modify: `backend/src/modules/admin-lifecycle/class-lifecycle.service.ts`
- Modify: `backend/src/modules/admin-lifecycle/class-lifecycle.service.spec.ts`
- Modify: `backend/src/modules/admin-lifecycle/section-lifecycle.service.ts`
- Modify: `backend/src/modules/admin-lifecycle/section-lifecycle.service.spec.ts`
- Modify: `backend/src/modules/admin-lifecycle/admin-lifecycle.service.ts`
- Modify: `backend/src/modules/admin-lifecycle/admin-lifecycle.service.spec.ts`

**Steps:**

- [x] Add RED planner tests: learner IDs are notification recipients; teacher/adviser/destination staff IDs are retirement targets; archived class/section IDs are explicit.
- [x] Add a RED executor test proving retirement occurs before learner-only notification insertion in the same academic transaction.
- [x] Extend the internal apply result with optional `notificationUserIds` and `notificationRetirement` while preserving student-resolution behavior.
- [x] Call `hideArchivedTeacherContext()` for archive actions and create archive notifications only for learner recipients.
- [x] Assert lifecycle operation/audit logging remains unchanged.

### Task 7: Add governed multi-user purge selection

**Files:**

- Modify: `next-frontend/app/(dashboard)/dashboard/admin/users/page.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/admin/users/page.test.tsx`

**Steps:**

- [x] Mock `AdminErasureBatchDialog` and `adminLifecycleService`, then add a RED test that Deleted rows expose checkboxes, select-all, selected count, and `Review permanent deletion`.
- [x] Assert selection caps at 50, excludes the current admin, and sends all selected IDs as `targetType="USER"` to the governed dialog.
- [x] Show the bulk bar on Deleted, preserve existing suspend/archive bulk actions on other tabs, and keep row/profile review available.
- [x] On completion, clear selection, refetch, and show the deleted count; do not call `userService.bulkLifecycle` for purge.
- [x] Run the page test and frontend typecheck to GREEN.

### Task 8: Full verification and self-review

**Steps:**

- [x] Re-read the canonical analysis and this plan against the diff; every confirmed culprit and required improvement must map to code and a test.
- [x] Run focused tests first, then the smallest full verification set:

```bash
cd backend
npx jest src/modules/admin-lifecycle/admin-lifecycle.evidence.spec.ts src/modules/admin-lifecycle/admin-erasure.catalog.spec.ts src/modules/admin-lifecycle/admin-erasure.service.spec.ts src/modules/admin-lifecycle/purge-lifecycle.service.spec.ts src/modules/admin-lifecycle/class-lifecycle.service.spec.ts src/modules/admin-lifecycle/section-lifecycle.service.spec.ts src/modules/admin-lifecycle/admin-lifecycle.service.spec.ts src/modules/notifications/notifications.service.spec.ts --runInBand
npm run test:academic -- --runTestsByPath test/admin-erasure.integration-spec.ts
npm run contract:admin
npm run build

cd ../next-frontend
npx jest 'app/(dashboard)/dashboard/admin/users/page.test.tsx' src/components/admin/AdminErasureBatchDialog.test.tsx --runInBand
npm run typecheck
npm run build

cd ..
node scripts/check-admin-client-contracts.cjs
git diff --check
```

- [x] Inspect `git diff`, verify no unrelated file was overwritten, and perform a self-review for security, migration safety, atomicity, notification consistency, and test gaps.

## 9. Verification Matrix and Acceptance Criteria

| Scenario | Automated proof | Authenticated/runtime proof |
|---|---|---|
| Evidence-bearing CLASS ×2 | Real PostgreSQL integration deletes both and all previewed descendants; unrelated evidence survives | Production preview for the known archived set remains executable and now includes legacy evidence counts. No live delete. |
| Evidence-bearing SECTION ×2 | Real PostgreSQL integration deletes both sections and linked descendants atomically | Production section preview identifies nested evidence. No live delete. |
| Future unknown transitive restriction | Integration inserts an unclassified reachable FK and preview fails closed | Deployment logs contain no unhandled parent-delete error during preview checks. |
| Same blocker on two targets | Unit/UI tests retain blocker ownership on both target cards | Browser preview shows row-owned explanations if present. |
| Unexpected DB failure | Unit/integration proves rollback and safe operation-ID response | Railway logs/operation lookup correlate failure without SQL parameters. |
| Teacher archive event | Lifecycle tests exclude staff and retain learner recipients | Teacher notification aggregate after deployment has no new archive-event rows. |
| Older inactive-class rows | Migration/service tests hide known shapes; list/count exclude hidden rows | Authenticated Teacher inbox and unread count omit archived context. |
| Deleted USER ×2 | Page test opens governed dialog with both IDs; backend integration deletes two in disposable DB | Admin browser selects multiple Deleted users and reaches the reviewed preview without executing production deletion. |
| Existing single purge | Shared dialog and integration regression stay green | One-item preview still works with a fresh key after closing a batch preview. |

Acceptance requires all automated checks green, exact pushed SHA CI success, Railway deployments successful for affected services, non-destructive authenticated preview evidence, and no uncommitted scoped change left behind.

## 10. Rollout, Rollback, Observability, and Cleanup

### Rollout

1. Commit one scoped change on `developement`.
2. Push the exact commit SHA to `origin/developement`.
3. Watch GitHub Actions for that SHA.
4. Verify Railway backend and frontend deployments correspond to that SHA and reach `SUCCESS`.
5. Confirm migration `0031` applied through startup logs or migration metadata.
6. Run authenticated, non-destructive Admin previews and Teacher inbox/count checks.

### Rollback

- Revert the code commit if runtime behavior regresses.
- The nullable `hidden_at` column is backward-compatible with old code.
- To restore notification visibility, set `hidden_at = NULL` only for rows hidden by the migration's exact teacher/archive predicates; do not delete lifecycle or audit rows.
- Do not roll back by changing evidence FKs or bypassing the erasure catalog.

### Observability

- Erasure failure records: operation ID, target type/count, stable failure code, safe PostgreSQL code/constraint/table, timestamps.
- Never log passwords, tokens, confirmation text, target names, evidence content, or SQL parameters.
- Notification acceptance metric: visible/unread teacher counts for known archived-context predicates before and after migration.
- Deployment evidence: exact commit SHA, GitHub run ID/conclusion, Railway deployment IDs/statuses, authenticated route checks.

### Cleanup and deferred work

- Keep unknown notification metadata visible; a future separately planned change may normalize every producer to indexed `contextType/contextId`.
- A future admin audit screen may expose archive history independent of the notification inbox.
- Archive the existing OpenSpec `admin-authority-cascade-erasure` only after its remaining acceptance tasks and this production remediation are verified; do not silently mark unrelated OpenSpec tasks complete.

## 11. Plan Self-review Verdict

The plan is decision-ready. The purge culprit is no longer inferred: production failures, exact target membership, data counts, FK topology, and the direct-only source query converge on the same missing class-record descendant rules. The notification issue is confirmed in both source and production aggregate counts, and the selected `hiddenAt` design preserves audit evidence while keeping list/count consistent. Multi-user purge requires no new backend primitive. Remaining uncertainty is verification uncertainty—whether the implementation and deployment pass—not design uncertainty that would change the chosen architecture.
