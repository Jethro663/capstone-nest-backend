#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { loadHandoffConfig } from './lib/config.mjs';
import { assertSafeOutputPath } from './lib/fs-safety.mjs';
import { buildInventory, inventoryToMarkdown } from './lib/inventory.mjs';

async function main() {
  const repoRoot = process.cwd();
  const config = await loadHandoffConfig(repoRoot);
  const packageRoot = assertSafeOutputPath(
    repoRoot,
    path.join(repoRoot, 'output', config.packageName),
  );
  const destination = path.join(packageRoot, '01-MANUALS', 'sources');
  await mkdir(destination, { recursive: true });

  const inventory = await buildInventory(repoRoot);
  await writeFile(
    path.join(destination, 'inventory.json'),
    `${JSON.stringify(inventory, null, 2)}\n`,
    'utf8',
  );
  await writeFile(
    path.join(destination, 'inventory.md'),
    inventoryToMarkdown(inventory),
    'utf8',
  );

  process.stdout.write(
    `Generated inventory with ${inventory.web.pages.count} web pages and ${inventory.backend.httpHandlers.count} backend handlers.\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
