# Nexora LMS/LXP Monorepo

Nexora is a learning management and learning experience platform for Gat Andres Bonifacio High School.

This repository contains the full platform stack:
- Backend API (NestJS + Drizzle + PostgreSQL)
- Web app (Next.js App Router)
- AI service (FastAPI + Ollama)
- Mobile app target (Expo in `mobile/`)

## Current Project Status (April 2026)

Based on the latest repo audit (`docs/NEXORA_AUDIT_2026-03-27.md`):

- Core LMS and LXP product surfaces are implemented (not placeholders).
- Cross-platform verification is green on the main checks:
  - `next-frontend`: lint passes (warnings only), tests pass, build passes
  - `backend`: build passes
  - `ai-service`: tests pass via `python scripts/run_tests.py`
  - `mobile`: typecheck passes
- Remaining work is mostly polish and alignment:
  - lesson versioning depth
  - stronger teacher-facing AI policy/UX surfacing
  - some docs cleanup and frontend warnings

## Monorepo Structure

Top-level apps and services:

- `backend/` - NestJS 11 API, auth/RBAC, LMS domains, reporting, AI proxy, BullMQ orchestration
- `next-frontend/` - Next.js 16 web client (App Router), role-based dashboards and workflows
- `ai-service/` - FastAPI microservice for AI mentor, extraction, retrieval/indexing flows
- `mobile/` - default Expo mobile target (student-scoped app)

Other notable folders:

- `docs/` - architecture, audits, deployment notes, testing references
- `monitoring/` - Prometheus/Tempo config

## Architecture At A Glance

- Backend is the system authority for auth, RBAC, academic records, and API contracts.
- AI service is internal and accessed through backend-facing contracts.
- LXP and AI flows are assistive and separated from official record mutation paths.
- Mobile currently focuses on student experience and uses backend APIs.

## Prerequisites

Install the following tools:

- Node.js 20+ (recommended for current Next.js and workspace tooling)
- npm 10+
- Python 3.11+
- Docker Desktop (for full-stack container run)
- Git

Optional for local non-Docker infra:

- PostgreSQL 16+ (pgvector compatible)
- Redis 7+
- Ollama

## Quick Start (Docker Compose, Full Stack)

From repository root:

```bash
cp .env.compose.example .env.compose
docker compose --env-file .env.compose up --build
```

Services started by compose:

- PostgreSQL (`5432`)
- Redis
- Ollama (`11434`) with startup model pulls
- AI service (internal, health on `/ready`)
- Backend (`http://localhost:3000`)
- Frontend (`http://localhost:3001`)

Useful checks:

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f ai-service
docker compose logs -f ollama
```

## Observability Stack

The root `docker compose` setup also provisions the monitoring stack under `monitoring/`:

- Prometheus for scrape and probe coverage
- Loki for log storage
- Tempo for traces
- Grafana for dashboards, alerting, and the main operator entry point
- Promtail for Docker log shipping
- `node-exporter` and `cadvisor` for host/container metrics
- `blackbox-exporter` for HTTP/TCP probes of services that are not scraped directly

Primary entry point for operators:

1. Copy the template env file: `cp .env.compose.example .env.compose`
2. Start the stack: `docker compose --env-file .env.compose up -d --build`
3. Open Grafana at `http://localhost:3002`
4. Log in with the values from `.env.compose`:
   - `GRAFANA_ADMIN_USER` = `admin`
   - `GRAFANA_ADMIN_PASSWORD` = `admin12345`

Relevant compose env variables:

- `GRAFANA_PORT` - Grafana host port, default `3002`
- `PROMETHEUS_PORT` - Prometheus host port, default `9090`
- `LOKI_PORT` - Loki host port, default `3100`
- `TEMPO_PORT` - Tempo host port, default `3200`
- `TEMPO_OTLP_HTTP_PORT` - Tempo OTLP HTTP ingest port, default `4318`
- `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD` - Grafana login credentials
- `FRONTEND_PORT` - frontend host port, default `3001`

The full-stack verification on this worktree used a temporary `FRONTEND_PORT=3003` override because local port `3001` was already occupied. The repository default remains `3001`.

Healthy startup looks like:

- `docker compose --env-file .env.compose ps` shows backend and AI service healthy, Grafana running on `3002`, Prometheus on `9090`, Loki on `3100`, Tempo on `3200` and `4318`, and the infrastructure exporters up.
- `http://localhost:9090/api/v1/targets` reports the critical jobs `up`, including `backend`, `ai-service`, `frontend`, `postgres`, `redis`, `ollama`, `prometheus`, `loki`, `cadvisor`, and `node-exporter`.
- `http://localhost:3002` opens Grafana without provisioning errors in the logs.
- `http://localhost:3000/api/metrics` returns backend metrics.
- `docker compose exec ai-service curl -s http://localhost:8000/metrics` returns AI service metrics; the compose stack does not publish host port `8000`.
- Loki queries return logs with `service_name=nexora-backend` labels.
- Tempo `/ready` returns `200` after the initial warm-up period.

### Compose Notes

- Root compose env template: `.env.compose.example`
- Runtime compose env file (local, untracked): `.env.compose`
- Backend compose env file: `backend/.env.docker`
- AI service compose env file: `ai-service/.env.docker`
- Required vars are fail-fast (`docker compose config` errors if missing):
  - `POSTGRES_PASSWORD`
  - `BACKEND_DATABASE_URL`
  - `AI_DATABASE_URL`
  - `JWT_SECRET`
  - `JWT_REFRESH_SECRET`
  - `OTP_PEPPER`
  - `AI_SERVICE_SHARED_SECRET`
