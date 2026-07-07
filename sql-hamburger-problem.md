# Drizzle Migration Hamburger Cleanup Execution Checklist

## Objective
Replace the current split-brain migration system with a clean, forward-only baseline workflow that is safe for Railway and easy to extend as the system grows.

## Known Failure Patterns We Are Preventing
- **Branch merge collisions**: multiple developers generate migrations from the same parent snapshot, producing duplicate prefixes and journal conflicts.
- **Journal drift**: manual SQL or `push`-style changes bypass the normal migration journal, so schema truth, snapshots, and applied history diverge.
- **Unsafe baseline replay**: a new baseline migration is accidentally executed against an already-populated production database.
- **Mixed migration authorities**: runtime uses one mechanism while docs or local habits use another.

These match the repo’s current problems exactly.

## Locked Rollout Decisions
- Use a staging or staging-like Railway environment first.
- Require a fresh DB backup before production cutover.
- Use an **explicit env-flag-based baseline stamp** for deployed databases.
- Keep legacy migrations only as **historical reference** in Git.
- Add **strict guardrails** after cleanup.

## High-Level End State
- `backend/src/drizzle/schema/*.ts` is the only schema source of truth.
- `backend/drizzle/` contains one clean active baseline plus future forward-only migrations.
- `backend/drizzle-archive/` contains the legacy hamburger for historical reference only.
- `backend/run-migrations.js` applies **journal-listed active migrations only**.
- Existing Railway DBs receive a one-time baseline stamp and never replay baseline DDL.

## Phase A: Pre-Cutover Audit
### A1. Inventory current state
- [ ] Record the current active migration count in `backend/drizzle/`.
- [ ] Record the current journal entries in `backend/drizzle/meta/_journal.json`.
- [ ] Record the duplicate numeric prefixes present in legacy migrations.
- [ ] Record whether staging and production both have `_applied_migrations` rows.

### A2. Confirm the real deployment contract
- [ ] Verify `backend/docker-entrypoint.sh` is the migration path used on Railway.
- [ ] Verify Railway deploys `backend/` directly and runs `node run-migrations.js` on startup.
- [ ] Confirm no separate migration job exists in CI/CD.

### A3. Perform zero-drift audit
- [ ] Compare `backend/src/drizzle/schema/*.ts` against a live staging database schema.
- [ ] Compare schema files against legacy SQL files that include structural changes.
- [ ] Identify legacy files that are **data repairs/backfills only** and must never be replayed on populated DBs.
- [ ] Update the plan notes with every confirmed schema drift item before baseline generation.

## Phase B: Backup And Rehearsal Safety
### B1. Backup prerequisites
- [ ] Take a fresh backup/export of the staging database before rehearsal.
- [ ] Define the exact backup/restore method that will also be used for production.

### B2. Rehearsal prerequisites
- [ ] Prepare a disposable Railway-like staging environment.
- [ ] Confirm it is populated enough to exercise legacy `_applied_migrations` behavior.
- [ ] Define success criteria for rehearsal:
  - [ ] baseline is stamped, not replayed
  - [ ] app starts successfully
  - [ ] a fresh DB still bootstraps from the new baseline

## Phase C: Prepare The New Active Migration Line
### C1. Archive the hamburger
- [ ] Move all current active migration SQL files from `backend/drizzle/` into a committed archive path such as `backend/drizzle-archive/legacy-squash-cutover/`.
- [ ] Move all current active `backend/drizzle/meta/*` files into the same archive path.
- [ ] Keep the archive committed in Git but out of active Drizzle discovery.

### C2. Generate a clean baseline
- [ ] Generate one new baseline migration from the audited schema in `backend/src/drizzle/schema/*.ts`.
- [ ] Regenerate a fresh active `backend/drizzle/meta/_journal.json`.
- [ ] Ensure the active migration directory contains only:
  - [ ] the new baseline SQL file
  - [ ] the new snapshot file
  - [ ] no legacy extras

### C3. Baseline naming and metadata
- [ ] Use a clear, permanent baseline filename such as `0000_baseline_nexora.sql`.
- [ ] Ensure the journal tag exactly matches the baseline filename contract expected by the runner.

## Phase D: Refactor The Custom Runner
### D1. Remove split-brain behavior
- [ ] Remove the `discoverMigrationFiles()` behavior that applies non-journal extra `.sql` files.
- [ ] Make the runner apply only active journal-listed migrations.
- [ ] Make missing journal files a hard error rather than a silent skip unless an intentional exception is documented.

### D2. Keep deployed-state compatibility
- [ ] Keep `_applied_migrations` as the authoritative deployed history table for this cutover.
- [ ] Do not switch to a different migration history table during the same cleanup.

