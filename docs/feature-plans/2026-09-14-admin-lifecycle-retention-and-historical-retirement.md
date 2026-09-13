# Admin Lifecycle Retention and Historical Retirement Implementation Plan

Plan date: 2026-09-14

Repository state inspected: `f46235a34466ec8460a7017e21a78ae85da7001d` on `developement`

Planning status: Implemented and locally verified; exact-SHA release verification is in progress

Implementation authorization: Subsequently granted through the repository's finish-and-ship workflow.

Companion analysis: [`docs/feature-analysis/2026-09-13-admin-lifecycle-blocker-dead-ends.md`](../feature-analysis/2026-09-13-admin-lifecycle-blocker-dead-ends.md)

Related completed parent design: [`docs/feature-plans/2026-09-13-admin-maintenance-gateway-and-safeguard-reset.md`](2026-09-13-admin-maintenance-gateway-and-safeguard-reset.md)

This is a focused corrective extension to the existing Admin Maintenance Gateway. It does not replace or compete with that broader plan. It addresses the remaining dead-end behavior for evidence-protected permanent deletion and historical class or section archiving.

## 1. Decision summary and feature brief

### Decision

There is no architectural blocker to implementing this feature.

The recommended change has two separate outcomes:

1. Permanent deletion remains impossible when retained academic or lifecycle evidence exists. The product must present that as a useful retention outcome, not as a confirmation ceremony that can never continue.
2. Historical classes and sections gain an evidence-preserving retirement mode under the existing archive workflow. A structurally empty historical target can be retired directly; a target with lingering active memberships must collect explicit outcomes in the same governed preview before the retirement can execute atomically.

The implementation must not add a `force`, evidence override, or cascade-delete path. It must not infer that a historical learner completed, withdrew, dropped, or transferred.

### Recommended contract shape

Add an optional discriminant to the existing class and section archive requests:

```ts
lifecycleMode?: "CURRENT_CLOSURE" | "HISTORICAL_RETIREMENT"
```

Absence means `CURRENT_CLOSURE`, preserving existing callers. In historical-retirement mode, outcome and effective-period fields are optional only for a structurally empty target. If active memberships remain, the same preview requires an explicit supported outcome and historical effective period before execution. The backend verifies that the target is historical and that no unresolved active memberships remain.

Keep the persisted operation actions as `ARCHIVE_CLASS` and `ARCHIVE_SECTION`. This avoids inventing a second meaningfully identical database operation and avoids changing the `admin_lifecycle_operation_action_valid` check.

Add an optional decision disposition to the response contract while retaining the existing decision states:

```ts
disposition?:
  | "EXECUTABLE"
  | "CHOICE_REQUIRED"
  | "REPAIR_REQUIRED"
  | "RETAIN_REQUIRED";
```

This lets web and mobile distinguish protected retention, missing outcome choices, and true repair-only states without breaking older clients that only understand `state`.

### User-visible outcomes

| Case | Required outcome |
|---|---|
| Student permanent deletion with retained evidence | Explain that permanent deletion is unavailable, show the retained categories, and offer a close/keep-record action. Do not ask for acknowledgements. |
| Class permanent deletion with retained evidence | Explain that the class must be retained; offer archive-instead only if the existing archive workflow is actually applicable. |
| Section permanent deletion with retained evidence | Explain that the section must be retained; offer archive-instead only if the existing archive workflow is actually applicable. |
| Historical class archive with no active memberships | Preview and execute evidence-preserving historical retirement. |
| Historical section archive with no active memberships | Preview and execute retirement of the section and linked structural classes while preserving academic evidence. |
| Historical class or section with active memberships | Name the unresolved count, collect explicit outcomes and a historical period in the same review, then require a fresh executable preview. |

## 2. Scope, non-goals, permissions, and assumptions

### In scope

- Backend decision semantics for purge retention and historical retirement.
- Existing `/api/admin/maintenance/classes/preview|execute`, `/sections/preview|execute`, and `/purge/preview` contracts.
- The compatibility `/api/admin/lifecycle/*` controller wherever it delegates to the same DTOs and service methods.
- Web Admin users, classes, and sections lifecycle dialogs.
- Mobile Admin lifecycle review and the matching API/type layer.
- Target-aware historical membership repair inside the existing governed class/section review.
- Audit, idempotency, manifest integrity, authorization, throttling, and post-commit effects already owned by Admin Lifecycle.
- Targeted unit, contract, UI, and integration verification.

### Non-goals

- Deleting scores, attempts, class records, assessments, lessons, lifecycle events, or enrollment history to make purge eligible.
- Adding a retained-evidence override, `force=true`, or administrator bypass.
- Changing teacher grading, assessment, lesson, or student enrollment APIs.
- Reinterpreting historical active memberships without an administrator-provided outcome.
- General academic-repair redesign, school-year transition redesign, or full-system reset changes.
- Retrofitting unrelated admin dialogs or CRUD flows.
- Deployment, migration execution, APK generation, or production data repair under this planning authorization.

### Permissions and authorization boundary

- This document is the only repository mutation authorized during planning.
- Implementation, commits, push, deployment, database changes, and live data repair require separate authorization.
- Existing Admin role checks, Maintenance Access checks, password reauthentication for permanent deletion, manifest expiry/hash checks, and idempotency requirements remain authoritative.

