import {
  pgTable,
  uuid,
  text,
  varchar,
  bigint,
  timestamp,
  integer,
  boolean,
  pgEnum,
  unique,
  index,
  primaryKey,
  json,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==========================================
// ENUMS
// ==========================================
export const accountStatusEnum = pgEnum('account_status', [
  'ACTIVE',
  'PENDING',
  'SUSPENDED',
  'DELETED',
]);

export const contentTypeEnum = pgEnum('content_type', [
  'video',
  'document',
  'quiz',
  'link',
]);

export const assessmentTypeEnum = pgEnum('assessment_type', [
  'quiz',
  'exam',
  'assignment',
]);

export const enrollmentStatusEnum = pgEnum('enrollment_status', [
  'enrolled',
  'dropped',
  'completed',
]);

export const gradeLevelEnum = pgEnum('grade_level', ['7', '8', '9', '10']);

export const lessonContentTypeEnum = pgEnum('lesson_content_type', [
  'text',
  'image',
  'video',
  'question',
  'file',
  'divider',
]);

export const questionTypeEnum = pgEnum('question_type', [
  'multiple_choice',
  'multiple_select',
  'true_false',
  'short_answer',
  'fill_blank',
  'dropdown',
]);

export const feedbackLevelEnum = pgEnum('feedback_level', [
  'immediate',
  'standard',
  'detailed',
]);

// ==========================================
// 1. IDENTITY & ACCESS (Roles & Users)
// ==========================================

export const roles = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(), // e.g., 'student', 'teacher', 'admin'
    description: text('description'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: index('roles_name_idx').on(table.name),
  }),
);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),

    // Frontend Alignment: Split names
    firstName: text('first_name').notNull(),
    middleName: text('middle_name'),
    lastName: text('last_name').notNull(),

    status: accountStatusEnum('account_status').notNull().default('ACTIVE'),
    isEmailVerified: boolean('is_email_verified').notNull().default(false),

    // Student specific identifier (nullable for teachers/admins)
    studentId: text('student_id'),

    lastLoginAt: timestamp('last_login_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
    statusIdx: index('users_status_idx').on(table.status),
  }),
);

// Junction table for Many-to-Many relationship between Users and Roles
export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at').notNull().defaultNow(),
    assignedBy: text('assigned_by').notNull(), // 'SYSTEM' or User ID
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.roleId] }),
    userIdIdx: index('user_roles_user_id_idx').on(table.userId),
    roleIdIdx: index('user_roles_role_id_idx').on(table.roleId),
  }),
);

// ==========================================
// 2. ACADEMIC STRUCTURE
// ==========================================

export const sections = pgTable(
  'sections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    gradeLevel: text('grade_level').notNull(),
    schoolYear: text('school_year').notNull(), // e.g., "2024-2025"
    capacity: integer('capacity').notNull().default(40),
    roomNumber: text('room_number'),

    adviserId: uuid('adviser_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    adviserIdx: index('sections_adviser_idx').on(table.adviserId),
    gradeLevelIdx: index('sections_grade_level_idx').on(table.gradeLevel),
    schoolYearIdx: index('sections_school_year_idx').on(table.schoolYear),
    uniqueSection: unique().on(table.name, table.gradeLevel, table.schoolYear),
  }),
);

// ==========================================
// 3. CLASS MANAGEMENT
// ==========================================

export const classes = pgTable(
  'classes',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Denormalized subject info (moved from subjects table)
    subjectName: text('subject_name').notNull(),
    subjectCode: text('subject_code').notNull(),
    subjectGradeLevel: gradeLevelEnum('subject_grade_level'),

    sectionId: uuid('section_id')
      .notNull()
      .references(() => sections.id, { onDelete: 'cascade' }),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    room: text('room'),
    schoolYear: text('school_year').notNull(),

    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    teacherIdx: index('classes_teacher_idx').on(table.teacherId),
    sectionIdx: index('classes_section_idx').on(table.sectionId),
    subjectCodeIdx: index('classes_subject_code_idx').on(table.subjectCode),
    subjectNameIdx: index('classes_subject_name_idx').on(table.subjectName),
    schoolYearIdx: index('classes_school_year_idx').on(table.schoolYear),
    uniqueClass: unique().on(
      table.subjectCode,
      table.sectionId,
      table.schoolYear,
    ),
  }),
);

