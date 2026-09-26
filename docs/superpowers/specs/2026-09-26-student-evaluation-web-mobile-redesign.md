# Student Evaluation Web and Mobile Redesign

**Date:** 2026-09-26

**Phase:** Implemented, packaged, deployed, and live-verified

**Repository snapshot:** `developement` at `a11ab492deaf12906b58db26a2427cf84b7e1559`
**Primary roles:** Student respondent; teacher/admin remain downstream readers of anonymous summaries and campaign results

## Outcome

Adopt a responsive **evaluation workspace** that keeps the current pending/completed workflow and backend-owned eligibility rules, but gives every question enough room for a clear six-point rating scale. Web uses custom hover/focus tooltips plus a persistent selected-rating explanation. Mobile uses the same labels and payload values in a touch-first, full-screen form with a compact 3-by-2 rating grid.

The shared scale is:

| Value | Label | Meaning shown to the student |
|---:|---|---|
| 0 | Not observed | The behavior or result was not demonstrated. |
| 1 | Rarely | It was demonstrated only in a few instances. |
| 2 | Sometimes | It was demonstrated in some instances, but not regularly. |
| 3 | Usually | It was demonstrated in most instances. |
| 4 | Consistently | It was demonstrated reliably across the experience. |
| 5 | Excellent | It was demonstrated at an exceptional level throughout. |

The scale describes frequency or quality without changing question wording. It applies to system, JA Hub, and teacher evaluations. This requires a backward-compatible backend widening for teacher ratings from `1–5` to `0–5`; system and JA Hub ratings already accept `0–5`.

## Current experience

### Confirmed

- The student web route mounts `StudentTeacherEvaluationsPage`, which merges assigned system/JA forms with teacher-evaluation forms and submits through the two existing endpoint families (`next-frontend/src/components/student/evaluations/StudentTeacherEvaluationsPage.tsx:124-274`).
- Web renders six compact choices inside a fixed 19-rem table column. The form itself has a 720-pixel minimum width and a 30-rem nested scroll area, which explains the cramped/displaced rating controls (`StudentTeacherEvaluationsPage.tsx:87-121, 409-470`).
- The existing web rating component offers values `0–5`, but provides only numeric/star accessible names and no meaning text (`StudentTeacherEvaluationsPage.tsx:97-119`).
- The mobile API client already calls the same backend routes and uses the same request fields as web (`mobile/src/api/services/evaluations.ts:57-103, 199-232`).
- A dormant `StudentEvaluationsScreen` is mounted as a root stack screen and is reachable from a Profile quick link, but it is absent from the student tab manifest and drawer (`mobile/src/navigation/AppNavigator.tsx:243-251, 678-705`; `mobile/src/navigation/role-drawer-model.ts:114-151`; `mobile/src/screens/ProfileScreen.tsx:1191-1198`).
- Mobile currently preselects every answer as 5 and exposes only 1–5 star buttons, so it can submit a positively biased response without deliberate answers (`mobile/src/screens/StudentEvaluationsScreen.tsx:40-60, 187-190`).
- System/JA rating normalization accepts `0–5`; teacher rating normalization accepts only `1–5` (`backend/src/modules/lxp/lxp.service.ts:280-303, 442-476`). Both persistence fields are JSON, so widening the validation boundary does not require a migration (`backend/src/drizzle/schema/lxp.schema.ts:367, 541`).
- Focused baseline checks pass: web evaluation component 1/1 test; mobile evaluation API and navigation 38/38 tests.

### Inferred

- The web displacement is primarily layout-driven, not a data or rendering-volume problem: a six-choice control is constrained inside a fixed-width table cell and nested horizontal/vertical scroll container.
- Treating Evaluations as a student tab/drawer destination is more consistent than retaining it as a Profile-only utility, because every other student primary destination lives under `RoleDrawerProvider` and uses drawer history.

### Unknown until Phase 2 runtime verification

- Exact visual geometry with authenticated production-shaped data at browser widths and on a physical Android device.
- Whether existing historical teacher submissions contain only 1–5 values. No data rewrite is needed either way, but production data is not inspected in Phase 0.

