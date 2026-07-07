# Backend-Owned Lesson Plan Queue Refinements V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the new backend-owned lesson-plan queue so duplicate enqueue, cancellation, retry behavior, state mapping, and secret misconfiguration are explicit and production-safe.

**Architecture:** Keep the current split where the public backend route enqueues work and `ai-service` runs the lesson-plan generation through an internal route, but tighten the operational contract around it. BullMQ remains the single retry owner, `ai_generation_jobs` remains the durable status source, and the backend worker is explicitly concurrency-limited with deterministic job ids and long-job timeout handling.

**Tech Stack:** NestJS 11, BullMQ, Redis, Drizzle ORM, PostgreSQL, FastAPI, Ollama-backed AI execution, existing `ai_generation_jobs` tables

## Global Constraints

- Preserve the current public job contract for `POST /ai/teacher/lesson-plans/jobs`, `GET /ai/teacher/jobs/:id`, and `GET /ai/teacher/jobs/:id/result`.
- BullMQ is the only owner of execution retries for lesson-plan jobs; do not add parallel HTTP or route-level retry loops.
- Backend worker concurrency for lesson-plan execution is capped at `2` in the first slice.
- The backend worker-to-`ai-service` execution call must use an explicit long-job timeout so hung inference rejects cleanly and BullMQ can retry.
- Internal execution routes must fail closed unless `X-Internal-Service-Token` exactly matches `AI_SERVICE_SHARED_SECRET`.
- Cancellation semantics must be documented and implemented as two separate paths: queued jobs are removable, active jobs are best-effort only.
- `ai_generation_jobs.status` is the canonical app-facing state and must stay aligned with BullMQ state transitions.
- Prefer JSON runtime metadata over schema changes unless a real reliability gap remains after the first smoke pass.
- Treat `backend/src/main.ts` `app.enableShutdownHooks()` as an already-satisfied prerequisite; do not add duplicate shutdown work unless BullMQ-specific evidence exposes a real gap.
- Worker observability logs must stay metadata-only: log job ids, attempts, timings, and queue state, but never prompt bodies, lesson content, student names, or user emails.

---

## Findings Incorporated In This V2

- BullMQ enqueue needs deterministic dedupe via `jobId: \`lesson-plan:${jobId}\``.
- Cancellation needs explicit queued-versus-running behavior instead of a single generic “cancel”.
- Status terms need one shared mapping across BullMQ, database rows, and frontend polling.
- Startup must fail fast in production when `AI_SERVICE_SHARED_SECRET` is missing or blank.
- Worker concurrency, timeout policy, and internal-route auth are not optional implementation details; they are required parts of the design.
- Restart recovery and queue wait time are first-class verification concerns, not afterthoughts.
- Orphaned retry handling matters: BullMQ retries must be able to re-enter stale `processing` jobs left behind by crashed workers, but must not permit unsafe duplicate execution while a healthy worker is still active.

## File Map

- Modify: `backend/src/modules/ai-mentor/ai-generation-queue.service.ts`
  Purpose: add deterministic BullMQ job ids, queue-removal cancellation, and explicit enqueue semantics.
- Modify: `backend/src/modules/ai-mentor/processors/ai-generation.processor.ts`
  Purpose: set worker concurrency, add execution timeout handling, and emit retry-aware observability fields.
- Modify: `backend/src/modules/ai-mentor/ai-proxy.service.ts`
  Purpose: provide a strict internal execution helper with explicit timeout and shared-secret enforcement assumptions.
- Modify: `backend/src/modules/ai-mentor/ai-mentor.controller.ts`
  Purpose: keep public contract stable while routing cancel/delete through the new queued-job semantics.
- Modify: `backend/src/modules/ai-mentor/ai-mentor.controller.spec.ts`
  Purpose: prove dedupe/cancel/status expectations at the backend boundary.
- Modify: `backend/src/modules/ai-mentor/ai-mentor.module.ts`
  Purpose: keep queue wiring and startup validation in one place.
- Modify: `ai-service/app/main.py`
  Purpose: keep internal execution route strict, reject invalid internal requests, and expose duplicate-run behavior clearly.
- Modify: `ai-service/app/config.py`
  Purpose: support fail-fast validation on missing shared secret in non-development execution.
- Modify: `ai-service/tests/test_lesson_plan_job_queueing.py`
  Purpose: prove internal token checks, duplicate-run protection, and public enqueue separation.
- Modify: `ai-service/tests/test_ai_job_runtime.py`
  Purpose: cover runtime metadata and retry/idempotency behavior.
