# Academic Period Lifecycle Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans in this existing worktree. User authorization covers design/review decisions and immediate implementation. Do not create another checkout. Progress lives in `openspec/changes/academic-period-lifecycle/tasks.md`.

**Goal:** Implement the complete revised academic lifecycle, official annual results, remediation and safe transition across backend, web, and mobile.

**Architecture:** Backend policy functions provide one versioned source of academic rules. Locked transactions coordinate rosters, score evidence, immutable revisions, annual outcomes and transitions. Clients use server metadata and results.

**Tech Stack:** NestJS, Drizzle/PostgreSQL, Next.js/React, Expo/React Native, Jest.

## Global Constraints

- Follow `docs/academic-quarter-lifecycle-and-annual-grading-analysis.md` in full.
- Grades 7–10 only; AI never writes official grades.
- Retain `/api` envelopes and Q1–Q4 wire keys; server school-year policy determines labels and allowed periods.
- No fabricated missing grades, destructive historical rewrite, production migration, or new worktree.
- New annual decisions require complete trusted evidence. Existing snapshots are never silently recomputed.
- Read and mutate under the same locked transaction. External side effects run after commit.

## Task 1: Pure policy calculations

**Files:** create `backend/src/modules/academic-state/academic-policy.ts` and `.spec.ts`.

**Interfaces:** export `PeriodKey`, `AcademicPolicy`, `getDefaultAcademicPolicy(schoolYear)`, `getSubjectWeights(policy, subjectCode, subjectName)`, `calculatePeriodGrade(initialGrade, policy, legacyBands?)`, `calculateAnnualGrade(policy, components)`, `classifyAnnualOutcome(policy, gradeLevel, subjects)`.

- [x] Add failing policy scenarios for legacy/2026/2027, invalid years, unsupported Q4, duplicate/missing periods, exact rounding, three failures, SRC pending/pass/fail and Grade 10 deficiencies.

```ts
expect(getDefaultAcademicPolicy('2026-2027').periods.map(p => p.key)).toEqual(['Q1', 'Q2', 'Q3']);
expect(calculatePeriodGrade(70, getDefaultAcademicPolicy('2026-2027'))).toBe(75);
expect(calculatePeriodGrade(70, getDefaultAcademicPolicy('2027-2028'))).toBe(70);
```

- [x] Run `cd backend && npm test -- --runInBand academic-policy.spec.ts`; confirm failure before implementation.
- [x] Implement exact published bands and positive half-up annual arithmetic using complete period contributions; preserve source sum/divisor.
- [x] Rerun the focused suite; require zero failures.

## Task 2: Durable storage and transaction context

**Files:** create `backend/src/drizzle/schema/academic-grading.schema.ts`, `backend/src/database/academic-transaction.ts`, `.spec.ts`; modify `academic-state.schema.ts`, `class-record.schema.ts`, schema index, `database.service.ts`; generate `backend/drizzle/*`.

**Interfaces:** `DatabaseService.academicTransaction<T>(work: () => Promise<T>): Promise<T>`, `afterAcademicCommit(effect)`, `AcademicMutation()` decorator; tables described by the authoritative design.

- [x] Test nested transaction reuse, rollback, independent concurrent contexts, and after-commit behavior before implementation.
- [x] Add fields for state version, roster confirmation, item component, nullable scores with explicit status/reason, and source attempt IDs.
- [x] Add policy/participant/period revision/annual/external/SRC/back-subject/reminder tables with logical keys, source fingerprints, validity indexes, foreign keys and non-destructive history.
- [x] Implement the transaction boundary with a consistent advisory lock and transaction-local connection; ensure nested savepoint behavior cannot leak context.

```ts
await database.academicTransaction(async () => {
  // All database.db consumers resolve to this transaction.
  const current = await database.db.query.academicSystemStates.findFirst();
  if (!current) throw new Error('Academic state missing');
});
```

- [x] Generate with `cd backend && npx drizzle-kit generate --name academic_period_lifecycle`; inspect SQL and run `npm run check:migrations`.

## Task 3: Complete grading and historical evidence

**Files:** create `class-record-readiness.service.ts`, shared calculation utility and focused specs under `backend/src/modules/class-record`; modify computation/service/sync/controller/DTO/module files and enrollment mutation owners.

**Interfaces:** readiness returns `{ ready, blockers, eligibleStudentIds }`; each blocker has code, class/record/period and optional student/item identifiers. Score input is numeric or explicit excused with reason. Revision payload includes roster/items/scores/policy.

- [x] Add failing tests for missing vs zero, excused/all-excused categories, ST1/ST2/TE weighting, historical eligibility, empty roster, pending review and delayed sync.
- [x] Implement participant capture/reconciliation and roster confirmation; derive neither historical membership nor scores from guesswork.
- [x] Centralize preview and finalization arithmetic; the spreadsheet uses official snapshots for finalized records and labels incomplete draft results provisional.
- [x] Finalize under lock, create current projections plus immutable evidence; reopen records reason and invalidates dependent results without losing history.
- [x] Sync only valid completed results, preserve exemptions, and reject finalized records; use latest attempt IDs to detect stale sync.
- [x] Run class-record unit/regression suites and backend compilation.

