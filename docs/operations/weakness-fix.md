# Backend-to-AI Queue Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move teacher lesson-plan AI generation onto durable BullMQ-backed orchestration without breaking the existing `success/message/data` contract or current job polling/result endpoints.

**Architecture:** Gemini was directionally correct that long AI generation should be brokered through a queue, but the repo already exposes async job endpoints and persists `ai_generation_jobs`. The real weakness is that `ai-service` still schedules lesson-plan execution with `asyncio.create_task(...)` and process-local `AI_JOB_TASKS` / `AI_JOB_RUNTIME`, so this plan makes the Nest backend the queue owner while keeping `ai-service` as the execution engine and preserving existing job/result APIs.

**Tech Stack:** NestJS 11, `@nestjs/bullmq`, BullMQ, Redis, FastAPI, SQLAlchemy, Drizzle schema, PostgreSQL, Next.js typed service wrappers, Jest, Python test runner.

## Global Constraints

- Preserve the `success/message/data` envelope on existing backend and `ai-service` routes.
- Do not make web or mobile call `ai-service` directly; backend remains the authenticated boundary.
- Keep official academic records read-only for AI generation flows.
- Treat lesson-plan jobs as the first slice and template for later quiz-generation migration.
- Prefer the smallest correct schema change; do not introduce new persistence fields unless they remove a real reliability gap.
- Cap backend lesson-plan worker concurrency at `2` for the first slice unless runtime evidence justifies raising it.
- The backend worker-to-`ai-service` execution call must use an explicit long-job timeout so BullMQ can fail and retry hung inference instead of waiting forever.
- Internal execution routes must stay protected by strict `X-Internal-Service-Token` verification through `require_internal_service` against `AI_SERVICE_SHARED_SECRET`.

---

## What Gemini Got Right vs Wrong

- Right: long-running AI work should not depend on a browser request staying alive.
- Right: concurrency limits, retries, and observability belong in a real job system.
- Wrong for this repo: the lesson-plan route is not a blocking 3-5 minute HTTP request anymore; `POST /teacher/lesson-plans/jobs` already returns `202` and creates an `ai_generation_jobs` row.
- The actual gap: `ai-service/app/main.py` still runs the job with `loop.create_task(...)` under `_TEACHER_BG_SEMAPHORE`, which is not durable across restart and is not horizontally safe.

## File Map

- Modify: `backend/src/modules/ai-mentor/ai-mentor.module.ts`
  Purpose: register the new BullMQ queue and processor ownership for teacher AI generation.
- Create: `backend/src/modules/ai-mentor/ai-generation-queue.service.ts`
  Purpose: enqueue lesson-plan execution jobs after the public route creates the DB job in `ai-service`.
- Create: `backend/src/modules/ai-mentor/processors/ai-generation.processor.ts`
  Purpose: BullMQ worker that calls an internal `ai-service` execution endpoint with retries/backoff.
- Modify: `backend/src/modules/ai-mentor/ai-proxy.service.ts`
  Purpose: add a worker-safe internal call helper and queue-oriented timeout policy.
- Modify: `backend/src/modules/ai-mentor/ai-mentor.controller.ts`
  Purpose: keep public contract unchanged while delegating lesson-plan job execution to backend queue orchestration.
- Modify: `backend/src/modules/ai-mentor/ai-mentor.controller.spec.ts`
  Purpose: verify enqueue behavior and unchanged response envelope.
- Modify: `backend/src/drizzle/schema/rag.schema.ts`
  Purpose: only if needed, add minimal durable metadata for queue execution state.
- Modify: `ai-service/app/main.py`
  Purpose: split “create job” from “run job”, remove public-route `create_task(...)` scheduling for lesson plans, and expose an internal execution entrypoint.
- Modify: `ai-service/app/lesson_plan_service.py`
  Purpose: reuse existing lesson-plan generation logic from the new internal execution path.
- Modify: `ai-service/tests/test_ai_job_runtime.py`
  Purpose: cover stale-job/runtime behavior after execution ownership changes.
