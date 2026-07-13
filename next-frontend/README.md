# Nexora Web Frontend

Next.js 16 App Router and React 19 browser client for Nexora’s student, teacher, and administrator workflows.

## Responsibilities

- Public landing, authentication, profile completion, and guided demo flows.
- Role-specific dashboards and protected workflows.
- Backend API integration, session recovery, notifications, and WebSocket-backed updates.
- Browser-only presentation and interaction; official academic decisions remain backend-owned.

The web app calls backend `/api` routes through the configured rewrite. It never calls the Python AI service directly.

## Important paths

| Path | Ownership |
| --- | --- |
| `app/layout.tsx` | root document/providers |
| `app/(auth)/` | public authentication routes |
| `app/(dashboard)/layout.tsx` | protected role shell |
| `app/(dashboard)/dashboard/{student,teacher,admin}/` | role workspaces |
| `proxy.ts` | high-level public/protected route gating |
| `src/providers/AuthProvider.tsx` | in-browser auth state and bootstrap |
| `src/lib/auth-bootstrap.ts` | bounded current-user bootstrap |
| `src/lib/session-refresh.ts` | refresh coordination and timer cleanup |
| `src/lib/api-client.ts` | in-memory access token and API transport |
| `src/services/` | typed backend domain wrappers |

The teacher class route keeps discussion orchestration in a route-local hook. This is the first seam from the large workspace; further decomposition should remain characterization-first.

## Start locally

```bash
npm install
npm run dev
```

Default URL: `http://localhost:3001`.

Common environment inputs:

- `NEXT_PUBLIC_API_URL`
- `BACKEND_INTERNAL_URL`
- `API_INTERNAL_URL`
- `NEXT_PUBLIC_WS_URL`
- `PLAYWRIGHT_BASE_URL`

For Docker builds and ports, use the root Compose files.

## Session model

- The access token is held in memory.
- The backend refresh token is an HTTP-only cookie.
- Bootstrap and refresh paths are bounded and clear losing timeout handles.
- `proxy.ts`, the protected layout, and `AuthProvider` must stay aligned when route/session behavior changes.
- Client code must not manually write authentication cookies.

## Commands

```bash
npm run dev
npm run dev:smoke
npm run lint
npm run test -- --runInBand --detectOpenHandles
npm run build
npm run test:e2e
```

Targeted performance smoke commands:

```bash
npm run perf:auth-smoke
npm run perf:nav-smoke
npm run perf:discussion-smoke
npm run perf:engine-smoke
```

Generated `playwright-report/` and `test-results/` output is local evidence and must not be committed.

## Verification expectations

- Lint must finish with zero errors and no warning-baseline regression.
- Jest must exit without open handles.
- A production build is required after route, config, auth, or broad component changes.
- Use Playwright for browser-level auth, role routing, and action regressions.
- Manually verify login, refresh, logout, and one protected route after session changes.

See `AGENTS.md` for ownership rules and the root README for full-stack startup.
