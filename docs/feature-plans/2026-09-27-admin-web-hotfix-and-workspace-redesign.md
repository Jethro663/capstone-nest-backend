# Admin Web Pagination Hotfix and Workspace Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:executing-plans` inline. This plan is the single canonical evidence, isolation, design, and implementation artifact requested for this change. Do not create a competing OpenSpec change or a second plan.

**Goal:** Repair server pagination on the admin Users and User Reports routes, then replace decorative/stat-card-heavy admin surfaces with profile-style, sectioned workspaces while preserving every discovered backend contract, role gate, lifecycle safeguard, and mutation.

**Architecture:** Keep the NestJS APIs and existing Next.js service wrappers authoritative. Add shared admin pagination/action primitives, use the existing admin shell and tokens, and compose route-local tabs/sections around the current handlers rather than rewriting business logic. The audit trail will expose the complete audit row already returned by the list API, including its metadata, without adding or inventing fields.

**Tech stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind 4/global admin tokens, Radix-backed tabs/dialogs, Jest + Testing Library.

## 1. Decision summary

Implement **Direction A — profile-style admin workspaces**.

- User detail: Identity/Profile and Account sections, with meaningful status/role/timestamps in the header and administrative mutations in descriptive account action rows.
- Section roster: Overview, Schedule, Students, and Actions sections. Existing membership resolution remains attached to the selected student; page-level actions explain edit/add/navigation outcomes.
- Class edit: Details, Assignment, and Schedule sections around the existing `ClassForm` state and validation.
- Dashboard, Announcements, and Reports: remove decorative KPI/stat grids, retain useful counts as compact context, and organize each page around the next operational task.
- Audit Trail: make each row open a complete detail dialog using the already-returned actor, action, target, timestamp, and `metadata` object.

The user's brief already selects the design traits and explicitly authorizes implementation after this artifact. No additional visual approval gate is required. An HTML prototype is intentionally omitted because none was requested; source and test evidence are the review artifacts.

## 2. Scope, permissions, assumptions, and non-goals

### In scope

- `/dashboard/admin/users`: working server pagination and server search.
- `/dashboard/admin/user-reports`: working server pagination and server search.
- `/dashboard/admin/users/[id]`: profile-style sectioning and Account actions.
- `/dashboard/admin/sections/[id]/roster`: section-specific tabs and explanatory Actions.
- `/dashboard/admin/classes/[id]/edit`: sectioned editor without stat cards.
- `/dashboard/admin`: operational dashboard redesign without synthetic pulse data or stat-card grids.
- `/dashboard/admin/announcements`: bulletin workspace without stat cards.
- `/dashboard/admin/reports`: admin-only reports workspace redesign; the teacher reports appearance remains unchanged.
- `/dashboard/admin/audit`: row detail dialog using current audit data.
- Focused regression tests, frontend lint/type/build/test gates, commit, push, and configured CI/deployment observation under the explicitly invoked `finish-and-ship` workflow.

### Frozen

- Admin-only route and backend RBAC boundaries.
- Existing REST routes and response envelopes.
- User update validation, password reset, maintenance-access lifecycle gates, archive/reactivate behavior, governed permanent deletion preview/execute flow, and audit retention.
- Section membership correction/withdrawal/transfer preview-and-execute workflow.
- Class update payload and collision/room/schedule validation.
- Announcement create/delete procedures and rich-text sanitization.
- Report queries, CSV/PDF exports, academic score bounding, and teacher report behavior.
- Audit log persistence and append-only backend ownership.
- Browser history for Back; direct-entry fallbacks remain the existing role-safe admin list routes.

### Non-goals

- No backend DTO, controller, schema, migration, data, role, or endpoint changes.
- No new audit data capture and no claim that absent historical metadata exists.
- No mobile redesign or contract change.
- No new visual theme, novelty palette, glass effects, decorative metrics, or fabricated trend data.

### Assumptions

- `page=1` is the safe fallback when filters/search change or when a requested page exceeds a newly reduced result set.
- Twenty rows per page is retained for Users and used for User Reports, matching the established Audit Trail page size.
- The admin dashboard's current `buildPulseSeries` output is derived rather than observed activity; it will be removed instead of relabeled as real telemetry.

