#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { resolveDevComposeBootstrap } = require('./dev-compose-config.cjs');

const backendDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(backendDir, '..');
const aiServiceDir = path.join(repoRoot, 'ai-service');
const composeFilePath = path.join(repoRoot, 'docker-compose.yml');
const composeBootstrap = resolveDevComposeBootstrap(repoRoot);

const AI_READY_TIMEOUT_MS = Number(process.env.AI_BOOTSTRAP_READY_TIMEOUT_MS || 150000);
const AI_READY_POLL_MS = Number(process.env.AI_BOOTSTRAP_READY_POLL_MS || 3000);
const LOCAL_AI_LOG_FILE = path.join(repoRoot, 'ai-service-dev.log');

function log(message) {
  process.stdout.write(`[ai-bootstrap] ${message}\n`);
}

function normalizeAiServiceUrl(rawUrl) {
  const fallbackUrl = 'http://localhost:8000';
  const raw = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  if (!raw) return fallbackUrl;

  const normalized = raw.replace(/\/+$/, '');
  if (/^https?:\/\/ai-service(?::\d+)?$/i.test(normalized)) {
    return fallbackUrl;
  }

  return normalized;
}

function isCommandAvailable(command, args = ['--version']) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'ignore',
    shell: false,
  });

  return !result.error && result.status === 0;
}

async function isAiServiceReady(aiBaseUrl, timeoutMs = 2500) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(`${aiBaseUrl}/ready`, {
      method: 'GET',
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
    clearTimeout(timer);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForAiReadiness(aiBaseUrl, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isAiServiceReady(aiBaseUrl)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, AI_READY_POLL_MS));
  }
  return false;
}

function tryDockerBootstrap() {
  if (!fs.existsSync(composeFilePath)) {
    log(`Docker compose file not found at ${composeFilePath}.`);
    return false;
  }

  if (!fs.existsSync(composeBootstrap.envPath)) {
    log('Skipped Docker bootstrap: root .env is missing (copy .env.compose.example to .env).');
    return false;
  }

  if (!isCommandAvailable('docker', ['compose', 'version'])) {
    log('Skipped Docker bootstrap: docker compose is not available.');
    return false;
  }

  if (!isCommandAvailable('docker', ['info'])) {
    log(
      'Skipped Docker bootstrap: docker daemon is not reachable from this shell (Windows: open terminal as Administrator or add your account to docker-users).',
    );
    return false;
  }

  log('Starting backend dependencies via Docker Compose (postgres + redis + ollama + ai-service)...');
  const result = spawnSync(
    'docker',
    composeBootstrap.args,
    {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: false,
    },
  );

  if (result.error || result.status !== 0) {
    log('Docker bootstrap command failed.');
    return false;
  }

  return true;
}

function resolveLocalPythonCommand() {
  const venvWindows = path.join(aiServiceDir, '.venv', 'Scripts', 'python.exe');
  const venvPosix = path.join(aiServiceDir, '.venv', 'bin', 'python');
  if (fs.existsSync(venvWindows)) return { command: venvWindows, prefixArgs: [] };
  if (fs.existsSync(venvPosix)) return { command: venvPosix, prefixArgs: [] };

  if (isCommandAvailable('python')) return { command: 'python', prefixArgs: [] };
  if (process.platform === 'win32' && isCommandAvailable('py')) {
    return { command: 'py', prefixArgs: ['-3'] };
  }

  return null;
}

function tryLocalAiServiceBootstrap() {
  if (!fs.existsSync(aiServiceDir)) {
    log(`Skipped local bootstrap: ai-service directory not found at ${aiServiceDir}.`);
    return false;
  }

  const python = resolveLocalPythonCommand();
  if (!python) {
    log('Skipped local bootstrap: no Python runtime found (python/py/.venv).');
    return false;
  }

  log(`Starting local ai-service using ${python.command}...`);

  const stdoutFd = fs.openSync(LOCAL_AI_LOG_FILE, 'a');
  const args = [
    ...python.prefixArgs,
    '-m',
    'uvicorn',
    'app.main:app',
    '--host',
    '0.0.0.0',
    '--port',
    '8000',
  ];

  try {
    const child = spawn(python.command, args, {
      cwd: aiServiceDir,
      detached: true,
      stdio: ['ignore', stdoutFd, stdoutFd],
      windowsHide: true,
      shell: false,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      },
    });
    child.unref();
    fs.closeSync(stdoutFd);
    return true;
  } catch (error) {
    fs.closeSync(stdoutFd);
    log(`Local ai-service bootstrap failed: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

function startBackendWatch(env) {
  const nestCliEntry = path.join(
    backendDir,
    'node_modules',
    '@nestjs',
    'cli',
    'bin',
    'nest.js',
  );

  const command = fs.existsSync(nestCliEntry)
    ? process.execPath
    : process.platform === 'win32'
      ? 'npx.cmd'
      : 'npx';
  const args = fs.existsSync(nestCliEntry)
    ? [nestCliEntry, 'start', '--watch']
    : ['nest', 'start', '--watch'];

  const backend = spawn(command, args, {
    cwd: backendDir,
    stdio: 'inherit',
    shell: false,
    env,
  });

  backend.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
}

async function main() {
  const aiBaseUrl = normalizeAiServiceUrl(process.env.AI_SERVICE_URL);
  const runtimeEnv = {
    ...process.env,
    AI_SERVICE_URL: aiBaseUrl,
  };

  // Always attempt to ensure local dependencies are up for backend dev.
  const dockerBootstrapped = tryDockerBootstrap();

  if (await isAiServiceReady(aiBaseUrl)) {
    log(`AI service is already online at ${aiBaseUrl}.`);
    startBackendWatch(runtimeEnv);
    return;
  }

  log(`AI service is offline at ${aiBaseUrl}. Attempting bootstrap...`);
  if (dockerBootstrapped) {
    const ready = await waitForAiReadiness(aiBaseUrl, AI_READY_TIMEOUT_MS);
    if (ready) {
      log('AI service is ready (Docker bootstrap).');
      startBackendWatch(runtimeEnv);
      return;
    }
    log('AI service is not ready yet after Docker bootstrap timeout.');
  }

  const localBootstrapped = tryLocalAiServiceBootstrap();
  if (localBootstrapped) {
    const ready = await waitForAiReadiness(aiBaseUrl, 45000);
    if (ready) {
      log('AI service is ready (local bootstrap).');
      startBackendWatch(runtimeEnv);
      return;
    }
    log('AI service did not become ready after local bootstrap timeout.');
    log(`Check ${LOCAL_AI_LOG_FILE} for ai-service startup logs.`);
  }

  log('Continuing backend startup while AI service remains offline.');
  log('AI features may fail until /ready returns OK.');
  startBackendWatch(runtimeEnv);
}

main().catch((error) => {
  log(`Unexpected bootstrap failure: ${error instanceof Error ? error.stack || error.message : String(error)}`);
  const aiBaseUrl = normalizeAiServiceUrl(process.env.AI_SERVICE_URL);
  startBackendWatch({
    ...process.env,
    AI_SERVICE_URL: aiBaseUrl,
  });
});
