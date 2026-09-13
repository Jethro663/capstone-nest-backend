## Why

Admin academic cleanup is currently split across scattered service guards, a global Demo Mode bypass, and a governed lifecycle flow whose valid resolution options are not executable in web or mobile. Coworkers need a predictable way to reorganize live school data without dead-end errors, while the presentation clean-slate operation must remain a true Full Reset of live academic data.

## What Changes

- Introduce an Admin-only, actor-bound, short-lived Maintenance Access session backed by durable server state and current-password step-up.
- Introduce one server-owned decision contract: `READY`, `AUTO_RESOLVABLE`, `NEEDS_CHOICE`, `OVERRIDABLE_WARNING`, or `IMMUTABLE`, with typed next actions.
- Route admin student, class, section, purge, account, and operational-policy exceptions through the Admin Maintenance Gateway or an explicit evidence-preserving lane.
- Preserve lifecycle preview hashing, stale-state revalidation, idempotency, serialized transactions, audit records, and append-only lifecycle evidence.
- Replace active Admin Demo Mode backend, web, and mobile behavior; keep only bounded fail-closed compatibility until the required mobile release is adopted.
- Replace direct admin class unenrollment and generic blocker toasts with contextual preview, choice, execution, and receipt flows.
- Present retained-evidence purge as a clear keep/archive outcome without impossible destructive confirmations, and let historical classes/sections collect explicit membership outcomes and retire through the same governed archive flow.
- Keep teacher permissions and teacher mutation behavior unchanged.
- Preserve finalized grades, submitted evidence, and audit/lifecycle history during routine maintenance.
- Define Full Reset as the separate explicit exception: it deletes every live school/academic record, including finalized grades, and every account except the initiating administrator, while preserving only software/runtime essentials and reset/audit evidence.
- Update the System Reset catalog so Maintenance Access state is cleared and cannot survive reset.

## Capabilities

### New Capabilities

- `admin-maintenance-access`: Actor-bound Maintenance Access session, fixed server scopes, protected rule boundary, auditing, expiry, revocation, and Demo Mode retirement.
- `actionable-admin-lifecycle`: Structured maintenance decisions and executable next actions for admin student, class, section, account, and purge workflows across backend, web, and mobile.
- `complete-live-school-reset`: Full Reset remains independent of per-record safeguards and completely clears live school data plus non-initiating accounts while retaining only required system and reset/audit evidence.

### Modified Capabilities

<!-- No archived main specifications currently exist under openspec/specs. The new specifications supersede the still-open governed-admin-lifecycle and safe-admin-demo-mode change behavior where their requirements overlap. -->

## Impact

- Backend: new admin-maintenance module and database table; policy consumers in users, classes, sections, roster import, academic policy, lifecycle, authentication/session binding, audit, and System Reset catalog.
- API: additive `/api/admin/maintenance/*` routes and decision fields; bounded compatibility for `/api/admin/lifecycle/*`; Demo activation becomes fail-closed.
- Web: Maintenance Access provider/banner/settings, actionable lifecycle dialog, admin class-detail removal, and admin forms/workspaces.
- Mobile: matching API/types/hook/settings/notice/lifecycle review/navigation and a new Android release artifact.
- Data and operations: additive migration, exact System Reset table classification, contract fixtures, CI/deployment verification, and no destructive live reset during release acceptance.