- Optional verify-only touch: `next-frontend/src/services/__tests__/ai-service.test.ts`
  Purpose: confirm the public polling contract still tolerates long `pending` periods without shape changes.

## State Vocabulary Matrix

| BullMQ state | DB `ai_generation_jobs.status` | Frontend meaning |
|---|---|---|
| `waiting`, `delayed`, `prioritized` | `pending` | queued and waiting for worker capacity |
| `active` | `processing` | currently running in `ai-service` |
| `completed` | `completed` | result available |
| `failed` after retries exhausted | `failed` | terminal error, retry button allowed |
| removed before execution or cooperatively aborted | `cancelled` | cancelled by user |

Implementation rule: convert BullMQ state into DB state at ownership boundaries; never expose raw BullMQ states directly to clients.

## Cancellation Policy

- Queued job: remove the BullMQ job by deterministic job id and mark DB row `cancelled`.
- Running job: do not attempt hard kill in first slice; mark DB/runtime as cancellation requested only if cooperative checkpoints are available.
- UI copy must distinguish “cancelled before execution” from “already running and cannot be interrupted immediately”.

## Task 1: Add Queue Dedupe and Clear Cancellation Semantics

**Covers:** deterministic enqueue, queued-job cancellation, stable backend contract

**Files:**
- Modify: `backend/src/modules/ai-mentor/ai-generation-queue.service.ts`
- Modify: `backend/src/modules/ai-mentor/ai-mentor.controller.ts`
- Modify: `backend/src/modules/ai-mentor/ai-mentor.controller.spec.ts`

**Interfaces:**
- Consumes: lesson-plan `jobId` returned by the public enqueue route.
- Produces: `enqueueLessonPlanJob(jobId: string, userId: string): Promise<void>` with deterministic BullMQ job id.
- Produces: `cancelQueuedLessonPlanJob(jobId: string): Promise<boolean>` returning `true` only when the waiting/delayed BullMQ job was actually removed.

- [ ] **Step 1: Write the failing backend queue-service test for dedupe**

```ts
it('enqueues lesson-plan execution with deterministic BullMQ job id', async () => {
  await service.enqueueLessonPlanJob('job-123', 'teacher-1');

  expect(mockQueue.add).toHaveBeenCalledWith(
    'lesson-plan-generation',
    { jobId: 'job-123', requestedByUserId: 'teacher-1' },
    expect.objectContaining({ jobId: 'lesson-plan:job-123' }),
  );
});
```

- [ ] **Step 2: Write the failing backend queue-service test for queued cancellation**

```ts
it('removes waiting lesson-plan jobs before execution starts', async () => {
  const remove = jest.fn().mockResolvedValue(undefined);
  mockQueue.getJob.mockResolvedValue({
    getState: jest.fn().mockResolvedValue('waiting'),
    remove,
  });

  const result = await service.cancelQueuedLessonPlanJob('job-123');

  expect(mockQueue.getJob).toHaveBeenCalledWith('lesson-plan:job-123');
  expect(remove).toHaveBeenCalled();
  expect(result).toBe(true);
});
```

- [ ] **Step 3: Run the focused backend spec and verify failure**

Run from `backend/`: `npm run test -- ai-mentor.controller.spec.ts`
Expected: FAIL because deterministic dedupe and queue-removal cancellation are not implemented yet.

- [ ] **Step 4: Implement deterministic enqueue and queued cancellation**

```ts
// backend/src/modules/ai-mentor/ai-generation-queue.service.ts
async enqueueLessonPlanJob(jobId: string, userId: string): Promise<void> {
  await this.queue.add(
    'lesson-plan-generation',
    { jobId, requestedByUserId: userId },
    {
      jobId: `lesson-plan:${jobId}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    },
  );
}

async cancelQueuedLessonPlanJob(jobId: string): Promise<boolean> {
  const job = await this.queue.getJob(`lesson-plan:${jobId}`);
  if (!job) return false;
  const state = await job.getState();
  if (!['waiting', 'delayed', 'prioritized'].includes(state)) {
    return false;
  }
  await job.remove();
  return true;
}
```

- [ ] **Step 5: Make the controller distinguish queued cancellation from active cancellation**

```ts
// backend/src/modules/ai-mentor/ai-mentor.controller.ts
const removed = await this.aiGenerationQueueService.cancelQueuedLessonPlanJob(jobId);
if (removed) {
  return {
    success: true,
    message: 'Lesson plan generation cancelled before execution started',
    data: { jobId, status: 'cancelled' },
  };
}

