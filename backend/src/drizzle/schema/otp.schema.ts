import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './base.schema';

export const otpPurposeEnum = pgEnum('otp_purpose', [
  'email_verification',
  'password_reset',
  'login_2fa', // Reserved for future 2FA — not yet implemented; do not remove without a migration
]);

export const otpVerifications = pgTable(
  'otp_verifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    codeHash: text('code_hash').notNull(),
    purpose: otpPurposeEnum('purpose').notNull().default('email_verification'),
    expiresAt: timestamp('expires_at').notNull(),
    isUsed: boolean('is_used').notNull().default(false),
    usedAt: timestamp('used_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    attemptCount: integer('attempt_count').notNull().default(0),
  },
  (table) => ({
    userIdIdx: index('otp_verifications_user_id_idx').on(table.userId),
    expiresAtIdx: index('otp_verifications_expires_at_idx').on(table.expiresAt),
    purposeIdx: index('otp_verifications_purpose_idx').on(table.purpose),
    isUsedIdx: index('otp_verifications_is_used_idx').on(table.isUsed),
    // Partial unique index: only one active (is_used = false) OTP per user per purpose.
    // Mirrors migration 0025_otp_partial_unique_index.sql
    activeUniqueIdx: uniqueIndex('otp_active_unique_idx')
      .on(table.userId, table.purpose)
      .where(sql`is_used = false`),
  }),
);

export const otpVerificationsRelations = relations(
  otpVerifications,
  ({ one }) => ({
    user: one(users, {
      fields: [otpVerifications.userId],
      references: [users.id],
    }),
  }),
);
