# Learners Path Flow Audit

Date: 2026-04-24  
Repo: `C:\Users\jethr\Desktop\capstone-nest-react-lms`

## Scope

This audit simulated the full Learners Path flow end to end across:

- Template-based class creation
- Student enrollment
- Student lesson and assessment activity
- At-risk detection and intervention opening
- Teacher-side AI recommendation and assignment
- Student-side Learners Path and JA Hub completion
- UI review of the Learners Path and JA Hub surfaces

The product route is still `/dashboard/student/lxp`, but the visible product name is now `Learners Path`.

## Accounts Used

- Teacher: `teacher1@lms.local / Teacher123!`
- Student (triggered support): `student71@lms.local / Student123!`
- Student (kept healthy): `student72@lms.local / Student123!`
- Admin reference only: `admin@lms.local / Test@123`

## Live Fixture

### Template source

- Template class used for cloning: `27702675-236d-46a7-86bd-74b4683b130a`
- Template label observed during work: `Math-2026 V1`

### Classes created during this audit

- Main demo class: `b154d6f7-ec2e-46b1-b6e3-e790039cb14d`
- Auto-index verification class: `a1482efb-4f1c-4d11-baf1-e4e61a894595`

### Student IDs used in the demo class

- `student71`: `d54601e8-a0ba-4964-8d75-de8787444c4e`
- `student72`: `7104891c-89d7-4f42-b9ca-51501c60da92`

### Intervention cases touched

- Main completed demo case: `1b6c590a-b6a2-4fb7-a45a-f1f4cf7231f8`
- Older seeded active case still visible to `student71`: `5698d02d-cfef-428c-bf54-90486e29e200`

## End-to-End Simulation

### 1. Template-based class creation

- Created a new teacher class from the existing template content set.
- Patched backend class creation so template-based classes now trigger background AI indexing automatically.
- Verified auto-index readiness on the verification class:
  - `chunksIndexed: 76`
  - `readyLessons: 5`
  - `questionChunks: 68`

### 2. Student enrollment

- Added `student71` and `student72` to the template-based demo class.
- Confirmed the enrollments existed before continuing with the simulation.

### 3. Student lesson and assessment activity

- Used the student accounts against the template-based class content.
- `student71` was intentionally driven into the at-risk path.
- `student72` stayed healthy enough to avoid Learners Path activation.

Observed result:

- `student72` ended with no eligible Learners Path classes.
- `student71` triggered an intervention case and became eligible for guided recovery.

### 4. Teacher-side intervention generation

- Opened the teacher intervention workspace for the triggered case.
- Verified AI recommendation generation on the repaired backend-to-AI path.
- Confirmed the recommendation payload now favors:
  - lesson refreshers that match weak concepts
  - only failed, submitted assessments for retry

This replaced the earlier bad behavior where a passed assessment could be suggested as a retry item.

### 5. Teacher assignment

- Assigned the generated intervention path to the triggered case.
- Reassigned once during the audit to validate failed-attempt filtering and checkpoint integrity.

Assigned checkpoint evidence:

- Lesson assignment created: `611d64cc-f15a-4b31-a495-b46cdc100a7e`
- Assessment retry created: `208193ac-db08-4857-94ec-8a9f49886475`

### 6. Student Learners Path completion

- `student71` completed the lesson review checkpoint.
- `student71` then completed a JA Replay review session with correct answers.
- Confirmed the review session completed successfully:
  - session id `f81b73eb-62f8-4555-95ae-9e0dbc6aa21a`

Observed final case result on the teacher side:

- Status: `completed`
- Completion: `2/2`
- Progress: `100%`
- XP: `50`
- Streak: `1`

### 7. Student-side post-completion behavior

- Once the demo-class intervention completed, `student71` no longer had Learners Path access for that class.
- Because the seeded database still contains an older active case on another class, `student71` still sees Learners Path overall.
- This is currently useful for demoing the student surface without having to re-stage the full flow again.

## JA Hub Findings

## What was verified

- JA Hub loads inside Learners Path and on its own route.
- JA Replay completion updates intervention progress correctly.
- JA Hub visual design is much cleaner and more readable than the previous state.
- Class-scoped selection inside the embedded JA Hub now stays aligned to the currently selected Learners Path class.

## What was fixed

- Embedded JA Hub previously defaulted to the wrong class when opened from Learners Path.
- After the patch, the embedded selector and current-class banner both track the active class context instead of jumping to a different class.

## Current live observation

- The current visible active class for `student71` is `Mathematics 7 (MATH-7)`.
- The embedded JA Hub and direct JA Hub route both show the same class selection.

## AI Plan Quality Fixes

The AI-generated support plan quality was improved in the service layer, not just the UI.

### Changes made

- HTML-heavy lesson content is now converted into plain-text snippets before weak-focus summaries are built.
- Weak concept labels are generated from cleaner signals instead of raw markup-heavy fragments.
- Retry recommendations now require an actual failed submitted attempt.
- Remedial recommendation generation ensures class indexing is ready before relying on retrieval.

### Result

- Teacher suggestions are easier to read.
- Follow-up plans are less noisy.
- Recommended retry checkpoints are more defensible during a defense demo.

## UI Audit

### Learners Path student surface

- Renamed visible product copy from `LXP` to `Learners Path`.
- Kept the route stable while improving the page hierarchy.
- The current surface now reads like a guided recovery workspace instead of a placeholder dashboard.

### JA Hub student surface

- Stronger class context.
- Better grouping of Practice, Ask, and Replay.
- Cleaner stats and progress framing.
- More coherent use inside Learners Path instead of feeling bolted on.

### Teacher intervention surface

- Fixed the direct route so completed cases no longer collapse into a broken empty state when they are no longer present in the queue snapshot.

## Screenshot Evidence

Files saved during live verification:

- `tmp-playwright-shots/student-lxp-ja-after-fix.png`
- `tmp-playwright-shots/student-ja-direct-after-fix.png`
- `tmp-playwright-shots/teacher-intervention-detail-completed-after-fix.png`

## Important Residual Notes

- The built-in Playwright MCP transport was closed during this session, so authenticated browser verification was performed with the repo Playwright runtime instead.
- The completed teacher intervention page now opens successfully, but it still behaves like an operational workspace more than a polished read-only completion summary.
- `student71` currently surfaces an older seeded active intervention first because it is still active in the database.

## Practical Demo Script

If you need the fastest defense walkthrough tomorrow:

1. Log in as `teacher1@lms.local`.
2. Show the intervention queue and intervention workspace.
3. Explain that the AI recommendation now only suggests failed retries and indexed lesson evidence.
4. Switch to `student71@lms.local`.
5. Open `/dashboard/student/lxp`.
6. Show the Learners Path overview, assigned steps, and embedded JA Hub.
7. Open `/dashboard/student/ja` to show the standalone JA Hub.
8. Log in as `student72@lms.local` to show the non-triggered path.
9. Use the report in `learners-path-demo-readiness-2026-04-24.md` as the spoken checklist.
