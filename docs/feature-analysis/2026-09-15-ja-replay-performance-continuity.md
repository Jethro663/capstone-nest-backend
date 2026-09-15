# JA Replay and Teacher Performance Continuity Analysis

## Executive verdict

The failure is a three-edge continuity defect inside the existing JA/LXP/performance boundary, not an AI-generation problem.

1. The deployed concept-mastery upsert still fails. The first repair removed the PostgreSQL-invalid `EXCLUDED.<qualified-column>` expression, but its replacement made the target columns unqualified. PostgreSQL now rejects the conflict update as ambiguous (`42702`).
2. Completed JA review sessions are persisted, but `JaService.hub()` does not populate the existing `isReplayCompleted` and `replayScore` response fields that the student replay picker and LXP summary consume.
3. `PerformanceService.getInterventionQuizComparison()` computes After AI only from generated guided-assessment attempts. It does not include completed JA assessment-retry sessions, even though both are assessment checkpoints in the same AI plan.

Coupling is moderate: the bounded flow crosses the student web UI, backend JA persistence, LXP intervention assignments, and teacher performance read model. It does not require a schema migration, AI-service change, mobile change, or alteration to official academic records.

Recommendation: implement Direction B, a read-model continuity repair. Surface the already-persisted JA completion state, make the web replay submission finish the session in the same user action, combine completed guided assessments and JA retries in the existing After AI aggregate, and repair the upsert with target-qualified versus `excluded` columns.

Coverage boundary: the inspected scope covers the supplied web routes, their backend controllers/services, database state owners, current web consumers, tests, and production logs/rows for the supplied class and student. No additional dependency was found within the inspected scope.

## Feature anatomy

### Student replay flow

`/dashboard/student/ja?mode=review&classId=<classId>&entry=lxp` loads `StudentJaWorkspace`, which calls `GET /api/ai/student/ja/hub`. The replay picker renders `JaReviewAttemptSummary.isReplayCompleted` and `.replayScore`. Starting a replay creates a `ja_sessions` row whose source snapshot contains both the original `attemptId` and `assessmentId`. Responses are written to `ja_session_responses`; the separate complete endpoint changes the session to `completed`, awards XP idempotently, and attempts to complete the matching LXP `assessment_retry` assignment.

The current UI first sends every answer and then exposes a second Complete Session action. Saving responses alone intentionally leaves the session active. That interaction makes “submit” look terminal while the persisted completion transition has not happened.

### Teacher After AI flow

`/dashboard/teacher/performance` calls `GET /api/performance/classes/:classId/intervention-quiz-comparison`. The service calculates the before value from official submitted assessment attempts preceding the intervention case. Its after value currently reads only submitted `lxp_generated_guided_assessment_attempts`, grouped by intervention assignment.

JA assessment retries are persisted in `ja_sessions` plus `ja_session_items` and `ja_session_responses`. The intervention assignment links the case to its source assessment. Those existing relations are sufficient to attribute a completed replay without adding stored aggregate state.

### Performance analysis job

Analyze creates an `ai_generation_jobs` record and runs `PerformanceService.runPerformanceAnalysisJob()`. The failure occurs while persisting derived concept mastery, before the diagnostic output is finalized. The public job status correctly returns a bounded message, while Railway PostgreSQL logs provide the database cause.

## Current-state evidence ledger

| Status | Evidence | Finding |
|---|---|---|
| Confirmed | `backend/src/modules/performance/performance.service.ts:42-50,1477-1488` | Conflict updates use unqualified `evidence_count`, `error_count`, and `mastery_score`. |
| Confirmed | Production PostgreSQL log at `2026-09-15T01:06:31Z`, repeated through `01:08:02Z` | PostgreSQL rejects the deployed query with `column reference "evidence_count" is ambiguous` (`42702`). |
| Confirmed | Read-only production `EXPLAIN` | The deployed unqualified expression fails; `student_concept_mastery.evidence_count` with `excluded.evidence_count` parses successfully. |
| Confirmed | `backend/src/modules/ja/ja.service.ts:970-1172` | `hub()` counts review sessions but does not return `isReplayCompleted`, `replayScore`, or a completed replay session id. |
| Confirmed | `backend/src/modules/ja/ja.service.ts:1620-1745` | The older review bootstrap treats a completed replay as belonging to both its exact attempt and source assessment; the hub repair must preserve that established matching rule. |
| Confirmed | `next-frontend/src/components/student/ja/StudentJaReplayPicker.tsx:29-98` | The screenshot’s status and score are controlled only by those omitted fields. |
| Confirmed | `next-frontend/src/components/student/lxp/StudentLxpDetailExperience.tsx:555-565` | The LXP replay summary consumes the same omitted fields. |
| Confirmed | Read-only production snapshot for class `5fea66d4-c588-40d4-a6e1-acbe9faab88f` and student `6ba68acb-a287-4fd2-b34b-a30e1e1f7cb9` | Three completed review sessions exist: Written1 4/5 (80%), ST1 1/5 (20%), and ST1 0/5 (0%). One newer ST1 session is active with 0/5 responses. |
| Confirmed | `backend/src/modules/ja/ja.service.ts:2203-2386` | Session completion persists status, completion time, XP/audit side effects, and invokes the LXP retry-completion seam. |
| Confirmed | `next-frontend/src/components/student/ja/StudentJaWorkspace.tsx:967-998,1082-1098,1465-1484` | Submit Answers and Complete Session are separate user actions. |
| Confirmed | `backend/src/modules/performance/performance.service.ts:817-1149` | After AI selects only submitted generated guided attempts; JA sessions are absent. |
| Confirmed | Same production snapshot | The only guided-assessment attempt is `in_progress` with no score, explaining the current null guided-only aggregate. |
| Confirmed | `next-frontend/app/(dashboard)/dashboard/teacher/performance/page.tsx:1225-1229,1352-1397` | UI language says AI quizzes and renders `afterScorePercent` / `afterSampleSize` without identifying the full AI-plan evidence set. |

