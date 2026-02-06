import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  poolMax: 20,
  idleTimeout: 30000,
  connectionTimeout: 5000,
}));
