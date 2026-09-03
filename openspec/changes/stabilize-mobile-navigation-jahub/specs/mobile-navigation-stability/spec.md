## ADDED Requirements

### Requirement: Five role-owned permanent destinations
The mobile application SHALL render exactly five equal-width permanent bottom destinations for each authenticated role and SHALL derive the visible set from an explicit role discriminator.

#### Scenario: Student opens the permanent navigation
- **WHEN** an authenticated student enters the role workspace
- **THEN** the bottom bar SHALL show Home, Classes, JA, Assessments, and Profile in that order

#### Scenario: Teacher opens the permanent navigation
- **WHEN** an authenticated teacher enters the role workspace
- **THEN** the bottom bar SHALL show Home, Assessments, Classes, Sections, and Profile in that order

#### Scenario: Administrator opens the permanent navigation
- **WHEN** an authenticated administrator enters the role workspace
- **THEN** the bottom bar SHALL show Home, Classes, Assessments, Academic, and Profile in that order

### Requirement: Student-only focal destination
Only the student JA destination SHALL use the elevated focal treatment, and it SHALL occupy the middle slot without changing equal destination geometry.

#### Scenario: Role navigation renders focal styling
- **WHEN** a role bottom bar renders
- **THEN** student JA SHALL be elevated in slot three of five and teacher and administrator destinations SHALL remain flat

### Requirement: Truthful announcement reachability
Teacher and administrator announcement workspaces SHALL remain reachable through labeled role-owned navigation entries even when Announcements is not a permanent bottom destination.

#### Scenario: Teacher launches Announcements
- **WHEN** a teacher selects Announcements from Teacher More
- **THEN** the teacher announcement workspace SHALL open through the existing root-stack route

#### Scenario: Administrator launches Announcements
- **WHEN** an administrator selects Announcements from Admin Home
- **THEN** the administrator announcement workspace SHALL open through the administrator root-stack route

### Requirement: Safe and accessible bottom bar
The bottom-bar background SHALL cover the complete bottom safe area, and every destination SHALL provide at least a 48-pixel touch target, a single-line visual label with controlled scaling, and an unabridged accessibility label.

#### Scenario: Narrow Android layout renders
- **WHEN** a role bar renders at a 320-pixel viewport with a bottom inset
- **THEN** labels SHALL remain on one line, targets SHALL retain equal usable slots, and no transparent safe-area gap SHALL appear below the bar
