import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { renderStartPage } from '../generate-start-page.mjs';
import { verifyLocalLinks } from '../verify-local-links.mjs';

test('reports absolute paths, remote assets, and missing local targets', async () => {
  const packageRoot = await mkdtemp(path.join(os.tmpdir(), 'nexora-links-'));
  try {
    await mkdir(path.join(packageRoot, '01-MANUALS'), { recursive: true });
    await writeFile(path.join(packageRoot, '01-MANUALS', 'present.pdf'), 'pdf');
    await writeFile(
      path.join(packageRoot, 'START-HERE.html'),
      [
        '<a href="01-MANUALS/present.pdf">Present</a>',
        '<a href="01-MANUALS/missing.pdf">Missing</a>',
        '<a href="/absolute/file.pdf">Absolute</a>',
        '<img src="https://example.com/logo.png" alt="Remote">',
      ].join('\n'),
    );

    const result = await verifyLocalLinks(packageRoot, 'START-HERE.html');
    assert.deepEqual(result.absolutePaths, ['/absolute/file.pdf']);
    assert.deepEqual(result.missingTargets, ['01-MANUALS/missing.pdf']);
    assert.deepEqual(result.remoteAssets, ['https://example.com/logo.png']);
  } finally {
    await rm(packageRoot, { recursive: true, force: true });
  }
});

test('renders a self-contained portable start page', async () => {
  const html = await renderStartPage({
    packageName: 'NEXORA_HANDOFF_2026-10-01',
    applicationCommit: '211483f07b901299b48ae42eda318c7448f1cbfd',
    buildDate: '2026-10-01',
    apk: { version: '0.1.56', build: 57 },
  });

  assert.match(html, /Nexora Complete Handoff/);
  assert.match(html, /211483f07b90/);
  assert.match(html, /Nexora-User-Manual\.pdf/);
  assert.match(html, /Backup-and-Restore-Runbook\.pdf/);
  assert.doesNotMatch(html, /(?:src|href)=["']https?:/);
  assert.doesNotMatch(html, /\/home\/|[A-Za-z]:\\/);
});
