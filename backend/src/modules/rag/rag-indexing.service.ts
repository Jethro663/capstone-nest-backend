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

  constructor(@InjectQueue('rag-indexing') private readonly queue: Queue) {}

  async queueClassReindex(classId: string, options: QueueReindexOptions) {
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
          removeOnComplete: 100,
          removeOnFail: 200,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          deduplication: {
            id: `reindex:${classId}`,
            keepLastIfActive: true,
          },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to queue RAG reindex for class ${classId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
