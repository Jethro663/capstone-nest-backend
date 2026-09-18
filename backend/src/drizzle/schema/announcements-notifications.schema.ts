import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
  json,
  pgEnum,
  index,
  uniqueIndex,
  integer,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './base.schema';
import { classes } from './base.schema';

// ==========================================
// ENUMS
// ==========================================

export const notificationTypeEnum = pgEnum('notification_type', [
  'announcement_posted',
  'discussion_thread_posted',
  'discussion_comment_posted',
  'assessment_assigned',
  'grade_updated',
  'assessment_due',
  'assessment_graded',
  'grade_finalization_requested',
  'academic_lifecycle_changed',
]);

// ==========================================
// ANNOUNCEMENTS
// ==========================================

export const announcements = pgTable(
  'announcements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    isPinned: boolean('is_pinned').notNull().default(false),
    isVisible: boolean('is_visible').notNull().default(true),
    isCoreTemplateAsset: boolean('is_core_template_asset')
      .notNull()
      .default(false),
    templateId: uuid('template_id'),
    templateSourceId: uuid('template_source_id'),
    scheduledAt: timestamp('scheduled_at'),
    publishedAt: timestamp('published_at'),
    archivedAt: timestamp('archived_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    classIdIdx: index('announcements_class_id_idx').on(table.classId),
    authorIdIdx: index('announcements_author_id_idx').on(table.authorId),
    classPublishedIdx: index('announcements_class_published_idx').on(
      table.classId,
      table.publishedAt,
    ),
  }),
);

export const announcementsRelations = relations(announcements, ({ one }) => ({
  class: one(classes, {
    fields: [announcements.classId],
    references: [classes.id],
  }),
  author: one(users, {
    fields: [announcements.authorId],
    references: [users.id],
  }),
}));

// ==========================================
// NOTIFICATIONS
// ==========================================

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    referenceId: uuid('reference_id'),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body').notNull(),
    metadata: json('metadata'),
    isRead: boolean('is_read').notNull().default(false),
    readAt: timestamp('read_at'),
    hiddenAt: timestamp('hidden_at', { withTimezone: true }),
    dismissedAt: timestamp('dismissed_at', { withTimezone: true }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    userUnreadIdx: index('notifications_user_unread_idx').on(
      table.userId,
      table.isRead,
    ),
    userCreatedIdx: index('notifications_user_created_idx').on(
      table.userId,
      table.createdAt,
    ),
    userVisibilityCreatedIdx: index(
      'notifications_user_visibility_created_idx',
    ).on(table.userId, table.hiddenAt, table.dismissedAt, table.createdAt),
    userTypeReferenceUniqueIdx: uniqueIndex(
      'notifications_user_type_reference_unique_idx',
    )
      .on(table.userId, table.type, table.referenceId)
      .where(sql`reference_id IS NOT NULL`),
  }),
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const notificationDevices = pgTable(
  'notification_devices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    installationId: uuid('installation_id').notNull(),
    platform: varchar('platform', { length: 10 })
      .$type<'android' | 'ios'>()
      .notNull(),
    provider: varchar('provider', { length: 20 }).$type<'expo'>().notNull(),
    pushTokenCiphertext: text('push_token_ciphertext').notNull(),
    tokenFingerprint: varchar('token_fingerprint', { length: 64 }).notNull(),
    appVersion: varchar('app_version', { length: 50 }).notNull(),
    buildNumber: integer('build_number').notNull(),
    notificationsEnabled: boolean('notifications_enabled')
      .notNull()
      .default(true),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    disabledAt: timestamp('disabled_at', { withTimezone: true }),
    disableReason: varchar('disable_reason', { length: 50 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userInstallationUniqueIdx: uniqueIndex(
      'notification_devices_user_installation_unique_idx',
    ).on(table.userId, table.installationId),
    activeTokenFingerprintUniqueIdx: uniqueIndex(
      'notification_devices_active_token_fingerprint_unique_idx',
    )
      .on(table.tokenFingerprint)
      .where(
        sql`${table.disabledAt} IS NULL AND ${table.notificationsEnabled} = true`,
      ),
    activeUserIdx: index('notification_devices_active_user_idx')
      .on(table.userId, table.lastSeenAt)
      .where(
        sql`${table.disabledAt} IS NULL AND ${table.notificationsEnabled} = true`,
      ),
  }),
);

export const notificationDevicesRelations = relations(
  notificationDevices,
  ({ one }) => ({
    user: one(users, {
      fields: [notificationDevices.userId],
      references: [users.id],
    }),
  }),
);
