import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    const jwtSecret = configService.get<string>('jwt.secret');

    if (!jwtSecret || jwtSecret.length < 32) {
      throw new Error(
        'JWT_SECRET must be set and at least 32 characters. ' +
          'Current value is insecure or missing.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
    this.logger.debug(`[JWT-STRAT] Validating token for userId: ${payload?.userId}`);
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.usersService.findById(payload.userId);
    this.logger.debug(`[JWT-STRAT] User lookup for ${payload.userId}: found=${!!user}`);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    const { password, userRoles, ...sanitized } = user as any;
    return {
      ...sanitized,
      userId: user.id,
      roles: user.roles.map((role) => role.name),
    };
  }
}
