#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadHandoffConfig } from './lib/config.mjs';
import { assertSafeOutputPath } from './lib/fs-safety.mjs';

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export async function renderStartPage(config) {
  const [template, css] = await Promise.all([
    readFile(path.join(moduleDirectory, 'templates', 'start-here.html'), 'utf8'),
    readFile(path.join(moduleDirectory, 'templates', 'start-here.css'), 'utf8'),
  ]);
  const replacements = new Map([
    ['{{CSS}}', css],
    ['{{PACKAGE_NAME}}', escapeHtml(config.packageName)],
    ['{{BUILD_DATE}}', escapeHtml(config.buildDate)],
    ['{{COMMIT_SHORT}}', escapeHtml(config.applicationCommit.slice(0, 12))],
    ['{{APK_VERSION}}', escapeHtml(config.apk.version)],
    ['{{APK_BUILD}}', escapeHtml(config.apk.build)],
  ]);

  let html = template;
  for (const [token, value] of replacements) {
    html = html.replaceAll(token, value);
  }
  return html;
}

async function main() {
  const repoRoot = process.cwd();
  const config = await loadHandoffConfig(repoRoot);
  const outputRoot = assertSafeOutputPath(
    repoRoot,
    path.join(repoRoot, 'output', config.packageName),
  );
  const html = await renderStartPage(config);
  await writeFile(path.join(outputRoot, 'START-HERE.html'), html, 'utf8');
  process.stdout.write(`Generated ${path.join(outputRoot, 'START-HERE.html')}\n`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
