## 1. Audit baseline

- [x] 1.1 Snapshot the dirty worktree and collect non-mutating Compose, backend, AI, web, and mobile evidence.
- [x] 1.2 Record baseline commands, exit codes, durations, failures, and intentional skips in the audit report.

## 2. pgvector migration

- [x] 2.1 Trace migration ordering and add the approved idempotent forward pgvector migration using repository conventions.
- [x] 2.2 Prove fresh-database extension/schema availability and repeat-run idempotency, or record a reproducible blocker.

## 3. Runtime and boundary audit

- [x] 3.1 Start only the audit-required Compose services in dependency order and record readiness, logs, and passive queue health.
- [x] 3.2 Trace and exercise web and mobile login, refresh, logout, and protected-request flows with available non-privileged seeded accounts.
- [x] 3.3 Trace the backend-to-AI proxy contract, worker registration, headers, timeouts, and retry/idempotency behavior without adding jobs.

## 4. Closeout

- [x] 4.1 Re-run affected verification, execute diff/reference checks, return audit-started services to their prior stopped state, and finalize the audit report.
