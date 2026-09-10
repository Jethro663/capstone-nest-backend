import { relations, sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  auditLogs,
  classes,
  enrollments,
  gradingPeriodEnum,
  sections,
  users,
} from './base.schema';

export type AdminLifecycleAction =
  | 'STUDENT_RESOLUTION'
  | 'ARCHIVE_CLASS'
  | 'ARCHIVE_SECTION'
  | 'PURGE_CLASS'
  | 'PURGE_SECTION';

export type AdminLifecycleOperationStatus =
  | 'executing'
  | 'completed'
  | 'failed';

export type EnrollmentLifecycleOutcome =
  | 'corrected'
  | 'withdrawn'
  | 'transferred_section'
  | 'transferred_class'
  | 'completed'
  | 'archived';

export interface LifecycleActorSnapshot {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
}

export const adminLifecycleOperations = pgTable(
  'admin_lifecycle_operations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    action: text('action').$type<AdminLifecycleAction>().notNull(),
    targetType: text('target_type').notNull(),
    targetId: uuid('target_id').notNull(),
    status: text('status')
      .$type<AdminLifecycleOperationStatus>()
      .notNull()
      .default('executing'),
    actorId: uuid('actor_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    actorSnapshot: jsonb('actor_snapshot')
      .$type<LifecycleActorSnapshot>()
      .notNull(),
    idempotencyKey: uuid('idempotency_key').notNull().unique(),
    requestHash: text('request_hash').notNull(),
    manifestHash: text('manifest_hash').notNull(),
    reasonCode: text('reason_code').notNull(),
    notes: text('notes').notNull(),
    attemptCount: integer('attempt_count').notNull().default(1),
    result: jsonb('result').$type<Record<string, unknown>>(),
    failure: text('failure'),
    auditLogId: uuid('audit_log_id').references(() => auditLogs.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    check(
      'admin_lifecycle_operation_action_valid',
      sql`${table.action} IN ('STUDENT_RESOLUTION','ARCHIVE_CLASS','ARCHIVE_SECTION','PURGE_CLASS','PURGE_SECTION')`,
    ),
    check(
      'admin_lifecycle_operation_status_valid',
      sql`${table.status} IN ('executing','completed','failed')`,
    ),
    check(
      'admin_lifecycle_operation_attempt_count_valid',
      sql`${table.attemptCount} >= 1`,
    ),
    index('admin_lifecycle_operation_actor_idx').on(table.actorId),
    index('admin_lifecycle_operation_target_idx').on(
      table.targetType,
      table.targetId,
    ),
    index('admin_lifecycle_operation_status_idx').on(table.status),
    index('admin_lifecycle_operation_created_at_idx').on(table.createdAt),
  ],
);

export const enrollmentLifecycleEvents = pgTable(
  'enrollment_lifecycle_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    operationId: uuid('operation_id')
      .notNull()
      .references(() => adminLifecycleOperations.id, { onDelete: 'restrict' }),
    enrollmentId: uuid('enrollment_id').references(() => enrollments.id, {
      onDelete: 'set null',
    }),
    studentId: uuid('student_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    studentSnapshot: jsonb('student_snapshot')
      .$type<LifecycleActorSnapshot>()
      .notNull(),
    classId: uuid('class_id').references(() => classes.id, {
      onDelete: 'set null',
    }),
    sectionId: uuid('section_id').references(() => sections.id, {
      onDelete: 'set null',
    }),
    destinationClassId: uuid('destination_class_id').references(
      () => classes.id,
      {
        onDelete: 'set null',
      },
    ),
    destinationSectionId: uuid('destination_section_id').references(
      () => sections.id,
      { onDelete: 'set null' },
    ),
    fromStatus: text('from_status').notNull(),
    toStatus: text('to_status').notNull(),
    outcome: text('outcome').$type<EnrollmentLifecycleOutcome>().notNull(),
    effectivePeriod: gradingPeriodEnum('effective_period').notNull(),
    reasonCode: text('reason_code').notNull(),
    notes: text('notes').notNull(),
    actorId: uuid('actor_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    actorSnapshot: jsonb('actor_snapshot')
      .$type<LifecycleActorSnapshot>()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'enrollment_lifecycle_event_status_valid',
      sql`${table.fromStatus} IN ('enrolled','dropped','completed') AND ${table.toStatus} IN ('enrolled','dropped','completed')`,
    ),
    check(
      'enrollment_lifecycle_event_outcome_valid',
      sql`${table.outcome} IN ('corrected','withdrawn','transferred_section','transferred_class','completed','archived')`,
    ),
    unique('enrollment_lifecycle_event_operation_enrollment_unique').on(
      table.operationId,
      table.enrollmentId,
    ),
    index('enrollment_lifecycle_event_operation_idx').on(table.operationId),
    index('enrollment_lifecycle_event_student_idx').on(table.studentId),
    index('enrollment_lifecycle_event_class_idx').on(table.classId),
    index('enrollment_lifecycle_event_section_idx').on(table.sectionId),
    index('enrollment_lifecycle_event_created_at_idx').on(table.createdAt),
  ],
);

export const adminLifecycleOperationsRelations = relations(
  adminLifecycleOperations,
  ({ one, many }) => ({
    actor: one(users, {
      fields: [adminLifecycleOperations.actorId],
      references: [users.id],
    }),
    events: many(enrollmentLifecycleEvents),
  }),
);

export const enrollmentLifecycleEventsRelations = relations(
  enrollmentLifecycleEvents,
  ({ one }) => ({
    operation: one(adminLifecycleOperations, {
      fields: [enrollmentLifecycleEvents.operationId],
      references: [adminLifecycleOperations.id],
    }),
    enrollment: one(enrollments, {
      fields: [enrollmentLifecycleEvents.enrollmentId],
      references: [enrollments.id],
    }),
    student: one(users, {
      fields: [enrollmentLifecycleEvents.studentId],
      references: [users.id],
    }),
    class: one(classes, {
      fields: [enrollmentLifecycleEvents.classId],
      references: [classes.id],
    }),
    section: one(sections, {
      fields: [enrollmentLifecycleEvents.sectionId],
      references: [sections.id],
    }),
  }),
);
