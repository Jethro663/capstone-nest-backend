# Safe System Improvement Opportunities

Date: 2026-09-29
Repository state: `28728fb2` on `developement`
Mode: analysis only; no product code, configuration, schema, data, deployment, or git history changed
Scope: backend-owned capabilities and diagnostics, web/mobile consumers, contract governance, recovery UI, and outstanding verification evidence

## 1. Executive verdict

Nexora does not need another large subsystem to become safer. The highest-value improvements are small seams around the system that already exists: close stale verification work, expose one typed capability snapshot, observe queues and long-running jobs, detect contract drift before runtime, and standardize failed/loading/empty/cached UI states.

These five improvements can be introduced without changing official academic rules, public write contracts, authentication ownership, or durable job ownership.

| Priority | Improvement | Benefit | Initial breakage risk | Safe first increment |
|---|---|---|---:|---|
| P0 | Reconcile unfinished verification evidence | Separates genuinely unverified behavior from stale task bookkeeping | Very low | Review the 23 unchecked tasks in six existing OpenSpec changes; record current evidence or an explicit remaining boundary |
| P1 | Backend-owned dynamic capability snapshot | Gives web and mobile one answer for what is available, allowed, degraded, or read-only | Low | Add an additive read-only aggregate contract over existing owners; do not add generic mutable flags |
| P1 | Queue and workflow observability | Detects stranded, slow, or repeatedly failing work before a user reports it | Low | Add metrics and a read-only admin view; no pause/retry/delete controls |
| P2 | Shadow cross-client contract conformance | Finds backend/web/mobile drift without replacing working clients | Very low | Generate a CI-only difference report from backend contracts and current client types |
| P2 | Shared recovery-state pattern | Prevents request failures from becoming misleading empty screens | Low | Introduce tested per-platform primitives and migrate one read-only screen at a time |

If “dynamic settings” is the goal, the safe design is the P1 capability snapshot. A generic `feature_flags` or `system_settings` table would be riskier because it could let an untyped toggle bypass academic policy, role authorization, audit, or mobile/web parity.

## 2. Feature anatomy

### Existing authority is distributed, but intentional

- Academic policy is already calculated by `assessmentAcademicCapabilities()` in `backend/src/modules/academic-state/assessment-academic-capabilities.ts` and returned through backend-owned assessment/class-record flows.
- Maintenance Access is owned by `AdminMaintenanceService`. Availability comes from typed environment configuration (`adminMaintenance.enabled`), while actor/session state is persisted and audited.
- Academic state has dedicated current-state, readiness, impact-preview, transition, audit, and repair routes under `backend/src/modules/academic-state/`.
- Android update policy is independently owned by `backend/src/modules/app-version/`.
- Liveness/readiness is owned by `HealthService`; the current readiness contract checks database, Redis, AI service, and storage.

This is a good ownership model. A new dynamic layer should aggregate these answers, not replace their policy owners.

### Current gaps that make the five improvements worthwhile

1. Six OpenSpec changes contain 23 unchecked tasks. Most are verification, exact-revision release, authenticated-live, emulator, or physical-device evidence tasks. Some reference older APK versions, so unchecked does not automatically mean unfinished code; the evidence ledger needs reconciliation.
2. `SystemSettingsShell` has a static route catalog, while capability/status information is fetched independently by pages and providers. Mobile has similar independent academic, diagnostics, maintenance, and update consumers.
3. `HealthService.getReadiness()` checks dependencies only. `MetricsController.metrics()` adds database-pool gauges, but focused searches found no queue age, pending/processing job count, or failed-job metric in health/monitoring.
4. Web and mobile currently have 26 matching type filenames, while `mobile/src/navigation/admin-parity-manifest.ts` contains 66 `webPath` entries. Those ledgers are useful, but they are manually synchronized and can drift.
5. Query failure handling is implemented screen by screen. `AdminDiagnosticsScreen` demonstrates a sound error/empty distinction, while the previous whole-system forensic proved that other screens had independently collapsed failures into empty data before remediation.

## 3. Cascade map

