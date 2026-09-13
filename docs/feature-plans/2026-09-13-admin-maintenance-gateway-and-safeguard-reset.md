# Admin Maintenance Gateway and Safeguard Reset

**Date:** 2026-09-13
**Repository baseline:** `developement` at `99fb82e0a61910dd7764c9a50c59669b602dfacf`
**Companion analysis:** `docs/feature-analysis/2026-09-13-admin-safeguard-system-isolation-analysis.md`
**Planning status:** decision-ready and authorized for implementation by the user
**Implementation status at plan creation:** not started

## Evidence vocabulary

- **Confirmed** means directly supported by current source, schema, migrations, tests, or the companion isolation analysis.
- **Inferred** means a high-confidence architectural consequence of confirmed evidence, but not yet proven by a running build or test.
- **Unverified** means it requires implementation, runtime configuration, a real database, an authenticated browser session, a physical device, CI, or deployment evidence.

## 1. Decision summary and implementation brief

### Decision

Replace the current admin-specific safeguard experience with one backend-owned **Admin Maintenance Gateway** and a short-lived, per-administrator **Maintenance Access** session.

The replacement has two distinct lanes:

1. **Routine maintenance lane:** administrators can move, remove, archive, restore, reassign, and clean up academic structure without the old global Demo Mode or unexplained service exceptions. The server returns one structured decision: `READY`, `AUTO_RESOLVABLE`, `NEEDS_CHOICE`, `OVERRIDABLE_WARNING`, or `IMMUTABLE`.
2. **Full Reset lane:** the existing governed System Reset remains separate. A successful Full Reset deletes all live school and academic data, including finalized grades, and every account except the initiating administrator. It is intentionally not blocked by per-record academic safeguards once its own reset authorization, preview, coordination, and verification gates pass.

### What coworkers will experience

- An administrator opens Maintenance Access, re-enters the current password once, acknowledges the scope, and receives a 15-minute actor-bound maintenance session.
- Routine admin actions either execute, reconcile safe dependencies automatically, ask one concrete outcome question, or show an explicit immutable boundary with an evidence-preserving alternative.
- Expected academic conflicts are not rendered as generic crashes or dead-end toasts.
- Destructive purge still needs action-specific confirmation. Full Reset keeps its existing stronger confirmation and coordination flow.
- There is no client-supplied `force=true`, ignored-rule list, or global bypass flag.

### Hard truth behind “freely”

Within a valid Maintenance Access session, coworkers can freely manipulate **live structural and draft academic data** subject only to authentication, input integrity, database integrity, and the small immutable-evidence core. Ordinary maintenance cannot rewrite finalized grades, submitted attempt evidence, audit records, or append-only lifecycle history. Full Reset is the explicit exception and removes the live academic records themselves.

### Definition of done

This change is complete only when all of the following are true:

- Admin Demo Mode is no longer an active policy plane in backend, web, or mobile runtime paths.
- Every in-scope admin action uses either the Maintenance Access policy seam, the governed lifecycle executor, the evidence-preserving academic repair lane, or the separate System Reset workflow.
- The direct admin “remove learner from class” path no longer ends at a generic error and instead uses the governed student decision flow.
- Web and mobile render structured decisions and actionable resolution choices.
- Teacher authorization and teacher-owned mutation behavior are unchanged.
- Full Reset still passes its catalog, reset, fence, recovery, and preservation tests with the new maintenance-session table explicitly cleared.
- Backend, web, mobile, contract, migration, academic, reset, release-package, exact-SHA CI, deployment, and non-destructive live checks pass.

## 2. Scope, non-goals, permissions, and assumptions

### In scope

#### Backend

- Add a durable `admin_maintenance_sessions` table and migration `0027`.
- Add `AdminMaintenanceModule`, controller, DTOs, policy catalog, typed decisions, session service, and compatibility adapters.
- Reuse the existing lifecycle preview/hash/revalidation/idempotency/transaction/audit shell.
- Expose lifecycle preview and execute aliases under `/api/admin/maintenance` while preserving `/api/admin/lifecycle` during the compatibility window.
- Replace runtime `AdminDemoModeService` dependencies in users, classes, sections, roster import, academic policy, and lifecycle execution with `AdminMaintenanceService`.
- Change old relaxed-rule checks into explicit maintenance policy checks; protected rules remain non-overrideable during routine maintenance.
- Disable the Admin Demo Mode controller/module in the application runtime. Keep its migration/table inert for one compatibility release if needed for rollback and historical deployment compatibility.
- Extend lifecycle manifests with a typed decision and structured `nextActions`.
- Route account lifecycle and purge through the maintenance policy seam; preserve self-protection and evidence-aware purge.
- Update System Reset’s explicit table catalog and deletion ordering for maintenance sessions.
- Update the admin client contract gate and fixtures.

