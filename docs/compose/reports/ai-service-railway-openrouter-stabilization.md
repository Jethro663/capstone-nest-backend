---
feature: ai-service-railway-openrouter-stabilization
status: delivered
specs: []
plans:
  - .mimocode/plans/1782450636959-witty-island.md
branch: developement
commits: uncommitted
---

# AI Service Railway/OpenRouter Stabilization — Final Report

## What Was Built

The ai-service startup path is now resilient to stale-job cleanup and orphan-recovery database failures, so a bad database password or temporary database outage no longer kills the FastAPI process during boot. This directly reduces Railway startup failures and lets readiness, not process death, represent AI dependency problems.

OpenRouter-backed cloud mode was made explicit as the primary production configuration path. The service now accepts `AI_CLOUD_FALLBACK_PROVIDER=openrouter` at runtime, the environment template exposes the full OpenRouter-related configuration surface, and the service README explains the intended Railway operating model, readiness endpoints, and verification flow.

The backend readiness check now probes ai-service `/ready` instead of raw `/health`, so backend health reflects ai-service production readiness semantics rather than simple reachability. AI-facing docs across the repo were updated to describe the internal proxy contract, shared-secret alignment, `.env.local` usage, and workflow-driven Railway deployment expectations.

## Architecture

The final architecture stays the same: `backend/src/modules/ai-mentor/ai-proxy.service.ts` remains the only public entry path for AI traffic, and `ai-service` remains internal-only behind the backend proxy. The FastAPI service continues to support local Ollama, but Railway/production documentation now treats OpenRouter-backed cloud mode as the canonical runtime.

The key runtime changes live in `ai-service/app/main.py`, `ai-service/app/cloud_fallback.py`, and `backend/src/modules/health/health.service.ts`. Startup errors in ai-service cleanup routines are downgraded to warnings, OpenRouter is accepted as an OpenAI-compatible provider alias, and backend readiness uses `GET /ready` to interpret ai-service production state.

### Design Decisions

- We kept the backend-to-ai-service proxy boundary intact because web and mobile auth/RBAC still belong in the Nest backend.
- We treated OpenRouter as the primary production path in docs and templates without removing Ollama support, because the repo still benefits from local/offline development.
- We preserved degraded-mode behavior instead of turning every AI runtime issue into a full backend outage, but made backend readiness respect ai-service readiness semantics instead of generic reachability.

## Usage

Preferred production ai-service configuration is now documented as:

```env
AI_RUNTIME_MODE=cloud
AI_CLOUD_FALLBACK_PROVIDER=openrouter
AI_CLOUD_FALLBACK_ENABLED=true
AI_CLOUD_FALLBACK_BASE_URL=https://openrouter.ai/api/v1
AI_CLOUD_FALLBACK_API_KEY=<key>
AI_CLOUD_FALLBACK_MODEL=openrouter/auto
OPENROUTER_EMBEDDING_MODEL=google/gemini-embedding-2-preview
AI_SERVICE_SHARED_SECRET=<same-secret-as-backend>
```

Backend and ai-service must share `AI_SERVICE_SHARED_SECRET`. Backend should target the internal ai-service URL via `AI_SERVICE_URL`, and backend readiness should be checked through its own health endpoints after ai-service is configured.

For local ai-service development, copy `ai-service/.env.example` to `.env.local`, install dependencies, and run `uvicorn app.main:app --reload --port 8000`. Use Ollama only when you explicitly want local model execution.

## Verification

Verified with:

- `cd ai-service && ./.venv/bin/python scripts/run_tests.py`
- `cd ai-service && ./.venv/bin/python -c "from app.main import app; print(app.title)"`
- `cd ai-service && DATABASE_URL="postgresql+asyncpg://postgres:wrong@localhost:5432/capstone" timeout 10s ./.venv/bin/uvicorn app.main:app --port 8010 --log-level warning`
- `cd backend && npm run test -- --runInBand src/modules/health/health.service.spec.ts`
- `cd backend && npm run build`
- Railway production env contract checks for backend/ai-service shared-secret alignment, cloud mode, and OpenRouter alias variable presence

The final Railway env check confirmed live `ai-service` production is in cloud mode, backend and ai-service shared secrets match, and OpenRouter alias variables are present. One remaining operational note is that the live env currently uses `OPENROUTER_*` aliases with `AI_CLOUD_FALLBACK_PROVIDER=openai`; this remains functional after the compatibility fix, but the documented preferred shape is now `AI_CLOUD_FALLBACK_PROVIDER=openrouter`.

## Journey Log

> Brief notes on what informed the final design. Not required reading.

- [dead end] The original ai-service startup path assumed database cleanup should succeed during boot, which caused Railway startup failure when database auth was wrong.
- [pivot] The first OpenRouter review showed the base URL/status path recognized OpenRouter while request generation still rejected `provider=openrouter`, so provider compatibility had to be fixed in code, not just docs.
- [lesson] Backend health checks that only prove reachability are too weak for AI subsystems; readiness semantics need to travel across service boundaries.

## Source Materials

| File | Role | Notes |
|------|------|-------|
| `.mimocode/plans/1782450636959-witty-island.md` | Implementation plan | Executed plan for this stabilization pass |
| `ai-service/app/main.py` | Startup/readiness logic | Startup cleanup resilience |
| `ai-service/app/cloud_fallback.py` | OpenRouter-compatible cloud runtime | Provider alias compatibility |
| `backend/src/modules/health/health.service.ts` | Backend readiness integration | Probes ai-service `/ready` |
| `ai-service/README.md` | Service operator guide | Production OpenRouter guidance |
| `backend/AI_MENTOR_README.md` | Legacy architecture guide | Clarified current production mode |
