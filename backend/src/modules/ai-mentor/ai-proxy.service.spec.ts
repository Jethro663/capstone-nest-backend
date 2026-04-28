import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';
import { AiProxyService } from './ai-proxy.service';

describe('AiProxyService', () => {
  let service: AiProxyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiProxyService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'AI_SERVICE_URL') return 'http://localhost:8000';
              if (key === 'AI_SERVICE_TIMEOUT_CHAT_MS') return '70000';
              if (key === 'AI_SERVICE_TIMEOUT_QUIZ_MS') return '180000';
              if (key === 'AI_SERVICE_TIMEOUT_EXTRACTION_MS') return '300000';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AiProxyService>(AiProxyService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the chat timeout for mentor and tutor paths', () => {
    expect((service as any).resolveTimeoutMs('/chat')).toBe(70000);
    expect((service as any).resolveTimeoutMs('/mentor/explain')).toBe(70000);
    expect(
      (service as any).resolveTimeoutMs('/student/tutor/session/1/message'),
    ).toBe(70000);
  });

  it('uses the quiz timeout for teacher quiz paths', () => {
    expect(
      (service as any).resolveTimeoutMs('/teacher/quizzes/generate-draft'),
    ).toBe(180000);
    expect((service as any).resolveTimeoutMs('/teacher/quizzes/jobs')).toBe(
      180000,
    );
  });

  it('uses the extraction timeout for non-chat non-quiz paths', () => {
    expect((service as any).resolveTimeoutMs('/extract')).toBe(300000);
    expect((service as any).resolveTimeoutMs('/index/classes/class-1')).toBe(
      300000,
    );
  });

  it('converts AI service connection failures into a clear 503', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new TypeError('fetch failed'));

    try {
      await service.forward('GET', '/index/classes/class-1/status', {
        id: 'teacher-1',
        email: 'teacher1@lms.local',
        roles: ['teacher'],
      });
      throw new Error('Expected forward to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      const httpError = error as HttpException;
      expect(httpError.getStatus()).toBe(503);
      expect(httpError.getResponse()).toEqual({
        message:
          'AI service is unavailable. Start the AI service and try again.',
      });
    }
  });
});
