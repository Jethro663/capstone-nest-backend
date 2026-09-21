## ADDED Requirements

### Requirement: Shared semantic mobile brand system
Mobile SHALL use one role-neutral semantic color and spacing system in which dark navy owns structural navigation, red owns primary intent and urgency, and neutral surfaces own reading content across teacher, student, and admin roles.

#### Scenario: User moves between role-owned screens
- **WHEN** a user opens teacher, student, or admin screens that use the shared shell
- **THEN** the app bar, canvas, text, border, action, and status colors SHALL resolve from the same semantic roles without changing domain permissions or behavior

### Requirement: Consistent mobile action hierarchy
Mobile SHALL expose primary, secondary, tertiary, and icon-or-overflow action variants with consistent shape, state, feedback, and accessibility behavior.

#### Scenario: Screen renders actions with different importance
- **WHEN** a screen shows a primary task, a supporting task, a low-emphasis task, and an item menu
- **THEN** each action SHALL use the corresponding shared variant, disabled and loading states SHALL remain distinguishable, and every interactive target SHALL be at least 44 px

### Requirement: Unified record filter interaction
Mobile record lists SHALL use a compact shared filter trigger and modal bottom sheet instead of side-by-side filter-pill rows.

#### Scenario: User changes a list filter
- **WHEN** a user opens the filter trigger and selects an option
- **THEN** the sheet SHALL close, the trigger SHALL display the active value, accessibility state SHALL update, and the owning list SHALL reset any display page that is no longer valid

### Requirement: Content modes remain segmented tabs
Mobile SHALL use segmented tabs only for persistent content modes and SHALL not use the filter-sheet interaction for content-mode navigation.

#### Scenario: User switches an assessment workspace
- **WHEN** a user selects Overview, Submissions, or Analytics
- **THEN** the shared segmented control SHALL display the active mode and preserve the route's existing domain behavior

### Requirement: App bar owns screen identity
Mobile screens using the shared shell SHALL render a navy safe-area-aware app bar as the single owner of the page title and navigation actions.

#### Scenario: Screen previously had a duplicate context strip
- **WHEN** the screen title already identifies the page
- **THEN** the screen SHALL not render a second title, kicker, or decorative page-name strip directly below the app bar

