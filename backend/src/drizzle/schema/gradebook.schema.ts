import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  unique,
  index,
  numeric,
  date,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { classes } from './base.schema';
import { users } from './base.schema';
import { assessments } from './base.schema';

// ==========================================
// ENUMS
// ==========================================

export const gradingPeriodEnum = pgEnum('grading_period', [
  'Q1',
  'Q2',
  'Q3',
  'Q4',
]);

export const gradebookStatusEnum = pgEnum('gradebook_status', [
  'draft',
  'finalized',
  'locked',
]);

export const gradebookRemarksEnum = pgEnum('gradebook_remarks', [
  'Passed',
  'For Intervention',
]);

// ==========================================
// TABLES
// ==========================================

/**
 * gradebooks
 * One per class per grading period. Acts as the class record sheet header.
 */
export const gradebooks = pgTable(
  'gradebooks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    gradingPeriod: gradingPeriodEnum('grading_period').notNull(),
    status: gradebookStatusEnum('status').notNull().default('draft'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    classPeriodUnique: unique('gradebooks_class_period_unique').on(
      table.classId,
      table.gradingPeriod,
    ),
    teacherIdx: index('gradebooks_teacher_idx').on(table.teacherId),
    classIdx: index('gradebooks_class_idx').on(table.classId),
  }),
);

/**
 * gradebook_categories
 * Grading components per gradebook (e.g. Written Works 30%, Performance Tasks 40%, Quarterly Exam 30%).
 * Sum of weight_percentage for a gradebook must equal 100 before finalization.
 */
export const gradebookCategories = pgTable(
  'gradebook_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gradebookId: uuid('gradebook_id')
      .notNull()
      .references(() => gradebooks.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    weightPercentage: numeric('weight_percentage', { precision: 5, scale: 2 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    gradebookIdx: index('gradebook_categories_gradebook_idx').on(table.gradebookId),
    gradebookNameUnique: unique('gradebook_categories_name_unique').on(
      table.gradebookId,
      table.name,
    ),
  }),
);

/**
 * gradebook_items
 * Individual activities/tasks within a category.
 * May optionally be linked to an assessment for auto-score sync.
 */
export const gradebookItems = pgTable(
  'gradebook_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gradebookId: uuid('gradebook_id')
      .notNull()
      .references(() => gradebooks.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => gradebookCategories.id, { onDelete: 'cascade' }),
    assessmentId: uuid('assessment_id').references(() => assessments.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    maxScore: numeric('max_score', { precision: 8, scale: 2 }).notNull(),
    dateGiven: date('date_given'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    gradebookIdx: index('gradebook_items_gradebook_idx').on(table.gradebookId),
    categoryIdx: index('gradebook_items_category_idx').on(table.categoryId),
    assessmentIdx: index('gradebook_items_assessment_idx').on(table.assessmentId),
  }),
);

/**
 * gradebook_scores
 * Per-student, per-item score records.
 * Unique constraint prevents duplicate entries; upsert is used for sync.
 */
export const gradebookScores = pgTable(
  'gradebook_scores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gradebookItemId: uuid('gradebook_item_id')
      .notNull()
      .references(() => gradebookItems.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    score: numeric('score', { precision: 8, scale: 2 }).notNull(),
    recordedAt: timestamp('recorded_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    itemStudentUnique: unique('gradebook_scores_item_student_unique').on(
      table.gradebookItemId,
      table.studentId,
    ),
    studentIdx: index('gradebook_scores_student_idx').on(table.studentId),
    itemIdx: index('gradebook_scores_item_idx').on(table.gradebookItemId),
  }),
);

/**
 * gradebook_final_grades
 * Computed grade snapshot per student per gradebook.
 * Inserted (or replaced) during finalization.
 * remarks = 'For Intervention' when final_percentage < 74.
 */
export const gradebookFinalGrades = pgTable(
  'gradebook_final_grades',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gradebookId: uuid('gradebook_id')
      .notNull()
      .references(() => gradebooks.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    finalPercentage: numeric('final_percentage', { precision: 6, scale: 3 }).notNull(),
    remarks: gradebookRemarksEnum('remarks').notNull(),
    computedAt: timestamp('computed_at').notNull().defaultNow(),
  },
  (table) => ({
    gradebookStudentUnique: unique('gradebook_final_grades_gradebook_student_unique').on(
      table.gradebookId,
      table.studentId,
    ),
    gradebookIdx: index('gradebook_final_grades_gradebook_idx').on(table.gradebookId),
    studentIdx: index('gradebook_final_grades_student_idx').on(table.studentId),
    remarksIdx: index('gradebook_final_grades_remarks_idx').on(table.remarks),
  }),
);

// ==========================================
// RELATIONS
// ==========================================

export const gradebooksRelations = relations(gradebooks, ({ one, many }) => ({
  class: one(classes, {
    fields: [gradebooks.classId],
    references: [classes.id],
  }),
  teacher: one(users, {
    fields: [gradebooks.teacherId],
    references: [users.id],
  }),
  categories: many(gradebookCategories),
  items: many(gradebookItems),
  finalGrades: many(gradebookFinalGrades),
}));

export const gradebookCategoriesRelations = relations(
  gradebookCategories,
  ({ one, many }) => ({
    gradebook: one(gradebooks, {
      fields: [gradebookCategories.gradebookId],
      references: [gradebooks.id],
    }),
    items: many(gradebookItems),
  }),
);

export const gradebookItemsRelations = relations(
  gradebookItems,
  ({ one, many }) => ({
    gradebook: one(gradebooks, {
      fields: [gradebookItems.gradebookId],
      references: [gradebooks.id],
    }),
    category: one(gradebookCategories, {
      fields: [gradebookItems.categoryId],
      references: [gradebookCategories.id],
    }),
    assessment: one(assessments, {
      fields: [gradebookItems.assessmentId],
      references: [assessments.id],
    }),
    scores: many(gradebookScores),
  }),
);

export const gradebookScoresRelations = relations(gradebookScores, ({ one }) => ({
  item: one(gradebookItems, {
    fields: [gradebookScores.gradebookItemId],
    references: [gradebookItems.id],
  }),
  student: one(users, {
    fields: [gradebookScores.studentId],
    references: [users.id],
  }),
}));

export const gradebookFinalGradesRelations = relations(
  gradebookFinalGrades,
  ({ one }) => ({
    gradebook: one(gradebooks, {
      fields: [gradebookFinalGrades.gradebookId],
      references: [gradebooks.id],
    }),
    student: one(users, {
      fields: [gradebookFinalGrades.studentId],
      references: [users.id],
    }),
  }),
);
