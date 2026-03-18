import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

interface QueueReindexOptions {
  reason: string;
  actorId?: string;
  source?: string;
}

@Injectable()
export class RagIndexingService {
  private readonly logger = new Logger(RagIndexingService.name);

  constructor(
    @InjectQueue('rag-indexing') private readonly queue: Queue,
  ) {}

  async queueClassReindex(classId: string, options: QueueReindexOptions) {
    const jobId = `reindex:${classId}`;

    try {
      await this.queue.add(
        'reindex-class',
        {
          classId,
          reason: options.reason,
          actorId: options.actorId ?? null,
          source: options.source ?? null,
          queuedAt: new Date().toISOString(),
        },
        {
          jobId,
          removeOnComplete: 100,
          removeOnFail: 200,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes('Job is already waiting')) {
        this.logger.debug(`RAG reindex job already queued for class ${classId}`);
        return;
      }

      this.logger.error(
        `Failed to queue RAG reindex for class ${classId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
