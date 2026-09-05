# Admin System Settings Redesign

## Problem

`/dashboard/admin/system-settings` currently presents routine academic calendar controls, year-transition readiness, learner-completion work, audit findings, and break-glass recovery operations in one long page. The page does not clearly label the active school year or grading period, loads advanced data before it is requested, and reports current-state and transition-preview failures through one generic error. A first-time administrator can therefore mistake a presentation or preview failure for a missing academic year.

Production evidence on 2026-09-05 showed an active `2026-2027` school year and `Q3` period. The redesign must not change that state or weaken the backend rules that only permit assessment release and new attempts in the active period.

## Product Outcome

An administrator should be able to answer these questions within ten seconds:

1. Which school year and grading period are active?
2. What can teachers and students do in that state?
3. Is anything requiring attention?
4. Where should the administrator go to change or repair it?

The settings area will use a GitHub-like, route-backed navigation shell: a stable grouped rail on desktop, a compact route selector on small screens, and one focused task per URL. The existing backend services and mutation safeguards remain authoritative.

## Information Architecture

- **Overview** (`/dashboard/admin/system-settings`) — explicit active-state summary, current assessment rule, first-admin next steps, and links to focused settings.
- **Academic year** (`/dashboard/admin/system-settings/academic-year`) — active period status, period-change preview, password confirmation, and technical state details.
- **Assessments & grading** (`/dashboard/admin/system-settings/assessments-grading`) — current-period assessment rules, dynamic policy periods, grading-method summary, and safe testing instructions.
- **Year transition** (`/dashboard/admin/system-settings/year-transition`) — next-year impact, grouped blockers, teacher notification, and the existing destructive confirmation flow.
- **Learner completion** (`/dashboard/admin/system-settings/learner-completion`) — back-subject and Grade 10 completion workflows.
- **Audit & recovery** (`/dashboard/admin/system-settings/audit-recovery`) — read-only audit and advanced recovery actions, visually separated as restricted operations.

The current URL remains valid as the overview. Every section is directly linkable and browser Back/Forward compatible. Only the active route mounts its data-owning panels.

## Component Boundaries

- `SystemSettingsShell` owns the header, route navigation, mobile selector, and help trigger. It performs no academic API requests.
- `SystemSettingsGuide` owns the four-page route tutorial and annotated system-style examples.
- `SettingHelp` provides a click, focus, keyboard, and touch-accessible information popover for essential concepts.
- `useAcademicStateCurrent` owns the current-state request with explicit loading, error, data, and refresh states.
- Each route owns only its task-specific state and requests. The academic-year route owns period activation. The year-transition route owns impact preview and transition mutations.

## Content and Visual Direction

Use the existing admin campus-red tokens, restrained white surfaces, direct headings, and thin borders. Do not add decorative metrics, gradients, glass effects, or badge clutter. Status labels must state their meaning, such as `Active school year`, `Active grading period`, and `Current-period assessment rule`.

Essential consequences remain visible as microcopy. Information popovers supplement that copy; they never conceal a destructive consequence. Popovers cover active school year, active grading period, policy, assessment readiness, year transition, learner completion, and recovery.

The top-right guide contains four pages:

1. Read the active state.
2. Test an assessment safely.
3. Preview and activate a period.
4. Resolve blockers and use recovery tools.

## Data and Error Behavior

- Overview, academic-year, assessments-and-grading, and learner-completion request only current academic state.
- Year transition requests current state first, then the next-year impact. A failed impact request must leave the valid current state visible and show a transition-specific retry message.
- Audit and recovery request current state and transition readiness, then mount the existing audit panel.
- A current-state failure must replace the loading state with an actionable error and retry control.
- Refreshes must not remount unrelated routes or automatically open destructive previews.
- State-alignment preview is requested only after the administrator explicitly chooses to preview it.

## Accessibility and Responsive Behavior

- The desktop rail uses links with `aria-current="page"`.
- The mobile selector has an explicit label and navigates to the selected route.
- Help triggers have descriptive accessible names.
- Dialog navigation uses named Previous, Next, and Close controls, announces page position, and returns focus through the existing dialog primitive.
- Popovers are operable without hover.
- Error and loading messages use appropriate live-region roles.
- Raw learner identifiers are not introduced into routine overview or navigation surfaces.

## Compatibility and Safety

- No backend DTO, endpoint, database schema, policy, or academic state changes.
- Existing activation and year-transition request payloads, password gates, optimistic version checks, confirmation text, and idempotency behavior remain unchanged.
- Existing learner-completion and recovery components are reused inside their dedicated routes.
- The current policy period array remains server-driven; no universal Q1-Q4 assumption is added.
- Mobile and APK packaging are out of scope because no mobile inputs change.

## Verification

- Focused Jest tests prove navigation, help-guide paging, information-popover behavior, current-state failure recovery, academic-year activation, transition-preview isolation, and route-specific lazy mounting.
- The original failure tests must be observed red before implementation and green afterward.
- Run frontend lint, typecheck, full Jest suite, production build, route smoke, and browser-level admin checks.
- Inspect the final diff and exact pushed commit, then follow CI and the Railway frontend deployment to terminal success and verify the protected production route responds correctly.
