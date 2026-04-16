---
name: auth-session-doctor
description: Use when login, refresh-token, cookie, middleware, guard, secure-storage, or session-loop issues cross backend and client surfaces in capstone-nest-react-lms.
---

# Auth Session Doctor

Trace authentication and session failures as a chain, not as isolated files. Distinguish transport, storage, gating, and authorization before changing code.

## Quick Start

- Emit:
  `ROUTER_TRACE task=auth-session include=kernel optional_skipped=<unneeded slices> exclude=<unrelated slices> reason=<one line>`
- Load:
  - root `AGENTS.md`
  - failing client slice
  - `references/slices/security.md`
  - backend slice when the failing surface is frontend or mobile

## Use This For

- refresh token loop
- login succeeds then protected route redirects
- cookie present but access token missing
- mobile secure storage drift
- middleware, guard, or role mismatch after auth
- `401 after refresh`, `logout loop`, `session expires too early`

## Workflow

1. Identify the failing surface:
   - web -> `middleware.ts`, `app/(dashboard)/layout.tsx`, `src/providers/AuthProvider.tsx`, `src/lib/api-client.ts`
   - mobile -> `AppNavigator`, secure storage, `src/api/*`
   - backend -> auth controller, refresh endpoints, guards, cookie config, JWT config
2. Classify the failure before editing:
   - authentication issue
   - authorization or role issue
   - token transport/storage issue
   - client cache or redirect logic issue
3. Trace the full request path end-to-end:
   - login -> token issuance
   - refresh -> transport and storage
   - gated route -> middleware/layout/navigator
   - protected API call -> auth header or cookie use
4. Verify with real flow checks, not code inspection alone:
   - login
   - refresh
   - logout
   - one protected route or screen
5. Add targeted tests or smoke verification only where the bug actually lived.

## Do Not Use This For

- pure permission-matrix changes with no session failure
- generic page bugs unrelated to auth/session
- contract migrations that happen to touch auth DTOs

## Do Not Forget

- web uses refresh-token cookies plus in-memory access token
- mobile uses secure storage, not browser cookies
- backend remains the auth authority
