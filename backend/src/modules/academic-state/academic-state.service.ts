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
type ClassScheduleRow = typeof classSchedules.$inferSelect;
type ClassCloneSource = ClassRow & {
  section: SectionRow | null;
  schedules: ClassScheduleRow[];
};

type AutomaticStudentOutcome = {
  studentId: string;
  sourceGradeLevel: string;
  targetGradeLevel: '7' | '8' | '9' | '10' | null;
  outcome: 'promoted' | 'retained' | 'graduated';
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
      studentsToPromote: 0,
      studentsToRetain: 0,
      studentsToGraduate: 0,
      transitionBlocked: false,
      message: null as string | null,
      studentOutcomes: [] as AutomaticStudentOutcome[],
    };
  }

  private classifyStudentOutcome(input: {
    studentId: string;
    sourceGradeLevel: '7' | '8' | '9' | '10';
    subjectFinalGrades: number[][];
  }): AutomaticStudentOutcome {
    const hasFailingSubject = input.subjectFinalGrades.some(
      (grades) =>
        grades.length === 0 ||
        grades.reduce((sum, grade) => sum + grade, 0) / grades.length < 75,
    );

    if (hasFailingSubject) {
      return {
        studentId: input.studentId,
        sourceGradeLevel: input.sourceGradeLevel,
        targetGradeLevel: input.sourceGradeLevel,
        outcome: 'retained',
      };
    }

    if (input.sourceGradeLevel === '10') {
      return {
        studentId: input.studentId,
        sourceGradeLevel: input.sourceGradeLevel,
        targetGradeLevel: null,
        outcome: 'graduated',
      };
    }

    return {
      studentId: input.studentId,
      sourceGradeLevel: input.sourceGradeLevel,
      targetGradeLevel: String(Number(input.sourceGradeLevel) + 1) as
        | '8'
        | '9'
        | '10',
      outcome: 'promoted',
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
        ),
      );

    const uniqueActiveSectionEnrollments = Array.from(
      new Map(
        activeSectionEnrollments
          .filter((enrollment) => enrollment.sectionId)
          .map((enrollment) => [
            enrollment.sectionId + ':' + enrollment.studentId,
            enrollment,
          ]),
      ).values(),
    );

    const activeStudentIds = new Set(
      uniqueActiveSectionEnrollments.map((enrollment) => enrollment.studentId),
    );

    if (activeStudentIds.size === 0) {
      return emptyReadiness;
    }

    const recordRows = await this.db
      .select({
        sectionId: classes.sectionId,
        classId: classes.id,
        classRecordId: classRecords.id,
        status: classRecords.status,
      })
      .from(classRecords)
      .innerJoin(classes, eq(classes.id, classRecords.classId))
      .where(
        and(inArray(classes.sectionId, sectionIds), eq(classes.isActive, true)),
      );

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
        classId: classes.id,
        studentId: classRecordFinalGrades.studentId,
        classRecordId: classRecordFinalGrades.classRecordId,
        finalPercentage: classRecordFinalGrades.finalPercentage,
      })
      .from(classRecordFinalGrades)
      .innerJoin(
        classRecords,
        eq(classRecords.id, classRecordFinalGrades.classRecordId),
      )
      .innerJoin(classes, eq(classes.id, classRecords.classId))
      .where(
        and(inArray(classes.sectionId, sectionIds), eq(classes.isActive, true)),
      );

    const finalGradesBySectionStudent = new Map<
      string,
      Array<{
        classId: string;
        classRecordId: string;
        finalPercentage: number;
      }>
    >();
    for (const row of finalGradeRows) {
      const key = `${row.sectionId}:${row.studentId}`;
      const current = finalGradesBySectionStudent.get(key) ?? [];
      current.push({
        classId: row.classId,
        classRecordId: row.classRecordId,
        finalPercentage: Number(row.finalPercentage),
      });
      finalGradesBySectionStudent.set(key, current);
    }

    const sectionGradeRows = await this.db
      .select({ id: sections.id, gradeLevel: sections.gradeLevel })
      .from(sections)
      .where(inArray(sections.id, sectionIds));
    const gradeLevelBySectionId = new Map(
      sectionGradeRows.map((section) => [section.id, section.gradeLevel]),
    );

    const missingFinalizedGradeStudentIds = new Set<string>();
    const studentOutcomes: AutomaticStudentOutcome[] = [];
    for (const enrollment of uniqueActiveSectionEnrollments) {
      const sectionId = enrollment.sectionId;
      if (!sectionId) continue;

      const counts = recordCountsBySectionId.get(sectionId) ?? {
        totalRecords: 0,
        finalizedRecords: 0,
      };
      const studentFinalGrades =
        finalGradesBySectionStudent.get(
          `${sectionId}:${enrollment.studentId}`,
        ) ?? [];
      const finalGradeRecordCount = new Set(
        studentFinalGrades.map((grade) => grade.classRecordId),
      ).size;
      const isFinalized =
        counts.totalRecords > 0 &&
        counts.finalizedRecords >= counts.totalRecords &&
        finalGradeRecordCount >= counts.totalRecords;

      if (!isFinalized) {
        missingFinalizedGradeStudentIds.add(enrollment.studentId);
        continue;
      }

      const finalGradesByClassId = new Map<string, number[]>();
      for (const grade of studentFinalGrades) {
        const current = finalGradesByClassId.get(grade.classId) ?? [];
        current.push(grade.finalPercentage);
        finalGradesByClassId.set(grade.classId, current);
      }
      const sourceGradeLevel = gradeLevelBySectionId.get(sectionId);
      if (
        !sourceGradeLevel ||
        !['7', '8', '9', '10'].includes(sourceGradeLevel)
      ) {
        missingFinalizedGradeStudentIds.add(enrollment.studentId);
        continue;
      }

      studentOutcomes.push(
        this.classifyStudentOutcome({
          studentId: enrollment.studentId,
          sourceGradeLevel: sourceGradeLevel as '7' | '8' | '9' | '10',
          subjectFinalGrades: Array.from(finalGradesByClassId.values()),
        }),
      );
    }

    const activeStudentsInCurrentYear = activeStudentIds.size;
    const studentsMissingFinalizedGrades = missingFinalizedGradeStudentIds.size;
    const studentsToPromote = studentOutcomes.filter(
      (student) => student.outcome === 'promoted',
    ).length;
    const studentsToRetain = studentOutcomes.filter(
      (student) => student.outcome === 'retained',
    ).length;
    const studentsToGraduate = studentOutcomes.filter(
      (student) => student.outcome === 'graduated',
    ).length;

    return {
      activeStudentsInCurrentYear,
      studentsMissingFinalizedGrades,
      studentsToPromote,
      studentsToRetain,
      studentsToGraduate,
      transitionBlocked: studentsMissingFinalizedGrades > 0,
      message:
        studentsMissingFinalizedGrades > 0
          ? `${studentsMissingFinalizedGrades} active student(s) still need complete, finalized subject grades before transitioning.`
          : activeStudentsInCurrentYear > 0
            ? `${studentsToPromote} student(s) will move up, ${studentsToRetain} will be retained, and ${studentsToGraduate} will graduate automatically.`
            : null,
      studentOutcomes,
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
    const promotionReadiness =
      await this.getPromotionTransitionReadiness(sectionIdsToArchive);

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
            orderBy: (
              table: typeof moduleGradingScaleEntries,
              { asc }: any,
            ) => [asc(table.moduleId), asc(table.order)],
          }),
        ])
      : [[], []];
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

  async notifyUnfinalizedTeachers(actorId: string) {
    const current = await this.ensureCurrentState();

    const activeClassRows = await this.db
      .select({
        classId: classes.id,
        subjectName: classes.subjectName,
        teacherId: classes.teacherId,
        sectionId: sections.id,
        sectionName: sections.name,
        sectionGradeLevel: sections.gradeLevel,
        classRecordId: classRecords.id,
        classRecordStatus: classRecords.status,
      })
      .from(classes)
      .innerJoin(sections, eq(sections.id, classes.sectionId))
      .leftJoin(classRecords, eq(classRecords.classId, classes.id))
      .where(
        and(
          eq(classes.schoolYear, current.schoolYear),
          eq(classes.isActive, true),
        ),
      );

    if (activeClassRows.length === 0) {
      return {
        message: 'No active classes with teacher assignments were found.',
        notifiedClassesCount: 0,
        notifiedTeachersCount: 0,
        details: [],
      };
    }

    const classesById = new Map<
      string,
      {
        classRow: (typeof activeClassRows)[number];
        statuses: Array<string | null>;
      }
    >();
    for (const row of activeClassRows) {
      if (!row.teacherId) continue;
      const currentClass = classesById.get(row.classId) ?? {
        classRow: row,
        statuses: [],
      };
      currentClass.statuses.push(row.classRecordStatus ?? null);
      classesById.set(row.classId, currentClass);
    }

    const uniqueClasses = Array.from(classesById.values()).map(
      ({ classRow, statuses }) => ({
        ...classRow,
        allRecordsFinalized:
          statuses.length > 0 &&
          statuses.every(
            (status) =>
              status !== null && ['finalized', 'locked'].includes(status),
          ),
      }),
    );
    if (uniqueClasses.length === 0) {
      return {
        message: 'No active teacher assignments found for the school year.',
        notifiedClassesCount: 0,
        notifiedTeachersCount: 0,
        details: [],
      };
    }

    const notificationInputs = uniqueClasses.map((item) => ({
      userId: item.teacherId!,
      type: 'grade_finalization_requested' as const,
      referenceId: item.classId,
      title: `Grade Finalization Reminder: ${item.subjectName}`,
      body: item.allRecordsFinalized
        ? `Your class records for ${item.subjectName} (Grade ${item.sectionGradeLevel} - ${item.sectionName}) are finalized. This is a reminder that the school year transition is pending.`
        : `School year transition is pending. Please complete and finalize all class records for ${item.subjectName} (Grade ${item.sectionGradeLevel} - ${item.sectionName}).`,
      metadata: {
        classId: item.classId,
        sectionId: item.sectionId,
        subjectName: item.subjectName,
        sectionName: item.sectionName,
        gradeLevel: item.sectionGradeLevel,
        allRecordsFinalized: item.allRecordsFinalized,
        view: 'class-record',
      },
    }));

    await this.notificationsService.createBulk(notificationInputs);

    for (const n of notificationInputs) {
      this.notificationsGateway.emitToUser(n.userId, {
        id: `gen-${Date.now()}-${n.referenceId || 'ref'}`,
        type: n.type,
        title: n.title,
        body: n.body,
        referenceId: n.referenceId,
        metadata: n.metadata,
        createdAt: new Date(),
      });
    }

    const notifiedTeacherIds = new Set(uniqueClasses.map((c) => c.teacherId!));

    await this.auditService.log({
      actorId,
      action: 'academic_state.teachers_notified',
      targetType: 'academic_state',
      targetId: this.singletonStateId,
      metadata: {
        schoolYear: current.schoolYear,
        notifiedClassesCount: uniqueClasses.length,
        notifiedTeachersCount: notifiedTeacherIds.size,
      },
    });

    return {
      message: `Sent ${notificationInputs.length} reminder(s) to ${notifiedTeacherIds.size} teacher(s) across ${uniqueClasses.length} active subject(s).`,
      notifiedClassesCount: uniqueClasses.length,
      notifiedTeachersCount: notifiedTeacherIds.size,
      details: uniqueClasses.map((item) => ({
        classId: item.classId,
        subjectName: item.subjectName,
        sectionName: item.sectionName,
        gradeLevel: item.sectionGradeLevel,
        teacherId: item.teacherId,
        allRecordsFinalized: item.allRecordsFinalized,
      })),
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
      for (const student of impactTargets.promotionReadiness.studentOutcomes ??
        []) {
        if (student.outcome === 'promoted' && student.targetGradeLevel) {
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

      if (impactTargets.classRecordIdsToFinalize.length > 0) {
        await tx
          .update(classRecords)
          .set({
            status: 'finalized',
            updatedAt: now,
          })
          .where(
            inArray(classRecords.id, impactTargets.classRecordIdsToFinalize),
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
            classCloneCandidates.map(({ sourceClass, targetSectionId }) => ({
              subjectName: sourceClass.subjectName,
              subjectCode: sourceClass.subjectCode,
              subjectGradeLevel: sourceClass.subjectGradeLevel,
              sectionId: targetSectionId,
              teacherId: sourceClass.teacherId,
              room: sourceClass.room,
              cardPreset: sourceClass.cardPreset,
              cardBannerUrl: sourceClass.cardBannerUrl,
              schoolYear: target.schoolYear,
              writtenWorkGradingWeight: sourceClass.writtenWorkGradingWeight,
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
        classSchedulesCloned,
        classSchedulesCleared: false,
        studentsPromoted: impactTargets.promotionReadiness.studentsToPromote,
        studentsRetained: impactTargets.promotionReadiness.studentsToRetain,
        studentsGraduated: impactTargets.promotionReadiness.studentsToGraduate,
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
        classSchedulesCloned,
        classSchedulesCleared: false,
        studentsPromoted: impactTargets.promotionReadiness.studentsToPromote,
        studentsRetained: impactTargets.promotionReadiness.studentsToRetain,
        studentsGraduated: impactTargets.promotionReadiness.studentsToGraduate,
        reusableContentCloned: learningAssetCounts,
      },
    };
  }
}
