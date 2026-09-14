# Admin Archive Purge and Teacher Notification Isolation Analysis

**Revised:** 2026-09-14

**Repository baseline:** `developement` at `7c5df592956b012f3119217691f4863a8db9aec8`, equal to `origin/developement` when inspected.

**Scope:** archived class and section batch purge, the reported batch-then-single purge failure, archived-context notifications visible to teachers, and multi-select purge for deleted users in the admin web UI.

**Method:** analysis only. The inspection covered current source, focused tests, exact-SHA CI, an authenticated read-only production preview, Railway deployment/configuration/runtime logs, and read-only PostgreSQL catalog/data queries. The production execute action was not invoked because it would permanently delete school data. No application code, schema, configuration, database data, deployment, or Git history was changed during analysis.

## Evidence vocabulary

- **Confirmed** — directly supported by current source, tests, CI, deployment metadata, or configuration.
- **Inferred** — a strongly supported explanation that depends on the missing HTTP response or production target state.
- **Unverified** — requires an authenticated reproduction, the exact response body/status, an operation receipt, or a production-schema/data check.
- Effects are classified as **direct**, **transitive**, **operational**, or **uncertain**.

## 1. Executive verdict

There are three distinct defects. The purge failure now has an exact production-data culprit and a matching source defect.

| Reported problem | Verdict | Primary culprit | Confidence |
|---|---|---|---|
| Multiple archived classes/sections cannot be purged; afterward a single purge also errors | Preview succeeds, but execution reaches a transitive `RESTRICT` edge that the live-schema review never inspects and the deletion catalog never clears. The repeated 3-class batch contained Mathematics 7, whose four class records have eight `academic_legacy_grade_evidence` rows; the repeated 3-section batch contained Grade 7 - Section B, whose linked class records have twelve such rows. Other targets in those batches had zero legacy-evidence rows. Selecting the evidence-bearing target by itself therefore repeats the same failure; no dialog poisoning is involved. | `inspectSchema()` checks only FKs pointing directly to `classes`, `sections`, or `users`, while class/section deletion cascades through `class_records`. `applyCatalogDeletion()` clears only grade revisions by `class_id` and does not clear restrictive `academic_legacy_grade_evidence.class_record_id`, `academic_period_grade_revisions.class_record_id`, or `class_record_participants.class_record_id` descendants. | **Confirmed** from production logs, catalog, target counts, and source |
| Archived classes and sections still show in teacher notifications | Archiving deliberately includes the class teacher, replacement teacher, section adviser, and linked-class teachers in `affectedUserIds`. The lifecycle executor then creates an `academic_lifecycle_changed` notification for every affected user except the acting admin. Notification list and unread-count queries filter only by user/read state, never by archived class/section context. Production currently has 12 unread teacher archive-event notifications plus 9 teacher notifications attached to inactive classes (discussion comments and grade-finalization requests; 7 unread). | Lifecycle recipient construction plus the absence of a durable hidden/retired state shared by notification list and unread count. | **Confirmed** from production counts and source |
| Deleted users have no multiple-purge selection | The Deleted users tab intentionally returns no bulk actions, hides the bulk bar, replaces checkboxes with `Individual`, and routes purge through each profile. The backend batch contract already accepts `USER` and 1–50 UUIDs. | Admin users list UI omission, not a missing backend batch primitive. | **Confirmed** |

### What is not the culprit

- `CASCADE_ERASE` is not being ignored. `buildAdminLifecycleManifest()` removes `RETAINED_EVIDENCE` for a cascade request and replaces it with `DATA_WILL_BE_ERASED`. **Confirmed** in `backend/src/modules/admin-lifecycle/admin-lifecycle.manifest.ts:195-230`.
- The production cascade capability is not disabled. The read-only Railway check returned `ADMIN_CASCADE_ERASE_ENABLED=true`. **Confirmed** on 2026-09-14.
- The class/section pages are not still reviewing only `selected[0]` for purge. Both pass all selected targets into `AdminErasureBatchDialog`; only non-purge lifecycle actions still begin with the first selected row. **Confirmed** in the current baseline.
- A failed batch does not permanently reuse its dialog state after closing. Closing clears `erasureTargets`; reopening mounts a fresh dialog and creates a new idempotency key. **Confirmed** from the parent pages and dialog state lifecycle.
- The generic write-barrier trigger is not the purge culprit. Its DELETE branch only takes the shared reset lock and rejects writes while a school reset is active; it has no row-count-dependent behavior. **Confirmed** from the deployed PostgreSQL trigger definition.