## 3. Current-state evidence ledger

| Status | Finding | Evidence | Consequence |
|---|---|---|---|
| Confirmed | Users requests `limit: 100`, omits `page` and `search`, stores only `users`, and renders no pagination control. | `next-frontend/app/(dashboard)/dashboard/admin/users/page.tsx`, `UserManagementPage` fetch at lines 229-245 and current table footer | The UI can never advance beyond the first capped server page; client search only covers that page. |
| Confirmed | `GET /users/all` already accepts `search`, `page`, and `limit` and returns `page`, `limit`, `total`, and `totalPages`; limit is capped at 100. | `backend/src/modules/users/users.controller.ts::UsersController/getAllUsers`; `backend/src/modules/users/users.service.ts::UsersService/findAll` | Pagination is a frontend integration defect; no backend contract change is needed. |
| Confirmed | User Reports requests `limit: 300`, ignores returned `page/total/totalPages`, filters locally, and renders no pagination control. | `next-frontend/app/(dashboard)/dashboard/admin/user-reports/page.tsx::AdminUserReportsPage` | The request is silently capped by the backend and later pages are unreachable. |
| Confirmed | `GET /users/reports/monitoring` caps limit at 200 and returns nested `data: { data, total, page, limit, totalPages }`; it supports server search. | `backend/src/modules/users/users.controller.ts::getMonitoringReport`; `backend/src/modules/users/users.service.ts::getMonitoringReports`; `next-frontend/src/services/user-service.ts` | The frontend can implement correct pagination without envelope changes. |
| Confirmed | Admin user detail already owns update, reset-password, archive/reactivate, and governed purge handlers. Deleted-account editing/reset is gated by Maintenance Access. | `next-frontend/app/(dashboard)/dashboard/admin/users/[id]/page.tsx::AdminUserDetailPage` | Redesign must move controls, not replace handlers or relax safeguards. |
| Confirmed | Student Profile now uses a left section rail, identity header, sectioned details, and large explanatory Account destination rows. | `next-frontend/src/components/profile/StudentProfilePage.tsx`, current `StudentProfilePage`; commit `34514e21` | This is the requested structural reference, adapted to admin tokens and authority. |
| Confirmed | Roster currently shows Schedule then Students in one long page; it owns four independent reads and the governed membership-resolution dialog. | `next-frontend/app/(dashboard)/dashboard/admin/sections/[id]/roster/page.tsx::AdminSectionRosterPage` | Tabs can be visual/state organization only; service inputs and lifecycle payloads stay identical. |
| Confirmed | Class edit loads class/sections/teachers and delegates form state/validation to `ClassForm`; update submits the existing class fields and schedules. | `next-frontend/app/(dashboard)/dashboard/admin/classes/[id]/edit/page.tsx::EditClassPage`; `next-frontend/src/components/admin/ClassForm.tsx::ClassForm` | Sectioning belongs in a presentation mode of `ClassForm`, not a duplicate editor. |
| Confirmed | Announcements renders four `AdminStatCard`s before the actual bulletin. | `next-frontend/app/(dashboard)/dashboard/admin/announcements/page.tsx::AdminAnnouncementsPage` | Counts can move into compact selected-class context; create/delete handlers remain unchanged. |
| Confirmed | Admin Reports renders four top `AdminStatCard`s plus additional `SummaryCard` grids inside report tabs; the component is shared with teachers. | `next-frontend/src/components/reports/class-record-reports-page.tsx::ClassRecordReportsPage` | Apply the new admin layout conditionally and preserve the teacher branch. |
| Confirmed | Admin Dashboard renders four stat cards and a weekly Pulse chart whose points are computed from current totals, not time-series data. | `next-frontend/app/(dashboard)/dashboard/admin/page.tsx::{buildPulseSeries,PulseChart,AdminDashboardPage}` | Remove synthetic charting and present only observed overview, usage, health, and performance values. |
| Confirmed | Audit list rows already contain `actor`, `action`, `targetType`, `targetId`, `createdAt`, and arbitrary JSON `metadata`; the backend list returns full rows with actor projection. | `next-frontend/src/types/audit.ts::AuditLogEntry`; `backend/src/modules/audit/audit.service.ts::AuditService/list`; `backend/src/drizzle/schema/base.schema.ts::auditLogs` | A full detail dialog is supported now; no detail endpoint is necessary. |
| Confirmed | The active checkout started at `4ab4cab8` on `developement`, aligned with `origin/developement`, with one unrelated modified mobile analysis document. | `git status --short --branch`, 2026-09-27 | Do not edit, stage, or commit that unrelated file. |
| Unverified | Authenticated pixel-level appearance in the running app before implementation. | No authenticated live browser session was established during planning. | Verify through focused component tests, build, and an authenticated browser flow if the local/runtime credentials are available without changing scope. |