## Task 4: Annual sources and remediation

**Files:** create `annual-grades.service.ts`, DTOs and specs in academic-state; wire class-record annual-summary endpoint and modules.

**Interfaces:** annual identity is year/student/normalized subject/grade; annual summary includes policy periods, source revisions, pending blockers, current and prior annual results, SRC and obligations.

- [x] Test complete/incomplete sources, transfer across classes, ambiguous duplicates, external evidence replacement, idempotent generation, and reopen invalidation.
- [x] Implement explicit admin external-grade/source selection and immutable annual generation.
- [x] Record SRC evidence against current annual ID; calculate RFG using original final grade without replacing it.
- [x] Persist back-subject obligations, enforce one scheduled obligation per year/period/student, and record audited clearance; Grade 10 with obligations is not completed.
- [x] Run focused policy/annual/authorization regressions.

## Task 5: Period control and assessment lifecycle

**Files:** create policy service/module and DTOs; modify academic-state controller/service and assessments service/access/controller paths, class-record placement and client-bound assessment capabilities.

**Interfaces:** `policyForYear`, `assessmentCapabilities`, state `{schoolYear,quarter,version,policy,periods}`, activation input `{targetQuarter,expectedSchoolYear,expectedQuarter,expectedVersion,currentPassword,override?,reason?}`.

- [x] Test stale state including ABA, wrong password/role, sequential/override/retry behavior and transaction rollback.
- [x] Implement activation, roster capture, audit and readiness preview.
- [x] Add failing tests for future draft save/release/start, in-flight completion, result-bearing period changes, core release, public/open and upload routes.
- [x] Implement independent draft quarter selection and atomic placement creation/reuse; apply shared policy across all relevant mutations.
- [x] Run assessment and academic-state regression suites; direct API requests must receive the same restrictions as UI.

## Task 6: Transition, notifications, audit and repair

**Files:** create `academic-transition-readiness.service.ts` and `backend/src/scripts/academic-audit.ts`; modify academic-state service and transition DTO/controller/tests.

**Interfaces:** readiness includes policy, quarter groups, annual/SRC/eligibility blockers, student outcomes, and actionable owner metadata. Existing impact preview embeds readiness without an independent promotion formula.

- [x] Test missing period/class/student grades and SRC, final-period/next-year restrictions, concurrent enrollment/reopen, and whole-transaction rollback.
- [x] Rebuild all targets under lock; remove automatic finalization; use annual outcome IDs; reset target first period and preserve clone fields/empty rosters.
- [x] Group/deduplicate reminders with persisted fingerprints and after-commit dispatch.
- [x] Implement read-only audit and explicit repair endpoints; audit existing projections/rosters without inventing trust or values.
- [x] Rehearse this task against a disposable PostgreSQL fixture, including conflicting simultaneous writes.

## Task 7: Web and mobile

**Files:** academic-state/class-record/assessment services/types, web System Settings and teacher class/editor/workbook/hook, mobile corresponding screens/services/types and React Query mutations.

**Interfaces:** consume the documented backend contracts; do not independently compute official annual grades or hard-code modern period counts.

- [x] Test selectable future drafts, server period labels, blocked release, structured readiness rendering, annual/roster/exemption operations and query invalidation.
- [x] Add admin activation, remediation/transfer/source repair, and back-subject controls.
- [x] Update both teacher clients to capabilities; remove forced-quarter effects.
- [x] Add separate annual summary, evidence/history display, and export using the same source revision IDs.
- [x] Verify web lint/type/build/Jest and browser flows; mobile typecheck/Jest/Expo bundle and affected navigation.

## Task 8: Completion evidence

**Files:** extend focused integration tests and add delivery evidence to the analysis/plan without marking unperformed work complete.

- [x] Fresh and upgrade migration rehearsal with ambiguous historical data, explicit repair, and complete annual generation.
- [x] Production-sized synthetic transition plus forced rollback and concurrency scenarios; record row counts and duration.
- [x] Run `backend: npm run build; npm run lint; npm test -- --runInBand` and applicable e2e tests.
- [x] Run `next-frontend: npm run lint; npm run build; npm test -- --runInBand`, targeted browser flows.
- [x] Run `mobile: npm run typecheck; npm test` and Expo export verification.
- [x] Review source and evidence against every acceptance bullet in the analysis and every OpenSpec task. Resolve omissions before claiming complete; clearly distinguish device-only limitations from implemented behavior.

## Delivery audit

Implemented in the requested existing worktree. See [verification evidence](../../academic-period-lifecycle-verification.md) for acceptance coverage, command outcomes, browser observations, clean web type checking, Android emulator evidence, production-copy rehearsal, and unresolved production data decisions. No commit, push, or production deployment is included.
