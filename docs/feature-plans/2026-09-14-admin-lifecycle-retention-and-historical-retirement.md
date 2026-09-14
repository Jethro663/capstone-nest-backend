# Admin Authority Mode, Cascade Erasure, Bulk Lifecycle, and Roster Consistency Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` in the same session or `superpowers:executing-plans` in a separate session. Apply `superpowers:test-driven-development` for each behavior change and `superpowers:verification-before-completion` before any release claim.

Plan date: 2026-09-14

Repository state inspected: `ad043f8bf62cca3f4f2d14faeb66876ffea23c69` on `developement`, equal to `origin/developement` when inspected

Planning status: Decision-ready; implementation, commit, push, deployment, and destructive execution are not authorized by this plan

Canonical-plan note: This document intentionally replaces the earlier retention-only direction at the same path. It is the sole implementation plan for the revised administrator-authority requirement.

Companion analysis: [`docs/feature-analysis/2026-09-13-admin-lifecycle-blocker-dead-ends.md`](../feature-analysis/2026-09-13-admin-lifecycle-blocker-dead-ends.md)

Related foundation: [`docs/feature-plans/2026-09-13-admin-maintenance-gateway-and-safeguard-reset.md`](2026-09-13-admin-maintenance-gateway-and-safeguard-reset.md)

**Goal:** Let a school administrator complete legitimate account, class, section, roster, and permanent-deletion work without dead-end policy messages, including intentional deletion of retained academic content through one explicit cascade-erasure workflow.

**Architecture:** Keep ordinary lifecycle operations and the existing short-lived Maintenance Access session, then add a target-scoped erasure catalog, atomic database executor, durable batch receipt, and retryable post-commit cleanup. Retained evidence becomes a high-severity impact warning in explicit `CASCADE_ERASE` mode rather than an absolute blocker.

**Tech stack:** NestJS 11, Drizzle/PostgreSQL, BullMQ/Redis, Next.js 16/React 19, Expo 54/React Native, Jest, Playwright, and the existing admin contract checker.

## 1. Decision summary and feature brief

### Decision

Implement **Admin Authority Mode** as the destructive capability of an active, actor-bound Maintenance Access session:

1. An administrator opens Maintenance Access once using the current password, required acknowledgements, and a reason.
2. Archived classes, archived sections, and soft-deleted accounts may be previewed in either `EMPTY_ONLY` or `CASCADE_ERASE` mode.
3. In `CASCADE_ERASE`, academic history and content are listed as data that **will be erased**, not as `IMMUTABLE` evidence that blocks the administrator.
4. One preview may contain up to 50 selected targets of one type. The database phase is all-or-none, so “33 selected” means all 33 are reviewed and executed together.
5. The administrator enters one batch confirmation. The execute call does not request the password again while the same Maintenance Access session is valid.
6. A minimal, append-only erasure receipt survives. It records who erased which target identities, when, why, and aggregate counts; it does not preserve the deleted scores, attempts, learner notes, or content.
7. Object-storage and index cleanup occurs after the database commit and retries without making the deleted records reappear.

This interprets the reported Tagalog statement—“I can already archive historical classes, sections and users, but permanent deletion is still very rigid”—as confirmation that historical retirement now works and that the remaining product problem is permanent deletion plus batch and roster behavior.

### Administrator experience after implementation

- The user, class, or section page no longer ends at “Why this record must be kept” when an authorized administrator explicitly chooses cascade erasure.
- The dialog says exactly what will be lost, groups the impact by data type, and exposes one executable action.
- Selecting 33 classes or sections reviews all 33; it never silently starts with only the first selected row.
- Re-enrolling a previously dropped or completed learner reactivates the historical membership instead of returning a false `409`.
- Active class workspaces show currently enrolled learners by default. Historical learners remain available through an explicit filter and remain included in evidence-preserving exports until the class itself is intentionally erased.
- Historical archive/retirement continues to use the already implemented governed outcome flow; this plan does not rebuild it.

### Non-negotiable boundaries

“Admin freedom” does not mean an unscoped `force=true`. The following remain mandatory because removing them would create account lockout, cross-tenant authority, silent partial deletion, or database corruption:

- authenticated `admin` RBAC;
- an active Maintenance Access session bound to actor, login session version, and expiry;
- no self-account purge;
- no purge of the last active administrator;
- archived/soft-deleted target state before permanent deletion;
- DTO validation and homogeneous batch type;
- complete dependency classification and schema-drift detection;
- transaction and target locking;
- manifest hash, expiry, exact target set, and idempotency;
- minimal append-only erasure/audit receipt;
- deterministic object/index cleanup state;
- AI remains non-authoritative.

Everything else that currently produces a retained-evidence dead end becomes either a warning, a cleanup action, or an actionable next step.

## 2. Scope, non-goals, permissions, and assumptions

### In scope

- Permanent deletion of an archived class with class records, enrollments, lifecycle events, lessons, assessments, attempts, scores, uploads, indexed content, and other class-owned descendants.
- Permanent deletion of an archived section and its linked archived classes plus their descendants.
- Permanent deletion of a soft-deleted user, including student-participant evidence and account-owned data, while detaching authored school records that must not disappear merely because their author account is removed.
- Single-target and multi-target preview/execute contracts.
- Removal of the web classes/sections “first selected row only” behavior.
- Maintenance Access step-up simplification: password once per short-lived session, one confirmation per reviewed batch.
- Re-enrollment of a historical same-class membership.
- Current-versus-historical learner filtering on class records for web and mobile consumers.
- Backend, web, and mobile contract parity, even where destructive execution remains web-admin-only.
- Feature flag, audit/metrics, rollout, rollback, and destructive rehearsal requirements.

### Out of scope

- Weakening teacher permissions or exposing permanent erasure to teacher/student roles.
- Letting AI decide what official records to erase.
- Full-school reset; the target-scoped erasure engine must not call System Reset.
- Deleting the audit log or the erasure receipt itself through this feature.
- Automatically inferring completion, withdrawal, or transfer outcomes for historical archiving.
- Purging an active class/section/account without first transitioning it through the existing archive/soft-delete lifecycle.
- Deleting an entire class merely because a deleted teacher authored or taught it.
- Claiming legal or Department of Education retention compliance; product authority and institutional policy must be confirmed separately.
- Shipping an APK unless implementation separately changes mobile code and the release request explicitly includes a verified mobile artifact.

