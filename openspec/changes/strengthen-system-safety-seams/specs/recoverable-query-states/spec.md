## ADDED Requirements

### Requirement: Query failure is distinct from successful empty data
Touched web and mobile admin screens SHALL distinguish initial loading, successful empty data, successful data, and initial request failure.

#### Scenario: Initial request fails
- **WHEN** a capability or workflow request is rejected before any successful data exists
- **THEN** the screen presents an error with retry and does not present a truthful empty-state action

### Requirement: Cached data survives refresh failure
Touched screens SHALL preserve the last successful data when a background refresh fails and SHALL identify it as potentially stale.

#### Scenario: Refresh fails after success
- **WHEN** a screen has successful data and a later refresh fails
- **THEN** the previous data remains visible with a stale-data notice and retry action

### Requirement: Navigation remains stable
Capability-fetch failure SHALL NOT remove existing settings or diagnostic destinations.

#### Scenario: Capability snapshot is unavailable
- **WHEN** the snapshot request fails
- **THEN** existing destinations remain visible and affected statuses render as unknown rather than hidden or disabled by inference

### Requirement: Retry is accessible
Recovery actions SHALL have meaningful labels and usable touch/keyboard semantics on their platform.

#### Scenario: User retries a failed request
- **WHEN** the user activates Retry
- **THEN** the same query is requested again and the UI exposes retrying state without duplicate concurrent actions
