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
  'file_upload',
]);

export const rubricParseStatusEnum = pgEnum('rubric_parse_status', [
  'pending',
  'parsed',
  'reviewed',
  'failed',
]);

export const classRecordCategoryEnum = pgEnum('class_record_category', [
  'written_work',
  'performance_task',
  'quarterly_assessment',
]);

export const gradingPeriodEnum = pgEnum('grading_period', [
  'Q1',
  'Q2',
  'Q3',
  'Q4',
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

export const fileScopeEnum = pgEnum('file_scope', ['private', 'general']);
export const moduleItemTypeEnum = pgEnum('module_item_type', [
  'lesson',
  'assessment',
  'file',
]);
export const studentPresentationModeEnum = pgEnum(
  'student_presentation_mode',
  ['solid', 'gradient', 'preset'],
);
export const studentCourseViewModeEnum = pgEnum(
  'student_course_view_mode',
  ['card', 'wide'],
);

// ==========================================
// 1. IDENTITY & ACCESS (Roles & Users)
// ==========================================

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(), // e.g., 'student', 'teacher', 'admin'
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  // NOTE: No explicit index here — the UNIQUE constraint above already creates
  // an implicit B-tree index (roles_name_unique) on the name column.
});

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

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: uuid('target_id').notNull(),
    metadata: json('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    actorIdIdx: index('audit_logs_actor_id_idx').on(table.actorId),
    actionIdx: index('audit_logs_action_idx').on(table.action),
    createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
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
    cardBannerUrl: text('card_banner_url'),

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
    teacherId: uuid('teacher_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    room: text('room'),
    cardPreset: text('card_preset').notNull().default('aurora'),
    cardBannerUrl: text('card_banner_url'),
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
    endTime: text('end_time').notNull(), // HH:MM 24-hour
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
    profilePicture: text('profile_picture'),
    gender: text('gender'),
    phone: text('phone'),
    address: text('address'),
    familyName: text('family_name'),
    familyRelationship: text('family_relationship'),
    familyContact: text('family_contact'),
    // Student-specific fields
    gradeLevel: gradeLevelEnum('grade_level'),
    // Learner Reference Number — format: XXXXXXYYZZZZ (6-digit school ID + 2-digit school year + 4-digit student number)
    lrn: varchar('lrn', { length: 12 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('student_profiles_user_id_idx').on(table.userId),
    gradeLevelIdx: index('student_profiles_grade_level_idx').on(
      table.gradeLevel,
    ),
    lrnIdx: unique('student_profiles_lrn_unique').on(table.lrn),
  }),
);

export const teacherProfiles = pgTable(
  'teacher_profiles',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    department: text('department'),
    specialization: text('specialization'),
    profilePicture: text('profile_picture'),
    contactNumber: text('contact_number'),
    dateOfBirth: timestamp('date_of_birth'),
    gender: text('gender'),
    address: text('address'),
    employeeId: varchar('employee_id', { length: 20 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('teacher_profiles_user_id_idx').on(table.userId),
    departmentIdx: index('teacher_profiles_department_idx').on(
      table.department,
    ),
    employeeIdIdx: index('teacher_profiles_employee_id_idx').on(
      table.employeeId,
    ),
  }),
);

export const enrollments = pgTable(
  'enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    classId: uuid('class_id').references(() => classes.id, {
      onDelete: 'cascade',
    }),
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

    /** Links AI-generated lessons back to the extraction that created them (null for manually created) */
    sourceExtractionId: uuid('source_extraction_id'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    classIdIdx: index('lessons_class_id_idx').on(table.classId),
    classOrderIdx: index('lessons_class_order_idx').on(
      table.classId,
      table.order,
    ),
    sourceExtractionIdx: index('lessons_source_extraction_idx').on(
      table.sourceExtractionId,
    ),
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
    lessonIdIdx: index('lesson_content_blocks_lesson_id_idx').on(
      table.lessonId,
    ),
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
    studentIdIdx: index('lesson_completions_student_id_idx').on(
      table.studentId,
    ),
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
  closeWhenDue: boolean('close_when_due').notNull().default(true),
  randomizeQuestions: boolean('randomize_questions').notNull().default(false),
  timedQuestionsEnabled: boolean('timed_questions_enabled')
    .notNull()
    .default(false),
  questionTimeLimitSeconds: integer('question_time_limit_seconds'),
  strictMode: boolean('strict_mode').notNull().default(false),
  fileUploadInstructions: text('file_upload_instructions'),
  teacherAttachmentFileId: uuid('teacher_attachment_file_id'),
  rubricSourceFileId: uuid('rubric_source_file_id'),
  rubricParseStatus: rubricParseStatusEnum('rubric_parse_status')
    .notNull()
    .default('pending'),
  rubricParsedAt: timestamp('rubric_parsed_at'),
  rubricRawText: text('rubric_raw_text'),
  rubricParseError: text('rubric_parse_error'),
  rubricCriteria: json('rubric_criteria'),
  allowedUploadMimeTypes: text('allowed_upload_mime_types').array(),
  allowedUploadExtensions: text('allowed_upload_extensions').array(),
  maxUploadSizeBytes: integer('max_upload_size_bytes').default(104857600),
  totalPoints: integer('total_points').notNull().default(0),
  passingScore: integer('passing_score').default(60),
  maxAttempts: integer('max_attempts').notNull().default(1),
  timeLimitMinutes: integer('time_limit_minutes'),
  isPublished: boolean('is_published').default(false),
  feedbackLevel: feedbackLevelEnum('feedback_level').default('standard'),
  feedbackDelayHours: integer('feedback_delay_hours').default(24),
  classRecordCategory: classRecordCategoryEnum('class_record_category'),
  quarter: gradingPeriodEnum('quarter'),
  aiOrigin: text('ai_origin'),
  aiGenerationOutputId: uuid('ai_generation_output_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
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
    imageUrl: text('image_url'),
    conceptTags: json('concept_tags'),
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
    attemptNumber: integer('attempt_number').notNull().default(1),
    startedAt: timestamp('started_at').notNull().defaultNow(),
    expiresAt: timestamp('expires_at'),
    lastQuestionIndex: integer('last_question_index').notNull().default(0),
    currentQuestionStartedAt: timestamp('current_question_started_at'),
    currentQuestionDeadlineAt: timestamp('current_question_deadline_at'),
    violationCount: integer('violation_count').notNull().default(0),
    questionOrder: text('question_order').array(),
    draftResponses: json('draft_responses'),
    submittedAt: timestamp('submitted_at'),
    score: integer('score'),
    passed: boolean('passed'),
    isSubmitted: boolean('is_submitted').default(false),
    timeSpentSeconds: integer('time_spent_seconds').default(0),
    isReturned: boolean('is_returned').default(false),
    returnedAt: timestamp('returned_at'),
    teacherFeedback: text('teacher_feedback'),
    rubricScores: json('rubric_scores'),
    directScore: integer('direct_score'),
    submittedFileId: uuid('submitted_file_id'),
    submittedFileOriginalName: text('submitted_file_original_name'),
    submittedFileMimeType: varchar('submitted_file_mime_type', {
      length: 100,
    }),
    submittedFileSizeBytes: bigint('submitted_file_size_bytes', {
      mode: 'number',
    }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    studentIdIdx: index('assessment_attempts_student_id_idx').on(
      table.studentId,
    ),
    assessmentIdIdx: index('assessment_attempts_assessment_id_idx').on(
      table.assessmentId,
    ),
    expiresAtIdx: index('assessment_attempts_expires_at_idx').on(
      table.expiresAt,
    ),
    submittedIdx: index('assessment_attempts_submitted_idx').on(
      table.isSubmitted,
    ),
    uniqueAttemptNumber: unique(
      'assessment_attempts_student_assessment_attempt_unique',
    ).on(table.studentId, table.assessmentId, table.attemptNumber),
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
    selectedOptionIds: text('selected_option_ids').array(),
    isCorrect: boolean('is_correct'),
    pointsEarned: integer('points_earned').default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    attemptIdIdx: index('assessment_responses_attempt_id_idx').on(
      table.attemptId,
    ),
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
    originalUserIdIdx: index('archived_users_original_user_id_idx').on(
      table.originalUserId,
    ),
    emailIdx: index('archived_users_email_idx').on(table.email),
    archivedAtIdx: index('archived_users_archived_at_idx').on(table.archivedAt),
  }),
);