### Permissions and authorization boundary

- This document authorizes only this Markdown plan update.
- It does not authorize product-code edits, migrations, dependency changes, data deletion, commits, pushes, deployments, feature-flag changes, or destructive rehearsals.
- The implementing session must obtain explicit implementation/release authority before performing those actions.

### Assumptions

- **Confirmed:** `admin` is the existing role used by Maintenance Access and lifecycle controllers.
- **Confirmed:** Maintenance Access already verifies current password, actor/session binding, acknowledgements, reason, and a default 15-minute expiry.
- **Confirmed:** historical class and section retirement is implemented on the inspected SHA.
- **Assumed design decision:** any authenticated administrator with active Maintenance Access may use `CASCADE_ERASE`, not only a separate super-admin role.
- **Assumed design decision:** target archival/soft deletion remains a prerequisite, but the UI gives an actionable archive-first path instead of an unexplained block.
- **Unverified:** the institution has authorized permanent destruction of official academic records. This must be resolved before production enablement, but it does not prevent implementation in a disposable demonstration environment.

## 3. Current-state evidence ledger

| Status | Evidence | Owner / symbol | Consequence |
|---|---|---|---|
| Confirmed | Any retained purge evidence produces `RETAINED_EVIDENCE` and an immutable blocker. | `backend/src/modules/admin-lifecycle/purge-lifecycle.service.ts` — `PurgeLifecycleService` | The current dead end is intentional policy, not a random frontend error. |
| Confirmed | Purge execution re-verifies current password even when Maintenance Access is active. | `backend/src/modules/admin-lifecycle/admin-lifecycle.service.ts` — `execute`, `executePurge` | The destructive action has redundant step-up friction. |
| Confirmed | Maintenance Access already verifies password and binds actor/session/expiry. | `backend/src/modules/admin-maintenance/admin-maintenance.service.ts` — `open`; `admin-maintenance.policy.ts` | It can safely be the single step-up boundary for a short session. |
| Confirmed | Purge manifests are hash/expiry checked and operations are idempotently claimed. | `AdminLifecycleService.assertExecutionEvidence`, `claimOperation` | Reuse these mechanisms rather than create an unreviewed direct-delete path. |
| Confirmed | Current purge apply methods ultimately delete a class/section/user and rely heavily on FK behavior. | `PurgeLifecycleService.applyClass`, `applySection`, `applyUser` | Removing one blocker would be unsafe because the actual cascade is wider than the current preview. |
| Confirmed | Official grading tables use restrictive references in addition to many cascade and set-null references. | `backend/src/drizzle/schema/academic-grading.schema.ts` and related schema modules | A simple delete may either erase much more than shown or fail at PostgreSQL. |
| Confirmed | System Reset has exhaustive table classification, FK inspection, schema hashing, write barriers, storage cleanup, and queue coordination. | `backend/src/modules/system-reset/*` | Reuse its design principles, not its whole-school action. |
| Confirmed | The reset catalog currently preserves `admin_lifecycle_operations` and `enrollment_lifecycle_events`. | `backend/src/modules/system-reset/system-reset.catalog.ts` | New erasure receipt tables need an explicit reset disposition. |
| Confirmed | `StorageService.deleteObject(key)` supports local and S3-compatible storage. | `backend/src/modules/file-upload/storage/storage.service.ts` | Physical deletion must be explicit; deleting `uploaded_files` rows alone is incomplete. |
| Confirmed | Classes and sections bulk handlers choose `selectedClasses[0]` / `selectedSections[0]`. | admin classes/sections `page.tsx` — `openBulkConfirmation` | The reported “33 selected; review begins with first” behavior is a frontend implementation defect. |
| Confirmed | Legacy class/section bulk purge calls routes that intentionally reject and redirect to lifecycle review. | `ClassesService.bulkLifecycleAction`, `SectionsService.bulkLifecycleAction` | Existing bulk endpoints cannot be reused for governed cascade erasure without contract changes. |
| Confirmed | Active masterlist lookup filters `status = enrolled`, but transactional duplicate lookup ignores status. | `backend/src/modules/classes/classes.service.ts` — `enrollStudent` | A dropped/completed historical row is hidden in selection but still triggers `409`. |
| Confirmed | Enrollment uniqueness is `(studentId, classId)`. | enrollment schema | Historical re-enrollment must reactivate the existing row, not insert another one. |
| Confirmed | `captureClassEnrollment` inserts class-record participants with conflict-do-nothing behavior. | `backend/src/modules/class-record/class-record.service.ts` | Reactivation also needs explicit participant eligibility reconciliation. |
| Confirmed | Class-record roster composition intentionally includes evidence-bearing removed learners. | `class-record-roster.service.ts` and existing tests | Backend evidence should not be globally hidden or discarded. |
| Confirmed | Web grade grid defaults to `All learners`. | `TeacherClassRecordGradeGrid.tsx` | The active-workspace confusion is a presentation default, not proof of a wrong roster contract. |
| Confirmed | Web and mobile share admin lifecycle and class-record contracts. | `scripts/check-admin-client-contracts.cjs`, client types/services | Contract additions must remain additive and synchronized. |
| Inferred | No current last-active-admin purge guard was found in lifecycle/user service search. | No matching owner on inspected SHA | Add and test this guard before enabling cascade user erasure. |
| Unverified | Runtime data may include legacy references or tables not represented by current Drizzle source. | Deployed PostgreSQL schema | Preview must compare its catalog against live FK/schema metadata and refuse only unclassified dependencies. |

## 4. End-to-end impact and consumer map

### Command flow