### D3. Add explicit baseline stamp mode
- [ ] Add an env-flag-based cutover mode, for example:
  - `MIGRATION_BASELINE_STAMP_TAG=0000_baseline_nexora.sql`
  - optional `MIGRATION_BASELINE_STAMP_ONLY=true`
- [ ] In stamp mode:
  - [ ] verify `_applied_migrations` already contains legacy rows
  - [ ] verify the database is not empty
  - [ ] insert the new baseline filename into `_applied_migrations`
  - [ ] do **not** execute baseline DDL
- [ ] Make stamp mode fail loudly if the DB looks empty or unmanaged.

### D4. Protect normal startup
- [ ] Ensure normal startup after cutover still runs migrations with `RUN_DB_MIGRATIONS=true`.
- [ ] Ensure fresh DBs without prior history execute the baseline normally.

## Phase E: Staging Rehearsal
### E1. Existing populated staging DB
- [ ] Deploy the runner changes and new baseline to staging.
- [ ] Run the explicit baseline stamp mode once.
- [ ] Verify the baseline filename is recorded in `_applied_migrations`.
- [ ] Verify no baseline DDL was replayed.
- [ ] Verify the backend starts successfully after the stamp.

### E2. Fresh empty DB rehearsal
- [ ] Start from an empty disposable database.
- [ ] Run normal migration startup.
- [ ] Verify the baseline creates the entire schema cleanly.
- [ ] Verify the baseline is recorded in `_applied_migrations`.

### E3. Forward-migration rehearsal
- [ ] Create one test migration after the new baseline.
- [ ] Verify:
  - [ ] fresh DBs apply baseline then the new migration
  - [ ] stamped populated DBs skip baseline and apply only the new migration

## Phase F: Production / Railway Cutover
### F1. Before deployment
- [ ] Take a fresh production/Railway DB backup.
- [ ] Confirm staging rehearsal passed with the same runner behavior and flags.
- [ ] Freeze schema-changing merges during the cutover window.

### F2. Deployment sequence
- [ ] Deploy code containing:
  - [ ] archived legacy migrations
  - [ ] new active baseline
  - [ ] refactored runner
  - [ ] cutover env flag support
- [ ] Run the explicit baseline stamp mode against the deployed populated DB.
- [ ] Remove or disable the stamp flag after successful one-time execution.
- [ ] Restart with normal migration startup.

### F3. Production verification
- [ ] Confirm `_applied_migrations` includes the new baseline filename.
- [ ] Confirm no schema recreation occurred.
- [ ] Confirm application boot is healthy.
- [ ] Confirm the next real migration after baseline applies normally in a controlled follow-up.

## Phase G: Hard Guardrails So This Never Returns
### G1. Authoring rules
- [ ] All schema changes start in `backend/src/drizzle/schema/*.ts`.
- [ ] Active DB changes must come from generated migrations, not ad hoc SQL dropped into `backend/drizzle/`.
- [ ] Do not use `drizzle-kit push` on shared or deployed environments.
- [ ] Do not edit applied active migrations.

### G2. Branch workflow rules
- [ ] Before generating a migration, rebase or merge the latest main/development branch first.
- [ ] If two branches generated conflicting migration prefixes, regenerate on the later branch instead of keeping both.
- [ ] Treat journal conflicts as a regeneration event, not a hand-editing exercise.

### G3. Repo and CI guardrails
- [ ] Add a documented migration checklist to PR expectations.
- [ ] Add a CI/static check that fails if active `.sql` files exist outside the active journal contract.
- [ ] Add a CI/static check that fails if duplicate active migration prefixes appear.
- [ ] Add a CI/static check that fails if archive files are referenced by the active runner.
- [ ] Update docs so all setup paths point to the same migration authority.

## Files Expected To Change During Execution
- `backend/run-migrations.js`
- `backend/docker-entrypoint.sh`
- `backend/drizzle/`
- `backend/drizzle/meta/`
- new `backend/drizzle-archive/...`
- `backend/src/drizzle/schema/*.ts` if drift is found
- `backend/BACKEND_SETUP.md`
- optional deployment docs / Railway notes

## Risks To Watch Closely
- A hidden schema change exists in production but not in TypeScript schema.
- A legacy data-repair migration accidentally gets replayed.
- Stamp mode is run against an empty DB.
- A developer later reintroduces manual SQL extras into active `backend/drizzle/`.

## Success Criteria
- Fresh databases bootstrap from one clean baseline.
- Existing Railway databases do not replay baseline DDL.
- Future migrations follow one active forward-only line.
- No more mixed journal-plus-extras behavior.
- Team workflow makes migration expansion predictable instead of fragile.
