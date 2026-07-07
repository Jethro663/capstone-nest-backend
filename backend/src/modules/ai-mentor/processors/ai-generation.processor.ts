import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { AiProxyService } from '../ai-proxy.service';

/**
 * BullMQ worker for the `ai-teacher-generation` queue.
 *
 * Picks up queued lesson-plan (and later quiz) generation jobs and
 * delegates execution to the Python ai-service via an internal-only
 * HTTP endpoint. Concurrency is capped at 2 to avoid saturating
 * Ollama / LLM inference resources.
 */
@Processor('ai-teacher-generation', { concurrency: 2 })
export class AiGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(AiGenerationProcessor.name);

  constructor(private readonly proxy: AiProxyService) {
    super();
  }

  async process(job: Job<{ jobId: string; requestedByUserId: string }>): Promise<void> {
    if (job.name !== 'lesson-plan-generation') {
      this.logger.warn(`Unknown job name: ${job.name}, skipping`);
      return;
    }

    const { jobId } = job.data;
    this.logger.log(
      `Processing lesson-plan-generation job ${jobId} (BullMQ id=${job.id}, attempt=${job.attemptsMade + 1})`,
    );

    try {
      await this.proxy.runInternalLessonPlanJob(jobId, {
        bullmqJobId: job.id ?? 'unknown',
        attempt: job.attemptsMade + 1,
      });
      this.logger.log(`Lesson-plan-generation job ${jobId} completed`);
    } catch (err) {
      this.logger.error(
        `Lesson-plan-generation job ${jobId} failed on attempt ${job.attemptsMade + 1}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err; // Let BullMQ handle retry via backoff config
    }
  }
}
