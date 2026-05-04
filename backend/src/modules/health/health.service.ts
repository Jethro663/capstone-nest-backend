import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { DatabaseService } from '../../database/database.service';

type DependencyStatus = {
  ok: boolean;
  message?: string;
};

type ServiceMetadata = {
  name: string;
  version: string;
};

type ReadinessStatus = {
  ready: boolean;
  service: ServiceMetadata;
  dependencies: {
    database: DependencyStatus;
    redis: DependencyStatus;
    aiService: DependencyStatus & { degraded?: boolean; version?: string; runtimeProvider?: string };
  };
  timestamp: string;
};

@Injectable()
export class HealthService {
  private readonly readinessTtlMs = 15_000;
  private readinessCache: { expiresAt: number; value: ReadinessStatus } | null =
    null;
  private readinessPromise: Promise<ReadinessStatus> | null = null;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  getServiceMetadata(): ServiceMetadata {
    return {
      name: 'backend',
      version: process.env.npm_package_version ?? '0.0.0',
    };
  }

  private async checkDatabase(): Promise<DependencyStatus> {
    try {
      await this.databaseService.ping();
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error ? error.message : 'Database ping failed',
      };
    }
  }

  private async checkRedis(): Promise<DependencyStatus> {
    const redisUrl =
      this.configService.get<string>('redis.url') ?? 'redis://localhost:6379';
    const client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    try {
      await client.connect();
      const reply = await client.ping();
      return {
        ok: reply === 'PONG',
        message: reply !== 'PONG' ? reply : undefined,
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Redis ping failed',
      };
    } finally {
      client.disconnect();
    }
  }

  private async checkAiService(): Promise<
    DependencyStatus & { degraded?: boolean; version?: string; runtimeProvider?: string }
  > {
    const aiServiceUrl =
      this.configService.get<string>('AI_SERVICE_URL') ??
      'http://localhost:8000';
    const allowDegradedAi =
      (process.env.AI_DEGRADED_ALLOWED ?? 'false').toLowerCase() === 'true';

    try {
      const response = await fetch(`${aiServiceUrl}/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        return {
          ok: false,
          degraded: allowDegradedAi,
          message: `AI service returned HTTP ${response.status}`,
        };
      }

      const payload = (await response.json()) as {
        data?: {
          runtimeAvailable?: boolean;
          runtimeProvider?: string;
          ollamaAvailable?: boolean;
          version?: string;
        };
      };
      const runtimeAvailable =
        payload?.data?.runtimeAvailable ??
        payload?.data?.ollamaAvailable !== false;
      const version = payload?.data?.version;
      const runtimeProvider = payload?.data?.runtimeProvider;

      if (!runtimeAvailable) {
        return {
          ok: allowDegradedAi,
          degraded: true,
          version,
          runtimeProvider,
          message: allowDegradedAi
            ? 'AI service reachable but running without an available AI runtime'
            : 'AI service reachable but no AI runtime is available',
        };
      }

      return { ok: true, version, runtimeProvider };
    } catch (error) {
      return {
        ok: allowDegradedAi,
        degraded: allowDegradedAi,
        message:
          error instanceof Error
            ? error.message
            : 'AI service health check failed',
      };
    }
  }

  async getReadiness() {
    const now = Date.now();
    if (this.readinessCache && this.readinessCache.expiresAt > now) {
      return this.readinessCache.value;
    }

    if (!this.readinessPromise) {
      this.readinessPromise = (async () => {
        const [database, redis, aiService] = await Promise.all([
          this.checkDatabase(),
          this.checkRedis(),
          this.checkAiService(),
        ]);

        const value: ReadinessStatus = {
          ready: database.ok && redis.ok && aiService.ok,
          service: this.getServiceMetadata(),
          dependencies: {
            database,
            redis,
            aiService,
          },
          timestamp: new Date().toISOString(),
        };

        this.readinessCache = {
          value,
          expiresAt: Date.now() + this.readinessTtlMs,
        };

        return value;
      })().finally(() => {
        this.readinessPromise = null;
      });
    }

    return this.readinessPromise;
  }
}
