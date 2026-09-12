import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  AcademicPolicy,
  getDefaultAcademicPolicy,
  PeriodKey,
} from '../academic-state/academic-policy';

export type ResetAction =
  | 'preserve'
  | 'clear'
  | 'archive'
  | 'administrator'
  | 'initialize';
export interface ResetTableRule {
  action: ResetAction;
  group: string;
}

// Explicit declarations are intentional. A new table must receive a reviewed
// disposition; deriving clear targets from every live table would be destructive.
const groups: Array<{ action: ResetAction; group: string; tables: string[] }> =
  [
    {
      action: 'preserve',
      group: 'System settings',
      tables: [
        'roles',
        'app_versions',
        '_applied_migrations',
        'academic_year_policies',
        'transmutation_tables',
        'system_reset_state',
        'system_reset_operations',
        'system_reset_evidence',
        'system_reset_instances',
      ],
    },
    {
      action: 'preserve',
      group: 'Audit and recovery history',
      tables: [
        'audit_logs',
        'grade_score_repair_evidence',
        'admin_lifecycle_operations',
        'enrollment_lifecycle_events',
      ],
    },
    {
      action: 'archive',
      group: 'Audit and recovery history',
      tables: ['academic_legacy_grade_evidence'],
    },
    {
      action: 'administrator',
      group: 'Accounts',
      tables: ['users', 'user_roles'],
    },
    {
      action: 'initialize',
      group: 'Academic calendar',
      tables: ['academic_system_states'],
    },
    {
      action: 'clear',
      group: 'Accounts and sessions',
      tables: [
        'student_profiles',
        'teacher_profiles',
        'archived_users',
        'otp_verifications',
        'refresh_tokens',
        'admin_demo_mode_states',
      ],
    },
    {
      action: 'clear',
      group: 'School setup',
      tables: [
        'sections',
        'classes',
        'class_schedules',
        'enrollments',
        'pending_roster',
        'school_events',
        'class_visibility_preferences',
        'student_class_presentation_preferences',
        'student_course_view_preferences',
        'section_visibility_preferences',
      ],
    },
    {
      action: 'clear',
      group: 'Lessons, files and templates',
      tables: [
        'lessons',
        'lesson_content_blocks',
        'lesson_completions',
        'lesson_versions',
        'class_modules',
        'module_sections',
        'module_items',
        'module_grading_scale_entries',
        'uploaded_files',
        'library_folders',
        'class_templates',
        'class_template_modules',
        'class_template_module_sections',
        'class_template_assessments',
        'class_template_lessons',
        'class_template_lesson_blocks',
        'class_template_assessment_questions',
        'class_template_assessment_question_options',
        'class_template_engine_chunks',
        'class_template_module_items',
        'class_template_announcements',
      ],
    },
    {
      action: 'clear',
      group: 'Assessments and academic records',
      tables: [
        'assessments',
        'assessment_questions',
        'assessment_question_options',
        'assessment_attempts',
        'assessment_responses',
        'assessment_editor_receipts',
        'class_records',
        'class_record_categories',
        'class_record_items',
        'class_record_scores',
        'class_record_final_grades',
        'class_record_participants',
        'academic_period_grade_revisions',
        'academic_external_period_grades',
        'academic_annual_source_selections',
        'subject_annual_grades',
        'academic_remediation_results',
        'academic_back_subjects',
        'academic_back_subject_events',
        'academic_student_year_outcomes',
        'academic_reminder_runs',
        'academic_student_completions',
      ],
    },
    {
      action: 'clear',
      group: 'AI, indexed content and reports',
      tables: [
        'ai_interaction_logs',
        'extracted_modules',
        'content_chunks',
        'content_chunk_embeddings',
        'student_concept_mastery',
        'ai_generation_jobs',
        'ai_generation_outputs',
        'performance_snapshots',
        'performance_logs',
        'intervention_cases',
        'intervention_assignments',
        'lxp_generated_remedial_lessons',
        'lxp_generated_guided_assessments',
        'lxp_generated_guided_assessment_attempts',
        'lxp_progress',
        'system_evaluations',
        'system_evaluation_campaigns',
        'system_evaluation_assignments',
        'class_ai_policies',
        'teacher_evaluation_windows',
        'teacher_evaluation_submissions',
        'ja_sessions',
        'ja_session_items',
        'ja_session_responses',
        'ja_session_events',
        'ja_progress',
        'ja_xp_ledger',
        'ja_threads',
        'ja_thread_messages',
        'ja_guardrail_events',
      ],
    },
    {
      action: 'clear',
      group: 'Messages and notifications',
      tables: [
        'announcements',
        'notifications',
        'discussion_threads',
        'discussion_thread_attachments',
        'discussion_comments',
        'discussion_comment_attachments',
        'discussion_comment_reactions',
      ],
    },
  ];

export const RESET_CATALOG: Readonly<Record<string, ResetTableRule>> =
  Object.freeze(
    Object.fromEntries(
      groups.flatMap(({ action, group, tables }) =>
        tables.map((table) => [table, Object.freeze({ action, group })]),
      ),
    ),
  );
export const RESET_CATALOG_VERSION = 1;
export const RESET_QUEUE_NAMES = [
  'announcements',
  'notifications',
  'discussion-board',
  'rag-indexing',
  'library-indexing',
  'performance-recompute',
  'ai-teacher-generation',
] as const;
export const RESET_ACKNOWLEDGEMENTS = [
  'OTHER_ACCOUNTS_REMOVED',
  'SCHOOL_CONTENT_REMOVED',
  'FILES_AND_INDEXES_REMOVED',
  'AUDIT_AND_SETTINGS_RETAINED',
  'SIGN_IN_AGAIN',
] as const;
export const RESET_COORDINATOR_LOCK = 78766902;
export const RESET_WRITE_LOCK = 78766903;
export const RESET_IO_LOCK = 78766904;

export function assertResetCatalog(tables: string[]): void {
  const known = Object.keys(RESET_CATALOG);
  const extra = tables.filter((name) => !Object.hasOwn(RESET_CATALOG, name));
  const missing = known.filter((name) => !tables.includes(name));
  if (extra.length || missing.length)
    throw new ConflictException({
      code: 'RESET_SCOPE_UNVERIFIED',
      message: `Reset catalog differs from the database. Unclassified: ${extra.join(', ') || 'none'}. Missing: ${missing.join(', ') || 'none'}.`,
    });
}

export function resetTargetPolicy(
  schoolYear: string,
  period: PeriodKey,
  existing?: AcademicPolicy,
  legacyBands?: AcademicPolicy['transmutationBands'],
): AcademicPolicy {
  let defaults: AcademicPolicy;
  try {
    defaults = getDefaultAcademicPolicy(schoolYear);
  } catch {
    throw new BadRequestException(
      'Use a consecutive school year such as 2026-2027.',
    );
  }
  const policy = existing ?? {
    ...defaults,
    ...(defaults.gradeMethod === 'legacy_transmutation' && legacyBands?.length
      ? { transmutationBands: legacyBands }
      : {}),
  };
  if (
    policy.schoolYear !== schoolYear ||
    !policy.periods.some((entry) => entry.key === period)
  )
    throw new BadRequestException(
      'Choose a period from the selected school-year policy.',
    );
  return policy;
}
