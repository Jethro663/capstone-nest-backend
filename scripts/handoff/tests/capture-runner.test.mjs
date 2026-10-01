import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isExpectedApiFailure,
  isExpectedConsoleError,
  isExpectedDestination,
  buildExtractionComponentEnvelope,
  resolveDynamicCapturePath,
  selectCaptureEntries,
} from '../capture/capture-web.mjs';

const matrix = [
  { id: 'login', role: 'public', captureMode: 'live', capturePath: '/login' },
  { id: 'admin-home', role: 'admin', captureMode: 'live', capturePath: '/dashboard/admin' },
  { id: 'template-editor', role: 'admin', captureMode: 'component-render', capturePath: '/dashboard/admin/class-templates/component-render-only' },
];

test('selects capture owners deterministically by role, id, and mode', () => {
  assert.deepEqual(selectCaptureEntries(matrix, {}), matrix);
  assert.deepEqual(
    selectCaptureEntries(matrix, { roles: ['admin'], modes: ['live'] }).map((entry) => entry.id),
    ['admin-home'],
  );
  assert.deepEqual(
    selectCaptureEntries(matrix, { ids: ['template-editor', 'login'] }).map((entry) => entry.id),
    ['login', 'template-editor'],
  );
});

test('accepts exact destinations and documented redirect routes only', () => {
  assert.equal(isExpectedDestination('/login', '/login'), true);
  assert.equal(isExpectedDestination('/dashboard', '/dashboard/admin'), true);
  assert.equal(isExpectedDestination('/dashboard/profile', '/dashboard/admin/profile'), true);
  assert.equal(isExpectedDestination('/dashboard/admin/users', '/login'), false);
});

test('ignores only the intentional public unauthenticated refresh probe', () => {
  assert.equal(
    isExpectedApiFailure(
      { role: 'public' },
      { status: 401, url: 'http://127.0.0.1:3001/api/auth/refresh' },
    ),
    true,
  );
  assert.equal(
    isExpectedApiFailure(
      { role: 'admin' },
      { status: 401, url: 'http://127.0.0.1:3001/api/auth/refresh' },
    ),
    false,
  );
  assert.equal(
    isExpectedApiFailure(
      { role: 'public' },
      { status: 500, url: 'http://127.0.0.1:3001/api/auth/refresh' },
    ),
    false,
  );
  assert.equal(
    isExpectedConsoleError(
      { role: 'public' },
      'Failed to load resource: the server responded with a status of 401 (Unauthorized)',
    ),
    true,
  );
  assert.equal(
    isExpectedConsoleError(
      { role: 'public' },
      'TypeError: Cannot read properties of undefined',
    ),
    false,
  );
});

test('records the isolated AI Draft degraded-state probe as expected evidence', () => {
  const aiDraftEntry = {
    id: 'dashboard-teacher-classes-id-ai-draft',
    role: 'teacher',
  };

  assert.equal(
    isExpectedApiFailure(aiDraftEntry, {
      status: 503,
      url: 'http://127.0.0.1:3001/api/ai/index/classes/example/status',
    }),
    true,
  );
  assert.equal(
    isExpectedApiFailure(aiDraftEntry, {
      status: 503,
      url: 'http://127.0.0.1:3001/api/classes/example',
    }),
    false,
  );
  assert.equal(
    isExpectedConsoleError(
      aiDraftEntry,
      'Failed to load resource: the server responded with a status of 503 (Service Unavailable)',
    ),
    true,
  );
});

test('resolves a real short-lived lesson preview route before capture', async () => {
  let call = 0;
  const request = {
    post: async (url, options) => {
      call += 1;
      if (call === 1) {
        assert.match(url, /\/api\/auth\/refresh$/);
        return {
          ok: () => true,
          json: async () => ({ data: { accessToken: 'temporary-access-token' } }),
        };
      }
      assert.match(url, /\/api\/lessons\/lesson-1\/preview-session$/);
      assert.equal(options.headers.Authorization, 'Bearer temporary-access-token');
      return {
        ok: () => true,
        json: async () => ({
          success: true,
          data: { url: 'http://127.0.0.1:3001/lesson-preview/signed-preview-token' },
        }),
      };
    },
  };
  assert.equal(
    await resolveDynamicCapturePath(
      {
        capturePath: '/lesson-preview/__LESSON_PREVIEW_TOKEN__',
        captureSetup: { type: 'lesson-preview-session', lessonId: 'lesson-1' },
      },
      request,
      'http://127.0.0.1:3001',
    ),
    '/lesson-preview/signed-preview-token',
  );
});

test('builds a labeled extraction component state from the synthetic fixture', () => {
  const fixture = {
    accounts: [{ role: 'teacher', id: 'teacher-1' }],
    classroom: { class: { id: 'class-1' } },
    fileArtifact: {
      file: { id: 'file-1', name: 'reference.pdf' },
      extraction: { id: 'extraction-1', title: 'Reference', description: 'Synthetic review.' },
    },
  };
  const envelope = buildExtractionComponentEnvelope(fixture);
  assert.equal(envelope.success, true);
  assert.equal(envelope.data.id, 'extraction-1');
  assert.equal(envelope.data.original_name, 'reference.pdf');
  assert.equal(envelope.data.structured_content.sections[0].reviewState, 'ready');
});
