## ADDED Requirements

### Requirement: Admin maintenance previews return one structured decision
The system SHALL return exactly one decision state for each admin maintenance preview: `READY`, `AUTO_RESOLVABLE`, `NEEDS_CHOICE`, `OVERRIDABLE_WARNING`, or `IMMUTABLE`. The response SHALL retain effects, preserved evidence, blockers, warnings, confirmations, canonical manifest hash, dependency versions, schema version, and expiry.

#### Scenario: No dependency blocks the intent
- **WHEN** a valid admin action has no unresolved dependency or warning
- **THEN** preview returns `READY` and accurately lists its effects and preserved records

#### Scenario: Deterministic dependencies can be reconciled
- **WHEN** every linked change has one safe server-owned resolution
- **THEN** preview returns `AUTO_RESOLVABLE`, lists every reconciliation effect, and does not require the actor to discover another screen

#### Scenario: A real-world outcome is ambiguous
- **WHEN** an affected learner or membership has more than one valid outcome
- **THEN** preview returns `NEEDS_CHOICE` with only the supported typed next actions and required input fields

#### Scenario: An operational conflict can be accepted
- **WHEN** the only conflict is a server-defined capacity, schedule, room/adviser, or structural-window condition
- **THEN** preview returns `OVERRIDABLE_WARNING` and names the exact warning acknowledgement required

#### Scenario: Protected evidence prevents ordinary mutation
- **WHEN** the intent would rewrite finalized/locked/submitted evidence or delete append-only evidence
- **THEN** preview returns `IMMUTABLE`, does not offer a continue-anyway action, and offers repair, archive, or cancel when applicable

### Requirement: Next actions are typed, server-issued, and manifest-bound
The system SHALL provide stable next-action IDs, labels, kinds, supported intents, required fields, and safe navigation destinations. Execute or re-preview SHALL accept only a next action issued by the unexpired matching preview and SHALL never accept caller-authored force, ignored-rule, SQL, or arbitrary target authority.

#### Scenario: Administrator selects withdrawal
- **WHEN** a correction preview finds retained evidence and returns a supported withdrawal action
- **THEN** selecting that action re-previews or executes the server-defined withdrawal intent with the same target context

#### Scenario: Foreign action ID is submitted
- **WHEN** a client submits an action ID absent from the matching preview
- **THEN** the server rejects the request without mutation

#### Scenario: Academic repair is required
- **WHEN** the protected evidence can only be corrected through the academic repair lane
- **THEN** the response returns a safe repair navigation action and no mutation override

### Requirement: Routine execution uses Maintenance Access and preserves lifecycle guarantees
The system SHALL execute routine maintenance only for an effective Maintenance Access actor who supplies the reviewed manifest evidence, required confirmations, selected server-issued choice, reason, and idempotency key. It SHALL recompute under the academic transaction and preserve audit, lifecycle events, rollback, and idempotent replay.

#### Scenario: Routine session avoids repeated password entry
- **WHEN** an Admin executes a reversible or guided operation during effective Maintenance Access
- **THEN** the server accepts session-bound authorization without requiring the current password again

#### Scenario: Purge remains action-authenticated
- **WHEN** an Admin permanently purges an evidence-free archived target
- **THEN** the server additionally requires current password and exact destructive confirmation before deletion

#### Scenario: Preview becomes stale
- **WHEN** an affected dependency changes or preview expires before execution
- **THEN** the server returns conflict with a refreshed preview when safe and requires the Admin to review and reconfirm it

#### Scenario: Idempotent replay is identical
- **WHEN** the same actor repeats a completed operation with the same idempotency key and canonical request
- **THEN** the original result is returned without duplicate changes, events, notifications, or audits

#### Scenario: Transaction step fails
- **WHEN** any required academic mutation, event, operation completion, or durable audit write fails
- **THEN** the governed target rolls back and a redacted failure record remains reviewable

### Requirement: Student and roster maintenance has a completion path
The system SHALL support correction, withdrawal, section transfer, and compatible class transfer while keeping prior and finalized evidence unchanged during routine maintenance.

