import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

describe('AuthController mobile endpoints', () => {
  const authService = {
    login: jest.fn(),
    refreshToken: jest.fn(),
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

  it('returns refresh token payload for mobile login', async () => {
    (authService.login as jest.Mock).mockResolvedValue({
      user: { id: 'user-1' },
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
    });

    const result = await controller.mobileLogin(
      { email: 'student@example.com', password: 'Password123!' },
      { ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    );

    expect(authService.login).toHaveBeenCalledWith(
      { email: 'student@example.com', password: 'Password123!' },
      '127.0.0.1',
      'jest',
    );
    expect(result.data.refreshToken).toBe('refresh-1');
  });

  it('returns rotated tokens for mobile refresh', async () => {
    (authService.refreshToken as jest.Mock).mockResolvedValue({
      accessToken: 'next-access',
      refreshToken: 'next-refresh',
    });

    const result = await controller.mobileRefresh(
      { refreshToken: 'refresh-1' },
      { ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any,
    );

    expect(authService.refreshToken).toHaveBeenCalledWith(
      'refresh-1',
      '127.0.0.1',
      'jest',
    );
    expect(result.data).toEqual({
      accessToken: 'next-access',
      refreshToken: 'next-refresh',
    });
  });

  it('revokes refresh token on mobile logout', async () => {
    (authService.logout as jest.Mock).mockResolvedValue(undefined);

    const result = await controller.mobileLogout({ refreshToken: 'refresh-1' });

    expect(authService.logout).toHaveBeenCalledWith('refresh-1');
    expect(result.message).toBe('Mobile logout successful');
  });
});
