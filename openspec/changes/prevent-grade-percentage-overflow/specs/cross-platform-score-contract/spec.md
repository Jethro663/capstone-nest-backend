## ADDED Requirements

### Requirement: Assessment score responses are semantically explicit
The backend SHALL expose `scorePercent` and a point breakdown containing base, bonus, awarded, possible, effective, capped-state, and adjustment-reason values; the legacy `score` field SHALL remain an equal percentage compatibility alias for this release.

#### Scenario: Five points on a ten-point assessment
- **WHEN** a returned attempt earned 5 effective points from 10 possible
- **THEN** the response contains `scorePercent: 50`, legacy `score: 50`, and a breakdown showing `5/10`

#### Scenario: Capped bonus result
- **WHEN** an attempt has 20 awarded points but 10 possible points
- **THEN** the response contains 10 effective points, 100%, a capped state, and the bonus reason while legacy `score` remains 100

### Requirement: Web and mobile present the same points and percentage
Student, teacher, and admin web/mobile consumers SHALL render effective points over possible points and the bounded percentage from the backend contract, and SHALL disclose a capped bonus adjustment without displaying an impossible contribution.

#### Scenario: Student views attempt history
- **WHEN** the backend returns 5 effective points, 10 possible points, and 50%
- **THEN** every student web/mobile history and result surface shows `5/10` and `50%`, never `50/10` or `500%`

#### Scenario: Teacher reviews learner history
- **WHEN** a teacher opens the same learner on web or mobile
- **THEN** both surfaces show the same point breakdown, percentage, return status, and capped-bonus note

#### Scenario: Admin reviews academic records or reports
- **WHEN** an admin opens the shared workbook, report, or export
- **THEN** the values match the canonical backend grade and include auditable adjustment information where applicable

### Requirement: Clients do not calculate official percentages
Web and mobile SHALL consume backend score percentages and official grades directly; client arithmetic SHALL be limited to presentation formatting and SHALL NOT divide an existing percentage by possible points or rebuild category/overall grades.

#### Scenario: Mobile profile average
- **WHEN** an assessment attempt has `scorePercent: 50` and `possiblePoints: 10`
- **THEN** the mobile profile contributes 50 to the assessment average rather than recalculating 500

#### Scenario: Overall grade progress visualization
- **WHEN** a backend overall grade is returned
- **THEN** the text, accessibility value, progress width, reports, and exports all use the same bounded number

### Requirement: Official and diagnostic values are clearly distinguished
The clients SHALL label the canonical class-record value as the official or current grade and SHALL label assessment averages/performance estimates as diagnostic signals that cannot replace official records.

#### Scenario: Canonical class-record grade exists
- **WHEN** both an official class-record grade and assessment diagnostics are available
- **THEN** the grade surface presents the canonical grade and keeps assessment diagnostics separately labeled without blending them into a second overall grade

#### Scenario: Official grade is unavailable
- **WHEN** class-record evidence is incomplete
- **THEN** the client shows the official grade as incomplete or unavailable and may show a separately labeled bounded assessment average