- `BACKEND_DATABASE_URL` and `AI_DATABASE_URL` should use URL-encoded passwords.
- Ollama pulls configured models at startup:
  - text: `qwen2.5:3b`
  - vision: `gemma3:4b`
  - embedding: `nomic-embed-text`
- Backend no longer waits for `ai-service` health before starting; DB and Redis gate backend readiness.

## Docker First Run and Reset Run

### First Run (portable, deterministic)

```bash
cp .env.compose.example .env.compose
# edit .env.compose and set strong secrets + aligned DB URLs
docker compose --env-file .env.compose config
docker compose --env-file .env.compose up --build
```

### Safe Reset When DB Password Changes

If PostgreSQL was already initialized and you changed `POSTGRES_PASSWORD`, the old password remains in the `postgres_data` volume. Reset intentionally:

```bash
docker compose down
docker volume rm capstone-nest-react-lms_postgres_data
docker compose --env-file .env.compose up --build
```

### Troubleshooting Matrix

| Symptom | Likely Cause | Fix |
|---|---|---|
| Grafana loads but dashboards or alerting look empty | Provisioning files are missing, the stack is using an outdated `.env.compose`, or Grafana has not finished booting | Re-run `docker compose --env-file .env.compose up -d grafana` and check `docker compose --env-file .env.compose logs --since 5m grafana` for provisioning errors. |
| Promtail starts but logs do not appear in Loki | Docker socket access, container metadata discovery, or Loki connectivity is failing | Check `docker compose --env-file .env.compose logs --since 5m promtail`, confirm the Docker socket mount is present, and verify Loki is reachable on `http://localhost:3100`. |
| Tempo is slow to report ready | Tempo is still warming up or the temp storage directory is not writable | Wait a short period and re-check `http://localhost:3200/ready`; if it never turns green, inspect `docker compose --env-file .env.compose logs --since 5m tempo`. |
| Prometheus targets are `down` | A scrape or probe job is failing, or the target service is not healthy yet | Open `http://localhost:9090/api/v1/targets`, identify the failing job, and inspect the corresponding service logs. |
| `password authentication failed for user "postgres"` in backend logs | `POSTGRES_PASSWORD` and DB URL credentials are out of sync, or `postgres_data` volume was initialized with an older password | Verify `POSTGRES_PASSWORD`, `BACKEND_DATABASE_URL`, `AI_DATABASE_URL` all match. If password was changed after first run, reset `postgres_data` using the commands above. |
| Backend healthy but `ai-service` unhealthy | Ollama/model pull delay, missing model, or AI-only failure | Backend should still serve core LMS APIs. Check `docker compose logs -f ollama` and `docker compose logs -f ai-service`; AI endpoints recover once Ollama/model pulls are ready. |
| Stack appears stuck while starting | Ollama is pulling models on first run, which can take several minutes | Wait for Ollama pull completion in logs. You can still verify backend independently via `http://localhost:3000/api/health/ready`. |

## Local Development (Service-by-Service)

### 1. Backend

```bash
cd backend
npm install

# Configure environment
cp .env.example .env

# Generate/apply schema changes when needed
npx drizzle-kit generate:pg
npx drizzle-kit push:pg

# Optional seed
node seed-database.js

# Start dev server
npm run start:dev
```

Backend docs:

- Swagger: `http://localhost:3000/api/docs`
- Readiness: `http://localhost:3000/api/health/ready`

### 2. Web Frontend (Next.js)

```bash
cd next-frontend
npm install
npm run dev
```

Default dev URL: `http://localhost:3001`

### 3. AI Service

```bash
cd ai-service
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux/macOS
# source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env

# Ensure Ollama embedding model exists
ollama pull nomic-embed-text

uvicorn app.main:app --reload --port 8000
```

AI readiness endpoint: `http://localhost:8000/ready`

### 4. Mobile (Default Target)

```bash
cd mobile
npm install
npm run start
```

Other commands:

```bash
npm run android
npm run ios
npm run web
npm run typecheck
```

## Quality And Verification Commands

From each app folder:

### Backend

```bash
npm run build
npm run test
npm run test:e2e
```

### Next Frontend

```bash
npm run lint
npm run test
npm run build
```

### AI Service

```bash
python scripts/run_tests.py
```

### Mobile

```bash
npm run typecheck
```

## Environment Files

Primary templates:

- `.env.compose.example`
- `backend/.env.example`
- `ai-service/.env.example`
- `mobile/.env.example`

Container-specific env files used by compose:

- `backend/.env.docker`
- `ai-service/.env.docker`

Important: never commit real secrets or production credentials.

## Product And Progress References

- Project kernel and routing rules: `AGENTS.md`
- Backend setup detail: `backend/BACKEND_SETUP.md`
- Frontend auth milestone summary: `next-frontend/PHASE_1_COMPLETE.md`
- Latest implementation audit: `docs/NEXORA_AUDIT_2026-03-27.md`
- Architecture and deployment docs: `docs/`

## Known Gaps / Next Improvements

Current high-value follow-ups from the latest audit:

1. Strengthen lesson versioning surface.
2. Make teacher-controlled AI scope more explicit in product UX/docs.
3. Resolve remaining frontend lint warnings.
4. Continue doc alignment with current implementation terminology.

## License

UNLICENSED (see repository and package metadata).