#### Web

- Replace Demo Mode provider/banner/settings with Maintenance Access provider/banner/settings.
- Update admin class, section, user, and form surfaces to consume Maintenance Access status.
- Replace direct admin class unenrollment with the lifecycle preview/review/execute flow.
- Render decision state, overridable warnings, and next actions in the lifecycle dialog.
- Keep Full Reset in System Settings as a separate danger-zone workflow.

#### Mobile

- Replace Demo Mode hook/notice/settings screen with Maintenance Access equivalents.
- Update admin class, section, roster, and user screens to consume the new session contract.
- Render decision state and next actions in `AdminLifecycleReviewScreen`.
- Keep execution online-only and do not queue destructive operations offline.
- Bump and package Android because mobile source and navigation change.

### Explicitly out of scope

- Changing teacher permissions or teacher mutation rules.
- Introducing registrar/data-steward roles in this release. Maintenance Access is Admin-only because the current role model is Admin/Teacher/Student and a new role would be a separate authorization project.
- Allowing ordinary maintenance to rewrite finalized grade values or submitted evidence.
- Removing PostgreSQL foreign keys, uniqueness constraints, score constraints, or transaction locks.
- Deleting audit, lifecycle, repair, migration, release, reset-operation, or reset-evidence records during Full Reset.
- Running Full Reset against live school data as a release smoke test.
- Replacing the System Reset coordinator with the Maintenance Gateway.
- Making AI an authority over official academic mutations.

### Permission and authority

- The user explicitly authorized planning followed by implementation and finish-and-ship on the current checkout.
- That authorization includes repository edits, migrations, tests, Android packaging when mobile changes, commit, push, and configured deployment verification.
- It does **not** authorize executing a destructive Full Reset against live data.

### Assumptions

- Coworkers who need this capability use Admin accounts. **Confirmed for current RBAC shape; actual coworker account assignments are unverified.**
- A 15-minute maintenance session is short enough to reduce repeated password prompts while bounding exposure. **Inferred; can be config-backed with a safe maximum.**
- Existing `/admin/lifecycle` consumers may include an already-installed mobile build, so compatibility endpoints must remain until a required mobile update is served. **Inferred.**
- The initiating administrator remains the sole account after Full Reset, matching the implemented reset contract. **Confirmed.**

## 3. Current-state evidence ledger

| Status | Evidence | Consequence for implementation |
|---|---|---|
| Confirmed | `AdminDemoModeService` stores one global time-limited state and exposes named relaxed rules. | It is a global bypass plane and must not be reused as the new public authority. |
| Confirmed | `UsersService`, `ClassesService`, `SectionsService`, `RosterImportService`, and `AcademicPolicyService` import Demo Mode or contain independent blockers. | Deleting only a controller or UI cannot remove safeguard behavior. Runtime consumers must be migrated to one policy seam. |
| Confirmed | `AdminLifecycleService` already provides actor password verification, expiring manifest hashes, stale-state rejection, idempotency, an academic transaction, audit linking, and durable operations. | Preserve this execution infrastructure; replace policy and UX, not concurrency/evidence machinery. |
| Confirmed | Lifecycle blockers already have `resolvable` and `resolutionOptions`, but the web dialog only lists messages and mobile only labels them. | The current contract contains unused resolution intent; promote it into typed `nextActions` and make clients execute it. |
| Confirmed | Admin class detail calls `classService.unenrollStudent` directly and falls back to “Failed to remove student.” | This specific dead end must be moved to the lifecycle flow and covered by a regression test. |
| Confirmed | Teacher web/mobile consumers use some of the same direct class and section endpoints. | Do not globally weaken shared service rules. Admin-specific freedom must be actor/policy scoped. |
| Confirmed | `users.session_version` is embedded in access tokens and checked by `JwtStrategy`. | A maintenance session can be bound to actor plus session version and becomes invalid after password/session reset. |
| Confirmed | `admin_lifecycle_operations.action` is text in Drizzle but migration `0018` has a finite SQL check. | Additive action expansion requires a migration; existing rows and IDs must remain stable. |
| Confirmed | `enrollment_lifecycle_events` restrictively references lifecycle operations. | Reuse the operation table and never delete or rename it destructively. |
| Confirmed | System Reset explicitly catalogs application tables and fails closed on unknown tables. | Migration `0027` requires a catalog entry and reset rehearsal or Full Reset will intentionally block. |
| Confirmed | Full Reset clears all live users except the initiating admin, all live academic structures/results/content, queues, owned assets, and indexed/AI state, including finalized grades. | Per-record immutable safeguards are irrelevant to reset execution after reset gates pass. |
| Confirmed | Full Reset preserves roles, app versions, migrations, policy/transmutation configuration, audit/reset/lifecycle/repair evidence, and initializes one academic state. | “Full” means full live school-data reset, not destruction of the software’s ability to boot, authenticate, migrate, update, or prove the reset. |
| Confirmed | Mobile Android version is currently build `35`. | Any changed mobile source requires a version/build bump and a newly verified APK. |
| Unverified | Production flags, installed mobile adoption, database contents, live storage ownership, and physical ARM64 behavior. | Verify without mutating live school data; do not claim physical-device or live-reset success without evidence. |

