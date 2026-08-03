import { isAxiosError } from 'axios';
import { api } from '@/lib/api-client';

const gitHash = process.env.NEXT_PUBLIC_RAILWAY_GIT_COMMIT_SHA
  ? ` (build ${process.env.NEXT_PUBLIC_RAILWAY_GIT_COMMIT_SHA.substring(0, 7)})`
  : ' (dev)';

export const FRONTEND_APP_VERSION =
  `${process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0'}${gitHash}`;

type ServiceMetadata = {
  name: string;
  version: string;
  gitCommit?: string;
};

type DependencyStatus = {
  ok: boolean;
  message?: string;
  degraded?: boolean;
  version?: string;
  runtimeProvider?: string;
};

export type ReadinessStatus = {
  ready: boolean;
  timestamp: string;
  service?: ServiceMetadata;
  dependencies: {
    database: DependencyStatus;
    redis: DependencyStatus;
    aiService: DependencyStatus;
  };
};

export type LivenessStatus = {
  status: string;
  timestamp: string;
  service?: ServiceMetadata;
};

export type AiHealthStatus = {
  service?: ServiceMetadata;
  timestamp?: string;
  runtimeAvailable?: boolean;
  runtimeProvider?: string;
  configuredModel?: string;
  configuredTextModel?: string;
};

type ReadinessEnvelope = {
  success?: boolean;
  message?: string;
  data?: ReadinessStatus;
};

type LivenessEnvelope = {
  success?: boolean;
  message?: string;
  data?: LivenessStatus;
};

type AiHealthEnvelope = {
  success?: boolean;
  message?: string;
  data?: {
    service?: string;
    version?: string;
    timestamp?: string;
    runtimeAvailable?: boolean;
    runtimeProvider?: string;
    configuredModel?: string;
    configuredTextModel?: string;
  };
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

function extractLiveness(payload: unknown): LivenessStatus | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const maybeEnvelope = payload as LivenessEnvelope;
  if (maybeEnvelope.data) {
    return maybeEnvelope.data;
  }

  const maybeStatus = payload as LivenessStatus;
  if (
    typeof maybeStatus.status === 'string' &&
    typeof maybeStatus.timestamp === 'string'
  ) {
    return maybeStatus;
  }

  return null;
}

function extractAiHealth(payload: unknown): AiHealthStatus | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const envelope = payload as AiHealthEnvelope;
  const data = envelope.data;
  if (data) {
    return {
      service:
        typeof data.service === 'string' && typeof data.version === 'string'
          ? { name: data.service, version: data.version }
          : undefined,
      timestamp: typeof data.timestamp === 'string' ? data.timestamp : undefined,
      runtimeAvailable:
        typeof data.runtimeAvailable === 'boolean'
          ? data.runtimeAvailable
          : undefined,
      runtimeProvider:
        typeof data.runtimeProvider === 'string'
          ? data.runtimeProvider
          : undefined,
      configuredModel:
        typeof data.configuredModel === 'string'
          ? data.configuredModel
          : undefined,
      configuredTextModel:
        typeof data.configuredTextModel === 'string'
          ? data.configuredTextModel
          : undefined,
    };
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

  async getLiveness(): Promise<LivenessStatus | null> {
    try {
      const { data } = await api.get('/health/live');
      return extractLiveness(data);
    } catch (error) {
      if (isAxiosError(error)) {
        return extractLiveness(error.response?.data);
      }
      throw error;
    }
  },

  async getAiHealth(): Promise<AiHealthStatus | null> {
    try {
      const { data } = await api.get('/ai/health');
      return extractAiHealth(data);
    } catch (error) {
      if (isAxiosError(error)) {
        return extractAiHealth(error.response?.data);
      }
      throw error;
    }
  },
};
