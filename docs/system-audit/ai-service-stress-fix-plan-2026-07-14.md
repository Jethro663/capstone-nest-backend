# AI Service Stress Test Fix Plan

## Safe Immediate Fixes

- Keep BullMQ as the sole durable retry owner and keep lease supersession, fenced writes, terminal compensation, route-type checks, and output-resume guards.
- Keep active-only BullMQ deduplication with one trailing replacement for indexing.
- Keep fail-closed shared-secret checks and tiered deadlines.
- Keep deterministic degraded generation responses only where grounded evidence remains available; never synthesize semantic vectors.
- Keep strict finite current-model embeddings, one-batch retrieval, aggregate deadlines, and non-blocking advisory locks.

## Conditional Local Refactors

- Generate shared runtime contract fixtures from one schema source.
- Add queue-lag and compensation counters to the existing metrics surface.
- Add periodic reconciliation for failed or missed RAG/library enqueue operations.
- Trigger or require a library backfill whenever the configured embedding model changes.

## Deferred Items Requiring Human Decision

- Adopt a transactional outbox for all domain-write-to-queue handoffs; this needs schema and rollout design.
- Run a staging soak with representative PDFs, concurrent classrooms, and the production Ollama/embedding model.
- Set capacity thresholds only after measuring deployment hardware and model latency distributions.
