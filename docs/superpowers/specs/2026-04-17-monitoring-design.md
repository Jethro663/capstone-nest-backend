# Nexora Docker Observability Design

Date: 2026-04-17
Topic: Full Docker Compose observability stack for Nexora LMS/LXP

## Goal

Provide a Docker-first observability stack that starts with the existing LMS services, exposes a single operator login through Grafana, and gives immediate access to metrics, logs, traces, dashboards, and alerts with minimal post-boot setup.

The intended operator experience is:

1. Start the image or run `docker compose up`.
2. Open Grafana on its exposed port.
3. Log in with credentials defined in `.env.compose`.
4. View service health, logs, traces, infrastructure metrics, and alerts from one place.

## Scope

This design covers:

- Docker Compose deployment only
- Single-login observability entry point through Grafana
- Prometheus for metrics storage and scraping
- Loki + Promtail for logs
- Tempo for traces
- Grafana provisioning for data sources, dashboards, and alert rules
- Infrastructure exporters for host and container visibility
- Application metrics and tracing integration where the repo already supports it or where a bounded extension is straightforward
- Documentation and operator runbook updates

This design does not cover:

- Client-side real user monitoring for browsers or Expo clients
- External SaaS monitoring backends
- Kubernetes deployment manifests
- PagerDuty/Slack/email notification delivery unless SMTP or webhook wiring already exists and can be configured safely in compose

## Current State

The repository already contains partial observability work:

- `backend/` exposes a Prometheus metrics endpoint at `/metrics`
- `backend/` has OpenTelemetry tracing bootstrap code pointing to OTLP HTTP
- `backend/` has a Loki transport in the Winston logger, but only when production env conditions are met
- `monitoring/prometheus.yml` exists but currently scrapes only Prometheus itself
- `monitoring/tempo-config.yml` exists
- `docker-compose.yml` does not currently define `grafana`, `prometheus`, `loki`, or `promtail`
- `ai-service/` has health/readiness endpoints but no dedicated Prometheus exporter yet

The repo therefore has building blocks but not a working end-to-end observability system.

## Recommended Architecture

Use a Grafana-centered LGTM stack inside the existing root `docker-compose.yml`.

### Services

Add these services:

- `prometheus`
- `grafana`
- `loki`
- `promtail`
- `tempo`
- `node-exporter`
- `cadvisor`

Keep these existing app services:

- `postgres`
- `redis`
- `ollama`
- `backend`
- `ai-service`
- `frontend`

### Entry Point

Grafana is the primary operator entry point and the only UI that requires day-to-day login.

Grafana will be provisioned with:

- Prometheus data source
- Loki data source
- Tempo data source
- Prebuilt dashboards
- Prebuilt alert rules
- Preconfigured dashboard folders

Prometheus and other backends may still expose ports for break-glass debugging, but the documented operator path is Grafana only.

### Credentials

Grafana credentials come from `.env.compose`, with practical defaults documented in `.env.compose.example`.

Reasoning:

- easier to maintain than hardcoded repo secrets
- still trivial for first boot
- safer for image reuse on another laptop or deployment target

## Data Flow

### Metrics

Prometheus scrapes:

- itself
- `backend:3000/metrics`
- a new Prometheus-compatible metrics endpoint in `ai-service`
- `cadvisor` for container metrics
- `node-exporter` for host metrics
- optionally `loki`, `tempo`, and `grafana` metrics endpoints if their container images expose them cleanly

Metrics classes:

- application request counts, latency, errors, and domain counters from backend
- AI service request counts, latency, readiness state, and dependency state
- host CPU, memory, filesystem, and load metrics
- per-container CPU, memory, restarts, filesystem, and network metrics
- scrape health and target availability for observability services themselves

### Logs

Promtail tails Docker container log files from the host Docker runtime and ships them to Loki.

Log labels should include:

- `service`
- `container`
- `compose_project`
- `job`
- `level` when parseable

Target services:

- `backend`
- `frontend`
- `ai-service`
- `postgres`
- `redis`
- `ollama`
- `grafana`
- `prometheus`
- `loki`
- `promtail`
- `tempo`

The backend Winston Loki transport should not be the primary log ingestion path. Promtail-based collection is more reliable for Docker-wide coverage and captures services that do not use Winston.

### Traces

Tempo receives OTLP HTTP traces.

Primary trace source in this phase:

- `backend`

Optional secondary trace source if feasible without destabilizing the service:

- `ai-service`

The backend tracing bootstrap should be wired to the internal compose hostname for Tempo instead of a localhost assumption.

Grafana should be configured to correlate traces with logs and metrics using shared service labels where possible.

### Frontend Coverage

The Next.js app is monitored in this phase through:

- container logs
- container resource metrics
- service availability
- request behavior visible from backend and infrastructure layers

Browser-side RUM is intentionally out of scope for this pass.

## Compose Design

### Networks

Reuse the existing `lms-network` bridge network for all observability services.

### Volumes

Add named volumes for persistence:

- `prometheus_data`
- `grafana_data`
- `loki_data`
- `tempo_data`

Keep `promtail`, `cadvisor`, and `node-exporter` stateless unless a concrete persistence need appears during implementation.

### Ports

Document and expose:

- Grafana UI port
- Prometheus UI port
- Loki API port if needed
- Tempo API and OTLP ports needed internally, with external exposure only if justified

The only operator-facing UI that must be advertised is Grafana.

### Health Checks and Startup

Observability services need health checks and restart policies.

Desired startup order:

1. storage and scrape backends (`loki`, `tempo`, `prometheus`)
2. Grafana
3. app services can start independently of observability availability

The LMS must remain usable even if the observability stack is degraded. Monitoring is important but should not block core LMS startup.

