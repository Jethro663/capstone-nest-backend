# Nexora Backend Setup

This guide covers the current NestJS 11 backend. For the fastest whole-project start, use the root [README](../README.md). For exact live routes, use the [July 18 route inventory](../docs/system-audit/2026-07-18-live-stack-and-route-inventory.md).

## What the backend owns

The backend is Nexora's system authority for:

- login, rotating refresh sessions, OTP, roles, and guards
- public `/api` contracts for web and mobile
- users, profiles, sections, classes, lessons, modules, assessments, and class records
- official academic state, audit history, analytics, reports, LXP, and interventions
- PostgreSQL/Drizzle access and schema migrations
- Redis/BullMQ queues and restart-safe asynchronous work
- authorization and proxying for the internal FastAPI service
- health, metrics, WebSocket events, structured logs, and optional tracing

The AI service is assistive. It does not become the public auth authority and does not directly write official grades.

## Prerequisites

Recommended full-stack workflow:

- Docker Engine and Docker Compose v2
- Git

Host-side backend development:

- Node.js 20.9 or newer
- npm 10
- reachable PostgreSQL 16 with pgvector
- reachable Redis 7
- a ready AI service, or `AI_DEGRADED_ALLOWED=true` for a deliberately degraded local workflow

## Recommended: run through Compose

From the repository root:

```bash
cp .env.compose.example .env
# Replace every CHANGE_ME value.
docker compose config --quiet
docker compose up -d
curl --fail http://localhost:3000/api/health/ready
```

Compose reads root `.env`. The backend container additionally loads non-secret defaults from `backend/.env.docker`. Migrations run at startup by default; seed data does not.

Inspect the backend:

```bash
docker compose ps backend postgres redis ai-service
docker compose logs --tail=100 backend
curl --fail http://localhost:3000/api/health/live
curl --fail http://localhost:3000/api/health/ready
```

## Host-side development

From `backend/`:

```bash
npm install
cp .env.example .env
# Fill the required values.
npm run start:dev
```

`npm run start:dev` runs Nest in watch mode and tries to ensure `postgres`, `redis`, `ollama`, and `ai-service` are available through root Compose. It uses root `.env` for that Docker bootstrap. Use this when you want the normal integrated development experience.

To start only Nest and manage dependencies yourself:

```bash
npm run start:dev:core
```

Other modes:

```bash
npm run start:debug
npm run build
npm run start:prod
```

## Environment contract

Never commit a populated `.env`.

Required backend production inputs:

| Variable | Meaning |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection URL |
| `REDIS_URL` | Redis connection URL |
| `JWT_SECRET` | Access-token signing secret |
| `JWT_REFRESH_SECRET` | Refresh-token signing secret |
| `OTP_PEPPER` | Server-side OTP hash pepper |
| `AI_SERVICE_URL` | Internal FastAPI base URL |
| `AI_SERVICE_SHARED_SECRET` | Internal backend-to-AI credential |

Important optional inputs:

| Variable | Meaning |
| --- | --- |
| `NODE_ENV` / `PORT` | Runtime mode and HTTP port |
| `CORS_ALLOWED_ORIGINS` | Allowed browser/mobile origins |
| `AI_DEGRADED_ALLOWED` | Permit readiness without a usable AI dependency only when explicitly desired |
| `AI_SERVICE_TIMEOUT_*` | Per-flow backend proxy budgets |
| `EMAIL_SERVICE` and provider credentials | OTP/notification email; blank disables delivery |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Blank disables direct trace export |
| `LOKI_HOST` | Blank disables direct Loki transport |
| `RUN_DB_MIGRATIONS` | Container entrypoint migration toggle |
| `RUN_DB_SEED` | Container entrypoint seed toggle; default false |

`AI_SERVICE_SHARED_SECRET` must match the AI service and must never reach `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*` variables.

## Database and migrations

The schema source is `backend/src/drizzle/schema/`. Applied SQL lives in `backend/drizzle/` and is ordered by `backend/drizzle/meta/_journal.json`.

Current migrations:

1. `0000_baseline_nexora.sql`
2. `0001_mixed_morgan_stark.sql`
3. `0002_small_photon.sql`
4. `0003_enable_pgvector.sql`

From the repository root:

```bash
npm --prefix backend run check:migrations
node backend/run-migrations.js
```

From `backend/`:

```bash
npm run check:migrations
node run-migrations.js
```

The runner creates/reads `_applied_migrations` and applies only journal-listed files. It also ensures the `vector` extension exists. Do not delete migration history, manually run old SQL files, or use `drizzle-kit push` on shared/deployed databases.

`MIGRATION_BASELINE_STAMP_ONLY=true` is a deployment cutover tool for an existing legacy database. Do not use it for a fresh local database.

## Seed data

Seeding is an explicit operation:

```bash
cd backend
node seed-database.js
npm run seed:smoke
```

`RUN_DB_SEED=false` is the default Compose behavior. Never treat development seed credentials as production accounts, and do not paste them into general documentation.

## Project map

| Path | Ownership |
| --- | --- |
| `src/main.ts` | HTTP bootstrap, global validation, CORS, cookie parsing, Swagger gate, `/api` prefix |
| `src/app.module.ts` | Top-level modules, global guards, filters, BullMQ connection |
| `src/modules/` | Domain controllers, services, DTOs, workers, and tests |
| `src/modules/auth/` | Login, refresh, logout, OTP, guards, sessions |
| `src/modules/class-record/` | Components, scores, formulas, finalization, reports/imports |
| `src/modules/assessments/` | Assessment lifecycle, attempts, grading/review, analytics |
| `src/modules/lxp/` | Lessons, mastery, interventions, access/readiness |
| `src/modules/performance/` | Derived performance snapshots and recomputation |
| `src/modules/ai-mentor/` | Authenticated AI proxy and generation/extraction queues |
| `src/modules/health/` | Liveness and dependency readiness |
| `src/database/` | Database service/provider |
| `src/drizzle/schema/` | Drizzle table and relation definitions |
| `drizzle/` | Ordered forward SQL |
| `src/monitoring/` / `src/tracing.ts` | Prometheus, logs, optional OTLP |
| `docker-entrypoint.sh` | Migration/seed bootstrap and upload ownership handoff |

Controllers validate, authorize, delegate, and shape responses. Services own business logic. Database access goes through `DatabaseService` and `this.db`.

## API and Swagger

- Base prefix: `http://localhost:3000/api`
- Liveness: `GET /api/health/live`
- Readiness: `GET /api/health/ready`
- Metrics: `GET /api/metrics`
- Development Swagger UI: `http://localhost:3000/api/docs`

Swagger is intentionally disabled when `NODE_ENV=production`, including the default Compose backend. A 404 from `/api/docs` in Compose is expected.

The startup log mapped 385 routes on July 18, 2026. Do not copy a small endpoint table and assume it is complete; use Swagger in development or the checked [route catalog](../docs/system-audit/2026-07-18-live-stack-and-route-inventory.md).

Most non-public endpoints require:

```http
Authorization: Bearer <access-token>
```

Responses normally preserve the `success` / `message` / `data` envelope. Contract changes must be traced through web, mobile, and FastAPI consumers as applicable.

## BullMQ

The checked backend owns seven queues:

- `ai-teacher-generation`
- `library-indexing`
- `rag-indexing`
- `performance-recompute`
- `announcements`
- `notifications`
- `discussion-board`

Long-running extraction, generation, indexing, and recompute work must remain queue-owned and retry/cancellation aware. Do not replace durable jobs with untracked `setTimeout`, detached promises, or FastAPI `asyncio.create_task` execution.

## Verification

Use the smallest checks that cover the change:

```bash
npm run check:src-clean
npm run check:migrations
npm run lint
npm run build
npm run test -- --runInBand
npm run test:e2e -- --runInBand
```

`npm run lint` is read-only. `npm run lint:fix` intentionally rewrites files.

After schema, seed, auth, or broad academic-state changes:

```bash
node run-migrations.js
npm run seed:smoke
```

After readiness/Compose changes:

```bash
cd ..
docker compose config --quiet
docker compose up -d
curl --fail http://localhost:3000/api/health/ready
```

## Troubleshooting

### Backend is running but not ready

```bash
docker compose logs --tail=100 backend postgres redis ai-service ollama
curl -i http://localhost:3000/api/health/ready
```

Readiness is dependency-aware. Fix the failing dependency instead of weakening the check.

### Database connection fails

Confirm the URL points to the correct network:

- from a host process: published debug port or a host PostgreSQL URL
- from Compose: hostname `postgres`, not `localhost`

`localhost` inside a container means that same container.

### Migration is missing or unregistered

```bash
npm run check:migrations
```

Register every forward SQL file in `drizzle/meta/_journal.json`. Do not bypass the integrity check.

### Port 3000 is already used

```bash
ss -ltnp | rg ':3000'
```

Stop the owning local process or change the host-side development port. Keep Compose/service contract changes deliberate.

### AI routes fail while core routes work

```bash
docker compose logs --tail=100 backend ai-service ollama
curl --fail http://localhost:3000/api/health/ready
docker compose exec -T ai-service python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/ready').read().decode())"
```

Check `AI_SERVICE_URL`, shared-secret equality, model readiness, and per-flow timeouts. Do not expose FastAPI publicly to work around proxy failures.

### Optional email or S3 warnings

The current local stack can run with provider credentials absent. Configure those providers only when the feature is intentionally being exercised.
