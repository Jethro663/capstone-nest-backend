#!/bin/sh
set -e

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set. Aborting startup."
  exit 1
fi

print_dsn_context() {
  node -e "
    const raw = process.env.DATABASE_URL || '';
    try {
      const u = new URL(raw);
      const dbName = u.pathname.replace(/^\//, '') || '(empty)';
      console.log('    protocol=' + (u.protocol || '(missing)'));
      console.log('    user=' + (u.username || '(missing)'));
      console.log('    host=' + (u.hostname || '(missing)'));
      console.log('    port=' + (u.port || '(default)'));
      console.log('    database=' + dbName);
      if (raw.includes('@') && !u.password) {
        console.log('    note=DATABASE_URL appears malformed. Check URL encoding for the password.');
      }
    } catch (err) {
      console.log('    parse_error=' + (err && err.message ? err.message : String(err)));
      console.log('    hint=Ensure DATABASE_URL is a valid URL and password special characters are URL-encoded.');
    }
  "
}

db_ping_once() {
  node -e "
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    pool.query('SELECT 1')
      .then(() => pool.end().then(() => process.exit(0)))
      .catch((err) => {
        const payload = {
          code: err && err.code ? err.code : '',
          message: err && err.message ? err.message : String(err),
        };
        console.log(JSON.stringify(payload));
        pool.end().finally(() => process.exit(1));
      });
  "
}

echo "==> Waiting for PostgreSQL to be ready..."
echo "    Connection context:"
print_dsn_context

MAX_ATTEMPTS="${DB_PRECHECK_MAX_ATTEMPTS:-30}"
case "$MAX_ATTEMPTS" in
  ''|*[!0-9]*|0)
  echo "WARN: DB_PRECHECK_MAX_ATTEMPTS is invalid. Falling back to 30."
  MAX_ATTEMPTS=30
  ;;
esac

attempt=1
LAST_DB_ERROR=""
while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
  if RESULT="$(db_ping_once 2>/dev/null)"; then
    echo "==> PostgreSQL is ready!"
    LAST_DB_ERROR=""
    break
  fi

  LAST_DB_ERROR="$RESULT"
  echo "    PostgreSQL not ready/authenticated yet (attempt $attempt/$MAX_ATTEMPTS). Retrying in 2s..."
  attempt=$((attempt + 1))
  sleep 2
done

if [ -n "$LAST_DB_ERROR" ]; then
  echo "ERROR: Could not connect/authenticate to PostgreSQL after $MAX_ATTEMPTS attempts."
  echo "    Last error: $LAST_DB_ERROR"
  echo "    Likely causes:"
  echo "    - Stale credentials in Docker volume 'postgres_data' (password changed after first init)."
  echo "    - DATABASE_URL password has special characters not URL-encoded."
  echo "    - DATABASE_URL points to the wrong host/database/user."
  echo "    Suggested next steps:"
  echo "    1) Confirm POSTGRES_PASSWORD, BACKEND_DATABASE_URL, and AI_DATABASE_URL are aligned."
  echo "    2) URL-encode password characters such as @ : / ? # [ ] in DATABASE_URL."
  echo "    3) If password changed, reset DB volume intentionally:"
  echo "       docker compose down"
  echo "       docker volume rm capstone-nest-react-lms_postgres_data"
  echo "       docker compose --env-file .env.compose up --build"
  exit 1
fi

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
