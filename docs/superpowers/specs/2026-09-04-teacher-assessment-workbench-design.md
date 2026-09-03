# Teacher Assessment Workbench Design

## Goal

Replace the teacher assessment detail page's analytics-first layout with a lifecycle-aware workbench that tells teachers what needs attention, keeps grading actions easy to find, and remains readable for teachers across age and experience levels.

## Confirmed Problems

- A draft with no submissions renders `0%` for completion, average score, pass rate, and every question. This treats missing data as poor performance.
- The first view expands every question before showing the operational state of the class.
- Two Back controls duplicate the same navigation.
- `Responses`, `Review Answers`, `Post Scores`, `Return Grade`, and `Posted` use inconsistent workflow language.
- The page combines hard-coded navy/red route CSS, decorative multicolor analytics cards, and slate-heavy review and score panels.
- Critical metadata uses text as small as `0.68rem`; routine controls are approximately 32 to 35 pixels tall.
- Staggered motion and fully expanded question cards add distraction and excessive page length.
- The review layout has a fixed-width learner rail without a narrow-screen single-column fallback.
- One failed analytics or submissions request rejects the shared `Promise.all` and can make a valid assessment appear missing.
- Four dead parallel implementations remain beside the live route components: two response tabs, an older shared review tab, and a route-local score re-export. Keeping them invites future drift.

## Design Direction

Use a restrained teacher workbench. Preserve the existing backend contracts and grading capabilities, but reorganize the page around lifecycle, next action, and student status.

The page uses one calm visual language shared with Nexora's newer teacher tools:

- white content surfaces on a quiet cool-gray canvas;
- navy text and borders for structure;
- Nexora red for the primary action and genuine urgent states;
- semantic amber, green, and gray statuses with accompanying text;
- 8 to 10 pixel radii instead of pervasive pills and oversized rounded shells;
- 16 pixel primary text, at least 14 pixel supporting text, and comfortable controls;
- no staggered entrance animations for routine content.

## Information Architecture

### Assessment header

The header contains one breadcrumb-style Back link, assessment title, concise metadata, lifecycle status, and one contextual primary action.

- Draft: `Continue setup`
- Published with pending submissions: `Review submissions`
- Published with returned scores and no pending work: `View scores`

The lifecycle status is a sentence, not just a badge. A draft explicitly says that students cannot see it.

### Primary views

1. **Overview** — default view with the lifecycle callout, student-status counts, student activity worklist, and conditional class performance.
2. **Review & grade** — existing attempt review and grading capabilities with clearer copy and a responsive learner selector.
3. **Scores** — roster, filtering, bulk score release, preview, and export.

Use `Release score` and `Released` consistently in visible UI. Backend method names such as `returnGrade` remain unchanged.

### Overview order

1. A `What needs attention` callout with the next useful action.
2. Four operational counts: Submitted, In progress, Awaiting review, and Released.
3. A student activity worklist ordered by action priority: awaiting review, in progress, not started, released.
4. Class performance only after at least one submission exists.
5. Question insights collapsed behind progressive disclosure, with the most difficult questions shown first when expanded.

## Lifecycle States

### Draft

- Explain that students cannot see the assessment.
- Make `Continue setup` the primary action.
- Show assigned-student counts if available.
- Do not show zero-valued performance metrics or red question percentages.

### Published, no submissions

- Show `Waiting for student responses`.
- Show due-date and roster status context.
- Hide performance statistics until a real submission exists.

### Active submissions

- Lead with the number awaiting review.
- Let the teacher move directly from the overview row to Review & grade.
- Show class performance and question insights only from actual responses.

### All work released

- Confirm that all received scores are visible to students.
- Make Scores and export the natural follow-up actions.

## Review & Grade

- Use a desktop two-column layout and a single-column layout below the large breakpoint.
- Give the search field an explicit accessible label.
- Use readable student status text and remove per-row staggered motion.
- Preserve attempt switching, file preview, rubric scoring, direct scoring, feedback, manual question scoring, release, and undo-release behavior.
- Keep the grading action visible at the bottom of the attempt panel and use `Release score` consistently.

## Scores

- Preserve All, Awaiting release, Released, and No submission filters.
- Use `Select` instead of `Pick` for the checkbox column.
- Use `Status` instead of `Score State`.
- Preserve bulk release confirmation, preview, and Excel export.
- Keep the table's horizontal overflow inside its own container.

## Loading and Failure Behavior

- Assessment identity is critical; submissions, statistics, and question analytics are optional sections.
- Load the four existing requests with settled results so one optional failure does not blank the page.
- Show a persistent inline warning and Retry action when optional sections fail.
- Show a dedicated load-error state when the assessment itself fails rather than `Assessment not found`.
- After grading or releasing scores, refresh in the background without replacing the whole workbench with a skeleton.

## Component Boundaries

- `page.tsx`: data loading, partial-failure state, active view, and route-level actions.
- `assessment-overview.tsx`: lifecycle model, next-action callout, operational counts, worklist, conditional performance, and progressive question insights.
- `review-tab.tsx`: per-student attempt grading workspace.
- `post-scores-tab.tsx`: score roster, bulk release, preview, and export.
- `assessment-detail.css`: shared route visual language and responsive rules.

Delete the two obsolete response tabs, the unused shared review tab, and the redundant route-local score re-export after the workbench is wired and reference checks confirm no consumers.

## Accessibility and Responsive Requirements

- All actions have visible focus styles and descriptive accessible names.
- Status never relies on color alone.
- Essential text remains readable at 200 percent zoom without lost functionality.
- Default controls use at least 40 pixel height, with 44 pixels preferred for primary and worklist actions.
- Desktop and tablet must have no document-level horizontal overflow.
- The score table may scroll horizontally inside its own container.
- Review & grade becomes one column on narrow screens.

## Acceptance Criteria

- A draft with no submissions never displays `0%` as class or question performance.
- The page has one Back control and three action-oriented views: Overview, Review & grade, and Scores.
- Overview exposes student operational status before analytics.
- Optional request failures preserve the assessment shell and provide Retry.
- Refresh after a grading mutation does not show the full-page loading skeleton.
- Review & grade is usable in desktop and narrow layouts.
- Visible score-release terminology is consistent.
- The unused duplicate response components are removed.
- Targeted Jest tests, frontend typecheck, lint, full Jest suite, build, and the applicable browser/dev smoke checks pass before delivery.
