## ADDED Requirements

### Requirement: Actionable teacher home hierarchy
Teacher Home SHALL prioritize the next teaching task, attention items, and today's agenda using the shared mobile interface system.

#### Scenario: Teacher opens Home with scheduled work
- **WHEN** the dashboard has an upcoming class or task
- **THEN** Home SHALL show it in the primary Next Up region, present attention items compactly, and avoid redundant page-title components

### Requirement: Compact notification workspace
The teacher notification page SHALL remove descriptive top-bar copy and large statistic cards, and SHALL expose compact counts plus the shared search and filter interaction.

#### Scenario: Teacher filters unread notifications
- **WHEN** a teacher selects Unread from the filter sheet
- **THEN** the active filter SHALL remain visible without a horizontal filter-button row and the notification list SHALL show the matching records

### Requirement: Quiet and discoverable module actions
Teacher module detail SHALL prioritize the outline while exposing item actions through accessible 44 px overflow controls with explicit labels and an action sheet.

#### Scenario: Teacher manages a module item
- **WHEN** a teacher activates an item's labeled overflow control
- **THEN** the action sheet SHALL expose the authorized management actions, while lock state, Settings, Add content, and Arrange remain discoverable in their task context

### Requirement: Truthful two-mode lesson preview
Teacher lesson preview on mobile SHALL expose Mobile and Web modes without a Compare mode or simulated renderer.

#### Scenario: Teacher opens Mobile preview
- **WHEN** Mobile is selected
- **THEN** the preview SHALL use the same native lesson-block renderer as the student lesson surface

#### Scenario: Teacher opens Web preview
- **WHEN** Web is selected
- **THEN** the existing lesson-scoped secure preview URL SHALL render in a WebView with one dedicated vertical scroll owner and SHALL remain usable for long content

### Requirement: Searchable and visibly paginated assessments
The teacher assessment list SHALL provide search, shared filters, and visible bounded display pagination over the complete result collected through the existing paginated backend contract.

#### Scenario: Teacher searches and changes filters
- **WHEN** a teacher changes the search query, status, or assessment type
- **THEN** filtering SHALL apply to the complete collected result, the display page SHALL reset to one, and the list SHALL show page position with valid previous and next controls

### Requirement: Scannable assessment workspace
Assessment detail SHALL present a compact overview, meaningful score states, shared submission filters, and interactive question analytics using only the existing backend metrics.

#### Scenario: Teacher opens an analytics question
- **WHEN** a teacher activates a question analytics row
- **THEN** the app SHALL show available correctness counts, percentage, average points, option distribution, and text-answer samples without inventing learner identities or deriving official totals from a truncated list

### Requirement: Focused submission review
Submission review SHALL keep the active score and review controls available, provide question navigation, and visually distinguish the learner answer, correct answer, and scoring state.

#### Scenario: Teacher reviews a question response
- **WHEN** a teacher selects a question in an attempt
- **THEN** the response and expected answer SHALL be readable at a glance, the score state SHALL be highlighted semantically, and authorized scoring actions SHALL remain available without large summary-stat cards

### Requirement: Teacher behavior and contract preservation
The redesign SHALL preserve existing routes, backend requests, RBAC, query invalidation, grading rules, secure preview credentials, and academic lifecycle behavior.

#### Scenario: Redesigned action completes
- **WHEN** a teacher performs an existing authorized action through a redesigned control
- **THEN** the app SHALL call the same authoritative backend contract and refresh the same affected data as before the redesign

