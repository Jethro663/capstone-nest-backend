import {
  boolean,
  index,
  integer,
  json,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import {
  assessments,
  classes,
  gradingPeriodEnum,
  lessons,
  users,
} from './base.schema';

export const interventionCaseStatusEnum = pgEnum('intervention_case_status', [
  'pending',
  'active',
  'completed',
  'dismissed',
]);

export const lxpAssignmentTypeEnum = pgEnum('lxp_assignment_type', [
  'lesson_review',
  'assessment_retry',
  'generated_lesson_review',
  'guided_assessment',
]);

export const lxpGeneratedArtifactStatusEnum = pgEnum(
  'lxp_generated_artifact_status',
  ['draft', 'approved', 'rejected'],
);

export const lxpGuidedAttemptStatusEnum = pgEnum('lxp_guided_attempt_status', [
  'in_progress',
  'submitted',
]);

export const systemEvaluationTargetEnum = pgEnum('system_evaluation_target', [
  'lms',
  'lxp',
  'ai_mentor',
  'intervention',
  'overall',
]);

export const systemEvaluationFormTypeEnum = pgEnum(
  'system_evaluation_form_type',
  ['system', 'ja_hub'],
);

export const systemEvaluationAudienceRoleEnum = pgEnum(
  'system_evaluation_audience_role',
  ['student', 'teacher'],
);

export const systemEvaluationCampaignStatusEnum = pgEnum(
  'system_evaluation_campaign_status',
  ['draft', 'active', 'closed'],
);

export const systemEvaluationAssignmentStatusEnum = pgEnum(
  'system_evaluation_assignment_status',
  ['pending', 'submitted', 'expired'],
);

export const teacherEvaluationTypeEnum = pgEnum('teacher_evaluation_type', [
  'teacher_class',
  'ja_hub',
  'learners_path',
]);

export const teacherEvaluationWindowStatusEnum = pgEnum(
  'teacher_evaluation_window_status',
  ['active', 'closed'],
);

export const aiPolicySourceScopeEnum = pgEnum('ai_policy_source_scope', [
  'recommended_only',
  'class_materials',
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
    status: interventionCaseStatusEnum('status').notNull().default('pending'),
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
    generatedRemedialLessonId: uuid('generated_remedial_lesson_id'),
    generatedGuidedAssessmentId: uuid('generated_guided_assessment_id'),
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
    generatedLessonIdx: index(
      'intervention_assignments_generated_lesson_idx',
    ).on(table.generatedRemedialLessonId),
    generatedAssessmentIdx: index(
      'intervention_assignments_generated_assessment_idx',
    ).on(table.generatedGuidedAssessmentId),
  }),
);

export const generatedRemedialLessons = pgTable(
  'lxp_generated_remedial_lessons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => interventionCases.id, { onDelete: 'cascade' }),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    approvalStatus: lxpGeneratedArtifactStatusEnum('approval_status')
      .notNull()
      .default('draft'),
    title: text('title').notNull(),
    summary: text('summary'),
    lessonBody: text('lesson_body').notNull(),
    weakConcepts: json('weak_concepts').notNull(),
    sourceLessonIds: json('source_lesson_ids').notNull(),
    sourceReferences: json('source_references').notNull(),
    approvedBy: uuid('approved_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    approvedAt: timestamp('approved_at'),
    rejectedAt: timestamp('rejected_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    caseIdx: index('lxp_generated_remedial_lessons_case_idx').on(table.caseId),
    classIdx: index('lxp_generated_remedial_lessons_class_idx').on(
      table.classId,
    ),
    studentIdx: index('lxp_generated_remedial_lessons_student_idx').on(
      table.studentId,
    ),
    statusIdx: index('lxp_generated_remedial_lessons_status_idx').on(
      table.approvalStatus,
    ),
  }),
);

export const generatedGuidedAssessments = pgTable(
  'lxp_generated_guided_assessments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => interventionCases.id, { onDelete: 'cascade' }),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    approvalStatus: lxpGeneratedArtifactStatusEnum('approval_status')
      .notNull()
      .default('draft'),
    sourceAssessmentId: uuid('source_assessment_id').references(
      () => assessments.id,
      { onDelete: 'set null' },
    ),
    title: text('title').notNull(),
    description: text('description'),
    weakConcepts: json('weak_concepts').notNull(),
    sourceReferences: json('source_references').notNull(),
    questions: json('questions').notNull(),
    formativeSummary: text('formative_summary'),
    approvedBy: uuid('approved_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    approvedAt: timestamp('approved_at'),
    rejectedAt: timestamp('rejected_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    caseIdx: index('lxp_generated_guided_assessments_case_idx').on(
      table.caseId,
    ),
    classIdx: index('lxp_generated_guided_assessments_class_idx').on(
      table.classId,
    ),
    studentIdx: index('lxp_generated_guided_assessments_student_idx').on(
      table.studentId,
    ),
    statusIdx: index('lxp_generated_guided_assessments_status_idx').on(
      table.approvalStatus,
    ),
  }),
);

