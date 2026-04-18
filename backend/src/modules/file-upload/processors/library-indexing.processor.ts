import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service';
import { uploadedFiles } from '../../../drizzle/schema';
import { AuditService } from '../../audit/audit.service';
import { LibraryIndexStatusDto } from '../dto/file-upload.dto';

type LibraryIndexJobData = {
  fileId: string;
  actorId?: string | null;
  reason: 'upload' | 'retry' | 'backfill' | 'metadata_update';
  queuedAt: string;
};

@Injectable()
@Processor('library-indexing')
export class LibraryIndexingProcessor extends WorkerHost {
  private readonly logger = new Logger(LibraryIndexingProcessor.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {
    super();
  }

  private get db() {
    return this.databaseService.db;
  }

  async process(job: Job<LibraryIndexJobData>) {
    const aiServiceUrl =
      this.configService.get<string>('AI_SERVICE_URL') ??
      'http://localhost:8000';
    const sharedSecret =
      this.configService.get<string>('AI_SERVICE_SHARED_SECRET') ?? '';

    await this.db
      .update(uploadedFiles)
      .set({
        indexStatus: LibraryIndexStatusDto.Processing,
        indexError: null,
      })
      .where(eq(uploadedFiles.id, job.data.fileId));

    try {
      const response = await fetch(
        `${aiServiceUrl}/internal/index/library-files/${job.data.fileId}`,
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
            queuedAt: job.data.queuedAt,
          }),
        },
      );

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `AI library indexing failed with ${response.status}: ${body || 'no response body'}`,
        );
      }

      const payload = await response.json();
      if (job.data.actorId) {
        await this.auditService.log({
          actorId: job.data.actorId,
          action: 'file.index_completed',
          targetType: 'uploaded_file',
          targetId: job.data.fileId,
          metadata: {
            reason: job.data.reason,
            result: payload?.data ?? payload,
          },
        });
      }
      this.logger.log(
        `Indexed library file ${job.data.fileId}: ${JSON.stringify(payload?.data ?? {})}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.db
        .update(uploadedFiles)
        .set({
          indexStatus: LibraryIndexStatusDto.Failed,
          indexError: message.slice(0, 1000),
        })
        .where(eq(uploadedFiles.id, job.data.fileId));

      if (job.data.actorId) {
        await this.auditService.log({
          actorId: job.data.actorId,
          action: 'file.index_failed',
          targetType: 'uploaded_file',
          targetId: job.data.fileId,
          metadata: {
            reason: job.data.reason,
            error: message,
          },
        });
      }

      throw error;
    }
  }
}
