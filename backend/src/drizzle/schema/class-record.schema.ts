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
  integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { classes, users, assessments, gradingPeriodEnum } from './base.schema';

// ==========================================
// ENUMS
// ==========================================

// gradingPeriodEnum is defined in base.schema.ts (shared with assessments)
export { gradingPeriodEnum } from './base.schema';

export const classRecordStatusEnum = pgEnum('class_record_status', [
  'draft',
  'finalized',
  'locked',
]);

export const classRecordRemarksEnum = pgEnum('class_record_remarks', [
  'Passed',
  'For Intervention',
]);

// ==========================================
// TABLES
// ==========================================

/**
 * class_records
 * One per class per grading period. Acts as the class record sheet header.
 */
export const classRecords = pgTable(
  'class_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    gradingPeriod: gradingPeriodEnum('grading_period').notNull(),
    status: classRecordStatusEnum('status').notNull().default('draft'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    classPeriodUnique: unique('class_records_class_period_unique').on(
      table.classId,
      table.gradingPeriod,
    ),
    teacherIdx: index('class_records_teacher_idx').on(table.teacherId),
    classIdx: index('class_records_class_idx').on(table.classId),
  }),
);

/**
 * class_record_categories
 * Grading components per class record.
 * Default DepEd categories: Written Works (30%), Performance Tasks (50%), Quarterly Assessment (20%).
 * Sum of weight_percentage for a class record must equal 100 before finalization.
 */
export const classRecordCategories = pgTable(
  'class_record_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    classRecordId: uuid('gradebook_id')
      .notNull()
      .references(() => classRecords.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    weightPercentage: numeric('weight_percentage', {
      precision: 5,
      scale: 2,
    }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    classRecordIdx: index('class_record_categories_class_record_idx').on(
      table.classRecordId,
    ),
    classRecordNameUnique: unique('class_record_categories_name_unique').on(
      table.classRecordId,
      table.name,
    ),
  }),
);

/**
 * class_record_items
 * Individual activities/tasks (columns) within a category.
 * May optionally be linked to an assessment for auto-score sync.
 * item_order controls the column position in the spreadsheet.
 */
export const classRecordItems = pgTable(
  'class_record_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    classRecordId: uuid('gradebook_id')
      .notNull()
      .references(() => classRecords.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => classRecordCategories.id, { onDelete: 'cascade' }),
    assessmentId: uuid('assessment_id').references(() => assessments.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    maxScore: numeric('max_score', { precision: 8, scale: 2 }).notNull(),
    itemOrder: integer('item_order').notNull().default(0),
    dateGiven: date('date_given'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    classRecordIdx: index('class_record_items_class_record_idx').on(
      table.classRecordId,
    ),
    categoryIdx: index('class_record_items_category_idx').on(table.categoryId),
    assessmentIdx: index('class_record_items_assessment_idx').on(
      table.assessmentId,
    ),
    orderIdx: index('class_record_items_order_idx').on(table.itemOrder),
  }),
);

/**
 * class_record_scores
 * Per-student, per-item score records.
 * Unique constraint prevents duplicate entries; upsert is used for sync.
 */
export const classRecordScores = pgTable(
  'class_record_scores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    classRecordItemId: uuid('gradebook_item_id')
      .notNull()
      .references(() => classRecordItems.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    score: numeric('score', { precision: 8, scale: 2 }).notNull(),
    recordedAt: timestamp('recorded_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    itemStudentUnique: unique('class_record_scores_item_student_unique').on(
      table.classRecordItemId,
      table.studentId,
    ),
    studentIdx: index('class_record_scores_student_idx').on(table.studentId),
    itemIdx: index('class_record_scores_item_idx').on(table.classRecordItemId),
  }),
);

/**
 * class_record_final_grades
 * Computed grade snapshot per student per class record.
 * Inserted (or replaced) during finalization.
 * remarks = 'For Intervention' when quarterly grade < 75.
 */
export const classRecordFinalGrades = pgTable(
  'class_record_final_grades',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    classRecordId: uuid('gradebook_id')
      .notNull()
      .references(() => classRecords.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    finalPercentage: numeric('final_percentage', {
      precision: 6,
      scale: 3,
    }).notNull(),
    remarks: classRecordRemarksEnum('remarks').notNull(),
    computedAt: timestamp('computed_at').notNull().defaultNow(),
  },
  (table) => ({
    classRecordStudentUnique: unique(
      'class_record_final_grades_record_student_unique',
    ).on(table.classRecordId, table.studentId),
    classRecordIdx: index('class_record_final_grades_record_idx').on(
      table.classRecordId,
    ),
    studentIdx: index('class_record_final_grades_student_idx').on(
      table.studentId,
    ),
    remarksIdx: index('class_record_final_grades_remarks_idx').on(
      table.remarks,
    ),
  }),
);

// ==========================================
// RELATIONS
// ==========================================

export const classRecordsRelations = relations(
  classRecords,
  ({ one, many }) => ({
    class: one(classes, {
      fields: [classRecords.classId],
      references: [classes.id],
    }),
    teacher: one(users, {
      fields: [classRecords.teacherId],
      references: [users.id],
    }),
    categories: many(classRecordCategories),
    items: many(classRecordItems),
    finalGrades: many(classRecordFinalGrades),
  }),
);

export const classRecordCategoriesRelations = relations(
  classRecordCategories,
  ({ one, many }) => ({
    classRecord: one(classRecords, {
      fields: [classRecordCategories.classRecordId],
      references: [classRecords.id],
    }),
    items: many(classRecordItems),
  }),
);

export const classRecordItemsRelations = relations(
  classRecordItems,
  ({ one, many }) => ({
    classRecord: one(classRecords, {
      fields: [classRecordItems.classRecordId],
      references: [classRecords.id],
    }),
    category: one(classRecordCategories, {
      fields: [classRecordItems.categoryId],
      references: [classRecordCategories.id],
    }),
    assessment: one(assessments, {
      fields: [classRecordItems.assessmentId],
      references: [assessments.id],
    }),
    scores: many(classRecordScores),
  }),
);

export const classRecordScoresRelations = relations(
  classRecordScores,
  ({ one }) => ({
    item: one(classRecordItems, {
      fields: [classRecordScores.classRecordItemId],
      references: [classRecordItems.id],
    }),
    student: one(users, {
      fields: [classRecordScores.studentId],
      references: [users.id],
    }),
  }),
);

export const classRecordFinalGradesRelations = relations(
  classRecordFinalGrades,
  ({ one }) => ({
    classRecord: one(classRecords, {
      fields: [classRecordFinalGrades.classRecordId],
      references: [classRecords.id],
    }),
    student: one(users, {
      fields: [classRecordFinalGrades.studentId],
      references: [users.id],
    }),
  }),
);
