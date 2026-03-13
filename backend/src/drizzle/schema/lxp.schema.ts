import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { assessments, classes, lessons, users } from './base.schema';

export const interventionCaseStatusEnum = pgEnum('intervention_case_status', [
  'active',
  'completed',
  'dismissed',
]);

export const lxpAssignmentTypeEnum = pgEnum('lxp_assignment_type', [
  'lesson_review',
  'assessment_retry',
]);

export const systemEvaluationTargetEnum = pgEnum('system_evaluation_target', [
  'lms',
  'lxp',
  'ai_mentor',
  'intervention',
  'overall',
]);

export const interventionCases = pgTable(
  'intervention_cases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: interventionCaseStatusEnum('status').notNull().default('active'),
    triggerSource: text('trigger_source')
      .notNull()
      .default('performance_event'),
    triggerScore: numeric('trigger_score', { precision: 6, scale: 3 }),
    thresholdApplied: numeric('threshold_applied', {
      precision: 6,
      scale: 3,
    }).notNull(),
    note: text('note'),
    openedAt: timestamp('opened_at').notNull().defaultNow(),
    closedAt: timestamp('closed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    classStudentStatusIdx: index(
      'intervention_cases_class_student_status_idx',
    ).on(table.classId, table.studentId, table.status),
    studentStatusIdx: index('intervention_cases_student_status_idx').on(
      table.studentId,
      table.status,
    ),
    classStatusIdx: index('intervention_cases_class_status_idx').on(
      table.classId,
      table.status,
    ),
  }),
);

export const interventionAssignments = pgTable(
  'intervention_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => interventionCases.id, { onDelete: 'cascade' }),
    assignmentType: lxpAssignmentTypeEnum('assignment_type').notNull(),
    lessonId: uuid('lesson_id').references(() => lessons.id, {
      onDelete: 'set null',
    }),
    assessmentId: uuid('assessment_id').references(() => assessments.id, {
      onDelete: 'set null',
    }),
    checkpointLabel: text('checkpoint_label').notNull(),
    orderIndex: integer('order_index').notNull().default(0),
    isCompleted: boolean('is_completed').notNull().default(false),
    completedAt: timestamp('completed_at'),
    xpAwarded: integer('xp_awarded').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    caseOrderIdx: index('intervention_assignments_case_order_idx').on(
      table.caseId,
      table.orderIndex,
    ),
    caseCompletedIdx: index('intervention_assignments_case_completed_idx').on(
      table.caseId,
      table.isCompleted,
    ),
    lessonIdx: index('intervention_assignments_lesson_idx').on(table.lessonId),
    assessmentIdx: index('intervention_assignments_assessment_idx').on(
      table.assessmentId,
    ),
  }),
);

export const lxpProgress = pgTable(
  'lxp_progress',
  {
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    xpTotal: integer('xp_total').notNull().default(0),
    streakDays: integer('streak_days').notNull().default(0),
    checkpointsCompleted: integer('checkpoints_completed').notNull().default(0),
    lastActivityAt: timestamp('last_activity_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.studentId, table.classId] }),
    classIdx: index('lxp_progress_class_idx').on(table.classId),
  }),
);

export const systemEvaluations = pgTable(
  'system_evaluations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    submittedBy: uuid('submitted_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    targetModule: systemEvaluationTargetEnum('target_module').notNull(),
    usabilityScore: integer('usability_score').notNull(),
    functionalityScore: integer('functionality_score').notNull(),
    performanceScore: integer('performance_score').notNull(),
    satisfactionScore: integer('satisfaction_score').notNull(),
    feedback: text('feedback'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    moduleCreatedIdx: index('system_evaluations_module_created_idx').on(
      table.targetModule,
      table.createdAt,
    ),
    userIdx: index('system_evaluations_submitted_by_idx').on(table.submittedBy),
  }),
);

export const interventionCasesRelations = relations(
  interventionCases,
  ({ one, many }) => ({
    class: one(classes, {
      fields: [interventionCases.classId],
      references: [classes.id],
    }),
    student: one(users, {
      fields: [interventionCases.studentId],
      references: [users.id],
    }),
    assignments: many(interventionAssignments),
  }),
);

export const interventionAssignmentsRelations = relations(
  interventionAssignments,
  ({ one }) => ({
    interventionCase: one(interventionCases, {
      fields: [interventionAssignments.caseId],
      references: [interventionCases.id],
    }),
    lesson: one(lessons, {
      fields: [interventionAssignments.lessonId],
      references: [lessons.id],
    }),
    assessment: one(assessments, {
      fields: [interventionAssignments.assessmentId],
      references: [assessments.id],
    }),
  }),
);

export const lxpProgressRelations = relations(lxpProgress, ({ one }) => ({
  student: one(users, {
    fields: [lxpProgress.studentId],
    references: [users.id],
  }),
  class: one(classes, {
    fields: [lxpProgress.classId],
    references: [classes.id],
  }),
}));

export const systemEvaluationsRelations = relations(
  systemEvaluations,
  ({ one }) => ({
    submitter: one(users, {
      fields: [systemEvaluations.submittedBy],
      references: [users.id],
    }),
  }),
);
