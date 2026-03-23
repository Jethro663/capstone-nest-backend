# Next Frontend Agent Guide

## Purpose
- Scope: `next-frontend/` only.
- Stack: Next.js 16 App Router, React 19, Tailwind CSS v4, axios, react-hook-form, zod, sonner, Radix/shadcn-style UI.
- Role: primary web client for student, teacher, and admin flows against the Nest backend.

## Entrypoints / run commands
- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Tests: `npm run test`
- Root layout: `app/layout.tsx`
- Route middleware: `middleware.ts`
- API rewrite: `next.config.ts`

## Architecture / folder map
- `app/*`: App Router pages, layouts, route groups.
- `app/globals.css`: theme tokens, shell classes, role-specific visual system; primary styling truth.
- `app/(auth)/*`: public auth and recovery flows.
- `app/(dashboard)/*`: protected app shell and role routes.
- `src/providers/*`: auth, notifications, theme.
- `src/lib/*`: API client, auth service/actions, theme metadata, helpers.
- `src/services/*`: domain service wrappers over `api`.
- `src/types/*`: runtime-facing TS contracts for backend data.
- `src/schemas/*`: form/request validation schemas.
- `src/components/ui/*`: reusable UI primitives.
- `src/components/student|teacher|admin|layout|profile/*`: role-specific UI.
- `public/*`: static assets.

## Change workflow
- Start from the route/page or component that owns the behavior.
- If backend data changes, update `src/types/*` and the matching `src/services/*` wrapper first.
- If the change is form-driven, align `src/schemas/*`, component props, and submit payload together.
- If auth/session behavior changes, trace through `src/providers/AuthProvider.tsx`, `src/lib/auth-actions.ts`, `src/lib/auth-service.ts`, and `src/lib/api-client.ts`.
- If route gating changes, check both `middleware.ts` and `app/(dashboard)/layout.tsx`.
- Keep role-specific visuals inside existing student/teacher/admin shell patterns instead of ad hoc page styling.

## Patterns to follow
- Boot chain is `app/layout.tsx` -> `ThemeProvider` -> `AuthProvider` -> `NotificationProvider` -> route tree.
- Backend calls go through relative `/api`; `next.config.ts` rewrites to `NEXT_PUBLIC_API_URL` or `http://localhost:3000`.
- `src/lib/api-client.ts` stores access token in memory and refreshes via `/api/auth/refresh`; web uses httpOnly refresh cookies.
- `src/lib/auth-actions.ts` are client helpers, not server actions.
- Prefer `src/services/*` wrappers over raw axios in pages/components.
- Student theme switching uses `src/providers/ThemeProvider.tsx`, `src/lib/themes.ts`, `src/components/layout/StudentThemeSwitcher.tsx`, and CSS variables in `app/globals.css`.
- Sidebar/topbar/navigation are role-aware; preserve existing route conventions under `/dashboard/student`, `/dashboard/teacher`, `/dashboard/admin`.
- Use existing UI primitives and role page shells before inventing new component patterns.

## Do not break / invariants
- Middleware only checks session cookie presence and public/protected route access; detailed auth state resolves client-side.
- Protected dashboard layout redirects unauthenticated users to `/login` and profile-incomplete users to `/complete-profile`.
- Web auth assumes refresh token cookie is backend-managed; frontend never manually writes cookies.
- API envelope assumptions are widespread: `success`, `message`, `data`.
- `app/globals.css` is large but authoritative for theme tokens and role shell classes; avoid scattering duplicate color systems.
- Student routes use the theme switcher; teacher/admin routes use distinct shell styling conventions.

## Where to add or modify code
- New page/route: `app/(auth)/*` or `app/(dashboard)/*` plus supporting components.
- Shared data access: `src/services/*`, `src/types/*`, optionally `src/schemas/*`.
- Auth/session logic: `src/providers/AuthProvider.tsx`, `src/lib/auth-actions.ts`, `src/lib/auth-service.ts`, `src/lib/api-client.ts`.
- Theme work: `app/globals.css`, `src/lib/themes.ts`, `src/providers/ThemeProvider.tsx`.
- Role navigation/shells: `src/components/layout/Sidebar.tsx`, `src/components/layout/TopBar.tsx`, role-specific page shell components.
- Reusable UI: `src/components/ui/*`.

## Validation / tests
- Required for TS/route/service changes: `npm run build` or at minimum `npm run lint`.
- Use `npm run test` for touched Jest-covered areas.
- Manually verify login/refresh/logout and one protected dashboard path after auth or API-client changes.
- Manually verify theme switching on student routes after `globals.css`, theme provider, or shell changes.

## Cross-service touchpoints
- Consumes backend `/api` routes through Next rewrite proxy; keep backend envelope/auth contracts aligned.
- Web auth depends on backend cookie refresh flow, unlike `test-mobile` token persistence.
- AI, notifications, class record, LXP, and profile features all depend on backend modules; this app does not talk to `ai-service` directly.
- If changing shared domain types, coordinate with `backend`, `test-mobile`, and any matching service wrappers.
