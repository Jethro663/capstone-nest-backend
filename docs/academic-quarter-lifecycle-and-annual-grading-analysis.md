# Academic Quarter Lifecycle and Annual Grading Analysis

## Document purpose

This document analyzes the current implementation against the requested academic-quarter workflow and proposes a safe implementation plan. It is based on the current local source tree. No application source code, database schema, migration, or configuration was changed as part of this analysis.

## Executive assessment

The reported gap is real. The system has a persisted global `schoolYear` and `quarter`, but the admin can only view the quarter. Teachers are then forced by the assessment editor to use that quarter, even though the assessment API and database already support any quarter.

The larger risk is in year-end grading. The class-record module computes and stores one grade snapshot per student, subject, and quarter. It does not compute or expose an official annual subject grade. The transition service independently averages whatever quarterly snapshots are available for a subject. Because it does not require the full Q1-Q4 matrix to exist, fewer than four quarters can be treated as a complete year.

The recommended design is one consistent lifecycle:

1. The admin explicitly activates Q1, Q2, Q3, or Q4 in System Settings.
2. Teachers may prepare draft assessments for any quarter, defaulting to the active quarter.
3. Only assessments in the active quarter may be released to students or accept new attempts/scores.
4. Each quarterly class record must pass a completeness check before finalization.
5. After all four quarterly records are finalized, the system creates an auditable annual subject-grade snapshot.
6. School-year transition is enabled only in Q4 when every required Q1-Q4 record and annual subject grade is complete.
7. Transition consumes annual subject grades, never auto-finalizes drafts, and starts the new school year in Q1.

## Source review findings

| Area | Current source | Current behavior | Gap or risk |
| --- | --- | --- | --- |
| Persisted academic state | `backend/src/drizzle/schema/academic-state.schema.ts` | Stores global `schoolYear`, `quarter`, updater, and timestamps. Defaults to Q1. | The data exists, but there is no update-quarter workflow. |
| Academic-state API | `backend/src/modules/academic-state/academic-state.controller.ts` | Exposes current state, transition preview, teacher notification, and school-year transition. | No admin endpoint activates a quarter. |
| System Settings | `next-frontend/app/(dashboard)/dashboard/admin/system-settings/page.tsx` | Displays Active Quarter with the caption `Informational only`. | The admin cannot select or activate a quarter. |
| Frontend academic-state client | `next-frontend/src/services/academic-state-service.ts` and `next-frontend/src/types/academic-state.ts` | Supports reads, transition preview, transition, and notifications. | No quarter-readiness or quarter-activation operation exists. |
| Assessment API model | `backend/src/modules/assessments/DTO/assessment.dto.ts` | `CreateAssessmentDto` and `UpdateAssessmentDto` already accept optional Q1-Q4 values. | Backend input already supports the requested selection, but lifecycle rules are missing. |
| Assessment creation | `backend/src/modules/assessments/assessments.service.ts` | Persists the supplied quarter and syncs placement into that quarter's class record. | It does not default to or validate against the active quarter, and it does not enforce future-quarter release restrictions. |
| Teacher class page | `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/page.tsx` | Creates an untitled assessment with only `title` and `classId`. | No quarter is selected at creation time. |
| Assessment editor | `next-frontend/app/(dashboard)/dashboard/teacher/assessments/[id]/edit/page.tsx` | Fetches the active quarter, overwrites the assessment quarter with it, disables the quarter selector, and says the quarter is locked. | Teachers cannot prepare an assessment for another quarter. Existing assessment quarter data can also be unintentionally redirected to the active quarter in the editor. |
| Quarterly grade calculation | `backend/src/modules/class-record/class-record-computation.service.ts` | Calculates category percentage scores, weighted scores, initial grade, transmuted quarterly grade, and remarks for one class record. | This is a quarterly computation only. A missing score row is treated as zero, so missing work and an intentional score of zero are indistinguishable during computation. |
| Quarterly finalization | `backend/src/modules/class-record/class-record.service.ts` | Validates category weights, calculates grades, stores `class_record_final_grades`, and marks the record finalized. | It does not require a score or an explicit exemption for every expected student-item pair. |
| Final-grade storage | `backend/src/drizzle/schema/class-record.schema.ts` | Stores one final percentage per student per quarterly class record. | There is no annual subject-grade entity or immutable Q1-Q4 annual snapshot. |
| Teacher workbook | `next-frontend/src/components/teacher/class-record/TeacherClassRecordWorkbook.tsx`, `next-frontend/src/hooks/use-teacher-class-record.ts`, and `next-frontend/src/types/class-record.ts` | Displays and exports Initial Grade and Quarterly Grade for the selected Q1-Q4 record. | Q4 has no annual summary or final subject-grade indicator. |
| Promotion calculation | `backend/src/modules/academic-state/academic-state.service.ts`, `classifyStudentOutcome()` | Groups available quarterly final-grade rows by subject and averages each group. A subject average below 75 retains the student. | It averages however many quarters happen to exist; it does not require exactly Q1, Q2, Q3, and Q4. |
| Transition readiness | `backend/src/modules/academic-state/academic-state.service.ts`, `getPromotionTransitionReadiness()` | Counts class records that exist and checks whether those records are finalized/locked and have grade rows. | A missing quarter is not counted as missing. For example, finalized Q1 records alone can satisfy the current record-count comparison. |
| Transition execution | `backend/src/modules/academic-state/academic-state.service.ts`, `transition()` | Directly changes selected draft records to `finalized`, archives/clones the year, and carries `current.quarter` into the target year. | Direct status changes bypass normal grade computation. The new school year should start at Q1, not inherit Q4. |
| Teacher reminders | `backend/src/modules/academic-state/academic-state.service.ts`, `notifyUnfinalizedTeachers()` | Notifies assigned teachers and reports whether all existing records are finalized. | It cannot identify a missing quarter because absent records are not part of the status list. |

