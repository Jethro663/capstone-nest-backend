## 1. Evidence Reconciliation

- [x] 1.1 Inventory and classify all 23 starting unchecked tasks across the six selected OpenSpec changes.
- [x] 1.2 Write the reconciliation report with exact evidence classes and unresolved device/authenticated-live boundaries.
- [x] 1.3 Update historical task ledgers only where named evidence or a newer release truly satisfies or supersedes the task.

## 2. Workflow Diagnostics

- [x] 2.1 Add failing backend tests for aggregate status counts, oldest age, alerts, caching, coalescing, and database failure.
- [x] 2.2 Implement `WorkflowDiagnosticsService` without identifiers or payloads in its result.
- [x] 2.3 Add failing controller authorization/envelope tests and implement admin-only `GET /health/workflows`.
- [x] 2.4 Run the focused health diagnostics tests to green.

## 3. Workflow Metrics

- [x] 3.1 Add failing metrics-controller tests for fixed-label gauges and diagnostics collection failure.
- [x] 3.2 Register aggregate workflow gauges and inject diagnostics into the metrics module/controller.
- [x] 3.3 Run focused monitoring tests to green and verify no high-cardinality fields are emitted.

## 4. Dynamic System Capabilities

- [x] 4.1 Add failing service tests for role scopes, existing-owner composition, partial failure, and protected-detail exclusion.
- [x] 4.2 Implement the capability types, service, module, and settled owner reads with stable reason codes.
- [x] 4.3 Add failing controller authentication/envelope tests and implement `GET /system/capabilities`.
- [x] 4.4 Register the module and run focused capability tests to green.

## 5. Cross-Client Contract Governance

- [x] 5.1 Add failing Node tests for missing, duplicate, stale, and newly unclassified shared-type baseline entries.
- [x] 5.2 Implement deterministic shared-type coverage checking and seed the reviewed current baseline.
- [x] 5.3 Add system-capability and workflow-diagnostics contracts to the backend/web/mobile manifest.
- [x] 5.4 Wire contract coverage into backend, web, and mobile scripts and run both contract gates to green.

## 6. Web Consumers and Recovery States

- [x] 6.1 Add failing web service tests for capability and workflow envelope parsing.
- [x] 6.2 Add failing `AdminAsyncState` tests for initial failure, cached refresh failure, retry, and accessible status.
- [x] 6.3 Implement web types/services and the recovery-state primitive.
- [x] 6.4 Add failing System Settings and Diagnostics page tests for visible destinations, semantic statuses, workflow aggregates, and partial failure.
- [x] 6.5 Implement the web capability panel and workflow diagnostics section, then run focused tests to green.

## 7. Mobile Consumers and Recovery States

- [x] 7.1 Add failing mobile service tests for capability and workflow envelope parsing.
- [x] 7.2 Add failing mobile `AdminAsyncState` tests for error, stale cached data, retry, and touch-accessible labels.
- [x] 7.3 Implement mobile types/services and the recovery-state primitive.
- [x] 7.4 Add failing Settings Overview and Diagnostics screen tests for visible destinations, semantic statuses, aggregates, and partial failure.
- [x] 7.5 Implement the mobile capability/workflow UI and run focused tests plus typecheck to green.

## 8. Verification and Release

- [x] 8.1 Run strict OpenSpec validation, contract checks, diff review, and all required backend gates.
- [x] 8.2 Run all required web typecheck, test, lint, and production-build gates.
- [x] 8.3 Run all required mobile typecheck, test, design-audit, and production-export gates.
- [x] 8.4 Bump, prepare, build, and verify the next production-signed ARM64 APK with production API configuration.
- [x] 8.5 Review/stage only task-owned changes, commit, push `developement`, and verify local/remote SHA equality.
- [x] 8.6 Observe exact-SHA GitHub CI and Railway deployments to terminal provider state.
- [x] 8.7 Verify live readiness, frontend HTTP, route authorization/available authenticated acceptance, served APK/manifest bytes, and app-version policy.
- [x] 8.8 Record final evidence, limitations, and quick before/after in the plan/change artifacts.

### Release note

The application release is `bea26caab5eacc56ac19d880419d4ff708be9d78`; Android is `0.1.56` build 57. Railway provider deployment succeeded for backend, frontend, and AI. GitHub deploy workflow run `36591445640` was cancelled only after provider success because the legacy default-branch AI CLI process did not exit; this orchestration defect and all authenticated/device boundaries are recorded in the plan and reconciliation report.
