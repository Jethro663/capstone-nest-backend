## 1. Policy, Schema, and Contracts

- [x] 1.1 Add failing schema/contract tests for operation persistence, append-only enrollment events, nullable retained audit actors, DTO validation, and the execution feature flag.
- [x] 1.2 Add the lifecycle schema, migration, relations, audit actor retention, configuration, and concrete student/class/section/purge DTOs.
- [x] 1.3 Add pure canonical manifest hashing and evidence classification with tests for deterministic ordering, expiry, changed dependencies, and absolute versus resolvable blockers.

## 2. Student Lifecycle Resolution

- [x] 2.1 Add failing service tests for evidence-free correction, evidence blocking, withdrawal, compatible section transfer, incompatible destinations, class transfer, finalized-period preservation, and atomic rollback.
- [x] 2.2 Implement student preview snapshots and manifests, including destination capacity, grade/year, duplicate membership, subject mapping, attempts, scores, and participant evidence.
- [x] 2.3 Implement student correction, withdrawal, section transfer, and class transfer in one academic transaction with append-only events and editable-participant updates.
- [x] 2.4 Implement execution claim/replay/failure handling, current-password step-up authentication, exact confirmations, operation results, audit, and deduplicated durable teacher/adviser notifications.

## 3. Class and Section Lifecycle Resolution

- [x] 3.1 Add failing regression tests proving unrelated section/sibling enrollments do not block class archival and active target learners require an explicit outcome.
- [x] 3.2 Implement class preview and atomic archive with complete, drop, and compatible replacement-class transfer outcomes while preserving historical ownership and evidence.
- [x] 3.3 Add failing tests for unresolved section learners, incompatible destinations, annual-transition redirects, and all-or-nothing section closure.
- [x] 3.4 Implement section preview and atomic closure using per-learner outcomes, linked class closure, and the existing annual-transition authority.

## 4. Permanent Deletion and Operation Review

- [x] 4.1 Add failing evidence-inventory tests covering enrollment history, lifecycle events, class records, scores, attempts, assessments, lessons, and linked class/section identity.
- [x] 4.2 Implement separate class/section purge preview and execution with no override and strengthen existing direct purge guards to use the same inventory.
- [x] 4.3 Add the admin-only controller/module, endpoint throttles, operation lookup redaction, AppModule wiring, and controller authorization/response-envelope tests.

## 5. Contextual Web Admin Workflow

- [x] 5.1 Add frontend lifecycle contracts, service methods, and service tests for all preview, execute, stale-manifest, feature-disabled, replay, and operation lookup responses.
- [x] 5.2 Build a tested reusable admin lifecycle dialog with preview, intent/resolution, changed-versus-preserved review, confirmations, reason, password, stale refresh, and operation result states.
- [x] 5.3 Integrate contextual student correction/withdrawal/transfer into admin section roster and edit pages, replacing ambiguous removal and multi-request partial behavior.
- [x] 5.4 Integrate contextual class/section archive actions, preserve failed bulk selections/results, and correct inaccurate historical-assignment copy.
- [x] 5.5 Add a separate tested advanced purge review and keep mobile behavior unchanged.

## 6. Documentation, Verification, and Release

- [x] 6.1 Revise `docs/architecture/admin-lifecycle-resolution-plan.md` to record the chosen web-first architecture, exact lifecycle semantics, vertical phases, migration, rollback, and operation evidence model.
- [x] 6.2 Run OpenSpec validation, migration/schema checks, focused backend/frontend tests, backend lint/build/full tests, frontend lint/build/full tests, and the applicable seeded/runtime smoke flows; fix task-caused failures.
- [ ] 6.3 Review the final diff and acceptance matrix, set the production execution flag only after successful deployment prerequisites, commit scoped changes, push `developement`, and verify exact-SHA CI, Railway deployment, migration, feature flag, health, and live lifecycle preview behavior.
