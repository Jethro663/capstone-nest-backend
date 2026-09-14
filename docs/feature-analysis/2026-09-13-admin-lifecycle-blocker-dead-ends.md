# Admin Permanent Deletion, Bulk Lifecycle, and Class Roster Isolation Analysis

**Revised:** 2026-09-14

**Repository baseline:** `developement` at `ad043f8bf62cca3f4f2d14faeb66876ffea23c69`, equal to `origin/developement` when inspected.

**Scope:** the reported class, section, user, bulk-delete, enrollment, and class-record behaviors across the admin and teacher web surfaces. The shared mobile class-record/enrollment consumers were inspected for contract blast radius.

**Method:** targeted static source, schema, contract, and test analysis plus the exact UI and browser error text supplied by the user. No application code, configuration, dependency, database data, deployment, external system, or Git history was changed.

## Evidence vocabulary

- **Confirmed** — directly supported by the current source, schema, tests, or exact user-observed text.
- **Inferred** — a strongly supported consequence that was not reproduced against live data.
- **Unverified** — requires the failing database rows, an authenticated runtime reproduction, institutional policy, or deployment evidence.
- Effects are classified as **direct**, **transitive**, **operational**, **dormant**, or **uncertain**.

## 1. Executive verdict

There are three active problems, not one:

| Problem | Finding | Severity | Recommended ownership |
|---|---|---:|---|
| Admin cannot permanently delete a used user, class, or section | This is an intentional retained-evidence policy, not a broken button. Letting an admin delete “regardless of history” is a new destructive-erasure feature with a much larger data and compliance boundary. The current service cannot safely do it by adding an override. | Critical policy decision | Admin lifecycle + schema/data-retention owners |
| “33 selected” reviews only the first class/section | Confirmed implementation gap. Both pages read `selected[0]`, open one dialog, remove only that ID after success, and never advance. The old backend bulk-purge paths also reject and direct callers back to reviewed lifecycle purge. | High usability defect | Admin lifecycle web + backend batch contract |
| Adding a learner returns 409 while the learner appears in the class record | Confirmed status-contract bug. Candidate discovery considers only active enrollment, but enrollment creation treats a historical `completed`/`dropped` row as an active duplicate. Both admin and teacher pages call this same method. | High correctness defect | Classes service + enrollment lifecycle |
| Former learners appear beside active learners in Class Record | Historical inclusion is intentional and tested so scores and final grades remain visible. The defect is the default presentation: the grade grid starts at “All learners” and has no active/removed filter. | Medium-high workflow defect | Shared class-record UI, with API compatibility preserved |

The groupmate’s Tagalog statement translates to: **“I can now archive historical classes, sections, and users, but permanent deletion is still just as rigid.”** That description is accurate. Historical class/section retirement is implemented in the current baseline; permanent deletion remains deliberately limited to empty archived records. **Confirmed.**

### Root causes

1. **Retention policy:** `planPurgeLifecycle` blocks on any enumerated retained evidence and supplies no deletion ceremony for a blocked target. This is working as designed.
2. **Missing batch owner:** the class and section pages use a single-target dialog as a manual queue entry, but no queue state or batch lifecycle manifest exists.
3. **Enrollment status mismatch:** the masterlist and candidate queries filter `status = 'enrolled'`; the transactional duplicate and section-membership reads do not.
4. **Evidence/view conflation:** class-record APIs intentionally return period participants and historical scorers, while the everyday grid defaults to showing every returned row.

### Can the admin be made more flexible by tomorrow?

**Yes for workflow flexibility; no for safely erasing official history with a simple bypass.** The defensible next-day scope is:

1. Fix historical-row reenrollment and add regression tests.
2. Default live class-record views to currently enrolled learners, with an explicit Historical/removed view.
3. Make multi-selection a real reviewed queue or batch preview, so all selected records are processed and per-target failures remain visible.
4. Continue deleting only evidence-free archived records until a separately approved destructive-erasure design exists.

