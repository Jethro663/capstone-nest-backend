# AI and BullMQ Resilience Hardening Walkthrough

Date: 2026-07-14
Scope: `backend/`, `ai-service/`, BullMQ/Redis, PostgreSQL/pgvector, and `load-tests/`
Skills: `queue-ai-pipeline-auditor` and `ai-service-subagent-stress-tester`

## Outcome

The sweep audited all seven BullMQ processor classes (covering 13 accepted job
names) and all 61 FastAPI route definitions, grouped by execution contract.
Twenty-two reproduced defects were fixed with regression coverage. Three
architecture-level risks remain
explicitly deferred because they require schema, deployment, or capacity
decisions rather than a bounded code fix.

The final deterministic gates are green:

- AI service: **169/169 tests passed**.
- Backend: **91 suites and 1,063/1,063 tests passed**.
- Resilience smoke: **138 AI + 151 backend tests passed**.
- Backend build, migration integrity, and source-clean checks passed.
- Backend lint completed with **0 errors** and 2,204 existing baseline warnings.
- Live isolated BullMQ verification executed the active request and its trailing
  replacement in order: `[1, 2]`.
- Independent review found eight blocking correctness/security defects across
  two passes. Every blocker received a failing-first regression and fix; the
  final read-only re-review returned a non-blocking approval.

Generated stress artifacts:

- [Stress audit](./ai-service-stress-audit-2026-07-14.md)
- [Stress remediation plan](./ai-service-stress-fix-plan-2026-07-14.md)
- [Normalized stress evidence](./ai-service-stress-data-2026-07-14.json)

## System boundary verified

```text
web/mobile
    |
    v
NestJS auth + RBAC -- shared secret --> FastAPI user-context routes
    |
    +--> durable DB job --> BullMQ --> NestJS worker -- shared secret --> FastAPI internal runner
                                      |                                  |
                                      |                                  +--> Ollama/cloud/embedding
                                      +--> retry + exponential backoff

FastAPI -- shared secret --> NestJS internal upload materialization
```

The backend remains the public auth, RBAC, durable job, and official academic
state owner. The AI service remains an assistive execution engine. No frontend
or mobile direct-to-AI path was introduced.

## Evidence model

Claims in this walkthrough use four evidence grades:

- **Direct execution:** exercised against live local Redis, PostgreSQL, or
  bidirectional HTTP service boundaries.
- **Automated test:** deterministically failure-injected in Jest or unittest.
- **Static verification:** traced through producer, worker, proxy, route, and
  persistence code.
- **Unverified at production scale:** requires representative staging hardware,
  model weights, documents, or concurrency.

## BullMQ processor audit

Global BullMQ defaults are three attempts with exponential backoff starting at
two seconds. AI, RAG, library, and assessment-notification producers explicitly
use three attempts with a five-second exponential base. Every processor now
rejects unsupported job names with `UnrecoverableError`, preventing false
success and pointless retries of malformed queue contracts.

| Queue / processor | Idempotency and duplicate safety | Timeout and retry behavior | Degraded or failure behavior | Result |
|---|---|---|---|---|
| `ai-teacher-generation` | Stable colon-free IDs; persisted lease claims; same-job retry supersession; fenced output/state writes; job-type and terminal guards | 3 attempts, exponential 5s; internal deadline 900s; crash reclaim after 960s | BullMQ is the sole durable retry owner; committed output resumes without another model call; compensated jobs stay terminal | Hardened |
| `rag-indexing` | Active-only per-class dedup retains one trailing latest request | 3 attempts, exponential 5s; abortable indexing HTTP deadline, default 300s | Timeout/error rethrows; previous class chunks remain until transaction replacement | Hardened |
| `library-indexing` | Active-only per-file dedup retains one trailing latest request | 3 attempts, exponential 5s; abortable indexing HTTP deadline, default 300s | File marked failed; old chunks survive embedding failure; retry rethrows | Hardened |
| `announcements` | Notification persistence uses bulk deduplication by recipient/reference | 3 attempts, exponential 2s | Inactive classes/no recipients are safe no-ops; DB failure retries | Verified; outbox deferred |
| `notifications` | Stable colon-free assignment/reminder IDs; durable notification deduplication | 3 attempts, exponential 5s | Inactive class and already-submitted recipients are safe no-ops | Hardened |
| `performance-recompute` | Assessment ID includes student; class ID now includes a stable hash of the sorted unique student subset | Global 3 attempts, exponential 2s | Recompute errors retry; different subsets no longer suppress one another | Hardened |
| `discussion-board` | Durable notification deduplication makes retries safe | 3 attempts, exponential 2s | No recipients are a safe no-op; DB failure retries | Verified; outbox deferred |

