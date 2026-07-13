# Next Frontend Slice

Scope: `next-frontend/` only.

## Rule IDs In Play

- `RESP-1`, `SEC-1`, `AUTH-1`, `AUTH-2`, `VALID-1`
- Backend-alignment rules often touched here: `DOM-2`, `AI-1`, `AUD-1`

## Entrypoints

- Install: `npm install`
- Dev: `npm run dev`
- Dev smoke: `npm run dev:smoke`
- Perf smokes: `npm run perf:auth-smoke`, `npm run perf:nav-smoke`, `npm run perf:discussion-smoke`
- Build: `npm run build`
- Lint: `npm run lint`
- Tests: `npm run test`
- E2E: `npm run test:e2e`
- Root layout: `app/layout.tsx`
- Protected shell: `app/(dashboard)/layout.tsx`
- Route gate: `proxy.ts`
- API rewrite: `next.config.ts`

## Owning Paths

- `app/*`: App Router pages, layouts, route groups
- `app/globals.css`: theme tokens and role-shell styling truth
- `src/providers/*`: auth, theme, notifications
- `src/lib/*`: API client, auth bootstrap/refresh helpers, theme metadata
- `src/services/*`: typed domain service wrappers over `api`
- `src/types/*`: runtime-facing contracts
- `src/schemas/*`: form and request validation
- `src/components/*`: UI primitives and role-specific surfaces

## Working Rules

- Respect `RESP-1`: pages and components should consume the backend envelope as-is unless the task explicitly changes the contract.
- Prefer `src/services/*` wrappers over raw axios in pages and components.
- Web auth uses refresh-token cookies plus an in-memory access token in `src/lib/api-client.ts`; never manually write cookies.
- Keep route and auth gating aligned across `proxy.ts`, `app/(dashboard)/layout.tsx`, `src/providers/AuthProvider.tsx`, `src/lib/auth-bootstrap.ts`, and `src/lib/session-refresh.ts`.
- Preserve role route conventions under `/dashboard/student`, `/dashboard/teacher`, `/dashboard/admin`.
- Use Serena first for route discovery, ownership lookup, and symbol-aware inspection before broad file dumping.
- Use Playwright for browser reproduction, auth flow checks, and UI evidence when the task depends on runtime web behavior.

## Change Workflow

1. Start at the owning page, layout, or component.
2. If data shape changes, update `src/types/*` and the matching `src/services/*` wrapper first.
3. If the change is form-driven, align `src/schemas/*`, component props, and submit payload together.
4. If auth or session behavior changes, trace `src/providers/AuthProvider.tsx`, `src/lib/auth-actions.ts`, `src/lib/auth-service.ts`, `src/lib/auth-bootstrap.ts`, `src/lib/session-refresh.ts`, and `src/lib/api-client.ts`.
5. If route gating changes, check both middleware and the protected layout.
6. If the frontend contract or dashboard behavior changes, pick the smallest repo-native smoke or perf script that exercises the affected path before broadening verification.

## Do Not Break

- Middleware only handles high-level public/protected gating.
- The dashboard layout redirects unauthenticated users to `/login` and incomplete profiles to `/complete-profile`.
- `app/globals.css` is the authoritative theme surface; do not scatter a second competing color system.
- Student routes rely on the theme switcher; teacher and admin shells have distinct styling conventions.
- This app talks to backend `/api` routes, not directly to `ai-service`.
- Generated `playwright-report/` and `test-results/` output is local evidence and must not be committed.
- Preserve the route-local teacher discussion hook boundary; expand it one characterized responsibility at a time.

## Verification

- Run `npm run build` or at minimum `npm run lint` after TS, route, or service changes.
- Run `npm run test` for touched Jest-covered areas.
- Run `npm run dev:smoke` for route, app-shell, or API wiring changes that should survive a real dev boot.
- Use `npm run perf:auth-smoke`, `npm run perf:nav-smoke`, or `npm run perf:discussion-smoke` when the touched path matches those flows.
- Run `npm run test:e2e` for browser-level regressions or route transitions that unit tests will not prove.
- Manually verify login, refresh, logout, and one protected dashboard path after auth/client changes.
- Recheck theme switching after shell or `globals.css` changes.
