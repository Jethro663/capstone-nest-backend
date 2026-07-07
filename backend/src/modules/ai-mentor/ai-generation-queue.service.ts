import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

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
      { jobId, requestedByUserId: userId },
      {
        jobId: `lesson-plan:${jobId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );
    this.logger.log(
      `Enqueued lesson-plan-generation job ${jobId} for user ${userId}`,
    );
  }

  /**
   * Cancel a queued lesson-plan job before execution starts.
   * Returns true if the job was waiting/delayed and was successfully removed from BullMQ.
   */
  async cancelQueuedLessonPlanJob(jobId: string): Promise<boolean> {
    const job = await this.queue.getJob(`lesson-plan:${jobId}`);
    if (!job) return false;
    const state = await job.getState();
    if (!['waiting', 'delayed', 'prioritized'].includes(state)) {
      return false;
    }
    await job.remove();
    this.logger.log(`Removed queued job lesson-plan:${jobId} before execution`);
    return true;
  }
}