### Assumptions

- **Confirmed:** Web and mobile call the canonical `/admin/maintenance/*` endpoints through typed service wrappers.
- **Confirmed:** Existing request callers remain valid when `lifecycleMode` is omitted and defaults to `CURRENT_CLOSURE`.
- **Inferred:** A historical class or section with zero active memberships can be retired by changing only structural active/archive fields because existing archive apply paths already preserve evidence and archive linked structures.
- **Confirmed plan correction:** The existing web/mobile academic-recovery panels do not provide general historical membership outcomes. Sending the user there would preserve the dead end, so historical outcomes must stay inside the manifest-bound lifecycle review.
- **Assumption requiring implementation-time characterization:** “Active membership” means the same enrollment status predicate currently used by `ClassLifecycleService` and `SectionLifecycleService`; the implementation must not introduce a second predicate.
- **Unverified:** The exact number and shape of affected historical rows in deployed databases. A read-only inventory query is required before rollout, not before coding.

## 3. Current-state evidence ledger

| Status | Evidence | Consequence |
|---|---|---|
| Confirmed | `backend/src/modules/admin-lifecycle/purge-lifecycle.service.ts` inventories retained evidence for users, classes, and sections and emits a permanent-action warning, confirmation, and effect even when `safeToExecute` is false. | Backend correctly blocks deletion but supplies executable-looking ceremony for a terminal result. |
| Confirmed | `backend/src/modules/admin-lifecycle/admin-lifecycle.evidence.ts` treats any non-zero retained-evidence category as a purge blocker. | The evidence-retention floor is intentional and should remain unchanged. |
| Confirmed | `backend/src/modules/admin-lifecycle/admin-lifecycle.service.ts` re-previews execution, verifies hash/expiry, claims idempotency, writes audit evidence, and rejects blocked manifests. | Historical retirement should reuse this execution shell rather than introduce a parallel write path. |
| Confirmed | `backend/src/modules/admin-lifecycle/admin-lifecycle.manifest.ts:68-135` derives next actions only from blocker `resolutionOptions` and maps every non-resolvable blocker to `IMMUTABLE`. | One state currently conflates “must retain” with “wrong workflow” and “repair first.” |
| Confirmed | `backend/src/modules/admin-lifecycle/class-lifecycle.service.ts:95-289` blocks every target outside the active year with `CLASS_NOT_IN_ACTIVE_YEAR`, while still calculating archive effects and confirmations. | Historical class retirement is prevented before the existing archive apply path can run. |
| Confirmed | `backend/src/modules/admin-lifecycle/section-lifecycle.service.ts:71-253` behaves the same for `SECTION_NOT_IN_ACTIVE_YEAR`. | Historical section retirement is also a dead end. |
| Confirmed | `backend/src/modules/admin-lifecycle/DTO/admin-lifecycle.dto.ts:23-33,70-91` has no operation mode; class closure requires a current-period resolution and section closure requires a learner-outcome array. | Historical structural retirement is not representable without pretending it is a current closure. |
| Confirmed | `backend/src/drizzle/schema/admin-lifecycle.schema.ts:21-27,86-92` and `backend/drizzle/0027_admin_maintenance_gateway.sql:30-31` already allow `ARCHIVE_CLASS` and `ARCHIVE_SECTION`. | Reusing those actions requires no action-check migration. |
| Confirmed | `next-frontend/src/components/admin/AdminLifecycleDialog.tsx:191-218,301-391` renders “Cannot continue yet,” warnings, an `IMMUTABLE` card, and prospective effects for blocked manifests. | The web dialog needs disposition-aware presentation and must suppress acknowledgements/effects for terminal retention. |
| Confirmed | The same web component renders `NAVIGATE_REPAIR` and `REPREVIEW` actions but does not render `CANCEL`. | A backend-provided keep/close action currently cannot help the user. |
| Confirmed | `mobile/src/screens/AdminLifecycleReviewScreen.tsx:513-535,1001-1064` handles repair/re-preview actions but not `CANCEL`, and renders warnings after a blocked decision. | Mobile has the same contract and dead-end presentation risk. |
| Confirmed | `next-frontend/app/(dashboard)/dashboard/admin/users/[id]/page.tsx`, `.../classes/page.tsx`, and `.../sections/page.tsx` own the affected web entry points. | The fix must preserve route behavior while selecting the correct lifecycle mode and next action. |
| Confirmed | `mobile/src/screens/AdminUserDetailScreen.tsx`, `AdminClassesScreen.tsx`, `AdminClassesWorkspaceScreen.tsx`, `AdminSectionsScreen.tsx`, and `AdminSectionDetailScreen.tsx` consume the same lifecycle review flow. | Backend contract changes have mobile consumers and cannot be treated as web-only. |
| Confirmed | `next-frontend/src/services/admin-lifecycle-service.ts:19-51` and `mobile/src/api/services/admin-lifecycle.ts` own client transport. | Pages/screens should not issue raw API calls. |
| Confirmed | `next-frontend/src/types/admin-lifecycle.ts:17-37,129-148` and `mobile/src/types/admin-lifecycle.ts:20-42,132-152` mirror the lifecycle contract separately. | Producer changes require two typed-consumer updates. |
| Confirmed | `next-frontend/src/components/admin/AcademicRecoveryPanel.tsx` currently owns grade, state, assessment, and duplicate-class repair; duplicate retirement is limited to a current-year duplicate-class case in backend academic repair. | The message “handled through academic repair” points to a workflow that cannot complete this task; the lifecycle review must collect the required historical outcomes itself. |
| Confirmed | `openspec status --change admin-maintenance-gateway --json` reported all proposal/design/spec/task artifacts complete on 2026-09-14. | This plan is a corrective extension; implementation should update or supersede the affected OpenSpec requirements before code changes. |
| Unverified | No authenticated browser or physical-device flow was executed during planning. | Exact copy, focus order, and navigation behavior remain acceptance-test work. |
| Unverified | No external API consumer registry exists in the inspected evidence. | Repository consumers are mapped; out-of-repository clients must be checked before contract rollout. |

