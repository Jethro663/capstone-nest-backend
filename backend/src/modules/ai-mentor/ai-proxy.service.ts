import { Injectable, Logger, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Proxies AI-related requests to the Python FastAPI ai-service.
 * User context is forwarded via X-User-* headers (auth is still handled
 * by the NestJS JwtAuthGuard / RolesGuard on the controller).
 */
@Injectable()
export class AiProxyService {
  private readonly logger = new Logger(AiProxyService.name);
  private readonly baseUrl: string;
  private readonly chatTimeoutMs: number;
  private readonly extractionTimeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.baseUrl =
      this.config.get<string>('AI_SERVICE_URL') || 'http://localhost:8000';
    this.chatTimeoutMs = parseInt(
      this.config.get<string>('AI_SERVICE_TIMEOUT_CHAT_MS') || '70000',
      10,
    );
    this.extractionTimeoutMs = parseInt(
      this.config.get<string>('AI_SERVICE_TIMEOUT_EXTRACTION_MS') || '300000',
      10,
    );
    this.logger.log(`AI proxy configured -> ${this.baseUrl}`);
  }

  private resolveTimeoutMs(path: string): number {
    if (
      path === '/chat' ||
      path.startsWith('/mentor/') ||
      path.startsWith('/student/tutor')
    ) {
      return this.chatTimeoutMs;
    }
    return this.extractionTimeoutMs;
  }

  async forward(
    method: string,
    path: string,
    user: { id?: string; userId?: string; email?: string; roles?: string[] },
    body?: unknown,
  ): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    const userId = user.id ?? user.userId ?? '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
      'X-User-Email': user.email ?? '',
      'X-User-Roles': (user.roles ?? []).join(','),
    };

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
      clearTimeout(timer);

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
        throw new HttpException(
          {
            message: payload?.detail || payload?.message || 'AI service error',
          },
          res.status,
        );
      }

      return payload;
    } catch (err) {
      clearTimeout(timer);
      this.logger.error(
        `AI service request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }
}
