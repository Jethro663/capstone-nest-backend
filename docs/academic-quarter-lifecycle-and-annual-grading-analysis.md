# Academic Period Lifecycle and Annual Grading

## Status and scope

Revised 2026-08-31 after source review and verification of current DepEd issuances. This supersedes the original four-quarter-only proposal. The user authorized architectural decisions, implementation, and verification in the existing worktree. The implementation is present in the existing worktree across backend, web, and mobile. Verification and remaining deployment limitations are recorded in [the delivery evidence](academic-period-lifecycle-verification.md). The release review fixed production startup and CI gaps, cleared web type errors/test teardown, and rehearsed PostgreSQL 16/18 upgrades and a read-only production snapshot locally. The copied current year still has 53 academic-readiness findings requiring evidenced school decisions; this is not an unconditional green light to push to an auto-deploying branch. The implementation plan and OpenSpec checklist are retained; this is not a claim of production deployment.

Nexora supports Grades 7–10. Backend owns academic policy, authorization, official records, and transition. Web and mobile consume the same `/api` contracts. AI does not determine or mutate official grades. Production deployment is separate from implementation and local rehearsal.

## Original defects addressed

These findings describe the pre-change behavior and motivated the implementation below.

- Admin can read but cannot activate the persisted academic quarter.
- Assessment editor overwrites the saved quarter with global state. Creation can omit quarter, and placement is coupled to category even for drafts.
- Quarterly computation treats absent score rows as zero; finalization validates weights but not a complete eligible roster or pending grading.
- Finalization/reopen delete existing grade rows; spreadsheet sometimes recomputes finalized grades rather than using their snapshots.
- Score synchronization may write into finalized records and converts null attempt grades to zero.
- Transition readiness counts existing records, so missing periods/subjects can escape detection; promotion averages however many period grades exist.
- Transition computes its plan outside the write transaction, directly finalizes drafts, and carries the old quarter into the target year.
- There is no annual subject snapshot, recorded remediation result, or period-specific eligibility history.

## Policy evidence and selected defaults

Primary sources, retrieved 2026-08-31:

- [DepEd Order 8, s. 2015](https://www.deped.gov.ph/wp-content/uploads/2015/04/DO_s2015_08.pdf): historical four-quarter grading, annual averaging, and remediation.
- [DepEd three-term calendar clarification, May 4, 2026](https://www.deped.gov.ph/2026/05/04/deped-binigyang-diin-ang-istruktura-at-layunin-ng-three-term-school-calendar-bago-ang-implementasyon/): three grading periods in public schools from SY 2026–2027.
- [DepEd Order 015, s. 2026](https://www.deped.gov.ph/wp-content/uploads/DO_s2026_015r.pdf), sections 44–53 and 67, Annex D: revised weights, exam components, transmutation, final-grade rounding, and remediation/conditional promotion. The scanned PDF was OCR-extracted and the relevant tables and section 67 visually checked.

| School year | Periods | Term-grade calculation | Promotion policy |
| --- | --- | --- | --- |
| Through 2025–2026 | Q1–Q4 | Historical class weights and captured approved transmutation bands | All subjects pass: promote; 1–2 failures: SRC required, retained if still failing after SRC; 3+ failures: retain |
| 2026–2027 | Term 1–3 | DO 015 adjusted table; raw 70 maps to 75 | All subjects pass: promote; 1–2 failures: SRC required; persistent failures after SRC: conditional promotion with back subjects; 3+ failures: retain |
| From 2027–2028 | Term 1–3 | Weighted initial grade rounded to a whole number, without transmutation | DO 015 remediation and conditional-promotion rules |

Persist a policy identifier and complete policy snapshot per school year. Do not derive historical policy from today's date or silently replace an existing year's policy. Keep the database/API `Q1`–`Q4` identifiers for compatibility: in a three-term year `Q1`–`Q3` are storage keys labeled Term 1–3; `Q4` is invalid for new work. Clients render server labels and allowed periods. Historic Q4 data is never renamed, deleted, or folded into Term 3; incompatible existing data appears in the repair report.

For DO 015 Grades 7–10, WW/PT/EX weights are 20/50/30 for academic subjects and 20/60/20 for TLE/EPP/MAPEH. EX consists of ST1/ST2/TE with internal weights 30/30/40, independently of their highest possible scores. Subject classification uses normalized subject code/name; unknown classifications require an explicit admin choice before finalization. Existing historical class weights remain unchanged. Existing modern records with incompatible weights/items require repair, never silent recomputation of finalized grades.

Initial grade is retained to three decimals; adjusted-table lookup uses the actual threshold lower bound (no rounding across 70 before lookup). Whole-number term and annual grades use positive half-up rounding. Annual computation uses every required period exactly once and never divides by available periods. Store raw annual average to six decimals and retain integer source grades, their sum, and divisor to reproduce the exact rational value. Pass/fail uses the official rounded final grade.

## Period activation and permissions

Admin activates a period with password verification, expected school year, expected period, and expected state version. A monotonic integer version prevents stale updates and the Q1→Q2→Q1 ABA case. Activation records actor, reason, old/new state, and timestamp in the same transaction. Normal movement is sequential. Backward/skipped movement requires `override: true` and a nonempty reason; this does not reopen/finalize records or erase attempts. Same-state retry returns current state without duplicate audit.

Separate two concepts:

- **Release period:** one current period. New publication, core-assessment release, new attempts, and new file submissions require the current school year and active period.
- **Grading state:** draft/open records in active or past periods accept grading, score sync, and finalization. Future records accept planning/placement but not scores or finalization. Finalized/locked records reject all score/item/question changes that affect official results. Authorized reopen is explicit, audited with a reason, and invalidates dependent annual results immediately.

Already-started attempts can complete after period advancement, subject to existing due-date/expiry rules. Published past work and returned results remain viewable; future work stays hidden. Backward activation does not stop a previously started attempt from completing. Closed-year attempts are rejected except through an explicit academic repair operation. Assessment quarter becomes immutable after any attempt, submission, recorded score, or finalized placement. A published assessment cannot move periods until unpublished and only if no such evidence exists.

Drafts default to active period when their class is in the active year; future-year drafts default to the first period of that year's policy. Category/slot is optional for a draft, independent of quarter. Selecting a category creates/reuses a draft record and available slot for that period. Publication retains existing rubric/content/placement validation and adds lifecycle validation. Template content stays reusable but release is always checked against the destination class and year.

## Roster and completeness

Persist `class_record_participants` with student, eligibility, reason, and provenance. Capture participants when an active record is created, at period activation for existing records, and when students join the active period. Future draft records do not freeze today's enrollment as their future roster. Past-period enrollment is never inferred from current enrollment alone. Existing score/final-grade participants are preserved. Historical records without a confirmed roster require an audited roster confirmation before being used for newly generated official annual results.

Teacher/admin can reconcile an owned draft roster with a reason. `eligible` participants require grades. `not_enrolled`, `transferred`, and `withdrawn` are explicit roster decisions, not score values. Removing a participant does not delete scores or prior grade revisions. Active students still require a complete annual set; roster exclusion is not a bypass for missing transfer grades.

Each configured item with HPS > 0 is required; unused HPS=0 slots are not. Each nonzero-weight category requires at least one item. Modern EX requires ST1, ST2, and TE. Each eligible student requires a numeric score (including explicit zero) or `excused` with reason. Excused items are removed from that student's numerator and denominator; modern exam weights are renormalized over non-excused components. A whole excused/empty required category blocks finalization rather than inventing a grade or redistributing category weights.

Missing stays null and visibly Missing. A grade preview with missing required evidence is provisional and cannot be finalized. No finalization while linked attempts are ongoing, require manual review, have a null result, or have unsynchronized results. Sync selects the latest submitted attempt deterministically, requires returned/reviewed results where manual grading is involved, preserves explicit exemptions, and never turns null into zero. Finalization can reconcile completed auto-grades under the transaction lock before checking completeness.

An explicitly confirmed empty roster can finalize to zero grade rows; empty insert operations are skipped. No active eligible student may be omitted. Finalization returns precise blocker codes, student/item identifiers, counts, and teacher ownership.

## Immutable grade history and annual results

Keep `class_record_final_grades` as the compatible current-period projection, but also append immutable period grade revisions containing policy, source item/score/roster evidence, actor, time, and a revision number. Reopen invalidates current projections without deleting revision history; previously issued annual versions remain available as superseded records.

Annual identity is `(schoolYear, studentId, subjectCode, gradeLevel)`, not `classId`: transfers between sections must not fragment one learning area. Snapshot components reference immutable period revision IDs or verified external-grade evidence. Different classes with the same logical learning area can supply different periods. Conflicting same-period contributions block until an admin explicitly selects the verified source. Case/whitespace normalization cannot silently merge different subject codes.

External transfer grades require admin authorization, school/source reference, period, whole-number grade, and reason. They are append-only, supersedable, and cannot overwrite an internal grade silently. They satisfy annual completeness but do not fabricate class-record item scores. Every expected current-year subject for each active section student must have one contribution for every required period. Withdrawn students' historical results remain readable without forcing an annual outcome for students no longer enrolled.

Append annual revisions with all period components, raw average, official grade, remarks, policy version, source fingerprint, actor/time, and validity state. Repeated generation with unchanged sources is idempotent. Reopening any contributing record or replacing transfer evidence invalidates affected annual results in the same transaction. Reports, workbook export, annual UI, and transition use this result rather than recalculate independently.

## Remediation and year outcomes

Failing one or two learning areas produces `pending_remediation`, not immediate retention. Admin records an evidenced SRC result for each failed annual snapshot, with RCM 0–100, source/reference, and reason. Preserve original annual grade; store `(FG + RCM) / 2` and its official rounded RFG separately. A changed annual source invalidates its remediation decision.

- All required subjects pass, including accepted RFGs: promote Grades 7–9, complete Grade 10 (`graduated` is retained as the existing storage identifier; UI says JHS completed).
- Three or more original failing learning areas: retain.
- One/two failures without completed SRC evidence: block transition for that student.
- Legacy year, failed SRC: retain.
- DO 015 year, failed SRC: conditionally promote Grades 7–9 with persistent back-subject obligations. For Grade 10, do not set `graduatedAt` while deficiencies remain; preserve a pending-completion status/obligation.

Back-subject obligations survive transition, link to the original annual/SRC evidence, allow at most one active back subject per learner per target-year period, and clear only on an evidenced passing recomputed grade. Back-subject work does not mutate the original finalized annual result. A Grade 10 learner with a persisted `pending_completion` year-end outcome can graduate later only through an admin completion action that verifies all linked annual/SRC/clearance evidence and no remaining obligations or active enrollment. The action appends completion evidence and updates the student profile without rewriting the original year-end outcome. Legacy per-student move-up, retain, and graduate commands return `academic_transition_required`: official outcomes are recorded by the verified year transition, followed by explicit next-year section assignment. This prevents an early profile/roster move from removing a student from the expected year-end matrix. The ordinary next-year roster remains empty; conditional promotion must not silently enroll a learner in passed or failed subjects.

## Concurrency and transition

All academic mutations participating in these invariants share one PostgreSQL transaction advisory lock. The lock is acquired before reading policy/state/readiness, and the same transaction connection is used by nested operations, auditing, score synchronization, finalization, and transition. Enrollment and class/subject membership writes participate so the expected matrix cannot change mid-transition. Ordinary enrollment changes apply only to the active year. Archival cannot remove classes/sections with active section membership from that matrix, and preserves teacher/adviser ownership for historical access. A class with academic workbooks cannot be purged or silently reassigned to another subject, section, or year. Concurrent unrelated request context must not leak a transaction. Nested operations reuse the outer transaction; rollback removes all academic changes and audits. External notifications are dispatched only after commit.

Transition requires:

1. Expected current school year and state version match.
2. Active period is the last required period for that year's policy.
3. Every active class has all expected period records; each is finalized/locked with confirmed eligibility and complete snapshots, or a documented empty roster.
4. Every active student has a complete annual grade for every expected learning area; missing classes/subjects, transfer evidence conflicts, pending sync, reopened sources, and pending remediation are blockers.
5. All promotion/retention/conditional outcomes are determined from valid annual/remediation evidence.
6. Target is the immediate next school year with no conflicting sections/classes. Recovery to arbitrary years is not part of ordinary transition.
7. Readiness and clone targets are rebuilt inside the locked transaction. No draft is auto-finalized.

Transition archives existing year data, persists outcomes/obligations, clones the established section/class/teacher/adviser/room/schedule/reusable-content structure, and resets active state to the new year's first period. Rosters remain empty. Incompatible cloned content remains draft and requires an explicit valid-period choice; it is not relabeled into a different period automatically.

Notify Teachers uses the same readiness matrix, groups each teacher's classes/periods into one notification, includes actionable destinations, and deduplicates identical reminder runs in a short persisted time window. Missing records must produce reminders, not an all-finalized message.

## API and client contract

Preserve `success/message/data` and existing `quarter`/`gradingPeriod` keys. Add policy/period labels, capabilities, state version, and structured blockers.

| Operation | Contract |
| --- | --- |
| Current academic state | `GET /academic-state/current` includes `policy`, `periods`, `version` |
| Class-year policy | `GET /academic-state/policy?schoolYear=...` |
| Activation preview / action | `GET /academic-state/quarter-readiness?targetQuarter=...`; `POST /academic-state/activate-period` |
| Transition readiness / action | `GET /academic-state/transition-readiness`; existing `POST /academic-state/transition` with expected state |
| Finalization blockers | `GET /class-record/:id/readiness` |
| Roster reconciliation | `GET /class-record/:id/roster`; `POST /class-record/:id/roster/confirm` with explicit decisions and reason |
| Scores / exemptions | Existing score endpoint accepts numeric score or `status: excused` plus reason; audited restoration of linked results at `POST /class-record/items/:itemId/scores/:studentId/restore-assessment` |
| Preview / history / correction | `GET /class-record/:id/preview-grades` returns `{classRecordId, readiness, preview, interventionCount}`; `GET /class-record/:id/history`; `POST /class-record/:id/reopen` requires reason |
| Annual results | `GET /class-record/by-class/:classId/annual-summary` with current and historical revisions |
| Transfer evidence | Admin `POST /academic-grading/classes/:classId/external-period-grades`; source selection at `POST /academic-grading/classes/:classId/source-selection` |
| SRC evidence | Admin `POST /academic-grading/annual-grades/:id/remediation` |
| Back subjects | Admin `GET /academic-grading/back-subjects`; `POST /academic-grading/back-subjects/:id/schedule`; `POST /academic-grading/back-subjects/:id/clear` |
| Grade 10 completion | Admin `GET /academic-grading/grade-10-completions`; evidenced `POST /academic-grading/students/:studentId/complete-grade-10` |
| Historical repair audit | Admin `GET /academic-state/audit`; read-only `npm run academic:audit` |
| Archive legacy evidence / initialize policy | Admin `POST /academic-state/repair/preserve-legacy`; `POST /academic-state/repair/policies/:schoolYear/initialize` |
| Classification / workbook configuration | Admin `POST /academic-state/repair/classes/:id/profile`; `POST /academic-state/repair/records/:id/policy` with explicit examination mapping |
| Preserve incompatible periods | Admin `POST /academic-state/repair/records/:id/exclude-historical-period`; `POST /academic-state/repair/assessments/:id/exclude-historical-period`; neither relabels or deletes evidence |
| Placement / duplicates / state | Admin `POST /academic-state/repair/assessments/:id/period`; `POST /academic-state/repair/classes/:id/retire-duplicate`; password/version-protected `POST /academic-state/repair/state` |

Web System Settings shows active period, readiness, audit metadata, safe activation confirmation, and blocked transitions. Teacher creation/editor permits future drafts and shows server policy labels/capabilities. Workbook shows readiness, roster decisions, Missing/Excused, period grades, and a separate Annual Summary (available for all periods, emphasized at the final period). Exports include policy, all required periods, annual official grades, remediation status, and source revision identifiers. Mobile implements the same affected actions, labels, summaries, and errors; older clients receive structured actionable errors and cannot bypass backend policy.

## Migration, rollout, and repair

Use additive schema and migrations generated through Drizzle. Do not reinterpret historical grades or infer zeros/exemptions. Seed year policy by school year, preserve final projections as legacy revisions, report unknown period rosters, incompatible modern Q4/weights, null assessment periods, duplicate logical subjects, missing grades, and unreviewed grading.

Provide explicit repair operations for roster confirmation, period/source selection, and verified transfer grades. Backfill annual results only from a complete policy-sized, unambiguous set of trusted period revisions. Migration itself must not declare a legacy missing-score computation newly trustworthy. Read-only audit runs before repair/backfill. Legacy values are archived exactly, including fractional values, in a separate untrusted evidence table. Admin recovery supports explicit examination mapping and policy-weight repair of reopened draft records, preservation of incompatible historical periods without moving their results, subject classification, duplicate-state repair with step-up authentication, and duplicate-class retirement only after canonical enrollment is in place. Subject identity uses the same canonical normalization as class creation. New client controls and backend enforcement are one coordinated release; schema is additive so previous binaries can be rolled back before new official writes. After new official writes, rollback retains data and uses forward repair instead of dropping grade history.

Rehearse fresh migration, upgrade with legacy fixtures, audit, repair, and full successful/failed/concurrent transitions on an isolated local test database. Do not change production as part of verification. Record production-sized synthetic rehearsal timing, browser evidence, mobile type/tests/bundle checks, and any unavailable device-only testing honestly.

## Acceptance and verification matrix

- Policies: legacy four periods; 2026 three terms/adjusted bands; 2027 zero-based; same stored grade never changes because current year changes.
- Activation: sequential, override with reason, unauthorized, wrong password, stale year/version including ABA, identical retry, and concurrent requests.
- Assessments: future draft save; future listing/start/release blocked; past results readable; in-flight completion allowed; quarter move with results blocked; core/public/upload/automatic submission paths covered.
- Completeness: missing vs explicit zero; excused denominator; all-excused category; unused slots; modern ST1/ST2/TE weighting; current vs historical eligibility; late/transfer/withdrawn learners; empty confirmed roster; unresolved grading/sync.
- Annual: incomplete period set blocked; same-subject section transfer; external evidence; conflicting source; exact half rounding; source revision idempotency; reopen invalidation; no history deletion; UI/export/report parity.
- Outcomes: all-pass; 1/2 failures pending SRC; 3 failures retained; SRC pass; legacy SRC fail; modern conditional promotion; Grade 10 unresolved deficiencies never completed; back-subject scheduling and clearance.
- Transition: missing class/period/student/annual/SRC blocks; final-period gate; immediate-next-year gate; empty rosters; complete archive/clone behavior; rollback and concurrent reopen/enrollment/score changes; first-period reset.
- Notifications: missing-period teacher receives grouped blocker, duplicate run is idempotent, no notification escapes a rolled-back transaction.
- Delivery: migration integrity, fresh/upgrade rehearsal, backend build/lint/tests, web lint/type/build/tests and browser flows, mobile type/tests/export, and requirement-by-requirement completion audit.

## Implementation sequence

1. Policy functions and regression fixtures.
2. Schema, transaction boundary, and generated migration.
3. Roster/completeness/score semantics and immutable period revisions.
4. Annual grades, transfer evidence, SRC, and back-subject obligations.
5. Assessment lifecycle guards and future draft placement.
6. Locked transition, readiness, notifications, audit/repair CLI.
7. Web/mobile controls, workbooks, annual exports, and recovery messages.
8. Migration/runtime rehearsal, full regression verification, and completion audit.