// ─── Schedule Slots (one class → many time slots) ───────────────────────────

export const classSchedules = pgTable(
  'class_schedules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    // Array of day abbreviations: M T W Th F Sa Su
    days: text('days').array().notNull(),
    startTime: text('start_time').notNull(), // HH:MM 24-hour
    endTime: text('end_time').notNull(),     // HH:MM 24-hour
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    classIdIdx: index('class_schedules_class_id_idx').on(table.classId),
  }),
);

export const studentProfiles = pgTable(
  'student_profiles',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    dateOfBirth: timestamp('date_of_birth'),
    gender: text('gender'),
    phone: text('phone'),
    address: text('address'),
    familyName: text('family_name'),
    familyRelationship: text('family_relationship'),
    familyContact: text('family_contact'),
    // Student-specific fields
    gradeLevel: gradeLevelEnum('grade_level'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('student_profiles_user_id_idx').on(table.userId),
    gradeLevelIdx: index('student_profiles_grade_level_idx').on(table.gradeLevel),
  }),
);

export const enrollments = pgTable(
  'enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    classId: uuid('class_id')
      .references(() => classes.id, { onDelete: 'cascade' }),
    sectionId: uuid('section_id')
      .notNull()
      .references(() => sections.id, { onDelete: 'cascade' }),

    status: enrollmentStatusEnum('status').notNull().default('enrolled'),
    enrolledAt: timestamp('enrolled_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    studentIdx: index('enrollments_student_idx').on(table.studentId),
    classIdx: index('enrollments_class_idx').on(table.classId),
    sectionIdx: index('enrollments_section_idx').on(table.sectionId),
    statusIdx: index('enrollments_status_idx').on(table.status),
    uniqueEnrollment: unique().on(table.studentId, table.classId),
  }),
);

// ==========================================
// 4. CONTENT & ASSESSMENTS
// ==========================================

export const lessons = pgTable(
  'lessons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description'),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    order: integer('order').notNull().default(0),
    isDraft: boolean('is_draft').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    classIdIdx: index('lessons_class_id_idx').on(table.classId),
    classOrderIdx: index('lessons_class_order_idx').on(table.classId, table.order),
  }),
);

export const lessonContentBlocks = pgTable(
  'lesson_content_blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    type: lessonContentTypeEnum('type').notNull(),
    order: integer('order').notNull().default(0),
    content: json('content').notNull(), // Stores text, images, questions, etc.
    metadata: json('metadata'), // Additional flexible data (alt text, captions, etc.)
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    lessonIdIdx: index('lesson_content_blocks_lesson_id_idx').on(table.lessonId),
    lessonOrderIdx: index('lesson_content_blocks_lesson_order_idx').on(
      table.lessonId,
      table.order,
    ),
  }),
);

export const lessonCompletions = pgTable(
  'lesson_completions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    completedAt: timestamp('completed_at').notNull().defaultNow(),
    progressPercentage: integer('progress_percentage').notNull().default(0),
  },
  (table) => ({
    studentIdIdx: index('lesson_completions_student_id_idx').on(table.studentId),
    lessonIdIdx: index('lesson_completions_lesson_id_idx').on(table.lessonId),
    uniqueCompletion: unique('lesson_completions_student_lesson_unique').on(
      table.studentId,
      table.lessonId,
    ),
  }),
);

export const assessments = pgTable('assessments', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  classId: uuid('class_id')
    .notNull()
    .references(() => classes.id, { onDelete: 'cascade' }),
  type: assessmentTypeEnum('type').notNull().default('quiz'),
  dueDate: timestamp('due_date'),
  totalPoints: integer('total_points').notNull().default(100),
  passingScore: integer('passing_score').default(60),
  isPublished: boolean('is_published').default(false),
  feedbackLevel: feedbackLevelEnum('feedback_level').default('standard'),
  feedbackDelayHours: integer('feedback_delay_hours').default(24),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const assessmentQuestions = pgTable(
  'assessment_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assessmentId: uuid('assessment_id')
      .notNull()
      .references(() => assessments.id, { onDelete: 'cascade' }),
    type: questionTypeEnum('type').notNull().default('multiple_choice'),
    content: text('content').notNull(),
    points: integer('points').notNull().default(1),
    order: integer('order').notNull().default(0),
    isRequired: boolean('is_required').default(true),
    explanation: text('explanation'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    assessmentIdIdx: index('assessment_questions_assessment_id_idx').on(
      table.assessmentId,
    ),
    orderIdx: index('assessment_questions_order_idx').on(table.order),
  }),
);