If tomorrow’s goal is to clear demonstration/test data rather than erase individual official records, the existing governed **Reset School Data** workflow is the safer product boundary. It coordinates a whole-school reset; it must not be exposed as an ordinary per-record delete shortcut in a production school environment.

## 2. Feature anatomy

### 2.1 Permanent-delete flow

```text
Admin class / section / user page
            |
            v
 AdminLifecycleDialog
            |
            v
 POST /admin/maintenance/purge/preview
            |
            v
 evidence inventory -> RETAINED_EVIDENCE?
        | yes                    | no
        v                        v
 keep archived              password + exact confirmations
 no execute CTA             execute re-previews then DELETE
```

The purge planner counts core enrollment and academic evidence, blocks if any category is non-zero, and returns no warnings, effects, or confirmations for a blocked target. Eligible targets receive irreversible-action warnings and two confirmations. Execution is protected by a fresh preview and manifest checks before `PurgeLifecycleService.apply` reaches a physical `DELETE`. **Confirmed** in `purge-lifecycle.service.ts:64-136,139-193,401-438`.

The reported messages for `lessons`, `linkedClasses`, `classRecords`, `enrollmentHistory`, `lifecycleEvents`, `scores`, and `attempts` therefore mean the record is behaving as a retained historical anchor. They are not acknowledgements the administrator forgot to check. **Confirmed.**

### 2.2 What “delete it anyway” would actually do

The current database mixes three foreign-key policies:

- **Cascade:** deleting a class automatically removes enrollments, lessons and their blocks/completions, assessments and attempts/responses, class records and ordinary scores, modules, uploaded-file rows, announcements, discussion data, JA data, AI/LXP data, RAG/index data, preferences, schedules, and performance rows.
- **Restrict:** official academic projections such as `academic_period_grade_revisions`, `class_record_participants`, legacy grade evidence, annual grades, remediation, back-subject, and completion/outcome rows prevent some class/user deletes.
- **Set null:** lifecycle events and selected actor/teacher references preserve snapshots while removing the live identity link.

Consequently, removing the application blocker does **not** produce a reliable administrator override. Depending on the exact dependency mix, PostgreSQL will either reject the delete because of `RESTRICT` rows or cascade through a much larger subtree than the preview currently reports. **Confirmed schema behavior; exact live target outcome unverified.**

The evidence inventory is a policy inventory, not a complete cascade inventory. For example, class purge counts enrollments, events, class records, scores, attempts, assessments, and lessons, but it does not enumerate every announcement, discussion, JA, LXP, AI, RAG, uploaded-file, preference, or performance dependency. User purge also does not inventory all `RESTRICT`-protected annual-grade and academic-outcome tables. **Confirmed.** A new destructive-erasure capability must therefore start with a complete dependency manifest rather than reinterpret the current `RETAINED_EVIDENCE` flag.

### 2.3 Bulk class and section flow

```text
Select N rows
    |
    v
openBulkConfirmation()
    |
    +--> reads selected[0]
    +--> toast says review begins with first
    +--> opens one AdminLifecycleDialog
             |
             v
       on success: remove only current ID
       no next-target state / no batch receipt
```

This precisely matches “33 selected. Review begins with ESP 10; failed or unreviewed classes stay selected.” The copy describes the implementation rather than a transient failure. **Confirmed** in class page lines 279-287 and 795-805, and section page lines 198-206 and 672-692 plus its completion handler.

The backend’s legacy `/classes/bulk/lifecycle` and `/sections/bulk/lifecycle` services loop over every ID and collect per-target failures, but their `purge` branch calls legacy permanent-delete methods that now always reject in favor of the reviewed maintenance flow. The current class/section pages import the bulk types but do not call these services from `openBulkConfirmation`. **Confirmed.**

### 2.4 Enrollment 409 flow

```text
Admin or teacher Add Students page
            |
            v
masterlist: active enrollments only
historical same-class row => learner appears eligible
            |
            v
POST /classes/:classId/enrollments
            |
            v
duplicate check: any status, same student + class
historical row found => 409 "already enrolled"
```

The contradiction is direct:

- Masterlist section and class membership reads require `enrollments.status = 'enrolled'` (`classes.service.ts:2814-2824,2848-2887`).
- The transaction’s same-class duplicate read omits status (`classes.service.ts:3127-3140`).
- Its section-membership read also omits status (`classes.service.ts:3142-3147`). If it promotes a section-only historical row, the update changes only `classId` and `enrolledAt`, not `status`, so the row can remain `dropped` or `completed` (`classes.service.ts:3154-3160`).
- The schema has `unique(studentId, classId)`, so inserting a second same-class row is not an available compatibility fix (`base.schema.ts:422-446`).
- Admin and teacher web pages both fan out `classService.enrollStudent` calls with `Promise.all`; mobile also consumes the same POST contract. **Confirmed.**

The most likely failing state is a `completed` or `dropped` row for the same student and class, left by a prior lifecycle operation. **Inferred.** The exact status behind the supplied production 409 is **unverified** because no live database row was queried.

### 2.5 Why former learners appear in Class Record

The class-record roster is explicitly an evidence register, not a current-enrollment list. It unions:

- stored period participants;
- every class enrollment, without a status filter;
- learners with score rows; and
- learners with final-grade rows.

It separately returns `currentlyEnrolled` using `status = 'enrolled'` (`class-record-roster.service.ts:47-99`). The spreadsheet starts with active enrollments, then appends non-active learners who have period-participant, score, or final-grade evidence and labels them `isRemoved: true` / `enrollmentState: 'removed'` (`class-record.service.ts:590-669`). A service test explicitly expects the removed learner and preserved final grade to remain. **Confirmed.**

The shared web grid initializes its filter to `all`; its choices cover scoring and eligibility conditions but not active versus removed enrollment, even though it renders “Removed from current class” on those rows (`TeacherClassRecordGradeGrid.tsx:60-94,127-142,337-350`). Thus the data model already contains the seam needed for a cleaner default view; deleting or suppressing history at the API layer is unnecessary and would break roster confirmation, finalized-period review, exports, and mobile. **Confirmed.**

## 3. Cascade map

