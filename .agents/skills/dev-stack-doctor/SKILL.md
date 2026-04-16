---
name: dev-stack-doctor
description: Use when Docker Compose, env alignment, health checks, startup, readiness, or local service dependency failures block development in capstone-nest-react-lms.
---

# Dev Stack Doctor

Restore the development stack by verifying configuration, dependencies, and readiness in dependency order. This skill is for environment truth, not feature debugging.

## Quick Start

- Emit:
  `ROUTER_TRACE task=dev-stack include=kernel,backend,ai-service optional_skipped=<unneeded slices> exclude=<unrelated slices> reason=<one line>`
- Start from:
  - root `README.md`
  - root `AGENTS.md`
  - backend and AI slice docs
  - named client slice only when the failure mentions it

## Use This For

- `docker compose` unhealthy services
- env mismatch or missing secret
- backend starts but AI does not
- Ollama, Redis, or Postgres dependency failures
- readiness endpoints disagree with container state
- port conflicts or local startup confusion

## Workflow

1. Verify declared configuration first:
   - `.env.compose.example`
   - `docker-compose.yml`
   - service-specific `.env.example` or `.env.docker`
2. Check dependency order and ownership:
   - Postgres and Redis
   - Ollama and AI service
   - backend
   - frontend or mobile only when named
3. Use the smallest truthful command set:
   - `docker compose config`
   - `docker compose ps`
   - `docker compose logs -f <service>`
   - service readiness endpoints
4. Distinguish config drift from runtime failure:
   - bad secret or URL
   - missing model or dependency
   - startup timeout or slow first boot
   - client points to wrong backend URL
5. When fixed, re-verify the exact failing service plus the next consumer upstream.

## Do Not Use This For

- product logic bugs after all services are healthy
- performance tuning once the stack is already running
- frontend-only UI bugs

## Ready State

- failing service reaches its expected ready state
- upstream dependent service can use it
- the root cause is recorded as config, dependency, or runtime failure
