## Context

Nexora already has authoritative academic policy, Maintenance Access, health/readiness, durable job, and app-version owners. Web and mobile consume those owners independently, operational metrics do not expose durable-job age/count, shared contract surfaces are governed only when manually added to the administrator manifest, and several historical OpenSpec changes retain unchecked evidence tasks. The change must improve visibility and consistency without creating a second policy engine or changing existing write contracts.

## Goals / Non-Goals

**Goals:**

- Compose existing owner results into one authenticated, versioned semantic capability snapshot.
- Expose aggregate durable-job health separately from liveness/readiness and without sensitive identifiers.
- Render the new states consistently on web and mobile while preserving existing destinations and cached data.
- Detect new unclassified cross-client type surfaces and explicitly govern the new transport contracts.
- Reconcile historical evidence tasks without overstating device, provider, or authenticated-live proof.

**Non-Goals:**

- Mutable generic feature flags or system settings.
- Queue control, retry, deletion, draining, or replay.
- Changes to academic rules, RBAC, grading, enrollment, destructive safeguards, or AI behavior.
- Full generated client SDKs or semantic comparison of every TypeScript type.

## Decisions

### Compose, do not persist, capability state

`SystemCapabilitiesService` will call `AcademicPolicyService`, `AdminMaintenanceService`, `HealthService`, and `WorkflowDiagnosticsService`. It will return stable semantic entries (`available`, `allowed`, `state`, `reasonCode`, `source`, `observedAt`) and will not store replacement booleans. This preserves one authority per domain and avoids migration or stale configuration.

Alternative rejected: a generic settings table, because it could contradict academic policy, authorization, and audited maintenance sessions.

### Isolate owner failures

Owner reads will use settled results. Failure of one owner produces `unknown` for only that capability. The endpoint itself stays available when a partial snapshot can be produced. Non-admin roles receive no Maintenance Access session details and cannot access workflow aggregates.

Alternative rejected: fail the entire request on the first dependency error, because clients would lose truthful states that remain available.

### Separate workflow diagnostics from readiness

`/health/live` and `/health/ready` remain unchanged. A separate admin-only controller at `/health/workflows` will return aggregate status counts, oldest nonterminal age, and bounded alerts from `ai_generation_jobs`. The service will use a five-second cache and concurrent-request coalescing.

Alternative rejected: adding database aggregation to readiness, because traffic routing health must remain fast and role-neutral.

### Bound metrics cardinality and sensitivity

Prometheus gauges will use only the fixed persisted status enum (`pending`, `processing`, `completed`, `approved`, `cancelled`, `rejected`, and `failed`). No job type, ID, user, class, payload, error string, or arbitrary reason label will be emitted. Collection failure increments one counter and does not make `/metrics` unavailable.

### Govern contract coverage in two layers

The existing administrator manifest remains the semantic field/endpoint gate for selected contracts. A separate deterministic baseline lists common web/mobile type filenames and fails only when a new common surface appears without classification. It explicitly does not claim semantic type equivalence.

### Use per-platform recovery primitives

Web and React Native receive small `AdminAsyncState` primitives with equivalent semantics but native markup/styles. Touched screens keep existing links visible and distinguish initial loading, initial failure, successful empty, successful data, cached refresh failure, and retrying.

## Risks / Trade-offs

- **Aggregate diagnostics query becomes expensive** → select only status/timestamps, cache for five seconds, and keep it off readiness.
- **Snapshot becomes another policy owner** → prohibit decision fields beyond semantic availability/allowance and source every entry from an existing service.
- **Partial failure is mistaken for disabled state** → use `unknown` plus a stable failure reason, never `inactive` or `blocked` for transport failure.
- **Metrics reveal sensitive activity** → fixed status labels and aggregate values only.
- **Coverage baseline creates false confidence** → describe it as surface coverage; retain explicit manifest contracts and typechecks.
- **Historical tasks are closed from indirect evidence** → keep hardware/authenticated-live items unchecked unless directly proven.
- **Mobile release drifts from backend/frontend** → build after final mobile inputs, verify artifact identity, and register policy only after live bytes match.

## Migration Plan

1. Reconcile evidence ledgers without product changes.
2. Add backend workflow diagnostics, metrics, and capability snapshot with tests.
3. Add contract manifest entries and the reviewed shared-type baseline.
4. Add web and mobile typed consumers and recovery UI incrementally.
5. Run full affected gates, build the next signed ARM64 APK, commit/push, and observe exact-SHA CI/Railway.
6. Verify live readiness, served frontend, served APK bytes/manifest, and update policy. Exercise authenticated routes when a valid account is available; otherwise retain that limitation.

Rollback removes clients first, then additive routes/metrics. Existing endpoints and data need no migration or cleanup. An APK rollback must use a higher versionCode or the established app-version recovery procedure; an older binary must not be advertised as newer.

## Open Questions

None. The user approved the five previously presented improvements and explicitly authorized implementation and release. Runtime credentials or physical-device availability affect evidence strength, not the architecture.
