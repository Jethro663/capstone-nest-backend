import {
  resolveRolloverPeriod,
  RolloverPeriodMapping,
} from './rollover-period';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import { AcademicMutation } from '../../database/academic-transaction';
import { AcademicPolicyService } from './academic-policy.service';
import { AcademicTransitionReadinessService } from './academic-transition-readiness.service';
import { getSubjectWeights } from './academic-policy';
import type { TransitionBlocker } from './academic-transition-readiness';
import { and, eq, inArray, isNull, ne, or } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  academicSystemStates,
  assessmentQuestionOptions,
  assessmentQuestions,
  assessments,
  classModules,
  classRecords,
  academicStudentYearOutcomes,
  academicReminderRuns,
  classSchedules,
  classes,
  enrollments,
  lessonContentBlocks,
  lessons,
  moduleGradingScaleEntries,
  moduleItems,
  moduleSections,
  schoolEvents,
  sections,
  studentProfiles,
  users,
} from '../../drizzle/schema';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { TransitionAcademicStateDto } from './DTO/transition-academic-state.dto';

type QuarterKey = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface AcademicReminderResult {
  message: string;
  notifiedTeachersCount: number;
  notifiedClassesCount: number;
  details: Array<{
    teacherId: string;
    blockers: TransitionBlocker[];
    classIds: string[];
  }>;
  replayed: boolean;
}

interface AcademicStateRow {
  id: string;
  schoolYear: string;
  quarter: QuarterKey;
  updatedBy: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

type SectionRow = typeof sections.$inferSelect;
type ClassRow = typeof classes.$inferSelect;
type ClassScheduleRow = typeof classSchedules.$inferSelect;
type ClassCloneSource = ClassRow & {
  section: SectionRow | null;
  schedules: ClassScheduleRow[];
};

function getSectionCloneKey(section: Pick<SectionRow, 'name' | 'gradeLevel'>) {
  return `${section.name}::${section.gradeLevel}`;
}

function getTargetClassCloneKey(subjectCode: string, sectionId: string) {
  return `${subjectCode}::${sectionId}`;
}

@Injectable()
export class AcademicStateService {
  static readonly TRANSITION_CONFIRMATION_TEXT =
    'CONFIRM ACADEMIC STATE TRANSITION';

  private readonly singletonStateId = '00000000-0000-0000-0000-000000000001';

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly policyService: AcademicPolicyService,
    private readonly readinessService: AcademicTransitionReadinessService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  private assertValidSchoolYear(schoolYear: string) {
    const match = schoolYear.match(/^(\d{4})-(\d{4})$/);
    if (!match) {
      throw new BadRequestException('schoolYear must follow YYYY-YYYY format');
    }

    if (Number(match[2]) !== Number(match[1]) + 1) {
      throw new BadRequestException(
        'schoolYear must represent consecutive years (e.g. 2025-2026)',
      );
    }
  }

