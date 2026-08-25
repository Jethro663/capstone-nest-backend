import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './base.schema';

export interface TransmutationBand {
  minInitialGrade: number;
  maxInitialGrade: number;
  transmutedGrade: number;
}

export const transmutationTables = pgTable(
  'transmutation_tables',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description'),
    isSystemDefault: boolean('is_system_default').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    bands: jsonb('bands').$type<TransmutationBand[]>().notNull(),
    updatedBy: uuid('updated_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    isActiveIdx: index('transmutation_tables_is_active_idx').on(table.isActive),
    updatedAtIdx: index('transmutation_tables_updated_at_idx').on(
      table.updatedAt,
    ),
  }),
);