## Cascade map

| Edge | Provider | Interface/state | Consumer | Effect | Risk | Confidence | Disposition |
|---|---|---|---|---|---|---|---|
| E1 | Student JA page | `StudentJaWorkspace` review submission | JA response endpoint | Saves answers but does not finish the session in the same action | Medium | Confirmed | Combine submit and finish at the interaction boundary; retain recovery completion action. |
| E2 | `JaService.completeSession` | `ja_sessions.status`, responses, XP, audit | `JaService.hub` | Durable completion exists | Low | Confirmed | Preserve as authority; do not add duplicate completion state. |
| E3 | `JaService.hub` | `review.eligibleAttempts[]` | Replay picker | Omits completion/score, so completed work renders pending | High | Confirmed | Populate existing optional fields from completed sessions, matching both exact attempt and source assessment. |
| E4 | `JaService.hub` | Same fields | Student LXP replay summary | Completed count and average remain empty | High | Confirmed | Same E3 repair fixes this consumer. |
| E5 | Intervention case | `intervention_assignments` assessment retry | Completed JA sessions | Connects a replay to an AI-plan case and source assessment | Medium | Confirmed | Resolve at read time using case, student, class, source assessment, and completion time. |
| E6 | Generated guided assessment | Submitted attempt rows | Teacher comparison | Currently the only After AI evidence | Low | Confirmed | Preserve and union with E5 evidence. |
| E7 | Teacher performance endpoint | Existing response shape | Teacher page | Shows null after average when only JA retries exist | High | Confirmed | Aggregate best score per AI-plan assessment assignment across both sources. |
| E8 | Analyze action | Concept-mastery upsert | PostgreSQL | Ambiguous target/excluded column aborts the job | High | Confirmed | Use explicit target-table and `excluded` qualifiers; test the full INSERT SQL. |
| E9 | Failed analysis job | Public error constant | Teacher toast | Avoids exposing raw SQL but hides internal cause from users | Low | Confirmed | Preserve public message; keep bounded internal diagnostics. |
| E10 | Backend response contracts | Existing optional fields and comparison fields | Web types/services | Shape is already compatible | Low | Confirmed | No migration or breaking DTO change. |

## Isolation and cut simulation

- Fixing only E3/E4 correctly marks already-completed replays, but it leaves the confusing two-step submission and teacher aggregate defect.
- Fixing only E7 makes teacher numbers appear while students still see false pending cards.
- Adding a new persisted aggregate would duplicate authoritative responses and create staleness, violating the computed-data invariant.
- Removing the separate completion endpoint would break recovery and other current callers. Keep it; change the primary web action to call it automatically after answers are saved.
- JA completion must remain formative. It must not mutate assessment attempts or official class records.
- Rollback is code-only: revert hub projection, combined read model, and UI action/labels. Existing JA and guided-attempt rows remain valid.

## Frontend decision ledger

| Category | Decision |
|---|---|
| Keep | Current student JA route, LXP return path, replay cards, maximum-attempt rules, question flow, current teacher performance table, role permissions, and GABHS visual tokens. |
| Change | The terminal button becomes “Submit & Finish Replay”; a successful action saves responses, completes the session, refreshes the hub, and displays the persisted score as Taken. Teacher copy becomes “After AI Plan” and counts both generated guided assessments and JA retries. |
| Frozen | Official assessment attempt scores, class records, intervention approval/history, XP idempotency, audit logging, backend auth/RBAC, API envelope, and AI-service generation contract. |
| Unknown | No teacher-authenticated browser session is currently available for live post-release acceptance; preserve as an explicit release boundary if it remains unavailable. |

## Design options

### Direction A — projection-only patch

Populate replay status in `hub()` and fix the SQL. Smallest diff, but it leaves Submit Answers non-terminal and still excludes replay scores from After AI.

### Direction B — end-to-end continuity repair (recommended)

Populate replay state, make the web submission finish the session, union existing guided and JA evidence in the teacher read model, clarify labels, and fix the upsert. This satisfies the complete request without new persistence or broad architecture changes.

### Direction C — unified AI-attempt ledger

Introduce a new normalized event/attempt table and migrate historic guided and JA evidence. This can improve long-term analytics but adds migration, backfill, dual-write, and rollback risk that is not justified for the stated defect.

## Required improvements

1. Test the complete Drizzle INSERT/ON CONFLICT SQL, not an isolated UPDATE fragment.
2. Make the hub’s replay projection derive from completed session responses and keep active-session recovery metadata.
3. Treat both existing AI-plan assessment checkpoint types as After AI evidence, selecting the best submitted/completed score per assignment.
4. Make the student terminal action truthful and refresh dependent read models after completion.
5. Use “AI-plan assessment” language instead of “AI quiz” where both evidence sources are represented.

## Uncertainty

- Browser acceptance for the teacher and student roles requires sessions with those roles; current ambient browser state is Admin.
- The exact desired policy for multiple replays was not explicitly stated. The existing guided-assessment comparison already keeps the best score per assignment, so Direction B applies the same best-per-assignment rule to JA retries.