### Confirmed incident sequence and culprit

The production operation ledger and removed deployment logs establish the sequence without performing another delete:

| UTC time | Target/count | Result | Evidence |
|---|---:|---|---|
| 08:42–08:43 | Class ×29 | Failed | Both requests reached `DELETE FROM classes WHERE id IN (...)` and rolled back. |
| 08:44 | Class ×1 | Completed | Proves the endpoint and general single-target path worked. |
| 08:45–08:47 | Class ×3 | Failed repeatedly | The same IDs were ESP 10, Mathematics 7, and Science 7. Only Mathematics 7 has class records and restrictive legacy evidence: 4 records / 8 evidence rows. |
| 08:49 | Section ×3 | Failed | Only Grade 7 - Section B has restrictive legacy evidence beneath linked class records: 3 records / 12 evidence rows. |

The database dependency graph exposes the exact missing transitive edges. `classes -> class_records` is cascaded, but `class_records` is referenced with `RESTRICT`/`NO ACTION` by `academic_legacy_grade_evidence`, `academic_period_grade_revisions`, and `class_record_participants`. The production failing targets contain rows on the first edge. The service's preflight query stops at direct references to the three erasure roots, so it incorrectly reports the batch executable. The final parent delete then asks PostgreSQL to cascade into class records and fails on the unhandled restricted evidence.

The current error receipt/logging records only Drizzle's outer `Failed query` message and drops the nested PostgreSQL constraint cause. That does not prevent the dependency/data correlation above, but it is a separate confirmed observability defect that made the incident harder to diagnose.

## 2. Feature anatomy

### 2.1 Class and section purge flow

```text
Archived list selection (1–50)
        |
        v
AdminErasureBatchDialog
        |
        +--> POST /admin/maintenance/purge/batch/preview
        |       inspect schema + prepare every target
        |       aggregate impacts, warnings, blockers
        |
        +--> one combined manifest + exact confirmation
        |
        +--> POST /admin/maintenance/purge/batch/execute
                Maintenance Access + scope
                lock and re-preview every target
                one academic transaction
                all targets deleted or all rolled back
                durable operation/items/audit receipt
```

Classes and sections cap selection at 50 and send the complete selection to the shared dialog. A row-level purge sends a one-item array to the same component and same pair of endpoints. **Confirmed** in:

- `next-frontend/app/(dashboard)/dashboard/admin/classes/page.tsx:243-263,291-298,612-624,819-845`
- `next-frontend/app/(dashboard)/dashboard/admin/sections/page.tsx:169-185,208-215,456-466,711-738`

The backend DTO accepts unique UUIDv4 IDs with a 1–50 bound for `CLASS`, `SECTION`, or `USER`. Preview uses a repeatable-read, read-only transaction. Execute requires Maintenance Access plus `cascade_academic_erasure` for classes/sections or `cascade_account_erasure` for users. **Confirmed** in `admin-lifecycle.dto.ts:55-69,139-147,219-225` and `admin-lifecycle.service.ts:305-347`.

### 2.2 Why preview approves the failing target

`AdminErasureService.inspectSchema()` deliberately hashes and classifies only foreign keys whose immediate target is `classes`, `sections`, or `users`. That misses restrictive references to a cascaded descendant:

```text
classes / sections
        | CASCADE
        v
class_records
        | RESTRICT / NO ACTION
        +--> academic_legacy_grade_evidence
        +--> academic_period_grade_revisions
        +--> class_record_participants
```

The current catalog has only `academic_period_grade_revisions.class_id -> classes`. Its physical-delete preparation deletes that direct revision relationship and then deletes the parent class/section. It has no reviewed rules or delete statements for the three `class_record_id -> class_records` relationships. **Confirmed** in `admin-erasure.catalog.ts`, `admin-erasure.service.ts:180-217,562-628`, and the production FK catalog.

The preview's evidence collector counts class records, items, scores, assessments, attempts, and lessons, but not legacy-grade evidence or grade revisions beneath each class record. Mathematics 7 therefore appeared executable even though its 8 legacy-evidence rows made the eventual parent delete impossible. **Confirmed** in `purge-lifecycle.service.ts:138-193` and production target counts.

There is also a secondary target-attribution defect. `prepare()` loops through targets and builds target-specific impact cards, but it pushes lifecycle blockers into one global array and deduplicates by `blocker.code`:

```ts
function uniqueByCode<T extends { code: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.code, item])).values()];
}
```

Most blocker objects do not carry `targetId`, and the dialog renders blockers in a separate global list. The target cards show impacts, not target decisions or blocker ownership. If 1 of 33 records is ineligible, the administrator can learn that the 33-record batch is blocked without learning which row to remove. If several targets share a blocker code, only one message survives. **Confirmed** in `admin-erasure.service.ts:263-417` and `AdminErasureBatchDialog.tsx:229-283`.

That secondary defect can hide which selected target is active, missing, or otherwise ineligible. It is not the cause of this production failure because the authenticated 29-class preview returned `canExecute=true`; the transitive catalog gap is the execution culprit.

### 2.3 Failure, retry, and single-item behavior

Execution re-previews after locking all selected targets and deletes them in one `academicTransaction`. Any target deletion error rolls the database work back for every selected target, then marks the durable operation failed outside the rolled-back work. **Confirmed** in `admin-erasure.service.ts:631-815` and the real-PostgreSQL rollback test.

Idempotency is scoped to the generated key. Reusing a failed key yields `ERASURE_PREVIOUSLY_FAILED`; a successful key replays the stored result. The dialog rotates its key on open/selection change and again after a 409. Therefore a closed bulk dialog should not make a newly opened single purge fail through idempotency reuse. **Confirmed** in `admin-erasure.service.ts:457-540` and `AdminErasureBatchDialog.tsx:63-160`.

The controller limit of three batch-execute requests per minute can still amplify repeated retries, but the operation ledger proves the reported attempts reached the database-delete branch rather than stopping at the rate limit.

### 2.4 Teacher notification flow

```text
Archive class/section plan
        |
        +--> affected learners
        +--> class teacher / replacement teacher
        +--> section adviser / every linked-class teacher
                         |
                         v
AdminLifecycleService.execute()
        |
        v
academic_lifecycle_changed notification
metadata: action + targetType + targetId
        |
        v
teacher notification list and unread count
filter: userId (+ isRead) only
```

The teacher visibility is produced in the backend, not merely by a stale frontend list:

- Class lifecycle includes the active students, source class-record teacher, and replacement-class teacher in `affectedUserIds`. **Confirmed** at `class-lifecycle.service.ts:315-336`.
- Section lifecycle explicitly adds the section adviser and each linked-class teacher. **Confirmed** at `section-lifecycle.service.ts:270-296`.
- Execution maps every affected user except the acting admin to a generic `Academic membership updated` notification with lifecycle target metadata. **Confirmed** at `admin-lifecycle.service.ts:596-626`.
- `findByUser()` filters only `userId` and optional `isRead`; `getUnreadCount()` filters only `userId` plus unread. Archived context is never considered. **Confirmed** at `notifications.service.ts:120-166`.

This supports both possible readings of the report:

1. If the teacher is seeing the archive action itself, that notification was deliberately generated for them.
2. If the teacher is seeing older class-scoped notifications after the class/section was archived, the inbox and unread-count queries have no retirement policy to hide or classify those rows.

Notification rows have a generic `referenceId` and JSON metadata but no visibility state. Production evidence identifies the concrete legacy shapes that matter now: lifecycle rows use `action/targetType/targetId`, while discussion and grade-finalization rows use `metadata.classId`. A reliable and recoverable fix is therefore an explicit `hiddenAt` state, populated for known archived teacher contexts and excluded consistently from list and unread-count queries. New archive execution should retire the exact teacher/adviser context and should not create another staff archive-event row. Lifecycle operation and audit records remain authoritative and visible. **Confirmed evidence and selected design.**

### 2.5 Deleted-user list flow

The list already has `selectedUserIds`, self-exclusion, and ordinary bulk lifecycle actions. It deliberately disables the mechanism for deleted accounts:

- `getBulkActions("deleted")` returns `[]`.
- The bulk bar renders only when `tab !== "deleted"`.
- Deleted rows show `Individual` instead of checkboxes.
- The trash action navigates to the individual user profile.
- The profile uses `AdminErasureBatchDialog` with `targetType="USER"` and one ID.

**Confirmed** in `users/page.tsx:140-177,282-320,600-712,810-831` and `users/[id]/page.tsx:728-745`.

