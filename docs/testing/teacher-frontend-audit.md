# Teacher Frontend Audit

## Run Summary

- Role: `teacher`
- Frontend root: `next-frontend`
- Seed file: `backend/seed-database.js`
- Base URL: `http://localhost:3001`
- Routes discovered: `31`
- Findings: `0`
- Severity counts: `{}`

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
- `/dashboard/teacher/classes`
- `/dashboard/teacher/classes/[id]`
- `/dashboard/teacher/classes/[id]/ai-draft`
- `/dashboard/teacher/classes/[id]/modules/[moduleId]`
- `/dashboard/teacher/classes/[id]/modules/[moduleId]/files/[fileId]`
- `/dashboard/teacher/classes/[id]/students/[studentId]`
- `/dashboard/teacher/classes/[id]/students/add`
- `/dashboard/teacher/class-record`
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

- No findings were recorded.
## Not Exercised

- AI routes and controls were excluded by scope, including `/dashboard/teacher/classes/[id]/ai-draft` and AI plan generation controls on intervention detail pages.
- Mutating submissions were not executed (safe-only policy): profile save, password update, announcement creation, library upload/create-folder submit, and student add confirmations.
- Destructive and irreversible flows were skipped: delete/remove/archive/publish-finalize actions where present.
- Dynamic detail routes requiring real IDs were inventoried but not fully exercised because the primary teacher account has no assigned active classes/sections in this run.
- Assessment detail/edit/result pages were not exercised due missing valid assessment IDs from assigned classes.
- Lesson edit pages were not exercised due missing valid lesson IDs from assigned classes.
- Class module/file/student detail routes were not exercised due missing valid class/module/file/student IDs from assigned classes.
- Section student detail routes were not exercised due missing valid section/student IDs from assigned sections.
- Extraction detail and intervention case detail were only probed with placeholder IDs for route robustness and not treated as full functional coverage.