```text
Admin UI selection
    -> Maintenance Access status
    -> POST /api/admin/maintenance/purge/batch/preview
    -> target snapshots + live dependency inventory + schema hash
    -> one impact dialog and batch confirmation
    -> POST /api/admin/maintenance/purge/batch/execute
    -> idempotent operation claim + advisory/row locks
    -> re-preview and hash comparison inside transaction
    -> explicit detach/delete order for every selected target
    -> minimal audit + erasure receipt
    -> commit all targets or none
    -> enqueue object/index cleanup
    -> UI removes every successful selected row and polls cleanup status
```

### Producer and consumer map

| Producer / owner | Direct consumers | Required change |
|---|---|---|
| `admin-maintenance.policy.ts` | backend account/lifecycle services; maintenance settings clients | Replace “evidence-aware deletion is never overrideable” with explicit cascade-erasure capability while retaining structural boundaries. |
| `admin-lifecycle.dto.ts` | both lifecycle controllers, web/mobile types, contract checker | Add purge mode, batch preview/execute DTOs, batch confirmation, and operation status. |
| `admin-lifecycle.types.ts` / manifest helpers | dialog models, tests, audit | Add erasure impact groups and change retained evidence from blocker to warning only in cascade mode. |
| New `admin-erasure.catalog.ts` | preview and executor | Classify target references as delete, detach, preserve receipt, or unsupported. |
| New `admin-erasure.service.ts` | `AdminLifecycleService` | Prepare and atomically execute target-scoped erasure. |
| New operation/item schema | operation endpoint, cleanup worker, System Reset | Persist batch identity, per-target result, counts, cleanup state, actor snapshot, and idempotency. |
| `StorageService` and cleanup worker | local/S3 uploads and indexed derivatives | Delete collected keys after commit and retry failures. |
| queue processors | RAG, library indexing, performance, AI generation, notifications/discussions | Treat a missing/erased target as a successful no-op so stale work cannot recreate deleted state. |
| web admin lifecycle service/dialog | users, classes, sections pages | Show whole-batch impact and execute once. |
| mobile admin lifecycle types/API | mobile lifecycle model/tests | Accept additive contract; keep cascade execute hidden unless a mobile admin UX is separately approved. |
| `ClassesService.enrollStudent` | teacher/admin add-student pages; mobile class detail | Reactivate historical same-class rows and report real active duplicates only. |
| class-record response | web/mobile workbook components and exports | Preserve history, add deterministic current/historical filters and defaults. |

### Target semantics

| Target | Delete | Detach / preserve | Never infer |
|---|---|---|---|
| CLASS | Class-owned enrollments, records, grades, assessments, attempts, lessons, completions, uploads, discussions, AI/index rows, schedules, lifecycle evidence scoped to the class | Minimal erasure item/receipt; unrelated user accounts | Transfer grades or content to another class |
| SECTION | Section record, section enrollments/preferences/pending roster, every linked class and the class descendants above | Minimal erasure item/receipt; unrelated learner/teacher accounts | A replacement section or academic outcome |
| USER | Sessions/roles/profiles, the learner's enrollments/participants/scores/attempts/progress/private data, user-owned uploads | Authored school content and audit records are detached or retain an actor snapshot; teacher-owned classes are not deleted | That author deletion means school-content deletion |

### External and asynchronous boundaries

- PostgreSQL is the authority for the atomic domain deletion and durable receipt.
- Redis/BullMQ jobs are not part of the PostgreSQL transaction. Stale jobs must no-op against erased targets.
- Local or S3 object deletion is post-commit and retryable. Cleanup failure changes operation status, not domain deletion success.
- AI service calls remain indirect through backend jobs and cannot approve or block erasure.
- Browser/mobile caches must invalidate target lists, details, class records, rosters, reports, and notifications after completion.

## 5. Conflicts, invariants, risks, and design options

### Requirement conflicts resolved

1. **Administrator freedom versus official-history retention**
   - Resolution: ordinary purge stays `EMPTY_ONLY`; deliberate `CASCADE_ERASE` is executable in Maintenance Access and visibly destroys the listed history.
2. **Delete every selected row versus partial failures**
   - Resolution: one homogeneous batch and one PostgreSQL transaction. Any database failure rolls back all selected targets; post-commit file cleanup is separately retryable.
3. **Permanent deletion versus auditability**
   - Resolution: delete the requested domain data but preserve a minimal receipt with identities, actor snapshot, reason, counts, hashes, and timestamps—not the erased content.
4. **User deletion versus school content ownership**
   - Resolution: erase the user's participant/private evidence; detach authorship on shared institutional content rather than deleting unrelated classes or lessons.
5. **Simpler admin flow versus stolen-session risk**
   - Resolution: authenticate once when opening a visible 15-minute Maintenance Access session; bind it to actor and session version, then use one exact confirmation per batch.

### Options considered

#### Option A — Global force bypass or FK cascade conversion

- Change retained-evidence checks to always pass or add `force=true`.
- Convert restrictive FKs broadly to `ON DELETE CASCADE`.
- **Benefit:** smallest apparent code change.
- **Cost:** preview and physical cleanup are incomplete, user deletion could erase unrelated content, schema changes silently widen blast radius, and failures become data-dependent.
- **Decision:** reject.

#### Option B — Frontend queue over the existing single-target lifecycle dialog

- Keep backend one-target preview/execute and automatically open the next selected target after completion.
- **Benefit:** quick repair for the “first selected” symptom and useful as an emergency presentation fallback.
- **Cost:** 33 separate previews, confirmations, and requests; refresh/interruption loses progress; no atomicity or durable batch receipt.
- **Decision:** allow only as a temporary, feature-flagged fallback if backend batch work misses the demonstration cut. Do not call it complete bulk deletion.

#### Option C — Target-scoped cascade engine with batch manifest

- Add explicit dependency classification, one reviewed batch, atomic database execution, durable receipt, and post-commit cleanup.
- **Benefit:** fulfils administrator intent without silent or partial deletion and makes new dependencies fail visibly during development.
- **Cost:** schema, contract, backend, clients, queue/storage, and destructive-test work.
- **Decision:** recommended.

