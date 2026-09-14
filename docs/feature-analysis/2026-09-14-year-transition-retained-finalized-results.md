# Year Transition Retained Finalized-Result Isolation Analysis

## Executive verdict

The Year Transition academic-readiness feature is backend-owned and moderately coupled because the same computed result gates the irreversible transition, drives web and mobile previews, labels learner readiness, persists official year outcomes, and feeds audit metadata.

The reported literal `3` restriction is not present. `expectedAnnualGrades` is computed from active subject assignments in `evaluateTransitionReadiness`, while the admin web page renders that dynamic value with wording that makes it look like a fixed rule. The live 2026-09-14 preview had all `8 of 8` period records finalized; its only blocker was `pending_remediation`.

The requested rule can be isolated without a schema or response-shape change:

1. Keep every required period-record check.
2. Count only current annual snapshots whose sources, fingerprint, components, and official grade verify.
3. Require at least one such annual result per active learner, rather than every assigned subject snapshot.
4. Classify any unresolved finalized failure without SRC as `retained`.
5. Remove the dynamic count from the web sentence and explain the non-zero/current-result rule.

This preserves backend authority and audit evidence but intentionally changes a prior invariant: missing annual snapshots for additional subjects no longer block once a learner has one valid annual snapshot. No additional dependency was found within the inspected scope after focused searches for `evaluateTransitionReadiness`, `classifyAnnualOutcome`, `pending_remediation`, `expectedAnnualGrades`, `promotionReadiness`, and both academic-state endpoints.

## Feature anatomy

### Inbound flows

- `GET /api/academic-state/transition-readiness` exposes the direct admin readiness view.
- `GET /api/academic-state/impact-preview` embeds the same readiness object in the next-year preview.
- `POST /api/academic-state/transition` rebuilds readiness under the academic transaction and refuses execution while `transitionBlocked` is true.
- The web Year Transition page and mobile admin workspace fetch the preview and disable their commit controls from `transitionBlocked`.
- Web audit/recovery, mobile settings overview, and backend section/access-student summaries fetch or reuse the direct readiness result.

### State and side effects

- `AcademicTransitionReadinessService.getReadiness` reads academic state, policy, sections, classes, enrollments, learner profiles, class records/participants, period revisions, external grades, annual source selections, current annual snapshots, remediation results, and back-subject obligations.
- `evaluateTransitionReadiness` is a pure matrix evaluator. It verifies period-record integrity first, verifies annual snapshots, classifies outcomes, and emits blockers plus `studentOutcomes`.
- A successful transition uses those outcomes to update grade levels or graduation, insert immutable `academic_student_year_outcomes` evidence, complete enrollments, archive classes/sections/events, clone next-year structures/content, update academic state, and append an audit record.
- `retained` causes no grade-level/graduation update but is persisted as the official year outcome and counted in audit/preview summaries.

### Variants

- Zero valid annual snapshots remains `incomplete` and blocked.
- One or more valid passing snapshots can produce `promoted` or `graduated`, even if other assigned subject snapshots are absent; this is the explicitly requested non-zero rule.
- One or more valid failed snapshots without SRC becomes `retained`.
- Existing evidenced SRC logic remains: passing recomputation can promote; modern failed SRC can conditionally promote or remain pending completion; legacy failed SRC remains retained.
- Stale/reopened period records, invalid fingerprints, grade-level mismatches, ambiguous memberships, duplicate classes, non-final period state, and target-year conflicts remain blocking unless the non-zero annual rule specifically suppresses additional subject-evidence blockers after one valid snapshot is found.

## Cascade map

