# May 03 Paper Recheck

Source DOCX: `C:\Users\jethr\Downloads\May03-CHAPTER-1-4.docx`

Readiness score: **71/100**
Panel risk: **Medium**
Verdict: **Better, but still needs revision before panel.**

## What Improved
- The intervention threshold is now mostly corrected from `60%` / `c0%` to `74%` in core Chapter 1, Chapter 2, Chapter 3, and Figure 13 sections.
- The copied legacy paragraph about `RND`, `nutritionist`, `food intakes`, and `cloud database` is gone.
- The typo `Disccusion` was corrected to `Discussion Board`.
- The old duplicate `Student Profile` problem was partially fixed: Table 18 is now `Security and Verification` instead of another `Student Profile`.
- The mobile use-case narrative now honestly states that teacher/admin mobile workflows are unsupported in the current repository build.
- Figure 30 no longer claims immediate mobile push notifications; it now uses safer web/in-app notification wording.
- Figure 21 was corrected from generic `Account Locking` to `Web Profile Detail Locking`, which matches the actual student-profile lock behavior in the web app.
- Figure 11 was softened from a hard `30-Second` rule to `Time-Based Engagement Tracking`.

## Remaining Findings
### R-001 - Major
- Location: Chapter 3, Software stack description
- Approx. page: Approx. p. 36
- Exact issue: The frontend is built using Next.js 19.2.3 and React 19
- Why it matters: The repository uses Next `^16.2.4`, not Next `19.2.3`. The paper appears to have inserted the React version into the Next.js slot.
- Evidence:
  - Research paper: docs/research-paper-audit/extracted/full_text.txt:289
  - Repo: next-frontend/package.json -> next ^16.2.4, react 19.2.3
- Correction: Change this to `Next.js 16.2.4 and React 19.2.3`, or state the major versions only.

### R-002 - Major
- Location: Chapter 1, Scope and Delimitation
- Approx. page: Approx. p. 16
- Exact issue: supports all high school grade levels and subjects
- Why it matters: The repo grade model is constrained to grade levels `7`, `8`, `9`, and `10`. The implementation evidence does not prove full all-subject, all-high-school deployment breadth.
- Evidence:
  - Research paper: docs/research-paper-audit/extracted/full_text.txt:171
  - Repo: backend/src/common/utils/grade-level.util.ts:5
  - Repo: backend/src/drizzle/schema/base.schema.ts:68
- Correction: Narrow the statement to the implemented grade coverage or qualify it as intended deployment scope rather than confirmed implemented scope.

### R-003 - Major
- Location: Chapter 4, Figure 11
- Approx. page: Approx. p. 106
- Exact issue: The system utilizes the timeSpentSeconds field in the database to monitor how long a student interacts with a module.
- Why it matters: The repo does contain `timeSpentSeconds`, but that field is tied to `assessment_attempts`, not lesson/module engagement. Lesson completion exists, but this specific field-to-module claim is unsupported.
- Evidence:
  - Research paper: docs/research-paper-audit/extracted/full_text.txt:563-564
  - Repo: backend/src/drizzle/schema/base.schema.ts shows lesson_completions and separately assessment_attempts with time_spent_seconds
  - Repo: mobile/src/screens/AssessmentTakeScreen.tsx: timeSpentSeconds is submitted for assessments
- Correction: Rewrite Figure 11 to describe the actual lesson completion/progress logic, or explicitly tie `timeSpentSeconds` to assessments rather than module viewing.

### R-004 - Major
- Location: Chapter 4, Use-case tables
- Approx. page: Approx. pp. 77 and 81
- Exact issue: Table 31: Use Case Narratives of View Evaluations / Table 36: Use Case Narratives of View Evaluations
- Why it matters: The document still contains duplicate use-case titles later in the sequence. This is a cleaner version of the old numbering issue, but it is still a visible documentation integrity problem.
- Evidence:
  - Research paper: docs/research-paper-audit/extracted/full_text.txt:102,107,452,466
- Correction: Rename one of the duplicated tables to its intended use case and recheck the list of tables against in-body captions.

### R-005 - Moderate
- Location: Chapter 1 delimitation vs Chapter 4 technical constraints
- Approx. page: Approx. pp. 17 and 45
- Exact issue: offline functionality and synchronization are excluded / mobile application is designed to cache core lesson text and announcements locally
- Why it matters: These two statements pull in different directions. The repository does not give clear evidence of a completed offline lesson/announcement cache feature matching this wording.
- Evidence:
  - Research paper: docs/research-paper-audit/extracted/full_text.txt:186,382
  - Repo search found secure storage and file-system usage, but not a clear implemented offline lesson-and-announcement cache contract
- Correction: Either remove the local-cache claim or rewrite the delimitation so the intended offline/resilience behavior is consistent and accurately scoped.

### R-006 - Moderate
- Location: Chapter 3 architecture wording
- Approx. page: Approx. pp. 39-40
- Exact issue: NextJS Backend Core
- Why it matters: The backend is NestJS, not NextJS. The web frontend is Next.js. This is a framework naming error in the architecture narrative.
- Evidence:
  - Research paper: docs/research-paper-audit/extracted/full_text.txt:325,335
  - Repo: backend/package.json uses NestJS; next-frontend/package.json uses Next.js
- Correction: Replace `NextJS Backend Core` with `NestJS backend core` or `NestJS API/backend`.

### R-007 - Moderate
- Location: Chapter 1 wording quality
- Approx. page: Approx. pp. 14-16
- Exact issue: student to teacher ratios is often high / awkward repeated high-intensity phrasing
- Why it matters: The paper is much cleaner than before, but there are still grammar and phrasing spots that sound rushed or inflated.
- Evidence:
  - Research paper: docs/research-paper-audit/extracted/full_text.txt:141 and surrounding prose
- Correction: Do a line edit pass for subject-verb agreement and over-intense phrasing before submission.

## Bottom Line
- This draft is materially better than the previous one.
- The old threshold typo cluster, copied nutritionist block, and push-notification overclaim were cleaned up.
- The strongest remaining risks are the wrong Next.js version, the overbroad scope claim, the module-engagement tracking claim in Figure 11, and the lingering duplicate `View Evaluations` table title.