## 4. Keep / Change / Frozen / Unknown ledger

| Keep | Change | Frozen | Unknown |
|---|---|---|---|
| Admin red/white/navy tokens, `AdminPageShell`, real API data, existing dialogs, direct route ownership | Long pages into clear sections, action placement, compact context, server pagination, clickable audit details | Routes, role gates, service wrappers, payloads, response envelopes, lifecycle previews, exports | Only final authenticated visual rendering remains runtime-dependent |

## 5. End-to-end impact and consumer map

| Edge | Provider/interface | Consumer | Effect | Risk | Confidence | Disposition |
|---|---|---|---|---|---|---|
| P1 | `GET /users/all` via `userService.getAll(UsersQuery)` | Users page | Add `page`, `limit`, debounced `search`; consume pagination metadata | Medium | Confirmed | Frontend-only integration fix with tests |
| P2 | `GET /users/reports/monitoring` via `userService.getMonitoringReport` | User Reports | Add `page`, `limit`, server search; consume nested metadata | Medium | Confirmed | Frontend-only integration fix with tests |
| U1 | User read/update/reset/lifecycle wrappers | User detail | Move existing actions into Account section | High | Confirmed | Preserve functions, disabled rules, confirmations, and error copy |
| R1 | Section, roster, academic-state, lifecycle services | Roster workspace | Tabs alter visibility only | High | Confirmed | Preserve requests and lifecycle request bodies byte-for-byte in intent |
| C1 | Class/section/user reads and `classService.update` | Class edit + `ClassForm` | Add sectioned presentation mode | High | Confirmed | Keep one form state and one submit path |
| A1 | Class + announcement services | Announcements | Remove stats; reorganize class context and posts | Medium | Confirmed | No mutation change |
| RP1 | Report/class/class-record/dashboard services | Shared reports component | Admin-only rail/compact summary; teacher branch unchanged | High | Confirmed | Conditional presentation only |
| D1 | Admin overview + performance analytics | Dashboard | Remove synthetic series/stat grid; keep factual values and links | Medium | Confirmed | No API change |
| AU1 | Audit list API full row | Audit detail dialog | Expose returned fields and formatted metadata | Medium | Confirmed | No fetch-on-click and no invented data |
| DS1 | `AdminPageShell` shared primitives/global CSS | All named admin pages | Shared pagination/action/workspace visual language | Medium | Confirmed | Add backward-compatible exports/classes |

No additional dependency was found within the inspected scope after focused searches of the named routes, their service wrappers, backend owners for pagination/audit, and current route tests.

## 6. Design options and recommendation

### Direction A — Profile-style workspace rail (recommended)

Use a calm left rail on wide screens and a wrapping top tab strip on narrow screens. Each tab answers one admin question; actions are explanatory rows. This directly follows the requested Student Profile structure and keeps one route/form state.

Tradeoff: inactive sections are not simultaneously visible, so tabs need clear labels and state must remain mounted or centralized.

### Direction B — Stacked accordion

Keep one scrolling page with collapsible sections. This exposes more headings but preserves the long-page problem and makes consequential actions easier to miss.

### Direction C — Nested subroutes

Split tabs into URLs such as `/profile`, `/account`, `/schedule`. This improves deep linking but expands routing/back behavior and creates needless state synchronization for existing single-route flows.

