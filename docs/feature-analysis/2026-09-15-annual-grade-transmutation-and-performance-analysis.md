# Annual Grade Transmutation and Performance Analyze Isolation Analysis

**Date:** 2026-09-15

**Decision:** Direction A approved by the user on 2026-09-15

**Authority boundary:** Evidence, root-cause isolation, and redesign planning only. This phase changed no product code, configuration, schema, dependencies, production data, git history, or deployment state. Read-only production queries were used to verify both reported failures.

**Scope assumption:** The active admin Transmutation Table must govern the **official annual grade for the active school year**, after the average of the complete official quarter grades is rounded half-up. Quarterly grade evidence and closed-year history remain immutable. The two reported defects share a release but not an implementation seam.

## 1. Executive verdict

### Teacher class record annual grade

- **Confirmed root cause 1 — the annual function stops after averaging and rounding.** `calculateAnnualGrade` sums the complete quarter grades, divides by the policy period count, rounds half-up, and assigns that value directly to `officialGrade`. It never resolves the rounded average through an active transmutation band (`backend/src/modules/academic-state/academic-policy.ts:196-232`).
- **Confirmed root cause 2 — the active admin table is not part of annual-grade state.** Existing school-year policy rows are returned unchanged. The active table is copied only while initializing a previously absent **legacy** policy; the active 2027-2028 `zero_based` policy contains zero transmutation bands (`academic-policy.service.ts:45-83`).
- **Confirmed root cause 3 — table activation has no annual-grade consumer.** `applyTable` and `activateTableById` switch `transmutation_tables.is_active` and clear an in-memory cache, but do not invalidate, version, or refresh any `subject_annual_grades` row (`transmutation.service.ts:361-431`).
- **Confirmed stale-fingerprint cause.** Annual idempotency hashes only `{ policy, components }`. Because the active table is absent from both, changing it cannot make an annual snapshot stale (`annual-grades.service.ts:136-215`). Transition readiness repeats the same table-blind hash and arithmetic (`academic-transition-readiness.ts:481-505`).
- **Confirmed production reproduction.** For class `79fd129d-1e57-4684-b6f3-cf14dd8bd080`, production has active school year 2027-2028/Q4 and active table `TRANSMUTATION TABLE NEW`. The current annual evidence is Q1 98, Q2 96, Q3 85, Q4 70: sum 349, divisor 4, raw average 87.25, stored official grade 87. The active table maps rounded 87 to 89. The annual row was computed after that table became active, proving this is not merely an old stale row.
- **Frontend disposition.** `AcademicAnnualSummary` displays the backend’s stored `officialGrade` and arithmetic; it performs no competing calculation (`next-frontend/src/components/teacher/class-record/AcademicAnnualSummary.tsx:99-207`). The wrong displayed value is therefore a backend contract defect. The UI should be clarified to show `raw average → rounded average → active-table official grade` and the table snapshot used.
- **Recommendation:** Direction A: preserve the frozen school-year policy for quarterly calculations, add an exact active-table snapshot to each active-year annual-grade version, include it in calculation and fingerprinting, and version active-year annual rows whenever the table changes. Closed years, finalized quarter revisions, raw scores, and source selections remain unchanged.

Coupling is **high but bounded**: annual results feed remediation, back-subject decisions, transition readiness, web/mobile class-record views, and exports. A display-only patch would leave official state inconsistent.

### Teacher Performance “Analyze”

