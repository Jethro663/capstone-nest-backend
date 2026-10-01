import assert from 'node:assert/strict';
import test from 'node:test';

import { sanitizeEnvironmentTemplate } from '../assemble-package.mjs';

test('sanitizes secret values and documentation-only mobile login seeds', () => {
  const result = sanitizeEnvironmentTemplate([
    'JWT_SECRET=unsafe',
    'ADMIN_EMAIL=person@example.com',
    '# EXPO_PUBLIC_LOGIN_SEED_EMAIL=person@example.com',
    '# EXPO_PUBLIC_LOGIN_SEED_PASSWORD=unsafe',
    'PUBLIC_VALUE=keep-me',
  ].join('\n'));

  assert.match(result, /JWT_SECRET=CHANGE_ME_JWT_SECRET/);
  assert.match(result, /ADMIN_EMAIL=operator@example\.invalid/);
  assert.match(result, /PUBLIC_VALUE=keep-me/);
  assert.doesNotMatch(result, /EXPO_PUBLIC_LOGIN_SEED/);
  assert.doesNotMatch(result, /person@example\.com/);
});
