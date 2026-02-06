import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  accessTokenExpiry: '15m', // Access tokens expire quickly
  refreshTokenExpiry: '7d', // Refresh tokens last longer
}));
