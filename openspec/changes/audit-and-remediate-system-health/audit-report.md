# System Health Audit Report

Date: 2026-07-10

## Baseline

| Check | Result | Evidence |
| --- | --- | --- |
| `docker compose config --quiet` | pass | Rendered configuration validated; the initial stack was stopped. |
| `docker compose ps --all` | pass | All pre-existing service containers were stopped. |
| `npm --prefix backend run build` | pass | Source-clean and migration-integrity checks passed before and after remediation. |
| `npm --prefix backend run lint` | unsuitable | Script includes `--fix`; it reformatted 19 files and was immediately patched back. It is not a non-mutating audit command. |
| `python ai-service/scripts/run_tests.py` | blocked | `python` unavailable. |
| `python3 ai-service/scripts/run_tests.py` | blocked | Environment lacks FastAPI, HTTPX, Pydantic, SQLAlchemy, and PyMuPDF. |
| `npm --prefix next-frontend run build` | blocked | Existing Next build lock reported another build process; no generated lock was removed. |
| `npm --prefix mobile run typecheck` | pass | Exit 0. |

## Confirmed Remediations

### pgvector migration safety

The fresh database exposed two defects: the baseline uses `vector(768)` before a forward migration can execute, and the migration runner treated PostgreSQL `42704` as harmless. This let it record migrations even when `content_chunk_embeddings` was never created.

Remediation:

- `backend/run-migrations.js` now enables pgvector before baseline execution.
- `backend/migration-error-policy.js` no longer suppresses `42704`.
- `backend/drizzle/0003_enable_pgvector.sql` adds the approved forward idempotent migration and is registered in the Drizzle journal.
- The production Dockerfile includes the new runner helper.

Fresh disposable Compose database evidence:

- First run applied all four migrations.
- `SELECT extname FROM pg_extension WHERE extname = 'vector';` returned `vector`.
- `content_chunk_embeddings.embedding` returned `vector(768)`.
- Second run reported the database up to date.

### Ollama readiness

The prior health command matched the `ollama list` header, marking a zero-model container healthy. `docker-compose.yml` now requires the configured text, vision, and embedding model names. With an empty isolated model volume, the revised container remained `health: starting`, correctly preventing dependent readiness.

## Auth Evidence

Disposable seeded student account (`student71@lms.local`) was used. Tokens and cookies were not logged.

| Flow | Result |
| --- | --- |
| Web login, protected `/api/auth/me`, cookie refresh, protected request | 200, 200, 201, 200 |
| Web logout | 200 |
| Mobile login, protected `/api/auth/me`, JSON refresh, protected request | 200, 200, 201, 200 |
| Mobile logout | 200 |

All observed success responses retained the `{ success, message, data }` envelope where data is applicable.

Deferred security behavior: after logout, an already-issued access JWT was still accepted by `/api/auth/me` (200) for both transports. Refresh-token revocation works, but access-token invalidation on logout is not currently proven; no change was made because it requires an explicit revocation policy decision and separate scope.

## Queues and AI boundary

- Registered passive queue/worker coverage: `library-indexing`, `ai-teacher-generation`, `rag-indexing`, `notifications`, `announcements`, `performance-recompute`, and `discussion-board`.
- `AiProxyService.forward` forwards `X-User-Id`, `X-User-Email`, `X-User-Roles`, and the optional internal service token; it applies per-path abort timeouts and a circuit breaker.
- The teacher-generation processor records queue wait/attempt metadata and rethrows failures for BullMQ retry handling.
- No synthetic jobs or academic/AI data mutations were performed.
- AI service runtime and Python tests remain blocked by the missing local Python dependency environment and incomplete Ollama model preload.

## Runtime cleanup

All `nexora-health-audit` containers, networks, and volumes were removed. The original Compose service set remained stopped.
