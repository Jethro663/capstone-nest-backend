import { UnauthorizedException } from '@nestjs/common';
import { LessonPreviewTokenService } from './lesson-preview-token.service';

describe('LessonPreviewTokenService', () => {
  const previousSecret = process.env.LESSON_PREVIEW_SECRET;
  const now = Date.parse('2026-09-18T10:00:00.000Z');

  beforeEach(() => {
    process.env.LESSON_PREVIEW_SECRET =
      'preview-secret-that-is-at-least-32-characters-long';
  });

  afterAll(() => {
    if (previousSecret === undefined) delete process.env.LESSON_PREVIEW_SECRET;
    else process.env.LESSON_PREVIEW_SECRET = previousSecret;
  });

  it('round-trips a purpose-bound lesson token for five minutes', () => {
    const service = new LessonPreviewTokenService();
    const issued = service.issue(
      { lessonId: 'lesson-1', userId: 'teacher-1', roles: ['teacher'] },
      now,
    );

    expect(issued.expiresAt).toBe('2026-09-18T10:05:00.000Z');
    expect(service.verify(issued.token, now + 299_000)).toMatchObject({
      purpose: 'lesson-preview',
      lessonId: 'lesson-1',
      userId: 'teacher-1',
      roles: ['teacher'],
    });
  });

  it('fails closed for tampering and expiry', () => {
    const service = new LessonPreviewTokenService();
    const issued = service.issue(
      { lessonId: 'lesson-1', userId: 'teacher-1', roles: ['teacher'] },
      now,
    );

    expect(() => service.verify(`${issued.token}x`, now)).toThrow(
      UnauthorizedException,
    );
    expect(() => service.verify(issued.token, now + 300_001)).toThrow(
      UnauthorizedException,
    );
  });
});