The correct seam is to reuse the governed erasure dialog from the list with a `USER` target array. Adding `purge` to the ordinary `BulkUserLifecycleAction` (`suspend | reactivate | archive`) would be the wrong boundary because it would bypass the reviewed manifest, exact confirmation, Maintenance Access scope, idempotency, atomicity, and audit receipt.

## 3. Dependency and cascade map

| Edge | Provider | Interface/state | Consumer/effect | Effect | Risk | Confidence | Evidence | Disposition |
|---|---|---|---|---|---:|---|---|---|
| E1 | Classes admin page | `selectedClassIds`, `erasureTargets` | Shared erasure dialog receives 1–50 class IDs | Direct | Medium | Confirmed | `classes/page.tsx:243-263,291-298,819-845` | Keep; add failure attribution tests |
| E2 | Sections admin page | `selectedSectionIds`, `erasureTargets` | Shared erasure dialog receives 1–50 section IDs | Direct | Medium | Confirmed | `sections/page.tsx:169-185,208-215,711-738` | Keep; add failure attribution tests |
| E3 | Shared erasure dialog | preview/execute request and local key | Backend batch endpoints | Direct | High | Confirmed | `AdminErasureBatchDialog.tsx:63-160` | Keep governed flow; improve error contract/rendering |
| E4 | Batch DTO/controller | 1–50 unique IDs; 30 preview/min; 3 execute/min | Lifecycle service | Operational | High | Confirmed | `admin-lifecycle.dto.ts:139-147`; controller `:138-159` | Keep bound; expose 429 clearly and test retry transition |
| E5 | Erasure schema inspection | only FKs directly targeting `classes`, `sections`, `users` | Transitive restricted descendants are absent from schema hash/preflight | Direct | Critical | Confirmed | `admin-erasure.service.ts:180-217`; production FK catalog | Traverse CASCADE-reachable tables and classify every restrictive edge |
| E6 | Erasure delete catalog | clears only grade revisions by direct `class_id` before parent delete | Legacy evidence, revisions, or participants can restrict cascaded class-record deletion | Transitive | Critical | Confirmed | `admin-erasure.catalog.ts:61-94`; service `:562-628`; production target counts | Catalog and explicitly delete class-record descendants before parent deletion |
| E6a | Erasure preview evidence | omits legacy-grade evidence and grade revisions | Approved impact is incomplete for affected targets | Direct | High | Confirmed | `purge-lifecycle.service.ts:138-193` | Count and display the missing evidence groups |
| E6b | `uniqueByCode()` | blocker code only | Duplicate target failures collapse | Transitive | High | Confirmed | `admin-erasure.service.ts:115-117,410-415` | Preserve target attribution for target-scoped blockers |
| E7 | Maintenance Access | active session and erasure scope | All execute requests | Operational | High | Confirmed | `admin-lifecycle.service.ts:316-347` | Keep; surface exact gate and refresh action |
| E8 | Erasure execute | manifest, locks, idempotency, transaction | Atomic DB deletion and durable receipt | Direct | Critical | Confirmed | `admin-erasure.service.ts:457-815` | Keep atomicity; never silently skip blocked rows |
| E9 | Class/section lifecycle planner | `affectedUserIds` includes teaching staff | Notification recipient set | Direct | High | Confirmed | class `:315-336`; section `:270-296` | Separate learner recipients from staff context-retirement targets |
| E10 | Lifecycle executor | `academic_lifecycle_changed` with target metadata | Teacher notification rows | Direct | High | Confirmed | `admin-lifecycle.service.ts:596-626` | Apply explicit audience/event policy |
| E11 | Notification service | user/read filters only | List, pagination, unread badge | Transitive | High | Confirmed | `notifications.service.ts:120-166`; production has 21 matching teacher rows | Add recoverable `hiddenAt`; retire exact teacher contexts; filter list and count identically |
| E12 | Users admin list | deleted-tab bulk disabled | No multi-user purge UI | Direct | High | Confirmed | `users/page.tsx:140-177,600-712` | Add up-to-50 deleted-user selection and governed dialog |
| E13 | Generic purge contract | `targetType=USER`, `targetIds[1..50]` | Existing backend erasure service | Direct | Medium | Confirmed | DTO `:55-69,139-147`; profile `:728-745` | Reuse; do not create a bypass endpoint |
| E14 | Notification schema | generic UUID reference + JSON metadata; no visibility state | Known legacy archive/class metadata keeps rows visible | Transitive | High | Confirmed | `announcements-notifications.schema.ts:87-117`; production classification query | Add `hiddenAt`; backfill only confirmed lifecycle and `classId` shapes |

