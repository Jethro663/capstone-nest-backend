import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

// No domain FKs: receipts and recovery must survive deletion of old accounts.
export const systemResetState = pgTable('system_reset_state', {
  id: integer('id').primaryKey().default(1),
  active: boolean('active').notNull().default(false),
  operationId: uuid('operation_id'),
  epoch: integer('epoch').notNull().default(0),
  storageGeneration: text('storage_generation').notNull().default('legacy'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const systemResetOperations = pgTable('system_reset_operations', {
  id: uuid('id').primaryKey().defaultRandom(),
  idempotencyKey: uuid('idempotency_key').notNull().unique(),
  actorId: uuid('actor_id').notNull(),
  actorEmail: text('actor_email').notNull(),
  environment: text('environment').notNull(),
  schoolYear: text('school_year').notNull(),
  period: text('period').notNull(),
  reason: text('reason').notNull(),
  requestHash: text('request_hash').notNull(),
  phase: text('phase').notNull().default('draining'),
  manifest: jsonb('manifest').notNull().$type<Record<string, unknown>>(),
  checkpoint: jsonb('checkpoint')
    .notNull()
    .default({})
    .$type<Record<string, unknown>>(),
  failure: text('failure'),
  attempts: integer('attempts').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

// Legacy evidence has deliberately non-null, restrictive domain references.
// Reset archives the exact row here instead of weakening ordinary delete rules.
export const systemResetEvidence = pgTable('system_reset_evidence', {
  id: uuid('id').primaryKey().defaultRandom(),
  operationId: uuid('operation_id')
    .notNull()
    .references(() => systemResetOperations.id, { onDelete: 'restrict' }),
  sourceTable: text('source_table').notNull(),
  sourceId: uuid('source_id').notNull(),
  snapshot: jsonb('snapshot').notNull().$type<Record<string, unknown>>(),
  archivedAt: timestamp('archived_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const systemResetInstances = pgTable('system_reset_instances', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  cacheEpoch: integer('cache_epoch').notNull().default(-1),
  inFlight: integer('in_flight').notNull().default(0),
  retired: boolean('retired').notNull().default(false),
  heartbeatAt: timestamp('heartbeat_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
