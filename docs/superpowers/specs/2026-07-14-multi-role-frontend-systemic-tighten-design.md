# Multi-Role Frontend Systemic Tighten Design

Date: 2026-07-14
Approved approach: `A — systemic tighten`
Primary scope: `next-frontend`
Bounded secondary scope: Teacher read-only authorization for `GET /api/academic-state/current`

## Goal

Make the Admin, Teacher, and Student web experiences behave like one deliberate school product without erasing their role-specific character.

The implementation must:

- distinguish loading, failed, empty, partial, and populated data states on critical routes;
- keep role boundaries secure without destroying a valid session on a mistyped or stale role URL;
- repair the Teacher assessment editor's read-only academic-quarter contract;
- simplify shared Admin and Teacher presentation patterns;
- tighten Class Record, Assessment Editor, Learners Path, and Student lesson detail around the actual work;
- preserve every existing Student theme and the campus-red product identity;
- verify desktop, mobile, keyboard, state, and integration behavior with current seeded data;
- replace audit claims with fresh post-change evidence in the role reports and walkthrough.

## Evidence Baseline

The approved direction is grounded in the 2026-07-14 audit artifacts:

- `docs/testing/admin-frontend-audit.md`
- `docs/testing/teacher-frontend-audit.md`
- `docs/testing/student-frontend-audit.md`
- `docs/testing/multi-role-ui-ux-walkthrough.md`

The source inventory contains 35 Admin, 31 Teacher, and 24 Student role-local pages. The isolated seeded browser baseline exercised 17 critical routes at desktop and mobile widths. All route documents rendered with HTTP 200, but the run proved two integration failures:

- Teacher Assessment Editor made two forbidden `GET /api/academic-state/current` requests.
- Teacher Performance received HTTP 500 from class diagnostics because of a backend upsert SQL defect.

The audit also confirmed that the protected tree has shared loading coverage but no shared dashboard error boundary, several Teacher and Student pages turn rejected requests into empty data, and role mismatch currently calls `logoutAction('role-mismatch')`.

## Product And Architecture Invariants

The change must preserve these invariants:

- Backend remains the authority for authentication, RBAC, academic state, and official records.
- Web continues to use backend `/api` service wrappers and never calls `ai-service` directly.
- Response envelopes and DTO shapes do not change.
- Admin-only academic-state impact preview and transition remain Admin-only.
- Role-mismatched pages never render foreign-role children while redirecting.
- Unauthenticated users still go to `/login`; incomplete profiles still go to `/complete-profile`.
- `app/globals.css` and `src/lib/themes.ts` remain the visual token sources.
- The nine existing Student themes remain available and no new theme is introduced.
- Destructive academic actions are outside browser verification unless a throwaway fixture makes them clearly reversible.

## Design Mode

Use uncodixify `tighten` mode.

This is not a palette reset and not a single unified shell. Admin retains its campus-red/navy operational character, Teacher retains its blue teaching workspace, and Student retains theme-driven expression. The work removes repeated template signals—decorative eyebrow labels, icon chips, filler framing, pill clusters, large radii, gradients, and routine entrance motion—while keeping real metrics, warnings, charts, and actions.

## Architecture

### 1. Shared Protected-Route Error Surface

Add `next-frontend/app/(dashboard)/dashboard/error.tsx` as the common App Router boundary for unhandled errors below the protected dashboard tree.

The boundary will:

- be a client component;
- show a direct title, safe explanation, `Try again`, and `Return to dashboard` action;
- call the supplied `reset()` callback for retry;
- link to `/dashboard` for role-aware routing through the existing redirect page;
- use existing role/theme variables so it remains readable in Admin, Teacher, and every Student theme;
- never render `error.message`, stack text, digests, internal table names, or response bodies.

The existing Teacher Add Students boundary will adopt the same safe surface and stop rendering raw exception text.

Create one small shared presentation component, `DashboardStatePanel`, under `next-frontend/src/components/layout/`. Its contract is limited to `kind`, `title`, `description`, one optional primary action, and one optional secondary action. It renders a polite live region for failures and does not accept arbitrary error objects. It may present `error`, `empty`, or `unavailable` treatments, but it owns presentation only. Pages continue to own data fetching, retry callbacks, and domain-specific copy. This avoids a generic data-fetching abstraction that would obscure service behavior.

### 2. Explicit Async-State Ownership

Critical pages will model their fetch state explicitly:

- `loading`: the first request has not settled;
- `error`: the owning request failed and no valid replacement data exists;
- `empty`: the request succeeded with zero domain records;
- `content`: valid data exists;
- `partial`: independent requests settled differently and healthy regions remain visible.

Rules:

- A rejected request must not set an empty array or null and then reuse successful-empty copy.
- Retry acts only on the failed request or region.
- Existing valid data stays visible during a refresh failure when doing so is truthful.
- Parallel independent panels use `Promise.allSettled` or equivalent scoped state; one failure does not blank unrelated content.
- UI copy remains safe and concise. Internal error detail may be logged through existing diagnostics but is not rendered.

The first implementation set covers the source-confirmed ambiguity on:

- Teacher Assessments, Calendar, Class Record, and Lessons;
- Teacher Performance diagnostics as an explicit partial failure;
- Student Dashboard, Announcements, Calendar, Performance, and class detail;
- Learners Path's distinction between zero eligible paths and zero filter matches.

### 3. Non-Destructive Role-Mismatch Redirect

Keep `isDashboardRolePathAllowed()` as the render gate. Replace the mismatch logout side effect in `app/(dashboard)/layout.tsx` with a one-shot redirect to `getDefaultDashboardRouteForRole(normalizedRole)`.

Behavior:

1. While the current path is mismatched, render only `AppOrbitLoader`; never render `children`.
2. Store a one-time `nexora.dashboard.roleMismatchNotice` marker in `sessionStorage`.
3. Call `router.replace()` with the existing role-default helper.
4. Retain the current short hard-navigation fallback in case the client transition stalls.
5. Once the allowed role home renders, remove the marker and show one neutral notice: `That page is not available for your account.`

The mismatch path must not call logout, revoke the refresh cookie, clear the in-memory token, or start a refresh race. Explicit logout behavior elsewhere remains unchanged.

### 4. Teacher Read-Only Academic-State Contract

Change authorization metadata in `backend/src/modules/academic-state/academic-state.controller.ts` without changing response shapes:

- remove the controller-wide `@Roles(RoleName.Admin)` annotation;
- annotate `GET current` with `@Roles(RoleName.Admin, RoleName.Teacher)`;
- annotate `GET impact-preview` with `@Roles(RoleName.Admin)`;
- annotate `POST transition` with `@Roles(RoleName.Admin)`.

Students remain forbidden. Teachers gain no mutation or transition-preview authority. The assessment editor continues to use `academicStateService.getCurrent()` and keeps the returned quarter as the system-owned lock.

The editor will model quarter verification as `loading`, `ready`, or `error`. Quarter selectors remain disabled in all three states: while loading, because the authority is unresolved; when ready, because the returned system quarter is authoritative; and on error, because the UI must not invent or permit a replacement quarter. Draft content may still be saved with its already persisted quarter, but publish/release actions remain disabled until verification is `ready`. The error state explains that the current quarter could not be verified and offers retry.

### 5. Performance Diagnostics Boundary

The PostgreSQL/Drizzle upsert defect in `backend/src/modules/performance/performance.service.ts` is not part of this frontend-focused implementation. It remains an independently owned backend remediation item.

The frontend will not mask it. Teacher Performance will retain healthy summary, at-risk, comparison, and log regions, while the diagnostics region shows `Diagnostics temporarily unavailable` with a targeted retry. Successful zero diagnostics continues to show the appropriate zero-signal copy. These states must be testably distinct.

## Shared Visual System

### Page Headers

Tighten `AdminPageShell` and `TeacherPageShell` around this order:

1. direct page title;
2. one short functional description when needed;
3. primary actions aligned to the title block;
4. quiet supporting metadata;
5. core content.

Decorative header icons are removed. Badge/eyebrow props receive no automatic default and are not displayed as uppercase marketing labels or colored pills. Existing call sites may retain the compatibility prop during migration, but targeted pages omit it; no new use is allowed. Meaningful status belongs in page metadata or the content region.

### Metrics And Sections

- Keep only metrics backed by real data.
- Render supporting metrics as compact bordered blocks or inline definition items, not gradient hero cards.
- Remove decorative icon chips from stat cards.
- Use moderate heading weight instead of `font-black` for routine labels.
- Prefer one primary surface per workflow section; avoid card-inside-card framing.
- Reserve pills for genuine compact status or mutually exclusive controls, not ordinary labels and counts.

### Tokens And Typography

- Reuse existing CSS variables and role tokens; do not add a second palette.
- Replace route-local hard-coded color values when an equivalent role token already exists.
- Use clear sentence-case labels and descriptions that state function, not atmosphere.
- Keep body copy at readable existing sizes and constrain descriptions to useful information.
- Use `rounded-lg` or `rounded-xl` for normal surfaces; reserve `rounded-full` for avatars, true status markers, and compact segmented controls.
- Keep contrast at or above the existing accessible role-token combinations.

### Motion And Interaction

