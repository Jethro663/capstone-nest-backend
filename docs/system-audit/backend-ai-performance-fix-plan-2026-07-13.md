# Repo-wide Performance and Architecture Fix Plan

## Safe Immediate Fixes

- Make the AI test entrypoint declare AI_RUNTIME_MODE=test and add explicit shutdown checks for clients, tasks, and default-executor work.
- Add explicit CI timeout-minutes budgets to frontend and AI jobs and preserve diagnostic output on timeout.
- Replace empty unlink catches with structured warnings/metrics while preserving successful upload semantics.
- Fix the two production React set-state-in-effect findings and cancel AuthProvider timeout races after the winning branch completes.
- Fix the three backend lint errors and establish a no-new-errors gate without attempting to clear 5225 warnings in one change.
- Document the current mobile role scope once the product owner confirms teacher/admin mobile support is intentional.

## Conditional Local Refactors

- Change student performance summary to read existing snapshots and queue/recompute only missing or explicitly stale entries; keep the existing response envelope and event semantics.
- Batch class-record score upserts and adviser-section reads, protected by query-count, atomicity, and existing performance specs.
- Move extraction and retry execution from FastAPI create_task into the existing backend BullMQ orchestration pattern used by lesson-plan, quiz, and intervention jobs.
- Add an academic rollover scale fixture and then batch only independent inserts while preserving foreign-key order and transaction rollback.
- Decompose giant owners behind compatibility facades: backend read/query services, FastAPI routers plus job services, and frontend route-local hooks/components. Keep each extraction behavior-neutral.

## Deferred Items Requiring Human Decision

- A shared generated API contract package across backend, web, and mobile; this needs an explicit contract-change proposal and consumer migration plan.
- Any new cache or persisted derived-data policy; measure query latency and staleness tolerance before introducing it.
- Major Starlette/httpx or Winston/Loki transport upgrades; isolate them from performance remediation.
- A decision on whether mobile is student-only or a multi-role product; documentation and architecture should follow that product decision.
