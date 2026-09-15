# JA Replay and Teacher Performance Continuity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make completed AI-plan assessments persistently visible to students and teacher performance reporting, and make Analyze complete successfully.

**Architecture:** Keep existing tables and endpoints authoritative. Repair the JA hub projection from completed session responses, combine generated-guided and JA-retry evidence in the existing teacher comparison read model, and make the student web submit action invoke the existing idempotent completion boundary. Repair the PostgreSQL upsert using explicit target and `excluded` qualifiers.

**Tech Stack:** NestJS 11, Drizzle ORM, PostgreSQL, Next.js 16, React 19, Jest/Testing Library.

## Global constraints

- Scope is limited to backend JA/performance read and completion paths plus the two named web surfaces.
- Do not change official assessment attempts, class records, grading, admin, mobile, AI-service generation, authentication, or intervention approval policy.
- Do not add schema, migration, dependency, or API-envelope changes.
- Preserve max-three replay behavior, XP idempotency, audit history, and the public bounded analysis error.
- Use the best completed/submitted score per AI-plan assessment assignment in After AI, matching the existing guided-attempt policy.

## 1. Decision summary and feature brief

Implement Direction B from the canonical analysis. Existing completion evidence is correct; the broken seams are projection, aggregation, terminal interaction, and SQL qualification.

## 2. Scope, non-goals, permissions, and assumptions

Included owners:

- `backend/src/modules/ja/ja.service.ts` and a focused replay-state helper/spec.
- `backend/src/modules/performance/performance.service.ts` and its spec.
- `next-frontend/src/components/student/ja/StudentJaWorkspace.tsx` and tests.
- `next-frontend/app/(dashboard)/dashboard/teacher/performance/page.tsx` and tests.

Non-goals are listed in Global constraints. Explicit user authorization covers implementation, tests, commit, push to the current `developement` branch, configured deployment, and release observation.

Assumption: “After AI Average” means the best score from every completed assessment checkpoint in the active intervention AI plan, including `guided_assessment` and `assessment_retry`.

## 3. Current-state evidence ledger

The source of truth is [the isolation analysis](../feature-analysis/2026-09-15-ja-replay-performance-continuity.md). Decisive evidence: completed JA rows exist, hub fields are omitted, teacher aggregation queries guided attempts only, and PostgreSQL logs/explain confirm `42702` ambiguity.

## 4. End-to-end impact and consumer map

```text
Student answers
  -> existing JA response rows
  -> existing JA complete endpoint
  -> ja_sessions.status=completed + XP/audit/LXP checkpoint
  -> /ja/hub completion projection
     -> replay cards + LXP replay summary
  -> teacher intervention comparison
     + submitted guided attempts
     -> After AI Plan average

Teacher Analyze
  -> performance diagnostic job
  -> concept mastery upsert with target/excluded qualification
  -> completed diagnostic output
```

No mobile or AI-service consumer uses the changed web-only interaction. The backend comparison response shape is unchanged. The hub fills existing optional type fields, so current consumers remain compatible.

## 5. Conflicts, invariants, risks, and selected design

- Risk: double-counting repeat attempts. Mitigation: retain only the best score per intervention assignment.
- Risk: attributing a historic replay to the wrong case. Mitigation: require matching student, class, source assessment assignment, completed status, and completion at/after case opening.
- Risk: answer save succeeds but completion fails. Mitigation: retain the separate completion action as a recovery state, reload the session after failure, and show no false success.
- Risk: another malformed SQL expression ships. Mitigation: compile the full INSERT/ON CONFLICT statement in the regression test and validate it against PostgreSQL in focused integration evidence when available.
- Invariant: JA/LXP remain formative and never alter official grade records.

## 6. Recommended architecture, data flow, security, and errors

- Add a small pure JA replay-state projector that calculates completed score, aliases state by exact attempt and source assessment to preserve current bootstrap behavior, and selects the latest completed session without allowing a newer active session to erase completed history.
- `JaService.hub()` loads response correctness for review sessions, applies the projector, and fills `isReplayCompleted`, `replayScore`, `replaySessionId`, and `replayCount`.
- `PerformanceService.getInterventionQuizComparison()` loads assessment-retry assignments and completed review sessions, converts each into after-evidence, unions them with guided attempts, and performs the existing best-per-assignment aggregate.
- `StudentJaWorkspace` changes the primary action to submit all remaining responses and then call `completeReviewSession`; it refreshes the session/hub on success and reloads recoverable state on failure.
- Teacher labels identify the combined evidence as AI-plan assessments.
- RBAC and public response envelopes remain unchanged. Failed analysis still returns the public constant; internal logs retain bounded database detail.

## 7. Contract, schema, migration, and compatibility

- Schema/migration: none.
- JA hub: existing optional fields become reliably populated; backward compatible.
- Performance comparison: existing numeric fields retain shape, with broader correct semantics for After AI.
- Frontend types/services: no signature change expected.
- Mobile and AI service: no change.

## 8. Ordered implementation phases

