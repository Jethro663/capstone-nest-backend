# Governed Admin Lifecycle Resolution Plan

**Status:** Approved architecture - implementation tracked by OpenSpec change `governed-admin-lifecycle`

**Date:** 2026-09-10

**Scope:** Web-first admin correction, withdrawal, transfer, class/section closure, and permanent-deletion safeguards. Mobile admin execution is intentionally deferred until the web workflow is proven.

## Executive Recommendation

The existing security rules should not be removed, and administrators should not receive a generic bypass such as `force=true`.

Instead, add a **Governed Admin Resolution** workflow. It should let an administrator resolve the dependencies that currently block an operation, preview every consequence, provide a reason, re-enter their password, and apply all related changes in one database transaction. Academic records, grades, attempts, and historical evidence must remain protected.

The design principle is:

> An administrator may override workflow restrictions, but may not silently violate academic-history invariants.

This turns current blockers into one of two categories:

1. **Resolvable blocker:** the system offers a safe action such as withdraw, transfer, complete enrollment, or select a replacement class.
2. **Absolute blocker:** permanent deletion would destroy academic evidence, so only archival or status changes are allowed.

## Chosen Long-Term Decisions

The following implementation decisions resolve the proposal's earlier ambiguities:

1. **Preserve the existing coarse enrollment status enum.** Existing consumers continue to use `enrolled`, `dropped`, and `completed`. An append-only `enrollment_lifecycle_events` table records whether the precise outcome was correction, withdrawal, section transfer, class transfer, completion, or archival.
2. **Treat correction as a retained event, not invisible deletion.** An evidence-free erroneous enrollment becomes `dropped`, draft participant eligibility becomes `not_enrolled`, and an immutable event records the correction. Any result-bearing or finalized evidence blocks correction.
3. **Use the active grading period as the governed boundary.** Every student resolution declares an effective grading period. Earlier or finalized periods are preserved; retroactive finalized-history changes remain academic-repair work.
4. **Persist execution operations, not abandoned previews.** Preview is read-only and stateless. Execute claims an idempotency-keyed operation row, commits successful academic changes and the success result together, and records a failure outside a rolled-back academic transaction.
5. **Use concrete operation-specific DTOs.** Student, class, section, and purge preview/execute routes use runtime-valid `class-validator` classes rather than an erased TypeScript-only union.
6. **Keep one target atomic.** One student resolution, one class closure, or one section closure is all-or-nothing. A multi-target bulk action may complete independent targets separately but must preserve every result and failed selection for retry.
7. **Ship vertical slices.** Each operation ships backend, web workflow, audit, notifications, and tests together. The admin UI is not postponed until after every backend operation exists.
8. **Keep purge separate.** Permanent deletion stays behind the archived-record danger flow and never appears as a routine resolution choice.
9. **Gate execution, not understanding.** Preview stays available while `ADMIN_LIFECYCLE_ENABLED` can disable execution. The flag defaults to disabled and is enabled only after migration and release verification.
10. **Use web as the first execution surface.** Mobile behavior remains unchanged in this release; it may gain parity only after the desktop review flow and contracts are stable.

## What The Current Source Code Does

### Student removal from a class

`backend/src/modules/classes/classes.service.ts` uses `removeStudent()` and then calls `ClassRecordService.captureClassEnrollment()`.

Current strengths:

- Teachers are limited by ownership rules while administrators have broader authority.
- Roster changes are propagated to class-record participants.
- The action is audited.
- Section membership is preserved when only the subject-class enrollment is removed.

Current difficulty:

- `captureClassEnrollment()` checks whether affected class records are editable. A legitimate withdrawal can therefore be blocked by a finalized record.
- The same low-level removal action is being used for both data corrections and real-world withdrawals, although those cases need different historical treatment.

### Student removal from a section

`backend/src/modules/sections/sections.service.ts` uses `removeStudentFromSection()`.

Current strengths:

- It prevents a student from being removed from the section while active subject-class enrollments still depend on that membership.
- It avoids leaving inconsistent class and section enrollment data.

Current difficulty:

- The administrator must manually remove the student from every class first.
- A failure midway can leave a partially completed administrative workflow.
- The current section-only enrollment is physically deleted rather than recording a meaningful outcome such as transferred or withdrawn.
- The operation does not collect a structured reason or provide an impact preview.

### Class archival

`backend/src/modules/classes/classes.service.ts` uses `toggleActive()` for archival.

Current strengths:

- It prevents an active class with learners from disappearing unexpectedly.
- It preserves the teacher and historical records.
- Permanent deletion remains blocked when academic workbooks exist.

Current difficulty:

- The active-enrollment guard checks the target class **or its entire section**. As a result, section-only enrollment or enrollment in a sibling class can block archiving an otherwise unrelated class.
- The administrator gets an error message, but no guided way to close enrollments, move learners to a replacement class, or correct an accidental class.

### Section archival

`backend/src/modules/sections/sections.service.ts` uses `archiveSection()`.

Current strengths:

- It blocks archival while active enrollment remains.
- It archives linked classes with the section and preserves adviser/teacher history.
- It prevents permanent deletion while linked academic history exists.

Current difficulty:

- The administrator must resolve every student and class dependency manually before trying again.
- The UI exposes archive as a simple command, even though it is actually a multi-entity academic operation.

### Existing pattern worth reusing

The academic-state alignment recovery feature already provides the correct safety model:

- read-only preview;
- manifest hash to detect stale state;
- explicit blockers and warnings;
- required confirmations;
- administrator password reauthentication;
- reason capture;
- atomic academic transaction; and
- audit logging.

The proposed workflow should reuse this pattern rather than introduce a separate style of privileged mutation.

## Proposed Solution

### 1. Add a contextual Admin Resolution workflow

Add an admin-only workflow reached from blocked Archive and Remove actions. The normal safe action remains available. When dependencies exist, the UI displays **Resolve blockers** instead of ending with a generic error toast.

The resolution center should support:

- removing an erroneous enrollment;
- withdrawing a student;
- transferring a student to another section;
- moving a student to a replacement subject class;
- closing a class while preserving its records;
- closing a section after resolving all enrolled students; and
- purging only an empty record that has no academic evidence.

### 2. Require intent, not just permission

Every privileged action must declare why it is happening. Recommended reason codes:

- `ERRONEOUS_ENROLLMENT`
- `TRANSFERRED_SECTION`
- `TRANSFERRED_SCHOOL`
- `WITHDREW`
- `DUPLICATE_CLASS`
- `CURRICULUM_CORRECTION`
- `TEST_OR_EMPTY_RECORD`
- `OTHER` with mandatory notes

The administrator must also provide an effective date or academic period where relevant. This lets the system apply the correct historical behavior instead of treating every operation as deletion.

### 3. Preview the complete impact

Before execution, return a manifest containing:

- target student, class, or section;
- current school year and period;
- affected section and class enrollments;
- affected class-record periods;
- finalized records, grades, submissions, attempts, and attendance;
- destination section/class when transferring;
- exact rows that will be inserted, updated, completed, dropped, or archived;
- warnings and absolute blockers;
- required confirmations;
- a manifest hash and expiration time.

No data is changed during preview.

### 4. Execute atomically and idempotently

Execution should require:

- `Admin` role;
- current-password reauthentication;
- selected reason and notes;
- the reviewed manifest hash;
- all required confirmations;
- an idempotency key; and
- an unchanged database state/version.

Execution first claims a unique operation row outside the academic transaction. All enrollment, participant, class, section, lifecycle-event, durable-notification, successful operation-result, and audit changes then commit in one `AcademicMutation` transaction. If any required mutation fails, every academic change rolls back and the operation row is marked failed outside the rolled-back transaction.

Durable notification rows are part of the transaction. Socket or provider delivery runs after commit, so delivery failure cannot misreport a committed academic operation as rolled back.

Do not implement a general `force` flag. It is too easy to reuse outside its intended context and provides no record of the administrator's actual intent.

## Rules By Operation

### Remove or transfer a student

Use three distinct operations:

| Intent                                         | Allowed result                                                                                                                                |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Erroneous enrollment with no academic evidence | Mark the mistaken enrollment `dropped`, mark editable participants `not_enrolled`, and append a correction event                           |
| Withdrawal/transfer after activity exists      | Preserve evidence; close the source enrollment with `dropped` or `completed`; mark current/future participation `withdrawn` or `not_enrolled` |
| Transfer to another section/class              | Create destination memberships and close source memberships in the same transaction                                                           |

Additional rules:

- Never delete finalized grades, submissions, attendance, or assessment attempts through this workflow.
- Do not rewrite earlier-quarter rosters merely because the student leaves later.
- Preserve prior-period eligibility and evidence.
- Update only current and future editable periods where a roster status must change.
- If finalized history itself is incorrect, route the administrator to the existing academic repair workflow rather than modifying it silently.
- Notify affected advisers and teachers after commit.

### Archive a class

The preview should distinguish between:

1. no active enrollment in the target class - archive immediately;
2. active learners who can be closed - complete/drop memberships as reviewed, then archive;
3. learners who must continue the subject - require a replacement class and transfer them atomically; and
4. an expected annual curriculum class with no valid replacement - keep this as a blocker or require the dedicated curriculum-repair process.

