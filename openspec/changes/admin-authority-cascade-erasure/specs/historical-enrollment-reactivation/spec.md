## ADDED Requirements

### Requirement: Enrollment duplicate checks are status-aware
The system SHALL distinguish an active same-class enrollment from a dropped or completed historical same-class row.

#### Scenario: Active duplicate
- **WHEN** an administrator or assigned teacher enrolls a learner who already has an `enrolled` row for the class
- **THEN** the system returns conflict and creates no duplicate row

#### Scenario: Historical same-class row
- **WHEN** the unique same-class row is `dropped` or `completed` and the learner is otherwise eligible for the active class
- **THEN** the system reactivates that row to `enrolled` in the enrollment transaction instead of returning a duplicate conflict

### Requirement: Reactivation records lifecycle evidence
Historical enrollment reactivation SHALL refresh active enrollment metadata and append an explicit lifecycle/audit transition without inventing a second membership row.

#### Scenario: Completed membership is reactivated
- **WHEN** a completed membership is successfully reactivated
- **THEN** the existing row has current enrollment state and timestamps and the lifecycle history records the actor, prior status, new status, class, section, and time

### Requirement: Section promotion uses an active membership
The system SHALL promote a section-level membership to a class only when that section membership is actively enrolled in the class section.

#### Scenario: Historical section row found
- **WHEN** only a dropped or completed section-level row exists
- **THEN** the system does not silently promote it and returns an actionable membership-state error

### Requirement: Class-record participant state is reconciled
Successful class enrollment reactivation SHALL restore `eligible` participant state for mutable current-period class records. Finalized or locked records SHALL use the existing governed reopen and roster-confirmation flow.

#### Scenario: Mutable participant was withdrawn
- **WHEN** the learner is reactivated and a current draft class-record participant exists as `withdrawn` or `not_enrolled`
- **THEN** the participant becomes `eligible` without deleting historical grades

#### Scenario: Participant belongs to finalized evidence
- **WHEN** reactivation encounters a finalized or locked record requiring roster governance
- **THEN** the response identifies the governed next action and does not rewrite finalized evidence
