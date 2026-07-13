import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

const SHARED_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 100,
  removeOnFail: 200,
};

/**
 * Enqueues AI generation jobs onto the BullMQ `ai-teacher-generation` queue.
 *
 * The backend owns queue orchestration — `ai-service` is the stateless
 * execution engine. This service is the boundary between the HTTP
 * request/response cycle and durable background processing.
 */
@Injectable()
export class AiGenerationQueueService {
  private readonly logger = new Logger(AiGenerationQueueService.name);

  constructor(
    @InjectQueue('ai-teacher-generation')
    private readonly queue: Queue,
  ) {}

  /**
   * Enqueue a lesson-plan execution job. The ai-service public route has
   * already created the `ai_generation_jobs` DB row and returned `jobId`.
   * This method schedules the actual LLM execution via the BullMQ worker.
   */
  async enqueueLessonPlanJob(
    jobId: string,
    userId: string,
  ): Promise<void> {
    await this.queue.add(
      'lesson-plan-generation',
      { jobId, requestedByUserId: userId, queuedAt: new Date().toISOString() },
      {
        ...SHARED_JOB_OPTIONS,
        jobId: `lesson-plan:${jobId}`,
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
        jobId: `quiz:${jobId}`,
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
        jobId: `intervention:${jobId}`,
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
    const bullmqJobId = `${prefix}:${jobId}`;
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