export const assessmentQuestionOptions = pgTable(
  'assessment_question_options',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    questionId: uuid('question_id')
      .notNull()
      .references(() => assessmentQuestions.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    isCorrect: boolean('is_correct').default(false),
    order: integer('order').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    questionIdIdx: index('assessment_question_options_question_id_idx').on(
      table.questionId,
    ),
  }),
);

export const assessmentAttempts = pgTable(
  'assessment_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    assessmentId: uuid('assessment_id')
      .notNull()
      .references(() => assessments.id, { onDelete: 'cascade' }),
    startedAt: timestamp('started_at').notNull().defaultNow(),
    submittedAt: timestamp('submitted_at'),
    score: integer('score'),
    passed: boolean('passed'),
    isSubmitted: boolean('is_submitted').default(false),
    timeSpentSeconds: integer('time_spent_seconds').default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    studentIdIdx: index('assessment_attempts_student_id_idx').on(table.studentId),
    assessmentIdIdx: index('assessment_attempts_assessment_id_idx').on(
      table.assessmentId,
    ),
    submittedIdx: index('assessment_attempts_submitted_idx').on(table.isSubmitted),
    uniqueAttempt: unique('assessment_attempts_student_assessment_unique').on(
      table.studentId,
      table.assessmentId,
    ),
  }),
);

export const assessmentResponses = pgTable(
  'assessment_responses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    attemptId: uuid('attempt_id')
      .notNull()
      .references(() => assessmentAttempts.id, { onDelete: 'cascade' }),
    questionId: uuid('question_id')
      .notNull()
      .references(() => assessmentQuestions.id, { onDelete: 'cascade' }),
    studentAnswer: text('student_answer'),
    selectedOptionId: uuid('selected_option_id').references(
      () => assessmentQuestionOptions.id,
      { onDelete: 'set null' },
    ),
    isCorrect: boolean('is_correct'),
    pointsEarned: integer('points_earned').default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    attemptIdIdx: index('assessment_responses_attempt_id_idx').on(table.attemptId),
    questionIdIdx: index('assessment_responses_question_id_idx').on(
      table.questionId,
    ),
  }),
);

// ==========================================
// 5. ARCHIVED USERS (for safe permanent deletion)
// ==========================================

export const archivedUsers = pgTable(
  'archived_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    originalUserId: uuid('original_user_id').notNull(),
    email: text('email').notNull(),
    fullName: text('full_name').notNull(),
    role: text('role').notNull(),
    archivedData: json('archived_data').notNull(), // Full JSONB snapshot of user + related data
    archivedBy: uuid('archived_by').notNull(), // Admin who performed the archive
    archivedAt: timestamp('archived_at').notNull().defaultNow(),
    purgedAt: timestamp('purged_at'), // Set when permanently purged
  },
  (table) => ({
    originalUserIdIdx: index('archived_users_original_user_id_idx').on(table.originalUserId),
    emailIdx: index('archived_users_email_idx').on(table.email),
    archivedAtIdx: index('archived_users_archived_at_idx').on(table.archivedAt),
  }),
);

// ==========================================
// 6. RELATIONS
// ==========================================