## Proposed business rules

### 1. Active quarter ownership

- The active quarter is a single system-wide state controlled by an admin.
- System Settings must provide a Q1-Q4 selector, current-quarter indicator, readiness summary, and explicit Activate action.
- Changing the active quarter must never finalize class records or transition the school year.
- The operation must require the admin password or equivalent step-up authentication because it changes student-facing system behavior.
- Every change must be audited with previous quarter, new quarter, school year, actor, timestamp, and optional reason.
- The request should include the expected current quarter so two admins cannot silently overwrite each other's changes from stale screens.
- Normal use should move sequentially. A backward or skipped-quarter activation should show a strong warning and require an explicit elevated override if the school decides that emergency correction is necessary.

Recommended state meanings:

| Quarter relationship | Teacher activity allowed |
| --- | --- |
| Past quarter | View finalized data; edit only after an authorized reopen. |
| Active quarter | Create, edit, publish, accept attempts, record scores, and finalize. |
| Future quarter | Create and edit drafts, questions, rubrics, class-record slots, and schedules; do not release or accept student attempts yet. |

This preserves the admin's control of the live quarter while allowing teachers to prepare early.

### 2. Teacher assessment quarter selection

- Add a quarter selector to the create-assessment flow and keep the selector enabled in the editor.
- Default a new assessment to the active quarter for convenience, but do not force it after the teacher chooses another quarter.
- Clearly label future-quarter assessments as Draft for Qn.
- Permit saving and editing an assessment assigned to any Q1-Q4 quarter.
- Permit publishing or giving the assessment only when `assessment.quarter === activeQuarter`.
- Apply the release rule in the backend, not only the UI, so a direct API request cannot bypass it.
- Student listing, opening, starting an attempt, submitting, and score synchronization should all enforce the same active-quarter rule.
- Lock quarter changes after the assessment has attempts, submissions, manual scores, or a finalized class-record link. Moving historical results between quarters must be a separate audited migration operation, not a normal dropdown edit.
- When a teacher chooses a future quarter and class-record category, create or reuse that quarter's draft class-record placement. It may be prepared but cannot be finalized until the quarter is active.

### 3. Quarterly class-record completeness

`finalized` must mean both calculated and complete. Before finalization, validate all of the following:

- Category weights total 100 percent.
- Every required grading category has the required configured items, according to school policy.
- Every eligible student has either a recorded score or an explicit non-score status for every required item.
- A real zero must be stored explicitly as `0`; absence of a score row must remain Missing and block finalization.
- Supported non-score statuses should be explicit, such as Excused, Not Enrolled Yet, Transferred, or Not Applicable, with an audit reason where appropriate.
- Auto-graded assessments have finished score synchronization.
- No assessment linked to the record has unresolved grading or pending manual review.
- Grade computation creates one final-grade row for every eligible student in that quarter.

The UI should show blocking counts and the exact students/items requiring action before enabling Finalize.

### 4. Annual subject grade

Do not replace the Q4 quarterly grade. Q4 remains the grade for the fourth quarter. Add a separate Annual Subject Grade calculated only after Q1-Q4 are all finalized.

