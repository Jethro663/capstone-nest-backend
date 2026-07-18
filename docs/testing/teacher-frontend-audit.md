# Teacher Frontend Audit

## Shipped Status

The approved Teacher tighten and bounded academic-state authorization change are implemented and verified on `developement`. Evidence was collected on 2026-07-15 from the current source running in a disposable seeded Compose project.

- Role: `teacher`
- Frontend root: `next-frontend`
- Seed source: `backend/seed-database.js`
- Browser URL: `http://localhost:3301`
- Backend URL: `http://localhost:3300`
- Source routes inventoried: `32`
- Core live routes: `6`
- Additional post-change spot checks: `2`
- Current findings: `1` backend-owned residual with a verified frontend containment state

## Live Route Evidence

The original six-route Teacher audit was replayed through the authenticated shell:

1. `/dashboard/teacher/classes` — `My Classes`
2. `/dashboard/teacher/class-record` — `Class Record`
3. seeded `/dashboard/teacher/assessments/[id]/edit` — assessment editor work surface
4. `/dashboard/teacher/interventions` — `Interventions`
5. `/dashboard/teacher/performance` — `Performance Insights`
6. `/dashboard/teacher/lessons` — `Lessons Across Your Teaching Space`

Post-change spot checks also covered `/dashboard/teacher/assessments` and `/dashboard/teacher/calendar`. The legacy assessment-editor capture spec passed against the seeded dynamic editor.

## Access Contract Evidence

- Teacher `GET /api/academic-state/current`: HTTP `200`.
- Student `GET /api/academic-state/current`: HTTP `403`.
- Admin-only impact preview and transition metadata remain Admin-only.
- Focused backend authorization coverage passed `2/2` tests.
- Opening `/dashboard/admin` as Teacher disclosed no Admin content, redirected to `/dashboard/teacher/classes`, displayed one access notice, and preserved the Teacher session.

## Baseline Findings Reconciled

### Assessment editor could not read the system academic quarter — resolved

- Before: the editor received HTTP `403` from a controller-wide Admin role restriction.
- After: only `GET current` permits Admin and Teacher; impact preview and transition remain Admin-only. The editor models quarter verification explicitly and keeps quarter/publish controls locked until verified.
- Evidence: live Teacher `200`/Student `403`, focused backend tests, editor unit coverage, and the integrated browser gate.

### Missing quarter workbook caused a noisy slot-resource 404 — resolved

- Before: the editor requested slot overview even when the selected quarter had no class-record workbook.
- After: the editor checks `getByClass` first, skips the invalid slot request, and shows `Create the Q1 class record workbook before choosing a slot.`
- Evidence: a focused red/green unit test verifies the guidance and that `getSlotOverview` is not called; the seeded editor then loaded without that HTTP error.

### Teacher collections treated failures as successful emptiness — resolved

- Before: Assessments, Calendar, Class Record, and Lessons reused empty copy after rejected requests.
- After: each owner distinguishes loading, failed, empty, and content states; retry remains scoped to the failed request and truthful existing content is retained where available.
- Evidence: focused rejected-request tests passed within the full frontend Jest gate, and all four route families rendered in the live sweep.

### Performance diagnostics looked empty when the request failed — frontend resolved, backend residual remains

- Before: the diagnostics HTTP `500` could be interpreted as zero signals.
- After: healthy Performance panels stay visible while the diagnostics region persistently shows `Diagnostics temporarily unavailable` and `Retry diagnostics`.
- Evidence: the browser gate permits only the exact seeded diagnostics `500` and its matching resource-console error; every other HTTP or console failure fails the scenario.

### Sparse/unsafe error-boundary coverage — resolved

- Before: the dashboard lacked a shared boundary and the local Add Students boundary could print `error.message`.
- After: shared safe recovery and the local boundary use safe copy without internal exception detail.

### Class Record and Assessment Editor carried excessive ornamental hierarchy — resolved

- Before: hero framing, pill clusters, nested cards, and large action chrome delayed the workbook and first question.
- After: Class Record uses a compact title/filter/action sequence around one principal workbook, while the editor uses a direct workbar with quiet quarter/publication metadata and reachable save/preview controls.
- Evidence: 390 px, 768 px, and 1280 px overflow checks passed for both surfaces; keyboard focus checks covered filters, segmented controls, save/retry, and help paths.

## Current Finding

### Seeded class diagnostics endpoint returns HTTP 500

- Severity: `high` backend correctness; controlled frontend degradation
- Route: `/dashboard/teacher/performance`
- Action: load class diagnostics
- Owner: `backend-performance`
- Source: `backend/src/modules/performance/performance.service.ts`
- Symptom: the Drizzle/PostgreSQL conflict-update expression produces an invalid reference while updating concept mastery.
- User-facing containment: the diagnostics region is unavailable/retryable while unrelated summary, risk, comparison, and log regions remain usable.
- Required closure: correct the backend expression, add a regression test, prove the seeded endpoint returns `200`, then remove the exact diagnostics exception from the Playwright runtime allowlist.

## Route Inventory

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
- `/dashboard/teacher/lessons/[id]/view`
- `/dashboard/teacher/library`
- `/dashboard/teacher/modules`
- `/dashboard/teacher/performance`
- `/dashboard/teacher/profile`
- `/dashboard/teacher/reports`
- `/dashboard/teacher/sections`
- `/dashboard/teacher/sections/[id]/roster`
- `/dashboard/teacher/sections/[id]/students/[studentId]`
- `/dashboard/teacher/sections/[id]/students/add`
- `/dashboard/notifications`

## Not Exercised

- Assessment saves, publishing, deletion, grading, and submission state changes were not performed.
- Class-record creation or score writes, roster changes, uploads, and announcement mutations were not submitted.
- AI draft, extraction, intervention, and other queue-producing actions were not triggered.
- Dynamic routes outside the named core/spot-check paths were source-inventoried but not all opened with seeded fixtures.
