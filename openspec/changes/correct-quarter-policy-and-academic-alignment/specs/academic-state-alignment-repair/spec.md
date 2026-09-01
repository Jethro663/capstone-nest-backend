## ADDED Requirements

### Requirement: Alignment preview is read-only and deterministic
The backend SHALL provide a repeatable-read, read-only preview containing candidate classes, linked sections, dependent-record counts, blockers, warnings, required confirmations, and a SHA-256 hash of canonical sorted manifest data.

#### Scenario: Identical preview inputs and data
- **WHEN** the same state, policies, selected classes, sections, and evidence are previewed twice
- **THEN** both responses have the same manifest hash and no data is changed.

### Requirement: Alignment execution is authenticated and concurrency safe
Execution MUST require Admin role, current-password step-up, reason, exact required confirmations, and a manifest that matches data recomputed under the academic transaction lock.

#### Scenario: State changes after preview
- **WHEN** the state version or any manifest input changes before execution
- **THEN** execution returns a conflict and commits no writes.

### Requirement: Alignment preserves official identities and evidence
Execution SHALL atomically update the authoritative state, corrected policy snapshots, selected class years, wholly selected section years, and explicitly confirmed legacy-evidence years while retaining all record identifiers and references.

#### Scenario: Result-bearing class is confirmed
- **WHEN** the reviewed manifest includes a class with final grades and its required result-bearing confirmation
- **THEN** its class and preserved legacy-evidence year are updated together and the audit records complete before/after values.

### Requirement: Ambiguous official data blocks alignment
Execution MUST reject mixed sections, duplicate target logical classes, unselected source classes in a moved section, and source/target annual grades, outcomes, external grades, source selections, or period revisions.

#### Scenario: Annual result appears after preview
- **WHEN** an annual grade is created before execution
- **THEN** the recomputed manifest is unsafe and no alignment writes are committed.
