# Cross-platform Table Search and Filter Audit

**Date:** 2026-09-28

**Scope assumption:** “Table” means a page-level multi-record data collection: semantic web tables/data grids and mobile table-like record workspaces. Layout tables, rich-text/assistant-rendered tables, chat message lists, and bounded confirmation previews are inventoried but do not receive misleading controls.
**Method:** Serena symbol/reference discovery followed by a focused source scan excluding tests, generated output, dependencies, and build artifacts. Coverage is bounded to `next-frontend/**/*.tsx` and `mobile/src/**/*.tsx` at starting SHA `730de8731eb6ce91d1f51ab523cdcc61a74b00ae`.

## Verdict

Most administrative index pages already pair search and filtering. The confirmed gaps are concentrated in detail-route rosters and gradebooks, report/intervention workspaces, assessment worklists, evaluation results, roster-import tables, teacher performance logs, and the mobile class-record grid. Implement one adjacent search field plus one meaningful domain filter for each gap; preserve existing server pagination and academic authority.

## Web inventory

| Surface / owner                                                         | Status at audit                                      | Disposition                                                                      |
| ----------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| Admin Users — `admin/users/page.tsx`                                    | Confirmed paired                                     | Keep                                                                             |
| Admin Classes — `admin/classes/page.tsx`                                | Confirmed paired                                     | Keep                                                                             |
| Admin Sections — `admin/sections/page.tsx`                              | Confirmed paired                                     | Keep                                                                             |
| Admin Class Templates — `admin/class-templates/page.tsx`                | Confirmed paired                                     | Keep                                                                             |
| Admin Access Students — `admin/access-students/page.tsx`                | Confirmed paired                                     | Keep                                                                             |
| Admin User Reports — `admin/user-reports/page.tsx`                      | Confirmed paired                                     | Keep                                                                             |
| Admin Class Record — `admin/class-record/page.tsx`                      | Confirmed paired                                     | Keep                                                                             |
| Admin Audit Log — `src/components/admin/audit-log-page.tsx`             | Confirmed paired                                     | Keep                                                                             |
| Teacher evaluations                                                     | Confirmed paired                                     | Keep                                                                             |
| Shared student master list and teacher class-record grade grid          | Confirmed paired                                     | Keep                                                                             |
| Admin back subjects — `AcademicBackSubjectsPanel.tsx`                   | Search only                                          | Add status filter                                                                |
| Admin reports — `class-record-reports-page.tsx`                         | Class/date filters only                              | Add per-table row search                                                         |
| Teacher reports — `TeacherReportsFigmaPage.tsx`                         | Class/date filters only                              | Add current-report row search                                                    |
| Teacher interventions — `teacher/interventions/page.tsx`                | Class/view filters only                              | Add learner/status search across queue, history, and outcome tables              |
| Teacher class-detail roster — `teacher/classes/[id]/page.tsx`           | Search only                                          | Add grade-availability filter                                                     |
| Student class-detail classmates and gradebook                           | Confirmed gap                                        | Add table-specific search plus profile/grade-state filters                       |
| Admin section roster — `admin/sections/[id]/roster/page.tsx`            | Confirmed gap                                        | Add name/email/LRN search + grade filter                                         |
| Admin section edit roster — `admin/sections/[id]/edit/page.tsx`         | Confirmed gap                                        | Add name/email/LRN search + grade filter                                         |
| Teacher section roster — `teacher/sections/[id]/roster/page.tsx`        | Confirmed gap                                        | Add name/email/LRN search + grade filter                                         |
| Student assessment history worklist — `assessment-history-worklist.tsx` | Filter tabs only                                     | Add title/type search; existing view tabs remain status filter                   |
| Teacher assessment overview roster — `assessment-overview.tsx`          | Confirmed gap                                        | Add learner search + submission-status filter                                    |
| Teacher score release table — `post-scores-tab.tsx`                     | Status filter only                                   | Add learner/email search                                                         |
| Admin/teacher system evaluation results — `system-evaluations-page.tsx` | Module filter only                                   | Add submitter/feedback search                                                    |
| Admin roster import — `admin/roster-import/page.tsx`                    | Confirmed gap across import preview/history          | Add row search + status filter; preserve raw sheet editing                       |
| Teacher performance — `teacher/performance/page.tsx`                    | Existing domain filters; table rows lack text search | Add table-adjacent learner/concept/log search without changing analytics queries |

