# Safe System Improvements Implementation Plan

> **For agentic workers:** Execute inline in the current checkout. Follow TDD for each behavioral increment, preserve unrelated work, and use the repository's exact-SHA release gates.

**Goal:** Ship five additive safety improvements: reconciled verification evidence, a backend-owned dynamic capability snapshot, read-only workflow diagnostics, shadow cross-client contract coverage, and consistent recoverable query states on web and mobile.

**Architecture:** Existing domain owners remain authoritative. A new read-only `system/capabilities` module composes academic state, Maintenance Access, and dependency readiness without storing replacement flags. Workflow diagnostics remain separate from liveness/readiness and expose aggregate durable-job evidence only. Web and mobile consume the additive contracts gradually; the existing administrator contract manifest and new shared-type coverage inventory detect drift without replacing platform-specific transports.

**Tech stack:** NestJS 11, Drizzle/PostgreSQL, Prometheus `prom-client`, Next.js 16/React 19, Expo 54/React Native 0.81, Jest/Node test runner, OpenSpec, Railway/GitHub Actions.

## Global constraints

- No new database table or migration.
- Backend remains the authority for RBAC, academic state, maintenance policy, diagnostics visibility, and response envelopes.
- The capability snapshot is additive and read-only; existing owner endpoints stay available.
- `/health/live` and `/health/ready` remain fast process/dependency checks. Workflow details use a separate authenticated admin route.
- Metrics contain aggregate counts/ages only: no user IDs, job payloads, class IDs, reasons, or unbounded labels.
- Web and mobile never infer permission from hidden navigation; disabled/read-only states include a backend reason code.
- Contract shadowing must not replace web cookie transport or mobile secure-storage transport.
- Preserve `/home/jethro/Documents/Projects/capstone-nest-backend/docs/feature-analysis/2026-09-21-mobile-teacher-modernization-and-updater-analysis.md` as unrelated user work.
- Mobile bundle changes require a new production-signed ARM64 APK through the current release flow.

---

## 1. Decision summary and feature brief

### Recommended design

Use an **additive aggregation design**:

1. Domain services calculate their existing truth.
2. `SystemCapabilitiesService` converts owner results into a stable versioned status model.
3. `WorkflowDiagnosticsService` computes bounded aggregate job health and feeds an admin route plus Prometheus gauges.
4. Web/mobile render the same semantic states with platform-native components.
5. CI maintains the existing explicit administrator contract manifest and detects newly introduced untracked shared type surfaces.

This design is selected because it adds observation and shared interpretation while leaving all write paths and official policy owners untouched.

### Rejected alternatives

| Option | Benefit | Conflict | Decision |
|---|---|---|---|
| Generic `system_settings` / `feature_flags` database table | Easy runtime toggles | Can duplicate RBAC, academic policy, destructive safeguards, and audit owners; requires migration and conflict semantics | Reject for this change |
| Client-only capability inference | No backend work | Web/mobile drift and authorization ambiguity remain; failure can look like disabled business state | Reject |
| Add capability fields directly to `/health/ready` | One request | Couples traffic readiness to role/policy/database aggregation and can make health checks slow or sensitive | Reject |

## 2. Scope, non-goals, permissions, and assumptions

### In scope

- Reconcile the 23 currently unchecked evidence tasks in six existing OpenSpec changes without fabricating device/live proof.
- Add authenticated `GET /api/system/capabilities` for all authenticated roles.
- Add admin-only `GET /api/health/workflows` and aggregate Prometheus gauges.
- Add typed web/mobile services and status UI on System Settings and Diagnostics.
- Add small per-platform async-state primitives and adopt them on the touched screens.
- Add contract-manifest coverage for the new API and a baseline-aware shared-type coverage gate.
- Run all affected checks, build/package Android, commit, push `developement`, observe exact-SHA CI/Railway, register update policy, and verify served bytes.

### Non-goals

- No generic mutable settings UI.
- No automatic queue retry, delete, pause, drain, or replay controls.
- No changes to academic-period rules, grades, enrollment, destructive lifecycle policy, AI prompts, or provider selection.
- No claim of physical Android/iOS evidence unless a real device/emulator is actually exercised.
- No full generated SDK migration.

### Authorization

The user explicitly authorized planning, implementation, tests, affected APK packaging, commit, push, and deployment through the requested `finish-and-ship` workflow.

