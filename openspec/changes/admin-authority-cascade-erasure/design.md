## Context

The current admin lifecycle stack intentionally allows permanent deletion only when an archived target has no retained evidence. That rule now conflicts with the product requirement that an authenticated school administrator be able to remove an archived class, section, or account even when it contains academic history. The same surfaces also have a web-only bulk defect that opens the first selected target, a status-blind class enrollment duplicate check, and class-record views that default to historical and active learners together.

The backend remains authoritative for authorization, official academic state, audit, and durable jobs. Maintenance Access already provides current-password verification, actor/session-version binding, a short expiry, reason, acknowledgements, and audit context. PostgreSQL relations include a mix of cascade, set-null, and restrict behavior; object storage and BullMQ are outside the database transaction. Web and mobile share typed contracts.

## Goals / Non-Goals

**Goals:**

- Make retained history executable deletion impact in an explicit cascade mode.
- Process a selected homogeneous batch in one review and one atomic database transaction.
- Keep only the controls required for identity, database integrity, concurrency, deterministic cleanup, and accountability.
- Preserve a minimal erasure receipt without retaining the deleted academic payload.
- Correct historical re-enrollment and learner visibility consistently across backend, web, and mobile.
- Keep the existing single-target empty-only contract compatible.

**Non-Goals:**

- Grant destructive authority to teachers, students, or AI.
- Reuse Full Reset for a target deletion.
- Purge an active target without its normal archive/soft-delete transition.
- Delete institutional content solely because its author account is erased.
- Delete audit or erasure-operation rows through this workflow.
- Add mobile cascade-erasure execution UI in this release.

## Decisions

### Maintenance Access is the single step-up boundary

Opening Maintenance Access verifies the current password and binds the capability to the current administrator and session version. Cascade execution requires that active session, one manifest-bound confirmation, and idempotency; it does not ask for the password again. This removes repeated friction while keeping a short, visible, revocable authority window.

Alternative: keep a password field on every execution. Rejected because it duplicates the existing step-up boundary and encourages repeated credential entry without adding actor or target integrity.

### Purge is discriminated by mode

`EMPTY_ONLY` preserves current behavior and is the default for omitted legacy input. `CASCADE_ERASE` converts retained evidence from an immutable blocker into named, high-severity deletion impact. Active targets, self-account deletion, last-active-admin deletion, stale manifests, unknown dependencies, and concurrent reset remain true blockers.

Alternative: remove evidence checks globally or add `force=true`. Rejected because the caller would not know the real database, file, and job blast radius.

### Batch database deletion is atomic

A preview accepts 1–50 unique IDs of one target type. Execute regenerates the exact preview inside one serialized transaction and deletes all selected targets or none. The target list is normalized and included in the manifest hash. File/index cleanup happens after commit and has its own durable state.

Alternative: loop existing single-target dialogs in the browser. Rejected as the final design because refreshes and partial errors lose coherent progress and require dozens of confirmations.

### A target-scoped dependency catalog controls erasure

The backend classifies each relevant relationship as `DELETE`, `DETACH`, or `PRESERVE_RECEIPT`. The preview inventories rows through those selectors and compares the catalog with live PostgreSQL foreign-key metadata. An unclassified relationship blocks before mutation with a stable operator code. Execution uses explicit detach/delete order and then lets declared cascades complete descendants.

For user erasure, participant/private records are deleted while institutional records authored by that user are detached or retain an actor snapshot. For section erasure, linked classes are descendants and are included in the preview and deletion. For class erasure, class-owned academic/content descendants are deleted.

Alternative: convert restrictive FKs broadly to cascade. Rejected because a teacher account could become an accidental ownership root for unrelated school content.

### Separate durable batch receipt tables

`admin_erasure_operations` records request, actor snapshot, hashes, status, aggregate impact, result, and cleanup. `admin_erasure_items` records each target ID/snapshot and per-target impact/result. Target IDs have no FK so receipts survive deletion. These tables are preserved by Full Reset and protected by reset write barriers.

The receipt never contains deleted scores, assessment responses, free-form learner notes, or file contents.

Alternative: overload one-target `admin_lifecycle_operations`. Rejected because batch item and post-commit cleanup state would make that contract ambiguous and harder to replay safely.

### Cleanup is asynchronous but database erasure is synchronous

The execute request completes the bounded database transaction synchronously. If object/index cleanup is required, it enqueues `admin-erasure-cleanup` and returns `cleanup_pending`; the UI treats the records as deleted and polls the existing operation route. Cleanup is idempotent and retryable. Known processors treat missing/erased targets as successful no-ops.

Alternative: put the entire erase in BullMQ. Rejected because authorization and manifest state would be separated from the commit, and the user would not know whether domain deletion had started.

### Historical enrollment reuses the unique row

An active same-class enrollment remains a conflict. A dropped or completed same-class row is reactivated in the enrollment transaction and receives a lifecycle/audit event. Mutable current-period class-record participant eligibility is returned to `eligible`; finalized/locked records retain their governed reopen/confirmation requirement.

### Learner history remains in the contract

Backend class-record responses continue returning active and evidence-bearing historical learners. Web and mobile add `current`, `historical`, and `all` presentation filters. Active/draft workspaces default to `current`; finalized/historical views and exports retain complete evidence.

## Risks / Trade-offs

- **An unexpected deployed FK or legacy table can invalidate the catalog** → hash/introspect the live schema and refuse mutation until the relationship is classified.
- **Large batches can hold academic locks** → cap at 50, sort locks, precompute impact, avoid network calls in the transaction, and expose duration metrics.
- **Object deletion can fail after commit** → capture keys before deletion, persist cleanup state, retry idempotently, and never resurrect domain rows.
- **A stale job can write after erasure** → add missing/erased-target guards to target-aware queue processors and log no-op completion.
- **A stolen bearer token can use an already-open session** → retain the 15-minute actor/session-bound window, visible status, manual close, session-version revocation, self/last-admin guards, and other-admin notification.
- **Permanent academic destruction is irreversible** → present exact grouped counts and one exact batch phrase, preserve a minimal receipt, and require backup/rehearsal evidence before production enablement.
- **Mobile source changes require a new artifact** → follow the existing version, signing, manifest, checksum, and live-download workflow; report debug signing as internal distribution if unchanged.

## Migration Plan

1. Add OpenSpec contract tests and failing unit/client tests.
2. Fix historical enrollment and learner filtering independently.
3. Add migration `0028`, Drizzle schema, reset catalog classification, and write barriers.
4. Add dependency catalog, preview, atomic executor, receipt, and cleanup queue behind `ADMIN_CASCADE_ERASE_ENABLED=false`.
5. Add batch controllers/contracts and web dialog/list integration; keep single-target adapters.
6. Update mobile contracts and learner filtering, then build/verify the required APK.
7. Rehearse deletion and rollback against a disposable database and object store.
8. Commit and push the exact verified revision; observe CI and Railway deployments.
9. Enable the cascade flag only after the deployed revision and rehearsal gates are proven; run an authenticated non-destructive preview before any production deletion.

Rollback disables the cascade feature flag while preserving empty-only lifecycle behavior and all erasure receipts. Database restoration, not the receipt, is the recovery path for already erased records. Migration `0028` remains in place and any correction is forward-only.

## Open Questions

None block implementation. The direct user authorization settles the product decision to ship administrator cascade erasure. Institutional retention policy remains an operational owner responsibility before real academic records are destroyed; deployment and preview do not themselves perform such deletion.