export const classModules = pgTable(
  'class_modules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    order: integer('order').notNull().default(0),
    isVisible: boolean('is_visible').notNull().default(true),
    isLocked: boolean('is_locked').notNull().default(false),
    teacherNotes: text('teacher_notes'),
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
    classIdIdx: index('class_modules_class_id_idx').on(table.classId),
    classOrderIdx: index('class_modules_class_order_idx').on(
      table.classId,
      table.order,
    ),
    classTitleUnique: unique('class_modules_class_title_unique').on(
      table.classId,
      table.title,
    ),
  }),
);

export const moduleSections = pgTable(
  'module_sections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    moduleId: uuid('module_id')
      .notNull()
      .references(() => classModules.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    order: integer('order').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    moduleIdIdx: index('module_sections_module_id_idx').on(table.moduleId),
    moduleOrderIdx: index('module_sections_module_order_idx').on(
      table.moduleId,
      table.order,
    ),
  }),
);

export const moduleItems = pgTable(
  'module_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    moduleSectionId: uuid('module_section_id')
      .notNull()
      .references(() => moduleSections.id, { onDelete: 'cascade' }),
    itemType: moduleItemTypeEnum('item_type').notNull(),
    lessonId: uuid('lesson_id').references(() => lessons.id, {
      onDelete: 'cascade',
    }),
    assessmentId: uuid('assessment_id').references(() => assessments.id, {
      onDelete: 'cascade',
    }),
    fileId: uuid('file_id'),
    order: integer('order').notNull().default(0),
    isVisible: boolean('is_visible').notNull().default(true),
    isRequired: boolean('is_required').notNull().default(false),
    isGiven: boolean('is_given').notNull().default(true),
    metadata: json('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    sectionIdIdx: index('module_items_section_id_idx').on(table.moduleSectionId),
    sectionOrderIdx: index('module_items_section_order_idx').on(
      table.moduleSectionId,
      table.order,
    ),
    lessonIdIdx: index('module_items_lesson_id_idx').on(table.lessonId),
    assessmentIdIdx: index('module_items_assessment_id_idx').on(
      table.assessmentId,
    ),
    fileIdIdx: index('module_items_file_id_idx').on(table.fileId),
    uniqueLessonItem: unique('module_items_lesson_id_unique').on(table.lessonId),
    uniqueAssessmentItem: unique('module_items_assessment_id_unique').on(
      table.assessmentId,
    ),
    uniqueFileItem: unique('module_items_file_id_unique').on(table.fileId),
  }),
);

