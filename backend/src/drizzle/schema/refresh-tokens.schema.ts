import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './base.schema';

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    userAgent: text('user_agent'),
    ip: text('ip'),
    revoked: boolean('revoked').notNull().default(false),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('refresh_tokens_user_id_idx').on(table.userId),
    tokenHashIdx: index('refresh_tokens_token_hash_idx').on(table.tokenHash),
    revokedIdx: index('refresh_tokens_revoked_idx').on(table.revoked),
    expiresAtIdx: index('refresh_tokens_expires_at_idx').on(table.expiresAt),
  }),
);

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));