return {
  success: true,
  message: 'Lesson plan job is already running and may finish before cancellation is observed',
  data: { jobId, status: 'processing' },
};
```

- [ ] **Step 6: Re-run backend tests**

Run from `backend/`: `npm run test -- ai-mentor.controller.spec.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/ai-mentor/ai-generation-queue.service.ts backend/src/modules/ai-mentor/ai-mentor.controller.ts backend/src/modules/ai-mentor/ai-mentor.controller.spec.ts
git commit -m "fix: add lesson plan queue dedupe and cancellation"
```

## Task 2: Cap Worker Concurrency and Add Explicit Execution Timeout

**Covers:** bounded local inference load, timeout-driven retry behavior, retry ownership

**Files:**
- Modify: `backend/src/modules/ai-mentor/processors/ai-generation.processor.ts`
- Modify: `backend/src/modules/ai-mentor/ai-proxy.service.ts`
- Modify: `backend/src/modules/ai-mentor/ai-mentor.module.ts`

**Interfaces:**
- Consumes: BullMQ lesson-plan jobs with deterministic job ids.
- Produces: worker execution with `concurrency: 2` and explicit timeout failure path.

- [ ] **Step 1: Write the failing processor test for timeout rejection**

```ts
it('rejects when the internal lesson-plan execution exceeds the worker timeout', async () => {
  jest.spyOn(proxy, 'runInternalLessonPlanJob').mockRejectedValue(new Error('AbortError'));

  await expect(
    processor.process({ name: 'lesson-plan-generation', data: { jobId: 'job-123' } } as any),
  ).rejects.toThrow('AbortError');
});
```

- [ ] **Step 2: Run the focused backend processor spec and verify failure**

Run from `backend/`: `npm run test -- ai-generation.processor.spec.ts`
Expected: FAIL because concurrency and timeout policy are not locked down yet.

- [ ] **Step 3: Cap worker concurrency and keep BullMQ as the only retry owner**

```ts
// backend/src/modules/ai-mentor/processors/ai-generation.processor.ts
@Processor('ai-teacher-generation', { concurrency: 2 })
export class AiGenerationProcessor extends WorkerHost {
  async process(job: Job<{ jobId: string }>): Promise<void> {
    if (job.name !== 'lesson-plan-generation') return;
    await this.proxy.runInternalLessonPlanJob(job.data.jobId);
  }
}
```

- [ ] **Step 4: Add explicit long-job timeout to internal execution helper**

```ts
// backend/src/modules/ai-mentor/ai-proxy.service.ts
async runInternalLessonPlanJob(jobId: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 300_000);

  try {
    const response = await fetch(
      `${this.baseUrl}/internal/teacher/lesson-plans/jobs/${jobId}/run`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.sharedSecret ? { 'X-Internal-Service-Token': this.sharedSecret } : {}),
        },
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json();
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 5: Re-run backend processor tests and build**

Run from `backend/`: `npm run test -- ai-generation.processor.spec.ts`
Expected: PASS.

Run from `backend/`: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/ai-mentor/processors/ai-generation.processor.ts backend/src/modules/ai-mentor/ai-proxy.service.ts backend/src/modules/ai-mentor/ai-mentor.module.ts
git commit -m "fix: cap lesson plan worker concurrency and timeout"
```

## Task 3: Enforce Strict Internal Auth and Fail-Fast Secret Validation

**Covers:** secret boundary enforcement, startup misconfiguration detection

**Files:**
- Modify: `ai-service/app/main.py`
- Modify: `ai-service/app/config.py`
- Modify: `backend/src/modules/ai-mentor/ai-mentor.module.ts`
- Modify: `ai-service/tests/test_lesson_plan_job_queueing.py`

**Interfaces:**
- Consumes: `AI_SERVICE_SHARED_SECRET` / `ai_service_shared_secret` configuration.
- Produces: startup-time failure in non-development environments when the secret is blank, and route-time `401` on mismatch.

- [ ] **Step 1: Write the failing AI test for strict internal token verification**

```python
def test_internal_lesson_plan_run_rejects_missing_internal_token(self):
    response = self.client.post(
        '/internal/teacher/lesson-plans/jobs/job-123/run',
        json=payload,
    )
    self.assertEqual(response.status_code, 401)
```

- [ ] **Step 2: Write the failing config test for production fail-fast behavior**

```python
def test_settings_reject_blank_shared_secret_outside_development(self):
    with self.assertRaises(ValueError):
        Settings(AI_RUNTIME_MODE='production', AI_SERVICE_SHARED_SECRET='')
