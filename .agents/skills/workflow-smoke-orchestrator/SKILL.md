---
name: workflow-smoke-orchestrator
description: Use when the user wants the smallest valid smoke, sanity, or regression command set after changes in capstone-nest-react-lms.
---

# Workflow Smoke Orchestrator

Build the cheapest high-signal verification suite that matches the touched flow. Prefer repo-native smoke scripts before broad full-suite commands.

## Quick Start

- Emit:
  `ROUTER_TRACE task=cross-platform-smoke include=kernel optional_skipped=<unneeded slices> exclude=<unrelated slices> reason=<one line>`
- Load the touched slice docs plus `references/slices/testing.md`.

## Repo-Native Checks

- Backend:
  - `npm run build`
  - `npm run seed:smoke`
  - `npm run test`
- Web:
  - `npm run dev:smoke`
  - `npm run perf:auth-smoke`
  - `npm run perf:nav-smoke`
  - `npm run perf:discussion-smoke`
  - `npm run test`
  - `npm run test:e2e`
- AI:
  - `python scripts/run_tests.py`
  - `python scripts/run_eval_suite.py`
- Mobile:
  - `npm run typecheck`
  - `npm run test`

## Workflow

1. Start from changed paths or the user-described flow.
2. Pick the narrowest matching checks first.
3. Run cheap checks before slow ones.
4. Escalate only when cheap checks do not cover the touched behavior.
5. Report what was intentionally skipped and why.

## Mapping Hints

- auth/session changes -> frontend `perf:auth-smoke`, backend build, relevant client test
- navigation/shell changes -> frontend `dev:smoke` or `perf:nav-smoke`
- discussion flow changes -> frontend `perf:discussion-smoke`
- seeded backend flows -> backend `seed:smoke`
- AI logic changes -> `python scripts/run_tests.py`
- mobile screen or API changes -> mobile `typecheck` and `test`

## Do Not Use This For

- exhaustive audits across every subsystem
- contract-change coordination
- debugging an environment that will not boot
