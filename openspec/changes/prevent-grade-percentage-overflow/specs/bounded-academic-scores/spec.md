## ADDED Requirements

### Requirement: Every academic score is bounded at its source item
The system SHALL calculate a score from finite base points, non-negative bonus points, and positive possible points; SHALL cap effective points at the source item maximum; and SHALL return a finite percentage from 0 through 100.

#### Scenario: Intentional bonus exceeds the item maximum
- **WHEN** a teacher records 5 base points and 15 bonus points with a reason on a 10-point item
- **THEN** the system records 20 awarded points, 10 effective points, 100%, and a capped adjustment without contributing surplus points to any later calculation

#### Scenario: Accidental base-score overflow
- **WHEN** a teacher enters a base score above the item's HPS without using the bonus control
- **THEN** the system rejects the entry and directs the teacher to correct the base score or record an explicit reasoned bonus

#### Scenario: Item-level cap precedes category aggregation
- **WHEN** a learner has a capped 20-awarded/10-possible item and a separate 0/10 item in the same category
- **THEN** the category numerator is 10, the denominator is 20, and the category percentage is 50%

### Requirement: Assessment submissions contain one response per question
The system SHALL accept at most one response for each attempt/question pair, SHALL grade retries idempotently, and SHALL reject a non-positive or inconsistent grading denominator before persisting a percentage.

#### Scenario: Duplicate correct response payload
- **WHEN** a submission repeats the same 10-point question response twice
- **THEN** the system rejects the duplicate and does not store two responses or a 200% result

#### Scenario: Submission retry
- **WHEN** the same attempt submission is retried after an interrupted response
- **THEN** the system preserves one response per question and produces the same bounded score as the original grading operation

#### Scenario: Invalid assessment denominator
- **WHEN** the question/rubric evidence cannot produce a positive consistent possible-points snapshot
- **THEN** grading stops with an actionable error and no percentage or class-record synchronization is written

### Requirement: Official grades use one policy-aware calculation
The system SHALL use the shared class-record calculation for workbook preview, student standing, finalization, reports of official grade, and performance's class-record component while preserving policy periods, missing-versus-zero, excused HPS, category/exam weights, transmutation, and revision rules.

#### Scenario: Required score is missing
- **WHEN** an eligible learner lacks a required score
- **THEN** official standing remains incomplete instead of treating the missing score as zero

#### Scenario: Explicit zero score
- **WHEN** an eligible learner has an explicit recorded zero
- **THEN** the zero participates in the official formula and satisfies evidence presence

#### Scenario: Valid excused item
- **WHEN** an item is excused with a reason
- **THEN** its HPS remains excluded for that learner according to the existing academic policy

#### Scenario: Bounded weighted grade
- **WHEN** all category weights total 100 and every source item is normalized
- **THEN** each category is within 0–100, each weighted contribution is within its category weight, and the initial, quarterly, annual, and final grades cannot exceed 100

### Requirement: Derived performance never double-counts official evidence
The system SHALL prefer a finalized or complete canonical class-record grade for a class and SHALL use a bounded latest-per-assessment average only when canonical class-record evidence is unavailable.

#### Scenario: Assessment is synchronized into class record
- **WHEN** the same assessment appears in both attempt evidence and the class record
- **THEN** the performance score uses the canonical class-record result rather than averaging the evidence twice

#### Scenario: Class record is incomplete
- **WHEN** canonical class-record calculation reports missing or invalid evidence
- **THEN** the performance class-record component is unavailable and no missing item is converted to zero

### Requirement: Legacy score repair preserves evidence
The system SHALL provide a read-only invariant audit, preserve old values and repair provenance, repair duplicates/range violations deterministically, and recompute only derived projections without fabricating official revisions.

#### Scenario: Legacy percentage exceeds 100
- **WHEN** the preflight audit finds an out-of-range attempt, class-record contribution, final grade, or performance snapshot
- **THEN** the repair records the original value and provenance, bounds the effective projection, and leaves immutable academic evidence recoverable

#### Scenario: Post-repair audit
- **WHEN** migration and recomputation finish
- **THEN** duplicate response groups, invalid denominators, and persisted/returned percentages outside 0–100 all report zero
