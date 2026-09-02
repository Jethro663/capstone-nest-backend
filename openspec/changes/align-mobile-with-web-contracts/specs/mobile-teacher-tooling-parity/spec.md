## ADDED Requirements

### Requirement: Official audited report export
Mobile SHALL download official report CSV from the backend export contract using the selected report and filters.

#### Scenario: Teacher exports an official report
- **WHEN** a teacher requests an official CSV
- **THEN** the backend SHALL generate all scoped rows, record the report export audit event, and mobile SHALL share the protected response with its server filename/columns intact

### Requirement: Complete teacher content lifecycle
Mobile SHALL support the basic web teacher lifecycle for lessons, modules, sections, grading scales, assessments, and library resources where the backend authorizes teacher use.

#### Scenario: Teacher edits a module section
- **WHEN** a teacher changes an owned module section using the current backend contract
- **THEN** mobile SHALL persist the change, invalidate the relevant module queries, and render the confirmed state

#### Scenario: Teacher restores a lesson version
- **WHEN** a teacher selects an owned historical lesson version
- **THEN** mobile SHALL call the version restore contract and refresh the lesson/editor without losing server-confirmed content

#### Scenario: Teacher manages library folders and indexing
- **WHEN** an authorized teacher creates, updates, deletes, or opens folders or retries eligible indexing
- **THEN** mobile SHALL preserve pagination, scope, and backend error state and refresh affected library queries

### Requirement: Teacher assessment insights and bulk actions
Mobile SHALL expose backend-supported submission statistics, question analytics, attempt lists, rubric review, and guarded bulk return actions needed for web-equivalent grading operations.

#### Scenario: Teacher reviews assessment analytics
- **WHEN** analytics exist for an owned assessment
- **THEN** mobile SHALL display backend totals and question metrics without deriving official values from a truncated client list