## Mobile inventory

| Surface / owner                                                                     | Status at audit                                                    | Disposition                                             |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------- |
| Admin Users, Classes, Sections, Announcements, Assessments, Audit, Reports, Library | Confirmed paired through screen controls plus `AdminPaginatedList` | Keep                                                    |
| Admin Academic — `AdminAcademicScreen.tsx` + `AcademicWorkbook.tsx`                 | Confirmed paired in the record workspace                           | Keep                                                    |
| Teacher class record — `MobileClassRecordWorkbook.tsx`                              | Learner-state filter only                                          | Add name/LRN search; keep Current/Historical/All filter |
| `AdminPaginatedList.tsx`                                                            | Shared rendering primitive, not a page                             | Exempt; consumers own query controls                    |
| `JaChatWorkspace.tsx`                                                               | Conversation messages, not a data table                            | Exempt                                                  |

## Explicit web exemptions

| Owner                                                                                | Reason                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/ui/table.tsx`                                                        | Presentation primitive; cannot know domain fields or filters.                                                                                                                                      |
| `AdminAssistantResponse.tsx`                                                         | Renders assistant/rich response content; adding dataset controls would not filter the source response.                                                                                             |
| `AcademicRecoveryPanel.tsx`, `AcademicStateAlignmentRecovery.tsx`                    | Bounded, consequential confirmation/mapping previews tied to one prepared operation; controls could hide selected impact rows. Keep all impact evidence visible.                                   |
| `ResetSchoolData.tsx` impact table                                                   | Destructive-operation preview where complete visibility is safer; page already has search/filter controls for its broader inventory.                                                               |
| `AcademicAnnualSummary.tsx` and auxiliary tables in `TeacherClassRecordWorkbook.tsx` | Subviews of the class-record workspace; the page's grade grid already provides learner search/status filters. Do not hide readiness, eligibility, or historical audit evidence with local filters. |
| Raw spreadsheet preview inside roster import                                         | Editable source preview. Search/filter will apply to derived import rows/history; raw row hiding could obscure source corrections.                                                                 |

## Implementation checklist

- [x] Add a focused source-coverage contract for every confirmed gap and a behavioral mobile learner-search test.
- [x] Prefer existing role CSS, inputs, selects, and query/filter utilities; introduce no second visual system.
- [x] Filter in memory only where the page already holds the complete collection; preserve server-side paging/query parameters where present.
- [x] Reset/clamp page indices when search/filter changes where pagination exists.
- [x] Show visible/total counts or a useful zero-results message.
- [x] Keep destructive/academic actions bound to stable record IDs, not displayed row indexes.
- [x] Re-run the focused source inventory after implementation; the second pass added reports, interventions, back subjects, and class-detail tables to the coverage contract.

## Acceptance criteria

1. Every non-exempt page-level table in the inventory has both an adjacent text search and at least one meaningful filter.
2. Web controls are keyboard-labeled and mobile controls have accessibility labels.
3. Empty queries preserve the existing dataset and action behavior.
4. Filtering never changes backend records, official calculations, selection IDs, or audit evidence.
5. No additional table dependency was found within the inspected scope in the final focused scan.

## Unverified boundaries

- Runtime reachability depends on seeded accounts and service availability; source coverage does not by itself prove every role can reach every route.
- Mobile device keyboard/sheet behavior remains unverified until emulator/device execution.
- Dynamic rich-text tables created from user/AI content are deliberately excluded from collection controls.
