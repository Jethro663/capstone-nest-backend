import assert from 'node:assert/strict';
import test from 'node:test';

import { loadHandoffConfig } from '../lib/config.mjs';

test('loads the locked handoff identity', async () => {
  const config = await loadHandoffConfig(process.cwd());

  assert.equal(config.packageName, 'NEXORA_HANDOFF_2026-10-01');
  assert.equal(
    config.applicationCommit,
    '211483f07b901299b48ae42eda318c7448f1cbfd',
  );
  assert.equal(config.maxBytes, 32 * 1024 * 1024 * 1024);
  assert.equal(config.apk.version, '0.1.56');
  assert.equal(config.apk.build, 57);
});

test('configuration uses the approved Nexora identity', async () => {
  const config = await loadHandoffConfig(process.cwd());

  assert.deepEqual(config.brand, {
    navy: '#0C1D3A',
    red: '#DC2626',
    redPressed: '#B91C1C',
    redSoft: '#FEE2E2',
    white: '#FFFFFF',
    border: '#D9D9D9',
  });
});
