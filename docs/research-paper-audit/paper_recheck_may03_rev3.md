# May 03 Paper Recheck Rev3

Source DOCX: `C:\Users\jethr\Downloads\May03-CHAPTER-1-4 (2).docx`

Readiness score: **89/100**
Panel risk: **Medium**
Verdict: **Almost panel-safe, but still needs one short correction pass.**

## What Improved
- The frontend stack claim is now correct: the paper says `Next.js 16.2.4 and React 19.2.3`, which matches `next-frontend/package.json`.
- The 74% mastery-threshold correction remains intact across the core intervention sections and Figure 13.
- The old copied legacy block about `RND`, `nutritionist`, `food intake`, and `cloud database` is still gone.
- The scope remains narrower and believable: it explicitly says Grades `7`, `8`, `9`, and `10` instead of `all high school grade levels`.
- The old offline/local-cache contradiction remains cleaned up; the current draft consistently says offline functionality is excluded.
- The old duplicate use-case issue remains fixed: `Track Student Performance` and `View Evaluations` are now separate table titles.
- The paper still honestly notes that teacher/admin mobile workflows are unsupported in the current repository build.

## Remaining Findings
### R3-001 - Major
- Location: Chapter 4, Figures 8 and 9
- Approx. page: Approx. pp. 102-104
- Exact issue: Figure 8 claims mobile OTP verification and mandatory first-login password update, while Figure 9 claims mobile forgot-password and account-recovery flows with reset-link handling.
- Why it matters: The current `mobile` app still does not expose OTP verification, password-reset, or account-recovery screens. Its auth stack contains only a `Login` route, and the login screen says `Forgot password? Contact your administrator`.
- Evidence:
  - Research paper: docs/research-paper-audit/extracted/full_text.txt:544-563
  - Repo: mobile/src/navigation/types.ts -> AuthStackParamList only contains `Login`
  - Repo: mobile/src/screens/LoginScreen.tsx:431 -> `Forgot password? Contact your administrator`
  - Repo search: no OTP or mobile reset/account-recovery screens found under mobile/src
- Correction: Rewrite Figures 8 and 9 to match the actual mobile login flow, or explicitly move OTP and password-recovery logic to the web-only or future-scope section.

### R3-002 - Major
- Location: Chapter 4, Figure 11
- Approx. page: Approx. p. 106
- Exact issue: The system tracks the duration of assessment attempts in the database to monitor how long a student interacts with a module.
- Why it matters: This still mixes two different implementation concerns. The repo tracks lesson completions and separately stores `time_spent_seconds` on assessment attempts. That does not prove timed module-view engagement in the way the figure describes it.
- Evidence:
  - Research paper: docs/research-paper-audit/extracted/full_text.txt:567-568
  - Repo: backend/src/drizzle/schema/base.schema.ts -> `lesson_completions` table and separate `assessment_attempts.time_spent_seconds` field
  - Repo: mobile/src/screens/AssessmentTakeScreen.tsx:190 submits `timeSpentSeconds` for an assessment attempt
- Correction: Rewrite Figure 11 to describe lesson completion/progress honestly, or explicitly say the timing metric belongs to assessment attempts rather than module interaction.

### R3-003 - Moderate
- Location: Title page / full title
- Approx. page: p. 1
- Exact issue: Nexora: A Learning Management With Learning Experience Platform Features...
- Why it matters: The title is still grammatically incomplete because it omits the word `System`. This is highly visible and easy for a panelist to catch immediately.
- Evidence:
  - Research paper: docs/research-paper-audit/extracted/full_text.txt:2
- Correction: Change the title to `Nexora: A Learning Management System with Learning Experience Platform Features for Targeted Student Intervention for Gat Andres Bonifacio High School`.

### R3-004 - Moderate
- Location: Chapter 3 architecture wording
- Approx. page: Approx. p. 40
- Exact issue: NextJS Backend Core
- Why it matters: The backend is NestJS, not NextJS. This is still a technical naming error in the architecture narrative.
- Evidence:
  - Research paper: docs/research-paper-audit/extracted/full_text.txt:336
  - Repo: backend/package.json is NestJS-based; next-frontend/package.json is the Next.js app
- Correction: Replace `NextJS Backend Core` with `NestJS backend core` or `NestJS API/backend`.

### R3-005 - Minor
- Location: Chapter 4, figure narrative prose
- Approx. page: Approx. pp. 50-51
- Exact issue: `Figure 3 depicts the web use case diagram depicts...` / `Figure 4 illustrates the mobile use case diagram illustrates...`
- Why it matters: Both sentences still repeat the main verb and read like incomplete line edits instead of polished academic prose.
- Evidence:
  - Research paper: docs/research-paper-audit/extracted/full_text.txt:391,394
- Correction: Use one clean verb in each sentence: `Figure 3 depicts...` and `Figure 4 illustrates...`.

## Bottom Line
- This draft is stronger than the previous one and the stack-version claim is now correct.
- The biggest remaining panel risks are mobile auth overclaiming and Figure 11's inaccurate engagement-tracking description.
- After one short correction pass, this draft should be substantially safer for panel review.