| Edge | Provider/interface | Consumer | Effect | Risk | Confidence and evidence | Disposition |
| --- | --- | --- | --- | --- | --- | --- |
| E1 | Web route `/dashboard/admin/system-settings/year-transition` | `academicStateService.getImpactPreview` | Loads preview and derives button state | Direct | Confirmed: `next-frontend/.../year-transition/page.tsx:67-105` | Update copy and tests only |
| E2 | `GET /academic-state/impact-preview` | Web and mobile admin transition workspaces | Returns `promotionReadiness` | Direct | Confirmed: controller `:87-97`; web service `:52-60`; mobile service `:51-59` | Preserve envelope and fields |
| E3 | `GET /academic-state/transition-readiness` | Web audit/recovery, mobile admin screens | Returns direct readiness | Direct | Confirmed: controller `:38-45`; web/mobile academic-state services `:21-26` | Behavior changes automatically; no client contract edit |
| E4 | `AcademicStateService.getTransitionTargets` | Preview, notification and transition paths | Reuses one readiness calculation | Shared | Confirmed: `academic-state.service.ts:141-206` | Keep one backend authority |
| E5 | `AcademicTransitionReadinessService.getReadiness` | Pure evaluator | Batch-loads all evidence under academic transaction | Stateful | Confirmed: `academic-transition-readiness.service.ts:29-224` | No query/schema change |
| E6 | Class-record validation | `finalizedPeriodRecords` and period blockers | Enforces every policy period, trusted current revisions, and roster confirmation | High/direct | Confirmed: `academic-transition-readiness.ts:158-355` | Preserve unchanged |
| E7 | Expected subject map | Annual snapshot validation | Supplies dynamic `expectedAnnualGrades`; not literal three | High/direct | Confirmed: `academic-transition-readiness.ts:411-447,596-599` | Keep metric, stop presenting it as fixed requirement |
| E8 | Annual source selection + fingerprint/component check | `subjectResults` | Decides whether an annual snapshot is current and valid | High/direct | Confirmed: `academic-transition-readiness.ts:447-523` | Buffer subject-evidence blockers; require at least one valid result |
| E9 | `classifyAnnualOutcome` | Transition evaluator | Maps results to promoted/retained/graduated/etc. | High/direct | Confirmed: `academic-policy.ts:247-307`; only production caller found in readiness evaluator | Change missing-SRC failure from pending to retained |
| E10 | `transitionBlocked` | `AcademicStateService.transition` | Prevents or permits irreversible year transition | High/transitive | Confirmed: `academic-state.service.ts:861-912` | Remains authoritative |
| E11 | `studentOutcomes` | Profiles and `academic_student_year_outcomes` | Updates promoted/graduated learners and persists evidence for every outcome | High/persisted | Confirmed: `academic-state.service.ts:929-975`; schema `academic-grading.schema.ts:397-420` | Verify retained learners are not advanced |
| E12 | Outcome counters | Transition audit and API response | Records retained/promoted/etc. counts | Persisted/observability | Confirmed: `academic-state.service.ts:1210-1268` | Retained count increases; no field change |
| E13 | Readiness result | `SectionsService.mapStudentAcademicReadiness` | Maps retained to finalized/failing for access-student views | Transitive | Confirmed: `sections.service.ts:1672-1738` | Expected beneficial propagation; add/retain regression coverage |
| E14 | `promotionReadiness` | Mobile `AdminAcademicScreen` | Shows outcome counts and disables commit when blocked | Transitive | Confirmed: `mobile/src/screens/AdminAcademicScreen.tsx:335-435` | No mobile source change; run mobile checks because behavior is consumed |
| E15 | `AcademicReadiness` types | Web/mobile services and screens | Contract includes blocker/outcome counts and `expectedAnnualGrades` | Compatibility | Confirmed: web `academic-grading.ts:203-228`; mobile `academic-grading.ts:277-302` | Preserve shape; no APK packaging because mobile source is unchanged |
| E16 | OpenSpec and lifecycle analysis | Maintainers/tests | States one/two failures require SRC and all expected subject evidence | Documentation | Confirmed: `openspec/.../complete-academic-grades/spec.md:14-29`; `docs/academic-quarter-lifecycle-and-annual-grading-analysis.md:71-87` | Update to the approved retained/non-zero rule |
| E17 | CI workflows | Pushed backend/frontend/docs change | Runs backend unit/e2e/migration, frontend, mobile, AI/security gates, then Railway deployment | Operational | Confirmed: `.github/workflows/ci.yml`; `.github/workflows/railway-deploy.yml` | Run local affected gates, then correlate exact pushed SHA through CI and Railway |

## Isolation and ordered cuts

### Cut 1 — Domain outcome policy

References E9–E13. Change the pure classifier so any failed current annual result lacking a remedial mark yields `retained` with the same grade level. Keep empty sets `incomplete`, and keep evidenced SRC outcomes unchanged.

- Prerequisite: red tests for Grades 7–9 and Grade 10.
- Validation: focused academic-policy and transition-readiness specs.
- Rollback: restore the prior `pending_remediation` branch and tests.

### Cut 2 — Non-zero annual evidence threshold

References E5–E8. Accumulate subject-level annual-source/snapshot blockers separately. If at least one verified annual snapshot is collected, classify from that valid subset and do not block on additional subject annual-snapshot absence. If none is valid, retain detailed blockers and block.

- Prerequisite: fixtures with every period record finalized, one valid annual snapshot, one missing additional annual snapshot, and a zero-valid-snapshot control.
- Compatibility: keep `expectedAnnualGrades` as an informational dynamic metric.
- Validation: prove missing period records still block even when one annual snapshot exists.
- Rollback: push subject-level blockers immediately as before.

### Cut 3 — Web explanation

References E1–E3 and E15. Replace `N annual subject results required` with a count-free statement explaining that each active learner needs at least one current finalized annual subject result. Keep status color/message and button state backend-driven.

- Validation: a page test must fail on the old copy, then pass with the new copy and assert the fixed-looking string is absent.
- Rollback: restore the old sentence; no backend rollback dependency.

### Cut 4 — Normative documentation

References E16. Update the existing OpenSpec requirement and lifecycle analysis so they no longer claim unresolved one/two-subject failures block transition and so they state the approved retained outcome plus non-zero rule.

- Validation: focused text search for contradictory active statements and OpenSpec validation if available.
- Rollback: restore the previous policy text together with Cut 1 and Cut 2.

## Improvements

Required decoupling is limited to buffering annual-evidence blockers before applying the non-zero threshold. Optional enhancements are deliberately excluded from this release except for these evidence-backed follow-ups:

1. A future contract could add `verifiedAnnualGrades` beside `expectedAnnualGrades` for transparent preview counts.
2. A future audit view could show suppressed missing-subject evidence as non-blocking warnings rather than losing operational visibility.
3. A future policy version could store the non-zero/retained rule explicitly instead of encoding it in the classifier.

## Uncertainty and coverage boundary

- The requested rule intentionally permits promotion/graduation from a partial valid annual subject set; this consequence follows directly from the approved non-zero threshold and existing classifier behavior.
- No live transition will be executed for verification because it archives the current academic year and mutates official records. Live acceptance is limited to read-only preview evidence after deployment.
- The focused consumer search covered repository source, tests, OpenSpec, documentation, CI, and the live admin page. Generated output, dependencies, build artifacts, and unrelated subsystems were excluded.