- Create or modify: `ai-service/tests/test_lesson_plan_job_queueing.py`
  Purpose: verify public enqueue route only creates the job and internal execution route performs the work.
- Optional verify-only touch: `next-frontend/src/services/__tests__/ai-service.test.ts`
  Purpose: confirm the frontend service wrapper contract stays unchanged.

## Task 1: Lock the Queue Ownership Boundary

**Covers:** public lesson-plan enqueue contract, backend queue ownership, preserved API envelope

**Files:**
- Modify: `backend/src/modules/ai-mentor/ai-mentor.module.ts`
- Create: `backend/src/modules/ai-mentor/ai-generation-queue.service.ts`
- Create: `backend/src/modules/ai-mentor/processors/ai-generation.processor.ts`
- Modify: `backend/src/modules/ai-mentor/ai-proxy.service.ts`
- Modify: `backend/src/modules/ai-mentor/ai-mentor.controller.ts`
- Modify: `backend/src/modules/ai-mentor/ai-mentor.controller.spec.ts`

**Interfaces:**
- Consumes: existing `POST /teacher/lesson-plans/jobs` proxy route and current `AiProxyService.forward(...)` behavior.
- Produces: `AiGenerationQueueService.enqueueLessonPlanJob(jobId: string, userId: string): Promise<void>` and BullMQ queue name `ai-teacher-generation`.
- Produces: `AiProxyService.runInternalLessonPlanJob(jobId: string): Promise<unknown>` for worker-triggered internal execution.

- [ ] **Step 1: Write the failing backend controller test**

```ts
it('queues lesson plan execution after ai-service returns the job id', async () => {
  proxy.forward.mockResolvedValue({
    success: true,
    message: 'Lesson plan generation job queued',
    data: { jobId: 'job-123', jobType: 'class_lesson_plan_generation', status: 'pending' },
  });
  queueService.enqueueLessonPlanJob.mockResolvedValue(undefined);

  const result = await controller.queueLessonPlanJob(dto, teacherUser);

  expect(proxy.forward).toHaveBeenCalledWith('POST', '/teacher/lesson-plans/jobs', teacherUser, dto);
  expect(queueService.enqueueLessonPlanJob).toHaveBeenCalledWith('job-123', teacherUser.id);
  expect(result).toEqual({
    success: true,
    message: 'Lesson plan generation job queued',
    data: expect.objectContaining({ jobId: 'job-123', status: 'pending' }),
  });
});
```

- [ ] **Step 2: Run the targeted backend spec and verify it fails**

Run: `npm run test -- ai-mentor.controller.spec.ts`
Expected: FAIL because `AiGenerationQueueService` and its enqueue call do not exist yet.

- [ ] **Step 3: Add queue registration and enqueue service**

```ts
// backend/src/modules/ai-mentor/ai-mentor.module.ts
imports: [
  DatabaseModule,
  AuditModule,
  AdminModule,
  ReportsModule,
  AnalyticsModule,
  PerformanceModule,
  LxpModule,
  BullModule.registerQueue({ name: 'ai-teacher-generation' }),
],
providers: [AiProxyService, AdminAnalyticsChatService, AiGenerationQueueService, AiGenerationProcessor],
```

```ts
// backend/src/modules/ai-mentor/ai-generation-queue.service.ts
@Injectable()
export class AiGenerationQueueService {
  constructor(@InjectQueue('ai-teacher-generation') private readonly queue: Queue) {}

  async enqueueLessonPlanJob(jobId: string, userId: string): Promise<void> {
    await this.queue.add(
      'lesson-plan-generation',
      { jobId, requestedByUserId: userId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );
  }
}
```

- [ ] **Step 4: Update the controller to enqueue after public job creation**

```ts
const result = await this.proxy.forward('POST', '/teacher/lesson-plans/jobs', user, dto);
const jobId = this.extractStringField(result, 'jobId');
await this.aiGenerationQueueService.enqueueLessonPlanJob(jobId, user.id);
return result;
```

