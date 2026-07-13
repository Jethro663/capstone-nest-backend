# Nexora LMS/LXP

Nexora is the multi-role learning management and learning experience platform for Gat Andres Bonifacio High School. This monorepo contains the authoritative backend, browser client, mobile client, internal AI service, local infrastructure, and observability configuration.

## Current status

As of July 13, 2026, the full Docker Compose topology has been rebuilt and verified with PostgreSQL, Redis, Ollama, the backend, the AI service, the frontend, and the complete observability profile running together. The current implementation and verification record is in [CURRENT_REPO_STATE.md](CURRENT_REPO_STATE.md).

The repository is an active release candidate, not a finished security certification. Known dependency and lint baselines are recorded explicitly so they can be reduced without unsafe major-version jumps.

## Architecture

```text
Next.js web client ─┐
                    ├──> NestJS API ──> PostgreSQL + pgvector
Expo mobile client ─┘          │       Redis + BullMQ
                               │
                               └──> internal FastAPI AI service
                                         │
                                         ├──> Ollama (local Compose runtime)
                                         └──> OpenAI-compatible cloud runtime (deployment option)
```

The service boundaries are intentional:

- `backend/` is the system authority for authentication, RBAC, API contracts, academic state, official records, audit events, and asynchronous job ownership.
- `next-frontend/` and `mobile/` call backend `/api` contracts. They never call the AI service directly.
- `ai-service/` performs tutoring, retrieval, extraction, and generation. It cannot act as the public authentication authority or directly mutate official grades.
- Redis/BullMQ owns durable AI job orchestration. Long-running extraction work is not left as an untracked in-process task.
- PostgreSQL is the shared persistence layer; pgvector supports retrieval/indexing data.

## Repository map

| Path | Responsibility |
| --- | --- |
| `backend/` | NestJS 11 API, Drizzle schema/migrations, BullMQ workers, WebSocket events |
| `next-frontend/` | Next.js 16 and React 19 web app for student, teacher, and administrator roles |
| `mobile/` | Expo 54 and React Native multi-role client |
| `ai-service/` | Internal FastAPI AI runtime, extraction, retrieval, tutoring, and generation |
| `monitoring/` | Prometheus, Grafana, Loki, Tempo, Promtail, and exporter configuration |
| `load-tests/` | Explicit load-test tooling; never part of normal startup |
| `docs/` | Current operating docs plus dated design, audit, and research records |
| `.agents/` | Repo-owned Codex routing and workflow skills |
| `openspec/` | OpenSpec change artifacts |

Each active application has a local `README.md` and `AGENTS.md`. The root `AGENTS.md` is the routing kernel for automated work.

## Prerequisites

- Docker Engine with Docker Compose v2+
- Node.js 20.9+ and npm 10+
- Python 3.12 for the supported AI-service test/runtime baseline
- Git

PostgreSQL, Redis, and Ollama do not need host installations when Compose is used.

## Start the core stack

Create a local Compose environment and replace every `CHANGE_ME` value:

```bash
cp .env.compose.example .env.compose
docker compose --env-file .env.compose config --quiet
docker compose --env-file .env.compose up -d --build --wait
```

The first start can take several minutes because Ollama downloads the configured text, vision, and embedding models. Subsequent starts reuse the named model volume.

Default host endpoints:

| Surface | URL |
| --- | --- |
| Backend readiness | `http://localhost:3000/api/health/ready` |
| Backend Swagger | `http://localhost:3000/api/docs` |
| Frontend | `http://localhost:3001` |

PostgreSQL, Redis, Ollama, and the AI service remain internal in the default topology.

Useful checks:

```bash
docker compose --env-file .env.compose ps
docker compose --env-file .env.compose logs --since 5m backend ai-service ollama
curl --fail http://localhost:3000/api/health/ready
curl --fail http://localhost:3001
```

## Start observability

Set unique Grafana credentials in `.env.compose`. To export backend traces directly to Tempo, also set:

```env
OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318
LOKI_HOST=http://loki:3100
```

Then start the opt-in profile:

```bash
docker compose --env-file .env.compose --profile observability up -d --build --wait
```

Operator endpoints:

| Service | URL |
| --- | --- |
| Grafana | `http://localhost:3002` |
| Prometheus | `http://localhost:9090` |
| Loki readiness | `http://localhost:3100/ready` |
| Tempo readiness | `http://localhost:3200/ready` |

Grafana alert evaluation and email delivery are disabled by default. To enable them, set `GRAFANA_ALERTING_ENABLED=true`, `GF_SMTP_ENABLED=true`, and valid `GF_SMTP_*` values. This prevents a normal local stack from repeatedly attempting impossible email deliveries.

See [monitoring/README.md](monitoring/README.md) for target checks, collector privileges, and host-specific notes.

## Expose diagnostic ports

The debug override publishes PostgreSQL, Redis, and the AI service only when explicitly requested:

```bash
docker compose \
  --env-file .env.compose \
  -f docker-compose.yml \
  -f docker-compose.debug.yml \
  up -d --build --wait
```

Do not use the debug override as a production topology.

## Data and reset safety

Named volumes preserve the database, uploads, Ollama models, and observability state. Changing `POSTGRES_PASSWORD` does not rewrite an already initialized database volume.

Only for a disposable local environment, remove all project volumes with:

```bash
docker compose --env-file .env.compose down --volumes
```

That command permanently removes local database and upload data. A normal restart should use `docker compose down` or `docker compose stop` without `--volumes`.

## Local application workflows

- Backend: [backend/README.md](backend/README.md)
- Web: [next-frontend/README.md](next-frontend/README.md)
- AI service: [ai-service/README.md](ai-service/README.md)
- Mobile: [mobile/README.md](mobile/README.md)

## Verification matrix

```bash
# Backend
cd backend
npm run lint
npm run build
npm run test -- --runInBand
npm run test:e2e -- --runInBand

# Web
cd ../next-frontend
npm run lint
npm run test -- --runInBand --detectOpenHandles
npm run build

# AI service
cd ../ai-service
.venv/bin/python scripts/run_tests.py

# Mobile
cd ../mobile
npm run typecheck
npm run test -- --runInBand

# Compose definitions
cd ..
docker compose --env-file .env.compose config --quiet
docker compose --env-file .env.compose --profile observability config --quiet
docker compose --env-file .env.compose -f docker-compose.yml -f docker-compose.debug.yml config --quiet
```

CI runs these surfaces independently with explicit time budgets. Railway deployment is triggered only from a successful CI run on `developement` and checks out the CI-tested SHA.

## Documentation policy

Start at [docs/README.md](docs/README.md). Dated audits and completed implementation plans are retained as evidence, but they are snapshots and must not override the root README, the current state document, code, migrations, or subsystem guidance.

Never commit real secrets, production credentials, local `.env` files, generated test reports, or downloaded runtime data.

## License

UNLICENSED. See the package metadata and repository owner policy.
