# Class Record Excused Manual Score Implementation Plan

Date: 2026-09-16
Status: Approved for implementation and release by the user
Evidence source: [`../feature-analysis/2026-09-16-class-record-excused-manual-score-analysis.md`](../feature-analysis/2026-09-16-class-record-excused-manual-score-analysis.md)

## 1. Decision summary and feature brief

Add a third class-record score disposition, `excused_with_score`, to the shared admin/teacher workbook. It records a teacher-entered numeric score and a required excuse reason, counts the score against the item’s full HPS, remains visibly excused in web/mobile/exports, and cannot be overwritten by linked-assessment synchronization.

User-facing choices:

1. **Recorded score** — ordinary numeric score; existing behavior.
2. **Excused without score** — reason required; item and HPS excluded for that learner; existing behavior.
3. **Excused with manual score** — numeric score and reason required; score and HPS count; new behavior.

The implementation will use the existing `class_record_scores.score`, `status`, and `reason` columns. A new column is unnecessary. A new constraint migration is required because the database currently rejects every excused row with a numeric score.

## 2. Scope, non-goals, permissions, and assumptions

### In scope

- Backend score-state contract, validation, persistence, grade calculation, readiness, linked-assessment synchronization, audit invariant, and performance recomputation compatibility.
- Shared admin/teacher web workbook editor, grade grid, filters, accessibility text, typed API contract, and spreadsheet export.
- Shared admin/teacher mobile workbook editor, workbook display, typed API contract, and CSV export.
- Drizzle schema and one linear migration after current migration `0032_user_notification_dismissal`.
- Regression tests, repository-required builds/lint/typechecks, Android APK packaging, download-manifest integration, commit, push to `developement`, exact-SHA CI/Railway observation, live health, and served APK verification.

### Non-goals

- No automated formula for choosing the manual score; the authorized teacher/admin supplies it.
- No document upload or attachment requirement.
- No change to category weights, transmutation, annual-grade policy, or current no-score exemption semantics.
- No direct AI-service changes.
- No production data edits outside the normal migration and user-triggered score workflow.

### Permissions

The user explicitly authorized planning, implementation, tests, affected APK packaging, commit, push, CI/CD observation, and final release evidence through `feature-impact-planner` followed by `finish-and-ship`.

### Assumptions

- `0` is valid for `excused_with_score` because ordinary scores permit `0..HPS`; the reason still distinguishes it from an ordinary zero.
- Bonus points are rejected for `excused_with_score` in the first release. This avoids stacking a special disposition and bonus adjustment.
- Both Teacher and Admin retain the current authorization model: admin access plus teacher class ownership, active academic-period capability, eligible learner, and draft workbook.
- Scored exemptions may intentionally override linked-assessment evidence, so sync/readiness must preserve them just like current no-score exemptions.

## 3. Current-state evidence ledger

| Finding | Status | Evidence | Implementation consequence |
|---|---|---|---|
| Admin and teacher web routes share one workbook component/hook | Confirmed | Analysis §1 and cascade E1-E3 | Implement the web editor once and route-test both entry points |
| Current UI has exactly two score choices | Confirmed | `TeacherClassRecordWorkbook.tsx:832-849` | Add one third, explicit choice |
| Current excused state is `score=null`, not zero | Confirmed | `class-record.service.ts:997-1047`; calculation test | Preserve this behavior without conversion |
| Current DB check permits only recorded or scoreless excused rows | Confirmed | `class-record.schema.ts:152-187`; migration 0017 | Generate migration 0033 to replace the check |
| Linked assessment sync skips only `excused` | Confirmed | `class-record-sync.service.ts:139-157`; readiness `:177-209` | Treat both excused states as intentional overrides |
| Web/mobile types, displays, filters, and exports know only two persisted states | Confirmed | Analysis E10-E12 | Update every typed consumer in the same change |
| Score writes already audit values and enqueue performance recomputation | Confirmed | Analysis E13 | Preserve event shape; verify new canonical grade reaches projection |
| Current focused suites pass | Confirmed | Analysis §4 validation | Use as baseline; new tests must fail before product edits |
| Formal school formula for determining the credited score | Unverified | Analysis §6 | System records the decision; it does not invent a formula |

## 4. End-to-end impact and consumer map

```text
Admin/Teacher Web                     Admin/Teacher Mobile
  shared workbook modal                 AcademicWorkbook actions
             |                                  |
             +---------- RecordScoreDto --------+
                                |
                 POST /class-record/items/:itemId/scores
                                |
              validation + ownership + academic gates
                                |
            class_record_scores (score/status/reason)
                    |                 |                  |
             calculation       readiness/sync      audit event
                    |                 |                  |
          preview/finalization    preserve override   BullMQ performance
                    |
      immutable revision -> annual grade -> reports/exports
```