### Highest risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| An unclassified table or restrictive FK appears in production | Batch fails or data survives unexpectedly | Live schema hash plus catalog-completeness check; return `UNCLASSIFIED_DEPENDENCY` before mutation. |
| Section deletion unintentionally erases linked class history | Broad academic loss | Preview section as an explicit tree of linked classes and aggregate every descendant count. |
| User purge follows authorship links and removes whole-school content | Cross-user data loss | Relationship action catalog distinguishes identity-owned evidence from institutional authored content; authored records detach. |
| Object cleanup fails after database commit | Orphaned files | Persist exact keys before delete, enqueue cleanup, retry with status `cleanup_pending` / `completed_with_cleanup_errors`. |
| Old BullMQ work recreates data | Deleted target partially reappears | Processor-level target existence/erasure checks; missing target is a logged successful no-op. |
| One batch causes long locks | Admin timeout and classroom disruption | Max 50 targets, precomputed manifest, deterministic order, transaction timeout, duplicate-target normalization, and no network calls in transaction. |
| Compromised admin bearer token is used during open Maintenance Access | Unauthorized irreversible deletion | Short actor/session-bound window, visible banner, manual close, session-version revocation, self/last-admin guards, audit receipt, and immediate notification to other active admins. |
| Re-enrollment changes a finalized roster | Grade inconsistency | Only reopen/reactivate mutable current-period participants automatically; finalized records require existing governed reopen/roster-confirmation procedure. |

## 6. Recommended architecture, contracts, security, and errors

### 6.1 Purge modes

```ts
export const PURGE_MODES = ['EMPTY_ONLY', 'CASCADE_ERASE'] as const;
export type PurgeMode = (typeof PURGE_MODES)[number];
```

- Omitted mode on legacy single-target requests means `EMPTY_ONLY` for compatibility.
- `EMPTY_ONLY` preserves the current evidence-free behavior.
- `CASCADE_ERASE` changes `RETAINED_EVIDENCE` from `IMMUTABLE`/`RETAIN_REQUIRED` to an executable `DATA_WILL_BE_ERASED` warning with counts and named groups.
- Both modes require the target to already be archived/soft-deleted. The preview returns an `ARCHIVE_FIRST` next action for active targets.

### 6.2 Batch request shape

```ts
export class PreviewPurgeBatchDto {
  @IsIn(PURGE_TARGET_TYPES)
  targetType: PurgeTargetType;

  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  targetIds: string[];

  @IsIn(PURGE_MODES)
  purgeMode: PurgeMode;
}

export class ExecutePurgeBatchDto extends PreviewPurgeBatchDto {
  @IsString() manifestHash: string;
  @IsISO8601() manifestExpiresAt: string;
  @IsString() reasonCode: string;
  @IsOptional() @IsString() notes?: string;
  @IsString() confirmation: string;
  @IsUUID('4') idempotencyKey: string;
}
```

The canonical endpoints are:

- `POST /api/admin/maintenance/purge/batch/preview`
- `POST /api/admin/maintenance/purge/batch/execute`
- `GET /api/admin/maintenance/operations/:id` (extend the existing route to return erasure operations)
- `POST /api/admin/maintenance/operations/:id/retry-cleanup`

Existing `/admin/maintenance/purge/preview|execute` and `/admin/lifecycle/purge/preview|execute` remain additive single-target adapters. A legacy `currentPassword` property remains accepted during one compatibility window, but the Maintenance Access path does not require it after the session was opened.

### 6.3 Preview response

The preview returns:

```ts
interface AdminErasureBatchPreview {
  schemaVersion: 2;
  targetType: 'CLASS' | 'SECTION' | 'USER';
  targetIds: string[];
  purgeMode: 'EMPTY_ONLY' | 'CASCADE_ERASE';
  targets: Array<{
    id: string;
    displayName: string;
    lifecycleState: 'ACTIVE' | 'ARCHIVED' | 'SOFT_DELETED' | 'MISSING';
    impactGroups: Array<{
      code: string;
      label: string;
      rowCount: number;
      action: 'DELETE' | 'DETACH' | 'PRESERVE_RECEIPT';
    }>;
    storageObjectCount: number;
    storageBytes: number | null;
  }>;
  totals: Record<string, number>;
  warnings: AdminLifecycleWarning[];
  blockers: AdminLifecycleBlocker[];
  canExecute: boolean;
  confirmationText: string;
  catalogVersion: number;
  databaseSchemaHash: string;
  manifestHash: string;
  manifestExpiresAt: string;
}
```

For 33 classes, the confirmation is one generated value such as `ERASE 33 CLASSES`. It is derived from the exact normalized target set and cannot be reused after selection or schema changes.

### 6.4 Target-scoped dependency catalog

Create `backend/src/modules/admin-lifecycle/admin-erasure.catalog.ts` with explicit descriptors:

```ts
type ErasureAction = 'DELETE' | 'DETACH' | 'PRESERVE_RECEIPT';

interface ErasureDependencyRule {
  table: string;
  targetTypes: PurgeTargetType[];
  action: ErasureAction;
  selector: 'DIRECT_ID' | 'CLASS_DESCENDANT' | 'SECTION_DESCENDANT' | 'USER_PARTICIPANT' | 'USER_AUTHOR';
  group: string;
}
```

The catalog is exhaustive by design. Preview introspects the live public schema, compares every FK path touching a selected target against the catalog, and refuses only an unknown/unclassified path. The executor uses catalog-defined delete/detach statements and a topological order; it does not depend on accidental FK cascade behavior.

### 6.5 Durable operation model

Add migration `backend/drizzle/0028_admin_authority_cascade_erasure.sql` and Drizzle schema additions in `backend/src/drizzle/schema/admin-lifecycle.schema.ts`:

```text
admin_erasure_operations
  id, idempotency_key, target_type, purge_mode, actor_id nullable,
  actor_snapshot jsonb, status, request_hash, manifest_hash,
  database_schema_hash, catalog_version, reason_code, notes,
  target_count, impact_summary jsonb, cleanup_summary jsonb,
  result jsonb, failure_code, failure_message,
  created_at, updated_at, completed_at

admin_erasure_items
  id, operation_id, target_id (no FK), target_snapshot jsonb,
  status, impact_counts jsonb, storage_objects jsonb,
  result jsonb, failure_code, failure_message,
  created_at, updated_at
```

