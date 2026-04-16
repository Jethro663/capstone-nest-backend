# Nexora Docker Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Docker Compose observability stack for Nexora with Grafana as the single operator login, backed by Prometheus, Loki, Promtail, Tempo, infrastructure exporters, provisioned dashboards, and baseline alerts.

**Architecture:** Extend the root Compose topology with an internal LGTM-style monitoring slice and keep the LMS services independently runnable if monitoring degrades. Reuse the existing backend metrics and tracing hooks, add bounded AI-service metrics, collect container logs through Promtail, and provision Grafana entirely from repo files so first boot is deterministic.

**Tech Stack:** Docker Compose, Grafana, Prometheus, Loki, Promtail, Tempo, cAdvisor, node-exporter, NestJS, prom-client, FastAPI, Python `prometheus_client`, OpenTelemetry OTLP HTTP

---

## File Map

### Existing files to modify

- `docker-compose.yml`
- `.env.compose.example`
- `README.md`
- `backend/src/tracing.ts`
- `backend/src/common/logger/winston.config.ts`
- `ai-service/app/main.py`
- `ai-service/requirements.txt`
- `monitoring/prometheus.yml`
- `monitoring/tempo-config.yml`

### New monitoring config files

- `monitoring/loki-config.yml`
- `monitoring/promtail-config.yml`
- `monitoring/grafana/provisioning/datasources/datasources.yml`
- `monitoring/grafana/provisioning/dashboards/dashboards.yml`
- `monitoring/grafana/provisioning/alerting/contact-points.yml`
- `monitoring/grafana/provisioning/alerting/policies.yml`
- `monitoring/grafana/provisioning/alerting/rules.yml`
- `monitoring/grafana/dashboards/nexora-overview.json`
- `monitoring/grafana/dashboards/nexora-backend.json`
- `monitoring/grafana/dashboards/nexora-ai-service.json`
- `monitoring/grafana/dashboards/nexora-infrastructure.json`
- `monitoring/grafana/dashboards/nexora-containers.json`
- `monitoring/grafana/dashboards/nexora-logs.json`
- `monitoring/grafana/dashboards/nexora-traces.json`

### New tests

- `ai-service/tests/test_metrics_endpoints.py`
- `backend/src/common/logger/winston.config.spec.ts`

### Optional helper docs files if README becomes too large

- `docs/monitoring-stack.md`

## Task 1: Compose And Environment Scaffolding

**Files:**
- Modify: `docker-compose.yml`
- Modify: `.env.compose.example`

- [ ] **Step 1: Write the failing compose expectations down in a scratch check**

Use this checklist before editing:

```text
Expected missing state:
- no grafana service
- no prometheus service
- no loki service
- no promtail service
- no tempo service
- no node-exporter service
- no cadvisor service
- no Grafana admin env vars in .env.compose.example
```

- [ ] **Step 2: Verify the current compose file does not yet define the monitoring services**

Run:

```powershell
rg -n "grafana|prometheus|loki|promtail|tempo|cadvisor|node-exporter" docker-compose.yml .env.compose.example
```

Expected: no service definitions in `docker-compose.yml` and no Grafana credential variables in `.env.compose.example`.

- [ ] **Step 3: Extend `.env.compose.example` with Grafana and monitoring defaults**

Add these variables near the existing compose overrides:

```dotenv
GRAFANA_PORT=3002
PROMETHEUS_PORT=9090
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin12345
LOKI_PORT=3100
TEMPO_OTLP_HTTP_PORT=4318
TEMPO_PORT=3200
```

Keep the existing app secrets unchanged. Do not add real secrets.

- [ ] **Step 4: Add the monitoring services and volumes to `docker-compose.yml`**

Implement these service blocks with the repo-relative mounts shown below:

```yaml
  prometheus:
    image: prom/prometheus:v2.54.1
    restart: unless-stopped
    command:
      - --config.file=/etc/prometheus/prometheus.yml
      - --storage.tsdb.path=/prometheus
      - --web.enable-lifecycle
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    ports:
      - "${PROMETHEUS_PORT:-9090}:9090"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:9090/-/ready"]
      interval: 15s
      timeout: 10s
      retries: 20
    networks:
      - lms-network

  loki:
    image: grafana/loki:3.2.1
    restart: unless-stopped
    command: ["-config.file=/etc/loki/local-config.yaml"]
    volumes:
      - ./monitoring/loki-config.yml:/etc/loki/local-config.yaml:ro
      - loki_data:/loki
    networks:
      - lms-network

  tempo:
    image: grafana/tempo:2.6.1
    restart: unless-stopped
    command: ["-config.file=/etc/tempo.yaml"]
    volumes:
      - ./monitoring/tempo-config.yml:/etc/tempo.yaml:ro
      - tempo_data:/tmp/tempo
    networks:
      - lms-network

  grafana:
    image: grafana/grafana:11.2.2
    restart: unless-stopped
    environment:
      GF_SECURITY_ADMIN_USER: "${GRAFANA_ADMIN_USER:-admin}"
      GF_SECURITY_ADMIN_PASSWORD: "${GRAFANA_ADMIN_PASSWORD:-admin12345}"
      GF_USERS_ALLOW_SIGN_UP: "false"
    volumes:
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning:ro
      - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards:ro
      - grafana_data:/var/lib/grafana
    ports:
      - "${GRAFANA_PORT:-3002}:3000"
    depends_on:
      prometheus:
        condition: service_started
      loki:
        condition: service_started
      tempo:
        condition: service_started
    networks:
      - lms-network
```

Also add `promtail`, `node-exporter`, and `cadvisor` with the standard Docker mounts, plus the named volumes:

```yaml
volumes:
  postgres_data:
  ollama_data:
  backend_uploads:
  prometheus_data:
  grafana_data:
  loki_data:
  tempo_data:
```

- [ ] **Step 5: Route backend tracing and Loki env vars through compose**

Add these environment values under the existing `backend` service:

```yaml
      OTEL_EXPORTER_OTLP_ENDPOINT: http://tempo:4318
      OTEL_SERVICE_NAME: nexora-backend
      LOKI_HOST: http://loki:3100
```

Do not add a hard dependency from `backend` to the monitoring services.

- [ ] **Step 6: Run compose config to validate the scaffold**

Run:

```powershell
docker compose --env-file .env.compose config > $null
```

Expected: command exits `0`.

- [ ] **Step 7: Commit the compose scaffold**

Run:

```bash
git add docker-compose.yml .env.compose.example
git commit -m "chore: scaffold compose observability services"
```

## Task 2: Prometheus, Loki, Promtail, And Tempo Config

**Files:**
- Modify: `monitoring/prometheus.yml`
- Modify: `monitoring/tempo-config.yml`
- Create: `monitoring/loki-config.yml`
- Create: `monitoring/promtail-config.yml`

- [ ] **Step 1: Write the failing scrape-target expectation**

Create this reference list before editing:

```text
Prometheus must scrape:
- prometheus
- backend
- ai-service
- cadvisor
- node-exporter
```

- [ ] **Step 2: Replace `monitoring/prometheus.yml` with multi-target scrape config**

Use this content as the starting file body:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: prometheus
    static_configs:
      - targets: ["prometheus:9090"]

  - job_name: backend
    metrics_path: /metrics
    static_configs:
      - targets: ["backend:3000"]

  - job_name: ai-service
    metrics_path: /metrics
    static_configs:
      - targets: ["ai-service:8000"]

  - job_name: cadvisor
    static_configs:
      - targets: ["cadvisor:8080"]

  - job_name: node-exporter
    static_configs:
      - targets: ["node-exporter:9100"]
```

- [ ] **Step 3: Replace `monitoring/tempo-config.yml` with a persistent local config that keeps OTLP HTTP enabled**

Use this body:

```yaml
server:
  http_listen_port: 3200
  grpc_listen_port: 9095

distributor:
  receivers:
    otlp:
      protocols:
        http:
          endpoint: 0.0.0.0:4318

storage:
  trace:
    backend: local
    local:
      path: /tmp/tempo/traces

metrics_generator:
  storage:
    path: /tmp/tempo/generator

compactor:
  compaction:
    block_retention: 24h
```

- [ ] **Step 4: Add `monitoring/loki-config.yml`**

Create:

```yaml
auth_enabled: false

server:
  http_listen_port: 3100

