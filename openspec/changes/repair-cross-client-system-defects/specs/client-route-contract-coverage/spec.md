## ADDED Requirements

### Requirement: Contract verification covers application request sites
The repository route-contract gate SHALL inventory backend-looking requests in relevant TypeScript and TSX service, application-page, and mobile-screen sources, including native `fetch` calls, while excluding tests and generated output.

#### Scenario: Page uses unmatched native backend fetch
- **WHEN** a TSX application page contains a literal native fetch for a backend route not exposed by a controller
- **THEN** the route-contract test fails with the source location

#### Scenario: Page uses a valid backend request
- **WHEN** a discovered request matches a normalized backend controller method and path
- **THEN** the route-contract test accepts it
