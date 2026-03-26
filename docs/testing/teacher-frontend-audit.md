# Teacher Frontend Audit

## Run Summary

- Role: `teacher`
- Frontend root: `next-frontend`
- Seed file: `backend/seed-database.js`
- Base URL: `http://localhost:3001`
- Routes discovered: `28`
- Findings: `2`
- Severity counts: `{'medium': 2}`

## Route Inventory

- `/dashboard`
- `/dashboard/teacher`
- `/dashboard/teacher/classes`
- `/dashboard/teacher/classes/[id]`
- `/dashboard/teacher/classes/[id]/ai-draft`
- `/dashboard/teacher/classes/[id]/students/add`
- `/dashboard/teacher/classes/[id]/students/[studentId]`
- `/dashboard/library`
- `/dashboard/teacher/sections`
- `/dashboard/teacher/sections/[id]/roster`
- `/dashboard/teacher/sections/[id]/students/add`
- `/dashboard/teacher/sections/[id]/students/[studentId]`
- `/dashboard/teacher/class-record`
- `/dashboard/teacher/reports`
- `/dashboard/teacher/interventions`
- `/dashboard/teacher/interventions/[caseId]`
- `/dashboard/teacher/performance`
- `/dashboard/teacher/evaluations`
- `/dashboard/teacher/announcements`
- `/dashboard/teacher/profile`
- `/dashboard/notifications`
- `/dashboard/teacher/assessments`
- `/dashboard/teacher/assessments/[id]`
- `/dashboard/teacher/assessments/[id]/edit`
- `/dashboard/teacher/assessments/[id]/results/[attemptId]`
- `/dashboard/teacher/lessons`
- `/dashboard/teacher/lessons/[id]/edit`
- `/dashboard/teacher/extractions/[id]`

## Findings

### 1. Teacher dashboard links to a missing assessments index route

- Severity: `medium`
- Route: `/dashboard/teacher/assessments`
- Action: `Open `View assessments` from the teacher dashboard`
- Symptom: The teacher dashboard exposes an assessments entry point, but the target route returns a 404 and lands on the not-found page instead of an assessments list.
- Owner: `frontend`
- Source: `next-frontend/app/(dashboard)/dashboard/teacher/page.tsx and missing next-frontend/app/(dashboard)/dashboard/teacher/assessments/page.tsx`
- Evidence: Playwright confirmed the dashboard contains an anchor with `href="/dashboard/teacher/assessments"`, and a direct navigation to that route returned HTTP 404 with not-found content.
- Repro: Sign in as `teacher1@lms.local`, open `/dashboard/teacher`, and use the `View assessments` quick action or navigate directly to `/dashboard/teacher/assessments`.

### 2. Teacher dashboard links to a missing lessons index route

- Severity: `medium`
- Route: `/dashboard/teacher/lessons`
- Action: `Open `View lessons` from the teacher dashboard`
- Symptom: The teacher dashboard advertises a lessons entry point, but the linked route returns a 404 and does not provide a teacher lessons index.
- Owner: `frontend`
- Source: `next-frontend/app/(dashboard)/dashboard/teacher/page.tsx and missing next-frontend/app/(dashboard)/dashboard/teacher/lessons/page.tsx`
- Evidence: Playwright confirmed the dashboard contains an anchor with `href="/dashboard/teacher/lessons"`, and a direct navigation to that route returned HTTP 404 with not-found content.
- Repro: Sign in as `teacher1@lms.local`, open `/dashboard/teacher`, and use the `View lessons` quick action or navigate directly to `/dashboard/teacher/lessons`.

## Not Exercised

- Destructive or hard-to-reverse teacher actions were skipped, including delete, archive, purge, finalize/post-all, and ambiguous publish flows.
- Announcement creation and profile updates were opened for inspection but not submitted, to avoid mutating seeded teacher data.
- Library upload, publish, delete, and rename submissions were not executed because they create or mutate shared content.
- Teacher class and section drill-down routes declared in source were not exercised beyond list pages because the primary teacher account currently has 0 assigned classes and 0 assigned sections in the live UI.
- Assessment, lesson, and extraction detail/edit routes were not exercised because the dashboard showed 0 recent assessments and 0 recent lessons, and the linked assessments/lessons index routes currently 404 before a safe drill-down can begin.
- Intervention case detail routes were not exercised because the teacher dashboard and interventions page both indicated 0 active intervention cases for the primary teacher account.
