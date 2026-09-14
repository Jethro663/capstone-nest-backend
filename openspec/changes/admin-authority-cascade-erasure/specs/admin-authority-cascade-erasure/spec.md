## ADDED Requirements

### Requirement: Explicit administrator erasure mode
The system SHALL support `EMPTY_ONLY` and `CASCADE_ERASE` purge modes for archived classes, archived sections, and soft-deleted accounts. Omitted mode on a legacy single-target request SHALL mean `EMPTY_ONLY`.

#### Scenario: Retained evidence in empty-only mode
- **WHEN** an archived target with retained evidence is previewed in `EMPTY_ONLY`
- **THEN** the system returns a non-executable retained-evidence blocker and changes no data

#### Scenario: Retained evidence in cascade mode
- **WHEN** an authorized administrator previews the same target in `CASCADE_ERASE`
- **THEN** the system returns executable high-severity deletion impact grouped by affected data type instead of an immutable retained-evidence blocker

### Requirement: Maintenance-bound destructive authority
The system SHALL require authenticated Admin RBAC and an active actor/session-version-bound Maintenance Access session for cascade erasure. Opening that session SHALL be the current-password step-up; execution SHALL require one manifest-bound confirmation without requesting the password again.

#### Scenario: Active Maintenance Access
- **WHEN** the same authenticated administrator executes a current cascade manifest during the active session with the exact confirmation
- **THEN** execution proceeds without another password field

#### Scenario: Missing or foreign Maintenance Access
- **WHEN** execution has no active session for the actor and login session version
- **THEN** the system returns `MAINTENANCE_SESSION_REQUIRED` and changes no data

### Requirement: Permanent account boundaries
The system SHALL refuse erasure of the executing administrator and the last active administrator.

#### Scenario: Self-account selected
- **WHEN** an administrator includes their own account in a cascade-erasure request
- **THEN** the system returns `SELF_ACCOUNT_ERASURE_FORBIDDEN` and changes no selected target

#### Scenario: Last active administrator selected
- **WHEN** the selected account is the only other active account with the Admin role
- **THEN** the system returns `LAST_ADMIN_ERASURE_FORBIDDEN` and changes no selected target

### Requirement: Complete batch preview
The system SHALL preview 1–50 unique targets of one type, normalize the exact target set into the manifest, and report every target, descendant group, row count, deletion/detach action, storage object count, warning, blocker, catalog version, schema hash, expiry, and confirmation text.

#### Scenario: Thirty-three selected classes
- **WHEN** an administrator previews 33 archived class IDs in cascade mode
- **THEN** the manifest contains all 33 IDs once, aggregate and per-target impact, and one confirmation phrase for the full selection

#### Scenario: Mixed, duplicate, or oversized selection
- **WHEN** the request contains mixed target types, duplicate IDs, zero IDs, or more than 50 IDs
- **THEN** the system returns `INVALID_ERASURE_REQUEST` and does not mint a manifest

### Requirement: Catalog and schema completeness
The system SHALL classify target relationships as delete, detach, or preserved receipt and SHALL compare that catalog with live PostgreSQL relationship metadata before execution.

#### Scenario: Unknown dependency
- **WHEN** a selected target is referenced through a relationship not represented by the active catalog
- **THEN** preview or execute returns `UNCLASSIFIED_DEPENDENCY` before any mutation

#### Scenario: Schema changes after preview
- **WHEN** the database schema hash or catalog version differs at execution
- **THEN** the system returns `ERASURE_SCHEMA_CHANGED` and rolls back the entire batch

### Requirement: Atomic and idempotent database erasure
The system SHALL lock the normalized target set, regenerate the preview inside one transaction, and delete or detach all selected database records atomically. It SHALL persist and replay one result for a unique idempotency key.

#### Scenario: One target fails in a batch
- **WHEN** any target cannot complete its database erasure
- **THEN** every database mutation for the selected batch rolls back and every selected target remains

#### Scenario: Completed request is repeated
- **WHEN** the same idempotency key and request hash are submitted again
- **THEN** the system returns the original operation result without another deletion

### Requirement: Target-specific deletion semantics
The system SHALL delete class-owned descendants for a class, linked classes and their descendants for a section, and identity/participant/private data for a user. It SHALL detach user authorship from institutional records rather than delete unrelated school content.

#### Scenario: Teacher account erased
- **WHEN** a soft-deleted teacher account that authored lessons or taught classes is cascade-erased
- **THEN** the account and its private data are deleted while unrelated classes and institutional lesson content remain with detached or snapshotted authorship

#### Scenario: Section with linked classes erased
- **WHEN** an archived section with linked archived classes is cascade-erased
- **THEN** the section, linked classes, and their previewed descendants are deleted in the same database transaction

### Requirement: Minimal durable erasure receipt
The system SHALL retain an append-only operation and per-target receipt containing actor and target snapshots, reason, hashes, counts, timestamps, result, and cleanup state. The receipt SHALL NOT contain deleted scores, responses, notes, credentials, or file content.

#### Scenario: Actor is later erased
- **WHEN** the administrator who performed an earlier erasure is later deleted
- **THEN** the earlier receipt survives with a minimal actor snapshot and nullable actor relationship

### Requirement: Retryable post-commit cleanup
The system SHALL collect physical object keys before database deletion, perform file/index cleanup after commit, persist cleanup status, and retry idempotently. Cleanup failure SHALL NOT resurrect deleted database records.

#### Scenario: Object store temporarily fails
- **WHEN** the database erasure commits but one object deletion fails
- **THEN** the operation returns `cleanup_pending` or `completed_with_cleanup_errors`, retains retry state, and the target remains deleted

### Requirement: Stale asynchronous work is contained
Target-aware queue processors SHALL treat an erased or missing target as a successful no-op and SHALL not recreate deleted state.

#### Scenario: Old indexing job runs after erasure
- **WHEN** a queued class or file indexing job starts after its target was erased
- **THEN** the processor records a no-op completion without writing new target data

### Requirement: Additive client compatibility
The system SHALL keep existing single-target purge routes as adapters, preserve the response envelope, and synchronize new types and paths across backend, web, and mobile contract checks.

#### Scenario: Legacy empty-only client
- **WHEN** a legacy client omits `purgeMode` on a single-target preview
- **THEN** it receives the existing empty-only semantics without a contract parsing failure
