# Nexora Backend

NestJS 11 backend for the Nexora LMS/LXP platform.

## What It Does

This service is the system of record for:

- authentication, refresh-token rotation, OTP verification, and role-based access
- users, sections, classes, teacher and student profiles
- lessons, modules, assessments, class records, announcements, and notifications
- reports, analytics, performance snapshots, and intervention workflows
- AI proxying to `../ai-service` for tutor, extraction, quiz drafting, lesson-plan drafting, and related jobs

Main entry points:

- boot: `src/main.ts`
- module graph root: `src/app.module.ts`
- schema source of truth: `src/drizzle/schema/`
- migrations: `drizzle/`

## Common Commands

```bash
npm install
npm run start:dev
npm run build
npm run test
npm run test:e2e
npm run seed:smoke
```

## Environment

Start from `backend/.env.example`.

Key variables:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - BullMQ / Redis connection
- `JWT_SECRET` - access-token signing secret
- `JWT_REFRESH_SECRET` - refresh-token signing secret
- `OTP_PEPPER` - OTP hashing pepper
- `FRONTEND_URL`, `NEXT_FRONTEND_URL`, `MOBILE_URL` - CORS/session origin inputs
- `AI_SERVICE_URL` - backend-to-ai-service base URL; use the internal Railway/private service URL in production
- `AI_SERVICE_SHARED_SECRET` - shared secret forwarded to `ai-service` as `X-Internal-Service-Token`; it must exactly match the ai-service value
- `AI_DEGRADED_ALLOWED` - keep this aligned with ai-service so backend readiness and ai-service readiness agree on degraded runtime policy

Production AI notes:

- Backend proxies AI traffic to ai-service; web and mobile do not talk to ai-service directly.
- Railway/production should treat OpenRouter-backed cloud mode as the primary AI runtime.
- Backend readiness now depends on ai-service readiness semantics, not just ai-service reachability.

## API Shape

- global prefix: `/api`
- global auth guard is enabled by default; public routes use `@Public()`
- most responses follow the backend envelope style: `success`, `message`, `data`

## Related Files

- setup guide: `BACKEND_SETUP.md`
- AI architecture notes: `AI_MENTOR_README.md`
- compose runtime env: `../.env.compose.example`
- root product overview: `../README.md`

## Verification Notes

- `npm run build` checks backend compilation
- `npm run test` runs unit specs under `src/`
- `npm run test:e2e` runs e2e specs under `test/`
- `npm run seed:smoke` validates seeded LMS/LXP data assumptions
- `npm run test -- --runInBand src/modules/health/health.service.spec.ts` verifies backend readiness handling for ai-service