## 4. Impact and consumer map

### Control flow after cutover

```text
Admin web/mobile action
        |
        +-- authentication + Admin RBAC
        |
        +-- Admin Maintenance Gateway
                |
                +-- actor-bound Maintenance Access session
                +-- typed policy decision
                |      READY
                |      AUTO_RESOLVABLE
                |      NEEDS_CHOICE
                |      OVERRIDABLE_WARNING
                |      IMMUTABLE
                |
                +-- governed lifecycle execution shell
                       preview hash + dependency versions
                       stale revalidation + idempotency
                       academic transaction + row/advisory locks
                       audit + lifecycle receipt

Full Reset remains separate
        |
        +-- reset preview/auth/exact confirmation
        +-- writer and worker fences
        +-- database/assets/queues/index cleanup
        +-- post-reset verification and receipt
```

### Owners and affected consumers

| Owner | Direct changes | Consumers and blast radius |
|---|---|---|
| `backend/src/modules/admin-maintenance/` | New session, policy, decisions, aliases, compatibility behavior | All admin maintenance actions; backend tests; clients |
| `backend/src/drizzle/schema/` + `backend/drizzle/0027_*.sql` | Session table; optional lifecycle action/decision fields | Migration integrity; reset catalog; deployments |
| `backend/src/modules/admin-lifecycle/` | Decision derivation; structured next actions; maintenance authorization | Web/mobile lifecycle clients; audit operations; notifications |
| Users/classes/sections/roster/academic-policy modules | Replace Demo lookups with maintenance context | Admin actions become scoped; teacher actions retain normal rules |
| `backend/src/modules/system-reset/` | Classify and clear maintenance sessions | Full Reset completeness and unknown-table protection |
| `scripts/check-admin-client-contracts.cjs` + fixture | New route/field parity; forbid client bypass authority | Backend/web/mobile CI gate |
| Web admin provider, settings, forms, lists, detail pages | Maintenance session UI; decision UX | All admin browser workflows; no teacher UI change |
| Mobile admin services, hook, notice, settings, screens, navigation | Same contract and decision UX | Android/iOS shared source; Android packaging required |
| Existing Demo Mode source/table | Runtime detached, compatibility or rollback only | Old clients during bounded transition; later deletion |

### In-scope action inventory

| Action family | New route/decision owner | Execution owner |
|---|---|---|
| Start/end/view Maintenance Access | `/admin/maintenance/session` | `AdminMaintenanceService` |
| Student transfer/correct/withdraw | `/admin/maintenance/students/preview|execute` | Existing student lifecycle planner/apply via gateway |
| Class archive/restore | `/admin/maintenance/classes/preview|execute` | Existing class lifecycle planner/apply via gateway |
| Section archive/restore | `/admin/maintenance/sections/preview|execute` | Existing section lifecycle planner/apply via gateway |
| Evidence-aware class/section purge | `/admin/maintenance/purge/preview|execute` | Existing purge lifecycle planner/apply via gateway |
| Account deactivate/reactivate/purge | Existing user route with maintenance context in first compatibility slice; dedicated preview/execute adapter before legacy route removal | Users/purge service under policy seam |
| Capacity/schedule/room/adviser/window exceptions | Existing create/edit routes, policy-resolved by actor Maintenance Access | Existing domain service inside normal transaction |
| Finalized-grade correction | Existing academic repair lane | Evidence-preserving repair service; never Maintenance override |
| Complete clean slate | `/admin/system-reset/*` | Existing System Reset coordinator; no Maintenance dependency |

## 5. Conflicts, invariants, risks, and options

### Invariants

The replacement must preserve:

- JWT authentication, Admin RBAC, current-account status, verified email, and self-destructive-action protection.
- DTO validation, UUID/enums, unique identity, role compatibility, foreign keys, checks, and score invariants.
- Finalized/locked official evidence immutability during routine maintenance.
- Append-only audit, lifecycle, reset, and repair history.
- Manifest expiry/hash, dependency-version revalidation, idempotency, and serialized academic execution.
- Backend authority over web/mobile and AI’s assistive-only role.
- Full Reset’s explicit catalog, fences, actor retention, total live academic deletion, and post-reset proof.
- Teacher permissions and existing teacher procedures.

### Main risks and mitigations

| Risk | Severity | Mitigation |
|---|---:|---|
| A global bypass accidentally applies to all admins/devices | High | Store one session per actor, bind to `session_version`, expire automatically, authorize only Admin, audit open/close/use. |
| A bearer token stolen from the same admin benefits from an already-open maintenance session | High | Short expiry, session-version binding, explicit visible banner, manual close, revoke on logout/password/session bump, rate-limit start, and require fresh password again for purge/reset. |
| Shared teacher endpoints inherit relaxed policy | High | `resolveForActor` grants maintenance only to the active admin actor; teacher calls remain under normal service rules; add role regression tests. |
| Old mobile clients break when Demo Mode/lifecycle routes disappear | High | Keep `/admin/lifecycle` as adapters and return inactive/unavailable Demo status during the compatibility window; remove only after a required mobile release is registered and served. |
| A stale preview applies to changed dependencies | High | Recompute under transaction and reject with HTTP 409 plus refreshed decision/preview. |
| “Overridable warning” becomes arbitrary force | High | Server-defined stable warning codes; the execute request only confirms codes present in its signed/hashed preview; no caller-defined rule list. |
| New session table makes Full Reset fail closed | High | Add it to catalog/deletion order in the same migration slice and run real disposable reset tests. |
| Preserved audit JSON surprises the user after Full Reset | Medium | Label it clearly: live academic data is gone, reset/audit evidence remains outside the workspace. |
| Old Demo schema/source remains indefinitely | Medium | Track removal gate and grep/test for zero runtime imports; drop only after rollback/old-client window closes. |
| UI calls an action route that backend does not own | Medium | Expand the existing admin contract fixture/gate before client cutover. |
| Mobile source changes without a usable release artifact | High | Bump Android version/build, build ARM64 release, verify signature/ABI/API URL/hash/size, register and serve exact artifact. |

### Options considered

#### Option A — Delete service checks and database constraints

- Fastest apparent path.
- Rejected: it affects teachers, loses deterministic dependency handling, can orphan data, and removes the only protection against races and silent evidence loss.

#### Option B — Keep global Demo Mode and rename it

- Smallest code change.
- Rejected: a global bypass remains global, clients still reason about ignored rules, and the same contradictory control plane survives under a new label.

#### Option C — Per-admin Maintenance Access plus typed gateway decisions

- **Selected.**
- Reuses durable lifecycle execution while replacing the old policy authority and dead-end UX.
- Supports routine freedom without creating an unguarded interval or weakening teacher routes.
- Leaves Full Reset independent and truly complete for the live school dataset.

## 6. Recommended architecture, data flow, security, and errors

### 6.1 Maintenance session

Add `admin_maintenance_sessions` with:

- `id` UUID primary key.
- `actor_user_id` UUID, unique active ownership and restrictive user reference.
- `actor_session_version` integer.
- `status` text check: `ACTIVE`, `CLOSED`, `EXPIRED`, `REVOKED`.
- `scope_codes` JSONB containing server-granted scopes only.
- `reason` bounded text.
- `started_at`, `expires_at`, `last_used_at`, `closed_at`, and timestamps.
- `created_from_ip_hash` and `user_agent_hash` only if existing request metadata conventions support redacted hashes; do not store raw secrets.

Activation requires:

- authenticated active verified Admin;
- current password;
- two explicit acknowledgements: routine maintenance may affect linked live academic structure, and finalized/audit evidence remains protected;
- a bounded reason;
- no active System Reset maintenance state.

The server grants fixed scopes such as `ACADEMIC_STRUCTURE`, `ROSTER`, and `ACCOUNT_LIFECYCLE`; the client cannot invent scopes. Expiry defaults to 15 minutes and is capped server-side. Status is actor-specific, not school-global. Starting a new session closes/revokes any older active row for that actor.

### 6.2 Policy seam

`AdminMaintenancePolicy` owns stable rule metadata and returns:

