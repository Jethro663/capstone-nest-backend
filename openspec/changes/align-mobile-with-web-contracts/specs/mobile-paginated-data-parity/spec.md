## ADDED Requirements

### Requirement: Pagination envelopes remain authoritative
Mobile SHALL preserve data, total, page, limit, and total-pages metadata for paginated backend resources.

#### Scenario: Resource exceeds one page
- **WHEN** a class has more assessments, announcements, files, or archive entries than the endpoint page limit
- **THEN** mobile SHALL expose page loading or fetch the complete explicitly bounded collection and SHALL NOT present the first page as complete

### Requirement: Aggregations declare their completeness
Dashboard, calendar, search, filter, badge, and total computations SHALL use complete server aggregations or all required pages.

#### Scenario: Calendar includes an item on page two
- **WHEN** a relevant assessment or announcement exists beyond the first page
- **THEN** the mobile calendar aggregation SHALL include it or visibly scope the view to the loaded page

### Requirement: JA history pagination
Mobile SHALL expose backend JA activity history and paginated Ask-thread retrieval.

#### Scenario: Ask thread has older messages
- **WHEN** a thread response indicates older messages are available
- **THEN** mobile SHALL let the user load them using the backend cursor/limit contract without duplicating or reordering messages
