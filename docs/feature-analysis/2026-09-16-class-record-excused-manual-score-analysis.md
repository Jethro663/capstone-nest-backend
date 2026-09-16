# Class Record Excused Manual Score Analysis

Date: 2026-09-16
Scope: Admin and teacher class-record score entry, finalization, shared API consumers, and downstream grade projections
Authorization boundary during discovery: Analysis only. The user subsequently authorized implementation and release through the cross-linked plan.

Implementation plan: [`../feature-plans/2026-09-16-class-record-excused-manual-score.md`](../feature-plans/2026-09-16-class-record-excused-manual-score.md)

## 1. Executive verdict

### Feature location

The requested feature is the **score-cell editor inside the shared Class Record Workbook**, not a separate “class record completion” module.

- Teacher routes:
  - `next-frontend/app/(dashboard)/dashboard/teacher/class-record/page.tsx:15-25,309-313`
  - `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/page.tsx:4302-4309`
- Admin route:
  - `next-frontend/app/(dashboard)/dashboard/admin/academic-records/[classId]/page.tsx:7-29`
- Shared web owner:
  - `next-frontend/src/components/teacher/class-record/TeacherClassRecordWorkbook.tsx:38-135,820-958`
  - `next-frontend/src/hooks/use-teacher-class-record.ts:23-96,350-369`
- Backend owner:
  - `POST /class-record/items/:itemId/scores`, available to Teacher and Admin, in `backend/src/modules/class-record/class-record.controller.ts:165-180`
  - Validation and persistence in `backend/src/modules/class-record/class-record.service.ts:940-1095`

The “completion” part the user recalls is the workbook’s **Review & Finalize** readiness flow. Finalization is blocked until the server’s score and evidence checks pass (`TeacherClassRecordWorkbook.tsx:279-321,567-606`; `class-record-readiness.service.ts:26-230`).

### Current behavior correction

Current `Excused with reason` does **not** write a numeric zero. It writes `score = null`, requires a reason, and removes the item from both the learner’s numerator and denominator. An explicit zero is a separate recorded score and remains in the denominator.

| Entry meaning | Stored state | Calculation treatment |
|---|---|---|
| Missing | No usable score | Finalization blocker |
| Explicit zero | `recorded`, score `0` | Counts as `0 / HPS` |
| Excused with no score | `excused`, score `null`, reason required | Excludes this item’s score and HPS for that learner |
| Requested: excused with manual score | Not representable today | Should count the entered score and HPS while preserving the excuse reason |

Confirmed evidence: `TeacherClassRecordWorkbook.tsx:827-849`; `class-record.service.ts:997-1047`; `class-record-calculation.ts:107-139`; `class-record-calculation.spec.ts:61-92`.

### Coupling and recommendation

Coupling is **moderate-to-high** because the meaning is enforced in UI types, request validation, service validation, a database check constraint, grade calculation, finalization readiness, assessment synchronization, exports, mobile grading, audit checks, and an asynchronous performance-recompute path.

Recommended extension: introduce a third explicit contract value, internally named `excused_with_score`, with these rules:

- numeric score is required and must be from `0` through the item HPS;
- an excuse reason is required, for example `Winner of the Division Science Fair`;
- the score and full HPS participate in grade calculation;
- bonus points are not allowed in this mode initially, avoiding two adjustment systems on one row;
- assessment synchronization must preserve this manual accommodation rather than overwrite it;
- UI and exports must show both the numeric score and the excused/accommodation evidence.

Do not implement this as ordinary `recorded` plus a free-text note. That would hide the excused state from filters and reports and allow linked-assessment synchronization to overwrite the manual decision. Do not redefine current `excused` to sometimes contain a score; that would make its denominator semantics ambiguous and break existing clients that intentionally render any `excused` value as non-numeric.

Existing rows require no conversion. The feature is extendable but not safely removable or replaceable at only the web layer.

## 2. Feature anatomy

### Inbound flows