export const generatedGuidedAssessmentAttempts = pgTable(
  'lxp_generated_guided_assessment_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guidedAssessmentId: uuid('guided_assessment_id')
      .notNull()
      .references(() => generatedGuidedAssessments.id, { onDelete: 'cascade' }),
    caseId: uuid('case_id')
      .notNull()
      .references(() => interventionCases.id, { onDelete: 'cascade' }),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    assignmentId: uuid('assignment_id')
      .notNull()
      .references(() => interventionAssignments.id, { onDelete: 'cascade' }),
    attemptNumber: integer('attempt_number').notNull().default(1),
    status: lxpGuidedAttemptStatusEnum('status')
      .notNull()
      .default('in_progress'),
    currentQuestionIndex: integer('current_question_index')
      .notNull()
      .default(0),
    responses: json('responses').notNull().default([]),
    hintUsage: json('hint_usage').notNull().default([]),
    score: integer('score'),
    totalQuestions: integer('total_questions').notNull().default(0),
    correctCount: integer('correct_count').notNull().default(0),
    formativeSummary: json('formative_summary'),
    startedAt: timestamp('started_at').notNull().defaultNow(),
    submittedAt: timestamp('submitted_at'),
    lastActivityAt: timestamp('last_activity_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    guidedAssessmentIdx: index(
      'lxp_generated_guided_attempts_guided_assessment_idx',
    ).on(table.guidedAssessmentId),
    caseStudentIdx: index('lxp_generated_guided_attempts_case_student_idx').on(
      table.caseId,
      table.studentId,
    ),
    assignmentIdx: index('lxp_generated_guided_attempts_assignment_idx').on(
      table.assignmentId,
      table.studentId,
    ),
    assignmentAttemptIdx: uniqueIndex(
      'lxp_generated_guided_attempts_assignment_attempt_unique',
    ).on(table.assignmentId, table.studentId, table.attemptNumber),
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
    campaignId: uuid('campaign_id').references(
      () => systemEvaluationCampaigns.id,
      { onDelete: 'set null' },
    ),
    submittedBy: uuid('submitted_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    targetModule: systemEvaluationTargetEnum('target_module').notNull(),
    usabilityScore: integer('usability_score').notNull(),
    functionalityScore: integer('functionality_score').notNull(),
    performanceScore: integer('performance_score').notNull(),
    satisfactionScore: integer('satisfaction_score').notNull(),
    overallScore: integer('overall_score'),
    questionRatingsJson: json('question_ratings_json'),
    feedback: text('feedback'),
    aiContextMetadata: json('ai_context_metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    moduleCreatedIdx: index('system_evaluations_module_created_idx').on(
      table.targetModule,
      table.createdAt,
    ),
    userIdx: index('system_evaluations_submitted_by_idx').on(table.submittedBy),
    campaignIdx: index('system_evaluations_campaign_idx').on(table.campaignId),
  }),
);

export const systemEvaluationCampaigns = pgTable(
  'system_evaluation_campaigns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    formType: systemEvaluationFormTypeEnum('form_type').notNull(),
    targetModule: systemEvaluationTargetEnum('target_module').notNull(),
    audienceRole: systemEvaluationAudienceRoleEnum('audience_role').notNull(),
    classId: uuid('class_id').references(() => classes.id, {
      onDelete: 'cascade',
    }),
    title: text('title').notNull(),
    startsAt: timestamp('starts_at').notNull(),
    endsAt: timestamp('ends_at').notNull(),
    status: systemEvaluationCampaignStatusEnum('status')
      .notNull()
      .default('draft'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index('system_evaluation_campaigns_status_idx').on(table.status),
    formAudienceIdx: index('system_evaluation_campaigns_form_audience_idx').on(
      table.formType,
      table.audienceRole,
    ),
    classIdx: index('system_evaluation_campaigns_class_idx').on(table.classId),
    createdByIdx: index('system_evaluation_campaigns_created_by_idx').on(
      table.createdBy,
    ),
  }),
);

