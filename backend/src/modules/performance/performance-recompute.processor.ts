import { Logger, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { runSystemResetWork } from '../system-reset/system-reset.work';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { UnrecoverableError, type Job } from 'bullmq';
import { PerformanceService } from './performance.service';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { assessments, classes, users } from '../../drizzle/schema';

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

  constructor(
    private readonly performanceService: PerformanceService,
    @Optional() private readonly modules?: ModuleRef,
    @Optional() private readonly databaseService?: DatabaseService,
  ) {
    super();
  }

  async process(
    job: Job<RecomputeAssessmentJobData | RecomputeClassScoresJobData>,
  ): Promise<void> {
    return runSystemResetWork(this.modules, () => this.processAdmitted(job));
  }

  private async processAdmitted(
    job: Job<RecomputeAssessmentJobData | RecomputeClassScoresJobData>,
  ): Promise<void> {
    if (job.name === 'recompute-assessment') {
      const data = job.data as RecomputeAssessmentJobData;
      if (this.databaseService) {
        const [assessment, student] = await Promise.all([
          this.databaseService.db.query.assessments.findFirst({
            where: eq(assessments.id, data.assessmentId),
            columns: { id: true },
          }),
          this.databaseService.db.query.users.findFirst({
            where: eq(users.id, data.studentId),
            columns: { id: true },
          }),
        ]);
        if (!assessment || !student) return;
      }
      this.logger.debug(
        `Processing recompute-assessment for student ${data.studentId} on assessment ${data.assessmentId}`,
      );
      await this.performanceService.recomputeFromAssessmentSubmission(
        data.assessmentId,
        data.studentId,
      );
    } else if (job.name === 'recompute-class-scores') {
      const data = job.data as RecomputeClassScoresJobData;
      if (this.databaseService) {
        const target = await this.databaseService.db.query.classes.findFirst({
          where: eq(classes.id, data.classId),
          columns: { id: true },
        });
        if (!target) return;
      }
      this.logger.debug(
        `Processing recompute-class-scores for class ${data.classId}`,
      );
      await this.performanceService.recomputeStudentsForClass(
        data.classId,
        data.studentIds ?? [],
        data.triggerSource ?? 'class_record_scores_updated',
      );
    } else {
      throw new UnrecoverableError(
        `Unsupported performance-recompute job: ${job.name}`,
      );
    }
  }
}
