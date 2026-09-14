## ADDED Requirements

### Requirement: Complete period records use explicit eligibility and scores
Finalization SHALL require a confirmed period roster, all required configured items/categories, explicit numeric scores or justified exemptions, no unresolved attempts/manual grading/sync, and the applicable policy computation. Empty confirmed rosters SHALL be supported without inventing grade rows.

#### Scenario: Missing and zero differ
- **WHEN** an eligible student has no score for a required item
- **THEN** finalization reports Missing and blocks; an explicitly recorded zero satisfies score presence.

#### Scenario: Excused computation
- **WHEN** a required item is excused with a reason
- **THEN** its HPS is excluded for that learner, while an entirely excused required category blocks finalization.

### Requirement: Official grades preserve immutable revisions
Finalization SHALL append evidence-backed period revisions. Annual grades SHALL require every policy period exactly once for the same logical subject/year/student, with source revision IDs, exact sum/divisor, raw average and rounded final grade. Reopen SHALL invalidate dependent current results without deleting history.

#### Scenario: Transfer between sections
- **WHEN** a learner has different valid period sources for the same subject across sections
- **THEN** annual computation combines them once each; duplicate conflicting period sources require explicit admin resolution.

#### Scenario: Reopening after annual computation
- **WHEN** a contributing period record is reopened
- **THEN** annual results become invalid immediately and prior issued versions remain auditable.

### Requirement: Remediation determines outcomes
A current finalized failed annual learning area without evidenced SRC SHALL produce retention rather than block transition. When SRC evidence exists, legacy failed SRC leads to retention and modern failed SRC creates conditional promotion/back-subject obligations. Three or more original failures lead to retention. Grade 10 SHALL NOT be marked complete with unresolved deficiencies.

#### Scenario: Finalized failure without SRC
- **WHEN** an active learner has at least one current finalized annual result, that result is below the passing grade, and no SRC result exists
- **THEN** the official year outcome is retained and missing SRC does not block transition.

#### Scenario: Modern failed SRC
- **WHEN** a Grade 8 learner still fails one learning area after documented SRC
- **THEN** the outcome is conditional promotion and its obligation survives transition with one active back subject allowed per period.

#### Scenario: Partial current annual set
- **WHEN** every required period record is finalized and an active learner has at least one verified current annual result while another assigned subject has no current annual snapshot
- **THEN** readiness uses the verified non-zero result set without enforcing an exact annual-result count.
