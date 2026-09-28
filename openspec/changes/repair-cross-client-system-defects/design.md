## Context

The current public HTTP and database contracts are adequate, but four implementation seams violate system invariants: performance diagnostics are triggered outside BullMQ, affected clients bypass current academic-state authority, rejected reads collapse into successful empty state, and release tooling does not share Gradle's SDK discovery. The canonical evidence and file-level execution plan are `docs/feature-analysis/2026-09-28-whole-system-web-mobile-defect-forensic.md` and `docs/feature-plans/2026-09-28-cross-client-defect-remediation.md`.

## Goals / Non-Goals

**Goals:**

- Make performance diagnostics restart-safe and idempotently recoverable.
- Make backend current academic state the initial default on affected clients while preserving deliberate future planning.
- Separate request errors from successful empty results.
- Prevent page-level request routes and Gradle SDK configuration from escaping repository verification.
- Preserve public envelopes, auth/RBAC, schema, academic/audit history, and existing release mechanisms.

**Non-Goals:**

- No schema migration, bulk data repair, new external dependency, visual redesign, or direct client-to-AI call.
- No physical-device acceptance claim without executed device evidence.

## Decisions

1. **Use the existing performance queue with a dedicated producer/reconciler.** A new job name and typed payload extend the established reset-fenced BullMQ boundary without coupling backend-only diagnostics to the general AI-service queue. A process-local timer plus sweeper was rejected because it retains two execution authorities.
2. **Keep the HTTP contract stable.** Queue durability is internal. Queue unavailability marks the new DB row failed with public-safe text and rejects creation, preventing a false queued response.
3. **Reconcile nonterminal jobs at bootstrap with deterministic BullMQ IDs.** Existing Redis jobs deduplicate; missing jobs are recreated from persisted source filters. The runner checks terminal state and existing output before generating.
4. **Use the existing authenticated current-state clients.** No `/academic-state/active` alias is added. Blank create forms receive the official year; edited records and explicit planning-year choices are not overwritten.
5. **Model errors separately at each affected screen.** Initial errors show retry instead of empty copy; refresh errors preserve prior rows where available.
6. **Expand verification where calls actually occur.** Contract scanning includes application/screen TSX and native backend fetch expressions while excluding tests.
7. **Share standard Android checkout configuration.** Tool resolution uses explicit option/env first, then parses `android/local.properties`; CI overrides remain authoritative.

## Risks / Trade-offs

- **Duplicate delivery could duplicate outputs** → deterministic queue IDs plus terminal/output-exists guards.
- **A crash during output/status writes can leave mixed state** → reconcile existing output to completed status before recomputation; retain audit history.
- **Bootstrap may see active Redis work** → the same BullMQ job ID is reused, so enqueue remains idempotent.
- **Official-state refresh could overwrite admin intent** → initialize only blank creation state; editing preserves record year.
- **Route scanning could include non-backend URLs** → normalize only backend-looking paths and exclude test/generated sources.
- **Local properties escaping differs by OS** → unit-test POSIX and escaped Windows values and retain explicit environment precedence.

## Migration Plan

1. Land regression tests and implementation as one compatible change; no database migration is required.
2. Run all backend/web/mobile gates and package a fresh Android artifact because the mobile JavaScript bundle changes.
3. Push the current `developement` branch and observe exact-SHA CI, Railway, health, and served artifact/manifest evidence.
4. If queue deployment fails, stop accepting new diagnostic creation, reconcile nonterminal rows, and pause/drain new jobs before rollback. Never re-enable the timer while queued jobs exist.
5. Client and SDK resolver changes can roll back independently without stored-data mutation.

## Open Questions

None blocking. Production academic-year data alignment and physical-device acceptance remain evidence boundaries, not design decisions for this implementation.