```ts
type AdminMaintenanceDecision =
  | 'READY'
  | 'AUTO_RESOLVABLE'
  | 'NEEDS_CHOICE'
  | 'OVERRIDABLE_WARNING'
  | 'IMMUTABLE';
```

Rule lanes:

| Lane | Examples | Behavior |
|---|---|---|
| Always enforce | auth/RBAC, self protection, DTO/identity/FK/check, session validity | HTTP security/validation error; never a maintenance override |
| Immutable evidence | finalized/locked grade source, submitted attempts, returned grades, audit/lifecycle/reset history | `IMMUTABLE` with repair/archive/no-op next action |
| Guided dependency | active memberships, class/section archive, student move mappings | `AUTO_RESOLVABLE` if deterministic; otherwise `NEEDS_CHOICE` |
| Operational warning | capacity, schedule, room/adviser collision, structural academic window | `OVERRIDABLE_WARNING`; execute only when the exact preview warning is acknowledged |
| Ready | no unresolved dependency or protected evidence | `READY` |

The first implementation keeps a small typed handler registry. It does not create a general rules language or allow user-authored rules.

### 6.3 Manifest and next actions

Extend the existing lifecycle response additively:

```ts
interface AdminMaintenanceNextAction {
  id: string;
  label: string;
  kind: 'REPREVIEW' | 'NAVIGATE_REPAIR' | 'CANCEL';
  intent?: string;
  requiredFields?: string[];
  href?: string;
}

interface AdminMaintenanceDecisionSummary {
  state: AdminMaintenanceDecision;
  code: string;
  message: string;
  nextActions: AdminMaintenanceNextAction[];
}
```

Legacy `blockers`, `warnings`, `effects`, and `preserved` fields remain during compatibility. The gateway derives the decision only from server facts. A client may select a returned action ID, but it cannot submit arbitrary SQL, targets, bypass codes, or a force flag.

### 6.4 Execution authorization

- A Maintenance Access session removes repeated password prompts for reversible/guided routine operations.
- The execute payload includes the lifecycle manifest hash, confirmations, idempotency key, and selected server-issued next-action intent.
- Evidence-aware purge still requires current password and an exact destructive confirmation.
- Full Reset continues to require its own current password, environment/year/period phrase, acknowledgements, preview, idempotency, and coordinator availability; Maintenance Access neither grants nor blocks it.
- Each successful or failed execution touches `last_used_at` and records the maintenance session ID in lifecycle/audit metadata.

### 6.5 Error contract

| Condition | HTTP/result behavior | Client behavior |
|---|---|---|
| Not authenticated, not Admin, inactive/expired actor | `401`/`403` stable code | Sign in or explain permission; no retry loop |
| Invalid DTO or confirmation | `400`/`422` field error | Keep form values except passwords; focus exact field |
| Expected domain dependency | `200` preview with typed decision | Render effect, choice, warning, or immutable alternative |
| Stale manifest/dependency | `409` with refreshed preview when safe | Replace old review; require reconfirmation |
| Duplicate idempotent request | `200` prior result | Show the existing receipt |
| Concurrent reset/maintenance barrier | `409` or `503` stable code | Explain that school maintenance is running; poll allowed status only |
| Unexpected server failure | `500` correlation ID, no secret detail | Preserve screen state and show a retry route |

No expected safeguard should fall through to a generic “Failed to remove student” message.

### 6.6 Compatibility and rollback seam

- New clients call `/admin/maintenance/*`.
- `/admin/lifecycle/*` delegates to the same handlers during the compatibility window.
- `/admin/demo-mode` returns an inactive/unavailable compatibility response for old clients after the new gateway is enabled; activation/deactivation cannot become a second authority.
- The inert `admin_demo_mode_states` table remains for one rollback window and continues to be cleared by Full Reset.
- Rollback disables `ADMIN_MAINTENANCE_ENABLED` and re-enables only the lifecycle compatibility path. It must not re-enable a global Demo bypass automatically.

## 7. Contract, schema, migration, and compatibility plan

### Backend routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/admin/maintenance/session` | Actor-specific status, expiry, scopes, protected-rule summary |
| `POST` | `/api/admin/maintenance/session` | Password step-up and open/replace session |
| `DELETE` | `/api/admin/maintenance/session` | Close actor session |
| `POST` | `/api/admin/maintenance/students/preview` | Structured student outcome preview |
| `POST` | `/api/admin/maintenance/students/execute` | Manifest-bound student execution |
| `POST` | `/api/admin/maintenance/classes/preview|execute` | Class lifecycle |
| `POST` | `/api/admin/maintenance/sections/preview|execute` | Section lifecycle |
| `POST` | `/api/admin/maintenance/purge/preview|execute` | Evidence-aware purge |
| `GET` | `/api/admin/maintenance/operations/:id` | Durable receipt/status |

