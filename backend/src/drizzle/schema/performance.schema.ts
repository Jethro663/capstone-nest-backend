import {
  pgTable,
  uuid,
  numeric,
  integer,
  boolean,
  timestamp,
  text,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { classes, users } from './base.schema';

export const performanceSnapshots = pgTable(
  'performance_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    assessmentAverage: numeric('assessment_average', {
      precision: 6,
      scale: 3,
    }),
    classRecordAverage: numeric('class_record_average', {
      precision: 6,
      scale: 3,
    }),
    blendedScore: numeric('blended_score', { precision: 6, scale: 3 }),
    assessmentSampleSize: integer('assessment_sample_size')
      .notNull()
      .default(0),
    classRecordSampleSize: integer('class_record_sample_size')
      .notNull()
      .default(0),
    hasData: boolean('has_data').notNull().default(false),
    isAtRisk: boolean('is_at_risk').notNull().default(false),
    thresholdApplied: numeric('threshold_applied', {
      precision: 6,
      scale: 3,
    })
      .notNull()
      .default('74'),
    lastComputedAt: timestamp('last_computed_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    classStudentUnique: unique('performance_snapshots_class_student_unique').on(
      table.classId,
      table.studentId,
    ),
    classRiskIdx: index('performance_snapshots_class_risk_idx').on(
      table.classId,
      table.isAtRisk,
    ),
    classStudentIdx: index('performance_snapshots_class_student_idx').on(
      table.classId,
      table.studentId,
    ),
    classIdx: index('performance_snapshots_class_idx').on(table.classId),
    studentIdx: index('performance_snapshots_student_idx').on(table.studentId),
  }),
);

export const performanceLogs = pgTable(
  'performance_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    previousIsAtRisk: boolean('previous_is_at_risk'),
    currentIsAtRisk: boolean('current_is_at_risk').notNull(),
    assessmentAverage: numeric('assessment_average', {
      precision: 6,
      scale: 3,
    }),
    classRecordAverage: numeric('class_record_average', {
      precision: 6,
      scale: 3,
    }),
    blendedScore: numeric('blended_score', { precision: 6, scale: 3 }),
    thresholdApplied: numeric('threshold_applied', {
      precision: 6,
      scale: 3,
    }).notNull(),
    triggerSource: text('trigger_source').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    classCreatedAtIdx: index('performance_logs_class_created_at_idx').on(
      table.classId,
      table.createdAt,
    ),
    classStudentIdx: index('performance_logs_class_student_idx').on(
      table.classId,
      table.studentId,
    ),
    studentCreatedAtIdx: index('performance_logs_student_created_at_idx').on(
      table.studentId,
      table.createdAt,
    ),
  }),
);

export const performanceSnapshotsRelations = relations(
  performanceSnapshots,
  ({ one }) => ({
    class: one(classes, {
      fields: [performanceSnapshots.classId],
      references: [classes.id],
    }),
    student: one(users, {
      fields: [performanceSnapshots.studentId],
      references: [users.id],
    }),
  }),
);

export const performanceLogsRelations = relations(
  performanceLogs,
  ({ one }) => ({
    class: one(classes, {
      fields: [performanceLogs.classId],
      references: [classes.id],
    }),
    student: one(users, {
      fields: [performanceLogs.studentId],
      references: [users.id],
    }),
  }),
);
