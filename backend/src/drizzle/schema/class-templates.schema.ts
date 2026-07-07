import {
  pgEnum,
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  json,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import {
  classModules,
  moduleSections,
  moduleItems,
  users,
} from './base.schema';

export const classTemplateStatusEnum = pgEnum('class_template_status', [
  'draft',
  'published',
]);

export const classTemplateItemTypeEnum = pgEnum('class_template_item_type', [
  'assessment',
  'lesson',
  'file',
]);

export const classTemplates = pgTable(
  'class_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 180 }).notNull(),
    subjectCode: varchar('subject_code', { length: 64 }).notNull(),
    subjectGradeLevel: varchar('subject_grade_level', { length: 10 }).notNull(),
    status: classTemplateStatusEnum('status').notNull().default('draft'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    publishedAt: timestamp('published_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    subjectIdx: index('class_templates_subject_idx').on(
      table.subjectCode,
      table.subjectGradeLevel,
    ),
    createdByIdx: index('class_templates_created_by_idx').on(table.createdBy),
    uniqueNameBySubject: unique('class_templates_unique_name_by_subject').on(
      table.name,
      table.subjectCode,
      table.subjectGradeLevel,
    ),
  }),
);

export const classTemplateModules = pgTable(
  'class_template_modules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    templateId: uuid('template_id')
      .notNull()
      .references(() => classTemplates.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    order: integer('order').notNull().default(0),
    themeKind: text('theme_kind').notNull().default('gradient'),
    gradientId: text('gradient_id').notNull().default('oceanic-blue'),
    coverImageUrl: text('cover_image_url'),
    imagePositionX: integer('image_position_x').notNull().default(50),
    imagePositionY: integer('image_position_y').notNull().default(50),
    imageScale: integer('image_scale').notNull().default(120),
    isVisible: boolean('is_visible').notNull().default(false),
    isLocked: boolean('is_locked').notNull().default(true),
    teacherNotes: text('teacher_notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    templateOrderIdx: index('class_template_modules_template_order_idx').on(
      table.templateId,
      table.order,
    ),
  }),
);

export const classTemplateModuleSections = pgTable(
  'class_template_module_sections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    templateModuleId: uuid('template_module_id')
      .notNull()
      .references(() => classTemplateModules.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    order: integer('order').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    sectionOrderIdx: index('class_template_module_sections_order_idx').on(
      table.templateModuleId,
      table.order,
    ),
  }),
);

export const classTemplateAssessments = pgTable(
  'class_template_assessments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    templateId: uuid('template_id')
      .notNull()
      .references(() => classTemplates.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    type: text('type').notNull().default('quiz'),
    dueDateOffsetDays: integer('due_date_offset_days'),
    settings: json('settings'),
    totalPoints: integer('total_points').notNull().default(0),
    order: integer('order').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    templateOrderIdx: index('class_template_assessments_template_order_idx').on(
      table.templateId,
      table.order,
    ),
  }),
);

export const classTemplateLessons = pgTable(
  'class_template_lessons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    templateId: uuid('template_id')
      .notNull()
      .references(() => classTemplates.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    summary: text('summary'),
    order: integer('order').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    templateOrderIdx: index('class_template_lessons_template_order_idx').on(
      table.templateId,
      table.order,
    ),
  }),
);

export const classTemplateLessonBlocks = pgTable(
  'class_template_lesson_blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    templateLessonId: uuid('template_lesson_id')
      .notNull()
      .references(() => classTemplateLessons.id, { onDelete: 'cascade' }),
    blockType: text('block_type').notNull(),
    blockVersion: integer('block_version').notNull().default(1),
    payload: json('payload').notNull(),
    order: integer('order').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    lessonOrderIdx: index('class_template_lesson_blocks_lesson_order_idx').on(
      table.templateLessonId,
      table.order,
    ),
  }),
);

export const classTemplateAssessmentQuestions = pgTable(
  'class_template_assessment_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    templateAssessmentId: uuid('template_assessment_id')
      .notNull()
      .references(() => classTemplateAssessments.id, { onDelete: 'cascade' }),
    type: text('type').notNull().default('multiple_choice'),
    content: text('content').notNull(),
    points: integer('points').notNull().default(1),
    order: integer('order').notNull().default(0),
    isRequired: boolean('is_required').notNull().default(true),
    explanation: text('explanation'),
    imageUrl: text('image_url'),
    metadata: json('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    assessmentOrderIdx: index(
      'class_template_assessment_questions_assessment_order_idx',
    ).on(table.templateAssessmentId, table.order),
  }),
);

export const classTemplateAssessmentQuestionOptions = pgTable(
  'class_template_assessment_question_options',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    templateAssessmentQuestionId: uuid('template_assessment_question_id')
      .notNull()
      .references(() => classTemplateAssessmentQuestions.id, {
        onDelete: 'cascade',
      }),
    text: text('text').notNull(),
    isCorrect: boolean('is_correct').notNull().default(false),
    order: integer('order').notNull().default(0),
    metadata: json('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    questionOrderIdx: index(
      'class_template_assessment_question_options_question_order_idx',
    ).on(table.templateAssessmentQuestionId, table.order),
  }),
);

export const classTemplateEngineChunks = pgTable(
  'class_template_engine_chunks',
  {
    id: varchar('id', { length: 190 }).primaryKey(),
    templateId: uuid('template_id')
      .notNull()
      .references(() => classTemplates.id, { onDelete: 'cascade' }),
    sourceType: text('source_type').notNull(),
    sourceId: text('source_id').notNull(),
    chunkOrder: integer('chunk_order').notNull().default(0),
    content: text('content').notNull(),
    metadata: json('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    templateOrderIdx: index(
      'class_template_engine_chunks_template_order_idx',
    ).on(table.templateId, table.chunkOrder),
    sourceIdx: index('class_template_engine_chunks_source_idx').on(
      table.templateId,
      table.sourceType,
      table.sourceId,
    ),
  }),
);

export const classTemplateModuleItems = pgTable(
  'class_template_module_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    templateSectionId: uuid('template_section_id')
      .notNull()
      .references(() => classTemplateModuleSections.id, {
        onDelete: 'cascade',
      }),
    itemType: classTemplateItemTypeEnum('item_type')
      .notNull()
      .default('assessment'),
    templateAssessmentId: uuid('template_assessment_id').references(
      () => classTemplateAssessments.id,
      { onDelete: 'set null' },
    ),
    templateLessonId: uuid('template_lesson_id').references(
      () => classTemplateLessons.id,
      { onDelete: 'set null' },
    ),
    order: integer('order').notNull().default(0),
    isRequired: boolean('is_required').notNull().default(false),
    metadata: json('metadata'),
    points: integer('points'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    itemOrderIdx: index('class_template_module_items_order_idx').on(
      table.templateSectionId,
      table.order,
    ),
  }),
);

export const classTemplateAnnouncements = pgTable(
  'class_template_announcements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    templateId: uuid('template_id')
      .notNull()
      .references(() => classTemplates.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    isPinned: boolean('is_pinned').notNull().default(false),
    order: integer('order').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    templateOrderIdx: index(
      'class_template_announcements_template_order_idx',
    ).on(table.templateId, table.order),
  }),
);

// Keep TS from pruning schema imports in places that inspect full schema.
export const __templateSchemaTouch = {
  classModules,
  moduleSections,
  moduleItems,
};