**Selection:** Direction A. Use existing Radix Tabs, retain route-local state, keep browser Back for route exits, and let direct links fall back to the current list routes through existing buttons/error handling.

## 7. Recommended presentation, data, security, and error behavior

- Shared primitives: add `AdminPagination` and `AdminActionCard` exports to `AdminPageShell.tsx`; add restrained global admin workspace classes.
- Pagination: backend-driven, 20 rows per page, debounced server search, page reset on filter/search changes, old results remain visible under a loading veil, and page bounds clamp after responses.
- User detail: header contains avatar/name/email plus status, role, created, and last-login context; Identity/Student Details/Account tabs use the existing single `form` state. Account actions call the same reset/lifecycle/purge handlers.
- Roster: Overview shows section facts; Schedule owns `SectionScheduleViewer`; Students owns the table/dialog/membership workflow; Actions explains Edit Section, Add Students, and Review Students.
- Class edit: `ClassForm` receives an opt-in sectioned mode; Details, Assignment, and Schedule share the existing `form`, validation, collision checks, and submit handler.
- Announcements: class selection and selected-class context become the workspace header/sidebar; counts are compact text, not KPI cards.
- Reports: admin branch gets a section rail and compact current-context strip. Teacher stat cards and horizontal tabs remain unchanged.
- Dashboard: show real totals as compact header metadata, direct administrative destinations, observed usage values, service health, and real performance lists. Delete the fabricated weekly series helpers.
- Audit: selecting a row opens a dialog with actor identity, action, target type/id, exact and localized timestamps, source IP if metadata supplies it, and formatted full metadata. Empty metadata explicitly says no additional metadata was recorded.
- Errors: preserve existing toast messages and empty states; failed pagination clears only when the existing route already does so. Buttons are disabled while their current operation is busy.

## 8. Contract/schema/migration/compatibility changes

- Backend contract: **none**.
- Database/schema/migration: **none**.
- Public routes: **none**.
- Frontend service types: consume existing pagination fields; no envelope changes.
- Compatibility: `ClassForm`'s new layout prop defaults to the existing flat layout; the shared Reports teacher branch stays unchanged; new shared exports are additive.

## 9. Ordered TDD implementation checklist

### Task 1 — Shared admin workspace primitives

**Files:**
- Modify `next-frontend/src/components/admin/AdminPageShell.tsx`
- Modify `next-frontend/src/components/admin/AdminPageShell.test.tsx`
- Modify `next-frontend/app/globals.css`

- [x] Add failing tests proving `AdminPagination` reports the current range, disables Previous/Next at bounds, and emits the requested page; prove `AdminActionCard` exposes title/description/action as one accessible button.
- [x] Run `npm test -- --runInBand src/components/admin/AdminPageShell.test.tsx` and confirm failure because the exports do not exist.
- [x] Add the minimal components and responsive admin workspace/action CSS using existing `--admin-*` tokens.
- [x] Re-run the focused test and confirm green.

### Task 2 — Users and User Reports pagination hotfix

**Files:**
- Create `next-frontend/app/(dashboard)/dashboard/admin/users/page.test.tsx`
- Create `next-frontend/app/(dashboard)/dashboard/admin/user-reports/page.test.tsx`
- Modify both owning `page.tsx` files

- [x] Add failing Users tests with a complete `UsersListResponse`: first response `page: 1, totalPages: 2`, click Next, assert the second `userService.getAll` call uses `page: 2, limit: 20`, and assert search resets to page 1 with `search` sent to the server.
- [x] Add failing User Reports tests with the real nested response envelope and the same page/search behavior.
- [x] Run the two focused suites and confirm failure because pagination controls/state are absent.
- [x] Implement server pagination, totals, debounced search, filter resets, response-bound page clamping, and `AdminPagination` on both routes.
- [x] Re-run both suites and confirm green.

### Task 3 — User detail profile/account redesign

**Files:**
- Create `next-frontend/app/(dashboard)/dashboard/admin/users/[id]/page.test.tsx`
- Modify `next-frontend/app/(dashboard)/dashboard/admin/users/[id]/page.tsx`

