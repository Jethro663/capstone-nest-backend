import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  json,
  pgEnum,
  index,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users, uploadedFiles, classes } from './base.schema';

// ==========================================
// ENUMS
// ==========================================

/** The type of AI interaction being logged */
export const aiSessionTypeEnum = pgEnum('ai_session_type', [
  'module_extraction',
  'mentor_chat',
  'mistake_explanation',
]);

/** Extraction pipeline status */
export const extractionStatusEnum = pgEnum('extraction_status', [
  'pending',
  'processing',
  'completed',
  'failed',
  'applied',
]);

// ==========================================
// AI INTERACTION LOGS
// ==========================================

/**
 * Logs every AI request/response for auditing, debugging, and analytics.
 * Concept-paper requirement: "AI Feedback History Logging"
 */
export const aiInteractionLogs = pgTable(
  'ai_interaction_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    sessionType: aiSessionTypeEnum('session_type').notNull(),

    /** The text/prompt sent to the AI model */
    inputText: text('input_text').notNull(),

    /** The response received from the AI model */
    outputText: text('output_text').notNull(),

    /** Which model produced the output, e.g. "llama3.2:3b" or "rule-based" */
    modelUsed: text('model_used').notNull(),

    /** Arbitrary context — fileId, classId, lessonId, assessmentId, etc. */
    contextMetadata: json('context_metadata'),

    /** Round-trip time in milliseconds */
    responseTimeMs: integer('response_time_ms'),

    /** Groups messages into a multi-turn conversation (nullable — extraction logs have no session) */
    sessionId: uuid('session_id'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('ai_interaction_logs_user_id_idx').on(table.userId),
    sessionTypeIdx: index('ai_interaction_logs_session_type_idx').on(
      table.sessionType,
    ),
    createdAtIdx: index('ai_interaction_logs_created_at_idx').on(
      table.createdAt,
    ),
    sessionIdIdx: index('ai_interaction_logs_session_id_idx').on(
      table.sessionId,
    ),
  }),
);

// ==========================================
// EXTRACTED MODULES
// ==========================================

/**
 * Stores PDF → structured-lesson extraction results.
 * Teachers review the AI output before it becomes real lesson content.
 */
export const extractedModules = pgTable(
  'extracted_modules',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    fileId: uuid('file_id')
      .notNull()
      .references(() => uploadedFiles.id, { onDelete: 'cascade' }),

    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),

    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    /** Raw text extracted from the PDF via pdf-parse */
    rawText: text('raw_text').notNull(),

    /**
     * AI-generated structured content.
     * Shape: { title: string, description: string, lessons: ExtractedLesson[] }
     */
    structuredContent: json('structured_content'),

    extractionStatus: extractionStatusEnum('extraction_status')
      .notNull()
      .default('pending'),

    errorMessage: text('error_message'),

    /** Model that performed the extraction */
    modelUsed: text('model_used'),

    /** Whether the extracted lessons have been applied (created as draft lessons) */
    isApplied: boolean('is_applied').notNull().default(false),

    /** Progress percentage for chunked extraction (0–100) */
    progressPercent: integer('progress_percent').notNull().default(0),

    /** Total chunks for large PDF processing */
    totalChunks: integer('total_chunks'),

    /** Number of chunks processed so far */
    processedChunks: integer('processed_chunks').notNull().default(0),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    fileIdIdx: index('extracted_modules_file_id_idx').on(table.fileId),
    classIdIdx: index('extracted_modules_class_id_idx').on(table.classId),
    teacherIdIdx: index('extracted_modules_teacher_id_idx').on(table.teacherId),
    statusIdx: index('extracted_modules_status_idx').on(
      table.extractionStatus,
    ),
  }),
);

// ==========================================
// RELATIONS
// ==========================================

export const aiInteractionLogsRelations = relations(
  aiInteractionLogs,
  ({ one }) => ({
    user: one(users, {
      fields: [aiInteractionLogs.userId],
      references: [users.id],
    }),
  }),
);

export const extractedModulesRelations = relations(
  extractedModules,
  ({ one }) => ({
    file: one(uploadedFiles, {
      fields: [extractedModules.fileId],
      references: [uploadedFiles.id],
    }),
    class: one(classes, {
      fields: [extractedModules.classId],
      references: [classes.id],
    }),
    teacher: one(users, {
      fields: [extractedModules.teacherId],
      references: [users.id],
    }),
  }),
);
