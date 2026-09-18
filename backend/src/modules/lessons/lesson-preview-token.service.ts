import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

type PreviewPayload = {
  version: 1;
  purpose: 'lesson-preview';
  lessonId: string;
  userId: string;
  roles: string[];
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

const PREVIEW_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class LessonPreviewTokenService {
  private getKey() {
    const configured = process.env.LESSON_PREVIEW_SECRET;
    const secret =
      configured ||
      (process.env.NODE_ENV === 'production'
        ? undefined
        : process.env.JWT_SECRET);
    if (!secret || secret.length < 32) {
      throw new Error(
        'LESSON_PREVIEW_SECRET must be set and at least 32 characters long',
      );
    }
    return createHash('sha256').update(secret).digest();
  }

  issue(
    input: { lessonId: string; userId: string; roles: string[] },
    now = Date.now(),
  ): { token: string; expiresAt: string } {
    const iv = randomBytes(12);
    const expiresAt = now + PREVIEW_TTL_MS;
    const payload: PreviewPayload = {
      version: 1,
      purpose: 'lesson-preview',
      lessonId: input.lessonId,
      userId: input.userId,
      roles: input.roles,
      issuedAt: now,
      expiresAt,
      nonce: randomBytes(16).toString('base64url'),
    };
    const cipher = createCipheriv('aes-256-gcm', this.getKey(), iv);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(payload), 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return {
      token: Buffer.concat([iv, tag, ciphertext]).toString('base64url'),
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }

  verify(token: string, now = Date.now()): PreviewPayload {
    try {
      const packed = Buffer.from(token, 'base64url');
      if (packed.toString('base64url') !== token) {
        throw new Error('non-canonical token encoding');
      }
      if (packed.length < 29) throw new Error('invalid token length');
      const iv = packed.subarray(0, 12);
      const tag = packed.subarray(12, 28);
      const ciphertext = packed.subarray(28);
      const decipher = createDecipheriv('aes-256-gcm', this.getKey(), iv);
      decipher.setAuthTag(tag);
      const decoded = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]).toString('utf8');
      const payload = JSON.parse(decoded) as PreviewPayload;
      if (
        payload.version !== 1 ||
        payload.purpose !== 'lesson-preview' ||
        !payload.lessonId ||
        !payload.userId ||
        !Array.isArray(payload.roles) ||
        !payload.roles.every((role) => typeof role === 'string') ||
        !Number.isFinite(payload.expiresAt) ||
        payload.expiresAt < now
      ) {
        throw new Error('invalid preview payload');
      }
      return payload;
    } catch {
      throw new UnauthorizedException(
        'Lesson preview link is invalid or expired',
      );
    }
  }
}