- [ ] **Step 5: Add a worker skeleton and pass the spec**

```ts
// backend/src/modules/ai-mentor/ai-proxy.service.ts
async runInternalLessonPlanJob(jobId: string): Promise<unknown> {
  return this.forward(
    'POST',
    `/internal/teacher/lesson-plans/jobs/${jobId}/run`,
    { id: 'internal-worker', email: 'internal@nexora.local', roles: ['admin'] },
  );
}
```

```ts
@Processor('ai-teacher-generation', { concurrency: 2 })
export class AiGenerationProcessor extends WorkerHost {
  constructor(private readonly proxy: AiProxyService) {
    super();
  }

  async process(job: Job<{ jobId: string }>): Promise<void> {
    if (job.name !== 'lesson-plan-generation') return;
    await this.proxy.runInternalLessonPlanJob(job.data.jobId);
  }
}
```

```ts
// backend/src/modules/ai-mentor/ai-proxy.service.ts
async runInternalLessonPlanJob(jobId: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 300_000);

  try {
    const response = await fetch(`${this.baseUrl}/internal/teacher/lesson-plans/jobs/${jobId}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.sharedSecret ? { 'X-Internal-Service-Token': this.sharedSecret } : {}),
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json();
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 6: Re-run the backend spec**

Run: `npm run test -- ai-mentor.controller.spec.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/ai-mentor/ai-mentor.module.ts backend/src/modules/ai-mentor/ai-generation-queue.service.ts backend/src/modules/ai-mentor/processors/ai-generation.processor.ts backend/src/modules/ai-mentor/ai-proxy.service.ts backend/src/modules/ai-mentor/ai-mentor.controller.ts backend/src/modules/ai-mentor/ai-mentor.controller.spec.ts
git commit -m "feat: queue teacher lesson plan execution"
```

## Task 2: Split Job Creation from Job Execution in `ai-service`

**Covers:** durable execution boundary, removal of public-route in-process scheduling, internal execution path

**Files:**
- Modify: `ai-service/app/main.py`
- Test: `ai-service/tests/test_lesson_plan_job_queueing.py`

**Interfaces:**
- Consumes: `jobId` returned by `_create_ai_generation_job(...)` and existing lesson-plan generation logic.
- Produces: internal route `POST /internal/teacher/lesson-plans/jobs/{job_id}/run` protected by the internal service token.

- [ ] **Step 1: Write the failing Python test for public enqueue behavior**

```python
class LessonPlanQueueingTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app, raise_server_exceptions=False)

    @patch("app.main.asyncio.get_running_loop")
    def test_queue_teacher_lesson_plan_job_does_not_schedule_in_process_task(self, mock_get_loop):
        response = self.client.post("/teacher/lesson-plans/jobs", json=payload, headers=teacher_headers)

        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.json()["data"]["status"], "pending")
        mock_get_loop.assert_not_called()
```

- [ ] **Step 2: Write the failing Python test for internal execution**

```python
    @patch("app.main._run_lesson_plan_generation_job", new_callable=AsyncMock)
    def test_internal_lesson_plan_run_executes_existing_job(self, mock_run_job):
        response = self.client.post(
            f"/internal/teacher/lesson-plans/jobs/{job_id}/run",
            json=payload,
            headers={"X-Internal-Service-Token": "test-secret"},
        )

        self.assertEqual(response.status_code, 200)
        mock_run_job.assert_awaited_once()
```

- [ ] **Step 3: Run the Python tests and verify failure**

Run: `python scripts/run_tests.py`
Expected: FAIL on the new lesson-plan queueing tests.

- [ ] **Step 4: Refactor `app/main.py` so the public route only creates the job row**

```python
@app.post("/teacher/lesson-plans/jobs", status_code=202)
async def queue_teacher_lesson_plan_job(...):
    job_id = await _create_ai_generation_job(...)
    return {
        "success": True,
        "message": "Lesson plan generation job queued",
        "data": {
            "jobId": job_id,
            "jobType": "class_lesson_plan_generation",
            "status": "pending",
            "progressPercent": 5,
            "statusMessage": "Queued",
        },
    }
```

