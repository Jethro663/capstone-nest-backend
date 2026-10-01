import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { scaffoldHandoff } from '../build-package.mjs';

const packageDirectories = [
  '01-MANUALS/sources',
  '02-QUICK-START',
  '03-SOURCE',
  '04-MOBILE',
  '05-CONFIG-TEMPLATES',
  '06-DATABASE-AND-RECOVERY/demo-data',
  '06-DATABASE-AND-RECOVERY/scripts',
  '07-DIAGRAMS',
  '08-VISUALS/web',
  '08-VISUALS/mobile',
  '08-VISUALS/components',
  '08-VISUALS/annotations',
  '09-DEPLOYMENT-EVIDENCE',
  '10-LICENSES-AND-NOTICES',
];

test('creates the approved package scaffold and identity files', async () => {
  const repoRoot = await mkdtemp(path.join(os.tmpdir(), 'nexora-handoff-'));
  const config = {
    packageName: 'NEXORA_HANDOFF_2026-10-01',
    applicationCommit: '211483f07b901299b48ae42eda318c7448f1cbfd',
    buildDate: '2026-10-01',
    directories: packageDirectories,
  };

  try {
    const outputRoot = await scaffoldHandoff(repoRoot, config);

    for (const relativePath of packageDirectories) {
      assert.equal(
        (await stat(path.join(outputRoot, relativePath))).isDirectory(),
        true,
      );
    }

    const version = await readFile(path.join(outputRoot, 'VERSION.txt'), 'utf8');
    assert.match(version, /Application commit: 211483f07/);
    assert.match(version, /Build date: 2026-10-01/);

    const readme = await readFile(
      path.join(outputRoot, 'README-FIRST.txt'),
      'utf8',
    );
    assert.match(readme, /Open START-HERE\.html/);
    assert.match(readme, /production secrets are not included/i);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});
