import assert from 'node:assert/strict';
import test from 'node:test';

import { assertSafeOutputPath } from '../lib/fs-safety.mjs';

test('accepts only the configured repository output directory', () => {
  const root = '/workspace/repo';

  assert.doesNotThrow(() =>
    assertSafeOutputPath(
      root,
      '/workspace/repo/output/NEXORA_HANDOFF_2026-10-01',
    ),
  );
  assert.throws(() => assertSafeOutputPath(root, '/workspace/repo'));
  assert.throws(() => assertSafeOutputPath(root, '/'));
  assert.throws(() =>
    assertSafeOutputPath(root, '/workspace/repo/output/another-package'),
  );
});

test('rejects traversal and relative output paths', () => {
  const root = '/workspace/repo';

  assert.throws(() =>
    assertSafeOutputPath(
      root,
      '/workspace/repo/output/NEXORA_HANDOFF_2026-10-01/../other',
    ),
  );
  assert.throws(() =>
    assertSafeOutputPath(root, 'output/NEXORA_HANDOFF_2026-10-01'),
  );
});