### Assumptions

- `developement` remains the authorized branch; verify upstream equality again immediately before publishing.
- All roles may read the capability snapshot, but role-sensitive capabilities return `allowed: false` without revealing protected session details.
- The first shared-type coverage baseline records current common filenames and fails only when a new common surface is introduced without classification.

## 3. Current-state evidence ledger

| ID | Status | Evidence | Consequence |
|---|---|---|---|
| C-01 | Confirmed | `openspec list --json` plus six `tasks.md` files show 23 unchecked tasks | Evidence debt must be classified before new broad claims |
| C-02 | Confirmed | `AcademicPolicyService.currentState()` owns official year/period; `assessmentAcademicCapabilities()` derives allowed actions | Capability aggregation must call, not duplicate, academic policy |
| C-03 | Confirmed | `AdminMaintenanceService.getStatus()` includes availability, actor/session expiry, rules, and protected rules | Generic flags must not replace Maintenance Access |
| C-04 | Confirmed | `HealthService.getReadiness()` checks database, Redis, AI, and storage; it is cached for 15 seconds | Keep richer workflow queries out of readiness |
| C-05 | Confirmed | `MetricsController.metrics()` currently updates database-pool gauges only | Aggregate job metrics are additive and isolated |
| C-06 | Confirmed | `ai_generation_jobs` stores `jobType`, `status`, `createdAt`, and `updatedAt` with status index | Durable-job aggregates require no schema change |
| C-07 | Confirmed | 26 matching web/mobile type filenames and 66 `webPath` entries in the mobile admin parity manifest | A baseline-aware coverage report can detect newly introduced drift surfaces |
| C-08 | Confirmed | Web/mobile System Settings and Diagnostics fetch owner contracts independently | Both clients are direct consumers of the additive snapshot/diagnostics contracts |
| C-09 | Confirmed | Current branch/upstream are `developement` at `3944bd41`; one unrelated modified document exists | Recheck before ship; stage only task-owned paths |
| C-10 | Unverified | Physical Android/iOS behavior for the new UI | Package and static/runtime verification do not substitute for device evidence |

## 4. End-to-end impact and consumer map

| Producer | Contract | Direct consumers | Compatibility |
|---|---|---|---|
| `SystemCapabilitiesController` | `GET /api/system/capabilities` with normal `success/message/data` envelope | Web system settings; mobile system settings; administrator contract fixture | New route; no existing consumer changes required |
| `WorkflowDiagnosticsService` | In-process aggregate model | System capabilities, workflow controller, metrics controller | Internal additive service |
| `HealthController` | `GET /api/health/workflows`, Admin-only | Web Diagnostics; mobile Diagnostics | New route; `/live` and `/ready` unchanged |
| Prometheus registry | Four bounded job gauges | Railway/Prometheus operators | Additive metric names |
| Web/mobile async-state components | Props-only UI contract | Touched Settings and Diagnostics screens | Incremental; no global behavioral override |
| Shared-type coverage script | Current common-type baseline | Local typecheck and CI | New drift fails; existing classified debt remains visible |

### Capability response interface

```ts
type CapabilityState = 'active' | 'inactive' | 'ready' | 'degraded' | 'blocked' | 'unknown';

interface SystemCapabilityEntry {
  available: boolean;
  allowed: boolean;
  state: CapabilityState;
  reasonCode: string | null;
  source:
    | 'academic-state'
    | 'admin-maintenance'
    | 'health-readiness'
    | 'workflow-diagnostics';
  observedAt: string;
}

interface SystemCapabilitiesSnapshot {
  version: 1;
  observedAt: string;
  roleScope: string[];
  capabilities: {
    academicOperations: SystemCapabilityEntry;
    maintenanceAccess: SystemCapabilityEntry;
    systemReadiness: SystemCapabilityEntry;
    workflowDiagnostics: SystemCapabilityEntry;
  };
}
```

### Workflow diagnostics response interface

```ts
type WorkflowJobStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'approved'
  | 'cancelled'
  | 'rejected'
  | 'failed';

interface WorkflowStatusAggregate {
  status: WorkflowJobStatus;
  count: number;
  oldestAgeSeconds: number | null;
}

interface WorkflowDiagnosticsSnapshot {
  observedAt: string;
  healthy: boolean;
  staleAfterSeconds: number;
  totals: WorkflowStatusAggregate[];
  alerts: Array<{
    code: 'oldest_nonterminal_exceeded' | 'failed_jobs_present';
    severity: 'warning' | 'critical';
    message: string;
  }>;
}
```

