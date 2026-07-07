import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  // Pool tuning — override via env vars in production without code changes
  poolMax: parseInt(process.env.DB_POOL_MAX ?? '25', 10),
  idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT_MS ?? '10000', 10),
  connectionTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT_MS ?? '5000', 10),
  statementTimeout: parseInt(
    process.env.DB_STATEMENT_TIMEOUT_MS ?? '15000',
    10,
  ),
}));