## Decision ledger

### Keep

- Existing routes, response envelopes, role gates, eligibility/finalization rules, duplicate-submission prevention, audit logging, optional comments, filters, pending/completed history, and server refetch after success.
- Existing GABHS red, white, and navy visual identity.
- The same question definitions supplied by the backend; clients do not invent form-specific questions.
- Profile as the fixed drawer footer and the existing tab history behavior.

### Change

- Web question layout: table rows become full-width question cards with the scale beneath each question.
- Web rating interaction: every value gets a custom hover/focus tooltip and accessible description; the chosen meaning remains visible after selection.
- Web width: expand from a constrained `max-w-7xl`/`max-w-4xl` composition to a bounded wide workspace (up to about 1600 pixels) with a slimmer inbox rail and a flexible form pane.
- Rating contract: all evaluation kinds use deliberate `0–5` answers; no value is preselected.
- Mobile: replace the bottom-sheet form with an in-screen list/detail workspace, add a drawer-aware header, and expose Evaluations as a first-class tab destination.
- Student drawer categories: **Learning** (Home, My Classes, Assessments), **School life** (Calendar, JA, Announcements), and **Feedback** (Evaluations).

### Frozen

- Endpoint paths and payload keys:
  - `GET/POST /api/lxp/me/teacher-evaluations`
  - `GET /api/lxp/me/system-evaluations`
  - `POST /api/lxp/me/system-evaluations/:assignmentId/submit`
- Backend authority over form availability, campaign windows, class enrollment, academic state, response persistence, and audit history.
- Anonymous aggregate/report behavior for teachers and administrators.
- No new statistics cards, dashboard metrics, schema columns, dependency, feature flag, or AI behavior.

### Unknown boundary

- Physical-device acceptance needs an attached/available Android target after packaging. Absence of a target must be reported, not converted into a pass.

## Directions considered

### A. Responsive workspace with stacked question scales — recommended

Keep the pending/completed inbox rail and selected-form pane. Replace the table with question cards. Each card gives the question full width and places six equal rating choices below it. Tooltips appear above the hovered/focused choice; the current choice meaning appears in a quiet line under the scale.

**Why:** Preserves the familiar workflow, fixes the displacement at its source, supports fast scanning, and adapts cleanly to narrow web and native mobile layouts.

### B. One-question-at-a-time stepper

Show a single question with Back/Next and progress. This maximizes focus and small-screen clarity.

**Tradeoff:** Adds navigation/state complexity, slows review of all answers, and makes correction before submission less convenient. It changes more behavior than the user requested.

### C. Dense survey matrix

Keep a table, but make 0–5 fixed columns with a radio cell under each value and a legend at the top.

**Tradeoff:** Efficient on large monitors but remains fragile on phones and narrow laptops, and tooltips compete with a dense grid. It does not resolve the original compactness strongly enough.

## Chosen web design

1. The page header stays quiet: title, one-sentence purpose, current quarter, and existing form-type filters.
2. At desktop widths, use a two-column workspace: a roughly 20-rem inbox rail and one flexible form pane. Below that breakpoint, the inbox stacks above the form without horizontal scrolling.
3. Pending and completed histories remain distinct. Selected pending rows use navy with high-contrast white/soft-white text.
4. The form header contains title, context, form type, and a compact `answered / total` progress indicator.
5. Each question is a bordered, flat card—not a separate floating dashboard card—with its number, question text, and six-choice scale.
6. Each scale choice displays `0` or `1★` through `5★`. Hover and keyboard focus reveal the label and meaning in a custom tooltip. `aria-describedby`, `aria-pressed`, and a question-specific accessible name make the same meaning available without hover.
7. After selection, the label and meaning stay visible beneath the scale. This also covers touch-capable web devices where hover is unavailable.
8. The comment and submit area follows the question list in normal document flow. Submit remains disabled until all questions have a deliberate value, including a deliberate 0.

## Chosen mobile design

