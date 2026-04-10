# Teacher + Student Audit Summary

## Scope

- Frontend: `http://localhost:3001`
- Backend: `http://localhost:3000`
- AI service health: `http://localhost:8000/health` returned `200`
- Primary seeded accounts used for verification:
  - Student: `student71@lms.local` / `Student123!`
  - Teacher: `teacher1@lms.local` / `Teacher123!`

## Fixed In This Pass

### 1. Auth/session gating is now enforced server-side

- `next-frontend/middleware.ts` no longer treats every pathname as public because of the old `startsWith('/')` matcher.
- Anonymous requests to protected routes now redirect immediately to `/login?from=...`.
- `/login` now redirects to `/dashboard` when a refresh cookie already exists.

### 2. Public login no longer emits avoidable auth noise

- `next-frontend/src/providers/AuthProvider.tsx` now skips refresh bootstrapping outside `/dashboard` routes.
- Anonymous visits to `/login` no longer trigger `/api/auth/refresh => 401` in the browser console/network log.
- `next-frontend/src/components/auth/LoginForm.tsx` now sets `autocomplete="username"` and `autocomplete="current-password"`.

### 3. Logout now invalidates the refresh-backed session correctly

- `backend/src/modules/auth/auth.controller.ts` marks `POST /auth/logout` as public so it can always revoke the refresh token and clear the cookie.
- `next-frontend/src/lib/auth-service.ts` sends logout requests with `skipAuthRefresh` and `skipSessionExpiredRedirect` so sign-out does not enter a refresh retry loop.
- Direct backend verification after the patch:
  - `POST /api/auth/login => 200`
  - `POST /api/auth/logout => 200`
  - `POST /api/auth/refresh => 401` when replayed with the same cookie jar after logout

### 4. Shared top-bar notification affordances are clearer

- `next-frontend/src/components/layout/TopBar.tsx` now gives the notification controls descriptive `title` and `aria-label` text, including unread counts when present.

## Current Findings By Priority

### Auth/session correctness

- Resolved: protected-route middleware bypass
- Resolved: public login refresh noise
- Resolved: logout could leave a refreshable session behind

### Broken writes and transaction failures

- No additional teacher/student transaction failures were confirmed after the auth fixes in this pass.
- High-impact academic writes were intentionally left out of replay scope where they would mutate seeded records irreversibly.

### DTO/envelope mismatches

- No backend envelope regressions were confirmed in the sampled teacher/student shell and AI-entry route checks.
- Backend and AI health endpoints remained reachable during the run.

### Route/render/data inconsistencies

- Prompt-supplied custom credentials are not valid in the current seeded local environment:
  - Student: `jethrojosephdida@gmail.com` / `Test@123`
  - Teacher: `teacher@lms.local` / `Teacher123!`
- This is currently a seed/environment mismatch, not a frontend contract bug.

### UX/discoverability backlog

- Open: sidebar navigation still uses imperative buttons with `router.push(...)` rather than semantic links, which weakens accessibility and removes standard browser behaviors like opening routes in a new tab.
- Open: the shared shell still concentrates many high-value actions into dense icon/menu clusters; the top-bar notification labels are improved, but broader teacher/student shell affordance cleanup remains worthwhile.
- Open: the Next.js build now warns that the `middleware` convention is deprecated in favor of `proxy`; functional behavior is fixed, but the file should be renamed on a follow-up pass.

## AI Coverage Notes

- AI service health returned `200` during the run.
- Teacher AI entry surfaces and student AI entry routes were sampled at route/bootstrap level.
- No AI proxy or envelope failures were confirmed in this pass.
- Full conversational and generation workflows remain a follow-up item once a stable seeded-data-safe harness is available for JA/LXP/extraction writes.

## Verification Completed

- Frontend targeted tests:
  - `npx jest --runTestsByPath middleware.test.ts src/providers/AuthProvider.test.tsx src/lib/auth-service.test.ts`
- Backend targeted tests:
  - `npx jest --runTestsByPath src/modules/auth/auth.controller.spec.ts src/modules/auth/auth.controller.mobile.spec.ts src/modules/auth/auth.service.spec.ts`
- Frontend build:
  - `npm run build` in `next-frontend`
- Backend build:
  - `npm run build` in `backend`
