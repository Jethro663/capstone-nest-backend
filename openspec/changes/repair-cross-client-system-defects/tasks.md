## 1. Durable Performance Diagnostics

- [x] 1.1 Add failing producer tests for deterministic enqueue, system-reset fencing, bootstrap reconciliation, and queue failure propagation
- [x] 1.2 Implement `PerformanceAnalysisQueueService` on the existing performance queue and register it in `PerformanceModule`
- [x] 1.3 Add failing processor tests for the `performance-analysis` job payload and dispatch
- [x] 1.4 Add failing service tests for durable creation failure and duplicate-output recovery
- [x] 1.5 Replace process-local analysis execution with durable enqueue and processor-owned execution
- [x] 1.6 Run focused backend performance tests and build

## 2. Bounded Web Performance Waiting

- [x] 2.1 Add a failing fake-timer regression test for a permanently nonterminal analysis job
- [x] 2.2 Implement a finite polling bound, interval cleanup, and retryable timeout state
- [x] 2.3 Run the focused teacher-performance page test

## 3. Authoritative Academic Year and Truthful Web Reads

- [x] 3.1 Add failing Admin Calendar tests for authenticated current-state use and rejected event reads
- [x] 3.2 Replace the raw academic-state fetch with the canonical service and add Calendar error/retry state
- [x] 3.3 Add failing Admin Announcements tests for class-load and feed-load rejection
- [x] 3.4 Implement Announcements error/retry state while preserving last successful rows
- [x] 3.5 Run focused web admin tests

## 4. Authoritative Academic Year and Truthful Mobile Reads

- [x] 4.1 Add failing mobile tests for official-year initialization and Calendar rejected-read behavior
- [x] 4.2 Implement a shared current-academic-state query hook
- [x] 4.3 Update Admin Calendar, Classes, and Sections defaults/reset behavior without overwriting edited records
- [x] 4.4 Render Calendar load errors with retry instead of a zero-record claim
- [x] 4.5 Run focused mobile tests and typecheck

## 5. Contract and Release Gates

- [x] 5.1 Add a failing route-contract assertion for TSX native backend fetch discovery
- [x] 5.2 Expand route inventory to application/screen TSX and native fetch calls, excluding tests
- [x] 5.3 Add failing release-script tests for Gradle local SDK discovery and precedence
- [x] 5.4 Implement shared Android SDK-root resolution for `aapt` and `apksigner`
- [x] 5.5 Run the contract gate, release-script tests, and plain `release:verify`
- [x] 5.6 Reproduce the exact-SHA Railway frontend HTTP 413 and isolate historical APK upload growth
- [x] 5.7 Add a release-managed Railway allowlist for the current immutable APK and guard it with release tests/verification

## 6. Full Verification and Android Packaging

- [x] 6.1 Run backend lint, build, migration integrity, and full tests
- [x] 6.2 Run web typecheck, lint, build, and full tests
- [x] 6.3 Run mobile typecheck, design audit, full tests, and production export
- [x] 6.4 Prepare and build the next Android release through existing scripts
- [x] 6.5 Verify APK identity, version, ABI, signature, alignment, API URL, size, SHA-256, embedded download artifact, and manifest
- [x] 6.6 Review the final diff against F-01 through F-04 and run whitespace/status checks

## 7. Ship and Observe

- [x] 7.1 Fetch upstream and verify divergence plus all outgoing history
- [x] 7.2 Stage only task-owned changes, preserve the pre-existing user-edited report, commit, and push `developement`
- [x] 7.3 Verify the remote branch contains the final SHA
- [x] 7.4 Observe exact-SHA GitHub CI and downstream Railway deployments to terminal status
- [x] 7.5 Verify live health plus served APK/manifest bytes and checksum, then record before/after evidence
