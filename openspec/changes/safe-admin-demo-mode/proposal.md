## Why

Nexora’s administrator tools deliberately protect academic history and lifecycle consistency, but the combined safeguards make it slow to prepare and demonstrate a complete system flow. The product needs a reversible, visible, time-limited way for an administrator to relax presentation-blocking workflow rules without weakening authentication, integrity, evidence, or audit guarantees.

## What Changes

- Add one durable, optimistic-versioned, auto-expiring administrator Demo mode state.
- Add admin-only status, guarded activation, and immediate deactivation API endpoints while preserving the standard response envelope.
- Require deployment availability, current-password step-up, a reason, a bounded duration, exact confirmation text, acknowledgements, and the latest state version before activation.
- Add a typed capability catalog and relax only named business/workflow rules for an authenticated administrator.
- Keep permanent security, identity, referential-integrity, academic-evidence, score, audit, transaction, and purge safeguards active in every mode.
- Add System Settings controls and an active-mode notice to both web and mobile admin workspaces.
- Align affected user, class, section, roster, assessment, and governed-lifecycle admin flows with the server-owned capabilities.
- Add cross-client contract, migration, regression, browser, Android artifact, deployment, and live acceptance coverage.

No existing HTTP request or response shape changes. The three Demo mode endpoints are additive, and existing mutations change behavior only when the backend confirms both an effective active state and an authenticated admin actor.

## Capabilities

### New Capabilities

- `admin-demo-mode`: Durable activation, actor-scoped rule relaxation, permanent safeguards, audit behavior, web/mobile controls, expiry, rollback, and verification requirements for administrator Demo mode.

### Modified Capabilities

None. Existing behavior remains the default, and no main OpenSpec capability is currently registered for the affected modules.

## Impact

- Backend: new Drizzle schema/migration/config/module/controller/DTO/service/policy plus narrow integration in users, classes, sections, roster import, academic policy, assessments, class record, admin lifecycle, and audit metadata.
- Web: new type/service/provider/banner/settings route plus capability-aware admin user/class/section controls.
- Mobile: new type/service/query/notice/settings screen/navigation plus capability-aware admin controls and a new Android release artifact.
- Operations: new `ADMIN_DEMO_MODE_AVAILABLE` production variable, PostgreSQL migration `0021`, exact-SHA CI/Railway observation, APK updater registration, and live acceptance that ends with Demo mode disabled.