Constraints:

- unique `idempotency_key`;
- unique `(operation_id, target_id)`;
- action/status check constraints;
- operation FK from item uses `ON DELETE RESTRICT`;
- actor FK uses `ON DELETE SET NULL` and keeps a minimal actor snapshot;
- target IDs intentionally have no FK so the receipt survives target deletion;
- System Reset classifies both tables as `preserve` and adds its write barriers.

Operation status is one of:

```text
executing
cleanup_pending
completed
completed_with_cleanup_errors
failed
```

### 6.6 Atomic database execution

`AdminErasureService.execute()` performs this exact order:

1. Validate `admin` RBAC, feature flag, active actor-bound Maintenance Access, confirmation, and idempotency.
2. Normalize and sort target IDs; reject duplicates before manifest creation.
3. Claim/replay the operation.
4. Start one `academicTransaction` and acquire an advisory lock plus target row locks in sorted order.
5. Re-read target lifecycle state, live dependency counts, catalog version, and database schema hash.
6. Compare the regenerated manifest hash and expiry.
7. Reject self-user, last-active-admin, active target, unknown table/path, concurrent reset, or schema drift.
8. Persist minimal target snapshots and storage keys before deletion.
9. Detach institutional author/actor references that must survive a user deletion.
10. Delete target-owned descendants in catalog topological order, then delete the target rows.
11. Insert audit and erasure result records inside the same transaction.
12. Commit all targets together. No storage/network/Redis call occurs inside the transaction.
13. Enqueue `admin-erasure-cleanup` if physical objects or index cleanup remain.

### 6.7 Post-commit cleanup

- Add `backend/src/modules/admin-lifecycle/admin-erasure-cleanup.processor.ts` and register queue `admin-erasure-cleanup` in `admin-lifecycle.module.ts`.
- Call `StorageService.deleteObject` for each captured object key with bounded retries and per-key results.
- Remove target-scoped index/cache artifacts where database cascade is insufficient.
- Add `admin-erasure-cleanup` to `RESET_QUEUE_NAMES` so Full Reset remains exhaustive.
- Update the known queue processors below so missing/erased targets complete as no-op rather than retrying or re-creating data:
  - `backend/src/modules/rag/processors/rag-indexing.processor.ts`
  - `backend/src/modules/file-upload/processors/library-indexing.processor.ts`
  - `backend/src/modules/performance/performance-recompute.processor.ts`
  - `backend/src/modules/ai-mentor/processors/ai-generation.processor.ts`
  - `backend/src/modules/discussion-board/discussion-board.processor.ts`
  - notification processors under `backend/src/modules/notifications/processors/`

The UI must say “Records deleted; file cleanup is continuing” for `cleanup_pending`. It must not present that as a failed domain deletion.

### 6.8 Security and policy behavior

- Add rule `cascade_academic_erasure` under `ACADEMIC_STRUCTURE` and rule `cascade_account_erasure` under `ACCOUNT_LIFECYCLE` in `admin-maintenance.policy.ts`.
- Keep current password, reason, and acknowledgements at `AdminMaintenanceService.open()`.
- Remove the unconditional “fresh password for every purge” branch only for the `/admin/maintenance` path with an active session.
- Keep session expiry at 15 minutes unless existing configuration overrides it.
- Send an audit/notification event to other active administrators after a cascade erase; notification failure is post-commit and retryable.
- Never log confirmation text, score values, assessment responses, passwords, tokens, or deleted notes.

### 6.9 Error contract

| HTTP | Stable code | Meaning / client action |
|---|---|---|
| 400 | `INVALID_ERASURE_REQUEST` | malformed IDs, mixed/duplicate target set, unsupported mode, or wrong confirmation; keep selection. |
| 401 | existing auth code | sign in again. |
| 403 | `MAINTENANCE_SESSION_REQUIRED` | open/reopen Maintenance Access, then re-preview. |
| 403 | `SELF_ACCOUNT_ERASURE_FORBIDDEN` | permanent boundary; remove self from selection. |
| 403 | `LAST_ADMIN_ERASURE_FORBIDDEN` | create/verify another active administrator first. |
| 404 | `ERASURE_TARGET_NOT_FOUND` | single target missing; batch preview marks exact missing items and cannot mint a manifest. |
| 409 | `TARGET_MUST_BE_ARCHIVED` | present the existing archive/soft-delete next action. |
| 409 | `ERASURE_MANIFEST_STALE` | data/selection changed; automatically re-preview. |
| 409 | `ERASURE_SCHEMA_CHANGED` | deploy/catalog mismatch; stop execution and alert operators. |
| 409 | `UNCLASSIFIED_DEPENDENCY` | new dependency needs a reviewed catalog rule; no rows changed. |
| 409 | `ERASURE_ALREADY_EXECUTING` | poll the returned operation. |
| 423 | `SYSTEM_RESET_IN_PROGRESS` | wait until reset completes; no competing destructive transaction. |
| 200 | `completed` | domain and cleanup complete. |
| 202 | `cleanup_pending` | domain deletion complete; poll cleanup state. |

## 7. Contract, schema, migration, and compatibility plan

### OpenSpec ownership

During implementation, create a new change rather than editing completed historical changes:

- `openspec/changes/admin-authority-cascade-erasure/proposal.md`
- `openspec/changes/admin-authority-cascade-erasure/design.md`
- `openspec/changes/admin-authority-cascade-erasure/tasks.md`
- `openspec/changes/admin-authority-cascade-erasure/specs/actionable-admin-lifecycle/spec.md`
- `openspec/changes/admin-authority-cascade-erasure/specs/admin-maintenance-access/spec.md`

The delta explicitly supersedes the old requirements that retained evidence can never be purged. It preserves empty-only compatibility and adds the cascade-erasure scenarios above.

### Backend contract owners