| Edge | Provider / owner | Interface or state | Consumer | Effect if improved incorrectly | Risk | Confidence | Evidence | Disposition |
|---|---|---|---|---:|---|---|---|
| E-01 | OpenSpec task ledgers | Six active change `tasks.md` files | Release confidence and future planning | Treating stale unchecked tasks as new implementation could repeat or conflict with shipped work | Medium operational | Confirmed | `openspec list --json`; 23 unchecked tasks across the six named changes | Reconcile evidence before opening more feature work |
| E-02 | Academic-state owner | `assessmentAcademicCapabilities()` and `/academic-state/*` | Assessment, class-record, admin, web, and mobile flows | A generic flag could contradict official school-year/period policy | High integrity | Confirmed | `backend/src/modules/academic-state/assessment-academic-capabilities.ts`; `academic-state.controller.ts` | Aggregate read-only capability results; do not duplicate policy |
| E-03 | Maintenance owner | `AdminMaintenanceService.getStatus()` plus `adminMaintenance.enabled` | Web provider and admin maintenance UI | A second settings store could bypass actor/session expiry and audit | High security | Confirmed | `backend/src/modules/admin-maintenance/admin-maintenance.service.ts:82`; `:364-389` | Reference status; retain the existing service as authority |
| E-04 | Health owner | `HealthService.getReadiness()` | Web System Info, mobile Diagnostics, admin overview | Expanding readiness with slow/high-cardinality queries could make health checks unstable | Medium operational | Confirmed | `backend/src/modules/health/health.service.ts:285-325`; client consumers found by Serena | Keep readiness fast; expose workflow health through separate cached diagnostics |
| E-05 | Monitoring owner | `/metrics` and Prometheus registry | Operators | Adding user IDs, job payloads, or unbounded labels could leak data or overload metrics | High security/operational | Confirmed | `backend/src/monitoring/metrics.controller.ts:18-27` | Add only aggregate counts, age buckets, and bounded job-type labels |
| E-06 | Backend DTO/routes and client type folders | 26 same-named web/mobile type files | Web/mobile request and rendering code | Replacing types in one step could create widespread compile/runtime churn | Medium compatibility | Confirmed | `next-frontend/src/types/`; `mobile/src/types/`; focused basename comparison | Start with CI shadow comparison; migrate contracts incrementally |
| E-07 | Admin parity manifest | 66 manually listed web route entries | Mobile role navigation/parity checks | Auto-navigation from a manifest could expose unsupported or unsafe actions | Medium UX/security | Confirmed | `mobile/src/navigation/admin-parity-manifest.ts` | Keep navigation explicit; automate only drift reporting first |
| E-08 | Per-platform query adapters/components | loading, error, empty, cached-data, retry states | Admin/teacher/student screens | A global abstraction could erase page-specific recovery and authorization messages | Medium UX | Confirmed | `mobile/src/screens/AdminDiagnosticsScreen.tsx:15-87`; prior forensic F-03 | Define a small state contract and per-platform primitives; adopt screen by screen |

After focused owner, route, type, manifest, task, health, and metrics searches, no additional dependency was found within the inspected scope. This is bounded search saturation, not proof that no other improvement or defect exists.

## 4. Isolation and rollout

### Phase A — Reconcile verification debt (E-01)

1. Classify each unchecked task as `still required`, `satisfied by newer evidence`, `superseded`, or `environment unavailable`.
2. Link newer exact-SHA CI, deployment, APK, and health evidence where it genuinely satisfies an older task; do not claim physical-device evidence from builds or emulators.
3. Keep remaining Android-width, authenticated-live, emulator, and iPhone checks visibly open.
4. Archive only changes whose requirements and evidence are actually complete.

Validation: `openspec list --json` and each reconciled task ledger agree.
Rollback: documentation-only; revert the ledger update if evidence was mapped incorrectly.

### Phase B — Add a dynamic capability snapshot (E-02, E-03, E-04)

1. Add an authenticated, additive read-only contract such as `GET /api/system/capabilities`.
2. Compose results from existing owners rather than adding replacement booleans. A capability entry should carry `available`, `allowed`, `state`, `reasonCode`, `source`, `observedAt`, and a contract `version`.
3. Keep role checks on the backend. Clients may render disabled/read-only explanations, but must not infer permission from navigation visibility.
4. Fail each capability closed and independently. One unavailable owner should yield `unknown/degraded` for that capability, not fabricate `false` for the entire system.
5. If mutable settings are later needed, limit them to an explicit allowlist with validation, revision/ETag conflict handling, audit history, preview, and rollback. Academic policy, RBAC, destructive safeguards, secrets, and official records must remain outside generic settings.

