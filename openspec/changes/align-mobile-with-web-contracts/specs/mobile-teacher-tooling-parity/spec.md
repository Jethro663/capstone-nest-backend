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

### Requirement: Lossless lesson block authoring
Web and mobile SHALL create, edit, reorder, delete, and render every supported lesson block without flattening structured content or sending invalid empty block bodies.

#### Scenario: Teacher creates a block with a canonical default
- **WHEN** an authorized teacher creates a lesson block with a supported type and omits content
- **THEN** the backend SHALL persist the canonical type-specific content shape, preserve any supplied metadata, and return the confirmed block

#### Scenario: Mobile teacher edits structured lesson content
- **WHEN** a mobile teacher edits objectives, key points, a worked example, checkpoint, recap, reflection, image, video, file, or divider
- **THEN** mobile SHALL use the type-specific editor and SHALL preserve the complete structured content and metadata after save and reload

### Requirement: Truthful cross-client lesson preview
Mobile teacher lesson preview SHALL expose Mobile and Web modes without simulating either client renderer or constraining both renderers in a phone-sized comparison.

#### Scenario: Teacher previews the student mobile experience
- **WHEN** a teacher selects Mobile preview
- **THEN** the teacher and student views SHALL render through the same native lesson-block renderer

#### Scenario: Teacher previews the student web experience
- **WHEN** an authorized teacher selects Web preview
- **THEN** the backend SHALL issue a five-minute read-only lesson-scoped preview credential and the web page SHALL render through the existing student web lesson components in a dedicated scrollable WebView without exposing an account JWT

#### Scenario: Web preview renders a protected lesson asset
- **WHEN** the exact web preview requests an image or file referenced by that lesson
- **THEN** the backend SHALL revalidate the preview credential, reject unrelated file IDs, apply the existing file-access policy, and return the referenced bytes without caching or exposing an account JWT

### Requirement: Reviewed and concurrency-safe lesson restore
Mobile SHALL show a version snapshot and change summary before restore, and the backend SHALL reject restoration when the lesson changed after inspection.

#### Scenario: Teacher restores an inspected current version
- **WHEN** an authorized teacher confirms a version using the current inspected lesson timestamp
- **THEN** the backend SHALL preserve the pre-restore snapshot, atomically restore the selected snapshot, audit the action, and return the confirmed lesson

#### Scenario: Lesson changes after version inspection
- **WHEN** a restore request supplies a timestamp that no longer matches the lesson
- **THEN** the backend SHALL return HTTP 409 before any snapshot or lesson write and mobile SHALL require the teacher to refresh and inspect again

### Requirement: Compact and discoverable module authoring
Mobile module detail SHALL prioritize the outline and expose management and insertion actions through explicitly labeled, accessible controls rather than one-action summary rails.

#### Scenario: Teacher manages a module section
- **WHEN** a teacher opens an owned module
- **THEN** lock state SHALL appear in the left context area, Settings SHALL appear on the right, every section SHALL expose a 44 px overflow action with an explicit accessibility label plus Add content, and complex add/attach work SHALL open in a centered scrollable dialog
