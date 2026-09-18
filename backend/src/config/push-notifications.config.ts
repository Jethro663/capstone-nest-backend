export type PushEnvironment = Partial<
  Record<'PUSH_NOTIFICATIONS_ENABLED' | 'PUSH_TOKEN_ENCRYPTION_KEY', string>
>;

function isValidEncryptionKey(value: string | undefined): boolean {
  if (!value) return false;
  if (/^[a-f0-9]{64}$/i.test(value)) return true;
  try {
    return Buffer.from(value, 'base64').length === 32;
  } catch {
    return false;
  }
}

export function validatePushEnvironment(env: PushEnvironment): string[] {
  const enabled = env.PUSH_NOTIFICATIONS_ENABLED?.trim().toLowerCase();
  if (enabled !== 'true') return [];
  if (!isValidEncryptionKey(env.PUSH_TOKEN_ENCRYPTION_KEY)) {
    return [
      'PUSH_TOKEN_ENCRYPTION_KEY must be a 32-byte base64 or 64-character hex key when push sending is enabled',
    ];
  }
  return [];
}
