import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './base.schema';
import { classes } from './base.schema';

// ==========================================
// ENUMS
// ==========================================

export const notificationTypeEnum = pgEnum('notification_type', [
  'announcement_posted',
  'grade_updated',
  'assessment_due',
  'assessment_graded',
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
    isRead: boolean('is_read').notNull().default(false),
    readAt: timestamp('read_at'),
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
  }),
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
