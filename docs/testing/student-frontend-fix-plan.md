# Student Frontend Fix Plan

## Summary

- Target role: `student`
- Issues to address: `3`
- This plan is derived from the latest audit evidence and stops before code changes.

## Issues

### 1. [Resolved] Middleware allowed unauthenticated student routes to bypass server-side gating

- Owner: `frontend`
- Source area: `next-frontend/middleware.ts`
- Problem: The middleware treated every pathname as public because PUBLIC_ROUTES included `/` and used startsWith matching, so `/dashboard/*` requests bypassed the intended server-side redirect and fell through to client-side auth handling.
- Fix intent: Use exact matching for `/`, prefix-aware matching for scoped routes, and redirect `/login` to `/dashboard` only when a refresh cookie exists.
- Verification: Request `http://localhost:3001/dashboard/student` with no cookies and confirm the final URL is `http://localhost:3001/login?from=%2Fdashboard%2Fstudent`.

### 2. [Resolved] Public login loaded an avoidable `/api/auth/refresh` 401 on anonymous student sessions

- Owner: `frontend`
- Source area: `next-frontend/src/providers/AuthProvider.tsx`
- Problem: AuthProvider always attempted a refresh-token exchange on mount, which turned the expected anonymous state into a 401 network failure and console noise on the public login page.
- Fix intent: Skip auth bootstrap outside `/dashboard` routes and let middleware own the already-authenticated redirect to `/dashboard`.
- Verification: Open `/login` with cleared cookies and confirm there is no `/api/auth/refresh` request and no auth-related console error.

### 3. Prompt-supplied custom student credentials do not exist in the seeded local environment

- Owner: `data-seed`
- Source area: `backend/seed-database.js`
- Problem: The active seed data does not contain the prompt-supplied student account, so login returns `401 Invalid credentials` even though the seeded student account succeeds.
- Fix intent: Use the seeded student credentials for regression runs or explicitly add the requested account to the seed/environment when that account is intended to exist.
- Verification: Login with `student71@lms.local / Student123!` for the seeded environment, or seed the custom account and confirm it returns `200`.

