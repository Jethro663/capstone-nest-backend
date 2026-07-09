import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { AiProxyService } from '../ai-proxy.service';

const TEACHER_AI_QUEUE_CONCURRENCY = 2;

/**
 * BullMQ worker for the `ai-teacher-generation` queue.
 *
 * Picks up queued lesson-plan, quiz, and intervention generation jobs and
 * delegates execution to the Python ai-service via internal-only
 * HTTP endpoints. Concurrency is capped to avoid saturating
 * Ollama / LLM inference resources.
 */
@Processor('ai-teacher-generation', {
  concurrency: TEACHER_AI_QUEUE_CONCURRENCY,
})
export class AiGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(AiGenerationProcessor.name);

  constructor(private readonly proxy: AiProxyService) {
    super();
  }

  async process(
    job: Job<{
      jobId: string;
      requestedByUserId: string;
      queuedAt?: string;
    }>,
  ): Promise<void> {
    const { jobId, queuedAt } = job.data;
    const attempt = job.attemptsMade + 1;
    const queueWaitMs = queuedAt
      ? Date.now() - new Date(queuedAt).getTime()
      : undefined;

    this.logger.log(
      `Processing ${job.name} job ${jobId} (BullMQ id=${job.id}, attempt=${attempt}${queueWaitMs !== undefined ? `, waitMs=${queueWaitMs}` : ''})`,
    );

    const meta = {
      bullmqJobId: job.id ?? 'unknown',
      attempt,
    };

    try {
      if (job.name === 'lesson-plan-generation') {
        await this.proxy.runInternalLessonPlanJob(jobId, meta);
      } else if (job.name === 'quiz-generation') {
        await this.proxy.runInternalQuizJob(jobId, meta);
      } else if (job.name === 'intervention-recommendation-generation') {
        await this.proxy.runInternalInterventionJob(jobId, meta);
      } else {
        this.logger.warn(`Unknown job name: ${job.name}, skipping`);
        return;
      }
      this.logger.log(`${job.name} job ${jobId} completed`);
    } catch (err) {
      this.logger.error(
        `${job.name} job ${jobId} failed on attempt ${attempt}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err; // Let BullMQ handle retry via backoff config
    }
  }
}

