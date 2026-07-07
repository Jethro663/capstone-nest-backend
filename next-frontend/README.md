# Nexora Web Frontend

Next.js 16 App Router web client for Nexora LMS/LXP.

## What It Does

This app provides the main browser experience for:

- public landing and guided demo flows
- auth, profile completion, and session bootstrap
- admin dashboards for users, classes, sections, reports, audits, templates, and settings
- teacher dashboards for classes, lessons, modules, assessments, interventions, performance, library, and reports
- student dashboards for classes, lessons, assessments, JA, LXP, transcript, performance, calendar, and announcements

The app talks to backend `/api` routes through a local rewrite rather than calling the Python AI service directly.

## Common Commands

```bash
npm install
npm run dev
npm run dev:smoke
npm run build
npm run start
npm run lint
npm run test
npm run test:e2e
```

Default local URL: `http://localhost:3001`

## Runtime Notes

- `next.config.ts` rewrites `/api/:path*` to the backend origin.
- `proxy.ts` performs high-level public/protected route gating.
- `src/lib/api-client.ts` keeps the access token in memory and relies on backend refresh cookies for web session recovery.

## Important App Paths

- root layout: `app/layout.tsx`
- protected shell: `app/(dashboard)/layout.tsx`
- auth routes: `app/(auth)/`
- admin pages: `app/(dashboard)/dashboard/admin/`
- teacher pages: `app/(dashboard)/dashboard/teacher/`
- student pages: `app/(dashboard)/dashboard/student/`
- service wrappers: `src/services/`

## Environment Inputs

Commonly used values:

- `NEXT_PUBLIC_API_URL`
- `BACKEND_INTERNAL_URL`
- `API_INTERNAL_URL`
- `NEXT_PUBLIC_WS_URL`
- `PLAYWRIGHT_BASE_URL`

For Docker builds, see `next-frontend/Dockerfile` and root `docker-compose.yml`.

## Verification Notes

- `npm run test` runs Jest unit/integration tests
- `npm run test:e2e` runs Playwright browser tests
- `npm run dev:smoke` boots the dev server and checks the local health route
- perf scripts under `scripts/` are targeted operator/debugging tools, not the main development loop
