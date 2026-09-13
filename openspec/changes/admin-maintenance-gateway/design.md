## Context

Admin mutation policy currently lives in three places: independent domain-service exceptions, a global durable Demo Mode allowlist, and the governed lifecycle planners/executor. PostgreSQL constraints and retained evidence add a fourth enforcement layer. The result is inconsistent: some admin actions reach the lifecycle review, others call direct endpoints and surface a generic failure, and web/mobile preserve backend `resolutionOptions` without making them executable.

The existing lifecycle executor already has the correct irreversible-operation shell: deterministic preview, canonical hash and expiry, dependency revalidation, idempotency, academic transaction serialization, audit records, and lifecycle events. The existing System Reset already owns the much broader coordinated clean-slate operation. This design replaces the admin policy front door without weakening those two proven boundaries.

The canonical implementation plan is `docs/feature-plans/2026-09-13-admin-maintenance-gateway-and-safeguard-reset.md`; the dependency/blast-radius evidence is in `docs/feature-analysis/2026-09-13-admin-safeguard-system-isolation-analysis.md`.

## Goals / Non-Goals

**Goals:**

- Give each Admin an actor-bound, short-lived Maintenance Access session after one current-password step-up.
- Return structured, executable outcomes instead of expected safeguard exceptions becoming dead ends.
- Keep authentication, integrity constraints, finalized/submitted evidence, concurrency controls, and audit history non-overrideable during routine maintenance.
- Keep teacher behavior unchanged on shared endpoints.
- Retire global Demo Mode as an active runtime authority.
- Keep Full Reset independent and able to delete all live academic data, including finalized grades, and all non-initiating accounts.
- Preserve old lifecycle routes long enough for installed mobile clients to migrate.

**Non-Goals:**

- New staff roles or permissions beyond Admin.
- A caller-defined rules engine, force flag, ignored-rule array, or arbitrary action DSL.
- Ordinary editing of finalized grades, attempts, audit records, or lifecycle history.
- Deleting software/runtime essentials or reset/audit evidence during Full Reset.
- Executing a live Full Reset as release verification.

## Decisions

### Use actor-bound durable sessions instead of a global mode

`admin_maintenance_sessions` stores the actor, actor session version, fixed scopes, reason, status, and expiry. The policy resolver uses backend time and the authenticated actor. A session is effective only while its actor still has the same `users.session_version`, active/verified account state, and Admin role.

This is selected over renaming Demo Mode because the current Demo singleton grants school-wide state and makes unrelated devices/actions share a bypass window. It is selected over a client-held force token because the public client must not become policy authority.

The first release permits one effective session per actor. Starting a new session revokes the actor's older active session. Session rows are audit-supporting operational evidence; Full Reset clears them as authentication/maintenance state.

### Keep fixed server scopes and a small typed policy catalog

The server grants `ACADEMIC_STRUCTURE`, `ROSTER`, and `ACCOUNT_LIFECYCLE` scopes. Clients cannot request additional scopes. Services ask the maintenance policy whether a named operational condition is permitted for the actor and record every condition actually relaxed.

The selected catalog is intentionally small:

- operational warnings: capacity, schedule collision, room/adviser exclusivity, structural academic window;
- guided dependencies: active membership resolution, archive outcome, compatible transfer mapping;
- permanent boundaries: auth/RBAC, self protection, DTO/identity/referential integrity, score constraints, finalized/locked/submitted evidence, append-only evidence, evidence-aware purge.

This is selected over a general rule engine because the domain already has typed facts and planners, and a configurable DSL would add a second source of truth.

### Reuse the lifecycle executor and add a decision envelope

New `/admin/maintenance/{students,classes,sections,purge}` endpoints delegate to existing lifecycle planners/executor. Existing `/admin/lifecycle/*` endpoints remain adapters. The manifest gains a decision summary with states `READY`, `AUTO_RESOLVABLE`, `NEEDS_CHOICE`, `OVERRIDABLE_WARNING`, or `IMMUTABLE`, plus stable typed next actions.

Legacy effects, preserved records, blockers, warnings, confirmations, hashes, and expiry remain additive compatibility fields. The backend derives next actions; a client can select only an action returned for that exact preview.

This is selected over rebuilding lifecycle operations because `admin_lifecycle_operations` and `enrollment_lifecycle_events` already preserve actor/action/result history and because their transaction behavior is covered by tests.

### Reduce routine password friction without weakening irreversible actions

Opening Maintenance Access requires current password, reason, and acknowledgements. During the valid session, routine reversible/guided executes use the session plus manifest evidence and do not ask for the password again. Evidence-aware purge keeps action-specific password and exact confirmation. Full Reset keeps its separate stronger contract.

This balances coworker speed with the risk that another bearer session exists for the same Admin account. The short expiry, session-version binding, visible banner, manual close, and audit reduce that exposure.

### Keep teacher policy on normal paths

Shared service methods receive or already derive the actor ID. Maintenance policy is effective only for the actor whose active verified Admin session is found. Teachers, students, background work, missing actors, read failures, and expired sessions resolve inactive and use the existing normal safeguards.

No direct shared endpoint has a global “maintenance enabled” branch.

### Retire Demo Mode in two stages

