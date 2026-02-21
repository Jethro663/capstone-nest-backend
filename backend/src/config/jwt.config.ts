import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  // Expiry values are environment-driven so ops can tune without code changes.
  // Defaults: 15m access, 7d refresh.
  accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY ?? '15m',
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY ?? '7d',
}));
