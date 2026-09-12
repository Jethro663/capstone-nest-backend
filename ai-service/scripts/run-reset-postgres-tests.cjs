// Disposable, explicitly local test database. Never print connection secrets.
const { execFileSync, spawnSync } = require('node:child_process');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const container = 'capstone-nest-backend-postgres-1';
const database = `nexora_reset_test_ai_${randomUUID().replaceAll('-', '')}`;
const psql = (sql) => execFileSync('docker', ['exec', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', sql], { stdio: ['ignore', 'pipe', 'pipe'] });
let created = false;
try {
  const password = execFileSync('docker', ['exec', container, 'printenv', 'POSTGRES_PASSWORD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  psql(`CREATE DATABASE ${database}`);
  created = true;
  const result = spawnSync(path.resolve(__dirname, '../.venv/bin/python'), ['-m', 'unittest', '-v', 'tests.test_system_reset_postgres'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, AI_RUNTIME_MODE: 'test', AI_RESET_TEST_DATABASE_URL: `postgresql+asyncpg://postgres:${encodeURIComponent(password)}@127.0.0.1:5432/${database}` },
    stdio: 'inherit',
  });
  process.exitCode = result.status ?? 1;
} finally {
  if (created) psql(`DROP DATABASE ${database} WITH (FORCE)`);
}
