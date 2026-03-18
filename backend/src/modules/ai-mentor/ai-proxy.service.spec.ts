import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
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
              if (key === 'AI_SERVICE_TIMEOUT_EXTRACTION_MS') return '300000';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AiProxyService>(AiProxyService);
  });

  it('uses the chat timeout for mentor and tutor paths', () => {
    expect((service as any).resolveTimeoutMs('/chat')).toBe(70000);
    expect((service as any).resolveTimeoutMs('/mentor/explain')).toBe(70000);
    expect((service as any).resolveTimeoutMs('/student/tutor/session/1/message')).toBe(
      70000,
    );
  });

  it('uses the extraction timeout for non-chat paths', () => {
    expect((service as any).resolveTimeoutMs('/extract')).toBe(300000);
    expect((service as any).resolveTimeoutMs('/teacher/quizzes/generate-draft')).toBe(
      300000,
    );
  });
});
