import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadHandoffConfig } from '../lib/config.mjs';
import { assertSafeOutputPath } from '../lib/fs-safety.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '../../..');
const requireFromFrontend = createRequire(
  path.join(repoRoot, 'next-frontend', 'package.json'),
);

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

async function main() {
  const { chromium } = requireFromFrontend('playwright');
  const config = await loadHandoffConfig(repoRoot);
  const outputRoot = assertSafeOutputPath(
    repoRoot,
    path.join(repoRoot, 'output', config.packageName),
  );
  const matrix = JSON.parse(
    await readFile(path.join(path.dirname(scriptPath), 'mobile-capture-matrix.json'), 'utf8'),
  );
  const owners = matrix.filter((owner) => owner.captureMode === 'component_state');
  const baseUrl = argument('--base-url', 'http://127.0.0.1:19006');
  const outputDirectory = path.join(outputRoot, '08-VISUALS', 'components');
  await mkdir(outputDirectory, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const metadata = [];
  try {
    for (const owner of owners) {
      const state = owner.routes[0].split(':')[1];
      const page = await browser.newPage({
        viewport: { width: 360, height: 800 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      });
      const url = `${baseUrl}/?state=${encodeURIComponent(state)}`;
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.getByText(owner.waitFor, { exact: false }).first().waitFor({ state: 'visible' });
      const outputPath = path.join(outputDirectory, `${owner.id}.png`);
      await page.screenshot({ path: outputPath, fullPage: false });
      metadata.push({
        id: owner.id,
        state,
        sourceCommit: config.applicationCommit,
        renderedAt: new Date().toISOString(),
        viewport: '360x800',
        deviceScaleFactor: 3,
        outputFile: path.posix.join('08-VISUALS', 'components', `${owner.id}.png`),
        componentSource: 'scripts/handoff/capture/mobile-component-gallery.tsx',
      });
      await page.close();
    }
  } finally {
    await browser.close();
  }
  await writeFile(
    path.join(outputDirectory, 'component-render-metadata.json'),
    `${JSON.stringify(metadata, null, 2)}\n`,
    'utf8',
  );
  process.stdout.write(`Rendered ${metadata.length} mobile component states.\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