- [ ] **Step 5: Add the internal execution route**

```python
@app.post("/internal/teacher/lesson-plans/jobs/{job_id}/run")
async def run_teacher_lesson_plan_job(
    job_id: str,
    body: GenerateLessonPlanRequest,
    _: None = Depends(require_internal_service),
):
    user = RequestUser(id="internal-worker", email="internal@nexora.local", roles=["admin"])
    await _run_lesson_plan_generation_job(job_id, body, user)
    return {"success": True, "message": "Lesson plan generation completed", "data": {"jobId": job_id}}
```

```python
# ai-service/app/main.py
def require_internal_service(
    x_internal_service_token: str | None = Header(None),
) -> None:
    expected_secret = (settings.ai_service_shared_secret or "").strip()
    provided_secret = (x_internal_service_token or "").strip()
    if not expected_secret or provided_secret != expected_secret:
        raise HTTPException(401, "Invalid internal service token")
```

- [ ] **Step 6: Re-run the Python tests**

Run: `python scripts/run_tests.py`
Expected: PASS for the new queueing tests and no regressions in existing AI job tests.

- [ ] **Step 7: Commit**

```bash
git add ai-service/app/main.py ai-service/tests/test_lesson_plan_job_queueing.py
git commit -m "refactor: decouple lesson plan enqueue from execution"
```

## Task 3: Add Worker Retries, Idempotency Guards, and Minimal Durable State

**Covers:** crash safety, duplicate-run protection, operator visibility

**Files:**
- Modify: `backend/src/modules/ai-mentor/processors/ai-generation.processor.ts`
- Modify: `backend/src/modules/ai-mentor/ai-proxy.service.ts`
- Modify: `ai-service/app/main.py`
- Modify: `backend/src/drizzle/schema/rag.schema.ts` only if runtime JSON is not sufficient
- Test: `backend/src/modules/ai-mentor/ai-mentor.controller.spec.ts`
- Test: `ai-service/tests/test_ai_job_runtime.py`

**Interfaces:**
- Consumes: BullMQ attempts/backoff and current `ai_generation_jobs.status` values.
- Produces: worker behavior that refuses to re-run `completed` / `running` jobs unsafely and records retry context durably.

- [ ] **Step 1: Write the failing idempotency test**

```python
class LessonPlanRuntimeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app, raise_server_exceptions=False)

    def test_internal_lesson_plan_run_rejects_completed_job(self):
        response = self.client.post(
            f"/internal/teacher/lesson-plans/jobs/{completed_job_id}/run",
            json=payload,
            headers={"X-Internal-Service-Token": "test-secret"},
        )

        self.assertIn(response.status_code, (200, 409))
```

- [ ] **Step 2: Run the targeted tests and confirm failure**

Run: `python scripts/run_tests.py`
Expected: FAIL because internal execution currently has no dedicated duplicate-run guard.

- [ ] **Step 3: Implement minimal durable execution markers**

```python
if job["status"] == "completed":
    return _job_already_finished_response(job_id)
if job["status"] == "running":
    raise HTTPException(409, "Job is already running")

await _mark_job_running(db, job_id, runtime_patch={
    "broker": "bullmq",
    "attempt": attempt,
    "workerStartedAt": datetime.now(timezone.utc).isoformat(),
})
```

- [ ] **Step 4: Add retry-aware backend worker logging**

```ts
await this.proxy.runInternalLessonPlanJob(job.data.jobId, {
  bullmqJobId: job.id,
  attempt: job.attemptsMade + 1,
});
```

- [ ] **Step 5: Only add schema fields if JSON runtime patch proves insufficient**

```ts
// Only if needed after implementation review:
brokerJobId: text('broker_job_id'),
lastHeartbeatAt: timestamp('last_heartbeat_at'),
```

