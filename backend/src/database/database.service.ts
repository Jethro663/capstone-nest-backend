import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
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
      this.logger.error('Unexpected database pool error', err instanceof Error ? err.stack : String(err));
    });

    this.pool.on('connect', () => {
      this.logger.debug('New database connection established');
    });
  }

  async onModuleInit() {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      this.logger.log('✅ Database connection verified');
    } catch (error) {
      this.logger.error('❌ Database connection failed', error instanceof Error ? error.stack : String(error));
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
    this.logger.log('Database pool closed');
  }
}
