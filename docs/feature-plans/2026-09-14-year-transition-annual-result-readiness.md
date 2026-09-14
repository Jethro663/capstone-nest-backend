# Year Transition Non-Zero Annual Results and Retained Outcome Plan

## 1. Decision summary and feature brief

Implement the approved Year Transition rule as follows:

- Every required period record must remain valid and finalized.
- Each active learner must have at least one current, source-verified annual subject result.
- There is no exact annual-result count threshold; additional assigned subjects without a current annual snapshot do not block once one valid snapshot exists.
- A current finalized failing result without evidenced SRC produces the official outcome `retained`, not `pending_remediation`.
- The admin Year Transition page must stop displaying a fixed-looking `N annual subject results required` sentence and must show a clear non-zero/current-result requirement.
- When no other blocker exists, backend readiness returns a `Good to go` message and web/mobile transition controls are enabled by the existing `transitionBlocked` contract.

The recommended implementation changes the pure domain classifier and buffers annual-evidence blockers inside the pure transition evaluator. It preserves the existing REST envelope, response fields, database schema, transaction gate, authorization, and audit flow.

## 2. Scope, non-goals, permissions, and assumptions

### In scope

- Backend annual outcome classification and transition readiness evaluation.
- Backend regression tests for one/two unresolved failures, Grade 10, partial valid annual evidence, zero valid evidence, and strict period readiness.
- Admin web status copy and focused component test.
- Active OpenSpec/lifecycle documentation that contradicts the newly approved policy.
- Full affected-surface verification, commit, push to the current `developement` upstream, CI observation, Railway deployment observation, and read-only live preview verification.

### Non-goals

- No schema, migration, DTO, response-envelope, RBAC, password, confirmation, transaction, audit-table, or mobile source change.
- No automatic annual-grade creation, SRC fabrication, grade mutation, learner enrollment, or live year-transition execution.
- No APK/IPA build: mobile source, dependencies, native configuration, and bundled assets are unchanged.

### Authorization and assumptions

- The user explicitly selected `retained` for finalized failures without SRC and explicitly requested finish-and-ship.
- `expectedAnnualGrades` remains in the response for compatibility as a dynamic informational metric, not a transition threshold.
- Existing subject identity, source validity, and period finalization rules remain authoritative. Only subject-level annual-evidence blockers are suppressed after at least one valid annual snapshot is collected for that learner.

## 3. Current-state evidence ledger

| Status | Evidence | Finding |
| --- | --- | --- |
| Confirmed | `backend/src/modules/academic-state/academic-transition-readiness.ts:158-355` | Required period records, rosters, trusted current revisions, and policy periods are validated independently of annual snapshot count. |
| Confirmed | `backend/src/modules/academic-state/academic-transition-readiness.ts:411-440` | The displayed annual count is derived from expected active subjects; no literal value `3` controls readiness. |
| Confirmed | `backend/src/modules/academic-state/academic-transition-readiness.ts:447-544` | Subject-source and annual-snapshot blockers are currently pushed globally, and `pending_remediation` currently blocks transition. |
| Confirmed | `backend/src/modules/academic-state/academic-policy.ts:247-307` | Empty result sets are `incomplete`; failures without SRC are `pending_remediation`; non-empty passing sets can promote or graduate. |
| Confirmed | `backend/src/modules/academic-state/academic-state.service.ts:861-975` | `transitionBlocked` gates execution; `studentOutcomes` update profiles and are persisted as official evidence. |
| Confirmed | `backend/src/modules/sections/sections.service.ts:1672-1738` | `retained` is already mapped to finalized/failing in section and access-student readiness. |
| Confirmed | `next-frontend/app/(dashboard)/dashboard/admin/system-settings/year-transition/page.tsx:263-306` | The status renders the dynamic count as `required`; button enablement already follows backend `transitionBlocked`. |
| Confirmed | `mobile/src/screens/AdminAcademicScreen.tsx:335-435` | Mobile already shows retained counts and uses backend `transitionBlocked`; no shape or UI change is required. |
| Confirmed | `openspec/changes/academic-period-lifecycle/specs/complete-academic-grades/spec.md:24-29` | The active specification states the old SRC-required blocker behavior and must be amended. |
| Confirmed | Live page observed 2026-09-14 | All 8 required period records were finalized. The only displayed blocker was `Pending remediation`; the transition button was disabled. |
| Inferred | Live preview plus current evaluator | Mapping missing-SRC failures to retained will clear the observed blocker if the live academic evidence remains unchanged and no deployment-time blocker appears. |

Canonical dependency evidence is in `docs/feature-analysis/2026-09-14-year-transition-retained-finalized-results.md`.

## 4. End-to-end impact and consumer map

