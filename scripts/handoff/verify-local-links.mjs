#!/usr/bin/env node

import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadHandoffConfig } from './lib/config.mjs';
import { assertSafeOutputPath } from './lib/fs-safety.mjs';

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function referencedValues(html) {
  return [...html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)].map(
    (match) => match[1],
  );
}

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function verifyLocalLinks(packageRoot, entryRelativePath) {
  const absolutePackageRoot = path.resolve(packageRoot);
  const entryPath = path.join(absolutePackageRoot, entryRelativePath);
  const html = await readFile(entryPath, 'utf8');
  const absolutePaths = [];
  const remoteAssets = [];
  const missingTargets = [];

  for (const reference of referencedValues(html)) {
    if (/^https?:\/\//i.test(reference)) {
      remoteAssets.push(reference);
      continue;
    }
    if (
      reference.startsWith('/') ||
      /^file:/i.test(reference) ||
      /^[A-Za-z]:[\\/]/.test(reference)
    ) {
      absolutePaths.push(reference);
      continue;
    }
    if (reference.startsWith('#') || /^mailto:/i.test(reference)) continue;

    const cleanReference = decodeURIComponent(reference.split(/[?#]/, 1)[0]);
    const target = path.resolve(path.dirname(entryPath), cleanReference);
    if (
      target !== absolutePackageRoot &&
      !target.startsWith(`${absolutePackageRoot}${path.sep}`)
    ) {
      absolutePaths.push(reference);
      continue;
    }
    if (!(await exists(target))) missingTargets.push(reference);
  }

  return {
    absolutePaths: uniqueSorted(absolutePaths),
    missingTargets: uniqueSorted(missingTargets),
    remoteAssets: uniqueSorted(remoteAssets),
  };
}

async function main() {
  const repoRoot = process.cwd();
  const config = await loadHandoffConfig(repoRoot);
  const packageRoot = assertSafeOutputPath(
    repoRoot,
    path.join(repoRoot, 'output', config.packageName),
  );
  const result = await verifyLocalLinks(packageRoot, 'START-HERE.html');
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (
    result.absolutePaths.length > 0 ||
    result.missingTargets.length > 0 ||
    result.remoteAssets.length > 0
  ) {
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
