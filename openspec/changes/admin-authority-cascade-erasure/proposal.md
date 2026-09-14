## Why

Administrators can archive historical records, but permanent deletion currently ends at an immutable retained-evidence message, class and section bulk actions review only the first selected row, and a historical enrollment can cause a false duplicate conflict while still appearing in class records. The school demonstration needs a coherent administrator-owned workflow that completes these actions without silent partial work or misleading roster state.

## What Changes

- Add an explicit administrator cascade-erasure mode for archived classes, archived sections, and soft-deleted accounts. Retained evidence becomes reviewed deletion impact instead of an absolute blocker.
- Bind cascade erasure to an active Maintenance Access session, one batch manifest, one confirmation, atomic database execution, a minimal durable receipt, and retryable post-commit file/index cleanup.
- Add real homogeneous batch preview and execution for up to 50 selected targets and replace the web classes/sections first-selection behavior.
- Reactivate dropped or completed same-class enrollment rows instead of returning a false active-duplicate conflict, including mutable class-record participant eligibility reconciliation.
- Default active class-record workspaces to currently enrolled learners while keeping explicit historical/all views and complete exports.
- Keep self-account, last-active-admin, authentication/RBAC, target-state, idempotency, concurrency, schema-completeness, and audit boundaries non-bypassable.

## Capabilities

### New Capabilities

- `admin-authority-cascade-erasure`: Maintenance-session-bound single and batch permanent deletion with complete impact preview, atomic database execution, durable receipt, and retryable cleanup.
- `historical-enrollment-reactivation`: Status-aware class enrollment that distinguishes an active duplicate from a reusable dropped or completed membership.
- `class-record-learner-visibility`: Current, historical, and all-learner presentation semantics across web and mobile without discarding backend evidence.

### Modified Capabilities

None. The repository has no promoted main specifications for the earlier change-local lifecycle capabilities, so this change introduces explicit current capabilities instead of claiming a delta against a missing main spec.

## Impact

- Backend: admin maintenance/lifecycle policy, DTOs, manifests, controllers, services, Drizzle schema/migration, System Reset catalog, storage cleanup, queue processors, class enrollment, and class-record participant reconciliation.
- Web: admin lifecycle contracts/dialogs and user/class/section entry points, plus teacher class-record learner filters.
- Mobile: additive admin lifecycle contract parity and class-record learner filtering; destructive execution remains web-admin-only in this release.
- Operations: one new database migration, one cleanup queue, a cascade-erasure feature flag, destructive disposable-database/storage rehearsal, Android packaging because mobile source changes, CI, Railway deployment, and exact-SHA live verification.
