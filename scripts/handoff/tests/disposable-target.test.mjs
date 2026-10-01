import assert from 'node:assert/strict';
import test from 'node:test';

import { assertDisposableTarget } from '../demo-data/assert-disposable-target.mjs';

test('rejects non-documentation database targets', () => {
  assert.throws(
    () => assertDisposableTarget('postgres://user:pass@db.railway.app/prod'),
    /local PostgreSQL host/,
  );
  assert.throws(
    () => assertDisposableTarget('postgres://user:pass@127.0.0.1/capstone'),
    /nexora_docs_/,
  );
  assert.doesNotThrow(() =>
    assertDisposableTarget(
      'postgres://postgres:postgres@127.0.0.1:55432/nexora_docs_manual',
    ),
  );
});

test('rejects malformed, credential-free, and TLS production-like targets', () => {
  assert.throws(() => assertDisposableTarget('not-a-url'), /valid PostgreSQL URL/);
  assert.throws(
    () => assertDisposableTarget('postgres://127.0.0.1/nexora_docs_manual'),
    /explicit username and password/,
  );
  assert.throws(
    () =>
      assertDisposableTarget(
        'postgres://user:pass@localhost/nexora_docs_manual?sslmode=require',
      ),
    /must not require TLS/,
  );
});
