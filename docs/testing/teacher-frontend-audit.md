# Teacher Frontend Audit

## Run Summary

- Role: `teacher`
- Frontend root: `next-frontend`
- Seed file: `backend/seed-database.js`
- Base URL: `http://localhost:3001`
- Routes discovered: `31`
- Findings: `3`
- Severity counts: `{'high': 1, 'medium': 1, 'low': 1}`

## Route Inventory

- `/dashboard`
- `/dashboard/notifications`
- `/dashboard/teacher`
- `/dashboard/teacher/announcements`
- `/dashboard/teacher/assessments`
- `/dashboard/teacher/assessments/[id]`
- `/dashboard/teacher/assessments/[id]/edit`
- `/dashboard/teacher/assessments/[id]/results/[attemptId]`
- `/dashboard/teacher/calendar`
- `/dashboard/teacher/class-record`
- `/dashboard/teacher/classes`
- `/dashboard/teacher/classes/[id]`
- `/dashboard/teacher/classes/[id]/ai-draft`
- `/dashboard/teacher/classes/[id]/modules/[moduleId]`
- `/dashboard/teacher/classes/[id]/modules/[moduleId]/files/[fileId]`
- `/dashboard/teacher/classes/[id]/students/[studentId]`
- `/dashboard/teacher/classes/[id]/students/add`
- `/dashboard/teacher/evaluations`
- `/dashboard/teacher/extractions/[id]`
- `/dashboard/teacher/interventions`
- `/dashboard/teacher/interventions/[caseId]`
- `/dashboard/teacher/lessons`
- `/dashboard/teacher/lessons/[id]/edit`
- `/dashboard/teacher/library`
- `/dashboard/teacher/performance`
- `/dashboard/teacher/profile`
- `/dashboard/teacher/reports`
- `/dashboard/teacher/sections`
- `/dashboard/teacher/sections/[id]/roster`
- `/dashboard/teacher/sections/[id]/students/[studentId]`
- `/dashboard/teacher/sections/[id]/students/add`

## Findings

### 1. [Resolved] Logout could fail with 401 and leave a refreshable teacher session behind

- Severity: `high`
- Route: `/dashboard/teacher/classes`
- Action: `Log in as a teacher, then revoke the session via `/api/auth/logout` using only the refresh cookie`
- Symptom: The backend logout endpoint required JWT auth even though its job was to revoke the refresh token and clear the cookie. When the access token was stale or missing, logout returned 401, the frontend still redirected, and the next refresh could silently resurrect the session.
- Owner: `integration`
- Source: `backend/src/modules/auth/auth.controller.ts + next-frontend/src/lib/auth-service.ts`
- Evidence: Pre-fix browser/API runs showed `/api/auth/logout => 401` followed by a successful refresh. After the patch, direct backend verification returns login `200`, logout `200`, and refresh-after-logout `401` with the same cookie jar.
- Repro: Login as `teacher1@lms.local`, call `/api/auth/logout`, then call `/api/auth/refresh` with the same cookie jar.

### 2. [Resolved] Public login loaded an avoidable `/api/auth/refresh` 401 before teacher sign-in

- Severity: `medium`
- Route: `/login`
- Action: `Open the login page anonymously before signing in as teacher`
- Symptom: AuthProvider always attempted refresh on mount, so anonymous teacher sign-in started from a noisy 401 refresh failure on the public login route.
- Owner: `frontend`
- Source: `next-frontend/src/providers/AuthProvider.tsx`
- Evidence: Pre-fix Playwright logs captured `/api/auth/refresh => 401` on `/login`. After the patch the login page opens cleanly and teacher sign-in can proceed without auth-related console noise.
- Repro: Clear cookies, open `/login`, and inspect network/console before signing in.

### 3. Prompt-supplied custom teacher credentials do not exist in the seeded local environment

- Severity: `low`
- Route: `/login`
- Action: `Sign in with `teacher@lms.local` / `Teacher123!``
- Symptom: The active seeded environment does not include the prompt-supplied teacher account, so login returns `401 Invalid credentials` while the seeded teacher account succeeds.
- Owner: `data-seed`
- Source: `backend/seed-database.js`
- Evidence: Playwright reproduced `POST /api/auth/login => 401` for `teacher@lms.local`, while `teacher1@lms.local / Teacher123!` authenticated successfully and reached the teacher shell.
- Repro: Attempt login with the prompt-supplied teacher email and password on `/login`.

## Not Exercised

- Destructive flows remain intentionally excluded: delete, archive, purge, publish/finalize, and other irreversible teacher-side academic writes.
- Announcement creation, library uploads, roster mutations, and assignment posting were not replayed end-to-end in this pass because the shared auth/session defects were prioritized first and the live frontend was recompiling during portions of the browser sweep.
- Teacher AI entry routes (`/dashboard/teacher/classes/[id]/ai-draft`, extraction surfaces, intervention AI flows) were sampled for route/bootstrap health only; no AI-service health or envelope failures were observed during runtime checks.
