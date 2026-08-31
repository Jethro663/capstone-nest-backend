// Run only against disposable local services after applying migrations.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { createServer } = require('node:net');
const path = require('node:path');

async function main() {
  const database = new URL(process.env.DATABASE_URL);
  const redis = new URL(process.env.REDIS_URL);
  for (const url of [database, redis]) {
    assert(
      ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname),
      'Smoke services must be local',
    );
  }
  assert(
    database.pathname.startsWith('/nexora_academic_test'),
    'Smoke database must be disposable',
  );
  // The deployed bootstrap binds port 3000. Refuse an occupied port rather than
  // accidentally checking a different process that was already listening.
  const port = 3000;
  const reservation = createServer();
  await new Promise((resolve, reject) =>
    reservation.once('error', reject).listen(port, '127.0.0.1', resolve),
  );
  await new Promise((resolve) => reservation.close(resolve));
  let output = '';
  let exited = false;
  const child = spawn('npm', ['run', 'start:prod'], {
    cwd: path.resolve(__dirname, '..'),
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      JWT_SECRET: randomBytes(32).toString('hex'),
      JWT_REFRESH_SECRET: randomBytes(32).toString('hex'),
      AI_SERVICE_URL: 'http://127.0.0.1:59999',
      OLLAMA_BASE_URL: 'http://127.0.0.1:59998',
      EMAIL_SERVICE: 'disabled',
      EMAIL_USER: '',
      EMAIL_PASSWORD: '',
      OTP_EMAIL_USER: '',
      OTP_EMAIL_PASS: '',
      STORAGE_DRIVER: 'local',
      FRONTEND_URL: 'http://localhost:3001',
      NEXT_FRONTEND_URL: 'http://localhost:3001',
    },
  });
  const capture = (data) => {
    output = (output + data.toString()).slice(-16000);
  };
  child.stdout.on('data', capture);
  child.stderr.on('data', capture);
  child.once('exit', () => {
    exited = true;
  });
  child.once('error', (error) => {
    capture(error.message);
    exited = true;
  });
  try {
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
      if (exited)
        throw new Error(
          `Production startup exited before health passed.\n${output}`,
        );
      if (output.includes('Nest application successfully started')) {
        try {
          const response = await fetch(
            `http://127.0.0.1:${port}/api/health/live`,
            { signal: AbortSignal.timeout(1500) },
          );
          if (response.ok) {
            assert.equal(exited, false);
            console.log(
              'Production startup passed: npm run start:prod and /api/health/live',
            );
            return;
          }
        } catch {
          /* Retry until the owned process is ready. */
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`Production startup timed out.\n${output}`);
  } finally {
    if (child.pid) {
      try {
        process.kill(-child.pid, 'SIGTERM');
      } catch {
        /* Already exited. */
      }
      await Promise.race([
        new Promise((resolve) =>
          exited ? resolve() : child.once('exit', resolve),
        ),
        new Promise((resolve) => setTimeout(resolve, 5000).unref()),
      ]);
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        /* Group already stopped. */
      }
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
