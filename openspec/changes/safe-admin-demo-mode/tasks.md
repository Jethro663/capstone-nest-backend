## 1. Durable state and policy contract

- [x] 1.1 Add fail-closed `ADMIN_DEMO_MODE_AVAILABLE` configuration and tests.
- [x] 1.2 Add the immutable relaxed/protected rule catalogs and disjointness tests.
- [x] 1.3 Add `admin_demo_mode_states` Drizzle schema and export.
- [x] 1.4 Add forward-only migration `0021_admin_demo_mode.sql` and environment-template documentation.
- [x] 1.5 Run focused config/policy tests and migration integrity.

## 2. Activation and status API

- [x] 2.1 Add concrete activation/deactivation DTOs with exact validation tests.
- [x] 2.2 Implement server-time status derivation for missing, disabled, active, expired, unavailable, and read-failure states.
- [x] 2.3 Implement password step-up plus atomic optimistic activation.
- [x] 2.4 Implement immediate optimistic deactivation that remains available behind the operational kill switch.
- [x] 2.5 Implement actor-scoped, fail-closed Demo policy context and audit metadata helper.
- [x] 2.6 Add admin-only status/activate/deactivate controller with standard envelopes.
- [x] 2.7 Register the global module/config and pass focused service/controller/build checks.

## 3. Backend workflow integrations

- [x] 3.1 Add paired normal/Demo tests for non-self user archive and restore sequence.
- [x] 3.2 Integrate `user_lifecycle_sequence` without weakening self-protection, identity, archive, audit, or purge rules.
- [x] 3.3 Add paired normal/Demo tests for schedule collision, room/adviser reuse, capacity, historical membership, safe archival, and class restore.
- [x] 3.4 Integrate class rules while preserving time shape, identity/evidence, duplicates, transactions, and class-record capture.
- [x] 3.5 Integrate section rules while preserving role/grade/graduation, duplicates, cross-section reconciliation, and audit.
- [x] 3.6 Integrate roster rules while preserving email/LRN/role/grade and membership reconciliation.
- [x] 3.7 Add actor-scoped `admin_academic_window` tests across academic policy, assessments, and class record.
- [x] 3.8 Integrate admin academic-window relaxation while preserving valid policy period, workbooks, attempts, publication readiness, and score invariants.
- [x] 3.9 Let Demo mode satisfy governed-lifecycle availability only; retain all reviewed execution evidence and purge safeguards.
- [x] 3.10 Run focused backend suites and the administrator contract gate.

## 4. Web controls and consumers

- [x] 4.1 Add shared web types and service for the three new endpoints.
- [x] 4.2 Add admin-only provider with focus/poll refresh, server-time expiry handling, and error tests.
- [x] 4.3 Add compact admin active-mode banner and DashboardLayout integration.
- [x] 4.4 Add route-backed Demo mode System Settings navigation.
- [x] 4.5 Implement responsive accessible activation/deactivation states and tests.
- [x] 4.6 Make class/section conflict choices capability-aware while keeping required/permanent constraints.
- [x] 4.7 Add web archived-class restore and Demo user lifecycle/edit controls without changing permanent purge confirmation.
- [x] 4.8 Run focused web tests, lint, and typecheck.

## 5. Mobile controls and consumers

- [ ] 5.1 Add shared mobile types, authenticated service, and contract tests.
- [ ] 5.2 Add shared React Query status/mutation hook with focus refresh and offline behavior.
- [ ] 5.3 Add `AdminSettingsDemoMode` route and System Settings row without a new drawer destination.
- [ ] 5.4 Implement safe-area/keyboard-aware activation/deactivation screen and state tests.
- [ ] 5.5 Add compact active notice to `AdminScreen` and `AdminPaginatedList`.
- [ ] 5.6 Make class/section/roster options capability-aware while keeping offline writes disabled.
- [ ] 5.7 Add mobile archived-class restore and Demo user lifecycle/edit controls without changing permanent purge confirmation.
- [ ] 5.8 Run focused mobile tests and typecheck.

## 6. Cross-surface proof

- [ ] 6.1 Extend the administrator contract gate for endpoints, fields, rule codes, routes, and forbidden client-authoritative bypasses.
- [ ] 6.2 Add backend E2E for non-admin rejection, activation validation, one relaxed reversible mutation, one permanent blocker, expiry, and deactivation.
- [ ] 6.3 Add local Playwright coverage for activation gating, active banner, navigation, deactivation, and 1440/390 viewports.
- [ ] 6.4 Run complete backend lint/unit/E2E/build/production-start gates.
- [ ] 6.5 Run complete web lint/type/unit/build/dev-smoke gates.
- [ ] 6.6 Run complete mobile type/unit/release-script gates.
- [ ] 6.7 Rehearse fresh and legacy migration paths and replay.
- [ ] 6.8 Review all Demo branches against the allowlist/permanent catalog and fix only task-caused gaps.

## 7. Android package and release

- [ ] 7.1 Read current packaging inputs and verify Temurin JDK 17, Android SDK, production endpoints, signing, version 33 baseline, and release scripts.
- [ ] 7.2 Prepare the next monotonic Android version without modifying iOS build number.
- [ ] 7.3 Build the production ARM64 release APK from the verified mobile source.
- [ ] 7.4 Verify package/version/ABI/signing/embedded URL/size/SHA and committed manifest equality.
- [ ] 7.5 Rerun mobile and frontend checks invalidated by packaging and commit the artifact.
- [ ] 7.6 Push `developement`, prove exact local/remote SHA and `0 0` divergence, and observe exact-SHA CI to terminal success.
- [ ] 7.7 Observe exact-SHA Railway backend/frontend deployments and health to terminal success.
- [ ] 7.8 Enable `ADMIN_DEMO_MODE_AVAILABLE=true` only after healthy migration/deployment and verify the resulting backend deployment.
- [ ] 7.9 Register the exact Android updater record and verify live APK/manifest/policy equality.

## 8. Live acceptance and cleanup

- [ ] 8.1 Log into the deployed web app with the supplied admin account and prove the inactive baseline.
- [ ] 8.2 Prove activation remains blocked until every field is valid and a wrong password leaves state unchanged.
- [ ] 8.3 Activate a 15-minute acceptance window and verify status/banner/Manage navigation across admin workspaces.
- [ ] 8.4 Observe a known relaxed control without mutating existing production academic records.
- [ ] 8.5 Deactivate immediately and prove normal controls/status return after refresh.
- [ ] 8.6 Install and test the exact APK on an attached Android target when available; otherwise record the device boundary.
- [ ] 8.7 Confirm disabled production state, no disposable data, clean worktree, exact SHA, successful CI/deployments, and `0 0` divergence.
- [ ] 8.8 Update task evidence and complete the active goal only when every required outcome is proven or explicitly bounded.
