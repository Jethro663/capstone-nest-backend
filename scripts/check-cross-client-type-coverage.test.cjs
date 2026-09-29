const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  validateCrossClientTypeCoverage,
} = require('./check-cross-client-type-coverage.cjs');

function fixture(options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-contract-'));
  fs.mkdirSync(path.join(root, 'next-frontend/src/types'), { recursive: true });
  fs.mkdirSync(path.join(root, 'mobile/src/types'), { recursive: true });
  fs.mkdirSync(path.join(root, 'contract-fixtures'), { recursive: true });
  for (const file of options.commonFiles ?? ['alpha.ts']) {
    fs.writeFileSync(path.join(root, 'next-frontend/src/types', file), '');
    fs.writeFileSync(path.join(root, 'mobile/src/types', file), '');
  }
  if (options.baseline !== null) {
    fs.writeFileSync(
      path.join(root, 'contract-fixtures/cross-client-type-coverage.v1.json'),
      JSON.stringify(
        options.baseline ?? {
          schemaVersion: 1,
          entries: [
            {
              file: 'alpha.ts',
              classification: 'deferred',
              reason: 'Fixture intentionally has no semantic manifest.',
            },
          ],
        },
      ),
    );
  }
  return root;
}

test('current repository shared type baseline is complete and deterministic', () => {
  const root = path.resolve(__dirname, '..');
  const result = validateCrossClientTypeCoverage(root);
  assert.deepEqual(result.errors, []);
  assert.ok(result.commonCount >= 26);
  assert.equal(result.commonCount, result.trackedCount + result.deferredCount);
});

test('fails when the baseline file is missing', () => {
  const result = validateCrossClientTypeCoverage(fixture({ baseline: null }));
  assert.match(result.errors.join('\n'), /Missing baseline/);
});

test('fails for duplicate, stale, or unsorted baseline entries', () => {
  const root = fixture({
    baseline: {
      schemaVersion: 1,
      entries: [
        { file: 'zeta.ts', classification: 'deferred', reason: 'stale' },
        { file: 'alpha.ts', classification: 'deferred', reason: 'valid' },
        { file: 'alpha.ts', classification: 'deferred', reason: 'duplicate' },
      ],
    },
  });
  const result = validateCrossClientTypeCoverage(root);
  const message = result.errors.join('\n');
  assert.match(message, /sorted/);
  assert.match(message, /duplicated: alpha\.ts/);
  assert.match(message, /stale baseline entry: zeta\.ts/i);
});

test('fails when a newly common type file has not been classified', () => {
  const root = fixture({ commonFiles: ['alpha.ts', 'beta.ts'] });
  const result = validateCrossClientTypeCoverage(root);
  assert.match(result.errors.join('\n'), /unclassified shared type: beta\.ts/i);
});

test('requires a non-empty reason and a valid classification', () => {
  const root = fixture({
    baseline: {
      schemaVersion: 1,
      entries: [
        { file: 'alpha.ts', classification: 'ignored', reason: '' },
      ],
    },
  });
  const message = validateCrossClientTypeCoverage(root).errors.join('\n');
  assert.match(message, /invalid classification/);
  assert.match(message, /reason is required/);
});
