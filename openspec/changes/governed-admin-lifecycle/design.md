## Context

Nexora currently exposes student removal and class/section archival through ordinary CRUD endpoints even though each action can affect enrollment rows, class-record participants, finalized evidence, teachers/advisers, and downstream notifications. The backend correctly blocks unsafe changes, but the web admin UI receives only conflict text and often executes bulk requests independently, which leaves administrators to discover dependency order and reconcile partial success themselves.

The repository already has the primitives this change needs: `AcademicMutation` supplies one ambient PostgreSQL transaction plus the academic advisory lock, the academic-state alignment flow proves deterministic manifest hashing and step-up authentication, and notifications can create durable rows within the transaction while delivery occurs after commit. The current enrollment table stores only a coarse status, so it cannot explain why or when a membership ended.

Stakeholders are school administrators performing lifecycle work, teachers/advisers who need accurate post-change notices, and learners whose academic evidence must remain intact. The first release is web-first because large, high-risk resolution reviews need desktop information density; mobile administration remains unchanged.

## Goals / Non-Goals

**Goals:**

- Convert dead-end admin conflicts into previewable and resolvable lifecycle operations.
- Preserve finalized grades, attempts, attendance-equivalent evidence, submissions, lessons, assessments, and earlier-period roster truth.
- Record every governed enrollment transition as append-only evidence while keeping a query-efficient current status.
- Make each student, class, or section operation atomic and idempotent.
- Keep permanent deletion exceptional, separate, and evidence-aware.
- Deliver each backend capability together with its contextual web admin workflow.

**Non-Goals:**

- A generic database editor or reusable `force` flag.
- Rewriting finalized grades or repairing incorrect finalized history; those cases continue through academic repair.
- Replacing annual school-year transition.
- Mobile UI parity in the first release.
- Two-person approval; the operation model leaves room for it without imposing it on routine corrections.

## Decisions

### 1. Use vertical lifecycle slices rather than a single all-at-once backend phase

The implementation order is policy/schema foundation, contextual preview, student resolution, class closure, section closure, and finally bulk/purge hardening. Every slice includes backend, web UI, tests, and documentation. This makes admin usability improve as soon as each safe operation exists and avoids building an unreviewed backend surface before the workflow is usable.

Alternative considered: finish all backend operations before adding UI. Rejected because it postpones the stated usability outcome and makes API mistakes expensive to discover.

### 2. Keep coarse enrollment status and add append-only lifecycle events

Existing queries continue to use `enrolled`, `dropped`, and `completed`. `CORRECT_ENROLLMENT` and `WITHDRAW` end current memberships as `dropped`; `COMPLETE` ends them as `completed`. The exact semantic outcome, effective grading period, reason code, notes, actor snapshot, and source/destination identities live in `enrollment_lifecycle_events`. Rows are never updated after insertion.

Alternative considered: add `voided`, `withdrawn`, and `transferred` to the enrollment enum. Rejected because it would force every existing enrollment consumer to understand operational detail it does not need. The event provides precise history without destabilizing active-enrollment reads.

### 3. Store execution operations, not abandoned previews

Preview runs in a repeatable-read, read-only transaction and returns a canonical manifest, required confirmations, a hash, and an expiry timestamp. It does not persist academic or operation data. Execution receives the same typed request plus the reviewed hash, expiry, confirmations, reason, notes, password, and idempotency key.

Before the academic transaction, execution claims a unique operation row with `executing` status and a request hash. A completed replay returns the stored result; the same key with another payload conflicts; an in-progress replay conflicts; a failed identical request may atomically increment its attempt number and retry. The successful mutation, events, operation result, durable notifications, and audit row commit together. On rollback, the operation is marked failed outside the rolled-back transaction.

Alternative considered: persist every preview. Rejected because abandoned previews create noisy operational data without improving correctness.

### 4. Use concrete, runtime-valid DTOs behind operation-specific preview/execute endpoints

Endpoints are grouped under `/api/admin/lifecycle`:

- `POST /student/preview` and `POST /student/execute`
- `POST /class/preview` and `POST /class/execute`
- `POST /section/preview` and `POST /section/execute`
- `POST /purge/preview` and `POST /purge/execute`
- `GET /operations/:operationId`

Each pair uses concrete `class-validator` DTO classes. This avoids relying on erased TypeScript unions while preserving one frontend service abstraction.

### 5. Define exact student-resolution semantics

