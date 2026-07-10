## Context

Nexora combines Compose-managed PostgreSQL, Redis, Ollama, an internal FastAPI AI service, NestJS backend, Next.js web app, and Expo mobile app. The audit must distinguish configuration or readiness failures from application defects, preserve the user-owned dirty worktree, and avoid diagnostic writes to academic or AI data. The baseline schema declares a `vector(768)` column but does not establish the pgvector extension in active migration history.

## Goals / Non-Goals

**Goals:**

- Produce fresh, command-level health evidence for the stated services and boundaries.
- Add an idempotent forward migration that enables pgvector.
- Verify web cookie/in-memory-token and mobile secure-storage/bearer-token auth flows independently when runnable.
- Inspect queues and the AI proxy without producing synthetic work.

**Non-Goals:**

- Rewriting baseline or archived migrations, API envelopes, JWT/RBAC policy, queue concurrency/retries, AI model settings, or application contracts.
- Altering persistent academic or AI data for diagnostics.
- Treating historical preload warnings as defects after the Ollama readiness gate and configured models are confirmed.

## Decisions

- Record each check with command, result, duration, and relevant output in the audit report. This makes health assertions evidence-based; passive code inspection alone is insufficient.
- Start the stack only after rendered Compose configuration is valid and return it to its initial stopped state. This limits environment side effects while allowing live validation.
- Use `CREATE EXTENSION IF NOT EXISTS vector;` both as a pre-baseline migration-runner bootstrap and in a new, ordered Drizzle migration. The runner bootstrap is required because the baseline itself creates a `vector(768)` column before any forward migration can execute; the forward migration preserves history and repeatability without rewriting the baseline.
- Treat PostgreSQL `42704` as fatal during migration execution. Suppressing it allowed a missing `vector` type to skip DDL while the runner recorded the migration as applied.
- Make Ollama readiness depend on the configured text, vision, and embedding models, rather than the non-empty `ollama list` header.
- Treat a code change as eligible only after a reproducible failure, boundary trace, single hypothesis, and targeted regression test. This prevents broad remediation from concealing an environmental failure.
- Test web and mobile auth as separate transports. Cookie rotation and secure-storage bearer rotation share backend authority but have different failure surfaces.

## Risks / Trade-offs

- [Missing local secrets, images, models, or seeded credentials] → Record the exact blocker and retain non-mutating evidence; do not invent configuration or accounts.
- [Fresh database migration may expose baseline ordering defects before the new migration runs] → Prove the actual migrate path; if the baseline fails first, record this as a design limitation and do not falsely claim a later migration resolves it.
- [Starting Compose changes runtime state] → Snapshot `docker compose ps --all` and stop only services started for this audit.
- [Builds or tests may fail for unrelated worktree/environment reasons] → Preserve raw output and avoid a speculative source edit.

## Migration Plan

1. Snapshot the worktree and validate rendered Compose configuration.
2. Add the forward pgvector migration and pre-baseline runner bootstrap using the repository’s established ordering and metadata conventions.
3. On a fresh disposable Compose database, execute migrations, verify `pg_extension` and `content_chunk_embeddings.embedding`, then repeat migrations.
4. Run the closest checks again and retain only the migration if it is proven safe.
5. Stop any audit-started services and retain the audit report.

## Open Questions

- Whether the current Drizzle migration runner applies the baseline before a forward extension migration on an empty database; this must be resolved through fresh-database evidence.
- Whether local seeded non-privileged credentials and mobile/browser runtime tooling are available for live auth flows.
