import {
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { assessments, users } from './base.schema';

export const assessmentEditorReceipts = pgTable(
  'assessment_editor_receipts',
  {
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mutationId: uuid('mutation_id').notNull(),
    assessmentId: uuid('assessment_id')
      .notNull()
      .references(() => assessments.id, { onDelete: 'cascade' }),
    requestHash: text('request_hash').notNull(),
    response: jsonb('response').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.actorId, table.mutationId] })],
);
