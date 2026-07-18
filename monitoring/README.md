# Nexora Observability

The monitoring stack is an opt-in Docker Compose profile. It is not required for the core LMS to start.

## Components

- Prometheus: application scrapes, exporter metrics, and blackbox probes.
- Grafana: provisioned dashboards and optional alerting.
- Loki and Promtail: log storage and Docker log discovery.
- Tempo: OTLP trace storage.
- Blackbox Exporter: HTTP/TCP availability probes.
- Node Exporter: Linux host metrics.
- cAdvisor: Docker container metrics.

## Start

Set unique Grafana credentials and telemetry endpoints in root `.env` (created from `.env.compose.example`):

```env
GRAFANA_ADMIN_USER=operator
GRAFANA_ADMIN_PASSWORD=replace-with-a-strong-secret
OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318
LOKI_HOST=http://loki:3100
```

```bash
docker compose --profile observability up -d --build --wait
```

Validate the stack:

```bash
docker compose --profile observability ps
curl --fail http://localhost:9090/-/ready
curl --fail http://localhost:3100/ready
curl --fail http://localhost:3200/ready
curl --fail http://localhost:3002/api/health
```

Prometheus target status is available at `http://localhost:9090/targets`.

## Alert delivery

Alert evaluation/email is disabled by default because the local stack has no mail relay. To enable it, configure all required SMTP values:

```env
GRAFANA_ALERTING_ENABLED=true
GRAFANA_ALERT_EMAIL=ops@example.org
GF_SMTP_ENABLED=true
GF_SMTP_HOST=smtp.example.org:587
GF_SMTP_USER=replace-me
GF_SMTP_PASSWORD=replace-me
GF_SMTP_FROM_ADDRESS=alerts@example.org
```

Restart Grafana and verify its logs before relying on alert delivery.

## Security and host boundaries

- Promtail reads the Docker socket and container log directory read-only.
- Node Exporter reads host `/proc`, `/sys`, root filesystem, and udev data read-only.
- cAdvisor reads Docker/runtime host state and `/dev/kmsg`; it is isolated behind this profile.
- Tempo retains the image-required root runtime inside its container.
- These collectors are appropriate for a controlled Linux development/operator host, not an unreviewed shared environment.

## Operational notes

- Tempo can take a short warm-up period before `/ready` returns 200.
- Redis may warn when the Linux host does not set `vm.overcommit_memory=1`. That is a host-wide choice and is not changed automatically by this repository.
- Grafana and cAdvisor are exact patch pins. Rehearse state migration and verify named container series before changing either pin.
- Backend metrics are served at `/api/metrics`, not `/metrics`.
- If traces are missing, confirm the backend container received `OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318` and logged tracing initialization.