1. Admin and teacher web routes reuse `TeacherClassRecordWorkbook` and `useTeacherClassRecord`; therefore one shared web editor owns both roles. Admin bypasses class ownership while a teacher must own the class (`ClassRecordService/assertClassOwnership`, `class-record.service.ts:105-126`).
2. The web dialog currently offers exactly two choices: `Recorded score` and `Excused with reason` (`TeacherClassRecordWorkbook.tsx:832-849`).
3. Mobile also supports admin/teacher score entry and has separate actions for saving a numeric score and marking the learner excused (`mobile/src/components/academic/AcademicWorkbook.tsx:360-447`).
4. Both clients call the same score endpoint through their service wrappers (`next-frontend/src/services/class-record-service.ts:115-127`; `mobile/src/api/services/class-record.ts:100-114`).

### State and invariants

- The persistent row already contains `score`, `status`, and `reason`; no new column is required. The status type and `class_record_score_status_valid` check allow only `recorded` or `excused`, with an excused row requiring a null score and nonblank reason (`backend/src/drizzle/schema/class-record.schema.ts:152-187`).
- DTO and client unions also allow only those two values (`record-score.dto.ts:13-41`; web `src/types/class-record.ts:48-84`; mobile `src/types/class-record.ts:51-87`).
- `calculateStudentRecord` skips an `excused` item before adding its HPS. It rejects an excused row that has a numeric score (`class-record-calculation.ts:103-139`).
- If every required item in a weighted category is excluded, the category is incomplete because no grade can be inferred (`class-record-calculation.ts:169-183`).
- Finalization rechecks readiness, computes grades, stores immutable revision evidence, refreshes annual grades, and audits the action (`class-record.service.ts:1279-1383`).

### Assessment-linked variant

Ordinary numeric edits are blocked for linked assessments; the user grades the assessment and synchronizes it. A documented `excused` row is an intentional override: sync and readiness both skip it. Restoring assessment evidence deletes the exemption, re-synchronizes the completed attempt, and records the correction reason (`class-record.service.ts:1018-1021,1137-1207`; `class-record-sync.service.ts:139-157`; `class-record-readiness.service.ts:177-209`).

`excused_with_score` should follow the same override rule as `excused`: it may be entered for a linked assessment, has `sourceAttemptId = null`, is not overwritten by synchronization, and is accepted by readiness as resolved evidence.

### Side effects and consumers

- Score writes are audit logged with the full stored values and emit `class-record.scores.updated` after commit (`class-record.service.ts:1052-1095`).
- An asynchronous listener enqueues a BullMQ `recompute-class-scores` job, which refreshes performance projections (`performance-events.listener.ts:34-49`; `performance-recompute-queue.service.ts:41-70`).
- Web and mobile grids currently replace every `excused` score with the text `Excused`; their status unions and display logic require explicit support for the new state.
- Web and mobile exports currently put `EXCUSED` in the period sheet, while their evidence sheets separately contain score, status, and reason (`next-frontend/src/lib/academic-workbook-export.ts:27-58,104-137`; mobile equivalent at `mobile/src/lib/academic-workbook-export.ts:26-57,103-136`).

## 3. Cascade map

