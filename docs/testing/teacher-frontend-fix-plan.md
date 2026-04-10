# Teacher Frontend Fix Plan

## Summary

- Target role: `teacher`
- Issues to address: `3`
- This plan is derived from the latest audit evidence and stops before code changes.

## Issues

### 1. [Resolved] Logout could fail with 401 and leave a refreshable teacher session behind

- Owner: `integration`
- Source area: `backend/src/modules/auth/auth.controller.ts + next-frontend/src/lib/auth-service.ts`
- Problem: The backend logout endpoint required JWT auth even though its job was to revoke the refresh token and clear the cookie. When the access token was stale or missing, logout returned 401, the frontend still redirected, and the next refresh could silently resurrect the session.
- Fix intent: Mark logout as public so it can always clear the refresh cookie, and send logout requests with `skipAuthRefresh` / `skipSessionExpiredRedirect` to avoid retry loops during sign-out.
- Verification: Use a cookie jar: `POST /api/auth/login => 200`, `POST /api/auth/logout => 200`, `POST /api/auth/refresh => 401`.

### 2. [Resolved] Public login loaded an avoidable `/api/auth/refresh` 401 before teacher sign-in

- Owner: `frontend`
- Source area: `next-frontend/src/providers/AuthProvider.tsx`
- Problem: AuthProvider always attempted refresh on mount, so anonymous teacher sign-in started from a noisy 401 refresh failure on the public login route.
- Fix intent: Skip refresh bootstrap outside `/dashboard` routes and let middleware redirect already-authenticated login requests to `/dashboard`.
- Verification: Open `/login` with no cookies and confirm no `/api/auth/refresh` request is issued.

### 3. Prompt-supplied custom teacher credentials do not exist in the seeded local environment

- Owner: `data-seed`
- Source area: `backend/seed-database.js`
- Problem: The active seeded environment does not include the prompt-supplied teacher account, so login returns `401 Invalid credentials` while the seeded teacher account succeeds.
- Fix intent: Use the seeded teacher credentials for local regression sweeps or add the requested account to the seed/environment intentionally.
- Verification: Login with `teacher1@lms.local / Teacher123!` for the current seed, or seed the requested account and confirm it returns `200`.