Direct owners and consumers are enumerated in analysis cascade map E1-E13. The implementation must keep that map synchronized; a newly discovered direct consumer is added to both documents before editing it.

## 5. Conflicts, invariants, risks, and design options

### Preserved invariants

- Missing, explicit zero, no-score exemption, and scored exemption remain distinguishable.
- No score may exceed HPS; official percentages remain bounded by the existing canonical score contract.
- Finalization remains fail-closed on missing or invalid evidence.
- Linked assessment synchronization cannot silently replace an explicit exemption decision.
- Every official score write retains actor, reasoned evidence, audit metadata, and after-commit performance recomputation.
- Historical finalized revisions and old `excused` rows are unchanged.

### Options considered

| Option | Advantages | Conflicts / risks | Decision |
|---|---|---|---|
| A. New status `excused_with_score` | Explicit semantics; filterable/auditable; reuses current columns; old mobile shows the numeric value | Requires contract and DB constraint expansion | **Selected** |
| B. Store as `recorded` plus `reason` | No new status or migration | Loses machine-readable excuse state; ordinary sync can overwrite it; filters/exports misclassify it | Rejected |
| C. Add a separate disposition column | Most normalized long-term model | Larger migration and response change; duplicates current status meaning; unnecessary for three states | Rejected for this release |

### Highest risks

1. **Denominator drift:** accidentally treating the new state like scoreless `excused` would inflate or erase the intended score.
2. **Synchronization overwrite:** linked assessments could replace the manual score unless both sync and readiness use the shared exemption helper.
3. **Client drift:** web, mobile, and exports could disagree about the unknown status.
4. **Migration rollback:** old constraints cannot be restored while new-state rows exist.
5. **Stale mobile artifact:** mobile source changes require a newly versioned APK and matching public manifest.

## 6. Recommended architecture, data flow, security, and errors

### Backend domain seam

Create `backend/src/common/contracts/class-record-score-status.ts` as the pure shared owner of:

```ts
export const CLASS_RECORD_SCORE_STATUSES = [
  'recorded',
  'excused',
  'excused_with_score',
] as const;
export type ClassRecordScoreStatus =
  (typeof CLASS_RECORD_SCORE_STATUSES)[number];
export const isExcusedScoreStatus = (status: string) =>
  status === 'excused' || status === 'excused_with_score';
export const excludesItemFromGrade = (status: string) => status === 'excused';
```

DTO validation, service persistence, calculation, readiness, sync, and schema typing consume this owner where TypeScript permits. SQL constraints and cross-package client unions mirror its three literal values and are protected by contract tests.

### Write flow

For `excused_with_score`:

1. Require finite `score` in `0..item.maxScore`.
2. Require trimmed `reason` with the existing 2,000-character limit.
3. Require `bonusPoints` to be zero/omitted and clear `bonusReason`.
4. Allow either manual workbook items or linked-assessment items.
5. Persist `sourceAttemptId = null` to identify the row as an explicit manual decision.
6. Reuse current `class_record.scores.bulk_recorded` audit event with values plus add explicit `scoreDisposition: 'excused_with_score'` metadata only if needed for clarity; do not rename existing audit actions.
7. Emit the unchanged after-commit score-updated event.

### Read and calculation flow

- Only `excused` excludes score and HPS.
- `recorded` and `excused_with_score` both validate and calculate the bounded numeric score.
- Spreadsheet response preserves the new status, numeric raw/effective score, and reason.
- Readiness and assessment sync regard both excused states as explicit overrides.

### Security and authorization

Keep the existing controller roles, ownership checks, `assertEditable`, academic capability check, roster eligibility check, and transaction/audit boundaries unchanged. The third option must not create a bypass route or `force` flag.

### Error behavior

- Missing reason: `Excused scores require a reason`.
- Scoreless scored-excuse: `Excused scores with manual credit require a numeric score`.
- Out of range: reuse `Recorded score must be between 0 and max score of <HPS>` with wording generalized to `Scored entries...`.
- Bonus supplied: `Excused scores with manual credit cannot include bonus points`.
- Unknown status: DTO rejects it before service execution; DB check remains the final guard.
- Stale/finalized/closed-period/ineligible/not-owner cases retain current errors.

## 7. Contract, schema, migration, and compatibility changes

### Request/response contract

Expand persisted/request status unions from:

```ts
'recorded' | 'excused'
```

to:

```ts
'recorded' | 'excused' | 'excused_with_score'
```

Expand response-only `scoreStatuses` similarly while retaining `missing`.

### Database migration

