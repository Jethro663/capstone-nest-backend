---
name: mobile-flow-auditor
description: Use when auditing role-scoped mobile login, navigation, query invalidation, or backend-contract health in mobile for capstone-nest-react-lms.
---

# Mobile Flow Auditor

Audit the multi-role `mobile` app as the default Nexora mobile target. Lock the requested role (`student`, `teacher`, or `admin`) before tracing the flow; default to `student` only when the prompt does not name a role.

## Quick Start

- Emit:
  `ROUTER_TRACE task=mobile-audit include=kernel,mobile optional_skipped=<unneeded slices> exclude=next-frontend,ai-service,<other unrelated slices> reason=<one line>`
- Load:
  - root `AGENTS.md`
  - `mobile/AGENTS.md`
  - backend slice when the audited flow depends on live API behavior

## Scope

- login, refresh, logout
- protected navigation for the selected role
- route params and screen transitions
- React Query invalidation after mutations
- API base URL or backend contract health

## Workflow

1. Lock the role, then inventory its flow from `src/navigation/*`, `App.tsx`, and `src/screens/*`.
2. Trace the backing services through `src/api/services/*`, hooks, and `src/types/*`.
3. Use the lightest runnable surface first:
   - `npm run typecheck`
   - `npm run test`
   - `npm run web` for quick structural checks
4. Escalate to `npm run android:emulator` when the issue is Android-specific, secure-storage-related, or not reproducible on web.
5. Verify at least:
   - login
   - refresh or session restoration
   - logout
   - one data-backed path for the selected role

## Do Not Use This For

- generic styling work with no navigation, auth, API, or cache behavior
- frontend web route audits

## Output Expectation

- reachable flow inventory
- broken actions or contract mismatches
- smallest fix plan tied to navigation, API, storage, or invalidation