common:
  path_prefix: /loki
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules

schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

limits_config:
  allow_structured_metadata: true
  volume_enabled: true

pattern_ingester:
  enabled: true

ruler:
  alertmanager_url: http://grafana:3000
```

- [ ] **Step 5: Add `monitoring/promtail-config.yml`**

Create:

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: docker
    static_configs:
      - targets: [localhost]
        labels:
          job: docker
          __path__: /var/lib/docker/containers/*/*-json.log
    pipeline_stages:
      - docker: {}
```

- [ ] **Step 6: Validate config syntax by starting only the monitoring backends**

Run:

```powershell
docker compose --env-file .env.compose up -d prometheus loki tempo promtail node-exporter cadvisor
docker compose ps
```

Expected: all six services show `Up` or healthy startup state; none should exit immediately because of config parsing errors.

- [ ] **Step 7: Commit the backend configs**

Run:

```bash
git add monitoring/prometheus.yml monitoring/tempo-config.yml monitoring/loki-config.yml monitoring/promtail-config.yml docker-compose.yml
git commit -m "chore: add monitoring backend configs"
```

## Task 3: Grafana Provisioning, Dashboards, And Alerts

**Files:**
- Create: `monitoring/grafana/provisioning/datasources/datasources.yml`
- Create: `monitoring/grafana/provisioning/dashboards/dashboards.yml`
- Create: `monitoring/grafana/provisioning/alerting/contact-points.yml`
- Create: `monitoring/grafana/provisioning/alerting/policies.yml`
- Create: `monitoring/grafana/provisioning/alerting/rules.yml`
- Create: `monitoring/grafana/dashboards/nexora-overview.json`
- Create: `monitoring/grafana/dashboards/nexora-backend.json`
- Create: `monitoring/grafana/dashboards/nexora-ai-service.json`
- Create: `monitoring/grafana/dashboards/nexora-infrastructure.json`
- Create: `monitoring/grafana/dashboards/nexora-containers.json`
- Create: `monitoring/grafana/dashboards/nexora-logs.json`
- Create: `monitoring/grafana/dashboards/nexora-traces.json`

- [ ] **Step 1: Add Grafana datasource provisioning**

Create `monitoring/grafana/provisioning/datasources/datasources.yml`:

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: false

  - name: Tempo
    type: tempo
    access: proxy
    url: http://tempo:3200
    editable: false
    jsonData:
      tracesToLogsV2:
        datasourceUid: loki
        tags: ["service_name"]
        filterByTraceID: true
```

- [ ] **Step 2: Add Grafana dashboard provider provisioning**

Create `monitoring/grafana/provisioning/dashboards/dashboards.yml`:

```yaml
apiVersion: 1

providers:
  - name: nexora
    orgId: 1
    folder: Nexora
    type: file
    disableDeletion: false
    editable: false
    options:
      path: /var/lib/grafana/dashboards
```

- [ ] **Step 3: Add Grafana alert provisioning**

Create these three files:

```yaml
# monitoring/grafana/provisioning/alerting/contact-points.yml
apiVersion: 1
contactPoints:
  - orgId: 1
    name: grafana-default-email
    receivers:
      - uid: grafana-default-email
        type: email
        settings:
          addresses: ""
```

```yaml
# monitoring/grafana/provisioning/alerting/policies.yml
apiVersion: 1
policies:
  - orgId: 1
    receiver: grafana-default-email
```

```yaml
# monitoring/grafana/provisioning/alerting/rules.yml
apiVersion: 1
groups:
  - orgId: 1
    name: nexora-platform
    folder: Nexora
    interval: 1m