### Task 1: Repair concept-mastery upsert

**Files:**
- Modify `backend/src/modules/performance/performance.service.spec.ts`.
- Modify `backend/src/modules/performance/performance.service.ts`.

- [ ] Write a failing test that compiles the complete Drizzle insert and requires `student_concept_mastery.<column>` versus `excluded.<column>`.
- [ ] Run the focused test and confirm the current unqualified SQL fails the assertion.
- [ ] Replace only the three conflict expressions with PostgreSQL-valid target-qualified expressions.
- [ ] Run the focused test and a PostgreSQL parse/integration check.

### Task 2: Project completed JA replay state into the hub

**Files:**
- Create `backend/src/modules/ja/ja-review-state.ts`.
- Create `backend/src/modules/ja/ja-review-state.spec.ts`.
- Modify `backend/src/modules/ja/ja.service.ts`.

- [ ] Write failing pure tests for a completed replay score and for a newer active session not erasing completed history.
- [ ] Implement the minimal projector.
- [ ] Load review item response correctness in `hub()` and populate the existing replay fields.
- [ ] Verify helper and JA controller/module tests.

### Task 3: Include JA retries in teacher After AI

**Files:**
- Modify `backend/src/modules/performance/performance.service.spec.ts`.
- Modify `backend/src/modules/performance/performance.service.ts`.

- [ ] Extend the comparison test with an assessment-retry assignment and completed JA sessions; require the best replay score in both assessment and class averages.
- [ ] Run the focused test and confirm the current guided-only result fails.
- [ ] Load and map completed JA replay evidence, union it with guided evidence, and preserve best-per-assignment behavior.
- [ ] Run focused performance tests.

### Task 4: Make student submission terminal and teacher copy accurate

**Files:**
- Modify `next-frontend/src/components/student/ja/StudentJaWorkspace.test.tsx`.
- Modify `next-frontend/src/components/student/ja/StudentJaWorkspace.tsx`.
- Modify `next-frontend/app/(dashboard)/dashboard/teacher/performance/page.test.tsx`.
- Modify `next-frontend/app/(dashboard)/dashboard/teacher/performance/page.tsx`.

- [ ] Change the replay test to require a “Submit & Finish Replay” action that calls both response and completion endpoints and refreshes hub state.
- [ ] Run the focused test and confirm it fails before implementation.
- [ ] Implement the single terminal interaction while preserving the separate recovery completion action.
- [ ] Add/adjust teacher-page assertions for “After AI Plan” and “AI-plan assessment(s)”.
- [ ] Run focused frontend tests.

### Task 5: Review, verify, and release

**Files:** all task-owned files and these two canonical documents.

- [ ] Reconcile the final diff against every acceptance criterion and run `git diff --check` plus a secret-pattern scan.
- [ ] Run backend format/lint, focused tests, full tests, build, and applicable migration/runtime gates.
- [ ] Run frontend format/lint, focused tests, full tests, typecheck, and build.
- [ ] Skip APK packaging because no mobile source, dependency, native configuration, or bundled asset changes.
- [ ] Stage only task-owned files, review the staged diff, commit, fetch, verify outgoing history/divergence, and push `developement`.
- [ ] Correlate CI and Railway deployment to the exact pushed SHA, wait for terminal success, verify backend/frontend health, inspect PostgreSQL logs for recurrence, and record any role-session browser limitation.

## 9. Verification matrix and acceptance criteria

| Requirement | Automated proof | Runtime/release proof |
|---|---|---|
| Analyze completes | Full INSERT SQL regression plus performance service tests | No `42702` recurrence; teacher Analyze job completes when a teacher session is available. |
| Completed replay is Taken | JA projector tests and workspace flow test | Existing completed production replays render Taken after deployment. |
| Submit is terminal | Workspace test proves responses then completion and hub refresh | Student action shows persisted score without a second required step. |
| After AI has scores | Performance service test combines guided and JA sources | Supplied student’s completed replay evidence produces a non-null After AI value. |
| No official-grade mutation | Diff review and service-boundary tests | No writes to assessment attempts or class records. |
| Compatibility | Backend/frontend typechecks and full suites | Existing routes and envelopes remain healthy. |

Acceptance is observable when the supplied student’s completed replays display as Taken with stored scores, the teacher comparison reports an After AI Plan average from those scores, and Analyze reaches completed status without a PostgreSQL conflict error.

## 10. Rollout, rollback, observability, cleanup, and unverified boundaries

- Rollout: normal `developement` push and configured Railway workflows.
- Rollback: revert the single scoped commit and redeploy; no data rollback is needed.
- Observability: check backend performance-job logs, PostgreSQL ambiguity/invalid-reference errors, job status/output, and public health endpoints.
- Cleanup: no backfill. Existing completed sessions become visible immediately through corrected reads.
- Unverified boundary: authenticated teacher/student browser acceptance may remain pending if those role sessions are unavailable. CI, read-only production DB evidence, logs, and public health do not substitute for that role-specific click proof.
