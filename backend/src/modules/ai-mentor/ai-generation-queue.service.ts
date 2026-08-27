import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { and, eq, lt } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { extractedModules } from '../../drizzle/schema';

const SHARED_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 100,
  removeOnFail: 200,
};

const EXTRACTION_EXECUTION_LEASE_MS = 16 * 60 * 1000;
const LIVE_EXTRACTION_JOB_STATES = new Set(['active', 'waiting', 'delayed']);
const STALE_EXTRACTION_ERROR =
  'Extraction processing was interrupted before completion. Tap Retry to start it again.';

/**
 * Enqueues AI generation jobs onto the BullMQ `ai-teacher-generation` queue.
 *
 * The backend owns queue orchestration — `ai-service` is the stateless
 * execution engine. This service is the boundary between the HTTP
 * request/response cycle and durable background processing.
 */
@Injectable()
export class AiGenerationQueueService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AiGenerationQueueService.name);

  constructor(
    @InjectQueue('ai-teacher-generation')
    private readonly queue: Queue,
    private readonly databaseService: DatabaseService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.reconcileStaleExtractions();
    } catch (error) {
      this.logger.error(
        `Unable to reconcile stale extraction jobs: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async reconcileStaleExtractions(): Promise<number> {
    const cutoff = new Date(Date.now() - EXTRACTION_EXECUTION_LEASE_MS);
    const staleExtractions =
      await this.databaseService.db.query.extractedModules.findMany({
        where: and(
          eq(extractedModules.extractionStatus, 'processing'),
          lt(extractedModules.updatedAt, cutoff),
        ),
        columns: { id: true },
      });

    let reconciled = 0;
    for (const extraction of staleExtractions) {
      const job = await this.queue.getJob(`extraction-${extraction.id}`);
      const state = job ? await job.getState() : null;
      if (state && LIVE_EXTRACTION_JOB_STATES.has(state)) continue;

      await this.databaseService.db
        .update(extractedModules)
        .set({
          extractionStatus: 'failed',
          errorMessage: STALE_EXTRACTION_ERROR,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(extractedModules.id, extraction.id),
            eq(extractedModules.extractionStatus, 'processing'),
            lt(extractedModules.updatedAt, cutoff),
          ),
        );
      reconciled += 1;
    }

    if (reconciled > 0) {
      this.logger.warn(
        `Marked ${reconciled} stale extraction job(s) as failed for manual retry`,
      );
    }
    return reconciled;
  }

  /**
   * Enqueue a lesson-plan execution job. The ai-service public route has
   * already created the `ai_generation_jobs` DB row and returned `jobId`.
   * This method schedules the actual LLM execution via the BullMQ worker.
   */
  async enqueueLessonPlanJob(jobId: string, userId: string): Promise<void> {
    await this.queue.add(
      'lesson-plan-generation',
      { jobId, requestedByUserId: userId, queuedAt: new Date().toISOString() },
      {
        ...SHARED_JOB_OPTIONS,
        jobId: `lesson-plan-${jobId}`,
      },
    );
    this.logger.log(
      `Enqueued lesson-plan-generation job ${jobId} for user ${userId}`,
    );
  }

  /**
   * Enqueue a quiz draft generation job onto the teacher AI queue.
   */
  async enqueueQuizJob(jobId: string, userId: string): Promise<void> {
    await this.queue.add(
      'quiz-generation',
      { jobId, requestedByUserId: userId, queuedAt: new Date().toISOString() },
      {
        ...SHARED_JOB_OPTIONS,
        jobId: `quiz-${jobId}`,
      },
    );
    this.logger.log(`Enqueued quiz-generation job ${jobId} for user ${userId}`);
  }

  /**
   * Enqueue an intervention recommendation generation job onto the teacher AI queue.
   */
  async enqueueInterventionJob(jobId: string, userId: string): Promise<void> {
    await this.queue.add(
      'intervention-recommendation-generation',
      { jobId, requestedByUserId: userId, queuedAt: new Date().toISOString() },
      {
        ...SHARED_JOB_OPTIONS,
        jobId: `intervention-${jobId}`,
      },
    );
    this.logger.log(
      `Enqueued intervention-recommendation-generation job ${jobId} for user ${userId}`,
    );
  }

  async enqueueExtractionJob(
    extractionId: string,
    userId: string,
  ): Promise<void> {
    await this.queue.add(
      'module-extraction',
      {
        extractionId,
        requestedByUserId: userId,
        queuedAt: new Date().toISOString(),
      },
      {
        ...SHARED_JOB_OPTIONS,
        jobId: `extraction-${extractionId}`,
      },
    );
    this.logger.log(
      `Enqueued module-extraction job ${extractionId} for user ${userId}`,
    );
  }

  /**
   * Cancel a queued lesson-plan job before execution starts.
   * Returns true if the job was waiting/delayed and was successfully removed from BullMQ.
   */
  async cancelQueuedLessonPlanJob(jobId: string): Promise<boolean> {
    return this.cancelQueuedTeacherAiJob('lesson-plan', jobId);
  }

  async cancelQueuedExtractionJob(extractionId: string): Promise<boolean> {
    return this.removeWaitingJob(`extraction-${extractionId}`);
  }

  /**
   * Cancel any queued teacher AI job before execution starts by kind and jobId.
   */
  async cancelQueuedTeacherAiJob(
    kind: 'lesson-plan' | 'quiz' | 'intervention',
    jobId: string,
  ): Promise<boolean> {
    const prefix =
      kind === 'lesson-plan'
        ? 'lesson-plan'
        : kind === 'quiz'
          ? 'quiz'
          : 'intervention';
    const bullmqJobId = `${prefix}-${jobId}`;
    return this.removeWaitingJob(bullmqJobId);
  }

  private async removeWaitingJob(bullmqJobId: string): Promise<boolean> {
    const job = await this.queue.getJob(bullmqJobId);
    if (!job) return false;
    const state = await job.getState();
    if (!['waiting', 'delayed', 'prioritized'].includes(state)) {
      return false;
    }
    await job.remove();
    this.logger.log(`Removed queued job ${bullmqJobId} before execution`);
    return true;
  }
}