- **Confirmed root cause — invalid PostgreSQL generated SQL.** The concept-mastery upsert interpolates Drizzle column objects in both target and `EXCLUDED` expressions. Drizzle compiles the current expression as `GREATEST("student_concept_mastery"."evidence_count", EXCLUDED."student_concept_mastery"."evidence_count")`. PostgreSQL rejects the target-table qualification inside `ON CONFLICT DO UPDATE` with `invalid reference to FROM-clause entry for table "student_concept_mastery"` (`backend/src/modules/performance/performance.service.ts:1463-1480`).
- **Confirmed data/schema exclusions.** Production has the required unique index on `(student_id, class_id, concept_key)`, zero duplicate key groups, and valid rows. An `EXPLAIN` using unqualified `evidence_count` and `excluded.evidence_count` succeeds and selects the intended conflict arbiter. The failure is not a missing migration, duplicate concepts, excessive concept length, or AI-service outage.
- **Confirmed supplied-flow reproduction.** The two latest `performance_diagnostics` jobs for the supplied class/student are `failed` and store the same failed insert prefix. PostgreSQL logs identify the invalid target-table reference for both student and whole-class batch sizes.
- **Confirmed error-leak path.** The async worker stores `error.message`; the status endpoint returns it; the page passes it directly to `toast.error`, which is why a teacher sees a raw multi-row SQL statement (`performance.service.ts:1554-1620,1696-1725`; `next-frontend/.../teacher/performance/page.tsx:786-823`).
- **Recommendation:** keep the existing atomic upsert and merge semantics, but use static unqualified PostgreSQL identifiers in its `GREATEST`/`LEAST` expressions. Add a query-compilation regression test and return a stable teacher-facing failure message while retaining a bounded server log for diagnosis.

Coupling is **low**. The repair is local to the performance diagnostic’s auxiliary mastery upsert and its error boundary. It must not change performance scoring, official class-record calculation, AI generation, enrollment checks, or other `student_concept_mastery` consumers.

## 2. Feature anatomy and flow

### Current annual-grade path

```text
Admin activates table
  -> transmutation_tables active row + cache clear
  -> no annual invalidation or refresh

Teacher finalizes Q1-Q4 / admin changes an annual source
  -> AnnualGradesService.refreshForClass
  -> select complete authoritative period components
  -> fingerprint(base school-year policy + components)
  -> average -> half-up round -> officialGrade
  -> versioned subject_annual_grades row + audit
  -> teacher web/mobile views and transition readiness
```

`subject_annual_grades` already preserves versions with `is_current`, `invalidated_at`, an invalidation reason, source components, a policy JSON snapshot, and the source fingerprint (`backend/src/drizzle/schema/academic-grading.schema.ts:238-286`). This is the correct state owner; no destructive rewrite is needed.

### Proposed annual-grade path

```text
Frozen quarter policy + complete official Q1-Q4 evidence
  -> raw annual average
  -> half-up whole-number rounded average
  -> exact active admin table snapshot
  -> transmuted official annual grade
  -> fingerprint(quarter policy + table snapshot + components)
  -> immutable new annual version + audit
```

Activating or applying a table becomes one governed academic mutation: validate the candidate bands, switch the active record, version current annual rows for the active school year, and return an impact summary. A failure rolls back the complete action. Closed-year annual versions are never included.

### Current performance-analysis path

```text
Teacher Analyze
  -> POST performance analysis job
  -> detached backend job
  -> collect incorrect responses and concept evidence
  -> bulk upsert student_concept_mastery
  -> PostgreSQL rejects qualified ON CONFLICT expression
  -> job status failed with raw SQL in error_message
  -> status polling displays raw SQL toast
```

The mastery table is analytical support state. The unique key and `GREATEST`/`LEAST` intent make the operation idempotent across repeated analyses: evidence/error counts do not decrease and mastery does not improve merely because a smaller sample is rerun. That semantic must remain frozen.

## 3. Frontend decision ledger

| Keep | Change | Frozen | Unknown |
|---|---|---|---|
| Existing teacher routes/tabs, annual table, history disclosure, active-table preview, Analyze buttons, polling/result panels, GABHS teacher/admin visual system | Annual formula explanation and table provenance; table-activation consequence/confirmation/result copy; disabled apply for invalid bands; concise performance failure with retry | Roles, route parameters, Q1-Q4 evidence, source repair procedures, class performance scoring, selected-student scope, AI availability checks, navigation | Exact post-fix authenticated browser appearance until deployed; production-wide active-year annual count at the moment of activation |

No HTML mockup is required: the redesign changes state communication and confirmation within existing components, not page structure or navigation.

## 4. Design directions

### Direction A — active-year, audit-preserving annual transmutation (**recommended**)

Keep quarterly policy snapshots frozen. Add an annual-only active-table snapshot to the annual policy evidence, calculate `average → round → transmute`, and version all current annual rows in the active year when an admin switches tables. Add clear before/after/impact language in the existing admin and teacher surfaces. Fix Analyze at the SQL expression and public error boundary.

