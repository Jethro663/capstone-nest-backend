# Nexora Compatibility Bridge

This file is no longer the master prompt.

Authoritative Codex entrypoints:

- `AGENTS.md`
- `.agents/skills/nexora-context-router/`
- `.agents/skills/nexora-context-router/references/rule-index.md`

Use this document as a thin bridge for humans and tools that still open `.github/copilot-instructions.md`.

## Repo Facts

- Nexora is an LMS/LXP for Gat Andres Bonifacio High School.
- Stack: NestJS 11 + Drizzle + PostgreSQL, Next.js App Router + React + Tailwind, Expo mobile, FastAPI + Ollama, BullMQ + Redis, JWT + refresh tokens.
- Default mobile target for generic mobile work is `test-mobile/`, not `betamochi/`.
- Priority order: correctness, security, maintainability, performance.

## Kernel Rules

- `ARCH-1`: controllers delegate only.
- `ARCH-2`: services own business logic.
- `ARCH-3`: backend services use `DatabaseService` and `this.db`.
- `ARCH-4`: modules are feature boundaries; no private cross-module imports.
- `AUTH-1`: JWT auth is global and `@Public()` is explicit.
- `AUTH-2`: role enforcement is explicit.
- `VALID-1`: DTO validation is required.
- `RESP-1`: preserve `success/message/data` unless a task explicitly changes the contract.
- `SEC-1`: no PII, secrets, or stack-trace leakage.
- `ERR-1`: use correct exception types.
- `AUD-1`: audit-log sensitive academic writes.
- `DOM-1`: LXP eligibility is based on low performance across multiple assessments.
- `DOM-2`: LXP access stays guarded.
- `DOM-3`: LXP never writes official class records.
- `AI-1`: AI mentor is read-only for official records.
- `AI-2`: AI work is async via BullMQ or equivalent queue orchestration.
- `AI-3`: AI feedback logs stay separate from official records.
- `INT-1`: intervention activation requires teacher or admin approval.
- `INT-2`: intervention history is append-only.
- `REC-1`: assessment scores are immutable after teacher review.
- `DATA-1`: computed totals are not authoritative stored values.
- `DATA-2`: LXP eligibility is computed or recomputed, not stored as a stale permanent flag.

## Routing Summary

- Start from `AGENTS.md`.
- Load one primary slice only by default: backend, frontend, ai-service, or `test-mobile`.
- Add `schema`, `security`, `testing`, or `debugging` refs only when the task requires them.
- Add a second subsystem slice only for explicit cross-boundary work.
- Keep appendix refs unloaded unless exact detail is needed.
- Emit `ROUTER_TRACE task=<type> include=<kernel,...> optional_skipped=<...> exclude=<...> reason=<one line>` before substantive work.

## Pointers

- Router decision table: `.agents/skills/nexora-context-router/references/router-decision-table.md`
- Appendices: `.agents/skills/nexora-context-router/references/appendix/`
- Usage examples: `.agents/skills/nexora-context-router/references/examples/assembly-examples.md`