All routes retain the project’s `{ success, message, data }` envelope.

### Schema and migration

Migration `0027_admin_maintenance_gateway.sql` must:

- create the maintenance-session table, checks, indexes, and updated-at handling consistent with project migrations;
- add a nullable `maintenance_session_id` reference to `admin_lifecycle_operations` if doing so does not create a reset deletion cycle;
- expand the lifecycle action check only for actually implemented action types;
- preserve all existing operation/event rows;
- register in Drizzle metadata/journal using the repository’s current migration workflow;
- be included in migration-integrity tests and clean-database application.

System Reset must explicitly classify the new table as cleared session/security state. The initiating admin’s Maintenance Access must not survive reset, and the retained admin must sign in again under the incremented `session_version`.

### Compatibility gates

Legacy routes remain until all are true:

1. The new mobile build is registered and marked required under the existing app-version policy.
2. Web production serves only Maintenance Access clients.
3. Admin contract telemetry/tests show no runtime dependency on Demo activation.
4. A rollback window has elapsed under project release policy.

The later physical deletion of old Demo files/table is a tracked cleanup migration, not mixed with initial cutover risk.

## 8. Ordered implementation phases and exact owners

### Phase 0 — Characterization and contract lock

- Add regression tests for current dead ends: direct admin class removal, unused resolution options, maintenance-unavailable behavior, teacher route isolation, and System Reset’s unknown-table gate.
- Freeze current lifecycle manifests and error envelopes in backend/web/mobile contract tests.
- Owner files: existing admin lifecycle, class/section/user specs; admin client contract fixture/script.

### Phase 1 — Durable Maintenance Access core

- Add schema/migration `0027` and System Reset catalog coverage in one atomic slice.
- Add admin-maintenance types, policy catalog, DTOs, controller, service, module, and unit tests.
- Bind actor sessions to `users.sessionVersion`; enforce expiry, revocation, Admin role, current password, fixed scopes, reset-state exclusion, and audit records.
- Wire module/config with execution disabled by default outside reviewed environments.
- Exact owners: `backend/src/drizzle/schema/admin-maintenance.schema.ts`, schema export, `backend/drizzle/0027_admin_maintenance_gateway.sql`, Drizzle journal/snapshot, `backend/src/modules/admin-maintenance/**`, `backend/src/app.module.ts`, configuration, `backend/src/modules/system-reset/**`.

### Phase 2 — Policy cutover without an unguarded interval

- Replace backend runtime Demo Mode injection with `AdminMaintenanceService` in users/classes/sections/roster/academic-policy/lifecycle.
- Preserve existing hard protections; map only old relaxed business rules to fixed maintenance scope decisions.
- Add audit metadata for each relaxed warning use.
- Disable Demo controller/module registration and make old status/activation compatibility fail closed.
- Use a backend flag for new execution and run new/old decision comparison in tests before cutover.

### Phase 3 — Structured gateway decisions

- Extend lifecycle manifest types with decision summary and typed next actions.
- Correct inconsistent `resolvable` values where a real server-supported resolution exists.
- Expose `/admin/maintenance` aliases delegating to the same lifecycle handlers.
- Make stale execution return a refreshed preview contract.
- Add account lifecycle/purge policy coverage and action-specific password confirmation for irreversible deletion.

### Phase 4 — Web cutover

- Add Maintenance Access service/types/provider/banner/settings using current GABHS admin primitives.
- Remove Demo Mode runtime imports from dashboard layout, forms, lists, details, and settings navigation.
- Update `AdminLifecycleDialog` to show decision state and execute returned next actions.
- Replace admin class-detail direct unenrollment with student lifecycle preview/review/execute.
- Preserve user input on expected errors; never retain password fields.
- Keep Full Reset separate and clearly label its complete live-data scope.

### Phase 5 — Mobile cutover

- Add matching API/types/hook/notice/settings UI and navigation changes.
- Update admin screens and lifecycle review for decisions/next actions.
- Remove Demo Mode runtime imports/routes from the active admin navigator and parity manifest.
- Add online-only, back-navigation, expiry, and auth/session invalidation tests.

### Phase 6 — Contract cleanup and verification

- Update admin client contract fixtures for maintenance routes, fields, and forbidden client authority.
- Assert zero active runtime imports of Admin Demo Mode outside compatibility/migration/history paths.
- Run focused tests first, then backend/web/mobile/AI-required/full reset/migration/academic test sets.
- Run browser interaction checks at desktop and mobile viewports.

