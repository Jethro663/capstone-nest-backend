import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { UsersService } from '../users/users.service';
import { OtpService } from '../otp/otp.service';

// Mock bcrypt at module level so its properties are configurable
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require('bcrypt') as { compare: jest.Mock; hash: jest.Mock };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeUser = (overrides: Partial<any> = {}) => ({
  id: 'user-uuid-1',
  email: 'test@example.com',
  password: 'hashed-password',
  isEmailVerified: true,
  status: 'ACTIVE',
  roles: [{ name: 'student' }],
  userRoles: [],
  ...overrides,
});

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUsersService = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  updateLastLogin: jest.fn(),
  updatePassword: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn().mockResolvedValue('signed-jwt'),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      'jwt.secret': 'test-secret-at-least-32-characters-long',
      'jwt.refreshSecret': 'test-refresh-secret-long',
      'jwt.accessTokenExpiry': '15m',
      'jwt.refreshTokenExpiry': '7d',
    };
    return config[key];
  }),
};

const mockOtpService = {
  createAndSendOTP: jest.fn(),
  verifyOTP: jest.fn(),
};

const mockTokenService = {
  generateRawRefreshToken: jest.fn().mockReturnValue('raw-opaque-token'),
  storeRefreshToken: jest.fn().mockResolvedValue(undefined),
  validateAndRotate: jest.fn(),
  revokeByToken: jest.fn().mockResolvedValue(undefined),
  revokeAllForUser: jest.fn().mockResolvedValue(undefined),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: OtpService, useValue: mockOtpService },
        { provide: TokenService, useValue: mockTokenService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // -------------------------------------------------------------------------
  // login()
  // -------------------------------------------------------------------------

  describe('login()', () => {
    it('should return user, accessToken, and refreshToken on valid credentials', async () => {
      const user = makeUser();
      mockUsersService.findByEmail.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);

      const result = await service.login(
        { email: 'test@example.com', password: 'P@ss1' },
        '127.0.0.1',
        'TestAgent',
      );

      expect(result.accessToken).toBe('signed-jwt');
      expect(result.refreshToken).toBe('raw-opaque-token');
      expect(result.user.password).toBeUndefined();
      expect(mockTokenService.storeRefreshToken).toHaveBeenCalledWith(
        user.id,
        'raw-opaque-token',
        '127.0.0.1',
        'TestAgent',
      );
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ghost@x.com', password: 'pw' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when email is not verified', async () => {
      mockUsersService.findByEmail.mockResolvedValue(
        makeUser({ isEmailVerified: false }),
      );

      await expect(
        service.login({ email: 'test@example.com', password: 'pw' }),
      ).rejects.toThrow('Email not verified');
    });

    it('should throw UnauthorizedException when account is not ACTIVE', async () => {
      mockUsersService.findByEmail.mockResolvedValue(
        makeUser({ status: 'SUSPENDED' }),
      );

      await expect(
        service.login({ email: 'test@example.com', password: 'pw' }),
      ).rejects.toThrow('not active');
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      mockUsersService.findByEmail.mockResolvedValue(makeUser());
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // -------------------------------------------------------------------------
  // refreshToken()
  // -------------------------------------------------------------------------

  describe('refreshToken()', () => {
    it('should rotate token and return new accessToken + refreshToken', async () => {
      const user = makeUser();
      mockTokenService.validateAndRotate.mockResolvedValue({
        newRawToken: 'new-raw-token',
        userId: user.id,
      });
      mockUsersService.findById.mockResolvedValue(user);

      const result = await service.refreshToken(
        'old-raw-token',
        '127.0.0.1',
        'agent',
      );

      expect(result.accessToken).toBe('signed-jwt');
      expect(result.refreshToken).toBe('new-raw-token');
    });

    it('should throw UnauthorizedException when TokenService rejects the token', async () => {
      mockTokenService.validateAndRotate.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token'),
      );

      await expect(service.refreshToken('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is no longer active', async () => {
      mockTokenService.validateAndRotate.mockResolvedValue({
        newRawToken: 'new-token',
        userId: 'user-uuid-1',
      });
      mockUsersService.findById.mockResolvedValue(
        makeUser({ status: 'SUSPENDED' }),
      );

      await expect(service.refreshToken('token')).rejects.toThrow(
        'not found or inactive',
      );
    });
  });

  // -------------------------------------------------------------------------
  // logout()
  // -------------------------------------------------------------------------

  describe('logout()', () => {
    it('should call revokeByToken with the provided token', async () => {
      await service.logout('raw-token-to-revoke');
      expect(mockTokenService.revokeByToken).toHaveBeenCalledWith(
        'raw-token-to-revoke',
      );
    });

    it('should not throw if revokeByToken fails (non-critical)', async () => {
      mockTokenService.revokeByToken.mockRejectedValue(new Error('DB error'));
      await expect(service.logout('token')).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // requestPasswordReset() — silent
  // -------------------------------------------------------------------------

  describe('requestPasswordReset()', () => {
    it('should send OTP when user exists', async () => {
      const user = makeUser();
      mockUsersService.findByEmail.mockResolvedValue(user);

      await service.requestPasswordReset(user.email);

      expect(mockOtpService.createAndSendOTP).toHaveBeenCalledWith(
        user.id,
        user.email,
        'password_reset',
      );
    });

    it('should return silently (no exception) when email does not exist', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      // Must NOT throw — prevents account enumeration
      await expect(
        service.requestPasswordReset('nobody@example.com'),
      ).resolves.toBeUndefined();

      expect(mockOtpService.createAndSendOTP).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // validateCredentials()
  // -------------------------------------------------------------------------

  describe('validateCredentials()', () => {
    it('should return true for valid credentials', async () => {
      mockUsersService.findByEmail.mockResolvedValue(makeUser());
      bcrypt.compare.mockResolvedValue(true);

      const result = await service.validateCredentials(
        'test@example.com',
        'correct',
      );
      expect(result).toBe(true);
    });

    it('should throw for unknown email', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.validateCredentials('ghost@example.com', 'pw'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for wrong password', async () => {
      mockUsersService.findByEmail.mockResolvedValue(makeUser());
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        service.validateCredentials('test@example.com', 'wrong'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // -------------------------------------------------------------------------
  // changePassword()
  // -------------------------------------------------------------------------

  describe('changePassword()', () => {
    it('should update password when old password is correct', async () => {
      const user = makeUser();
      mockUsersService.findById.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);

      await service.changePassword(user.id, {
        oldPassword: 'OldP@ss1',
        newPassword: 'NewP@ss2!',
        confirmPassword: 'NewP@ss2!',
      });

      expect(mockUsersService.updatePassword).toHaveBeenCalledWith(
        user.id,
        'NewP@ss2!',
      );
    });

    it('should throw when old password is incorrect', async () => {
      mockUsersService.findById.mockResolvedValue(makeUser());
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        service.changePassword('user-uuid-1', {
          oldPassword: 'wrong',
          newPassword: 'NewP@ss2!',
          confirmPassword: 'NewP@ss2!',
        }),
      ).rejects.toThrow('Old password is incorrect');
    });
  });
});