export const systemEvaluationAssignments = pgTable(
  'system_evaluation_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => systemEvaluationCampaigns.id, { onDelete: 'cascade' }),
    respondentId: uuid('respondent_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    respondentRole:
      systemEvaluationAudienceRoleEnum('respondent_role').notNull(),
    status: systemEvaluationAssignmentStatusEnum('status')
      .notNull()
      .default('pending'),
    submittedEvaluationId: uuid('submitted_evaluation_id').references(
      () => systemEvaluations.id,
      { onDelete: 'set null' },
    ),
    submittedAt: timestamp('submitted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    campaignRespondentUnique: uniqueIndex(
      'system_evaluation_assignments_campaign_respondent_unique',
    ).on(table.campaignId, table.respondentId),
    respondentIdx: index('system_evaluation_assignments_respondent_idx').on(
      table.respondentId,
      table.status,
    ),
    campaignIdx: index('system_evaluation_assignments_campaign_idx').on(
      table.campaignId,
    ),
  }),
);

export const classAiPolicies = pgTable(
  'class_ai_policies',
  {
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    mentorExplainEnabled: boolean('mentor_explain_enabled')
      .notNull()
      .default(true),
    maxFollowUpTurns: integer('max_follow_up_turns').notNull().default(3),
    sourceScope: aiPolicySourceScopeEnum('source_scope')
      .notNull()
      .default('class_materials'),
    strictGrounding: boolean('strict_grounding').notNull().default(false),
    updatedBy: uuid('updated_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.classId] }),
    updatedByIdx: index('class_ai_policies_updated_by_idx').on(table.updatedBy),
  }),
);

export const teacherEvaluationWindows = pgTable(
  'teacher_evaluation_windows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    schoolYear: text('school_year').notNull(),
    gradingPeriod: gradingPeriodEnum('grading_period').notNull(),
    evaluationType: teacherEvaluationTypeEnum('evaluation_type').notNull(),
    status: teacherEvaluationWindowStatusEnum('status')
      .notNull()
      .default('active'),
    eligibleCount: integer('eligible_count').notNull().default(0),
    opensAt: timestamp('opens_at').notNull().defaultNow(),
    closesAt: timestamp('closes_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    classPeriodTypeUnique: uniqueIndex(
      'teacher_evaluation_windows_class_period_type_unique',
    ).on(
      table.classId,
      table.schoolYear,
      table.gradingPeriod,
      table.evaluationType,
    ),
    teacherIdx: index('teacher_evaluation_windows_teacher_idx').on(
      table.teacherId,
    ),
    classIdx: index('teacher_evaluation_windows_class_idx').on(table.classId),
    periodTypeIdx: index('teacher_evaluation_windows_period_type_idx').on(
      table.gradingPeriod,
      table.evaluationType,
    ),
  }),
);

export const teacherEvaluationSubmissions = pgTable(
  'teacher_evaluation_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    windowId: uuid('window_id')
      .notNull()
      .references(() => teacherEvaluationWindows.id, { onDelete: 'cascade' }),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    schoolYear: text('school_year').notNull(),
    gradingPeriod: gradingPeriodEnum('grading_period').notNull(),
    evaluationType: teacherEvaluationTypeEnum('evaluation_type').notNull(),
    ratingsJson: json('ratings_json').notNull(),
    comment: text('comment'),
    submittedAt: timestamp('submitted_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    studentScopeUnique: uniqueIndex(
      'teacher_evaluation_submissions_student_scope_unique',
    ).on(
      table.studentId,
      table.classId,
      table.schoolYear,
      table.gradingPeriod,
      table.evaluationType,
    ),
    windowIdx: index('teacher_evaluation_submissions_window_idx').on(
      table.windowId,
    ),
    teacherIdx: index('teacher_evaluation_submissions_teacher_idx').on(
      table.teacherId,
    ),
    classPeriodIdx: index('teacher_evaluation_submissions_class_period_idx').on(
      table.classId,
      table.gradingPeriod,
      table.evaluationType,
    ),
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
    generatedLessons: many(generatedRemedialLessons),
    generatedAssessments: many(generatedGuidedAssessments),
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
    generatedRemedialLesson: one(generatedRemedialLessons, {
      fields: [interventionAssignments.generatedRemedialLessonId],
      references: [generatedRemedialLessons.id],
    }),
    generatedGuidedAssessment: one(generatedGuidedAssessments, {
      fields: [interventionAssignments.generatedGuidedAssessmentId],
      references: [generatedGuidedAssessments.id],
    }),
  }),
);