- Routine controls use approximately 140–180 ms color, border, or opacity transitions.
- Remove entrance `y` transforms and hover lift from ordinary dashboard controls and content cards.
- Preserve motion only when it explains a modal, drawer, accordion, or state transition.
- Honor reduced-motion preferences.
- Maintain visible `focus-visible` treatment and at least the existing pointer target size.

## Core Flow Designs

### Admin Shared Surfaces

Admin dashboard, users, classes, class templates, diagnostics, and system settings retain their information and actions. The shared shell loses the decorative shield/icon and default `Admin Workspace` eyebrow. Real health, user, class, and system metrics remain, but use calmer compact treatment. No Admin workflow or API contract changes.

### Teacher Class Record

Class Record becomes a direct working page:

- title, short context, class/quarter filters, and refresh are one compact header/toolbar sequence;
- category legends and waiting states use plain text or a small semantic marker instead of a row of badges;
- the workbook is the principal surface and appears earlier in the viewport;
- initial `y` motion and decorative hero/icon framing are removed;
- loading, failed class-list, no assigned classes, no selected class, missing record, and populated workbook remain distinct;
- refresh failures do not erase an already loaded workbook.

### Teacher Assessment Editor

The editor keeps its full question, scoring, save, preview, and publish functionality. Its header becomes a compact workbar:

- back/title context on the left;
- save state, preview, and publish actions grouped on the right;
- system quarter and publication state presented as quiet metadata rather than multiple status pills;
- warnings remain visible and are never reduced to color alone;
- advanced controls stay keyboard reachable without forced scrolling;
- the first question appears materially earlier on desktop and mobile.

The editor does not invent a quarter fallback. Until `GET current` succeeds, quarter-dependent controls remain clearly unavailable or preserve their last truthful loaded state.

### Teacher Performance

Keep `Promise.allSettled` and preserve healthy panels. Add region-level diagnostics status so rejected, successful-empty, and populated diagnostics render different content. The global warning toast may remain, but it does not replace persistent region-level explanation and retry.

### Student Learners Path

Retain existing data, navigation, help guide, and AI-availability behavior. Recompose the page:

- one direct title and short description;
- search, path-status control, refresh, and help in one responsive control row;
- total/in-progress/completed counts as plain supporting text rather than three colored pills;
- remove the duplicate `Remedial entry` and `Guided recovery` explainer cards;
- keep the controlled AI outage notice near the affected content;
- use a compact successful-empty state when `paths.length === 0`;
- use `No paths match these filters` only when source paths exist but filters remove them;
- keep path cards and deep-link compatibility unchanged.

The dashboard layout already supplies page padding, so Learners Path will not add a redundant full-page background/padding shell.

### Student Lesson Detail

Retain lesson content and navigation. Replace the decorative hero and four metadata pills with:

- direct lesson title and course context;
- a compact semantic definition row for module, duration, availability, and progress where those values exist;
- one primary readable lesson surface;
- existing Student theme variables rather than new fixed colors.

Sparse lessons should look intentionally concise instead of making chrome outweigh the content.

## Responsive Behavior

The implementation targets these verification widths:

- approximately `390px` for mobile;
- `768px` for tablet/sidebar transition;
- `1280px` or wider for desktop workflows.

At narrow widths:

- title/action groups stack in document order;
- toolbars wrap without horizontal page overflow;
- primary actions remain visible without forced scrolling inside a nested region;
- data grids use their existing controlled horizontal scroll only where tabular semantics require it;
- help, filters, and status controls keep accessible names;
- Student theme backgrounds do not reduce state-panel contrast.

## Test-Driven Verification Design

Implementation starts with failing tests for each behavior change.

### Frontend Unit And Component Tests

- Expand `dashboard-route-access.test.ts` to cover the complete Admin/Teacher/Student allowed-and-denied matrix and role-default destinations.
- Add protected-layout tests proving mismatch redirects to the valid role home, never renders foreign children, never calls logout, and emits one notice.
- Add shared error-boundary tests proving retry/home actions work and raw exception text is absent.
- Add error-versus-empty tests for every critical page changed in the first implementation set.
- Extend Teacher Performance tests for rejected, successful-empty, and populated diagnostics while other panels remain visible.
- Extend Assessment Editor tests for current-quarter success and explicit read failure.
- Extend `StudentLxpExperience.test.tsx` for zero eligible paths, filtered-empty, request error, populated data, and controlled AI outage.
- Add structural/accessibility assertions for the compact Class Record, Editor, LXP, and lesson layouts without brittle pixel snapshots.

### Backend Tests

