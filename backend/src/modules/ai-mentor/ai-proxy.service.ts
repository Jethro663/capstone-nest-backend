import {
  Injectable,
  Logger,
  HttpException,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Agent } from 'undici';
import { CircuitBreaker } from '../../common/circuit-breaker';
import {
  CIRCUIT_BREAKER_FAILURE_THRESHOLD,
  CIRCUIT_BREAKER_COOLDOWN_MS,
} from '../../common/constants';

/**
 * Proxies AI-related requests to the Python FastAPI ai-service.
 * User context is forwarded via X-User-* headers (auth is still handled
 * by the NestJS JwtAuthGuard / RolesGuard on the controller).
 */
@Injectable()
export class AiProxyService implements OnModuleDestroy {
  private readonly logger = new Logger(AiProxyService.name);
  private readonly baseUrl: string;
  private readonly chatTimeoutMs: number;
  private readonly tutorStartTimeoutMs: number;
  private readonly quizTimeoutMs: number;
  private readonly extractionTimeoutMs: number;
  private readonly lessonPlanTimeoutMs: number;
  private readonly internalQuizTimeoutMs: number;
  private readonly internalInterventionTimeoutMs: number;
  private readonly internalExtractionTimeoutMs: number;
  private readonly internalTransportTimeoutMs: number;
  private readonly internalDispatcher: Agent;
  private readonly sharedSecret: string;
  private readonly breaker: CircuitBreaker;

