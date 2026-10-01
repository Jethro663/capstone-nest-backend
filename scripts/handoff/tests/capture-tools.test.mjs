import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { annotateImage } from '../capture/annotate-image.mjs';
import { verifyCaptureSet } from '../capture/verify-captures.mjs';

test('adds numbered annotations without replacing the source capture', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nexora-annotation-'));
  const source = path.join(root, 'source.svg');
  const output = path.join(root, 'annotated.png');
  try {
    await writeFile(
      source,
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="#ffffff"/></svg>',
      'utf8',
    );
    await annotateImage({
      inputPath: source,
      outputPath: output,
      annotations: [{ number: 1, xPercent: 25, yPercent: 50, label: 'Start here' }],
    });

    assert.equal((await stat(source)).isFile(), true);
    assert.ok((await stat(output)).size > 100);
    const signature = (await readFile(output)).subarray(0, 8).toString('hex');
    assert.equal(signature, '89504e470d0a1a0a');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('capture verification rejects missing or unproven evidence', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nexora-captures-'));
  const matrix = [
    {
      id: 'login',
      routes: ['/login'],
      role: 'public',
      captureMode: 'live',
    },
  ];
  try {
    const result = await verifyCaptureSet({
      matrix,
      metadata: [],
      outputRoot: root,
      applicationCommit: '211483f07b901299b48ae42eda318c7448f1cbfd',
      platform: 'web',
    });
    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /login.*metadata/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
