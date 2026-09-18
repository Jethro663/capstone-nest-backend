import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { PushTokenProtectionService } from './push-token-protection.service';

describe('PushTokenProtectionService', () => {
  const key = Buffer.alloc(32, 7).toString('base64');

  it('encrypts tokens with authenticated encryption and never embeds plaintext', () => {
    const service = new PushTokenProtectionService(
      new ConfigService({ PUSH_TOKEN_ENCRYPTION_KEY: key }),
    );
    const token = 'ExponentPushToken[secret-device-token]';
    const protectedToken = service.protect(token, 'user-1:install-1');

    expect(protectedToken.ciphertext).toMatch(/^v1:/);
    expect(protectedToken.ciphertext).not.toContain(token);
    expect(protectedToken.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(service.reveal(protectedToken.ciphertext, 'user-1:install-1')).toBe(
      token,
    );
  });

  it('binds ciphertext to the owning user and installation', () => {
    const service = new PushTokenProtectionService(
      new ConfigService({ PUSH_TOKEN_ENCRYPTION_KEY: key }),
    );
    const protectedToken = service.protect(
      'ExponentPushToken[secret-device-token]',
      'user-1:install-1',
    );

    expect(() =>
      service.reveal(protectedToken.ciphertext, 'user-2:install-1'),
    ).toThrow();
  });

  it('fails closed when no valid 32-byte key is configured', () => {
    const service = new PushTokenProtectionService(new ConfigService({}));
    expect(() => service.protect('ExponentPushToken[value]', 'owner')).toThrow(
      ServiceUnavailableException,
    );
  });
});