  constructor(private readonly config: ConfigService) {
    this.baseUrl =
      this.config.get<string>('AI_SERVICE_URL') || 'http://localhost:8000';
    this.chatTimeoutMs = parseInt(
      this.config.get<string>('AI_SERVICE_TIMEOUT_CHAT_MS') || '70000',
      10,
    );
    this.tutorStartTimeoutMs = parseInt(
      this.config.get<string>('AI_SERVICE_TIMEOUT_TUTOR_START_MS') || '150000',
      10,
    );
    this.quizTimeoutMs = parseInt(
      this.config.get<string>('AI_SERVICE_TIMEOUT_QUIZ_MS') || '360000',
      10,
    );
    this.extractionTimeoutMs = parseInt(
      this.config.get<string>('AI_SERVICE_TIMEOUT_EXTRACTION_MS') || '300000',
      10,
    );
    this.lessonPlanTimeoutMs = parseInt(
      this.config.get<string>('AI_SERVICE_TIMEOUT_LESSON_PLAN_MS') || '900000',
      10,
    );
    this.internalQuizTimeoutMs = parseInt(
      this.config.get<string>('AI_SERVICE_TIMEOUT_INTERNAL_QUIZ_MS') ||
        '900000',
      10,
    );
    this.internalInterventionTimeoutMs = parseInt(
      this.config.get<string>('AI_SERVICE_TIMEOUT_INTERNAL_INTERVENTION_MS') ||
        '900000',
      10,
    );
    this.internalExtractionTimeoutMs = parseInt(
      this.config.get<string>('AI_SERVICE_TIMEOUT_INTERNAL_EXTRACTION_MS') ||
        '900000',
      10,
    );
    this.internalTransportTimeoutMs =
      Math.max(
        this.lessonPlanTimeoutMs,
        this.internalQuizTimeoutMs,
        this.internalInterventionTimeoutMs,
        this.internalExtractionTimeoutMs,
      ) + 30_000;
    this.internalDispatcher = new Agent({
      headersTimeout: this.internalTransportTimeoutMs,
      bodyTimeout: this.internalTransportTimeoutMs,
    });
    this.sharedSecret =
      this.config.get<string>('AI_SERVICE_SHARED_SECRET')?.trim() || '';

    const failureThreshold = parseInt(
      this.config.get<string>('AI_CB_FAILURE_THRESHOLD') ||
        String(CIRCUIT_BREAKER_FAILURE_THRESHOLD),
      10,
    );
    const cooldownMs = parseInt(
      this.config.get<string>('AI_CB_COOLDOWN_MS') ||
        String(CIRCUIT_BREAKER_COOLDOWN_MS),
      10,
    );

    this.breaker = new CircuitBreaker({
      failureThreshold,
      cooldownMs,
      name: 'ai-proxy',
    });

    this.logger.log(`AI proxy configured -> ${this.baseUrl}`);
    this.logger.log(
      `Internal AI deadlines configured -> extraction=${this.internalExtractionTimeoutMs}ms, transport=${this.internalTransportTimeoutMs}ms`,
    );
    if (!this.sharedSecret) {
      this.logger.warn(
        'AI_SERVICE_SHARED_SECRET is empty. AI proxy requests will fail closed with 503 until it is configured.',
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.internalDispatcher.close();
  }

  getCircuitBreakerState(): {
    state: string;
    consecutiveFailures: number;
    cooldownRemainingMs: number;
  } {
    return {
      state: this.breaker.getState(),
      consecutiveFailures: this.breaker.getConsecutiveFailures(),
      cooldownRemainingMs: this.breaker.getCooldownRemainingMs(),
    };
  }

  private resolveTimeoutMs(path: string): number {
    if (path === '/student/tutor/session') {
      return this.tutorStartTimeoutMs;
    }
    if (
      path === '/chat' ||
      path.startsWith('/mentor/') ||
      path.startsWith('/student/tutor') ||
      path.startsWith('/student/ja/')
    ) {
      return this.chatTimeoutMs;
    }
    if (path.startsWith('/teacher/quizzes/')) {
      return this.quizTimeoutMs;
    }
    return this.extractionTimeoutMs;
  }

  private isServiceDownError(err: unknown, statusCode?: number): boolean {
    if (statusCode !== undefined && statusCode >= 500) return true;
    if (err instanceof HttpException && err.getStatus() >= 500) return true;
    if (err instanceof Error && err.name === 'AbortError') return true;
    if (err instanceof TypeError) return true;
    return false;
  }

  async forward(
    method: string,
    path: string,
    user: { id?: string; userId?: string; email?: string; roles?: string[] },
    body?: unknown,
  ): Promise<unknown> {
    if (!this.sharedSecret) {
      throw new HttpException(
        {
          message:
            'AI service boundary is unavailable because its shared secret is not configured.',
        },
        503,
      );
    }

    if (!this.breaker.allowRequest()) {
      const remaining = Math.ceil(this.breaker.getCooldownRemainingMs() / 1000);
      this.logger.warn(
        `AI proxy circuit breaker OPEN — fast-failing ${method} ${path} (cooldown ${remaining}s remaining)`,
      );
      throw new HttpException(
        {
          message: `AI service is temporarily unavailable due to repeated failures. Retrying in ${remaining}s.`,
        },
        503,
      );
    }

    const url = `${this.baseUrl}${path}`;
    const userId = user.id ?? user.userId ?? '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
      'X-User-Email': user.email ?? '',
      'X-User-Roles': (user.roles ?? []).join(','),
    };
    headers['X-Internal-Service-Token'] = this.sharedSecret;

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.resolveTimeoutMs(path),
    );

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const rawText = await res.text();
      let payload: any = null;

      if (rawText) {
        try {
          payload = JSON.parse(rawText);
        } catch {
          payload = { message: rawText };
        }
      }

      if (!res.ok) {
        this.logger.warn(
          `AI service returned ${res.status} for ${method} ${path}: %j`,
          payload,
        );
        const err = new HttpException(
          {
            message: payload?.detail || payload?.message || 'AI service error',
          },
          res.status,
        );
        if (this.isServiceDownError(err, res.status)) {
          this.breaker.recordFailure();
        }
        throw err;
      }

      this.breaker.recordSuccess();
      return payload;
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }

      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`AI service request failed: ${message}`);

      if (this.isServiceDownError(err)) {
        this.breaker.recordFailure();
      }

      if (err instanceof Error && err.name === 'AbortError') {
        throw new HttpException(
          {
            message:
              'AI service request timed out. Try again shortly or restart the AI service.',
          },
          504,
        );
      }

      throw new HttpException(
        {
          message:
            'AI service is unavailable. Start the AI service and try again.',
        },
        503,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Reusable helper for internal worker calls to ai-service.
   * Bypasses the circuit breaker because BullMQ owns retry/backoff.
   */
  private async runInternalTeacherJob(
    path: string,
    meta: Record<string, unknown> | undefined,
    timeoutMs: number,
    jobLabel: string,
  ): Promise<unknown> {
    if (!this.sharedSecret) {
      throw new Error(
        `AI_SERVICE_SHARED_SECRET is required for internal ${jobLabel} execution`,
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Token': this.sharedSecret,
        },
        body: JSON.stringify(meta ?? {}),
        signal: controller.signal,
        dispatcher: this.internalDispatcher,
      } as RequestInit & { dispatcher: Agent });

      if (!response.ok) {
        const text = await response.text();
        this.logger.error(
          `Internal ${jobLabel} execution failed (${response.status}): ${text}`,
        );
        throw new Error(
          `ai-service internal execution returned ${response.status}: ${text}`,
        );
      }

      return await response.json();
    } catch (err) {
      const elapsedMs = Date.now() - startedAt;
      if (err instanceof Error && err.name === 'AbortError') {
        this.logger.error(
          `Internal ${jobLabel} execution timed out after ${elapsedMs}ms (deadline=${timeoutMs}ms, attempt=${String(meta?.attempt ?? 'unknown')})`,
        );
        throw new Error(
          `ai-service internal execution timed out after ${timeoutMs}ms for ${jobLabel}`,
        );
      }
      const cause =
        err instanceof Error && err.cause && typeof err.cause === 'object'
          ? (err.cause as { name?: string; message?: string; code?: string })
          : undefined;
      this.logger.error(
        `Internal ${jobLabel} transport failed after ${elapsedMs}ms (attempt=${String(meta?.attempt ?? 'unknown')}, error=${err instanceof Error ? err.name : typeof err}, code=${cause?.code ?? 'unknown'}, cause=${cause?.name ?? 'unknown'}: ${cause?.message ?? (err instanceof Error ? err.message : String(err))})`,
      );
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Internal worker call: trigger lesson-plan execution on ai-service.
   */
  async runInternalLessonPlanJob(
    jobId: string,
    meta?: { bullmqJobId: string; attempt: number },
  ): Promise<unknown> {
    return this.runInternalTeacherJob(
      `/internal/teacher/lesson-plans/jobs/${jobId}/run`,
      meta,
      this.lessonPlanTimeoutMs,
      `lesson-plan job ${jobId}`,
    );
  }

  /**
   * Internal worker call: trigger quiz draft execution on ai-service.
   */
  async runInternalQuizJob(
    jobId: string,
    meta?: { bullmqJobId: string; attempt: number },
  ): Promise<unknown> {
    return this.runInternalTeacherJob(
      `/internal/teacher/quizzes/jobs/${jobId}/run`,
      meta,
      this.internalQuizTimeoutMs,
      `quiz job ${jobId}`,
    );
  }

  /**
   * Internal worker call: trigger intervention recommendation execution on ai-service.
   */
  async runInternalInterventionJob(
    jobId: string,
    meta?: { bullmqJobId: string; attempt: number },
  ): Promise<unknown> {
    return this.runInternalTeacherJob(
      `/internal/teacher/interventions/jobs/${jobId}/run`,
      meta,
      this.internalInterventionTimeoutMs,
      `intervention job ${jobId}`,
    );
  }

  async runInternalExtractionJob(
    extractionId: string,
    meta?: { bullmqJobId: string; attempt: number },
  ): Promise<unknown> {
    return this.runInternalTeacherJob(
      `/internal/extractions/${extractionId}/run`,
      meta,
      this.internalExtractionTimeoutMs,
      `module extraction ${extractionId}`,
    );
  }

  async markInternalExtractionFailed(
    extractionId: string,
    reason: string,
  ): Promise<unknown> {
    return this.runInternalTeacherJob(
      `/internal/extractions/${extractionId}/fail`,
      { reason },
      this.chatTimeoutMs,
      `module extraction compensation ${extractionId}`,
    );
  }

  async markInternalTeacherJobFailed(
    jobId: string,
    reason: string,
  ): Promise<unknown> {
    return this.runInternalTeacherJob(
      `/internal/teacher/jobs/${jobId}/fail`,
      { reason, expectedStatus: 'pending' },
      this.chatTimeoutMs,
      `teacher AI job compensation ${jobId}`,
    );
  }
}
