import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

@Injectable()
export class PerformanceRecomputeQueueService {
  private readonly logger = new Logger(PerformanceRecomputeQueueService.name);

  constructor(
    @InjectQueue('performance-recompute')
    private readonly queue: Queue,
  ) {}

  async enqueueAssessmentSubmission(
    assessmentId: string,
    studentId: string,
  ): Promise<void> {
    try {
      await this.queue.add(
        'recompute-assessment',
        { assessmentId, studentId },
        {
          jobId: `assess-${assessmentId}-${studentId}-${Math.floor(Date.now() / 15000)}`,
          removeOnComplete: true,
          removeOnFail: { age: 86400, count: 50 },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to enqueue assessment recompute: ${(error as Error).message}`,
      );
    }
  }

  async enqueueClassRecordScores(
    classId: string,
    studentIds?: string[],
    triggerSource?: string,
  ): Promise<void> {
    try {
      await this.queue.add(
        'recompute-class-scores',
        { classId, studentIds, triggerSource },
        {
          jobId: `class-${classId}-${Math.floor(Date.now() / 15000)}`,
          removeOnComplete: true,
          removeOnFail: { age: 86400, count: 50 },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to enqueue class scores recompute: ${(error as Error).message}`,
      );
    }
  }
}
