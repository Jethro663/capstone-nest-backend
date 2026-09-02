## ADDED Requirements

### Requirement: Lossless AI assessment settings
Mobile SHALL preserve the complete nested assessment settings contract through job creation, retrieval, update, retry, preview, and idempotent apply.

#### Scenario: Teacher creates a non-default AI draft
- **WHEN** a teacher selects non-default title, period, category, scheduling, attempt, timer, randomization, strict-mode, passing-score, and feedback settings
- **THEN** the outbound job request and persisted backend job SHALL contain semantically equivalent settings

#### Scenario: Legacy and nested fields conflict
- **WHEN** a request contains conflicting legacy top-level fields and nested assessment settings
- **THEN** the backend/client boundary SHALL apply one documented precedence rule and SHALL NOT silently replace reviewed nested settings with defaults

### Requirement: AI runtime gate
The AI draft parity change SHALL remain incomplete until authenticated disposable-service and device workflows are recorded, with live provider generation coverage reported separately.

#### Scenario: Contract checks pass without live provider coverage
- **WHEN** job contract fixtures pass but no AI provider or worker generation is exercised
- **THEN** release evidence SHALL state that provider generation remains unverified
