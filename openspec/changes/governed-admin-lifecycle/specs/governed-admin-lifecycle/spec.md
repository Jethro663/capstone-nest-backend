## ADDED Requirements

### Requirement: Administrators receive a deterministic lifecycle preview

The system SHALL provide admin-only, read-only previews for student resolution, class closure, section closure, and purge. A preview SHALL return the requested intent, affected identities, current academic state, changed and preserved effects, warnings, absolute blockers, required confirmations, a canonical manifest hash, a manifest schema version, and an expiry timestamp.

#### Scenario: Preview has no side effects

- **WHEN** an administrator previews a lifecycle request
- **THEN** the system returns a deterministic manifest without changing enrollment, class, section, academic evidence, audit, notification, or operation rows

#### Scenario: Preview identifies resolvable and absolute blockers

- **WHEN** dependencies prevent the direct requested action
- **THEN** the manifest distinguishes dependencies that have an allowed resolution from evidence or curriculum constraints that cannot be bypassed

#### Scenario: Non-admin preview is rejected

- **WHEN** a non-administrator calls a lifecycle preview endpoint
- **THEN** the system rejects the request without revealing unnecessary student or academic-record details

### Requirement: Governed execution is authenticated, fresh, atomic, and idempotent

The system SHALL execute a governed lifecycle request only for an administrator who provides the reviewed unexpired manifest hash, every required confirmation, a specific reason, current-password step-up authentication, and an idempotency key. The system SHALL recompute the manifest under the academic transaction and SHALL roll back all academic changes if any required mutation fails.

#### Scenario: Stale preview is rejected

- **WHEN** an affected dependency changes after preview or the preview expires
- **THEN** execution is rejected and the administrator is instructed to refresh and review a new manifest

#### Scenario: Wrong password is rejected

- **WHEN** the administrator provides a password that does not match the executing account
- **THEN** execution is rejected before any academic mutation

#### Scenario: Successful idempotent replay returns the original result

- **WHEN** the same administrator repeats a completed request with the same idempotency key and identical canonical payload
- **THEN** the system returns the stored operation result without duplicating enrollment rows, events, audits, or notifications

#### Scenario: Idempotency key payload mismatch conflicts

- **WHEN** an idempotency key is reused with a different canonical payload
- **THEN** the system rejects the request as a conflict

#### Scenario: Failed mutation rolls back

- **WHEN** any destination creation, source closure, participant update, event insertion, operation completion, audit, or durable notification write fails
- **THEN** every academic mutation in that governed target is rolled back and the operation is recorded as failed outside the rolled-back transaction

### Requirement: Enrollment lifecycle outcomes preserve academic truth

The system SHALL distinguish correction, withdrawal, section transfer, and class transfer while keeping earlier and finalized academic evidence unchanged. Every governed status transition SHALL create one or more append-only enrollment lifecycle events in the same transaction as the status change.

#### Scenario: Evidence-free enrollment is corrected

- **WHEN** an administrator selects `CORRECT_ENROLLMENT` and the source membership has no retained academic evidence
- **THEN** the source membership becomes dropped, editable participant eligibility becomes `not_enrolled`, and an event records the erroneous-enrollment reason and effective period

#### Scenario: Correction with evidence is blocked

- **WHEN** an administrator selects `CORRECT_ENROLLMENT` and the learner has attempts, scores, finalized or locked participant evidence, attendance or behavior evidence, or another retained result in the target membership
- **THEN** the system blocks correction and offers withdrawal, transfer, or academic repair as applicable

#### Scenario: Withdrawal preserves earlier periods

- **WHEN** an administrator withdraws a learner in the current academic period
- **THEN** active source memberships become dropped, current and future editable participant rows become withdrawn, and earlier or finalized participant rows and results remain unchanged

#### Scenario: Section transfer is atomic and compatible

- **WHEN** an administrator transfers a learner to an active same-year same-grade section with capacity and exactly one matching destination class per active source subject
- **THEN** destination section and class memberships are created, source memberships are dropped, editable source participants become transferred, and all changes commit atomically

#### Scenario: Incompatible section transfer is blocked

- **WHEN** the destination is inactive, full, a different school year or grade, already actively enrolls the learner, or lacks an unambiguous matching class
- **THEN** the preview returns an absolute blocker and execution cannot proceed

#### Scenario: Class transfer preserves section membership

- **WHEN** a learner transfers between compatible active classes for the same subject and school year
- **THEN** the destination class membership is created, the source class membership is dropped, and the section-only membership remains unchanged

### Requirement: Class archival resolves only target-class dependencies

The system SHALL determine class archival eligibility from the target class and its academic/curriculum evidence, not from unrelated section-only or sibling-class enrollments.

#### Scenario: Unrelated section enrollment does not block archival

