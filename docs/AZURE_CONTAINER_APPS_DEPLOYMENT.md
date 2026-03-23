# Safe Azure + Vercel Deployment Guide

This guide matches the current repo architecture and is optimized for a first deployment that avoids accidental Azure spend.

## Phase 1 Topology

- `next-frontend`: Vercel
- `backend`: Azure Container Apps, external ingress
- `ai-service`: Azure Container Apps, internal ingress only
- `redis`: Azure Container Apps, internal ingress only
- `postgres`: Azure Database for PostgreSQL Flexible Server
- uploads: Azure Files mounted into both `backend` and `ai-service`
- `ollama`: not deployed in Phase 1

## Cost Guardrails First

Before creating any Azure resources:

1. Keep the Azure spending limit enabled if your subscription still includes free credit.
2. If you are on pay-as-you-go, create budget alerts at `$10`, `$25`, and `$50`.
3. Use one resource group and one region. Recommended starter region: `Southeast Asia`.
4. Do not create these on day 1:
   - Managed Redis
   - Private endpoints
   - Custom domains
   - Dedicated workload profiles
   - GPU resources
   - Ollama
   - PostgreSQL high availability

## Repo-Specific Runtime Rules

### Frontend proxy behavior

[`next-frontend/next.config.ts`](../next-frontend/next.config.ts) rewrites `/api/:path*` to `NEXT_PUBLIC_API_URL + /api/:path*`.

Use:

```env
NEXT_PUBLIC_API_URL=https://your-backend-fqdn
```

Do not use:

```env
NEXT_PUBLIC_API_URL=https://your-backend-fqdn/api
```

### Backend readiness and seeding

- Readiness: `/api/health/ready`
- Liveness: `/api/health/live`
- Migrations run on container startup when `RUN_DB_MIGRATIONS=true`
- Seeding only runs when `RUN_DB_SEED=true`
- Steady state must keep `RUN_DB_SEED=false`

### AI service exposure

- AI service must stay internal-only
- Backend forwards `X-Internal-Service-Token`
- `AI_SERVICE_SHARED_SECRET` must match on backend and ai-service
- Phase 1 should keep `AI_DEGRADED_ALLOWED=true`

## Required Environment Variables

### Backend

Use [`backend/.env.example`](../backend/.env.example) as the template.

```env
DATABASE_URL=postgresql://postgres:<password>@<postgres-host>:5432/capstone
REDIS_URL=redis://redis:6379
FRONTEND_URL=https://<your-vercel-domain>
BACKEND_PUBLIC_URL=https://<backend-fqdn>
CORS_ALLOWED_ORIGINS=https://<your-vercel-domain>
JWT_SECRET=<32+ chars>
JWT_REFRESH_SECRET=<32+ chars>
OTP_PEPPER=<long random secret>
AI_SERVICE_URL=http://ai-service
AI_SERVICE_SHARED_SECRET=<same secret as ai-service>
AI_DEGRADED_ALLOWED=true
TRUST_PROXY_HOPS=1
RUN_DB_MIGRATIONS=true
RUN_DB_SEED=false
```

Optional later:

```env
EMAIL_SERVICE=
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM=
COOKIE_DOMAIN=
```

### AI service

Use [`ai-service/.env.example`](../ai-service/.env.example) as the template.

```env
DATABASE_URL=postgresql+asyncpg://postgres:<password>@<postgres-host>:5432/capstone
UPLOAD_DIR=/app/uploads
AI_SERVICE_SHARED_SECRET=<same secret as backend>
AI_DEGRADED_ALLOWED=true
```

Phase 1:

- Leave `OLLAMA_BASE_URL` unset

Phase 2:

```env
OLLAMA_BASE_URL=http://ollama:11434
```

### Vercel

Use [`next-frontend/.env.local.example`](../next-frontend/.env.local.example) as the template.

```env
NEXT_PUBLIC_API_URL=https://<backend-fqdn>
NEXT_PUBLIC_WS_URL=https://<backend-fqdn>
```

### Mobile

Use [`mobile/.env.example`](../mobile/.env.example) or [`test-mobile/.env.example`](../test-mobile/.env.example).

```env
EXPO_PUBLIC_API_URL=https://<backend-fqdn>/api
```

## Azure Build and Deploy Sequence

### 1. Create foundation resources

Create these in the same region:

1. Resource group
2. Azure Container Registry, Basic tier
3. Azure Database for PostgreSQL Flexible Server
4. Storage account
5. Azure Files share, for example `nexora-uploads`
6. Azure Container Apps environment, Consumption plan

