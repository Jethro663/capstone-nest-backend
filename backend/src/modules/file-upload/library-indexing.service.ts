import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

interface QueueFileIndexOptions {
  actorId?: string;
  reason: 'upload' | 'retry' | 'backfill' | 'metadata_update';
}

@Injectable()
export class LibraryIndexingService {
  private readonly logger = new Logger(LibraryIndexingService.name);

  constructor(@InjectQueue('library-indexing') private readonly queue: Queue) {}

  async queueFileIndex(fileId: string, options: QueueFileIndexOptions) {
    try {
      await this.queue.add(
        'index-library-file',
        {
          fileId,
          actorId: options.actorId ?? null,
          reason: options.reason,
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
            id: `library-file:${fileId}`,
            keepLastIfActive: true,
          },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to queue library indexing for file ${fileId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