### Live deduplication proof

The original deterministic RAG job ID was reproduced against real Redis: a
completed job retained by BullMQ caused a later add to return the old job and
discard the new payload. The replacement uses BullMQ deduplication without a
custom retained job ID:

```text
deduplication: { id: resource-key, keepLastIfActive: true }
```

An isolated live worker then held version 1 active, accepted version 2 with the
same deduplication key, released version 1, and observed worker execution order
`[1, 2]`. The temporary queue was obliterated after the probe.

## FastAPI endpoint-family audit

The 61 route definitions were audited as 11 contract families because routes in
each family share auth dependencies, proxy deadlines, model clients, and
persistence helpers.

| Route family | Routes covered | Idempotency / concurrency | Timeout / degradation | Result |
|---|---:|---|---|---|
| Health and observability | 4 | Read-only | Readiness reports dependency state; no durable mutation | Verified |
| Chat, admin chat, mentor | 3 | Interaction logs are append-only; interactive calls are not blindly retried | 70s backend deadline, circuit breaker, 503/504 normalization, configured cloud/model fallback | Verified |
| JA practice, ask, review | 6 | Read-oriented bootstrap; generated sessions are durable by existing service contract | Grounded JA Ask now returns `degraded: true` with citations on model timeout | Hardened |
| Student tutor | 5 | Per-user/session PostgreSQL transaction try-lock serializes state-changing turns or returns 409 | Tutor start 150s; follow-up 70s; grounded fallback on model timeout | Hardened |
| Retrieval and index status | 3 | Read-only; retrieval variants use one embedding batch and serial DB work | 20s aggregate budget; partial variant results survive; total failure is logged | Hardened |
| Public/internal indexing | 6 | Queue dedup plus transaction-safe replacement; current-model-only freshness | Worker HTTP abort deadline; provider failure preserves the prior index and rethrows | Hardened |
| Extraction create/run/review/apply | 13 | Persisted lease claim; fenced progress/final writes; completed/applied/cancelled guards | 900s worker envelope; malformed IDs/attempts are rejected; durable cancellation cannot be overwritten | Hardened |
| Teacher durable AI jobs | 16 | Persisted lease claims; fenced output/state writes; committed output resumes on redelivery | Tiered public/internal deadlines; failures rethrow for BullMQ; pending-only enqueue compensation returns 503 | Hardened |
| History and session reads | 3 | Read-only | Uses normal proxy deadline and circuit breaker | Verified |
| Demo/internal diagnostics | 1 | No official-state mutation | Shared-secret protected | Verified |
| Public fallback generation helpers | 1 | Existing draft persistence/apply guards retained | Public quiz deadline 360s; helper errors remain explicit | Verified |

### Durable worker lease and fenced writes

Teacher generation and extraction runners previously performed a read followed
by a write. Two workers could both observe `pending` and both start expensive
work. An initial atomic-claim fix still allowed a second defect: a lease longer
than the 15-minute HTTP deadline made the 5s/10s BullMQ retries exhaust on 409,
while a shorter unfenced lease would permit overlapping commits. The final
contract persists a unique `workerLeaseId`, lets only a newer attempt of the
same `bullmqJobId` atomically supersede its prior lease, retains a 16-minute
crash-reclaim threshold, and checks the lease on every state/output write:

```text
pending/failed -> processing          one worker lease only
same BullMQ job + newer attempt       immediate fenced supersession
different orphaned processing job    retry only after 16-minute crash lease
completed/approved/applied/cancelled  terminal, no model execution
claim or lease lost                   HTTP 409 / superseded execution
malformed UUID                        HTTP 422
malformed attempt                     HTTP 400
```