export const moduleGradingScaleEntries = pgTable(
  'module_grading_scale_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    moduleId: uuid('module_id')
      .notNull()
      .references(() => classModules.id, { onDelete: 'cascade' }),
    letter: varchar('letter', { length: 8 }).notNull(),
    label: text('label').notNull(),
    minScore: integer('min_score').notNull(),
    maxScore: integer('max_score').notNull(),
    description: text('description'),
    order: integer('order').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    moduleIdIdx: index('module_grading_scale_entries_module_id_idx').on(
      table.moduleId,
    ),
    moduleOrderIdx: index('module_grading_scale_entries_module_order_idx').on(
      table.moduleId,
      table.order,
    ),
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
  auditLogs: many(auditLogs),
  lessonCompletions: many(lessonCompletions),
  assessmentAttempts: many(assessmentAttempts),
  classVisibilityPreferences: many(classVisibilityPreferences),
  studentClassPresentationPreferences: many(studentClassPresentationPreferences),
  studentCourseViewPreference: one(studentCourseViewPreferences, {
    fields: [users.id],
    references: [studentCourseViewPreferences.userId],
  }),
  // Keep the property name `profile` for compatibility but point to student_profiles
  profile: one(studentProfiles, {
    fields: [users.id],
    references: [studentProfiles.userId],
  }),
  teacherProfile: one(teacherProfiles, {
    fields: [users.id],
    references: [teacherProfiles.userId],
  }),
}));

export const studentProfilesRelations = relations(
  studentProfiles,
  ({ one }) => ({
    user: one(users, {
      fields: [studentProfiles.userId],
      references: [users.id],
    }),
  }),
);