- `backend/src/modules/admin-lifecycle/DTO/admin-lifecycle.dto.ts`
- `backend/src/modules/admin-lifecycle/admin-lifecycle.types.ts`
- `backend/src/modules/admin-lifecycle/admin-lifecycle.manifest.ts`
- `backend/src/modules/admin-lifecycle/admin-maintenance-lifecycle.controller.ts`
- `backend/src/modules/admin-lifecycle/admin-lifecycle.controller.ts`
- `backend/src/modules/admin-lifecycle/admin-lifecycle.service.ts`
- new `admin-erasure.catalog.ts`, `admin-erasure.service.ts`, and cleanup processor/specs

### Client contract owners

- `next-frontend/src/types/admin-lifecycle.ts`
- `next-frontend/src/services/admin-lifecycle-service.ts`
- `mobile/src/types/admin-lifecycle.ts`
- `mobile/src/api/services/admin-lifecycle.ts`
- `scripts/check-admin-client-contracts.cjs`

The contract checker must compare purge modes, target types, batch limits, warning/blocker codes, operation states, and endpoint paths. Additive fields are optional for legacy clients; new web code requires schema version 2 for cascade mode.

### Migration and reset compatibility

1. Add `0028_admin_authority_cascade_erasure.sql`; never edit applied migration `0027`.
2. Export new tables/relations from the existing Drizzle schema index used by the application.
3. Add both tables to the System Reset preserve catalog and increment `RESET_CATALOG_VERSION`.
4. Add reset write-barrier triggers for both tables using the established migration pattern.
5. Update migration integrity tests and schema snapshots/checks.
6. Rehearse upgrade from `0027` and a clean database.
7. Rollback is feature-flag disable plus forward migration; do not drop receipt tables during incident response.

### Feature flags

- Keep `ADMIN_MAINTENANCE_ENABLED` and `ADMIN_LIFECYCLE_ENABLED` as prerequisites.
- Add `ADMIN_CASCADE_ERASE_ENABLED=false` to `backend/src/config/admin-lifecycle.config.ts`, its spec, `backend/.env.example`, and `.env.compose.example`.
- When false, cascade preview returns stable capability-unavailable metadata; empty-only purge and all existing lifecycle behavior remain available.
- Enable it first in disposable demo/staging. Production enablement requires the rehearsal gates in section 9.

## 8. Ordered implementation phases with exact owners

### Phase 0 — Freeze the revised contract with failing tests

- [ ] Create the OpenSpec change and validate it strictly.
- [ ] Add DTO tests in `backend/src/modules/admin-lifecycle/DTO/admin-lifecycle.dto.spec.ts` for modes, unique 1–50 UUIDs, confirmation, and no required execute password in active Maintenance Access.
- [ ] Add manifest tests in `admin-lifecycle.manifest.spec.ts` proving retained evidence is a blocker in `EMPTY_ONLY` and an executable warning in `CASCADE_ERASE`.
- [ ] Add controller contract tests for all four batch endpoints and single-target adapters.
- [ ] Extend `scripts/check-admin-client-contracts.cjs` fixtures before changing implementation types.
- [ ] Record exact current single-target response snapshots so omitted `purgeMode` remains backward compatible.

### Phase 1 — Fix the independent enrollment `409`

- [ ] Add `ClassesService.enrollStudent` tests in `backend/src/modules/classes/classes.service.spec.ts` for active duplicate, dropped same-class, completed same-class, inactive section row, wrong-section row, and finalized participant cases.
- [ ] Change the transaction lookup to branch on enrollment status rather than treating every same-class row as active.
- [ ] If the same-class row is `dropped` or `completed`, update that row to `enrolled`, refresh `enrolledAt`, clear incompatible terminal metadata, and append a reactivation lifecycle/audit event.
- [ ] Require any section-level row used for promotion to have active `enrolled` status; update both `classId` and status atomically.
- [ ] Add an explicit class-record participant reactivation method in `backend/src/modules/class-record/class-record.service.ts`; change mutable current-period eligibility back to `eligible` instead of relying on `onConflictDoNothing`.
- [ ] Keep finalized/locked participant evidence governed: return a typed next action to reopen/confirm the roster instead of a false duplicate message.
- [ ] Add web admin/teacher and mobile API regression tests proving one successful request and one visible active learner.

### Phase 2 — Make active learners the default without hiding history

- [ ] Add shared filter values `current | historical | all` to the web class-record visual/model helpers.
- [ ] Change `TeacherClassRecordGradeGrid.tsx` default to `current` for active/draft workspaces and retain `all` for finalized/historical evidence views and exports.
- [ ] Add labels explaining that Historical contains dropped/completed learners with retained records.
- [ ] Add tests to `TeacherClassRecordWorkbook.test.tsx` and a focused `TeacherClassRecordGradeGrid.test.tsx` for default, filter switching, finalized mode, and exports.
- [ ] Implement the same default/filter semantics in `mobile/src/components/teacher/MobileClassRecordWorkbook.tsx` and `mobile/src/components/academic/AcademicWorkbook.tsx` with focused tests.
- [ ] Do not remove historical learners from backend roster/spreadsheet responses.

### Phase 3 — Add erasure schema and completeness guard

- [ ] Add migration `backend/drizzle/0028_admin_authority_cascade_erasure.sql` and Drizzle table definitions.
- [ ] Add schema tests for checks, unique idempotency, target ID survival, actor `SET NULL`, item-operation `RESTRICT`, and reset write barriers.
- [ ] Update `system-reset.catalog.ts`, its catalog tests, and `RESET_CATALOG_VERSION`.
- [ ] Implement `admin-erasure.catalog.ts` with initial class, section, and user rules covering every table in the live test schema.
- [ ] Extract/reuse a read-only FK/topological-order helper from System Reset where this avoids duplicate algorithms; keep target selectors in admin lifecycle.
- [ ] Add a completeness test that creates an unclassified FK table and proves preview returns `UNCLASSIFIED_DEPENDENCY` before any delete.
- [ ] Add target semantics tests proving user-author detach does not delete the authored class/lesson.