```

- [ ] **Step 4: Create the overview dashboard JSON with the required panels**

Create `monitoring/grafana/dashboards/nexora-overview.json` with a minimal but valid dashboard containing panels like:

```json
{
  "title": "Nexora Overview",
  "tags": ["nexora", "overview"],
  "timezone": "browser",
  "schemaVersion": 39,
  "version": 1,
  "panels": [
    {
      "type": "stat",
      "title": "Backend Up",
      "datasource": { "type": "prometheus", "uid": "Prometheus" },
      "targets": [{ "expr": "up{job=\"backend\"}", "refId": "A" }]
    },
    {
      "type": "stat",
      "title": "AI Service Up",
      "datasource": { "type": "prometheus", "uid": "Prometheus" },
      "targets": [{ "expr": "up{job=\"ai-service\"}", "refId": "A" }]
    }
  ]
}
```

Populate the remaining dashboards with focused views for backend latency/errors, AI readiness/errors, host resource usage, container usage, Loki explore shortcuts, and Tempo trace search.

- [ ] **Step 5: Add baseline alert rules for service-down and resource-pressure cases**

Expand `monitoring/grafana/provisioning/alerting/rules.yml` with rules similar to:

```yaml
  - orgId: 1
    name: nexora-availability
    folder: Nexora
    interval: 1m
    rules:
      - uid: backend-down
        title: Backend Down
        condition: A
        data:
          - refId: A
            datasourceUid: Prometheus
            model:
              expr: up{job="backend"} == 0
              intervalMs: 1000
              maxDataPoints: 43200
        for: 2m
        noDataState: Alerting
        execErrState: Alerting
```

Add equivalent rules for `frontend`, `ai-service`, `postgres` target failures if scraped indirectly, high backend 5xx rate, high AI error rate, disk pressure, memory pressure, and container restart spikes.

- [ ] **Step 6: Start Grafana and verify provisioning**

Run:

```powershell
docker compose --env-file .env.compose up -d grafana
docker compose logs --tail=100 grafana
```

Expected:

```text
logger=provisioning.datasources ... finished to provision datasources
logger=provisioning.dashboard ... saving new dashboard
logger=ngalert.multiorg.alertmanager ...
```

- [ ] **Step 7: Commit the Grafana provisioning**

Run:

```bash
git add monitoring/grafana docker-compose.yml
git commit -m "feat: provision grafana dashboards and alerts"
```

## Task 4: Backend Observability Alignment

**Files:**
- Modify: `backend/src/tracing.ts`
- Modify: `backend/src/common/logger/winston.config.ts`
- Create: `backend/src/common/logger/winston.config.spec.ts`

- [ ] **Step 1: Write the failing backend logger and tracing tests**

Create `backend/src/common/logger/winston.config.spec.ts` with:

```ts
describe('winston logger config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('adds Loki transport when LOKI_HOST is configured', async () => {
    process.env.LOKI_HOST = 'http://loki:3100';
    const { winstonLogger } = await import('./winston.config');

    const transportNames = winstonLogger.transports.map((transport) => transport.name);
    expect(transportNames).toContain('loki');
  });
});
```

- [ ] **Step 2: Run the backend test to confirm it fails against the current production-only gating**

Run:

```powershell
cd backend
npm test -- winston.config.spec.ts
```

Expected: FAIL because the current config only enables Loki in production mode.

- [ ] **Step 3: Update `backend/src/common/logger/winston.config.ts` to make Loki opt-in by host rather than production-only**

Change the transport condition to:

```ts
if (process.env.LOKI_HOST) {
  transports.push(
    new LokiTransport({
      host: process.env.LOKI_HOST,
      labels: {
        app: 'nexora-lms-backend',
        service_name: process.env.OTEL_SERVICE_NAME || 'nexora-backend',
        environment: process.env.NODE_ENV || 'development',
      },
    }),
  );
}
```

- [ ] **Step 4: Update `backend/src/tracing.ts` to set service metadata and use the compose endpoint**

Use:

```ts
const otlpEndpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://tempo:4318';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: `${otlpEndpoint.replace(/\/$/, '')}/v1/traces`,
  }),
  serviceName: process.env.OTEL_SERVICE_NAME ?? 'nexora-backend',
  instrumentations: [getNodeAutoInstrumentations()],
});
```

- [ ] **Step 5: Re-run the focused backend test and then build**

Run:

```powershell
cd backend
npm test -- winston.config.spec.ts
npm run build
```

Expected:

```text
PASS src/common/logger/winston.config.spec.ts
```

and the build exits `0`.

- [ ] **Step 6: Commit the backend observability alignment**

Run:

```bash
git add backend/src/tracing.ts backend/src/common/logger/winston.config.ts backend/src/common/logger/winston.config.spec.ts
git commit -m "feat: align backend tracing and Loki logging"
```

## Task 5: AI Service Metrics Endpoint And Tests

**Files:**
- Modify: `ai-service/requirements.txt`
- Modify: `ai-service/app/main.py`
- Create: `ai-service/tests/test_metrics_endpoints.py`

- [ ] **Step 1: Write the failing AI-service metrics tests**

Create `ai-service/tests/test_metrics_endpoints.py`:

```python
import unittest
from fastapi.testclient import TestClient