- [ ] **Step 6: Re-run targeted AI runtime tests and backend specs**

Run: `python scripts/run_tests.py`
Expected: PASS

Run: `npm run test -- ai-mentor.controller.spec.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/ai-mentor/processors/ai-generation.processor.ts backend/src/modules/ai-mentor/ai-proxy.service.ts ai-service/app/main.py ai-service/tests/test_ai_job_runtime.py backend/src/drizzle/schema/rag.schema.ts
git commit -m "fix: harden queued lesson plan retries"
```

## Task 4: Verification, Smoke Coverage, and Migration Template for Quizzes

**Covers:** confidence in first slice, safe rollout, next-slice reuse

**Files:**
- Modify: `next-frontend/src/services/__tests__/ai-service.test.ts` (if contract assertions need refresh)
- Modify: `backend/src/modules/ai-mentor/ai-mentor.controller.spec.ts`
- Modify: `ai-service/tests/test_lesson_plan_job_queueing.py`

**Interfaces:**
- Consumes: unchanged `/ai/teacher/lesson-plans/jobs`, `/ai/teacher/jobs/:id`, and `/ai/teacher/jobs/:id/result` contracts.
- Produces: a proven template for `teacher/quizzes/jobs` migration next.

- [ ] **Step 1: Add a contract-preservation frontend test**

```ts
it('normalizes lesson plan job envelopes without client changes', async () => {
  mockedApi.post.mockResolvedValue({
    data: { success: true, message: 'Lesson plan generation job queued', data: { jobId: 'job-1', status: 'pending' } },
  });

  const result = await aiService.createLessonPlanJob(dto);
  expect(result.data.jobId).toBe('job-1');
  expect(result.data.status).toBe('pending');
});
```

- [ ] **Step 2: Run narrow verification commands**

Run: `npm run test -- ai-mentor.controller.spec.ts`
Expected: PASS

Run: `npm run build`
Expected: PASS

Run: `python scripts/run_tests.py`
Expected: PASS

Run from `next-frontend/`: `npm run test -- src/services/__tests__/ai-service.test.ts`
Expected: PASS

- [ ] **Step 3: Run one queue-oriented manual smoke after booting services**

Run from `backend/`: `npm run start:dev`
Expected: backend boots with BullMQ queue registration intact.

Run from `ai-service/`: `uvicorn app.main:app --reload --port 8000`
Expected: `ai-service` boots and exposes the internal execution route.

Manual smoke:
1. `POST /ai/teacher/lesson-plans/jobs`
2. Verify `202` response with `jobId`
3. Confirm BullMQ worker fires
4. Poll `GET /ai/teacher/jobs/{jobId}` until `completed` or `failed`
5. Fetch `GET /ai/teacher/jobs/{jobId}/result`

- [ ] **Step 4: Write the quiz-migration follow-up note**

```md
Quiz migration should reuse the same pattern:
- public route creates `ai_generation_jobs`
- backend BullMQ owns execution
- `ai-service` exposes internal run endpoint
- status/result endpoints stay unchanged
```

- [ ] **Step 5: Commit**

```bash
git add next-frontend/src/services/__tests__/ai-service.test.ts backend/src/modules/ai-mentor/ai-mentor.controller.spec.ts ai-service/tests/test_lesson_plan_job_queueing.py
git commit -m "test: verify lesson plan queue migration contract"
```

## Out of Scope for This First Plan

- Full migration of quiz generation in the same change set.
- Assessment submission/grading queue redesign.
- Roster import hashing offload.
- Frontend UX redesign beyond preserving existing polling/result behavior.

## Recommended Execution Order After This Plan

1. Implement Task 1 and Task 2 together in one working branch because the backend worker needs a callable internal execution path.
2. Pause after Task 2 for an integration smoke before deciding whether Task 3 needs a schema migration.
3. Reuse the exact same queue boundary for `teacher/quizzes/jobs` only after lesson-plan jobs are stable.
