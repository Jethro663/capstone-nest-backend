# Teacher Web QA Confirmation Audit

## Scope

- Source checklist: `C:\Users\jethr\Downloads\Nexora_QA_Web_Teacher.pdf`
- Runtime: `http://127.0.0.1:3001`
- Backend API: `http://127.0.0.1:3000/api`
- Seeded accounts used:
  - `teacher1@lms.local / Teacher123!` (`Ana Reyes`)
  - `teacher2@lms.local / Teacher123!` (`Ben Santos`)
- Tools used:
  - Serena route/symbol discovery for teacher navigation and route surfaces.
  - Playwright browser runs with seeded teacher logins.
  - Playwright MCP for live route snapshot/console checks.

## Confirmed Current Issues

### Reports export still uses an unauthenticated popup

- PDF item: Teacher Reports export is not working.
- Runtime evidence: `/dashboard/teacher/reports` loads Q1 report data, but clicking `Export` opens a popup instead of producing an authenticated blob download.
- Source evidence: `next-frontend/src/components/teacher/TeacherReportsFigmaPage.tsx` calls `window.open(...)` in `handleExport`.
- Risk: the export path can open an unauthenticated tab and fail like the admin export did before the authenticated blob-download fix.

### Compact module view does not make cards smaller

- PDF item: compact view does not make the card smaller.
- Runtime evidence: on `/dashboard/teacher/classes/f71bebea-e122-4cd4-9d01-10d543ff1bf1`, the measured module card was `1127.625 x 182.140625` before and after switching to compact view.
- Source evidence: compact CSS changes grid columns and alignment only; it does not reduce card internal spacing or height.

### AI Draft generation is unavailable when AI indexing is down

- PDF item: Generate Draft fails.
- Runtime evidence: `/dashboard/teacher/classes/f71bebea-e122-4cd4-9d01-10d543ff1bf1/ai-draft` shows `Index required` and `AI service is unavailable`; requests to `/api/ai/index/classes/.../status` return `503`.
- Clarification: the PDF note that fields are not visible is stale; the source filters, optional title, question count, question type, guidance, and source sections are visible.

### Extraction Review unavailable state hides the Back action

- PDF item: Extraction Review back button is not visible.
- Runtime evidence: the seeded extraction list contains cached failed extraction `807401d3-0d0b-4323-9923-b63575b0ea7f`. Opening `/dashboard/teacher/extractions/807401d3-0d0b-4323-9923-b63575b0ea7f` shows `Extraction unavailable` because `/api/ai/extractions/:id` returns `503`; the `Back` action is not visible in this unavailable state.
- Source evidence: the loaded review view has a `Back` button, but the unavailable/error path does not expose the same navigation escape.

### Class workspace announcement and discussion empty-submit feedback is weak

- PDF item: empty title/content blocks create or do not show a specific error.
- Runtime evidence:
  - Class announcements form exposes `Post Announcement` with blank fields and gives no specific inline validation feedback when clicked.
  - Class discussion form exposes blank publish/draft controls without a visible specific validation message.
- Scope: global teacher announcements behave better by disabling the create action until class and required fields are selected, but the class workspace forms still need clearer validation.

### Assessment Advanced Settings is hard to reach

- PDF item: quarter selection in Advanced Settings is hard to navigate.
- Runtime evidence: on `/dashboard/teacher/assessments/f20de397-7c4d-43ae-8891-f9b062c1460f/edit`, a normal Playwright click on `Open Advanced Settings` timed out because the control was outside the usable viewport after scrolling; a forced click opened the dialog and the quarter select existed.
- Root issue: the settings action placement/scroll behavior is fragile, not the quarter field itself.

### Teacher profile phone and password UX gaps remain

- PDF items: no show-password control; mobile number should stop at 11 digits while typing; password error is not specific enough.
- Runtime evidence:
  - `/dashboard/teacher/profile` has three password inputs and zero show/hide password buttons.
  - The teacher phone input has no `maxLength`; entering `091712345678999` preserves all 15 characters.
  - Empty password update shows `All password fields are required`; wrong current password falls back to a generic failure.

### Library upload class filtering is code-confirmed but seed-blocked

- PDF item: teacher can choose a different class subject during class-specific upload.
- Runtime evidence: current seeded teachers do not reproduce the exact mismatch because `teacher1` only owns Mathematics classes and `teacher2` only owns Science.
- Source evidence: `LibraryWorkspaceView` renders upload class options from all `classes.map(...)` entries instead of filtering by selected upload subject and grade.
- Classification: confirmed implementation weakness, but not reproduced with current seed data.

### Class Record default state is confusing, but data and refresh work

- PDF items: Q1 spreadsheet not showing; refresh not refreshing.
- Runtime evidence:
  - `/dashboard/teacher/class-record` initially shows `Class record not created yet` and asks the teacher to choose a class.
  - After selecting `Mathematics 7 - Grade 7 - Section A`, backend calls to `/api/class-record/by-class/...` and `/api/class-record/:id/spreadsheet` return `200` and the class-record shell renders.
  - Clicking `Refresh` triggers fresh class-record API requests.
- Classification: the “no Q1 spreadsheet at all” and “refresh does nothing” defects are not reproduced; the remaining issue is default-selection/empty-state UX.

## Stale Or Not Reproduced From The PDF

- Class workspace spreadsheet load error: not reproduced. The class route loaded without a spreadsheet failure toast, and class-record spreadsheet APIs returned `200`.
- Add Module DTO error for `isVisible` / `isLocked`: not reproduced. The current backend accepted a throwaway module payload with those fields, and the throwaway module was deleted afterward.
- Rich-text H1/H2/H3 failures: not reproduced on teacher class announcements, class discussion, global announcements, or assessment editor. Toolbar controls are present and global heading CSS exists.
- Reports load/Q1 error: not reproduced. Teacher Reports loaded Q1 data without failed report responses on page load.
- AI Draft fields missing: not reproduced. Fields are visible; the current blocker is AI service/index readiness.
- Class Record Q1 data missing: not reproduced after class selection.
- Class Record refresh not refreshing: not reproduced; refresh triggers API requests.

## Not Fully Exercised

- End-to-end library upload was not performed because the exact cross-subject seed condition is absent.
- Extraction `Apply Sections` accuracy could not be evaluated because the seeded extraction detail endpoint is returning `503`.
- Destructive actions such as permanent deletes, archive purges, and production-like publish flows were not replayed beyond safe UI checks.

## Performance Notes

- No 4-digit warm-route compile/render regression was identified from this confirmation pass.
- Touched/problem routes should still get before/after timings during implementation: teacher reports, class workspace, assessment editor, library, extraction review, class record, AI draft, and profile.
