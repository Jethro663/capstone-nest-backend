import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadHandoffConfig } from './lib/config.mjs';
import { assertSafeOutputPath } from './lib/fs-safety.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '../..');
const requireFromFrontend = createRequire(path.join(repoRoot, 'next-frontend', 'package.json'));

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function box({ x, y, width, height, title, lines, fill = '#FFFFFF', stroke = '#0C1D3A' }) {
  const content = lines
    .map((line, index) => `<text x="${x + 22}" y="${y + 68 + index * 28}" class="body">${escapeXml(line)}</text>`)
    .join('');
  return `<g><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="20" fill="${fill}" stroke="${stroke}" stroke-width="3"/><rect x="${x}" y="${y}" width="${width}" height="44" rx="20" fill="${stroke}"/><rect x="${x}" y="${y + 24}" width="${width}" height="20" fill="${stroke}"/><text x="${x + 22}" y="${y + 31}" class="box-title">${escapeXml(title)}</text>${content}</g>`;
}

function arrow(x1, y1, x2, y2, label = '') {
  return `<g><path d="M ${x1} ${y1} L ${x2} ${y2}" stroke="#DC2626" stroke-width="4" fill="none" marker-end="url(#arrow)"/>${label ? `<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 10}" class="label" text-anchor="middle">${escapeXml(label)}</text>` : ''}</g>`;
}

