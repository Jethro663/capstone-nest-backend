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

  constructor(private readonly config: ConfigService) {
    this.baseUrl =
      this.config.get<string>('AI_SERVICE_URL') || 'http://localhost:8000';
    this.logger.log(`AI proxy configured → ${this.baseUrl}`);
  }

  async forward(
    method: string,
    path: string,
    user: { id: string; email: string; roles: string[] },
    body?: unknown,
  ): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-User-Id': user.id,
      'X-User-Email': user.email,
      'X-User-Roles': user.roles.join(','),
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120_000);

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timer);

      const json = await res.json();

      if (!res.ok) {
        this.logger.warn(
          `AI service returned ${res.status} for ${method} ${path}: %j`,
          json,
        );
        throw new HttpException(
          { message: json?.detail || json?.message || 'AI service error' },
          res.status,
        );
      }

      return json;
    } catch (err) {
      clearTimeout(timer);
      this.logger.error(
        `AI service request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }
}
