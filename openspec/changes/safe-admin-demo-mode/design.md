## Context

Nexora’s admin operations span independent Users, Classes, Sections, Roster Import, Assessments, Academic State, Class Record, Announcements, and Admin Lifecycle modules. Their safeguards range from presentation-oriented scheduling and academic-window restrictions to non-negotiable authorization, referential integrity, concurrency locks, and retained academic evidence. The system has no durable general settings table today. Web System Settings is route-backed; mobile System Settings is a native admin-stack flow.

The detailed source inventory, conflict ledger, UI states, contract map, and acceptance matrix are recorded in `docs/superpowers/specs/2026-09-12-safe-admin-demo-mode-design.md`. The executable task sequence is `docs/superpowers/plans/2026-09-12-safe-admin-demo-mode.md`.

## Goals / Non-Goals

**Goals:**

- Provide a short-lived, reversible administrator capability window for presentation setup.
- Relax only stable, named business/workflow rules and preserve hard invariants.
- Keep policy server-owned and actor-scoped.
- Make activation deliberate, visible, optimistic-versioned, and audited.
- Present consistent status and controls in admin web and mobile.
- Restore normal behavior immediately on deactivation, expiry, unavailable deployment state, or state-read failure.

**Non-Goals:**

- A client-controlled bypass flag or header.
- A non-admin capability, teacher/student behavior change, or AI authority change.
- Editing finalized/locked evidence, rewriting attempts or returned grades, bypassing score caps, or deleting retained evidence.
- A separate demo database/deployment in this release.
- General-purpose key/value settings infrastructure.

## Decisions

### 1. Store one typed singleton state rather than a generic setting

`admin_demo_mode_states` stores enabled state, expiry, reason, activation/deactivation actors and timestamps, and an optimistic version. A fixed UUID provides one global installation state without introducing untyped settings parsing.

Alternative: an environment-only flag. Rejected because it cannot provide in-product activation, expiry, actor evidence, or immediate disable without deployment.

### 2. Separate deployment availability from effective active state

`ADMIN_DEMO_MODE_AVAILABLE` defaults false and gates activation. Effective active state also requires an enabled unexpired row. Deactivation remains available even when availability is false. This provides an operational kill switch without making safe shutdown depend on a redeploy.

### 3. Resolve policy from backend state plus authenticated actor

A global `AdminDemoModeService` returns an inactive context unless the row is effective and the actor is an admin. Feature services name each rule they want to relax. No request field or header can claim Demo mode.

Alternative: request-scoped implicit context. Rejected because explicit actor/rule evaluation is easier to trace, test, and keep out of workers and non-admin calls.

### 4. Use an allowlist of relaxed rules and a denylist of permanent rules

The first-release allowlist covers user lifecycle sequence, class/section membership window, section capacity, schedule collision, room/adviser exclusivity, safe archive cascades, archived-class shell restore, admin academic window, and governed execution availability. The permanent list includes RBAC, self-account protection, DTO/content validation, uniqueness, referential integrity, academic locking, finalized evidence, attempts/returned grades, score invariants, append-only evidence/audit, evidence-aware purge, and AI non-authority.

Alternative: skip all `ConflictException` checks. Rejected because the exception type does not distinguish harmless workflow friction from corruption prevention.

### 5. Keep existing endpoint shapes and compose at internal owners

Only status/activate/deactivate endpoints are added. Existing clients remain compatible because current mutation payloads and response envelopes do not change. Each owning service evaluates Demo context where actor identity already exists.

### 6. Treat activation as a bounded global step-up

Activation requires deployment availability, current password, exact phrase, reason, one of four durations, all acknowledgements, and latest version. Server time determines expiry. Deactivation requires an exact phrase and latest version but no password so removing risk is easier than creating it.

### 7. Preserve lifecycle and transaction machinery

Demo mode can satisfy only the governed lifecycle availability gate. Manifest freshness, password, confirmations, blockers, atomicity, idempotency, notifications, audit, and evidence-aware purge remain. Safe class/section archival continues through existing transactional status updates instead of deleting rows.

### 8. Use one focused settings route and one compact global notice

Web adds `/dashboard/admin/system-settings/demo-mode`; mobile adds `AdminSettingsDemoMode`. Both show relaxed and permanent rules and activation state. An amber notice appears throughout admin workspaces while active. The existing sidebar/drawer remains the sole primary navigation.

## Risks / Trade-offs

- [A missed guard remains restrictive] → Fail closed, keep rules allowlisted, add paired active/inactive tests, and add capabilities incrementally instead of broad exception skipping.
- [A wrongly classified guard corrupts data] → Require a named rule, permanent-rule tests, unchanged transaction/evidence boundaries, and final grep/diff review of every Demo branch.
- [Mode expires between render and submit] → Backend server time is authoritative; clients retain input, refresh status, and show the normal server error without retrying.
- [Global activation affects another admin] → Display actor/reason/expiry everywhere in admin shells, use short durations, audit all bypasses, and provide immediate deactivation.
- [Persisted enabled state survives expiry] → Every policy decision derives effectiveness from `expiresAt`; cleanup is optional, not required for safety.
- [Production acceptance changes real academic data] → Live acceptance observes a relaxed control without submitting; isolated backend E2E proves mutation behavior; finish with disabled status.
- [Mobile source invalidates the current APK] → Increment Android version monotonically, rebuild, verify manifest/size/SHA/signing/embedded URL, register updater, and report device proof separately.

## Migration Plan

1. Deploy additive migration `0021_admin_demo_mode.sql` with availability false.
2. Deploy backend policy/API and web/mobile consumers; run focused, full, migration, browser, and Android gates.
3. Verify exact pushed SHA through CI and Railway backend/frontend deployments.
4. Set `ADMIN_DEMO_MODE_AVAILABLE=true` only after migration and health success; verify the resulting backend deployment.
5. Register and verify the exact Android artifact/update record.
6. Run guarded live activation at 15 minutes, observe web/mobile status, disable immediately, and confirm durable disabled state.

Rollback sets `ADMIN_DEMO_MODE_AVAILABLE=false` first. Effective policy becomes normal even when a persisted row says enabled. The additive table and audit evidence remain; code may then be reverted without a destructive down migration.

## Open Questions

None. New evidence may narrow a relaxation but may not add an unreviewed bypass or weaken a permanent rule.