```

- [ ] **Step 3: Run the focused AI tests and verify failure**

Run from `ai-service/`: `python scripts/run_tests.py`
Expected: FAIL because missing-secret startup validation is not enforced yet.

- [ ] **Step 4: Make the internal route fail closed**

```python
# ai-service/app/main.py
def require_internal_service(
    x_internal_service_token: str | None = Header(None),
) -> None:
    expected_secret = (settings.ai_service_shared_secret or '').strip()
    provided_secret = (x_internal_service_token or '').strip()
    if not expected_secret or provided_secret != expected_secret:
        raise HTTPException(401, 'Invalid internal service token')
```

- [ ] **Step 5: Add fail-fast validation for non-development runtime**

```python
# ai-service/app/config.py
@model_validator(mode='after')
def validate_internal_secret(self):
    runtime_mode = (self.ai_runtime_mode or '').strip().lower()
    if runtime_mode not in {'', 'development', 'dev'} and not (self.ai_service_shared_secret or '').strip():
        raise ValueError('AI_SERVICE_SHARED_SECRET must be set outside development runtime')
    return self
```

- [ ] **Step 6: Re-run AI tests**

Run from `ai-service/`: `python scripts/run_tests.py`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add ai-service/app/main.py ai-service/app/config.py ai-service/tests/test_lesson_plan_job_queueing.py backend/src/modules/ai-mentor/ai-mentor.module.ts
git commit -m "fix: enforce internal secret validation"
```

## Task 4: Align Status Mapping, Idempotency, and Observability

**Covers:** duplicate-run protection, shared status vocabulary, queue diagnostics

**Files:**
- Modify: `ai-service/app/main.py`
- Modify: `ai-service/tests/test_ai_job_runtime.py`
- Modify: `backend/src/modules/ai-mentor/processors/ai-generation.processor.ts`
- Optional verify-only touch: `next-frontend/src/services/__tests__/ai-service.test.ts`

**Interfaces:**
- Consumes: BullMQ states, `ai_generation_jobs.status`, runtime JSON patch fields.
- Produces: one canonical state mapping and runtime metadata that captures queue wait time, attempts, and execution duration.
- Produces: an orphaned-job retry override that allows retry re-entry only when `attempt > 1` and the prior `processing` runtime marker is stale.

- [ ] **Step 1: Write the failing AI test for duplicate-run protection**

```python
def test_internal_lesson_plan_run_rejects_already_processing_job(self):
    response = self.client.post(
        f'/internal/teacher/lesson-plans/jobs/{processing_job_id}/run',
        json=payload,
        headers={'X-Internal-Service-Token': 'test-secret'},
    )
    self.assertEqual(response.status_code, 409)


def test_internal_lesson_plan_run_allows_stale_processing_job_on_retry(self):
    response = self.client.post(
        f'/internal/teacher/lesson-plans/jobs/{stale_processing_job_id}/run',
        json={'bullmqJobId': 'bull-1', 'attempt': 2},
        headers={'X-Internal-Service-Token': 'test-secret'},
    )
    self.assertIn(response.status_code, (200, 202))
```

- [ ] **Step 2: Run the focused AI runtime tests and verify failure**

Run from `ai-service/`: `python scripts/run_tests.py`
Expected: FAIL because internal duplicate-run behavior and status mapping are not finalized yet.

- [ ] **Step 3: Implement idempotent internal execution guards**

```python
# ai-service/app/main.py
if job['status'] == 'completed':
    return {'success': True, 'message': 'Job already completed', 'data': {'jobId': job_id, 'status': 'completed'}}

runtime = ((job.get('source_filters') or {}).get('runtime') or {}) if isinstance(job.get('source_filters'), dict) else {}
attempt = int((meta or {}).get('attempt', 1))
worker_started_at = parse_runtime_timestamp(runtime.get('workerStartedAt'))
is_stale_processing = bool(
    worker_started_at
    and datetime.now(timezone.utc) - worker_started_at > timedelta(minutes=6)
)

if job['status'] == 'processing':
    if attempt <= 1:
        raise HTTPException(409, 'Job is already running')
    if not is_stale_processing:
        raise HTTPException(409, 'Job is already running')
```

- [ ] **Step 4: Add a tiny runtime timestamp parser for stale-processing detection**

```python
# ai-service/app/main.py
def parse_runtime_timestamp(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)
```

- [ ] **Step 5: Record observability fields in worker/runtime metadata**