### Phase 4 — Implement preview and atomic database executor

- [ ] Add `AdminErasureService.prepare()` tests for empty target, evidence-heavy class, section tree, student user, teacher author, self user, last admin, active target, missing target, schema drift, and 50-target aggregate counts.
- [ ] Implement grouped dependency counts, storage inventory, catalog/schema hashes, exact normalized target set, one confirmation, and 10-minute manifest expiry.
- [ ] Add `execute()` tests for stale manifest, changed target set, expired Maintenance Access, duplicate idempotency replay, concurrent operation, and rollback of all 33 targets on one failure.
- [ ] Implement sorted locks, in-transaction re-preview, detach-before-delete, explicit topological deletes, receipt/audit creation, and no external I/O in transaction.
- [ ] Route single-target cascade calls through a one-ID batch internally so there is only one destructive engine.
- [ ] Keep old direct class/section purge endpoints as reviewed-flow redirects; do not create a second bypass path.

### Phase 5 — Add cleanup and stale-job containment

- [ ] Capture all physical object keys and bytes in erasure items before database rows are removed.
- [ ] Register and implement the `admin-erasure-cleanup` BullMQ processor with bounded retries and idempotent per-key results.
- [ ] Add `retry-cleanup` authorization/idempotency tests and operator-visible failure summaries.
- [ ] Add erased/missing-target no-op tests to RAG, library-indexing, performance-recompute, AI-generation, discussion, and notification processors.
- [ ] Add the cleanup queue to System Reset queue inventory and tests.
- [ ] Verify logs contain operation/target IDs and counts but no deleted academic values or credentials.

### Phase 6 — Expose batch APIs and policy capability

- [ ] Add feature-flag/config validation and specs.
- [ ] Update `admin-maintenance.policy.ts` so `cascade_academic_erasure` and `cascade_account_erasure` are explicit Maintenance rules while identity/integrity rules remain protected.
- [ ] Add batch routes to `admin-maintenance-lifecycle.controller.ts` and compatibility adapters to `admin-lifecycle.controller.ts`.
- [ ] Change purge execution password behavior: active Maintenance path uses the open session; compatibility path may verify a supplied password during the deprecation window.
- [ ] Return stable errors from section 6.9 and preserve the existing response envelope.
- [ ] Add an after-commit notification to other active administrators with target type/count, actor, reason, operation ID, and no deleted content.

### Phase 7 — Replace first-item web bulk behavior

- [ ] Extend web lifecycle types/service and make contract tests pass.
- [ ] Refactor `AdminLifecycleDialog.tsx` to accept `targetIds`, render batch target/impact summaries, show one confirmation, and poll cleanup state.
- [ ] In admin classes and sections pages, replace `selectedClasses[0]` / `selectedSections[0]` with one batch preview containing the full selected ID array.
- [ ] On database completion, remove all completed IDs from selection. On pre-commit failure, keep all selected. On stale preview, refresh once and require reconfirmation.
- [ ] Add `page.test.tsx` beside both admin list pages for 33 selections, full payload, atomic failure, cancel, stale re-preview, and cleanup-pending success.
- [ ] Update the user detail page to offer `EMPTY_ONLY` and `CASCADE_ERASE` for a soft-deleted non-self account and render user-specific detach/delete groups.
- [ ] Keep historical archive actions unchanged except for copy that points active targets to archive first.

### Phase 8 — Mobile contract parity and intentional exposure boundary

- [ ] Update mobile types/API/model fixtures for schema version 2, purge mode, batch preview, and operation states.
- [ ] Keep cascade execute unavailable from mobile UI for this release; display a clear “Use the web Admin console for permanent cascade deletion” action when encountered.
- [ ] Preserve existing mobile historical archive/repair flows.
- [ ] Add contract and model tests proving additive fields do not break current mobile screens.
- [ ] Re-run `contract:admin` in backend, web, and mobile.

### Phase 9 — Destructive rehearsal, presentation slice, and release gate

- [ ] Seed a disposable database with: one empty archive, one evidence-heavy class, one section with linked classes, one historical student account, one teacher-author account, one self admin, and one last-admin scenario.
- [ ] Snapshot database and object storage, run previews, save manifests/counts, execute single and 33-target batches, and verify exact absence/detach/receipt outcomes.
- [ ] Force one database failure and prove all targets roll back.
- [ ] Force one storage failure and prove domain deletion completes with retryable cleanup.
- [ ] Verify System Reset completeness after new tables/queue are introduced.
- [ ] Demonstrate the enrollment reactivation and current/historical class-record filter on both admin and teacher web flows.
- [ ] Enable `ADMIN_CASCADE_ERASE_ENABLED` only in demo/staging after the above passes.
- [ ] Production enablement requires written institutional retention approval, backup/restore evidence, exact-SHA CI/deployment success, and an authenticated smoke test.

## 9. Verification matrix and acceptance criteria

### Automated matrix

| Layer | Required proof |
|---|---|
| DTO/contract | 1 and 50 IDs accepted; 0, 51, mixed/duplicate/invalid IDs rejected; web/mobile parity passes. |
| Policy/auth | non-admin, missing/foreign/expired Maintenance session, self user, and last admin rejected; active valid admin accepted. |
| Preview | exact target set/counts, section descendants, user detach semantics, storage counts, schema/catalog hash, warning/blocker conversion by mode. |
| Atomic execute | all selected targets deleted or none; stale manifest/schema rejected; idempotency replays one receipt. |
| Cleanup | object keys deleted; retries are idempotent; permanent cleanup errors are visible without resurrecting rows. |
| Queue safety | known stale jobs no-op when target is absent/erased. |
| Bulk UI | every selected ID sent once; cancel mutates nothing; selection handling matches operation outcome. |
| Enrollment | active duplicate still 409; dropped/completed same-class row reactivates; participant eligibility reconciles. |
| Class record | current default for active workspace; historical/all filters and exports preserve evidence. |
| Migration/reset | clean install, `0027 -> 0028` upgrade, catalog completeness, write barriers, and System Reset pass. |

