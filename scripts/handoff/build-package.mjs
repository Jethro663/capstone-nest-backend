#!/usr/bin/env node

import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadHandoffConfig } from './lib/config.mjs';
import { assertSafeOutputPath } from './lib/fs-safety.mjs';

function versionText(config) {
  return [
    'Nexora LMS Complete Handoff',
    `Package: ${config.packageName}`,
    `Build date: ${config.buildDate}`,
    `Application commit: ${config.applicationCommit}`,
    `Android version: ${config.apk?.version ?? 'not packaged'}`,
    `Android build: ${config.apk?.build ?? 'not packaged'}`,
    '',
  ].join('\n');
}

function readmeText(config) {
  return [
    'NEXORA COMPLETE HANDOFF',
    '',
    'Open START-HERE.html in a modern web browser for the guided entry point.',
    'The two complete manuals are stored in 01-MANUALS.',
    'First-time setup requires internet access for dependencies and model files.',
    'Production secrets are not included. Production school data is not included.',
    '',
    `Application source commit: ${config.applicationCommit}`,
    '',
  ].join('\n');
}

export async function scaffoldHandoff(repoRoot, config) {
  const outputRoot = assertSafeOutputPath(
    path.resolve(repoRoot),
    path.join(path.resolve(repoRoot), 'output', config.packageName),
  );

  await mkdir(outputRoot, { recursive: true });
  for (const relativeDirectory of config.directories) {
    const destination = path.join(outputRoot, relativeDirectory);
    if (!destination.startsWith(`${outputRoot}${path.sep}`)) {
      throw new Error(`Refusing directory outside package root: ${relativeDirectory}`);
    }
    await mkdir(destination, { recursive: true });
  }

  await writeFile(path.join(outputRoot, 'VERSION.txt'), versionText(config), 'utf8');
  await writeFile(
    path.join(outputRoot, 'README-FIRST.txt'),
    readmeText(config),
    'utf8',
  );
  await copyFile(
    path.join(
      path.resolve(repoRoot),
      'scripts',
      'handoff',
      'demo-data',
      'README.txt',
    ),
    path.join(
      outputRoot,
      '06-DATABASE-AND-RECOVERY',
      'demo-data',
      'README.txt',
    ),
  );

  return outputRoot;
}

async function main() {
  if (!process.argv.includes('--scaffold')) {
    throw new Error('Usage: node scripts/handoff/build-package.mjs --scaffold');
  }
  const repoRoot = process.cwd();
  const config = await loadHandoffConfig(repoRoot);
  const outputRoot = await scaffoldHandoff(repoRoot, config);
  process.stdout.write(`Created Nexora handoff scaffold at ${outputRoot}\n`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
