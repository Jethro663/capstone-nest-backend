import {
  pgTable,
  uuid,
  text,
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

    schedule: text('schedule'),
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
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ==========================================
// 5. RELATIONS
// ==========================================

export const usersRelations = relations(users, ({ many, one }) => ({
  userRoles: many(userRoles), // Relationship to Roles
  classesTaught: many(classes, { relationName: 'teacherClasses' }),
  advisedSections: many(sections),
  enrollments: many(enrollments),
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

export const assessmentsRelations = relations(assessments, ({ one }) => ({
  class: one(classes, {
    fields: [assessments.classId],
    references: [classes.id],
  }),
}));