## 4. Isolation and change plan

### 4.1 Safe seams

1. **Purge dependency seam:** extend the reviewed catalog and schema traversal, then explicitly delete only the named restricted class-record descendants inside the existing atomic transaction.
2. **Users-list seam:** connect existing selection state to the existing governed `USER` batch endpoint.
3. **Notification audience seam:** retain learner notices, exclude staff from new archive-event recipients, and pass explicit staff/context IDs for retirement.
4. **Notification visibility seam:** add `hiddenAt`, retire known teacher-context rows in the archive transaction, and exclude hidden rows from list and unread count.
5. **Audit seam:** retain lifecycle and erasure operation receipts regardless of notification visibility.

### 4.2 Resolved implementation decisions

1. Keep batch execution strictly atomic and retain the signed preview, step-up session, exact confirmation, idempotency, audit, and cleanup invariants.
2. Treat explicit cascade erasure as authorization to delete the previewed class-record descendants, but do not weaken their database constraints or make ordinary class-record deletion cascade implicitly.
3. Keep actionable learner membership notices. Do not generate archive-event notifications for teachers/advisers; hide their older notifications for the exact archived class/section context while retaining operation/audit evidence.
4. Use a recoverable `hiddenAt` notification state rather than deleting delivery rows or inventing a frontend-only filter.
5. Reuse the existing `USER` batch erasure contract for the Deleted users list; do not add purge to ordinary bulk lifecycle actions.

### 4.3 Ordered implementation cuts

1. **Close the transitive erasure gap.** Traverse CASCADE-reachable FK parents during schema inspection; add reviewed rules for legacy evidence, grade revisions, and participants by `class_record_id`; delete them before the parent class/section. Extend preview evidence counts and catalog version.
2. **Make failures attributable and safe.** Preserve `targetId` on target-scoped blockers and persist a sanitized nested PostgreSQL code/constraint/table summary with the durable failed operation while leaving SQL parameters and PII out of the response.
3. **Add the deleted-user batch entry point.** Show checkboxes and the bulk bar on Deleted, cap selection at 50, exclude the acting admin, open `AdminErasureBatchDialog` with `targetType="USER"`, and clear/refetch the selection only after completion.
4. **Separate notification audience from lifecycle impact.** Return learner notification recipients separately from staff context-retirement IDs and archived class/section IDs. Do not create staff archive-event notifications.
5. **Retire archived teacher context consistently.** Add nullable `hiddenAt`; hide known lifecycle `targetType/targetId` and producer `metadata.classId` rows for affected staff; backfill the confirmed production shapes; filter both list and unread count by `hiddenAt IS NULL`.

### 4.4 Compatibility, cleanup, and rollback

- Additive optional target-attribution fields preserve current web/mobile consumers while the shared web/mobile contract types remain compatible.
- Existing lifecycle notifications carry `targetType/targetId`; confirmed discussion and finalization rows carry `metadata.classId`. Unknown legacy rows remain visible rather than being broadly hidden.
- User batch purge must continue to enforce self-erasure and last-admin boundaries on the complete target set.
- A failed atomic batch must leave all database targets present and a failed operation receipt available for diagnosis.
- UI changes can roll back independently because they reuse existing endpoints. Notification-policy rollout is reversible through nullable `hiddenAt`; lifecycle/audit receipts are not hidden or deleted.

### 4.5 Validation matrix

| Scenario | Required proof |
|---|---|
| 33 eligible archived classes | One preview lists all 33; one execute deletes all; receipt has 33 items |
| Evidence-bearing class among eligible targets | Preview includes legacy evidence; explicit descendant cleanup completes; all selected parents delete atomically |
| One ineligible target among eligible targets | UI names the exact row and reason; execute remains disabled; eligible rows are untouched |
| Failed batch followed by eligible single purge | Close batch, open single, obtain fresh preview/key, and succeed without page reload |
| 403 / 409 / 429 branches | Correct remediation is shown; no generic “permanent deletion failed” dead end |
| Multi-section execute | Two or more sections delete atomically with a durable receipt |
| Multi-user execute | Mixed deleted roles work; self and last-admin sets block with target-aware explanations |
| Archive class/section | Learners with membership changes may be notified; teachers/advisers receive no archive-event row; operation audit remains present |
| Old archived-context notification | Notification list, pagination total, unread count, and live-state reconciliation agree |