Generate `backend/drizzle/0033_class_record_excused_with_score.sql` and its Drizzle journal/snapshot entries from the updated schema. Replace `class_record_score_status_valid` with three branches:

- `recorded`: non-null nonnegative score; nonnegative bonus; bonus reason when bonus is positive.
- `excused`: null score; zero bonus; nonblank reason.
- `excused_with_score`: non-null nonnegative score; zero bonus; nonblank reason.

The service and grade-invariant audit enforce `score <= item.max_score`, because the row-level check cannot reference the joined item HPS.

### Compatibility

- Existing rows remain valid; no backfill.
- Current older mobile builds fall through to numeric display for the new state, so the grade remains visible but the excuse label is absent until update.
- Web deploy and new APK deliver full labels and edit support.
- The API envelope and endpoint paths do not change.

## 8. Ordered implementation phases and exact owners

### Phase 1 — RED backend contract and domain tests

- [x] Extend `backend/src/modules/class-record/class-record-calculation.spec.ts` with scored-excuse inclusion and reason validation expectations.
- [x] Extend `backend/src/modules/class-record/class-record-sync.service.spec.ts` to prove sync preserves both excused states.
- [x] Extend `backend/src/modules/class-record/class-record-readiness.service.spec.ts` to prove scored exemptions bypass pending sync but count as complete evidence.
- [x] Extend `backend/src/modules/class-record/class-record.service.performance.spec.ts` with valid and invalid single-score payloads and unchanged event emission.
- [x] Run those tests and record the expected failures caused by missing `excused_with_score` support.

### Phase 2 — GREEN backend contract, calculation, and persistence

- [x] Create `backend/src/common/contracts/class-record-score-status.ts`.
- [x] Modify `backend/src/modules/class-record/DTO/record-score.dto.ts` to consume the shared literal list and require a score for both scored states.
- [x] Modify `backend/src/modules/class-record/class-record.service.ts` for state-specific validation/persistence and numeric spreadsheet projection.
- [x] Modify `backend/src/modules/class-record/class-record-calculation.ts`, `class-record-readiness.service.ts`, and `class-record-sync.service.ts` to use the shared predicates.
- [x] Modify `backend/src/drizzle/schema/class-record.schema.ts` and `backend/src/modules/academic-state/grade-invariant-audit.service.ts`.
- [x] Generate migration `0033_class_record_excused_with_score` with Drizzle metadata; inspect SQL and run `npm run check:migrations`.
- [x] Run the Phase 1 backend suites to GREEN.

### Phase 3 — RED/GREEN shared web workbook

- [x] Extend `TeacherClassRecordWorkbook.test.tsx` with the third option, required score/reason, submitted payload, and linked-assessment override behavior; verify RED.
- [x] Extend `class-record-visuals.test.ts` and `academic-workbook-export.test.ts` for combined filtering and exported score/status/reason; verify RED.
- [x] Modify `next-frontend/src/types/class-record.ts`, `src/hooks/use-teacher-class-record.ts`, `TeacherClassRecordWorkbook.tsx`, `TeacherClassRecordGradeGrid.tsx`, `class-record-visuals.ts`, module CSS, and `academic-workbook-export.ts`.
- [x] Show `Excused · <score>/<HPS>` with accessible reason context; preserve `Excused` for scoreless exemptions.
- [x] Run focused web suites to GREEN.

### Phase 4 — RED/GREEN mobile parity

- [x] Extend `mobile/src/components/academic/__tests__/academic-workbook.test.tsx` for the scored-excuse action and payload; verify RED.
- [x] Extend `mobile/src/lib/__tests__/academic-workbook-export.test.ts` for score/status/reason; verify RED.
- [x] Modify `mobile/src/types/class-record.ts`, `mobile/src/components/academic/AcademicWorkbook.tsx`, `mobile/src/components/teacher/MobileClassRecordWorkbook.tsx`, and `mobile/src/lib/academic-workbook-export.ts`.
- [x] Run focused mobile suites and `npm run typecheck` to GREEN.

### Phase 5 — Migration, lifecycle, and cross-surface verification

- [x] Run backend focused suites, `test:grade-migration`, `test:academic`, lint, build, unit tests, and E2E.
- [x] Run web focused suites, full tests, typecheck, lint, build, and shared admin/teacher workbook acceptance tests. Authenticated browser credentials were not available for a seeded role login.
- [x] Run mobile focused suites, full tests, typecheck, `test:release`, and generated-editor verification.
- [x] Verify the acceptance example HPS 20 / score 18 / reason `Winner of the Division Science Fair` across calculation, response, UI text, export evidence, finalization, and performance projection tests.
- [x] Reconcile the final diff with analysis E1-E13 and update both documents if ownership changed.

