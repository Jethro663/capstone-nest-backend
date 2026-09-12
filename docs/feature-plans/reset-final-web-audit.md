# Final web audit: reset school data

**Decision: RESOLVED — APPROVE**

This began as an independent source audit of the current admin settings reset flow and public maintenance page. The three findings below were then implemented with focused regression coverage. No destructive endpoint or live backend was used. The review checked the fixed reset contract, accessibility, confirmation, recovery identity, all-409 handling, local cleanup, public progress, responsive layout, and backend API shape.

## Resolved findings

### [RESOLVED P1] Keep the operation identity after an uncertain POST even if the tab is closed

The original implementation stored the only authoritative operation ID in `sessionStorage`, so closing an uncertain request's tab could discard its idempotency key before the URL was populated.

Resolved at `next-frontend/src/lib/system-reset-session.ts:5-30`: the UUID-only record now uses `localStorage`, retains an existing valid UUID as authoritative, refuses a different UUID, and removes malformed records before accepting a new valid identity. Terminal removal remains separately verified at `next-frontend/src/lib/system-reset-session.ts:37-47`. Unit coverage at `next-frontend/src/lib/system-reset-session.test.ts:15-40` proves saved-ID-over-URL authority, survival after clearing tab-scoped storage, malformed-record recovery, and no URL-only adoption. The mocked browser flow at `next-frontend/tests/e2e/system-reset-flow.spec.ts:198-211` now asserts durable UUID-only persistence and absence from `sessionStorage`.

### [RESOLVED P2] Clear persisted school content and job state from the browser

The original matching-completion path cleared in-memory auth/query state and only one session key, leaving pending assessment payloads, class-template drafts, AI/extraction job records, notification state, and teacher pending-count cache behind.

Resolved by the scoped inventory in `next-frontend/src/lib/system-reset-client-state.ts:1-15` and verified deletion in `next-frontend/src/lib/system-reset-client-state.ts:17-53`. It removes only the six known local content prefixes plus the two known session content keys/prefixes; it does not call `Storage.clear()`, so sidebar and sound preferences remain. `next-frontend/src/components/admin/system-settings/SystemMaintenance.tsx:99-140` runs this cleanup with auth and query cleanup, attempts every step, retains the reset UUID if any step fails, and exposes the existing retry action. The maintenance test seeds and verifies every owned cache family while proving real preferences survive at `next-frontend/src/components/admin/system-settings/SystemMaintenance.test.tsx:69-112`; the storage-denial retry remains covered later in that suite. Mocked browser coverage verifies the same terminal behavior at `next-frontend/tests/e2e/system-reset-flow.spec.ts:212-267`.

### [RESOLVED P2] Keep one `main` landmark on the reset settings route

The protected dashboard already owns the page's `main` landmark at `next-frontend/app/(dashboard)/layout.tsx:218-225`. The settings shell previously nested another unlabelled `main` around the reset route.

Resolved at `next-frontend/src/components/admin/system-settings/SystemSettingsShell.tsx:148-210`: the inner settings content is now a non-landmark `div`, leaving the dashboard as the sole main landmark. `next-frontend/src/components/admin/system-settings/SystemSettingsShell.test.tsx:21-54` asserts the shell does not create a second `main`.

## Contract checks that passed static review

- The confirmation form requires the backend preview, unexpired token, reason, current password, exact phrase, and every required acknowledgement before enabling the destructive action (`ResetSchoolData.tsx:80-98`, `ResetSchoolData.tsx:701-850`).
- Every HTTP 409 preserves the saved UUID and routes to progress rather than clearing or minting another identity (`ResetSchoolData.tsx:309-318`). A 404 from owned lookup is treated as inconclusive (`ResetSchoolData.tsx:240-259`).
- A locally saved UUID stays authoritative over a different URL UUID, while URL-only identity requires an explicit authenticated owned-receipt lookup (`SystemMaintenance.tsx:142-169`, `SystemMaintenance.tsx:204-217`).
- Public polling skips auth refresh and session-expiry redirects, the public route is admitted by the proxy, and terminal cleanup happens only for an exact matching operation (`system-reset-service.ts:13-16`, `system-reset-service.ts:60-66`, `next-frontend/proxy.ts:12-20`, `SystemMaintenance.tsx:45-47`).
- The frontend endpoint paths, request fields, response envelope, period keys, operation phases/statuses, and 202 acceptance shape align with the current backend controller/service contract.
- The reset review uses labelled controls, focus transfer to the review heading, live error/status regions, wrapping action rows, and an overflow-safe technical table. Existing mocked browser coverage checks the 390-pixel layout, and the settings-shell unit test now covers landmark ownership.

## Verification evidence

- TDD red run: the focused command failed exactly four assertions covering durable UUID storage, malformed-record cleanup, persisted cache deletion, and the nested main landmark before implementation.
- Focused reset Jest run: **7 suites, 39 tests passed**, zero failures.
- `npm run typecheck`: passed, including **21 administrator contracts across 63 layer checks** and `tsc --noEmit`.
- `npm run lint`: passed with exit code 0 under the repository's `--max-warnings 5` gate.
- `git diff --check -- next-frontend docs/feature-plans/reset-final-web-audit.md`: passed.
- The mocked Playwright flow was updated for durable storage, all known cache families, preference preservation, and secret non-persistence. It was not started in this subtask because the assignment explicitly excluded running a web server; it remains part of the root release browser gate.
