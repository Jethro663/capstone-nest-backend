## ADDED Requirements

### Requirement: Complete-profile gate
Mobile SHALL prevent authenticated users with an incomplete required profile from entering role workspaces until the profile is completed.

#### Scenario: Authenticated profile is incomplete
- **WHEN** the current user is missing a required first or last name
- **THEN** mobile SHALL route to a completion screen and SHALL resume the correct role workspace only after a confirmed update/refetch

### Requirement: Password change
Authenticated mobile users SHALL be able to change their password through the backend password-change contract with the same validation and failure behavior as web.

#### Scenario: Password change succeeds
- **WHEN** the user supplies the correct current password and a valid confirmed new password
- **THEN** mobile SHALL show success only after backend confirmation and SHALL clear sensitive inputs

### Requirement: Domain-correct navigation
Every visible role navigation label SHALL open a screen for that domain, every required domain SHALL remain reachable through a truthful role-owned navigation entry, and notifications SHALL not substitute for announcements. A required domain does not need to occupy a permanent bottom tab when it remains clearly reachable from a role workspace.

#### Scenario: Teacher opens Announcements
- **WHEN** a teacher selects the Announcements entry from Teacher More
- **THEN** mobile SHALL open the teacher announcement workspace rather than the notification inbox

#### Scenario: Administrator opens Announcements
- **WHEN** an administrator selects the Announcements quick launch from Admin Home
- **THEN** mobile SHALL open the administrator announcement workspace rather than the notification inbox

### Requirement: Read all notifications
Mobile SHALL expose the backend read-all notification mutation and refresh unread state after success.

#### Scenario: User marks all notifications read
- **WHEN** the read-all mutation succeeds
- **THEN** the notification list and unread count SHALL be invalidated and reflect zero unread items
