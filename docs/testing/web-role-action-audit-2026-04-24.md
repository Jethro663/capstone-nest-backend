# Web Role Action Audit - 2026-04-24

## Method
- Seeded accounts used:
  - admin: `admin@lms.local`
  - teacher: `teacher1@lms.local`
  - student: `student71@lms.local`
- Evidence type: live browser route sweep, targeted interaction checks, and smoke scripts
- Status legend:
  - `Pass`: exercised live and behaved as expected
  - `Fail`: exercised live and failed
  - `Partial`: route/action is reachable but verification is incomplete or inconsistent
  - `Not Exercised`: discovered but not executed in this pass

## Admin
| Route / Action | Status | Notes |
|---|---|---|
| Login | Pass | Landed on `/dashboard/admin` |
| Dashboard sidebar routes | Pass | Diagnostics, Users, Sections, Classes, Calendar, Library, Roster Import, Reports, Evaluations, Announcements, Chatbot, Audit, System Settings, Profile all loaded cleanly |
| Class Templates board | Pass | Board loaded and listed template cards |
| Template workspace load | Pass | Workspace loaded with `Save Draft`, `Publish`, `Add Module` controls visible |
| Engine export perf smoke | Fail | Current workspace did not expose expected `Export Engine YAML` control |
| User create/edit/delete flows | Not Exercised | Route exists; destructive admin writes were not run in this pass |
| Class create/edit/delete flows | Not Exercised | Route exists; not run live in this pass |
| Roster import preview/commit | Not Exercised | Route loaded, but file-driven write flow not exercised |
| Library upload/delete/retry-index | Not Exercised live | Unit coverage updated; live destructive file ops skipped |
| Logout | Not Exercised | Button visible |

## Teacher
| Route / Action | Status | Notes |
|---|---|---|
| Login | Pass | Landed on teacher workspace |
| Sidebar routes | Pass | Classes, Sections, Calendar, Library, Class Record, Reports, Interventions, Performance, Evaluations, Announcements, Profile all loaded cleanly |
| `My Classes` hero surface | Pass | Teacher-facing copy restored during this audit |
| Teacher class detail direct route | Pass | Discussion perf smoke reached class detail successfully |
| Teacher discussion view | Pass | Teacher discussion route opened and thread open action completed in `97ms` |
| Teacher class-card entry links | Partial | Correct `href` values now render; synthetic click dispatch navigated, but direct Playwright pointer clicks remained inconsistent |
| `View Lessons` CTA on teacher class card | Partial | Same note as class-card entry links |
| Intervention dashboard route | Pass | Route loaded with no console/network failures |
| Intervention assign/resolve live writes | Not Exercised | Routes and backend support exist; write actions deferred |
| AI draft / quiz generation live jobs | Not Exercised | Surfaces exist, but no live generation jobs were submitted in this pass |
| Module / lesson / announcement creation in class detail | Not Exercised | Route surface exists; write flows deferred |
| Logout | Not Exercised | Button visible |

## Student
| Route / Action | Status | Notes |
|---|---|---|
| Login | Pass | Landed on `/dashboard/student` |
| Sidebar routes | Pass | Dashboard, Courses, LXP, Performance, Announcements, Profile all loaded cleanly |
| `JA` route alias | Pass | `/dashboard/student/ja` resolved to `/dashboard/student/lxp?tab=ja` |
| `Chatbot` route alias | Pass | `/dashboard/student/chatbot` resolved to `/dashboard/student/lxp?tab=ja&mode=ask` |
| Course CTA open | Pass | Student course CTA opened class detail route live |
| Transcript route | Pass | Loaded cleanly |
| Student discussion perf smoke | Fail | Student leg timed out on 2026-04-24; needs script hardening or data-path review |
| Assessment take/submit | Not Exercised | Routes exist, but submission flow not run in this pass |
| Full JA tutoring conversation | Not Exercised | Entry routes loaded, but multi-turn session not exercised live |
| Logout | Not Exercised | Button visible |

## Cross-Cutting Notes
1. Role mismatch handling exists; login redirects with `reason=role-mismatch` were observed during cross-role navigation.
2. No untriaged console errors were observed on the audited sidebar routes.
3. Student announcement content still needs demo cleanup; placeholder-like content was visible in the seeded data.