Concurrent tests force two calls through the pending path and assert exactly one
runner invocation. Lease tests then reclaim the row and prove that the stale
worker cannot commit. Startup recovery and polling are read-only with respect to
execution state, so BullMQ remains the sole retry owner.

Generation output and final post-processing are intentionally separated. The
progress write commits before the final `FOR UPDATE`, then the cancellation/lease
fence remains held through output insert and commit. Durable HTTP execution does
not retry that plain insert internally. If its commit result is ambiguous, or a
later reindex/runtime write fails, BullMQ redelivery first loads committed output
and resumes post-processing instead of invoking the model a second time.

## Shared-secret boundary verification

The boundary is fail-closed in all directions:

1. Backend user-context proxy calls require `AI_SERVICE_SHARED_SECRET` locally
   before any fetch. A missing configuration returns 503 and sends no request.
2. FastAPI `get_current_user` requires a configured matching token even in
   development/test mode. User ID/email/roles headers alone are insufficient.
3. FastAPI internal worker dependencies require the same token.
4. RAG and library workers reject a blank token locally.
5. FastAPI uses constant-time `hmac.compare_digest` for the token comparison.
6. NestJS internal upload reads reject missing, wrong, and unconfigured tokens
   before file lookup.
7. The authenticated upload fetch disables automatic redirects. A validated
   HTTP(S) signed-storage redirect is fetched in a second request without
   `X-Internal-Service-Token`, so the backend secret never crosses origin.

Live local probes, without printing the secret:

| Direction | Missing | Wrong | Matching token + nonexistent resource |
|---|---:|---:|---:|
| backend -> AI internal extraction audit | 401 | 401 | 404 |
| AI -> backend internal upload read | 403 | 403 | 404 |

The matching-token 404 is important: it proves authentication succeeded and the
request reached resource lookup.

A captured cross-origin HTTPX regression additionally proves that the storage
request contains no internal token; relative redirects and non-HTTP(S) schemes
are covered as separate edge cases.

## Timeout and retry envelope

| Work type | Backend deadline | Retry owner | Behavior on exhaustion |
|---|---:|---|---|
| chat / mentor / tutor follow-up | 70s | caller may retry; circuit breaker protects dependency | Clear 504; tutor/JA use grounded fallback where implemented |
| tutor start | 150s | caller may retry | Clear 504 |
| extraction request path | 300s | interactive caller | Clear 504 |
| public quiz generation | 360s | interactive caller | Clear 504 |
| internal lesson/quiz/intervention/extraction | 900s | BullMQ, 3 attempts, exponential 5s | Durable failed state and rethrow |
| RAG/library index HTTP | configurable `AI_SERVICE_TIMEOUT_INDEXING_MS`, default 300s | BullMQ, 3 attempts, exponential 5s | Abort, normalized timeout, retry |
| retrieval query variants | 20s aggregate | AI service degrades partial variants | Partial evidence returned; total failure logged |

Backend timers remain active through `response.text()` or `response.json()`;
delayed response bodies cannot escape the deadline after headers arrive. The
new values are documented in `backend/.env.example`, and the retrieval aggregate
budget is documented in `ai-service/.env.example`. Deployments must set
timeouts above their measured model p99 while still staying below infrastructure
request and shutdown limits.

## Document extraction edge cases

Verified by automated tests:

- duplicate pending workers: one claim succeeds, one receives 409;
- completed and applied records: return terminal success without rerunning;
- newer attempt of the same BullMQ extraction job: immediately supersedes the
  prior timed-out lease, so the 5s/10s retries do not exhaust on 409;
- unrelated stale processing record: may reclaim after the 16-minute crash lease;
- fresh processing/running record: rejected as already running;
- stale lease after takeover: cannot update progress, complete, fail, or
  overwrite cancellation;
- malformed extraction or teacher job UUID: 422 before persistence access;
- malformed, boolean, zero, or negative attempt: 400 instead of 500;
- teacher cancellation during work: durable `cancelled` state survives restart
  and cannot be overwritten by an older worker;
- ambiguous enqueue compensation: atomically records `queueCompensated` and the
  already-accepted queue item is a terminal no-op;