### Suggested commands

From `backend/`:

```bash
npm test -- --runInBand src/modules/admin-lifecycle src/modules/classes/classes.service.spec.ts src/modules/class-record
npm run contract:admin
npm run test:system-reset
npm run build
npm run lint
```

From `next-frontend/`:

```bash
npm test -- --runInBand src/components/admin/AdminLifecycleDialog.test.tsx app/\(dashboard\)/dashboard/admin/classes/page.test.tsx app/\(dashboard\)/dashboard/admin/sections/page.test.tsx app/\(dashboard\)/dashboard/admin/users/\[id\]/page.test.tsx src/components/teacher/class-record
npm run typecheck
npm run lint
npm run build
npm run test:e2e -- --grep "admin cascade erasure|historical reenrollment"
```

From `mobile/`:

```bash
npm test -- --runInBand src/api/__tests__/admin-lifecycle-api.test.ts src/screens/__tests__/admin-lifecycle-contract.test.ts src/api/__tests__/academic-class-record.test.ts
npm run typecheck
```

OpenSpec and repository checks:

```bash
openspec validate admin-authority-cascade-erasure --strict
git diff --check
```

### Acceptance criteria

- [ ] An admin with active Maintenance Access can cascade-erase an evidence-heavy archived class, section, or soft-deleted non-self user.
- [ ] The preview lists the actual descendant groups and counts; retained evidence is a warning in cascade mode, not `IMMUTABLE`.
- [ ] Password is entered once when Maintenance Access opens, not again for every target; one batch confirmation is required.
- [ ] Selecting 33 archived classes/sections sends and executes all 33 atomically.
- [ ] Self-user and last-active-admin erasure remain impossible.
- [ ] A teacher account purge does not delete unrelated classes or school content it authored.
- [ ] Every database dependency is deleted/detached or explicitly preserved; unknown dependencies block before mutation with a stable operator code.
- [ ] Physical cleanup is tracked and retryable; UI distinguishes cleanup pending from deletion failure.
- [ ] A historical same-class enrollment can be reactivated; a genuinely active duplicate still returns 409.
- [ ] Active class records initially show active learners only, with historical/all filters and complete exports.
- [ ] Existing historical retirement, teacher permissions, mobile flows, and System Reset remain green.

### Manual destructive evidence

For each target type, record:

- pre-preview row counts and named target;
- manifest hash, schema hash, catalog version, and target count;
- post-commit target/descendant absence queries;
- detach checks for preserved institutional content;
- receipt/audit row without erased content;
- object-storage key absence or cleanup-pending/retry result;
- idempotency replay response;
- rollback proof from one injected failure.

No production release claim is valid without this evidence on the exact deployed SHA.

## 10. Rollout, rollback, observability, cleanup, and unverified boundaries

### Rollout

1. Land enrollment and class-record visibility fixes independently; they do not require destructive capability.
2. Land schema/catalog/preview behind `ADMIN_CASCADE_ERASE_ENABLED=false`.
3. Complete disposable-database and storage rehearsal.
4. Enable only in the presentation/demo environment and run the exact scripted scenarios.
5. Obtain institutional retention approval and backup/restore evidence.
6. Enable in production for a narrow administrator window, observe first operations, then retain as an ordinary Maintenance Access capability if healthy.

The presentation can honestly demonstrate the complete flow tomorrow only if phases 0–9 and the disposable rehearsal pass. If the erasure engine is not verified, present the batch preview behind the disabled feature flag and ship only the independent 409/filter fixes; do not convert an unverified broad delete into a production shortcut.

### Rollback

- Immediate containment: set `ADMIN_CASCADE_ERASE_ENABLED=false`; empty-only purge and existing lifecycle flows remain available.
- Cancel queued cleanup only if it has not started and keeping the orphaned object is required for incident investigation.
- Do not attempt to reconstruct erased academic rows automatically from the minimal receipt.
- Restore deleted domain data only through the verified database/object backup procedure.
- Keep migration `0028` and receipt rows during rollback; use a forward fix rather than dropping audit evidence.

### Observability

Emit structured logs/metrics for:

- preview count by target type/mode;
- preview-to-execute conversion and cancel rate;
- target and descendant row counts;
- `UNCLASSIFIED_DEPENDENCY`, stale manifest/schema, self, last-admin, and concurrent-operation refusals;
- transaction duration, lock wait, rollback count, and batch size;
- cleanup objects/bytes, retries, terminal failures, and age of `cleanup_pending`;
- stale queue jobs that no-op against erased targets;
- enrollment active-duplicate versus historical-reactivation results.

Never emit deleted score values, assessment responses, password material, access tokens, or free-form learner notes.

### Cleanup and follow-up

- Remove the frontend single-item queue fallback once backend batch execution is enabled everywhere.
- After one compatibility window, remove `currentPassword` from single purge execute clients while continuing to reject calls without Maintenance Access.
- Review whether a dedicated `school_it_admin` role is needed after the presentation; do not silently add one in this change.
- Review cleanup failure metrics after the first 10 operations and adjust worker concurrency/retry timing if needed.
- Archive the OpenSpec change only after exact-SHA release and authenticated acceptance evidence.

### Unverified boundaries

- The exact deployed PostgreSQL schema, legacy tables, triggers, row counts, and longest lock duration were not inspected in this planning turn.
- Object keys outside `uploaded_files` and structured banner/profile fields need confirmation during catalog implementation.
- Out-of-repository consumers of `/api/admin/lifecycle/*` and `/api/admin/maintenance/*` are unknown.
- Institutional policy may legally require retention even when the product allows erasure; production enablement needs an explicit owner decision.
- Backup recency, restore duration, Railway deployment state, and current feature-flag values were not verified.
- Physical browser, mobile-device, and APK behavior were not tested because this is a planning-only turn.

These items are release gates or implementation discovery tasks, not reasons to restore the current dead-end retained-evidence policy. The executable design remains: explicit cascade mode, one Maintenance Access step-up, one batch review, atomic database deletion, minimal receipt, and retryable cleanup.
