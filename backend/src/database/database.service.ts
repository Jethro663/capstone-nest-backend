import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../drizzle/schema';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
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
      console.error('Unexpected database pool error:', err);
    });

    this.pool.on('connect', () => {
      console.log('New database connection established');
    });
  }

  async onModuleInit() {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('✅ Database connection verified');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
    console.log('Database pool closed');
  }
}
