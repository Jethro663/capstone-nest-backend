import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenService } from './token.service';
import { DatabaseService } from '../../database/database.service';

describe('TokenService', () => {
  let service: TokenService;
  let mockDbService: any;
  let mockConfigService: any;
  let mockTx: any;

  beforeEach(async () => {
    mockTx = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      returning: jest.fn(),
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      limit: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockResolvedValue(undefined),
    };

    mockDbService = {
      db: {
        transaction: jest.fn(async (cb) => cb(mockTx)),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn(),
      },
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'jwt.refreshTokenExpiry') return '7d';
        if (key === 'redis.url') return null; // test without Redis
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: DatabaseService, useValue: mockDbService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('validateAndRotate', () => {
    it('rotates valid token and returns new raw token and user ID', async () => {
      const consumedRow = { userId: 'user-123' };
      mockTx.returning.mockResolvedValueOnce([consumedRow]);

      const result = await service.validateAndRotate('old-raw-token');

      expect(result.userId).toBe('user-123');
      expect(typeof result.newRawToken).toBe('string');
      expect(mockTx.insert).toHaveBeenCalled();
    });

    it('returns from memory cache if rotated within 45s', async () => {
      const consumedRow = { userId: 'user-123' };
      mockTx.returning.mockResolvedValueOnce([consumedRow]);

      const firstResult = await service.validateAndRotate('old-raw-token');
      mockTx.returning.mockClear();

      const secondResult = await service.validateAndRotate('old-raw-token');

      expect(secondResult).toEqual(firstResult);
      expect(mockTx.returning).not.toHaveBeenCalled();
    });

    it('throws gentle retry error without revoking all sessions on benign concurrent race (within graceExpiresAt)', async () => {
      // Simulate cache miss by querying a fresh token that fails update
      mockTx.returning.mockResolvedValueOnce([]); // 0 rows updated
      mockTx.limit.mockResolvedValueOnce([
        {
          userId: 'user-123',
          revoked: true,
          graceExpiresAt: new Date(Date.now() + 30000), // still valid for 30s
        },
      ]);

      await expect(
        service.validateAndRotate('raced-raw-token'),
      ).rejects.toThrow(
        new UnauthorizedException(
          'Token recently refreshed. Please use your latest active session.',
        ),
      );

      // Verify revokeAllForUser (or mass update) was NOT triggered
      expect(mockTx.update).toHaveBeenCalledTimes(1); // Only the initial check-and-set update
    });

    it('triggers reuse attack protection and revokes all sessions when graceExpiresAt is expired or missing', async () => {
      mockTx.returning.mockResolvedValueOnce([]); // 0 rows updated
      mockTx.limit.mockResolvedValueOnce([
        {
          userId: 'user-123',
          revoked: true,
          graceExpiresAt: new Date(Date.now() - 10000), // expired 10s ago
        },
      ]);

      await expect(
        service.validateAndRotate('stale-raw-token', '127.0.0.1'),
      ).rejects.toThrow(
        new UnauthorizedException(
          'Refresh token reuse detected. All sessions have been revoked for your security.',
        ),
      );

      // Verify second update was called to revoke all tokens for user-123
      expect(mockTx.update).toHaveBeenCalledTimes(2);
    });
  });
});
