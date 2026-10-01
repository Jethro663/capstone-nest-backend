NEXORA DOCUMENTATION DEMO DATA
==============================

Purpose
-------
This fixture creates synthetic records for manual screenshots, training, and
offline demonstrations. It must never be pointed at a school, production, or
shared database. No real learner, teacher, guardian, or school record is used.

Safety rules
------------
1. Use only a database running on localhost or 127.0.0.1.
2. The database name must begin with nexora_docs_.
3. Supply credentials through environment variables. Do not write them here.
4. Apply all migrations before seeding.
5. Keep ADMIN_MAINTENANCE_ENABLED, ADMIN_LIFECYCLE_ENABLED,
   ADMIN_CASCADE_ERASE_ENABLED, and SYSTEM_RESET_ENABLED set to false.

Required environment variables
------------------------------
NEXORA_DOC_DATABASE_URL       Full local PostgreSQL URL for nexora_docs_*.
NEXORA_DOC_ACCOUNT_PASSWORD   Temporary password for every synthetic account.
NEXORA_DOC_DB_PASSWORD        Password used by the disposable Compose database.

Create the isolated services
----------------------------
From the repository root:

  docker compose -p nexora-docs-manual \
    -f scripts/handoff/demo-data/docker-compose.docs.yml config --quiet

  docker compose -p nexora-docs-manual \
    -f scripts/handoff/demo-data/docker-compose.docs.yml up -d

Wait until both services are healthy. Then apply migrations with the backend's
run-migrations.js while DATABASE_URL points to the same disposable database.

Seed and verify
---------------
  node scripts/handoff/demo-data/seed-documentation-data.mjs
  node scripts/handoff/demo-data/verify-documentation-data.mjs

Run the seeder a second time and verify again. The fixed synthetic IDs make the
operation idempotent: existing records are updated instead of duplicated.

Synthetic sign-in identities
----------------------------
docs.admin@nexora.local      Administrator
docs.teacher@nexora.local    Teacher
docs.learner@nexora.local    Learner with returned work and intervention data
docs.learner2@nexora.local   Learner with successful performance data

Use the password supplied through NEXORA_DOC_ACCOUNT_PASSWORD. Do not reuse a
real password. Delete or rotate this temporary value after capture work.

Stop condition
--------------
Stop immediately if the host is not local, the database name does not begin
with nexora_docs_, migration verification fails, or any screen shows real data.