- **WHEN** the target class has no active class enrollments but its section has active section-only or sibling-class enrollments
- **THEN** the class can be archived without changing those unrelated memberships

#### Scenario: Enrolled class requires an explicit outcome

- **WHEN** the target class has active learner memberships
- **THEN** the preview requires complete, drop, or compatible replacement-class transfer before archival

#### Scenario: Class archive preserves history

- **WHEN** a class is successfully archived
- **THEN** its teacher identity, schedule, lessons, assessments, class records, grades, attempts, and audit history remain associated with the archived class

#### Scenario: Required curriculum class remains blocked

- **WHEN** archiving would remove an expected current-year curriculum class for enrolled learners without a compatible replacement
- **THEN** the system blocks execution and routes the administrator to curriculum or academic repair

### Requirement: Section closure resolves every learner or redirects to transition

The system SHALL treat section archival as a governed close operation. Every active learner SHALL have one validated outcome, and one section closure SHALL commit all learner, class, and section changes atomically.

#### Scenario: Missing learner outcome blocks closure

- **WHEN** at least one active learner has no validated transfer, withdrawal, or completion outcome
- **THEN** section closure is blocked and identifies the unresolved learner count

#### Scenario: Mid-year section transfer closes all dependencies

- **WHEN** every learner has a compatible destination or withdrawal outcome
- **THEN** all source class memberships, section memberships, editable participant states, linked class archival, and section archival commit in one transaction

#### Scenario: Normal year completion redirects to academic transition

- **WHEN** an administrator attempts to close a current-year section as ordinary annual completion
- **THEN** the preview blocks direct closure with `USE_ACADEMIC_TRANSITION` and identifies the existing transition workflow

### Requirement: Permanent deletion is separate and evidence-aware

The system SHALL expose purge only for archived classes or sections through a separate advanced workflow and SHALL provide no override when retained academic or lifecycle evidence exists.

#### Scenario: Empty archived record can be purged

- **WHEN** an archived class or section has no linked enrollment history, lifecycle events, class records, grades, attempts, assessments, lessons, attendance, behavior, or referenced historical identity
- **THEN** an authenticated, confirmed purge may permanently delete the record and record the operation

#### Scenario: Evidence blocks purge

- **WHEN** any retained academic or lifecycle evidence references the archived target
- **THEN** the purge preview returns an absolute blocker and execution remains impossible

### Requirement: Lifecycle operation and actor evidence remain reviewable

The system SHALL retain a lifecycle operation record containing action, target, status, attempts, actor snapshot, request hash, manifest hash, reason, timestamps, result or failure summary, and audit linkage. Lifecycle operation and audit rows SHALL survive later actor-account purge.

#### Scenario: Administrator reviews a completed operation

- **WHEN** an authorized administrator requests an operation by ID
- **THEN** the system returns its reviewable result without exposing password material or unrelated student PII

#### Scenario: Actor account is later purged

- **WHEN** the executing administrator account is permanently removed
- **THEN** the lifecycle operation, enrollment events, and audit row remain with the stored actor snapshot and a nullable actor reference

### Requirement: Contextual web workflow replaces dead-end lifecycle actions

The web admin SHALL present lifecycle resolution from the existing class, section, and roster contexts using progressive disclosure and accurate preservation copy. Mobile administration SHALL remain unchanged in the first release.

#### Scenario: Blocked action becomes actionable

- **WHEN** an administrator starts a remove or archive action that has dependencies
- **THEN** the UI opens a resolution flow showing the blocker summary and valid intents instead of only a generic error toast

#### Scenario: Review distinguishes changed and preserved data

- **WHEN** the administrator reaches final review
- **THEN** the UI shows changed effects, preserved academic evidence, warnings, confirmations, reason, and one password field before enabling execution

#### Scenario: Stale review preserves choices

- **WHEN** execution reports an expired or changed manifest
- **THEN** the UI retains the selected resolution inputs, refreshes the preview, and requires review of the new effects

#### Scenario: Bulk results remain recoverable

- **WHEN** independent targets produce mixed success and failure
- **THEN** the UI shows every result, retains failed targets, and provides a retry path that cannot duplicate completed operations

### Requirement: Governed execution can be disabled operationally

The system SHALL gate lifecycle execution behind `ADMIN_LIFECYCLE_ENABLED`, defaulting to disabled, while keeping authorized preview available.

#### Scenario: Execution flag is disabled

- **WHEN** an administrator submits an otherwise valid execute request while the feature flag is false
- **THEN** the system rejects execution without academic mutation and explains that governed lifecycle execution is not enabled

#### Scenario: Execution flag is enabled

- **WHEN** the feature flag is true and all execution requirements pass
- **THEN** the system performs the governed lifecycle operation
