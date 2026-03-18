import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';

type ReindexJobData = {
  classId: string;
  reason: string;
  actorId?: string | null;
  source?: string | null;
  queuedAt: string;
};

@Injectable()
@Processor('rag-indexing')
export class RagIndexingProcessor extends WorkerHost {
  private readonly logger = new Logger(RagIndexingProcessor.name);

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async process(job: Job<ReindexJobData>) {
    const aiServiceUrl =
      this.configService.get<string>('AI_SERVICE_URL') ?? 'http://localhost:8000';
    const sharedSecret =
      this.configService.get<string>('AI_SERVICE_SHARED_SECRET') ?? '';

    const response = await fetch(
      `${aiServiceUrl}/internal/index/classes/${job.data.classId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sharedSecret
            ? { 'X-Internal-Service-Token': sharedSecret }
            : {}),
        },
        body: JSON.stringify({
          reason: job.data.reason,
          actorId: job.data.actorId ?? null,
          source: job.data.source ?? null,
          queuedAt: job.data.queuedAt,
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `AI indexing request failed with ${response.status}: ${body || 'no response body'}`,
      );
    }

    const payload = await response.json();
    this.logger.log(
      `Reindexed class ${job.data.classId} for ${job.data.reason}: ${JSON.stringify(payload?.data ?? {})}`,
    );
  }
}
