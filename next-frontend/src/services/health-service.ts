import { isAxiosError } from 'axios';
import { api } from '@/lib/api-client';

type DependencyStatus = {
  ok: boolean;
  message?: string;
  degraded?: boolean;
};

export type ReadinessStatus = {
  ready: boolean;
  timestamp: string;
  dependencies: {
    database: DependencyStatus;
    redis: DependencyStatus;
    aiService: DependencyStatus;
  };
};

type ReadinessEnvelope = {
  success?: boolean;
  message?: string;
  data?: ReadinessStatus;
};

function extractReadiness(payload: unknown): ReadinessStatus | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const maybeEnvelope = payload as ReadinessEnvelope;
  if (maybeEnvelope.data) {
    return maybeEnvelope.data;
  }

  const maybeStatus = payload as ReadinessStatus;
  if (
    typeof maybeStatus.ready === 'boolean' &&
    typeof maybeStatus.timestamp === 'string' &&
    maybeStatus.dependencies
  ) {
    return maybeStatus;
  }

  return null;
}

export const healthService = {
  async getReadiness(): Promise<ReadinessStatus | null> {
    try {
      const { data } = await api.get('/health/ready');
      return extractReadiness(data);
    } catch (error) {
      if (isAxiosError(error)) {
        return extractReadiness(error.response?.data);
      }
      throw error;
    }
  },
};
