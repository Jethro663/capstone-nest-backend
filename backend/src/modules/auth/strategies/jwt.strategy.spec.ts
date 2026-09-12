import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy email verification', () => {
  const findById = jest.fn();
  const strategy = new JwtStrategy(
    new ConfigService({
      jwt: { secret: 'test-secret-at-least-32-characters-long' },
    }),
    { findById } as unknown as UsersService,
  );

  it.each([undefined, 0, 1])(
    'rejects an old session version %s after reset',
    async (sessionVersion) => {
      findById.mockResolvedValue({
        id: 'admin-1',
        status: 'ACTIVE',
        isEmailVerified: true,
        sessionVersion: 2,
        roles: [{ name: 'admin' }],
      });
      await expect(
        strategy.validate({
          userId: 'admin-1',
          type: 'access',
          sessionVersion,
        }),
      ).rejects.toThrow('Session expired');
    },
  );

  it('accepts the retained admin after a new sign-in', async () => {
    findById.mockResolvedValue({
      id: 'admin-1',
      status: 'ACTIVE',
      isEmailVerified: true,
      sessionVersion: 2,
      roles: [{ name: 'admin' }],
    });
    await expect(
      strategy.validate({
        userId: 'admin-1',
        type: 'access',
        sessionVersion: 2,
      }),
    ).resolves.toMatchObject({ userId: 'admin-1' });
  });

  it.each(['student', 'teacher'])(
    'rejects an existing access token for an unverified %s',
    async (role) => {
      findById.mockResolvedValue({
        id: 'user-1',
        status: 'ACTIVE',
        isEmailVerified: false,
        roles: [{ name: role }],
      });
      await expect(
        strategy.validate({ userId: 'user-1', type: 'access' }),
      ).rejects.toThrow('Email not verified');
    },
  );

  it.each(['student', 'teacher'])(
    'allows a verified active %s without exposing the password',
    async (role) => {
      findById.mockResolvedValue({
        id: 'user-1',
        status: 'ACTIVE',
        isEmailVerified: true,
        password: 'hash',
        roles: [{ name: role }],
      });
      const user = await strategy.validate({
        userId: 'user-1',
        type: 'access',
      });
      expect(user.roles).toEqual([role]);
      expect(user.password).toBeUndefined();
    },
  );
});