export const teacherProfilesRelations = relations(
  teacherProfiles,
  ({ one }) => ({
    user: one(users, {
      fields: [teacherProfiles.userId],
      references: [users.id],
    }),
  }),
);

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
  modules: many(classModules),
  visibilityPreferences: many(classVisibilityPreferences),
  studentPresentationPreferences: many(studentClassPresentationPreferences),
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

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorId],
    references: [users.id],
  }),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  class: one(classes, {
    fields: [lessons.classId],
    references: [classes.id],
  }),
  contentBlocks: many(lessonContentBlocks),
  completions: many(lessonCompletions),
  moduleItems: many(moduleItems),
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

export const assessmentsRelations = relations(assessments, ({ one, many }) => ({
  class: one(classes, {
    fields: [assessments.classId],
    references: [classes.id],
  }),
  questions: many(assessmentQuestions),
  attempts: many(assessmentAttempts),
  moduleItems: many(moduleItems),
}));

export const classModulesRelations = relations(
  classModules,
  ({ one, many }) => ({
    class: one(classes, {
      fields: [classModules.classId],
      references: [classes.id],
    }),
    sections: many(moduleSections),
    gradingScaleEntries: many(moduleGradingScaleEntries),
  }),
);

export const moduleSectionsRelations = relations(
  moduleSections,
  ({ one, many }) => ({
    module: one(classModules, {
      fields: [moduleSections.moduleId],
      references: [classModules.id],
    }),
    items: many(moduleItems),
  }),
);

export const moduleItemsRelations = relations(moduleItems, ({ one }) => ({
  section: one(moduleSections, {
    fields: [moduleItems.moduleSectionId],
    references: [moduleSections.id],
  }),
  lesson: one(lessons, {
    fields: [moduleItems.lessonId],
    references: [lessons.id],
  }),
  assessment: one(assessments, {
    fields: [moduleItems.assessmentId],
    references: [assessments.id],
  }),
}));

export const moduleGradingScaleEntriesRelations = relations(
  moduleGradingScaleEntries,
  ({ one }) => ({
    module: one(classModules, {
      fields: [moduleGradingScaleEntries.moduleId],
      references: [classModules.id],
    }),
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
    folderId: uuid('folder_id'),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    classId: uuid('class_id').references(() => classes.id, {
      onDelete: 'cascade',
    }),
    scope: fileScopeEnum('scope').notNull().default('private'),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    storedName: varchar('stored_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    filePath: text('file_path').notNull(),
    uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    folderIdx: index('uploaded_files_folder_idx').on(table.folderId),
    teacherIdx: index('uploaded_files_teacher_idx').on(table.teacherId),
    classIdx: index('uploaded_files_class_idx').on(table.classId),
    scopeIdx: index('uploaded_files_scope_idx').on(table.scope),
    uploadedAtIdx: index('uploaded_files_uploaded_at_idx').on(table.uploadedAt),
  }),
);

export const classVisibilityPreferences = pgTable(
  'class_visibility_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    isHidden: boolean('is_hidden').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('class_visibility_preferences_user_idx').on(table.userId),
    classIdx: index('class_visibility_preferences_class_idx').on(table.classId),
    uniquePreference: unique(
      'class_visibility_preferences_user_class_unique',
    ).on(table.userId, table.classId),
  }),
);

export const studentClassPresentationPreferences = pgTable(
  'student_class_presentation_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    styleMode: studentPresentationModeEnum('style_mode')
      .notNull()
      .default('gradient'),
    styleToken: text('style_token').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('student_class_presentation_preferences_user_idx').on(
      table.userId,
    ),
    classIdx: index('student_class_presentation_preferences_class_idx').on(
      table.classId,
    ),
    uniquePreference: unique(
      'student_class_presentation_preferences_user_class_unique',
    ).on(table.userId, table.classId),
  }),
);

export const studentCourseViewPreferences = pgTable(
  'student_course_view_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    viewMode: studentCourseViewModeEnum('view_mode').notNull().default('card'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('student_course_view_preferences_user_idx').on(table.userId),
    uniqueUserPreference: unique(
      'student_course_view_preferences_user_unique',
    ).on(table.userId),
  }),
);