- [x] Add a failing test that loads a complete student user, verifies Identity/Student Details/Account sections, switches to Account, and confirms Reset Password opens the existing confirmation without calling the API prematurely.
- [x] Run the focused test and confirm the section controls are absent.
- [x] Move existing fields and handlers into profile-style sections, move administrative mutations into descriptive `AdminActionCard`s, retain Maintenance Access/read-only/confirmation behavior, and keep Save in the editable detail section.
- [x] Re-run the focused test and existing user-service tests.

### Task 4 — Roster and class edit sectioning

**Files:**
- Create `next-frontend/app/(dashboard)/dashboard/admin/sections/[id]/roster/page.test.tsx`
- Modify the roster page
- Create `next-frontend/app/(dashboard)/dashboard/admin/classes/[id]/edit/page.test.tsx`
- Modify the class edit page
- Modify `next-frontend/src/components/admin/ClassForm.tsx`
- Create or modify the focused `ClassForm` test beside the component

- [x] Add failing roster tests for Overview/Schedule/Students/Actions and for the Add Students/Edit Section destinations.
- [x] Add failing ClassForm/edit tests proving Details/Assignment/Schedule sectioning retains one form state and submits the unchanged `ClassFormValues` shape.
- [x] Run the focused suites and confirm failure before production edits.
- [x] Recompose the roster content into tabs without changing any service call or lifecycle dialog payload.
- [x] Add opt-in `layout="sectioned"` to `ClassForm`, pass it only from class edit, and preserve the default layout for create flows.
- [x] Re-run focused tests plus existing admin class/section tests.

### Task 5 — Dashboard, Announcements, and Reports revamp

**Files:**
- Modify `next-frontend/app/(dashboard)/dashboard/admin/page.tsx`
- Modify `next-frontend/app/(dashboard)/dashboard/admin/page.test.tsx`
- Modify `next-frontend/app/(dashboard)/dashboard/admin/announcements/page.tsx`
- Modify its existing test
- Modify `next-frontend/src/components/reports/class-record-reports-page.tsx`
- Add or modify its focused test

- [x] Update tests first to reject old stat-card labels/synthetic pulse presentation and assert compact factual context, operational sections, preserved announcement mutations, preserved exports, and unchanged teacher presentation.
- [x] Run focused tests and observe expected failures against the old UI.
- [x] Remove `buildPulseSeries`/`PulseChart`, move real totals to header context, and retain real usage/health/performance data.
- [x] Remove announcement stat cards and reorganize selected-class context plus bulletin content.
- [x] Implement admin-only report rail/compact context and remove admin `AdminStatCard`/`SummaryCard` grids while leaving the teacher branch unchanged.
- [x] Re-run focused suites.

### Task 6 — Full audit detail dialog

**Files:**
- Modify `next-frontend/src/components/admin/audit-log-page.test.tsx`
- Modify `next-frontend/src/components/admin/audit-log-page.tsx`

- [x] Add a failing test that selects an audit row and asserts actor email/id, action, target type/id, exact timestamp, IP, and arbitrary nested metadata are visible in a dialog.
- [x] Run the focused test and confirm no dialog exists.
- [x] Add keyboard/click selection, a clear View affordance, and a top-to-bottom dialog that formats the existing row only.
- [x] Re-run the audit test and backend audit service spec to confirm no contract change.

### Task 7 — Integrated verification and release

**Files:** all files changed by Tasks 1-6 and this plan only; explicitly exclude `docs/feature-analysis/2026-09-21-mobile-teacher-modernization-and-updater-analysis.md`.

- [x] Run all focused Jest suites for the touched admin pages/components: 11 suites and 26 tests passed.
- [x] Run `npm run lint` in `next-frontend`: completed with zero warnings.
- [x] Run `npm run build` in `next-frontend`: Next.js production build completed and generated all named admin routes.
- [x] Run the repository-required frontend test suite: 203 suites and 907 tests passed.
- [x] Attempt `npm run dev:smoke` and browser-level checks: the frontend can build, but the integrated local runtime is blocked before authentication because the local PostgreSQL database lacks the existing `system_reset_state` migration. No migration was run as part of this UI-only change; authenticated visual evidence remains explicitly unverified.
- [x] Review `git diff --check`, the plan checklist, route/contracts, and the final diff; confirm no unrelated file is staged.
- [x] Commit the plan, implementation, and tests on `developement`; implementation revision `1081a0a12bb9386f5630a98e08bf7bfd5b4eeb15` was pushed, CI run `36306776007` passed all eight jobs, and Railway run `36306995661` successfully deployed the tested revision to backend, frontend, and AI services. The public login endpoint returned HTTP 200 with the production security headers; authenticated route-level visual proof remains bounded by unavailable admin credentials/local runtime.

