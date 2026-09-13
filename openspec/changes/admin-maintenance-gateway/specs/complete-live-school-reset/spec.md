## ADDED Requirements

### Requirement: Full Reset removes the complete live school dataset
The system SHALL treat Full Reset as a separate destructive operation that clears all live school and academic data, including finalized grade rows and their live source records, and every account except the initiating administrator. Per-record maintenance or academic safeguards SHALL NOT block reset after the reset's own authorization, preview, coordination, and verification gates pass.

#### Scenario: Finalized academic data exists
- **WHEN** an authorized Full Reset executes against a valid preview containing finalized grades, class records, attempts, and related live academic evidence
- **THEN** those live rows are cleared with the rest of the cataloged school dataset

#### Scenario: Other accounts exist
- **WHEN** a valid Full Reset executes with student, teacher, or other administrator accounts present
- **THEN** every account except the initiating active verified administrator and that administrator's single Admin role is removed

#### Scenario: Maintenance policy would block record deletion
- **WHEN** an individual record is ordinarily immutable or evidence-aware purge would refuse it
- **THEN** the dedicated Full Reset coordinator proceeds according to its own catalog and does not call the per-record policy as authority

### Requirement: Full Reset preserves only required system and reset evidence
The system SHALL preserve the minimum state required to boot, authenticate the initiating administrator, run migrations, distribute releases, retain grading configuration, and prove/reset/recover the operation. Preserved state SHALL include roles, migrations, app versions, academic-year policies, transmutation tables, reset control/receipts/evidence, audit logs, score-repair evidence, lifecycle operations, and enrollment lifecycle events.

#### Scenario: Reset completes successfully
- **WHEN** every database, queue, storage, participant, cache, and verification phase succeeds
- **THEN** exactly one initiating Admin account and one selected academic-system state remain alongside the documented system and evidence allowlist

#### Scenario: Audit data contains historical values
- **WHEN** preserved audit or reset evidence contains snapshots of deleted school data
- **THEN** the ordinary school workspace remains empty and the system labels that history as reset/audit evidence rather than live academic data

### Requirement: Maintenance state cannot survive Full Reset
The system SHALL explicitly classify and clear Maintenance Access sessions and legacy Demo Mode state during Full Reset, and SHALL increment the retained administrator's session version.

#### Scenario: Maintenance Access is active
- **WHEN** Full Reset commits while any maintenance session exists
- **THEN** all maintenance sessions are removed or revoked, old access and refresh credentials fail, and the retained administrator signs in again

#### Scenario: New table is missing from catalog
- **WHEN** an application table or reset-sensitive state is not classified by the exact reset catalog
- **THEN** reset preview or execution fails closed before destructive database work

### Requirement: Full Reset remains governed and is not a release smoke test
The system SHALL keep its current preview, current-password step-up, exact environment/year/period confirmation, acknowledgements, idempotency, maintenance/write barriers, worker fencing, durable recovery, asset/queue cleanup, and post-reset verification. Deployment permission SHALL NOT imply permission to execute Full Reset against live school data.

#### Scenario: Release is verified
- **WHEN** the feature is built, tested, packaged, deployed, and checked live
- **THEN** live verification uses non-destructive capability/status/health checks and does not execute Full Reset

#### Scenario: Reset phase fails after database commit
- **WHEN** external cleanup or verification fails after live rows are deleted
- **THEN** the system remains in resumable maintenance and does not report completion until residual data is cleared and verified
