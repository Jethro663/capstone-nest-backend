import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { and, desc, eq, inArray, isNull, ne, or } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  academicSystemStates,
  assessmentQuestionOptions,
  assessmentQuestions,
  assessments,
  classModules,
  classRecords,
  classRecordFinalGrades,
  classes,
  enrollments,
  lessonContentBlocks,
  lessons,
  moduleGradingScaleEntries,
  moduleItems,
  moduleSections,
  schoolEvents,
  sections,
  users,
} from '../../drizzle/schema';
import { AuditService } from '../audit/audit.service';
import { TransitionAcademicStateDto } from './DTO/transition-academic-state.dto';

type QuarterKey = 'Q1' | 'Q2' | 'Q3' | 'Q4';

interface AcademicStateRow {
  id: string;
  schoolYear: string;
  quarter: QuarterKey;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type SectionRow = typeof sections.$inferSelect;
type ClassRow = typeof classes.$inferSelect;
type ClassCloneSource = ClassRow & {
  section: SectionRow | null;
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
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  private getDefaultSchoolYear() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const schoolYearStart = now.getMonth() >= 5 ? currentYear : currentYear - 1;
    return `${schoolYearStart}-${schoolYearStart + 1}`;
  }

  private assertValidSchoolYear(schoolYear: string) {
    const match = schoolYear.match(/^(\d{4})-(\d{4})$/);
    if (!match) {
      throw new BadRequestException(
        'schoolYear must follow YYYY-YYYY format',
      );
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

  private async ensureCurrentState(): Promise<AcademicStateRow> {
    const existing = await this.db.query.academicSystemStates.findFirst({
      orderBy: [desc(academicSystemStates.updatedAt)],
    });

    if (existing) {
      return existing as AcademicStateRow;
    }

    const [created] = await this.db
      .insert(academicSystemStates)
      .values({
        id: this.singletonStateId,
        schoolYear: this.getDefaultSchoolYear(),
        quarter: 'Q1',
        updatedBy: null,
      })
      .returning();

    return created as AcademicStateRow;
  }
  private getEmptyPromotionReadiness() {
    return {
      activeStudentsInCurrentYear: 0,
      studentsMissingFinalizedGrades: 0,
      transitionBlocked: false,
      message: null as string | null,
    };
  }

  private async getPromotionTransitionReadiness(sectionIds: string[]) {
    const emptyReadiness = this.getEmptyPromotionReadiness();
    if (sectionIds.length === 0) {
      return emptyReadiness;
    }

    const activeSectionEnrollments = await this.db
      .select({
        sectionId: enrollments.sectionId,
        studentId: enrollments.studentId,
      })
      .from(enrollments)
      .where(
        and(
          inArray(enrollments.sectionId, sectionIds),
          eq(enrollments.status, 'enrolled'),
          isNull(enrollments.classId),
        ),
      );

    const activeStudentIds = new Set(
      activeSectionEnrollments.map((enrollment) => enrollment.studentId),
    );

    if (activeStudentIds.size === 0) {
      return emptyReadiness;
    }

    const recordRows = await this.db
      .select({
        sectionId: classes.sectionId,
        classRecordId: classRecords.id,
        status: classRecords.status,
      })
      .from(classRecords)
      .innerJoin(classes, eq(classes.id, classRecords.classId))
      .where(inArray(classes.sectionId, sectionIds));

    const recordCountsBySectionId = new Map<
      string,
      { totalRecords: number; finalizedRecords: number }
    >();
    for (const row of recordRows) {
      const current = recordCountsBySectionId.get(row.sectionId) ?? {
        totalRecords: 0,
        finalizedRecords: 0,
      };
      current.totalRecords += 1;
      if (['finalized', 'locked'].includes(row.status)) {
        current.finalizedRecords += 1;
      }
      recordCountsBySectionId.set(row.sectionId, current);
    }

    const finalGradeRows = await this.db
      .select({
        sectionId: classes.sectionId,
        studentId: classRecordFinalGrades.studentId,
        classRecordId: classRecordFinalGrades.classRecordId,
      })
      .from(classRecordFinalGrades)
      .innerJoin(
        classRecords,
        eq(classRecords.id, classRecordFinalGrades.classRecordId),
      )
      .innerJoin(classes, eq(classes.id, classRecords.classId))
      .where(inArray(classes.sectionId, sectionIds));

    const finalGradeRecordIdsBySectionStudent = new Map<string, Set<string>>();
    for (const row of finalGradeRows) {
      const key = `${row.sectionId}:${row.studentId}`;
      const current = finalGradeRecordIdsBySectionStudent.get(key) ?? new Set<string>();
      current.add(row.classRecordId);
      finalGradeRecordIdsBySectionStudent.set(key, current);
    }

    const missingFinalizedGradeStudentIds = new Set<string>();
    for (const enrollment of activeSectionEnrollments) {
      const sectionId = enrollment.sectionId;
      if (!sectionId) continue;

      const counts = recordCountsBySectionId.get(sectionId) ?? {
        totalRecords: 0,
        finalizedRecords: 0,
      };
      const finalGradeRecordCount =
        finalGradeRecordIdsBySectionStudent.get(
          `${sectionId}:${enrollment.studentId}`,
        )?.size ?? 0;
      const isFinalized =
        counts.totalRecords > 0 &&
        counts.finalizedRecords >= counts.totalRecords &&
        finalGradeRecordCount >= counts.totalRecords;

      if (!isFinalized) {
        missingFinalizedGradeStudentIds.add(enrollment.studentId);
      }
    }

    const activeStudentsInCurrentYear = activeStudentIds.size;
    const studentsMissingFinalizedGrades = missingFinalizedGradeStudentIds.size;

    return {
      activeStudentsInCurrentYear,
      studentsMissingFinalizedGrades,
      transitionBlocked: activeStudentsInCurrentYear > 0,
      message:
        activeStudentsInCurrentYear > 0
          ? `${activeStudentsInCurrentYear} student(s) are still active in the current school year. Finalize grades, then move up passing students and retain failing students before transitioning.`
          : null,
    };
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
      promotionReadiness: this.getEmptyPromotionReadiness(),
    };

    const noTransition = fromState.schoolYear === toState.schoolYear;
    if (noTransition) {
      return emptyTargets;
    }

    const draftRecords = await this.db
      .select({ id: classRecords.id })
      .from(classRecords)
      .innerJoin(classes, eq(classes.id, classRecords.classId))
      .where(
        and(
          eq(classRecords.status, 'draft'),
          eq(classRecords.gradingPeriod, fromState.quarter),
          eq(classes.schoolYear, fromState.schoolYear),
        ),
      );

    const classRecordIdsToFinalize = draftRecords.map((record) => record.id);

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
      orderBy: (section, { asc }) => [asc(section.gradeLevel), asc(section.name)],
    })) as SectionRow[];

    const sourceClasses = (await this.db.query.classes.findMany({
      where: and(
        eq(classes.schoolYear, fromState.schoolYear),
        eq(classes.isActive, true),
      ),
      with: {
        section: true,
      },
      orderBy: (classRow, { asc }) => [
        asc(classRow.subjectGradeLevel),
        asc(classRow.subjectName),
      ],
    })) as ClassCloneSource[];

    const sectionIdsToArchive = sourceSections.map((section) => section.id);
    const classIdsToArchive = sourceClasses.map((classRow) => classRow.id);
    const promotionReadiness = await this.getPromotionTransitionReadiness(
      sectionIdsToArchive,
    );

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
      targetSections.map((section) => [getSectionCloneKey(section), section.id]),
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
    const sourceAssessmentIds = sourceAssessments.map((assessment: any) => assessment.id);
    const sourceQuestions = sourceAssessmentIds.length
      ? await database.query.assessmentQuestions.findMany({
          where: inArray(assessmentQuestions.assessmentId, sourceAssessmentIds),
          orderBy: (table: typeof assessmentQuestions, { asc }: any) => [
            asc(table.assessmentId),
            asc(table.order),
          ],
        })
      : [];
    const sourceQuestionIds = sourceQuestions.map((question: any) => question.id);
    const sourceOptions = sourceQuestionIds.length
      ? await database.query.assessmentQuestionOptions.findMany({
          where: inArray(assessmentQuestionOptions.questionId, sourceQuestionIds),
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
          templateSourceId: sourceAssessment.templateSourceId ?? sourceAssessment.id,
          classRecordCategory: sourceAssessment.classRecordCategory,
          quarter: sourceAssessment.quarter,
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
    const [sourceModuleSections, sourceScaleEntries] = sourceModuleIds.length
      ? await Promise.all([
          database.query.moduleSections.findMany({
            where: inArray(moduleSections.moduleId, sourceModuleIds),
            orderBy: (table: typeof moduleSections, { asc }: any) => [
              asc(table.moduleId),
              asc(table.order),
            ],
          }),
          database.query.moduleGradingScaleEntries.findMany({
            where: inArray(moduleGradingScaleEntries.moduleId, sourceModuleIds),
            orderBy: (table: typeof moduleGradingScaleEntries, { asc }: any) => [
              asc(table.moduleId),
              asc(table.order),
            ],
          }),
        ])
      : [[], []];
    const sourceModuleSectionIds = sourceModuleSections.map((section: any) => section.id);
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
        const targetSectionId = moduleSectionIdMap.get(sourceItem.moduleSectionId);
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
    const state = await this.ensureCurrentState();
    return {
      schoolYear: state.schoolYear,
      quarter: state.quarter,
      updatedAt: state.updatedAt,
      updatedBy: state.updatedBy,
      transitionConfirmationText:
        AcademicStateService.TRANSITION_CONFIRMATION_TEXT,
    };
  }

  async getImpactPreview(schoolYear: string) {
    this.assertValidSchoolYear(schoolYear);
    const current = await this.ensureCurrentState();
    const target = {
      schoolYear,
      quarter: current.quarter,
    };
    const impact = await this.getTransitionTargets(current, target);

    return {
      current: {
        schoolYear: current.schoolYear,
        quarter: current.quarter,
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
      },
      transitionConfirmationText:
        AcademicStateService.TRANSITION_CONFIRMATION_TEXT,
    };
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

    const current = await this.ensureCurrentState();
    const target = {
      schoolYear: dto.schoolYear,
      quarter: current.quarter,
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
      if (impactTargets.classRecordIdsToFinalize.length > 0) {
        await tx
          .update(classRecords)
          .set({
            status: 'finalized',
            updatedAt: now,
          })
          .where(inArray(classRecords.id, impactTargets.classRecordIdsToFinalize));
      }

      if (impactTargets.enrollmentIdsToComplete.length > 0) {
        await tx
          .update(enrollments)
          .set({ status: 'completed' })
          .where(inArray(enrollments.id, impactTargets.enrollmentIdsToComplete));
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
          .where(inArray(schoolEvents.id, impactTargets.schoolEventIdsToArchive));
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
              cardBannerUrl: section.cardBannerUrl,
              adviserId: null,
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
        targetSections.map((section) => [getSectionCloneKey(section), section.id]),
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
            classCloneCandidates.map(({ sourceClass, targetSectionId }) => ({
              subjectName: sourceClass.subjectName,
              subjectCode: sourceClass.subjectCode,
              subjectGradeLevel: sourceClass.subjectGradeLevel,
              sectionId: targetSectionId,
              teacherId: null,
              room: sourceClass.room,
              cardPreset: sourceClass.cardPreset,
              cardBannerUrl: sourceClass.cardBannerUrl,
              schoolYear: target.schoolYear,
              writtenWorkGradingWeight:
                sourceClass.writtenWorkGradingWeight,
              performanceTaskGradingWeight:
                sourceClass.performanceTaskGradingWeight,
              quarterlyAssessmentGradingWeight:
                sourceClass.quarterlyAssessmentGradingWeight,
              isActive: true,
              createdAt: now,
              updatedAt: now,
            })),
          )
          .onConflictDoNothing()
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

        learningAssetCounts = await this.cloneClassLearningAssets(
          tx,
          sourceToTargetClassId,
          now,
        );
      }

      await tx
        .insert(academicSystemStates)
        .values({
          id: this.singletonStateId,
          schoolYear: target.schoolYear,
          quarter: target.quarter,
          updatedBy: actorId,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: academicSystemStates.id,
          set: {
            schoolYear: target.schoolYear,
            quarter: target.quarter,
            updatedBy: actorId,
            updatedAt: now,
          },
        });
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
        reusableClassesCreated: classesCreated,
        classSchedulesCloned: 0,
        classSchedulesCleared: true,
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
        reusableClassesCreated: classesCreated,
        classSchedulesCloned: 0,
        classSchedulesCleared: true,
        reusableContentCloned: learningAssetCounts,
      },
    };
  }
}