export const usersRelations = relations(users, ({ many, one }) => ({
  userRoles: many(userRoles), // Relationship to Roles
  classesTaught: many(classes, { relationName: 'teacherClasses' }),
  advisedSections: many(sections),
  enrollments: many(enrollments),
  lessonCompletions: many(lessonCompletions),
  assessmentAttempts: many(assessmentAttempts),
  // Keep the property name `profile` for compatibility but point to student_profiles
  profile: one(studentProfiles, {
    fields: [users.id],
    references: [studentProfiles.userId],
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));



export const sectionsRelations = relations(sections, ({ many, one }) => ({
  classes: many(classes),
  enrollments: many(enrollments),
  adviser: one(users, {
    fields: [sections.adviserId],
    references: [users.id],
  }),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  schedules: many(classSchedules),
  section: one(sections, {
    fields: [classes.sectionId],
    references: [sections.id],
  }),
  teacher: one(users, {
    fields: [classes.teacherId],
    references: [users.id],
    relationName: 'teacherClasses',
  }),
  enrollments: many(enrollments),
  lessons: many(lessons),
  assessments: many(assessments),
}));

export const classSchedulesRelations = relations(classSchedules, ({ one }) => ({
  class: one(classes, {
    fields: [classSchedules.classId],
    references: [classes.id],
  }),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  student: one(users, {
    fields: [enrollments.studentId],
    references: [users.id],
  }),
  class: one(classes, {
    fields: [enrollments.classId],
    references: [classes.id],
  }),
  section: one(sections, {
    fields: [enrollments.sectionId],
    references: [sections.id],
  }),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  class: one(classes, {
    fields: [lessons.classId],
    references: [classes.id],
  }),
  contentBlocks: many(lessonContentBlocks),
  completions: many(lessonCompletions),
}));

export const lessonContentBlocksRelations = relations(
  lessonContentBlocks,
  ({ one }) => ({
    lesson: one(lessons, {
      fields: [lessonContentBlocks.lessonId],
      references: [lessons.id],
    }),
  }),
);

export const lessonCompletionsRelations = relations(
  lessonCompletions,
  ({ one }) => ({
    student: one(users, {
      fields: [lessonCompletions.studentId],
      references: [users.id],
    }),
    lesson: one(lessons, {
      fields: [lessonCompletions.lessonId],
      references: [lessons.id],
    }),
  }),
);

export const assessmentsRelations = relations(
  assessments,
  ({ one, many }) => ({
    class: one(classes, {
      fields: [assessments.classId],
      references: [classes.id],
    }),
    questions: many(assessmentQuestions),
    attempts: many(assessmentAttempts),
  }),
);

export const assessmentQuestionsRelations = relations(
  assessmentQuestions,
  ({ one, many }) => ({
    assessment: one(assessments, {
      fields: [assessmentQuestions.assessmentId],
      references: [assessments.id],
    }),
    options: many(assessmentQuestionOptions),
    responses: many(assessmentResponses),
  }),
);

export const assessmentQuestionOptionsRelations = relations(
  assessmentQuestionOptions,
  ({ one }) => ({
    question: one(assessmentQuestions, {
      fields: [assessmentQuestionOptions.questionId],
      references: [assessmentQuestions.id],
    }),
  }),
);

export const assessmentAttemptsRelations = relations(
  assessmentAttempts,
  ({ one, many }) => ({
    student: one(users, {
      fields: [assessmentAttempts.studentId],
      references: [users.id],
    }),
    assessment: one(assessments, {
      fields: [assessmentAttempts.assessmentId],
      references: [assessments.id],
    }),
    responses: many(assessmentResponses),
  }),
);

export const assessmentResponsesRelations = relations(
  assessmentResponses,
  ({ one }) => ({
    attempt: one(assessmentAttempts, {
      fields: [assessmentResponses.attemptId],
      references: [assessmentAttempts.id],
    }),
    question: one(assessmentQuestions, {
      fields: [assessmentResponses.questionId],
      references: [assessmentQuestions.id],
    }),
    selectedOption: one(assessmentQuestionOptions, {
      fields: [assessmentResponses.selectedOptionId],
      references: [assessmentQuestionOptions.id],
    }),
  }),
);

// ==========================================
// 6. FILE UPLOADS
// ==========================================

export const uploadedFiles = pgTable(
  'uploaded_files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    storedName: varchar('stored_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    filePath: text('file_path').notNull(),
    uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    teacherIdx: index('uploaded_files_teacher_idx').on(table.teacherId),
    classIdx: index('uploaded_files_class_idx').on(table.classId),
    uploadedAtIdx: index('uploaded_files_uploaded_at_idx').on(table.uploadedAt),
  }),
);

export const uploadedFilesRelations = relations(
  uploadedFiles,
  ({ one }) => ({
    teacher: one(users, {
      fields: [uploadedFiles.teacherId],
      references: [users.id],
    }),
    class: one(classes, {
      fields: [uploadedFiles.classId],
      references: [classes.id],
    }),
  }),
);