```text
current academic evidence
  -> AcademicTransitionReadinessService.getReadiness
     -> evaluateTransitionReadiness
        -> strict period-record validation
        -> valid annual snapshot collection (non-zero threshold)
        -> classifyAnnualOutcome (missing SRC => retained)
        -> blockers + studentOutcomes + counters + Good-to-go message
  -> GET transition-readiness
     -> web audit/recovery
     -> mobile settings/admin academic screens
     -> backend section/access-student readiness
  -> GET impact-preview
     -> web Year Transition page
     -> mobile Year Transition workspace
  -> POST transition
     -> transaction gate
     -> profile/year-outcome writes
     -> audit counts
```

No consumer requires a type change. The observable behavior changes from blocked/pending to ready/retained when the only unresolved condition is missing SRC for a current finalized failed annual result.

## 5. Conflicts, invariants, risks, and design options

### Preserved invariants

- Backend owns readiness and official outcomes.
- Every required period record remains finalized, roster-confirmed, current, and trusted.
- Zero valid annual subject results remains blocked.
- A reopened/stale annual result does not count as valid.
- Transition still verifies admin password, exact confirmation text, expected academic-state version, immediate next year, and target-year conflicts.
- Retained learners are not advanced or graduated; their outcome and evidence are persisted and audited.

### Intentional policy changes

- Missing additional annual snapshots stop blocking once at least one current valid annual result exists for that learner.
- One or two finalized failures without SRC become retained immediately rather than pending remediation.

### Options considered

1. **Domain classifier plus evaluator threshold (recommended and selected).** Change the only production outcome classifier and buffer annual-evidence blockers until the evaluator knows whether the learner has any valid annual snapshot. This keeps the rule centralized and testable.
2. **Readiness-only post-processing.** Convert `pending_remediation` to retained only inside transition readiness. Smaller initially, but leaves the domain classifier and tests describing a contradictory official outcome.
3. **Schema-configured threshold/outcome.** Add policy fields for minimum annual results and missing-SRC outcome. More flexible but introduces unnecessary migrations, DTO/client work, and operational configuration for a decision that is now explicit.

Selected option 1 has the smallest coherent blast radius and no contract/schema migration.

## 6. Recommended architecture, data flow, security, and error behavior

### Classifier

In `classifyAnnualOutcome`, preserve validation and empty-set handling. When any failed current annual result lacks `remedialClassMark`, return:

```ts
{
  outcome: 'retained',
  targetGradeLevel: sameGrade,
  deficientSubjectIndexes: failed,
}
```

Existing SRC-present branches remain unchanged.

### Readiness evaluator

Within each learner evaluation:

1. Keep structural and period blockers global.
2. Accumulate source-selection and missing-current-annual blockers in a learner-local annual-evidence array.
3. Add only verified current annual snapshots to `subjectResults` and `annualGradeIds`.
4. If no verified annual snapshot exists, publish the detailed annual-evidence blockers and remain blocked.
5. If at least one exists, discard additional subject-evidence blockers and classify from the verified subset.
6. Only `incomplete` remains a classification blocker; unresolved failures are retained outcomes.

Return this ready message when blockers are empty:

> Good to go. Required period records are finalized and every active learner has at least one current annual subject result.

### Security and errors

- No auth/RBAC change. Existing admin-only routes and transition reauthentication remain.
- Zero-valid-result learners retain detailed source/snapshot blocker messages so repair remains actionable.
- Additional missing subject snapshots intentionally become non-blocking and are not exposed as blockers. The persisted outcome evidence still lists exactly the annual snapshot IDs used.

## 7. Contract, schema, migration, and compatibility changes

- API paths and `success/message/data` envelopes: unchanged.
- `AcademicReadiness` and `AcademicStateImpactPreview`: unchanged.
- `expectedAnnualGrades`: retained for backward compatibility; web no longer labels it as a required fixed threshold.
- Database schema/migrations: none.
- Persisted outcome: existing `retained` enum-compatible string; `annualGradeIds` contains the exact verified subset used.
- Web/mobile compatibility: automatic because both already consume `transitionBlocked`, outcome counters, and blocker arrays.

## 8. Ordered implementation phases with exact owners

### Phase 1 — Test-first backend policy

Owners:

- `backend/src/modules/academic-state/academic-policy.spec.ts`
- `backend/src/modules/academic-state/academic-transition-readiness.spec.ts`

Steps:

1. Change/add classifier assertions for one failure, two failures, and Grade 10 failure without SRC to expect `retained` and same-grade target.
2. Add a readiness fixture where all period records for two subjects are finalized, one subject has a current annual snapshot, and the other lacks its annual snapshot; expect ready status and one consumed annual ID.
3. Add/retain a zero-valid-annual control that remains blocked.
4. Change the existing missing-subject test to prove missing required period records still block, instead of requiring a suppressed annual-source blocker.
5. Run the focused tests and record expected RED failures before production edits.

### Phase 2 — Minimal backend implementation

Owners:

- `backend/src/modules/academic-state/academic-policy.ts`
- `backend/src/modules/academic-state/academic-transition-readiness.ts`

Steps:

1. Map missing-SRC failures to retained in the pure classifier.
2. Buffer annual-evidence blockers and apply them only when the learner has zero valid current annual snapshots.
3. Keep structural/period blockers unchanged.
4. Update the ready message to begin with `Good to go.` and state the non-zero rule.
5. Run the focused backend tests to GREEN.

