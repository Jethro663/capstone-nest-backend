# Student Assessment Results Redesign

Date: 2026-05-03
Route: `/dashboard/student/assessments/[id]/results/[attemptId]`
Scope: `next-frontend` route-local redesign only

## Goal

Turn the student assessment results page from a static score receipt into a useful `results + next step` workspace.

The page should still communicate the score clearly, but it must also answer:

- What is available to review right now?
- Why are some details locked?
- What should the student do next?

This redesign should stay simple, use the updated LMS visual language, and avoid a louder or more decorative dashboard treatment.

## Problems In The Current Page

- The route still visually leans on the older warm red student shell.
- The page is front-loaded into one hero block and one release block, leaving too much dead space.
- The route communicates the score, but it does not guide the student anywhere after that.
- Locked feedback states feel empty rather than informative.
- `Result Release` currently feels like a separate card instead of support information for the rest of the page.
- File-upload and objective results live in the same route but are not shaped differently enough for their actual review behavior.

## Primary UX Direction

Use a `Results + Next Step` layout.

The route should stop behaving like a static receipt and start behaving like a short guided results workspace. The structure stays lightweight, but every visible section should answer a student question.

## Layout

### 1. Top Summary

Replace the current hero card with a neutral summary header.

Contents:

- assessment title
- score
- pass/fail status
- attempt number
- returned time
- one plain-language summary sentence

Examples:

- `Your score is available now. Full answer review is locked for this assessment.`
- `You can now review your answers, score, and teacher feedback.`

This section should feel formal and calm, not celebratory or alarm-like.

### 2. What You Can See Now

Add a compact section directly below the summary.

This section should communicate availability, not settings terminology. It should tell the student exactly what is currently visible.

Rows may include:

- `Score: Available`
- `Teacher feedback: Available` or `Not yet provided`
- `Answer review: Locked` or `Available`
- `Rubric breakdown: Available` for file upload

This section replaces the current vague empty feeling when detailed review is hidden.

### 3. Next Step

This is the main improvement.

Add a focused action section that gives the student an immediate direction after seeing the result. This should be one of the highest-visibility sections on the page.

Possible actions:

- `Review answers`
- `Back to assessment`
- `Go to class assignments`
- `Ask JA for help`

Rules:

- only show actions that make sense for the current result state
- if detailed review is locked, the page should still show useful next actions
- if the student underperformed and JA is available, the JA action should be visibly useful but not oversized

### 4. Teacher Feedback

Only render this section when there is actual teacher feedback.

It should be a clean readable block, not a dashboard card with too much chrome. The purpose is readability and importance, not decoration.

### 5. Question Review

For objective assessments, present reviewable questions as expandable rows.

Each row should show:

- question number
- earned points
- status label: correct, incorrect, or manually adjusted
- student answer
- correct answer when allowed by release mode

This section should not dump too much detail at once. Closed rows should keep the page scannable.

If review is locked, do not show a hollow section. Instead, show a short locked-state explanation in this same area.

### 6. Result Release

Keep this information, but demote it.

`Result Release` should become a support section that explains the current visibility state rather than acting like a primary card.

Its job is to explain:

- what is visible now
- what is hidden
- why it is hidden
- when it becomes available, if a delayed unlock exists

## State Rules

### Immediate Score Only

Show:

- top summary
- what you can see now
- next step
- result release explanation

Hide full question review.

The page must still feel complete and useful even without answer-by-answer review.

### Detailed Review Available

Show:

- full summary
- what you can see now
- next step
- question review
- teacher feedback when present

### Delayed Review

Show:

- summary
- what you can see now
- next step
- delayed unlock explanation

Do not show an empty question review frame.

### File Upload Results

Swap the main review content away from question rows.

Primary content should become:

- rubric breakdown
- teacher comments
- submission outcome
- submitted files

This route should feel clearly different from objective quiz results.

## Visual Direction

- remove the old red-tint shell behavior from this route
- use white/slate LMS surfaces
- reduce oversized empty card space
- increase structure through spacing and section ordering
- use one primary action area instead of multiple equally weighted passive cards
- keep the page formal, simple, and readable

## Interaction Rules

- the summary section is informational only
- `Next Step` actions must always lead somewhere meaningful
- `Ask JA` should stay tied to reviewable or missed items when applicable
- expandable question rows should preserve current review logic and release restrictions
- locked states must explain the reason instead of just hiding content silently

## Route-Level Acceptance Criteria

- the route no longer uses the older warm red shell styling
- the first visible screen clearly communicates result, availability, and next action
- score-only assessments no longer feel empty
- detailed review states remain easy to scan
- file-upload results feel appropriate to file-upload review rather than quiz review
- the page gives the student a clear next step instead of ending at the score

## Implementation Notes

- keep the existing backend contract and release logic unless a follow-up explicitly changes behavior
- treat this as a route-local UI restructure first, not a grading-system rewrite
- preserve current AI mentor and evaluation hooks where they already exist
- preserve objective versus file-upload branching

## Recommended Implementation Order

1. Replace the current top hero structure with the neutral summary header.
2. Add the `What You Can See Now` section.
3. Add the `Next Step` section with state-aware actions.
4. Demote `Result Release` into a support section.
5. Restructure objective review into expandable rows.
6. Tune file-upload results to use rubric/submission-oriented presentation.