## 10. Verification matrix and acceptance criteria

| Outcome | Automated proof | Runtime proof | Acceptance |
|---|---|---|---|
| Users pagination | Page test asserts page/search query and bounds | Click Next/Previous with >20 results | Rows and summary change; no duplicate/stuck page |
| User Reports pagination | Page test against nested envelope | Click Next/Previous and search | Backend query changes and result count stays correct |
| User detail sections | Page test for tabs and reset confirmation | Switch sections at desktop/mobile widths | Existing values/actions remain reachable; no stat cards |
| Roster workspace | Page test for tabs/routes | Open every tab and membership dialog | Each tab shows only its purpose; payloads unchanged |
| Class edit | Form/page tests | Edit across tabs, save once | Values persist; update payload unchanged |
| Dashboard | Existing test updated | Refresh and inspect | Only factual totals/usage/health/performance displayed |
| Announcements | Existing create/delete tests | Select class, create/delete | No stat cards; mutation flow unchanged |
| Reports | Shared component test | Switch all admin tabs/export | Teacher surface unaffected; exports still work |
| Audit details | Audit test with nested metadata | Click/keyboard-open row | Complete returned row visible; absent fields not invented |
| Responsive/accessibility | Testing Library roles + browser widths | 390px, 768px, 1440px | Rail wraps/stacks, focus visible, actions labeled |

## 11. Rollout, rollback, observability, cleanup, and unverified boundaries

- Rollout: one frontend-compatible commit; backend deployment may rebuild from the monorepo push but requires no migration or API coordination.
- Rollback: revert the implementation commit. Backend/database state is untouched; no cleanup job is required.
- Observability: existing API errors continue through route toasts; CI/Jest/build and deployed frontend status are the release signals.
- Cleanup: remove only dead UI helpers/imports made obsolete by the redesign, notably synthetic dashboard pulse helpers and unused stat-card imports.
- Unverified boundary: visual correctness behind an authenticated live admin session remains unverified until browser access is available. This does not weaken static, unit, build, CI, or contract evidence and must be reported distinctly.

## 13. Release evidence

- Implementation revision: `1081a0a12bb9386f5630a98e08bf7bfd5b4eeb15` on `origin/developement`.
- GitHub CI: run `36306776007`, conclusion `success`; all eight jobs completed successfully, including frontend lint, typecheck, 907-test suite, production build, and production security-browser checks.
- Railway deployment: run `36306995661`, conclusion `success`; logs prove backend, frontend, and AI jobs checked out and deployed the CI-tested implementation revision above.
- Railway deployment IDs: backend `ebedc6ec-7ec9-41ba-9671-ea05d85b8dae`, frontend `087d1ada-b3cd-460f-b4fa-f09c285fbf5b`, AI service `5aa40061-bcaf-4490-ac1a-2880693ac53a`.
- Public health boundary: `https://nexora-lms.com/login` returned HTTP 200 after deployment with CSP, HSTS, frame-deny, and content-type security headers. Authenticated admin-route visual evidence was not claimed.

## 12. Self-review result

- Unsupported claims: removed; the audit dialog is limited to fields proven in the current list response.
- Contract contradictions: none found; both pagination fixes use existing supported queries and envelopes.
- Scope expansion: avoided; no backend/mobile/schema/auth changes.
- Consumer coverage: named routes, shared report teacher consumer, service wrappers, and backend pagination/audit owners are included.
- Placeholders: none.
- Highest-risk invariants: lifecycle preview/execute, Maintenance Access gates, ClassForm single-state submit, teacher reports, announcement mutations, and audit append-only ownership are explicitly frozen and tested.
