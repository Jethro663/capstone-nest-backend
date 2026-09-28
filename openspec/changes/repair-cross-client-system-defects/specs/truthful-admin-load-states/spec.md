## ADDED Requirements

### Requirement: Failed reads are distinct from successful empty data
Affected web and mobile admin screens SHALL render request rejection as an error state with retry and SHALL render business empty-state copy only after a successful empty response.

#### Scenario: Initial read fails
- **WHEN** Calendar or Announcements receives an authorization, network, or server error before any successful data
- **THEN** the screen shows an error and retry action and does not claim there are no records

#### Scenario: Successful response is empty
- **WHEN** the server successfully returns an empty collection
- **THEN** the existing no-records guidance is shown

### Requirement: Refresh failure preserves known data
Affected screens SHALL retain the last successful rows when a later refresh fails and SHALL indicate that refresh failed.

#### Scenario: Refresh fails after rows loaded
- **WHEN** a screen has displayed successful data and a subsequent refresh request fails
- **THEN** the prior rows remain visible with a retryable refresh error