No row identifiers or payload details cross this contract.

## 5. Conflicts, invariants, risks, and error behavior

1. **Policy conflict:** capabilities cannot become a second academic-policy engine. Resolution: `SystemCapabilitiesService` calls `AcademicPolicyService.currentState()` and exposes only availability/state metadata.
2. **Security conflict:** non-admin users must not receive Maintenance Access session metadata or workflow aggregates. Resolution: snapshot returns only semantic entries; `/health/workflows` uses `RolesGuard` and `RoleName.Admin`.
3. **Health-loop risk:** diagnostics queries could make readiness fail. Resolution: separate route/service, five-second cache, and metrics scrape failure leaves previous gauge values unchanged while logging a bounded warning.
4. **Metrics-cardinality risk:** job IDs/types may grow. Resolution: gauges label only the fixed status enum; no `jobType` label in the first release.
5. **UI-failure risk:** capability failure must not hide navigation or imply “off.” Resolution: render `unknown` with retry and keep links visible.
6. **Contract-gate risk:** baseline generation could bless future drift. Resolution: commit a reviewed baseline once; normal commands only check it and require an explicit update command.
7. **Evidence-debt risk:** newer releases cannot prove prior physical testing. Resolution: mark only superseded version-specific packaging tasks resolved; keep device/authenticated-live tasks unchecked with annotations.

## 6. Contract, schema, migration, and compatibility changes

- Two additive GET contracts; normal response envelope retained.
- New web/mobile type files share field names through the administrator contract fixture.
- No request DTO, existing response, database schema, or migration changes.
- Existing app versions continue to function because no current endpoint is removed or changed.
- The APK version must advance because mobile TypeScript/UI changes alter the bundle.

## 7. Ordered implementation tasks

### Task 1: Reconcile existing evidence ledgers

**Files:**
- Modify the six existing `openspec/changes/*/tasks.md` files named in the analysis report.
- Create `docs/feature-analysis/2026-09-29-openspec-verification-reconciliation.md`.

**Produces:** A per-task classification: `satisfied by named evidence`, `superseded by a newer release`, or `still unverified`.

- [ ] Record current exact repository/release evidence without altering product code.
- [ ] Keep physical-device, emulator-width, and authenticated-live tasks unchecked unless directly exercised.
- [ ] Mark obsolete version-specific packaging tasks resolved only when the current release contract fully supersedes them; include the replacing version/SHA.
- [ ] Run `openspec list --json` and verify counts match the reconciliation report.

### Task 2: Add workflow diagnostics using TDD

**Files:**
- Create `backend/src/modules/health/workflow-diagnostics.service.ts`.
- Create `backend/src/modules/health/workflow-diagnostics.service.spec.ts`.
- Create `backend/src/modules/health/workflow-diagnostics.controller.ts` and `.spec.ts`.
- Modify `backend/src/modules/health/health.module.ts`.

**Produces:** `WorkflowDiagnosticsService.getSnapshot()` and admin-only `GET /health/workflows`.

- [ ] Write tests for empty state, pending/processing age, failed-job alert, bounded cache, and database failure.
- [ ] Run the targeted spec and verify RED because the service/route is absent.
- [ ] Implement one grouped Drizzle query (or bounded aggregation of selected columns) over `ai_generation_jobs` with no identifiers in output.
- [ ] Add five-second result caching and concurrent-request coalescing.
- [ ] Add controller role protection and response envelope tests without changing the public `HealthController`.
- [ ] Run targeted specs to GREEN.

### Task 3: Add bounded Prometheus workflow gauges using TDD

**Files:**
- Modify `backend/src/monitoring/utils/metrics.ts`.
- Modify `backend/src/monitoring/metrics.controller.ts` and `metrics.module.ts`.
- Create `backend/src/monitoring/metrics.controller.spec.ts`.

**Produces:**
- `workflow_jobs_total{status}`
- `workflow_oldest_nonterminal_age_seconds`
- `workflow_failed_jobs_total`
- `workflow_diagnostics_collection_failures_total`