### Phase 7 — Package and ship

- Bump Android version/build and prepare the release using existing scripts.
- Verify APK package ID, version, ARM64 ABI, signature, API URL, size, and SHA-256; update app-version/download integration.
- Review all outgoing commits already on `developement`, create scoped commits, push without force, and record exact SHA.
- Verify exact-SHA GitHub workflows, Railway deployment/provider status, live health and non-destructive authenticated capability/status endpoints, and served APK hash.
- Do **not** execute Full Reset on live data.

### Phase 8 — Post-adoption deletion

- After required mobile adoption and rollback window: remove lifecycle route aliases if desired, delete inert Demo source/table/config, update System Reset catalog and contracts, and migrate no historical audit evidence.
- This cleanup has its own migration and deployment gate.

## 9. Verification strategy and acceptance criteria

### Backend unit and integration proof

- Session start rejects wrong password, non-admin, expired/inactive actor, reset maintenance, incomplete acknowledgements, invalid reason, and client-supplied scopes.
- Only one active session per actor; two admins do not share access; expiry and manual close are immediate.
- `session_version` increment invalidates Maintenance Access.
- Routine service calls only relax a named operational rule for the active admin actor; teacher and inactive-admin calls remain protected.
- Immutable grade/attempt/audit/lifecycle cases never become overrideable.
- Preview decision is deterministic; next actions are server-issued and typed.
- Execute rejects missing/changed hash, unconfirmed warnings, stale dependencies, reused idempotency key with changed input, and foreign next-action IDs.
- Concurrent lifecycle operations remain serialized and idempotent.
- Purge retains evidence-aware blocking and fresh password confirmation.
- Full Reset clears maintenance sessions, all live academic/finalized rows, and other accounts while preserving only its documented system/audit essentials.
- Migration applies from a clean database and upgrades a database at migration `0026` without row loss.

### Web acceptance

- Admin opens Maintenance Access, sees exact expiry/protected boundary, closes it, and observes expiry without polling loops.
- Move/remove/archive/restore actions finish through one review surface or one explicit choice.
- Admin class-detail learner removal no longer calls the direct unenrollment service.
- `OVERRIDABLE_WARNING` requires explicit warning confirmation but no second password during the valid session.
- `IMMUTABLE` provides repair/archive/cancel guidance and never offers “continue anyway.”
- Expected domain decisions never produce a generic failure toast.
- Full Reset page states that all live academic data and other accounts will be deleted, including finalized grades.
- Keyboard, focus, labels, reduced motion, loading/error/expired states, and narrow/desktop viewports pass.

### Mobile acceptance

- Contract parity with web/backend for status, decisions, next actions, execution, and operation receipt.
- Offline execution is blocked before request; no destructive operation is queued.
- Native Back returns to the true source screen; sensitive fields clear on cancel/background/auth expiry.
- Admin roster/class/section/user flows use Maintenance Access; teacher screens do not.
- Android release installs/launches on a compatible ARM64 device or that boundary is explicitly reported as unverified.

### Static and contract gates

- Zero client `force`, bypass header/query/body, caller-provided ignored-rule code, or client-created scope authority.
- Zero active web/mobile Demo provider/hook/banner/settings imports after cutover.
- Zero backend runtime Demo service imports outside explicit compatibility code.
- All admin contract fixture routes/fields match backend, web, and mobile.
- System Reset catalog contains every current application table and known queue/storage scope.

### Commands and evidence classes

Use repository scripts, starting focused and escalating:

- backend unit tests for admin-maintenance/lifecycle/users/classes/sections/system-reset;
- backend migration integrity, build, lint, full unit, e2e, academic, and system-reset suites;
- web admin contract, focused Jest, typecheck, lint, build, and browser tests;
- mobile admin contract, focused Jest, typecheck, full tests, and release verification;
- AI tests required by System Reset participant/cache contracts;
- disposable PostgreSQL/Redis/storage reset rehearsal only;
- exact-SHA GitHub Actions, Railway, live non-mutating health/capability/status, and artifact checks.

### Release acceptance threshold

The release is accepted only if:

1. every required local command exits successfully or an explicitly documented pre-existing warning is proven unrelated;
2. the exact pushed SHA is the SHA tested by CI and deployed by Railway;
3. the served APK matches the locally verified version, size, and SHA;
4. no live destructive reset is performed for verification;
5. no claim of physical-device success is made without physical-device evidence.

## 10. Rollout, rollback, observability, cleanup, and unverified items

### Rollout

