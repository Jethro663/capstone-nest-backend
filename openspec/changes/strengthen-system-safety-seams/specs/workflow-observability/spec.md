## ADDED Requirements

### Requirement: Aggregate workflow diagnostics
The backend SHALL expose an authenticated admin-only workflow diagnostics contract containing aggregate status counts, oldest nonterminal age, and bounded alert codes.

#### Scenario: Admin reads workflow health
- **WHEN** an administrator requests `/api/health/workflows`
- **THEN** the response contains aggregate counts and ages without job, user, class, payload, or error-message identifiers

#### Scenario: Non-admin reads workflow health
- **WHEN** a non-admin requests the workflow diagnostics route
- **THEN** role authorization denies the request

### Requirement: Readiness remains isolated
Workflow aggregation SHALL NOT change the behavior or dependency set of `/api/health/live` or `/api/health/ready`.

#### Scenario: Workflow aggregation fails
- **WHEN** workflow diagnostics cannot query durable job state
- **THEN** liveness and dependency readiness continue using their existing contracts

### Requirement: Bounded operational metrics
Prometheus metrics SHALL publish only fixed-status aggregate workflow gauges and a collection-failure counter.

#### Scenario: Metrics are scraped
- **WHEN** the metrics route is scraped after successful diagnostics collection
- **THEN** fixed status counts, oldest nonterminal age, and failed total are updated without high-cardinality labels

#### Scenario: Diagnostics collection fails during scrape
- **WHEN** workflow diagnostics throws during metrics collection
- **THEN** the collection-failure counter increments and the metrics response remains available