- [ ] Write a failing controller test proving only fixed status labels and aggregate values are emitted.
- [ ] Inject `WorkflowDiagnosticsService`; update gauges immediately before registry serialization.
- [ ] Catch diagnostics collection failure, increment the failure counter, log a bounded message, and still return registry output.
- [ ] Run targeted metrics tests to GREEN.

### Task 4: Add the system capability snapshot using TDD

**Files:**
- Create `backend/src/modules/system-capabilities/system-capabilities.types.ts`.
- Create `backend/src/modules/system-capabilities/system-capabilities.service.ts` and `.spec.ts`.
- Create `backend/src/modules/system-capabilities/system-capabilities.controller.ts` and `.spec.ts`.
- Create `backend/src/modules/system-capabilities/system-capabilities.module.ts`.
- Modify `backend/src/app.module.ts`.

**Consumes:** `AcademicPolicyService`, `AdminMaintenanceService`, `HealthService`, `WorkflowDiagnosticsService`.

**Produces:** Authenticated `GET /system/capabilities`.

- [ ] Write failing service tests for admin/teacher/student role scopes, owner failure isolation, unknown/degraded behavior, and absence of protected session details.
- [ ] Verify RED because the module is absent.
- [ ] Implement parallel settled owner reads and stable reason codes.
- [ ] Add a controller using `@CurrentUser()` and the standard envelope; rely on global JWT and do not add `@Public()`.
- [ ] Run service/controller specs to GREEN.

### Task 5: Add contract coverage and drift baseline using TDD

**Files:**
- Modify `contract-fixtures/admin-client-contracts.v1.json` with `system.capabilities` and `health.workflow-diagnostics`.
- Create `contract-fixtures/cross-client-type-coverage.v1.json`.
- Create `scripts/check-cross-client-type-coverage.cjs` and `.test.cjs`.
- Modify `backend/package.json`, `next-frontend/package.json`, and `mobile/package.json` to run `contract:coverage` from typecheck/build gates where appropriate.

**Produces:** A reviewed baseline of common type filenames plus classified `tracked`/`deferred` status; any newly common type file fails until classified.

- [ ] Write failing Node tests for new unclassified shared types, missing baseline files, duplicate entries, and deterministic reports.
- [ ] Verify RED with a temporary fixture.
- [ ] Implement AST-free filename/source coverage only; explicitly name the limitation in output.
- [ ] Seed the baseline from the current 26 common filenames and map manifest-owned files as `tracked`; classify remaining ones as `deferred` with a reason.
- [ ] Add both new contracts to the existing three-layer manifest.
- [ ] Run both contract test files to GREEN.

### Task 6: Add web typed consumers and recoverable UI using TDD

**Files:**
- Create `next-frontend/src/types/system-capabilities.ts`.
- Create `next-frontend/src/services/system-capabilities-service.ts` and test.
- Extend `next-frontend/src/services/admin-service.ts` for workflow diagnostics and test.
- Create `next-frontend/src/components/admin/AdminAsyncState.tsx` and test.
- Modify `next-frontend/app/(dashboard)/dashboard/admin/system-settings/page.tsx` and its test.
- Modify `next-frontend/app/(dashboard)/dashboard/admin/diagnostics/page.tsx` and create a page test.

**Produces:** System Settings capability panel and Diagnostics workflow section with loading/error/cached/retry separation.

- [ ] Write failing service tests for envelope parsing.
- [ ] Write failing component tests for initial failure, successful empty, cached refresh failure, and retry.
- [ ] Implement services and `AdminAsyncState` without hiding existing settings links.
- [ ] Render capability entries with backend reason text and `Unknown` on fetch failure.
- [ ] Render aggregate workflow counts/age/alerts without invented uptime or latency numbers.
- [ ] Run focused web tests to GREEN.

### Task 7: Add mobile typed consumers and recoverable UI using TDD

**Files:**
- Create `mobile/src/types/system-capabilities.ts`.
- Create `mobile/src/api/services/system-capabilities.ts` and test.
- Extend `mobile/src/types/admin.ts` and `mobile/src/api/services/admin.ts` for workflow diagnostics and tests.
- Create `mobile/src/components/admin/AdminAsyncState.tsx` and test.
- Modify `mobile/src/screens/AdminSettingsOverviewScreen.tsx`, `AdminDiagnosticsScreen.tsx`, and their tests.

**Produces:** Touch-friendly capability/workflow states using existing `AdminNotice`, `AdminSection`, and `AdminDataRow` primitives.

