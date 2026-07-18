# Nexora LMS/LXP

Nexora is the multi-role learning management and learning experience platform for Gat Andres Bonifacio High School. This monorepo contains the public API, browser client, mobile client, internal AI runtime, persistence, queues, and optional observability stack.

Verified locally on July 18, 2026: all six core services and all eight optional observability services started successfully; every declared healthcheck passed; the frontend returned HTTP 200; and all 10 Prometheus targets were up. See [CURRENT_REPO_STATE.md](CURRENT_REPO_STATE.md) and the [live route inventory](docs/system-audit/2026-07-18-live-stack-and-route-inventory.md).

## How the pieces fit

```text
Browser (Next.js 16) ─┐
                      ├── HTTP /api + WebSocket ──> NestJS 11 backend
Mobile (Expo 54) ─────┘                                  │
                                                        ├── PostgreSQL 16 + pgvector
                                                        ├── Redis + backend-owned BullMQ
                                                        └── internal FastAPI service
                                                               │
                                                               └── Ollama or OpenAI-compatible cloud runtime
```

The boundaries are deliberate:

- `backend/` owns public authentication, RBAC, API contracts, official academic state, audit history, database access, and durable job orchestration.
- `next-frontend/` and `mobile/` consume backend `/api` contracts; they never call `ai-service` directly.
- `ai-service/` performs assistive tutoring, retrieval, extraction, and generation. It is not an auth authority and cannot directly write official grades.
- PostgreSQL is durable storage; pgvector supports retrieval. Redis carries BullMQ jobs and events.
- The optional `observability` profile adds metrics, dashboards, logs, traces, host metrics, and probes without becoming a core dependency.

## Repository map

| Path | Responsibility |
| --- | --- |
| `backend/` | NestJS 11, Drizzle, PostgreSQL contracts, BullMQ workers, WebSockets |
| `next-frontend/` | Next.js 16, React 19, Tailwind 4 web app |
| `mobile/` | Expo 54, React Native 0.81 multi-role app |
| `ai-service/` | FastAPI AI execution, retrieval, extraction, tutor, generation |
| `backend/drizzle/` | Four ordered SQL migrations and journal metadata |
| `monitoring/` | Prometheus, Grafana, Loki, Tempo, Promtail, exporters |
| `docs/` | Current guides plus dated design/audit evidence |
| `.agents/` | Repo-owned Codex router and workflow rules |
| `openspec/` | OpenSpec change artifacts |

New groupmate? Start with [How the Project Works](docs/HOW_THE_PROJECT_WORKS_GROUPMATE_GUIDE.md) or share [the compiled PDF](docs/How_The_Project_Works_Groupmate_Guide.pdf).

## Prerequisites

- Docker Engine with Docker Compose v2
- Git
- For host-side development: Node.js 20.9 or newer and npm 10
- For host-side AI work: Python 3.12

PostgreSQL, Redis, and Ollama do not need host installations when Compose is used.

## Start everything needed for the app

From the repository root:

```bash
cp .env.compose.example .env
# Replace every CHANGE_ME value in .env.
docker compose config --quiet
docker compose up -d
```

After the initial model downloads finish, inspect status and readiness:

```bash
docker compose ps
docker compose logs --tail=100
curl --fail http://localhost:3000/api/health/ready
curl --fail http://localhost:3001
```

Compose reads root `.env` automatically. `.env.compose.example` is the template; do not create or document a separate `.env.compose` file for the default workflow. Never commit `.env`.

## Services and ports

| Service | Core? | Container port | Default host port | Notes |
| --- | --- | ---: | ---: | --- |
| `backend` | yes | 3000 | 3000 | Public `/api` surface |
| `frontend` | yes | 3001 | 3001 | Next.js production server |
| `ai-service` | yes | 8000 | not published | Internal only |
| `postgres` | yes | 5432 | not published | PostgreSQL 16 + pgvector |
| `redis` | yes | 6379 | not published | BullMQ transport |
| `ollama` | yes | 11434 | not published | Local AI runtime |
| `grafana` | optional | 3000 | 3002 | Observability profile |
| `prometheus` | optional | 9090 | 9090 | Observability profile |
| `loki` | optional | 3100 | 3100 | Observability profile |
| `tempo` | optional | 3200 / 4318 | 3200 / 4318 | Query/readiness + OTLP HTTP |
| exporters / Promtail | optional | 8080, 9080, 9100, 9115 | not published | Internal collection/probes |

To publish PostgreSQL, Redis, and FastAPI for diagnostics, explicitly add `docker-compose.debug.yml`. Do not use the debug override as the production topology.

```bash
docker compose -f docker-compose.yml -f docker-compose.debug.yml up -d
```

## Environment requirements

Start from `.env.compose.example`. The required secret-bearing inputs are:

| Variable | Purpose |
| --- | --- |
| `POSTGRES_PASSWORD` | PostgreSQL superuser password used at first volume initialization |
| `BACKEND_DATABASE_URL` | NestJS PostgreSQL connection URL |
| `AI_DATABASE_URL` | FastAPI async PostgreSQL URL |
| `JWT_SECRET` | Access-token signing secret |
| `JWT_REFRESH_SECRET` | Refresh-token signing secret |
| `OTP_PEPPER` | Server-side OTP hashing secret |
| `AI_SERVICE_SHARED_SECRET` | Internal NestJS-to-FastAPI credential |

`AI_SERVICE_SHARED_SECRET` must match on both services and must never be exposed through `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*` variables. Observability also requires unique `GRAFANA_ADMIN_USER` and `GRAFANA_ADMIN_PASSWORD` values. SMTP, direct Loki export, and OTLP export remain optional.

Useful non-secret defaults live in `backend/.env.docker` and `ai-service/.env.docker`. The local Ollama defaults are `qwen2.5:3b`, `gemma3:4b`, and `nomic-embed-text`.

## Start optional observability

```bash
docker compose --profile observability up -d
docker compose --profile observability ps
```

Operator URLs:

| Surface | URL |
| --- | --- |
| Grafana | `http://localhost:3002` |
| Prometheus targets | `http://localhost:9090/targets` |
| Loki readiness | `http://localhost:3100/ready` |
| Tempo readiness | `http://localhost:3200/ready` |

See [monitoring/README.md](monitoring/README.md).

## Local development without app containers

There is no root `package.json`. Run commands inside each subsystem.

```bash
# Terminal 1: backend plus its local AI helper
cd backend
npm install
cp .env.example .env
npm run start:dev

# Terminal 2: web
cd next-frontend
npm install
npm run dev

# Terminal 3: mobile
cd mobile
npm install
cp .env.example .env
npm run start

# AI service when working on it directly
cd ai-service
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Infrastructure still needs to be reachable. The simplest hybrid workflow is to keep `postgres`, `redis`, and `ollama` in Compose and use the debug override only for host access.

## Migrations and tests

Compose applies journaled migrations on backend startup when `RUN_DB_MIGRATIONS=true`. To verify and apply them manually from the repository root:

```bash
npm --prefix backend run check:migrations
node backend/run-migrations.js
```

Current ordered migrations are `0000_baseline_nexora.sql` through `0003_enable_pgvector.sql`. Do not use `drizzle-kit push` on shared or deployed databases.

Smallest subsystem checks:

```bash
npm --prefix backend run lint
npm --prefix backend run build
npm --prefix next-frontend run lint
npm --prefix next-frontend run build
npm --prefix mobile run typecheck
(cd ai-service && .venv/bin/python scripts/run_tests.py)
docker compose config --quiet
```

`npm --prefix backend run lint` is read-only. Use `lint:fix` only when file mutation is intentional.

## Common troubleshooting

| Symptom | Check | Meaning / next action |
| --- | --- | --- |
| A container is missing | `docker compose ps --all` | Read its logs, then rerun `docker compose up -d` |
| Backend not ready | `docker compose logs --tail=100 backend ai-service postgres redis` | Readiness requires DB, Redis, AI, embedding runtime, and upload storage |
| First start is slow | `docker compose logs -f ollama` | Model downloads are materialized in the named Ollama volume |
| `/api/docs` returns 404 in Compose | expected | Swagger is disabled in production; run the backend in development |
| Redis warns about overcommit | host warning | `vm.overcommit_memory=1` is a system-wide operator choice, not changed by this repo |
| Ollama clamps context length | model/runtime warning | The current model reports a smaller trained context than the requested 8192 |
| Optional email/AWS warnings | expected when unset | Local storage and disabled email remain valid when those providers are not configured |
| Need raw DB/Redis/AI host ports | use the debug override | Core Compose intentionally keeps them internal |

For a normal restart, keep named volumes:

```bash
docker compose down
docker compose up -d
```

For a disposable local database reset, see the warning and exact command in the groupmate guide. Never remove volumes from a shared environment.

## API discovery and documentation policy

- Backend prefix: `http://localhost:3000/api`
- Liveness: `/api/health/live`
- Readiness: `/api/health/ready`
- Metrics: `/api/metrics`
- Development-only Swagger: `/api/docs`
- Exact July 18 route catalog: [live stack and API route inventory](docs/system-audit/2026-07-18-live-stack-and-route-inventory.md)

Current operating guidance is ordered as: executable code/configuration, `AGENTS.md`, this README and subsystem READMEs, `CURRENT_REPO_STATE.md`, then dated audits/plans. Historical files are evidence snapshots and must not silently override current behavior.

## License

UNLICENSED. See package metadata and repository-owner policy.
