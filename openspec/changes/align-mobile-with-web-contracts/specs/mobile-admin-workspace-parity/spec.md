## ADDED Requirements

### Requirement: No misleading admin placeholders
Production admin navigation SHALL expose real authorized workflows or explicitly identify a capability as unavailable; it SHALL NOT label generic copy or notifications as an operational admin module.

#### Scenario: Administrator opens a primary tab
- **WHEN** an administrator selects Home, Classes, Assessments, Announcements, Academic, or Profile
- **THEN** the tab SHALL render a corresponding data-backed admin workflow with loading, empty, error, refresh, and authorization states

### Requirement: Basic admin module coverage
Mobile SHALL provide backend-contract-compatible workflows for dashboard overview, users, classes, sections/rosters, assessments, announcements, calendar, library, reports, evaluations, audit, diagnostics, roster import, system settings, profile, and academic records/recovery.

#### Scenario: Administrator performs an authorized mutation
- **WHEN** an administrator creates or updates a supported record
- **THEN** mobile SHALL use the backend DTO, surface validation/RBAC errors, invalidate all affected queries, and show success only after confirmation

#### Scenario: Admin collection exceeds one page
- **WHEN** any admin collection has additional pages
- **THEN** mobile SHALL preserve authoritative totals and provide deterministic paging rather than a hard-coded first-page cap

### Requirement: Sensitive admin controls preserve safeguards
Mobile SHALL retain password confirmation, reason/evidence, preview, manifest/hash, audit, and idempotency requirements imposed by backend administrative contracts.

#### Scenario: Academic state alignment is executed
- **WHEN** an administrator confirms a state-alignment preview
- **THEN** mobile SHALL submit the exact preview manifest hash and required confirmations and SHALL reject stale previews instead of approximating the operation with single-state repair
