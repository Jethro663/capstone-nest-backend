# Current Repository State

Last reconciled from the running local stack: July 18, 2026 (Asia/Manila).

This file is the compact current-state record for Nexora. Dated files under `docs/system-audit/`, `docs/superpowers/`, `docs/compose/`, `docs/testing/`, and related research folders remain evidence snapshots unless a newer current document explicitly adopts them.

## Verification snapshot

The local Compose project was started with both the core topology and optional `observability` profile.

- All 14 project containers were inspected with `docker compose ps` and live logs.
- Every declared Docker healthcheck passed.
- The frontend has no declared container healthcheck; it returned HTTP 200 on port 3001.
- Backend liveness and readiness returned HTTP 200.
- Backend readiness confirmed PostgreSQL, Redis, FastAPI, embedding runtime, and upload storage.
- FastAPI `/live` and `/ready` returned HTTP 200 and reported the configured Ollama models available.
- PostgreSQL accepted connections; Redis returned `PONG`.
- Grafana, Prometheus, Loki, and Tempo readiness passed.
- All 10 Prometheus targets were `up` without target errors.
- The production NestJS startup log mapped 385 routes.
- The live FastAPI OpenAPI document exposed 57 internal paths.
- Redis contained active BullMQ metadata/stalled-check keys for all seven declared queues.

Exact routes, ports, queues, environment-key contracts, and reviewed warnings are recorded in [the July 18 live inventory](docs/system-audit/2026-07-18-live-stack-and-route-inventory.md).

This proves the checked local topology. It does not guarantee the health of an external deployment, untested credentials, future migrations, or every product workflow.

## Active stack

### Core services

| Service | Current role | Host access |
| --- | --- | --- |
| `backend` | NestJS 11 system authority and BullMQ workers | `localhost:3000` |
| `frontend` | Next.js 16 / React 19 / Tailwind 4 web client | `localhost:3001` |
| `ai-service` | Internal FastAPI AI execution service | internal `8000` |
| `postgres` | PostgreSQL 16 plus pgvector 0.8.4 | internal `5432` |
| `redis` | BullMQ transport and queue state | internal `6379` |
| `ollama` | Local model and embedding runtime | internal `11434` |

### Optional observability services

`prometheus`, `blackbox-exporter`, `loki`, `tempo`, `grafana`, `promtail`, `node-exporter`, and `cadvisor` are active only under the `observability` profile. The core application remains usable without them.

Published defaults are Grafana 3002, Prometheus 9090, Loki 3100, Tempo 3200, and Tempo OTLP HTTP 4318. Internal collectors are not published.

## Database state

The migration journal and live `_applied_migrations` table agree:

1. `backend/drizzle/0000_baseline_nexora.sql`
2. `backend/drizzle/0001_mixed_morgan_stark.sql`
3. `backend/drizzle/0002_small_photon.sql`
4. `backend/drizzle/0003_enable_pgvector.sql`

At inspection time, the `public` schema contained 89 tables and pgvector reported version 0.8.4. Compose runs `node backend/run-migrations.js` through the backend entrypoint when `RUN_DB_MIGRATIONS=true`; seeding is disabled by default.

Do not use `drizzle-kit push` against shared or deployed data. Add forward-only numbered migrations and keep `backend/drizzle/meta/_journal.json` aligned.

## Active product features

| Feature | Live ownership and behavior |
| --- | --- |
| Class Record | Backend owns components, scores, formulas, finalization/reopen flows, remarks, analytics, imports/exports, and audit-sensitive writes. Computed totals are not independent authoritative fields. |
| Grading formulas | Components and weighted formulas are backend academic state. Changes must preserve auditability and reviewed-score rules. |
| LXP | Lessons, progress, mastery, interventions, remedial paths, and eligibility/readiness are backend-governed. LXP cannot write official class records. |
| AI Mentor / JA | Backend authenticates and authorizes student tutor, practice, review, ask, explanation, extraction, and teacher-generation flows. FastAPI performs assistive model/retrieval work. |
| Assessments | Backend owns assessment CRUD, publication, attempts, answers, grading/review, results, analytics, bank/import flows, and class-record integration. |
| Performance recompute | Backend-owned BullMQ queue `performance-recompute` recalculates derived snapshots safely; stale permanent eligibility flags are not the source of truth. |
| Async AI and notifications | Seven backend-owned queues cover teacher AI, RAG/class/library indexing, performance recompute, announcements, notifications, and discussion events. |

The backend remains the authority for auth/RBAC, public contracts, official records, audit history, and durable jobs. Web/mobile never call FastAPI directly. AI is assistive even when its internal route is shared-secret protected.

## Environment behavior

Docker Compose automatically reads root `.env`. New developers create it from `.env.compose.example` and replace every `CHANGE_ME` value.

Required secret-bearing inputs are `POSTGRES_PASSWORD`, `BACKEND_DATABASE_URL`, `AI_DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `OTP_PEPPER`, and `AI_SERVICE_SHARED_SECRET`. Grafana credentials are required for the observability profile. SMTP, AWS S3, direct Loki, and OTLP inputs are optional.

The checked runtime used production mode for backend and frontend, local upload storage, migrations enabled, seeding disabled, Redis at `redis:6379`, FastAPI at `ai-service:8000`, and Ollama at `ollama:11434`.

## Reviewed bounded warnings

No fatal startup or contract-drift error was found. Current non-fatal warnings are:

- backend optional S3 and OTP email credentials are unset
- Redis recommends the host-level `vm.overcommit_memory=1` setting
- Ollama clamps the requested 8192 context to the loaded model's trained 2048 context
- cAdvisor reports absent Podman/CRI-O sockets on this Docker-only host
- Tempo reports local single-binary/exposure cautions
- one replayed Promtail entry from July 15 was rejected by Loki as too old

These are recorded facts, not permission to ignore new warnings. Re-audit after version, environment, model, or topology changes.

## Material hardening already present

- Backend upload ownership is repaired at container bootstrap before the process drops to the unprivileged `node` user.
- Ollama readiness validates all configured text, vision, and embedding models.
- SMTP and Grafana email alerting are opt-in.
- Prometheus scrapes backend metrics at `/api/metrics`.
- Observability services have explicit readiness gates.
- Extraction and generation execution stays restart-safe through backend-owned BullMQ jobs.
- pgvector bootstrap is forward-migrated and checked without making startup depend on an optional profile.
- Backend and AI shared-secret checks do not confer public authentication authority on FastAPI.

## Known bounded debt

| Area | Current boundary | Safe next action |
| --- | --- | --- |
| Dependency advisories | Previously measured counts are dated and may drift | Re-run audits before making a release decision; isolate major compatibility upgrades |
| Lint | Backend retains a large ratcheted warning ceiling; frontend retains a smaller one | Reduce warnings by owned module; avoid unrelated bulk formatting |
| Large owners | Several services/controllers and role workspaces remain large | Extract one characterized capability at a time |
| Redis host tuning | Linux may warn about memory overcommit | Change the host sysctl only with operator authority |
| Frontend fonts | Google font builds may require network | Self-host only in a separately reviewed asset change |
| Ollama context | Current small local text model reports 2048 trained context | Align prompt/context policy with a validated model before increasing requests |

## Source-of-truth order

1. Code, migrations, lockfiles, and executable configuration.
2. Root and subsystem `AGENTS.md` files.
3. Root/subsystem READMEs and this document.
4. Current runbooks indexed by [docs/README.md](docs/README.md).
5. Dated audits, research material, completed plans, and generated evidence.

When a lower item conflicts with a higher one, update or label the lower item rather than changing runtime behavior to match stale prose.
