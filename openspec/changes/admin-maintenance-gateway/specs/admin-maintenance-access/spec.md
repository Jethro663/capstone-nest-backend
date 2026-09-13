## ADDED Requirements

### Requirement: Maintenance Access is actor-bound, durable, and fail-closed
The system SHALL store Maintenance Access per administrator with actor identity, actor session version, fixed server scopes, reason, status, start time, expiry, last use, and close or revocation evidence. A session SHALL be effective only for the same authenticated, active, verified Admin while backend time is before expiry and the actor's current session version matches.

#### Scenario: Two administrators do not share access
- **WHEN** one administrator opens Maintenance Access and a different administrator performs the same guarded action
- **THEN** only the first administrator receives maintenance policy and the second administrator remains under normal rules

#### Scenario: Missing or unreadable state fails closed
- **WHEN** no effective session exists or session state cannot be read
- **THEN** the mutation applies normal safeguards without inferring maintenance authority

#### Scenario: Session version changes
- **WHEN** the actor's `session_version` changes after Maintenance Access opens
- **THEN** the prior maintenance session is ineffective and the actor must sign in and authenticate again

#### Scenario: Session expires
- **WHEN** backend time reaches the stored expiry
- **THEN** subsequent policy decisions apply normal safeguards even if no cleanup job has updated the row

### Requirement: Opening Maintenance Access requires deliberate step-up
The system SHALL allow only an authenticated Admin to open Maintenance Access and SHALL require the current account password, a bounded reason, all required acknowledgements, backend-granted scopes, and an expiry no longer than the configured maximum.

#### Scenario: Valid opening succeeds
- **WHEN** an Admin supplies the correct password, valid reason, and exact acknowledgements while System Reset maintenance is inactive
- **THEN** the system revokes any older effective session for that actor, creates a new 15-minute session, audits the opening, and returns actor-specific status

#### Scenario: Wrong password is rejected
- **WHEN** the supplied password does not match the authenticated Admin
- **THEN** the system rejects opening before creating a session and does not log password material

#### Scenario: Client supplies scopes
- **WHEN** a client adds scope or bypass fields not defined by the opening DTO
- **THEN** validation rejects or ignores them according to the global whitelist policy and the server grants only its fixed scope set

#### Scenario: Reset is already active
- **WHEN** the system is in reset maintenance or has an active reset operation
- **THEN** Maintenance Access opening is rejected without changing reset state

### Requirement: Closing and revocation restore normal policy immediately
The system SHALL let the actor close Maintenance Access and SHALL revoke it on session invalidation, password/session-version change, account deactivation, or Full Reset.

#### Scenario: Actor closes access
- **WHEN** the Admin closes an active maintenance session
- **THEN** the session becomes closed, the event is audited, and the next mutation applies normal safeguards

#### Scenario: Full Reset executes
- **WHEN** a Full Reset commits its database phase
- **THEN** every Maintenance Access session is cleared and the retained initiating Admin must sign in again

### Requirement: Maintenance scopes are server-owned and permanently bounded
The system SHALL grant only server-defined routine scopes and SHALL never let Maintenance Access override authentication/RBAC, self protection, DTO/identity/referential integrity, database checks, finalized or submitted evidence, score invariants, append-only audit/lifecycle/reset history, evidence-aware purge, or AI non-authority.

#### Scenario: Operational collision is allowed with evidence
- **WHEN** an active Admin session confirms a server-issued capacity, schedule, room, adviser, or structural-window warning
- **THEN** the operation may continue and audit records the exact warning code and maintenance session

#### Scenario: Finalized grade rewrite is attempted
- **WHEN** an active Maintenance Access actor attempts to rewrite finalized or locked grade evidence
- **THEN** the system returns an immutable decision or existing evidence-preserving repair route and does not alter the source evidence

#### Scenario: Teacher calls shared endpoint
- **WHEN** a teacher calls a class or section endpoint while an Admin has Maintenance Access
- **THEN** teacher authorization and business safeguards remain unchanged

### Requirement: Maintenance use is auditable without secret leakage
The system SHALL audit session start, close, expiry or revocation, and each mutation that actually uses maintenance relaxation. Audit metadata SHALL contain actor, session, decision/rule codes, expiry, target type/ID where permitted, and correlation identifiers without passwords, tokens, confirmation phrases, or unnecessary payloads.

#### Scenario: No rule is relaxed
- **WHEN** an operation succeeds normally during an active session without using a maintenance exception
- **THEN** its audit does not falsely claim that a rule was bypassed

#### Scenario: Multiple warnings are confirmed
- **WHEN** an operation uses more than one server-issued warning
- **THEN** audit records each unique warning code once and links the maintenance session and operation

### Requirement: Global Demo Mode is retired as an authority
The system SHALL remove Admin Demo Mode from active backend, web, and mobile policy paths. Legacy status MAY return a stable inactive/unavailable response during compatibility, but legacy activation SHALL NOT create a second bypass authority.

#### Scenario: Old client requests Demo status
- **WHEN** a compatibility-period client calls the Demo status endpoint
- **THEN** it receives a stable inactive or unavailable response and normal policy remains in force

#### Scenario: Old client attempts Demo activation
- **WHEN** a compatibility-period client submits Demo activation
- **THEN** the system rejects it without enabling any global bypass state

#### Scenario: Active clients load admin workspaces
- **WHEN** current web or mobile admin workspaces render
- **THEN** they consume Maintenance Access state and contain no active Demo provider, hook, banner, or settings route