## 4. End-to-end impact and consumer map

### Producer-to-consumer flow

| Layer | Owner | Planned impact |
|---|---|---|
| Domain request validation | `backend/src/modules/admin-lifecycle/DTO/admin-lifecycle.dto.ts` | Add `lifecycleMode`, conditional validation, and normalized defaults. |
| Decision vocabulary | `backend/src/modules/admin-lifecycle/admin-lifecycle.types.ts`, `admin-lifecycle.manifest.ts` | Add optional disposition and explicit metadata for retain, repair, and retry outcomes. |
| Class planning/execution | `backend/src/modules/admin-lifecycle/class-lifecycle.service.ts` | Separate current closure from historical retirement; preserve evidence and reject inferred outcomes. |
| Section planning/execution | `backend/src/modules/admin-lifecycle/section-lifecycle.service.ts` | Retire historical sections and linked classes only after every active membership has an explicit outcome. |
| Purge planning | `backend/src/modules/admin-lifecycle/purge-lifecycle.service.ts` | Return a terminal retention decision without confirmations or executable effects when evidence blocks deletion. |
| Execution shell | `backend/src/modules/admin-lifecycle/admin-lifecycle.service.ts` | Normalize and hash the mode, preserve re-preview/idempotency/audit behavior, and keep purge reauthentication. |
| HTTP surfaces | `admin-maintenance-lifecycle.controller.ts`, compatibility `admin-lifecycle.controller.ts` | Preserve route names and envelopes; consume updated DTOs. No new public bypass endpoint. |
| Persistence | `backend/src/drizzle/schema/admin-lifecycle.schema.ts`, `backend/drizzle/*` | No schema change recommended. Verify that operation request JSON and audit details retain the normalized mode. |
| Web contract | `next-frontend/src/types/admin-lifecycle.ts`, `src/services/admin-lifecycle-service.ts` | Mirror mode/disposition and keep the service boundary. |
| Web presentation | `next-frontend/src/components/admin/AdminLifecycleDialog.tsx` | Render disposition-specific headings, implement cancel/close, hide impossible confirmations/effects, and support historical retirement copy. |
| Web entry points | Admin users/classes/sections pages listed in the evidence ledger | Choose historical mode from backend-owned target metadata; never infer membership outcomes in the page. |
| Mobile contract | `mobile/src/types/admin-lifecycle.ts`, `src/api/services/admin-lifecycle.ts` | Mirror the additive contract and normalized request shape. |
| Mobile presentation | `mobile/src/screens/AdminLifecycleReviewScreen.tsx` | Match web semantics, implement cancel/back, and route repair without no-op actions. |
| Mobile entry points | Admin user/class/section screens and navigation types | Pass target year/type context and invalidate affected queries after successful retirement. |
| Historical outcome inputs | Existing web class/section lifecycle pages and `mobile/src/screens/AdminLifecycleReviewScreen.tsx` | Collect real outcomes and a historical period inside the reviewed request; never send the administrator to a recovery screen that lacks this capability. |
| Audit/notifications | Existing Admin Lifecycle service, audit service, lifecycle events, and notification post-commit hooks | Record the mode and outcome; notify only after commit using existing affected-user calculations. |
| Specifications | `openspec/changes/admin-maintenance-gateway/specs/actionable-admin-lifecycle/spec.md` and tasks/design if implementation is authorized | Clarify that protected evidence yields retention guidance and that historical retirement is a governed archive mode. |

### Data flow

1. The client requests preview with target ID and `lifecycleMode`.
2. The backend loads current academic state, target school year, active memberships, linked structures, and evidence counts in the existing repeatable-read preview.
3. The domain planner returns one of four dispositions:
   - `EXECUTABLE`: ready to archive/retire or purge.
   - `CHOICE_REQUIRED`: current closure needs explicit outcomes.
   - `CHOICE_REQUIRED`: active memberships, including historical ones, need real outcomes in the current review.
   - `REPAIR_REQUIRED`: protected evidence requires a separate repair operation that actually exists.
   - `RETAIN_REQUIRED`: retained evidence makes permanent deletion impossible.