## 5. Required improvements

1. **P0 — Classify and clear transitive class-record restrictions.** This is the confirmed execution culprit; cover both class and section batches against real PostgreSQL.
2. **P0 — Expand the live schema hash to CASCADE-reachable dependencies.** Future restrictive descendant edges must fail closed in preview rather than surface as a 5xx parent delete.
3. **P1 — Add governed multiple purge to Deleted users.** Reuse the batch erasure contract; do not add purge to ordinary bulk lifecycle.
4. **P1 — Define and enforce archive-notification policy at the backend.** Keep list, total, unread count, and any live updates consistent.
5. **P2 — Add structured operational evidence.** Persist a safe nested PostgreSQL code/constraint/table summary with the operation ID, target type/count, and failure code without target names, SQL parameters, tokens, passwords, or confirmation text.

Optional improvements, after the required work:

- Add a downloadable pre-execution impact manifest for large batches.
- Add a safe “copy diagnostic receipt” action that omits credentials and sensitive row content.
- Show the shared three-execute-per-minute budget before the admin retries.
- Add filters for Archived-context and Administrative lifecycle notifications instead of silently deleting history.

## 6. Verification and uncertainty

### Current evidence

- Focused backend tests: **23/23 passed** across `admin-erasure.service.spec.ts`, `purge-lifecycle.service.spec.ts`, and `notifications.service.spec.ts`.
- Shared erasure dialog test: **1/1 passed**, but it covers only a happy-path two-class batch.
- Real-PostgreSQL integration includes a successful atomic 33-class purge, rollback when one of three class deletions fails, a single deleted-user purge, and section schema-blocker/repair preview. Its 33-class fixture has no class records or legacy-grade evidence, so it did not exercise the production failure graph. It also does not cover multi-section execute or multi-user execute.
- Exact baseline CI run `34829461403` is successful. This proves the checked-in/disposable test paths, not the reported authenticated production target data.
- Railway backend deployment `c48ac76f-bb8e-4348-9d70-da20e95ca8ba` reports `SUCCESS` with a running instance, and cascade erasure is enabled. The prior deployment logs and operation ledger contain the reported failed parent deletes and exact selected IDs.

### Remaining uncertainty

- **Confirmed in the completed local implementation:** all 32 migrations applied to a disposable PostgreSQL database and the 31-test integration rehearsal passed. It covers evidence-bearing two-class and two-section deletion, unrelated-evidence survival, atomic rollback, an unclassified transitive restriction, safe failure receipts, and a two-user batch.
- **Unverified until deployment:** production execution of the corrected code. Production acceptance will use non-destructive preview and receipt/log checks; no school record will be permanently deleted solely for verification.
- **Chosen policy from the report wording:** remove archived class/section context from the Teacher notification surface while preserving targeted learner membership notices. If the institution later wants teachers to retain an archive history feed, that should be a separately labeled audit/history surface, not the unread notification inbox.

### Implementation verification addendum — 2026-09-14

- **Confirmed locally:** 89 focused backend tests, 9 focused web tests, the administrator contract gate, backend and frontend production builds, web and mobile typechecks, migration integrity, and `git diff --check` passed.
- **Confirmed locally:** notification retirement is reversible through `hidden_at`; inbox, pagination total, unread count, and mark-all-read share the visible-row predicate; archive execution retires staff context before creating learner-only notices.
- **Confirmed locally:** no purge bypass was introduced. Deleted-user multi-select reuses the governed `USER` batch preview/execute flow, preserves the 1–50 target bound, clears selection on tab changes, and disables selection while stale rows are refreshing.
- **Still deployment-bound:** exact pushed-SHA CI, Railway migration/deployment success, and authenticated non-destructive production previews. Those checks cannot be treated as confirmed until the release commit is deployed.

### Coverage boundary

Inspected: admin classes, sections, users list/profile, shared erasure dialog and service, lifecycle DTO/controller/manifest/prepare/execute paths, direct and transitive production FK catalog, failed operation ledger and target dependency counts, maintenance gates, class/section recipient construction, teacher notification schema/list/unread paths and production aggregate counts, focused unit/integration tests, exact-SHA CI status, authenticated production preview, and read-only Railway deployment/configuration/log evidence.

Excluded as non-blocking for this analysis: mobile admin UI, AI service, unrelated academic feature screens, and destructive production execution. No additional decision-changing dependency was found within the inspected scope.