This directly satisfies the requested calculation while retaining source evidence and rollback history. It is the only option that keeps annual reads, exports, remediation, and transition readiness on one persisted answer.

### Direction B — transmute only while rendering

Leave stored annual grades at 87 and have web components display 89 by applying the active table client-side. This is smaller but creates two official values: exports, mobile, remediation, transition readiness, and audits would still use 87. **Rejected.**

### Direction C — overwrite the frozen academic-year policy

Replace `academic_year_policies.policy.transmutationBands` whenever the admin activates a table, then reuse that policy everywhere. This can silently alter quarterly calculation rules and historical readiness for the entire year, including modern `adjusted_2026`/`zero_based` behavior. **Rejected.**

For the performance upsert, the analogous rejected alternatives are select-then-insert/update (race window) and unconditional `excluded` replacement (changes the current monotonic merge contract).

## 5. Cascade map

| Edge | Provider / interface | Consumer | Effect | Risk | Confidence | Evidence | Disposition |
|---|---|---|---|---|---|---|---|
| A1 | Admin `/class-record/transmutation/apply` and `/activate/:id` | `TransmutationService` | Selects the active table | Direct/high | Confirmed | controller `:75-102`; service `:361-431` | Keep routes; add validation, transaction, refresh summary |
| A2 | `transmutation_tables` active row | Quarterly computation cache | Supplies legacy/custom bands | Stateful/high | Confirmed | `transmutation.service.ts:87-146`; computation service references | Preserve quarterly behavior |
| A3 | Active table | `AcademicPolicyService.forYear` | Copied only during absent legacy-policy initialization | Stateful/high | Confirmed | `academic-policy.service.ts:45-83` | Do not mutate frozen base policy; add annual-only snapshot seam |
| A4 | Complete period revisions/external grades | `selectAnnualSources` | Chooses authoritative Q1-Q4 components | Stateful/critical | Confirmed | `annual-grades.service.ts:80-169` | Keep unchanged |
| A5 | `calculateAnnualGrade` | annual service + transition readiness | Currently average/round only | Direct/critical | Confirmed | `academic-policy.ts:196-232`; Serena reference search | Extend with explicit annual snapshot |
| A6 | `{ policy, components }` fingerprint | annual idempotency | Cannot detect table change | Stateful/critical | Confirmed | `annual-grades.service.ts:171-184` | Include normalized table snapshot |
| A7 | Same fingerprint/calculation | transition readiness | Rejects stale/mismatched annuals before rollover | Transitive/critical | Confirmed | `academic-transition-readiness.ts:481-521` | Use same canonical helper/context |
| A8 | `subject_annual_grades` versions | remediation/back-subject/outcome services | Official grade and evidence owner | Stateful/critical | Confirmed | schema `:238-286`; annual service `:218-251,491+` | Preserve old row; invalidate dependents as existing service does |
| A9 | Annual-summary GET | web and mobile annual panels/exports | Reads stored official grade | Contract/high | Confirmed | web/mobile service and type searches | Keep read; add explicit active-year refresh path and additive provenance |
| A10 | `AcademicAnnualSummary` | teacher/admin | Displays official value and pre-round formula | Direct/medium | Confirmed | component `:99-263` | Show rounded value, arrow, table title |
| A11 | Admin table page | admin | Currently promises only future legacy-policy effect; invalid previews can still be applied | Direct/high | Confirmed | admin page `:121-190,321-332,494-615` | Correct scope copy, confirmation, invalid-state block, result count |
| A12 | Mobile annual panel/export | mobile users | Consumes same backend official grade | Contract/medium | Confirmed | `mobile/src/types`, API, panel, export search | Behavior follows backend; mirror additive type only, no mobile redesign |
| P1 | Teacher Analyze button | performance job endpoint | Creates student/class-scoped async job | Direct | Confirmed | web page `:866-890`; service `:1623-1693` | Keep |
| P2 | Incorrect responses/concept extraction | `masteryRows` | Produces one row per student/class/concept map key | Stateful | Confirmed | performance service `:1270-1461` | Keep |
| P3 | Drizzle bulk insert with current conflict SQL | PostgreSQL | Compiles illegal table-qualified target/EXCLUDED columns | Direct/critical | Confirmed | service `:1463-1480`; local `PgDialect` compile; production log | Replace expression only |
| P4 | Unique index | upsert arbiter | Correct conflict identity exists | Stateful | Confirmed | schema `rag.schema.ts:139-164`; production catalog query | Keep |
| P5 | mastery rows | LXP/admin analytics | Auxiliary learning-gap consumers | Transitive/medium | Confirmed | repository consumer search | Preserve schema and monotonic semantics |
| P6 | caught worker error | job status API | Stores full Drizzle query text | Async/security | Confirmed | service `:1554-1620,1696-1725` | Log bounded technical context; publish stable message |
| P7 | page polling | teacher toast | Displays `errorMessage` verbatim | Direct/medium | Confirmed | page `:786-823` | Show stable actionable error/retry state |
| P8 | performance specs/page tests | CI | Scope query and happy path covered; SQL validity is not | Operational/high | Confirmed | existing tests around service `:988+` and page job mocks | Add compile and failed-job UI tests |

