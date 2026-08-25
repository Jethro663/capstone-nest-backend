import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { DatabaseService } from '../../database/database.service';
import { StorageService } from '../file-upload/storage/storage.service';

type DependencyStatus = {
  ok: boolean;
  message?: string;
};

type ServiceMetadata = {
  name: string;
  version: string;
  gitCommit: string;
};

type ReadinessStatus = {
  ready: boolean;
  service: ServiceMetadata;
  dependencies: {
    database: DependencyStatus;
    redis: DependencyStatus;
    aiService: DependencyStatus & {
      degraded?: boolean;
      version?: string;
      runtimeProvider?: string;
      embeddingRuntime?: unknown;
      uploadMaterialization?: unknown;
    };
    storage?: DependencyStatus & { driver?: string };
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
    @Optional() private readonly storageService?: StorageService,
  ) {}

  getServiceMetadata(): ServiceMetadata {
    return {
      name: 'backend',
      version: process.env.npm_package_version ?? '0.0.0',
      gitCommit:
        this.configService.get<string>('RAILWAY_GIT_COMMIT_SHA') ??
        'development',
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
    DependencyStatus & {
      degraded?: boolean;
      version?: string;
      runtimeProvider?: string;
      embeddingRuntime?: unknown;
      uploadMaterialization?: unknown;
    }
  > {
    const aiServiceUrl =
      this.configService.get<string>('AI_SERVICE_URL') ??
      'http://localhost:8000';
    const allowDegradedAi =
      (process.env.AI_DEGRADED_ALLOWED ?? 'false').toLowerCase() === 'true';

    try {
      const response = await fetch(`${aiServiceUrl}/ready`, {
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
          ready?: boolean;
          partialDegraded?: boolean;
          degradedMode?: boolean;
          dependencies?: {
            runtime?: {
              provider?: string;
            };
          };
          runtimeAvailable?: boolean;
          runtimeProvider?: string;
          ollamaAvailable?: boolean;
          version?: string;
          embeddingRuntime?: { ok?: boolean };
          uploadMaterialization?: { ok?: boolean };
        };
      };
      const runtimeAvailable = payload?.data?.ready ?? true;
      const version = payload?.data?.version;
      const runtimeProvider =
        payload?.data?.dependencies?.runtime?.provider ??
        payload?.data?.runtimeProvider;
      const embeddingRuntime = payload?.data?.embeddingRuntime;
      const uploadMaterialization = payload?.data?.uploadMaterialization;
      const degradedMode = payload?.data?.degradedMode === true;
      const partialDegraded = payload?.data?.partialDegraded === true;

      if (!runtimeAvailable) {
        return {
          ok: allowDegradedAi,
          degraded: true,
          version,
          runtimeProvider,
          embeddingRuntime,
          uploadMaterialization,
          message: allowDegradedAi
            ? 'AI service reachable but running without an available AI runtime'
            : 'AI service reachable but no AI runtime is available',
        };
      }

      if (degradedMode) {
        return {
          ok: true,
          degraded: true,
          version,
          runtimeProvider,
          embeddingRuntime,
          uploadMaterialization,
          message: 'AI service ready but running in degraded mode',
        };
      }

      if (embeddingRuntime?.ok === false) {
        return {
          ok: true,
          degraded: true,
          version,
          runtimeProvider,
          embeddingRuntime,
          uploadMaterialization,
          message: 'AI service reachable but embedding runtime is degraded',
        };
      }

      if (uploadMaterialization?.ok === false) {
        return {
          ok: true,
          degraded: true,
          version,
          runtimeProvider,
          embeddingRuntime,
          uploadMaterialization,
          message:
            'AI service reachable but upload materialization is degraded',
        };
      }

      if (partialDegraded) {
        return {
          ok: true,
          degraded: true,
          version,
          runtimeProvider,
          embeddingRuntime,
          uploadMaterialization,
          message: 'AI service ready but partially degraded',
        };
      }

      return {
        ok: true,
        version,
        runtimeProvider,
        embeddingRuntime,
        uploadMaterialization,
      };
    } catch (error) {
      const rawMessage =
        error instanceof Error
          ? error.message
          : 'AI service health check failed';
      const connectivityFailure =
        /fetch failed|econnrefused|enotfound|ehostunreach|socket hang up/i.test(
          rawMessage,
        );

      return {
        ok: allowDegradedAi,
        degraded: allowDegradedAi,
        message: connectivityFailure
          ? `Cannot reach AI service at ${aiServiceUrl}. Ensure the service is running and reachable from backend.`
          : rawMessage,
      };
    }
  }

  private async checkStorage(): Promise<
    (DependencyStatus & { driver?: string }) | null
  > {
    if (!this.storageService) {
      return null;
    }
    try {
      return await this.storageService.checkHealth();
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Storage health check failed',
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
        const [database, redis, aiService, storage] = await Promise.all([
          this.checkDatabase(),
          this.checkRedis(),
          this.checkAiService(),
          this.checkStorage(),
        ]);

        const storageOk = storage ? storage.ok : true;
        const value: ReadinessStatus = {
          ready: database.ok && redis.ok && aiService.ok && storageOk,
          service: this.getServiceMetadata(),
          dependencies: {
            database,
            redis,
            aiService,
            ...(storage ? { storage } : {}),
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
