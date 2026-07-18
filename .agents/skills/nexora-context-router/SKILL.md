---
name: nexora-context-router
description: Repo-specific context router for capstone-nest-react-lms. Use only for Nexora LMS/LXP work to select the smallest valid instruction set before implementation, debugging, or testing.
---

# Nexora Context Router

Use this skill only when working in `capstone-nest-react-lms` or when the prompt explicitly references Nexora.

## Goal

Select the minimum context that preserves correctness.
Dispatch specialized workflow skills before falling back to generic subsystem routing.
This skill is a selector, not a planner swarm and not a second architecture layer.

## Deterministic Workflow

1. Start with `AGENTS.md`.
2. Check for a specialized workflow trigger first:
   - contract drift, DTO/schema/envelope changes -> `contract-change-orchestrator`
   - refresh/login/cookie/token/middleware/secure-storage/session bugs -> `auth-session-doctor`
   - Docker Compose, readiness, env alignment, unhealthy services -> `dev-stack-doctor`
   - smoke, sanity, safest checks, minimal regression coverage -> `workflow-smoke-orchestrator`
   - student mobile login/navigation/API flow audit -> `mobile-flow-auditor`
   - BullMQ, AI proxy, extraction, retrieval, indexing, queue orchestration -> `queue-ai-pipeline-auditor`
   - role-scoped web audit -> `role-frontend-auditor`
   - backend/AI performance audit -> `backend-ai-performance-remediator`
3. If no specialized workflow skill matches, infer one primary task type from prompt nouns, touched paths, or failing subsystem.
4. Load exactly one primary slice by default:
   - `backend/AGENTS.md`
   - `next-frontend/AGENTS.md`
   - `ai-service/AGENTS.md`
   - `mobile/AGENTS.md`
5. Add cross-cutting slices only on trigger words or touched paths:
   - schema -> DB, Drizzle, migration, enum, table, column, contract shape
   - security -> auth, role, guard, cookie, token, PII, permission, audit
   - testing -> test, spec, Playwright, Jest, coverage, regression
   - debugging -> bug, trace, reproduce, console, network, hydration, runtime
6. Choose tools with an MCP-first bias:
   - Serena for code discovery, symbol lookups, references, and focused file understanding
   - Playwright for real browser execution and evidence in `next-frontend`
   - Chrome DevTools when browser debugging needs lower-level network or performance detail
   - shell for scripts, git, installs, startup, and commands not better handled by MCP
7. Load `references/slices/context-efficiency.md` only for repo-analysis, instruction-authoring, or exploration-heavy tasks where compact inspection and output discipline matter.
8. Add a second subsystem slice only when the prompt explicitly crosses boundaries or the selected workflow skill requires it.
9. Do not load appendix refs unless exact detail is needed.
10. Emit `ROUTER_TRACE` before substantive work.

## Primary Slice Selection

- Backend CRUD, DTO, controller, service, queue orchestration -> `backend/AGENTS.md`
- Frontend page, route, component, auth shell, web client bug -> `next-frontend/AGENTS.md`
- AI mentor, proxy, extraction, retrieval, Ollama, FastAPI -> `ai-service/AGENTS.md`
- Generic mobile or Expo task -> `mobile/AGENTS.md`

## Workflow Skill Dispatch

- `contract-change-orchestrator`
  - Use for schema, DTO, envelope, typed contract, and consumer-wiring work.
  - Usually includes kernel + backend + `schema` + whichever client slices consume the changed contract.
- `auth-session-doctor`
  - Use for login loops, refresh failures, cookie issues, middleware gating, guard problems, and secure-storage drift.
  - Usually includes kernel + `security` + failing client slice + backend.
- `dev-stack-doctor`
  - Use for Docker Compose, `.env`, readiness, unhealthy services, ports, Redis/Postgres/Ollama, and startup failures.
  - Usually includes kernel + backend + ai-service, with frontend or mobile only when named.
- `workflow-smoke-orchestrator`
  - Use when the user wants the smallest valid smoke suite after a change.
  - Usually includes kernel + affected slices + `testing`.
- `mobile-flow-auditor`
  - Use for student-scoped mobile flow audits in `mobile`.
  - Usually includes kernel + `mobile` + optional backend, `security`, and `testing`.
- `queue-ai-pipeline-auditor`
  - Use for BullMQ, AI proxy, extraction, retrieval, indexing, and queued orchestration correctness.
  - Usually includes kernel + backend + ai-service + optional `schema`, `security`, and `testing`.

## Include / Exclude Defaults

- Backend CRUD:
  include kernel + backend
  optional `security`, `schema`, `testing`
  exclude frontend, AI, mobile by default
- Contract change:
  include kernel + backend + `schema` + matching client slice when the contract is consumed outside backend
  optional `security`, `testing`, ai-service
  exclude unrelated slices
- Auth/session:
  include kernel + failing client slice + backend + `security`
  optional `debugging`, `testing`
  exclude unrelated slices
- Dev stack:
  include kernel + backend + ai-service
  optional frontend, `mobile`, `security`
  exclude unrelated slices
- Cross-platform smoke:
  include kernel + affected slices + `testing`
  optional `security`
  exclude unrelated slices
- Schema change:
  include kernel + backend + `schema`
  optional `security`, `testing`
  exclude unrelated clients unless contract work is requested
- Frontend page or bug:
  include kernel + frontend
  optional `debugging`, `security`, `testing`
  exclude mobile, AI, schema by default
- Mobile integration:
  include kernel + `mobile`
  optional backend, `security`, `testing`
  exclude unrelated slices by default
- Mobile audit:
  include kernel + `mobile` + `testing`
  optional backend, `security`
  exclude unrelated web or AI slices
- AI mentor / queue / extraction:
  include kernel + backend + ai-service
  optional `schema`, `security`, `testing`
  exclude frontend and mobile unless named
- Debugging:
  include kernel + failing subsystem + `debugging`
  add `security` for auth, RBAC, cookie, refresh, or PII symptoms
- Test writing:
  include kernel + target subsystem + `testing`
  add `security` or `schema` only when the tests touch those contracts
- Repo docs drift:
  include kernel + affected slice docs
  optional `testing`, `security`, `schema` refs when commands or contracts need verification
  exclude unrelated subsystem slices

## References

- Rule index: `references/rule-index.md`
- Router table: `references/router-decision-table.md`
- Cross-cutting slices: `references/slices/`
- Tooling slice: `references/slices/tooling.md`
- Context efficiency slice: `references/slices/context-efficiency.md`
- Appendices: `references/appendix/`
- Assembly examples: `references/examples/assembly-examples.md`

## Non-Negotiables

- Keep unrelated slices unloaded.
- Specialized workflow skills take precedence over generic slice routing.
- Prefer available MCP tools over raw shell inspection when Serena or Playwright can answer the question directly.
- Prefer the smallest valid context over exhaustive background.
- Do not restate long appendix material in the prompt unless the task needs it.
- When a rule ID is enough, cite the rule ID instead of re-expanding long prose.
