# Backend Slice

Scope: `backend/` only.

## Rule IDs In Play

- `ARCH-1`, `ARCH-2`, `ARCH-3`, `ARCH-4`
- `AUTH-1`, `AUTH-2`, `VALID-1`, `RESP-1`, `ERR-1`, `AUD-1`
- `DOM-1`, `DOM-3`, `AI-1`, `AI-2`, `AI-3`, `INT-1`, `INT-2`, `REC-1`, `DATA-1`, `DATA-2`

## Entrypoints

- Install: `npm install`
- Dev: `npm run start:dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Unit tests: `npm run test`
- E2E: `npm run test:e2e`
- Boot: `src/main.ts`
- Module graph root: `src/app.module.ts`
- Drizzle config: `drizzle.config.ts`

## Owning Paths

- `src/modules/*`: feature modules, controllers, services, DTOs, listeners, guards
- `src/database/*`: shared `DatabaseService`
- `src/drizzle/schema/*`: schema source of truth
- `drizzle/*`: migrations and snapshots
- `src/common/*`: filters, logger, constants, shared utilities
- `src/config/*`: typed config for DB, JWT, Redis, Ollama

## Working Rules

- Respect `ARCH-1`: controllers route, validate, delegate, and format only.
- Respect `ARCH-2` and `ARCH-3`: services own orchestration and use `private get db() { return this.databaseService.db; }`.
- Respect `RESP-1`: preserve `success/message/data` unless the task explicitly changes the API contract.
- Respect `AUTH-1` and `AUTH-2`: JWT auth is global; role checks stay explicit; `@Public()` must be intentional.
- Respect `VALID-1`: DTOs use `class-validator`; validation assumptions come from `src/main.ts`.
- Respect `AUD-1`: writes to grades, enrollment, interventions, and similar academic surfaces should be auditable.

## Change Workflow

1. Start at the owning feature in `src/modules/<feature>/`.
2. Update DTOs before controller signatures.
3. Keep business logic in the service and persistence in Drizzle calls through `DatabaseService`.
4. Update `src/drizzle/schema/*` plus `drizzle/*` when the persistent model changes.
5. Register feature wiring in `<feature>.module.ts`; only touch `AppModule` for top-level wiring.
6. If the API contract changes, trace impact into `next-frontend` or `test-mobile`.

## Current Repo Anchors

- Global guards and filter: `GlobalExceptionFilter`, `JwtAuthGuard`, `ThrottlerGuard` in `src/app.module.ts`
- Global `/api` prefix, validation, cookie parser, CORS, Swagger gating: `src/main.ts`
- AI proxy boundary: `src/modules/ai-mentor/ai-proxy.service.ts`
- LXP and performance eligibility logic: `src/modules/lxp`, `src/modules/performance`
- Audit logging: `src/modules/audit`

## Do Not Break

- `DOM-3`: LXP never writes official class records.
- `AI-1` and `AI-3`: AI features stay read-only for official records and log separately.
- `INT-1` and `INT-2`: intervention activation remains approved and history remains append-only.
- `REC-1`: reviewed assessment scores are not casually mutable.
- `DATA-1` and `DATA-2`: do not introduce stale stored totals or stale eligibility flags.

## Verification

- Prefer targeted specs under `src/modules/**/**/*.spec.ts`.
- Run `npm run build` after structural backend edits.
- Run `npm run lint` after TypeScript refactors.
- Run `npm run test` and `npm run test:e2e` when behavior changes are broad or high risk.
