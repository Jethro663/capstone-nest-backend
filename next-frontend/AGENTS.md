# Next Frontend Slice

Scope: `next-frontend/` only.

## Rule IDs In Play

- `RESP-1`, `SEC-1`, `AUTH-1`, `AUTH-2`, `VALID-1`
- Backend-alignment rules often touched here: `DOM-2`, `AI-1`, `AUD-1`

## Entrypoints

- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Tests: `npm run test`
- Root layout: `app/layout.tsx`
- Protected shell: `app/(dashboard)/layout.tsx`
- Middleware: `middleware.ts`
- API rewrite: `next.config.ts`

## Owning Paths

- `app/*`: App Router pages, layouts, route groups
- `app/globals.css`: theme tokens and role-shell styling truth
- `src/providers/*`: auth, theme, notifications
- `src/lib/*`: API client, auth helpers, theme metadata
- `src/services/*`: typed domain service wrappers over `api`
- `src/types/*`: runtime-facing contracts
- `src/schemas/*`: form and request validation
- `src/components/*`: UI primitives and role-specific surfaces

## Working Rules

- Respect `RESP-1`: pages and components should consume the backend envelope as-is unless the task explicitly changes the contract.
- Prefer `src/services/*` wrappers over raw axios in pages and components.
- Web auth uses refresh-token cookies plus an in-memory access token in `src/lib/api-client.ts`; never manually write cookies.
- Keep route and auth gating aligned across `middleware.ts`, `app/(dashboard)/layout.tsx`, and `src/providers/AuthProvider.tsx`.
- Preserve role route conventions under `/dashboard/student`, `/dashboard/teacher`, `/dashboard/admin`.

## Change Workflow

1. Start at the owning page, layout, or component.
2. If data shape changes, update `src/types/*` and the matching `src/services/*` wrapper first.
3. If the change is form-driven, align `src/schemas/*`, component props, and submit payload together.
4. If auth or session behavior changes, trace `src/providers/AuthProvider.tsx`, `src/lib/auth-actions.ts`, `src/lib/auth-service.ts`, and `src/lib/api-client.ts`.
5. If route gating changes, check both middleware and the protected layout.

## Do Not Break

- Middleware only handles high-level public/protected gating.
- The dashboard layout redirects unauthenticated users to `/login` and incomplete profiles to `/complete-profile`.
- `app/globals.css` is the authoritative theme surface; do not scatter a second competing color system.
- Student routes rely on the theme switcher; teacher and admin shells have distinct styling conventions.
- This app talks to backend `/api` routes, not directly to `ai-service`.

## Verification

- Run `npm run build` or at minimum `npm run lint` after TS, route, or service changes.
- Run `npm run test` for touched Jest-covered areas.
- Manually verify login, refresh, logout, and one protected dashboard path after auth/client changes.
- Recheck theme switching after shell or `globals.css` changes.