4. For executable operations, the client acknowledges only real warnings/confirmations and sends the signed manifest evidence.
5. The backend re-previews, verifies the same normalized request and manifest, executes transactionally, writes audit/lifecycle records, and dispatches post-commit effects.
6. When choices are required, the client keeps the target context, collects the missing outcomes/period, discards the old manifest, and requests a new preview.

### External and asynchronous boundaries

- No AI-service, BullMQ job, Redis queue, file storage, or external provider participates in this feature.
- Existing notification dispatch after commit remains in scope because affected users may need lifecycle notifications.
- Any analytics or logs must use target IDs, counts, decision code, and disposition only; they must not include score contents, passwords, or free-form student notes.

## 5. Conflicts, invariants, risks, and design options

### Intentional invariants to preserve

1. Retained academic evidence is not purgeable through ordinary admin maintenance.
2. The backend, not the UI, decides whether an operation is safe.
3. No historical membership outcome is inferred from age, school year, inactivity, or record evidence.
4. Preview and execute are bound by the same normalized request, manifest hash, expiry, and transactional re-preview.
5. Existing evidence, class-record ownership, scores, attempts, assessments, lessons, and lifecycle history remain attached after archive/retirement.
6. Permanent deletion keeps step-up password verification even when an evidence-free target is eligible.

### Avoidable friction to remove

- “Cannot continue yet” implies a temporary missing step when deletion is permanently disallowed.
- The `IMMUTABLE` label is exposed as implementation language instead of a user decision.
- Blocked purge manifests ask the administrator to acknowledge warnings and preview changes that cannot execute.
- Historical archive tells the administrator to use academic repair, but no general retirement operation is available there.
- Web and mobile receive typed next actions that they do not fully handle, especially `CANCEL`.

### Design options

#### Option A — Presentation-only correction

Change dialog copy and hide blocked confirmations/effects, while leaving historical records unarchivable.

- Advantages: smallest change and lowest immediate execution risk.
- Disadvantages: does not solve the historical archive dead end; backend semantics remain ambiguous; mobile and future clients must duplicate code-to-copy mapping.
- Decision: Reject because it treats only the symptom.

#### Option B — Add separate historical-retirement endpoints and operation actions

Create new preview/execute routes plus `RETIRE_HISTORICAL_CLASS` and `RETIRE_HISTORICAL_SECTION` persisted actions.

- Advantages: explicit API surface and isolated DTOs.
- Disadvantages: duplicates archive orchestration; requires a database check-constraint migration; widens controller, audit, operation, and client surfaces for an operation whose durable effect is still archive.
- Decision: Do not select unless characterization proves existing archive planners cannot cleanly branch by mode.

#### Option C — Add a discriminated mode to existing archive contracts

Use the existing routes, operation actions, execution shell, and audit records. Branch domain planning by a server-verified `lifecycleMode`; add a response disposition for client presentation.

- Advantages: preserves compatibility, avoids a schema migration, keeps one audit meaning for archive, and fixes both server semantics and client UX.
- Disadvantages: requires careful conditional DTO validation and characterization so current closure cannot accidentally enter the historical branch.
- Decision: Recommended.

### Highest-impact risks and mitigations

| Risk | Mitigation |
|---|---|
| Historical mode archives a current-year class/section | Server rejects `HISTORICAL_RETIREMENT` unless target school year differs from the authoritative active year. Add negative tests. |
| Lingering active membership is silently completed or dropped | Historical mode blocks until the administrator supplies explicit outcomes and a period; the reviewed manifest lists every enrollment mutation before atomic execution. |
| Old clients misread new response data | Keep existing state/action fields, add optional disposition, default absent request mode to current closure, and do not emit a new next-action kind. |
| Manifest replay crosses modes | Normalize mode before hashing and include it in preview request/audit payload; execute re-previews the same mode. |
| Section retirement partially archives linked classes | Keep the existing academic transaction and test rollback on a forced mid-operation failure. |
| UI offers archive-instead where archive is also blocked | Derive next actions from the actual preview; do not hard-code an archive button solely from target type. |
| A blocked purge still looks executable in one client | Add shared contract fixtures and matching web/mobile rendering tests for all three purge target types. |

## 6. Recommended architecture, data flow, security, and error behavior

### Domain model

Introduce `AdminLifecycleMode` in the backend DTO/domain layer:

- `CURRENT_CLOSURE`: present behavior and default for omitted mode.
- `HISTORICAL_RETIREMENT`: archive historical structure only after proving there are no active memberships.

Normalize request DTOs into internal command types before planning so the planners do not carry optional fields:

- Current class closure requires `resolution` and `effectivePeriod`.
- Historical class retirement requires neither learner resolution nor replacement class only when the target has no active memberships; otherwise it requires the selected outcome, period, and any transfer destination.
- Current section closure requires `effectivePeriod` and a student-resolution array.
- Historical section retirement requires neither a period nor supplied student outcomes only when the target has no active memberships; otherwise it requires one outcome per active learner and a historical period.

The wire DTO may remain additive and conditionally validated, but internal planner inputs must be discriminated unions. This avoids scattered non-null assertions and protects the execution branch.

### Historical class retirement policy

The backend must verify:

1. Target exists and is still active.
2. Target school year is not the authoritative active school year.
3. Every enrollment matching the existing active-membership predicate has an explicit supported outcome, or no such enrollment remains.
4. A historical effective period is supplied whenever a membership will change.
5. No concurrent state change invalidated the preview.

For an empty class, effects contain only the class archive mutation plus existing audit/lifecycle/post-commit behavior. When active memberships exist, effects also contain only the explicitly selected completion, withdrawal/drop, or compatible transfer changes and their append-only lifecycle events. Class records, scores, attempts, assessments, lessons, teacher ownership, and schedule identity remain unchanged.

When active memberships exist without complete outcomes, return `CHOICE_REQUIRED` with the unresolved count and required input fields. Do not include executable archive effects or confirmations until a fresh preview contains all required outcomes.

### Historical section retirement policy

The backend must verify the same conditions for the section and all memberships governed by the section closure planner. Historical completion is allowed only as an explicit administrator choice; it closes the matching enrollment rows and appends lifecycle events without rewriting grade evidence. When ready, reconcile the selected outcomes and archive the section and active linked structural classes in one existing academic transaction. Preserve enrollment history and all linked evidence.

If any active membership lacks a valid outcome, block the whole operation and keep the administrator in the review. Do not partially reconcile learners or retire linked classes.

### Protected purge policy

When any retained-evidence category is non-zero:

- Keep `safeToExecute: false`.
- Keep a non-resolvable blocker for enforcement.
- Return `decision.state: "IMMUTABLE"` for backward compatibility and `decision.disposition: "RETAIN_REQUIRED"` for precise presentation.
- Set `requiredConfirmations` to `[]`.
- Set executable `effects` to `[]`; retained evidence stays in `preserved`/evidence inventory.
- Do not return password-entry or acknowledgement requirements.
- Return a target-aware `CANCEL` next action such as “Keep student record,” “Keep class archived,” or “Keep section archived.”
- Return archive-instead only if a separately computed archive preview is applicable; otherwise show the retained state as the completed outcome.

Eligible evidence-free purge behavior remains unchanged, including password reauthentication and destructive confirmation.

### Security and authorization

- Preserve global JWT authentication and explicit Admin role guards on both controller prefixes.
- Preserve Maintenance Access gating for execution.
- Preserve lower preview and execution throttles already defined by the controllers.
- Preserve current-password verification for eligible purge execution; never send it in preview, manifest, logs, audit details, or idempotency hashing.
- Reject client-supplied school-year authority; fetch current academic state from the database.
- Treat the manifest as evidence of a reviewed snapshot, not as authority to bypass a changed target.
- Keep all mutations in the existing database transaction and all notifications after commit.

### Error and decision behavior

| Condition | API behavior | Client behavior |
|---|---|---|
| Retained evidence blocks purge | Successful preview envelope with `RETAIN_REQUIRED`; execute remains rejected if attempted | Explain retention; no acknowledgements/password/effects; close or archive if valid |
| Historical target has active memberships but incomplete outcomes | Successful preview with `CHOICE_REQUIRED` and exact missing fields | Collect outcomes/period in place, then re-preview |
| Historical target has no active memberships | Successful executable preview | Show preserved evidence and one retirement confirmation |
| Historical mode used for active-year target | Validation/domain conflict, stable code `HISTORICAL_MODE_NOT_APPLICABLE` | Explain that current closure is required; re-preview in current mode |
| Current mode used for historical target | Successful blocked preview with a stable historical-mode-required code | Updated clients re-preview in historical mode from authoritative target-year data; older clients remain safely blocked |
| Manifest expired or target changed | Existing stale/review-mismatch conflict | Clear confirmations and force fresh preview |
| Missing Admin/Maintenance Access | Existing 401/403/maintenance response | Preserve access-recovery UI; never downgrade authority |
| Unexpected database failure | Existing sanitized server error with operation failure audit where applicable | Preserve retry boundary; do not claim partial success |

## 7. Contract, schema, migration, and compatibility changes

### Request contract

Backend DTO ownership: `backend/src/modules/admin-lifecycle/DTO/admin-lifecycle.dto.ts`.

1. Add `ADMIN_LIFECYCLE_MODES` and `AdminLifecycleMode`.
2. Add optional `lifecycleMode` to class and section preview DTOs; normalize omission to `CURRENT_CLOSURE` in `AdminLifecycleService`.
3. Use conditional validation so current closure retains all current required fields, empty historical retirement can omit outcome fields, and historical retirement with memberships is enforced by the domain snapshot rather than ignored.
4. Keep execute DTO inheritance and manifest execution evidence unchanged.
5. Include normalized mode in `classPreview`, `sectionPreview`, request hashing, operation request JSON, and audit details.

Client mirrors:

- `next-frontend/src/types/admin-lifecycle.ts`
- `mobile/src/types/admin-lifecycle.ts`
- Corresponding service tests and request fixtures

### Response contract

1. Add optional `decision.disposition` to the backend, web, and mobile types.
2. Retain all existing `decision.state` values and next-action kinds.
3. Use existing `REPREVIEW`, `NAVIGATE_REPAIR`, and `CANCEL`; do not add a new action kind in this change.
4. Implement `CANCEL` in both clients.
5. Keep the existing `success/message/data` response envelope.
6. Keep manifest `schemaVersion: 1` because changes are additive and old requests/responses remain meaningful; characterize any exact runtime validator before implementation and bump only if that evidence contradicts this assumption.