## 6. Isolation, implementation seams, and rollback

### Annual-grade seam

1. Add a pure annual transmutation snapshot/calculation/fingerprint contract beside current academic policy functions. Characterize `87.25 → 87 → 89` before implementation.
2. Resolve one active-table snapshot through an academic-policy-owned provider. Preserve the base year policy used by quarterly calculations.
3. Make annual creation and transition readiness use the same snapshot and fingerprint helper. This prevents service/readiness drift.
4. When applying/reactivating a table, validate that every rounded integer 0-100 resolves to exactly one legal band, then version only current annual rows whose `school_year` equals the authoritative active year. Reuse existing dependent-evidence invalidation and audit seams.
5. Reconcile the targeted existing row through an explicit active-year annual refresh and verify 89. Never directly update its `official_grade` in place.

Rollback: revert the code and reactivate the prior table if an admin table switch caused the incident. Existing prior annual versions remain available and can be restored through the same versioned calculation path; no quarter evidence or closed-year row is deleted.

### Performance seam

1. Add a RED test compiling the current conflict expressions and proving the illegal qualification.
2. Replace only the three conflict expressions with static unqualified target/`excluded` identifiers. Preserve target columns, batch insert, timestamps, and max/max/min merge rules.
3. Add a service test proving both student-scoped and class-scoped diagnostic builds execute the same valid upsert shape.
4. Sanitize the status response/page failure while logging job ID and bounded database cause server-side.

Rollback: revert the performance expression/error-boundary commit. No migration or data cleanup is required; failed jobs are historical, and the eight existing mastery rows are valid.

## 7. Improvements

### Required decoupling

- Separate the frozen quarterly academic-year policy from the mutable active-table snapshot used specifically for annual official grades.
- Centralize annual calculation plus fingerprint construction so refresh and transition readiness cannot diverge.
- Separate internal async-job diagnostics from teacher-facing error text.

### Optional evidence-backed enhancements

1. Show the exact annual arithmetic and table title in history rows, not only for the current value.
2. Return an activation summary with `schoolYear`, `evaluated`, `changed`, `unchanged`, and `blocked` counts.
3. Add a guarded admin retry action when annual re-evaluation fails; never leave the table switch partially committed.
4. Add a school-sized opt-in activation test using the existing 9,600-annual-row fixture.

## 8. Uncertainty and coverage boundary

- **Unverified:** authenticated post-fix browser behavior and responsive appearance until Direction A is deployed.
- **Unverified:** the number of current active-year annual rows at the future activation moment; it is operational data and must be measured in the activation response, not hard-coded from this investigation.
- **Confirmed coverage boundary:** source/reference searches covered table apply/activation, academic policy initialization, annual calculation/versioning/readiness, web and mobile annual consumers, performance job creation/execution/status, mastery schema/consumers, and focused tests. Production verification was read-only. **No additional dependency was found within the inspected scope.**

## Approval gate

Direction A is recommended but not yet approved for this request. Implementation must not begin until the user approves the annual policy boundary: active-year annual grades use the active table after rounding, while quarterly evidence and all closed-year annual versions remain frozen.
