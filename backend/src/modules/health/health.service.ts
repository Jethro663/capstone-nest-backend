import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { DatabaseService } from '../../database/database.service';

type DependencyStatus = {
  ok: boolean;
  message?: string;
};

@Injectable()
export class HealthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

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
      return { ok: reply === 'PONG', message: reply !== 'PONG' ? reply : undefined };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Redis ping failed',
      };
    } finally {
      client.disconnect();
    }
  }

  private async checkAiService(): Promise<DependencyStatus & { degraded?: boolean }> {
    const aiServiceUrl =
      this.configService.get<string>('AI_SERVICE_URL') ?? 'http://localhost:8000';
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
        data?: { ollamaAvailable?: boolean };
      };
      const ollamaAvailable = payload?.data?.ollamaAvailable !== false;

      if (!ollamaAvailable) {
        return {
          ok: allowDegradedAi,
          degraded: true,
          message: allowDegradedAi
            ? 'AI service reachable but running in degraded mode without Ollama'
            : 'AI service reachable but Ollama is unavailable',
        };
      }

      return { ok: true };
    } catch (error) {
      return {
        ok: allowDegradedAi,
        degraded: allowDegradedAi,
        message:
          error instanceof Error ? error.message : 'AI service health check failed',
      };
    }
  }

  async getReadiness() {
    const [database, redis, aiService] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkAiService(),
    ]);

    const ready = database.ok && redis.ok && aiService.ok;

    return {
      ready,
      dependencies: {
        database,
        redis,
        aiService,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