### 2. PostgreSQL setup

Before the backend starts:

1. Allowlist the `pgvector` extension on the PostgreSQL server
2. Enable `vector` in the database
3. Confirm your backend migration user can create extensions

### 3. Container images

Build and push only these two repo images for Phase 1:

- `backend`
- `ai-service`

Recommended tags:

```text
backend:phase1
ai-service:phase1
```

### 4. Azure Files mount

Mount the same Azure Files share into:

- `backend` at `/app/uploads`
- `ai-service` at `/app/uploads`

This is required for:

- profile image uploads
- PDF uploads
- AI extraction access to uploaded files

### 5. Deploy `redis`

Deploy `redis` first as an internal Container App.

Settings:

- ingress: internal
- target port: `6379`
- minimum replicas: `1`
- no persistence required for first deployment

### 6. Deploy `ai-service`

Deploy `ai-service` second as an internal Container App.

Settings:

- ingress: internal
- target port: `8000`
- mount uploads share at `/app/uploads`
- `AI_DEGRADED_ALLOWED=true`
- do not configure `OLLAMA_BASE_URL` yet

Health checks:

- readiness: `/ready`
- liveness: `/live`

### 7. Deploy `backend`

Deploy `backend` last as an external Container App.

Settings:

- ingress: external
- target port: `3000`
- mount uploads share at `/app/uploads`
- `AI_SERVICE_URL=http://ai-service`
- `RUN_DB_MIGRATIONS=true`
- `RUN_DB_SEED=false`

Health checks:

- readiness: `/api/health/ready`
- liveness: `/api/health/live`

## Safe Seeding Procedure

Do not leave seeding enabled permanently.

1. Deploy backend with `RUN_DB_SEED=false`
2. Wait until `/api/health/ready` is healthy
3. Create one temporary revision with:

```env
RUN_DB_SEED=true
```

4. Watch logs until `seed-database.js` completes successfully
5. Revert backend to:

```env
RUN_DB_SEED=false
```

The seed script is idempotent, but the app should not seed on every production revision.

## Vercel Deployment

1. Import `next-frontend` into Vercel as a separate project
2. Set:

```env
NEXT_PUBLIC_API_URL=https://<backend-fqdn>
NEXT_PUBLIC_WS_URL=https://<backend-fqdn>
```

3. Deploy the project
4. After Vercel gives you the final domain, update backend:

```env
FRONTEND_URL=https://<your-vercel-domain>
CORS_ALLOWED_ORIGINS=https://<your-vercel-domain>
```

5. Redeploy backend once more

## Phase 2: Enable Real Ollama-Based AI

Only do this after Phase 1 is stable and budget alerts are active.

1. Deploy `ollama` as a third internal Container App
2. Mount persistent storage at `/root/.ollama`
3. Pull only these models:
   - `qwen2.5:3b`
   - `gemma3:4b`
   - `nomic-embed-text`
4. Update ai-service:

```env
OLLAMA_BASE_URL=http://ollama:11434
AI_DEGRADED_ALLOWED=false
```

5. Update backend:

```env
AI_DEGRADED_ALLOWED=false
```

6. Re-verify readiness:
   - `ai-service`: `/ready`
   - `backend`: `/api/health/ready`

## Validation Checklist

### Database

- Backend migrations complete
- `vector` extension is available
- Seed runs once without errors
- Teacher profiles contain:
  - `employee_id`
  - `date_of_birth`
  - `gender`
  - `address`
  - `contact_number`

### Backend

- `GET /api/health/live` returns healthy
- `GET /api/health/ready` returns healthy in degraded mode
- Auth works from Vercel frontend
- Cookie refresh works across Vercel and Azure
- Notifications websocket connects with `NEXT_PUBLIC_WS_URL`

### Shared file flow

- Backend upload succeeds
- File appears in Azure Files
- AI service can read the same file from `/app/uploads`

### Frontend

- Pages load on Vercel
- Requests go through Next rewrites
- No browser-side CORS failures for normal flows

### AI

- Phase 1: ai-service remains usable in degraded mode
- Phase 2: chat and extraction work end-to-end with Ollama

## Notes

- `COOKIE_DOMAIN` should stay empty on day 1 unless frontend and backend later move under the same parent domain.
- The mobile apps now default to localhost when `EXPO_PUBLIC_API_URL` is not set; for real device or production use, always set the env explicitly.
