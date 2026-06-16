---
name: mobile-flow-auditor
description: Use when auditing student mobile login, navigation, query invalidation, or backend-contract health in mobile for capstone-nest-react-lms.
---

# Mobile Flow Auditor

Audit the `mobile` app as the default Nexora mobile target. Treat it as a student-scoped flow audit, not a generic Expo styling pass.

## Quick Start

- Emit:
  `ROUTER_TRACE task=mobile-audit include=kernel,mobile optional_skipped=<unneeded slices> exclude=mobile,betamochi,<other unrelated slices> reason=<one line>`
- Load:
  - root `AGENTS.md`
  - `mobile/AGENTS.md`
  - backend slice when the audited flow depends on live API behavior

## Scope

- login, refresh, logout
- protected student navigation
- route params and screen transitions
- React Query invalidation after mutations
- API base URL or backend contract health

## Workflow

1. Inventory the flow from `src/navigation/*`, `App.tsx`, and `src/screens/*`.
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
   - one data-backed student path

## Do Not Use This For

- teacher or admin mobile UX
- legacy `mobile/` or `betamochi/` targets unless the prompt names them
- frontend web route audits

## Output Expectation

- reachable flow inventory
- broken actions or contract mismatches
- smallest fix plan tied to navigation, API, storage, or invalidation