- Add Academic State controller metadata tests proving `current` declares Admin and Teacher roles.
- Prove `impact-preview` and `transition` declare only Admin.
- Use the seeded browser/API verification to prove Teacher receives HTTP 200 and Student remains HTTP 403 for `current`; metadata assertions alone are not treated as runtime guard proof.
- Keep the current service tests because response behavior does not change.

### Static And Build Verification

Run targeted tests first, then:

- `npm --prefix next-frontend run test -- --runInBand`
- `npm --prefix next-frontend run lint`
- `npm --prefix next-frontend run build`
- targeted Backend Academic State tests;
- `npm --prefix backend run build`.

Inspect scripts before any lint command and avoid invoking a mutating lint path unintentionally.

### Browser Verification

Use an isolated seeded Compose project and credentials extracted from `backend/seed-database.js`.

Replay the 17 baseline critical routes with console and failed-response capture. Add:

- one live foreign-role redirect from each role, plus the full route matrix in unit tests;
- Teacher Assessment Editor verification that `GET /api/academic-state/current` returns HTTP 200;
- explicit diagnostics-unavailable rendering while the known backend 500 persists;
- desktop and mobile safe-action checks for Class Record, Assessment Editor, Learners Path, and lesson detail;
- Student theme switching on dashboard, Learners Path, and lesson detail;
- keyboard access to primary actions, filters, segmented controls, retry actions, and help.

Do not exercise delete, archive, bulk enrollment, grade posting, assessment submission/finalization, or other irreversible academic writes.

## Documentation And Evidence

After post-change verification:

- regenerate `docs/testing/admin-frontend-audit.md` and its fix plan;
- regenerate `docs/testing/teacher-frontend-audit.md` and its fix plan;
- regenerate `docs/testing/student-frontend-audit.md` and its fix plan;
- update `docs/testing/multi-role-ui-ux-walkthrough.md` from proposed state to shipped behavior;
- record before/after hierarchy changes, exact test commands, browser coverage, remaining backend-owned defects, and deliberately skipped actions;
- do not claim the performance diagnostics backend defect is resolved unless a separate verified backend change actually fixes it.

## Scope Boundaries

Included:

- shared protected dashboard state/error presentation;
- explicit critical-route async states;
- non-destructive role mismatch redirect;
- one bounded read-only backend RBAC change;
- shared Admin/Teacher shell tightening;
- Class Record, Assessment Editor, Teacher Performance diagnostics region, Learners Path, and Student lesson detail polish;
- responsive, theme, keyboard, unit, build, and browser verification;
- role audit/fix-plan and walkthrough updates.

Excluded:

- AI-service behavior or availability;
- mobile application changes;
- database schema or response-envelope changes;
- a global `globals.css` rewrite;
- new Student themes or removal of existing themes;
- destructive browser actions;
- the backend Performance diagnostics SQL repair;
- unrelated historical Teacher QA items already reconciled in the current audit.

## Acceptance Criteria

The work is complete only when all of the following are proven:

1. Every critical route has a truthful loading/error/empty/content model, with partial failures scoped where applicable.
2. A shared dashboard error boundary renders safe copy and actions without raw error detail.
3. Full role-matrix tests pass, and live mismatches block foreign content while preserving the valid session.
4. Teacher Assessment Editor reads the current academic quarter with HTTP 200; Students remain forbidden and Admin-only academic-state operations stay Admin-only.
5. Teacher Performance visibly distinguishes a rejected diagnostics region from successful zero diagnostics.
6. Shared Admin and Teacher headers no longer default to decorative icon/eyebrow treatment.
7. Class Record, Assessment Editor, Learners Path, and Student lesson detail place core work earlier and use fewer decorative cards, pills, gradients, and transforms.
8. Existing data, actions, service wrappers, envelopes, role shells, and all nine Student themes continue to work.
9. Representative desktop, tablet, and mobile widths have no unintended page-level horizontal overflow.
10. Focus, keyboard, contrast, and reduced-motion behavior remain usable on changed controls.
11. Targeted tests, full frontend tests, lint, builds, backend authorization tests, and browser verification pass or have explicitly documented, accurately owned residual failures.
12. All six role audit/fix-plan artifacts and the walkthrough reflect post-change evidence rather than intent.

## Recommended Implementation Sequence

1. Characterize route access, error boundaries, and academic-state authorization with failing tests.
2. Implement safe mismatch redirect and the bounded read-only endpoint permission.
3. Add the shared state panel and error boundary, then convert critical fetch states.
4. Tighten shared Admin and Teacher shells.
5. Tighten Class Record and Assessment Editor.
6. Tighten Learners Path and Student lesson detail.
7. Run focused tests after each slice, then the full static/build suite.
8. Run the isolated seeded multi-role browser sweep.
9. Update audit, fix-plan, and walkthrough artifacts with verified results.
