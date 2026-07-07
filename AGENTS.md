# Nexora Codex Kernel

Use this file as the always-on kernel for `capstone-nest-react-lms`.
The authoritative router lives here and in `.agents/skills/nexora-context-router/`.

## Identity
- Repo: Nexora LMS/LXP for Gat Andres Bonifacio High School.
- Stack: NestJS 11 + Drizzle + PostgreSQL, Next.js App Router + React + Tailwind, Expo mobile, FastAPI + Ollama, BullMQ + Redis, JWT + refresh tokens.
- Default mobile target for generic `mobile` work: `mobile/`.
- Priority order: correctness, security, maintainability, performance, then speed.

## Router Contract
- Before substantive work, emit:
  `ROUTER_TRACE task=<type> include=<kernel,...> optional_skipped=<...> exclude=<...> reason=<one line>`
- Load the kernel first.
- Route to a specialized workflow skill before generic subsystem routing when the prompt is about contract drift, auth/session failures, dev-stack health, smoke verification, mobile flow auditing, or queue/AI pipeline auditing.
- Otherwise select exactly one primary slice by default.
- Prefer available MCP tools when they fit the job: Serena for code discovery and symbol-aware edits, Playwright for browser execution and UI evidence, shell for scripts, git, installs, and service/runtime commands.
- When shell output is likely large and `rtk` is installed, prefer RTK-filtered shell paths without replacing more precise MCP or file tools.
- Prefer the smallest sufficient context: inspect targeted files and outputs before broad scans, and load detailed references only when the task triggers them.
- Add cross-cutting refs only on demand:
  - `.agents/skills/nexora-context-router/references/slices/schema.md`
  - `.agents/skills/nexora-context-router/references/slices/security.md`
  - `.agents/skills/nexora-context-router/references/slices/testing.md`
  - `.agents/skills/nexora-context-router/references/slices/debugging.md`
  - `.agents/skills/nexora-context-router/references/slices/tooling.md`
  - `.agents/skills/nexora-context-router/references/slices/context-efficiency.md`
- Add a second subsystem slice only when the prompt explicitly crosses boundaries or the selected workflow skill requires it.
- Keep appendix refs unloaded unless exact detail is needed.

## Sub-Agent Delegation
- Consider sub-agents only when the task contains 2+ independent subtasks that can run in parallel without shared ownership.
- Before spawning sub-agents, ask the user for permission unless the prompt already explicitly authorizes delegation, parallel agents, workers, explorers, or sub-agents.
- Keep the immediate blocking task local. Delegate only sidecar work or independent parallel slices that do not block the next local step.
- When delegating code work, assign explicit ownership by file, module, or responsibility and avoid overlapping write scopes.
- Do not ask about sub-agents for small, sequential, tightly coupled, or single-slice tasks where coordination cost would outweigh the gain.

## Primary Slices
- `backend/AGENTS.md`
- `next-frontend/AGENTS.md`
- `ai-service/AGENTS.md`
- `mobile/AGENTS.md`

## Legacy Exclusions
- If archived mobile folders are restored for reference, do not route generic mobile work there unless the prompt names the folder explicitly.

## References
- Router skill: `.agents/skills/nexora-context-router/SKILL.md`
- Router table: `.agents/skills/nexora-context-router/references/router-decision-table.md`
- Rule index: `.agents/skills/nexora-context-router/references/rule-index.md`
- Tooling guide: `.agents/skills/nexora-context-router/references/slices/tooling.md`
- Context efficiency guide: `.agents/skills/nexora-context-router/references/slices/context-efficiency.md`
- Assembly examples: `.agents/skills/nexora-context-router/references/examples/assembly-examples.md`
- Repo-owned workflow skills: `.agents/skills/`
