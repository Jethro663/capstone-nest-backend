const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

function resolvePort(argv) {
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if ((current === '-p' || current === '--port') && argv[index + 1]) {
      return argv[index + 1];
    }
  }
  return process.env.PORT || '3000';
}

const port = resolvePort(process.argv.slice(2));
const projectRoot = path.join(__dirname, '..');
const standaloneRoot = path.join(projectRoot, '.next', 'standalone');
const serverEntry = path.join(standaloneRoot, 'server.js');
const localNextCli = path.join(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next');

function syncDirectory(source, destination) {
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true, force: true });
}

syncDirectory(path.join(projectRoot, '.next', 'static'), path.join(standaloneRoot, '.next', 'static'));
syncDirectory(path.join(projectRoot, 'public'), path.join(standaloneRoot, 'public'));

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      ...options,
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`Process exited due to signal: ${signal}`));
        return;
      }
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Process exited with code ${code}`));
    });
  });
}

async function ensureStandaloneBuild() {
  if (fs.existsSync(serverEntry)) return;
  console.log('[start] Missing .next/standalone/server.js, running build...');
  await run('cmd.exe', ['/c', 'npm.cmd', 'run', 'build'], { cwd: projectRoot });
  if (!fs.existsSync(serverEntry)) {
    throw new Error(
      'Build completed but .next/standalone/server.js was not generated. ' +
        'Check next.config output settings and build logs.',
    );
  }
}

async function main() {
  try {
    await ensureStandaloneBuild();
  } catch (error) {
    console.error(`[start] ${error.message}`);
    process.exit(1);
  }

  syncDirectory(path.join(projectRoot, '.next', 'static'), path.join(standaloneRoot, '.next', 'static'));
  syncDirectory(path.join(projectRoot, 'public'), path.join(standaloneRoot, 'public'));

  const child = spawn(process.execPath, [serverEntry], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: port,
    },
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
}

main();