## Application Changes

### Backend

Required changes:

- ensure tracing exports to `http://tempo:4318`
- ensure service name and resource attributes are explicit for trace attribution
- confirm `/metrics` is reachable in the containerized runtime
- ensure logs directory behavior does not conflict with container logging

Likely changes:

- relax Loki logging from production-only gating if direct Loki transport remains useful
- add consistent service labels or environment variables used by logs and traces

Non-goals:

- redesign existing metrics model
- replace the backend logging stack wholesale

### AI Service

Required changes:

- add a Prometheus metrics endpoint, preferably `/metrics`
- expose request counters, latency, exceptions, readiness state, and dependency gauges
- optionally add OpenTelemetry tracing only if bounded and low-risk

The AI service should at minimum provide enough metrics to alert on:

- service down
- degraded readiness
- dependency problems such as Ollama unavailable
- elevated error rate

### Frontend

No deep application instrumentation is required in this phase.

The frontend should remain observable through:

- container logs
- container metrics
- service availability

If a very low-risk server-side metrics endpoint already fits the framework patterns, it can be considered, but it is not required for this design to succeed.

## Grafana Provisioning

Provision all Grafana state from repo files so first boot is deterministic.

### Provisioned Data Sources

- Prometheus
- Loki
- Tempo

### Provisioned Dashboards

At minimum:

1. Overview dashboard
2. Backend service dashboard
3. AI service dashboard
4. Frontend and container dashboard
5. Infrastructure dashboard
6. Logs exploration starter dashboard
7. Trace exploration starter dashboard

### Overview Dashboard Content

The overview dashboard should include:

- service up/down status
- backend request rate and error rate
- AI service readiness and degraded state
- container CPU and memory panels
- disk usage panels
- alert summary panel
- quick links or drilldowns into logs and traces

### Alerting

Provision Grafana-managed alert rules at first boot.

Minimum initial alerts:

- backend down
- frontend down
- ai-service down
- postgres down
- redis down
- ollama unavailable or AI readiness degraded
- Prometheus target down for critical jobs
- high backend 5xx rate
- high AI service error rate
- host disk pressure
- host memory pressure
- container restart spikes

Notification policy can start with in-Grafana alert visibility only if no external notification channel is configured. This still satisfies the requirement to include alerting in a usable first-boot system.

## Security

The stack should be safe by default for a local or image-based deployment.

Requirements:

- Grafana auth enabled with credentials from `.env.compose`
- no hardcoded production secrets in repo-tracked files
- only expose ports that have a clear operator or debugging purpose
- internal service-to-service traffic stays on the compose network
- public documentation must clearly distinguish default bootstrap credentials from production-grade overrides

## Documentation

Update root docs and compose env templates to cover:

- observability architecture summary
- exposed ports
- Grafana login path
- first boot steps
- how to change Grafana credentials
- where dashboards and alert rules are provisioned from
- what "healthy" looks like after startup
- how to verify logs, metrics, and traces are flowing

## Verification Plan

Implementation is not complete until these checks pass.

### Static Verification

- `docker compose --env-file .env.compose config`
- config files for Prometheus, Loki, Promtail, Tempo, and Grafana validate syntactically

### Runtime Verification

Bring the full stack up and verify:

- all observability containers start successfully
- Grafana loads with provisioned admin credentials
- Grafana data sources show healthy connectivity
- Prometheus target list shows critical jobs as `UP`
- Loki receives logs from backend, frontend, and ai-service
- Tempo receives backend traces
- dashboards load without manual import
- alert rules load without manual creation

### Evidence Checks

- backend `/metrics` returns populated metrics
- ai-service `/metrics` returns populated metrics
- Grafana dashboards display real time-series data
- a backend request can be traced in Tempo and linked from Grafana
- backend, frontend, and ai-service logs are queryable in Grafana Explore

### Failure Simulation

At minimum, test one controlled failure:

- stop one app container and verify the corresponding alert fires and visibility appears in Grafana

## Risks and Mitigations

### Risk: Docker log path differences across environments

Mitigation:

- prefer the standard Docker JSON log path approach used by Promtail in Linux-compatible Docker environments
- validate the selected mounting strategy against Docker Desktop behavior on the target host

### Risk: Tempo receives no traces because service endpoints still point to localhost

Mitigation:

- route all OTLP exporters to the compose hostname and verify with a real request after startup

### Risk: AI service instrumentation grows too large

Mitigation:

- keep AI service instrumentation bounded to a basic Prometheus endpoint in this pass
- defer deep tracing if it threatens delivery or stability

### Risk: Alert noise

Mitigation:

- start with a conservative small rule set tied to service availability, errors, and resource pressure
- avoid broad speculative alerts

## Implementation Boundaries

This should be implemented as a focused infrastructure change with limited app edits:

- root `docker-compose.yml`
- `.env.compose.example`
- `monitoring/` configs and provisioning tree
- bounded backend tracing and logging config adjustments
- bounded AI metrics instrumentation
- docs updates

Avoid broad unrelated refactors while delivering this stack.

## Success Criteria

The work is successful when:

1. A user can run the repo through Docker Compose with one env file.
2. Grafana is reachable on its documented port.
3. The operator can log into Grafana using `.env.compose` credentials.
4. Grafana already contains working data sources, dashboards, and alert rules.
5. Metrics, logs, and traces are visible without manual setup.
6. Core LMS services remain usable even if observability components are degraded.

## Recommended Next Step

After spec approval, create a concrete implementation plan that sequences:

1. compose and config scaffolding
2. Grafana provisioning
3. Prometheus, Loki, Promtail, and Tempo wiring
4. backend tracing alignment
5. AI metrics endpoint
6. runtime verification and alert validation
7. documentation updates
