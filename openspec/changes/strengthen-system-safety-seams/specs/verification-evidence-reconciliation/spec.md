## ADDED Requirements

### Requirement: Outstanding evidence tasks are explicitly classified
Each currently unchecked task in the six selected historical OpenSpec changes SHALL be classified as satisfied by named evidence, superseded by a named newer release, or still unverified.

#### Scenario: Current release supersedes an old package task
- **WHEN** a task is tied only to an obsolete APK version and the current release satisfies the same artifact contract
- **THEN** the reconciliation records the replacing version and revision before resolving the task

#### Scenario: Evidence remains unavailable
- **WHEN** a task requires physical-device, emulator-width, or authenticated-live behavior that was not exercised
- **THEN** the task remains unchecked and the exact missing evidence is recorded

### Requirement: Evidence types are not conflated
Static tests, builds, CI, provider deployment, public health, authenticated acceptance, emulators, and physical devices SHALL be reported as distinct evidence classes.

#### Scenario: Build succeeds without a device walkthrough
- **WHEN** an APK passes build, signature, archive, and checksum validation but is not installed on a device
- **THEN** packaging evidence is recorded and device acceptance remains unverified

### Requirement: Reconciliation is traceable
The reconciliation report SHALL map every classified task to its change path, task number, disposition, and evidence or missing boundary.

#### Scenario: Reviewer audits reconciliation
- **WHEN** a reviewer opens the reconciliation report
- **THEN** every one of the 23 starting unchecked tasks can be traced to one disposition without relying on inference-only completion
