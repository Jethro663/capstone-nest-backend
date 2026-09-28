## ADDED Requirements

### Requirement: Performance diagnostics use durable execution
The backend SHALL enqueue each accepted performance-diagnostics request through backend-owned BullMQ using a deterministic job identity and SHALL NOT depend on an in-process timer for execution.

#### Scenario: Accepted diagnostic request
- **WHEN** an authorized teacher or admin creates a valid performance-diagnostics request
- **THEN** the database job is persisted and a deterministic BullMQ job is enqueued before the API reports it as queued

#### Scenario: Queue unavailable during creation
- **WHEN** the database row is created but durable enqueue fails
- **THEN** the row is marked failed with public-safe error text and the API does not report a successfully queued job

### Requirement: Nonterminal diagnostics reconcile safely
The backend SHALL re-enqueue persisted nonterminal performance-diagnostics jobs at bootstrap and SHALL avoid duplicate output when the same job is delivered more than once.

#### Scenario: Backend restarts after database persistence
- **WHEN** a diagnostic row is pending or processing during backend startup and its queue work is absent or interrupted
- **THEN** the backend re-enqueues the same deterministic job and eventually reaches a terminal state

#### Scenario: Output already exists
- **WHEN** a diagnostic job is redelivered after its output was persisted
- **THEN** the backend repairs the job to completed without creating another output

### Requirement: Client waiting is bounded
The web client SHALL stop polling a performance-diagnostics job after a defined nonterminal wait bound and SHALL present a retryable explanation.

#### Scenario: Job never reaches terminal state
- **WHEN** status remains pending or processing for the entire wait bound
- **THEN** polling stops and the user is told the analysis is taking too long and can be retried