1. Evaluations becomes a student tab mounted inside `RoleDrawerProvider`; the list header therefore uses the hamburger/menu affordance.
2. The drawer gains three clear student groups: Learning, School life, and Feedback. Profile/logout remain fixed in the footer.
3. The list view keeps Pending and Submitted segments and an optional class filter, but reduces decorative labels and uses concise evaluation rows.
4. Opening a pending item switches the same screen to a full-height form view instead of placing a 90%-height modal over a scroll view. Local Back returns to the evaluation list; Android back follows the same rule.
5. Each question uses a 3-by-2 grid of 48-pixel-minimum touch targets for values 0–5. A selected descriptor directly below the grid shows the exact same label and meaning as web.
6. Ratings start unanswered. The submit action stays disabled and explains how many questions remain. There is no automatic all-5 initialization.
7. The optional comment remains after all questions. Keyboard avoidance and safe-area padding keep the comment and submit action reachable.
8. On server success, return to Submitted and refetch both dashboards. On failure, keep the form and answers visible and show the backend-derived error.

## Navigation and state

- Entry from drawer: `MainTabs -> StudentEvaluations`, list state, hamburger available.
- Entry from Profile quick link: navigate to the sibling `StudentEvaluations` tab; do not push a duplicate root route.
- Select pending item: list state -> local form state. No network mutation occurs.
- Back from local form: form state -> evaluation list. Back from the primary list follows tab history.
- Submit success: form state -> Submitted segment after both dashboards refetch.
- Submit failure: remain in form state with ratings/comment intact.
- Filter change: closes any selected item and applies the chosen inbox filter; no server mutation.
- Deep-link fallback: there is no public evaluation deep link today. The typed student tab route is the canonical destination.

## States and accessibility

- **Loading:** skeleton/quiet loading rows; no selectable phantom form.
- **Empty:** distinguish no pending evaluations from no submitted history.
- **Error:** explain that evaluations could not load and offer Retry; never fabricate records.
- **Disabled:** submit shows unanswered count and pending state; individual buttons remain available while not submitting.
- **Submitting:** lock duplicate submit while leaving selected values legible.
- **Offline/network loss:** keep the active draft in component memory and expose the request error; no offline queue or false success.
- **Keyboard/screen reader:** tooltip content is also programmatically associated and persistent after selection; pressed state and value are announced.
- **Touch:** minimum 44-by-44 web targets and 48-pixel native targets; tooltips are not the only way to learn the scale.

## Data and contract flow

```text
web page / mobile tab
        |
        +-- teacher dashboard ---- GET /lxp/me/teacher-evaluations
        +-- system dashboard ----- GET /lxp/me/system-evaluations
        |
 deliberate Record<questionKey, 0..5>
        |
        +-- teacher -------------- POST /lxp/me/teacher-evaluations
        +-- system / JA ---------- POST /lxp/me/system-evaluations/:id/submit
        |
 backend validates eligibility, exact keys, integer range, duplicate state, and campaign window
        |
 JSON rating persistence + existing audit event
```

Only the teacher range check widens. Routes, payload property names, envelopes, state ownership, and persistence shapes remain unchanged.

## Verification design

- Backend unit regression proves teacher evaluation accepts a deliberate 0, still accepts 5, and rejects -1/6/missing/unknown keys.
- Web component tests prove all six labeled choices, tooltip/focus meaning, no preselection, disabled incomplete submit, and exact teacher/system payloads including 0.
- Mobile screen tests prove no default rating, touch selection 0–5, persistent meaning, incomplete-submit block, preserved answers on error, and exact request payloads.
- Navigation tests prove Evaluations is a student tab, appears only once in the categorized drawer, Profile reaches the sibling tab, and tab history remains intact.
- Browser verification covers desktop and narrow responsive widths; package/device verification covers Android geometry when a target is available.

## Self-review

- No placeholder or undecided implementation behavior remains.
- The proposed 0 meaning is compatible with the user request and explicitly reconciles the current backend/client mismatch.
- No procedure, authorization, endpoint, response envelope, schema, or reporting owner moves to a client.
- The design does not claim physical-device proof before Phase 2 verification.
