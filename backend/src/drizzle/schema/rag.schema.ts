import {
  customType,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import {
  assessmentQuestions,
  assessments,
  classes,
  lessons,
  users,
} from './base.schema';
import { extractedModules } from './ai-mentor.schema';

const vector = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'vector(768)';
  },
});

export const contentSourceTypeEnum = pgEnum('content_source_type', [
  'lesson_block',
  'extracted_module',
  'assessment_question',
]);

export const aiGenerationJobTypeEnum = pgEnum('ai_generation_job_type', [
  'quiz_generation',
  'remedial_plan_generation',
  'reindexing',
  'backfill',
]);

export const aiGenerationOutputTypeEnum = pgEnum('ai_generation_output_type', [
  'assessment_draft',
  'intervention_recommendation',
]);

export const aiGenerationStatusEnum = pgEnum('ai_generation_status', [
  'pending',
  'processing',
  'completed',
  'approved',
  'rejected',
  'failed',
]);

export const contentChunks = pgTable(
  'content_chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceType: contentSourceTypeEnum('source_type').notNull(),
    sourceId: uuid('source_id').notNull(),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id').references(() => lessons.id, {
      onDelete: 'cascade',
    }),
    assessmentId: uuid('assessment_id').references(() => assessments.id, {
      onDelete: 'cascade',
    }),
    questionId: uuid('question_id').references(() => assessmentQuestions.id, {
      onDelete: 'cascade',
    }),
    extractionId: uuid('extraction_id').references(() => extractedModules.id, {
      onDelete: 'cascade',
    }),
    chunkText: text('chunk_text').notNull(),
    chunkOrder: integer('chunk_order').notNull().default(0),
    tokenCount: integer('token_count').notNull().default(0),
    contentHash: text('content_hash').notNull(),
    metadataJson: json('metadata_json'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    classIdx: index('content_chunks_class_id_idx').on(table.classId),
    sourceIdx: index('content_chunks_source_type_source_id_idx').on(
      table.sourceType,
      table.sourceId,
    ),
    lessonIdx: index('content_chunks_lesson_id_idx').on(table.lessonId),
    assessmentIdx: index('content_chunks_assessment_id_idx').on(
      table.assessmentId,
    ),
    questionIdx: index('content_chunks_question_id_idx').on(table.questionId),
    extractionIdx: index('content_chunks_extraction_id_idx').on(
      table.extractionId,
    ),
  }),
);

export const contentChunkEmbeddings = pgTable(
  'content_chunk_embeddings',
  {
    chunkId: uuid('chunk_id')
      .primaryKey()
      .references(() => contentChunks.id, { onDelete: 'cascade' }),
    embedding: vector('embedding').notNull(),
    embeddingModel: text('embedding_model').notNull(),
    embeddedAt: timestamp('embedded_at').notNull().defaultNow(),
  },
  (table) => ({
    modelIdx: index('content_chunk_embeddings_model_idx').on(
      table.embeddingModel,
    ),
  }),
);

export const studentConceptMastery = pgTable(
  'student_concept_mastery',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    conceptKey: text('concept_key').notNull(),
    evidenceCount: integer('evidence_count').notNull().default(0),
    errorCount: integer('error_count').notNull().default(0),
    masteryScore: integer('mastery_score').notNull().default(0),
    lastSeenAt: timestamp('last_seen_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    studentClassConceptIdx: uniqueIndex(
      'student_concept_mastery_student_class_concept_idx',
    ).on(table.studentId, table.classId, table.conceptKey),
    classIdx: index('student_concept_mastery_class_id_idx').on(table.classId),
  }),
);

export const aiGenerationJobs = pgTable(
  'ai_generation_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jobType: aiGenerationJobTypeEnum('job_type').notNull(),
    classId: uuid('class_id').references(() => classes.id, {
      onDelete: 'cascade',
    }),
    teacherId: uuid('teacher_id').references(() => users.id, {
      onDelete: 'cascade',
    }),
    status: aiGenerationStatusEnum('status').notNull().default('pending'),
    sourceFilters: json('source_filters'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    classIdx: index('ai_generation_jobs_class_id_idx').on(table.classId),
    teacherIdx: index('ai_generation_jobs_teacher_id_idx').on(table.teacherId),
    statusIdx: index('ai_generation_jobs_status_idx').on(table.status),
  }),
);

export const aiGenerationOutputs = pgTable(
  'ai_generation_outputs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jobId: uuid('job_id')
      .notNull()
      .references(() => aiGenerationJobs.id, { onDelete: 'cascade' }),
    outputType: aiGenerationOutputTypeEnum('output_type').notNull(),
    targetClassId: uuid('target_class_id').references(() => classes.id, {
      onDelete: 'cascade',
    }),
    targetTeacherId: uuid('target_teacher_id').references(() => users.id, {
      onDelete: 'cascade',
    }),
    sourceFilters: json('source_filters'),
    structuredOutput: json('structured_output').notNull(),
    status: aiGenerationStatusEnum('status').notNull().default('completed'),
    approvedBy: uuid('approved_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    approvedAt: timestamp('approved_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    jobIdx: index('ai_generation_outputs_job_id_idx').on(table.jobId),
    classIdx: index('ai_generation_outputs_target_class_id_idx').on(
      table.targetClassId,
    ),
    teacherIdx: index('ai_generation_outputs_target_teacher_id_idx').on(
      table.targetTeacherId,
    ),
    statusIdx: index('ai_generation_outputs_status_idx').on(table.status),
  }),
);

export const contentChunksRelations = relations(contentChunks, ({ one }) => ({
  class: one(classes, {
    fields: [contentChunks.classId],
    references: [classes.id],
  }),
  lesson: one(lessons, {
    fields: [contentChunks.lessonId],
    references: [lessons.id],
  }),
  assessment: one(assessments, {
    fields: [contentChunks.assessmentId],
    references: [assessments.id],
  }),
  question: one(assessmentQuestions, {
    fields: [contentChunks.questionId],
    references: [assessmentQuestions.id],
  }),
  extraction: one(extractedModules, {
    fields: [contentChunks.extractionId],
    references: [extractedModules.id],
  }),
}));

export const contentChunkEmbeddingsRelations = relations(
  contentChunkEmbeddings,
  ({ one }) => ({
    chunk: one(contentChunks, {
      fields: [contentChunkEmbeddings.chunkId],
      references: [contentChunks.id],
    }),
  }),
);

export const aiGenerationJobsRelations = relations(
  aiGenerationJobs,
  ({ one, many }) => ({
    class: one(classes, {
      fields: [aiGenerationJobs.classId],
      references: [classes.id],
    }),
    teacher: one(users, {
      fields: [aiGenerationJobs.teacherId],
      references: [users.id],
    }),
    outputs: many(aiGenerationOutputs),
  }),
);

export const aiGenerationOutputsRelations = relations(
  aiGenerationOutputs,
  ({ one }) => ({
    job: one(aiGenerationJobs, {
      fields: [aiGenerationOutputs.jobId],
      references: [aiGenerationJobs.id],
    }),
    targetClass: one(classes, {
      fields: [aiGenerationOutputs.targetClassId],
      references: [classes.id],
    }),
    targetTeacher: one(users, {
      fields: [aiGenerationOutputs.targetTeacherId],
      references: [users.id],
    }),
    approver: one(users, {
      fields: [aiGenerationOutputs.approvedBy],
      references: [users.id],
    }),
  }),
);
