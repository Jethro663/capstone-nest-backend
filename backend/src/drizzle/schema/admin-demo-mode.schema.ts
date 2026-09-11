import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './base.schema';

export const ADMIN_DEMO_MODE_STATE_ID =
  '00000000-0000-4000-8000-000000000002' as const;

export const adminDemoModeStates = pgTable(
  'admin_demo_mode_states',
  {
    id: uuid('id').primaryKey(),
    enabled: boolean('enabled').notNull().default(false),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    reason: text('reason'),
    activatedBy: uuid('activated_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    activatedAt: timestamp('activated_at', { withTimezone: true }),
    deactivatedBy: uuid('deactivated_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
    version: integer('version').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('admin_demo_mode_states_expires_at_idx').on(table.expiresAt),
  ],
);
