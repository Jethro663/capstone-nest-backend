import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  // jwt.strategy.ts
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
    console.log('[JWT-STRAT] Validating payload:', payload);
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.usersService.findById(payload.userId);
    console.log('[JWT-STRAT] lookup user:', payload.userId, 'found:', !!user);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    // Return the full user object (with profile merged from findById)
    // so that GET /auth/me returns complete data, same as login.
    const { password, userRoles, ...sanitized } = user as any;
    return {
      ...sanitized,
      userId: user.id,
      roles: user.roles.map((role) => role.name),
    };
  }
}
