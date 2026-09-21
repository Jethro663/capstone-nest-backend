## ADDED Requirements

### Requirement: Semantic presentation ownership
The mobile application SHALL source active UI colors from the approved semantic mobile token authority and SHALL reject unapproved numeric color literals in active UI consumers.

#### Scenario: Active UI source is audited
- **WHEN** the mobile design audit scans production UI source
- **THEN** it reports no numeric hex, rgb, or rgba literal outside documented token, native-generation, generated-output, test, mock, or historical-dump boundaries

#### Scenario: A screen introduces a raw color
- **WHEN** an active screen adds an unapproved numeric color literal
- **THEN** the design audit fails with a deterministic file and line diagnostic

### Requirement: Shared action hierarchy
The mobile application SHALL render primary, secondary, tertiary, icon, and inverse-header actions through the shared action contract while preserving rows, cards, and persistent option controls as their appropriate component types.

#### Scenario: Main action is rendered
- **WHEN** a role screen renders a primary or secondary user action
- **THEN** it uses the shared hierarchy with consistent sizing, state, and semantic colors

#### Scenario: Navigable record row is rendered
- **WHEN** a list record or card navigates to detail
- **THEN** it may remain a row or card interaction and is not mechanically restyled as a button

### Requirement: Visible shared header controls
Every mobile app-bar menu, Back, close, refresh, notification, history, and overflow action SHALL remain visibly distinct from the navy app-bar surface and SHALL expose an accessibility label with at least a 44 px target.

#### Scenario: Root role screen renders its menu
- **WHEN** student, teacher, or admin root content renders the shared menu control
- **THEN** the control uses inverse surface and foreground roles that do not resolve to white-on-white

#### Scenario: Nested screen renders Back
- **WHEN** a nested role screen uses the shared Back fallback
- **THEN** the same visible inverse and accessibility contract applies without changing Back behavior

### Requirement: Shared drawer presentation
The role drawer SHALL use a navy identity header, neutral reading body, semantic selected state, inverse close control, and the existing role-scoped navigation behavior.

#### Scenario: Drawer opens for any role
- **WHEN** the drawer opens for student, teacher, or admin
- **THEN** it renders the same structural design system while retaining only that role's destinations and callbacks

### Requirement: Native and generated alignment
Android launcher, splash, system bars, and generated rich-text presentation SHALL use the approved semantic structural and reading roles.

#### Scenario: Native resources are audited
- **WHEN** the mobile design audit checks app configuration and Android resource owners
- **THEN** adaptive icon, splash, status bar, and navigation bar values match the approved role mapping

#### Scenario: Rich-text bundle is rebuilt
- **WHEN** the assessment rich-text generator runs
- **THEN** its output uses the approved structural, intent, reading, border, and state roles from the build source
