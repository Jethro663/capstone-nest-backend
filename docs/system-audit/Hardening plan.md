# 50-Student Burst Hardening Plan

## Goal
Improve single-instance survivability for a real 50-student burst without broad rewrites. This round prioritizes fast failure for overloaded live AI chat, queue-backed post-submit recomputation, safer AI-service runtime behavior, memory exhaustion (OOM) prevention, and synchronized classroom stampede defense. Horizontal-scaling work stays explicitly deferred.

## Decisions Locked In
- Live student AI tutor saturation should fast-fail, not wait indefinitely.
- Teacher/extraction AI jobs should be stabilized now, with the durable multi-worker upgrade path documented but deferred.
- Assessment-submit recomputation should move off the request path into BullMQ.
- Enforce strict BullMQ job retention policies to protect Railway Hobby's limited Redis RAM from OOM crashes.
- Optimize single-instance operation first.
- Enforce runtime memory capping (V8 heap protection) and auth stampede defense for synchronized lab logins.
- Keep this round server-focused; general client polling reduction is follow-up work, but low-cost real-time refetch jitter is included now.

---

## Phase 1: Fast-Fail Admission Control For Student Tutor
### Intent
Prevent 50 simultaneous tutor requests from turning into 50 simultaneous LLM calls that hang proxy sockets and trigger upstream rate-limit cascades.

### Changes
- Add a dedicated tutor admission limiter around live student tutor endpoints in `ai-service/app/main.py`.
- Scope the limiter to:
  - `POST /student/tutor/session`
  - `POST /student/tutor/session/{session_id}/message`
  - `POST /student/tutor/session/{session_id}/answers`
- Return an immediate `429 Too Many Requests` or `503 Service Unavailable` with a short retry message and `Retry-After` header when inflight tutor capacity is full.
- Keep background job semaphores separate from live tutor capacity so teacher jobs cannot consume tutor slots.

### Files
- `ai-service/app/main.py`
- `ai-service/app/config.py`
- `ai-service/app/student_tutor_service.py` if shared tutor helpers should own the guard path instead of route handlers only

### Config
- `AI_TUTOR_MAX_INFLIGHT=8` (Recommended for Railway Hobby + OpenRouter Gemini Lite)
- `AI_TUTOR_REJECT_STATUS=429`
- `AI_TUTOR_RETRY_AFTER_S=5`

---

## Phase 2: Single-Worker AI-Service Stabilization Now, Durable Upgrade Path Deferred
### Intent
Stop the current split-brain behavior where `uvicorn --workers 2` conflicts with process-local `AI_JOB_RUNTIME` and `AI_JOB_TASKS` memory dictionaries.

### Changes Now
- Run `ai-service` as a single worker (`--workers 1`) for predictable in-memory job ownership and cancellation.
- Split `_BG_SEMAPHORE` into separate bounded semaphores for:
  - teacher draft generation jobs
  - extraction jobs
- Keep Postgres job records as the source of truth for job status and polling.

### Files
- `ai-service/Dockerfile`
- `ai-service/app/main.py`
- `ai-service/app/config.py`
- `ai-service/.env.example`

### Config
- `AI_TEACHER_BG_MAX_CONCURRENCY=2`
- `AI_EXTRACTION_BG_MAX_CONCURRENCY=1`

### Deferred Upgrade Path
- Replace process-local active-job tracking with Redis or DB-backed ownership/state.
- Revisit multi-worker `uvicorn` only after shared job ownership exists.

---

## Phase 3: Queue Post-Submit Recomputations With Bounded Concurrency & Redis OOM Defense
### Intent
Keep assessment submission latency stable (<300ms) during exam buzzer bursts by moving heavy recomputation out of in-process Node event listeners into BullMQ, while preventing Redis memory starvation.

### Changes
- Leave `AssessmentSubmittedEvent` emission in `assessments.service.ts` as the logical trigger.
- Change `performance-events.listener.ts` so listeners enqueue BullMQ jobs instead of running recomputation directly.
- Add a performance recompute queue and processor that calls existing `PerformanceService` methods.
- Route both triggers through the queue:
  - `AssessmentSubmittedEvent`
  - `ClassRecordScoresUpdatedEvent`
- Apply bounded worker concurrency (`concurrency: 3`).
- **Redis OOM Protection:** Enforce strict auto-removal retention rules on queue definitions (`removeOnComplete: { age: 3600, count: 100 }`, `removeOnFail: { age: 86400, count: 500 }`) so completed job payloads do not exhaust Railway Hobby's limited Redis memory.
- **Deterministic Job Deduplication:** Use stable job IDs (`recompute:class-${classId}:student-${studentId}:assess-${assessmentId}`) to coalesce duplicate burst updates automatically.
- **Atomic SQL Updates:** Enforce atomic database-level increments (`sql\`${table.score} + ${val}\``) in `PerformanceService` to prevent Postgres row lock contention under concurrent grading.

### Files
- `backend/src/modules/assessments/assessments.service.ts`
- `backend/src/modules/performance/listeners/performance-events.listener.ts`
- `backend/src/modules/performance/performance.module.ts`
- `backend/src/modules/performance/performance.service.ts`
- `backend/src/modules/performance/performance-recompute-queue.service.ts` (New)
- `backend/src/modules/performance/processors/performance-recompute.processor.ts` (New)

### Config
- `PERFORMANCE_RECOMPUTE_QUEUE_CONCURRENCY=3`

---

