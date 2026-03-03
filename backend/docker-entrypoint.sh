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
node run-migrations.js
echo "==> Migrations complete!"

echo "==> Seeding database..."
node seed-database.js
echo "==> Seeding complete!"

echo "==> Starting NestJS server..."
exec node dist/main