```ts
// backend/src/modules/ai-mentor/processors/ai-generation.processor.ts
const workerStartedAt = Date.now();
await this.proxy.runInternalLessonPlanJob(job.data.jobId);
this.logger.log(
  JSON.stringify({
    queue: 'ai-teacher-generation',
    bullmqJobId: job.id,
    lessonPlanJobId: job.data.jobId,
    attempt: job.attemptsMade + 1,
    queueWaitMs: workerStartedAt - job.timestamp,
    executionStartedAt: new Date(workerStartedAt).toISOString(),
  }),
);
```

Implementation note: keep this payload metadata-only; do not log prompt text, lesson bodies, student identifiers, or user emails.

- [ ] **Step 6: Re-run targeted verification**

Run from `ai-service/`: `python scripts/run_tests.py`
Expected: PASS.

Run from `backend/`: `npm run test -- ai-generation.processor.spec.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add ai-service/app/main.py ai-service/tests/test_ai_job_runtime.py backend/src/modules/ai-mentor/processors/ai-generation.processor.ts
git commit -m "fix: align lesson plan job states and observability"
```

## Task 5: Verify Restart Recovery and Long-Pending UX Assumptions

**Covers:** restart durability, real queue behavior under load, frontend tolerance for long `pending`

**Files:**
- Modify: `next-frontend/src/services/__tests__/ai-service.test.ts` only if contract assertions need updating
- Modify: `ai-service/tests/test_lesson_plan_job_queueing.py` if a restart-oriented case is added

**Interfaces:**
- Consumes: existing frontend polling contract and queued lesson-plan execution flow.
- Produces: evidence that pending queues are treated as normal and service restarts lead to retry behavior instead of lost work.

- [ ] **Step 1: Add a frontend contract test that preserves long-pending compatibility**

```ts
it('keeps pending lesson plan jobs valid for polling consumers', async () => {
  mockedApi.get.mockResolvedValue({
    data: {
      success: true,
      message: 'AI generation job status',
      data: { jobId: 'job-123', status: 'pending', progressPercent: 5, statusMessage: 'Queued' },
    },
  });

  const result = await aiService.getTeacherJobStatus('job-123');
  expect(result.data.status).toBe('pending');
});
```

- [ ] **Step 2: Run narrow automated verification**

Run from `backend/`: `npm run build`
Expected: PASS.

Run from `ai-service/`: `python scripts/run_tests.py`
Expected: PASS.

Run from `next-frontend/`: `npm run test -- src/services/__tests__/ai-service.test.ts`
Expected: PASS.

- [ ] **Step 3: Run the restart recovery smoke**

Run from `backend/`: `npm run start:dev`
Expected: backend boots with BullMQ queue registration and worker active.

Run from `ai-service/`: `uvicorn app.main:app --reload --port 8000`
Expected: `ai-service` boots and internal execution route is available.

Manual smoke:
1. `POST /ai/teacher/lesson-plans/jobs` and store `jobId`.
2. Confirm a BullMQ job named `lesson-plan-generation` appears with id `lesson-plan:{jobId}`.
3. Restart `ai-service` while one lesson-plan job is mid-execution.
4. Confirm the backend worker sees the failure, BullMQ increments attempt count, and the job retries after backoff.
5. Confirm the retry is not blocked by a stale DB `processing` row from the crashed execution.
6. Poll `GET /ai/teacher/jobs/{jobId}` until it reaches `completed` or `failed`.
7. Confirm the job is not lost silently after the restart.

- [ ] **Step 4: Commit**

```bash
git add next-frontend/src/services/__tests__/ai-service.test.ts ai-service/tests/test_lesson_plan_job_queueing.py
git commit -m "test: verify queued lesson plan restart recovery"
```

## Out of Scope for This V2

- Full quiz-generation migration in the same change set.
- Student assessment submission/grading queue redesign.
- Force-kill semantics for already-running Ollama inference.
- Queue position UI or broader frontend UX redesign beyond preserving existing polling compatibility.

## Recommended Execution Order

1. Task 1 first so dedupe and queued cancellation semantics are fixed before more load hits the worker.
2. Task 2 and Task 3 next so execution timeout and secret enforcement are locked before restart/load testing.
3. Task 4 after the queue boundary is stable to finalize state vocabulary and duplicate-run handling.
4. Task 5 last as the proof that this queue architecture actually survives service interruptions and long pending windows.

## Self-Review

- This V2 reflects the new architectural findings instead of only the initial migration work.
- The top four priorities are explicit plan items: dedupe, cancellation semantics, status alignment, and fail-fast secret validation.
- Worker concurrency, timeout policy, and strict internal auth are treated as required implementation behavior, not optional polish.
- Verification includes the missing restart-recovery smoke that matters for a real queued architecture.
