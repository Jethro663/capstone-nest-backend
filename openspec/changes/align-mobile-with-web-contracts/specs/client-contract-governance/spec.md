## ADDED Requirements

### Requirement: Backend-owned client contracts
Public client request and response contracts SHALL be generated from or mechanically validated against the backend OpenAPI/DTO source of truth, while platform adapters remain limited to transport and platform concerns.

#### Scenario: Backend public schema changes
- **WHEN** a public DTO, response envelope, route, role, or pagination shape changes
- **THEN** CI SHALL fail until every affected generated/validated client and consumer fixture is reconciled

### Requirement: Literal route compatibility
CI SHALL compare normalized client HTTP method/path pairs with backend controller routes.

#### Scenario: Client calls a nonexistent route
- **WHEN** mobile or web introduces a literal method/path pair with no backend match and no reviewed exception
- **THEN** the contract check SHALL fail with the client callsite and closest backend owner

### Requirement: Failure-transparent adapters
Production client service adapters SHALL NOT translate transport, authorization, validation, or server failures into sample data or successful mutations.

#### Scenario: Transport error reaches a production adapter
- **WHEN** an HTTP call rejects
- **THEN** the adapter SHALL return or throw a typed failure and SHALL NOT fabricate a successful state transition

### Requirement: Semantic cross-client fixtures
Complex contracts SHALL have shared backend-derived fixtures exercised by both client adapters for assessment timing/results, evaluation dashboards/summaries, AI settings, pagination, and report export.

#### Scenario: Client contract silently drops a required field
- **WHEN** a fixture includes a required semantic field such as question order, deadline, feedback status, overview, or assessment settings
- **THEN** the corresponding client test SHALL fail if the adapter or consumer discards or replaces it