The existing active-enrollment query should be narrowed during implementation so a class is not blocked only because its section has students. The guard should inspect enrollments belonging to the target class; section-wide dependencies belong to the section workflow.

Archival must retain:

- teacher assignment as historical ownership;
- schedule/room history;
- lessons and assessments;
- class records and grades; and
- audit history.

### Archive a section

Treat this as a guided **Close section** operation rather than a simple toggle.

For every active student, the administrator must select or confirm one outcome:

- transfer to another active section;
- withdraw/transfer out of school;
- complete the enrollment; or
- use the normal school-year transition when closing the entire year.

The transaction should then:

1. validate destination capacity and compatibility;
2. resolve every subject-class enrollment;
3. resolve the section enrollment;
4. preserve all historical academic evidence;
5. archive linked classes;
6. archive the section; and
7. write one operation record plus detailed audit entries.

The section must not be archived if even one student is left without a valid resolution.

### Permanently delete

Permanent deletion must remain intentionally rare.

Allow purge only when the target is archived and has none of the following:

- class records or finalized grades;
- assessment attempts or submissions;
- attendance or behavior records;
- lessons or assessments that form academic history;
- active or historical enrollments that must be retained; or
- another entity that references it as historical evidence.

If evidence exists, the administrator may archive and hide the entity but may not purge it. There should be no break-glass bypass that destroys academic evidence.

## Chosen API Shape

Use a dedicated module such as `admin-lifecycle`, rather than spreading more exception flags through Classes and Sections services.

Use concrete DTO pairs so validation survives at runtime:

```http
POST /api/admin/lifecycle/student/preview
POST /api/admin/lifecycle/student/execute
POST /api/admin/lifecycle/class/preview
POST /api/admin/lifecycle/class/execute
POST /api/admin/lifecycle/section/preview
POST /api/admin/lifecycle/section/execute
POST /api/admin/lifecycle/purge/preview
POST /api/admin/lifecycle/purge/execute
GET  /api/admin/lifecycle/operations/:operationId
```

Every execute DTO extends its matching preview request with:

```ts
{
  manifestHash: string;
  manifestExpiresAt: string;
  currentPassword: string;
  reasonCode: string;
  notes: string;
  confirmations: string[];
  idempotencyKey: string;
}
```

The canonical hash includes the manifest schema version, operation input, current academic state, affected row versions/timestamps, blockers, warnings, and ordered effects. Reusing an idempotency key with a different request hash is always a conflict.

## Web Admin UI Plan

Replace dead-end error handling with dependency-aware actions:

- **Archive now** when the preview is safe and no resolution is needed.
- **Resolve and archive** when students or classes need an outcome.
- **Transfer student** for section/class moves.
- **Withdraw student** for a real departure.
- **Correct enrollment** only for mistaken records.
- **Use school-year transition** when the request is really annual rollover.

The review screen should show:

- affected people and records;
- what will change and what will be preserved;
- blockers versus warnings;
- destination choices;
- reason and notes;
- exact confirmations;
- password confirmation; and
- the audit/operation ID after success.

Bulk actions should first produce one combined preview. Execution can use per-target atomic units, but the result must clearly report successes, failures, and safe retries. Repeating the same idempotency key must not duplicate transfers or notifications.

The UI uses one shared contextual lifecycle dialog with the sequence **Preview -> Intent or resolution -> Changed versus preserved review -> Password -> Result**. Summary counts appear before expandable record detail. Stale previews preserve the administrator's choices while requiring review of a refreshed manifest. Section closure supports applying one outcome or destination to a selected learner group and then editing exceptions rather than forcing a long row-by-row form.

Permanent deletion uses a separate advanced dialog from the archived tab. It is never presented beside routine correction, withdrawal, or transfer actions.

Also correct stale UI copy during implementation: current backend archival preserves teacher/adviser history, while some confirmations say those assignments will be cleared.

## Security And Audit Requirements

- Keep all current role and ownership checks.
- Make lifecycle execution admin-only even if ordinary class unenrollment remains available to authorized teachers.
- Require step-up authentication for every governed execution.
- Rate-limit privileged executions.
- Record before/after snapshots, reason, actor, school year, IP/session metadata where available, and manifest hash.
- Store the successful lifecycle result and its audit entry inside the same transaction as the academic mutation; claim and failed-attempt updates live outside the transaction so rollback evidence is retained.
- Preserve actor identity in audit history even if the administrator account is later disabled or removed; avoid cascading deletion of audit evidence.
- Consider two-person approval only for large bulk actions or changes that require repair of finalized academic history. Routine no-evidence corrections should not become unnecessarily slow.
- Store deduplicated teacher/adviser notification rows inside the transaction and deliver live notification effects after commit so delivery failure cannot roll back a valid academic operation.

