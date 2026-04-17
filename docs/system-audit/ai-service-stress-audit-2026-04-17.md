# AI Service Stress Test Audit

## Stress-Test Summary

- Date: `2026-04-17`
- Repo: `capstone-nest-react-lms`
- Findings recorded: `4`
- Scenario count: `4`
- Status counts: `{'partially verified': 4}`

## Baseline

- python scripts/run_tests.py passed (36 tests)
- python -m unittest tests.test_student_tutor_service tests.test_quiz_generation_service tests.test_retrieval_service tests.test_extraction_pipeline tests.test_ai_job_runtime passed (27 tests)
- python scripts/run_eval_suite.py passed (36 tests)
- python -c "from app.main import app; print(app.title)" returned Nexora AI Service
- backend npm test -- ai-proxy.service.spec.ts ai-mentor.controller.spec.ts lxp.controller.spec.ts lxp.service.spec.ts passed (86 tests)

## Scenario Matrix Summary

### 1. student-tutor and chat - baseline correctness plus code-path stress gap review

- Load style: `partially verified`
- Expected result: tutor and chat routes remain correct and grounded under repeated and concurrent requests
- Failure signal: session drift, empty-context tutoring, malformed model output, header mismatch, timeout regressions
- Observability evidence: student tutor tests passed, backend proxy/controller specs passed, but no real HTTP concurrency or live Ollama pressure run exists
- Confidence: `medium`

### 2. JA, LXP-adjacent, and remedial flows - unit-backed coverage plus route and service review

- Load style: `partially verified`
- Expected result: JA and remedial paths degrade cleanly without destabilizing LXP-linked flows
- Failure signal: sparse-evidence hard failures, swallowed LLM exceptions, race-prone intervention creation, undersized review packets
- Observability evidence: LXP backend specs passed, but JA/remedial route-level pressure behavior is not directly exercised
- Confidence: `medium`

### 3. extraction, retrieval, indexing, and quiz jobs - targeted pipeline tests plus runtime helper review

- Load style: `partially verified`
- Expected result: long-running jobs survive retries, reindexing, and repeated polling without duplicate or partial side effects
- Failure signal: in-memory job loss, partial DB side effects, reindex-triggered job failure, route-level contract drift, large-payload instability
- Observability evidence: pipeline helper tests passed, but no end-to-end stress or restart survival run exists
- Confidence: `medium`

### 4. backend proxy and contract boundary - header, timeout, and envelope compatibility review

- Load style: `partially verified`
- Expected result: Nest proxy and FastAPI app stay aligned on paths, headers, timeout classes, and payload envelopes
- Failure signal: path-prefix timeout drift, malformed headers, 401 on secret mismatch, transport failure handling gaps
- Observability evidence: focused backend specs passed and route surfaces align, but real fetch-to-FastAPI stress is unproven
- Confidence: `medium`

## Prioritized Findings

### 1. Long-running extraction and quiz job paths are not stress-proven under restart, concurrency, or partial failure

- Priority: `P1`
- Severity: `high`
- Status: `partially verified`
- Category: `resilience failure`
- Files: ai-service/app/main.py, ai-service/app/extraction_pipeline.py, ai-service/app/quiz_generation_service.py
- Evidence: Targeted helper tests pass, but no route-level or restart-survival stress run exists; in-memory job runtime and fire-and-forget create_task patterns remain unproven under crash or contention.

### 2. Backend proxy compatibility is only spec-proven, not stress-proven through real HTTP header and timeout behavior

- Priority: `P1`
- Severity: `high`
- Status: `partially verified`
- Category: `contract fragility`
- Files: backend/src/modules/ai-mentor/ai-proxy.service.ts, backend/src/modules/ai-mentor/ai-mentor.controller.ts, ai-service/app/main.py
- Evidence: Focused backend specs passed, but missing-header, malformed-header, transport-failure, and true abort/timeout behavior are not exercised end to end.

### 3. Tutor, JA, and remedial flows rely on graceful fallbacks that can mask retrieval or model-quality regressions

- Priority: `P2`
- Severity: `medium`
- Status: `partially verified`
- Category: `extension-risk fragility`
- Files: ai-service/app/student_tutor_service.py, ai-service/app/ja_practice_service.py, ai-service/app/remedial_service.py
- Evidence: Current tests prove happy-path helper correctness, but empty-context tutoring, sparse evidence, regex-only prompt guards, and swallowed LLM exceptions can degrade behavior without surfacing a hard failure.

### 4. Retrieval, indexing, and extraction paths lack contention evidence for large payloads and repeated polling patterns

- Priority: `P2`
- Severity: `medium`
- Status: `partially verified`
- Category: `performance bottleneck`
- Files: ai-service/app/retrieval_service.py, ai-service/app/indexing_pipeline.py, ai-service/app/extraction_pipeline.py
- Evidence: Helper tests pass, but there is no mixed-flow soak run for large PDFs, repeated indexing, empty-index retrieval, or sustained status polling.

## Actual Edits

- No safe edits were applied in this run.

## Verification

- python scripts/run_tests.py
- python -m unittest tests.test_student_tutor_service tests.test_quiz_generation_service tests.test_retrieval_service tests.test_extraction_pipeline tests.test_ai_job_runtime
- python scripts/run_eval_suite.py
- python -c "from app.main import app; print(app.title)"
- npm test -- ai-proxy.service.spec.ts ai-mentor.controller.spec.ts lxp.controller.spec.ts lxp.service.spec.ts

## Before vs After

### Improved

- No confirmed improvements were recorded.

### Stayed The Same

- Current unit and targeted spec baseline is green across ai-service and the backend AI/LXP boundary.
- No code changes were applied in this run.

### Remaining Risks

- Real HTTP concurrency and timeout behavior between Nest fetch() and FastAPI remains unproven.
- Long-running extraction and quiz job survival across restart or crash remains unproven.
- JA, remedial, and tutor degraded-mode behavior can mask grounding or model-quality regressions.
- Large-payload and repeated-polling contention for retrieval/indexing/extraction remains unproven.

## Confidence in LXP and AI Feature Readiness

- LXP: `partially verified`
- AI features: `partially verified`
- The baseline is healthy, but the weakest family is still extraction and long-running job resilience under realistic pressure.
- Tutor, JA, and remedial flows look functionally healthy at helper level, not yet robust end to end under live dependency pressure.

## Second-Pass Verification

- Independent scenario-family review converged on the same outcome: current AI features are functionally healthy but only partially verified for real stress, concurrency, and proxy-failure conditions.
