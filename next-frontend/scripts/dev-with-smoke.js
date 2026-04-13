const { spawn } = require('child_process');
const http = require('http');

const PORT = Number(process.env.PORT || 3001);
const SMOKE_PATH = '/api/health/live';
const MAX_ATTEMPTS = 15;
const RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 3000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function checkHealth() {
  return new Promise((resolve, reject) => {
    const request = http.get(
      {
        host: '127.0.0.1',
        port: PORT,
        path: SMOKE_PATH,
        timeout: REQUEST_TIMEOUT_MS,
      },
      (response) => {
        if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.statusCode);
          return;
        }

        reject(
          new Error(`Smoke check returned status ${response.statusCode ?? 'unknown'}`),
        );
      },
    );

    request.on('timeout', () => {
      request.destroy(new Error('Smoke check request timed out'));
    });

    request.on('error', (error) => {
      reject(error);
    });
  });
}

async function runSmokeCheck() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const status = await checkHealth();
      console.log(
        `[dev-smoke] OK ${SMOKE_PATH} -> ${status} (attempt ${attempt}/${MAX_ATTEMPTS})`,
      );
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `[dev-smoke] attempt ${attempt}/${MAX_ATTEMPTS} failed: ${message}`,
      );
      await sleep(RETRY_DELAY_MS);
    }
  }

  console.error(
    `[dev-smoke] failed: ${SMOKE_PATH} did not become healthy on http://127.0.0.1:${PORT}`,
  );
}

const devCommand =
  process.platform === 'win32'
    ? ['cmd.exe', ['/c', 'npx', 'next', 'dev', '--webpack', '-p', String(PORT)]]
    : ['npx', ['next', 'dev', '--webpack', '-p', String(PORT)]];

const child = spawn(devCommand[0], devCommand[1], {
  shell: false,
  stdio: ['inherit', 'pipe', 'pipe'],
  env: process.env,
});

let smokeStarted = false;
const onOutput = (chunk) => {
  const text = chunk.toString();
  process.stdout.write(text);

  if (!smokeStarted && text.includes('Ready in')) {
    smokeStarted = true;
    void runSmokeCheck();
  }
};

child.stdout.on('data', onOutput);
child.stderr.on('data', (chunk) => process.stderr.write(chunk.toString()));
child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(1);
    return;
  }
  process.exit(code ?? 0);
});
