---
name: contract-change-orchestrator
description: Use when schema, DTO, response-envelope, or typed API contract changes must be traced across backend plus web, mobile, or AI consumers in capstone-nest-react-lms.
---

# Contract Change Orchestrator

Coordinate contract changes from the backend source of truth out to every real consumer. This skill is for drift prevention, not just schema editing.

## Quick Start

- Emit:
  `ROUTER_TRACE task=contract-change include=kernel,backend optional_skipped=<unneeded slices> exclude=<unrelated slices> reason=<one line>`
- Load:
  - root `AGENTS.md`
  - `backend/AGENTS.md`
  - `references/slices/schema.md`
  - matching client slice docs only when those consumers exist in the changed path

## Use This For

- Drizzle schema or migration changes
- DTO request or response changes
- `success/message/data` envelope changes
- service-wrapper or typed-client drift
- prompts like `wire it to mobile`, `update frontend types`, or `keep clients in sync`

## Workflow

1. Identify the authoritative backend contract surface first:
   - persistent shape -> `backend/src/drizzle/schema/*`, `backend/drizzle/*`
   - HTTP shape -> DTOs, controllers, response mappers
   - AI proxy shape -> backend AI proxy plus `ai-service/app/schemas.py` or route handlers
2. Enumerate downstream consumers before editing:
   - `next-frontend/src/services/*`, `src/types/*`, `src/schemas/*`
   - `mobile/src/api/services/*`, `src/types/*`, screen expectations
   - `ai-service/app/*` when backend-to-AI headers, paths, or envelopes change
3. Change the backend source of truth first.
4. Update every affected consumer in the same pass. Do not stop at backend if the contract escaped backend.
5. Verify with the smallest matching command set:
   - backend: `npm run build`, plus `npm run seed:smoke` when seeded flows are relevant
   - web: `npm run lint`, `npm run build`, or `npm run dev:smoke`
   - mobile: `npm run typecheck`, `npm run test`
   - AI: `python scripts/run_tests.py`

## Do Not Use This For

- pure backend internal refactors with no contract change
- generic bugfixes that do not alter data shape
- auth/session breakages where the contract stayed stable

## Done Condition

- the authoritative backend contract is updated
- every named or implied consumer is updated
- verification covers each touched consumer surface
