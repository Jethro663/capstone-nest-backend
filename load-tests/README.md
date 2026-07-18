# Nexora LMS Concurrency & Load Testing Suite (k6)

This directory contains realistic concurrency and load testing scripts for Nexora LMS, built with [Grafana k6](https://k6.io/). It is designed to measure system latency, database connection pool behavior, Redis queue depth, and AI worker throughput under classroom burst traffic.

---

## ⚠️ Safe Staging-Only Guidance
**DO NOT RUN THESE TESTS AGAINST PRODUCTION ENVIRONMENT WITHOUT SCHEDULING A MAINTENANCE WINDOW.**
Load tests simulate 30–50 concurrent students logging in, parallel assessment submissions, and multiple teacher AI generation jobs. Running this in production will consume real token budgets, generate database load, and create synthetic attempts. Always run against a **staging** or **isolated local/development Docker** environment.

---

## 1. Required Environment Variables & Seeded IDs

You can customize the target environment, credentials, and entity UUIDs by setting environment variables when invoking k6:

| Variable | Default Value | Description |
|---|---|---|
| `BASE_URL` | `http://localhost:3000` | Backend API base URL |
| `TEST_STUDENT_EMAIL` | `student1@nexora.test` | Seeded student email |
| `TEST_STUDENT_PASSWORD` | `Password123!` | Seeded student password |
| `TEST_TEACHER_EMAIL` | `teacher1@nexora.test` | Seeded teacher email |
| `TEST_TEACHER_PASSWORD` | `Password123!` | Seeded teacher password |
| `TEST_CLASS_ID` | `11111111-...` | Target class UUID |
| `TEST_SECTION_ID` | `22222222-...` | Target section UUID |
| `TEST_ASSESSMENT_ID` | `33333333-...` | Target assessment UUID for attempt flow |
| `TEST_QUESTION_ID` | `44444444-...` | Sample question UUID inside assessment |
| `TEST_LESSON_ID` | `55555555-...` | Anchor lesson UUID for AI lesson plan & quiz generation |
| `TEST_INTERVENTION_CASE_ID` | `66666666-...` | Target intervention case UUID |

The suite drives public NestJS contracts only. It does not require or authorize direct access to the internal FastAPI port.

---

## 2. Running the Suite

To execute the full classroom burst simulation:

```bash
k6 run load-tests/k6/classroom-burst.js
```

With custom environment overrides:

```bash
k6 run \
  -e BASE_URL=https://staging.nexora.test \
  -e TEST_STUDENT_EMAIL=student.seeded@school.edu \
  load-tests/k6/classroom-burst.js
```

---

## 3. Scenarios & Thresholds

The suite runs four concurrent workflows:
1. **`student_login_burst`**: Rampping 0 → 30 → 50 VUs simulating synchronous morning login bursts and fetching classes.
2. **`student_assessment_flow`**: 15 constant VUs starting assessment attempts, making progress updates, and submitting responses.
3. **`teacher_dashboard_polling`**: 5 constant VUs polling dashboard classes, enrollments, and notifications.
4. **`teacher_ai_jobs`**: 3 constant VUs queueing quiz generation, lesson plan generation, and intervention recommendations while polling job status.

### Asserted Thresholds:
- **Global Error Rate (`http_req_failed`)**: Must remain **`< 2%`** across all traffic.
- **Login Burst Latency (`p(95)`)**: Must remain **`< 750ms`**.
- **Dashboard Polling Latency (`p(95)`)**: Must remain **`< 750ms`**.
- **Assessment Flow Latency (`p(99)`)**: Must remain **`< 1500ms`** under parallel start/submit pressure.
- **AI Job Creation Checks**: Must pass **`> 95%`** of validation assertions.

---

## 4. Result Interpretation & Diagnostics

While running the k6 tests, monitor Grafana and Prometheus using the dashboards in `monitoring/grafana/dashboards/`:
- **Database Pool Health**: Check `db_pool_total_connections`, `db_pool_idle_connections`, and `db_pool_waiting_requests` (exposed via `/api/metrics` on the NestJS backend). If `waiting_requests` spikes above 0, investigate query/pool pressure before changing `DB_POOL_MAX`.
- **Redis Queue Depth**: Check `bullmq_waiting_jobs` and `bullmq_active_jobs` for `ai-teacher-generation`.
- **Head-of-Line Blocking**: Verify that fast quiz generation jobs are not blocked by long-running lesson plan jobs.

---

## 5. Deterministic AI/BullMQ Resilience Smoke

Run the local, dependency-mocked regression smoke after changing AI extraction,
retrieval, indexing, degraded-mode behavior, queue producers/workers, or the
backend-to-AI shared-secret boundary:

```bash
./load-tests/run-ai-pipeline-resilience-smoke.sh
```

The smoke deliberately exercises timeout and dependency-failure paths without
calling a live Ollama runtime or mutating a deployed environment. It verifies:

- extraction cancellation, persisted lease fencing, redelivery, and apply flow;
- vector provider failure, exact dimensions, current-model filtering, aggregate timeout, and serialized reindex behavior;
- tutor and JA grounded fallback responses plus non-blocking tutor concurrency;
- BullMQ job identifiers, active-job deduplication, retry propagation, and pending-only enqueue compensation;
- fail-closed shared-secret checks, secret-free storage redirects, and backend proxy deadlines through response-body parsing.

Set `AI_TEST_PYTHON` if the AI virtual environment lives somewhere other than
`ai-service/.venv/bin/python`.