- `CORRECT_ENROLLMENT`: allowed only when the target memberships have no attempts, class-record scores, finalized/locked participant evidence, attendance/behavior evidence when present, or other retained results. Source rows become `dropped`; draft participant rows become `not_enrolled`; the event outcome records that the membership was erroneous.
- `WITHDRAW`: source section and class rows become `dropped`; current and future draft class-record participants become `withdrawn`; finalized and earlier periods remain untouched.
- `TRANSFER_SECTION`: destination must be active, in the same school year and grade, under capacity, and not already hold an active section membership for the learner. Every active source subject class must have exactly one active destination class with the same normalized subject code. Destination memberships are created before source memberships close in the same transaction. Current/future draft source participants become `transferred`.
- `TRANSFER_CLASS`: destination must be active, belong to the same school year and subject code, and not already enroll the learner. The source class row closes and the destination class row is created atomically without changing section membership.

The effective grading period is required. Finalized/locked periods are never mutated; if the requested effective period is earlier than the current academic period, execution blocks and directs the administrator to academic repair.

### 6. Define class and section closure semantics

Class preview only checks active memberships whose `class_id` is the target class. An empty class archives immediately. An enrolled class requires one explicit resolution for its learners: complete, drop, or transfer all to one compatible replacement class. Expected current-year curriculum classes without a compatible replacement remain absolute blockers.

Section closure requires one outcome per active learner, but the web UI supports applying a shared outcome/destination to a selected group and then editing exceptions. One section is all-or-nothing. If the section belongs to the current school year and the requested outcome is normal year completion, the preview returns `USE_ACADEMIC_TRANSITION` as an absolute redirect rather than duplicating the transition workflow.

Multiple independent class or section operations may run as separate atomic targets. Partial bulk results are explicit, retain failed selections, and may be retried with new idempotency keys.

### 7. Separate purge from routine resolution

Purge is reachable only from archived records and has its own danger review. A class purge is blocked by any linked enrollment history, class record, score, assessment attempt, assessment, lesson, completion, attendance/behavior evidence, or lifecycle event that requires the class identity. A section purge is blocked by any linked class or enrollment history. There is no override.

### 8. Keep orchestration separate from domain mutation helpers

`AdminLifecycleService` owns authorization-independent orchestration: snapshot collection, canonical manifests, idempotency, step-up authentication, transaction boundaries, operation results, audit, and notification creation. Focused private/apply helpers own student, class, section, and purge mutations. Existing Classes and Sections endpoints retain teacher-compatible behavior; only the incorrect class archive guard and stale copy are corrected directly.

### 9. Use contextual, progressively disclosed web UI

Blocked or high-risk actions open one reusable `AdminLifecycleDialog`. The flow is Preview -> Intent/Resolution -> Review Changed and Preserved -> Password -> Result. Summary counts appear first; affected records are expandable. Stale previews preserve choices, refresh, and highlight the need to review again. Permanent deletion uses a separate advanced dialog. Results show the operation ID and every target failure; failed items stay selected.

### 10. Feature flag and rollout

`ADMIN_LIFECYCLE_ENABLED` gates execution and defaults to `false`; previews remain available so administrators can understand blockers before enablement. The production rollout explicitly enables execution after migrations, focused tests, full backend/web gates, and an anonymized production-like smoke. Metrics use action/status counts and durations only, never student identifiers as labels.

## Risks / Trade-offs

- [Large section transactions hold the global academic lock] -> Keep one section atomic, precompute read-only previews, lock/revalidate only affected rows at execution, set a tested maximum target size, and measure transaction duration on production-like data.
- [Event history and coarse status can disagree] -> Write status updates and lifecycle events in the same transaction and test every transition pair.
- [Manifest misses a dependency] -> Build hashes from canonical snapshots that include every mutation precondition, add a manifest schema version, and recompute under the academic lock before applying.
- [Failed operation logging is lost on rollback] -> Claim/update the operation row outside the academic transaction while keeping successful result mutation inside it.
- [Generic orchestration becomes a god service] -> Keep manifest builders and per-operation apply helpers in focused files with concrete inputs and independent tests.
- [Step-up authentication adds friction] -> Require one password confirmation per reviewed atomic operation or reviewed bulk batch, never per learner row.
- [Purge checks drift as new evidence tables appear] -> Centralize evidence inventory and add a test that enumerates every class-owned academic table.

## Migration Plan

1. Add operation and lifecycle-event tables, indexes, and audit actor retention changes without changing existing enrollment rows.
2. Deploy preview endpoints and web blocker summaries while execution remains disabled.
3. Validate manifests and transaction duration against seeded and anonymized production-like data.
4. Enable governed execution for the administrator cohort through `ADMIN_LIFECYCLE_ENABLED=true`.
5. Monitor preview, blocked, completed, failed, stale, retry, and duration metrics; then retain the flag as an emergency execution kill switch.

Rollback disables execution first. New tables are additive and may remain during application rollback; append-only events and completed operation records must not be deleted. The class guard correction can be reverted independently only if its regression test demonstrates an unforeseen curriculum invariant.

## Open Questions

None. The first-release decisions are fixed above; new evidence discovered during implementation must amend this design before changing behavior.