| ID | Provider | Interface | Consumer | Effect class | Risk | Confidence | Evidence | Disposition |
|---|---|---|---|---|---|---|---|---|
| E01 | Admin class/section/user pages | Permanent-delete action | `AdminLifecycleDialog` | direct | High | Confirmed | Page lifecycle dialog wiring | Keep as reviewed eligibility/destructive entry point |
| E02 | Purge planner | `RETAINED_EVIDENCE` blocker | Dialog and execute guard | direct | Critical if bypassed | Confirmed | `purge-lifecycle.service.ts:64-136` | Keep for ordinary purge |
| E03 | Purge evidence collector | Core evidence counts | Planner | transitive | High; incomplete as a physical dependency manifest | Confirmed | `purge-lifecycle.service.ts:139-352` | Expand only for a new erasure or capability-preflight contract |
| E04 | Purge apply | `DELETE users/classes/sections` | PostgreSQL FK actions | direct | Critical | Confirmed | `purge-lifecycle.service.ts:401-438` | Never call on a blocked manifest |
| E05 | Class FK graph | Cascade-linked content, enrollment, assessment, class-record, AI/LXP/JA/RAG/discussion rows | Class delete | transitive | Critical data loss | Confirmed | Schema-wide `classes.id` reference saturation search | New erasure manifest must enumerate all groups |
| E06 | Academic grading schema | `RESTRICT` class/user references | PostgreSQL | dormant until delete | High; bypass may still fail | Confirmed | `academic-grading.schema.ts:41-64,76-132,164-464` | Preserve or explicitly migrate/anonymize under approved erasure policy |
| E07 | Section FK graph | Classes and enrollment rows cascade from section | Section delete | transitive | Critical; section deletion inherits every class subtree | Confirmed | `base.schema.ts:285-300,422-445` | Treat as aggregate erasure, never a shallow delete |
| E08 | Lifecycle events | IDs become null; snapshots remain | Audit/history readers | transitive | Medium identity/traceability semantics | Confirmed | `admin-lifecycle.schema.ts:105-168` | Define tombstone and snapshot policy before erasure |
| E09 | Class bulk UI | `selectedClasses[0]` | Single lifecycle dialog | direct | High usability failure | Confirmed | `classes/page.tsx:279-287` | Replace with queue state or batch preview |
| E10 | Class completion handler | Removes current target only | Remaining selection | operational | Medium | Confirmed | `classes/page.tsx:795-805` | Advance automatically or consume a batch result |
| E11 | Section bulk UI | `selectedSections[0]` | Single lifecycle dialog | direct | High usability failure | Confirmed | `sections/page.tsx:198-206` | Same shared batch abstraction as classes |
| E12 | Legacy bulk endpoints | Per-ID loop and failure list | Unused class/section service clients | dormant | Medium; purge branch cannot succeed | Confirmed | `classes.service.ts:1734-1827`; `sections.service.ts:1464-1557` | Do not wire directly; supersede with reviewed batch lifecycle contract |
| E13 | Admin/teacher add pages | `POST /classes/:id/enrollments` | `ClassesService.enrollStudent` | direct | High | Confirmed | Both pages call the same web service; controller is shared by Admin/Teacher | Fix once in backend and keep clients compatible |
| E14 | Masterlist | Active-only enrollment eligibility | Add Students pages and mobile | direct | High when paired with E15 | Confirmed | `classes.service.ts:2814-2887` | Keep active-only meaning |
| E15 | Enroll transaction | Status-blind duplicate and section lookups | Same-class historical row | direct | High; false 409 or inactive promotion | Confirmed | `classes.service.ts:3127-3160` | Make transition status-aware and atomic |
| E16 | Enrollment schema | Unique `(studentId, classId)` | Reenrollment write strategy | transitive | High | Confirmed | `base.schema.ts:440-446` | Reactivate/update existing row or redesign history schema; do not blind-insert |
| E17 | Enrollment lifecycle | Completed/dropped rows plus lifecycle event snapshots | Academic history | transitive | High if overwritten without event | Confirmed | Enrollment status enum and lifecycle event schema | Reactivate with a new audited transition and preserve prior event history |
| E18 | Class enrollment capture | Inserts period participants and resets roster confirmation | Current/future class records | transitive | Medium | Confirmed | `class-record.service.ts:331-417` | On reactivation, explicitly reconcile current/future eligibility; avoid stale `onConflictDoNothing` state |
| E19 | Roster service | Participants + all membership + scores + finals | Web/mobile eligibility confirmation | direct | High if filtered server-side | Confirmed | `class-record-roster.service.ts:47-99` | Preserve complete evidence register |
| E20 | Spreadsheet service | Active rows plus removed evidence-bearing rows | Web/mobile gradebooks and exports | direct | High if removed | Confirmed | `class-record.service.ts:590-669`; service tests | Preserve response contract and labels |
| E21 | Web grade grid | Default filter `all` | Admin and teacher class record | operational | Medium-high | Confirmed | `TeacherClassRecordGradeGrid.tsx:60-142` | Default live drafts to active; add active/historical filter |
| E22 | Mobile workbook | Same roster/spreadsheet contract | Mobile teacher class record | transitive | Medium parity risk | Confirmed | `mobile/src/components/academic/AcademicWorkbook.tsx` | Keep API additive; mirror or consciously defer presentation change |
| E23 | Existing historical retirement | `HISTORICAL_RETIREMENT` plans and tests | Class/section archive | operational | Low for current complaint | Confirmed | Current services, pages, and planner tests | Treat prior archive blocker as resolved at this baseline |
| E24 | System Reset | Preview/execute whole-school data reset | Admin maintenance | adjacent alternative | Critical operational scope | Confirmed | Existing reset service/UI/e2e contract | Use only for authorized demo/test reset, not individual-record convenience |

## 4. Isolation and disassembly simulations

### 4.1 Proposed cuts