  private async verifyAdminPassword(userId: string, password: string) {
    const actor = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        password: true,
      },
    });

    if (!actor) {
      throw new ForbiddenException('Unable to validate step-up credentials');
    }

    const passwordMatches = await bcrypt.compare(password, actor.password);
    if (!passwordMatches) {
      throw new ForbiddenException(
        'Step-up authentication failed: password did not match',
      );
    }
  }

  private async getTransitionTargets(
    fromState: AcademicStateRow,
    toState: { schoolYear: string; quarter: QuarterKey },
  ) {
    const emptyTargets = {
      classRecordIdsToFinalize: [] as string[],
      schoolEventIdsToArchive: [] as string[],
      classIdsToArchive: [] as string[],
      sectionIdsToArchive: [] as string[],
      enrollmentIdsToComplete: [] as string[],
      sectionsToClone: [] as SectionRow[],
      classesToClone: [] as ClassCloneSource[],
      promotionReadiness: await this.readinessService.getReadiness(
        fromState.schoolYear,
      ),
    };

    const noTransition = fromState.schoolYear === toState.schoolYear;
    if (noTransition) {
      return emptyTargets;
    }

    // Kept in the response for older clients; transition never finalizes drafts.
    const classRecordIdsToFinalize: string[] = [];

    const schoolEventIdsToArchive = (
      await this.db
        .select({ id: schoolEvents.id })
        .from(schoolEvents)
        .where(
          and(
            isNull(schoolEvents.archivedAt),
            ne(schoolEvents.schoolYear, toState.schoolYear),
          ),
        )
    ).map((event) => event.id);

    const sourceSections = (await this.db.query.sections.findMany({
      where: and(
        eq(sections.schoolYear, fromState.schoolYear),
        eq(sections.isActive, true),
      ),
      orderBy: (section, { asc }) => [
        asc(section.gradeLevel),
        asc(section.name),
      ],
    })) as SectionRow[];

    const sourceClasses = (await this.db.query.classes.findMany({
      where: and(
        eq(classes.schoolYear, fromState.schoolYear),
        eq(classes.isActive, true),
      ),
      with: {
        section: true,
        schedules: true,
      },
      orderBy: (classRow, { asc }) => [
        asc(classRow.subjectGradeLevel),
        asc(classRow.subjectName),
      ],
    })) as ClassCloneSource[];

    const sectionIdsToArchive = sourceSections.map((section) => section.id);
    const classIdsToArchive = sourceClasses.map((classRow) => classRow.id);
    const promotionReadiness = emptyTargets.promotionReadiness;

    const enrollmentScope =
      sectionIdsToArchive.length > 0 && classIdsToArchive.length > 0
        ? or(
            inArray(enrollments.sectionId, sectionIdsToArchive),
            inArray(enrollments.classId, classIdsToArchive),
          )
        : sectionIdsToArchive.length > 0
          ? inArray(enrollments.sectionId, sectionIdsToArchive)
          : classIdsToArchive.length > 0
            ? inArray(enrollments.classId, classIdsToArchive)
            : undefined;

    const enrollmentIdsToComplete = enrollmentScope
      ? (
          await this.db
            .select({ id: enrollments.id })
            .from(enrollments)
            .where(and(eq(enrollments.status, 'enrolled'), enrollmentScope))
        ).map((enrollment) => enrollment.id)
      : [];

    const targetSections = (await this.db.query.sections.findMany({
      where: eq(sections.schoolYear, toState.schoolYear),
      columns: {
        id: true,
        name: true,
        gradeLevel: true,
      },
    })) as Array<Pick<SectionRow, 'id' | 'name' | 'gradeLevel'>>;

    const targetSectionKeyToId = new Map(
      targetSections.map((section) => [
        getSectionCloneKey(section),
        section.id,
      ]),
    );

    const sectionsToClone = sourceSections.filter((section) => {
      const key = getSectionCloneKey(section);
      if (targetSectionKeyToId.has(key)) return false;
      targetSectionKeyToId.set(key, `pending:${section.id}`);
      return true;
    });

    const targetClasses = await this.db
      .select({
        subjectCode: classes.subjectCode,
        sectionId: classes.sectionId,
      })
      .from(classes)
      .where(eq(classes.schoolYear, toState.schoolYear));

    if (targetSections.length || targetClasses.length) {
      promotionReadiness.blockers.push({
        code: 'target_year_conflict',
        message:
          'The next school year already has sections or classes. Resolve the conflict before cloning.',
      });
      promotionReadiness.transitionBlocked = true;
      promotionReadiness.message =
        'Target school-year structures require reconciliation before transition.';
    }

    const targetClassKeys = new Set(
      targetClasses.map((classRow) =>
        getTargetClassCloneKey(classRow.subjectCode, classRow.sectionId),
      ),
    );
    const sourceSectionsById = new Map(
      sourceSections.map((section) => [section.id, section]),
    );

    const classesToClone = sourceClasses.filter((classRow) => {
      const sourceSection =
        classRow.section ?? sourceSectionsById.get(classRow.sectionId) ?? null;
      if (!sourceSection) return false;

      const targetSectionId = targetSectionKeyToId.get(
        getSectionCloneKey(sourceSection),
      );
      if (!targetSectionId) return false;

      const classKey = getTargetClassCloneKey(
        classRow.subjectCode,
        targetSectionId,
      );
      if (targetClassKeys.has(classKey)) return false;

      targetClassKeys.add(classKey);
      return true;
    });

    return {
      classRecordIdsToFinalize,
      schoolEventIdsToArchive,
      classIdsToArchive,
      sectionIdsToArchive,
      enrollmentIdsToComplete,
      sectionsToClone,
      classesToClone,
      promotionReadiness,
    };
  }

  private async cloneClassLearningAssets(
    database: any,
    classIdMap: Map<string, string>,
    now: Date,
    periodMapping: RolloverPeriodMapping,
    destinationPeriods: string[],
  ) {
    const sourceClassIds = Array.from(classIdMap.keys());
    const counts = {
      assessmentsCreated: 0,
      assessmentQuestionsCreated: 0,
      lessonsCreated: 0,
      lessonBlocksCreated: 0,
      modulesCreated: 0,
      moduleSectionsCreated: 0,
      moduleItemsCreated: 0,
      moduleGradingScaleEntriesCreated: 0,
    };

    if (sourceClassIds.length === 0) return counts;

    const sourceAssessments = await database.query.assessments.findMany({
      where: inArray(assessments.classId, sourceClassIds),
      orderBy: (table: typeof assessments, { asc }: any) => [
        asc(table.classId),
        asc(table.createdAt),
      ],
    });
    const sourceAssessmentIds = sourceAssessments.map(
      (assessment: any) => assessment.id,
    );
    const sourceQuestions = sourceAssessmentIds.length
      ? await database.query.assessmentQuestions.findMany({
          where: inArray(assessmentQuestions.assessmentId, sourceAssessmentIds),
          orderBy: (table: typeof assessmentQuestions, { asc }: any) => [
            asc(table.assessmentId),
            asc(table.order),
          ],
        })
      : [];
    const sourceQuestionIds = sourceQuestions.map(
      (question: any) => question.id,
    );
    const sourceOptions = sourceQuestionIds.length
      ? await database.query.assessmentQuestionOptions.findMany({
          where: inArray(
            assessmentQuestionOptions.questionId,
            sourceQuestionIds,
          ),
          orderBy: (table: typeof assessmentQuestionOptions, { asc }: any) => [
            asc(table.questionId),
            asc(table.order),
          ],
        })
      : [];

    const questionsByAssessment = new Map<string, any[]>();
    for (const question of sourceQuestions) {
      const bucket = questionsByAssessment.get(question.assessmentId) ?? [];
      bucket.push(question);
      questionsByAssessment.set(question.assessmentId, bucket);
    }

    const optionsByQuestion = new Map<string, any[]>();
    for (const option of sourceOptions) {
      const bucket = optionsByQuestion.get(option.questionId) ?? [];
      bucket.push(option);
      optionsByQuestion.set(option.questionId, bucket);
    }

    const assessmentIdMap = new Map<string, string>();
    for (const sourceAssessment of sourceAssessments) {
      const targetClassId = classIdMap.get(sourceAssessment.classId);
      if (!targetClassId) continue;

      const [createdAssessment] = await database
        .insert(assessments)
        .values({
          title: sourceAssessment.title,
          description: sourceAssessment.description,
          classId: targetClassId,
          type: sourceAssessment.type,
          dueDate: null,
          closeWhenDue: sourceAssessment.closeWhenDue,
          randomizeQuestions: sourceAssessment.randomizeQuestions,
          timedQuestionsEnabled: sourceAssessment.timedQuestionsEnabled,
          questionTimeLimitSeconds: sourceAssessment.questionTimeLimitSeconds,
          strictMode: sourceAssessment.strictMode,
          fileUploadInstructions: sourceAssessment.fileUploadInstructions,
          teacherAttachmentFileId: sourceAssessment.teacherAttachmentFileId,
          rubricSourceFileId: sourceAssessment.rubricSourceFileId,
          rubricParseStatus: sourceAssessment.rubricParseStatus,
          rubricParsedAt: sourceAssessment.rubricParsedAt,
          rubricRawText: sourceAssessment.rubricRawText,
          rubricParseError: sourceAssessment.rubricParseError,
          rubricCriteria: sourceAssessment.rubricCriteria,
          allowedUploadMimeTypes: sourceAssessment.allowedUploadMimeTypes,
          allowedUploadExtensions: sourceAssessment.allowedUploadExtensions,
          maxUploadSizeBytes: sourceAssessment.maxUploadSizeBytes,
          totalPoints: sourceAssessment.totalPoints,
          passingScore: sourceAssessment.passingScore,
          maxAttempts: sourceAssessment.maxAttempts,
          timeLimitMinutes: sourceAssessment.timeLimitMinutes,
          isPublished: false,
          feedbackLevel: sourceAssessment.feedbackLevel,
          feedbackDelayHours: sourceAssessment.feedbackDelayHours,
          isCoreTemplateAsset: sourceAssessment.isCoreTemplateAsset,
          templateId: sourceAssessment.templateId,
          templateSourceId:
            sourceAssessment.templateSourceId ?? sourceAssessment.id,
          classRecordCategory: sourceAssessment.classRecordCategory,
          quarter: resolveRolloverPeriod(
            sourceAssessment.quarter,
            periodMapping,
            destinationPeriods,
          ),
          aiOrigin: sourceAssessment.aiOrigin,
          aiGenerationOutputId: sourceAssessment.aiGenerationOutputId,
          createdAt: now,
          updatedAt: now,
        } as any)
        .returning({ id: assessments.id });

      if (!createdAssessment?.id) continue;
      counts.assessmentsCreated += 1;
      assessmentIdMap.set(sourceAssessment.id, createdAssessment.id);

      const questions = questionsByAssessment.get(sourceAssessment.id) ?? [];
      for (const sourceQuestion of questions) {
        const [createdQuestion] = await database
          .insert(assessmentQuestions)
          .values({
            assessmentId: createdAssessment.id,
            type: sourceQuestion.type,
            content: sourceQuestion.content,
            points: sourceQuestion.points,
            order: sourceQuestion.order,
            isRequired: sourceQuestion.isRequired,
            explanation: sourceQuestion.explanation,
            imageUrl: sourceQuestion.imageUrl,
            metadata: sourceQuestion.metadata,
            conceptTags: sourceQuestion.conceptTags,
            createdAt: now,
            updatedAt: now,
          } as any)
          .returning({ id: assessmentQuestions.id });

        if (!createdQuestion?.id) continue;
        counts.assessmentQuestionsCreated += 1;

        const options = optionsByQuestion.get(sourceQuestion.id) ?? [];
        if (options.length > 0) {
          await database.insert(assessmentQuestionOptions).values(
            options.map((sourceOption: any) => ({
              questionId: createdQuestion.id,
              text: sourceOption.text,
              imageUrl: sourceOption.imageUrl,
              isCorrect: sourceOption.isCorrect,
              order: sourceOption.order,
              metadata: sourceOption.metadata,
              createdAt: now,
            })),
          );
        }
      }
    }

    const sourceLessons = await database.query.lessons.findMany({
      where: inArray(lessons.classId, sourceClassIds),
      orderBy: (table: typeof lessons, { asc }: any) => [
        asc(table.classId),
        asc(table.order),
      ],
    });
    const sourceLessonIds = sourceLessons.map((lesson: any) => lesson.id);
    const sourceLessonBlocks = sourceLessonIds.length
      ? await database.query.lessonContentBlocks.findMany({
          where: inArray(lessonContentBlocks.lessonId, sourceLessonIds),
          orderBy: (table: typeof lessonContentBlocks, { asc }: any) => [
            asc(table.lessonId),
            asc(table.order),
          ],
        })
      : [];

    const blocksByLesson = new Map<string, any[]>();
    for (const block of sourceLessonBlocks) {
      const bucket = blocksByLesson.get(block.lessonId) ?? [];
      bucket.push(block);
      blocksByLesson.set(block.lessonId, bucket);
    }

    const lessonIdMap = new Map<string, string>();
    for (const sourceLesson of sourceLessons) {
      const targetClassId = classIdMap.get(sourceLesson.classId);
      if (!targetClassId) continue;

      const [createdLesson] = await database
        .insert(lessons)
        .values({
          title: sourceLesson.title,
          description: sourceLesson.description,
          classId: targetClassId,
          order: sourceLesson.order,
          isDraft: sourceLesson.isDraft,
          sourceExtractionId: sourceLesson.sourceExtractionId,
          isCoreTemplateAsset: sourceLesson.isCoreTemplateAsset,
          templateId: sourceLesson.templateId,
          templateSourceId: sourceLesson.templateSourceId ?? sourceLesson.id,
          createdAt: now,
          updatedAt: now,
        } as any)
        .returning({ id: lessons.id });

      if (!createdLesson?.id) continue;
      counts.lessonsCreated += 1;
      lessonIdMap.set(sourceLesson.id, createdLesson.id);

      const blocks = blocksByLesson.get(sourceLesson.id) ?? [];
      if (blocks.length > 0) {
        await database.insert(lessonContentBlocks).values(
          blocks.map((sourceBlock: any) => ({
            lessonId: createdLesson.id,
            type: sourceBlock.type,
            order: sourceBlock.order,
            content: sourceBlock.content,
            metadata: sourceBlock.metadata,
            createdAt: now,
            updatedAt: now,
          })),
        );
        counts.lessonBlocksCreated += blocks.length;
      }
    }

    const sourceModules = await database.query.classModules.findMany({
      where: inArray(classModules.classId, sourceClassIds),
      orderBy: (table: typeof classModules, { asc }: any) => [
        asc(table.classId),
        asc(table.order),
      ],
    });
    const sourceModuleIds = sourceModules.map((module: any) => module.id);
    const sourceModuleSections = sourceModuleIds.length
      ? await database.query.moduleSections.findMany({
          where: inArray(moduleSections.moduleId, sourceModuleIds),
          orderBy: (table: typeof moduleSections, { asc }: any) => [
            asc(table.moduleId),
            asc(table.order),
          ],
        })
      : [];
    const sourceScaleEntries = sourceModuleIds.length
      ? await database.query.moduleGradingScaleEntries.findMany({
          where: inArray(moduleGradingScaleEntries.moduleId, sourceModuleIds),
          orderBy: (table: typeof moduleGradingScaleEntries, { asc }: any) => [
            asc(table.moduleId),
            asc(table.order),
          ],
        })
      : [];
    const sourceModuleSectionIds = sourceModuleSections.map(
      (section: any) => section.id,
    );
    const sourceModuleItems = sourceModuleSectionIds.length
      ? await database.query.moduleItems.findMany({
          where: inArray(moduleItems.moduleSectionId, sourceModuleSectionIds),
          orderBy: (table: typeof moduleItems, { asc }: any) => [
            asc(table.moduleSectionId),
            asc(table.order),
          ],
        })
      : [];

    const moduleIdMap = new Map<string, string>();
    for (const sourceModule of sourceModules) {
      const targetClassId = classIdMap.get(sourceModule.classId);
      if (!targetClassId) continue;

      const [createdModule] = await database
        .insert(classModules)
        .values({
          classId: targetClassId,
          title: sourceModule.title,
          description: sourceModule.description,
          order: sourceModule.order,
          isVisible: sourceModule.isVisible,
          isLocked: sourceModule.isLocked,
          teacherNotes: sourceModule.teacherNotes,
          themeKind: sourceModule.themeKind,
          gradientId: sourceModule.gradientId,
          coverImageUrl: sourceModule.coverImageUrl,
          imagePositionX: sourceModule.imagePositionX,
          imagePositionY: sourceModule.imagePositionY,
          imageScale: sourceModule.imageScale,
          isCoreTemplateAsset: sourceModule.isCoreTemplateAsset,
          templateId: sourceModule.templateId,
          templateSourceId: sourceModule.templateSourceId ?? sourceModule.id,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: classModules.id });

      if (!createdModule?.id) continue;
      counts.modulesCreated += 1;
      moduleIdMap.set(sourceModule.id, createdModule.id);
    }

    const scaleEntriesByModule = new Map<string, any[]>();
    for (const entry of sourceScaleEntries) {
      const bucket = scaleEntriesByModule.get(entry.moduleId) ?? [];
      bucket.push(entry);
      scaleEntriesByModule.set(entry.moduleId, bucket);
    }

    for (const [sourceModuleId, targetModuleId] of moduleIdMap.entries()) {
      const entries = scaleEntriesByModule.get(sourceModuleId) ?? [];
      if (entries.length === 0) continue;

      await database.insert(moduleGradingScaleEntries).values(
        entries.map((entry: any) => ({
          moduleId: targetModuleId,
          letter: entry.letter,
          label: entry.label,
          minScore: entry.minScore,
          maxScore: entry.maxScore,
          description: entry.description,
          order: entry.order,
          createdAt: now,
          updatedAt: now,
        })),
      );
      counts.moduleGradingScaleEntriesCreated += entries.length;
    }

    const moduleSectionIdMap = new Map<string, string>();
    for (const sourceSection of sourceModuleSections) {
      const targetModuleId = moduleIdMap.get(sourceSection.moduleId);
      if (!targetModuleId) continue;

      const [createdSection] = await database
        .insert(moduleSections)
        .values({
          moduleId: targetModuleId,
          title: sourceSection.title,
          description: sourceSection.description,
          order: sourceSection.order,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: moduleSections.id });

      if (!createdSection?.id) continue;
      counts.moduleSectionsCreated += 1;
      moduleSectionIdMap.set(sourceSection.id, createdSection.id);
    }

    if (sourceModuleItems.length > 0) {
      const itemValues = sourceModuleItems.flatMap((sourceItem: any) => {
        const targetSectionId = moduleSectionIdMap.get(
          sourceItem.moduleSectionId,
        );
        if (!targetSectionId) return [];

        const metadata =
          sourceItem.metadata && typeof sourceItem.metadata === 'object'
            ? { ...(sourceItem.metadata as Record<string, unknown>) }
            : {};
        if (sourceItem.fileId) {
          metadata.sourceFileId = sourceItem.fileId;
        }

        return [
          {
            moduleSectionId: targetSectionId,
            itemType: sourceItem.itemType,
            lessonId: sourceItem.lessonId
              ? (lessonIdMap.get(sourceItem.lessonId) ?? null)
              : null,
            assessmentId: sourceItem.assessmentId
              ? (assessmentIdMap.get(sourceItem.assessmentId) ?? null)
              : null,
            fileId: null,
            order: sourceItem.order,
            isVisible: sourceItem.isVisible,
            isRequired: sourceItem.isRequired,
            isGiven: sourceItem.isGiven,
            isCoreTemplateAsset: sourceItem.isCoreTemplateAsset,
            templateId: sourceItem.templateId,
            templateSourceId: sourceItem.templateSourceId ?? sourceItem.id,
            metadata,
            createdAt: now,
            updatedAt: now,
          },
        ];
      });

      if (itemValues.length > 0) {
        await database.insert(moduleItems).values(itemValues);
        counts.moduleItemsCreated += itemValues.length;
      }
    }

    return counts;
  }

  async getCurrentState() {
    const state = await this.policyService.currentState();
    return {
      ...state,
      transitionConfirmationText:
        AcademicStateService.TRANSITION_CONFIRMATION_TEXT,
    };
  }

  @AcademicMutation()
  async getImpactPreview(schoolYear: string) {
    this.assertValidSchoolYear(schoolYear);
    const current = await this.policyService.currentState();
    const expectedNextYear = `${Number(current.schoolYear.slice(0, 4)) + 1}-${Number(current.schoolYear.slice(0, 4)) + 2}`;
    if (schoolYear !== expectedNextYear)
      throw new BadRequestException(
        'Target must be the immediate next school year',
      );
    const targetPolicy = await this.policyService.forYear(schoolYear);
    const target = { schoolYear, quarter: targetPolicy.periods[0].key };
    const impact = await this.getTransitionTargets(current, target);
    const clonedClassIds = impact.classesToClone.map((cls) => cls.id);
    const copiedAssessments = clonedClassIds.length
      ? await this.db.query.assessments.findMany({
          where: inArray(assessments.classId, clonedClassIds),
          columns: { quarter: true },
        })
      : [];
    const assessmentPeriodSources = [
      ...new Set(copiedAssessments.map((item) => item.quarter || 'unassigned')),
    ];

    return {
      current: {
        schoolYear: current.schoolYear,
        quarter: current.quarter,
        version: current.version,
      },
      target,
      impact: {
        classRecordsToFinalize: impact.classRecordIdsToFinalize.length,
        enrollmentsToComplete: impact.enrollmentIdsToComplete.length,
        classesToArchive: impact.classIdsToArchive.length,
        sectionsToArchive: impact.sectionIdsToArchive.length,
        schoolEventsToArchive: impact.schoolEventIdsToArchive.length,
        reusableSectionsToCreate: impact.sectionsToClone.length,
        reusableClassesToCreate: impact.classesToClone.length,
        promotionReadiness: impact.promotionReadiness,
        assessmentPeriodSources,
        destinationPeriods: targetPolicy.periods,
      },
      transitionConfirmationText:
        AcademicStateService.TRANSITION_CONFIRMATION_TEXT,
    };
  }

  @AcademicMutation()
  async notifyUnfinalizedTeachers(
    actorId: string,
  ): Promise<AcademicReminderResult> {
    const current = await this.policyService.currentState();
    const readiness = await this.readinessService.getReadiness(
      current.schoolYear,
    );
    const groups = new Map<string, typeof readiness.blockers>();
    for (const blocker of readiness.blockers) {
      if (!blocker.teacherId || !blocker.classId) continue;
      const group = groups.get(blocker.teacherId) ?? [];
      group.push(blocker);
      groups.set(blocker.teacherId, group);
    }
    const details = [...groups]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([teacherId, blockers]) => ({
        teacherId,
        blockers: blockers.sort((a, b) =>
          JSON.stringify(a).localeCompare(JSON.stringify(b)),
        ),
        classIds: [...new Set(blockers.map((b) => b.classId!))].sort(),
      }));
    const fingerprint = createHash('sha256')
      .update(JSON.stringify({ schoolYear: current.schoolYear, details }))
      .digest('hex');
    const windowStart = new Date(
      Math.floor(Date.now() / (15 * 60_000)) * 15 * 60_000,
    );
    const previous = await this.db.query.academicReminderRuns.findFirst({
      where: and(
        eq(academicReminderRuns.fingerprint, fingerprint),
        eq(academicReminderRuns.windowStart, windowStart),
      ),
    });
    if (previous)
      return {
        ...(previous.result as unknown as AcademicReminderResult),
        replayed: true,
      };
    const notificationInputs = details.map((detail) => ({
      userId: detail.teacherId,
      type: 'grade_finalization_requested' as const,
      referenceId: current.id,
      title: `Academic readiness: ${current.schoolYear}`,
      body: `${detail.classIds.length} subject(s) require attention before year-end transition. Open the listed workbooks to resolve missing periods, eligibility, grades, or source evidence.`,
      metadata: {
        schoolYear: current.schoolYear,
        view: 'class-record',
        ...detail,
        destinations: detail.classIds.map((classId) => ({
          classId,
          path: `/dashboard/teacher/classes/${classId}?tab=class-record`,
        })),
      },
    }));
    await this.notificationsService.createBulk(notificationInputs);
    this.databaseService.afterAcademicCommit(() => {
      for (const notification of notificationInputs)
        this.notificationsGateway.emitToUser(notification.userId, {
          ...notification,
          id: `academic-${fingerprint}-${notification.userId}`,
          createdAt: new Date(),
        });
    });
    const result = {
      message: details.length
        ? `Sent grouped reminders to ${details.length} teacher(s).`
        : 'No teacher-actionable readiness issues remain.',
      notifiedTeachersCount: details.length,
      notifiedClassesCount: new Set(details.flatMap((d) => d.classIds)).size,
      details,
      replayed: false,
    };
    await this.db
      .insert(academicReminderRuns)
      .values({ fingerprint, windowStart, result, createdBy: actorId });
    await this.auditService.log({
      actorId,
      action: 'academic_state.teachers_notified',
      targetType: 'academic_state',
      targetId: current.id,
      metadata: { schoolYear: current.schoolYear, fingerprint, ...result },
    });
    return result;
  }

  async transition(dto: TransitionAcademicStateDto, actorId: string) {
    this.assertValidSchoolYear(dto.schoolYear);

    if (
      dto.confirmationText !== AcademicStateService.TRANSITION_CONFIRMATION_TEXT
    ) {
      throw new BadRequestException(
        'confirmationText does not match the required transition phrase',
      );
    }

    await this.verifyAdminPassword(actorId, dto.currentPassword);

    return this.databaseService.academicTransaction(async () => {
      const current = await this.policyService.currentState();
      const states = await this.db.query.academicSystemStates.findMany({
        columns: { id: true },
        limit: 2,
      });
      if (states.length !== 1)
        throw new ConflictException(
          'Multiple academic state rows require repair before transition',
        );
      if (
        current.schoolYear !== dto.expectedSchoolYear ||
        current.quarter !== dto.expectedQuarter ||
        current.version !== dto.expectedVersion
      )
        throw new ConflictException(
          'Academic state changed; refresh readiness before transitioning',
        );
      const expectedNextYear = `${Number(current.schoolYear.slice(0, 4)) + 1}-${Number(current.schoolYear.slice(0, 4)) + 2}`;
      if (dto.schoolYear !== expectedNextYear)
        throw new BadRequestException(
          'Target must be the immediate next school year',
        );
      const targetPolicy = await this.policyService.forYear(dto.schoolYear);
      const target = {
        schoolYear: dto.schoolYear,
        quarter: targetPolicy.periods[0].key,
      };
      const impactTargets = await this.getTransitionTargets(current, target);

      if (impactTargets.promotionReadiness.transitionBlocked) {
        throw new BadRequestException({
          message:
            impactTargets.promotionReadiness.message ??
            'Resolve active student promotion or retention before transitioning the school year.',
          promotionReadiness: impactTargets.promotionReadiness,
        });
      }

      const now = new Date();
      let sectionsCreated = 0;
      let classesCreated = 0;
      let classSchedulesCloned = 0;
      let learningAssetCounts = {
        assessmentsCreated: 0,
        assessmentQuestionsCreated: 0,
        lessonsCreated: 0,
        lessonBlocksCreated: 0,
        modulesCreated: 0,
        moduleSectionsCreated: 0,
        moduleItemsCreated: 0,
        moduleGradingScaleEntriesCreated: 0,
      };

      await this.db.transaction(async (tx) => {
        const promotedStudentsByGrade = new Map<'8' | '9' | '10', string[]>();
        const graduatedStudentIds: string[] = [];
        for (const student of impactTargets.promotionReadiness
          .studentOutcomes ?? []) {
          if (
            ['promoted', 'conditionally_promoted'].includes(student.outcome) &&
            student.targetGradeLevel
          ) {
            const targetGrade = student.targetGradeLevel as '8' | '9' | '10';
            const studentIds = promotedStudentsByGrade.get(targetGrade) ?? [];
            studentIds.push(student.studentId);
            promotedStudentsByGrade.set(targetGrade, studentIds);
          } else if (student.outcome === 'graduated') {
            graduatedStudentIds.push(student.studentId);
          }
        }

        for (const [gradeLevel, studentIds] of promotedStudentsByGrade) {
          await tx
            .update(studentProfiles)
            .set({ gradeLevel, graduatedAt: null, updatedAt: now })
            .where(inArray(studentProfiles.userId, studentIds));
        }

        if (graduatedStudentIds.length > 0) {
          await tx
            .update(studentProfiles)
            .set({ graduatedAt: now, updatedAt: now })
            .where(inArray(studentProfiles.userId, graduatedStudentIds));
        }

        if (impactTargets.promotionReadiness.studentOutcomes.length) {
          await tx.insert(academicStudentYearOutcomes).values(
            impactTargets.promotionReadiness.studentOutcomes.map((student) => ({
              schoolYear: current.schoolYear,
              studentId: student.studentId,
              sourceGradeLevel: student.sourceGradeLevel,
              targetGradeLevel: student.targetGradeLevel,
              outcome: student.outcome,
              evidence: {
                policy: current.policy,
                annualGradeIds: student.annualGradeIds,
                remediationResultIds: student.remediationResultIds,
                backSubjectIds: student.backSubjectIds,
                stateVersion: current.version,
              },
              recordedBy: actorId,
            })),
          );
        }

        if (impactTargets.enrollmentIdsToComplete.length > 0) {
          await tx
            .update(enrollments)
            .set({ status: 'completed' })
            .where(
              inArray(enrollments.id, impactTargets.enrollmentIdsToComplete),
            );
        }

        if (impactTargets.classIdsToArchive.length > 0) {
          await tx
            .update(classes)
            .set({
              isActive: false,
              updatedAt: now,
            })
            .where(inArray(classes.id, impactTargets.classIdsToArchive));
        }

        if (impactTargets.sectionIdsToArchive.length > 0) {
          await tx
            .update(sections)
            .set({
              isActive: false,
              isArchived: true,
              archivedAt: now,
              updatedAt: now,
            })
            .where(inArray(sections.id, impactTargets.sectionIdsToArchive));
        }

        if (impactTargets.schoolEventIdsToArchive.length > 0) {
          await tx
            .update(schoolEvents)
            .set({
              archivedAt: now,
              updatedAt: now,
            })
            .where(
              inArray(schoolEvents.id, impactTargets.schoolEventIdsToArchive),
            );
        }

        if (impactTargets.sectionsToClone.length > 0) {
          const insertedSections = await tx
            .insert(sections)
            .values(
              impactTargets.sectionsToClone.map((section) => ({
                name: section.name,
                gradeLevel: section.gradeLevel,
                schoolYear: target.schoolYear,
                capacity: section.capacity,
                roomNumber: section.roomNumber,
                cardPreset: section.cardPreset,
                cardBannerUrl: section.cardBannerUrl,
                adviserId: section.adviserId,
                isArchived: false,
                archivedAt: null,
                isActive: true,
                createdAt: now,
                updatedAt: now,
              })),
            )
            .onConflictDoNothing()
            .returning({ id: sections.id });

          sectionsCreated = insertedSections.length;
        }

        const targetSections = (await tx.query.sections.findMany({
          where: eq(sections.schoolYear, target.schoolYear),
          columns: {
            id: true,
            name: true,
            gradeLevel: true,
          },
        })) as Array<Pick<SectionRow, 'id' | 'name' | 'gradeLevel'>>;

        const targetSectionIdByKey = new Map(
          targetSections.map((section) => [
            getSectionCloneKey(section),
            section.id,
          ]),
        );

        const existingTargetClasses = await tx
          .select({
            subjectCode: classes.subjectCode,
            sectionId: classes.sectionId,
          })
          .from(classes)
          .where(eq(classes.schoolYear, target.schoolYear));

        const reservedClassKeys = new Set(
          existingTargetClasses.map((classRow) =>
            getTargetClassCloneKey(classRow.subjectCode, classRow.sectionId),
          ),
        );

        const classCloneCandidates = impactTargets.classesToClone.flatMap(
          (sourceClass) => {
            const sourceSection = sourceClass.section;
            if (!sourceSection) return [];

            const targetSectionId = targetSectionIdByKey.get(
              getSectionCloneKey(sourceSection),
            );
            if (!targetSectionId) return [];

            const classKey = getTargetClassCloneKey(
              sourceClass.subjectCode,
              targetSectionId,
            );
            if (reservedClassKeys.has(classKey)) return [];

            reservedClassKeys.add(classKey);
            return [{ sourceClass, targetSectionId, classKey }];
          },
        );

        if (classCloneCandidates.length > 0) {
          const insertedClasses = await tx
            .insert(classes)
            .values(
              classCloneCandidates.map(({ sourceClass, targetSectionId }) => {
                const weights = getSubjectWeights(
                  targetPolicy,
                  sourceClass.subjectCode,
                  sourceClass.subjectName,
                  sourceClass.academicWeightProfile,
                );
                return {
                  subjectName: sourceClass.subjectName,
                  subjectCode: sourceClass.subjectCode,
                  subjectGradeLevel: sourceClass.subjectGradeLevel,
                  sectionId: targetSectionId,
                  teacherId: sourceClass.teacherId,
                  room: sourceClass.room,
                  cardPreset: sourceClass.cardPreset,
                  cardBannerUrl: sourceClass.cardBannerUrl,
                  schoolYear: target.schoolYear,
                  writtenWorkGradingWeight:
                    weights?.writtenWork ??
                    sourceClass.writtenWorkGradingWeight,
                  academicWeightProfile: sourceClass.academicWeightProfile,
                  performanceTaskGradingWeight:
                    weights?.performanceTask ??
                    sourceClass.performanceTaskGradingWeight,
                  quarterlyAssessmentGradingWeight:
                    weights?.examination ??
                    sourceClass.quarterlyAssessmentGradingWeight,
                  isActive: true,
                  createdAt: now,
                  updatedAt: now,
                };
              }),
            )
            .returning({
              id: classes.id,
              subjectCode: classes.subjectCode,
              sectionId: classes.sectionId,
            });

          classesCreated = insertedClasses.length;

          const insertedClassIdByKey = new Map(
            insertedClasses.map((classRow) => [
              getTargetClassCloneKey(classRow.subjectCode, classRow.sectionId),
              classRow.id,
            ]),
          );

          const sourceToTargetClassId = new Map<string, string>();
          for (const { sourceClass, classKey } of classCloneCandidates) {
            const targetClassId = insertedClassIdByKey.get(classKey);
            if (targetClassId) {
              sourceToTargetClassId.set(sourceClass.id, targetClassId);
            }
          }

          const scheduleValues = classCloneCandidates.flatMap(
            ({ sourceClass }) => {
              const targetClassId = sourceToTargetClassId.get(sourceClass.id);
              if (!targetClassId) return [];
              return sourceClass.schedules.map((schedule) => ({
                classId: targetClassId,
                days: schedule.days,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                createdAt: now,
                updatedAt: now,
              }));
            },
          );

          if (scheduleValues.length > 0) {
            await tx.insert(classSchedules).values(scheduleValues);
            classSchedulesCloned = scheduleValues.length;
          }

          learningAssetCounts = await this.cloneClassLearningAssets(
            tx,
            sourceToTargetClassId,
            now,
            dto.assessmentPeriodMapping ?? {},
            targetPolicy.periods.map((period) => period.key),
          );
        }

        const [updated] = await tx
          .update(academicSystemStates)
          .set({
            schoolYear: target.schoolYear,
            quarter: target.quarter,
            version: current.version + 1,
            updatedBy: actorId,
            updatedAt: now,
          })
          .where(
            and(
              eq(academicSystemStates.id, current.id),
              eq(academicSystemStates.version, current.version),
            ),
          )
          .returning({ id: academicSystemStates.id });
        if (!updated)
          throw new ConflictException(
            'Academic state changed during transition',
          );
      });

      await this.auditService.log({
        actorId,
        action: 'academic_state.transitioned',
        targetType: 'academic_state',
        targetId: this.singletonStateId,
        metadata: {
          fromSchoolYear: current.schoolYear,
          fromQuarter: current.quarter,
          toSchoolYear: target.schoolYear,
          toQuarter: target.quarter,
          classRecordsFinalized: impactTargets.classRecordIdsToFinalize.length,
          enrollmentsCompleted: impactTargets.enrollmentIdsToComplete.length,
          classesArchived: impactTargets.classIdsToArchive.length,
          sectionsArchived: impactTargets.sectionIdsToArchive.length,
          schoolEventsArchived: impactTargets.schoolEventIdsToArchive.length,
          reusableSectionsCreated: sectionsCreated,
          assessmentPeriodMapping: dto.assessmentPeriodMapping ?? {},
          reusableClassesCreated: classesCreated,
          classSchedulesCloned,
          classSchedulesCleared: false,
          studentsPromoted: impactTargets.promotionReadiness.studentsToPromote,
          studentsRetained: impactTargets.promotionReadiness.studentsToRetain,
          studentsGraduated:
            impactTargets.promotionReadiness.studentsToGraduate,
          studentsConditionallyPromoted:
            impactTargets.promotionReadiness.studentsToConditionallyPromote,
          studentsPendingCompletion:
            impactTargets.promotionReadiness.studentsPendingCompletion,
          reusableContentCloned: learningAssetCounts,
        },
      });

      return {
        state: await this.getCurrentState(),
        impact: {
          classRecordsFinalized: impactTargets.classRecordIdsToFinalize.length,
          enrollmentsCompleted: impactTargets.enrollmentIdsToComplete.length,
          classesArchived: impactTargets.classIdsToArchive.length,
          sectionsArchived: impactTargets.sectionIdsToArchive.length,
          schoolEventsArchived: impactTargets.schoolEventIdsToArchive.length,
          reusableSectionsCreated: sectionsCreated,
          assessmentPeriodMapping: dto.assessmentPeriodMapping ?? {},
          reusableClassesCreated: classesCreated,
          classSchedulesCloned,
          classSchedulesCleared: false,
          studentsPromoted: impactTargets.promotionReadiness.studentsToPromote,
          studentsRetained: impactTargets.promotionReadiness.studentsToRetain,
          studentsGraduated:
            impactTargets.promotionReadiness.studentsToGraduate,
          studentsConditionallyPromoted:
            impactTargets.promotionReadiness.studentsToConditionallyPromote,
          studentsPendingCompletion:
            impactTargets.promotionReadiness.studentsPendingCompletion,
          reusableContentCloned: learningAssetCounts,
        },
      };
    });
  }
}
