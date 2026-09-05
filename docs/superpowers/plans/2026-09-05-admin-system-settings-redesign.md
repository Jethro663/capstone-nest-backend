# Admin System Settings Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the overloaded admin system-settings page with a route-backed, first-admin-friendly settings area while preserving every existing academic-state safeguard and releasing the verified frontend change.

**Architecture:** A client settings shell provides stable route navigation and tutorial help without fetching domain data. Focused App Router pages use a shared current-state hook and mount the existing learner and recovery panels only on their owning routes; period activation and year transition remain isolated in dedicated pages.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind 4, Radix dialog/popover primitives, Jest, Testing Library, Playwright, GitHub Actions, Railway.

## Global Constraints

- Stay in the current `developement` checkout and preserve unrelated work.
- Do not change backend contracts, academic policy, production academic state, mobile code, or APK artifacts.
- Render periods from the backend-provided `policy.periods`/`current.periods` arrays.
- Keep activation password, expected version, correction reason, confirmation text, and transition mapping safeguards intact.
- Use visible consequence text plus accessible click/focus/touch help; never rely on hover alone.
- Only the selected route may mount its task-specific data panels.

---

### Task 1: Settings shell, route navigation, and tutorial

**Files:**
- Create: `next-frontend/src/components/admin/system-settings/SystemSettingsShell.tsx`
- Create: `next-frontend/src/components/admin/system-settings/SystemSettingsGuide.tsx`
- Create: `next-frontend/src/components/admin/system-settings/SettingHelp.tsx`
- Create: `next-frontend/src/components/admin/system-settings/SystemSettingsShell.test.tsx`
- Create: `next-frontend/app/(dashboard)/dashboard/admin/system-settings/layout.tsx`

**Interfaces:**
- `SystemSettingsShell({ children }: { children: ReactNode })` wraps every system-settings route.
- `SettingHelp({ label, children })` renders an accessible information popover.
- `SystemSettingsGuide` renders a four-page admin guide.

- [x] Write tests asserting route links, active-route semantics, mobile navigation, popover content, and guide open/next/previous/close behavior.
- [x] Run the focused test and confirm it fails because the shell and guide do not exist.
- [x] Implement the shell, popover, guide, and nested layout using existing admin tokens and dialog/popover primitives.
- [x] Run the focused test and confirm it passes.

### Task 2: Explicit current-state loading and overview

**Files:**
- Create: `next-frontend/src/components/admin/system-settings/useAcademicStateCurrent.ts`
- Create: `next-frontend/src/components/admin/system-settings/AcademicStateView.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/admin/system-settings/page.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/admin/system-settings/page.test.tsx`

**Interfaces:**
- `useAcademicStateCurrent()` returns `{ current, loading, error, refresh }` and never leaves a rejected request in loading state.
- `AcademicStateView` renders explicit loading/error/retry states around current data.

- [x] Replace the old combined-page assertions with failing tests for explicit active labels, safe assessment guidance, no transition-preview request, and recoverable current-state failure.
- [x] Run the overview test and confirm each new behavior fails for the expected reason.
- [x] Implement the hook, state view, and focused overview with links to the dedicated routes.
- [x] Run the overview and shell tests and confirm they pass.

### Task 3: Academic-year activation route

**Files:**
- Create: `next-frontend/app/(dashboard)/dashboard/admin/system-settings/academic-year/page.tsx`
- Create: `next-frontend/app/(dashboard)/dashboard/admin/system-settings/academic-year/page.test.tsx`

**Interfaces:**
- Consumes `useAcademicStateCurrent`, `SettingHelp`, and `academicStateService.previewActivation/activatePeriod`.
- Preserves the existing `ActivateAcademicPeriod` payload and request-id reuse behavior.

- [x] Write failing tests for server-provided periods, preview-before-activation, password gating, exact observed version, and backward/skip override requirements.
- [x] Run the route test and confirm the route is missing.
- [x] Move the existing period-activation flow into the focused route and add clear consequence text plus technical details.
- [x] Run the route test and confirm it passes.