export const sectionVisibilityPreferences = pgTable(
  'section_visibility_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sectionId: uuid('section_id')
      .notNull()
      .references(() => sections.id, { onDelete: 'cascade' }),
    isHidden: boolean('is_hidden').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('section_visibility_preferences_user_idx').on(table.userId),
    sectionIdx: index('section_visibility_preferences_section_idx').on(
      table.sectionId,
    ),
    uniquePreference: unique(
      'section_visibility_preferences_user_section_unique',
    ).on(table.userId, table.sectionId),
  }),
);

export const libraryFolders = pgTable(
  'library_folders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id'),
    scope: fileScopeEnum('scope').notNull().default('private'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    ownerIdx: index('library_folders_owner_idx').on(table.ownerId),
    parentIdx: index('library_folders_parent_idx').on(table.parentId),
    scopeIdx: index('library_folders_scope_idx').on(table.scope),
  }),
);

export const uploadedFilesRelations = relations(uploadedFiles, ({ one }) => ({
  teacher: one(users, {
    fields: [uploadedFiles.teacherId],
    references: [users.id],
  }),
  class: one(classes, {
    fields: [uploadedFiles.classId],
    references: [classes.id],
  }),
  folder: one(libraryFolders, {
    fields: [uploadedFiles.folderId],
    references: [libraryFolders.id],
  }),
}));

export const classVisibilityPreferencesRelations = relations(
  classVisibilityPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [classVisibilityPreferences.userId],
      references: [users.id],
    }),
    class: one(classes, {
      fields: [classVisibilityPreferences.classId],
      references: [classes.id],
    }),
  }),
);

export const studentClassPresentationPreferencesRelations = relations(
  studentClassPresentationPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [studentClassPresentationPreferences.userId],
      references: [users.id],
    }),
    class: one(classes, {
      fields: [studentClassPresentationPreferences.classId],
      references: [classes.id],
    }),
  }),
);

export const studentCourseViewPreferencesRelations = relations(
  studentCourseViewPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [studentCourseViewPreferences.userId],
      references: [users.id],
    }),
  }),
);

export const sectionVisibilityPreferencesRelations = relations(
  sectionVisibilityPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [sectionVisibilityPreferences.userId],
      references: [users.id],
    }),
    section: one(sections, {
      fields: [sectionVisibilityPreferences.sectionId],
      references: [sections.id],
    }),
  }),
);

export const libraryFoldersRelations = relations(
  libraryFolders,
  ({ one, many }) => ({
    owner: one(users, {
      fields: [libraryFolders.ownerId],
      references: [users.id],
    }),
    parent: one(libraryFolders, {
      fields: [libraryFolders.parentId],
      references: [libraryFolders.id],
      relationName: 'libraryFolderTree',
    }),
    children: many(libraryFolders, {
      relationName: 'libraryFolderTree',
    }),
    files: many(uploadedFiles),
  }),
);

// ==========================================
// 7. ROSTER IMPORT — PENDING ROSTER
// ==========================================

/**
 * Stores roster rows for students who do not yet have an LMS account.
 * Each row is linked to a section and can be resolved (claimed) when the
 * student eventually registers.
 */
export const pendingRoster = pgTable(
  'pending_roster',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sectionId: uuid('section_id')
      .notNull()
      .references(() => sections.id, { onDelete: 'cascade' }),
    lastName: text('last_name').notNull(),
    firstName: text('first_name').notNull(),
    middleInitial: text('middle_initial'),
    lrn: varchar('lrn', { length: 12 }).notNull(),
    rosterEmail: text('roster_email').notNull(),
    resolvedAt: timestamp('resolved_at'),
    resolvedUserId: uuid('resolved_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    importedAt: timestamp('imported_at').notNull().defaultNow(),
  },
  (table) => ({
    sectionIdx: index('pending_roster_section_id_idx').on(table.sectionId),
    emailIdx: index('pending_roster_roster_email_idx').on(table.rosterEmail),
  }),
);

export const pendingRosterRelations = relations(pendingRoster, ({ one }) => ({
  section: one(sections, {
    fields: [pendingRoster.sectionId],
    references: [sections.id],
  }),
  resolvedUser: one(users, {
    fields: [pendingRoster.resolvedUserId],
    references: [users.id],
  }),
}));
