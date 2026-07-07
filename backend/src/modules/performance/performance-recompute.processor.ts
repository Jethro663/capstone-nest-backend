import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { PerformanceService } from './performance.service';

interface RecomputeAssessmentJobData {
  assessmentId: string;
  studentId: string;
}

interface RecomputeClassScoresJobData {
  classId: string;
  studentIds?: string[];
  triggerSource?: string;
}

@Processor('performance-recompute', { concurrency: 3 })
export class PerformanceRecomputeProcessor extends WorkerHost {
  private readonly logger = new Logger(PerformanceRecomputeProcessor.name);

  constructor(private readonly performanceService: PerformanceService) {
    super();
  }

  async process(
    job: Job<RecomputeAssessmentJobData | RecomputeClassScoresJobData>,
  ): Promise<void> {
    if (job.name === 'recompute-assessment') {
      const data = job.data as RecomputeAssessmentJobData;
      this.logger.debug(
        `Processing recompute-assessment for student ${data.studentId} on assessment ${data.assessmentId}`,
      );
      await this.performanceService.recomputeFromAssessmentSubmission(
        data.assessmentId,
        data.studentId,
      );
    } else if (job.name === 'recompute-class-scores') {
      const data = job.data as RecomputeClassScoresJobData;
      this.logger.debug(
        `Processing recompute-class-scores for class ${data.classId}`,
      );
      await this.performanceService.recomputeStudentsForClass(
        data.classId,
        data.studentIds ?? [],
        data.triggerSource,
      );
    }
  }
}