#### Scenario: Evidence-free enrollment is removed
- **WHEN** an Admin corrects an erroneous enrollment with no retained evidence
- **THEN** source memberships close consistently, editable participant eligibility is reconciled, and an append-only lifecycle event records the correction

#### Scenario: Learner moves sections
- **WHEN** an Admin selects a valid destination section and every active subject has an unambiguous compatible destination
- **THEN** destination memberships are created, source memberships close, editable participants reconcile, and the complete move commits atomically

#### Scenario: Mapping is incomplete
- **WHEN** a destination section lacks or ambiguously contains a compatible class mapping
- **THEN** preview returns `NEEDS_CHOICE` or `IMMUTABLE` with concrete mapping/repair actions and performs no partial move

### Requirement: Class and section maintenance resolves active memberships
The system SHALL preview all target-specific active memberships and require deterministic reconciliation or explicit supported outcomes before archiving a class or section.

#### Scenario: Class has active members
- **WHEN** an Admin archives a class with active learner memberships
- **THEN** preview supplies complete, withdraw/drop, or compatible transfer outcomes and execution changes only target-class dependencies

#### Scenario: Section has active members
- **WHEN** an Admin archives a section with active learners
- **THEN** every learner receives a validated outcome and all section/class/membership changes commit atomically

#### Scenario: Unrelated memberships exist
- **WHEN** sibling-class or section-only memberships are unrelated to the target class
- **THEN** they neither block nor get changed by target-class archival

### Requirement: Account maintenance and purge remain safe and actionable
The system SHALL apply Maintenance Access to non-self account lifecycle sequencing and SHALL route permanent deletion through an evidence-aware preview. It SHALL not allow self-deactivation, self-purge, or deletion of retained official evidence.

#### Scenario: Non-self account lifecycle is corrected
- **WHEN** an Admin archives or restores another account from an operationally inconsistent status during Maintenance Access
- **THEN** the existing transaction and audit complete under a stable maintenance decision

#### Scenario: Self-destructive action is attempted
- **WHEN** an Admin targets their own active account for suspension, deletion, or purge
- **THEN** the system rejects the action as a permanent security boundary

#### Scenario: Purge target has retained evidence
- **WHEN** linked official or lifecycle evidence must be retained
- **THEN** preview returns `IMMUTABLE` and execution cannot delete the target

### Requirement: Web and mobile execute decisions instead of showing dead ends
The web and mobile admin clients SHALL render the shared decision, effects, preserved evidence, warnings, confirmations, and next actions from the backend. Expected domain decisions SHALL NOT degrade into a generic failed-action toast when structured data is available.

#### Scenario: Admin removes learner from class detail
- **WHEN** the Admin starts learner removal from class detail
- **THEN** the client opens lifecycle preview/review and never calls the direct unenrollment mutation as its admin path

#### Scenario: Resolvable blocker is returned
- **WHEN** preview returns supported next actions
- **THEN** the client renders controls that re-preview, navigate to repair, or cancel using those exact actions

#### Scenario: Mobile is offline
- **WHEN** mobile has no verified connection
- **THEN** it disables maintenance execution and does not queue a destructive request

#### Scenario: Session expires during review
- **WHEN** Maintenance Access expires before execute
- **THEN** the client preserves non-secret choices, clears password fields, and routes the actor to reauthenticate Maintenance Access

### Requirement: Existing lifecycle consumers remain compatible during adoption
The system SHALL expose new maintenance routes while keeping existing lifecycle routes delegated to the same backend handlers until required mobile adoption is enforced.

#### Scenario: Current client calls maintenance route
- **WHEN** web or updated mobile calls a maintenance preview or execute route
- **THEN** it receives the shared envelope and decision contract

#### Scenario: Older client calls lifecycle route
- **WHEN** an older supported mobile build calls the equivalent lifecycle route
- **THEN** the same planner/executor handles it without contract-breaking field removal
