## ADDED Requirements

### Requirement: Authenticated versioned capability snapshot
The backend SHALL expose a versioned system capability snapshot to authenticated users using the standard response envelope.

#### Scenario: Authenticated user reads capability state
- **WHEN** an authenticated user requests `/api/system/capabilities`
- **THEN** the response contains version, observation time, role scope, and semantic entries for academic operations, Maintenance Access, dependency readiness, and workflow diagnostics

#### Scenario: Anonymous user is denied
- **WHEN** an unauthenticated caller requests the capability snapshot
- **THEN** the global authentication guard rejects the request

### Requirement: Existing owners remain authoritative
The snapshot SHALL compose current owner-service results and SHALL NOT persist or calculate replacement academic, maintenance, readiness, or workflow policy.

#### Scenario: Owner state changes
- **WHEN** an authoritative owner returns a different current state
- **THEN** the next uncached snapshot reflects that owner result without a separate settings mutation

### Requirement: Partial failures remain explicit
Failure of one owner SHALL produce an `unknown` entry with a stable reason code without fabricating disabled state for other capabilities.

#### Scenario: Academic owner is unavailable
- **WHEN** academic state retrieval fails while readiness remains available
- **THEN** academic operations are `unknown` and the other capability entries retain their truthful states

### Requirement: Role-sensitive details stay private
The snapshot SHALL expose only semantic capability fields and SHALL NOT expose Maintenance Access session identifiers, reasons, rule lists, or workflow record identifiers.

#### Scenario: Student reads snapshot
- **WHEN** a student reads the snapshot
- **THEN** admin-only capabilities are marked not allowed without protected session or job details
