# Security Slice

Load this for auth, RBAC, PII, session, or audit-sensitive work.

## Repo Anchors

- Global auth and throttling: `backend/src/app.module.ts`
- Global validation and CORS: `backend/src/main.ts`
- Auth module and guards: `backend/src/modules/auth`
- Web auth client: `next-frontend/src/lib/api-client.ts`, `next-frontend/src/providers/AuthProvider.tsx`
- Mobile auth client: `test-mobile/src/api/client.ts`, `test-mobile/src/providers/AuthProvider.tsx`
- Audit logging: `backend/src/modules/audit`

## Guardrails

- Respect `AUTH-1`: protected routes assume JWT auth globally unless they are explicitly `@Public()`.
- Respect `AUTH-2`: role checks remain explicit; do not weaken role boundaries to “any authenticated user” without intent.
- Respect `SEC-1`: do not expose passwords, refresh tokens, raw stack traces, internal table names, or unnecessary student PII.
- Respect `AUD-1`: grade, enrollment, intervention, and other sensitive academic writes should leave an audit trail.
- Respect `RESP-1`: changing the envelope is a contract change and must be deliberate.

## Web And Mobile Differences

- Web relies on refresh-token cookies and an in-memory access token.
- Mobile uses bearer tokens and secure storage; do not assume cookies there.

## Common Triggers

- login, logout, refresh, cookie, JWT, `@Public()`, `@Roles()`, `RolesGuard`, forbidden, unauthorized, audit, PII.
