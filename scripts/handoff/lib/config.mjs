import { readFile } from 'node:fs/promises';
import path from 'node:path';

const CONFIG_PATH = path.join('scripts', 'handoff', 'handoff.config.json');

function requireString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${label} must be a non-empty string`);
  }
}

export async function loadHandoffConfig(repoRoot) {
  requireString(repoRoot, 'repoRoot');
  const absoluteRoot = path.resolve(repoRoot);
  const source = await readFile(path.join(absoluteRoot, CONFIG_PATH), 'utf8');
  const config = JSON.parse(source);

  requireString(config.packageName, 'packageName');
  requireString(config.applicationCommit, 'applicationCommit');
  requireString(config.buildDate, 'buildDate');

  if (!Number.isSafeInteger(config.maxBytes) || config.maxBytes <= 0) {
    throw new TypeError('maxBytes must be a positive safe integer');
  }
  if (!Array.isArray(config.directories) || config.directories.length === 0) {
    throw new TypeError('directories must be a non-empty array');
  }

  return Object.freeze(config);
}