### Schema and migration decision

No database schema migration is recommended.

- `admin_lifecycle_operations.action` already accepts `ARCHIVE_CLASS` and `ARCHIVE_SECTION`.
- Request/audit payloads are JSON-capable and can retain the normalized mode without a new column.
- No evidence table or target table needs a new field.

Implementation must add a schema regression test proving the action check remains unchanged. If code work discovers a hard requirement for a new persisted action, stop and revise this plan before generating a migration; do not silently widen scope.

### Compatibility

- Old clients omit `lifecycleMode` and retain current behavior.
- New clients receive `disposition` but must fall back to existing `state` if it is absent during a staggered rollout.
- The backend must not emit unfamiliar next-action kinds.
- Canonical `/admin/maintenance/*` behavior changes first; compatibility `/admin/lifecycle/*` must remain aligned because both controllers import the same DTOs/service.
- No teacher, student, or AI-service contract changes are expected.

## 8. Ordered implementation phases with exact owners

### Phase 0 — Specification and characterization

Owners:

- `openspec/changes/admin-maintenance-gateway/specs/actionable-admin-lifecycle/spec.md`
- `openspec/changes/admin-maintenance-gateway/design.md`
- `openspec/changes/admin-maintenance-gateway/tasks.md`
- Existing backend/web/mobile lifecycle specs

Tasks:

1. Add explicit requirements for `RETAIN_REQUIRED` and `HISTORICAL_RETIREMENT` before product code.
2. Characterize the current active-membership predicate, manifest request normalization, both controller prefixes, and blocked purge output.
3. Add failing contract fixtures for all five reported cases plus historical targets with lingering active memberships.

Exit condition: tests capture the current dead ends and the desired additive contract without changing enforcement.

### Phase 1 — Backend decision and purge presentation semantics

Owners:

- `backend/src/modules/admin-lifecycle/admin-lifecycle.types.ts`
- `backend/src/modules/admin-lifecycle/admin-lifecycle.manifest.ts`
- `backend/src/modules/admin-lifecycle/purge-lifecycle.service.ts`
- `backend/src/modules/admin-lifecycle/admin-lifecycle.manifest.spec.ts`
- `backend/src/modules/admin-lifecycle/admin-lifecycle.evidence.spec.ts`
- Purge coverage in `admin-lifecycle.service.spec.ts`

Tasks:

1. Add the optional disposition mapping without changing existing states.
2. Make blocked purge return retention information rather than confirmation/effect ceremony.
3. Add target-aware cancel/keep metadata using the existing next-action vocabulary.
4. Prove evidence-free purge is unchanged and retained-evidence execution is still rejected.

Exit condition: user/class/section purge previews are informative and non-executable, while the hard evidence guard is unchanged.

### Phase 2 — Backend historical retirement

Owners:

- `backend/src/modules/admin-lifecycle/DTO/admin-lifecycle.dto.ts`
- `backend/src/modules/admin-lifecycle/admin-lifecycle.service.ts`
- `backend/src/modules/admin-lifecycle/class-lifecycle.service.ts`
- `backend/src/modules/admin-lifecycle/section-lifecycle.service.ts`
- Both lifecycle controllers
- `admin-lifecycle.dto.spec.ts`
- `class-lifecycle.service.spec.ts`
- `section-lifecycle.service.spec.ts`
- `admin-lifecycle.controller.spec.ts`
- `admin-lifecycle.service.spec.ts`
- `admin-lifecycle.schema.spec.ts`

Tasks:

1. Add and normalize the discriminated lifecycle mode.
2. Split current closure and historical retirement planners into explicit branches.
3. Block historical retirement until every active membership has an explicit supported outcome and historical period.
4. Execute structural-only retirement when the target is empty; otherwise execute only the reviewed membership outcomes and structural retirement in the same operation/audit transaction.
5. Implement explicit historical section completion without academic-transition inference and preserve linked-class atomicity.
6. Verify request hashes differ across modes and stale manifests cannot cross-execute.
7. Verify no migration or new operation action is introduced.

Exit condition: both historical target types have safe preview/execute coverage, negative membership tests, transaction rollback coverage, and unchanged current-year closure behavior.

### Phase 3 — Web contract and lifecycle UX

Owners:

- `next-frontend/src/types/admin-lifecycle.ts`
- `next-frontend/src/services/admin-lifecycle-service.ts`
- `next-frontend/src/components/admin/AdminLifecycleDialog.tsx`
- `next-frontend/app/(dashboard)/dashboard/admin/users/[id]/page.tsx`
- `next-frontend/app/(dashboard)/dashboard/admin/classes/page.tsx`
- `next-frontend/app/(dashboard)/dashboard/admin/classes/[id]/page.tsx`
- `next-frontend/app/(dashboard)/dashboard/admin/sections/page.tsx`
- Relevant dialog, service, and page tests

Tasks:

1. Mirror the additive request/response contract and fallback behavior.
2. Choose retirement mode only from target metadata and let the backend verify it.
3. Replace technical headings with disposition-aware language:
   - `RETAIN_REQUIRED`: “Permanent deletion is unavailable.”
   - `CHOICE_REQUIRED`: “Choose outcomes for historical memberships.”
   - executable historical mode: “Retire this historical class/section.”
4. Hide outcome selectors when historical retirement does not require an outcome.
5. Hide warnings-to-acknowledge, password, confirmations, and executable-effect sections for retained-evidence purge.
6. Render retained categories under “Why this record must be kept.”
7. Implement `CANCEL` as a real close/keep action and preserve keyboard/focus behavior.
8. Keep unresolved historical outcomes in the originating dialog, invalidate the stale preview when inputs change, and re-preview before enabling execution.

Exit condition: the five reported web entry points no longer dead-end or show impossible acknowledgement UI.

### Phase 4 — Mobile contract and parity

Owners:

- `mobile/src/types/admin-lifecycle.ts`
- `mobile/src/api/services/admin-lifecycle.ts`
- `mobile/src/features/admin-lifecycle/model.ts`
- `mobile/src/screens/AdminLifecycleReviewScreen.tsx`
- Admin class/section/user entry screens
- `mobile/src/navigation/types.ts` and `AppNavigator.tsx` only if repair return context requires navigation typing
- Existing mobile lifecycle API/model/screen contract tests

Tasks:

1. Mirror mode/disposition and state fallback.
2. Implement `CANCEL` as back/close rather than a displayed no-op row.
3. Match web copy hierarchy and suppress impossible warnings/effects/password fields.
4. Select historical mode from target data and preserve backend authority.
5. Keep typed historical outcome context in the lifecycle screen and re-preview after input changes.
6. Invalidate class/section detail and list queries after successful retirement.

Exit condition: mobile and web reach the same decision for the same manifest and every rendered next action performs a real operation.

### Phase 5 — Integrated verification and release preparation

Owners:

- Backend, web, and mobile package scripts
- Release workflow selected under separate authorization

Tasks:

1. Run targeted specs first, then required typecheck/build gates.
2. Execute authenticated browser flows for the five reported paths.
3. Execute at least one data-backed mobile Admin flow for retain, repair, and successful retirement.
4. Run a read-only deployed-data inventory of historical active targets and lingering active memberships before enabling execution.
5. Release backend and web together; release mobile only after backend backward compatibility is live.
6. If a mobile binary is distributed, produce and verify the required Android artifact under the repository release procedure.

Exit condition: exact release SHA, CI, deployment, web runtime, mobile artifact/emulator, and any physical-device evidence are reported separately without conflation.

## 9. Verification matrix and acceptance criteria

### Automated verification matrix

| Surface | Required proof |
|---|---|
| DTO validation | Old requests pass; historical mode accepts only its intended fields; contradictory modes/fields fail deterministically. |
| Manifest decision | Disposition mapping is stable; old state remains present; no unfamiliar next-action kind is emitted. |
| Purge policy | Non-zero retained evidence always blocks; zero evidence remains eligible; blocked output has no confirmations/effects. |
| Class planner | Historical empty class is executable; historical memberships require explicit outcomes/period; active-year historical mode is rejected. |
| Section planner | Historical empty section retires linked structure atomically; incomplete learner outcomes block all changes; complete historical outcomes execute atomically. |
| Execution | Mode is hashed/audited; stale/cross-mode manifest fails; idempotent replay returns the original result. |
| Security | Non-admin, inactive Maintenance Access, invalid current password, and throttling behavior remain enforced. |
| Web | Disposition-specific copy, hidden ceremony, cancel handling, historical mode, in-place outcome correction, and focus behavior. |
| Mobile | Same decision semantics, real cancel/back, repair navigation, query invalidation, and no no-op next actions. |
| Persistence | No migration generated; action-check schema test remains unchanged; evidence row counts/checksums are unchanged by retirement. |

### Suggested commands

Run from each package directory as appropriate:

```bash
cd backend
npm test -- --runInBand src/modules/admin-lifecycle
npm run lint
npm run build

cd ../next-frontend
npm test -- --runInBand src/components/admin/AdminLifecycleDialog.test.tsx src/services/admin-lifecycle-service.test.ts
npm run lint
npm run build

cd ../mobile
npm test -- --runInBand src/api/__tests__/admin-lifecycle-api.test.ts src/features/admin-lifecycle/__tests__/model.test.ts src/screens/__tests__/admin-lifecycle-contract.test.ts
npm run typecheck
```

If package test filtering differs from the installed Jest configuration, use the nearest repository-supported targeted invocation, record the exact command, and do not treat a filter error as a product failure.

### Acceptance criteria

