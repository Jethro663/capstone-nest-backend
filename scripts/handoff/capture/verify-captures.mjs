import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadHandoffConfig } from '../lib/config.mjs';
import { assertSafeOutputPath } from '../lib/fs-safety.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '../../..');

async function isNonemptyFile(filePath) {
  try {
    return (await stat(filePath)).isFile() && (await stat(filePath)).size > 100;
  } catch {
    return false;
  }
}

export async function verifyCaptureSet({
  matrix,
  metadata,
  outputRoot,
  applicationCommit,
  platform,
}) {
  const errors = [];
  const metadataById = new Map(metadata.map((entry) => [entry.id, entry]));

  for (const owner of matrix) {
    const evidence = metadataById.get(owner.id);
    if (!evidence) {
      errors.push(`${owner.id}: metadata is missing`);
      continue;
    }
    if (evidence.status !== 'captured') {
      errors.push(`${owner.id}: status is ${evidence.status ?? 'missing'}`);
    }
    if (evidence.sourceCommit !== applicationCommit) {
      errors.push(`${owner.id}: source commit is missing or incorrect`);
    }
    if (evidence.role !== owner.role || evidence.route !== owner.routes[0]) {
      errors.push(`${owner.id}: role or route identity does not match the matrix`);
    }
    if (evidence.classification !== 'SYNTHETIC_DOCUMENTATION_ONLY') {
      errors.push(`${owner.id}: synthetic-data classification is missing`);
    }
    if (!evidence.capturedAt || Number.isNaN(Date.parse(evidence.capturedAt))) {
      errors.push(`${owner.id}: capture date is missing or invalid`);
    }

    for (const relativeFile of [evidence.captureFile, evidence.annotatedFile]) {
      if (!relativeFile) {
        errors.push(`${owner.id}: capture file metadata is incomplete`);
        continue;
      }
      const absoluteFile = path.resolve(outputRoot, relativeFile);
      if (!absoluteFile.startsWith(`${path.resolve(outputRoot)}${path.sep}`)) {
        errors.push(`${owner.id}: capture path escapes the package root`);
      } else if (!(await isNonemptyFile(absoluteFile))) {
        errors.push(`${owner.id}: missing or empty image ${relativeFile}`);
      }
    }
  }

  for (const evidence of metadata) {
    if (!matrix.some((owner) => owner.id === evidence.id)) {
      errors.push(`${evidence.id}: metadata has no ${platform} matrix owner`);
    }
  }

  return { ok: errors.length === 0, errors, count: matrix.length };
}

async function main() {
  const platformIndex = process.argv.indexOf('--platform');
  const platform = platformIndex >= 0 ? process.argv[platformIndex + 1] : null;
  if (platform !== 'web') {
    throw new Error('Usage: node scripts/handoff/capture/verify-captures.mjs --platform web');
  }
  const config = await loadHandoffConfig(repoRoot);
  const outputRoot = assertSafeOutputPath(
    repoRoot,
    path.join(repoRoot, 'output', config.packageName),
  );
  const [matrix, metadata] = await Promise.all([
    readFile(path.join(path.dirname(scriptPath), 'web-capture-matrix.json'), 'utf8').then(JSON.parse),
    readFile(
      path.join(outputRoot, '08-VISUALS', 'annotations', 'web-capture-metadata.json'),
      'utf8',
    ).then(JSON.parse),
  ]);
  const result = await verifyCaptureSet({
    matrix,
    metadata,
    outputRoot,
    applicationCommit: config.applicationCommit,
    platform,
  });
  if (!result.ok) throw new Error(result.errors.join('\n'));
  process.stdout.write(`Verified ${result.count} ${platform} capture owners.\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
