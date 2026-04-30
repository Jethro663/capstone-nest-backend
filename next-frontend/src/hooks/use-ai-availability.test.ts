import { resolveAiAvailability } from './use-ai-availability';
import type { ReadinessStatus } from '@/services/health-service';

function makeReadiness(
  aiService: ReadinessStatus['dependencies']['aiService'],
): ReadinessStatus {
  return {
    ready: aiService.ok,
    timestamp: '2026-04-30T00:00:00.000Z',
    dependencies: {
      database: { ok: true },
      redis: { ok: true },
      aiService,
    },
  };
}

describe('resolveAiAvailability', () => {
  it('marks AI online when the backend readiness dependency is healthy', () => {
    expect(resolveAiAvailability(makeReadiness({ ok: true }))).toEqual({
      status: 'online',
    });
  });

  it('marks AI degraded when the AI service dependency is offline', () => {
    expect(
      resolveAiAvailability(
        makeReadiness({
          ok: false,
          message: 'AI service is unavailable.',
        }),
      ),
    ).toEqual({
      status: 'degraded',
      message: 'AI service is unavailable.',
    });
  });

  it('marks AI degraded when readiness allows a degraded AI runtime', () => {
    expect(
      resolveAiAvailability(
        makeReadiness({
          ok: true,
          degraded: true,
          message: 'AI service reachable but no AI runtime is available',
        }),
      ),
    ).toEqual({
      status: 'degraded',
      message: 'AI service reachable but no AI runtime is available',
    });
  });

  it('marks AI degraded when readiness cannot be parsed', () => {
    expect(resolveAiAvailability(null)).toEqual({
      status: 'degraded',
      message: 'AI status could not be checked.',
    });
  });
});
