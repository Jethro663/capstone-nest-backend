import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, UnrecoverableError } from 'bullmq';

type ReindexJobData = {
  classId: string;
  reason: string;
  actorId?: string | null;
  source?: string | null;
  queuedAt: string;
};

@Injectable()
@Processor('rag-indexing', { concurrency: 1 })
export class RagIndexingProcessor extends WorkerHost {
  private readonly logger = new Logger(RagIndexingProcessor.name);

  constructor(private readonly configService: ConfigService) {
    super();
  }

  private resolveIndexingTimeoutMs(): number {
    const configured =
      this.configService.get<string>('AI_SERVICE_TIMEOUT_INDEXING_MS') ??
      this.configService.get<string>('AI_SERVICE_TIMEOUT_EXTRACTION_MS') ??
      '300000';
    const parsed = Number.parseInt(configured, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 300000;
  }

  async process(job: Job<ReindexJobData>) {
    if (job.name !== 'reindex-class') {
      throw new UnrecoverableError(`Unsupported rag-indexing job: ${job.name}`);
    }

    const aiServiceUrl =
      this.configService.get<string>('AI_SERVICE_URL') ??
      'http://localhost:8000';
    const sharedSecret =
      this.configService.get<string>('AI_SERVICE_SHARED_SECRET')?.trim() ?? '';

    if (!sharedSecret) {
      throw new Error(
        'AI_SERVICE_SHARED_SECRET is required for RAG indexing jobs',
      );
    }

    const timeoutMs = this.resolveIndexingTimeoutMs();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let payload: any;
    try {
      const response = await fetch(
        `${aiServiceUrl}/internal/index/classes/${job.data.classId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Service-Token': sharedSecret,
          },
          body: JSON.stringify({
            reason: job.data.reason,
            actorId: job.data.actorId ?? null,
            source: job.data.source ?? null,
            queuedAt: job.data.queuedAt,
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `AI indexing request failed with ${response.status}: ${body || 'no response body'}`,
        );
      }

      payload = await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`AI indexing request timed out after ${timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
    this.logger.log(
      `Reindexed class ${job.data.classId} for ${job.data.reason}: ${JSON.stringify(payload?.data ?? {})}`,
    );
  }
}