export const generatedRemedialLessonsRelations = relations(
  generatedRemedialLessons,
  ({ one, many }) => ({
    interventionCase: one(interventionCases, {
      fields: [generatedRemedialLessons.caseId],
      references: [interventionCases.id],
    }),
    class: one(classes, {
      fields: [generatedRemedialLessons.classId],
      references: [classes.id],
    }),
    student: one(users, {
      fields: [generatedRemedialLessons.studentId],
      references: [users.id],
    }),
    assignments: many(interventionAssignments),
  }),
);

export const generatedGuidedAssessmentsRelations = relations(
  generatedGuidedAssessments,
  ({ one, many }) => ({
    interventionCase: one(interventionCases, {
      fields: [generatedGuidedAssessments.caseId],
      references: [interventionCases.id],
    }),
    class: one(classes, {
      fields: [generatedGuidedAssessments.classId],
      references: [classes.id],
    }),
    student: one(users, {
      fields: [generatedGuidedAssessments.studentId],
      references: [users.id],
    }),
    sourceAssessment: one(assessments, {
      fields: [generatedGuidedAssessments.sourceAssessmentId],
      references: [assessments.id],
    }),
    assignments: many(interventionAssignments),
    attempts: many(generatedGuidedAssessmentAttempts),
  }),
);

export const generatedGuidedAssessmentAttemptsRelations = relations(
  generatedGuidedAssessmentAttempts,
  ({ one }) => ({
    guidedAssessment: one(generatedGuidedAssessments, {
      fields: [generatedGuidedAssessmentAttempts.guidedAssessmentId],
      references: [generatedGuidedAssessments.id],
    }),
    interventionCase: one(interventionCases, {
      fields: [generatedGuidedAssessmentAttempts.caseId],
      references: [interventionCases.id],
    }),
    class: one(classes, {
      fields: [generatedGuidedAssessmentAttempts.classId],
      references: [classes.id],
    }),
    student: one(users, {
      fields: [generatedGuidedAssessmentAttempts.studentId],
      references: [users.id],
    }),
    assignment: one(interventionAssignments, {
      fields: [generatedGuidedAssessmentAttempts.assignmentId],
      references: [interventionAssignments.id],
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
    campaign: one(systemEvaluationCampaigns, {
      fields: [systemEvaluations.campaignId],
      references: [systemEvaluationCampaigns.id],
    }),
  }),
);

export const systemEvaluationCampaignsRelations = relations(
  systemEvaluationCampaigns,
  ({ one, many }) => ({
    creator: one(users, {
      fields: [systemEvaluationCampaigns.createdBy],
      references: [users.id],
    }),
    class: one(classes, {
      fields: [systemEvaluationCampaigns.classId],
      references: [classes.id],
    }),
    assignments: many(systemEvaluationAssignments),
    evaluations: many(systemEvaluations),
  }),
);

export const systemEvaluationAssignmentsRelations = relations(
  systemEvaluationAssignments,
  ({ one }) => ({
    campaign: one(systemEvaluationCampaigns, {
      fields: [systemEvaluationAssignments.campaignId],
      references: [systemEvaluationCampaigns.id],
    }),
    respondent: one(users, {
      fields: [systemEvaluationAssignments.respondentId],
      references: [users.id],
    }),
    submittedEvaluation: one(systemEvaluations, {
      fields: [systemEvaluationAssignments.submittedEvaluationId],
      references: [systemEvaluations.id],
    }),
  }),
);

export const classAiPoliciesRelations = relations(
  classAiPolicies,
  ({ one }) => ({
    class: one(classes, {
      fields: [classAiPolicies.classId],
      references: [classes.id],
    }),
    updatedByUser: one(users, {
      fields: [classAiPolicies.updatedBy],
      references: [users.id],
    }),
  }),
);

export const teacherEvaluationWindowsRelations = relations(
  teacherEvaluationWindows,
  ({ one, many }) => ({
    class: one(classes, {
      fields: [teacherEvaluationWindows.classId],
      references: [classes.id],
    }),
    teacher: one(users, {
      fields: [teacherEvaluationWindows.teacherId],
      references: [users.id],
    }),
    submissions: many(teacherEvaluationSubmissions),
  }),
);

export const teacherEvaluationSubmissionsRelations = relations(
  teacherEvaluationSubmissions,
  ({ one }) => ({
    window: one(teacherEvaluationWindows, {
      fields: [teacherEvaluationSubmissions.windowId],
      references: [teacherEvaluationWindows.id],
    }),
    class: one(classes, {
      fields: [teacherEvaluationSubmissions.classId],
      references: [classes.id],
    }),
    teacher: one(users, {
      fields: [teacherEvaluationSubmissions.teacherId],
      references: [users.id],
    }),
    student: one(users, {
      fields: [teacherEvaluationSubmissions.studentId],
      references: [users.id],
    }),
  }),
);
