---
name: nexora-context-router
description: Repo-specific context router for capstone-nest-react-lms. Use only for Nexora LMS/LXP work to select the smallest valid instruction set before implementation, debugging, or testing.
---

# Nexora Context Router

Use this skill only when working in `capstone-nest-react-lms` or when the prompt explicitly references Nexora.

## Goal

Select the minimum context that preserves correctness.
This skill is a selector, not a planner swarm and not a second architecture layer.

## Deterministic Workflow

1. Start with `AGENTS.md`.
2. Infer one primary task type from prompt nouns, touched paths, or failing subsystem.
3. Load exactly one primary slice by default:
   - `backend/AGENTS.md`
   - `next-frontend/AGENTS.md`
   - `ai-service/AGENTS.md`
   - `test-mobile/AGENTS.md`
4. Add cross-cutting slices only on trigger words or touched paths:
   - schema -> DB, Drizzle, migration, enum, table, column, contract shape
   - security -> auth, role, guard, cookie, token, PII, permission, audit
   - testing -> test, spec, Playwright, Jest, coverage, regression
   - debugging -> bug, trace, reproduce, console, network, hydration, runtime
5. Add a second subsystem slice only when the prompt explicitly crosses boundaries.
6. Do not load appendix refs unless exact detail is needed.
7. Emit `ROUTER_TRACE` before substantive work.

## Primary Slice Selection

- Backend CRUD, DTO, controller, service, queue orchestration -> `backend/AGENTS.md`
- Frontend page, route, component, auth shell, web client bug -> `next-frontend/AGENTS.md`
- AI mentor, proxy, extraction, retrieval, Ollama, FastAPI -> `ai-service/AGENTS.md`
- Generic mobile or Expo task -> `test-mobile/AGENTS.md`
- Prompt explicitly names `mobile/` or `betamochi/` -> load that folder's `AGENTS.md` notice and only proceed there if the request stays explicit

## Include / Exclude Defaults

- Backend CRUD:
  include kernel + backend
  optional `security`, `schema`, `testing`
  exclude frontend, AI, mobile by default
- Schema change:
  include kernel + backend + `schema`
  optional `security`, `testing`
  exclude unrelated clients unless contract work is requested
- Frontend page or bug:
  include kernel + frontend
  optional `debugging`, `security`, `testing`
  exclude mobile, AI, schema by default
- Mobile integration:
  include kernel + `test-mobile`
  optional backend, `security`, `testing`
  exclude `mobile/` and `betamochi/` unless named
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

## References

- Rule index: `references/rule-index.md`
- Router table: `references/router-decision-table.md`
- Cross-cutting slices: `references/slices/`
- Appendices: `references/appendix/`
- Assembly examples: `references/examples/assembly-examples.md`

## Non-Negotiables

- Keep unrelated slices unloaded.
- Prefer the smallest valid context over exhaustive background.
- Do not restate long appendix material in the prompt unless the task needs it.
- When a rule ID is enough, cite the rule ID instead of re-expanding long prose.
