## Why

Administrators currently encounter dead-end enrollment and archival errors, must manually unwind dependent class and section memberships, and can leave partially completed workflows when one of several independent requests fails. Nexora needs a governed way to correct, withdraw, transfer, close, and safely purge academic entities without weakening the invariants that preserve grades, submissions, attendance, attempts, and prior-period roster evidence.

## What Changes

- Add a web-first, admin-only lifecycle resolution workflow with deterministic preview, explicit blockers and warnings, manifest expiry, current-password step-up authentication, idempotent execution, and an operation result that can be revisited.
- Replace ambiguous student removal with three explicit intents: correct an evidence-free enrollment, withdraw a learner, or transfer a learner to another compatible section and its matching subject classes.
- Preserve an append-only enrollment lifecycle event for every governed status change while retaining the current enrollment status for efficient reads.
- Close student, class, and section dependencies atomically per governed target; multi-target bulk requests may complete independently but must retain per-target results and safe retry behavior.
- Narrow class archival checks to the target class instead of unrelated section membership, and route end-of-year section closure to the existing academic transition workflow.
- Keep permanent deletion separate from routine lifecycle resolution and allow it only for archived, evidence-free records after a complete dependency preview.
- Add contextual web admin flows on the current Classes, Sections, and Roster surfaces; mobile administration is intentionally outside the first release.
- Correct stale archive confirmation copy that claims historical teacher or adviser assignments are cleared.

## Capabilities

### New Capabilities

- `governed-admin-lifecycle`: Preview, execute, audit, and review safe administrator lifecycle resolutions for student enrollments, classes, and sections.

### Modified Capabilities

None. The repository has no existing main OpenSpec capability for these lifecycle contracts.

## Impact

- Backend: new `admin-lifecycle` module, DTOs, controller, orchestration services, database migration, audit integration, and targeted changes to class/section lifecycle guards.
- Web: new typed service/contracts and a reusable contextual resolution dialog integrated with administrator class, section, and roster pages.
- Data: append-only lifecycle operation/event records and end-state metadata; no finalized academic evidence is deleted or rewritten.
- Security: admin role enforcement, current-password step-up authentication, request throttling, canonical manifest validation, and idempotency-key uniqueness.
- Operations: focused backend/web tests, full affected-surface gates, feature-flagged rollout, and release verification on `developement`.
