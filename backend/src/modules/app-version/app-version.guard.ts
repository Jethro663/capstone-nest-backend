import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AppVersionService } from './app-version.service';

/** Compatibility admission for identified mobile clients; never replaces auth/RBAC. */
@Injectable()
export class AppVersionGuard implements CanActivate {
  constructor(private readonly appVersionService: AppVersionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    const request = context.switchToHttp().getRequest<Request>();
    // Older clients and the web do not send these headers. Do not infer Android.
    if (request.headers['x-app-platform'] !== 'android') return true;

    const path = request.path.replace(/^\/api(?=\/)/, '').replace(/\/$/, '');
    if (
      path === '/app-version/check' ||
      path === '/app-version/register' ||
      path === '/health' ||
      path.startsWith('/health/') ||
      path === '/auth/mobile/logout' ||
      path === '/auth/logout'
    )
      return true;

    const build = request.headers['x-app-version-code'];
    if (
      typeof build !== 'string' ||
      !/^[1-9]\d*$/.test(build) ||
      !Number.isSafeInteger(Number(build))
    ) {
      throw new ForbiddenException({
        code: 'APP_UPDATE_REQUIRED',
        message: 'Please open Nexora and verify your installed app version.',
      });
    }

    let decision;
    try {
      decision = await this.appVersionService.checkVersion({
        platform: 'android',
        currentVersionCode: Number(build),
      });
    } catch {
      throw new ServiceUnavailableException({
        code: 'APP_UPDATE_CHECK_FAILED',
        message: 'Unable to verify your app version. Please retry.',
      });
    }
    if (decision.isForceUpdate || decision.updateType === 'apk_forced') {
      throw new ForbiddenException({
        code: 'APP_UPDATE_REQUIRED',
        message: 'Update Nexora to continue.',
        data: decision,
      });
    }
    return true;
  }
}
