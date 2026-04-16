# Student Frontend Audit

## Run Summary

- Role: `student`
- Frontend root: `next-frontend`
- Seed file: `backend/seed-database.js`
- Base URL: `http://localhost:3001`
- Routes discovered: `16`
- Findings: `3`
- Severity counts: `{'high': 1, 'medium': 1, 'low': 1}`

## Route Inventory

- `/dashboard`
- `/dashboard/notifications`
- `/dashboard/student`
- `/dashboard/student/announcements`
- `/dashboard/student/assessments/[id]`
- `/dashboard/student/assessments/[id]/results/[attemptId]`
- `/dashboard/student/assessments/[id]/take`
- `/dashboard/student/chatbot`
- `/dashboard/student/classes/[id]`
- `/dashboard/student/classes/[id]/modules/[moduleId]`
- `/dashboard/student/courses`
- `/dashboard/student/ja`
- `/dashboard/student/lessons/[id]`
- `/dashboard/student/lxp`
- `/dashboard/student/performance`
- `/dashboard/student/profile`

## Findings

### 1. [Resolved] Middleware allowed unauthenticated student routes to bypass server-side gating

- Severity: `high`
- Route: `/dashboard/student`
- Action: `Navigate directly to a protected student route without a refresh cookie`
- Symptom: The middleware treated every pathname as public because PUBLIC_ROUTES included `/` and used startsWith matching, so `/dashboard/*` requests bypassed the intended server-side redirect and fell through to client-side auth handling.
- Owner: `frontend`
- Source: `next-frontend/middleware.ts`
- Evidence: Pre-fix inspection showed `/` inside PUBLIC_ROUTES plus startsWith matching. Post-fix runtime verification now redirects `/dashboard/student` to `/login?from=%2Fdashboard%2Fstudent` with cleared cookies.
- Repro: Clear cookies, request `/dashboard/student`, and observe the redirect target.

### 2. [Resolved] Public login loaded an avoidable `/api/auth/refresh` 401 on anonymous student sessions

- Severity: `medium`
- Route: `/login`
- Action: `Open the login page without an authenticated session`
- Symptom: AuthProvider always attempted a refresh-token exchange on mount, which turned the expected anonymous state into a 401 network failure and console noise on the public login page.
- Owner: `frontend`
- Source: `next-frontend/src/providers/AuthProvider.tsx`
- Evidence: Pre-fix Playwright runs logged `Failed to load resource: 401` for `/api/auth/refresh` on `/login`. After the patch, `/login` loads with zero auth-related console errors.
- Repro: Clear cookies, open `/login`, and inspect network/console output.

### 3. Prompt-supplied custom student credentials do not exist in the seeded local environment

- Severity: `low`
- Route: `/login`
- Action: `Sign in with `jethrojosephdida@gmail.com` / `Test@123``
- Symptom: The active seed data does not contain the prompt-supplied student account, so login returns `401 Invalid credentials` even though the seeded student account succeeds.
- Owner: `data-seed`
- Source: `backend/seed-database.js`
- Evidence: Playwright reproduced `POST /api/auth/login => 401` for the custom student account, while `student71@lms.local / Student123!` authenticated successfully and reached the student shell.
- Repro: Attempt login with the prompt-supplied student email and password on `/login`.

## Not Exercised

- Destructive flows remain intentionally excluded: delete, archive, purge, publish/finalize, and other irreversible academic writes.
- Assessment attempt creation/submission, profile mutation, and LXP/JA conversational writes were not replayed end-to-end in this pass because the auth/session fixes were prioritized first and the live frontend was recompiling during portions of the browser sweep.
- Student AI routes (`/dashboard/student/chatbot`, `/dashboard/student/ja`, `/dashboard/student/lxp`) were sampled previously at route/bootstrap level only; no AI-service contract failures were observed during health checks.
