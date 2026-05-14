import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  SQL,
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  NotificationsService,
  type CreateNotificationInput,
} from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import {
  academicSystemStates,
  assessments,
  assessmentAttempts,
  classRecordFinalGrades,
  classRecords,
  classes,
  enrollments,
  generatedGuidedAssessmentAttempts,
  generatedGuidedAssessments,
  generatedRemedialLessons,
  interventionAssignments,
  interventionCases,
  jaSessions,
  lessons,
  lxpProgress,
  performanceSnapshots,
  performanceLogs,
  roles,
  studentConceptMastery,
  systemEvaluationAssignments,
  systemEvaluationCampaigns,
  systemEvaluationTargetEnum,
  systemEvaluations,
  teacherEvaluationSubmissions,
  teacherEvaluationTypeEnum,
  teacherEvaluationWindows,
  userRoles,
  users,
} from '../../drizzle/schema';
import { PerformanceStatusChangedEvent } from '../../common/events';
import {
  ApproveGeneratedArtifactsDto,
  AssignInterventionDto,
  CreateSystemEvaluationCampaignDto,
  ListSystemEvaluationCampaignsQueryDto,
  SubmitGuidedAssessmentDto,
  UpdateGuidedAssessmentProgressDto,
  ListTeacherEvaluationSummaryQueryDto,
  ListSystemEvaluationsQueryDto,
  ResolveInterventionDto,
  SubmitAssignedSystemEvaluationDto,
  SubmitSystemEvaluationDto,
  SubmitTeacherEvaluationDto,
  UpdateSystemEvaluationCampaignStatusDto,
} from './dto/lxp.dto';
import { AuditService } from '../audit/audit.service';

const INTERVENTION_THRESHOLD = 74;
const PATH_REGENERATION_SCORE_THRESHOLD = 60;
const LESSON_XP = 20;
const ASSESSMENT_XP = 30;
const STAR_XP = 1000;
const GUIDED_ASSESSMENT_SUPPORTED_TYPES = new Set([
  'multiple_choice',
  'multiple_select',
  'true_false',
  'dropdown',
]);

type UserContext = {
  userId: string;
  roles: string[];
};

type TeacherPathScoreSource = 'guided_assessment' | 'assessment_retry';

type TeacherPathScore = {
  source: TeacherPathScoreSource;
  assignmentId: string | null;
  attemptId: string;
  scorePercent: number;
  correctCount?: number | null;
  totalQuestions?: number | null;
  passed?: boolean | null;
  submittedAt: Date | null;
};

type TeacherPathScoreCase = {
  id: string;
  studentId: string;
};

type TeacherPathScoreAssignment = {
  id: string;
  caseId: string;
  assignmentType: string;
  assessmentId?: string | null;
};

type SystemEvaluationTarget =
  (typeof systemEvaluationTargetEnum.enumValues)[number];
type SystemEvaluationFormType = 'system' | 'ja_hub';
type SystemEvaluationAudienceRole = 'student' | 'teacher';
type SystemEvaluationCampaignStatus = 'draft' | 'active' | 'closed';
type TeacherEvaluationType =
  (typeof teacherEvaluationTypeEnum.enumValues)[number];

type SystemEvaluationDefinition = {
  title: string;
  description: string;
  targetModule: Extract<SystemEvaluationTarget, 'overall' | 'ai_mentor'>;
  audienceRoles: SystemEvaluationAudienceRole[];
  questions: Array<{
    key: string;
    label: string;
  }>;
};

const SYSTEM_EVALUATION_DEFINITIONS: Record<
  SystemEvaluationFormType,
  SystemEvaluationDefinition
> = {
  system: {
    title: 'System Evaluation',
    description: 'Rate the overall LMS experience.',
    targetModule: 'overall',
    audienceRoles: ['student', 'teacher'],
    questions: [
      {
        key: 'system_navigation',
        label: 'The system is easy to navigate and I can find what I need.',
      },
      {
        key: 'system_features',
        label: 'The features I use work correctly.',
      },
      {
        key: 'system_speed',
        label:
          'Pages, submissions, and dashboards load fast enough during normal use.',
      },
      {
        key: 'system_efficiency',
        label: 'The system helps me complete school tasks more efficiently.',
      },
      {
        key: 'system_satisfaction',
        label: 'Overall, I am satisfied with my experience using the system.',
      },
    ],
  },
  ja_hub: {
    title: 'JA Hub Evaluation',
    description: 'Rate the JA Hub support experience.',
    targetModule: 'ai_mentor',
    audienceRoles: ['student'],
    questions: [
      {
        key: 'ja_access',
        label: 'JA Hub is easy to open and use when I need help.',
      },
      {
        key: 'ja_clarity',
        label: 'JA Hub explains answers clearly.',
      },
      {
        key: 'ja_relevance',
        label:
          'JA Hub gives responses that match my lesson, assessment, or question.',
      },
      {
        key: 'ja_speed',
        label: 'JA Hub responds quickly enough for studying.',
      },
      {
        key: 'ja_helpfulness',
        label: 'Overall, JA Hub helps me understand topics better.',
      },
    ],
  },
};

type TeacherEvaluationDefinition = {
  title: string;
  description: string;
  categories: Array<{
    key: string;
    label: string;
  }>;
};

const TEACHER_EVALUATION_DEFINITIONS: Record<
  TeacherEvaluationType,
  TeacherEvaluationDefinition
> = {
  teacher_class: {
    title: 'My Teaching',
    description:
      'Share feedback about teaching clarity, support, fairness, and learning materials.',
    categories: [
      { key: 'teaching_clarity', label: 'Teaching Clarity' },
      { key: 'learning_materials', label: 'Learning Materials and Activities' },
      { key: 'fairness_feedback', label: 'Fair Instructions and Feedback' },
      { key: 'teacher_support', label: 'Supportiveness' },
      { key: 'learning_engagement', label: 'Learning and Engagement' },
    ],
  },
  ja_hub: {
    title: 'JA Hub in My Classes',
    description:
      'Rate how helpful JA Hub was for guided support in this class.',
    categories: [
      { key: 'clarity', label: 'Clarity of Explanation' },
      { key: 'usefulness', label: 'Usefulness' },
      { key: 'trust', label: 'Accuracy and Trust' },
      { key: 'ease_of_use', label: 'Ease of Use' },
      { key: 'understanding', label: 'Helped Me Understand Better' },
    ],
  },
  learners_path: {
    title: 'Learners Path in My Classes',
    description:
      'Rate how helpful the Learners Path activities were for recovery and review.',
    categories: [
      { key: 'matched_weaknesses', label: 'Matched My Weaknesses' },
      { key: 'clear_instructions', label: 'Clear Instructions' },
      { key: 'helpful_activities', label: 'Helpful Activities' },
      { key: 'motivating_progress', label: 'Motivating Progress' },
      { key: 'improvement', label: 'Helped Me Improve' },
    ],
  },
};

const GRADING_PERIOD_ORDER = ['Q1', 'Q2', 'Q3', 'Q4'] as const;

