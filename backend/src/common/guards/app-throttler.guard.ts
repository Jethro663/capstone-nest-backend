import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(
    req: Record<string, any>,
    _context?: ExecutionContext,
  ): Promise<string> {
    const userId = req.user?.userId ?? req.user?.id;
    if (userId) {
      return `user:${userId}`;
    }

    const email = req.body?.email ?? req.body?.username;
    if (typeof email === 'string' && email.trim().length > 0) {
      return `login:${email.toLowerCase().trim()}`;
    }

    const forwardedFor = req.headers?.['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : typeof forwardedFor === 'string'
        ? forwardedFor.split(',')[0]?.trim()
        : undefined;
    const ip =
      forwardedIp ??
      req.ip ??
      (Array.isArray(req.ips) ? req.ips[0] : undefined) ??
      req.socket?.remoteAddress ??
      'anonymous';

    return `ip:${ip}`;
  }
}