| Proposed cut | Immediate result | Persisted/delayed effect | Edge impact | Verdict |
|---|---|---|---|---|
| Remove E02 or add `force=true` | Blocked buttons become callable | E06 can reject; E05/E07 can silently cascade-delete more data than previewed | E02-E08 | **Reject** |
| Change every academic `RESTRICT` FK to `CASCADE` | More deletes succeed | Official grade, remediation, outcome, and identity evidence can disappear transitively | E05-E08, E19-E20 | **Reject** |
| Wire pages directly to E12 | All IDs are submitted | Every purge fails through the legacy redirect guard; loses reviewed manifest/password semantics | E09-E12 | **Reject** |
| Loop single-target execute calls with `Promise.all` | Appears fast | Racy password/manifest handling, weak cancellation and partial-result UX, avoidable load spike | E01-E12 | **Reject** |
| Filter historical learners out of E19/E20 | Daily grid looks clean | Eligibility confirmation, finalized review, exports, and mobile lose official evidence | E18-E22 | **Reject** |
| Add active/historical presentation filtering while preserving E19/E20 | Daily roster starts clean | Historical rows remain available on demand and in finalized evidence | E19-E22 | **Recommended** |
| Make E15 status-aware and reactivate the unique row with an audited transition | Eligible historical learner can rejoin | Prior lifecycle events stay intact; current enrollment becomes consistent | E14-E18 | **Recommended** |
| Add one batch preview + execute contract | All selections are reviewed together | Per-target results, idempotency, stale re-preview, and audit can be governed centrally | E01-E12 | **Recommended** |
| Create a separate destructive-erasure operation | Admin can erase retained history only under a new explicit policy | Requires complete cascades, exports/backups, external cleanup, tombstones, and compliance approval | E02-E08, E19-E24 | **Conditionally feasible; not a one-line or one-day bypass** |

### 4.2 Required seams

1. **Enrollment transition seam:** classify `active duplicate`, `historical same-class row`, `active section-only row`, `historical section-only row`, and `wrong-section row` inside one transaction. Only the first is a 409.
2. **Current-view seam:** treat `currentlyEnrolled` / `enrollmentState` as presentation dimensions without changing the evidence-bearing API contract.
3. **Batch lifecycle seam:** introduce a batch manifest containing target manifests, totals, eligible/blocked sets, one expiry/hash, one idempotency key, and per-target execution results.
4. **Policy seam:** keep ordinary purge as “empty archived record only.” If leadership explicitly approves official-history erasure, give it a different action, permissions, copy, audit type, and tests.
5. **Cascade ownership seam:** a destructive erasure owner must enumerate database rows plus uploaded objects, embeddings/indexes, queued jobs, cached projections, notifications, and immutable/tombstone audit policy. Database cascade alone is insufficient.

### 4.3 Ordered implementation plan

| Priority | Change boundary | Acceptance evidence | Rollback |
|---|---|---|---|
| P0 — Reproduce enrollment states | Add fixtures for active, completed, and dropped same-class rows; active and historical section-only rows; admin/teacher calls; concurrent requests. | Current bug test proves masterlist says eligible while POST returns 409 for the historical row. | Tests only. |
| P0 — Correct reenrollment | In the transaction, 409 only for `status='enrolled'`. Reactivate the unique historical same-class row to `enrolled`, refresh `enrolledAt`, and append an explicit lifecycle/audit transition. Never promote a non-active section row. Reconcile current/future participant eligibility and roster confirmation. | Same behavior for admin, teacher, and mobile; no unique violation; history event retained; wrong section still fails; active duplicate remains 409. | Feature flag the reactivation branch or revert code; existing history remains. |
| P0 — Separate current and historical display | Add `currently_enrolled` and `historical` filters locally or additively. Default a live draft/current class workspace to current learners; retain “All evidence” for finalized/historical periods and exports. Show a count such as “24 current · 9 historical.” | Removed learners are absent from the default daily grid but visible with one explicit action; finalized grades and roster confirmation still include them. | Restore default `all`; API/data unchanged. |
| P1 — Real batch review | Replace `selected[0]` with batch preview state. Aggregate all target names and evidence counts; show `eligible`, `retained`, and `needs input` groups. | Selecting 33 reviews all 33; closing leaves all selected; success removes every succeeded ID; blocked/failed IDs remain selected with reasons. | Fall back to single-target dialog without changing lifecycle authority. |
| P1 — Batch execution | Re-preview each target under one batch operation/idempotency key. Require Maintenance Access, current password, total-aware exact confirmation, and return per-target receipts. Process in bounded sequence or chunks, not uncontrolled `Promise.all`. | Stale, duplicate-submit, partial-failure, expiry, password, and authorization tests; no target executes without a fresh safe manifest. | Disable batch execute; single-target execute remains authoritative. |
| P2 — Policy decision for official-history erasure | Record whether the school legally and operationally permits erasing official history, which roles may do it, retention windows, backup/export requirements, and recovery expectations. | Written decision and approved data map. | Keep current retention floor. |
| P3 — Destructive erasure, only if approved | Build a separate preview/export/execute/receipt workflow from a complete dependency graph. Do not reuse `force=true`. Include object/index/queue cleanup and non-PII audit tombstones. | Restore rehearsal, cascade checksums, FK tests, external cleanup tests, concurrency/idempotency, and an authenticated acceptance run in a non-production clone before production enablement. | Kill switch plus restoration from the required pre-operation backup/export. |

