# Backend Agent Guide

## Purpose
- Scope: `backend/` only.
- Stack: NestJS 11, Drizzle ORM, PostgreSQL, BullMQ, EventEmitter, Swagger, JWT auth.
- Role: system boundary for auth, RBAC, HTTP API, queue/event orchestration, database writes, AI proxying.

## Entrypoints / run commands
- Install: `npm install`
- Dev: `npm run start:dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Unit tests: `npm run test`
- E2E: `npm run test:e2e`
- Drizzle config: `drizzle.config.ts`
- App boot: `src/main.ts`
- Module graph root: `src/app.module.ts`

## Architecture / folder map
- `src/modules/*`: feature modules; default place for controllers, services, DTOs, listeners, guards.
- `src/database/*`: shared `DatabaseService`; inject this, do not create ad hoc pools.
- `src/drizzle/schema/*`: schema source of truth; update here when data model changes.
- `src/config/*`: typed config loaders for DB, JWT, Redis, Ollama.
- `src/common/*`: shared filters, logger, utils, events, constants.
- `drizzle/*`: SQL migrations and meta snapshots.
- Major modules currently wired in `AppModule`: auth, users, roles, otp, sections, classes, lessons, assessments, profiles, admin, teacher, health, metrics, file-upload, roster-import, class-record, announcements, notifications, ai-mentor, performance, lxp, teacher-profiles, audit, reports, analytics, rag.

## Change workflow
- Start at the owning feature under `src/modules/<feature>`.
- Route/validation/auth in controller, business logic in service, persistence via `DatabaseService`.
- Add/update DTOs before controller signatures.
- Update schema in `src/drizzle/schema/*` when table shape changes.
- Add SQL migration in `drizzle/*` for persistent schema changes.
- Register new feature wiring in `<feature>.module.ts`; add to `AppModule` only for top-level modules.
- If mobile or frontend contract changes, keep response envelopes and field names compatible.

## Patterns to follow
- Controllers delegate only; no business rules or raw DB access there.
- Services use `private get db() { return this.databaseService.db; }` pattern.
- Responses use envelope style: `success`, `message`, `data`.
- Validation is global in `src/main.ts`; DTOs should use `class-validator`.
- Global prefix is `/api`.
- Global guards already apply JWT auth and throttling; add `@Public()` only when intentionally unauthenticated.
- Role checks use `@Roles(...)` plus `RolesGuard`.
- Web auth uses httpOnly refresh cookie flows in `auth.controller.ts`.
- Mobile auth uses `/auth/mobile/*` token flows; never assume cookies for mobile.
- AI access stays behind Nest auth/RBAC; `AiProxyService` forwards headers to Python service.

## Do not break / invariants
- `src/main.ts` boot contract: validation pipe, CORS, cookie parser, metrics interceptor, Swagger only outside production, global `/api`.
- `AppModule` global providers: `GlobalExceptionFilter`, `JwtAuthGuard`, `ThrottlerGuard`.
- No direct cross-module private internals; use exported services/interfaces.
- Preserve academic record integrity: no unofficial writes to class records, grades, enrollments, intervention history.
- LXP eligibility is computed; avoid storing stale flags without recalculation logic.
- AI features stay read-only for official records; logging belongs in dedicated AI/audit tables.
- Keep error semantics aligned with Nest exceptions and existing status codes.

## Where to add or modify code
- New endpoint in existing domain: update `src/modules/<feature>/<feature>.controller.ts`, service, DTOs, tests.
- New DB tables/columns: `src/drizzle/schema/*` plus `drizzle/*.sql`.
- Shared auth/role behavior: `src/modules/auth/*`.
- AI-to-Python proxy behavior: `src/modules/ai-mentor/ai-proxy.service.ts` and controller/DTOs in the same module.
- Queue processors / async jobs: BullMQ-backed modules such as notifications or rag.
- Shared utilities or app-wide behavior: `src/common/*`, `src/config/*`, `src/main.ts`, `src/app.module.ts`.

## Validation / tests
- Prefer targeted spec updates in the touched module: `src/modules/**/**/*.spec.ts`.
- Full backend smoke checks: `npm run test`, `npm run test:e2e`, `npm run build`.
- Run `npm run lint` after structural TypeScript changes.
- For schema changes, verify migration + schema file stay aligned.

## Cross-service touchpoints
- `next-frontend` and `test-mobile` consume this API; preserve envelope and auth contracts unless coordinated.
- `ai-service` is internal; backend owns auth, RBAC, timeout policy, and forwarded headers.
- File uploads and AI extraction share backend-managed upload paths and DB records.
- Mobile auth depends on `/auth/mobile/login`, `/auth/mobile/refresh`, `/auth/mobile/logout`.
