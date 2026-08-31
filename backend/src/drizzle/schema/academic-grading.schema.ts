import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { classes, gradingPeriodEnum, users } from './base.schema';
import { classRecords } from './class-record.schema';
import type {
  AcademicOutcome,
  AcademicPolicy,
  PeriodKey,
} from '../../modules/academic-state/academic-policy';

export interface GradeEvidence {
  policy: AcademicPolicy;
  initialGrade: number | null;
  categories: unknown[];
  participant: Record<string, unknown>;
  legacy?: boolean;
}
export interface AnnualComponentEvidence {
  period: PeriodKey;
  grade: number;
  sourceType: 'period_revision' | 'external';
  sourceId: string;
  classId: string | null;
}

/** Exact legacy projections, including fractional values and unknown historical
 * policy. Archiving evidence does not certify it as an annual-grade source. */
export const academicLegacyGradeEvidence = pgTable(
  'academic_legacy_grade_evidence',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceFinalGradeId: uuid('source_final_grade_id').notNull().unique(),
    classRecordId: uuid('class_record_id')
      .notNull()
      .references(() => classRecords.id, { onDelete: 'restrict' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    schoolYear: text('school_year').notNull(),
    period: gradingPeriodEnum('period').notNull(),
    sourceSnapshot: jsonb('source_snapshot')
      .$type<Record<string, unknown>>()
      .notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('academic_legacy_record_idx').on(table.classRecordId),
    index('academic_legacy_year_idx').on(table.schoolYear),
  ],
);

export const academicYearPolicies = pgTable('academic_year_policies', {
  schoolYear: text('school_year').primaryKey(),
  policyId: text('policy_id').notNull(),
  policy: jsonb('policy').$type<AcademicPolicy>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const classRecordParticipants = pgTable(
  'class_record_participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    classRecordId: uuid('class_record_id')
      .notNull()
      .references(() => classRecords.id, { onDelete: 'restrict' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    eligibility: text('eligibility')
      .$type<'eligible' | 'not_enrolled' | 'transferred' | 'withdrawn'>()
      .notNull()
      .default('eligible'),
    reason: text('reason'),
    source: text('source').notNull(),
    updatedBy: uuid('updated_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('class_record_participant_unique').on(
      table.classRecordId,
      table.studentId,
    ),
    index('class_record_participant_student_idx').on(table.studentId),
    check(
      'class_record_participant_eligibility',
      sql`${table.eligibility} IN ('eligible','not_enrolled','transferred','withdrawn')`,
    ),
  ],
);

export const academicPeriodGradeRevisions = pgTable(
  'academic_period_grade_revisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    classRecordId: uuid('class_record_id')
      .notNull()
      .references(() => classRecords.id, { onDelete: 'restrict' }),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'restrict' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    schoolYear: text('school_year').notNull(),
    subjectCode: text('subject_code').notNull(),
    gradeLevel: text('grade_level').notNull(),
    period: gradingPeriodEnum('period').notNull(),
    revision: integer('revision').notNull(),
    grade: integer('grade').notNull(),
    evidence: jsonb('evidence').$type<GradeEvidence>().notNull(),
    trusted: boolean('trusted').notNull().default(true),
    isCurrent: boolean('is_current').notNull().default(true),
    invalidatedAt: timestamp('invalidated_at', { withTimezone: true }),
    computedBy: uuid('computed_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    computedAt: timestamp('computed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('academic_period_revision_unique').on(
      table.classRecordId,
      table.studentId,
      table.revision,
    ),
    uniqueIndex('academic_period_current_unique')
      .on(table.classRecordId, table.studentId)
      .where(sql`${table.isCurrent} = true`),
    index('academic_period_subject_lookup').on(
      table.schoolYear,
      table.studentId,
      table.subjectCode,
      table.gradeLevel,
    ),
    check('academic_period_grade_range', sql`${table.grade} BETWEEN 0 AND 100`),
  ],
);

export const academicExternalPeriodGrades = pgTable(
  'academic_external_period_grades',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    schoolYear: text('school_year').notNull(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    subjectCode: text('subject_code').notNull(),
    gradeLevel: text('grade_level').notNull(),
    period: gradingPeriodEnum('period').notNull(),
    grade: integer('grade').notNull(),
    sourceReference: text('source_reference').notNull(),
    reason: text('reason').notNull(),
    isCurrent: boolean('is_current').notNull().default(true),
    supersededAt: timestamp('superseded_at', { withTimezone: true }),
    recordedBy: uuid('recorded_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    recordedAt: timestamp('recorded_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('academic_external_current_unique')
      .on(
        table.schoolYear,
        table.studentId,
        table.subjectCode,
        table.gradeLevel,
        table.period,
      )
      .where(sql`${table.isCurrent} = true`),
    check(
      'academic_external_grade_range',
      sql`${table.grade} BETWEEN 0 AND 100`,
    ),
  ],
);

export const academicAnnualSourceSelections = pgTable(
  'academic_annual_source_selections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    schoolYear: text('school_year').notNull(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    subjectCode: text('subject_code').notNull(),
    gradeLevel: text('grade_level').notNull(),
    period: gradingPeriodEnum('period').notNull(),
    sourceType: text('source_type')
      .$type<'period_revision' | 'external'>()
      .notNull(),
    sourceId: uuid('source_id').notNull(),
    reason: text('reason').notNull(),
    selectedBy: uuid('selected_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    selectedAt: timestamp('selected_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('academic_annual_selection_unique').on(
      table.schoolYear,
      table.studentId,
      table.subjectCode,
      table.gradeLevel,
      table.period,
    ),
  ],
);

export const subjectAnnualGrades = pgTable(
  'subject_annual_grades',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    schoolYear: text('school_year').notNull(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    subjectCode: text('subject_code').notNull(),
    gradeLevel: text('grade_level').notNull(),
    components: jsonb('components')
      .$type<AnnualComponentEvidence[]>()
      .notNull(),
    policy: jsonb('policy').$type<AcademicPolicy>().notNull(),
    sourceFingerprint: text('source_fingerprint').notNull(),
    sum: integer('sum').notNull(),
    divisor: integer('divisor').notNull(),
    rawAverage: numeric('raw_average', { precision: 12, scale: 6 }).notNull(),
    officialGrade: integer('official_grade').notNull(),
    remarks: text('remarks').$type<'Passed' | 'Failed'>().notNull(),
    isCurrent: boolean('is_current').notNull().default(true),
    invalidatedAt: timestamp('invalidated_at', { withTimezone: true }),
    invalidationReason: text('invalidation_reason'),
    computedBy: uuid('computed_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    computedAt: timestamp('computed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('subject_annual_current_unique')
      .on(
        table.schoolYear,
        table.studentId,
        table.subjectCode,
        table.gradeLevel,
      )
      .where(sql`${table.isCurrent} = true`),
    index('subject_annual_source_idx').on(table.sourceFingerprint),
    index('subject_annual_student_year_idx').on(
      table.schoolYear,
      table.studentId,
    ),
    check(
      'subject_annual_grade_range',
      sql`${table.officialGrade} BETWEEN 0 AND 100 AND ${table.divisor} IN (3,4)`,
    ),
  ],
);

export const academicRemediationResults = pgTable(
  'academic_remediation_results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    annualGradeId: uuid('annual_grade_id')
      .notNull()
      .references(() => subjectAnnualGrades.id, { onDelete: 'restrict' }),
    remedialClassMark: integer('remedial_class_mark').notNull(),
    rawRecomputedGrade: numeric('raw_recomputed_grade', {
      precision: 9,
      scale: 6,
    }).notNull(),
    recomputedGrade: integer('recomputed_grade').notNull(),
    sourceReference: text('source_reference').notNull(),
    reason: text('reason').notNull(),
    isCurrent: boolean('is_current').notNull().default(true),
    recordedBy: uuid('recorded_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    recordedAt: timestamp('recorded_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('academic_remediation_current_unique')
      .on(table.annualGradeId)
      .where(sql`${table.isCurrent} = true`),
    check(
      'academic_remediation_grade_range',
      sql`${table.remedialClassMark} BETWEEN 0 AND 100 AND ${table.recomputedGrade} BETWEEN 0 AND 100`,
    ),
  ],
);

export const academicBackSubjects = pgTable(
  'academic_back_subjects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    annualGradeId: uuid('annual_grade_id')
      .notNull()
      .references(() => subjectAnnualGrades.id, { onDelete: 'restrict' }),
    remediationResultId: uuid('remediation_result_id')
      .notNull()
      .references(() => academicRemediationResults.id, {
        onDelete: 'restrict',
      }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    subjectCode: text('subject_code').notNull(),
    sourceSchoolYear: text('source_school_year').notNull(),
    gradeLevel: text('grade_level').notNull(),
    status: text('status')
      .$type<'pending' | 'scheduled' | 'cleared' | 'invalidated'>()
      .notNull()
      .default('pending'),
    scheduledSchoolYear: text('scheduled_school_year'),
    scheduledPeriod: gradingPeriodEnum('scheduled_period'),
    clearedGrade: integer('cleared_grade'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('academic_back_subject_annual_unique').on(table.annualGradeId),
    uniqueIndex('academic_back_subject_schedule_unique')
      .on(table.studentId, table.scheduledSchoolYear, table.scheduledPeriod)
      .where(sql`${table.status} IN ('scheduled','cleared')`),
    index('academic_back_subject_student_status_idx').on(
      table.studentId,
      table.status,
    ),
    check(
      'academic_back_subject_status_valid',
      sql`${table.status} IN ('pending','scheduled','cleared','invalidated')`,
    ),
    check(
      'academic_back_subject_schedule_valid',
      sql`${table.status} <> 'scheduled' OR (${table.scheduledSchoolYear} IS NOT NULL AND ${table.scheduledPeriod} IS NOT NULL)`,
    ),
    check(
      'academic_back_subject_clearance_valid',
      sql`${table.status} <> 'cleared' OR (${table.clearedGrade} IS NOT NULL AND ${table.clearedGrade} BETWEEN 75 AND 100)`,
    ),
  ],
);

export const academicBackSubjectEvents = pgTable(
  'academic_back_subject_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    backSubjectId: uuid('back_subject_id')
      .notNull()
      .references(() => academicBackSubjects.id, { onDelete: 'restrict' }),
    action: text('action').notNull(),
    evidence: jsonb('evidence').$type<Record<string, unknown>>().notNull(),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('academic_back_subject_event_idx').on(table.backSubjectId)],
);

export const academicStudentYearOutcomes = pgTable(
  'academic_student_year_outcomes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    schoolYear: text('school_year').notNull(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    sourceGradeLevel: text('source_grade_level').notNull(),
    targetGradeLevel: text('target_grade_level'),
    outcome: text('outcome').$type<AcademicOutcome>().notNull(),
    evidence: jsonb('evidence').$type<Record<string, unknown>>().notNull(),
    recordedBy: uuid('recorded_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    recordedAt: timestamp('recorded_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('academic_student_year_outcome_unique').on(
      table.schoolYear,
      table.studentId,
    ),
  ],
);

export const academicReminderRuns = pgTable(
  'academic_reminder_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fingerprint: text('fingerprint').notNull(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    result: jsonb('result').$type<Record<string, unknown>>().notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('academic_reminder_run_unique').on(
      table.fingerprint,
      table.windowStart,
    ),
  ],
);

/** An append-only completion decision supplements (never rewrites) the year-end outcome. */
export const academicStudentCompletions = pgTable(
  'academic_student_completions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    outcomeId: uuid('outcome_id')
      .notNull()
      .unique()
      .references(() => academicStudentYearOutcomes.id, {
        onDelete: 'restrict',
      }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    evidence: jsonb('evidence').$type<Record<string, unknown>>().notNull(),
    recordedBy: uuid('recorded_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    recordedAt: timestamp('recorded_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('academic_completion_student_idx').on(table.studentId)],
);
