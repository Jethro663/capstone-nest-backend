import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

describe('AuthController logout contract', () => {
  const authService = {
    logout: jest.fn(),
  } as unknown as jest.Mocked<AuthService>;

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'jwt.refreshTokenExpiry') return '7d';
      return undefined;
    }),
  } as unknown as ConfigService;

  const tokenService = {
    revokeAllForUser: jest.fn(),
  } as unknown as TokenService;

  let controller: AuthController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuthController(authService, configService, tokenService);
  });

  it('marks logout as public so it can clear refresh cookies without a live access token', () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, AuthController.prototype.logout),
    ).toBe(true);
  });

  it('clears the refresh cookie and revokes the token when present', async () => {
    const clearCookie = jest.fn();
    const response = { clearCookie } as any;

    const result = await controller.logout(
      { cookies: { refreshToken: 'refresh-token' } } as any,
      response,
    );

    expect(authService.logout).toHaveBeenCalledWith('refresh-token');
    expect(clearCookie).toHaveBeenCalledWith(
      'refreshToken',
      expect.objectContaining({
        httpOnly: true,
        path: '/',
      }),
    );
    expect(result).toEqual({
      success: true,
      message: 'Logout successful',
    });
  });
});