Recommended formula:

```text
rawAnnualAverage = (Q1 + Q2 + Q3 + Q4) / 4
officialFinalGrade = round(rawAnnualAverage)
remarks = officialFinalGrade >= 75 ? "Passed" : "Failed"
```

Store both values:

- `rawAnnualAverage`, retained to at least three decimal places for traceability.
- `officialFinalGrade`, the whole-number grade displayed and used for pass/fail.

Using the rounded official grade for the 75 threshold is the recommended rule because it keeps reports, UI indicators, and promotion decisions consistent. This rounding policy should be confirmed by the school before implementation. If the school instead requires the unrounded average for pass/fail, that one rule must be applied everywhere.

Recommended annual snapshot entity: `subject_annual_grades`.

| Field | Purpose |
| --- | --- |
| `id` | Primary key. |
| `schoolYear` | Prevents cross-year grade mixing. |
| `classId` | Identifies the subject and section context. |
| `studentId` | Identifies the student. |
| `q1Grade`, `q2Grade`, `q3Grade`, `q4Grade` | Immutable components used in the calculation. |
| `rawAnnualAverage` | Exact arithmetic average. |
| `officialFinalGrade` | Rounded official grade. |
| `remarks` | Passed or Failed. |
| `computedAt`, `computedBy` | Audit information. |
| source snapshot/version fields | Identify the four quarterly final-grade rows used. |

Use a unique constraint on `(schoolYear, classId, studentId)`. If any quarterly record is reopened, invalidate the affected annual snapshots and block transition until the quarter is re-finalized and annual grades are regenerated.

### 5. Q4 class-record indicator

When Q4 is selected, add an Annual Summary section without overcrowding the quarterly workbook. It should contain:

| Student | Q1 | Q2 | Q3 | Q4 | Raw Average | Final Grade | Remarks |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |

Behavior:

- Before all four quarters are finalized, show `Pending` and identify the missing/unfinalized quarters.
- After all four are finalized, show the computed annual result.
- Use the same annual endpoint and calculation source for the screen, export, reports, and transition preview.
- Extend workbook export with an Annual Summary worksheet or clearly separated annual columns.
- Never calculate a partial-year annual grade by silently dividing by the number of available quarters.

### 6. School-year transition gate

Transition must use a server-generated readiness matrix for every active class and every required student.

For each active class in the current school year, require:

- Exactly one Q1, Q2, Q3, and Q4 class record.
- All four records have status `finalized` or `locked`.
- Every record has a quarterly final-grade snapshot for every eligible student.
- Every student has a valid annual subject-grade snapshot for that class.
- No reopened, missing, pending-sync, or unresolved manual-grading work remains.

Global requirements:

- The active quarter is Q4.
- The target school year is valid and is the immediate next school year unless a separately authorized recovery flow is used.
- The target year does not already contain conflicting active sections/classes.
- Readiness is recalculated inside the transition transaction to prevent a stale preview from being used.

The transition button should remain disabled while any blocker exists. The preview should report blockers by quarter, class, teacher, and count, for example:

```text
Q1: 0 missing, 0 draft
Q2: 0 missing, 1 draft - Mathematics 8 / Section Rizal
Q3: 2 missing - Science 9 / Section Mabini, English 7 / Section Bonifacio
Q4: 0 missing, 3 pending manual grades
Annual subject grades: 14 missing
```

Critically, transition must not change a draft record's status to finalized. Teachers or an authorized grade-finalization workflow must run validation and grade computation first.

After a successful transition:

- Promotions, retentions, and Grade 10 graduations use the stored annual subject grades.
- A student is retained if at least one official annual subject grade is below 75.
- A passing Grade 10 student is marked graduated.
- Existing archive/clone behavior for sections, classes, teachers, advisers, rooms, schedules, and reusable learning content can remain, subject to regression tests.
- New-year class rosters remain empty.
- The new academic state is always the target school year with `quarter = Q1`.

### 7. Notify Teachers improvements

The existing notification concept is useful, but it should consume the same readiness matrix as transition.

- Notify each teacher once per reminder run, with a grouped list of their affected classes and quarters.
- Distinguish Missing Record, Draft Record, Missing Scores, Pending Manual Grading, and Missing Annual Grade.
- Teachers with no blockers may receive an All records finalized confirmation if the admin chooses to notify everyone.
- Include a direct class-record destination and school-year/quarter metadata.
- Make bulk runs idempotent for a reasonable window to avoid notification spam.
- Return admin-facing counts for notified teachers, complete teachers, blocked classes, and blockers by quarter.