from app.main import app


class MetricsEndpointTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_metrics_endpoint_returns_prometheus_text(self) -> None:
        response = self.client.get("/metrics")
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/plain", response.headers["content-type"])
        self.assertIn("python_info", response.text)

    def test_ready_endpoint_updates_readiness_metric(self) -> None:
        self.client.get("/health")
        response = self.client.get("/metrics")
        self.assertEqual(response.status_code, 200)
        self.assertIn("nexora_ai_http_requests_total", response.text)
```

- [ ] **Step 2: Run the AI tests to verify the metrics endpoint does not exist yet**

Run:

```powershell
cd ai-service
python scripts/run_tests.py
```

Expected: FAIL with `/metrics` missing or missing Prometheus output text.

- [ ] **Step 3: Add `prometheus_client` to `ai-service/requirements.txt`**

Append:

```txt
prometheus_client>=0.21.0
```

- [ ] **Step 4: Instrument `ai-service/app/main.py` with counters, latency, and readiness gauges**

Add imports and globals near the logger setup:

```python
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest
from fastapi.responses import Response

AI_HTTP_REQUESTS = Counter(
    "nexora_ai_http_requests_total",
    "Total AI service HTTP requests",
    ["method", "path", "status"],
)
AI_HTTP_LATENCY = Histogram(
    "nexora_ai_http_request_duration_seconds",
    "AI service HTTP request duration",
    ["method", "path"],
)
AI_READY = Gauge(
    "nexora_ai_ready",
    "AI service readiness state",
)
OLLAMA_AVAILABLE = Gauge(
    "nexora_ai_ollama_available",
    "Whether Ollama is reachable",
)
```

Then add middleware and the endpoint:

```python
@app.middleware("http")
async def metrics_middleware(request, call_next):
    import time

    start = time.perf_counter()
    response = await call_next(request)
    duration = time.perf_counter() - start
    AI_HTTP_REQUESTS.labels(request.method, request.url.path, response.status_code).inc()
    AI_HTTP_LATENCY.labels(request.method, request.url.path).observe(duration)
    return response


@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
```

Update the existing readiness helper to set gauges:

```python
    AI_READY.set(1 if ready else 0)
    OLLAMA_AVAILABLE.set(1 if ollama_status["available"] else 0)
