import { useEffect, useState } from 'react';
import { healthService, type ReadinessStatus } from '@/services/health-service';

export type AiAvailabilityStatus = 'checking' | 'online' | 'degraded';

export type AiAvailability = {
  status: AiAvailabilityStatus;
  message?: string;
};

const UNKNOWN_AI_STATUS_MESSAGE = 'AI status could not be checked.';

export function resolveAiAvailability(
  readiness: ReadinessStatus | null | undefined,
): AiAvailability {
  const aiService = readiness?.dependencies?.aiService;

  if (!aiService) {
    return {
      status: 'degraded',
      message: UNKNOWN_AI_STATUS_MESSAGE,
    };
  }

  if (!aiService.ok || aiService.degraded) {
    return {
      status: 'degraded',
      message: aiService.message ?? 'AI service is temporarily unavailable.',
    };
  }

  return { status: 'online' };
}

export function useAiAvailability(): AiAvailability {
  const [availability, setAvailability] = useState<AiAvailability>({
    status: 'checking',
  });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const readiness = await healthService.getReadiness();
        if (!cancelled) {
          setAvailability(resolveAiAvailability(readiness));
        }
      } catch (error) {
        if (!cancelled) {
          setAvailability({
            status: 'degraded',
            message:
              error instanceof Error ? error.message : UNKNOWN_AI_STATUS_MESSAGE,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return availability;
}
