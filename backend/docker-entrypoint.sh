#!/bin/sh
set -e

echo "==> Waiting for PostgreSQL to be ready..."
# Use a simple loop with node to test the connection
until node -e "
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  pool.query('SELECT 1')
    .then(() => { pool.end(); process.exit(0); })
    .catch(() => { pool.end(); process.exit(1); });
" 2>/dev/null; do
  echo "    PostgreSQL not ready yet, retrying in 2s..."
  sleep 2
done
echo "==> PostgreSQL is ready!"

echo "==> Running database migrations..."
if [ "${RUN_DB_MIGRATIONS:-true}" = "true" ]; then
  node run-migrations.js
else
  echo "==> Skipping migrations (RUN_DB_MIGRATIONS=${RUN_DB_MIGRATIONS})"
fi
echo "==> Migrations complete!"

if [ "${RUN_DB_SEED:-false}" = "true" ]; then
  echo "==> Seeding database..."
  node seed-database.js
  echo "==> Seeding complete!"
else
  echo "==> Skipping database seed (RUN_DB_SEED=${RUN_DB_SEED:-false})"
fi

echo "==> Starting NestJS server..."
exec node dist/main
