---
name: queue-ai-pipeline-auditor
description: Use when BullMQ jobs, AI proxy calls, extraction, retrieval, indexing, or backend-to-ai-service orchestration need a correctness-focused audit in capstone-nest-react-lms.
---

# Queue AI Pipeline Auditor

Audit the backend-to-AI pipeline for correctness, orchestration safety, and contract continuity. Use this when flow safety matters more than raw performance tuning.

## Quick Start

- Emit:
  `ROUTER_TRACE task=ai-pipeline-audit include=kernel,backend,ai-service optional_skipped=<unneeded slices> exclude=next-frontend,mobile reason=<one line>`
- Load:
  - root `AGENTS.md`
  - `backend/AGENTS.md`
  - `ai-service/AGENTS.md`
  - optional `schema`, `security`, and `testing` refs only when needed

## Use This For

- BullMQ producer or worker drift
- AI proxy header or path mismatch
- extraction apply flow issues
- retrieval or indexing orchestration bugs
- queued AI tasks that vanish, duplicate, or fail to finalize cleanly

## Workflow

1. Trace the pipeline in order:
   - request entrypoint
   - backend service orchestration
   - queue producer and payload
   - worker or listener
   - AI proxy call
   - `ai-service` route and service handler
   - result persistence, logging, or reindex side effects
2. Check contracts at each boundary:
   - path
   - headers
   - envelope
   - job payload shape
   - timeout or degraded-mode assumptions
3. Check async safety:
   - idempotency
   - retry behavior
   - append-only or read-only rules
   - separation from official academic records
4. Verify with the narrowest available commands:
   - backend build or tests
   - `python scripts/run_tests.py`
   - targeted queue or proxy reproduction if the user asked for it

## Use a Different Skill When

- latency or architecture-wide performance is the main question -> `backend-ai-performance-remediator`
- the main failure is auth/session, not AI orchestration -> `auth-session-doctor`
- the main issue is a contract rollout across clients -> `contract-change-orchestrator`
