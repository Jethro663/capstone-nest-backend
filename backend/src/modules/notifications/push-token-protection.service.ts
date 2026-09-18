import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

const CIPHER = 'aes-256-gcm';

@Injectable()
export class PushTokenProtectionService {
  constructor(private readonly configService: ConfigService) {}

  protect(token: string, ownerBinding: string) {
    const key = this.readKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv(CIPHER, key, iv);
    cipher.setAAD(Buffer.from(ownerBinding, 'utf8'));
    const encrypted = Buffer.concat([
      cipher.update(token, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return {
      ciphertext: [
        'v1',
        iv.toString('base64'),
        tag.toString('base64'),
        encrypted.toString('base64'),
      ].join(':'),
      fingerprint: createHash('sha256').update(token, 'utf8').digest('hex'),
    };
  }

  reveal(ciphertext: string, ownerBinding: string): string {
    const [version, encodedIv, encodedTag, encodedPayload, ...extra] =
      ciphertext.split(':');
    if (
      version !== 'v1' ||
      !encodedIv ||
      !encodedTag ||
      !encodedPayload ||
      extra.length > 0
    ) {
      throw new Error('Unsupported protected push token format.');
    }

    const decipher = createDecipheriv(
      CIPHER,
      this.readKey(),
      Buffer.from(encodedIv, 'base64'),
    );
    decipher.setAAD(Buffer.from(ownerBinding, 'utf8'));
    decipher.setAuthTag(Buffer.from(encodedTag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(encodedPayload, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  private readKey(): Buffer {
    const encoded = this.configService.get<string>('PUSH_TOKEN_ENCRYPTION_KEY');
    if (!encoded) {
      throw new ServiceUnavailableException(
        'Push token protection is not configured.',
      );
    }

    const key = /^[a-f0-9]{64}$/i.test(encoded)
      ? Buffer.from(encoded, 'hex')
      : Buffer.from(encoded, 'base64');
    if (key.length !== 32) {
      throw new ServiceUnavailableException(
        'Push token protection is not configured.',
      );
    }
    return key;
  }
}
