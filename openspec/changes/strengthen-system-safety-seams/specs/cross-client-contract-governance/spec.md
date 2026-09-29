## ADDED Requirements

### Requirement: New contracts are represented across all clients
The administrator contract manifest SHALL require the system-capability and workflow-diagnostics endpoint tokens and fields in backend, web, and mobile sources.

#### Scenario: A client omits a required capability field
- **WHEN** a listed backend capability field is absent from the web or mobile contract sources
- **THEN** the administrator contract gate fails with the contract, layer, and field name

### Requirement: Shared type surfaces have a reviewed baseline
The repository SHALL maintain a deterministic baseline of common web/mobile type filenames with an explicit `tracked` or `deferred` classification and reason.

#### Scenario: A new common type surface appears
- **WHEN** the same new type filename exists in web and mobile but is absent from the baseline
- **THEN** the coverage gate fails and names the unclassified surface

#### Scenario: Existing classified debt remains
- **WHEN** a baseline entry is classified as deferred with a reason
- **THEN** the gate reports it without claiming semantic parity and does not fail solely for that existing classification

### Requirement: Coverage reports are deterministic
The coverage gate SHALL sort and validate baseline entries so identical repository state produces identical output.

#### Scenario: Baseline has duplicate or stale entries
- **WHEN** a baseline filename is duplicated or no longer common to both clients
- **THEN** the gate fails with an actionable baseline error