## Phase 4: Bound Notification Worker Behavior And Remove Known Race
### Intent
Avoid extra burst amplification and database unique constraint exceptions while staying single-instance-first.

### Changes
- Add explicit BullMQ worker concurrency (`concurrency: 3`) and strict Redis auto-removal policies (`removeOnComplete`, `removeOnFail`) for notification processors.
- **DB Constraint Verification:** Verify that a Postgres unique constraint or index on `(user_id, type, reference_id)` exists in the Drizzle schema.
- Remove the read-then-insert race in `NotificationsService.createBulkDeduped()` by relying on database conflict handling (`ON CONFLICT DO NOTHING`) instead of prefetch-based dedupe for worker safety.
- Keep Redis Socket.IO adapter deferred because horizontal scaling is out of scope for this round.

### Files
- `backend/src/modules/notifications/notifications.module.ts`
- `backend/src/modules/notifications/processors/assessment-notification.processor.ts`
- `backend/src/modules/notifications/processors/announcement-fan-out.processor.ts`
- `backend/src/modules/notifications/notifications.service.ts`
- `backend/src/drizzle/schema/...` (Verify/add unique constraint if missing)

---

## Phase 5: Runtime Resilience & Stampede Defense (Railway Hobby Safeguards)
### Intent
Protect the single Node.js container from memory heap crashes and prevent synchronized classroom logins or teacher broadcasts from triggering DDoS-like thundering herds.

### Changes
- **5.1 Node.js V8 Heap Protection (JSON Payload Capping):**
  - In `backend/src/main.ts`, restrict the global JSON body parser limit to `1mb` (`express.json({ limit: '1mb' })`). This prevents 50 students submitting exam JSON answers simultaneously from causing a Node.js V8 heap Out-Of-Memory crash. Reserve larger stream-based buffers strictly for dedicated Multer file upload routes.
- **5.2 Refresh Token Stampede Defense (The "8:15 AM Problem"):**
  - In `backend/src/modules/auth/auth.service.ts`, implement a **30- to 60-second token rotation grace period**. When an entire classroom logs in at 8:00 AM and access tokens expire at 8:15 AM, 50 simultaneous refresh requests will not trigger false "token reuse detected / session revoked" logout loops due to network retries or double-clicks.
- **5.3 Real-Time Refetch Jitter (Thundering Herd Prevention):**
  - In frontend real-time hooks (`next-frontend/src/hooks/use-discussion-realtime-refresh.ts` and mobile query listeners), wrap query invalidation refetches in a randomized delay (`setTimeout(() => refetch(), Math.random() * 2500)`). When a teacher publishes an assessment or discussion, the resulting WebSocket broadcast will spread 50 client GET refetches over a 2.5-second window instead of hammering the server at the exact same millisecond.

### Files
- `backend/src/main.ts`
- `backend/src/modules/auth/auth.service.ts`
- `next-frontend/src/hooks/use-discussion-realtime-refresh.ts`
- `mobile/src/...` (Relevant query invalidation listeners)

---

## Verification Plan
### AI Service
- Unit/integration tests for tutor admission control:
  - requests under limit succeed (`200 OK`)
  - requests above limit fail quickly with configured status (`429 Too Many Requests` + `Retry-After`)
- Tests for separate background semaphores to confirm extraction and teacher jobs do not starve each other.
- Smoke verification for AI-job polling/cancel behavior after switching to single worker (`--workers 1`).

### Backend & Queues
- Listener tests proving submit-related events enqueue BullMQ jobs instead of performing recompute inline.
- Processor tests proving queued jobs invoke expected `PerformanceService` methods with atomic SQL updates.
- Notification tests proving bulk notification writes remain deduped via `ON CONFLICT DO NOTHING` without prefetch-race behavior.
- Verify Redis OOM defense by asserting `removeOnComplete` and `removeOnFail` options are attached to queued jobs.

### Runtime Resilience & Stampede Checks
- Verify `POST /api/...` with a >1MB JSON payload (non-upload route) cleanly returns `413 Payload Too Large`.
- Simulate parallel refresh token requests for the same account within a 30-second window to verify both requests succeed without revoking the session.
- Verify real-time broadcast events trigger staggered frontend network requests across the 0–2.5s jitter window.

### End-to-End Burst Checks
- **50 parallel tutor requests:** system rejects overflow instantly rather than timing out proxy sockets.
- **50 parallel assessment submissions:** submit HTTP responses return promptly (<300ms); recompute jobs drain smoothly at configured concurrency cap without Drizzle pool starvation.
- **Notification fan-out sanity:** no duplicate notification rows for the same `(userId, type, referenceId)` burst.

---

## Deferred Items
- Redis-backed Socket.IO adapter and true multi-instance notification delivery
- Shared durable AI active-job ownership/state across multiple Uvicorn workers
- Distributed live-chat admission control across multiple AI-service instances
- Deeper `PerformanceService` query optimization
- General client/web/mobile polling reduction and reconnect-load shaping

---

## Recommended Execution Order
1. **Phase 1:** Fast-fail tutor admission control (`ai-service`)
2. **Phase 2:** Single-worker AI-service stabilization and split background semaphores (`ai-service`)
3. **Phase 5:** Runtime resilience & stampede defense (V8 heap capping, token rotation grace window, and refetch jitter)
4. **Phase 3:** Queue-backed recomputation with Redis OOM protection & atomic SQL updates (`backend`)
5. **Phase 4:** Notification worker bounding, dedupe race cleanup, and DB constraint verification (`backend`)
