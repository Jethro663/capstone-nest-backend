## Why

The current system has four source-confirmed defects that survive the existing green suites: performance diagnostics can be stranded by a backend restart, web/mobile admin flows can treat device time as official academic state, rejected reads can appear as genuine empty data, and Android release verification ignores the SDK path already configured for Gradle. These defects cross persisted work, official academic records, admin decision-making, and release reliability, so they should be repaired together with regression gates.

## What Changes

- Execute performance diagnostics through backend-owned BullMQ with deterministic job identity and bootstrap reconciliation instead of a process-local timer.
- Bound the web performance-analysis wait and provide a retryable terminal error when a job cannot complete.
- Source web/mobile admin creation defaults from the existing authenticated current academic-state contract while preserving deliberate planning-year entry.
- Render rejected Calendar and Announcement reads as explicit retryable errors, distinct from successful empty results.
- Expand client-route contract coverage to page/screen TSX and native backend `fetch` sites.
- Resolve Android build tools from explicit configuration first and Gradle `android/local.properties` as the standard checkout fallback.
- Add focused regression tests, full affected-surface verification, and a newly packaged Android artifact for the changed mobile bundle.
- No public HTTP envelope, database schema, or stored academic history is removed or rewritten.

## Capabilities

### New Capabilities

- `durable-performance-diagnostics`: Restart-safe performance-analysis execution, reconciliation, idempotency, and bounded client waiting.
- `authoritative-academic-year-defaults`: Backend-current academic year initializes affected web/mobile admin forms without eliminating explicit future planning.
- `truthful-admin-load-states`: Failed admin reads are rendered as errors and retry paths rather than successful empty business data.
- `client-route-contract-coverage`: Static contract verification covers real TypeScript/TSX request surfaces and native backend fetch calls.
- `android-sdk-tool-discovery`: Release verification follows explicit configuration and Gradle local SDK discovery with deterministic precedence.

### Modified Capabilities

None. The repo currently has no main OpenSpec capability specs; this change records the repaired behavior as new requirements while preserving existing public contracts.

## Impact

- Backend: performance module queue producer/processor/service/module tests and client-route contract test.
- Web: teacher performance polling, Admin Calendar, Admin Announcements, and route-focused Jest coverage.
- Mobile: shared academic-state query hook, Admin Calendar/Classes/Sections, release script and tests, Android APK bundle/artifact metadata.
- Operations: existing Redis/BullMQ, GitHub CI, Railway deployment, and Android download manifest; no new dependency or service.
- Canonical evidence and implementation detail remain in `docs/feature-analysis/2026-09-28-whole-system-web-mobile-defect-forensic.md` and `docs/feature-plans/2026-09-28-cross-client-defect-remediation.md`.
