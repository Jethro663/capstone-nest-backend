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
import { classModules, moduleSections, moduleItems, users } from './base.schema';

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
    questions: json('questions'),
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

export const classTemplateModuleItems = pgTable(
  'class_template_module_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    templateSectionId: uuid('template_section_id')
      .notNull()
      .references(() => classTemplateModuleSections.id, { onDelete: 'cascade' }),
    itemType: classTemplateItemTypeEnum('item_type').notNull().default('assessment'),
    templateAssessmentId: uuid('template_assessment_id').references(
      () => classTemplateAssessments.id,
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
    templateOrderIdx: index('class_template_announcements_template_order_idx').on(
      table.templateId,
      table.order,
    ),
  }),
);

// Keep TS from pruning schema imports in places that inspect full schema.
export const __templateSchemaTouch = {
  classModules,
  moduleSections,
  moduleItems,
};
