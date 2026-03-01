import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Get required roles from decorator
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 2. If no roles specified, allow access
    if (!requiredRoles) {
      return true;
    }

    // 3. Get user from request (added by JWT guard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Guard against unauthenticated access when RolesGuard is used without JwtAuthGuard
    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }

    // 4. Check if user has required role
    this.logger.debug(
      `[ROLES] Required: ${JSON.stringify(requiredRoles)} | User roles: ${JSON.stringify(user.roles)} | Path: ${request.url}`,
    );

    const hasRole = user.roles?.some((role: string) =>
      requiredRoles.includes(role),
    );

    if (!hasRole) {
      this.logger.warn(
        `[ROLES] DENIED — user ${user.email ?? user.id} has roles ${JSON.stringify(user.roles)} but needs one of ${JSON.stringify(requiredRoles)}`,
      );
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