| Edge | Provider / interface | Consumer | Effect | Risk | Confidence | Evidence | Disposition |
|---|---|---|---|---|---|---|---|
| E1 | Teacher/admin routes | Shared web workbook | Both roles reach one score editor | Direct, medium | Confirmed | Web route files listed in §1 | Extend once in shared owner; verify every route |
| E2 | Workbook score-mode selector and save handler | `useTeacherClassRecord` | Only `recorded` or `excused` can be selected/saved | Direct, high | Confirmed | `TeacherClassRecordWorkbook.tsx:57-59,91-135,832-958` | Add third mode, score field, required reason, clear explanatory copy |
| E3 | Web hook and service wrapper | Score POST endpoint | Excused payload always forces `score: null` | Direct, high | Confirmed | `use-teacher-class-record.ts:350-369`; `class-record-service.ts:117-127` | Add an explicit scored-excuse mutation path/payload |
| E4 | Controller roles and ownership | Backend service | Admin may edit any accessible record; teacher only owned class | Security-sensitive, high | Confirmed | `class-record.controller.ts:167-180`; `class-record.service.ts:105-126` | Preserve roles, ownership, academic-period capability, eligibility, and draft-only gates |
| E5 | DTO and `bulkRecordScores` validation | Persistent score row | Current contract rejects a score on `excused` and rejects direct recorded edits for linked assessments | Direct, critical | Confirmed | `record-score.dto.ts:13-41`; `class-record.service.ts:986-1050` | Accept `excused_with_score`; require bounded score and reason; allow it as a deliberate linked-assessment override |
| E6 | Drizzle schema and DB constraint | PostgreSQL | Database rejects any current excused row with a score | Persisted, critical | Confirmed | `class-record.schema.ts:152-187`; migration `0017_grade_score_invariants.sql:13,154` | Expand status type and constraint in a new migration; no row rewrite required |
| E7 | `calculateStudentRecord` | Preview, spreadsheet totals, final grades, annual grades | Current excused item removes HPS; new scored mode must include score and HPS | Transitive, critical | Confirmed | `class-record-calculation.ts:103-218`; `class-record.service.ts:1306-1369` | Give the new state recorded-score math while preserving the legacy excused branch |
| E8 | Readiness and finalization | Immutable revision creation | Missing/invalid evidence blocks finalization; excused linked rows bypass pending-sync checks | Stateful, critical | Confirmed | `class-record-readiness.service.ts:130-230`; `class-record.service.ts:1279-1383` | Treat the new state as complete, reasoned evidence and as an intentional sync override |
| E9 | Assessment sync and restore | Linked score rows | Sync currently preserves only `excused`; restore is specific to the no-score exemption | Stateful, high | Confirmed | `class-record-sync.service.ts:139-157`; `class-record.service.ts:1137-1207` | Preserve both excused states during sync; define conversion actions explicitly |
| E10 | Spreadsheet mapper, types, grid, filters, CSS | Web admin/teacher presentation | Current grid hides numeric score for `excused`; filter recognizes only exact `excused` | Direct, high | Confirmed | `class-record.service.ts:743-773`; `TeacherClassRecordGradeGrid.tsx:376-397`; `class-record-visuals.ts:58-101`; CSS `:692-696` | Display `Excused · score/HPS`; group both states under Excused filter; add a distinct accessible visual label |
| E11 | Export builders | XLSX/CSV evidence | Current period export substitutes `EXCUSED` for score | External artifact, high | Confirmed | Web/mobile export files cited in §2 | Export numeric credited score plus explicit status/reason; retain old `EXCUSED` output for no-score exemptions |
| E12 | Mobile types, editor, and workbook | Admin/teacher mobile user | Same API is mutable on mobile; current display/actions know only two states | Public-contract, high | Confirmed | `AcademicWorkbook.tsx:145-173,360-447`; `MobileClassRecordWorkbook.tsx:44-63`; mobile types `:51-87,125-136` | Update mobile contract, display, write action, and exports in the same release |
| E13 | Audit, after-commit event, BullMQ performance recompute | Audit history and performance projections | A scored excuse changes official and projected performance | Async/operational, high | Confirmed | `class-record.service.ts:1071-1095`; performance listener/queue cited in §2 | Preserve event; update invariant audit and verify recomputed projection uses the new grade |

## 4. Isolation and change plan

### Target contract seam

Use one explicit state rather than UI-only flags:

```text
recorded              -> score required, reason optional, included in grade
excused               -> score null, reason required, numerator/HPS excluded
excused_with_score    -> score required, reason required, included in grade
missing               -> response-only derived state, finalization blocker
```

Example for an HPS of 20:

- `recorded`, score `0`: contributes `0 / 20`.
- `excused`, no score: contributes neither numerator nor denominator.
- `excused_with_score`, score `18`, reason `Winner of the Division Science Fair`: contributes `18 / 20` and retains the reason as official evidence.

### Ordered cuts