- asyncio task cancellation: durable failure metadata is recorded for the
  active lease and cancellation is re-raised;
- scanned PDF without vision: explicit failure, not a hung job;
- extraction apply followed by index outage: apply succeeds with an indexing
  warning rather than duplicating official content;
- already-applied extraction: returns existing result without duplicate writes.

## Vector indexing and retrieval edge cases

Verified by automated tests:

- a non-empty class reindex now commits its replacement chunks;
- concurrent reindex of the same class is serialized by a transaction advisory
  lock before replacement reads and writes;
- class index-status queries no longer run concurrently on one `AsyncSession`;
- library embedding happens before old chunks are deleted;
- library delete and insert occur in one transaction;
- embedding failure rolls back and preserves the old usable chunks;
- embedding failure never synthesizes hash vectors or replaces a usable index;
- every provider vector must have exactly the configured dimension and only
  finite values;
- retrieval filters stored vectors by the current `embedding_model`, so a model
  switch degrades to absent context instead of comparing incompatible spaces;
- class index freshness counts only the current embedding model and requests a
  reindex after a model switch;
- retrieval variants are embedded in one provider batch instead of multiplying
  a slow embedding timeout;
- serial retrieval work is bounded by a 20-second aggregate timeout;
- one retrieval variant failure preserves results from successful variants;
- all retrieval variant failures emit a warning and return empty context;
- asyncio cancellation is not swallowed as a degraded retrieval miss;
- teacher-owned library chunks remain owner-filtered.

## AI fallback edge cases

Verified by automated tests:

- JA Ask with grounded chunks and an Ollama timeout returns a visibly degraded
  response, retains citations, and adds no unsupported claims;
- student tutor follow-up with grounded context and an Ollama timeout returns a
  cited deterministic coaching prompt and records `fallback (timeout)`;
- overlapping tutor state mutation uses `pg_try_advisory_xact_lock` and returns
  409 promptly instead of waiting past the route deadline;
- embedding timeout preserves the prior index; retrieval returns no vector
  context until the semantic provider recovers;
- quiz blueprint parse failure remains bounded and uses the existing
  deterministic blueprint fallback;
- weak or mismatched lesson evidence continues to trigger grounding guardrails,
  not a model guess.

## Queue-handoff compensation

Teacher lesson, quiz, and intervention creation is a two-step handoff: FastAPI
persists the durable job, then NestJS enqueues it. Redis failure in the second
step formerly left a pending job while the API could appear successful. The
backend now:

1. validates that FastAPI returned a job ID;
2. attempts BullMQ enqueue;
3. calls the shared-secret-protected internal failure endpoint if enqueue fails;
4. conditionally changes only a still-`pending` job to `failed`, so a worker that
   won the race cannot be overwritten, while atomically recording
   `queueCompensated: true`; and
5. returns 503 so the caller knows queueing did not succeed.

Lesson, quiz, intervention, and quiz-retry handoffs all use this compensation
path. Completed, approved, cancelled, processing, and otherwise non-pending jobs
are safe from compensation overwrite. If Redis accepted the job but returned an
ambiguous connection error, the later worker sees `queueCompensated` and exits
without model/extraction execution. The same invariant covers extraction create
and retry handoffs.

## Automated resilience smoke

Run from the repository root:

```bash
./load-tests/run-ai-pipeline-resilience-smoke.sh
```

The runner is deterministic and does not call a live model or mutate a deployed
environment. It covers extraction, apply flow, embedding/retrieval failure,
index transactions, tutor/JA fallback, queue IDs, active-job dedup options,
unknown-job rejection, shared-secret auth, timeouts, retry propagation, and
enqueue compensation.

The final run passed:

```text
AI:      138 tests
Backend: 15 suites, 151 tests
```

## Fix inventory

### Safe immediate fixes applied

- Replaced retained indexing job IDs with active-only deduplication and one
  trailing latest request.
- Replaced BullMQ-forbidden colon IDs with stable hyphen IDs.
- Added atomic durable-job claims and strict worker-attempt parsing.
- Removed process-local job recovery and made polling read-only so BullMQ is the
  sole durable retry owner.
