## ADDED Requirements

### Requirement: Affected admin forms use backend academic state
Web Admin Calendar and mobile Admin Calendar, Classes, and Sections SHALL initialize blank school-year creation fields from the authenticated backend current academic-state contract rather than device time.

#### Scenario: Official year differs from device year
- **WHEN** the backend current school year differs from the browser or device calendar-derived year
- **THEN** each affected blank creation form initially displays the backend school year

#### Scenario: Academic state cannot be loaded
- **WHEN** the current academic-state request fails
- **THEN** the client displays a retryable error and does not present a device-derived value as official

### Requirement: Deliberate planning years remain explicit
The clients SHALL preserve the year of an edited record and SHALL allow an existing editable school-year field to represent an intentional planning-year override without silently replacing it on refresh.

#### Scenario: Admin edits a future-year record
- **WHEN** an admin opens an existing record whose year differs from current academic state
- **THEN** the form retains the record's year

#### Scenario: Admin changes a blank form year
- **WHEN** an admin deliberately replaces the official default with another valid year
- **THEN** subsequent academic-state query refreshes do not overwrite that entered value
