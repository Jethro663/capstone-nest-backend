## ADDED Requirements

### Requirement: Transition evaluates the expected matrix atomically
Transition SHALL acquire the shared academic lock before rebuilding expected classes, students, periods, annual results, and remediation. It SHALL require the last policy period, expected state version, immediate next year, and no target conflicts. It SHALL never auto-finalize drafts and SHALL reset the next year to its first period.

#### Scenario: Only existing records are finalized
- **WHEN** one required period or learning area has no record
- **THEN** readiness and transition remain blocked with the responsible class/teacher and period identified.

#### Scenario: Concurrent reopen or enrollment
- **WHEN** another academic mutation races transition
- **THEN** transactions serialize and readiness cannot consume stale sources or omit a newly eligible learner.

### Requirement: Notifications and client workflows use shared readiness
Web and mobile SHALL consume server periods, capabilities, completeness and annual results. Exports SHALL use the same official annual source. Notifications SHALL group blockers by teacher and deduplicate repeated identical runs; none SHALL escape rollback.

#### Scenario: Missing record reminder
- **WHEN** an admin reminds teachers and a class lacks Term 2
- **THEN** the responsible teacher receives one grouped message identifying Term 2 and a destination to repair it.

### Requirement: Legacy migration is non-destructive and repairable
Migration SHALL preserve official evidence without inventing grades or eligibility. Read-only audit and explicit audited repair SHALL handle unknown rosters, invalid periods/weights, missing transfer evidence and conflicting sources. Verification SHALL cover fresh/upgrade migration, runtime transition/rollback, and both affected clients.

#### Scenario: Ambiguous historic scores
- **WHEN** historical final grades were computed with missing score rows
- **THEN** migration preserves them as legacy evidence and reports the ambiguity instead of declaring new annual results trustworthy.
