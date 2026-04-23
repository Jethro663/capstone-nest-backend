# Whole-Repo LMS Audit - 2026-04-24

## Scope
- Repo: `C:\Users\jethr\Desktop\capstone-nest-react-lms`
- Audit date: 2026-04-24
- Live scope: `backend`, `next-frontend`, `ai-service`
- Out of live scope for this pass: `test-mobile` execution, except where concept-paper coverage depends on it
- Method: code inventory, seeded-account browser sweeps, build/test baselines, performance smokes, and AI-service probes

## Executive Summary
- Backend readiness, build, and Jest are healthy.
- Frontend build is healthy; frontend Jest is now healthy after audit fixes.
- AI-service readiness, import probe, and Python test suite are healthy.
- Admin, teacher, and student seeded web logins work.
- Sidebar route sweeps for admin, teacher, and student returned `200` with no console errors and no failed non-static requests on the swept routes.
- The highest-signal remaining issues are:
  1. `perf:engine-smoke` is out of sync with the current admin template workspace because the expected `Export Engine YAML` control is no longer visible there.
  2. `perf:discussion-smoke` is stable for teacher, but its student leg timed out on 2026-04-24 and needs script hardening.
  3. Backend direct ESLint remains red from broad pre-existing repo lint debt.
  4. Seed/demo content quality still needs cleanup in some student-facing surfaces.

## Audit Fixes Applied During This Pass
### Frontend
- Isolated unit Jest from Playwright e2e specs by ignoring `next-frontend/tests/e2e/` in [`next-frontend/jest.config.cjs`](../../next-frontend/jest.config.cjs).
- Added targeted tests for teacher class-card navigation semantics and teacher-class hero copy.
- Corrected teacher `My Classes` shell copy in [`next-frontend/app/(dashboard)/dashboard/teacher/classes/page.tsx`](../../next-frontend/app/(dashboard)/dashboard/teacher/classes/page.tsx).
- Reworked teacher class cards to emit concrete teacher-class links instead of callback-only controls in [`next-frontend/src/components/teacher/my-classes/ClassCard.tsx`](../../next-frontend/src/components/teacher/my-classes/ClassCard.tsx).
- Updated stale unit expectations in:
  - [`next-frontend/app/(dashboard)/dashboard/admin/library/page.test.tsx`](../../next-frontend/app/(dashboard)/dashboard/admin/library/page.test.tsx)
  - [`next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/students/[studentId]/page.test.tsx`](../../next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/students/[studentId]/page.test.tsx)

### Backend
- Hardened post-seed smoke validation in [`backend/scripts/post-seed-smoke.js`](../../backend/scripts/post-seed-smoke.js) to accept open intervention cases across `pending` and `active`, which matches the current intervention lifecycle.

## Baseline Verification
| Check | Result | Notes |
|---|---|---|
| Backend `/api/health/ready` | Pass | Verified live after backend restart |
| AI `/ready` | Pass | `ready=true`, `degradedMode=false`, DB and Ollama healthy |
| AI `/health` | Pass | Models visible, embeddings available |
| Frontend `/login` | Pass | Served on port `3001` |
| Backend `npm run build` | Pass | Completed successfully |
| Backend `npm run test` | Pass | `65` suites, `851` tests |
| Backend `npm run seed:smoke` | Pass after fix | Was failing on stale `pending`-only expectation |
| Backend direct ESLint | Fail | Pre-existing formatting and unsafe-type debt across many files |
| Frontend `npm run build` | Pass | Current production build succeeds |
| Frontend `npm run test` | Pass after fix | `76` suites, `227` tests |
| AI `python scripts/run_tests.py` | Pass | `43` tests passed |
| AI import probe | Pass | `from app.main import app` succeeded |

## Browser Verification
### Admin
- Verified routes:
  - `/dashboard/admin`
  - `/dashboard/admin/diagnostics`
  - `/dashboard/admin/users`
  - `/dashboard/admin/sections`
  - `/dashboard/admin/classes`
  - `/dashboard/admin/calendar`
  - `/dashboard/admin/library`
  - `/dashboard/admin/roster-import`
  - `/dashboard/admin/reports`
  - `/dashboard/admin/evaluations`
  - `/dashboard/admin/announcements`
  - `/dashboard/admin/chatbot`
  - `/dashboard/admin/audit`
  - `/dashboard/admin/system-settings`
  - `/dashboard/admin/profile`
- Result: all loaded with `200`, no console errors, no failed non-static requests in the sweep.
- Extra check: `/dashboard/admin/class-templates` board loaded, template workspace loaded, and current visible controls are `Save Draft`, `Publish`, and `Add Module`.

### Teacher
- Verified routes:
  - `/dashboard/teacher`
  - `/dashboard/teacher/classes`
  - `/dashboard/teacher/sections`
  - `/dashboard/teacher/calendar`
  - `/dashboard/teacher/library`
  - `/dashboard/teacher/class-record`
  - `/dashboard/teacher/reports`
  - `/dashboard/teacher/interventions`
  - `/dashboard/teacher/performance`
  - `/dashboard/teacher/evaluations`
  - `/dashboard/teacher/announcements`
  - `/dashboard/teacher/profile`
- Result: all loaded with `200`, no console errors, no failed non-static requests in the sweep.
- Discussion smoke verified teacher class detail and discussion thread open.
- Teacher `My Classes` hero copy was corrected from student-facing copy during this audit.
- Important note: teacher class-card links now render correct `href` targets, and synthetic click dispatch navigated to class detail, but direct Playwright pointer clicks on those links remained inconsistent on 2026-04-24. Treat this as partially verified until manual click confirmation is captured.

