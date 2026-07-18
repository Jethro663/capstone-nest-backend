# Nexora LMS — Classroom Readiness Runbook

> **Audience**: Administrators and developers preparing Nexora for live classroom use.
> **Goal**: Ensure all services are healthy and ready to handle a real class session.

---

## 1. Pre-Flight Environment Checklist

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string. Must start with `postgres://` |
| `JWT_SECRET` | ✅ | Min 32 characters. Access token signing key |
| `JWT_REFRESH_SECRET` | ✅ | Min 32 characters. Refresh token signing key |
| `REDIS_URL` | ✅ | Redis connection. Used by BullMQ and rotation grace cache |
| `AI_SERVICE_URL` | Recommended | FastAPI AI service URL; Compose uses `http://ai-service:8000` |
| `FRONTEND_URL` | Recommended | Next.js frontend origin for CORS |
| `STORAGE_DRIVER` | Optional | `local` (default) or `s3`/`r2` for cloud storage |
| `AWS_ACCESS_KEY_ID` | If S3 | Required when `STORAGE_DRIVER=s3` |
| `AWS_SECRET_ACCESS_KEY` | If S3 | Required when `STORAGE_DRIVER=s3` |
| `STORAGE_BUCKET` | If S3 | S3 bucket name. Defaults to `nexora-uploads` |

> [!IMPORTANT]
> The backend validates these at boot via `validateEnvironment()` in `src/config/validate-env.ts`.
> In production, missing critical variables will abort startup.

---

## 2. Health Checks

### Liveness — `/api/health/live`

- **Purpose**: Confirms the Node.js process is running and the event loop is responsive.
- **Expected response**: `200 OK` with `{ status: "ok", uptime, memoryUsageMB }`.
- **Use in**: Container liveness probes (Kubernetes/Railway).
- **Does NOT touch**: Database, Redis, or AI service.

### Readiness — `/api/health/ready`

- **Purpose**: Confirms all critical dependencies are available.
- **Checks**: PostgreSQL, Redis, AI service, Storage.
- **Expected response**: `200 OK` with `{ ready: true, dependencies: { ... } }`.
- **On failure**: Returns `503` with dependency-level detail.
- **Use in**: Container readiness probes, load balancer health gates.

### Quick Smoke

```bash
# Liveness
curl -s http://localhost:3000/api/health/live | jq .

# Readiness
curl -s http://localhost:3000/api/health/ready | jq .
```

---

## 3. Pre-Class Session Verification

Run these checks 10–15 minutes before class:

### 3.1 Database Connectivity

```bash
# Via readiness endpoint
curl -s http://localhost:3000/api/health/ready | jq '.data.dependencies.database'
```

### 3.2 Redis / Queue Health

```bash
# Via readiness endpoint
curl -s http://localhost:3000/api/health/ready | jq '.data.dependencies.redis'

# Direct Redis check inside core Compose
docker compose exec -T redis redis-cli ping
```

### 3.3 AI Service Availability

```bash
# Via readiness endpoint
curl -s http://localhost:3000/api/health/ready | jq '.data.dependencies.aiService'

# Direct AI service check inside core Compose
docker compose exec -T ai-service python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/ready').read().decode())"
```

> [!NOTE]
> The AI service may report `degraded: true` if the model runtime is unavailable. Set `AI_DEGRADED_ALLOWED=true` only for an intentional degraded environment; normal classroom readiness requires the full dependency chain.

### 3.4 Storage Health

```bash
curl -s http://localhost:3000/api/health/ready | jq '.data.dependencies.storage'
```

---

## 4. Load Capacity Guidelines

Based on the k6 load testing suite in `load-tests/k6/`:

| Scenario | Expected Capacity | P95 Latency Target |
|---|---|---|
| Student login burst (30–50 students) | 50 concurrent | < 2s |
| Parallel quiz start/submit | 30 concurrent | < 3s |
| Teacher dashboard polling | 10 req/s sustained | < 1s |
| AI job submission (lesson/quiz/intervention) | 5 concurrent | < 10s queue entry |

### Running Load Tests

```bash
cd load-tests/k6
k6 run classroom-burst.js --env BASE_URL=http://localhost:3000/api
```

---

## 5. Common Issues & Recovery

### 5.1 "Service dependencies are not ready" (503)

**Check**: Which dependency failed in the response body.

| Failed Dependency | Recovery |
|---|---|
| `database.ok = false` | Verify `DATABASE_URL`, check PostgreSQL logs, confirm connectivity |
| `redis.ok = false` | Verify `REDIS_URL`, restart Redis, check memory limits |
| `aiService.ok = false` | Verify `AI_SERVICE_URL`, restart FastAPI service, check Ollama |
| `storage.ok = false` | Check disk permissions (local) or S3 credentials (cloud) |

### 5.2 Token Rotation Loops (Students Getting Logged Out)

**Symptoms**: Multiple students report being logged out simultaneously.

**Diagnosis**:
```bash
# Check for reuse detection events
grep "SECURITY.*Revoked refresh token reuse" /var/log/backend/*.log
grep "SECURITY.*Concurrent refresh within grace" /var/log/backend/*.log
```

**Recovery**: The 45-second grace window (backed by Redis + DB) handles benign concurrent refreshes.
If students are still being logged out, check:
1. Redis connectivity (the rotation grace cache uses Redis as L2).
2. Clock skew between backend instances (grace window relies on timestamps).
3. Whether the frontend/mobile is retrying with an old token beyond the grace window.

### 5.3 AI Jobs Stuck in Queue

```bash
# Confirm queue metadata and inspect worker logs
docker compose exec -T redis redis-cli --scan --pattern 'bull:ai-teacher-generation:*'
docker compose logs --tail=200 backend ai-service redis
```

**Recovery**: Jobs use bounded retry/backoff. If stuck:
1. Check AI service health.
2. Read the job/worker failure and verify whether retry or cancellation is safe.
3. Restart the backend only when the worker itself is unhealthy. Do not delete BullMQ keys manually; that can orphan job state.

### 5.4 File Uploads Failing

**Local storage**: Verify the upload directory exists and is writable:
```bash
ls -la "${UPLOAD_DIR:-./uploads}"
```

**S3 storage**: Verify credentials and bucket access:
```bash
aws s3 ls "s3://${STORAGE_BUCKET:-nexora-uploads}" --region "${STORAGE_REGION:-us-east-1}"
```

---

## 6. Monitoring & Alerts

### Prometheus Metrics

The backend exposes metrics at `/api/metrics`:
- `http_request_duration_seconds` — Request latency histogram
- `bull_queue_depth` — BullMQ queue depth by queue name
- `bull_job_duration_seconds` — Job processing duration

### Recommended Alert Rules

| Alert | Condition | Severity |
|---|---|---|
| High API latency | P95 > 3s for 5 minutes | Warning |
| Queue backlog | Waiting jobs > 20 for 10 minutes | Warning |
| Failed jobs spike | Failed count increases by > 5 in 5 minutes | Critical |
| Readiness degraded | `/health/ready` returns 503 for 2 minutes | Critical |
| High memory usage | RSS > 512MB for 5 minutes | Warning |

---

## 7. Graceful Shutdown Procedure

The backend uses NestJS shutdown hooks (`app.enableShutdownHooks()`). On SIGTERM:

1. Stop accepting new HTTP connections.
2. Drain active BullMQ job processors.
3. Close database connections.
4. Close Redis connections.
5. Exit cleanly.

**Note**: Allow 30 seconds for graceful drain in your container orchestrator's `terminationGracePeriodSeconds`.
