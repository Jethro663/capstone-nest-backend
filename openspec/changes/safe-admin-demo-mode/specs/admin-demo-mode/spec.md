## ADDED Requirements

### Requirement: Demo mode state is durable, versioned, and fail-closed
The system SHALL keep one durable administrator Demo mode state with enabled status, expiry, reason, activation/deactivation actor evidence, timestamps, and optimistic version. Effective active state SHALL require deployment availability, an enabled row, an expiry later than backend server time, and an authenticated administrator actor. A missing, expired, unavailable, or unreadable state SHALL enforce normal safeguards.

#### Scenario: Missing state defaults to disabled
- **WHEN** the singleton state row does not exist
- **THEN** status reports disabled version 0 and every mutation enforces normal safeguards

#### Scenario: Expired state fails closed
- **WHEN** the stored row is enabled but its expiry is not later than backend server time
- **THEN** status reports expired, policy reports inactive, and normal safeguards apply without a cleanup job

#### Scenario: State read fails during mutation
- **WHEN** the Demo mode state cannot be read
- **THEN** the mutation evaluates Demo mode as inactive and does not skip a normal safeguard

### Requirement: Activation is deliberate and bounded
The system SHALL allow only an administrator to activate Demo mode and SHALL require `ADMIN_DEMO_MODE_AVAILABLE=true`, the current account password, exact confirmation `ENABLE DEMO MODE`, a 10-240 character reason, duration 15, 30, 60, or 120 minutes, every required acknowledgement, and the latest optimistic version.

#### Scenario: Complete valid activation succeeds
- **WHEN** an administrator supplies every valid activation field against the current version
- **THEN** the system enables Demo mode until the server-calculated expiry, increments the version, audits the activation, and returns the updated status in the standard response envelope

#### Scenario: Wrong password rejects activation
- **WHEN** the current password does not match the acting administrator
- **THEN** the system returns forbidden without changing state or logging password material

#### Scenario: Incomplete acknowledgement rejects activation
- **WHEN** any required acknowledgement is missing, duplicated, or replaced with another value
- **THEN** the system returns a validation error without changing state

#### Scenario: Stale activation cannot overwrite current state
- **WHEN** activation supplies a version older than the persisted version
- **THEN** the system returns conflict and requires the client to refresh and review the current state

#### Scenario: Deployment gate blocks activation
- **WHEN** `ADMIN_DEMO_MODE_AVAILABLE` is not exactly `true`
- **THEN** status reports unavailable and activation returns service unavailable without changing state

### Requirement: Deactivation and expiry restore normal policy immediately
The system SHALL let an administrator deactivate Demo mode with exact confirmation `DISABLE DEMO MODE` and the latest version. Deactivation SHALL remain available when deployment availability is false and SHALL not require a password. Deactivation or expiry SHALL affect the next policy decision without a redeploy.

#### Scenario: Active mode is disabled immediately
- **WHEN** an administrator submits valid deactivation against the current active version
- **THEN** the system records disabled state, clears expiry, increments version, audits deactivation, and normal safeguards apply to the next mutation

#### Scenario: Operational kill switch restores normal behavior
- **WHEN** deployment availability changes from true to false while a row is enabled
- **THEN** effective state becomes inactive and normal safeguards apply while deactivation remains callable

### Requirement: Relaxation is admin-only and server-owned
The system SHALL relax a rule only when the backend resolves an effective state for the authenticated administrator and the owning service names a rule in the relaxed allowlist. A client-provided flag, query, or header SHALL NOT activate or extend Demo behavior. Teachers, students, background workers, and unauthenticated callers SHALL retain normal behavior.

#### Scenario: Non-admin cannot benefit from global state
- **WHEN** Demo mode is active and a teacher or student calls the same domain mutation
- **THEN** the existing authorization and business safeguards remain unchanged

#### Scenario: Forged client hint is ignored
- **WHEN** a caller adds a Demo-looking field, query, or header to a normal mutation
- **THEN** the backend ignores or rejects it according to the existing DTO contract and resolves policy only from durable state and actor roles

### Requirement: The first-release relaxed rule catalog is explicit
The system SHALL support only `user_lifecycle_sequence`, `class_membership_window`, `section_membership_window`, `section_capacity`, `schedule_collision`, `room_adviser_exclusivity`, `archive_active_memberships`, `restore_archived_class`, `admin_academic_window`, and `governed_execution_availability` as first-release relaxed rules.

#### Scenario: User lifecycle sequence is relaxed safely
- **WHEN** active Demo mode administrator archives or restores a non-self account from a normally disallowed lifecycle status
- **THEN** the existing archive/restore transaction and audit run while self protection and purge prerequisites remain

#### Scenario: Presentation schedule conflict is allowed
- **WHEN** active Demo mode administrator saves an otherwise valid overlapping schedule, reused room, or reused adviser
- **THEN** the save may proceed and audit identifies the exact bypassed rule while required identities and valid time shape remain enforced

#### Scenario: Historical membership window is allowed
- **WHEN** active Demo mode administrator changes membership on an inactive or historical class or section
- **THEN** the mutation may proceed while student role, grade, graduation, duplicate, section-membership, and cross-section reconciliation rules remain enforced

#### Scenario: Capacity is relaxed but remains valid data
- **WHEN** active Demo mode administrator overbooks a section or lowers its capacity below current headcount
- **THEN** the mutation may proceed while capacity remains a positive integer and the overbooked state remains visible

