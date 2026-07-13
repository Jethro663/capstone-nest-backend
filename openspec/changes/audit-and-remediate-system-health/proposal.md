## Why

The local Nexora stack needs current, reproducible health evidence across its runtime dependencies and both auth transports before any remediation is trusted. The initial database schema also uses the `vector` type without an active pgvector extension declaration, which prevents reliable fresh-database setup.

## What Changes

- Establish an evidence-gated audit record for Compose, PostgreSQL, Redis, Ollama, the AI service, backend, web, mobile, auth, queues, and the AI proxy.
- Add one forward, idempotent Drizzle migration that enables pgvector with `CREATE EXTENSION IF NOT EXISTS vector;`.
- Record confirmed defects, non-issues, deferred risks, commands, and results without changing API envelopes, auth/RBAC policy, queue policy, model selection, or academic/AI records unless a defect is reproduced.

## Capabilities

### New Capabilities

- `system-health-evidence`: Repeatable, non-mutating system-health evidence and a bounded remediation record.
- `pgvector-bootstrap`: Fresh databases enable pgvector before vector-backed schema use, with safe repeat execution.

### Modified Capabilities

- None.

## Impact

Affected areas are OpenSpec audit artifacts and one new backend Drizzle migration. Validation covers Docker Compose, PostgreSQL, Redis, Ollama, AI service, backend, web, mobile, authentication, BullMQ, and the backend-to-AI proxy boundary. Public API envelopes and application contracts remain unchanged.
