import {
  CallHandler,
  CanActivate,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { Response } from 'express';
import { SystemResetParticipant } from './system-reset.participant';
import type { ResetWorkAdmission } from './system-reset.context';

export function isResetControlRequest(method: string, path: string): boolean {
  const pathname = path.split('?')[0].replace(/^\/api(?=\/)/, '');
  return (
    (pathname === '/system-maintenance' && method === 'GET') ||
    (/^\/health(?:\/|$)/.test(pathname) && method === 'GET') ||
    /^\/admin\/system-reset(?:\/|$)/.test(pathname)
  );
}

@Injectable()
export class SystemResetGuard implements CanActivate {
  constructor(private readonly participant: SystemResetParticipant) {}
  async canActivate(context: ExecutionContext) {
    if (context.getType() !== 'http') return true;
    const request = context.switchToHttp().getRequest<{
      method: string;
      originalUrl: string;
      resetAdmission?: ResetWorkAdmission;
    }>();
    if (!isResetControlRequest(request.method, request.originalUrl))
      request.resetAdmission = await this.participant.captureAdmission();
    return true;
  }
}

@Injectable()
export class SystemResetInterceptor implements NestInterceptor {
  constructor(private readonly participant: SystemResetParticipant) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const http = context.switchToHttp();
    const request = http.getRequest<{
      method: string;
      originalUrl: string;
      resetAdmission?: ResetWorkAdmission;
    }>();
    if (isResetControlRequest(request.method, request.originalUrl))
      return next.handle();
    const response = http.getResponse<Response>();
    return new Observable((subscriber) => {
      void this.participant
        .run(async () => {
          // Install before the controller can send a response. Streaming/manual
          // responses retain the lease until both handler AND response settle.
          let releaseResponse!: () => void;
          const responseDone = new Promise<void>((resolve) => {
            releaseResponse = resolve;
          });
          response.once('finish', releaseResponse);
          response.once('close', releaseResponse);
          if (response.writableFinished || response.destroyed)
            releaseResponse();
          try {
            await new Promise<void>((resolve) => {
              next.handle().subscribe({
                next: (value) => subscriber.next(value),
                error: (error: unknown) => {
                  subscriber.error(error);
                  resolve();
                },
                complete: () => {
                  subscriber.complete();
                  resolve();
                },
              });
            });
            await responseDone;
          } finally {
            response.removeListener('finish', releaseResponse);
            response.removeListener('close', releaseResponse);
          }
        }, request.resetAdmission)
        .catch((error: unknown) => subscriber.error(error));
      // Intentionally do not unsubscribe the inner handler on client cancel:
      // Multer/S3/AI promises must settle before the participant acknowledges.
    });
  }
}
