import {
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { RESET_IO_LOCK } from './system-reset.catalog';

export async function withResetIoFence<T>(
  pool: Pick<Pool, 'connect'>,
  work: () => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  let locked = false;
  let damaged = false;
  const onError = () => {
    damaged = true;
  };
  client.on('error', onError);
  try {
    const lock = await client.query<{ acquired: boolean }>(
      'SELECT pg_try_advisory_lock_shared($1) AS acquired',
      [RESET_IO_LOCK],
    );
    locked = lock.rows[0].acquired;
    if (!locked)
      throw new ServiceUnavailableException({
        code: 'SYSTEM_MAINTENANCE',
        message: 'School data reset is in progress. Please wait.',
      });
    const state = (
      await client.query<{ active: boolean }>(
        'SELECT active FROM system_reset_state WHERE id=1',
      )
    ).rows[0];
    if (!state || state.active)
      throw new ServiceUnavailableException({
        code: 'SYSTEM_MAINTENANCE',
        message: 'School data reset is in progress. Please wait.',
      });
    const result = await work();
    if (damaged)
      throw new ServiceUnavailableException('Reset I/O lease was lost.');
    return result;
  } finally {
    // Retain the lease until the handler actually settles, even if its client
    // disconnects. The coordinator must not race an unfinished disk/S3 upload.
    if (locked) {
      try {
        await client.query('SELECT pg_advisory_unlock_shared($1)', [
          RESET_IO_LOCK,
        ]);
      } catch {
        damaged = true;
      }
    }
    client.removeListener('error', onError);
    client.release(damaged);
  }
}

@Injectable()
export class SystemResetFence implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(config: ConfigService) {
    // A separate bounded pool prevents admission leases from consuming all
    // database connections needed by the requests they are waiting for.
    this.pool = new Pool({
      connectionString: config.get<string>('database.url'),
      max: 8,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
      statement_timeout: 5000,
    });
    this.pool.on('error', () => {
      /* Failed idle leases are discarded by pg. */
    });
  }

  run<T>(work: () => Promise<T>): Promise<T> {
    return withResetIoFence(this.pool, work);
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
