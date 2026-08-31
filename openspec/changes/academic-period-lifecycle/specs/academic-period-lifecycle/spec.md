## ADDED Requirements

### Requirement: School-year policy is explicit and historical
The backend SHALL persist a policy snapshot per school year, expose its permitted period keys/labels, and apply legacy, 2026 adjusted, and 2027 zero-based rules as defined in the authoritative design.

#### Scenario: Different school-year structures
- **WHEN** a teacher opens 2025–2026 and 2026–2027 class records
- **THEN** the former offers four quarters and the latter three terms, with unchanged historical grade evidence.

### Requirement: Admin activation is authenticated and concurrency safe
Activation MUST verify role, password, expected year/period/version, sequential movement or explicit reasoned override, and audit atomically without finalizing records.

#### Scenario: Stale activation
- **WHEN** an admin submits a state version that has already changed, even if the quarter has returned to the same key
- **THEN** activation returns a conflict and changes nothing.

### Requirement: Assessment release and grading are separate
Drafts SHALL permit future-period preparation; new release/attempts require current year/period. In-flight attempts SHALL remain completable after advancement; past results remain visible. Result-bearing assessments SHALL NOT move periods. Future work SHALL remain hidden from students.

#### Scenario: Advancement during attempt
- **WHEN** a student started an allowed attempt before period activation advances
- **THEN** completion and subsequent legitimate grading remain possible under existing attempt deadlines.

#### Scenario: Direct API release
- **WHEN** a caller directly publishes or starts a future-period assessment, including core/public/upload paths
- **THEN** the backend rejects it regardless of client controls.
