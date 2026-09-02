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
