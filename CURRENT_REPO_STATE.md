# Current Repository State

Last reconciled: July 13, 2026.

This is the compact current-state record for Nexora. Dated files under `docs/system-audit/`, `docs/superpowers/`, and `docs/state/` are historical evidence unless a newer document explicitly adopts them.

## Runtime state

The full Compose topology was rebuilt and started with the observability profile. At the final runtime check:

- PostgreSQL, Redis, Ollama, backend, AI service, Prometheus, Loki, Tempo, Grafana, Promtail, Blackbox Exporter, Node Exporter, and cAdvisor reported healthy.
- The frontend returned HTTP 200 and remained running with zero restarts.
- Every container reported zero restarts and no OOM kill.
- All ten Prometheus jobs were `up` with no target error.
- cAdvisor exported metrics for all 14 named live Compose containers.
- Loki returned both Docker-discovered and direct backend log streams.
- Tempo returned stored traces.
- Backend readiness confirmed database, Redis, AI runtime, embedding runtime, and upload storage.
- AI readiness confirmed the configured Ollama text, vision, and embedding models.

This proves the checked local topology; it is not a promise that every external deployment, credential set, or future data migration is healthy.

## Material hardening completed

- Blank telemetry configuration no longer crashes the backend.
- The backend upload volume is repaired at container bootstrap when an older root-owned volume is reused, while migrations and the application still execute as the unprivileged `node` user.
- Ollama readiness validates each configured model instead of depending on tag-string formatting.
- Local Docker email delivery is opt-in, avoiding guaranteed SMTP authentication failures with template credentials.
- Grafana email alerting is opt-in when SMTP is disabled.
- Prometheus scrapes the real backend metrics route at `/api/metrics`.
- Grafana and cAdvisor use tested patch pins; cAdvisor now exports named Docker container metrics on the current Docker engine.
- Observability services have explicit health checks and dependency gates.
- AI extraction execution is durable through backend-owned BullMQ jobs rather than untracked FastAPI tasks.
- Performance snapshots use a read-mostly batched path, class-record bulk writes and adviser reads are batched, and independent component reads are parallelized.
- First bounded architecture seams were extracted behind existing contracts in backend performance/assessment/LXP, AI extraction routing, the teacher web workspace, and teacher mobile screens.

See [implementation-fix.md](implementation-fix.md) for the completed performance/architecture plan and its detailed regression evidence.

## Current service boundaries

- Backend owns auth, roles, official academic state, public API contracts, audit history, and queue execution.
- Web and mobile are multi-role backend consumers.
- AI service is internal, shared-secret protected at service boundaries, and read/assistive with respect to official academic records.
- Compose is split into core, observability, and explicit debug exposure.
- Application containers run without root where supported. Host collectors are isolated in the opt-in observability profile and use read-only mounts where possible.

## Known bounded debt

| Area | Current boundary | Safe next action |
| --- | --- | --- |
| Backend dependencies | Production audit: 26 moderate and 8 high, no critical; remaining direct fixes include coordinated OpenTelemetry and Nodemailer major lines | Isolate each compatibility upgrade and rerun telemetry/email plus the full backend suite |
| Web dependencies | Production audit: 2 moderate and 4 high, no direct vulnerable package after the DOMPurify patch | Trace transitive owners and upgrade only with a clean Next.js build/test run |
| Mobile dependencies | Production audit: 1 low, 15 moderate, 11 high, and 1 critical; remediation requires an Expo SDK/native compatibility migration | Use a dedicated Expo upgrade branch with native build, auth/storage, notification, and role-flow verification |
| Lint | Backend retains a ratcheted legacy warning ceiling; frontend retains a small warning baseline; both reject errors | Reduce warnings by owning module without bulk formatting unrelated code |
| Large owners | Several service and route owners remain large after the first seams | Continue one characterized capability at a time; do not bulk rewrite |
| Redis host tuning | Linux can warn when `vm.overcommit_memory=1` is not set | Set the host sysctl only when the operator controls the host and understands the system-wide effect |
| Frontend fonts | `next/font/google` needs build-time network access | Self-host fonts in a separately reviewed asset change if offline builds are required |

The dependency counts above are a dated baseline, not a permanent acceptance. CI retains advisory reports until the major compatibility work can be proven safely.

## Source-of-truth order

1. Code, migrations, lockfiles, and executable configuration.
2. Root and subsystem `AGENTS.md` files.
3. Root and subsystem `README.md` files plus this document.
4. Current runbooks and deployment docs indexed by `docs/README.md`.
5. Dated audits, research material, completed plans, and generated evidence.

When a lower item conflicts with a higher item, update or label the lower item instead of changing runtime behavior to match stale prose.
