## ADDED Requirements

### Requirement: Guided creation without premature writes
New Assignment SHALL open one accessible three-step wizard with question and file-upload format explanations, class-record setup, and name/schedule details. Back SHALL preserve choices. Reduced motion and small screens SHALL be supported.

#### Scenario: Dismiss setup
- **WHEN** the teacher opens and closes the wizard before submitting
- **THEN** no assessment or workbook is created

#### Scenario: Choose a format
- **WHEN** a format is selected
- **THEN** the wizard advances to class-record setup and permits returning to format selection

### Requirement: Authoritative placement context
The backend SHALL expose a read-only, ownership-checked context containing policy labels, preparation/release capabilities, workbook state and slot availability. The wizard SHALL show the proposed destination and permit exact-slot selection.

#### Scenario: Missing workbook
- **WHEN** no workbook exists for the selected period
- **THEN** setup explains that creation will generate it and performs no write until final submission

#### Scenario: Slot conflict
- **WHEN** the displayed slot becomes occupied before submission
- **THEN** creation fails atomically and the wizard refreshes placement while preserving other input

### Requirement: Atomic draft creation and retry
Final submission SHALL create one unpublished assessment with all selected setup values using the existing idempotent editor transaction. Uncertain retries SHALL retain the exact payload and mutation identity, scoped to actor and class.

#### Scenario: Lost response
- **WHEN** the teacher retries after a response is lost
- **THEN** the original assessment is recovered without another draft or placement

### Requirement: Skip and publish readiness
After choosing a format the teacher SHALL be able to skip setup and create an unplaced unpublished draft. Publication SHALL require a valid period, category and actual matching class-record placement.

#### Scenario: Skip selected settings
- **WHEN** the teacher chooses Skip setup and start editing
- **THEN** only the selected format and valid default period are applied, with no class-record reservation or due date

#### Scenario: Publish an unplaced draft
- **WHEN** a client attempts to publish an otherwise complete unplaced assessment
- **THEN** the backend returns actionable placement errors while still allowing draft saves

### Requirement: Format-specific delivery and editor handoff
Question assignments SHALL expose max attempts. File-upload assignments SHALL explain revision/latest-submission behavior without an ineffective attempt cap. Schedule SHALL show its timezone and an explicit no-due-date choice. The editor SHALL reload saved truth and display the created draft destination.

#### Scenario: File-upload creation
- **WHEN** a file-upload draft is created
- **THEN** it opens with saved settings and access to upload instructions, and students cannot see it until publication

### Requirement: Immutable format after creation
The selected assessment format SHALL be fixed by the first durable creation. Web and mobile editors SHALL expose no format-changing control, and the backend SHALL reject a different type from every update path while accepting unchanged legacy submissions.

#### Scenario: Attempt to change an existing format
- **WHEN** any client submits a different type for an existing assessment
- **THEN** the backend rejects the mutation with an actionable immutable-format error and preserves the assessment

#### Scenario: Edit an existing assessment
- **WHEN** a teacher opens Settings after creation
- **THEN** no assessment-format selector is available and ordinary settings remain editable

### Requirement: Native mobile creation parity
Every mobile New Assessment entry point SHALL open a native three-step modal matching the web decisions: question or file-upload format, authoritative class-record placement, then name and schedule. It SHALL support Back, Skip, no-write dismissal, question-only attempts, exact-slot creation, reduced motion and small screens.

#### Scenario: Complete mobile setup
- **WHEN** a teacher completes the native wizard
- **THEN** one unpublished assessment is created atomically and the editor opens with backend-derived confirmation

#### Scenario: Resume an uncertain mobile creation
- **WHEN** the app loses or cannot classify the creation response
- **THEN** reopening presents only a retry of the exact actor-and-class-scoped request and cannot create a different draft

#### Scenario: Mobile slot race
- **WHEN** another assessment takes the proposed slot before mobile submission
- **THEN** mobile refreshes context, retains other inputs, returns to placement and does not create a partial assessment