1. On `/dashboard/admin/users/<student-id>`, retained enrollment history, lifecycle events, scores, or attempts blocks permanent deletion and displays no acknowledgement/password/effect ceremony.
2. On `/dashboard/admin/classes`, retained enrollment history or lifecycle events blocks permanent deletion and explains that the class must remain retained; no evidence override is offered.
3. On `/dashboard/admin/sections`, retained class records, assessments, lessons, or linked classes blocks permanent deletion and presents retention as the outcome.
4. Archiving a historical class with no active memberships succeeds through a reviewed, auditable retirement preview and preserves all evidence.
5. Archiving a historical section with no active memberships archives the section and active linked classes atomically while preserving all evidence.
6. Historical class or section retirement with active memberships cannot execute until the administrator records real outcomes and a historical effective period in the same review.
7. Changing an outcome or period invalidates the old manifest; a fresh preview is required before execution.
8. Existing current-year class/section closure behavior and learner outcomes are unchanged.
9. Eligible evidence-free purge still requires current-password verification, irreversible confirmation, and idempotent execution.
10. Backend, web, and mobile produce equivalent decisions for shared fixtures.
11. No score, attempt, class record, assessment, lesson, lifecycle event, or enrollment-history row is deleted or reassigned by historical retirement.
12. All rendered next actions work; no button or row is displayed with a no-op handler.

## 10. Rollout, rollback, observability, cleanup, and unverified boundaries

### Rollout

1. Land OpenSpec clarification and tests with the implementation change.
2. Deploy the backward-compatible backend first with historical execution disabled by a narrow configuration flag if staged rollout is required. The retained-evidence guard itself must never be flag-disabled.
3. Deploy web after backend compatibility is confirmed.
4. Release mobile after backend is live; old mobile clients continue using current mode.
5. Enable historical retirement for internal/admin acceptance, inspect decision counts and failure codes, then widen to normal Admin use.

Recommended flag boundary: execution of `HISTORICAL_RETIREMENT` only. Preview, retention explanations, and evidence protection can remain available regardless of the flag.

### Rollback

- Disable historical-retirement execution while leaving the evidence-retention guard active.
- Revert client mode selection and disposition presentation only if necessary; old request defaults remain current closure.
- Do not roll back by deleting operation/audit/lifecycle evidence.
- A successfully retired structure can be reactivated only through an explicit, audited inverse operation or existing governed repair; do not perform direct database edits as rollback.
- Because no schema migration is planned, application rollback does not require database DDL reversal.

### Observability

Record structured, non-sensitive fields for preview and execution:

- action and normalized lifecycle mode
- decision state, disposition, and stable code
- target type and target ID
- active-membership count and retained-evidence category counts
- manifest age/stale reason
- operation ID, replayed status, success/failure, and duration
- repair navigation selected and subsequent re-preview outcome where client analytics already exist

Alert or investigate:

- any attempted execution with `RETAIN_REQUIRED`
- any successful historical retirement whose preview reported active memberships
- repeated stale-manifest or cross-mode mismatches
- unexpected growth in historical active targets after rollout
- web/mobile next-action handling failures

Do not log current passwords, score contents, student notes, tokens, or full manifests containing sensitive details.

### Cleanup

- Remove the technical “IMMUTABLE” label from user-visible copy while retaining the compatibility state internally.
- Remove redundant permanent-action warnings from blocked-retention acknowledgement sections.
- Consolidate shared decision fixtures so backend, web, and mobile do not drift.
- Document the difference between current closure, historical retirement, academic repair, and permanent purge in Admin help text.
- Consider deprecating the `/admin/lifecycle/*` compatibility controller only as a separate, consumer-verified change.

### Unverified boundaries

- Deployed database counts and whether historical active memberships contain exceptional legacy statuses.
- Authenticated browser focus behavior and exact responsive layout after copy changes.
- Physical Android behavior, artifact integrity, and iOS parity.
- Out-of-repository consumers of `/api/admin/lifecycle/*` or `/api/admin/maintenance/*`.
- Whether current deployment configuration already has a suitable narrowly scoped feature-flag mechanism; if not, implement a typed config entry without weakening default-off behavior for historical execution.
- Whether notification recipients for a purely structural historical retirement should be all existing affected users or administrators only. Preserve current archive recipients unless characterization proves that this would send a misleading notification.

None of these unverified boundaries blocks implementation. They are explicit verification or rollout gates. If implementation discovers that historical retirement requires mutating academic evidence or inferring membership outcomes, stop and revise the design rather than weakening the invariants above.

## 11. Local implementation evidence and Android distribution boundary

The implementation preserves evidence-aware deletion and adds governed historical retirement across backend, web, and mobile. Local verification completed with 157 backend suites / 1,661 tests, 191 web suites / 856 tests, and 124 mobile suites / 700 tests, plus package type/contract gates, lint, production builds, strict OpenSpec validation, disposable-database academic and end-to-end suites, System Reset rehearsals, and independent code review.

The rebuilt Android package is Nexora Mobile `0.1.36` (`versionCode` 37), ARM64-only, and embeds the production backend API. Its committed download manifest is generated from the exact APK and release verification checks its package identity, version, installer permission, byte size, and SHA-256 checksum.

Android signing remains a known release boundary. This repository's established update lineage signs the APK with the tracked Android debug certificate. Preserving that certificate keeps upgrades compatible with already-installed builds, but it does not provide production-grade signer custody: anyone with repository access to that key material can create a package accepted under the same signer. Therefore this APK is classified as internal/test distribution, not a production-secure public release. Moving to a protected release key requires a separate credential-provisioning and installed-base migration decision; silently changing the signer would break in-place updates.
