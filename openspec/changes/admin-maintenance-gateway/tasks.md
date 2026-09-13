## 1. Characterization and Contracts

- [x] 1.1 Add failing backend tests for actor isolation, expiry/session-version invalidation, permanent safeguards, and teacher isolation.
- [x] 1.2 Add failing contract tests for Maintenance Access routes, decision fields, next actions, and forbidden client bypass authority.
- [x] 1.3 Add failing web and mobile tests proving admin class removal uses lifecycle review and structured resolutions instead of a direct generic-error path.

## 2. Durable Maintenance Access

- [x] 2.1 Add migration `0027`, Drizzle schema/exports/metadata, indexes, and constraints for actor-bound maintenance sessions.
- [x] 2.2 Add the maintenance session table to System Reset's explicit catalog/deletion ordering and prove reset clears it.
- [x] 2.3 Implement Admin Maintenance DTOs, fixed policy catalog, status types, service, controller, module, configuration, and audit behavior until focused tests pass.
- [x] 2.4 Bind effective sessions to the active verified Admin and `session_version`; implement open, replace, expiry, close, and fail-closed reads.

## 3. Backend Policy Cutover

- [x] 3.1 Replace active Demo Mode injection in users, classes, sections, roster import, academic policy, and lifecycle execution with actor-bound Maintenance Access.
- [x] 3.2 Preserve permanent security/evidence rules and map only server-owned operational rules/scopes to Maintenance Access, with exact audit metadata.
- [x] 3.3 Disable global Demo Mode activation as a runtime authority while returning stable fail-closed compatibility responses for older clients.
- [x] 3.4 Add teacher and inactive-admin regression tests for every shared service path changed by the cutover.

## 4. Actionable Lifecycle Gateway

- [x] 4.1 Add deterministic decision derivation and typed next actions to lifecycle manifests without removing compatibility fields.
- [x] 4.2 Add `/admin/maintenance` student, class, section, purge, and operation route aliases to the existing lifecycle handlers.
- [x] 4.3 Accept routine session-bound execution, retain fresh password/exact confirmation for purge, and reject stale/foreign action evidence.
- [x] 4.4 Route account lifecycle/purge through the maintenance policy seam while preserving self protection and evidence-aware deletion.

## 5. Web Admin Cutover

- [x] 5.1 Implement Maintenance Access service, types, provider, banner, settings route, expiry/error states, and focused tests.
- [x] 5.2 Replace active Demo Mode imports and policy-dependent UI in admin layout, forms, users, classes, and sections.
- [x] 5.3 Render decisions, warnings, preserved data, and executable next actions in `AdminLifecycleDialog`.
- [x] 5.4 Replace admin class-detail direct learner removal with lifecycle preview/review/execute and regression coverage.
- [x] 5.5 Verify Full Reset copy explicitly states all live academic data, finalized grades, and non-initiating accounts are deleted.

## 6. Mobile Admin Cutover

- [x] 6.1 Implement matching Maintenance Access API, types, hook, notice, settings screen, navigation, and tests.
- [x] 6.2 Replace active Demo Mode imports in admin class, roster, section, and user screens without changing teacher screens.
- [x] 6.3 Render decisions and executable next actions in `AdminLifecycleReviewScreen`, including offline, back, expiry, and secret-clearing behavior.
- [x] 6.4 Update the mobile admin parity manifest and route/contract tests.

## 7. Full Verification and Review

- [x] 7.1 Pass focused backend/web/mobile tests through red-green-refactor cycles and update task evidence.
- [x] 7.2 Pass backend migration integrity, build, lint, unit, e2e, academic, and disposable System Reset suites.
- [x] 7.3 Pass web contract, Jest, typecheck, lint, build, and browser interaction/viewport checks.
- [x] 7.4 Pass mobile contract, Jest, typecheck, full tests, and required AI reset-participant/cache tests.
- [x] 7.5 Run a code review against the plan/specs, resolve all critical/important findings, and re-run affected verification.

## 8. Android Package and Exact-SHA Release

- [x] 8.1 Bump the Android app version/build and prepare a new ARM64 release using repository scripts.
- [ ] 8.2 Verify APK identity, version, ABI, signature, API URL, size, SHA-256, app-version registration, and served download integration.
- [ ] 8.3 Inspect every outgoing commit on `developement`, commit the scoped change, and push without force.
- [ ] 8.4 Verify exact pushed SHA in GitHub Actions and Railway deployment/provider status.
- [ ] 8.5 Run non-destructive live health, Maintenance Access capability/status, System Reset capability/status, and served APK checks without executing Full Reset.
- [ ] 8.6 Record release evidence and explicitly report any physical ARM64 or authenticated-live boundary that remains unverified.