## Vertical Implementation Phases

### Phase 0 - Policy, characterization, and additive schema

- Capture current class/section/student guard behavior in tests.
- Document which records count as immutable academic evidence.
- Define exact status transitions for correction, withdrawal, transfer, completion, and archival.
- Add append-only enrollment lifecycle events, idempotent operation records, retained actor snapshots, and audit actor retention.
- Add concrete operation DTOs and execution feature-flag behavior.

### Phase 1 - Contextual preview and immediate safety fixes

- Add operation-specific preview services and typed web consumers.
- Reuse the academic-state alignment manifest-hash and confirmation pattern.
- Correct the target-class archival guard and inaccurate archive confirmation copy.
- Show structured, actionable blocker summaries from the existing admin pages.

### Phase 2 - Student resolution vertical slice

- Implement erroneous-enrollment correction.
- Implement withdrawal while preserving prior evidence.
- Implement atomic section/class transfer.
- Add reasoned audit and post-commit notifications.
- Ship the complete web review/password/result flow and remove ambiguous admin-only removal actions.

### Phase 3 - Class archival vertical slice

- Correct the overly broad section-level enrollment guard.
- Add close/transfer/replace resolutions.
- Preserve curriculum and class-record invariants.
- Ship empty archive, complete/drop, and compatible replacement-class transfer flows with contextual web review.

### Phase 4 - Section archival vertical slice

- Add per-student resolution mapping.
- Resolve linked classes and enrollments atomically.
- Integrate the existing annual-transition path where appropriate.
- Ship grouped learner outcomes, exception editing, and all-or-nothing web review for one section.

### Phase 5 - Bulk results and permanent deletion

- Add safe independent-target bulk preview, complete result reporting, retained failed selections, and retry behavior.
- Add the separate evidence-aware purge preview and execution path for archived records only.
- Centralize purge evidence inventory so direct legacy endpoints cannot bypass it.

### Phase 6 - Hardening and rollout

- Add metrics for preview, blocked, completed, rolled-back, and retried operations.
- Release behind an admin feature flag.
- Test on a production-like database snapshot with anonymized data.
- Enable for a small administrator group before general rollout.

## Required Test Matrix

- Non-admin execution is rejected.
- Wrong or missing current password is rejected.
- An enrollment with no evidence can be corrected.
- A withdrawal preserves previous and finalized records.
- A finalized grade cannot be deleted through lifecycle resolution.
- A transfer creates destination memberships and closes source memberships atomically.
- A failed transfer rolls back every related change.
- Class archival is not blocked by unrelated sibling-class or section-only enrollment.
- A required curriculum class cannot disappear without a valid resolution.
- Section archival is blocked while any student lacks an outcome.
- Guided section transfer closes all dependencies and then archives successfully.
- A stale manifest hash is rejected and requires a new preview.
- Repeating an idempotency key does not duplicate data or notifications.
- Reusing an idempotency key with a different payload is rejected.
- A failed identical request can be safely retried without duplicating completed work.
- Execution disabled by `ADMIN_LIFECYCLE_ENABLED` makes no academic changes while preview remains available.
- Destination section transfers reject grade, school-year, capacity, duplicate-enrollment, and ambiguous subject-mapping mismatches.
- Destination class transfers reject subject, school-year, activity, and duplicate-enrollment mismatches.
- Earlier, finalized, and locked participant evidence remains unchanged.
- Purge remains blocked when any academic evidence exists.
- Audit and operation records survive account deactivation/removal.
- The UI shows actionable blockers rather than only a generic error.
- A stale preview refresh retains selected resolutions but requires a new review.
- Section-sized execution stays within the tested academic-lock duration budget on production-like data.

## Acceptance Criteria

This proposal is complete when:

1. Administrators can resolve legitimate enrollment and archival cases without manual multi-screen cleanup.
2. Every consequential action is previewed, explained, authenticated, atomic, and audited.
3. No route can delete finalized grades or historical academic evidence through a generic override.
4. Transfers and withdrawals preserve the correct prior-quarter history.
5. Archive operations do not fail because of unrelated enrollment data.
6. Failed operations leave the database unchanged and can be retried safely.
7. Teachers and advisers receive accurate post-commit notifications.
8. Existing school-year transition and academic-repair rules remain authoritative.

## Final Position

The administrator should have a stronger operational path, but not a weaker safety model. The best fix is not to remove blockers; it is to make each blocker explain what must be resolved and let the administrator resolve it in one governed transaction.

That approach keeps the protections that make the system reliable while making routine administration practical, traceable, and recoverable.