### 4.4 Tomorrow-safe behavior specification

- **Add learner:** “Already enrolled” only means an active same-class membership. A historical membership becomes a reviewed reactivation, not a duplicate insert.
- **Open current Class Record:** show current learners first/by default. Provide “Historical/removed learners (N)” without hiding or deleting their evidence.
- **Purge selected:** review every selection in one batch. Execute every evidence-free archived item; leave retained/failed items selected with exact reasons.
- **Retained official history:** offer “Keep archived” and “View evidence.” Do not imply a missing checkbox can unlock deletion.
- **Authorized demo reset:** route to the governed Reset School Data workflow, with its own preview and confirmation, instead of teaching administrators that official-record safeguards are optional.

## 5. Improvements

### Required decoupling

Separate these concepts, which are currently presented too close together:

- **Current membership** from **historical participation evidence**.
- **Multi-selection** from **single-target review state**.
- **Empty-record purge** from **official-history erasure**.
- **Policy evidence inventory** from **complete physical dependency inventory**.

### Optional evidence-backed improvements

1. Return a machine-readable enrollment conflict code and current status so clients can say “Reactivate prior membership” instead of a generic 409.
2. Replace raw evidence keys with labels, counts, school year, and direct “View evidence” links.
3. Add a batch progress/receipt view with succeeded, retained, failed, and not-run groups; keep unsuccessful IDs selected.
4. Remember a teacher’s active/historical display preference per workspace, while defaulting new current workspaces to active.
5. Add telemetry for false-409 status, batch completion, and retained-evidence outcomes without logging grade contents or passwords.

## 6. Uncertainty and coverage boundary

- **Unverified:** the exact `enrollments.status`, class ID, section membership, and participant rows behind the supplied production 409.
- **Unverified:** whether “all archived students” refers to the eligibility roster, grade grid, export, or another class detail list; all inspected class-record consumers can surface historical participants, but with different inclusion rules.
- **Unverified:** the deployed `nexora-lms.com` frontend/backend SHA and whether its database constraints exactly match the local schema at this baseline.
- **Unverified:** the school’s legal/records-retention authority to erase official grades, attempts, lifecycle events, and annual outcomes.
- **Unverified:** external consumers outside this repository and external objects/indexes attached to each specific target.
- **Scope boundary:** inspected admin class/section/user purge entry points, shared lifecycle dialog/service, purge planning and apply, legacy bulk services, admin/teacher add-student pages, shared enrollment controller/service, enrollment and academic FK schemas, class-record roster/spreadsheet/UI/tests, mobile contract consumers, historical-retirement presence, and the adjacent System Reset entry point. Authenticated live reproduction, production database reads, data mutation, deployment, and implementation were excluded.

After a final repository-wide search for the reported messages, class/section/user foreign-key references, enrollment POST consumers, bulk lifecycle owners, and class-record consumers, no additional dependency was found within the inspected scope.
