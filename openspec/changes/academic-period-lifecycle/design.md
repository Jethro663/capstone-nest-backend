## Context

The authoritative design and verified policy citations are in `docs/academic-quarter-lifecycle-and-annual-grading-analysis.md`. This change implements that complete document for Nexora Grades 7–10 across backend, web, and mobile. Work is authorized in the current worktree; no external deployment is required.

## Goals / Non-Goals

**Goals:** configurable-by-school-year period requirements; safe activation and assessment access; complete grades and immutable evidence; correct annual/remediation outcomes; concurrent-safe transition; actionable UI, exports, and migration repair.

**Non-Goals:** AI grade authority, K–6 or SHS curriculum support, automatic production rollout, retroactively fabricating scores, or changing the established empty-roster clone model.

## Decisions

1. Use `academic-policy.ts` pure functions for a typed `AcademicPolicy`, period labels, weights, transmutation, annual arithmetic, and outcome classification. Persist the resolved snapshot in `academic_year_policies`. Retain Q1–Q4 wire values; policy controls permitted values. A global hard-coded four-quarter schema was rejected; rewriting all historical identifiers was also rejected.
2. Add `AcademicPolicyService` for loading/persisting policies and class/assessment capabilities. Keep it independent of class-record orchestration to avoid cyclic Nest modules.
3. Add one transaction boundary using PostgreSQL advisory locking and AsyncLocalStorage to propagate the same Drizzle connection across nested services. Academic mutation entrypoints acquire the lock before validation. No request may inherit another request's transaction. Background score-sync enters the same boundary. Audit is transactional; external events/notifications are deferred until commit.
4. Add participant, immutable period-revision, annual-revision, external-period-grade, remediation-result, back-subject, and reminder-run tables in `academic-grading.schema.ts`. Current quarterly grades remain a compatibility projection. Revision evidence lives in JSONB with typed structures and explicit source IDs; current validity is indexed independently from immutable payloads.
5. `ClassRecordReadinessService` owns participant reconciliation, item/score completeness and structured blockers. A shared pure calculation function provides preview, finalization, and spreadsheet arithmetic with missing/excused semantics and modern exam subweights.
6. `AnnualGradesService` selects complete period sources by logical subject/year/student, handles explicit transfer-source resolution, appends annual snapshots idempotently, records SRC evidence, and preserves back-subject obligations. Annual reads never silently mutate official results.
7. `AcademicTransitionReadinessService` computes one expected class/student/period matrix reused by preview, notifications, audit, and execution. `AcademicStateService` retains archive/clone orchestration but rebuilds targets inside the locked transaction and consumes validated annual outcomes.
8. Clients consume server policy/capabilities; no separate client grade formula. Existing course and grading routes retain envelopes. New components expose period activation, readiness details, roster/score decisions, annual evidence, and admin repair/remediation actions. Exports use annual API data and revision identifiers.

## Risks / Trade-offs

- Global academic lock limits write concurrency → bounded transactions, no network/provider calls inside the lock, production-sized local timing and concurrent tests; partitioning locks can follow measured need.
- Existing modern records may contain obsolete Q4/weights → report and explicit repair; preserve evidence instead of coercing grades.
- Historic enrollment cannot be reconstructed reliably → require explicit roster confirmation and verified transfer evidence, without deleting history.
- Conditional promotion introduces durable obligations → preserve original outcomes and enforce one back subject per period; never mark incomplete Grade 10 students completed.
- Old clients lack new controls → preserve numeric score payloads and wire keys, return structured errors, ship both affected clients together.

## Migration Plan

Generate additive SQL and metadata with drizzle-kit. Run the read-only audit on a migrated local database copy, preserve legacy projections as legacy revisions, and record every repair with actor/reason. Backfill annual revisions only from complete trusted inputs. Test fresh install, upgrade, rollback-before-write, and post-write forward repair. Do not drop history on rollback.

## Open Questions

None block implementation. Domain choices and conservative handling of ambiguous historical evidence are resolved in the authoritative design. Future policy changes require a new version rather than mutation of existing snapshots.
