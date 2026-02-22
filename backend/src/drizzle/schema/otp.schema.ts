import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
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
    code: text('code').notNull(),
    purpose: otpPurposeEnum('purpose').notNull().default('email_verification'),
    expiresAt: timestamp('expires_at').notNull(),
    isUsed: boolean('is_used').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    attemptCount: integer('attempt_count').notNull().default(0),
  },
  (table) => ({
    userIdIdx: index('otp_verifications_user_id_idx').on(table.userId),
    expiresAtIdx: index('otp_verifications_expires_at_idx').on(table.expiresAt),
    purposeIdx: index('otp_verifications_purpose_idx').on(table.purpose),
    isUsedIdx: index('otp_verifications_is_used_idx').on(table.isUsed),
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