Compatibility: existing endpoints stay authoritative and unchanged; clients can consume the snapshot gradually.
Validation: compare snapshot values against their owner endpoints for admin, teacher, and student roles.
Rollback: stop consuming the aggregate endpoint; existing clients continue using current contracts.

### Phase C — Observe workflows without controlling them (E-04, E-05)

1. Add aggregate metrics for pending/processing/failed durable jobs, oldest nonterminal age, retry/exhaustion count, and queue connectivity using bounded job-type labels.
2. Keep `/health/ready` limited to dependency readiness. Add a separate authenticated diagnostics endpoint for richer workflow evidence.
3. Extend admin Diagnostics with read-only states and runbook links. Do not add retry, delete, drain, or pause actions in the first increment.
4. Alert on age and sustained failure rate, not a single transient failure.

Validation: inject controlled test jobs and prove metric transitions without exposing payloads or user identifiers.
Rollback: remove the dashboard/collector registration; job execution remains untouched.

### Phase D — Run contract conformance in shadow mode (E-06, E-07)

1. Produce a machine-readable backend route/schema inventory and compare it with web/mobile service calls and types.
2. Report missing routes, envelope mismatches, enum drift, nullable-field drift, and pagination differences without failing CI initially.
3. Establish a reviewed baseline, then fail only on new drift.
4. Generate or share types only for one stable domain at a time; keep transport clients platform-specific because web cookies and mobile secure storage differ.

Validation: seed the checker with known mismatches and prove precise failures; ensure dynamic paths and intentional platform exceptions are represented.
Rollback: disable the CI gate; runtime behavior is unaffected.

### Phase E — Standardize recovery states incrementally (E-08)

1. Define the common state model: initial loading, successful empty, successful data, refresh with cached data, initial failure, and retrying.
2. Build one web primitive and one React Native primitive using existing GABHS tokens and accessibility conventions.
3. Migrate read-only screens first, retaining domain-specific copy and actions.
4. Preserve last-good data during refresh failure and label it as potentially stale.

Validation: component tests cover every state and ensure errors never render the truthful empty-state action.
Rollback: revert one migrated screen independently; no API or persisted data changes.

## 5. Improvements

### Required decoupling

- Keep capability aggregation separate from policy ownership and permission enforcement.
- Keep rich workflow diagnostics separate from fast liveness/readiness checks.
- Keep release/device evidence separate from “implementation complete.”
- Keep contract generation/comparison separate from platform-specific authentication transports.
- Keep generic recovery-state mechanics separate from domain-specific copy and actions.

### Optional evidence-backed enhancements, in recommended order

1. Reconcile the 23 outstanding verification tasks before starting a new broad feature.
2. Introduce the read-only dynamic capability snapshot; this is the safe foundation for responsive system settings.
3. Add queue/job metrics and the read-only admin workflow-health view.
4. Add shadow contract comparison, then promote only new drift to a CI blocker.
5. Add per-platform recovery-state primitives and migrate the highest-traffic read-only screens gradually.

### Avoid for now

- A generic mutable feature-flag/settings table controlling academic policy, RBAC, destructive operations, or AI writes.
- Hiding navigation solely because a capability request failed; show a disabled state and reason instead.
- Replacing all hand-written client contracts in one migration.
- Adding operational control buttons before diagnostics, authorization, idempotency, and audit behavior are proven.
- Declaring physical-device or authenticated-live coverage complete based only on unit tests, builds, exports, or HTTP health checks.

## 6. Uncertainty and coverage boundary

- This pass did not run authenticated browser sessions, Android/iOS device flows, provider calls, or destructive admin actions.
- The 23 unchecked OpenSpec tasks were counted and categorized by wording, but not individually proven satisfied; reconciliation is the proposed P0 activity.
- A focused schema search found no generic `system_settings` or `feature_flags` store. Dynamic behavior may exist under domain-specific names outside the inspected owners.
- Contract duplication was measured by matching filenames and the existing admin parity manifest. This does not prove every same-named type differs or every dynamic request can be statically discovered.
- The recommendations intentionally avoid changing business behavior. Any later mutable setting, automated recovery action, or generated-client migration needs its own impact plan and contract trace.