## Proposed API changes

Exact route names can follow the repository's conventions, but the behavior should be separated as follows.

| Method and route | Purpose |
| --- | --- |
| `GET /academic-state/current` | Continue returning active school year and quarter. |
| `GET /academic-state/quarter-readiness?targetQuarter=Q2` | Preview warnings/blockers for quarter activation. |
| `POST /academic-state/activate-quarter` | Activate a selected quarter with expected-current-state and step-up confirmation. |
| `GET /academic-state/transition-readiness?schoolYear=...` | Return the full Q1-Q4 and annual-grade blocker matrix. |
| `POST /academic-state/transition` | Revalidate and transition only when readiness is clean. |
| `GET /class-record/by-class/:classId/annual-summary?schoolYear=...` | Return Q1-Q4 and annual results for the subject. |
| `GET /class-record/:id/finalization-readiness` | Return missing scores, pending grading, and other blockers. |

Assessment create/update DTOs already accept `quarter`; retain that contract and add backend lifecycle validation to publish, attempt, submit, grade, and quarter-change operations.

## Suggested response model for readiness

```ts
type QuarterReadiness = {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  expectedClassRecords: number;
  existingClassRecords: number;
  missingClassRecords: number;
  draftClassRecords: number;
  finalizedClassRecords: number;
  missingStudentGrades: number;
  pendingManualGrades: number;
  blockers: Array<{
    classId: string;
    className: string;
    sectionName: string;
    teacherId: string | null;
    reason: string;
  }>;
};

type TransitionReadiness = {
  ready: boolean;
  activeQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  quarters: QuarterReadiness[];
  missingAnnualSubjectGrades: number;
  annualGradeBlockers: Array<{
    classId: string;
    studentId: string;
    missingQuarters: Array<'Q1' | 'Q2' | 'Q3' | 'Q4'>;
  }>;
};
```

## Implementation plan

### Phase 1: Lock the grading rules

1. Confirm annual-grade rounding and whether the threshold uses the rounded or raw average.
2. Define eligible students for each quarter, including transfers, late enrollment, withdrawals, and exemptions.
3. Define required categories/items and explicit non-score statuses.
4. Confirm whether emergency backward/skipped-quarter activation is permitted and who can perform it.

### Phase 2: Backend quarter lifecycle

1. Add quarter readiness and activate-quarter DTOs, service methods, controller routes, guards, step-up confirmation, optimistic state check, and audit records.
2. Add a shared policy service that decides whether an assessment can be edited, published, attempted, submitted, or scored based on its quarter and state.
3. Reuse this policy from every relevant assessment endpoint and score-sync path.
4. Add unit tests for current, past, future, backward, skipped, stale, and unauthorized quarter changes.

### Phase 3: Assessment UI

1. Add quarter selection to assessment creation and default it to the active quarter.
2. Remove the unconditional editor effect that overwrites and disables the assessment quarter.
3. Lock quarter editing only after attempts/scores/finalized placement exist.
4. Show future-quarter draft state and disable release actions with a precise reason.
5. Replace the existing tests that assert permanent system-quarter locking with tests for selectable drafts and active-quarter release rules.

### Phase 4: Class-record completeness and annual grades

1. Add finalization-readiness validation and explicit missing/non-score handling.
2. Add the annual-grade snapshot schema and migration.
3. Generate annual snapshots only when all four quarterly records are finalized.
4. Invalidate and regenerate annual snapshots when a quarter is reopened and re-finalized.
5. Add the annual-summary endpoint, Q4 UI, types, and export.
6. Add deterministic calculation, rounding-boundary, missing-quarter, transfer, and reopen tests.

### Phase 5: Transition hardening

1. Replace record-count readiness with the expected class x Q1-Q4 matrix.
2. Remove transition's direct draft-to-finalized update.
3. Consume official annual subject-grade snapshots for promotion, retention, and graduation.
4. Require Q4 active and zero readiness blockers.
5. Revalidate readiness inside the transition transaction.
6. Reset the target academic state to Q1.
7. Preserve and regression-test the existing archive, clone, empty-roster, teacher/adviser, room, schedule, and learning-content behavior.

### Phase 6: Admin UI and notifications

1. Add the active-quarter control and activation confirmation to System Settings.
2. Replace `Informational only` with status, readiness, and last-updated information.
3. Show quarter-by-quarter transition blockers and direct navigation to affected records.
4. Update Notify Teachers to use grouped readiness details.
5. Keep Transition State disabled until the server reports `ready: true`.