### Task 4: Assessment/grading and learner-completion routes

**Files:**
- Create: `next-frontend/app/(dashboard)/dashboard/admin/system-settings/assessments-grading/page.tsx`
- Create: `next-frontend/app/(dashboard)/dashboard/admin/system-settings/assessments-grading/page.test.tsx`
- Create: `next-frontend/app/(dashboard)/dashboard/admin/system-settings/learner-completion/page.tsx`
- Create: `next-frontend/app/(dashboard)/dashboard/admin/system-settings/learner-completion/page.test.tsx`

**Interfaces:**
- Assessment page consumes current state only and explains the backend-owned current-period rules.
- Learner-completion route mounts `AcademicBackSubjectsPanel` only after current state loads.

- [x] Write failing tests for dynamic period labels, safe teacher/student testing steps, and route-local learner-panel mounting.
- [x] Run both focused tests and confirm the routes are missing.
- [x] Implement both focused pages with visible essential explanations and supplemental help.
- [x] Run both route tests and confirm they pass.

### Task 5: Isolated year-transition route

**Files:**
- Create: `next-frontend/app/(dashboard)/dashboard/admin/system-settings/year-transition/page.tsx`
- Create: `next-frontend/app/(dashboard)/dashboard/admin/system-settings/year-transition/page.test.tsx`

**Interfaces:**
- Loads current state first, then `getImpactPreview({ schoolYear })`.
- Preserves `transition`, `notifyTeachers`, assessment-period mapping, password, and exact confirmation requirements.

- [x] Write failing tests proving current state remains visible when impact preview fails, preview has an independent retry, blockers are grouped without raw learner IDs, and transition safeguards remain disabled until satisfied.
- [x] Run the focused test and confirm it fails because the route is missing.
- [x] Move the existing transition flow into the dedicated route and group blocker rows by code with counts and actionable class links.
- [x] Run the focused test and confirm it passes.

### Task 6: Audit/recovery route and explicit alignment preview

**Files:**
- Create: `next-frontend/app/(dashboard)/dashboard/admin/system-settings/audit-recovery/page.tsx`
- Create: `next-frontend/app/(dashboard)/dashboard/admin/system-settings/audit-recovery/page.test.tsx`
- Modify: `next-frontend/src/components/admin/AcademicStateAlignmentRecovery.tsx`
- Modify: `next-frontend/src/components/admin/AcademicStateAlignmentRecovery.test.tsx`

**Interfaces:**
- Audit route loads current state and readiness before mounting `AcademicRecoveryPanel`.
- State alignment requests a preview only after `Preview alignment` is chosen.

- [x] Write failing tests for route-local recovery mounting, readiness failure handling, and no automatic alignment preview.
- [x] Run the tests and confirm the current automatic behavior fails the new expectation.
- [x] Implement the advanced route and remove the automatic preview effect without weakening execute confirmations.
- [x] Run the focused tests and confirm they pass.

### Task 7: Full verification, review, and release

**Files:**
- Modify only task-owned files if verification exposes a task-caused defect.

**Interfaces:**
- CI-tested commit must be the same revision deployed by Railway.

- [x] Run focused system-settings tests, frontend lint, typecheck, full Jest suite, production build, and the navigation/dev smoke appropriate to the route change.
- [x] Run browser-level admin checks for desktop navigation, mobile selector, guide, information popovers, and safe read-only route loading; record any destructive controls as intentionally not exercised.
- [x] Self-review the final diff against this plan because delegation was not authorized; fix all critical or important findings and rerun affected checks.
- [x] Inspect `git diff --check`, status, branch/upstream, divergence, and every outgoing commit.

Post-commit release evidence is kept in the task execution record so documenting
it does not create a second, self-referential release revision:

- Commit task-owned changes, push `developement`, confirm local/remote SHA equality, and monitor exact-commit CI.
- Monitor the downstream Railway deployment to terminal success and verify the protected production route and public frontend health.
