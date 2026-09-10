# Governed Admin Lifecycle Resolution Plan

**Status:** Proposal only - no source-code changes included

**Date:** 2026-09-10

**Scope:** Admin removal of students, class archival, section archival, and permanent deletion safeguards

## Executive Recommendation

The existing security rules should not be removed, and administrators should not receive a generic bypass such as `force=true`.

Instead, add a **Governed Admin Resolution** workflow. It should let an administrator resolve the dependencies that currently block an operation, preview every consequence, provide a reason, re-enter their password, and apply all related changes in one database transaction. Academic records, grades, attempts, and historical evidence must remain protected.

The design principle is:

> An administrator may override workflow restrictions, but may not silently violate academic-history invariants.

This turns current blockers into one of two categories:

1. **Resolvable blocker:** the system offers a safe action such as withdraw, transfer, complete enrollment, or select a replacement class.
2. **Absolute blocker:** permanent deletion would destroy academic evidence, so only archival or status changes are allowed.

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

### 1. Add an Admin Resolution Center

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

### 4. Execute atomically

Execution should require:

- `Admin` role;
- current-password reauthentication;
- selected reason and notes;
- the reviewed manifest hash;
- all required confirmations;
- an idempotency key; and
- an unchanged database state/version.

All enrollment, participant, class, section, notification, operation-ledger, and audit changes should commit in one `AcademicMutation` transaction. If any required mutation fails, everything rolls back.

Do not implement a general `force` flag. It is too easy to reuse outside its intended context and provides no record of the administrator's actual intent.

## Rules By Operation

### Remove or transfer a student

Use three distinct operations:

| Intent | Allowed result |
| --- | --- |
| Erroneous enrollment with no academic evidence | Delete the mistaken enrollment or mark it dropped, according to retention policy |
| Withdrawal/transfer after activity exists | Preserve evidence; close the source enrollment with `dropped` or `completed`; mark current/future participation `withdrawn` or `not_enrolled` |
| Transfer to another section/class | Create destination memberships and close source memberships in the same transaction |

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

## Suggested API Shape

Use a dedicated module such as `admin-lifecycle`, rather than spreading more exception flags through Classes and Sections services.

```http
POST /api/admin/lifecycle/preview
POST /api/admin/lifecycle/execute
GET  /api/admin/lifecycle/operations/:operationId
```

The preview request should be a discriminated DTO:

```ts
type AdminLifecycleRequest =
  | {
      action: 'STUDENT_RESOLUTION';
      studentId: string;
      sectionId: string;
      resolution: 'CORRECT_ENROLLMENT' | 'WITHDRAW' | 'TRANSFER';
      destinationSectionId?: string;
      effectivePeriodId?: string;
    }
  | {
      action: 'ARCHIVE_CLASS';
      classId: string;
      replacementClassId?: string;
    }
  | {
      action: 'ARCHIVE_SECTION';
      sectionId: string;
      studentResolutions: StudentResolution[];
    };
```

The execute request should add:

```ts
{
  manifestHash: string;
  currentPassword: string;
  reasonCode: string;
  notes: string;
  confirmations: string[];
  idempotencyKey: string;
}
```

## Admin UI Plan

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

Also correct stale UI copy during implementation: current backend archival preserves teacher/adviser history, while some confirmations say those assignments will be cleared.

## Security And Audit Requirements

- Keep all current role and ownership checks.
- Make lifecycle execution admin-only even if ordinary class unenrollment remains available to authorized teachers.
- Require step-up authentication for every governed execution.
- Rate-limit privileged executions.
- Record before/after snapshots, reason, actor, school year, IP/session metadata where available, and manifest hash.
- Store the lifecycle operation and its audit entries inside the same transaction as the academic mutation.
- Preserve actor identity in audit history even if the administrator account is later disabled or removed; avoid cascading deletion of audit evidence.
- Consider two-person approval only for large bulk actions or changes that require repair of finalized academic history. Routine no-evidence corrections should not become unnecessarily slow.
- Deliver teacher/adviser notifications after commit so notification failure cannot roll back a valid academic operation.

## Implementation Phases

### Phase 0 - Characterization and policy tests

- Capture current class/section/student guard behavior in tests.
- Document which records count as immutable academic evidence.
- Define exact status transitions for correction, withdrawal, transfer, completion, and archival.

### Phase 1 - Preview and operation manifest

- Add the lifecycle DTOs and preview service.
- Reuse the academic-state alignment manifest-hash and confirmation pattern.
- Add an operation ledger with `previewed`, `executing`, `completed`, `failed`, and `expired` states.

### Phase 2 - Student resolution

- Implement erroneous-enrollment correction.
- Implement withdrawal while preserving prior evidence.
- Implement atomic section/class transfer.
- Add reasoned audit and post-commit notifications.

### Phase 3 - Class archival

- Correct the overly broad section-level enrollment guard.
- Add close/transfer/replace resolutions.
- Preserve curriculum and class-record invariants.

### Phase 4 - Section archival

- Add per-student resolution mapping.
- Resolve linked classes and enrollments atomically.
- Integrate the existing annual-transition path where appropriate.

### Phase 5 - Admin UI

- Add preview, blocker resolution, review, password confirmation, and result views.
- Replace generic error toasts with actionable dependency summaries.
- Add safe bulk preview and retry behavior.

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
- Purge remains blocked when any academic evidence exists.
- Audit and operation records survive account deactivation/removal.
- The UI shows actionable blockers rather than only a generic error.

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
