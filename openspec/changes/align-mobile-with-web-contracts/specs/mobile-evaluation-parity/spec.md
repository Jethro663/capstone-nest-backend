## ADDED Requirements

### Requirement: Durable teacher evaluation dashboard and submission
Mobile SHALL read the backend-owned student teacher-evaluation dashboard and SHALL submit the same class, grading period, evaluation type, ratings, and optional comment contract used by web.

#### Scenario: Student submits a pending teacher evaluation
- **WHEN** a student submits valid ratings for a pending class evaluation
- **THEN** mobile SHALL wait for server confirmation, refetch the dashboard, and show the evaluation as completed after application restart

#### Scenario: Teacher-evaluation request fails
- **WHEN** the dashboard or submission request fails, times out, or is rejected
- **THEN** mobile SHALL expose the failure, SHALL keep the item pending, and SHALL NOT return sample records or a success response

### Requirement: Current teacher evaluation analytics
Mobile SHALL consume and render the current teacher summary response containing classes, periods, overview, category averages, comments, and trends.

#### Scenario: Summary contains real submissions
- **WHEN** the backend returns a summary with nonzero response and category data
- **THEN** mobile SHALL render those values without translating missing legacy fields into zeros or empty rows

### Requirement: Assigned system evaluations
Student and teacher mobile users SHALL be able to list and submit backend-assigned system evaluations, and administrators SHALL manage campaigns when admin mobile parity is enabled.

#### Scenario: Respondent completes an assigned system evaluation
- **WHEN** an eligible student or teacher submits question ratings and optional feedback
- **THEN** the assignment SHALL be persisted through the assigned-system-evaluation endpoint and move to completed state after refetch

#### Scenario: Administrator manages a campaign
- **WHEN** an authorized administrator creates, filters, or changes the status of a system-evaluation campaign
- **THEN** mobile SHALL use the same campaign contract, validation, and role enforcement as web