### Phase 3 — Test-first web copy

Owners:

- `next-frontend/app/(dashboard)/dashboard/admin/system-settings/year-transition/page.test.tsx`
- `next-frontend/app/(dashboard)/dashboard/admin/system-settings/year-transition/page.tsx`

Steps:

1. Add an assertion for the count-free current/finalized rule and absence of `3 annual subject results required`.
2. Run the focused test and record RED.
3. Replace only the status-detail copy; keep backend-driven status and button logic.
4. Run the focused test to GREEN.

### Phase 4 — Policy documentation

Owners:

- `openspec/changes/academic-period-lifecycle/specs/complete-academic-grades/spec.md`
- `openspec/changes/academic-period-lifecycle/specs/safe-academic-transition/spec.md`
- `docs/academic-quarter-lifecycle-and-annual-grading-analysis.md`

Steps:

1. State the non-zero current annual-result threshold.
2. State that missing SRC for a finalized failure produces retained.
3. Preserve documented behavior for SRC-present recomputation, conditional promotion/back subjects, Grade 10 pending completion, source invalidation, and period-record completeness.
4. Run focused contradiction searches and OpenSpec validation if available.

### Phase 5 — Verification and release

Owners: repository root, backend, next-frontend, mobile, GitHub Actions, Railway, live admin preview.

Steps:

1. Run focused backend and web tests.
2. Run backend lint, unit tests, e2e tests, two consecutive builds, and high-signal academic integration/smoke commands available in package scripts.
3. Run frontend lint, typecheck, unit tests, and production build.
4. Run mobile typecheck and tests because mobile consumes the changed readiness behavior; do not package an APK because no mobile build input changed.
5. Run repository/OpenSpec/deployment-gate validators and `git diff --check`.
6. Review the final diff requirement-by-requirement, stage only task files, commit, fetch, inspect every outgoing commit, push to the verified `developement` upstream, and confirm SHA parity.
7. Track the exact pushed SHA through every applicable CI job and downstream Railway workflow; verify provider terminal success and public health.
8. Reload the live Year Transition page read-only. Verify the count-free sentence, `Good to go` status, retained count, and enabled review button if production evidence has not otherwise changed. Do not submit the transition.

## 9. Verification matrix and acceptance criteria

| Requirement | Evidence | Acceptance |
| --- | --- | --- |
| No fixed annual count | Source search + web test | No hardcoded readiness count; UI does not render `3 ... required`. |
| Non-zero valid threshold | Backend evaluator tests | Two expected subjects with all period records finalized and one valid annual snapshot is ready. |
| Zero invalid | Backend evaluator tests | No valid current annual snapshot remains blocked with actionable evidence. |
| Finalization preserved | Backend evaluator tests | Missing/draft/stale period evidence still blocks. |
| Retained outcome | Classifier + evaluator tests | One/two failures without SRC and Grade 10 unresolved failure produce retained, not pending. |
| Official state safety | Transition/service tests | Retained outcome is persisted and not promoted/graduated; existing transaction/auth gates pass. |
| Client compatibility | Frontend tests/build + mobile tests/typecheck | Existing response shape compiles and consumers render retained/ready state. |
| Documentation | OpenSpec/text validation | No active requirement still says missing SRC must block or that every annual subject snapshot is required for transition. |
| Release | GitHub/Railway/live evidence | Exact pushed SHA is green, deployments reach terminal success, health passes, and live preview reflects the new behavior without executing transition. |

## 10. Rollout, rollback, observability, cleanup, and unverified boundaries

- Rollout: normal `developement` push; backend and frontend paths trigger CI and the configured backend-first Railway workflow.
- Rollback: revert classifier, evaluator, web copy/tests, and policy-doc changes together; no data migration is required.
- Observability: use readiness blocker codes, outcome counters, transition audit metadata, exact CI run, Railway deployment status, and read-only live preview.
- Cleanup: no temporary database rows or artifacts; keep generated test reports untracked.
- Unverified until post-deploy: live academic evidence may change between analysis and deployment. If a new blocker appears, report it rather than weakening another safeguard.
- Intentional limitation: no live transition execution or physical-device mobile acceptance; neither is required to prove this backend/web policy change safely.

## Execution checklist

- [x] Backend RED tests prove retained missing-SRC outcomes and the non-zero annual-result threshold.
- [x] Backend classifier/evaluator implementation passes focused tests.
- [x] Frontend RED/GREEN test proves the count-free readiness copy.
- [x] OpenSpec and lifecycle documentation reflect the approved policy.
- [x] Backend, frontend, mobile-consumer, and repository validation gates pass.
- [ ] Scoped diff is committed and pushed to `origin/developement` with exact SHA parity.
- [ ] Exact-SHA CI and Railway deployments reach terminal success.
- [ ] Live read-only Year Transition preview shows the new status/copy without executing transition.
