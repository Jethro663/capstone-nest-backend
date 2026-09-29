## Why

Nexora's domain owners are sound, but capability state, durable-workflow health, cross-client contract coverage, query recovery, and historical verification evidence remain distributed. Adding read-only seams around those owners will make failures visible and clients consistent without changing academic rules or existing write paths.

## What Changes

- Add an authenticated, versioned system-capability snapshot composed from existing academic, maintenance, readiness, and workflow owners.
- Add an admin-only aggregate workflow-diagnostics endpoint and bounded Prometheus metrics without exposing job identifiers or payloads.
- Add typed web and mobile consumers that keep settings/actions visible while showing available, blocked, degraded, or unknown states with retry behavior.
- Add baseline-aware cross-client type-surface coverage and include the new contracts in the existing backend/web/mobile administrator manifest.
- Reconcile outstanding OpenSpec verification tasks against current evidence while preserving physical-device and authenticated-live limitations.
- Package and release a new Android build because the mobile bundle changes.

No existing API or schema is removed or changed, and no generic mutable settings store is introduced.

## Capabilities

### New Capabilities

- `dynamic-system-capabilities`: Versioned, role-aware, read-only capability state composed from current backend policy owners.
- `workflow-observability`: Aggregate durable-job diagnostics and bounded operational metrics separated from liveness/readiness.
- `cross-client-contract-governance`: A reviewed baseline and CI guard for newly introduced shared contract surfaces across backend, web, and mobile.
- `recoverable-query-states`: Consistent loading, failure, cached-refresh, empty, and retry behavior on touched web/mobile admin screens.
- `verification-evidence-reconciliation`: Explicit classification of historical verification tasks as satisfied, superseded, or still unverified.

### Modified Capabilities

None.

## Impact

- Backend: new system-capabilities module; new workflow diagnostics service/route; additive Prometheus gauges; no database migration.
- Web: typed capability/workflow services plus System Settings and Diagnostics status UI.
- Mobile: typed capability/workflow services plus System Settings and Diagnostics status UI; requires a new signed ARM64 APK.
- Contract tooling: existing administrator manifest gains both routes; a new shared-type coverage baseline detects unclassified additions.
- Documentation/OpenSpec: existing evidence ledgers are reconciled without converting missing hardware or authenticated-live proof into completion.
- Release: full backend/web/mobile gates, exact-SHA CI/Railway observation, live health, served APK checksum, and app-version registration.