### Phase 7: Migration and rollout

1. Run a read-only audit report before migration: classes missing quarters, duplicate/invalid records, finalized records missing grade rows, and students missing expected subject records.
2. Do not fabricate missing quarterly grades during backfill.
3. Backfill annual snapshots only where exactly Q1-Q4 finalized grade rows exist.
4. Leave incomplete historical rows blocked and provide an admin repair report.
5. Deploy backend lifecycle enforcement before enabling the new frontend controls.
6. Test on a database copy, then perform a supervised production rollout with a rollback plan.

## Acceptance criteria

### Active quarter

- An admin can see and activate Q1-Q4 from System Settings.
- Unauthorized users cannot activate a quarter.
- The change is audited and protected against stale concurrent updates.
- School-year transition and quarter activation are separate operations.

### Assessments

- A teacher can create and save a Q4 assessment while Q2 is active.
- The Q4 draft is not visible or attemptable by students while Q2 is active.
- The same assessment becomes publishable when Q4 is activated.
- An assessment with attempts or scores cannot be casually moved to another quarter.
- Direct API calls cannot bypass these restrictions.

### Quarterly records

- Missing score rows are shown as Missing, not calculated as implicit zero.
- An intentional zero is valid only when explicitly recorded.
- Finalization is blocked for missing required data or unresolved manual grading.
- Finalization creates one quarterly grade per eligible student.

### Annual grade

- No annual grade is produced from fewer than four finalized quarter grades.
- Q4 remains visible as a separate quarterly grade.
- The annual summary displays Q1-Q4, raw average, official final grade, and remarks.
- UI, export, reports, and transition return the same result at rounding boundaries.
- Reopening a quarter invalidates the annual result until re-finalization.

### Transition

- Missing Q1, Q2, Q3, or Q4 records block transition even if every existing record is finalized.
- Any draft/reopened record, missing student grade, or missing annual subject grade blocks transition.
- Transition never marks a draft record finalized without computation.
- Promotion/retention uses exactly four quarterly grades per subject through the annual snapshot.
- A student with any subject final grade below 75 is retained.
- A passing Grade 10 student is graduated.
- A successful transition starts the new year in Q1 and retains the established archive/clone behavior.
- Any failure rolls back the entire transaction.

## High-priority regression tests

1. Q1-only records finalized: transition must remain blocked.
2. Q1-Q4 records exist but one Q3 record is draft: transition must remain blocked.
3. All records finalized but one student lacks one quarterly grade row: transition must remain blocked.
4. Four subject grades `75, 75, 75, 74`: verify the approved rounding rule and use it consistently.
5. One subject fails while all others pass: retain the student.
6. Grade 10 passes all subjects: graduate the student.
7. Reopen a finalized Q2 record after annual snapshots exist: invalidate affected annual grades and block transition.
8. Prepare a Q4 assessment while Q2 is active: save succeeds, publication and attempts fail.
9. Activate Q4: the prepared Q4 assessment becomes eligible for publication but is not auto-published.
10. Transition from Q4: target state becomes the next school year in Q1.
11. Simulate an error during archive/clone: all student, grade, class, section, enrollment, and state changes roll back.
12. Run Notify Teachers with a missing Q2 record: the responsible teacher receives a Q2-specific blocker.

## Risks and safeguards

- **Historical ambiguity:** Existing missing score rows may mean zero, absence, or unentered work. Do not infer values during migration; produce a repair report.
- **Rounding disagreement:** A one-point boundary can change promotion. Approve one rule and centralize it in a single grade-policy service.
- **Roster changes:** Eligibility must be tied to the relevant quarter, not only today's enrollment state.
- **Stale readiness:** Always recheck inside the transition transaction.
- **Frontend-only controls:** Every publish, attempt, scoring, finalization, activation, and transition rule must be enforced by the backend.
- **Notification noise:** Group reminders and use deduplication/idempotency.
- **Large transition:** Keep the transition atomic and test timeout/performance with production-sized data.

## Recommended implementation order

Do not begin with the dropdown alone. Implement in this order:

1. Approve grading, rounding, eligibility, and exception rules.
2. Add backend quarter activation and assessment lifecycle enforcement.
3. Add class-record completeness and annual subject grades.
4. Harden transition readiness and reset-to-Q1 behavior.
5. Add the admin and teacher UI changes.
6. Run migration audits, automated tests, and full transition rehearsal on a database copy.

This order prevents a new admin control from exposing inconsistent behavior before the grade and transition rules are safe.
