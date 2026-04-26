# Teacher Web QA Remediation Plan

## Summary

- Fix only defects confirmed by source plus seeded teacher browser checks.
- Treat stale PDF items as regression coverage, not new work.
- Keep behavior aligned with the admin fixes already landed: authenticated CSV/blob exports, shared rich-text rendering, clear validation, and demo-safe AI unavailable states.

## Implementation Plan

### 1. Reports export authentication

- Replace `window.open(...)` in `TeacherReportsFigmaPage` with authenticated blob-download service methods using the existing API client.
- Mirror the admin reports export pattern so bearer tokens are attached and no 401 popup tab opens.
- Add Jest coverage for export URL selection and blob-download invocation per report tab.

### 2. Compact module view

- Update compact module grid/card styling so compact mode visibly reduces card density: smaller padding, tighter metadata spacing, shorter action rows, and stable responsive columns.
- Keep card content readable and avoid layout shift on wide and mobile viewports.
- Add a Playwright or RTL style assertion where feasible, plus live before/after card measurements.

### 3. AI Draft and extraction unavailable states

- Keep the honest `AI service is unavailable` message when `/api/ai/*` endpoints return `503`.
- Suppress noisy repeated console errors where the frontend already renders a controlled offline state.
- Make `Generate Draft` visibly disabled when index readiness is unavailable, with a clear reason.
- Add a persistent `Back` action to Extraction Review error/unavailable states.
- Add tests for AI Draft offline state and Extraction Review unavailable navigation.

### 4. Class workspace validation

- Add explicit client-side validation for class workspace announcements and discussion threads:
  - required title
  - required rich-text/plain content
  - clear inline or toast errors
  - disabled publish/post buttons where appropriate
- Confirm backend DTO/service validation rejects empty title/content consistently.
- Add tests for blank announcement/thread attempts.

### 5. Assessment Advanced Settings ergonomics

- Move or duplicate the `Open Advanced Settings` action into a sticky or always-visible editor toolbar/header area.
- Ensure keyboard and mouse access works without forced scrolling.
- Keep the existing quarter select and backend payload behavior unchanged unless a contract bug is found.
- Add browser verification for opening the dialog and selecting Q1-Q4.

### 6. Teacher profile security and phone entry

- Add show/hide password toggles to current, new, and confirm password fields.
- Add input-time Philippine mobile sanitizing and an 11-digit local mobile max for teacher profile phone entry, while still accepting normalized `+63` values on submit if already supported by the service.
- Improve wrong-current-password messaging when the backend returns an identifiable auth error.
- Add RTL coverage for max-length typing and password visibility toggles.

### 7. Library class-specific upload filtering

- Filter upload class options by the selected subject and grade when upload scope is class-specific.
- Add a visible helper explaining why a class is not selectable when subject/grade filters eliminate it.
- Add or adjust seed/demo data so a teacher with multiple subject classes can exercise the mismatch path safely.
- Add tests for the filtered dropdown and a live upload smoke using a throwaway file.

### 8. Class Record default UX

- Auto-select the first available class record when the teacher opens `/dashboard/teacher/class-record`, or replace the current empty message with a clearer `Choose a class to load Q1` state.
- Keep the existing refresh path because it already triggers API requests.
- Add tests for default class selection or the revised empty state, depending on the chosen UX.

## Regression Checks For Stale PDF Items

- Class route spreadsheet load remains clean.
- Add Module does not throw `property isVisible/isLocked should not exist`.
- H1/H2/H3 remain visible and render correctly in teacher notes, announcements, discussion, and assessment editor.
- Teacher Reports Q1 page load does not show the old failure state.
- Class Record Q1 spreadsheet still loads after class selection.

## Verification Plan

### Backend

- Run targeted Jest for any touched DTO/service/controller modules.
- Verify AI proxy/offline behavior tests if backend changes are needed.
- Run `npm run build` in `backend`.

### Frontend

- Add or extend focused Jest/RTL tests for:
  - teacher reports export
  - class workspace announcement/discussion validation
  - AI Draft offline state
  - extraction unavailable Back action
  - assessment Advanced Settings access
  - profile password toggles and phone max length
  - library upload class filtering
  - class-record default state
- Run targeted frontend tests, then `npm run build` in `next-frontend`.

### Live Browser

- Re-check with `teacher1@lms.local / Teacher123!` and `teacher2@lms.local / Teacher123!`.
- Routes to revisit:
  - `/dashboard/teacher/classes`
  - `/dashboard/teacher/classes/:id`
  - `/dashboard/teacher/classes/:id/ai-draft`
  - `/dashboard/teacher/extractions/:id`
  - `/dashboard/teacher/assessments/:id/edit`
  - `/dashboard/teacher/library`
  - `/dashboard/teacher/class-record`
  - `/dashboard/teacher/reports`
  - `/dashboard/teacher/announcements`
  - `/dashboard/teacher/profile`
- Confirm no fixed route adds new console errors, 401 popup tabs, or 4-digit warm-route render regressions.

## Assumptions

- AI-backed generation does not need to fake online behavior when the AI service is actually unavailable; it must fail visibly and intentionally.
- Destructive writes stay limited to throwaway fixtures during verification.
- Library seed updates are allowed if needed to demonstrate a teacher owning multiple subject/grade classes.