The new module replaces Demo service injection in active runtime consumers. Web and mobile remove the Demo provider/hook/banner/settings routes. The old endpoints become fail-closed compatibility responses so old clients do not crash but cannot reactivate the old authority.

The old table/source can remain inert for one rollback/adoption window. Physical deletion is a later migration after the required mobile release is served and runtime usage is zero. Rollback never silently re-enables the global mode.

### Treat Full Reset as a separate destructive exception

Maintenance decisions never govern System Reset. Once System Reset's own preview, authentication, exact confirmation, topology, participant, queue, storage, and recovery checks succeed, it removes every live academic row including finalized grades and every non-initiating account. The reset still preserves roles, migrations, release metadata, grading configuration, reset/audit/repair/lifecycle evidence, and the sole initiating admin so the application can boot and prove what happened.

The new maintenance-session table is added to the reset catalog and cleared. A live reset is never used as a deployment smoke test.

### Preserve success-envelope and compatibility semantics

All endpoints use `{ success, message, data }`. Expected domain dependencies are successful preview responses with a decision, not thrown errors. Security remains `401/403`, validation `400/422`, stale or conflicting state `409`, unavailable maintenance/reset barriers `503`, and unexpected failures `500` with correlation evidence.

### Reuse archive actions for historical repair and retirement

Class and section preview requests gain an additive `lifecycleMode` discriminator. Omission remains current closure. `HISTORICAL_RETIREMENT` is accepted only when the target school year differs from the authoritative active school year. An empty target can archive structurally without artificial learner outcomes. A historical target with active memberships stays inside the same manifest-bound review and requires explicit supported outcomes plus a historical effective period; it never infers an outcome from age, inactivity, or evidence.

The existing `ARCHIVE_CLASS` and `ARCHIVE_SECTION` operation actions remain the durable audit meaning. Historical membership reconciliation and structural archival execute atomically through the existing academic transaction, manifest, idempotency, lifecycle-event, and audit shell. This is selected over a new academic-repair screen because the current recovery surfaces do not own general historical membership outcomes, and over new persisted operation actions because retirement is still an archive operation.

The manifest adds an additive presentation disposition. Existing decision states remain for compatibility: retained-evidence purge stays `IMMUTABLE` with `RETAIN_REQUIRED`, missing outcomes use `NEEDS_CHOICE` with `CHOICE_REQUIRED`, and ready/warning states remain executable. Blocked purge previews contain evidence and preservation information but no destructive confirmations or executable purge effects.

### Schema changes are additive

Migration `0027` creates `admin_maintenance_sessions`, indexes/checks, and an optional nullable operation link if it does not create a reset deletion cycle. Existing lifecycle operation/event records are not renamed or rewritten. The current Demo table is not dropped in the initial migration.

## Risks / Trade-offs

- **An already-stolen Admin bearer token can benefit while that actor's maintenance session is open** → keep expiry short, bind session version, visibly expose status, close manually, revoke on session/password changes, and retain fresh password for purge/reset.
- **Old mobile builds can call removed endpoints** → preserve lifecycle adapters and return a stable inactive Demo compatibility status until a required app release is registered and served.
- **Policy migration can create a temporarily inconsistent rule map** → replace service injections and tests in one feature-flagged backend cutover; never deploy a stage with both global Demo activation and Maintenance execution active.
- **A new table can block Full Reset's fail-closed catalog** → update catalog/deletion ordering in the same change and run the disposable real reset rehearsal.
- **Typed next actions may not cover every historical data shape** → return `IMMUTABLE` or `NEEDS_CHOICE`, never guess destructive reconciliation; log stable decision codes for follow-up.
- **Historical membership rows may be stale but semantically ambiguous** → require an explicit administrator outcome and period in the same review; do not send the actor to the unrelated grade/state recovery panel.
- **Keeping inert Demo code creates temporary debt** → enforce zero active runtime imports and a dated adoption/removal gate.
- **The implementation touches backend, web, and mobile** → expand the shared contract gate and ship one exact SHA with Android artifact verification.

## Migration Plan

1. Add migration/schema and reset-catalog coverage with Maintenance disabled.
2. Add session/policy/controller and characterization tests.
3. Replace backend Demo consumers behind the new execution flag; old Demo activation becomes unavailable.
4. Add structured decisions and maintenance route aliases while lifecycle routes remain.
5. Cut web and mobile to Maintenance Access and actionable lifecycle flows.
6. Run focused, full, migration, academic, reset, browser, mobile, and AI-participant verification.
7. Bump/build/verify Android, commit, push, verify exact-SHA CI/deployment/live non-destructive endpoints, and verify served artifact.
8. After required mobile adoption and rollback window, separately remove old Demo source/table and optionally old lifecycle aliases.

Rollback disables Maintenance execution and revokes sessions while leaving the additive schema. It does not restore global Demo Mode. Already committed lifecycle operations are corrected through evidence-preserving inverse flows. Full Reset recovery remains backup/receipt based.

## Open Questions

- Production enablement timing, coworker Admin assignment, external legacy consumers, and actual warning-frequency distributions require deployment/runtime evidence.
- A narrower Data Steward role can be designed later if coworkers should not receive full Admin authority.
- Physical ARM64 presentation-device acceptance remains unverified until run on that device.
