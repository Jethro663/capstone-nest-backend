import { validatePushEnvironment } from './push-notifications.config';

describe('validatePushEnvironment', () => {
  it('requires a valid token-encryption key before server sending is enabled', () => {
    expect(
      validatePushEnvironment({ PUSH_NOTIFICATIONS_ENABLED: 'true' }),
    ).toEqual([
      'PUSH_TOKEN_ENCRYPTION_KEY must be a 32-byte base64 or 64-character hex key when push sending is enabled',
    ]);
  });

  it('accepts a disabled sender without provider credentials', () => {
    expect(
      validatePushEnvironment({ PUSH_NOTIFICATIONS_ENABLED: 'false' }),
    ).toEqual([]);
  });

  it('never includes secret values in validation errors', () => {
    const secret = 'definitely-not-a-valid-secret-value';
    const errors = validatePushEnvironment({
      PUSH_NOTIFICATIONS_ENABLED: 'true',
      PUSH_TOKEN_ENCRYPTION_KEY: secret,
    });
    expect(errors.join(' ')).not.toContain(secret);
  });
});
