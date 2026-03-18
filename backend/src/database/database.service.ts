import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../drizzle/schema';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool;
  public db: ReturnType<typeof drizzle<typeof schema>>;

  constructor(private configService: ConfigService) {
    this.pool = new Pool({
      connectionString: this.configService.get('database.url'),
      max: this.configService.get('database.poolMax'),
      idleTimeoutMillis: this.configService.get('database.idleTimeout'),
      connectionTimeoutMillis: this.configService.get(
        'database.connectionTimeout',
      ),
    });

    // Pass the full schema object to drizzle
    this.db = drizzle(this.pool, {
      schema, // ← This now includes otpVerifications, roles, users, etc.
      logger: this.configService.get('NODE_ENV') === 'development',
    });

    this.pool.on('error', (err) => {
      this.logger.error(
        'Unexpected database pool error',
        err instanceof Error ? err.stack : String(err),
      );
    });

    this.pool.on('connect', () => {
      this.logger.debug('New database connection established');
    });
  }

  async onModuleInit() {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');

      // simple sanity check – warn if the student_profiles table is missing
      // (it may still be named `user_profiles` if migrations were not applied).
      const tbl = await client.query<{
        to_regclass: string | null;
      }>(`SELECT to_regclass('public.student_profiles')`);
      if (!tbl.rows[0]?.to_regclass) {
        this.logger.warn(
          'Could not find table `student_profiles`. ' +
            'Make sure you have run the database migrations (rename from user_profiles)',
        );
      }

      client.release();
      this.logger.log('✅ Database connection verified');
    } catch (error) {
      this.logger.error(
        '❌ Database connection failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
    this.logger.log('Database pool closed');
  }

  async ping(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
  }
}
