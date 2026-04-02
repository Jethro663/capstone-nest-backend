import {
  boolean,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { classes, users } from './base.schema';

export const jaSessionModeEnum = pgEnum('ja_session_mode', [
  'practice',
  'review',
]);
export const jaSessionStatusEnum = pgEnum('ja_session_status', [
  'active',
  'completed',
  'deleted',
]);
export const jaRewardStateEnum = pgEnum('ja_reward_state', [
  'pending',
  'awarded',
]);
export const jaSessionEventTypeEnum = pgEnum('ja_session_event_type', [
  'focus_lost',
  'focus_restored',
  'focus_strike',
  'resumed',
  'completed',
  'deleted',
]);
export const jaXpEventTypeEnum = pgEnum('ja_xp_event_type', [
  'session_completion',
]);
export const jaThreadStatusEnum = pgEnum('ja_thread_status', [
  'active',
  'archived',
]);
export const jaThreadMessageRoleEnum = pgEnum('ja_thread_message_role', [
  'student',
  'assistant',
  'system',
]);
export const jaGuardrailEventTypeEnum = pgEnum('ja_guardrail_event_type', [
  'blocked_prompt',
]);

export const jaSessions = pgTable(
  'ja_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    mode: jaSessionModeEnum('mode').notNull().default('practice'),
    status: jaSessionStatusEnum('status').notNull().default('active'),
    questionCount: integer('question_count').notNull().default(10),
    currentIndex: integer('current_index').notNull().default(0),
    strikeCount: integer('strike_count').notNull().default(0),
    rewardState: jaRewardStateEnum('reward_state').notNull().default('pending'),
    sourceSnapshotJson: json('source_snapshot_json'),
    groundingStatus: text('grounding_status').notNull().default('grounded'),
    startedAt: timestamp('started_at').notNull().defaultNow(),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    studentStatusIdx: index('ja_sessions_student_status_idx').on(
      table.studentId,
      table.status,
    ),
    classStatusIdx: index('ja_sessions_class_status_idx').on(
      table.classId,
      table.status,
    ),
    startedAtIdx: index('ja_sessions_started_at_idx').on(table.startedAt),
  }),
);

export const jaSessionItems = pgTable(
  'ja_session_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => jaSessions.id, { onDelete: 'cascade' }),
    orderIndex: integer('order_index').notNull(),
    itemType: text('item_type').notNull(),
    prompt: text('prompt').notNull(),
    optionsJson: json('options_json'),
    answerKeyJson: json('answer_key_json').notNull(),
    hint: text('hint'),
    explanation: text('explanation'),
    citationsJson: json('citations_json'),
    validationJson: json('validation_json'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    sessionOrderUnique: uniqueIndex('ja_session_items_session_order_unique').on(
      table.sessionId,
      table.orderIndex,
    ),
    sessionIdx: index('ja_session_items_session_idx').on(table.sessionId),
  }),
);

export const jaSessionResponses = pgTable(
  'ja_session_responses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionItemId: uuid('session_item_id')
      .notNull()
      .references(() => jaSessionItems.id, { onDelete: 'cascade' }),
    studentAnswerJson: json('student_answer_json').notNull(),
    isCorrect: boolean('is_correct').notNull().default(false),
    scoreDelta: integer('score_delta').notNull().default(0),
    feedback: text('feedback'),
    answeredAt: timestamp('answered_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    sessionItemUnique: uniqueIndex(
      'ja_session_responses_session_item_unique',
    ).on(table.sessionItemId),
  }),
);

export const jaSessionEvents = pgTable(
  'ja_session_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => jaSessions.id, { onDelete: 'cascade' }),
    eventType: jaSessionEventTypeEnum('event_type').notNull(),
    payloadJson: json('payload_json'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    sessionCreatedAtIdx: index('ja_session_events_session_created_at_idx').on(
      table.sessionId,
      table.createdAt,
    ),
  }),
);

export const jaProgress = pgTable(
  'ja_progress',
  {
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    xpTotal: integer('xp_total').notNull().default(0),
    streakDays: integer('streak_days').notNull().default(0),
    sessionsCompleted: integer('sessions_completed').notNull().default(0),
    lastActivityAt: timestamp('last_activity_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.studentId, table.classId] }),
    classIdx: index('ja_progress_class_idx').on(table.classId),
  }),
);

export const jaXpLedger = pgTable(
  'ja_xp_ledger',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id').references(() => jaSessions.id, {
      onDelete: 'set null',
    }),
    eventType: jaXpEventTypeEnum('event_type')
      .notNull()
      .default('session_completion'),
    xpDelta: integer('xp_delta').notNull(),
    metadataJson: json('metadata_json'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    studentClassIdx: index('ja_xp_ledger_student_class_idx').on(
      table.studentId,
      table.classId,
    ),
    sessionEventUnique: uniqueIndex('ja_xp_ledger_session_event_unique').on(
      table.sessionId,
      table.eventType,
    ),
  }),
);

