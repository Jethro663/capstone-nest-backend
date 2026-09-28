import { InjectQueue } from '@nestjs/bullmq';
import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  Optional,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Queue } from 'bullmq';
import { and, eq, inArray } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { aiGenerationJobs } from '../../drizzle/schema';
import { runSystemResetWork } from '../system-reset/system-reset.work';

const PERFORMANCE_ANALYSIS_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 100,
  removeOnFail: { age: 86400, count: 100 },
};

export type PerformanceAnalysisJobData = {
  jobId: string;
  classId: string;
  teacherId: string;
  studentId?: string;
  note?: string;
};

type StoredSourceFilters = {
  studentId?: unknown;
  note?: unknown;
};

@Injectable()
export class PerformanceAnalysisQueueService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PerformanceAnalysisQueueService.name);

  constructor(
    @InjectQueue('performance-recompute')
    private readonly queue: Queue,
    private readonly databaseService: DatabaseService,
    @Optional() private readonly modules?: ModuleRef,
  ) {}

  async enqueue(data: PerformanceAnalysisJobData): Promise<void> {
    await runSystemResetWork(this.modules, () =>
      this.queue.add('performance-analysis', data, {
        ...PERFORMANCE_ANALYSIS_JOB_OPTIONS,
        jobId: `performance-analysis-${data.jobId}`,
      }),
    );
  }

  async onApplicationBootstrap(): Promise<void> {
    try {
      const jobs =
        await this.databaseService.db.query.aiGenerationJobs.findMany({
          where: and(
            eq(aiGenerationJobs.jobType, 'performance_diagnostics'),
            inArray(aiGenerationJobs.status, ['pending', 'processing']),
          ),
          columns: {
            id: true,
            classId: true,
            teacherId: true,
            sourceFilters: true,
          },
        });

      let requeued = 0;
      for (const job of jobs) {
        if (!job.classId || !job.teacherId) {
          this.logger.warn(
            `Skipping performance analysis reconciliation for malformed job ${job.id}`,
          );
          continue;
        }

        const sourceFilters = (job.sourceFilters ?? {}) as StoredSourceFilters;
        await this.enqueue({
          jobId: job.id,
          classId: job.classId,
          teacherId: job.teacherId,
          ...(typeof sourceFilters.studentId === 'string'
            ? { studentId: sourceFilters.studentId }
            : {}),
          ...(typeof sourceFilters.note === 'string'
            ? { note: sourceFilters.note }
            : {}),
        });
        requeued += 1;
      }

      if (requeued > 0) {
        this.logger.log(
          `Reconciled ${requeued} nonterminal performance analysis job(s)`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Unable to reconcile performance analysis jobs: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