- Added persisted leases, immediate same-BullMQ newer-attempt supersession, and
  fenced all lifecycle/output writes.
- Moved progress commits before the final output lock and made committed output
  resumable without an inner duplicate insert or another model call.
- Made teacher AI helper failure propagate to BullMQ after durable failure
  persistence.
- Added atomic terminal queue-handoff compensation for teacher/extraction jobs,
  including quiz and extraction retry.
- Added explicit indexing abort deadlines and tiered proxy timeouts that cover
  response body reads.
- Made every shared-secret boundary fail closed.
- Removed the internal token before following signed-storage redirects.
- Made class/library index replacement transaction-safe.
- Serialized same-class reindexing and database use inside
  retrieval/index-status flows; batched variant embeddings under one aggregate
  deadline.
- Removed hash-vector fallback, enforced exact finite dimensions, and filtered
  retrieval/freshness by the current embedding model.
- Added grounded tutor and JA timeout fallbacks.
- Serialized tutor session mutation with a non-blocking transaction advisory
  try-lock.
- Prevented performance recompute coalescing across different student subsets.
- Made all processors reject unknown queue contracts as unrecoverable.
- Made internal lesson, quiz, and intervention runners reject mismatched durable
  job types before claiming.

### Conditional local improvements

- Generate shared backend/Python fixtures from one runtime contract schema.
- Add queue-lag, compensation, and all-retrieval-variants-failed counters to the
  existing metrics surface.
- Add periodic reconciliation for missed RAG/library enqueue requests.
- Trigger a library backfill whenever the configured embedding model changes;
  old vectors are safely hidden but the file status itself is not auto-staled.

### Deferred items requiring design or deployment decisions

1. **Transactional outbox.** Announcement, discussion, RAG, library, and some
   performance handoffs still persist domain state separately from Redis enqueue.
   A process crash in that gap needs reconciliation. A unified outbox is the
   correct durable fix, but requires a schema migration, dispatcher ownership,
   retention policy, and rollout plan.
2. **Generated cross-service contracts.** Backend and AI runtime payload shapes
   are still manually synchronized. Existing exercised envelopes are covered,
   but schema generation is broader than this bounded sweep.
3. **Production-capacity soak.** Local deterministic failures do not establish
   deployed model throughput, p99 latency, GPU/CPU saturation, memory pressure
   from representative PDFs, or safe classroom concurrency. Run the existing k6
   suite against isolated staging before setting production SLOs.

## Verification transcript

| Command / probe | Result | Evidence grade |
|---|---|---|
| `AI_RUNTIME_MODE=test ai-service/.venv/bin/python -m unittest discover -s ai-service/tests -p 'test_*.py'` | 169 passed | Automated test |
| `npm --prefix backend test -- --runInBand` | 91 suites, 1,063 passed | Automated test |
| `./load-tests/run-ai-pipeline-resilience-smoke.sh` | 138 AI + 151 backend passed | Automated test |
| `npm --prefix backend run build` | Passed, including migrations/source cleanliness | Build verification |
| `npm --prefix backend run lint` | 0 errors, 2,204 baseline warnings | Static verification |
| FastAPI import smoke | `Nexora AI Service` | Direct execution |
| Redis active/trailing dedup probe | `[1, 2]` | Direct execution |
| PostgreSQL tutor lock probe | transaction lock acquired, rolled back | Direct execution |
| backend -> AI token probe | 401 / 401 / 404 | Direct execution |
| AI -> backend token probe | 403 / 403 / 404 | Direct execution |
| independent post-fix review | eight blockers closed; non-blocking approval | Read-only code review |

## Readiness statement

The tested queue and AI failure paths are materially more resilient and have
high local confidence. This audit does **not** claim production capacity or full
crash consistency until the deferred outbox and representative staging soak are
completed. Within that boundary, extraction, vector retrieval/indexing, shared
secret auth, retry propagation, concurrency claims, and grounded failure
fallbacks are verified by direct execution or automated regression tests.

Changing the embedding model intentionally hides old-model library vectors until
a library backfill runs. That is a safe no-context degradation, not a
cross-model comparison; operators should include backfill in model-change
runbooks.
