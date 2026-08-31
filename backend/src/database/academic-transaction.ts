import { AsyncLocalStorage } from 'node:async_hooks';
import { Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { DatabaseService } from './database.service';

type Connection = DatabaseService['db'];
type Effect = () => unknown;
interface AcademicContext {
  owner: object;
  connection: Connection;
  effects: Effect[];
  active: boolean;
}
const context = new AsyncLocalStorage<AcademicContext>();
const logger = new Logger('AcademicTransaction');

/** A completed timer submission may commit while the caller receives an explicit terminal response. */
export class AcademicCommittedResponse extends Error {
  constructor(readonly responseError: Error) {
    super(responseError.message);
  }
}

/** The same key is used by all official academic mutation entrypoints. */
export const ACADEMIC_LOCK_KEY = 78766901;

export function getAcademicConnection<T>(owner: object, fallback: T): T {
  const current = context.getStore();
  return current?.active && current.owner === owner
    ? (current.connection as T)
    : fallback;
}

export async function runAcademicTransaction<T>(
  owner: object,
  database: Connection,
  work: () => Promise<T>,
): Promise<T> {
  const current = context.getStore();
  if (current?.active && current.owner === owner) return work();
  const effects: Effect[] = [];
  const result = await database.transaction(async (transaction) => {
    await transaction.execute(
      sql`SELECT pg_advisory_xact_lock(${ACADEMIC_LOCK_KEY})`,
    );
    const state: AcademicContext = {
      owner,
      connection: transaction as unknown as Connection,
      effects,
      active: true,
    };
    try {
      try {
        return { ok: true as const, value: await context.run(state, work) };
      } catch (error) {
        if (error instanceof AcademicCommittedResponse)
          return { ok: false as const, error: error.responseError };
        throw error;
      }
    } finally {
      state.active = false;
    }
  });
  // A committed mutation must not be reported as rolled back because delivery failed.
  // Durable notification rows are written in the transaction; socket delivery is best effort.
  for (const effect of effects) {
    try {
      await effect();
    } catch (error) {
      logger.error(
        'Post-commit academic effect failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
  if (!result.ok) throw result.error;
  return result.value;
}

export function afterAcademicCommit(
  owner: object,
  effect: Effect,
): Promise<void> {
  const current = context.getStore();
  if (current?.active && current.owner === owner) {
    current.effects.push(effect);
    return Promise.resolve();
  }
  return Promise.resolve(effect()).then(() => undefined);
}

/** Apply only to database mutation orchestration; provider/file I/O belongs outside this lock. */
export function AcademicMutation(): MethodDecorator {
  return (_target, _key, descriptor: PropertyDescriptor) => {
    const original = descriptor.value as (
      ...args: unknown[]
    ) => Promise<unknown>;
    descriptor.value = function (
      this: { databaseService: DatabaseService },
      ...args: unknown[]
    ) {
      return this.databaseService.academicTransaction(
        () => original.apply(this, args) as Promise<unknown>,
      );
    };
    return descriptor;
  };
}
