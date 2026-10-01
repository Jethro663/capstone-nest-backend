#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadHandoffConfig } from './lib/config.mjs';
import { assertSafeOutputPath } from './lib/fs-safety.mjs';
import { verifyLocalLinks } from './verify-local-links.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '../..');
const textExtensions = new Set([
  '.c', '.cjs', '.conf', '.css', '.csv', '.env', '.example', '.h', '.html', '.ini',
  '.java', '.js', '.json', '.jsx', '.kt', '.kts', '.md', '.mjs', '.properties', '.ps1',
  '.py', '.sh', '.sql', '.svg', '.toml', '.ts', '.tsx', '.txt', '.xml', '.yaml', '.yml',
]);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr || result.stdout}`);
  return result.stdout;
}

async function sha256(file) {
  return createHash('sha256').update(await readFile(file)).digest('hex');
}

async function filesUnder(root, directory = root) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await filesUnder(root, absolute));
    if (entry.isFile()) result.push(path.relative(root, absolute).split(path.sep).join('/'));
  }
  return result;
}

function isTextCandidate(file, size) {
  if (size > 5_000_000) return false;
  const base = path.basename(file);
  return textExtensions.has(path.extname(file).toLowerCase())
    || base.startsWith('.env')
    || ['Dockerfile', 'Makefile'].includes(base);
}

const forbidden = [
  ['documentation capture password', /NexoraDocsCapture2026!/],
  ['private email used during capture', /jethrojosephfida@gmail\.com/i],
  ['private key block', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['AWS access key', /AKIA[0-9A-Z]{16}/],
  ['GitHub token', /gh[pousr]_[A-Za-z0-9]{20,}/],
  ['OpenAI-style secret key', /sk-(?:proj-)?[A-Za-z0-9_-]{24,}/],
];

async function scanText(root, label) {
  const hits = [];
  for (const relative of await filesUnder(root)) {
    const absolute = path.join(root, relative);
    const info = await stat(absolute);
    if (!isTextCandidate(relative, info.size)) continue;
    const content = await readFile(absolute, 'utf8');
    for (const [name, pattern] of forbidden) {
      if (pattern.test(content)) hits.push(`${label}:${relative} (${name})`);
    }
    if (/\/home\/[A-Za-z0-9._-]+\//.test(content) || /[A-Za-z]:\\Users\\[^\\\r\n]+\\/.test(content)) {
      hits.push(`${label}:${relative} (machine-specific absolute path)`);
    }
  }
  return hits;
}

async function verify() {
  const config = await loadHandoffConfig(repoRoot);
  const root = assertSafeOutputPath(repoRoot, path.join(repoRoot, 'output', config.packageName));
  const required = [
    'START-HERE.html', 'README-FIRST.txt', 'VERSION.txt', 'MANIFEST.sha256',
    config.manuals.userPdf, config.manuals.userDocx, config.manuals.systemPdf, config.manuals.systemDocx,
    '02-QUICK-START/Windows-Quick-Start.pdf', '02-QUICK-START/Linux-Quick-Start.pdf',
    '02-QUICK-START/First-Run-Checklist.pdf', '02-QUICK-START/Troubleshooting-Decision-Tree.pdf',
    '03-SOURCE/nexora-source-211483f.zip', config.apk.destination,
    '04-MOBILE/Android-Install-Guide.pdf', '05-CONFIG-TEMPLATES/configuration-reference.pdf',
    '06-DATABASE-AND-RECOVERY/Backup-and-Restore-Runbook.pdf',
    '06-DATABASE-AND-RECOVERY/Disaster-Recovery-Checklist.pdf',
    '09-DEPLOYMENT-EVIDENCE/SNAPSHOT-EVIDENCE.md',
    '10-LICENSES-AND-NOTICES/NEXORA-LICENSE-NOTICE.txt',
  ];
  for (const relative of required) {
    const info = await stat(path.join(root, relative));
    if (!info.isFile() || info.size === 0) throw new Error(`Missing or empty required file: ${relative}`);
  }

  const manifestLines = (await readFile(path.join(root, 'MANIFEST.sha256'), 'utf8')).trim().split('\n');
  const manifestPaths = [];
  for (const line of manifestLines) {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    if (!match) throw new Error(`Malformed manifest line: ${line}`);
    const [, expected, relative] = match;
    manifestPaths.push(relative);
    if (await sha256(path.join(root, relative)) !== expected) throw new Error(`Checksum mismatch: ${relative}`);
  }
  const actualPaths = (await filesUnder(root)).filter((item) => item !== 'MANIFEST.sha256').sort();
  if (JSON.stringify(manifestPaths) !== JSON.stringify(actualPaths)) throw new Error('Manifest path set does not match package files.');

  const apkFiles = actualPaths.filter((item) => /\.(apk|aab|ipa)$/i.test(item));
  if (JSON.stringify(apkFiles) !== JSON.stringify([config.apk.destination])) throw new Error(`Unexpected mobile binaries: ${apkFiles.join(', ')}`);
  const apk = path.join(root, config.apk.destination);
  if ((await stat(apk)).size !== config.apk.sizeBytes || await sha256(apk) !== config.apk.sha256) throw new Error('Packaged APK identity mismatch.');

  const sourceArchive = path.join(root, '03-SOURCE/nexora-source-211483f.zip');
  const sourceEntries = run('unzip', ['-Z1', sourceArchive]).split('\n').filter(Boolean);
  const forbiddenSourceEntries = sourceEntries.filter((entry) =>
    /(^|\/)(node_modules|\.npm-cache|redis-binaries)(\/|$)/.test(entry) || /\.(apk|aab|ipa)$/i.test(entry));
  if (forbiddenSourceEntries.length) throw new Error(`Source archive contains excluded artifacts: ${forbiddenSourceEntries.slice(0, 5).join(', ')}`);

  const links = await verifyLocalLinks(root, 'START-HERE.html');
  if (links.absolutePaths.length || links.missingTargets.length || links.remoteAssets.length) throw new Error(`Portable links failed: ${JSON.stringify(links)}`);

  const temporary = await mkdtemp(path.join(os.tmpdir(), 'nexora-source-scan-'));
  let scanHits = [];
  try {
    run('unzip', ['-q', sourceArchive, '-d', temporary]);
    scanHits = [...await scanText(root, 'package'), ...await scanText(temporary, 'source')];
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
  if (scanHits.length) throw new Error(`Credential/portability scan failed:\n${scanHits.join('\n')}`);

  let packageBytes = 0;
  for (const relative of await filesUnder(root)) packageBytes += (await stat(path.join(root, relative))).size;
  if (packageBytes > config.maxBytes) throw new Error(`Package is larger than ${config.maxBytes} bytes.`);

  const expectedPages = new Map([[config.manuals.userPdf, 144], [config.manuals.systemPdf, 147]]);
  for (const [relative, expected] of expectedPages) {
    const info = run('pdfinfo', [path.join(root, relative)]);
    const pages = Number(info.match(/^Pages:\s+(\d+)$/m)?.[1]);
    if (pages !== expected || !/^Page size:\s+595(?:\.\d+)? x 841(?:\.\d+)? pts \(A4\)$/m.test(info)) {
      throw new Error(`Unexpected PDF geometry for ${relative}: ${pages} pages.`);
    }
  }

  process.stdout.write(JSON.stringify({
    status: 'PASS', files: actualPaths.length + 1, manifestEntries: manifestPaths.length,
    packageBytes, sourceEntries: sourceEntries.length, onlyMobileBinary: apkFiles[0],
    userPdfPages: 144, systemPdfPages: 147, credentialAndPathScan: 'PASS', portableLinks: 'PASS',
  }, null, 2));
  process.stdout.write('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  verify().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

export { verify };
