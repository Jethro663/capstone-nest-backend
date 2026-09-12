// Creates and removes only its own disposable local database. Never point reset
// rehearsals at the normal development database or a remote/production service.
const { Client } = require('pg');
const { randomBytes } = require('node:crypto');
const { spawn } = require('node:child_process');
const path = require('node:path');

async function child(args, env) {
  await new Promise((resolve, reject) => {
    const process = spawn(global.process.execPath, args, {
      cwd: path.join(__dirname, '..'),
      env,
      stdio: 'inherit',
    });
    process.once('error', reject);
    process.once('close', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Rehearsal command failed (exit ${code})`)),
    );
  });
}

async function main() {
  const value = process.env.RESET_TEST_ADMIN_DATABASE_URL;
  if (!value)
    throw new Error(
      'Set RESET_TEST_ADMIN_DATABASE_URL to a local PostgreSQL postgres database with CREATE DATABASE permission.',
    );
  const adminUrl = new URL(value);
  if (
    !['127.0.0.1', 'localhost', '[::1]'].includes(adminUrl.hostname) ||
    adminUrl.pathname !== '/postgres'
  )
    throw new Error(
      'Rehearsals require a local /postgres administrative connection. Remote hosts are refused.',
    );
  const databaseName = `nexora_reset_test_${Date.now()}_${randomBytes(4).toString('hex')}`;
  if (!/^nexora_reset_test_[0-9]+_[a-f0-9]{8}$/.test(databaseName))
    throw new Error('Invalid disposable database name');
  const admin = new Client({ connectionString: adminUrl.toString() });
  let created = false;
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    created = true;
    console.log(`Created disposable reset rehearsal database: ${databaseName}`);
    const testUrl = new URL(adminUrl);
    testUrl.pathname = `/${databaseName}`;
    const env = {
      ...process.env,
      DATABASE_URL: testUrl.toString(),
      RESET_TEST_DATABASE_URL: testUrl.toString(),
      NODE_ENV: 'test',
    };
    // Do not pass the administrative connection on to the application/tests.
    delete env.RESET_TEST_ADMIN_DATABASE_URL;
    await child(['run-migrations.js'], env);
    await child(
      [
        'node_modules/jest/bin/jest.js',
        '--config',
        'test/jest-system-reset-integration.json',
        '--runInBand',
      ],
      env,
    );
    if (process.env.RESET_TEST_STARTUP_SMOKE === '1') {
      await child(['scripts/smoke-production-start.cjs'], {
        ...env,
        REDIS_URL: process.env.RESET_TEST_REDIS_URL,
        SYSTEM_RESET_ENABLED: 'false',
      });
    }
  } finally {
    try {
      if (created) {
        // No FORCE: unexpected surviving connections should be investigated.
        await admin.query(`DROP DATABASE "${databaseName}"`);
        console.log(
          `Removed disposable rehearsal database: ${databaseName} (test fixtures only).`,
        );
      }
    } finally {
      await admin.end();
    }
  }
}

main().catch((error) => {
  // Do not print connection strings, environment or raw pg connection errors.
  console.error(
    error instanceof Error
      ? error.message.replace(
          /postgres(?:ql)?:\/\/\S+/g,
          '[redacted database URL]',
        )
      : 'Reset rehearsal failed',
  );
  process.exitCode = 1;
});
