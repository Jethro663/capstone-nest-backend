# Debugging Slice

Load this when the primary job is to trace or reproduce a failure.

## Debugging Workflow

1. Narrow the failing subsystem first.
2. Reproduce the issue in the smallest valid surface.
3. Gather evidence before broadening scope: logs, console output, failed requests, stack traces, DTO mismatches.
4. Keep unrelated slices unloaded until evidence shows a boundary crossing.

## Subsystem-Specific Tactics

- Backend: trace controller -> service -> `this.db` -> schema assumptions.
- Frontend: inspect route/layout/auth state, console errors, failed `/api` requests, and response-envelope assumptions.
- Mobile: inspect auth bootstrap, base URL resolution, secure-storage state, React Query cache invalidation.
- AI: inspect backend proxy headers, queue/orchestration path, ai-service route/schema compatibility, and timeout handling.

## Security Escalation

Add the security slice whenever the failure mentions auth, role mismatch, missing cookie, refresh loops, PII exposure, or forbidden access.

## Common Triggers

- bug, trace, reproduce, console, network, hydration, timeout, runtime, regression, unexpected 401/403/500.