export const jaThreads = pgTable(
  'ja_threads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default('JA Ask Thread'),
    status: jaThreadStatusEnum('status').notNull().default('active'),
    lastMessageAt: timestamp('last_message_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    studentClassIdx: index('ja_threads_student_class_idx').on(
      table.studentId,
      table.classId,
    ),
    classStatusIdx: index('ja_threads_class_status_idx').on(
      table.classId,
      table.status,
    ),
  }),
);

export const jaThreadMessages = pgTable(
  'ja_thread_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => jaThreads.id, { onDelete: 'cascade' }),
    role: jaThreadMessageRoleEnum('role').notNull(),
    content: text('content').notNull(),
    citationsJson: json('citations_json'),
    quickAction: text('quick_action'),
    blocked: boolean('blocked').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    threadCreatedAtIdx: index('ja_thread_messages_thread_created_at_idx').on(
      table.threadId,
      table.createdAt,
    ),
  }),
);

export const jaGuardrailEvents = pgTable(
  'ja_guardrail_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    threadId: uuid('thread_id').references(() => jaThreads.id, {
      onDelete: 'set null',
    }),
    messageId: uuid('message_id').references(() => jaThreadMessages.id, {
      onDelete: 'set null',
    }),
    eventType: jaGuardrailEventTypeEnum('event_type').notNull(),
    payloadJson: json('payload_json'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    studentClassIdx: index('ja_guardrail_events_student_class_idx').on(
      table.studentId,
      table.classId,
    ),
    threadCreatedAtIdx: index('ja_guardrail_events_thread_created_at_idx').on(
      table.threadId,
      table.createdAt,
    ),
  }),
);

export const jaSessionsRelations = relations(jaSessions, ({ one, many }) => ({
  student: one(users, {
    fields: [jaSessions.studentId],
    references: [users.id],
  }),
  class: one(classes, {
    fields: [jaSessions.classId],
    references: [classes.id],
  }),
  items: many(jaSessionItems),
  events: many(jaSessionEvents),
  xpLedger: many(jaXpLedger),
}));

export const jaSessionItemsRelations = relations(
  jaSessionItems,
  ({ one, many }) => ({
    session: one(jaSessions, {
      fields: [jaSessionItems.sessionId],
      references: [jaSessions.id],
    }),
    responses: many(jaSessionResponses),
  }),
);

export const jaSessionResponsesRelations = relations(
  jaSessionResponses,
  ({ one }) => ({
    sessionItem: one(jaSessionItems, {
      fields: [jaSessionResponses.sessionItemId],
      references: [jaSessionItems.id],
    }),
  }),
);

export const jaSessionEventsRelations = relations(
  jaSessionEvents,
  ({ one }) => ({
    session: one(jaSessions, {
      fields: [jaSessionEvents.sessionId],
      references: [jaSessions.id],
    }),
  }),
);

export const jaProgressRelations = relations(jaProgress, ({ one }) => ({
  student: one(users, {
    fields: [jaProgress.studentId],
    references: [users.id],
  }),
  class: one(classes, {
    fields: [jaProgress.classId],
    references: [classes.id],
  }),
}));

export const jaXpLedgerRelations = relations(jaXpLedger, ({ one }) => ({
  student: one(users, {
    fields: [jaXpLedger.studentId],
    references: [users.id],
  }),
  class: one(classes, {
    fields: [jaXpLedger.classId],
    references: [classes.id],
  }),
  session: one(jaSessions, {
    fields: [jaXpLedger.sessionId],
    references: [jaSessions.id],
  }),
}));

export const jaThreadsRelations = relations(jaThreads, ({ one, many }) => ({
  student: one(users, {
    fields: [jaThreads.studentId],
    references: [users.id],
  }),
  class: one(classes, {
    fields: [jaThreads.classId],
    references: [classes.id],
  }),
  messages: many(jaThreadMessages),
  guardrailEvents: many(jaGuardrailEvents),
}));

export const jaThreadMessagesRelations = relations(
  jaThreadMessages,
  ({ one, many }) => ({
    thread: one(jaThreads, {
      fields: [jaThreadMessages.threadId],
      references: [jaThreads.id],
    }),
    guardrailEvents: many(jaGuardrailEvents),
  }),
);

export const jaGuardrailEventsRelations = relations(
  jaGuardrailEvents,
  ({ one }) => ({
    student: one(users, {
      fields: [jaGuardrailEvents.studentId],
      references: [users.id],
    }),
    class: one(classes, {
      fields: [jaGuardrailEvents.classId],
      references: [classes.id],
    }),
    thread: one(jaThreads, {
      fields: [jaGuardrailEvents.threadId],
      references: [jaThreads.id],
    }),
    message: one(jaThreadMessages, {
      fields: [jaGuardrailEvents.messageId],
      references: [jaThreadMessages.id],
    }),
  }),
);
