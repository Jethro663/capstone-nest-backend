import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { classes, uploadedFiles, users } from './base.schema';

export const discussionThreadStatusEnum = pgEnum('discussion_thread_status', [
  'draft',
  'published',
  'closed',
  'archived',
]);

export const discussionReactionTypeEnum = pgEnum('discussion_reaction_type', [
  'like',
  'heart',
  'wow',
]);

export const discussionAttachmentTypeEnum = pgEnum(
  'discussion_attachment_type',
  ['image', 'pdf', 'link'],
);

export const discussionThreads = pgTable(
  'discussion_threads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    bodyHtml: text('body_html').notNull(),
    themeId: varchar('theme_id', { length: 64 }).notNull().default('classic'),
    commentLimitPerStudent: integer('comment_limit_per_student'),
    allowComments: boolean('allow_comments').notNull().default(true),
    isPinned: boolean('is_pinned').notNull().default(false),
    status: discussionThreadStatusEnum('status').notNull().default('draft'),
    publishedAt: timestamp('published_at'),
    closedAt: timestamp('closed_at'),
    archivedAt: timestamp('archived_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    classStatusPublishedIdx: index(
      'discussion_threads_class_status_pub_idx',
    ).on(table.classId, table.status, table.publishedAt),
    classCreatedIdx: index('discussion_threads_class_created_idx').on(
      table.classId,
      table.createdAt,
    ),
    authorIdx: index('discussion_threads_author_idx').on(table.authorId),
  }),
);

export const discussionThreadAttachments = pgTable(
  'discussion_thread_attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => discussionThreads.id, { onDelete: 'cascade' }),
    attachmentType: discussionAttachmentTypeEnum('attachment_type').notNull(),
    fileId: uuid('file_id').references(() => uploadedFiles.id, {
      onDelete: 'set null',
    }),
    linkUrl: text('link_url'),
    linkLabel: varchar('link_label', { length: 255 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    threadIdx: index('discussion_thread_attachments_thread_idx').on(
      table.threadId,
    ),
    fileIdx: index('discussion_thread_attachments_file_idx').on(table.fileId),
  }),
);

export const discussionComments = pgTable(
  'discussion_comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => discussionThreads.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    bodyHtml: text('body_html'),
    deletedAt: timestamp('deleted_at'),
    deletedById: uuid('deleted_by_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    threadCreatedIdx: index('discussion_comments_thread_created_idx').on(
      table.threadId,
      table.createdAt,
    ),
    authorIdx: index('discussion_comments_author_idx').on(table.authorId),
  }),
);

export const discussionCommentAttachments = pgTable(
  'discussion_comment_attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    commentId: uuid('comment_id')
      .notNull()
      .references(() => discussionComments.id, { onDelete: 'cascade' }),
    fileId: uuid('file_id')
      .notNull()
      .references(() => uploadedFiles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    commentIdx: index('discussion_comment_attachments_comment_idx').on(
      table.commentId,
    ),
    fileIdx: index('discussion_comment_attachments_file_idx').on(table.fileId),
    commentFileUniqueIdx: uniqueIndex(
      'discussion_comment_attachments_comment_file_unique_idx',
    ).on(table.commentId, table.fileId),
  }),
);

export const discussionCommentReactions = pgTable(
  'discussion_comment_reactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    commentId: uuid('comment_id')
      .notNull()
      .references(() => discussionComments.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reactionType: discussionReactionTypeEnum('reaction_type').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    commentIdx: index('discussion_comment_reactions_comment_idx').on(
      table.commentId,
    ),
    userIdx: index('discussion_comment_reactions_user_idx').on(table.userId),
    commentUserUniqueIdx: uniqueIndex(
      'discussion_comment_reactions_comment_user_unique_idx',
    ).on(table.commentId, table.userId),
  }),
);

export const discussionThreadsRelations = relations(
  discussionThreads,
  ({ one, many }) => ({
    class: one(classes, {
      fields: [discussionThreads.classId],
      references: [classes.id],
    }),
    author: one(users, {
      fields: [discussionThreads.authorId],
      references: [users.id],
    }),
    attachments: many(discussionThreadAttachments),
    comments: many(discussionComments),
  }),
);

export const discussionThreadAttachmentsRelations = relations(
  discussionThreadAttachments,
  ({ one }) => ({
    thread: one(discussionThreads, {
      fields: [discussionThreadAttachments.threadId],
      references: [discussionThreads.id],
    }),
    file: one(uploadedFiles, {
      fields: [discussionThreadAttachments.fileId],
      references: [uploadedFiles.id],
    }),
  }),
);

export const discussionCommentsRelations = relations(
  discussionComments,
  ({ one, many }) => ({
    thread: one(discussionThreads, {
      fields: [discussionComments.threadId],
      references: [discussionThreads.id],
    }),
    author: one(users, {
      fields: [discussionComments.authorId],
      references: [users.id],
    }),
    deletedBy: one(users, {
      fields: [discussionComments.deletedById],
      references: [users.id],
    }),
    attachments: many(discussionCommentAttachments),
    reactions: many(discussionCommentReactions),
  }),
);

export const discussionCommentAttachmentsRelations = relations(
  discussionCommentAttachments,
  ({ one }) => ({
    comment: one(discussionComments, {
      fields: [discussionCommentAttachments.commentId],
      references: [discussionComments.id],
    }),
    file: one(uploadedFiles, {
      fields: [discussionCommentAttachments.fileId],
      references: [uploadedFiles.id],
    }),
  }),
);

export const discussionCommentReactionsRelations = relations(
  discussionCommentReactions,
  ({ one }) => ({
    comment: one(discussionComments, {
      fields: [discussionCommentReactions.commentId],
      references: [discussionComments.id],
    }),
    user: one(users, {
      fields: [discussionCommentReactions.userId],
      references: [users.id],
    }),
  }),
);