1. Deploy schema and backend with Maintenance Access disabled and compatibility routes intact.
2. Run migration/catalog/health checks and non-mutating status calls.
3. Enable backend decision preview and compare expected decisions in tests/logs without enabling bypass execution.
4. Deploy web and register/serve the required mobile release.
5. Enable Maintenance Access execution for Admin actors.
6. Confirm Demo activation is unavailable and no runtime client calls it.
7. Observe one rollback window before physical Demo table/source removal.

### Rollback

- Disable `ADMIN_MAINTENANCE_ENABLED`; existing Admin lifecycle compatibility continues under normal hard rules.
- Revoke/expire all active maintenance sessions.
- Do not roll back migration `0027` destructively; an unused additive table is safe.
- Do not silently reactivate global Demo Mode.
- If a lifecycle execution committed, use its evidence-preserving inverse/correction path; do not delete its audit/history.
- Full Reset rollback remains backup restoration plus reset receipt/recovery procedure, not an ordinary maintenance undo.

### Observability

Record and monitor:

- session started/closed/expired/revoked counts, actor ID, expiry, scope, and redacted request metadata;
- decision counts by stable code/state;
- warning overrides by code and actor;
- immutable attempts by code without storing secrets;
- stale-preview conflicts, idempotent replays, transaction failures, and operation duration;
- compatibility-route usage and Demo activation attempts;
- System Reset unknown-table/queue/storage blockers and residual-row verification;
- correlation IDs joining lifecycle operation, maintenance session, and audit receipt.

Never log passwords, bearer tokens, raw maintenance secrets, confirmation phrases, or sensitive full payloads.

### Cleanup gates

- Remove inert Demo files/config/table only after compatibility usage is zero and required mobile adoption is enforced.
- Remove legacy lifecycle route aliases only after clients and external consumers are inventoried.
- Preserve all historical audit/lifecycle/reset/repair evidence.
- Update documentation so “Maintenance Access” cannot be confused with Full Reset.

### Implementation verification — 2026-09-13

- Backend build, migration integrity, lint gate, full unit suite, disposable academic integration, disposable System Reset rehearsal, and the PostgreSQL-backed Maintenance Access E2E suite passed.
- Web contract, Jest, typecheck, lint, production build, and five Chromium interaction/viewport checks passed.
- Mobile contract, Jest, typecheck, full suite, AI reset participant/cache coverage, and the 10-test Android release contract passed.
- Review findings covering direct purge bypasses, commit-boundary session revalidation, capacity decisions, transfer receipts, atomic audit/invalidation, and client warning/expiry states were resolved and the affected gates rerun.
- Android `0.1.35` build `36` is ARM64-only, v2-signed, 16 KB aligned, ZIP-valid, embeds the production API URL, and has SHA-256 `628726b1169a45e648aea2fe1a6662bc4342e7c5c84cf757690ecca46c5c588c` at `41,067,583` bytes.
- The disposable reset rehearsal proved finalized grade rows, active maintenance sessions, and all non-initiating accounts are removed while the initiating Admin remains.

### Unverified until release

- Exact production configuration and whether the deployed Maintenance Access flag is enabled.
- Live coworker Admin assignments and whether a future narrower Data Steward role is needed.
- External/private consumers of legacy delete, lifecycle, or Demo endpoints.
- Real production data distributions and which warning/choice paths dominate.
- Exact CI run IDs, Railway deployment ID, served artifact URL/hash, and authenticated live acceptance.
- Physical ARM64 installation and presentation-device behavior.

### Final plan review against the companion isolation analysis

- **Coverage:** the plan addresses all three confirmed policy planes plus database constraints; it does not mistake one toggle for the whole safeguard system.
- **Isolation:** admin freedom is actor-scoped and does not widen teacher authority.
- **Evidence:** ordinary immutable records remain protected; Full Reset deletes the live records as the explicit user-approved exception.
- **Concurrency:** existing hash/idempotency/transaction/audit machinery is reused rather than removed.
- **UX:** backend resolution options become executable client next actions, eliminating the confirmed dead-end pattern.
- **Compatibility:** new clients cut over before old endpoints/source are physically removed.
- **Reset completeness:** the new table is added to the fail-closed System Reset catalog in the same implementation slice.
- **Release truthfulness:** success requires exact-SHA, deployment, artifact, and non-destructive live evidence; a live Full Reset is excluded.

No conflict remains between this plan and the confirmed isolation boundary. The implementation may refine file-level details when tests expose a current-source constraint, but it must not change the scope, immutable-evidence boundary, Full Reset semantics, or teacher isolation without a new decision record.