@Injectable()
export class LxpService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly auditService: AuditService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  private isTeacher(userRoles: string[]) {
    return userRoles.includes('teacher');
  }

  private getSystemEvaluationDefinition(formType: SystemEvaluationFormType) {
    const definition = SYSTEM_EVALUATION_DEFINITIONS[formType];
    if (!definition) {
      throw new BadRequestException('Unsupported evaluation form type.');
    }
    return definition;
  }

  private normalizeDateRange(startsAt: string, endsAt: string) {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Campaign dates must be valid ISO dates.');
    }
    if (start >= end) {
      throw new BadRequestException(
        'Campaign end date must be after start date.',
      );
    }
    return { start, end };
  }

  private normalizeSystemEvaluationQuestionRatings(
    formType: SystemEvaluationFormType,
    questionRatings: Record<string, unknown>,
  ) {
    const definition = this.getSystemEvaluationDefinition(formType);
    const normalized: Record<string, number> = {};
    const expectedKeys = definition.questions.map((question) => question.key);

    for (const key of expectedKeys) {
      const rawValue = questionRatings[key];
      const parsedValue =
        typeof rawValue === 'number'
          ? rawValue
          : Number.parseInt(String(rawValue), 10);
      if (
        !Number.isInteger(parsedValue) ||
        parsedValue < 0 ||
        parsedValue > 5
      ) {
        throw new BadRequestException(
          `Rating "${key}" must be an integer from 0 to 5.`,
        );
      }
      normalized[key] = parsedValue;
    }

    const unknownKeys = Object.keys(questionRatings).filter(
      (key) => !expectedKeys.includes(key),
    );
    if (unknownKeys.length > 0) {
      throw new BadRequestException(
        `Unexpected rating keys: ${unknownKeys.join(', ')}`,
      );
    }

    const average = Math.round(
      Object.values(normalized).reduce((sum, value) => sum + value, 0) /
        expectedKeys.length,
    );

    if (formType === 'ja_hub') {
      return {
        normalized,
        legacyScores: {
          usabilityScore: normalized.ja_access,
          functionalityScore: normalized.ja_relevance,
          performanceScore: normalized.ja_speed,
          satisfactionScore: normalized.ja_helpfulness,
          overallScore: average,
        },
      };
    }

    return {
      normalized,
      legacyScores: {
        usabilityScore: normalized.system_navigation,
        functionalityScore: normalized.system_features,
        performanceScore: normalized.system_speed,
        satisfactionScore: normalized.system_satisfaction,
        overallScore: average,
      },
    };
  }

  private isSystemCampaignOpen(campaign: {
    status: SystemEvaluationCampaignStatus;
    startsAt: Date | string;
    endsAt: Date | string;
  }) {
    const now = new Date();
    const startsAt = new Date(campaign.startsAt);
    const endsAt = new Date(campaign.endsAt);
    return campaign.status === 'active' && startsAt <= now && endsAt >= now;
  }

  private formatSystemEvaluationAssignment(row: {
    id: string;
    status: 'pending' | 'submitted' | 'expired';
    submittedAt?: Date | string | null;
    campaign: {
      id: string;
      formType: SystemEvaluationFormType;
      targetModule: SystemEvaluationTarget;
      title: string;
      audienceRole: SystemEvaluationAudienceRole;
      classId?: string | null;
      startsAt: Date | string;
      endsAt: Date | string;
      status: SystemEvaluationCampaignStatus;
      class?: {
        id: string;
        subjectName: string;
        subjectCode: string;
        section?: { id: string; name: string; gradeLevel: string } | null;
      } | null;
    };
  }) {
    const definition = this.getSystemEvaluationDefinition(
      row.campaign.formType,
    );
    return {
      id: row.id,
      campaignId: row.campaign.id,
      formType: row.campaign.formType,
      targetModule: row.campaign.targetModule,
      title: row.campaign.title || definition.title,
      description: definition.description,
      audienceRole: row.campaign.audienceRole,
      classId: row.campaign.classId ?? null,
      class: row.campaign.class ?? null,
      startsAt: row.campaign.startsAt,
      endsAt: row.campaign.endsAt,
      status: row.status,
      submittedAt: row.submittedAt ?? null,
      questions: definition.questions,
    };
  }

  private async resolveSystemEvaluationRespondents(input: {
    audienceRole: SystemEvaluationAudienceRole;
    classId?: string | null;
  }) {
    if (input.classId) {
      if (input.audienceRole === 'teacher') {
        const cls = await this.db.query.classes.findFirst({
          where: eq(classes.id, input.classId),
          columns: { teacherId: true },
        });
        return cls?.teacherId ? [cls.teacherId] : [];
      }

      const enrollmentRows = await this.db.query.enrollments.findMany({
        where: and(
          eq(enrollments.classId, input.classId),
          eq(enrollments.status, 'enrolled'),
        ),
        columns: { studentId: true },
      });
      return enrollmentRows.map((row) => row.studentId);
    }

    const roleRows = await this.db
      .select({ userId: users.id })
      .from(users)
      .innerJoin(userRoles, eq(users.id, userRoles.userId))
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(
        and(eq(roles.name, input.audienceRole), eq(users.status, 'ACTIVE')),
      );

    return roleRows.map((row) => row.userId);
  }

  private async createAssignmentsForSystemCampaign(campaign: {
    id: string;
    audienceRole: SystemEvaluationAudienceRole;
    classId?: string | null;
  }) {
    const respondentIds = Array.from(
      new Set(
        await this.resolveSystemEvaluationRespondents({
          audienceRole: campaign.audienceRole,
          classId: campaign.classId,
        }),
      ),
    );

    if (respondentIds.length === 0) return 0;

    await this.db
      .insert(systemEvaluationAssignments)
      .values(
        respondentIds.map((respondentId) => ({
          campaignId: campaign.id,
          respondentId,
          respondentRole: campaign.audienceRole,
          status: 'pending' as const,
          updatedAt: new Date(),
        })),
      )
      .onConflictDoNothing();

    return respondentIds.length;
  }

  private async assertSystemEvaluationCampaignAccess(
    campaign: {
      createdBy: string;
      classId?: string | null;
    },
    user: UserContext,
  ) {
    if (this.isAdmin(user.roles)) return;
    if (!this.isTeacher(user.roles)) {
      throw new ForbiddenException(
        'Only teachers and admins can manage evaluation campaigns.',
      );
    }
    if (campaign.createdBy === user.userId) return;
    if (!campaign.classId) {
      throw new ForbiddenException('You can only manage your own campaigns.');
    }
    await this.assertTeacherClassAccess(campaign.classId, user);
  }

  private getDefaultSchoolYear() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const schoolYearStart = now.getMonth() >= 5 ? currentYear : currentYear - 1;
    return `${schoolYearStart}-${schoolYearStart + 1}`;
  }

  private async getCurrentAcademicStateSnapshot() {
    const existing = await this.db.query.academicSystemStates.findFirst({
      orderBy: [desc(academicSystemStates.updatedAt)],
    });

    return (
      existing ?? {
        schoolYear: this.getDefaultSchoolYear(),
        quarter: 'Q1' as const,
      }
    );
  }

  private isAdmin(roles: string[]): boolean {
    return roles.includes('admin');
  }

  private getTeacherEvaluationDefinition(type: TeacherEvaluationType) {
    return TEACHER_EVALUATION_DEFINITIONS[type];
  }

  private quarterSortValue(value: string) {
    const index = GRADING_PERIOD_ORDER.indexOf(
      value as (typeof GRADING_PERIOD_ORDER)[number],
    );
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  }

  private buildTeacherEvaluationScopeKey(input: {
    classId: string;
    gradingPeriod: string;
    evaluationType: TeacherEvaluationType;
  }) {
    return `${input.classId}:${input.gradingPeriod}:${input.evaluationType}`;
  }

  private normalizeTeacherEvaluationRatings(
    evaluationType: TeacherEvaluationType,
    ratings: Record<string, unknown>,
  ) {
    const definition = this.getTeacherEvaluationDefinition(evaluationType);
    const normalized: Record<string, number> = {};

    for (const category of definition.categories) {
      const rawValue = ratings[category.key];
      const parsedValue =
        typeof rawValue === 'number'
          ? rawValue
          : Number.parseInt(String(rawValue), 10);
      if (
        !Number.isInteger(parsedValue) ||
        parsedValue < 1 ||
        parsedValue > 5
      ) {
        throw new BadRequestException(
          `Rating "${category.key}" must be an integer from 1 to 5.`,
        );
      }
      normalized[category.key] = parsedValue;
    }

    const unknownKeys = Object.keys(ratings).filter(
      (key) => !definition.categories.some((category) => category.key === key),
    );
    if (unknownKeys.length > 0) {
      throw new BadRequestException(
        `Unexpected rating keys: ${unknownKeys.join(', ')}`,
      );
    }

    return normalized;
  }

  private async getStudentTeacherEvaluationCandidates(studentId: string) {
    const finalGradeRows = await this.db.query.classRecordFinalGrades.findMany({
      where: eq(classRecordFinalGrades.studentId, studentId),
      with: {
        classRecord: {
          columns: {
            classId: true,
            gradingPeriod: true,
            status: true,
          },
          with: {
            class: {
              columns: {
                id: true,
                subjectName: true,
                subjectCode: true,
                schoolYear: true,
                teacherId: true,
              },
              with: {
                section: {
                  columns: {
                    id: true,
                    name: true,
                    gradeLevel: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [desc(classRecordFinalGrades.computedAt)],
    });

    const finalizedRows = finalGradeRows.filter(
      (row) =>
        row.classRecord?.status === 'finalized' &&
        row.classRecord.class?.teacherId,
    );
    const classIds = Array.from(
      new Set(
        finalizedRows
          .map((row) => row.classRecord.classId)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const [jaUsageRows, lxpUsageRows, completedCaseRows] = await Promise.all([
      classIds.length > 0
        ? this.db.query.jaSessions.findMany({
            where: and(
              eq(jaSessions.studentId, studentId),
              eq(jaSessions.status, 'completed'),
              inArray(jaSessions.classId, classIds),
            ),
            columns: { classId: true },
          })
        : Promise.resolve<Array<{ classId: string | null }>>([]),
      classIds.length > 0
        ? this.db.query.lxpProgress.findMany({
            where: and(
              eq(lxpProgress.studentId, studentId),
              inArray(lxpProgress.classId, classIds),
            ),
            columns: {
              classId: true,
              checkpointsCompleted: true,
            },
          })
        : Promise.resolve<
            Array<{
              classId: string | null;
              checkpointsCompleted: number | null;
            }>
          >([]),
      classIds.length > 0
        ? this.db.query.interventionCases.findMany({
            where: and(
              eq(interventionCases.studentId, studentId),
              inArray(interventionCases.classId, classIds),
              eq(interventionCases.status, 'completed'),
            ),
            columns: {
              classId: true,
            },
          })
        : Promise.resolve<Array<{ classId: string | null }>>([]),
    ]);

    const jaUsedClassIds = new Set(
      jaUsageRows
        .map((row) => row.classId)
        .filter((value): value is string => Boolean(value)),
    );
    const lxpCheckpointMap = new Map<string, number>(
      lxpUsageRows
        .filter(
          (
            row,
          ): row is { classId: string; checkpointsCompleted: number | null } =>
            Boolean(row.classId),
        )
        .map((row) => [row.classId, row.checkpointsCompleted ?? 0] as const),
    );
    const completedLearnersPathClassIds = new Set(
      completedCaseRows
        .map((row) => row.classId)
        .filter((value): value is string => Boolean(value)),
    );

    return finalizedRows.flatMap((row) => {
      const cls = row.classRecord.class;
      const classId = row.classRecord.classId;
      const gradingPeriod = row.classRecord.gradingPeriod;
      const base = {
        classId,
        gradingPeriod,
        schoolYear: cls.schoolYear,
        teacherId: cls.teacherId as string,
        class: cls,
      };

      const candidates: Array<{
        classId: string;
        gradingPeriod: string;
        schoolYear: string;
        teacherId: string;
        evaluationType: TeacherEvaluationType;
        class: typeof cls;
      }> = [
        {
          ...base,
          evaluationType: 'teacher_class',
        },
      ];

      if (jaUsedClassIds.has(classId)) {
        candidates.push({
          ...base,
          evaluationType: 'ja_hub',
        });
      }

      const checkpointsCompleted = lxpCheckpointMap.get(classId) ?? 0;
      if (
        checkpointsCompleted > 0 ||
        completedLearnersPathClassIds.has(classId)
      ) {
        candidates.push({
          ...base,
          evaluationType: 'learners_path',
        });
      }

      return candidates;
    });
  }

  private toNumber(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private xpToStars(xp: number) {
    return Math.round((xp / STAR_XP) * 100) / 100;
  }

  private appendInterventionNote(
    existingNote: string | null | undefined,
    newNote: string | null | undefined,
  ): string | null {
    const normalizedExisting = existingNote?.trim() ?? '';
    const normalizedNew = newNote?.trim() ?? '';

    if (!normalizedNew) {
      return normalizedExisting.length > 0 ? normalizedExisting : null;
    }

    if (!normalizedExisting) {
      return normalizedNew;
    }

    return `${normalizedExisting}\n${normalizedNew}`;
  }

  private toPlainTextSnippet(
    content: string | null | undefined,
    maxLength = 140,
  ): string | null {
    if (!content) return null;

    const normalized = content
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    if (!normalized) return null;
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
  }

  private buildGeneratedLessonHref(classId: string, assignmentId: string) {
    return `/dashboard/student/lxp/${classId}/generated-lessons/${assignmentId}`;
  }

  private buildGuidedAssessmentHref(classId: string, assignmentId: string) {
    return `/dashboard/student/lxp/${classId}/guided-assessment/${assignmentId}`;
  }

  private serializeGeneratedLesson(
    lesson:
      | {
          id: string;
          title: string;
          summary: string | null;
          lessonBody: string;
          weakConcepts: unknown;
          sourceLessonIds: unknown;
          sourceReferences: unknown;
          approvalStatus?: string | null;
          approvedAt?: Date | null;
          rejectedAt?: Date | null;
        }
      | null
      | undefined,
  ) {
    if (!lesson) return null;
    const weakConcepts = Array.isArray(lesson.weakConcepts)
      ? lesson.weakConcepts.filter(
          (value): value is string => typeof value === 'string',
        )
      : [];
    const sourceLessonIds = Array.isArray(lesson.sourceLessonIds)
      ? lesson.sourceLessonIds.filter(
          (value): value is string => typeof value === 'string',
        )
      : [];
    const sourceReferences = Array.isArray(lesson.sourceReferences)
      ? lesson.sourceReferences.filter(
          (value): value is Record<string, unknown> =>
            typeof value === 'object' && value !== null,
        )
      : [];
    return {
      id: lesson.id,
      title: lesson.title,
      summary: lesson.summary,
      lessonBody: lesson.lessonBody,
      weakConcepts,
      sourceLessonIds,
      sourceReferences,
      status: lesson.approvalStatus ?? null,
      approvedAt: lesson.approvedAt ?? null,
      rejectedAt: lesson.rejectedAt ?? null,
    };
  }

  private serializeGeneratedGuidedAssessment(
    assessment:
      | {
          id: string;
          title: string;
          description: string | null;
          weakConcepts: unknown;
          sourceAssessmentId: string | null;
          sourceReferences: unknown;
          formativeSummary: string | null;
          questions: unknown;
          approvalStatus?: string | null;
          approvedAt?: Date | null;
          rejectedAt?: Date | null;
        }
      | null
      | undefined,
  ) {
    if (!assessment) return null;
    const weakConcepts = Array.isArray(assessment.weakConcepts)
      ? assessment.weakConcepts.filter(
          (value): value is string => typeof value === 'string',
        )
      : [];
    const sourceReferences = Array.isArray(assessment.sourceReferences)
      ? assessment.sourceReferences.filter(
          (value): value is Record<string, unknown> =>
            typeof value === 'object' && value !== null,
        )
      : [];
    const questions = Array.isArray(assessment.questions)
      ? assessment.questions.filter(
          (value): value is Record<string, unknown> =>
            typeof value === 'object' && value !== null,
        )
      : [];
    return {
      id: assessment.id,
      title: assessment.title,
      description: assessment.description,
      weakConcepts,
      sourceAssessmentId: assessment.sourceAssessmentId,
      sourceReferences,
      formativeSummary: assessment.formativeSummary,
      questions,
      status: assessment.approvalStatus ?? null,
      approvedAt: assessment.approvedAt ?? null,
      rejectedAt: assessment.rejectedAt ?? null,
    };
  }

  private toDate(value: Date | string | null | undefined): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private isNewerScore(
    candidate: TeacherPathScore,
    current: TeacherPathScore | undefined,
  ) {
    if (!current) return true;
    const candidateTime = this.toDate(candidate.submittedAt)?.getTime() ?? 0;
    const currentTime = this.toDate(current.submittedAt)?.getTime() ?? 0;
    return candidateTime > currentTime;
  }

  private serializeTeacherPathScore(
    score: TeacherPathScore | null | undefined,
  ) {
    if (!score) return null;
    return {
      source: score.source,
      assignmentId: score.assignmentId,
      attemptId: score.attemptId,
      scorePercent: score.scorePercent,
      correctCount: score.correctCount ?? null,
      totalQuestions: score.totalQuestions ?? null,
      passed: score.passed ?? null,
      submittedAt: score.submittedAt,
    };
  }

  private serializeTeacherInterventionAssignment(
    row: any,
    score: TeacherPathScore | null | undefined,
  ) {
    return {
      id: row.id,
      type: row.assignmentType,
      label: row.checkpointLabel,
      order: row.orderIndex,
      isCompleted: row.isCompleted,
      completedAt: row.completedAt,
      xpAwarded: row.xpAwarded,
      lesson: row.lesson ?? null,
      assessment: row.assessment ?? null,
      generatedLesson: this.serializeGeneratedLesson(
        row.generatedRemedialLesson,
      ),
      guidedAssessment: this.serializeGeneratedGuidedAssessment(
        row.generatedGuidedAssessment,
      ),
      score: this.serializeTeacherPathScore(score),
    };
  }

  private async resolveTeacherPathScores(
    cases: TeacherPathScoreCase[],
    assignments: TeacherPathScoreAssignment[],
  ) {
    const caseIds = cases.map((row) => row.id);
    const studentIds = Array.from(new Set(cases.map((row) => row.studentId)));
    const assessmentIds = Array.from(
      new Set(
        assignments
          .filter(
            (row) =>
              row.assignmentType === 'assessment_retry' && row.assessmentId,
          )
          .map((row) => row.assessmentId as string),
      ),
    );
    const caseById = new Map(cases.map((row) => [row.id, row] as const));
    const guidedAssignmentIds = new Set(
      assignments
        .filter((row) => row.assignmentType === 'guided_assessment')
        .map((row) => row.id),
    );

    const retryAssignmentsByAssessmentAndStudent = new Map<
      string,
      TeacherPathScoreAssignment[]
    >();
    for (const assignment of assignments) {
      if (
        assignment.assignmentType !== 'assessment_retry' ||
        !assignment.assessmentId
      ) {
        continue;
      }

      const relatedCase = caseById.get(assignment.caseId);
      if (!relatedCase) continue;
      const key = `${assignment.assessmentId}:${relatedCase.studentId}`;
      const existing = retryAssignmentsByAssessmentAndStudent.get(key) ?? [];
      existing.push(assignment);
      retryAssignmentsByAssessmentAndStudent.set(key, existing);
    }

    const [guidedAttempts, retryAttempts] = await Promise.all([
      caseIds.length > 0
        ? this.db.query.generatedGuidedAssessmentAttempts.findMany({
            where: and(
              inArray(generatedGuidedAssessmentAttempts.caseId, caseIds),
              eq(generatedGuidedAssessmentAttempts.status, 'submitted'),
            ),
            columns: {
              id: true,
              caseId: true,
              assignmentId: true,
              score: true,
              correctCount: true,
              totalQuestions: true,
              submittedAt: true,
            },
            orderBy: [desc(generatedGuidedAssessmentAttempts.submittedAt)],
          })
        : Promise.resolve([]),
      assessmentIds.length > 0 && studentIds.length > 0
        ? this.db.query.assessmentAttempts.findMany({
            where: and(
              inArray(assessmentAttempts.assessmentId, assessmentIds),
              inArray(assessmentAttempts.studentId, studentIds),
              eq(assessmentAttempts.isSubmitted, true),
            ),
            columns: {
              id: true,
              studentId: true,
              assessmentId: true,
              score: true,
              passed: true,
              submittedAt: true,
            },
            orderBy: [desc(assessmentAttempts.submittedAt)],
          })
        : Promise.resolve([]),
    ]);

    const guidedScoreByCase = new Map<string, TeacherPathScore>();
    const retryScoreByCase = new Map<string, TeacherPathScore>();
    const assignmentScores = new Map<string, TeacherPathScore>();

    for (const attempt of guidedAttempts) {
      const scorePercent = this.toNumber(attempt.score);
      if (
        scorePercent === null ||
        !guidedAssignmentIds.has(attempt.assignmentId)
      ) {
        continue;
      }

      const score: TeacherPathScore = {
        source: 'guided_assessment',
        assignmentId: attempt.assignmentId,
        attemptId: attempt.id,
        scorePercent,
        correctCount: attempt.correctCount ?? null,
        totalQuestions: attempt.totalQuestions ?? null,
        submittedAt: attempt.submittedAt ?? null,
      };

      if (
        this.isNewerScore(score, assignmentScores.get(attempt.assignmentId))
      ) {
        assignmentScores.set(attempt.assignmentId, score);
      }
      if (this.isNewerScore(score, guidedScoreByCase.get(attempt.caseId))) {
        guidedScoreByCase.set(attempt.caseId, score);
      }
    }

    for (const attempt of retryAttempts) {
      const scorePercent = this.toNumber(attempt.score);
      if (scorePercent === null) continue;

      const retryAssignments =
        retryAssignmentsByAssessmentAndStudent.get(
          `${attempt.assessmentId}:${attempt.studentId}`,
        ) ?? [];

      for (const assignment of retryAssignments) {
        const score: TeacherPathScore = {
          source: 'assessment_retry',
          assignmentId: assignment.id,
          attemptId: attempt.id,
          scorePercent,
          passed: attempt.passed ?? null,
          submittedAt: attempt.submittedAt ?? null,
        };

        if (this.isNewerScore(score, assignmentScores.get(assignment.id))) {
          assignmentScores.set(assignment.id, score);
        }
        if (this.isNewerScore(score, retryScoreByCase.get(assignment.caseId))) {
          retryScoreByCase.set(assignment.caseId, score);
        }
      }
    }

    const pathScores = new Map<string, TeacherPathScore>();
    for (const row of cases) {
      const guidedScore = guidedScoreByCase.get(row.id);
      const retryScore = retryScoreByCase.get(row.id);
      if (guidedScore) {
        pathScores.set(row.id, guidedScore);
      } else if (retryScore) {
        pathScores.set(row.id, retryScore);
      }
    }

    return { assignmentScores, pathScores };
  }

  private normalizeGuidedResponseAnswer(answer: unknown) {
    if (Array.isArray(answer)) {
      return answer
        .map((item) => (typeof item === 'string' ? item.trim() : String(item)))
        .filter((item) => item.length > 0)
        .sort();
    }

    if (typeof answer === 'string') {
      const normalized = answer.trim();
      return normalized.length > 0 ? normalized : null;
    }

    if (answer === null || answer === undefined) {
      return null;
    }

    const normalized = String(answer).trim();
    return normalized.length > 0 ? normalized : null;
  }

  private evaluateGuidedQuestion(
    question: Record<string, any>,
    rawAnswer: unknown,
  ) {
    const options = Array.isArray(question.options) ? question.options : [];
    const correctOptionIds = options
      .filter((option) => Boolean(option?.isCorrect))
      .map((option) => String(option.id))
      .sort();
    const normalizedAnswer = this.normalizeGuidedResponseAnswer(rawAnswer);
    const questionType = String(question.type ?? '');
    let isCorrect = false;

    if (questionType === 'multiple_select') {
      const selectedIds = Array.isArray(normalizedAnswer)
        ? normalizedAnswer
        : [];
      isCorrect =
        selectedIds.length > 0 &&
        selectedIds.length === correctOptionIds.length &&
        selectedIds.every((value, index) => value === correctOptionIds[index]);
    } else {
      const selectedId = Array.isArray(normalizedAnswer)
        ? (normalizedAnswer[0] ?? null)
        : normalizedAnswer;
      isCorrect = Boolean(
        selectedId &&
        correctOptionIds.length === 1 &&
        selectedId === correctOptionIds[0],
      );
    }

    return {
      normalizedAnswer,
      isCorrect,
    };
  }

  private buildGuidedAssessmentFormativeSummary(input: {
    assessmentTitle: string;
    weakConcepts: string[];
    responses: Array<Record<string, unknown>>;
    hintedQuestionIds: string[];
    correctCount: number;
    totalQuestions: number;
    score: number;
  }) {
    const weakConceptCounts = new Map<
      string,
      { total: number; correct: number }
    >();
    for (const response of input.responses) {
      const concept =
        typeof response.weakConceptTag === 'string'
          ? response.weakConceptTag
          : null;
      if (!concept) continue;
      const current = weakConceptCounts.get(concept) ?? {
        total: 0,
        correct: 0,
      };
      current.total += 1;
      if (response.isCorrect === true) {
        current.correct += 1;
      }
      weakConceptCounts.set(concept, current);
    }

    const improvedConcepts = Array.from(weakConceptCounts.entries())
      .filter(([, value]) => value.correct > 0)
      .map(([concept]) => concept);
    const stillWeakConcepts = Array.from(weakConceptCounts.entries())
      .filter(([, value]) => value.correct < value.total)
      .map(([concept]) => concept);

    return {
      assessmentTitle: input.assessmentTitle,
      weakConcepts: input.weakConcepts,
      hintedQuestionIds: input.hintedQuestionIds,
      score: input.score,
      correctCount: input.correctCount,
      totalQuestions: input.totalQuestions,
      improvedConcepts,
      stillWeakConcepts,
      generatedAt: new Date().toISOString(),
    };
  }

  private async completeInterventionAssignment(input: {
    assignmentId: string;
    studentId: string;
    classId: string;
    xpAwarded: number;
    caseId: string;
    caseNote: string | null;
    auditActorId: string;
    auditSource?: string;
    auditMetadata?: Record<string, unknown>;
  }) {
    const autoCompletedNote = this.appendInterventionNote(
      input.caseNote,
      'Auto-completed after finishing all Learners Path checkpoints.',
    );
    let interventionCompletedByStudent = false;

    await this.db.transaction(async (tx) => {
      const assignmentRow = await tx.query.interventionAssignments.findFirst({
        where: eq(interventionAssignments.id, input.assignmentId),
        columns: { id: true, isCompleted: true },
      });
      if (!assignmentRow) {
        throw new NotFoundException('Checkpoint not found');
      }

      if (!assignmentRow.isCompleted) {
        await tx
          .update(interventionAssignments)
          .set({
            isCompleted: true,
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(interventionAssignments.id, input.assignmentId));
      }

      const progress = await this.getOrCreateProgress(
        input.studentId,
        input.classId,
        tx,
      );
      const now = new Date();
      const lastDate = progress.lastActivityAt
        ? new Date(progress.lastActivityAt)
        : null;
      const dayDiff = lastDate
        ? Math.floor((now.getTime() - lastDate.getTime()) / 86_400_000)
        : null;
      const streakDays =
        dayDiff === null
          ? 1
          : dayDiff === 0
            ? progress.streakDays
            : dayDiff === 1
              ? progress.streakDays + 1
              : 1;

      await tx
        .update(lxpProgress)
        .set({
          xpTotal:
            progress.xpTotal +
            (assignmentRow.isCompleted ? 0 : input.xpAwarded),
          streakDays,
          checkpointsCompleted:
            progress.checkpointsCompleted + (assignmentRow.isCompleted ? 0 : 1),
          lastActivityAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(lxpProgress.studentId, input.studentId),
            eq(lxpProgress.classId, input.classId),
          ),
        );

      const allAssignments = await tx.query.interventionAssignments.findMany({
        where: eq(interventionAssignments.caseId, input.caseId),
        columns: { id: true, isCompleted: true },
      });
      if (
        allAssignments.length > 0 &&
        allAssignments.every((row) =>
          row.id === input.assignmentId ? true : row.isCompleted,
        )
      ) {
        await tx
          .update(interventionCases)
          .set({
            status: 'completed',
            closedAt: now,
            updatedAt: now,
            note: autoCompletedNote,
          })
          .where(eq(interventionCases.id, input.caseId));
        interventionCompletedByStudent = true;
      }
    });

    await this.auditService.log({
      actorId: input.auditActorId,
      action: 'lxp.checkpoint.completed',
      targetType: 'intervention_assignment',
      targetId: input.assignmentId,
      metadata: {
        caseId: input.caseId,
        classId: input.classId,
        source: input.auditSource ?? 'manual',
        ...(input.auditMetadata ?? {}),
      },
    });

    if (interventionCompletedByStudent) {
      const cls = await this.db.query.classes.findFirst({
        where: eq(classes.id, input.classId),
        columns: { teacherId: true, subjectCode: true },
      });

      if (cls?.teacherId) {
        await this.notificationsService.createBulk([
          {
            userId: cls.teacherId,
            type: 'grade_updated',
            title: 'Intervention cycle completed',
            body: `A student has completed all Learners Path checkpoints in ${cls.subjectCode ?? 'this class'}.`,
          },
        ]);
      }

      await this.auditService.log({
        actorId: input.auditActorId,
        action: 'lxp.intervention.completed_by_student',
        targetType: 'intervention_case',
        targetId: input.caseId,
        metadata: {
          classId: input.classId,
          studentId: input.studentId,
          note: autoCompletedNote,
          source: input.auditSource ?? 'manual',
          ...(input.auditMetadata ?? {}),
        },
      });
    }

    return {
      interventionCompletedByStudent,
      autoCompletedNote,
    };
  }

  private getStatusSummary(input: {
    caseStatus?: string | null;
    isAtRisk: boolean;
    progressPercent: number;
    streakDays: number;
    masteryPercent: number | null;
  }) {
    if (
      input.caseStatus === 'completed' ||
      (!input.isAtRisk &&
        input.masteryPercent !== null &&
        input.masteryPercent >= INTERVENTION_THRESHOLD)
    ) {
      return {
        code: 'on_track',
        label: 'On Track',
        message:
          'You are closing the gap well. Keep building consistency to stay above the intervention threshold.',
      };
    }

    if (input.progressPercent >= 50 || input.streakDays >= 2) {
      return {
        code: 'improving',
        label: 'Improving',
        message:
          'Your recovery work is moving in the right direction. Focus on the next checkpoint to keep momentum.',
      };
    }

    return {
      code: 'needs_attention',
      label: 'Needs Attention',
      message:
        'Start with the next guided checkpoint so you can rebuild mastery without taking on everything at once.',
    };
  }

  private async assertTeacherClassAccess(classId: string, user: UserContext) {
    const cls = await this.db.query.classes.findFirst({
      where: eq(classes.id, classId),
      columns: { id: true, teacherId: true },
    });
    if (!cls) throw new NotFoundException(`Class "${classId}" not found`);
    if (!this.isAdmin(user.roles) && cls.teacherId !== user.userId) {
      throw new ForbiddenException('Access denied');
    }
  }

  private async assertStudentEnrollment(studentId: string, classId: string) {
    const enrollment = await this.db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.classId, classId),
        eq(enrollments.status, 'enrolled'),
      ),
      columns: { id: true },
    });
    if (!enrollment) {
      throw new ForbiddenException('Student is not enrolled in this class');
    }
  }

  private async getOrCreateProgress(
    studentId: string,
    classId: string,
    conn: any = this.db,
  ) {
    const existing = await conn.query.lxpProgress.findFirst({
      where: and(
        eq(lxpProgress.studentId, studentId),
        eq(lxpProgress.classId, classId),
      ),
    });

    if (existing) return existing;

    const [created] = await conn
      .insert(lxpProgress)
      .values({ studentId, classId })
      .returning();
    return created;
  }

  private async getProgressSnapshot(
    studentId: string,
    classId: string,
    conn: any = this.db,
  ) {
    const existing = await conn.query.lxpProgress.findFirst({
      where: and(
        eq(lxpProgress.studentId, studentId),
        eq(lxpProgress.classId, classId),
      ),
    });

    return (
      existing ?? {
        studentId,
        classId,
        xpTotal: 0,
        streakDays: 0,
        checkpointsCompleted: 0,
        lastActivityAt: null,
      }
    );
  }

  private async getStudentInterventionCaseByStatus(
    studentId: string,
    classId: string,
    status: 'active' | 'completed' | 'pending',
  ) {
    const row = await this.db.query.interventionCases.findFirst({
      where: and(
        eq(interventionCases.studentId, studentId),
        eq(interventionCases.classId, classId),
        eq(interventionCases.status, status),
      ),
      orderBy: [desc(interventionCases.createdAt)],
    });

    return row?.status === status ? row : null;
  }

  private async getReadableStudentInterventionCase(
    studentId: string,
    classId: string,
  ) {
    const activeCase = await this.getStudentInterventionCaseByStatus(
      studentId,
      classId,
      'active',
    );
    if (activeCase && (await this.caseHasAssignments(activeCase.id))) {
      return activeCase;
    }

    const completedCase = await this.getStudentInterventionCaseByStatus(
      studentId,
      classId,
      'completed',
    );
    if (completedCase && (await this.caseHasAssignments(completedCase.id))) {
      return completedCase;
    }

    return null;
  }

  private async caseHasAssignments(caseId: string) {
    const assignment = await this.db.query.interventionAssignments.findFirst({
      where: eq(interventionAssignments.caseId, caseId),
      columns: { id: true },
    });

    return Boolean(assignment?.id);
  }

  private async getOrCreateCaseForStudent(
    studentId: string,
    classId: string,
    triggerSource: string,
  ) {
    const existing = await this.db.query.interventionCases.findFirst({
      where: and(
        eq(interventionCases.studentId, studentId),
        eq(interventionCases.classId, classId),
        or(
          eq(interventionCases.status, 'pending'),
          eq(interventionCases.status, 'active'),
        ),
      ),
      orderBy: [desc(interventionCases.createdAt)],
    });
    if (existing) return existing;

    const snapshot = await this.db.query.performanceSnapshots.findFirst({
      where: and(
        eq(performanceSnapshots.studentId, studentId),
        eq(performanceSnapshots.classId, classId),
      ),
      columns: {
        blendedScore: true,
        thresholdApplied: true,
      },
    });

    const [created] = await this.db
      .insert(interventionCases)
      .values({
        studentId,
        classId,
        status: 'pending',
        triggerSource,
        triggerScore: snapshot?.blendedScore ?? null,
        thresholdApplied:
          snapshot?.thresholdApplied?.toString() ??
          INTERVENTION_THRESHOLD.toString(),
      })
      .returning();

    return created;
  }

  private async ensureDefaultAssignments(
    caseId: string,
    classId: string,
    studentId: string,
  ) {
    const existingAssignments =
      await this.db.query.interventionAssignments.findMany({
        where: eq(interventionAssignments.caseId, caseId),
        columns: { id: true },
        limit: 1,
      });
    if (existingAssignments.length > 0) return;

    const latestLessons = await this.db.query.lessons.findMany({
      where: and(eq(lessons.classId, classId), eq(lessons.isDraft, false)),
      columns: { id: true, title: true, order: true },
      orderBy: [desc(lessons.order)],
      limit: 3,
    });

    const weakAttempts = await this.db
      .select({
        assessmentId: assessmentAttempts.assessmentId,
        score: assessmentAttempts.score,
        submittedAt: assessmentAttempts.submittedAt,
      })
      .from(assessmentAttempts)
      .innerJoin(
        assessments,
        eq(assessments.id, assessmentAttempts.assessmentId),
      )
      .where(
        and(
          eq(assessmentAttempts.studentId, studentId),
          eq(assessmentAttempts.isSubmitted, true),
          eq(assessmentAttempts.passed, false),
          eq(assessments.classId, classId),
          eq(assessments.isPublished, true),
        ),
      )
      .orderBy(
        asc(assessmentAttempts.score),
        desc(assessmentAttempts.submittedAt),
      )
      .limit(3);

    const payload: (typeof interventionAssignments.$inferInsert)[] = [];
    let order = 1;
    latestLessons.forEach((lesson) => {
      payload.push({
        caseId,
        assignmentType: 'lesson_review',
        lessonId: lesson.id,
        checkpointLabel: `Review: ${lesson.title}`,
        orderIndex: order++,
        xpAwarded: LESSON_XP,
      });
    });

    const weakAssessmentIds = weakAttempts
      .map((attempt) => attempt.assessmentId)
      .filter((id): id is string => Boolean(id));
    const weakAssessments =
      weakAssessmentIds.length > 0
        ? await this.db.query.assessments.findMany({
            where: and(
              eq(assessments.classId, classId),
              inArray(assessments.id, weakAssessmentIds),
              eq(assessments.isPublished, true),
            ),
            columns: { id: true, title: true, createdAt: true },
            orderBy: [desc(assessments.createdAt)],
            limit: 2,
          })
        : [];

    weakAssessments.forEach((assessment) => {
      payload.push({
        caseId,
        assignmentType: 'assessment_retry',
        assessmentId: assessment.id,
        checkpointLabel: `Retry: ${assessment.title}`,
        orderIndex: order++,
        xpAwarded: ASSESSMENT_XP,
      });
    });

    if (payload.length > 0) {
      await this.db.insert(interventionAssignments).values(payload);
    }
  }

  private async createAndEmitNotifications(
    inputs: CreateNotificationInput[],
    options: { dedupe?: boolean } = {},
  ) {
    const shouldDedupe = options.dedupe ?? true;
    const createdInputs = shouldDedupe
      ? await this.notificationsService.createBulkDeduped(inputs)
      : inputs;

    if (!shouldDedupe) {
      await this.notificationsService.createBulk(inputs);
    }
    const createdAt = new Date();

    createdInputs.forEach((input, index) => {
      this.notificationsGateway.emitToUser(input.userId, {
        id: input.referenceId
          ? `${input.type}:${input.referenceId}:${input.userId}`
          : `${input.type}:${input.userId}:${createdAt.getTime()}:${index}`,
        type: input.type,
        title: input.title,
        body: input.body,
        referenceId: input.referenceId,
        createdAt,
      });
    });
  }

  private async notifyInterventionPending(
    studentId: string,
    classId: string,
    caseId: string,
    event?: Pick<
      PerformanceStatusChangedEvent,
      'blendedScore' | 'thresholdApplied'
    >,
  ) {
    const [cls, student] = await Promise.all([
      this.db.query.classes.findFirst({
        where: eq(classes.id, classId),
        columns: { teacherId: true, subjectName: true, subjectCode: true },
      }),
      this.db.query.users.findFirst({
        where: eq(users.id, studentId),
        columns: { firstName: true, lastName: true },
      }),
    ]);
    if (!cls) return;

    const subjectLabel =
      cls.subjectCode || cls.subjectName || 'the enrolled class';
    const studentName =
      [student?.firstName, student?.lastName].filter(Boolean).join(' ') ||
      'A student';
    const scoreText =
      typeof event?.blendedScore === 'number'
        ? ` Current score: ${event.blendedScore.toFixed(1)}%, threshold: ${
            event.thresholdApplied
          }%.`
        : '';

    const notifications: CreateNotificationInput[] = [
      {
        userId: studentId,
        type: 'grade_updated',
        referenceId: caseId,
        title: 'Intervention warning: grades at risk',
        body: `Your performance in ${subjectLabel} is at risk for intervention. Open Learners Path to view the support plan.${scoreText}`,
      },
    ];
    if (cls.teacherId) {
      notifications.push({
        userId: cls.teacherId,
        type: 'grade_updated',
        referenceId: caseId,
        title: 'Student flagged for intervention',
        body: `${studentName} is at risk and pending intervention review in ${subjectLabel}.${scoreText}`,
      });
    }

    if (notifications.length > 0) {
      await this.createAndEmitNotifications(notifications);
    }
  }

  async handlePerformanceStatusChanged(event: PerformanceStatusChangedEvent) {
    const cls = await this.db.query.classes.findFirst({
      where: eq(classes.id, event.classId),
      columns: { id: true, teacherId: true },
    });
    const auditActorId = cls?.teacherId ?? null;

    if (event.currentIsAtRisk) {
      const interventionCase = await this.getOrCreateCaseForStudent(
        event.studentId,
        event.classId,
        'performance_status_changed',
      );

      await this.notifyInterventionPending(
        event.studentId,
        event.classId,
        interventionCase.id,
        event,
      );

      if (auditActorId) {
        await this.auditService.log({
          actorId: auditActorId,
          action: 'lxp.intervention.pending_created',
          targetType: 'intervention_case',
          targetId: interventionCase.id,
          metadata: {
            classId: event.classId,
            studentId: event.studentId,
            triggerSource: 'performance_status_changed',
            previousIsAtRisk: event.previousIsAtRisk,
            currentIsAtRisk: event.currentIsAtRisk,
            blendedScore: event.blendedScore,
            thresholdApplied: event.thresholdApplied,
          },
        });
      }
      return;
    }

    const openCases = await this.db.query.interventionCases.findMany({
      where: and(
        eq(interventionCases.studentId, event.studentId),
        eq(interventionCases.classId, event.classId),
        inArray(interventionCases.status, ['pending', 'active']),
      ),
      columns: { id: true, note: true, status: true },
    });

    if (openCases.length === 0) {
      return;
    }

    const autoResolveNote =
      'Auto-resolved because student is no longer at-risk.';

    for (const openCase of openCases) {
      const resolvedNote = this.appendInterventionNote(
        openCase.note,
        autoResolveNote,
      );
      await this.db
        .update(interventionCases)
        .set({
          status: 'completed',
          closedAt: new Date(),
          updatedAt: new Date(),
          note: resolvedNote,
        })
        .where(eq(interventionCases.id, openCase.id));

      if (auditActorId) {
        await this.auditService.log({
          actorId: auditActorId,
          action: 'lxp.intervention.auto_resolved',
          targetType: 'intervention_case',
          targetId: openCase.id,
          metadata: {
            classId: event.classId,
            studentId: event.studentId,
            previousCaseStatus: openCase.status,
            previousIsAtRisk: event.previousIsAtRisk,
            currentIsAtRisk: event.currentIsAtRisk,
            blendedScore: event.blendedScore,
            thresholdApplied: event.thresholdApplied,
            note: resolvedNote,
          },
        });
      }
    }
  }

  async getStudentEligibility(userId: string) {
    const studentEnrollments = await this.db.query.enrollments.findMany({
      where: and(
        eq(enrollments.studentId, userId),
        eq(enrollments.status, 'enrolled'),
      ),
      columns: { classId: true },
      with: {
        class: {
          columns: {
            id: true,
            subjectName: true,
            subjectCode: true,
          },
          with: {
            section: {
              columns: {
                id: true,
                name: true,
                gradeLevel: true,
              },
            },
          },
        },
      },
    });

    const classIds = studentEnrollments
      .map((entry) => entry.classId)
      .filter((id): id is string => !!id);

    if (classIds.length === 0) {
      return {
        threshold: INTERVENTION_THRESHOLD,
        eligibleClasses: [],
        paths: [],
      };
    }

    const snapshots = await this.db.query.performanceSnapshots.findMany({
      where: and(
        eq(performanceSnapshots.studentId, userId),
        inArray(performanceSnapshots.classId, classIds),
      ),
      columns: {
        classId: true,
        isAtRisk: true,
        blendedScore: true,
        thresholdApplied: true,
      },
    });

    const pathCases = (
      await this.db.query.interventionCases.findMany({
        where: and(
          eq(interventionCases.studentId, userId),
          inArray(interventionCases.classId, classIds),
          inArray(interventionCases.status, ['active', 'completed']),
        ),
        columns: {
          classId: true,
          id: true,
          status: true,
          openedAt: true,
          closedAt: true,
        },
      })
    ).filter((row) => row.status === 'active' || row.status === 'completed');

    const sortedPathCases = [...pathCases].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
      const aTime = a.openedAt ? new Date(a.openedAt).getTime() : 0;
      const bTime = b.openedAt ? new Date(b.openedAt).getTime() : 0;
      return bTime - aTime;
    });

    const caseByClass = new Map<string, (typeof sortedPathCases)[number]>();
    for (const row of sortedPathCases) {
      if (!caseByClass.has(row.classId)) {
        caseByClass.set(row.classId, row);
      }
    }

    const selectedCases = Array.from(caseByClass.values());
    const caseIds = selectedCases.map((row) => row.id);
    const assignments =
      caseIds.length > 0
        ? await this.db.query.interventionAssignments.findMany({
            where: inArray(interventionAssignments.caseId, caseIds),
            columns: {
              caseId: true,
              assignmentType: true,
              isCompleted: true,
            },
          })
        : [];

    const assignmentsByCase = new Map<string, typeof assignments>();
    for (const assignment of assignments) {
      const current = assignmentsByCase.get(assignment.caseId) ?? [];
      current.push(assignment);
      assignmentsByCase.set(assignment.caseId, current);
    }

    const snapshotByClass = new Map(snapshots.map((row) => [row.classId, row]));

    const paths = selectedCases
      .map((entry) => {
        const enrollment = studentEnrollments.find(
          (row) => row.classId === entry.classId,
        );
        if (!enrollment?.class) return null;
        const snapshot = snapshotByClass.get(entry.classId);
        const caseAssignments = assignmentsByCase.get(entry.id) ?? [];
        if (caseAssignments.length === 0) return null;
        const total = caseAssignments.length;
        const completed = caseAssignments.filter(
          (item) => item.isCompleted,
        ).length;
        const completionPercent =
          total > 0
            ? Math.round((completed / total) * 100)
            : entry.status === 'completed'
              ? 100
              : 0;
        const steps = caseAssignments.filter(
          (item) =>
            item.assignmentType === 'lesson_review' ||
            item.assignmentType === 'generated_lesson_review',
        ).length;
        const replays = caseAssignments.filter(
          (item) =>
            item.assignmentType === 'assessment_retry' ||
            item.assignmentType === 'guided_assessment',
        ).length;

        return {
          classId: entry.classId,
          class: enrollment.class,
          interventionCaseId: entry.id,
          status: entry.status,
          isAtRisk: snapshot?.isAtRisk ?? true,
          blendedScore: this.toNumber(snapshot?.blendedScore),
          thresholdApplied:
            this.toNumber(snapshot?.thresholdApplied) ?? INTERVENTION_THRESHOLD,
          openedAt: entry.openedAt ?? null,
          closedAt: entry.closedAt ?? null,
          counts: {
            steps,
            replays,
            pending: Math.max(total - completed, 0),
            total,
            completed,
          },
          progress: {
            totalCheckpoints: total,
            completedCheckpoints: completed,
            completionPercent,
          },
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    const eligibleClasses = paths
      .filter((entry) => entry.status === 'active')
      .map((entry) => ({
        classId: entry.classId,
        class: entry.class,
        interventionCaseId: entry.interventionCaseId,
        isAtRisk: entry.isAtRisk,
        blendedScore: entry.blendedScore,
        thresholdApplied: entry.thresholdApplied,
        openedAt: entry.openedAt,
      }));

    return {
      threshold: INTERVENTION_THRESHOLD,
      eligibleClasses,
      paths,
    };
  }

  async getStudentInterventionAlerts(userId: string) {
    const studentEnrollments = await this.db.query.enrollments.findMany({
      where: and(
        eq(enrollments.studentId, userId),
        eq(enrollments.status, 'enrolled'),
      ),
      columns: { classId: true },
      with: {
        class: {
          columns: {
            id: true,
            subjectName: true,
            subjectCode: true,
          },
          with: {
            section: {
              columns: {
                id: true,
                name: true,
                gradeLevel: true,
              },
            },
          },
        },
      },
    });

    const enrolledClasses = studentEnrollments
      .filter((entry) => entry.classId && entry.class)
      .map((entry) => ({
        classId: entry.classId as string,
        class: entry.class!,
      }));

    const classIds = enrolledClasses.map((entry) => entry.classId);
    if (classIds.length === 0) {
      return { alerts: [], count: 0 };
    }

    const cases = await this.db.query.interventionCases.findMany({
      where: and(
        eq(interventionCases.studentId, userId),
        inArray(interventionCases.classId, classIds),
        inArray(interventionCases.status, ['pending', 'active']),
      ),
      columns: {
        id: true,
        classId: true,
        status: true,
        triggerScore: true,
        thresholdApplied: true,
        openedAt: true,
      },
      orderBy: [desc(interventionCases.openedAt)],
    });

    if (cases.length === 0) {
      return { alerts: [], count: 0 };
    }

    const caseIds = cases.map((entry) => entry.id);
    const assignments = await this.db.query.interventionAssignments.findMany({
      where: inArray(interventionAssignments.caseId, caseIds),
      columns: { caseId: true },
    });
    const assignedCaseIds = new Set(assignments.map((entry) => entry.caseId));
    const classById = new Map(
      enrolledClasses.map((entry) => [entry.classId, entry.class]),
    );

    const alerts = cases
      .map((entry) => {
        const classRecord = classById.get(entry.classId);
        if (!classRecord) return null;

        return {
          caseId: entry.id,
          classId: entry.classId,
          status: entry.status,
          subjectName: classRecord.subjectName,
          subjectCode: classRecord.subjectCode,
          section: classRecord.section ?? null,
          triggerScore: this.toNumber(entry.triggerScore),
          thresholdApplied:
            this.toNumber(entry.thresholdApplied) ?? INTERVENTION_THRESHOLD,
          openedAt: entry.openedAt,
          hasAssignedPath: assignedCaseIds.has(entry.id),
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    return {
      alerts,
      count: alerts.length,
    };
  }

  async getStudentPlaylist(studentId: string, classId: string) {
    await this.assertStudentEnrollment(studentId, classId);

    const interventionCase = await this.getReadableStudentInterventionCase(
      studentId,
      classId,
    );

    if (!interventionCase) {
      const pendingCase = await this.getStudentInterventionCaseByStatus(
        studentId,
        classId,
        'pending',
      );
      if (pendingCase) {
        throw new ForbiddenException(
          'Learners Path access is pending teacher approval.',
        );
      }
      const activeCase = await this.getStudentInterventionCaseByStatus(
        studentId,
        classId,
        'active',
      );
      if (activeCase) {
        throw new ForbiddenException(
          'Learners Path is only available after your teacher assigns checkpoints.',
        );
      }
      throw new ForbiddenException(
        'Learners Path is only available for active intervention students.',
      );
    }

    const isCompletedCase = interventionCase.status === 'completed';
    const progress = isCompletedCase
      ? await this.getProgressSnapshot(studentId, classId)
      : await this.getOrCreateProgress(studentId, classId);

    const assignments = await this.db.query.interventionAssignments.findMany({
      where: eq(interventionAssignments.caseId, interventionCase.id),
      with: {
        lesson: {
          columns: { id: true, title: true, description: true, order: true },
        },
        assessment: {
          columns: {
            id: true,
            title: true,
            description: true,
            passingScore: true,
            dueDate: true,
            type: true,
          },
        },
        generatedRemedialLesson: {
          columns: {
            id: true,
            title: true,
            summary: true,
            lessonBody: true,
            weakConcepts: true,
            sourceLessonIds: true,
            sourceReferences: true,
            approvalStatus: true,
            approvedAt: true,
            rejectedAt: true,
          },
        },
        generatedGuidedAssessment: {
          columns: {
            id: true,
            title: true,
            description: true,
            weakConcepts: true,
            sourceAssessmentId: true,
            sourceReferences: true,
            formativeSummary: true,
            questions: true,
            approvalStatus: true,
            approvedAt: true,
            rejectedAt: true,
          },
        },
      },
      orderBy: [asc(interventionAssignments.orderIndex)],
    });

    const total = assignments.length;
    const completed = assignments.filter((item) => item.isCompleted).length;

    return {
      interventionCase: {
        id: interventionCase.id,
        status: interventionCase.status,
        openedAt: interventionCase.openedAt,
        closedAt: interventionCase.closedAt ?? null,
        thresholdApplied:
          this.toNumber(interventionCase.thresholdApplied) ??
          INTERVENTION_THRESHOLD,
        triggerScore: this.toNumber(interventionCase.triggerScore),
      },
      progress: {
        xpTotal: progress.xpTotal,
        starsTotal: this.xpToStars(progress.xpTotal),
        streakDays: progress.streakDays,
        checkpointsCompleted: progress.checkpointsCompleted,
        completionPercent:
          total > 0 ? Math.round((completed / total) * 100) : 0,
      },
      checkpoints: assignments.map((item) => ({
        id: item.id,
        type: item.assignmentType,
        label: item.checkpointLabel,
        order: item.orderIndex,
        isCompleted: item.isCompleted,
        completedAt: item.completedAt,
        xpAwarded: item.xpAwarded,
        lesson: item.lesson,
        assessment: item.assessment,
        generatedLesson: this.serializeGeneratedLesson(
          item.generatedRemedialLesson,
        ),
        guidedAssessment: this.serializeGeneratedGuidedAssessment(
          item.generatedGuidedAssessment,
        ),
      })),
    };
  }

  async getStudentOverview(studentId: string, classId: string) {
    await this.assertStudentEnrollment(studentId, classId);

    const interventionCase = await this.getReadableStudentInterventionCase(
      studentId,
      classId,
    );

    const selectedSnapshot = await this.db.query.performanceSnapshots.findFirst(
      {
        where: and(
          eq(performanceSnapshots.studentId, studentId),
          eq(performanceSnapshots.classId, classId),
        ),
        columns: {
          blendedScore: true,
          thresholdApplied: true,
          isAtRisk: true,
          lastComputedAt: true,
        },
      },
    );

    if (!interventionCase) {
      const pendingCase = await this.getStudentInterventionCaseByStatus(
        studentId,
        classId,
        'pending',
      );
      if (pendingCase) {
        throw new ForbiddenException(
          'Learners Path access is pending teacher approval.',
        );
      }
      const activeCase = await this.getStudentInterventionCaseByStatus(
        studentId,
        classId,
        'active',
      );
      if (activeCase) {
        throw new ForbiddenException(
          'Learners Path is only available after your teacher assigns checkpoints.',
        );
      }
      throw new ForbiddenException(
        'Learners Path is only available for active intervention students.',
      );
    }

    const isCompletedCase = interventionCase.status === 'completed';
    const progress = isCompletedCase
      ? await this.getProgressSnapshot(studentId, classId)
      : await this.getOrCreateProgress(studentId, classId);

    const [studentEnrollments, assignments] = await Promise.all([
      this.db.query.enrollments.findMany({
        where: and(
          eq(enrollments.studentId, studentId),
          eq(enrollments.status, 'enrolled'),
        ),
        columns: { classId: true },
        with: {
          class: {
            columns: {
              id: true,
              subjectName: true,
              subjectCode: true,
            },
            with: {
              section: {
                columns: {
                  id: true,
                  name: true,
                  gradeLevel: true,
                },
              },
            },
          },
        },
      }),
      this.db.query.interventionAssignments.findMany({
        where: eq(interventionAssignments.caseId, interventionCase.id),
        with: {
          lesson: {
            columns: { id: true, title: true, description: true, order: true },
          },
          assessment: {
            columns: {
              id: true,
              title: true,
              description: true,
              passingScore: true,
              dueDate: true,
              type: true,
            },
          },
          generatedRemedialLesson: {
            columns: {
              id: true,
              title: true,
              summary: true,
              lessonBody: true,
              weakConcepts: true,
              sourceLessonIds: true,
              sourceReferences: true,
              approvalStatus: true,
              approvedAt: true,
              rejectedAt: true,
            },
          },
          generatedGuidedAssessment: {
            columns: {
              id: true,
              title: true,
              description: true,
              weakConcepts: true,
              sourceAssessmentId: true,
              sourceReferences: true,
              formativeSummary: true,
              questions: true,
              approvalStatus: true,
              approvedAt: true,
              rejectedAt: true,
            },
          },
        },
        orderBy: [asc(interventionAssignments.orderIndex)],
      }),
    ]);

    const classIds = studentEnrollments
      .map((entry) => entry.classId)
      .filter((value): value is string => Boolean(value));

    const snapshots =
      classIds.length > 0
        ? await this.db.query.performanceSnapshots.findMany({
            where: and(
              eq(performanceSnapshots.studentId, studentId),
              inArray(performanceSnapshots.classId, classIds),
            ),
            columns: {
              classId: true,
              blendedScore: true,
              thresholdApplied: true,
              isAtRisk: true,
              lastComputedAt: true,
            },
          })
        : [];

    const snapshotByClass = new Map(
      snapshots.map((row) => [row.classId, row] as const),
    );

    const selectedEnrollment =
      studentEnrollments.find((entry) => entry.classId === classId) ?? null;

    const masteryRows = studentEnrollments
      .map((entry) => {
        if (!entry.classId || !entry.class) return null;

        const snapshot = snapshotByClass.get(entry.classId);
        const masteryPercent = this.toNumber(snapshot?.blendedScore);
        const thresholdApplied =
          this.toNumber(snapshot?.thresholdApplied) ?? INTERVENTION_THRESHOLD;
        const status = snapshot?.isAtRisk
          ? 'needs_attention'
          : masteryPercent !== null && masteryPercent >= thresholdApplied
            ? 'on_track'
            : 'improving';

        return {
          classId: entry.classId,
          subjectName: entry.class.subjectName,
          subjectCode: entry.class.subjectCode,
          masteryPercent,
          thresholdApplied,
          status,
          isSelected: entry.classId === classId,
          lastComputedAt: snapshot?.lastComputedAt ?? null,
        };
      })
      .filter(
        (
          row,
        ): row is {
          classId: string;
          subjectName: string;
          subjectCode: string;
          masteryPercent: number | null;
          thresholdApplied: number;
          status: 'needs_attention' | 'on_track' | 'improving';
          isSelected: boolean;
          lastComputedAt: Date | null;
        } => Boolean(row),
      )
      .sort((a, b) => {
        if (a.isSelected !== b.isSelected) return a.isSelected ? -1 : 1;
        const aScore = a.masteryPercent ?? Number.POSITIVE_INFINITY;
        const bScore = b.masteryPercent ?? Number.POSITIVE_INFINITY;
        return aScore - bScore;
      });

    const totalCheckpoints = assignments.length;
    const completedAssignments = assignments.filter(
      (item) => item.isCompleted,
    ).length;
    const completionPercent =
      totalCheckpoints > 0
        ? Math.round((completedAssignments / totalCheckpoints) * 100)
        : 0;

    const recommendedNext =
      assignments.find(
        (item) =>
          !item.isCompleted &&
          item.assignmentType === 'generated_lesson_review',
      ) ??
      assignments.find(
        (item) => !item.isCompleted && item.assignmentType === 'lesson_review',
      ) ??
      assignments.find(
        (item) =>
          !item.isCompleted && item.assignmentType === 'guided_assessment',
      ) ??
      assignments.find(
        (item) =>
          !item.isCompleted && item.assignmentType === 'assessment_retry',
      ) ??
      assignments.find((item) => !item.isCompleted) ??
      null;

    const recommendedAction = recommendedNext
      ? {
          assignmentId: recommendedNext.id,
          type: recommendedNext.assignmentType,
          title:
            recommendedNext.generatedRemedialLesson?.title ??
            recommendedNext.generatedGuidedAssessment?.title ??
            recommendedNext.lesson?.title ??
            recommendedNext.assessment?.title ??
            recommendedNext.checkpointLabel,
          subtitle:
            recommendedNext.assignmentType === 'generated_lesson_review'
              ? 'Start with this AI-guided remedial lesson.'
              : recommendedNext.assignmentType === 'lesson_review'
                ? 'Review this lesson checkpoint next.'
                : recommendedNext.assignmentType === 'guided_assessment'
                  ? 'Take this guided remedial assessment next.'
                  : 'Retry this assessment checkpoint next.',
          xpAwarded: recommendedNext.xpAwarded,
          href:
            recommendedNext.assignmentType === 'generated_lesson_review'
              ? this.buildGeneratedLessonHref(classId, recommendedNext.id)
              : recommendedNext.assignmentType === 'guided_assessment'
                ? this.buildGuidedAssessmentHref(classId, recommendedNext.id)
                : recommendedNext.lesson?.id
                  ? `/dashboard/student/lessons/${recommendedNext.lesson.id}`
                  : recommendedNext.assessment?.id
                    ? `/dashboard/student/assessments/${recommendedNext.assessment.id}`
                    : null,
        }
      : null;

    const upcomingAssessments = assignments
      .filter(
        (item) =>
          !item.isCompleted &&
          (item.assignmentType === 'assessment_retry' ||
            item.assignmentType === 'guided_assessment') &&
          (item.assessment || item.generatedGuidedAssessment),
      )
      .sort((a, b) => {
        const aTime = a.assessment?.dueDate
          ? new Date(a.assessment.dueDate).getTime()
          : Number.POSITIVE_INFINITY;
        const bTime = b.assessment?.dueDate
          ? new Date(b.assessment.dueDate).getTime()
          : Number.POSITIVE_INFINITY;
        return aTime - bTime;
      })
      .slice(0, 4)
      .map((item) => ({
        assignmentId: item.id,
        assessmentId:
          item.generatedGuidedAssessment?.id ?? item.assessment?.id ?? item.id,
        title:
          item.generatedGuidedAssessment?.title ??
          item.assessment?.title ??
          item.checkpointLabel,
        dueDate: item.assessment?.dueDate ?? null,
        type:
          item.assignmentType === 'guided_assessment'
            ? 'guided_assessment'
            : item.assessment!.type,
        passingScore: item.assessment?.passingScore ?? null,
        xpAwarded: item.xpAwarded,
        href:
          item.assignmentType === 'guided_assessment'
            ? this.buildGuidedAssessmentHref(classId, item.id)
            : `/dashboard/student/assessments/${item.assessment!.id}`,
      }));

    const recentActivity = [
      {
        id: `opened-${interventionCase.id}`,
        type: 'intervention_opened',
        title: 'Learners Path unlocked',
        description: selectedEnrollment?.class
          ? `Recovery work opened for ${selectedEnrollment.class.subjectName}.`
          : 'Your intervention support track is now active.',
        occurredAt: interventionCase.openedAt,
      },
      ...assignments
        .filter((item) => item.isCompleted && item.completedAt)
        .sort(
          (a, b) =>
            new Date(b.completedAt ?? 0).getTime() -
            new Date(a.completedAt ?? 0).getTime(),
        )
        .slice(0, 4)
        .map((item) => ({
          id: item.id,
          type: item.assignmentType,
          title: item.checkpointLabel,
          description:
            item.generatedRemedialLesson?.summary ??
            item.generatedGuidedAssessment?.description ??
            item.lesson?.description ??
            item.assessment?.description ??
            'Completed one guided Learners Path checkpoint.',
          occurredAt: item.completedAt,
        })),
    ]
      .filter((entry) => !!entry.occurredAt)
      .sort(
        (a, b) =>
          new Date(b.occurredAt ?? 0).getTime() -
          new Date(a.occurredAt ?? 0).getTime(),
      )
      .slice(0, 5);

    const weakFocusItems = [
      ...masteryRows
        .filter(
          (row) =>
            row.masteryPercent !== null &&
            row.masteryPercent < row.thresholdApplied,
        )
        .slice(0, 3)
        .map((row) => ({
          id: `class-${row.classId}`,
          source: 'performance',
          title: `Boost ${row.subjectName}`,
          subtitle: `Current blended score: ${row.masteryPercent}%`,
          masteryPercent: row.masteryPercent,
          href: `/dashboard/student/ja`,
        })),
      ...assignments
        .filter((item) => !item.isCompleted)
        .slice(0, 3)
        .map((item) => {
          const lessonSummary =
            this.toPlainTextSnippet(item.lesson?.description) ||
            `Review ${item.lesson?.title ?? item.checkpointLabel} to strengthen this weak area.`;
          const dueDate = item.assessment?.dueDate
            ? new Date(item.assessment.dueDate).toISOString().slice(0, 10)
            : null;
          const assessmentSummary =
            this.toPlainTextSnippet(item.assessment?.description) ??
            `Retry this checkpoint${
              item.assessment?.passingScore
                ? ` and target ${item.assessment.passingScore}%.`
                : '.'
            }`;
          const assessmentSubtitle = dueDate
            ? `${assessmentSummary} Due ${dueDate}.`
            : assessmentSummary;

          return {
            id: `checkpoint-${item.id}`,
            source: 'checkpoint',
            title: item.checkpointLabel,
            subtitle:
              item.assignmentType === 'generated_lesson_review'
                ? (item.generatedRemedialLesson?.summary ??
                  'Review this simplified remedial lesson before moving forward.')
                : item.assignmentType === 'lesson_review'
                  ? lessonSummary
                  : item.assignmentType === 'guided_assessment'
                    ? (item.generatedGuidedAssessment?.description ??
                      'Use hints when needed and review explanations after each answer.')
                    : assessmentSubtitle,
            masteryPercent: null,
            href:
              item.assignmentType === 'generated_lesson_review'
                ? this.buildGeneratedLessonHref(classId, item.id)
                : item.assignmentType === 'guided_assessment'
                  ? this.buildGuidedAssessmentHref(classId, item.id)
                  : item.lesson?.id
                    ? `/dashboard/student/lessons/${item.lesson.id}`
                    : item.assessment?.id
                      ? `/dashboard/student/assessments/${item.assessment.id}`
                      : '/dashboard/student/ja',
          };
        }),
    ].slice(0, 4);

    const selectedMastery =
      masteryRows.find((row) => row.classId === classId)?.masteryPercent ??
      null;
    const statusSummary = this.getStatusSummary({
      caseStatus: interventionCase.status,
      isAtRisk: selectedSnapshot?.isAtRisk ?? true,
      progressPercent: completionPercent,
      streakDays: progress.streakDays,
      masteryPercent: selectedMastery,
    });

    return {
      selectedClass: {
        classId,
        subjectName: selectedEnrollment?.class?.subjectName ?? 'Selected class',
        subjectCode: selectedEnrollment?.class?.subjectCode ?? 'Learners Path',
        section: selectedEnrollment?.class?.section ?? null,
        blendedScore: this.toNumber(selectedSnapshot?.blendedScore),
        thresholdApplied:
          this.toNumber(selectedSnapshot?.thresholdApplied) ??
          INTERVENTION_THRESHOLD,
        lastComputedAt: selectedSnapshot?.lastComputedAt ?? null,
      },
      interventionStatus: {
        caseId: interventionCase.id,
        status: interventionCase.status,
        openedAt: interventionCase.openedAt,
        closedAt: interventionCase.closedAt ?? null,
        triggerScore: this.toNumber(interventionCase.triggerScore),
        thresholdApplied:
          this.toNumber(interventionCase.thresholdApplied) ??
          INTERVENTION_THRESHOLD,
        ...statusSummary,
      },
      progress: {
        xpTotal: progress.xpTotal,
        starsTotal: this.xpToStars(progress.xpTotal),
        streakDays: progress.streakDays,
        checkpointsCompleted: progress.checkpointsCompleted,
        totalCheckpoints,
        completionPercent,
        lastActivityAt: progress.lastActivityAt ?? null,
      },
      subjectMastery: masteryRows,
      recommendedAction,
      upcomingAssessments,
      recentActivity,
      weakFocusItems,
    };
  }

  async completeCheckpoint(
    studentId: string,
    classId: string,
    assignmentId: string,
  ) {
    await this.assertStudentEnrollment(studentId, classId);

    const assignment = await this.db.query.interventionAssignments.findFirst({
      where: eq(interventionAssignments.id, assignmentId),
      with: {
        interventionCase: {
          columns: {
            id: true,
            studentId: true,
            classId: true,
            status: true,
            note: true,
          },
        },
      },
    });
    if (!assignment || !assignment.interventionCase) {
      throw new NotFoundException('Checkpoint not found');
    }
    if (assignment.interventionCase.studentId !== studentId) {
      throw new ForbiddenException(
        'Checkpoint does not belong to current student',
      );
    }
    if (assignment.interventionCase.classId !== classId) {
      throw new BadRequestException('Checkpoint does not belong to this class');
    }
    if (assignment.interventionCase.status !== 'active') {
      throw new BadRequestException('Intervention case is no longer active');
    }
    if (assignment.assignmentType === 'assessment_retry') {
      throw new BadRequestException(
        'Assessment retry checkpoints are completed only after finishing the linked JA review session.',
      );
    }
    if (assignment.assignmentType === 'guided_assessment') {
      throw new BadRequestException(
        'Guided assessment checkpoints are completed only after submitting the guided remedial assessment.',
      );
    }

    await this.completeInterventionAssignment({
      assignmentId,
      studentId,
      classId,
      xpAwarded: assignment.xpAwarded,
      caseId: assignment.interventionCase.id,
      caseNote: assignment.interventionCase.note,
      auditActorId: studentId,
    });

    return this.getStudentPlaylist(studentId, classId);
  }

  async completeAssessmentRetryFromJaReview(
    studentId: string,
    classId: string,
    assessmentId: string,
    jaSessionId: string,
  ) {
    await this.assertStudentEnrollment(studentId, classId);

    const candidates = await this.db.query.interventionAssignments.findMany({
      where: and(
        eq(interventionAssignments.assignmentType, 'assessment_retry'),
        eq(interventionAssignments.assessmentId, assessmentId),
      ),
      orderBy: [asc(interventionAssignments.orderIndex)],
      with: {
        interventionCase: {
          columns: {
            id: true,
            studentId: true,
            classId: true,
            status: true,
            note: true,
          },
        },
      },
    });
    const assignment = candidates.find(
      (item) =>
        item.interventionCase?.studentId === studentId &&
        item.interventionCase?.classId === classId,
    );

    if (!assignment || !assignment.interventionCase) {
      return { completed: false, reason: 'checkpoint_not_found' as const };
    }
    if (assignment.interventionCase.status !== 'active') {
      return { completed: false, reason: 'case_inactive' as const };
    }
    if (assignment.isCompleted) {
      return { completed: false, reason: 'already_completed' as const };
    }

    const completionResult = await this.completeInterventionAssignment({
      assignmentId: assignment.id,
      studentId,
      classId,
      xpAwarded: assignment.xpAwarded,
      caseId: assignment.interventionCase.id,
      caseNote: assignment.interventionCase.note,
      auditActorId: studentId,
      auditSource: 'ja_review',
      auditMetadata: { jaSessionId },
    });

    return {
      completed: true,
      assignmentId: assignment.id,
      caseId: assignment.interventionCase.id,
      interventionCompletedByStudent:
        completionResult.interventionCompletedByStudent,
    };
  }

  async approveGeneratedArtifacts(
    caseId: string,
    dto: ApproveGeneratedArtifactsDto,
    user: UserContext,
  ) {
    const interventionCase = await this.db.query.interventionCases.findFirst({
      where: eq(interventionCases.id, caseId),
      columns: {
        id: true,
        classId: true,
        studentId: true,
        status: true,
      },
    });
    if (!interventionCase) {
      throw new NotFoundException('Intervention case not found');
    }
    await this.assertTeacherClassAccess(interventionCase.classId, user);

    const generatedLessonDraft = dto.generatedLessonDraft ?? null;
    const generatedGuidedAssessmentDraft =
      dto.generatedGuidedAssessmentDraft ?? null;

    if (!generatedLessonDraft && !generatedGuidedAssessmentDraft) {
      throw new BadRequestException(
        'Provide at least one generated artifact draft to approve.',
      );
    }

    const approvedAt = new Date();
    const [generatedLesson, guidedAssessment] = await this.db.transaction(
      async (tx) => {
        const approvedLesson = generatedLessonDraft
          ? (
              await tx
                .insert(generatedRemedialLessons)
                .values({
                  caseId,
                  classId: interventionCase.classId,
                  studentId: interventionCase.studentId,
                  title: generatedLessonDraft.title,
                  summary: generatedLessonDraft.summary ?? null,
                  lessonBody: generatedLessonDraft.lessonBody,
                  weakConcepts: generatedLessonDraft.weakConcepts,
                  sourceLessonIds: generatedLessonDraft.sourceLessonIds,
                  sourceReferences: generatedLessonDraft.sourceReferences,
                  approvalStatus: 'approved',
                  approvedBy: user.userId,
                  approvedAt,
                  rejectedAt: null,
                })
                .returning()
            )[0]
          : null;

        const filteredQuestions = (
          generatedGuidedAssessmentDraft?.questions ?? []
        )
          .filter((question) =>
            GUIDED_ASSESSMENT_SUPPORTED_TYPES.has(question.type),
          )
          .map((question) => ({
            id: question.id,
            type: question.type,
            stem: question.stem,
            explanation: question.explanation,
            hint: question.hint ?? null,
            weakConceptTag: question.weakConceptTag ?? null,
            sourceQuestionId: question.sourceQuestionId ?? null,
            options: question.options.map((option) => ({
              id: option.id,
              text: option.text,
              isCorrect: option.isCorrect,
            })),
          }));

        if (
          generatedGuidedAssessmentDraft &&
          filteredQuestions.length !==
            generatedGuidedAssessmentDraft.questions.length
        ) {
          throw new BadRequestException(
            'Guided remedial assessment v1 only supports objective question types.',
          );
        }

        const approvedAssessment = generatedGuidedAssessmentDraft
          ? (
              await tx
                .insert(generatedGuidedAssessments)
                .values({
                  caseId,
                  classId: interventionCase.classId,
                  studentId: interventionCase.studentId,
                  sourceAssessmentId:
                    generatedGuidedAssessmentDraft.sourceAssessmentId ?? null,
                  title: generatedGuidedAssessmentDraft.title,
                  description:
                    generatedGuidedAssessmentDraft.description ?? null,
                  weakConcepts: generatedGuidedAssessmentDraft.weakConcepts,
                  formativeSummary:
                    generatedGuidedAssessmentDraft.formativeSummary ?? null,
                  sourceReferences:
                    generatedGuidedAssessmentDraft.sourceReferences,
                  questions: filteredQuestions,
                  approvalStatus: 'approved',
                  approvedBy: user.userId,
                  approvedAt,
                  rejectedAt: null,
                })
                .returning()
            )[0]
          : null;

        return [approvedLesson, approvedAssessment] as const;
      },
    );

    await this.auditService.log({
      actorId: user.userId,
      action: 'lxp.generated_content.approved',
      targetType: 'intervention_case',
      targetId: caseId,
      metadata: {
        classId: interventionCase.classId,
        studentId: interventionCase.studentId,
        generatedLessonId: generatedLesson?.id ?? null,
        guidedAssessmentId: guidedAssessment?.id ?? null,
      },
    });

    return {
      caseId,
      generatedLesson: this.serializeGeneratedLesson(generatedLesson),
      guidedAssessment:
        this.serializeGeneratedGuidedAssessment(guidedAssessment),
    };
  }

  async rejectGeneratedArtifacts(
    caseId: string,
    dto: ApproveGeneratedArtifactsDto,
    user: UserContext,
  ) {
    const interventionCase = await this.db.query.interventionCases.findFirst({
      where: eq(interventionCases.id, caseId),
      columns: {
        id: true,
        classId: true,
        studentId: true,
      },
    });
    if (!interventionCase) {
      throw new NotFoundException('Intervention case not found');
    }
    await this.assertTeacherClassAccess(interventionCase.classId, user);

    const rejectedAt = new Date();
    const [generatedLesson, guidedAssessment] = await this.db.transaction(
      async (tx) => {
        const rejectedLesson = dto.generatedLessonDraft
          ? (
              await tx
                .insert(generatedRemedialLessons)
                .values({
                  caseId,
                  classId: interventionCase.classId,
                  studentId: interventionCase.studentId,
                  title: dto.generatedLessonDraft.title,
                  summary: dto.generatedLessonDraft.summary ?? null,
                  lessonBody: dto.generatedLessonDraft.lessonBody,
                  weakConcepts: dto.generatedLessonDraft.weakConcepts,
                  sourceLessonIds: dto.generatedLessonDraft.sourceLessonIds,
                  sourceReferences: dto.generatedLessonDraft.sourceReferences,
                  approvalStatus: 'rejected',
                  approvedBy: user.userId,
                  approvedAt: null,
                  rejectedAt,
                })
                .returning()
            )[0]
          : null;

        const rejectedAssessment = dto.generatedGuidedAssessmentDraft
          ? (
              await tx
                .insert(generatedGuidedAssessments)
                .values({
                  caseId,
                  classId: interventionCase.classId,
                  studentId: interventionCase.studentId,
                  sourceAssessmentId:
                    dto.generatedGuidedAssessmentDraft.sourceAssessmentId ??
                    null,
                  title: dto.generatedGuidedAssessmentDraft.title,
                  description:
                    dto.generatedGuidedAssessmentDraft.description ?? null,
                  weakConcepts: dto.generatedGuidedAssessmentDraft.weakConcepts,
                  formativeSummary:
                    dto.generatedGuidedAssessmentDraft.formativeSummary ?? null,
                  sourceReferences:
                    dto.generatedGuidedAssessmentDraft.sourceReferences,
                  questions: dto.generatedGuidedAssessmentDraft.questions ?? [],
                  approvalStatus: 'rejected',
                  approvedBy: user.userId,
                  approvedAt: null,
                  rejectedAt,
                })
                .returning()
            )[0]
          : null;

        return [rejectedLesson, rejectedAssessment] as const;
      },
    );

    await this.auditService.log({
      actorId: user.userId,
      action: 'lxp.generated_content.rejected',
      targetType: 'intervention_case',
      targetId: caseId,
      metadata: {
        classId: interventionCase.classId,
        studentId: interventionCase.studentId,
        generatedLessonId: generatedLesson?.id ?? null,
        guidedAssessmentId: guidedAssessment?.id ?? null,
      },
    });

    return {
      caseId,
      generatedLesson: this.serializeGeneratedLesson(generatedLesson),
      guidedAssessment:
        this.serializeGeneratedGuidedAssessment(guidedAssessment),
    };
  }

  async getGeneratedLesson(
    studentId: string,
    classId: string,
    assignmentId: string,
  ) {
    await this.assertStudentEnrollment(studentId, classId);

    const assignment = await this.db.query.interventionAssignments.findFirst({
      where: eq(interventionAssignments.id, assignmentId),
      with: {
        interventionCase: {
          columns: {
            id: true,
            studentId: true,
            classId: true,
            status: true,
          },
        },
        generatedRemedialLesson: true,
      },
    });

    if (!assignment || !assignment.interventionCase) {
      throw new NotFoundException('Generated lesson checkpoint not found');
    }
    if (assignment.interventionCase.studentId !== studentId) {
      throw new ForbiddenException(
        'Checkpoint does not belong to current student',
      );
    }
    if (assignment.interventionCase.classId !== classId) {
      throw new BadRequestException('Checkpoint does not belong to this class');
    }
    if (assignment.assignmentType !== 'generated_lesson_review') {
      throw new BadRequestException(
        'Checkpoint is not a generated remedial lesson',
      );
    }
    if (!assignment.generatedRemedialLesson) {
      throw new NotFoundException('Generated remedial lesson is missing');
    }

    return {
      assignmentId: assignment.id,
      caseId: assignment.interventionCase.id,
      status: assignment.interventionCase.status,
      checkpointLabel: assignment.checkpointLabel,
      generatedLesson: this.serializeGeneratedLesson(
        assignment.generatedRemedialLesson,
      ),
    };
  }

  async startGuidedAssessment(
    studentId: string,
    classId: string,
    assignmentId: string,
  ) {
    await this.assertStudentEnrollment(studentId, classId);

    const assignment = await this.db.query.interventionAssignments.findFirst({
      where: eq(interventionAssignments.id, assignmentId),
      with: {
        interventionCase: {
          columns: {
            id: true,
            studentId: true,
            classId: true,
            status: true,
            note: true,
          },
        },
        generatedGuidedAssessment: true,
      },
    });
    if (!assignment || !assignment.interventionCase) {
      throw new NotFoundException('Guided assessment checkpoint not found');
    }
    if (assignment.interventionCase.studentId !== studentId) {
      throw new ForbiddenException(
        'Checkpoint does not belong to current student',
      );
    }
    if (assignment.interventionCase.classId !== classId) {
      throw new BadRequestException('Checkpoint does not belong to this class');
    }
    if (assignment.assignmentType !== 'guided_assessment') {
      throw new BadRequestException('Checkpoint is not a guided assessment');
    }
    if (!assignment.generatedGuidedAssessment) {
      throw new NotFoundException('Generated guided assessment is missing');
    }

    const existingAttempt =
      await this.db.query.generatedGuidedAssessmentAttempts.findFirst({
        where: and(
          eq(generatedGuidedAssessmentAttempts.assignmentId, assignment.id),
          eq(generatedGuidedAssessmentAttempts.studentId, studentId),
        ),
        orderBy: [desc(generatedGuidedAssessmentAttempts.updatedAt)],
      });

    const attempt =
      existingAttempt ??
      (
        await this.db
          .insert(generatedGuidedAssessmentAttempts)
          .values({
            guidedAssessmentId: assignment.generatedGuidedAssessment.id,
            assignmentId: assignment.id,
            caseId: assignment.interventionCase.id,
            classId,
            studentId,
            responses: [],
            hintUsage: [],
            currentQuestionIndex: 0,
            status: 'in_progress',
          })
          .returning()
      )[0];

    return {
      assignmentId: assignment.id,
      checkpointLabel: assignment.checkpointLabel,
      guidedAssessment: this.serializeGeneratedGuidedAssessment(
        assignment.generatedGuidedAssessment,
      ),
      attempt: {
        id: attempt.id,
        status: attempt.status,
        currentQuestionIndex: attempt.currentQuestionIndex ?? 0,
        responses: attempt.responses ?? [],
        hintedQuestionIds: attempt.hintUsage ?? [],
        scorePercent: attempt.score ?? null,
        submittedAt: attempt.submittedAt ?? null,
      },
    };
  }

  async updateGuidedAssessmentProgress(
    studentId: string,
    classId: string,
    assignmentId: string,
    dto: UpdateGuidedAssessmentProgressDto,
  ) {
    const session = await this.startGuidedAssessment(
      studentId,
      classId,
      assignmentId,
    );
    if (session.attempt.status === 'submitted') {
      throw new BadRequestException(
        'This guided remedial assessment has already been submitted.',
      );
    }
    const assessmentQuestions = session.guidedAssessment?.questions ?? [];
    const existingResponses = Array.isArray(session.attempt.responses)
      ? session.attempt.responses
      : [];
    const existingHintedQuestionIds = Array.isArray(
      session.attempt.hintedQuestionIds,
    )
      ? session.attempt.hintedQuestionIds.filter(
          (value): value is string => typeof value === 'string',
        )
      : [];
    const maxIndex =
      assessmentQuestions.length > 0 ? assessmentQuestions.length - 1 : 0;
    const currentQuestionIndex =
      dto.currentQuestionIndex === undefined
        ? session.attempt.currentQuestionIndex
        : Math.max(0, Math.min(dto.currentQuestionIndex, maxIndex));

    const normalizedResponses = (dto.responses ?? existingResponses).map(
      (response) => {
        const matchingQuestion = assessmentQuestions.find(
          (question: any) => question.id === response.questionId,
        ) as Record<string, any> | undefined;
        const evaluation = matchingQuestion
          ? this.evaluateGuidedQuestion(matchingQuestion, response.answer)
          : { normalizedAnswer: response.answer ?? null, isCorrect: undefined };
        return {
          questionId: response.questionId,
          answer: evaluation.normalizedAnswer,
          isCorrect: evaluation.isCorrect,
          explanationShown: response.explanationShown ?? false,
          weakConceptTag:
            typeof matchingQuestion?.weakConceptTag === 'string'
              ? matchingQuestion.weakConceptTag
              : null,
        };
      },
    );
    const hintedQuestionIds = Array.from(
      new Set(dto.hintedQuestionIds ?? existingHintedQuestionIds),
    );

    const [updatedAttempt] = await this.db
      .update(generatedGuidedAssessmentAttempts)
      .set({
        currentQuestionIndex,
        responses: normalizedResponses,
        hintUsage: hintedQuestionIds,
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(generatedGuidedAssessmentAttempts.id, session.attempt.id))
      .returning();

    return {
      assignmentId,
      attempt: {
        id: updatedAttempt.id,
        status: updatedAttempt.status,
        currentQuestionIndex: updatedAttempt.currentQuestionIndex ?? 0,
        responses: updatedAttempt.responses ?? [],
        hintedQuestionIds: updatedAttempt.hintUsage ?? [],
        scorePercent: updatedAttempt.score ?? null,
        submittedAt: updatedAttempt.submittedAt ?? null,
      },
    };
  }

  async submitGuidedAssessment(
    studentId: string,
    classId: string,
    assignmentId: string,
    dto: SubmitGuidedAssessmentDto,
  ) {
    const session = await this.startGuidedAssessment(
      studentId,
      classId,
      assignmentId,
    );
    if (session.attempt.status === 'submitted') {
      throw new BadRequestException(
        'This guided remedial assessment has already been submitted.',
      );
    }
    const assignment = await this.db.query.interventionAssignments.findFirst({
      where: eq(interventionAssignments.id, assignmentId),
      with: {
        interventionCase: {
          columns: {
            id: true,
            studentId: true,
            classId: true,
            status: true,
            note: true,
          },
        },
        generatedGuidedAssessment: true,
      },
    });
    if (
      !assignment?.interventionCase ||
      !assignment.generatedGuidedAssessment
    ) {
      throw new NotFoundException('Guided assessment checkpoint not found');
    }

    const questionPayload = Array.isArray(
      assignment.generatedGuidedAssessment.questions,
    )
      ? assignment.generatedGuidedAssessment.questions
      : [];
    const normalizedResponses = dto.responses.map((response) => {
      const question = questionPayload.find(
        (item: any) => item.id === response.questionId,
      ) as Record<string, any> | undefined;
      const evaluation = question
        ? this.evaluateGuidedQuestion(question, response.answer)
        : { normalizedAnswer: response.answer ?? null, isCorrect: false };
      return {
        questionId: response.questionId,
        answer: evaluation.normalizedAnswer,
        isCorrect: evaluation.isCorrect,
        explanationShown: true,
        weakConceptTag:
          typeof question?.weakConceptTag === 'string'
            ? question.weakConceptTag
            : null,
      };
    });

    const correctCount = normalizedResponses.filter(
      (response) => response.isCorrect === true,
    ).length;
    const totalQuestions = questionPayload.length;
    const scorePercent =
      totalQuestions > 0
        ? Math.round((correctCount / totalQuestions) * 100)
        : 0;
    const assessmentWeakConcepts = Array.isArray(
      assignment.generatedGuidedAssessment.weakConcepts,
    )
      ? assignment.generatedGuidedAssessment.weakConcepts.filter(
          (value): value is string => typeof value === 'string',
        )
      : [];
    const formativeSummary = this.buildGuidedAssessmentFormativeSummary({
      assessmentTitle: assignment.generatedGuidedAssessment.title,
      weakConcepts: assessmentWeakConcepts,
      responses: normalizedResponses,
      hintedQuestionIds: dto.hintedQuestionIds,
      correctCount,
      totalQuestions,
      score: scorePercent,
    });

    const [updatedAttempt] = await this.db
      .update(generatedGuidedAssessmentAttempts)
      .set({
        responses: normalizedResponses,
        hintUsage: dto.hintedQuestionIds,
        status: 'submitted',
        score: scorePercent,
        totalQuestions,
        correctCount,
        submittedAt: new Date(),
        lastActivityAt: new Date(),
        formativeSummary,
        updatedAt: new Date(),
      })
      .where(eq(generatedGuidedAssessmentAttempts.id, session.attempt.id))
      .returning();

    const completionResult = await this.completeInterventionAssignment({
      assignmentId,
      studentId,
      classId,
      xpAwarded: assignment.xpAwarded,
      caseId: assignment.interventionCase.id,
      caseNote: assignment.interventionCase.note,
      auditActorId: studentId,
      auditSource: 'guided_assessment',
      auditMetadata: {
        guidedAssessmentAttemptId: updatedAttempt.id,
        scorePercent,
      },
    });

    return {
      assignmentId,
      attemptId: updatedAttempt.id,
      scorePercent,
      correctCount,
      totalQuestions,
      formativeSummary,
      interventionCompletedByStudent:
        completionResult.interventionCompletedByStudent,
    };
  }

  async getGuidedAssessmentResult(
    studentId: string,
    classId: string,
    assignmentId: string,
  ) {
    await this.assertStudentEnrollment(studentId, classId);

    const assignment = await this.db.query.interventionAssignments.findFirst({
      where: eq(interventionAssignments.id, assignmentId),
      with: {
        interventionCase: {
          columns: {
            id: true,
            studentId: true,
            classId: true,
          },
        },
        generatedGuidedAssessment: true,
      },
    });
    if (!assignment || !assignment.interventionCase) {
      throw new NotFoundException('Guided assessment checkpoint not found');
    }
    if (assignment.interventionCase.studentId !== studentId) {
      throw new ForbiddenException(
        'Checkpoint does not belong to current student',
      );
    }
    if (assignment.interventionCase.classId !== classId) {
      throw new BadRequestException('Checkpoint does not belong to this class');
    }

    const attempt =
      await this.db.query.generatedGuidedAssessmentAttempts.findFirst({
        where: and(
          eq(generatedGuidedAssessmentAttempts.assignmentId, assignmentId),
          eq(generatedGuidedAssessmentAttempts.studentId, studentId),
        ),
        orderBy: [desc(generatedGuidedAssessmentAttempts.submittedAt)],
      });
    if (!attempt || attempt.status !== 'submitted') {
      throw new BadRequestException(
        'Guided assessment result is only available after submission.',
      );
    }

    return {
      assignmentId,
      attemptId: attempt.id,
      guidedAssessment: this.serializeGeneratedGuidedAssessment(
        assignment.generatedGuidedAssessment,
      ),
      scorePercent: attempt.score ?? 0,
      correctCount: attempt.correctCount ?? 0,
      responses: attempt.responses ?? [],
      hintedQuestionIds: attempt.hintUsage ?? [],
      formativeSummary: attempt.formativeSummary ?? null,
      submittedAt: attempt.submittedAt,
    };
  }

  async getTeacherQueue(classId: string, user: UserContext) {
    await this.assertTeacherClassAccess(classId, user);

    const cases = await this.db.query.interventionCases.findMany({
      where: and(
        eq(interventionCases.classId, classId),
        inArray(interventionCases.status, ['pending', 'active']),
      ),
      with: {
        student: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: [desc(interventionCases.openedAt)],
    });

    const caseIds = cases.map((row) => row.id);
    const studentIds = [...new Set(cases.map((row) => row.studentId))];

    const [assignmentRows, progressRows, snapshotRows] = await Promise.all([
      caseIds.length > 0
        ? this.db.query.interventionAssignments.findMany({
            where: inArray(interventionAssignments.caseId, caseIds),
            columns: { id: true, caseId: true, isCompleted: true },
          })
        : Promise.resolve([]),
      studentIds.length > 0
        ? this.db.query.lxpProgress.findMany({
            where: and(
              eq(lxpProgress.classId, classId),
              inArray(lxpProgress.studentId, studentIds),
            ),
            columns: {
              studentId: true,
              xpTotal: true,
              streakDays: true,
              checkpointsCompleted: true,
              lastActivityAt: true,
            },
          })
        : Promise.resolve([]),
      studentIds.length > 0
        ? this.db.query.performanceSnapshots.findMany({
            where: and(
              eq(performanceSnapshots.classId, classId),
              inArray(performanceSnapshots.studentId, studentIds),
            ),
            columns: {
              studentId: true,
              isAtRisk: true,
              blendedScore: true,
              thresholdApplied: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const assignmentsByCaseId = new Map<string, typeof assignmentRows>();
    for (const row of assignmentRows) {
      const items = assignmentsByCaseId.get(row.caseId) ?? [];
      items.push(row);
      assignmentsByCaseId.set(row.caseId, items);
    }

    const progressByStudentId = new Map<string, (typeof progressRows)[number]>(
      progressRows.map((row) => [row.studentId, row] as const),
    );
    const snapshotByStudentId = new Map<string, (typeof snapshotRows)[number]>(
      snapshotRows.map((row) => [row.studentId, row] as const),
    );

    const queue = cases.map((row) => {
      const assignments = assignmentsByCaseId.get(row.id) ?? [];
      const progress = progressByStudentId.get(row.studentId);
      const snapshot = snapshotByStudentId.get(row.studentId);
      const isCurrentlyAtRisk = Boolean(snapshot?.isAtRisk);
      const isPathScoreRegeneration =
        row.triggerSource === 'path_score_below_threshold';
      const latestBlendedScore = this.toNumber(snapshot?.blendedScore);
      const latestThreshold =
        this.toNumber(snapshot?.thresholdApplied) ??
        this.toNumber(row.thresholdApplied) ??
        INTERVENTION_THRESHOLD;

      const totalCheckpoints = assignments.length;
      const completed = assignments.filter((item) => item.isCompleted).length;

      return {
        id: row.id,
        studentId: row.studentId,
        student: row.student,
        openedAt: row.openedAt,
        status: row.status,
        classId: row.classId,
        triggerScore: this.toNumber(row.triggerScore),
        thresholdApplied:
          this.toNumber(row.thresholdApplied) ?? INTERVENTION_THRESHOLD,
        isCurrentlyAtRisk,
        latestBlendedScore,
        latestThreshold,
        aiPlanEligible: isCurrentlyAtRisk || isPathScoreRegeneration,
        aiPlanEligibilityReason: isCurrentlyAtRisk
          ? 'at_risk'
          : isPathScoreRegeneration
            ? 'path_score_below_threshold'
            : null,
        totalCheckpoints,
        completedCheckpoints: completed,
        completionPercent:
          totalCheckpoints > 0
            ? Math.round((completed / totalCheckpoints) * 100)
            : 0,
        progress: progress
          ? {
              ...progress,
              starsTotal: this.xpToStars(progress.xpTotal),
            }
          : {
              xpTotal: 0,
              starsTotal: 0,
              streakDays: 0,
              checkpointsCompleted: 0,
              lastActivityAt: null,
            },
      };
    });

    return {
      classId,
      threshold: INTERVENTION_THRESHOLD,
      count: queue.length,
      queue,
    };
  }

  async getTeacherInterventionHistory(classId: string, user: UserContext) {
    await this.assertTeacherClassAccess(classId, user);

    const cases = await this.db.query.interventionCases.findMany({
      where: eq(interventionCases.classId, classId),
      with: {
        student: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: [desc(interventionCases.openedAt)],
    });

    const caseIds = cases.map((row) => row.id);
    const assignmentRows =
      caseIds.length > 0
        ? await this.db.query.interventionAssignments.findMany({
            where: inArray(interventionAssignments.caseId, caseIds),
            columns: {
              id: true,
              caseId: true,
              assignmentType: true,
              lessonId: true,
              assessmentId: true,
              generatedRemedialLessonId: true,
              generatedGuidedAssessmentId: true,
              checkpointLabel: true,
              orderIndex: true,
              isCompleted: true,
              completedAt: true,
              xpAwarded: true,
            },
            with: {
              lesson: {
                columns: {
                  id: true,
                  title: true,
                  description: true,
                },
              },
              assessment: {
                columns: {
                  id: true,
                  title: true,
                  type: true,
                  passingScore: true,
                  dueDate: true,
                },
              },
              generatedRemedialLesson: {
                columns: {
                  id: true,
                  title: true,
                  summary: true,
                  lessonBody: true,
                  weakConcepts: true,
                  sourceLessonIds: true,
                  sourceReferences: true,
                  approvalStatus: true,
                  approvedAt: true,
                  rejectedAt: true,
                },
              },
              generatedGuidedAssessment: {
                columns: {
                  id: true,
                  title: true,
                  description: true,
                  weakConcepts: true,
                  sourceAssessmentId: true,
                  sourceReferences: true,
                  formativeSummary: true,
                  questions: true,
                  approvalStatus: true,
                  approvedAt: true,
                  rejectedAt: true,
                },
              },
            },
            orderBy: [asc(interventionAssignments.orderIndex)],
          })
        : [];

    const assignmentsByCaseId = new Map<string, typeof assignmentRows>();
    for (const row of assignmentRows) {
      const items = assignmentsByCaseId.get(row.caseId) ?? [];
      items.push(row);
      assignmentsByCaseId.set(row.caseId, items);
    }

    const { assignmentScores, pathScores } =
      await this.resolveTeacherPathScores(
        cases.map((row) => ({ id: row.id, studentId: row.studentId })),
        assignmentRows,
      );

    const history = cases.map((row) => {
      const assignments = assignmentsByCaseId.get(row.id) ?? [];
      const completedCheckpoints = assignments.filter(
        (item) => item.isCompleted,
      ).length;
      const pathScore = pathScores.get(row.id) ?? null;

      return {
        id: row.id,
        classId: row.classId,
        studentId: row.studentId,
        student: row.student,
        status: row.status,
        openedAt: row.openedAt,
        closedAt: row.closedAt,
        triggerSource: row.triggerSource,
        triggerScore: this.toNumber(row.triggerScore),
        thresholdApplied:
          this.toNumber(row.thresholdApplied) ?? INTERVENTION_THRESHOLD,
        note: row.note,
        completion: {
          totalCheckpoints: assignments.length,
          completedCheckpoints,
          completionPercent:
            assignments.length > 0
              ? Math.round((completedCheckpoints / assignments.length) * 100)
              : 0,
        },
        pathScore: this.serializeTeacherPathScore(pathScore),
        canRegenerate:
          row.status === 'completed' &&
          pathScore !== null &&
          pathScore.scorePercent < PATH_REGENERATION_SCORE_THRESHOLD,
        assignments: assignments.map((assignment) =>
          this.serializeTeacherInterventionAssignment(
            assignment,
            assignmentScores.get(assignment.id),
          ),
        ),
      };
    });

    return {
      classId,
      scoreThreshold: PATH_REGENERATION_SCORE_THRESHOLD,
      history,
    };
  }

  async regenerateInterventionPath(caseId: string, user: UserContext) {
    const sourceCase = await this.db.query.interventionCases.findFirst({
      where: eq(interventionCases.id, caseId),
      columns: {
        id: true,
        classId: true,
        studentId: true,
        status: true,
        note: true,
      },
    });
    if (!sourceCase) throw new NotFoundException('Intervention case not found');
    await this.assertTeacherClassAccess(sourceCase.classId, user);

    if (sourceCase.status !== 'completed') {
      throw new BadRequestException(
        'Only completed intervention paths can be regenerated.',
      );
    }

    const assignmentRows = await this.db.query.interventionAssignments.findMany(
      {
        where: eq(interventionAssignments.caseId, sourceCase.id),
        columns: {
          id: true,
          caseId: true,
          assignmentType: true,
          assessmentId: true,
        },
      },
    );
    const { pathScores } = await this.resolveTeacherPathScores(
      [{ id: sourceCase.id, studentId: sourceCase.studentId }],
      assignmentRows,
    );
    const pathScore = pathScores.get(sourceCase.id) ?? null;

    if (!pathScore) {
      throw new BadRequestException(
        'A submitted path assessment score is required before regenerating this path.',
      );
    }

    if (pathScore.scorePercent >= PATH_REGENERATION_SCORE_THRESHOLD) {
      throw new BadRequestException(
        'Only paths scored below 60% can be regenerated.',
      );
    }

    const existingOpenCase = await this.db.query.interventionCases.findFirst({
      where: and(
        eq(interventionCases.studentId, sourceCase.studentId),
        eq(interventionCases.classId, sourceCase.classId),
        or(
          eq(interventionCases.status, 'pending'),
          eq(interventionCases.status, 'active'),
        ),
      ),
      orderBy: [desc(interventionCases.openedAt)],
    });

    if (existingOpenCase) {
      return {
        sourceCaseId: sourceCase.id,
        reusedExisting: true,
        scoreThreshold: PATH_REGENERATION_SCORE_THRESHOLD,
        pathScore: this.serializeTeacherPathScore(pathScore),
        case: await this.getTeacherInterventionCase(existingOpenCase.id, user),
      };
    }

    const [created] = await this.db
      .insert(interventionCases)
      .values({
        studentId: sourceCase.studentId,
        classId: sourceCase.classId,
        status: 'active',
        triggerSource: 'path_score_below_threshold',
        triggerScore: pathScore.scorePercent.toString(),
        thresholdApplied: PATH_REGENERATION_SCORE_THRESHOLD.toString(),
        note: this.appendInterventionNote(
          null,
          `Regenerated from completed Learners Path ${sourceCase.id}.`,
        ),
      })
      .returning();

    await this.auditService.log({
      actorId: user.userId,
      action: 'lxp.intervention.regenerated',
      targetType: 'intervention_case',
      targetId: created.id,
      metadata: {
        sourceCaseId: sourceCase.id,
        classId: sourceCase.classId,
        studentId: sourceCase.studentId,
        pathScore: pathScore.scorePercent,
        scoreThreshold: PATH_REGENERATION_SCORE_THRESHOLD,
      },
    });

    return {
      sourceCaseId: sourceCase.id,
      reusedExisting: false,
      scoreThreshold: PATH_REGENERATION_SCORE_THRESHOLD,
      pathScore: this.serializeTeacherPathScore(pathScore),
      case: await this.getTeacherInterventionCase(created.id, user),
    };
  }

  async assignIntervention(
    caseId: string,
    dto: AssignInterventionDto,
    user: UserContext,
  ) {
    const interventionCase = await this.db.query.interventionCases.findFirst({
      where: eq(interventionCases.id, caseId),
      columns: {
        id: true,
        classId: true,
        studentId: true,
        status: true,
        note: true,
      },
    });
    if (!interventionCase)
      throw new NotFoundException('Intervention case not found');
    await this.assertTeacherClassAccess(interventionCase.classId, user);
    if (interventionCase.status !== 'active') {
      throw new BadRequestException(
        'Only active intervention cases can be assigned.',
      );
    }

    const lessonAssignments: Array<{
      lessonId: string;
      xpAwarded: number;
      label?: string;
    }> =
      dto.lessonAssignments && dto.lessonAssignments.length > 0
        ? dto.lessonAssignments
        : [...new Set(dto.lessonIds ?? [])].map((lessonId) => ({
            lessonId,
            xpAwarded: LESSON_XP,
          }));
    const assessmentAssignments: Array<{
      assessmentId: string;
      xpAwarded: number;
      label?: string;
    }> =
      dto.assessmentAssignments && dto.assessmentAssignments.length > 0
        ? dto.assessmentAssignments
        : [...new Set(dto.assessmentIds ?? [])].map((assessmentId) => ({
            assessmentId,
            xpAwarded: ASSESSMENT_XP,
          }));

    const lessonIds = [
      ...new Set(lessonAssignments.map((entry) => entry.lessonId)),
    ];
    const assessmentIds = [
      ...new Set(assessmentAssignments.map((entry) => entry.assessmentId)),
    ];

    if (lessonIds.length === 0 && assessmentIds.length === 0) {
      throw new BadRequestException(
        'Provide at least one lesson or assessment.',
      );
    }

    if (lessonIds.length > 0) {
      const lessonRows = await this.db.query.lessons.findMany({
        where: and(
          eq(lessons.classId, interventionCase.classId),
          inArray(lessons.id, lessonIds),
        ),
        columns: { id: true },
      });
      if (lessonRows.length !== lessonIds.length) {
        throw new BadRequestException(
          'Some lessons do not belong to this class.',
        );
      }
    }

    if (assessmentIds.length > 0) {
      const assessmentRows = await this.db.query.assessments.findMany({
        where: and(
          eq(assessments.classId, interventionCase.classId),
          inArray(assessments.id, assessmentIds),
        ),
        columns: { id: true },
      });
      if (assessmentRows.length !== assessmentIds.length) {
        throw new BadRequestException(
          'Some assessments do not belong to this class.',
        );
      }

      const attemptedAssessmentRows = await this.db
        .select({
          assessmentId: assessmentAttempts.assessmentId,
        })
        .from(assessmentAttempts)
        .where(
          and(
            eq(assessmentAttempts.studentId, interventionCase.studentId),
            eq(assessmentAttempts.isSubmitted, true),
            eq(assessmentAttempts.passed, false),
            inArray(assessmentAttempts.assessmentId, assessmentIds),
          ),
        )
        .groupBy(assessmentAttempts.assessmentId);
      const attemptedAssessmentIds = new Set(
        attemptedAssessmentRows.map((row) => row.assessmentId),
      );
      const missingAttemptIds = assessmentIds.filter(
        (assessmentId) => !attemptedAssessmentIds.has(assessmentId),
      );
      if (missingAttemptIds.length > 0) {
        throw new BadRequestException(
          'Assessment retry checkpoints require at least one failed submitted attempt from the student before they can be assigned.',
        );
      }
    }

    const existingAssignments =
      await this.db.query.interventionAssignments.findMany({
        where: eq(interventionAssignments.caseId, interventionCase.id),
        columns: { id: true, isCompleted: true },
      });
    const [approvedGeneratedLesson, approvedGuidedAssessment] =
      await Promise.all([
        this.db.query.generatedRemedialLessons.findFirst({
          where: and(
            eq(generatedRemedialLessons.caseId, interventionCase.id),
            eq(generatedRemedialLessons.approvalStatus, 'approved'),
          ),
          orderBy: [desc(generatedRemedialLessons.approvedAt)],
        }),
        this.db.query.generatedGuidedAssessments.findFirst({
          where: and(
            eq(generatedGuidedAssessments.caseId, interventionCase.id),
            eq(generatedGuidedAssessments.approvalStatus, 'approved'),
          ),
          orderBy: [desc(generatedGuidedAssessments.approvedAt)],
        }),
      ]);
    if (existingAssignments.some((assignment) => assignment.isCompleted)) {
      throw new BadRequestException(
        'Cannot replace intervention assignments after checkpoint progress has started.',
      );
    }

    await this.db.transaction(async (tx) => {
      await tx
        .delete(interventionAssignments)
        .where(eq(interventionAssignments.caseId, interventionCase.id));

      const assignmentPayload: (typeof interventionAssignments.$inferInsert)[] =
        [];
      let order = 1;
      lessonAssignments.forEach((lessonEntry) => {
        assignmentPayload.push({
          caseId: interventionCase.id,
          assignmentType: 'lesson_review',
          lessonId: lessonEntry.lessonId,
          checkpointLabel:
            lessonEntry.label?.trim() || 'Teacher-assigned lesson review',
          orderIndex: order++,
          xpAwarded: lessonEntry.xpAwarded,
        });
      });
      if (approvedGeneratedLesson) {
        assignmentPayload.push({
          caseId: interventionCase.id,
          assignmentType: 'generated_lesson_review',
          generatedRemedialLessonId: approvedGeneratedLesson.id,
          checkpointLabel: `AI remedial lesson: ${approvedGeneratedLesson.title}`,
          orderIndex: order++,
          xpAwarded: LESSON_XP,
        });
      }
      if (approvedGuidedAssessment) {
        assignmentPayload.push({
          caseId: interventionCase.id,
          assignmentType: 'guided_assessment',
          generatedGuidedAssessmentId: approvedGuidedAssessment.id,
          checkpointLabel: `AI guided assessment: ${approvedGuidedAssessment.title}`,
          orderIndex: order++,
          xpAwarded: ASSESSMENT_XP,
        });
      }
      assessmentAssignments.forEach((assessmentEntry) => {
        assignmentPayload.push({
          caseId: interventionCase.id,
          assignmentType: 'assessment_retry',
          assessmentId: assessmentEntry.assessmentId,
          checkpointLabel:
            assessmentEntry.label?.trim() ||
            'Teacher-assigned assessment retry',
          orderIndex: order++,
          xpAwarded: assessmentEntry.xpAwarded,
        });
      });

      if (assignmentPayload.length > 0) {
        await tx.insert(interventionAssignments).values(assignmentPayload);
      }

      await tx
        .update(interventionCases)
        .set({
          note: this.appendInterventionNote(interventionCase.note, dto.note),
          updatedAt: new Date(),
        })
        .where(eq(interventionCases.id, interventionCase.id));
    });

    await this.createAndEmitNotifications(
      [
        {
          userId: interventionCase.studentId,
          type: 'grade_updated',
          referenceId: interventionCase.id,
          title: 'New intervention checklist assigned',
          body: 'Your teacher updated your intervention checklist in Learners Path. Open Learners Path to continue.',
        },
      ],
      { dedupe: false },
    );

    await this.auditService.log({
      actorId: user.userId,
      action: 'lxp.intervention.assigned',
      targetType: 'intervention_case',
      targetId: interventionCase.id,
      metadata: {
        classId: interventionCase.classId,
        studentId: interventionCase.studentId,
        previousAssignmentsCount: existingAssignments.length,
        lessonAssignments,
        assessmentAssignments,
        generatedRemedialLessonId: approvedGeneratedLesson?.id ?? null,
        generatedGuidedAssessmentId: approvedGuidedAssessment?.id ?? null,
      },
    });

    return this.getTeacherQueue(interventionCase.classId, user);
  }

  async resolveIntervention(
    caseId: string,
    dto: ResolveInterventionDto,
    user: UserContext,
  ) {
    const interventionCase = await this.db.query.interventionCases.findFirst({
      where: eq(interventionCases.id, caseId),
      columns: {
        id: true,
        classId: true,
        studentId: true,
        status: true,
        note: true,
      },
    });
    if (!interventionCase)
      throw new NotFoundException('Intervention case not found');
    await this.assertTeacherClassAccess(interventionCase.classId, user);
    if (interventionCase.status !== 'active') {
      throw new BadRequestException('Intervention case is already closed.');
    }

    const resolvedNote = this.appendInterventionNote(
      interventionCase.note,
      dto.note ?? 'Resolved by teacher.',
    );
    await this.db
      .update(interventionCases)
      .set({
        status: 'completed',
        closedAt: new Date(),
        note: resolvedNote,
        updatedAt: new Date(),
      })
      .where(eq(interventionCases.id, caseId));

    await this.createAndEmitNotifications(
      [
        {
          userId: interventionCase.studentId,
          type: 'grade_updated',
          referenceId: interventionCase.id,
          title: 'Intervention case resolved',
          body: 'Your teacher marked your current intervention cycle as resolved.',
        },
      ],
      { dedupe: false },
    );

    await this.auditService.log({
      actorId: user.userId,
      action: 'lxp.intervention.resolved',
      targetType: 'intervention_case',
      targetId: interventionCase.id,
      metadata: {
        classId: interventionCase.classId,
        studentId: interventionCase.studentId,
        note: resolvedNote,
      },
    });

    return this.getTeacherQueue(interventionCase.classId, user);
  }

  async getTeacherPendingInterventionCount(user: UserContext) {
    const classRows = await this.db.query.classes.findMany({
      where: this.isAdmin(user.roles)
        ? undefined
        : eq(classes.teacherId, user.userId),
      columns: {
        id: true,
        subjectName: true,
        subjectCode: true,
      },
    });

    if (classRows.length === 0) {
      return {
        pendingCount: 0,
        classBreakdown: [],
      };
    }

    const classIds = classRows.map((row) => row.id);
    const pendingRows = await this.db.query.interventionCases.findMany({
      where: and(
        inArray(interventionCases.classId, classIds),
        eq(interventionCases.status, 'pending'),
      ),
      columns: {
        id: true,
        classId: true,
      },
    });

    const countsByClassId = new Map<string, number>();
    for (const row of pendingRows) {
      countsByClassId.set(
        row.classId,
        (countsByClassId.get(row.classId) ?? 0) + 1,
      );
    }

    return {
      pendingCount: pendingRows.length,
      classBreakdown: classRows
        .map((cls) => ({
          classId: cls.id,
          subjectName: cls.subjectName,
          subjectCode: cls.subjectCode,
          pendingCount: countsByClassId.get(cls.id) ?? 0,
        }))
        .filter((row) => row.pendingCount > 0)
        .sort((a, b) => b.pendingCount - a.pendingCount),
    };
  }

  async activateIntervention(caseId: string, user: UserContext) {
    const interventionCase = await this.db.query.interventionCases.findFirst({
      where: eq(interventionCases.id, caseId),
      columns: {
        id: true,
        classId: true,
        studentId: true,
        status: true,
      },
    });
    if (!interventionCase)
      throw new NotFoundException('Intervention case not found');
    await this.assertTeacherClassAccess(interventionCase.classId, user);

    if (interventionCase.status !== 'pending') {
      throw new BadRequestException(
        'Only pending intervention cases can be activated.',
      );
    }

    await this.db
      .update(interventionCases)
      .set({
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(interventionCases.id, caseId));

    await this.createAndEmitNotifications(
      [
        {
          userId: interventionCase.studentId,
          type: 'grade_updated',
          referenceId: interventionCase.id,
          title: 'Intervention support plan approved',
          body: 'Your intervention support plan is now active. Open Learners Path to start the recommended steps.',
        },
      ],
      { dedupe: false },
    );

    await this.auditService.log({
      actorId: user.userId,
      action: 'lxp.intervention.approved',
      targetType: 'intervention_case',
      targetId: interventionCase.id,
      metadata: {
        classId: interventionCase.classId,
        studentId: interventionCase.studentId,
        previousStatus: 'pending',
        currentStatus: 'active',
      },
    });

    return this.getTeacherQueue(interventionCase.classId, user);
  }

  async getTeacherInterventionCase(caseId: string, user: UserContext) {
    const interventionCase = await this.db.query.interventionCases.findFirst({
      where: eq(interventionCases.id, caseId),
      with: {
        student: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
    if (!interventionCase)
      throw new NotFoundException('Intervention case not found');
    await this.assertTeacherClassAccess(interventionCase.classId, user);

    const assignmentRows = await this.db.query.interventionAssignments.findMany(
      {
        where: eq(interventionAssignments.caseId, interventionCase.id),
        columns: { id: true, caseId: true, isCompleted: true },
      },
    );
    const progress = await this.db.query.lxpProgress.findFirst({
      where: and(
        eq(lxpProgress.classId, interventionCase.classId),
        eq(lxpProgress.studentId, interventionCase.studentId),
      ),
      columns: {
        xpTotal: true,
        streakDays: true,
        checkpointsCompleted: true,
        lastActivityAt: true,
      },
    });
    const totalCheckpoints = assignmentRows.length;
    const completedCheckpoints = assignmentRows.filter(
      (row) => row.isCompleted,
    ).length;

    return {
      id: interventionCase.id,
      classId: interventionCase.classId,
      studentId: interventionCase.studentId,
      student: interventionCase.student,
      status: interventionCase.status,
      openedAt: interventionCase.openedAt,
      triggerScore: this.toNumber(interventionCase.triggerScore),
      thresholdApplied:
        this.toNumber(interventionCase.thresholdApplied) ??
        INTERVENTION_THRESHOLD,
      totalCheckpoints,
      completedCheckpoints,
      completionPercent:
        totalCheckpoints > 0
          ? Math.round((completedCheckpoints / totalCheckpoints) * 100)
          : 0,
      progress: progress
        ? {
            ...progress,
            starsTotal: this.xpToStars(progress.xpTotal),
          }
        : {
            xpTotal: 0,
            starsTotal: 0,
            streakDays: 0,
            checkpointsCompleted: 0,
            lastActivityAt: null,
          },
    };
  }

  async getTeacherInterventionCaseDetail(caseId: string, user: UserContext) {
    const interventionCase = await this.db.query.interventionCases.findFirst({
      where: eq(interventionCases.id, caseId),
      with: {
        student: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
    if (!interventionCase)
      throw new NotFoundException('Intervention case not found');
    await this.assertTeacherClassAccess(interventionCase.classId, user);

    const [
      assignmentRows,
      progress,
      snapshot,
      conceptRows,
      recentLogs,
      generatedLessonDraft,
      generatedGuidedAssessmentDraft,
    ] = await Promise.all([
      this.db.query.interventionAssignments.findMany({
        where: eq(interventionAssignments.caseId, interventionCase.id),
        columns: {
          id: true,
          caseId: true,
          assignmentType: true,
          assessmentId: true,
          checkpointLabel: true,
          orderIndex: true,
          isCompleted: true,
          completedAt: true,
          xpAwarded: true,
        },
        with: {
          lesson: {
            columns: {
              id: true,
              title: true,
              description: true,
            },
          },
          assessment: {
            columns: {
              id: true,
              title: true,
              type: true,
              passingScore: true,
              dueDate: true,
            },
          },
          generatedRemedialLesson: {
            columns: {
              id: true,
              title: true,
              summary: true,
              lessonBody: true,
              weakConcepts: true,
              sourceLessonIds: true,
              sourceReferences: true,
              approvalStatus: true,
              approvedAt: true,
              rejectedAt: true,
            },
          },
          generatedGuidedAssessment: {
            columns: {
              id: true,
              title: true,
              description: true,
              weakConcepts: true,
              sourceAssessmentId: true,
              sourceReferences: true,
              formativeSummary: true,
              questions: true,
              approvalStatus: true,
              approvedAt: true,
              rejectedAt: true,
            },
          },
        },
        orderBy: [asc(interventionAssignments.orderIndex)],
      }),
      this.db.query.lxpProgress.findFirst({
        where: and(
          eq(lxpProgress.classId, interventionCase.classId),
          eq(lxpProgress.studentId, interventionCase.studentId),
        ),
        columns: {
          xpTotal: true,
          streakDays: true,
          checkpointsCompleted: true,
          lastActivityAt: true,
        },
      }),
      this.db.query.performanceSnapshots.findFirst({
        where: and(
          eq(performanceSnapshots.classId, interventionCase.classId),
          eq(performanceSnapshots.studentId, interventionCase.studentId),
        ),
        columns: {
          assessmentAverage: true,
          classRecordAverage: true,
          blendedScore: true,
          isAtRisk: true,
          thresholdApplied: true,
          lastComputedAt: true,
        },
      }),
      this.db.query.studentConceptMastery.findMany({
        where: and(
          eq(studentConceptMastery.classId, interventionCase.classId),
          eq(studentConceptMastery.studentId, interventionCase.studentId),
        ),
        columns: {
          conceptKey: true,
          evidenceCount: true,
          errorCount: true,
          masteryScore: true,
          updatedAt: true,
        },
        orderBy: [
          asc(studentConceptMastery.masteryScore),
          desc(studentConceptMastery.errorCount),
          desc(studentConceptMastery.updatedAt),
        ],
        limit: 6,
      }),
      this.db.query.performanceLogs.findMany({
        where: and(
          eq(performanceLogs.classId, interventionCase.classId),
          eq(performanceLogs.studentId, interventionCase.studentId),
        ),
        columns: {
          id: true,
          previousIsAtRisk: true,
          currentIsAtRisk: true,
          blendedScore: true,
          thresholdApplied: true,
          triggerSource: true,
          createdAt: true,
        },
        orderBy: [desc(performanceLogs.createdAt)],
        limit: 6,
      }),
      this.db.query.generatedRemedialLessons.findFirst({
        where: eq(generatedRemedialLessons.caseId, interventionCase.id),
        orderBy: [
          desc(generatedRemedialLessons.updatedAt),
          desc(generatedRemedialLessons.createdAt),
        ],
      }),
      this.db.query.generatedGuidedAssessments.findFirst({
        where: eq(generatedGuidedAssessments.caseId, interventionCase.id),
        orderBy: [
          desc(generatedGuidedAssessments.updatedAt),
          desc(generatedGuidedAssessments.createdAt),
        ],
      }),
    ]);

    const totalCheckpoints = assignmentRows.length;
    const completedCheckpoints = assignmentRows.filter(
      (row) => row.isCompleted,
    ).length;
    const { assignmentScores, pathScores } =
      await this.resolveTeacherPathScores(
        [{ id: interventionCase.id, studentId: interventionCase.studentId }],
        assignmentRows,
      );
    const pathScore = pathScores.get(interventionCase.id) ?? null;

    return {
      id: interventionCase.id,
      classId: interventionCase.classId,
      studentId: interventionCase.studentId,
      student: interventionCase.student,
      status: interventionCase.status,
      openedAt: interventionCase.openedAt,
      closedAt: interventionCase.closedAt,
      triggerScore: this.toNumber(interventionCase.triggerScore),
      thresholdApplied:
        this.toNumber(interventionCase.thresholdApplied) ??
        INTERVENTION_THRESHOLD,
      note: interventionCase.note,
      pathScore: this.serializeTeacherPathScore(pathScore),
      canRegenerate:
        interventionCase.status === 'completed' &&
        pathScore !== null &&
        pathScore.scorePercent < PATH_REGENERATION_SCORE_THRESHOLD,
      completion: {
        totalCheckpoints,
        completedCheckpoints,
        completionPercent:
          totalCheckpoints > 0
            ? Math.round((completedCheckpoints / totalCheckpoints) * 100)
            : 0,
      },
      progress: progress
        ? {
            ...progress,
            starsTotal: this.xpToStars(progress.xpTotal),
          }
        : {
            xpTotal: 0,
            starsTotal: 0,
            streakDays: 0,
            checkpointsCompleted: 0,
            lastActivityAt: null,
          },
      assignments: assignmentRows.map((row) =>
        this.serializeTeacherInterventionAssignment(
          row,
          assignmentScores.get(row.id),
        ),
      ),
      generatedArtifacts: {
        generatedLesson: this.serializeGeneratedLesson(generatedLessonDraft),
        guidedAssessment: this.serializeGeneratedGuidedAssessment(
          generatedGuidedAssessmentDraft,
        ),
      },
      latestSnapshot: snapshot
        ? {
            assessmentAverage: this.toNumber(snapshot.assessmentAverage),
            classRecordAverage: this.toNumber(snapshot.classRecordAverage),
            blendedScore: this.toNumber(snapshot.blendedScore),
            thresholdApplied:
              this.toNumber(snapshot.thresholdApplied) ??
              INTERVENTION_THRESHOLD,
            isAtRisk: snapshot.isAtRisk,
            lastComputedAt: snapshot.lastComputedAt,
          }
        : null,
      weakConcepts: conceptRows.map((row) => ({
        concept: row.conceptKey,
        masteryScore: row.masteryScore,
        evidenceCount: row.evidenceCount,
        errorCount: row.errorCount,
        updatedAt: row.updatedAt,
      })),
      recentRiskTransitions: recentLogs.map((row) => ({
        id: row.id,
        previousIsAtRisk: row.previousIsAtRisk,
        currentIsAtRisk: row.currentIsAtRisk,
        blendedScore: this.toNumber(row.blendedScore),
        thresholdApplied: this.toNumber(row.thresholdApplied),
        triggerSource: row.triggerSource,
        createdAt: row.createdAt,
      })),
      links: {
        performancePage: `/dashboard/teacher/performance?classId=${interventionCase.classId}&studentId=${interventionCase.studentId}`,
      },
    };
  }

  async getClassReport(classId: string, user: UserContext) {
    await this.assertTeacherClassAccess(classId, user);

    const cases = await this.db.query.interventionCases.findMany({
      where: eq(interventionCases.classId, classId),
      columns: {
        id: true,
        studentId: true,
        status: true,
        triggerScore: true,
        openedAt: true,
        closedAt: true,
      },
      with: {
        student: {
          columns: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: [desc(interventionCases.openedAt)],
    });

    const snapshots = await this.db.query.performanceSnapshots.findMany({
      where: eq(performanceSnapshots.classId, classId),
      columns: { studentId: true, blendedScore: true },
    });
    const snapshotMap = new Map(
      snapshots.map((row) => [row.studentId, this.toNumber(row.blendedScore)]),
    );
    const progressRows = await this.db.query.lxpProgress.findMany({
      where: eq(lxpProgress.classId, classId),
      columns: {
        studentId: true,
        xpTotal: true,
        streakDays: true,
        checkpointsCompleted: true,
        lastActivityAt: true,
      },
      with: {
        student: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: [desc(lxpProgress.xpTotal), desc(lxpProgress.updatedAt)],
    });

    const withDelta = cases.map((entry) => {
      const baseline = this.toNumber(entry.triggerScore);
      const current = snapshotMap.get(entry.studentId) ?? null;
      const delta =
        baseline !== null && current !== null
          ? Math.round((current - baseline) * 100) / 100
          : null;
      return {
        ...entry,
        triggerScore: baseline,
        currentBlendedScore: current,
        improvementDelta: delta,
      };
    });

    const distinctStudents = new Set(withDelta.map((entry) => entry.studentId))
      .size;
    const completed = withDelta.filter(
      (entry) => entry.status === 'completed',
    ).length;
    const pending = withDelta.filter(
      (entry) => entry.status === 'pending',
    ).length;
    const active = withDelta.filter(
      (entry) => entry.status === 'active',
    ).length;
    const deltas = withDelta
      .map((entry) => entry.improvementDelta)
      .filter((value): value is number => value !== null);

    return {
      classId,
      threshold: INTERVENTION_THRESHOLD,
      summary: {
        totalCases: withDelta.length,
        pendingCases: pending,
        activeCases: active,
        completedCases: completed,
        interventionParticipation: distinctStudents,
        averageDelta:
          deltas.length > 0
            ? Math.round(
                (deltas.reduce((sum, item) => sum + item, 0) / deltas.length) *
                  100,
              ) / 100
            : null,
      },
      rows: withDelta,
      leaderboard: progressRows.map((row, index) => ({
        rank: index + 1,
        studentId: row.studentId,
        xpTotal: row.xpTotal,
        starsTotal: this.xpToStars(row.xpTotal),
        streakDays: row.streakDays,
        checkpointsCompleted: row.checkpointsCompleted,
        lastActivityAt: row.lastActivityAt,
        student: row.student,
      })),
    };
  }

  async getStudentTeacherEvaluationDashboard(studentId: string) {
    const [academicState, candidates, existingSubmissions] = await Promise.all([
      this.getCurrentAcademicStateSnapshot(),
      this.getStudentTeacherEvaluationCandidates(studentId),
      this.db.query.teacherEvaluationSubmissions.findMany({
        where: eq(teacherEvaluationSubmissions.studentId, studentId),
        columns: {
          id: true,
          classId: true,
          gradingPeriod: true,
          evaluationType: true,
          submittedAt: true,
        },
      }),
    ]);

    const submittedScopeKeys = new Set(
      existingSubmissions.map((submission) =>
        this.buildTeacherEvaluationScopeKey({
          classId: submission.classId,
          gradingPeriod: submission.gradingPeriod,
          evaluationType: submission.evaluationType,
        }),
      ),
    );

    const pending = candidates
      .filter(
        (candidate) =>
          !submittedScopeKeys.has(
            this.buildTeacherEvaluationScopeKey(candidate),
          ),
      )
      .map((candidate) => {
        const definition = this.getTeacherEvaluationDefinition(
          candidate.evaluationType,
        );
        return {
          classId: candidate.classId,
          gradingPeriod: candidate.gradingPeriod,
          schoolYear: candidate.schoolYear,
          evaluationType: candidate.evaluationType,
          title: definition.title,
          description: definition.description,
          class: {
            id: candidate.class.id,
            subjectName: candidate.class.subjectName,
            subjectCode: candidate.class.subjectCode,
            section: candidate.class.section,
          },
          questions: definition.categories,
        };
      })
      .sort((left, right) => {
        if (left.class.subjectName !== right.class.subjectName) {
          return left.class.subjectName.localeCompare(right.class.subjectName);
        }
        return (
          this.quarterSortValue(left.gradingPeriod) -
          this.quarterSortValue(right.gradingPeriod)
        );
      });

    const completed = existingSubmissions
      .map((submission) => {
        const matchingCandidate = candidates.find(
          (candidate) =>
            candidate.classId === submission.classId &&
            candidate.gradingPeriod === submission.gradingPeriod &&
            candidate.evaluationType === submission.evaluationType,
        );
        const definition = this.getTeacherEvaluationDefinition(
          submission.evaluationType,
        );
        return {
          id: submission.id,
          classId: submission.classId,
          gradingPeriod: submission.gradingPeriod,
          evaluationType: submission.evaluationType,
          title: definition.title,
          class: matchingCandidate
            ? {
                id: matchingCandidate.class.id,
                subjectName: matchingCandidate.class.subjectName,
                subjectCode: matchingCandidate.class.subjectCode,
                section: matchingCandidate.class.section,
              }
            : null,
          submittedAt: submission.submittedAt,
        };
      })
      .sort(
        (left, right) =>
          new Date(right.submittedAt).getTime() -
          new Date(left.submittedAt).getTime(),
      );

    return {
      currentAcademicState: {
        schoolYear: academicState.schoolYear,
        quarter: academicState.quarter,
      },
      pending,
      completed,
    };
  }

  async submitTeacherEvaluation(
    user: UserContext,
    dto: SubmitTeacherEvaluationDto,
  ) {
    const cls = await this.db.query.classes.findFirst({
      where: eq(classes.id, dto.classId),
      columns: {
        id: true,
        subjectName: true,
        subjectCode: true,
        schoolYear: true,
        teacherId: true,
      },
    });
    if (!cls?.teacherId) {
      throw new NotFoundException('Class or class teacher not found.');
    }

    const matchingRecord = await this.db.query.classRecords.findFirst({
      where: and(
        eq(classRecords.classId, dto.classId),
        eq(classRecords.gradingPeriod, dto.gradingPeriod),
        eq(classRecords.status, 'finalized'),
      ),
      columns: {
        id: true,
        classId: true,
        gradingPeriod: true,
        teacherId: true,
        status: true,
      },
    });

    if (!matchingRecord) {
      throw new BadRequestException(
        'This evaluation is not open because the grading period is not finalized yet.',
      );
    }

    await this.assertStudentEnrollment(user.userId, dto.classId);

    const candidateKeys = new Set(
      (await this.getStudentTeacherEvaluationCandidates(user.userId)).map(
        (candidate) => this.buildTeacherEvaluationScopeKey(candidate),
      ),
    );
    const targetKey = this.buildTeacherEvaluationScopeKey({
      classId: dto.classId,
      gradingPeriod: dto.gradingPeriod,
      evaluationType: dto.evaluationType,
    });
    if (!candidateKeys.has(targetKey)) {
      throw new BadRequestException(
        'This evaluation is not available for the selected class and grading period.',
      );
    }

    const existingSubmission =
      await this.db.query.teacherEvaluationSubmissions.findFirst({
        where: and(
          eq(teacherEvaluationSubmissions.studentId, user.userId),
          eq(teacherEvaluationSubmissions.classId, dto.classId),
          eq(teacherEvaluationSubmissions.gradingPeriod, dto.gradingPeriod),
          eq(teacherEvaluationSubmissions.evaluationType, dto.evaluationType),
        ),
        columns: { id: true },
      });
    if (existingSubmission) {
      throw new BadRequestException(
        'You already submitted this evaluation for the selected grading period.',
      );
    }

    const ratings = this.normalizeTeacherEvaluationRatings(
      dto.evaluationType,
      dto.ratings ?? {},
    );

    const eligibleCount = (
      await this.getTeacherEvaluationSummary(
        { userId: cls.teacherId, roles: ['teacher'] },
        {
          evaluationType: dto.evaluationType,
          classId: dto.classId,
          gradingPeriod: dto.gradingPeriod,
        },
      )
    ).overview.eligibleCount;

    const [window] = await this.db
      .insert(teacherEvaluationWindows)
      .values({
        classId: dto.classId,
        teacherId: cls.teacherId,
        schoolYear: cls.schoolYear,
        gradingPeriod: dto.gradingPeriod,
        evaluationType: dto.evaluationType,
        eligibleCount,
        status: 'active',
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          teacherEvaluationWindows.classId,
          teacherEvaluationWindows.schoolYear,
          teacherEvaluationWindows.gradingPeriod,
          teacherEvaluationWindows.evaluationType,
        ],
        set: {
          teacherId: cls.teacherId,
          eligibleCount,
          status: 'active',
          updatedAt: new Date(),
        },
      })
      .returning();

    const [created] = await this.db
      .insert(teacherEvaluationSubmissions)
      .values({
        windowId: window.id,
        classId: dto.classId,
        teacherId: cls.teacherId,
        studentId: user.userId,
        schoolYear: cls.schoolYear,
        gradingPeriod: dto.gradingPeriod,
        evaluationType: dto.evaluationType,
        ratingsJson: ratings,
        comment: dto.comment?.trim() ? dto.comment.trim() : null,
      })
      .returning();

    await this.auditService.log({
      actorId: user.userId,
      action: 'lxp.teacher_evaluation.submitted',
      targetType: 'teacher_evaluation_submission',
      targetId: created.id,
      metadata: {
        classId: dto.classId,
        teacherId: cls.teacherId,
        gradingPeriod: dto.gradingPeriod,
        evaluationType: dto.evaluationType,
        hasComment: Boolean(dto.comment?.trim()),
      },
    });

    return {
      id: created.id,
      classId: dto.classId,
      gradingPeriod: dto.gradingPeriod,
      evaluationType: dto.evaluationType,
      submittedAt: created.submittedAt,
      class: {
        subjectName: cls.subjectName,
        subjectCode: cls.subjectCode,
      },
    };
  }

  async getTeacherEvaluationSummary(
    user: UserContext,
    query: ListTeacherEvaluationSummaryQueryDto,
  ) {
    if (!this.isAdmin(user.roles) && !user.roles.includes('teacher')) {
      throw new ForbiddenException(
        'Only teachers and admins can view teacher evaluation summaries.',
      );
    }

    if (query.classId && !this.isAdmin(user.roles)) {
      await this.assertTeacherClassAccess(query.classId, user);
    }

    const classConditions: SQL[] = [];
    if (!this.isAdmin(user.roles)) {
      classConditions.push(eq(classes.teacherId, user.userId));
    }
    if (query.classId) {
      classConditions.push(eq(classes.id, query.classId));
    }

    const teacherClassRows = await this.db.query.classes.findMany({
      where: classConditions.length > 0 ? and(...classConditions) : undefined,
      columns: {
        id: true,
        subjectName: true,
        subjectCode: true,
        schoolYear: true,
        teacherId: true,
      },
      with: {
        section: {
          columns: {
            id: true,
            name: true,
            gradeLevel: true,
          },
        },
      },
      orderBy: [asc(classes.subjectName)],
    });
    const classIds = teacherClassRows.map((row) => row.id);

    const classRecordConditions: SQL[] = [eq(classRecords.status, 'finalized')];
    if (classIds.length > 0) {
      classRecordConditions.push(inArray(classRecords.classId, classIds));
    }
    if (query.gradingPeriod) {
      classRecordConditions.push(
        eq(classRecords.gradingPeriod, query.gradingPeriod),
      );
    }

    const classRecordRows =
      classIds.length > 0
        ? await this.db.query.classRecords.findMany({
            where: and(...classRecordConditions),
            columns: {
              id: true,
              classId: true,
              gradingPeriod: true,
            },
            with: {
              finalGrades: {
                columns: {
                  studentId: true,
                },
              },
            },
            orderBy: [asc(classRecords.classId)],
          })
        : [];

    const relevantClassIds = Array.from(
      new Set(classRecordRows.map((row) => row.classId)),
    );
    const [jaRows, lxpRows, completedCaseRows, submissionRows] =
      await Promise.all([
        relevantClassIds.length > 0
          ? this.db.query.jaSessions.findMany({
              where: and(
                inArray(jaSessions.classId, relevantClassIds),
                eq(jaSessions.status, 'completed'),
              ),
              columns: {
                classId: true,
                studentId: true,
              },
            })
          : Promise.resolve<
              Array<{ classId: string | null; studentId: string | null }>
            >([]),
        relevantClassIds.length > 0
          ? this.db.query.lxpProgress.findMany({
              where: inArray(lxpProgress.classId, relevantClassIds),
              columns: {
                classId: true,
                studentId: true,
                checkpointsCompleted: true,
              },
            })
          : Promise.resolve<
              Array<{
                classId: string | null;
                studentId: string | null;
                checkpointsCompleted: number | null;
              }>
            >([]),
        relevantClassIds.length > 0
          ? this.db.query.interventionCases.findMany({
              where: and(
                inArray(interventionCases.classId, relevantClassIds),
                eq(interventionCases.status, 'completed'),
              ),
              columns: {
                classId: true,
                studentId: true,
              },
            })
          : Promise.resolve<
              Array<{ classId: string | null; studentId: string | null }>
            >([]),
        classIds.length > 0
          ? this.db.query.teacherEvaluationSubmissions.findMany({
              where: and(
                inArray(teacherEvaluationSubmissions.classId, classIds),
                eq(
                  teacherEvaluationSubmissions.evaluationType,
                  query.evaluationType,
                ),
                ...(query.classId
                  ? [eq(teacherEvaluationSubmissions.classId, query.classId)]
                  : []),
                ...(query.gradingPeriod
                  ? [
                      eq(
                        teacherEvaluationSubmissions.gradingPeriod,
                        query.gradingPeriod,
                      ),
                    ]
                  : []),
              ),
              columns: {
                id: true,
                classId: true,
                gradingPeriod: true,
                ratingsJson: true,
                comment: true,
                submittedAt: true,
              },
            })
          : Promise.resolve<
              Array<{
                id: string;
                classId: string;
                gradingPeriod: string;
                ratingsJson: Record<string, unknown> | null;
                comment: string | null;
                submittedAt: Date;
              }>
            >([]),
      ]);

    const jaUsageMap = new Map<string, Set<string>>();
    for (const row of jaRows) {
      if (!row.classId || !row.studentId) continue;
      const current = jaUsageMap.get(row.classId) ?? new Set<string>();
      current.add(row.studentId);
      jaUsageMap.set(row.classId, current);
    }

    const lxpUsageMap = new Map<string, Set<string>>();
    for (const row of lxpRows) {
      if (!row.classId || !row.studentId) continue;
      if ((row.checkpointsCompleted ?? 0) <= 0) continue;
      const current = lxpUsageMap.get(row.classId) ?? new Set<string>();
      current.add(row.studentId);
      lxpUsageMap.set(row.classId, current);
    }
    for (const row of completedCaseRows) {
      if (!row.classId || !row.studentId) continue;
      const current = lxpUsageMap.get(row.classId) ?? new Set<string>();
      current.add(row.studentId);
      lxpUsageMap.set(row.classId, current);
    }

    const eligibleWindows = classRecordRows
      .map((record) => {
        const matchingClass = teacherClassRows.find(
          (cls) => cls.id === record.classId,
        );
        if (!matchingClass) return null;

        const studentIds = record.finalGrades.map((grade) => grade.studentId);
        let eligibleStudentIds = studentIds;
        if (query.evaluationType === 'ja_hub') {
          const jaUsedIds = jaUsageMap.get(record.classId) ?? new Set<string>();
          eligibleStudentIds = studentIds.filter((studentId) =>
            jaUsedIds.has(studentId),
          );
        } else if (query.evaluationType === 'learners_path') {
          const lxpUsedIds =
            lxpUsageMap.get(record.classId) ?? new Set<string>();
          eligibleStudentIds = studentIds.filter((studentId) =>
            lxpUsedIds.has(studentId),
          );
        }

        return {
          classId: record.classId,
          gradingPeriod: record.gradingPeriod,
          eligibleCount: eligibleStudentIds.length,
          class: matchingClass,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .filter((row) => row.eligibleCount > 0);

    const activeWindows = eligibleWindows.filter(
      (row) =>
        (!query.classId || row.classId === query.classId) &&
        (!query.gradingPeriod || row.gradingPeriod === query.gradingPeriod),
    );

    const definition = this.getTeacherEvaluationDefinition(
      query.evaluationType,
    );
    const ratingTotals = Object.fromEntries(
      definition.categories.map((category) => [category.key, 0]),
    ) as Record<string, number>;
    const ratingCounts = Object.fromEntries(
      definition.categories.map((category) => [category.key, 0]),
    ) as Record<string, number>;

    for (const submission of submissionRows) {
      const ratings = (submission.ratingsJson ?? {}) as Record<string, unknown>;
      for (const category of definition.categories) {
        const value = this.toNumber(ratings[category.key] as number | string);
        if (value === null) continue;
        ratingTotals[category.key] += value;
        ratingCounts[category.key] += 1;
      }
    }

    const categoryAverages = definition.categories.map((category) => ({
      key: category.key,
      label: category.label,
      average:
        ratingCounts[category.key] > 0
          ? Math.round(
              (ratingTotals[category.key] / ratingCounts[category.key]) * 100,
            ) / 100
          : 0,
    }));
    const averageOverall =
      categoryAverages.length > 0
        ? Math.round(
            (categoryAverages.reduce((sum, item) => sum + item.average, 0) /
              categoryAverages.length) *
              100,
          ) / 100
        : 0;

    const comments = submissionRows
      .filter((submission) => submission.comment?.trim())
      .sort(
        (left, right) =>
          new Date(right.submittedAt).getTime() -
          new Date(left.submittedAt).getTime(),
      )
      .slice(0, 20)
      .map((submission) => {
        const matchingClass = teacherClassRows.find(
          (cls) => cls.id === submission.classId,
        );
        return {
          id: submission.id,
          comment: submission.comment?.trim() ?? '',
          submittedAt: submission.submittedAt,
          gradingPeriod: submission.gradingPeriod,
          classId: submission.classId,
          classLabel: matchingClass
            ? `${matchingClass.subjectCode} | ${matchingClass.subjectName}`
            : submission.classId,
        };
      });

    const trends = activeWindows
      .map((window) => {
        const matchingSubmissions = submissionRows.filter(
          (submission) =>
            submission.classId === window.classId &&
            submission.gradingPeriod === window.gradingPeriod,
        );
        return {
          classId: window.classId,
          gradingPeriod: window.gradingPeriod,
          classLabel: `${window.class.subjectCode} | ${window.class.subjectName}`,
          responseCount: matchingSubmissions.length,
          eligibleCount: window.eligibleCount,
        };
      })
      .sort((left, right) => {
        if (left.gradingPeriod !== right.gradingPeriod) {
          return (
            this.quarterSortValue(left.gradingPeriod) -
            this.quarterSortValue(right.gradingPeriod)
          );
        }
        return left.classLabel.localeCompare(right.classLabel);
      });

    return {
      classes: teacherClassRows.map((row) => ({
        id: row.id,
        subjectName: row.subjectName,
        subjectCode: row.subjectCode,
        section: row.section,
      })),
      periods: Array.from(
        new Set(classRecordRows.map((row) => row.gradingPeriod)),
      ).sort(
        (left, right) =>
          this.quarterSortValue(left) - this.quarterSortValue(right),
      ),
      evaluationType: query.evaluationType,
      tabTitle: definition.title,
      tabDescription: definition.description,
      overview: {
        responseCount: submissionRows.length,
        eligibleCount: activeWindows.reduce(
          (sum, item) => sum + item.eligibleCount,
          0,
        ),
        responseRate:
          activeWindows.length > 0
            ? Math.round(
                (submissionRows.length /
                  Math.max(
                    activeWindows.reduce(
                      (sum, item) => sum + item.eligibleCount,
                      0,
                    ),
                    1,
                  )) *
                  100,
              )
            : 0,
        averageOverall,
        latestSubmittedAt: submissionRows[0]?.submittedAt ?? null,
      },
      categoryAverages,
      comments,
      trends,
    };
  }

  async getMySystemEvaluationDashboard(user: UserContext) {
    if (!user.roles.includes('student') && !user.roles.includes('teacher')) {
      throw new ForbiddenException(
        'Only students and teachers can view assigned evaluations.',
      );
    }

    const respondentRole: SystemEvaluationAudienceRole = user.roles.includes(
      'teacher',
    )
      ? 'teacher'
      : 'student';

    const assignmentRows =
      await this.db.query.systemEvaluationAssignments.findMany({
        where: and(
          eq(systemEvaluationAssignments.respondentId, user.userId),
          eq(systemEvaluationAssignments.respondentRole, respondentRole),
        ),
        with: {
          campaign: {
            columns: {
              id: true,
              formType: true,
              targetModule: true,
              title: true,
              audienceRole: true,
              classId: true,
              startsAt: true,
              endsAt: true,
              status: true,
            },
            with: {
              class: {
                columns: {
                  id: true,
                  subjectName: true,
                  subjectCode: true,
                },
                with: {
                  section: {
                    columns: {
                      id: true,
                      name: true,
                      gradeLevel: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: [desc(systemEvaluationAssignments.createdAt)],
      });

    const allowedRows = assignmentRows.filter((row) => {
      if (!row.campaign) return false;
      if (respondentRole === 'teacher' && row.campaign.formType !== 'system') {
        return false;
      }
      return true;
    });

    const pending = allowedRows
      .filter(
        (row) =>
          row.status === 'pending' && this.isSystemCampaignOpen(row.campaign),
      )
      .map((row) => this.formatSystemEvaluationAssignment(row));

    const completed = allowedRows
      .filter((row) => row.status === 'submitted')
      .map((row) => this.formatSystemEvaluationAssignment(row));

    return { pending, completed };
  }

  async submitAssignedSystemEvaluation(
    assignmentId: string,
    user: UserContext,
    dto: SubmitAssignedSystemEvaluationDto,
  ) {
    const assignment =
      await this.db.query.systemEvaluationAssignments.findFirst({
        where: eq(systemEvaluationAssignments.id, assignmentId),
        with: {
          campaign: true,
        },
      });

    if (!assignment?.campaign) {
      throw new NotFoundException('Evaluation assignment not found.');
    }
    if (assignment.respondentId !== user.userId) {
      throw new ForbiddenException('This evaluation is not assigned to you.');
    }
    if (!user.roles.includes(assignment.respondentRole)) {
      throw new ForbiddenException(
        'Your role cannot submit this evaluation assignment.',
      );
    }
    if (assignment.status === 'submitted') {
      throw new BadRequestException('This evaluation was already submitted.');
    }
    if (!this.isSystemCampaignOpen(assignment.campaign)) {
      throw new BadRequestException('This evaluation campaign is not open.');
    }
    if (
      assignment.respondentRole === 'teacher' &&
      assignment.campaign.formType !== 'system'
    ) {
      throw new ForbiddenException(
        'Teachers can only answer system evaluations.',
      );
    }

    const definition = this.getSystemEvaluationDefinition(
      assignment.campaign.formType,
    );
    if (!definition.audienceRoles.includes(assignment.respondentRole)) {
      throw new ForbiddenException(
        'This role is not allowed to answer this evaluation form.',
      );
    }

    const { normalized, legacyScores } =
      this.normalizeSystemEvaluationQuestionRatings(
        assignment.campaign.formType,
        dto.questionRatings ?? {},
      );

    const [created] = await this.db
      .insert(systemEvaluations)
      .values({
        campaignId: assignment.campaign.id,
        submittedBy: user.userId,
        targetModule: assignment.campaign.targetModule,
        usabilityScore: legacyScores.usabilityScore,
        functionalityScore: legacyScores.functionalityScore,
        performanceScore: legacyScores.performanceScore,
        satisfactionScore: legacyScores.satisfactionScore,
        overallScore: legacyScores.overallScore,
        questionRatingsJson: normalized,
        feedback: dto.feedback?.trim() ? dto.feedback.trim() : null,
      })
      .returning();

    await this.db
      .update(systemEvaluationAssignments)
      .set({
        status: 'submitted',
        submittedEvaluationId: created.id,
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(systemEvaluationAssignments.id, assignmentId));

    await this.auditService.log({
      actorId: user.userId,
      action: 'lxp.system_evaluation_assignment.submitted',
      targetType: 'system_evaluation_assignment',
      targetId: assignmentId,
      metadata: {
        campaignId: assignment.campaign.id,
        formType: assignment.campaign.formType,
        targetModule: assignment.campaign.targetModule,
        hasFeedback: Boolean(dto.feedback?.trim()),
      },
    });

    return created;
  }

  async createSystemEvaluationCampaign(
    user: UserContext,
    dto: CreateSystemEvaluationCampaignDto,
  ) {
    if (!this.isAdmin(user.roles) && !this.isTeacher(user.roles)) {
      throw new ForbiddenException(
        'Only teachers and admins can create evaluation campaigns.',
      );
    }

    const definition = this.getSystemEvaluationDefinition(dto.formType);
    if (!definition.audienceRoles.includes(dto.audienceRole)) {
      throw new BadRequestException(
        `${dto.formType} evaluations cannot target ${dto.audienceRole} respondents.`,
      );
    }
    const { start, end } = this.normalizeDateRange(dto.startsAt, dto.endsAt);
    const status = dto.status ?? 'draft';

    if (!this.isAdmin(user.roles)) {
      if (dto.audienceRole !== 'student' || !dto.classId) {
        throw new ForbiddenException(
          'Teachers can only launch class-scoped student campaigns.',
        );
      }
      await this.assertTeacherClassAccess(dto.classId, user);
    }

    const [created] = await this.db
      .insert(systemEvaluationCampaigns)
      .values({
        createdBy: user.userId,
        formType: dto.formType,
        targetModule: definition.targetModule,
        audienceRole: dto.audienceRole,
        classId: dto.classId ?? null,
        title: dto.title.trim(),
        startsAt: start,
        endsAt: end,
        status,
        updatedAt: new Date(),
      })
      .returning();

    const assignmentCount =
      status === 'active'
        ? await this.createAssignmentsForSystemCampaign(created)
        : 0;

    await this.auditService.log({
      actorId: user.userId,
      action: 'lxp.system_evaluation_campaign.created',
      targetType: 'system_evaluation_campaign',
      targetId: created.id,
      metadata: {
        formType: created.formType,
        audienceRole: created.audienceRole,
        classId: created.classId,
        status: created.status,
        assignmentCount,
      },
    });

    return { ...created, assignmentCount };
  }

  async listSystemEvaluationCampaigns(
    user: UserContext,
    query: ListSystemEvaluationCampaignsQueryDto = {},
  ) {
    if (!this.isAdmin(user.roles) && !this.isTeacher(user.roles)) {
      throw new ForbiddenException(
        'Only teachers and admins can view evaluation campaigns.',
      );
    }

    const conditions: SQL[] = [];
    if (query.formType) {
      conditions.push(eq(systemEvaluationCampaigns.formType, query.formType));
    }
    if (query.audienceRole) {
      conditions.push(
        eq(systemEvaluationCampaigns.audienceRole, query.audienceRole),
      );
    }
    if (query.status) {
      conditions.push(eq(systemEvaluationCampaigns.status, query.status));
    }
    if (query.classId) {
      conditions.push(eq(systemEvaluationCampaigns.classId, query.classId));
    }
    if (!this.isAdmin(user.roles)) {
      const teacherClasses = await this.db.query.classes.findMany({
        where: eq(classes.teacherId, user.userId),
        columns: { id: true },
      });
      const teacherClassIds = teacherClasses.map((cls) => cls.id);
      conditions.push(
        teacherClassIds.length > 0
          ? or(
              eq(systemEvaluationCampaigns.createdBy, user.userId),
              inArray(systemEvaluationCampaigns.classId, teacherClassIds),
            )!
          : eq(systemEvaluationCampaigns.createdBy, user.userId),
      );
    }

    const campaigns = await this.db.query.systemEvaluationCampaigns.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        class: {
          columns: { id: true, subjectName: true, subjectCode: true },
          with: {
            section: { columns: { id: true, name: true, gradeLevel: true } },
          },
        },
        assignments: {
          columns: { id: true, status: true },
        },
      },
      orderBy: [desc(systemEvaluationCampaigns.createdAt)],
    });

    const mapped = campaigns.map((campaign) => ({
      id: campaign.id,
      formType: campaign.formType,
      targetModule: campaign.targetModule,
      audienceRole: campaign.audienceRole,
      classId: campaign.classId,
      class: campaign.class ?? null,
      title: campaign.title,
      startsAt: campaign.startsAt,
      endsAt: campaign.endsAt,
      status: campaign.status,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
      assignmentCount: campaign.assignments?.length ?? 0,
      submittedCount:
        campaign.assignments?.filter((item) => item.status === 'submitted')
          .length ?? 0,
    }));

    return { campaigns: mapped, count: mapped.length };
  }

  async updateSystemEvaluationCampaignStatus(
    campaignId: string,
    user: UserContext,
    dto: UpdateSystemEvaluationCampaignStatusDto,
  ) {
    const campaign = await this.db.query.systemEvaluationCampaigns.findFirst({
      where: eq(systemEvaluationCampaigns.id, campaignId),
      columns: {
        id: true,
        createdBy: true,
        classId: true,
        audienceRole: true,
        status: true,
      },
    });
    if (!campaign) {
      throw new NotFoundException('System evaluation campaign not found.');
    }
    await this.assertSystemEvaluationCampaignAccess(campaign, user);

    const [updated] = await this.db
      .update(systemEvaluationCampaigns)
      .set({ status: dto.status, updatedAt: new Date() })
      .where(eq(systemEvaluationCampaigns.id, campaignId))
      .returning();

    const assignmentCount =
      dto.status === 'active'
        ? await this.createAssignmentsForSystemCampaign(updated)
        : 0;

    await this.auditService.log({
      actorId: user.userId,
      action: 'lxp.system_evaluation_campaign.status_updated',
      targetType: 'system_evaluation_campaign',
      targetId: campaignId,
      metadata: { status: dto.status, assignmentCount },
    });

    return { ...updated, assignmentCount };
  }

  async submitSystemEvaluation(
    user: UserContext,
    dto: SubmitSystemEvaluationDto,
  ) {
    const [created] = await this.db
      .insert(systemEvaluations)
      .values({
        submittedBy: user.userId,
        targetModule: dto.targetModule,
        usabilityScore: dto.usabilityScore,
        functionalityScore: dto.functionalityScore,
        performanceScore: dto.performanceScore,
        satisfactionScore: dto.satisfactionScore,
        feedback: dto.feedback ?? null,
        aiContextMetadata: dto.aiContextMetadata ?? null,
      })
      .returning();

    await this.auditService.log({
      actorId: user.userId,
      action: 'lxp.system_evaluation.submitted',
      targetType: 'system_evaluation',
      targetId: created.id,
      metadata: {
        targetModule: dto.targetModule,
        usabilityScore: dto.usabilityScore,
        functionalityScore: dto.functionalityScore,
        performanceScore: dto.performanceScore,
        satisfactionScore: dto.satisfactionScore,
        hasFeedback: Boolean(dto.feedback?.trim()),
        hasAiContextMetadata: Boolean(dto.aiContextMetadata),
      },
    });

    return created;
  }

  async listSystemEvaluations(
    user: UserContext,
    query: ListSystemEvaluationsQueryDto = {},
  ) {
    if (!this.isAdmin(user.roles)) {
      throw new ForbiddenException(
        'Only admins can view platform evaluation results.',
      );
    }

    const targetModule = query.targetModule;
    let targetFilter: SystemEvaluationTarget | undefined;
    if (targetModule !== undefined) {
      if (!systemEvaluationTargetEnum.enumValues.includes(targetModule)) {
        throw new BadRequestException(
          `targetModule must be one of: ${systemEvaluationTargetEnum.enumValues.join(', ')}`,
        );
      }
      targetFilter = targetModule;
    }

    const conditions: SQL[] = [];
    if (targetFilter) {
      conditions.push(eq(systemEvaluations.targetModule, targetFilter));
    }
    if (query.aiClassId) {
      conditions.push(
        sql`${systemEvaluations.aiContextMetadata} ->> 'classId' = ${query.aiClassId}`,
      );
    }
    if (query.aiSessionType) {
      conditions.push(
        sql`${systemEvaluations.aiContextMetadata} ->> 'sessionType' = ${query.aiSessionType}`,
      );
    }
    if (query.aiSourceFlow) {
      conditions.push(
        sql`${systemEvaluations.aiContextMetadata} ->> 'sourceFlow' = ${query.aiSourceFlow}`,
      );
    }
    if (query.campaignId) {
      conditions.push(eq(systemEvaluations.campaignId, query.campaignId));
    }
    if (query.audienceRole) {
      conditions.push(
        sql`${systemEvaluations.campaignId} in (select id from system_evaluation_campaigns where audience_role = ${query.audienceRole})`,
      );
    }
    if (query.from) {
      conditions.push(gte(systemEvaluations.createdAt, new Date(query.from)));
    }
    if (query.to) {
      conditions.push(lte(systemEvaluations.createdAt, new Date(query.to)));
    }

    const rows = await this.db.query.systemEvaluations.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        submitter: {
          columns: { id: true, firstName: true, lastName: true, email: true },
        },
        campaign: {
          columns: {
            id: true,
            title: true,
            formType: true,
            audienceRole: true,
            status: true,
          },
        },
      },
      orderBy: [desc(systemEvaluations.createdAt)],
      limit: 200,
    });

    const roundToHundredths = (value: number) => Math.round(value * 100) / 100;
    const averageFrom = (total: number, count: number) =>
      count > 0 ? roundToHundredths(total / count) : 0;

    const totals = {
      usabilityScore: 0,
      functionalityScore: 0,
      performanceScore: 0,
      satisfactionScore: 0,
      feedbackCount: 0,
    };
    const moduleBuckets = new Map<
      SystemEvaluationTarget,
      {
        count: number;
        usabilityScore: number;
        functionalityScore: number;
        performanceScore: number;
        satisfactionScore: number;
      }
    >();

    for (const row of rows) {
      const usabilityScore = this.toNumber(row.usabilityScore) ?? 0;
      const functionalityScore = this.toNumber(row.functionalityScore) ?? 0;
      const performanceScore = this.toNumber(row.performanceScore) ?? 0;
      const satisfactionScore = this.toNumber(row.satisfactionScore) ?? 0;

      totals.usabilityScore += usabilityScore;
      totals.functionalityScore += functionalityScore;
      totals.performanceScore += performanceScore;
      totals.satisfactionScore += satisfactionScore;
      if (row.feedback?.trim()) {
        totals.feedbackCount += 1;
      }

      const bucket = moduleBuckets.get(row.targetModule) ?? {
        count: 0,
        usabilityScore: 0,
        functionalityScore: 0,
        performanceScore: 0,
        satisfactionScore: 0,
      };
      bucket.count += 1;
      bucket.usabilityScore += usabilityScore;
      bucket.functionalityScore += functionalityScore;
      bucket.performanceScore += performanceScore;
      bucket.satisfactionScore += satisfactionScore;
      moduleBuckets.set(row.targetModule, bucket);
    }

    return {
      count: rows.length,
      rows,
      summary: {
        averages: {
          usabilityScore: averageFrom(totals.usabilityScore, rows.length),
          functionalityScore: averageFrom(
            totals.functionalityScore,
            rows.length,
          ),
          performanceScore: averageFrom(totals.performanceScore, rows.length),
          satisfactionScore: averageFrom(totals.satisfactionScore, rows.length),
        },
        feedbackCount: totals.feedbackCount,
        moduleBreakdown: Array.from(moduleBuckets.entries()).map(
          ([moduleName, bucket]) => ({
            targetModule: moduleName,
            count: bucket.count,
            averages: {
              usabilityScore: averageFrom(bucket.usabilityScore, bucket.count),
              functionalityScore: averageFrom(
                bucket.functionalityScore,
                bucket.count,
              ),
              performanceScore: averageFrom(
                bucket.performanceScore,
                bucket.count,
              ),
              satisfactionScore: averageFrom(
                bucket.satisfactionScore,
                bucket.count,
              ),
            },
          }),
        ),
      },
    };
  }
}