```

- [ ] **Step 5: Re-run the AI test suite**

Run:

```powershell
cd ai-service
python scripts/run_tests.py
```

Expected: the new metrics tests pass and the existing suite remains green.

- [ ] **Step 6: Commit the AI-service metrics work**

Run:

```bash
git add ai-service/requirements.txt ai-service/app/main.py ai-service/tests/test_metrics_endpoints.py
git commit -m "feat: expose ai service prometheus metrics"
```

## Task 6: End-To-End Runtime Verification

**Files:**
- Modify: `docker-compose.yml` if runtime issues surface
- Modify: monitoring configs if scrape labels or mounts need correction

- [ ] **Step 1: Bring the full stack up**

Run:

```powershell
docker compose --env-file .env.compose up -d --build
docker compose ps
```

Expected: all app and monitoring services are `Up`; `backend`, `ai-service`, `grafana`, and `prometheus` should eventually pass health checks.

- [ ] **Step 2: Verify Prometheus scrape health**

Run:

```powershell
docker compose exec prometheus wget -qO- http://localhost:9090/api/v1/targets
```

Expected: JSON payload includes `backend`, `ai-service`, `cadvisor`, and `node-exporter` targets with `"health":"up"`.

- [ ] **Step 3: Verify AI and backend metrics manually**

Run:

```powershell
docker compose exec backend node -e "fetch('http://localhost:3000/metrics').then(r=>r.text()).then(t=>console.log(t.slice(0,300)))"
docker compose exec ai-service python -c "import urllib.request;print(urllib.request.urlopen('http://localhost:8000/metrics').read(300).decode())"
```

Expected: backend metrics include Prometheus-format lines; AI metrics include `nexora_ai_http_requests_total`.

- [ ] **Step 4: Verify Grafana provisioning and login path**

Run:

```powershell
docker compose logs --tail=200 grafana
```

Expected logs mention datasource and dashboard provisioning with no fatal provisioning errors.

Then manually open:

```text
http://localhost:${GRAFANA_PORT:-3002}
```

and log in with `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD` from `.env.compose`.

- [ ] **Step 5: Verify logs and traces**

Generate a backend request:

```powershell
curl http://localhost:3000/api/health/live
```

Then check:

```powershell
docker compose logs --tail=100 promtail
docker compose logs --tail=100 tempo
```

Expected: Promtail is tailing Docker logs without permission errors; Tempo logs show trace ingestion after backend requests.

- [ ] **Step 6: Trigger one controlled failure and verify alert behavior**

Run:

```powershell
docker compose stop ai-service
```

Wait 2-3 minutes, then inspect Grafana alert state and Prometheus targets. Restart the service:

```powershell
docker compose start ai-service
```

Expected: the AI-service-down alert transitions to firing and then recovers after restart.

- [ ] **Step 7: Commit any runtime-only fixes**

Run:

```bash
git add docker-compose.yml monitoring
git commit -m "fix: stabilize observability runtime wiring"
```

Only commit if runtime verification required code or config changes.

## Task 7: Documentation And Operator Runbook

**Files:**
- Modify: `README.md`
- Optional create: `docs/monitoring-stack.md`
- Modify: `.env.compose.example` if doc comments need clarification

- [ ] **Step 1: Add README observability overview and ports**

Add a new section similar to:

```md
## Observability Stack

The Docker Compose stack includes:

- Grafana for dashboards, logs, traces, and alerts
- Prometheus for metrics
- Loki + Promtail for logs
- Tempo for traces
- cAdvisor + node-exporter for infrastructure metrics

Primary operator entry point:

- Grafana: `http://localhost:3002`
```

- [ ] **Step 2: Document the first-boot login path and env variables**

Add:

```md
Grafana credentials come from `.env.compose`:

- `GRAFANA_ADMIN_USER`
- `GRAFANA_ADMIN_PASSWORD`
```

- [ ] **Step 3: Document the verification commands**

Add commands users can run after `docker compose up`:

```bash
docker compose ps
docker compose logs -f grafana
docker compose logs -f prometheus
docker compose logs -f promtail
```

Also document the expectation that dashboards and alerts are provisioned automatically.

- [ ] **Step 4: Add a concise troubleshooting block**

Include at minimum:

```md
- If Grafana starts without dashboards, inspect `docker compose logs grafana`.
- If logs are missing, inspect `docker compose logs promtail`.
- If traces are missing, verify `OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318`.
- If Prometheus targets are down, inspect `http://localhost:9090/targets`.
```

- [ ] **Step 5: Re-read the docs for consistency with the shipped ports and filenames**

Run:

```powershell
rg -n "3002|Grafana|promtail|tempo|prometheus|OTEL_EXPORTER_OTLP_ENDPOINT" README.md .env.compose.example docs
```

Expected: docs reference the actual ports, service names, and env vars that were implemented.

- [ ] **Step 6: Commit the docs**

Run:

```bash
git add README.md .env.compose.example docs
git commit -m "docs: add observability operator guide"
```

## Plan Self-Review

### Spec coverage

- Docker-first scope: covered by Tasks 1, 2, and 6.
- Single Grafana login: covered by Tasks 1 and 3.
- Metrics, logs, traces: covered by Tasks 2, 3, 4, 5, and 6.
- Baseline alerting: covered by Task 3 and validated in Task 6.
- Documentation and first-boot operator flow: covered by Task 7.

### Placeholder scan

- No `TODO`, `TBD`, or deferred implementation markers remain.
- Each task lists exact files and concrete commands.
- Test and verification commands are explicit.

### Type consistency

- Grafana env names stay consistent across compose, docs, and provisioning.
- Backend OTLP endpoint and service name use the same names in compose and code.
- AI metrics names stay consistent between test expectations and implementation snippets.
