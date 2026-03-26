# Schema Slice

Load this only for DB-shape or contract-shape work.

## Source Of Truth

- Persistent schema: `backend/src/drizzle/schema/*`
- Migrations: `backend/drizzle/*`
- Backend wiring root: `backend/src/app.module.ts`
- Client contracts most likely to drift: `next-frontend/src/types/*`, `next-frontend/src/services/*`, `test-mobile/src/types/*`, `test-mobile/src/api/services/*`

## Workflow

1. Update the owning schema file under `backend/src/drizzle/schema/`.
2. Keep enum and column names aligned with runtime DTOs and client types.
3. Add or update the corresponding migration under `backend/drizzle/` for persistent changes.
4. Trace downstream contract impact in frontend or mobile only if the changed fields cross the API boundary.

## Schema Guardrails

- Respect `DATA-1`: avoid treating computed totals as authoritative stored fields.
- Respect `DATA-2`: do not introduce a permanent stale LXP-eligibility flag.
- Respect `AI-3`: AI logs stay separate from official academic record tables.
- Respect `INT-2`: intervention history is append-only.
- Preserve indexes and query performance on fields used in `WHERE`, `JOIN`, or `ORDER BY`.

## Common Triggers

- Add table, add column, enum update, migration failure, response shape mismatch, query regression.