### Phase 6 — Android packaging and download integration

- [x] Bump current native version `0.1.42` / versionCode `43` to `0.1.43` / versionCode `44`, run `npm run release:prepare`, and add release notes for scored exemptions.
- [x] Build the ARM64 release APK with the production API URL using the established Gradle flow.
- [x] Run `ANDROID_HOME=/home/jethro/Android/Sdk npm run release:verify`, archive/signature/alignment checks, and record size/SHA-256.
- [x] Verify `next-frontend/public/downloads/nexora-student-mobile-release.apk` and `.json` match the built artifact and update-policy tests.

### Phase 7 — Review, commit, push, and observe

- [ ] Confirm only task-owned changes, run `git diff --check`, inspect outgoing commits, and fetch/reconcile `origin/developement` without force push.
- [ ] Commit the complete change with the analysis and plan; record the full SHA.
- [ ] Push `developement`; verify local/upstream divergence is `0 0` and remote contains the exact SHA.
- [ ] Watch exact-SHA GitHub CI to terminal success; inspect all job conclusions.
- [ ] Correlate the Railway workflow/deployments with the CI-tested SHA and wait for backend, frontend, and AI deployment success.
- [ ] Verify live/ready health, public web route, served APK/manifest byte and SHA equality, and version-check behavior for previous/current build codes.
- [ ] Record limitations honestly; physical-device acceptance is separate and cannot be claimed without an attached device and completed flow.

## 9. Verification matrix and acceptance criteria

| Requirement | Primary proof | Required result |
|---|---|---|
| Third choice exists for admin/teacher web | Workbook component tests and route reuse | Option visible and enabled only under existing grade permissions |
| Manual score + excuse is saved | Hook/service/backend tests | `score`, `status=excused_with_score`, and trimmed `reason` persist |
| Grade math is correct | Calculation/readiness/finalization tests | Score and full HPS count; no blocker for valid entry |
| Old exemption behavior is unchanged | Existing + regression calculation tests | Null score and HPS remain excluded |
| Linked assessment cannot overwrite | Sync/readiness tests | Both excused states are preserved |
| Invalid combinations are rejected | DTO/service/migration tests | Missing reason/score, bonus, overflow, and unknown status fail |
| Web/mobile display and filter agree | Component tests | Numeric score and excused label appear; combined Excused filter finds both |
| Exports retain evidence | Web/mobile export tests | Period value is readable; evidence row has numeric score, status, reason |
| Audit/performance side effects survive | Service/event/performance tests | Event emitted and canonical projected grade updated |
| Database upgrade is safe | Fresh/upgrade migration gates | Existing rows valid; new valid row accepted; invalid rows rejected |
| Release is real | Exact-SHA CI/Railway/live checks | All required runs/deployments terminal-success and live bytes match |

Feature acceptance is complete only when all rows above are proven for the final pushed SHA and final APK inputs.

## 10. Rollout, rollback, observability, cleanup, and unverified boundaries

### Rollout

Deploy the additive database constraint and backend/web/mobile support together through the existing CI-triggered Railway workflow and APK manifest registration. No feature flag is needed because old rows remain valid and clients that do not write the new state continue unchanged.

### Rollback

- If no `excused_with_score` row exists, revert app code then restore the old constraint.
- If rows exist, stop new writes; transactionally convert them to `recorded` while retaining numeric score and reason in audit evidence; verify official grades are unchanged; then restore the old constraint.
- Never apply the old constraint while incompatible rows exist.

### Observability

- Existing audit records show actor, item, learner, score, status, and reason.
- Existing `class-record.scores.updated` and performance queue logs expose downstream recompute failures.
- `grade:audit` must count unknown/invalid disposition combinations.
- CI migration jobs on PostgreSQL 16 and 18, Railway deployment logs, health endpoints, APK manifest/hash, and updater responses provide release evidence.

### Cleanup

- No historical data cleanup or backfill.
- No temporary compatibility status after the new APK is released.
- Remove only local test/build logs not tracked by the repository; keep analysis, plan, migration, tests, and release artifacts.

### Unverified boundaries

- The school’s policy for deriving the credited score remains external; the implementation records but does not calculate that decision.
- Physical Android-device behavior remains unverified until an actual device is attached and the role-authenticated flow is completed.

## Self-review

- [x] Analysis E1-E13 are covered by phases and verification rows.
- [x] Backend source of truth precedes client changes.
- [x] Web, mobile, exports, migration, audit, async recomputation, APK, CI, and deployment consumers are included.
- [x] Existing no-score exemptions and historical rows are preserved.
- [x] Error paths, compatibility, rollout, and rollback are explicit.
- [x] No placeholder, unrelated refactor, or unapproved policy formula remains.
