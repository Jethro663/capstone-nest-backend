# Nexora LMS/LXP Monorepo

Nexora is a learning management and learning experience platform for Gat Andres Bonifacio High School.

This repository contains the full platform stack:
- Backend API (NestJS + Drizzle + PostgreSQL)
- Web app (Next.js App Router)
- AI service (FastAPI + Ollama)
- Mobile app target (Expo in `test-mobile/`)

## Current Project Status (April 2026)

Based on the latest repo audit (`docs/NEXORA_AUDIT_2026-03-27.md`):

- Core LMS and LXP product surfaces are implemented (not placeholders).
- Cross-platform verification is green on the main checks:
  - `next-frontend`: lint passes (warnings only), tests pass, build passes
  - `backend`: build passes
  - `ai-service`: tests pass via `python scripts/run_tests.py`
  - `test-mobile`: typecheck passes
- Remaining work is mostly polish and alignment:
  - lesson versioning depth
  - stronger teacher-facing AI policy/UX surfacing
  - some docs cleanup and frontend warnings

## Monorepo Structure

Top-level apps and services:

- `backend/` - NestJS 11 API, auth/RBAC, LMS domains, reporting, AI proxy, BullMQ orchestration
- `next-frontend/` - Next.js 16 web client (App Router), role-based dashboards and workflows
- `ai-service/` - FastAPI microservice for AI mentor, extraction, retrieval/indexing flows
- `test-mobile/` - default Expo mobile target (student-scoped app)

Other notable folders:

- `docs/` - architecture, audits, deployment notes, testing references
- `monitoring/` - Prometheus/Tempo config
- `mobile/` and `betamochi/` - legacy/alternate mobile tracks, not default target

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
docker compose up --build
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

### Compose Notes

- Backend compose env file: `backend/.env.docker`
- AI service compose env file: `ai-service/.env.docker`
- Ollama pulls configured models at startup:
  - text: `qwen2.5:3b`
  - vision: `gemma3:4b`
  - embedding: `nomic-embed-text`

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
cd test-mobile
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

### Test Mobile

```bash
npm run typecheck
```

## Environment Files

Primary templates:

- `backend/.env.example`
- `ai-service/.env.example`
- `test-mobile/.env.example`

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
