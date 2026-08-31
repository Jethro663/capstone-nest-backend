## ADDED Requirements

### Requirement: Safe assessment draft editing
The system SHALL save assessment metadata and question edits atomically, preserve unchanged content, reject stale revisions and replay successful mutation identifiers without duplicate writes.

#### Scenario: Unfinished draft
- **WHEN** a teacher saves permitted draft content with unanswered authoring fields
- **THEN** the draft is preserved and publication issues are returned without publishing

#### Scenario: Failed question write
- **WHEN** any part of a save fails
- **THEN** metadata, questions and options remain at their previous committed state

### Requirement: Complete AI assessment settings
The system SHALL retain teacher-selected academic and delivery settings through generation, review, retry and idempotent application to an unpublished assessment.

#### Scenario: Review settings without regeneration
- **WHEN** a teacher changes assessment settings on an unapplied job
- **THEN** generated questions remain unchanged and application uses the reviewed settings

### Requirement: Usable mobile authoring
The mobile teacher editor SHALL expose Questions, Settings and Preview with explicit save status, device recovery, compact rich text and actionable academic restrictions.

#### Scenario: Invalid historical period
- **WHEN** an assessment has an invalid or missing grading period
- **THEN** the teacher receives administrator-repair guidance without bypassing historical evidence safeguards
