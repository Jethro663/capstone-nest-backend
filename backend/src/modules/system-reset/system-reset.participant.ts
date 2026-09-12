import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hostname } from 'node:os';
import { randomUUID } from 'node:crypto';
import { Pool, PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';
import { TokenService } from '../auth/token.service';
import { RESET_IO_LOCK, RESET_WRITE_LOCK } from './system-reset.catalog';
import {
  getResetWorkAdmission,
  type ResetWorkAdmission,
  runResetWorkContext,
} from './system-reset.context';

type ResetStateRow = {
  active: boolean;
  epoch: number;
  storage_generation: string;
};
type AdvisoryLockRow = { acquired: boolean };

/** One aggregate I/O lease per backend, not one DB connection per request. */
@Injectable()
export class SystemResetParticipant implements OnModuleInit, OnModuleDestroy {
  readonly id = `backend:${hostname()}:${process.pid}:${randomUUID()}`;
  private readonly pool: Pool;
  private lease?: PoolClient;
  private leaseDamaged = false;
  private activeHandlers = 0;
  private cacheEpoch = -1;
  private storageGeneration = '';
  private ready = false;
  private closed = false;
  private chain: Promise<unknown> = Promise.resolve();
  private timer?: NodeJS.Timeout;
  private refreshing = false;
  private readonly drainWaiters = new Set<() => void>();

  constructor(
    config: ConfigService,
    private readonly database: DatabaseService,
    private readonly tokens: TokenService,
  ) {
    this.pool = new Pool({
      connectionString: config.get('database.url'),
      max: 1,
      connectionTimeoutMillis: 5000,
      statement_timeout: 5000,
    });
    this.pool.on('error', () => {
      this.ready = false;
    });
  }
  private exclusive<T>(work: () => Promise<T>): Promise<T> {
    const pending = this.chain.then(work, work);
    this.chain = pending.catch(() => undefined);
    return pending;
  }
  private unavailable() {
    return new ServiceUnavailableException({
      code: 'SYSTEM_MAINTENANCE',
      message: 'School data maintenance is in progress. Please wait.',
    });
  }

  async captureAdmission(): Promise<ResetWorkAdmission> {
    if (!this.ready || this.closed) throw this.unavailable();
    return this.database.withConnection(async (client) => {
      const state = (
        await client.query<ResetStateRow>(
          'SELECT active,epoch,storage_generation FROM system_reset_state WHERE id=1',
        )
      ).rows[0];
      if (!state || state.active) throw this.unavailable();
      return {
        epoch: state.epoch,
        storageGeneration: state.storage_generation,
      };
    });
  }

  async onModuleInit() {
    await this.refresh();
    this.timer = setInterval(
      () =>
        void this.refresh().catch(() => {
          this.ready = false;
        }),
      1000,
    );
    this.timer.unref();
  }
  async refresh() {
    if (this.refreshing || this.closed) return;
    this.refreshing = true;
    try {
      await this.exclusive(async () => {
        await this.database.withConnection(async (client) => {
          const state = (
            await client.query<ResetStateRow>(
              'SELECT active,epoch,storage_generation FROM system_reset_state WHERE id=1',
            )
          ).rows[0];
          if (!state) throw this.unavailable();
          if (this.activeHandlers === 0) {
            if (this.cacheEpoch !== state.epoch) this.tokens.clearResetCache();
            this.cacheEpoch = state.epoch;
            this.storageGeneration = state.storage_generation;
          }
          await client.query(
            `INSERT INTO system_reset_instances(id,kind,cache_epoch,in_flight,retired,heartbeat_at) VALUES($1,'backend',$2,$3,false,now()) ON CONFLICT(id) DO UPDATE SET cache_epoch=EXCLUDED.cache_epoch,in_flight=EXCLUDED.in_flight,retired=false,heartbeat_at=now()`,
            [this.id, this.cacheEpoch, this.activeHandlers],
          );
          this.ready =
            !state.active &&
            this.cacheEpoch === state.epoch &&
            this.storageGeneration === state.storage_generation &&
            !this.leaseDamaged;
        });
      });
    } finally {
      this.refreshing = false;
    }
  }

  async run<T>(
    work: () => Promise<T>,
    admitted: ResetWorkAdmission | undefined = getResetWorkAdmission(),
  ): Promise<T> {
    let currentAdmission: ResetWorkAdmission | undefined;
    await this.exclusive(async () => {
      if (this.closed || !this.ready || this.leaseDamaged)
        throw this.unavailable();
      if (!this.lease) {
        const client = await this.pool.connect();
        this.lease = client;
        this.leaseDamaged = false;
        client.on('error', this.onLeaseError);
        try {
          const result = await client.query<AdvisoryLockRow>(
            'SELECT pg_try_advisory_lock_shared($1) AS acquired',
            [RESET_IO_LOCK],
          );
          if (!result.rows[0].acquired) throw this.unavailable();
        } catch (error) {
          await this.releaseLease();
          throw error;
        }
      }
      try {
        await this.lease.query('BEGIN');
        await this.lease.query('SELECT pg_advisory_xact_lock_shared($1)', [
          RESET_WRITE_LOCK,
        ]);
        const state = (
          await this.lease.query<ResetStateRow>(
            'SELECT active,epoch,storage_generation FROM system_reset_state WHERE id=1',
          )
        ).rows[0];
        if (
          !state ||
          state.active ||
          state.epoch !== this.cacheEpoch ||
          state.storage_generation !== this.storageGeneration ||
          (admitted !== undefined &&
            (admitted.epoch !== state.epoch ||
              admitted.storageGeneration !== state.storage_generation))
        )
          throw this.unavailable();
        // Durable busy marker precedes physical work. An expired heartbeat or
        // lost I/O lease must not remove this participant from a reset manifest.
        await this.lease.query(
          'UPDATE system_reset_instances SET in_flight=$2,heartbeat_at=now() WHERE id=$1',
          [this.id, this.activeHandlers + 1],
        );
        await this.lease.query('COMMIT');
        currentAdmission = {
          epoch: state.epoch,
          storageGeneration: state.storage_generation,
        };
        this.activeHandlers++;
      } catch (error) {
        try {
          await this.lease.query('ROLLBACK');
        } catch {
          this.leaseDamaged = true;
        }
        if (!this.activeHandlers) await this.releaseLease();
        throw error;
      }
    });
    try {
      return await runResetWorkContext(currentAdmission!, work);
    } finally {
      await this.exclusive(async () => {
        this.activeHandlers--;
        if (!this.activeHandlers) {
          await this.releaseLease();
          const waiters = [...this.drainWaiters];
          this.drainWaiters.clear();
          for (const resolve of waiters) resolve();
        }
      });
    }
  }
  private readonly onLeaseError = () => {
    this.leaseDamaged = true;
    this.ready = false;
  };
  private waitForHandlers(): Promise<void> {
    if (!this.activeHandlers) return Promise.resolve();
    return new Promise((resolve) => this.drainWaiters.add(resolve));
  }
  private async releaseLease() {
    const client = this.lease;
    if (!client) return;
    try {
      if (!this.leaseDamaged)
        await client.query('SELECT pg_advisory_unlock_shared($1)', [
          RESET_IO_LOCK,
        ]);
    } catch {
      this.leaseDamaged = true;
    } finally {
      client.removeListener('error', this.onLeaseError);
      client.release(this.leaseDamaged);
      this.lease = undefined;
      this.leaseDamaged = false;
    }
  }
  private async acknowledgeShutdown() {
    const client = await this.pool.connect();
    let released = false;
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock_shared($1)', [
        RESET_WRITE_LOCK,
      ]);
      const state = (
        await client.query<Pick<ResetStateRow, 'epoch'>>(
          'SELECT epoch FROM system_reset_state WHERE id=1 FOR SHARE',
        )
      ).rows[0];
      if (!state) throw this.unavailable();
      await client.query(
        'UPDATE system_reset_instances SET cache_epoch=$2,in_flight=0,retired=true,heartbeat_at=now() WHERE id=$1',
        [this.id, state.epoch],
      );
      await client.query('COMMIT');
      this.cacheEpoch = state.epoch;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        client.release(true);
        released = true;
      }
      throw error;
    } finally {
      if (!released) client.release();
    }
  }
  async onModuleDestroy() {
    this.closed = true;
    this.ready = false;
    if (this.timer) clearInterval(this.timer);
    // Never claim a drained epoch while a cancelled HTTP handler still works.
    await this.waitForHandlers();
    await this.exclusive(() => this.releaseLease());
    try {
      // A graceful exit destroys local caches. Persist that final acknowledgement
      // so the random participant ID captured by a reset cannot become immortal.
      await this.acknowledgeShutdown();
    } finally {
      await this.pool.end();
    }
  }
}