1. **Characterize semantics first (E5-E9).** Add failing tests for all four states, linked-assessment preservation, readiness, finalization, and invalid payloads. This locks the current no-score exemption behavior before expansion.
2. **Expand backend truth (E5-E7).** Update DTO/service unions and validation, Drizzle status typing, the DB constraint through a new migration, grade calculation, and the grade-invariant audit. Reject missing reason, null score, score outside `0..HPS`, bonus points, and unknown status.
3. **Preserve lifecycle behavior (E8-E9, E13).** Make sync/readiness recognize both excuse states, keep revision evidence unchanged in shape but richer in value, retain audit metadata, and confirm the after-commit performance job recomputes the scored result.
4. **Align web and mobile (E1-E3, E10-E12).** Add the third user choice on both mutable clients, update unions, display/filter/accessibility states, and expose score plus reason without hiding either value.
5. **Align artifacts and regression evidence (E11).** Keep legacy no-score exemptions as `EXCUSED`; render scored exemptions as a visible numeric score with an excused marker, while the evidence sheet retains separate score/status/reason fields.

### Compatibility and cleanup

- Persistent change is additive: existing `recorded` and `excused` rows remain valid and need no backfill.
- An older mobile client will treat the unknown `excused_with_score` value as a numeric row in its current display branch. The grade remains visible, but the excuse badge may be absent until the app updates; this limitation should be covered by release notes or a minimum-version decision.
- Do not delete or rewrite historical no-score exemptions. They express a different denominator rule.
- Update the grade-invariant audit to reject unknown statuses explicitly; its current query only validates the two known branches (`grade-invariant-audit.service.ts:45-55`).

### Validation

- Backend unit tests: DTO/service validation; calculation includes scored exemption and excludes no-score exemption; sync preserves both; readiness/finalization accept valid scored evidence.
- Migration tests: fresh database and upgrade database accept all valid states and reject invalid combinations; audit returns zero violations.
- Web tests: both admin and teacher routes expose the shared third option; score and reason are required; grid/filter/accessible label and export are correct.
- Mobile tests: admin/teacher editor writes the new payload; workbook and CSV show score plus exception evidence.
- Async test: score mutation emits the unchanged event and the performance recompute reads the resulting canonical class-record grade.
- Acceptance example: for HPS 20 and manual score 18, the cell, export, preview, finalized revision, annual source, and performance projection all agree on 18 counted points while retaining `Winner of the Division Science Fair`.

Focused current-behavior verification on 2026-09-16:

- Backend class-record calculation and sync: 2 suites, 14 tests passed.
- Web workbook and export: 2 suites, 17 tests passed.
- Mobile academic workbook and export: 2 suites, 4 tests passed; only existing `react-test-renderer` deprecation warnings appeared.

### Rollback

- Before any new-state row exists: revert application support, then restore the old two-state check constraint.
- After new-state rows exist: first stop scored-excuse writes, convert each `excused_with_score` row to `recorded` while preserving its numeric score and reason in audit evidence, verify grades are unchanged, then restore the old constraint. Never restore the old constraint while incompatible rows remain.

## 5. Improvements

Required decoupling: centralize the score-state rules in one backend helper used by validation, calculation, readiness, synchronization, response mapping, and invariant audit. Today, exact string checks are repeated across those owners, which makes a third state easy to implement inconsistently.

Optional evidence-backed enhancements:

1. Add a dedicated audit action or metadata field for `excused_with_score`, so reviewers do not have to infer the special decision from a generic bulk-score event.
2. Show the full reason in the cell dialog and accessible description, but keep the grid compact as `Excused · 18/20`.
3. Add an optional evidence/reference field later (award, memo, competition, medical accommodation). Do not make attachments a prerequisite for the first release unless school policy requires them.
4. Add a report/filter split between `Excused — excluded` and `Excused — scored`, while retaining a combined `Excused` filter.

## 6. Uncertainty and coverage boundary

- **Unverified:** the school’s formal policy for how an excused learner’s manual score should be derived. The proposed system records the teacher/admin decision but does not invent a score formula. Academic leadership should confirm whether the credited score is fully discretionary, based on equivalent work, or capped by another rule.
- **Unverified:** whether an old mobile APK must display the excuse marker immediately. Static inspection shows it will display the numeric score but not understand the new label until updated.
- Runtime browser/device interaction and a real database migration were not executed because this task is analysis-only. Current behavior was confirmed through source, schema, and the focused automated suites listed above.
- A final focused search covered the backend class-record DTO/service/calculation/readiness/sync/schema/audit/event path, web admin/teacher routes/types/grid/filter/export path, and mobile types/editor/grid/export path. No additional dependency was found within the inspected scope.
