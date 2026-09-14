## 1. Contract and Characterization

- [x] 1.1 Add failing backend DTO, manifest, controller, and policy tests for purge modes, 1–50 target batches, Maintenance Access execution, stable errors, and single-target compatibility.
- [x] 1.2 Add failing shared contract tests for backend, web, and mobile purge types, operation states, limits, and paths.
- [x] 1.3 Add failing enrollment tests for active duplicate, dropped/completed reactivation, section membership state, and class-record participant reconciliation.
- [x] 1.4 Add failing web/mobile class-record tests for current, historical, all, finalized defaults, and complete exports.

## 2. Enrollment and Learner Visibility

- [x] 2.1 Implement status-aware same-class enrollment reactivation with lifecycle/audit evidence and active section promotion.
- [x] 2.2 Implement mutable class-record participant eligibility reactivation while preserving finalized/locked governance.
- [x] 2.3 Implement current/historical/all learner filtering and defaults on web and mobile without narrowing backend evidence responses.

## 3. Erasure Persistence and Catalog

- [x] 3.1 Add migration 0028 and Drizzle definitions for durable erasure operations/items, constraints, indexes, actor retention, and reset write barriers.
- [x] 3.2 Classify erasure tables and cleanup queue in System Reset, increment the catalog version, and update migration/reset tests.
- [x] 3.3 Implement the target-scoped dependency catalog, live relationship completeness check, target semantics, and grouped impact inventory with failing-first tests.

## 4. Erasure Execution and Cleanup

- [x] 4.1 Implement batch preview, mode-dependent retained-evidence decisions, schema/catalog hashes, confirmation, and archived/soft-deleted target checks.
- [x] 4.2 Implement atomic sorted-lock batch execution, in-transaction re-preview, explicit detach/delete order, idempotency, receipt, and audit.
- [x] 4.3 Implement self-account and last-active-admin permanent boundaries.
- [x] 4.4 Implement post-commit object/index cleanup, cleanup status/retry, and the admin-erasure-cleanup queue.
- [x] 4.5 Add missing/erased-target no-op behavior and tests to affected asynchronous processors.

## 5. API and Client Integration

- [x] 5.1 Add canonical Maintenance batch preview/execute, operation polling/retry, stable errors, and existing single-target adapters.
- [x] 5.2 Add cascade academic/account Maintenance rules and remove repeated purge password only for an active bound Maintenance session.
- [x] 5.3 Extend the web lifecycle service/dialog for whole-batch impact, one confirmation, execution, cleanup state, and cache invalidation.
- [x] 5.4 Replace class/section first-selection bulk behavior and integrate user cascade erasure with complete focused tests.
- [x] 5.5 Update mobile lifecycle contracts and expose cascade erasure as web-admin-only while retaining historical archive flows.

## 6. Verification and Release

- [x] 6.1 Run strict OpenSpec validation, focused red/green suites, contract checks, lint, type checks, full tests, builds, migration upgrade, System Reset, and destructive disposable-database/storage rehearsal.
- [x] 6.2 Build and verify the affected Android APK, update the established download manifest/artifact, and verify package/version/API/signature/hash evidence.
- [ ] 6.3 Review the final diff against every requirement, commit scoped changes, push developement, and verify exact-SHA CI.
- [ ] 6.4 Verify exact-SHA Railway backend/frontend deployment, live health/security, authenticated admin preview behavior, and served APK checksum before summarizing.
