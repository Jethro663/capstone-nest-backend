# Nexora Codex Kernel

Use this file as the always-on kernel for `capstone-nest-react-lms`.
The authoritative router lives here and in `.agents/skills/nexora-context-router/`.

## Identity
- Repo: Nexora LMS/LXP for Gat Andres Bonifacio High School.
- Stack: NestJS 11 + Drizzle + PostgreSQL, Next.js App Router + React + Tailwind, Expo mobile, FastAPI + Ollama, BullMQ + Redis, JWT + refresh tokens.
- Default mobile target for generic `mobile` work: `test-mobile/`.
- Priority order: correctness, security, maintainability, performance.

## Router Contract
- Before substantive work, emit:
  `ROUTER_TRACE task=<type> include=<kernel,...> optional_skipped=<...> exclude=<...> reason=<one line>`
- Load the kernel first.
- Select exactly one primary slice by default:
  - `backend/AGENTS.md`
  - `next-frontend/AGENTS.md`
  - `ai-service/AGENTS.md`
  - `test-mobile/AGENTS.md`
- Add cross-cutting refs only on demand:
  - `.agents/skills/nexora-context-router/references/slices/schema.md`
  - `.agents/skills/nexora-context-router/references/slices/security.md`
  - `.agents/skills/nexora-context-router/references/slices/testing.md`
  - `.agents/skills/nexora-context-router/references/slices/debugging.md`
- Add a second subsystem slice only when the prompt explicitly crosses boundaries.
- Keep appendix refs unloaded unless exact detail is needed.
- `mobile/` and `betamochi/` are legacy-target notices. Do not route generic mobile work there unless the prompt names the folder.

## Routing Summary
- Backend CRUD: kernel + backend; optional security/schema/testing; exclude frontend/mobile/AI by default.
- Schema change: kernel + backend + schema; optional security/testing and another subsystem only when contract changes are explicit.
- Frontend page or bug: kernel + frontend; optional debugging/security/testing; exclude mobile/AI/schema by default.
- Mobile integration: kernel + `test-mobile`; optional backend/security/testing; exclude `mobile/` and `betamochi/` unless named.
- AI mentor, queue, extraction: kernel + backend + ai-service; optional schema/security/testing; exclude web/mobile by default.
- Debugging: kernel + failing subsystem + debugging; add security for auth, RBAC, PII, or session issues.
- Test writing: kernel + target subsystem + testing; add security/schema only when the tests touch those contracts.

## Rule IDs
- `ARCH-1`: Controllers route, validate, delegate, and format only.
- `ARCH-2`: Services own business logic and orchestration.
- `ARCH-3`: Backend services use `DatabaseService` and `this.db` for Drizzle access.
- `ARCH-4`: Modules are feature boundaries; no private cross-module internals.
- `AUTH-1`: JWT auth is global; `@Public()` is explicit and rare.
- `AUTH-2`: Roles are enforced explicitly with role-aware guards/decorators.
- `VALID-1`: DTO validation is required on external inputs.
- `RESP-1`: Preserve the `success/message/data` envelope unless the task explicitly changes the contract.
- `SEC-1`: Do not leak PII, secrets, stack traces, or internal-only diagnostics.
- `ERR-1`: Use the correct framework exception/status type for each failure path.
- `AUD-1`: Audit-log sensitive academic writes.
- `DOM-1`: LXP eligibility is based on low performance across multiple assessments, not a single score.
- `DOM-2`: LXP access stays guarded and is not general-purpose content access.
- `DOM-3`: LXP never writes official class records.
- `AI-1`: AI mentor is read-only for grades, enrollment, and official academic records.
- `AI-2`: AI work is async via BullMQ or equivalent queued orchestration.
- `AI-3`: AI feedback logs stay separate from official academic records.
- `INT-1`: Intervention activation requires teacher or admin approval.
- `INT-2`: Intervention history is append-only.
- `REC-1`: Assessment scores are immutable after teacher review.
- `DATA-1`: Computed totals are not authoritative stored values.
- `DATA-2`: LXP eligibility is computed or recomputed; do not rely on a permanent stale flag.

## Primary Anchors
- Rule index: `.agents/skills/nexora-context-router/references/rule-index.md`
- Router table: `.agents/skills/nexora-context-router/references/router-decision-table.md`
- Appendices: `.agents/skills/nexora-context-router/references/appendix/`
- Repo-owned custom skills: `.agents/skills/`
