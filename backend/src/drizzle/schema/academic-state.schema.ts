import {
  integer,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { gradingPeriodEnum, users } from './base.schema';

export const academicSystemStates = pgTable(
  'academic_system_states',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    schoolYear: text('school_year').notNull(),
    version: integer('version').notNull().default(1),
    quarter: gradingPeriodEnum('quarter').notNull().default('Q1'),
    updatedBy: uuid('updated_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    schoolYearIdx: index('academic_system_states_school_year_idx').on(
      table.schoolYear,
    ),
    quarterIdx: index('academic_system_states_quarter_idx').on(table.quarter),
    updatedAtIdx: index('academic_system_states_updated_at_idx').on(
      table.updatedAt,
    ),
  }),
);