#### Scenario: Active memberships are archived through existing cascades
- **WHEN** active Demo mode administrator archives a class or section with active memberships
- **THEN** the existing transaction completes the affected memberships and archives the target without deleting retained academic evidence

#### Scenario: Archived class shell is restored explicitly
- **WHEN** active Demo mode administrator restores an archived class
- **THEN** the class becomes active without recreating completed memberships or deleted data

#### Scenario: Admin academic window is relaxed
- **WHEN** active Demo mode administrator prepares, releases, or grades an assessment outside the active year or period
- **THEN** the admin window check may pass while policy period validity, workbook status, attempts, publication readiness, and score invariants remain enforced

#### Scenario: Governed execution availability is relaxed
- **WHEN** active Demo mode administrator executes a reviewed lifecycle operation while `ADMIN_LIFECYCLE_ENABLED=false`
- **THEN** the availability gate may pass while password, manifest, expiry, confirmations, blockers, atomicity, idempotency, notifications, audit, and evidence-aware purge remain enforced

### Requirement: Permanent safeguards remain enforced
The system SHALL enforce authentication/RBAC, self-account protection, DTO/content validation, unique user and academic identity, referential integrity, the academic mutation lock, finalized/locked workbooks, assessment attempts and returned-grade history, score/percentage invariants, append-only lifecycle/audit evidence, evidence-aware permanent deletion, and AI non-authority in every mode.

#### Scenario: Active mode cannot purge retained evidence
- **WHEN** active Demo mode administrator requests permanent deletion of a target with retained academic or lifecycle evidence
- **THEN** the system returns the existing evidence blocker and does not delete the target

#### Scenario: Active mode cannot rewrite finalized grades
- **WHEN** active Demo mode administrator attempts to modify a finalized or locked workbook, an attempt-backed placement, or an out-of-range score
- **THEN** the permanent safeguard rejects the mutation

#### Scenario: Active mode cannot target the acting account destructively
- **WHEN** active Demo mode administrator tries to suspend, delete, or purge their own account
- **THEN** self-account protection rejects the action

### Requirement: Relaxed mutations are auditable
The system SHALL audit activation and deactivation. Every mutation that skips a relaxed rule SHALL record the mode version, expiry, and exact bypassed rule codes in existing audit metadata without storing passwords, tokens, or unnecessary student data.

#### Scenario: Mutation uses no relaxation
- **WHEN** a mutation succeeds without skipping a rule even though Demo mode is active
- **THEN** its audit need not claim a bypass

#### Scenario: Mutation skips multiple rules
- **WHEN** one mutation uses more than one relaxed rule
- **THEN** its audit metadata contains each unique bypassed rule code once with the effective mode version and expiry

### Requirement: Web and mobile expose one governed settings flow
The web and mobile admin clients SHALL show backend status, relaxed rules, protected rules, guarded activation, immediate deactivation, expiry, and errors. They SHALL show one compact active notice throughout admin workspaces and SHALL keep existing sidebar/drawer hierarchy.

#### Scenario: Inactive administrator opens settings
- **WHEN** an administrator opens the Demo mode settings route while mode is disabled and available
- **THEN** the client shows the activation explanation and keeps the action disabled until every required field is valid

#### Scenario: Active state is visible across admin workspaces
- **WHEN** Demo mode is active and an administrator visits Users, Classes, Sections, or another admin workspace
- **THEN** a compact notice shows active state, time remaining, and a Manage destination

#### Scenario: Mobile is offline
- **WHEN** mobile has cached status but no connection
- **THEN** it labels the status cached and disables activation, deactivation, and normal admin writes without queuing them

#### Scenario: Back navigation preserves source
- **WHEN** an administrator enters Demo settings from the settings overview or active notice and presses Back
- **THEN** web history or the mobile native stack returns to the actual source and preserves the source’s existing route state

### Requirement: Existing API consumers remain compatible
The system SHALL add only the three Demo mode endpoints and SHALL preserve existing user, class, section, roster, assessment, class-record, academic-state, and lifecycle request/response shapes and the standard response envelope.

#### Scenario: Older client sends a normal mutation
- **WHEN** an existing client that has no Demo mode code sends a valid mutation
- **THEN** the backend accepts the unchanged payload and applies normal or admin-relaxed policy solely from server state and actor identity

#### Scenario: Status contract is shared across clients
- **WHEN** web and mobile request Demo mode status
- **THEN** both receive the same availability, effective state, version, server time, expiry, actor/reason, relaxed rules, and protected rules fields

### Requirement: Release acceptance is exact and leaves mode disabled
The release SHALL pass focused and full backend/web/mobile tests, migration checks, web browser checks, Android packaging verification, exact-SHA CI, exact-SHA deployment, and live guarded activation/deactivation. Production acceptance SHALL not submit a mutation against existing academic records and SHALL end with durable disabled status.

#### Scenario: Live acceptance succeeds safely
- **WHEN** the exact release is healthy and production availability is enabled
- **THEN** the administrator validates activation guards, activates the shortest window, observes active controls/notices, deactivates immediately, and confirms disabled state after refresh

#### Scenario: No Android target is attached
- **WHEN** APK build and artifact checks pass but no device or emulator is listed by adb
- **THEN** the release report distinguishes artifact proof from unavailable device acceptance and does not infer installation success