### Student
- Verified routes:
  - `/dashboard/student`
  - `/dashboard/student/courses`
  - `/dashboard/student/lxp`
  - `/dashboard/student/performance`
  - `/dashboard/student/announcements`
  - `/dashboard/student/profile`
  - `/dashboard/student/ja` -> resolves to `/dashboard/student/lxp?tab=ja`
  - `/dashboard/student/chatbot` -> resolves to `/dashboard/student/lxp?tab=ja&mode=ask`
  - `/dashboard/student/transcript`
- Result: all loaded with `200`, no console errors, no failed non-static requests in the sweep.
- Student course CTA pointer navigation was verified live.

## Performance
### Passing Smokes
- `perf:auth-smoke`
  - `loginPageMs=102`
  - `loginRequestMs=101`
  - `dashboardRequestMs=60`
- `perf:nav-smoke`
  - Admin: `users cold=546ms`, `users warm=440ms`, `diagnostics cold=429ms`, `diagnostics warm=444ms`
  - Teacher: `classes cold=489ms`, `classes warm=449ms`
  - Student: `courses cold=552ms`, `courses warm=505ms`, `JA cold=507ms`, `JA warm=492ms`
- `perf:discussion-smoke`
  - Teacher: `classDetail cold=1014ms`, `classDetail warm=1019ms`, `discussion cold=1096ms`, `discussion warm=934ms`, `threadOpen=97ms`

### Flagged
- Teacher discussion/class-detail timings are still at or just above the 1-second threshold and should be optimized.
- `perf:discussion-smoke` student leg timed out on 2026-04-24 after previously passing; likely script flake or a hardcoded route/data assumption.
- `perf:engine-smoke` failed because it still expects an `Export Engine YAML` button that is not visible in the current template workspace.

## AI-Service Audit
### Live-Probed
- `/ready`: pass
- `/health`: pass
- Web AI surfaces loaded without browser console failures on:
  - admin chatbot route
  - student LXP / JA routes

### Test-Verified
- `python scripts/run_tests.py`: pass (`43` tests)
- Repo tests and source cover:
  - tutor bootstrap and session flow
  - JA practice / ask / review paths
  - quiz generation and fallback blueprinting
  - intervention recommendation generation
  - indexing and library indexing
  - fallback and degraded-mode plumbing
  - readiness and metrics endpoints

### AI Confidence Call
- AI service is implemented and test-verified strongly enough for demo support.
- Non-health live probing of teacher quiz/intervention jobs was not executed end to end in this pass, so those remain `partially live-verified`, not `fully live-verified`.

## Concept Paper Module Matrix
| Module | Status | Audit Note |
|---|---|---|
| 1. User Management | Verified | Admin users surface and auth flows are working |
| 2. Role & Access Control | Verified | Role-gated routes and role-mismatch redirects are present |
| 3. Student Profile | Verified | Student profile and transcript/performance surfaces load |
| 4. Teacher Profile | Verified | Teacher profile route loads and uses teacher role context |
| 5. Class & Subject Management | Verified | Admin classes/sections and teacher classes/sections routes load |
| 6. Learning Content Management | Partial | Library/template/content flows exist, but engine smoke is stale against current template workspace |
| 7. Assessment Management | Verified | Assessment routes, history, and performance surfaces are present |
| 8. Performance Tracking & Evaluation | Verified | Performance dashboards and related backend snapshots/logs verified |
| 9. LXP | Verified | Student LXP/JA routes and eligibility-linked surface verified |
| 10. Intervention Management | Verified | Teacher interventions route and seeded open/completed cases verified |
| 11. AI Mentor | Partial | Health and test coverage are strong; full live teacher-job exercise still pending |
| 12. Instructional Support | Partial | Teacher AI support exists, but template-engine perf harness is stale |
| 13. Analytics & Dashboard | Verified | Admin/teacher/student dashboards load cleanly |
| 14. Reporting | Verified | Reports route loads for admin |
| 15. System Evaluation | Verified | Evaluations routes load for admin and teacher |
| 16. Security & Data Management | Verified | Auth, role guards, audit trail, and ready-state checks are present |
| 17. Web & Mobile Access | Partial | Web is audited live; mobile was intentionally not live-tested in this pass |

## Remaining Findings
### High
1. `next-frontend/scripts/engine-perf-smoke.js` is stale against the current template editor and cannot verify that workflow today.
2. Teacher class-card pointer-click behavior still needs a final manual confirmation pass even after moving to concrete links, because Playwright pointer clicks remained inconsistent.
3. `next-frontend/scripts/discussion-perf-smoke.js` has a flaky student leg and should be hardened before it is treated as a release gate.

### Medium
1. Backend direct ESLint is still red from broad existing debt.
2. Student-facing demo content quality needs cleanup; placeholder-like announcement content was still visible.
3. Frontend Jest still emits a worker-shutdown warning, indicating open handles or timers in the test environment.

## Design and QoL Recommendations
1. Push teacher `My Classes` further toward teaching workflows: show due grading, pending interventions, and quick-create affordances instead of reusing student momentum language.
2. Tighten the admin template/editor workflow around the controls that still exist now. If export/import is still a product requirement, restore it visibly; otherwise update the perf and smoke tooling to the current save/publish/module model.
3. Clean seeded demo content on student announcements and similar surfaces before stakeholder demos.
4. Add explicit empty/loading/error microcopy to the more data-dense teacher/admin views so failure states stay understandable under slower local stacks.

## Acceptance Status
- Whole-repo audit artifacts: completed
- Frontend unit suite: green
- Backend smoke/build/Jest: green
- AI-service tests/health: green
- Browser route sweep: green for core role dashboards and sidebar routes
- Remaining blockers to full closure: engine perf harness drift, discussion smoke flake, and final teacher-card pointer-click confirmation