- [ ] Write failing service and component tests before implementation.
- [ ] Implement typed service calls through authenticated `apiClient`.
- [ ] Keep settings destinations visible; show semantic status/reason rather than hiding unsupported actions.
- [ ] Show aggregate workflow health in Diagnostics with pull-to-refresh and explicit partial-failure copy.
- [ ] Run focused mobile tests and typecheck to GREEN.

### Task 8: Review, full verification, packaging, and release

**Files:**
- Update this plan and the OpenSpec task ledger with final evidence.
- Update Android release artifacts through `mobile/scripts/app-version-release.cjs`; do not hand-edit checksums/manifests.

- [ ] Review every changed file against Tasks 1–7 and confirm no product write path or persistent schema changed.
- [ ] Run OpenSpec strict validation and contract tests.
- [ ] Backend: targeted tests, lint, build, full Jest, applicable e2e/production-start checks.
- [ ] Web: typecheck, focused/full Jest, lint, production build.
- [ ] Mobile: typecheck, focused/full Jest, design audit, production Expo export.
- [ ] Bump/prepare/build/verify the next Android release using the production API URL and signing contract; record package, versionCode, ABI, signature, alignment, bytes, and SHA-256.
- [ ] Run `git diff --check`; inspect staged paths and every outgoing commit; commit only task-owned files.
- [ ] Push `developement`; verify local/remote SHA equality.
- [ ] Observe exact-SHA GitHub CI and Railway provider deployment to terminal state.
- [ ] Verify live readiness, capability snapshot (role-appropriate authenticated acceptance where credentials are available), workflow route authorization, frontend HTTP, APK manifest/bytes, and app-version policy.
- [ ] Record any physical-device or authenticated-live boundary that remains unverified.

## 8. Verification matrix and acceptance criteria

| Requirement | Evidence |
|---|---|
| Existing authorities are preserved | No schema diff; service tests prove owner calls and failure isolation |
| Snapshot is authenticated and role-aware | Controller guard test plus role-scope service cases |
| No sensitive diagnostics leak | Contract snapshots contain aggregate status/count/age only; negative field assertions |
| Readiness behavior is unchanged | Existing health service/controller specs plus `/health/ready` live check |
| Queue/job issues become visible | Service/metrics tests and admin UI tests |
| Current UI does not disappear on failure | Web/mobile tests assert links remain and `Unknown/Retry` appears |
| New cross-client surfaces are governed | Existing admin contract gate includes both routes; coverage baseline rejects unclassified additions |
| Verification debt is honest | Reconciliation report maps every one of the 23 tasks and leaves unsupported device/live claims open |
| Mobile delivery is current | Verified signed ARM64 APK, live checksum equality, registered update decision |
| Release is exact | Local/remote SHA, GitHub run head SHA, Railway deployment/provider status, and backend metadata agree |

Acceptance requires all automated gates applicable to changed surfaces to pass. Missing provider credentials, physical hardware, or authenticated production accounts remain explicit limitations rather than being inferred from static evidence.

## 9. Rollout, rollback, observability, cleanup, and boundaries

### Rollout

1. Deploy backend/web together through the existing branch workflow.
2. Existing clients remain compatible because routes are additive.
3. Publish/register the new Android APK after frontend/backend health is terminal green.
4. Observe job gauges and capability error rates; do not enable any new operational mutation.

### Rollback

- Web/mobile panels can be removed independently; existing settings/diagnostics remain.
- The capability module and workflow route can be removed without data cleanup.
- Metrics registration can be reverted independently; durable jobs are unaffected.
- Contract coverage can be temporarily returned to report-only if it identifies a false positive, while retaining the manifest contracts.
- APK rollback follows the current app-version policy; never advertise an older binary over a newer versionCode.

### Cleanup

- No database cleanup.
- Archive the new OpenSpec change only after implementation/release evidence is complete.
- Do not archive historical changes whose remaining physical-device/live evidence is still open.

### Unverified boundaries

- Real-device Android/iOS rendering, notification/background behavior, and install upgrade remain unverified unless exercised during Task 8.
- Production authenticated capability/workflow responses require a valid role-scoped account; public health cannot prove them.
- The shared-type coverage baseline detects surface creation, not semantic TypeScript equivalence; the explicit three-layer manifest remains the semantic field gate for listed contracts.