function svg(title, subtitle, content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs><marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 z" fill="#DC2626"/></marker></defs>
  <style>.title{font:700 42px Arial,sans-serif;fill:#0C1D3A}.subtitle{font:24px Arial,sans-serif;fill:#475569}.box-title{font:700 23px Arial,sans-serif;fill:#FFFFFF}.body{font:21px Arial,sans-serif;fill:#0F172A}.label{font:700 19px Arial,sans-serif;fill:#B91C1C}</style>
  <rect width="1600" height="900" fill="#F8FAFC"/><rect width="1600" height="12" fill="#DC2626"/>
  <text x="70" y="74" class="title">${escapeXml(title)}</text><text x="70" y="112" class="subtitle">${escapeXml(subtitle)}</text>${content}
  <text x="70" y="866" class="subtitle">Nexora handoff edition · source 211483f · 2026-10-01</text></svg>`;
}

const diagrams = [
  {
    id: '01-system-architecture',
    title: 'Nexora system architecture',
    subtitle: 'Public clients use the NestJS API; AI remains an internal assistive service.',
    content: [
      box({ x: 70, y: 180, width: 300, height: 190, title: 'People', lines: ['Administrator', 'Teacher', 'Learner'], fill: '#FEE2E2' }),
      box({ x: 480, y: 160, width: 300, height: 220, title: 'Clients', lines: ['Next.js web', 'Expo mobile', 'JWT / refresh session'] }),
      box({ x: 890, y: 160, width: 300, height: 220, title: 'NestJS backend', lines: ['API and RBAC', 'Academic authority', 'Audit and queues'] }),
      box({ x: 1260, y: 160, width: 270, height: 220, title: 'Data', lines: ['PostgreSQL', 'pgvector', 'file storage'] }),
      box({ x: 890, y: 520, width: 300, height: 190, title: 'FastAPI AI', lines: ['Retrieval', 'extraction', 'generation'], fill: '#FFF7ED' }),
      box({ x: 1260, y: 520, width: 270, height: 190, title: 'Runtime', lines: ['Redis + BullMQ', 'Ollama or cloud', 'restart-safe jobs'] }),
      arrow(370, 275, 480, 275, 'uses'), arrow(780, 270, 890, 270, '/api'), arrow(1190, 270, 1260, 270, 'SQL'),
      arrow(1040, 380, 1040, 520, 'internal token'), arrow(1190, 615, 1260, 615, 'jobs / models'),
    ].join(''),
  },
  {
    id: '02-request-and-trust-flow',
    title: 'Request and trust flow',
    subtitle: 'The backend checks identity and policy before official records change.',
    content: [
      box({ x: 80, y: 210, width: 260, height: 170, title: '1. Client', lines: ['Sends HTTPS request', 'with cookie or bearer'] }),
      box({ x: 430, y: 210, width: 280, height: 170, title: '2. Auth and RBAC', lines: ['Validate session', 'resolve role', 'check account state'] }),
      box({ x: 800, y: 210, width: 300, height: 170, title: '3. Domain policy', lines: ['Validate DTO', 'check academic state', 'apply invariant'] }),
      box({ x: 1190, y: 210, width: 320, height: 170, title: '4. Durable write', lines: ['Transaction', 'audit record', 'response envelope'] }),
      box({ x: 430, y: 540, width: 280, height: 170, title: 'Long work', lines: ['Create BullMQ job', 'return job identity', 'poll or notify'] }),
      box({ x: 800, y: 540, width: 300, height: 170, title: 'AI boundary', lines: ['Internal shared secret', 'draft output only', 'teacher review'] }),
      arrow(340, 295, 430, 295), arrow(710, 295, 800, 295), arrow(1100, 295, 1190, 295),
      arrow(950, 380, 570, 540, 'when asynchronous'), arrow(710, 625, 800, 625),
    ].join(''),
  },
  {
    id: '03-deployment-topology',
    title: 'Deployment topology',
    subtitle: 'The same ownership boundaries apply locally, in Docker Compose, and on Railway.',
    content: [
      box({ x: 70, y: 190, width: 310, height: 210, title: 'Public edge', lines: ['TLS domain', 'Next.js frontend', 'mobile API URL'] }),
      box({ x: 480, y: 190, width: 310, height: 210, title: 'Application', lines: ['NestJS backend', 'FastAPI AI service', 'health endpoints'] }),
      box({ x: 890, y: 190, width: 300, height: 210, title: 'Managed state', lines: ['PostgreSQL + pgvector', 'Redis', 'object storage'] }),
      box({ x: 1290, y: 190, width: 240, height: 210, title: 'Models', lines: ['Ollama local', 'or approved cloud'] }),
      box({ x: 480, y: 540, width: 310, height: 170, title: 'CI and release', lines: ['GitHub Actions', 'checks and images', 'manual approval'] }),
      box({ x: 890, y: 540, width: 300, height: 170, title: 'Operations', lines: ['logs and metrics', 'backup and restore', 'rollback evidence'] }),
      arrow(380, 295, 480, 295, 'HTTPS'), arrow(790, 295, 890, 295), arrow(1190, 295, 1290, 295),
      arrow(635, 540, 635, 400, 'deploy'), arrow(1040, 400, 1040, 540, 'observe'),
    ].join(''),
  },
  {
    id: '04-backup-and-recovery',
    title: 'Backup and recovery sequence',
    subtitle: 'A backup is useful only after integrity checks and a test restore.',
    content: [
      box({ x: 90, y: 225, width: 260, height: 180, title: '1. Prepare', lines: ['maintenance window', 'record versions', 'choose safe folder'] }),
      box({ x: 430, y: 225, width: 260, height: 180, title: '2. Capture', lines: ['pg_dump custom format', 'copy object files', 'save configuration map'] }),
      box({ x: 770, y: 225, width: 260, height: 180, title: '3. Verify', lines: ['checksum files', 'list archive', 'record date and owner'] }),
      box({ x: 1110, y: 225, width: 380, height: 180, title: '4. Test restore', lines: ['new empty database', 'restore and migrate', 'run health and smoke checks'] }),
      box({ x: 600, y: 550, width: 400, height: 170, title: 'Production restore gate', lines: ['explicit authorization', 'current backup retained', 'rollback path documented'] }),
      arrow(350, 315, 430, 315), arrow(690, 315, 770, 315), arrow(1030, 315, 1110, 315), arrow(1300, 405, 800, 550, 'only after proof'),
    ].join(''),
  },
];

async function main() {
  const sharp = requireFromFrontend('sharp');
  const config = await loadHandoffConfig(repoRoot);
  const outputRoot = assertSafeOutputPath(repoRoot, path.join(repoRoot, 'output', config.packageName));
  const outputDirectory = path.join(outputRoot, '07-DIAGRAMS');
  await mkdir(outputDirectory, { recursive: true });
  for (const diagram of diagrams) {
    const source = svg(diagram.title, diagram.subtitle, diagram.content);
    const svgPath = path.join(outputDirectory, `${diagram.id}.svg`);
    const pngPath = path.join(outputDirectory, `${diagram.id}.png`);
    await writeFile(svgPath, source, 'utf8');
    await sharp(Buffer.from(source)).png().toFile(pngPath);
  }
  process.stdout.write(`Generated ${diagrams.length} handoff diagrams.\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
