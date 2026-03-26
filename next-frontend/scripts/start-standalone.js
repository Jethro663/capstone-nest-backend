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

function syncDirectory(source, destination) {
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true, force: true });
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
