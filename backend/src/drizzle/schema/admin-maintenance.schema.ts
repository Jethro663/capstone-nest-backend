import { relations, sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './base.schema';

export type AdminMaintenanceSessionStatus =
  | 'ACTIVE'
  | 'CLOSED'
  | 'EXPIRED'
  | 'REVOKED';

export type AdminMaintenanceScopeCode =
  | 'ACADEMIC_STRUCTURE'
  | 'ROSTER'
  | 'ACCOUNT_LIFECYCLE';

export const adminMaintenanceSessions = pgTable(
  'admin_maintenance_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorUserId: uuid('actor_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    actorSessionVersion: integer('actor_session_version').notNull(),
    status: text('status')
      .$type<AdminMaintenanceSessionStatus>()
      .notNull()
      .default('ACTIVE'),
    scopeCodes: jsonb('scope_codes')
      .$type<AdminMaintenanceScopeCode[]>()
      .notNull(),
    reason: text('reason').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'admin_maintenance_session_status_valid',
      sql`${table.status} IN ('ACTIVE','CLOSED','EXPIRED','REVOKED')`,
    ),
    check(
      'admin_maintenance_session_expiry_valid',
      sql`${table.expiresAt} > ${table.startedAt}`,
    ),
    uniqueIndex('admin_maintenance_session_actor_active_unique')
      .on(table.actorUserId)
      .where(sql`${table.status} = 'ACTIVE'`),
    index('admin_maintenance_session_actor_idx').on(table.actorUserId),
    index('admin_maintenance_session_expiry_idx').on(table.expiresAt),
    index('admin_maintenance_session_status_idx').on(table.status),
  ],
);

export const adminMaintenanceSessionsRelations = relations(
  adminMaintenanceSessions,
  ({ one }) => ({
    actor: one(users, {
      fields: [adminMaintenanceSessions.actorUserId],
      references: [users.id],
    }),
  }),
);
