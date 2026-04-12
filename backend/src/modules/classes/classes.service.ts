import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  and,
  count,
  desc,
  eq,
  ilike,
  isNull,
  ne,
  inArray,
  notInArray,
  or,
  sql,
  SQL,
} from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  assessments,
  assessmentQuestions,
  assessmentQuestionOptions,
  assessmentAttempts,
  announcements,
  classModules,
  classTemplateAnnouncements,
  classTemplateAssessments,
  classTemplateModuleItems,
  classTemplateModules,
  classTemplateModuleSections,
  classTemplates,
  classSchedules,
  studentClassPresentationPreferences,
  studentCourseViewPreferences,
  classVisibilityPreferences,
  classes,
  classRecordCategories,
  classRecordFinalGrades,
  classRecordItems,
  classRecordScores,
  classRecords,
  sections,
  moduleItems,
  moduleSections,
  users,
  userRoles,
  roles,
  enrollments,
  studentProfiles,
  lessons,
} from '../../drizzle/schema';
import {
  type StudentPresentationMode,
  STUDENT_PRESENTATION_MODES,
} from './DTO/update-student-class-presentation.dto';
import {
  type StudentCourseViewMode,
  STUDENT_COURSE_VIEW_MODES,
} from './DTO/update-student-course-view.dto';
import { normalizeGradeLevel } from '../../common/utils/grade-level.util';
import {
  areSubjectCodesEquivalent,
  normalizeSubjectCode,
} from '../../common/utils/subject-code.util';
import {
  toCalendarSlot,
  timeToMinutes,
} from '../../common/utils/schedule.util';
import { CreateClassDto } from './DTO/create-class.dto';
import { UpdateClassDto } from './DTO/update-class.dto';
import { ScheduleSlotDto } from './DTO/schedule-slot.dto';
import {
  type BulkClassLifecycleAction,
  type BulkClassLifecycleDto,
  type BulkClassLifecycleFailure,
  type BulkClassLifecycleResult,
} from './DTO/bulk-class-lifecycle.dto';
import { AuditService } from '../audit/audit.service';

type StandingComponentKey =
  | 'writtenWorkPercent'
  | 'performanceTaskPercent'
  | 'quarterlyExamPercent';

interface StandingSnapshot {
  gradingPeriod: string;
  overallGradePercent: number;
  components: Record<StandingComponentKey, number | null>;
}

const STUDENT_STYLE_TOKEN_OPTIONS = {
  solid: ['solid-blue', 'solid-green', 'solid-violet'],
  gradient: ['gradient-blue', 'gradient-green', 'gradient-violet'],
  preset: ['preset-blue', 'preset-green', 'preset-violet'],
} as const satisfies Record<StudentPresentationMode, readonly string[]>;

@Injectable()
export class ClassesService {
  constructor(
    private databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  private assertStudentPreferenceReadAccess(
    studentId: string,
    requesterId?: string,
    requesterRoles?: string[],
  ) {
    if (!requesterId || !requesterRoles || requesterRoles.length === 0) {
      throw new ForbiddenException('Unable to verify student preference access');
    }

    if (requesterRoles.includes('student') && requesterId !== studentId) {
      throw new ForbiddenException(
        'You can only view your own course preferences',
      );
    }
  }

  private assertStudentPreferenceWriteAccess(
    requesterId: string,
    requesterRoles: string[],
  ) {
    if (!requesterRoles.includes('student')) {
      throw new ForbiddenException(
        'Only students can update student course preferences',
      );
    }

    if (!requesterId) {
      throw new ForbiddenException(
        'Unable to verify student preference ownership',
      );
    }
  }

  private ensureValidStudentStylePreference(
    styleMode: StudentPresentationMode,
    styleToken: string,
  ) {
    if (!STUDENT_PRESENTATION_MODES.includes(styleMode)) {
      throw new BadRequestException('Unsupported student presentation mode');
    }

    const allowed = STUDENT_STYLE_TOKEN_OPTIONS[styleMode];
    if (!(allowed as readonly string[]).includes(styleToken)) {
      throw new BadRequestException(
        `styleToken must be one of: ${allowed.join(', ')}`,
      );
    }
  }

  private async ensureStudentEnrollment(
    classId: string,
    studentId: string,
    message = 'You can only manage preferences for your enrolled classes',
  ) {
    const enrollment = await this.db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.classId, classId),
        eq(enrollments.studentId, studentId),
        eq(enrollments.status, 'enrolled'),
      ),
      columns: {
        id: true,
      },
    });

    if (!enrollment) {
      throw new ForbiddenException(message);
    }
  }

  private async getEnrolledClassIds(studentId: string) {
    const studentEnrollments = await this.db.query.enrollments.findMany({
      where: and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.status, 'enrolled'),
      ),
      columns: { classId: true },
    });

    return [
      ...new Set(
        studentEnrollments
          .map((entry) => entry.classId)
          .filter((classId): classId is string => Boolean(classId)),
      ),
    ];
  }

  private ensureTeacherCanAccessClass(
    classRecord: { teacherId: string | null },
    requesterId?: string,
    requesterRoles?: string[],
  ) {
    if (
      requesterId &&
      requesterRoles &&
      !requesterRoles.includes('admin') &&
      requesterId !== classRecord.teacherId
    ) {
      throw new ForbiddenException('You can only access your own classes');
    }
  }

  /**
   * Find all classes with optional filters
   */
  async findAll(filters?: {
    subjectId?: string;
    subjectCode?: string;
    subjectName?: string;
    subjectGradeLevel?: '7' | '8' | '9' | '10';
    sectionId?: string;
    teacherId?: string;
    schoolYear?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 50, 100); // Cap max limit
    const offset = (page - 1) * limit;

    const whereConditions: SQL<unknown>[] = [];

    // Support filtering by subject code or subject name
    if (filters?.subjectCode) {
      whereConditions.push(eq(classes.subjectCode, filters.subjectCode));
    }
    if (filters?.subjectName) {
      whereConditions.push(
        ilike(classes.subjectName, `%${filters.subjectName}%`),
      );
    }

    if (filters?.sectionId) {
      whereConditions.push(eq(classes.sectionId, filters.sectionId));
    }

    if (filters?.teacherId) {
      whereConditions.push(eq(classes.teacherId, filters.teacherId));
    }

    if (filters?.schoolYear) {
      whereConditions.push(eq(classes.schoolYear, filters.schoolYear));
    }

    if (filters?.isActive !== undefined) {
      whereConditions.push(eq(classes.isActive, filters.isActive));
    }

    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      const searchCondition = or(
        ilike(classes.subjectName, searchPattern),
        ilike(classes.subjectCode, searchPattern),
        ilike(classes.room, searchPattern),
      );
      if (searchCondition) {
        whereConditions.push(searchCondition);
      }
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [totalRow] = await this.db
      .select({ total: count() })
      .from(classes)
      .where(whereClause);

    const classList = await this.db.query.classes.findMany({
      where: whereClause,
      with: {
        section: true,
        schedules: true,
        teacher: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: (classes, { asc }) => [
        asc(classes.schoolYear),
        asc(classes.createdAt),
      ],
      limit,
      offset,
    });

    return {
      data: classList.map((c) => ({
        ...c,
        schedules: (c.schedules ?? []).map(toCalendarSlot),
      })),
      total: Number(totalRow?.total ?? 0),
      page,
      limit,
    };
  }

  /**
   * Find a class by ID
   */
  async findById(id: string) {
    const classRecord = await this.db.query.classes.findFirst({
      where: eq(classes.id, id),
      with: {
        section: true,
        schedules: true,
        teacher: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!classRecord) {
      throw new NotFoundException(`Class with ID "${id}" not found`);
    }

    return {
      ...classRecord,
      schedules: (classRecord.schedules ?? []).map(toCalendarSlot),
    };
  }

  /**
   * Create a new class
   */
  async create(
    createClassDto: CreateClassDto,
    actorId?: string,
    actorRoles: string[] = [],
  ) {
    const normalizedSubjectCode = normalizeSubjectCode(createClassDto.subjectCode);
    const normalizedSubjectGradeLevel = normalizeGradeLevel(
      createClassDto.subjectGradeLevel,
    );

    // Section check
    const section = await this.db.query.sections.findFirst({
      where: eq(sections.id, createClassDto.sectionId),
    });

    if (!section) {
      throw new BadRequestException(
        `Section with ID "${createClassDto.sectionId}" not found`,
      );
    }

    // Verify the teacher exists and has the teacher (or admin) role
    const teacher = await this.db.query.users.findFirst({
      where: eq(users.id, createClassDto.teacherId),
      with: {
        userRoles: {
          with: { role: { columns: { name: true } } },
        },
      },
      columns: { id: true, firstName: true, lastName: true },
    });

    if (!teacher) {
      throw new BadRequestException(
        `Teacher with ID "${createClassDto.teacherId}" not found`,
      );
    }

    const teacherRoleNames =
      (teacher as any).userRoles?.map((ur: any) => ur.role?.name) ?? [];
    if (
      !teacherRoleNames.includes('teacher') &&
      !teacherRoleNames.includes('admin')
    ) {
      throw new BadRequestException(
        `The specified user does not have a teacher role`,
      );
    }

    const newClassId = await this.db.transaction(async (tx) => {
      const classesForSectionYear = await tx.query.classes.findMany({
        where: and(
          eq(classes.sectionId, createClassDto.sectionId),
          eq(classes.schoolYear, createClassDto.schoolYear),
        ),
        columns: {
          id: true,
          subjectCode: true,
        },
      });

      const existingClass = classesForSectionYear.find((entry) =>
        areSubjectCodesEquivalent(entry.subjectCode, normalizedSubjectCode),
      );

      if (existingClass) {
        throw new ConflictException(
          `Class already exists for this subject, section, and school year`,
        );
      }

      const insertPayload: any = {
        subjectName: createClassDto.subjectName,
        subjectCode: normalizedSubjectCode,
        subjectGradeLevel: normalizedSubjectGradeLevel,
        sectionId: createClassDto.sectionId,
        teacherId: createClassDto.teacherId,
        schoolYear: createClassDto.schoolYear,
        room: createClassDto.room,
        cardPreset: createClassDto.cardPreset ?? 'aurora',
        cardBannerUrl: createClassDto.cardBannerUrl ?? null,
      };

      const [newClass] = await tx.insert(classes).values(insertPayload).returning();

      if (createClassDto.schedules?.length) {
        await this.checkCollisions(
          {
            classId: newClass.id,
            sectionId: createClassDto.sectionId,
            teacherId: createClassDto.teacherId,
            room: createClassDto.room,
            slots: createClassDto.schedules,
          },
          tx,
        );

        await tx.insert(classSchedules).values(
          createClassDto.schedules.map((slot) => ({
            classId: newClass.id,
            days: slot.days,
            startTime: slot.startTime,
            endTime: slot.endTime,
          })),
        );
      }

      if (createClassDto.templateId) {
        await this.applyTemplateToClass(
          tx,
          createClassDto.templateId,
          newClass.id,
          {
            ...createClassDto,
            subjectCode: normalizedSubjectCode,
            subjectGradeLevel: normalizedSubjectGradeLevel,
          },
          actorId ?? createClassDto.teacherId,
        );
      }

      return newClass.id;
    });

    const actorRole = actorRoles.includes('admin')
      ? 'admin'
      : actorRoles.includes('teacher')
        ? 'teacher'
        : 'system';

    await this.auditService.log({
      actorId: actorId ?? createClassDto.teacherId ?? 'system',
      action: 'class.created',
      targetType: 'class',
      targetId: newClassId,
      metadata: {
        actorRole,
        sectionId: createClassDto.sectionId,
        teacherId: createClassDto.teacherId,
        schoolYear: createClassDto.schoolYear,
        hasSchedules: Boolean(createClassDto.schedules?.length),
        templateId: createClassDto.templateId ?? null,
      },
    });

    return this.findById(newClassId);
  }

  private async applyTemplateToClass(
    database: any,
    templateId: string,
    classId: string,
    createClassDto: CreateClassDto,
    actorId: string,
  ) {
    const template = await database.query.classTemplates.findFirst({
      where: eq(classTemplates.id, templateId),
    });

    if (!template) {
      throw new BadRequestException(`Template with ID "${templateId}" not found`);
    }

    if (template.status !== 'published') {
      throw new BadRequestException('Only published templates can be applied');
    }

    if (
      !areSubjectCodesEquivalent(template.subjectCode, createClassDto.subjectCode) ||
      normalizeGradeLevel(template.subjectGradeLevel) !==
        normalizeGradeLevel(createClassDto.subjectGradeLevel)
    ) {
      throw new BadRequestException(
        'Template subjectCode and subjectGradeLevel must exactly match class subject',
      );
    }

    const [templateAssessments, templateModules, templateAnnouncements] =
      await Promise.all([
        database.query.classTemplateAssessments.findMany({
          where: eq(classTemplateAssessments.templateId, templateId),
          orderBy: (table, { asc: byAsc }) => [byAsc(table.order)],
        }),
        database.query.classTemplateModules.findMany({
          where: eq(classTemplateModules.templateId, templateId),
          orderBy: (table, { asc: byAsc }) => [byAsc(table.order)],
        }),
        database.query.classTemplateAnnouncements.findMany({
          where: eq(classTemplateAnnouncements.templateId, templateId),
          orderBy: (table, { asc: byAsc }) => [byAsc(table.order)],
        }),
      ]);

    const assessmentIdMap = new Map<string, string>();
    for (const templateAssessment of templateAssessments) {
      const settings = (templateAssessment.settings ?? {}) as Record<string, unknown>;
      const dueOffset =
        typeof settings.dueDateOffsetDays === 'number'
          ? settings.dueDateOffsetDays
          : templateAssessment.dueDateOffsetDays;
      const dueDate =
        typeof dueOffset === 'number'
          ? new Date(Date.now() + dueOffset * 24 * 60 * 60 * 1000)
          : null;

      const [assessment] = await database
        .insert(assessments)
        .values({
          classId,
          title: templateAssessment.title,
          description: templateAssessment.description,
          type: templateAssessment.type as any,
          dueDate,
          totalPoints: templateAssessment.totalPoints ?? 0,
          isPublished: false,
          randomizeQuestions: Boolean(settings.randomizeQuestions ?? false),
          closeWhenDue: settings.closeWhenDue === undefined ? true : Boolean(settings.closeWhenDue),
          passingScore:
            typeof settings.passingScore === 'number'
              ? settings.passingScore
              : undefined,
          maxAttempts:
            typeof settings.maxAttempts === 'number'
              ? settings.maxAttempts
              : 1,
          isCoreTemplateAsset: true,
          templateId,
          templateSourceId: templateAssessment.id,
        } as any)
        .returning();

      const questionRows = Array.isArray(templateAssessment.questions)
        ? (templateAssessment.questions as any[])
        : [];

      for (let questionIndex = 0; questionIndex < questionRows.length; questionIndex += 1) {
        const templateQuestion = questionRows[questionIndex];
        const [question] = await database
          .insert(assessmentQuestions)
          .values({
            assessmentId: assessment.id,
            type: templateQuestion.type ?? 'multiple_choice',
            content: templateQuestion.content ?? '',
            points: templateQuestion.points ?? 1,
            order: templateQuestion.order ?? questionIndex + 1,
            isRequired: templateQuestion.isRequired ?? true,
            explanation: templateQuestion.explanation ?? null,
            imageUrl: templateQuestion.imageUrl ?? null,
          })
          .returning();

        const options = Array.isArray(templateQuestion.options)
          ? templateQuestion.options
          : [];
        if (options.length > 0) {
          await database.insert(assessmentQuestionOptions).values(
            options.map((option: any, optionIndex: number) => ({
              questionId: question.id,
              text: option.text ?? '',
              isCorrect: option.isCorrect ?? false,
              order: option.order ?? optionIndex + 1,
            })),
          );
        }
      }

      assessmentIdMap.set(templateAssessment.id, assessment.id);
    }

    const templateModuleIds = templateModules.map((module) => module.id);
    const templateSections = templateModuleIds.length
      ? await database.query.classTemplateModuleSections.findMany({
          where: inArray(
            classTemplateModuleSections.templateModuleId,
            templateModuleIds,
          ),
          orderBy: (table, { asc: byAsc }) => [byAsc(table.order)],
        })
      : [];
    const templateSectionIds = templateSections.map((section) => section.id);
    const templateItems = templateSectionIds.length
      ? await database.query.classTemplateModuleItems.findMany({
          where: inArray(
            classTemplateModuleItems.templateSectionId,
            templateSectionIds,
          ),
          orderBy: (table, { asc: byAsc }) => [byAsc(table.order)],
        })
      : [];

    const moduleIdMap = new Map<string, string>();
    for (const templateModule of templateModules) {
      const [module] = await database
        .insert(classModules)
        .values({
          classId,
          title: templateModule.title,
          description: templateModule.description,
          order: templateModule.order,
          themeKind: templateModule.themeKind,
          gradientId: templateModule.gradientId,
          coverImageUrl: templateModule.coverImageUrl,
          imagePositionX: templateModule.imagePositionX,
          imagePositionY: templateModule.imagePositionY,
          imageScale: templateModule.imageScale,
          isVisible: false,
          isLocked: true,
          isCoreTemplateAsset: true,
          templateId,
          templateSourceId: templateModule.id,
        })
        .returning();

      moduleIdMap.set(templateModule.id, module.id);
    }

    const sectionIdMap = new Map<string, string>();
    for (const templateSection of templateSections) {
      const moduleId = moduleIdMap.get(templateSection.templateModuleId);
      if (!moduleId) continue;
      const [section] = await database
        .insert(moduleSections)
        .values({
          moduleId,
          title: templateSection.title,
          description: templateSection.description,
          order: templateSection.order,
        })
        .returning();
      sectionIdMap.set(templateSection.id, section.id);
    }

    for (const templateItem of templateItems) {
      const sectionId = sectionIdMap.get(templateItem.templateSectionId);
      if (!sectionId) continue;
      const mappedAssessmentId = templateItem.templateAssessmentId
        ? assessmentIdMap.get(templateItem.templateAssessmentId) ?? null
        : null;

      await database.insert(moduleItems).values({
        moduleSectionId: sectionId,
        itemType: templateItem.itemType as any,
        assessmentId: mappedAssessmentId,
        order: templateItem.order,
        isVisible: false,
        isGiven: false,
        isRequired: templateItem.isRequired,
        metadata: templateItem.metadata,
        isCoreTemplateAsset: true,
        templateId,
        templateSourceId: templateItem.id,
      });
    }

    for (const templateAnnouncement of templateAnnouncements) {
      await database.insert(announcements).values({
        classId,
        authorId: actorId,
        title: templateAnnouncement.title,
        content: templateAnnouncement.content,
        isPinned: templateAnnouncement.isPinned,
        isVisible: false,
        publishedAt: null,
        isCoreTemplateAsset: true,
        templateId,
        templateSourceId: templateAnnouncement.id,
      });
    }
  }

  /**
   * Update a class
   */
  async update(
    id: string,
    updateClassDto: UpdateClassDto,
    actorId?: string,
    actorRoles: string[] = [],
  ) {
    // Verify class exists
    const existing = await this.findById(id);

    // If updating subject fields, no external lookup required (denormalized fields)
    // We accept subjectName/subjectCode/subjectGradeLevel directly in the DTO.

    // If updating section, verify it exists
    if (updateClassDto.sectionId) {
      const section = await this.db.query.sections.findFirst({
        where: eq(sections.id, updateClassDto.sectionId),
      });

      if (!section) {
        throw new BadRequestException(
          `Section with ID "${updateClassDto.sectionId}" not found`,
        );
      }
    }

    // If updating teacher, verify teacher exists
    if (updateClassDto.teacherId) {
      const teacher = await this.db.query.users.findFirst({
        where: eq(users.id, updateClassDto.teacherId),
      });

      if (!teacher) {
        throw new BadRequestException(
          `Teacher with ID "${updateClassDto.teacherId}" not found`,
        );
      }
    }

    // Separate schedule slots from column-level fields
    const { schedules, ...classFields } = updateClassDto;

    const updatePayload: any = {
      ...classFields,
      updatedAt: new Date(),
    };

    if (updatePayload.subjectGradeLevel) {
      updatePayload.subjectGradeLevel = normalizeGradeLevel(
        String(updatePayload.subjectGradeLevel),
      );
    }

    // Ensure subjectCode is always stored uppercase (mirrors create() behaviour)
    if (updatePayload.subjectCode) {
      updatePayload.subjectCode = updatePayload.subjectCode.toUpperCase();
    }

    await this.db.update(classes).set(updatePayload).where(eq(classes.id, id));

    // Full-replacement of schedule slots when provided (even empty array clears all)
    if (schedules !== undefined) {
      const effectiveSectionId = updateClassDto.sectionId ?? existing.sectionId;
      const effectiveTeacherId = updateClassDto.teacherId ?? existing.teacherId;
      const effectiveRoom = updateClassDto.room ?? existing.room;

      if (schedules.length > 0) {
        await this.checkCollisions({
          classId: id,
          sectionId: effectiveSectionId,
          teacherId: effectiveTeacherId,
          room: effectiveRoom,
          slots: schedules,
          excludeClassId: id,
        });
      }

      // Delete current slots then re-insert
      await this.db
        .delete(classSchedules)
        .where(eq(classSchedules.classId, id));

      if (schedules.length > 0) {
        await this.db.insert(classSchedules).values(
          schedules.map((slot) => ({
            classId: id,
            days: slot.days,
            startTime: slot.startTime,
            endTime: slot.endTime,
          })),
        );
      }
    }

    const changedFields = Object.entries(classFields)
      .filter(([, value]) => value !== undefined)
      .map(([field]) => field);
    if (schedules !== undefined) {
      changedFields.push('schedules');
    }

    const actorRole = actorRoles.includes('admin')
      ? 'admin'
      : actorRoles.includes('teacher')
        ? 'teacher'
        : 'system';

    await this.auditService.log({
      actorId: actorId ?? existing.teacherId ?? 'system',
      action: 'class.updated',
      targetType: 'class',
      targetId: id,
      metadata: {
        actorRole,
        changedFields,
        sectionId: updateClassDto.sectionId ?? existing.sectionId,
        teacherId: updateClassDto.teacherId ?? existing.teacherId,
      },
    });

    return this.findById(id);
  }

  async updatePresentation(
    id: string,
    presentation: { cardPreset?: string; cardBannerUrl?: string | null },
    requesterId: string,
    requesterRoles: string[],
  ) {
    const existing = await this.findById(id);
    this.ensureTeacherCanAccessClass(existing, requesterId, requesterRoles);

    const payload: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (presentation.cardPreset !== undefined) {
      payload.cardPreset = presentation.cardPreset;
    }

    if (presentation.cardBannerUrl !== undefined) {
      payload.cardBannerUrl = presentation.cardBannerUrl;
    }

    await this.db.update(classes).set(payload).where(eq(classes.id, id));

    const changedFields: string[] = [];
    if (presentation.cardPreset !== undefined) changedFields.push('cardPreset');
    if (presentation.cardBannerUrl !== undefined)
      changedFields.push('cardBannerUrl');

    const actorRole = requesterRoles.includes('admin')
      ? 'admin'
      : requesterRoles.includes('teacher')
        ? 'teacher'
        : 'unknown';

    await this.auditService.log({
      actorId: requesterId,
      action: 'class.presentation.updated',
      targetType: 'class',
      targetId: id,
      metadata: {
        actorRole,
        changedFields,
        cardPreset: presentation.cardPreset,
        cardBannerUrl: presentation.cardBannerUrl,
      },
    });

    return this.findById(id);
  }

  private async getHiddenClassIdsForUser(userId: string, classIds: string[]) {
    if (!userId || classIds.length === 0) return new Set<string>();

    const preferences = await this.db.query.classVisibilityPreferences.findMany(
      {
        where: and(
          eq(classVisibilityPreferences.userId, userId),
          inArray(classVisibilityPreferences.classId, classIds),
          eq(classVisibilityPreferences.isHidden, true),
        ),
        columns: {
          classId: true,
        },
      },
    );

    return new Set(preferences.map((preference) => preference.classId));
  }

  private applyClassVisibilityFilter(
    classList: any[],
    hiddenClassIds: Set<string>,
    status: 'active' | 'archived' | 'hidden' | 'all' = 'all',
  ) {
    return classList
      .map((classRecord) => ({
        ...classRecord,
        isHidden: hiddenClassIds.has(classRecord.id),
      }))
      .filter((classRecord) => {
        if (status === 'hidden') return classRecord.isHidden;
        if (classRecord.isHidden) return false;
        if (status === 'active') return classRecord.isActive;
        if (status === 'archived') return !classRecord.isActive;
        return true;
      });
  }

  /**
   * Delete a class.
   * Blocked when active enrollments OR lessons are attached to prevent data loss.
   */
  async delete(id: string, actorId?: string, actorRoles: string[] = []) {
    // Verify class exists
    const classRecord = await this.findById(id);

    const activeEnrollments = await this.db.query.enrollments.findMany({
      where: and(
        eq(enrollments.classId, id),
        eq(enrollments.status, 'enrolled'),
      ),
      columns: { id: true },
    });
    if (activeEnrollments.length > 0) {
      throw new ConflictException(
        `Cannot delete a class with ${activeEnrollments.length} active enrollment(s). Unenroll all students first.`,
      );
    }

    const classLessons = await this.db.query.lessons.findMany({
      where: eq(lessons.classId, id),
      columns: { id: true },
    });
    if (classLessons.length > 0) {
      throw new ConflictException(
        `Cannot delete a class with ${classLessons.length} lesson(s). Remove all lessons first.`,
      );
    }

    const classAssessments = await this.db.query.assessments.findMany({
      where: eq(assessments.classId, id),
      columns: { id: true },
    });
    if (classAssessments.length > 0) {
      throw new ConflictException(
        `Cannot delete a class with ${classAssessments.length} assessment(s). Remove all assessments first.`,
      );
    }

    await this.db.delete(classes).where(eq(classes.id, id));

    const actorRole = actorRoles.includes('admin')
      ? 'admin'
      : actorRoles.includes('teacher')
        ? 'teacher'
        : 'system';

    await this.auditService.log({
      actorId: actorId ?? classRecord.teacherId ?? 'system',
      action: 'class.deleted',
      targetType: 'class',
      targetId: id,
      metadata: {
        actorRole,
        softDelete: true,
        previousIsActive: classRecord.isActive,
      },
    });

    return classRecord;
  }

  /**
   * Permanently purge an archived class and all related cascade data.
   * This intentionally bypasses delete blockers used by the regular delete flow.
   */
  async purge(id: string, actorId?: string, actorRoles: string[] = []) {
    const classRecord = await this.findById(id);

    if (classRecord.isActive) {
      throw new ConflictException(
        'Only archived classes can be permanently deleted. Archive the class first.',
      );
    }

    await this.db.delete(classes).where(eq(classes.id, id));

    const actorRole = actorRoles.includes('admin')
      ? 'admin'
      : actorRoles.includes('teacher')
        ? 'teacher'
        : 'system';

    await this.auditService.log({
      actorId: actorId ?? classRecord.teacherId ?? 'system',
      action: 'class.purged',
      targetType: 'class',
      targetId: id,
      metadata: {
        actorRole,
        previousIsActive: classRecord.isActive,
      },
    });

    return classRecord;
  }

  private async performBulkLifecycleAction(
    action: BulkClassLifecycleAction,
    classId: string,
    actorId?: string,
    actorRoles: string[] = [],
  ) {
    const classRecord = await this.findById(classId);

    switch (action) {
      case 'archive':
        if (!classRecord.isActive) {
          throw new ConflictException('Class is already archived.');
        }
        await this.toggleActive(classId, actorId, actorRoles);
        return;
      case 'restore':
        if (classRecord.isActive) {
          throw new ConflictException('Class is already active.');
        }
        await this.toggleActive(classId, actorId, actorRoles);
        return;
      case 'purge':
        if (classRecord.isActive) {
          throw new ConflictException(
            'Only archived classes can be permanently deleted. Archive the class first.',
          );
        }
        await this.purge(classId, actorId, actorRoles);
        return;
      default: {
        throw new BadRequestException(
          'Unsupported bulk class lifecycle action.',
        );
      }
    }
  }

  private buildBulkLifecycleMessage(
    action: BulkClassLifecycleAction,
    successCount: number,
    failureCount: number,
  ) {
    const verbMap: Record<BulkClassLifecycleAction, string> = {
      archive: 'archived',
      restore: 'restored',
      purge: 'purged',
    };
    const noun = successCount === 1 ? 'class' : 'classes';
    const verb = verbMap[action];

    if (failureCount === 0) {
      return `${successCount} ${noun} ${verb}.`;
    }

    return `${successCount} ${noun} ${verb}; ${failureCount} failed.`;
  }

  async bulkLifecycleAction(
    dto: BulkClassLifecycleDto,
    actorId?: string,
    actorRoles: string[] = [],
  ): Promise<BulkClassLifecycleResult> {
    const classIds = [...new Set(dto.classIds)];
    const succeeded: string[] = [];
    const failed: BulkClassLifecycleFailure[] = [];

    for (const classId of classIds) {
      try {
        await this.performBulkLifecycleAction(
          dto.action,
          classId,
          actorId,
          actorRoles,
        );
        succeeded.push(classId);
      } catch (error) {
        failed.push({
          classId,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      message: this.buildBulkLifecycleMessage(
        dto.action,
        succeeded.length,
        failed.length,
      ),
      data: {
        action: dto.action,
        requested: classIds.length,
        succeeded,
        failed,
      },
    };
  }

  /**
   * Get classes by teacher ID
   * Ownership enforced: a teacher may only view their own classes unless they are an admin.
   */
  async getClassesByTeacher(
    teacherId: string,
    requesterId?: string,
    requesterRoles?: string[],
    status: 'active' | 'archived' | 'hidden' | 'all' = 'all',
  ) {
    if (
      requesterId &&
      requesterRoles &&
      !requesterRoles.includes('admin') &&
      requesterId !== teacherId
    ) {
      throw new ForbiddenException('You can only view your own classes');
    }

    const classList = await this.db.query.classes.findMany({
      where: eq(classes.teacherId, teacherId),
      with: {
        section: true,
        schedules: true,
        enrollments: {
          columns: {
            id: true,
          },
        },
      },
      orderBy: (classes, { asc }) => [asc(classes.createdAt)],
    });

    const normalizedClassList = classList.map((c) => ({
      ...c,
      schedules: (c.schedules ?? []).map(toCalendarSlot),
    }));

    const hiddenClassIds = await this.getHiddenClassIdsForUser(
      requesterId ?? teacherId,
      normalizedClassList.map((classRecord) => classRecord.id),
    );

    return this.applyClassVisibilityFilter(
      normalizedClassList,
      hiddenClassIds,
      status,
    );
  }

  /**
   * Get classes by section ID
   */
  async getClassesBySection(sectionId: string) {
    const classList = await this.db.query.classes.findMany({
      where: eq(classes.sectionId, sectionId),
      with: {
        schedules: true,
        teacher: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: (classes, { asc }) => [asc(classes.createdAt)],
    });

    return classList.map((c) => ({
      ...c,
      schedules: (c.schedules ?? []).map(toCalendarSlot),
    }));
  }

  /**
   * Get classes by subject ID
   */
  async getClassesBySubject(subjectId: string) {
    const classList = await this.db.query.classes.findMany({
      where: eq(classes.subjectCode, subjectId),
      with: {
        section: true,
        teacher: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: (classes, { asc }) => [asc(classes.createdAt)],
    });

    return classList;
  }

  /**
   * Get all classes enrolled by a student
   * Ownership enforced: a student may only view their own enrolled classes.
   */
  async getClassesByStudent(
    studentId: string,
    requesterId?: string,
    requesterRoles?: string[],
    status: 'active' | 'archived' | 'hidden' | 'all' = 'all',
  ) {
    if (
      requesterId &&
      requesterRoles &&
      requesterRoles.includes('student') &&
      requesterId !== studentId
    ) {
      throw new ForbiddenException(
        'You can only view your own enrolled classes',
      );
    }

    // First, get all enrollments for this student
    const studentEnrollments = await this.db.query.enrollments.findMany({
      where: eq(enrollments.studentId, studentId),
      columns: { classId: true },
    });

    if (studentEnrollments.length === 0) {
      return [];
    }

    // Extract unique class IDs
    const classIds = [
      ...new Set(
        studentEnrollments
          .map((e) => e.classId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    // Fetch all classes with those IDs, including enrollments and student count
    const classList = await this.db.query.classes.findMany({
      where: (classTable) => inArray(classTable.id, classIds),
      with: {
        section: true,
        schedules: true,
        teacher: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        enrollments: {
          columns: {
            id: true,
            studentId: true,
          },
        },
      },
      orderBy: (classes, { asc }) => [asc(classes.createdAt)],
    });

    const normalizedClassList = classList.map((c) => ({
      ...c,
      schedules: (c.schedules ?? []).map(toCalendarSlot),
    }));

    const hiddenClassIds = await this.getHiddenClassIdsForUser(
      requesterId ?? studentId,
      normalizedClassList.map((classRecord) => classRecord.id),
    );

    return this.applyClassVisibilityFilter(
      normalizedClassList,
      hiddenClassIds,
      status,
    );
  }

  async getStudentClassPresentationPreferences(
    studentId: string,
    requesterId?: string,
    requesterRoles?: string[],
  ) {
    this.assertStudentPreferenceReadAccess(studentId, requesterId, requesterRoles);
    const classIds = await this.getEnrolledClassIds(studentId);
    if (classIds.length === 0) return [];

    return this.db.query.studentClassPresentationPreferences.findMany({
      where: and(
        eq(studentClassPresentationPreferences.userId, studentId),
        inArray(studentClassPresentationPreferences.classId, classIds),
      ),
      columns: {
        classId: true,
        styleMode: true,
        styleToken: true,
        updatedAt: true,
      },
    });
  }

  async updateStudentClassPresentationPreference(
    classId: string,
    requesterId: string,
    requesterRoles: string[],
    presentation: { styleMode: StudentPresentationMode; styleToken: string },
  ) {
    this.assertStudentPreferenceWriteAccess(requesterId, requesterRoles);
    await this.ensureStudentEnrollment(classId, requesterId);
    this.ensureValidStudentStylePreference(
      presentation.styleMode,
      presentation.styleToken,
    );

    const existingPreference =
      await this.db.query.studentClassPresentationPreferences.findFirst({
        where: and(
          eq(studentClassPresentationPreferences.classId, classId),
          eq(studentClassPresentationPreferences.userId, requesterId),
        ),
      });

    if (existingPreference) {
      await this.db
        .update(studentClassPresentationPreferences)
        .set({
          styleMode: presentation.styleMode,
          styleToken: presentation.styleToken,
          updatedAt: new Date(),
        })
        .where(eq(studentClassPresentationPreferences.id, existingPreference.id));
    } else {
      await this.db.insert(studentClassPresentationPreferences).values({
        classId,
        userId: requesterId,
        styleMode: presentation.styleMode,
        styleToken: presentation.styleToken,
      });
    }

    return {
      classId,
      styleMode: presentation.styleMode,
      styleToken: presentation.styleToken,
    };
  }

  async getStudentCourseViewPreference(
    studentId: string,
    requesterId?: string,
    requesterRoles?: string[],
  ) {
    this.assertStudentPreferenceReadAccess(studentId, requesterId, requesterRoles);
    const preference = await this.db.query.studentCourseViewPreferences.findFirst({
      where: eq(studentCourseViewPreferences.userId, studentId),
      columns: {
        viewMode: true,
      },
    });

    return {
      viewMode: preference?.viewMode ?? ('card' as StudentCourseViewMode),
    };
  }

  async setStudentCourseViewPreference(
    studentId: string,
    requesterId: string,
    requesterRoles: string[],
    viewMode: StudentCourseViewMode,
  ) {
    this.assertStudentPreferenceReadAccess(studentId, requesterId, requesterRoles);

    if (!STUDENT_COURSE_VIEW_MODES.includes(viewMode)) {
      throw new BadRequestException('Unsupported student course view mode');
    }

    const existing =
      await this.db.query.studentCourseViewPreferences.findFirst({
        where: eq(studentCourseViewPreferences.userId, studentId),
      });

    if (existing) {
      await this.db
        .update(studentCourseViewPreferences)
        .set({
          viewMode,
          updatedAt: new Date(),
        })
        .where(eq(studentCourseViewPreferences.id, existing.id));
    } else {
      await this.db.insert(studentCourseViewPreferences).values({
        userId: studentId,
        viewMode,
      });
    }

    return { viewMode };
  }

  async setClassHiddenState(
    classId: string,
    userId: string,
    userRoles: string[],
    hidden: boolean,
  ) {
    const classRecord = await this.findById(classId);

    if (userRoles.includes('teacher') && !userRoles.includes('admin')) {
      this.ensureTeacherCanAccessClass(classRecord, userId, userRoles);
    }

    if (userRoles.includes('student')) {
      const enrollment = await this.db.query.enrollments.findFirst({
        where: and(
          eq(enrollments.classId, classId),
          eq(enrollments.studentId, userId),
          eq(enrollments.status, 'enrolled'),
        ),
        columns: {
          id: true,
        },
      });

      if (!enrollment) {
        throw new ForbiddenException(
          'You can only manage visibility for your own classes',
        );
      }
    }

    const existingPreference =
      await this.db.query.classVisibilityPreferences.findFirst({
        where: and(
          eq(classVisibilityPreferences.classId, classId),
          eq(classVisibilityPreferences.userId, userId),
        ),
      });

    if (existingPreference) {
      await this.db
        .update(classVisibilityPreferences)
        .set({
          isHidden: hidden,
          updatedAt: new Date(),
        })
        .where(eq(classVisibilityPreferences.id, existingPreference.id));
    } else {
      await this.db.insert(classVisibilityPreferences).values({
        classId,
        userId,
        isHidden: hidden,
      });
    }

    const actorRole = userRoles.includes('admin')
      ? 'admin'
      : userRoles.includes('teacher')
        ? 'teacher'
        : userRoles.includes('student')
          ? 'student'
          : 'unknown';

    await this.auditService.log({
      actorId: userId,
      action: 'class.visibility.updated',
      targetType: 'class',
      targetId: classId,
      metadata: {
        actorRole,
        hidden,
      },
    });

    return {
      classId,
      isHidden: hidden,
    };
  }

  /**
   * Toggle class active status
   */
  async toggleActive(id: string, actorId?: string, actorRoles: string[] = []) {
    const classRecord = await this.findById(id);
    const nextIsActive = !classRecord.isActive;

    await this.db
      .update(classes)
      .set({
        isActive: nextIsActive,
        updatedAt: new Date(),
      })
      .where(eq(classes.id, id));

    const actorRole = actorRoles.includes('admin')
      ? 'admin'
      : actorRoles.includes('teacher')
        ? 'teacher'
        : 'system';

    await this.auditService.log({
      actorId: actorId ?? classRecord.teacherId ?? 'system',
      action: 'class.status.toggled',
      targetType: 'class',
      targetId: id,
      metadata: {
        actorRole,
        previousIsActive: classRecord.isActive,
        isActive: nextIsActive,
      },
    });

    return this.findById(id);
  }

  /**
   * Get all students enrolled in a class
   */
  async getEnrollments(classId: string) {
    // First verify the class exists
    await this.findById(classId);

    // Get all enrollments for this class with student details
    const classEnrollments = await this.db.query.enrollments.findMany({
      where: and(
        eq(enrollments.classId, classId),
        eq(enrollments.status, 'enrolled'),
      ),
      with: {
        student: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
          with: {
            profile: {
              columns: {
                gradeLevel: true,
                lrn: true,
                profilePicture: true,
              },
            },
          },
        },
      },
      orderBy: (enrollments, { asc }) => [asc(enrollments.enrolledAt)],
    });

    return classEnrollments;
  }

  private normalizeStandingCategory(name: string): StandingComponentKey | null {
    const normalized = name.toLowerCase();
    if (normalized.includes('written')) return 'writtenWorkPercent';
    if (normalized.includes('performance')) return 'performanceTaskPercent';
    if (normalized.includes('quarter')) return 'quarterlyExamPercent';
    return null;
  }

  private roundToOne(value: number): number {
    return Math.round(value * 10) / 10;
  }

  private async getLatestStandingSnapshot(
    classId: string,
    studentId: string,
  ): Promise<StandingSnapshot | null> {
    const records = await this.db.query.classRecords.findMany({
      where: eq(classRecords.classId, classId),
      columns: {
        id: true,
        gradingPeriod: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: [desc(classRecords.updatedAt), desc(classRecords.createdAt)],
    });

    for (const record of records) {
      const [categories, items, finalGrade] = await Promise.all([
        this.db.query.classRecordCategories.findMany({
          where: eq(classRecordCategories.classRecordId, record.id),
          columns: {
            id: true,
            name: true,
            weightPercentage: true,
          },
        }),
        this.db.query.classRecordItems.findMany({
          where: eq(classRecordItems.classRecordId, record.id),
          columns: {
            id: true,
            categoryId: true,
            maxScore: true,
          },
        }),
        this.db.query.classRecordFinalGrades.findFirst({
          where: and(
            eq(classRecordFinalGrades.classRecordId, record.id),
            eq(classRecordFinalGrades.studentId, studentId),
          ),
          columns: {
            finalPercentage: true,
          },
        }),
      ]);

      if (categories.length === 0) continue;

      const itemIds = items.map((item) => item.id);
      const scores =
        itemIds.length > 0
          ? await this.db.query.classRecordScores.findMany({
              where: and(
                eq(classRecordScores.studentId, studentId),
                inArray(classRecordScores.classRecordItemId, itemIds),
              ),
              columns: {
                classRecordItemId: true,
                score: true,
              },
            })
          : [];

      const scoreByItemId = new Map(
        scores.map((score) => [score.classRecordItemId, Number(score.score)]),
      );

      const componentTotals: Record<
        StandingComponentKey,
        { raw: number; hps: number }
      > = {
        writtenWorkPercent: { raw: 0, hps: 0 },
        performanceTaskPercent: { raw: 0, hps: 0 },
        quarterlyExamPercent: { raw: 0, hps: 0 },
      };

      let weightedInitialGrade = 0;
      let hasComputableCategory = false;

      for (const category of categories) {
        const key = this.normalizeStandingCategory(category.name);
        if (!key) continue;

        const categoryItems = items.filter(
          (item) => item.categoryId === category.id,
        );

        let totalRaw = 0;
        let totalHps = 0;

        for (const item of categoryItems) {
          const maxScore = Number(item.maxScore);
          if (Number.isNaN(maxScore) || maxScore <= 0) continue;
          totalHps += maxScore;
          totalRaw += scoreByItemId.get(item.id) ?? 0;
        }

        if (totalHps > 0) {
          hasComputableCategory = true;
          const percentage = (totalRaw / totalHps) * 100;
          const weight = Number(category.weightPercentage);
          weightedInitialGrade += percentage * (weight / 100);
          componentTotals[key] = { raw: totalRaw, hps: totalHps };
        }
      }

      const components: Record<StandingComponentKey, number | null> = {
        writtenWorkPercent:
          componentTotals.writtenWorkPercent.hps > 0
            ? this.roundToOne(
                (componentTotals.writtenWorkPercent.raw /
                  componentTotals.writtenWorkPercent.hps) *
                  100,
              )
            : null,
        performanceTaskPercent:
          componentTotals.performanceTaskPercent.hps > 0
            ? this.roundToOne(
                (componentTotals.performanceTaskPercent.raw /
                  componentTotals.performanceTaskPercent.hps) *
                  100,
              )
            : null,
        quarterlyExamPercent:
          componentTotals.quarterlyExamPercent.hps > 0
            ? this.roundToOne(
                (componentTotals.quarterlyExamPercent.raw /
                  componentTotals.quarterlyExamPercent.hps) *
                  100,
              )
            : null,
      };

      if (!hasComputableCategory && !finalGrade) {
        continue;
      }

      const overallGradePercent = finalGrade
        ? this.roundToOne(Number(finalGrade.finalPercentage))
        : this.roundToOne(weightedInitialGrade);

      return {
        gradingPeriod: record.gradingPeriod,
        overallGradePercent,
        components,
      };
    }

    return null;
  }

  private async getAssessmentHistoryByStatus(classId: string, studentId: string) {
    const classAssessments = await this.db.query.assessments.findMany({
      where: eq(assessments.classId, classId),
      columns: {
        id: true,
        title: true,
        type: true,
        dueDate: true,
        totalPoints: true,
      },
      orderBy: [desc(assessments.dueDate), desc(assessments.createdAt)],
    });

    if (classAssessments.length === 0) {
      return {
        finished: [],
        late: [],
        pending: [],
      };
    }

    const assessmentIds = classAssessments.map((assessment) => assessment.id);
    const attempts = await this.db.query.assessmentAttempts.findMany({
      where: and(
        eq(assessmentAttempts.studentId, studentId),
        inArray(assessmentAttempts.assessmentId, assessmentIds),
      ),
      columns: {
        id: true,
        assessmentId: true,
        isSubmitted: true,
        isReturned: true,
        submittedAt: true,
        returnedAt: true,
        score: true,
        directScore: true,
        passed: true,
      },
      orderBy: [desc(assessmentAttempts.submittedAt), desc(assessmentAttempts.createdAt)],
    });

    const attemptsByAssessment = new Map<string, typeof attempts>();
    for (const attempt of attempts) {
      const bucket = attemptsByAssessment.get(attempt.assessmentId) ?? [];
      bucket.push(attempt);
      attemptsByAssessment.set(attempt.assessmentId, bucket);
    }

    const history = {
      finished: [] as any[],
      late: [] as any[],
      pending: [] as any[],
    };

    for (const assessment of classAssessments) {
      const assessmentAttemptsForStudent =
        attemptsByAssessment.get(assessment.id) ?? [];
      const submittedAttempts = assessmentAttemptsForStudent
        .filter((attempt) => attempt.isSubmitted)
        .sort((left, right) => {
          const leftTs = left.submittedAt
            ? new Date(left.submittedAt).getTime()
            : 0;
          const rightTs = right.submittedAt
            ? new Date(right.submittedAt).getTime()
            : 0;
          return rightTs - leftTs;
        });
      const latestSubmitted = submittedAttempts[0] ?? null;
      const hasInProgress = assessmentAttemptsForStudent.some(
        (attempt) => !attempt.isSubmitted,
      );

      if (!latestSubmitted) {
        history.pending.push({
          assessmentId: assessment.id,
          title: assessment.title,
          type: assessment.type,
          dueDate: assessment.dueDate,
          status: hasInProgress ? 'in_progress' : 'not_started',
          statusLabel: hasInProgress ? 'In Progress' : 'Not Started',
          submittedAt: null,
          returnedAt: null,
          isLate: false,
          lateByMinutes: 0,
          score: null,
          directScore: null,
          totalPoints: assessment.totalPoints,
          passed: null,
          isReturned: false,
        });
        continue;
      }

      const dueDate = assessment.dueDate ? new Date(assessment.dueDate) : null;
      const submittedAt = latestSubmitted.submittedAt
        ? new Date(latestSubmitted.submittedAt)
        : null;
      const isLate = Boolean(
        dueDate &&
          submittedAt &&
          submittedAt.getTime() > dueDate.getTime(),
      );
      const lateByMinutes =
        isLate && dueDate && submittedAt
          ? Math.ceil((submittedAt.getTime() - dueDate.getTime()) / 60000)
          : 0;

      const item = {
        assessmentId: assessment.id,
        title: assessment.title,
        type: assessment.type,
        dueDate: assessment.dueDate,
        status: isLate ? 'late' : 'finished',
        statusLabel: isLate
          ? 'Late'
          : latestSubmitted.isReturned
            ? 'Returned'
            : 'Submitted',
        submittedAt: latestSubmitted.submittedAt,
        returnedAt: latestSubmitted.returnedAt,
        isLate,
        lateByMinutes,
        score: latestSubmitted.score,
        directScore: latestSubmitted.directScore,
        totalPoints: assessment.totalPoints,
        passed: latestSubmitted.passed,
        isReturned: latestSubmitted.isReturned,
      };

      if (isLate) {
        history.late.push(item);
      } else {
        history.finished.push(item);
      }
    }

    return history;
  }

  async getStudentProfileForClass(
    classId: string,
    studentId: string,
    requesterId?: string,
    requesterRoles?: string[],
  ) {
    const classRecord = await this.findById(classId);
    this.ensureTeacherCanAccessClass(classRecord, requesterId, requesterRoles);

    const enrollment = await this.db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.classId, classId),
        eq(enrollments.studentId, studentId),
        eq(enrollments.status, 'enrolled'),
      ),
      columns: { id: true },
    });

    if (!enrollment) {
      throw new NotFoundException('Student is not enrolled in this class');
    }

    const student = await this.db.query.users.findFirst({
      where: eq(users.id, studentId),
      columns: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        email: true,
        status: true,
      },
      with: {
        profile: {
          columns: {
            lrn: true,
            dateOfBirth: true,
            gender: true,
            phone: true,
            address: true,
            gradeLevel: true,
            familyName: true,
            familyRelationship: true,
            familyContact: true,
            profilePicture: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const sectionRecord = await this.db.query.sections.findFirst({
      where: eq(sections.id, classRecord.sectionId),
      columns: {
        id: true,
        name: true,
        gradeLevel: true,
        schoolYear: true,
        roomNumber: true,
      },
      with: {
        adviser: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return {
      classInfo: {
        id: classRecord.id,
        subjectName: classRecord.subjectName,
        subjectCode: classRecord.subjectCode,
      },
      student: {
        ...student,
        profile: student.profile ?? null,
      },
      section: sectionRecord
        ? {
            ...sectionRecord,
            adviser: sectionRecord.adviser ?? null,
          }
        : null,
    };
  }

  async getStudentOverviewForClass(
    classId: string,
    studentId: string,
    requesterId?: string,
    requesterRoles?: string[],
  ) {
    const profileData = await this.getStudentProfileForClass(
      classId,
      studentId,
      requesterId,
      requesterRoles,
    );

    const [standingSnapshot, history] = await Promise.all([
      this.getLatestStandingSnapshot(classId, studentId),
      this.getAssessmentHistoryByStatus(classId, studentId),
    ]);

    const section = profileData.section;
    const sectionLabel = section
      ? `Grade ${section.gradeLevel} - ${section.name}`
      : '--';

    return {
      classInfo: {
        ...profileData.classInfo,
        sectionLabel,
      },
      student: profileData.student,
      section,
      standing: standingSnapshot
        ? {
            gradingPeriod: standingSnapshot.gradingPeriod,
            overallGradePercent: standingSnapshot.overallGradePercent,
            components: standingSnapshot.components,
          }
        : {
            gradingPeriod: null,
            overallGradePercent: null,
            components: {
              writtenWorkPercent: null,
              performanceTaskPercent: null,
              quarterlyExamPercent: null,
            },
          },
      history,
    };
  }

  async getStudentsMasterlistForClass(
    classId: string,
    requesterId?: string,
    requesterRoles?: string[],
    filters?: {
      gradeLevel?: string;
      sectionId?: string;
      search?: string;
      eligibility?: 'all' | 'eligible' | 'mismatch';
      sortBy?:
        | 'lastName'
        | 'firstName'
        | 'email'
        | 'gradeLevel'
        | 'lrn'
        | 'eligibility';
      sortDirection?: 'asc' | 'desc';
      prioritizeEligible?: boolean;
      page?: number;
      limit?: number;
    },
  ) {
    const classRecord = await this.findById(classId);
    this.ensureTeacherCanAccessClass(classRecord, requesterId, requesterRoles);

    const classGradeLevel = classRecord.section?.gradeLevel;
    const effectiveGradeLevel =
      (filters?.gradeLevel as '7' | '8' | '9' | '10' | undefined) ??
      classGradeLevel;
    const page = Math.max(1, Number(filters?.page ?? 1) || 1);
    const limit = Math.max(
      1,
      Math.min(Number(filters?.limit ?? 20) || 20, 100),
    );
    const offset = (page - 1) * limit;

    const whereConditions: SQL<unknown>[] = [];

    const studentRoleSubquery = this.db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(roles.name, 'student'));

    whereConditions.push(inArray(users.id, studentRoleSubquery));
    whereConditions.push(ne(users.status, 'DELETED'));

    if (effectiveGradeLevel) {
      whereConditions.push(
        eq(studentProfiles.gradeLevel, effectiveGradeLevel as any),
      );
    }

    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      const searchCondition = or(
        ilike(users.firstName, searchPattern),
        ilike(users.lastName, searchPattern),
        ilike(users.email, searchPattern),
        ilike(studentProfiles.lrn, searchPattern),
      );
      if (searchCondition) whereConditions.push(searchCondition);
    }

    if (filters?.sectionId) {
      const sectionStudentSubquery = this.db
        .select({ studentId: enrollments.studentId })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.sectionId, filters.sectionId),
            eq(enrollments.status, 'enrolled'),
          ),
        );
      whereConditions.push(inArray(users.id, sectionStudentSubquery));
    }

    const whereClause = and(...whereConditions);

    const students = await this.db
      .select({
        id: users.id,
        firstName: users.firstName,
        middleName: users.middleName,
        lastName: users.lastName,
        email: users.email,
        status: users.status,
        profilePicture: studentProfiles.profilePicture,
        lrn: studentProfiles.lrn,
        gradeLevel: studentProfiles.gradeLevel,
      })
      .from(users)
      .innerJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .where(whereClause)
      .orderBy(users.lastName, users.firstName);

    const studentIds = students.map((student) => student.id);

    const enrolledRows =
      studentIds.length > 0
        ? await this.db.query.enrollments.findMany({
            where: and(
              inArray(enrollments.studentId, studentIds),
              eq(enrollments.status, 'enrolled'),
            ),
            columns: {
              studentId: true,
              sectionId: true,
              classId: true,
              enrolledAt: true,
            },
            with: {
              section: {
                columns: {
                  id: true,
                  name: true,
                  gradeLevel: true,
                  schoolYear: true,
                },
              },
            },
            orderBy: [desc(enrollments.enrolledAt)],
          })
        : [];

    const classEnrollments =
      studentIds.length > 0
        ? await this.db.query.enrollments.findMany({
            where: and(
              eq(enrollments.classId, classId),
              inArray(enrollments.studentId, studentIds),
              eq(enrollments.status, 'enrolled'),
            ),
            columns: {
              studentId: true,
            },
          })
        : [];

    const alreadyEnrolledIds = new Set(
      classEnrollments.map((e) => e.studentId),
    );

    const studentSectionMap = new Map<
      string,
      {
        id: string;
        name: string;
        gradeLevel: string;
        schoolYear: string;
      } | null
    >();

    for (const row of enrolledRows) {
      if (!row.sectionId || !row.section) continue;
      if (studentSectionMap.has(row.studentId)) continue;

      studentSectionMap.set(row.studentId, {
        id: row.section.id,
        name: row.section.name,
        gradeLevel: row.section.gradeLevel,
        schoolYear: row.section.schoolYear,
      });
    }

    const data = students.map((student) => {
      const studentSection = studentSectionMap.get(student.id) ?? null;
      const hasGradeMismatch =
        !!classGradeLevel && student.gradeLevel !== classGradeLevel;
      const hasSectionMismatch =
        !!studentSection && studentSection.id !== classRecord.sectionId;
      const isAlreadyEnrolled = alreadyEnrolledIds.has(student.id);

      let disabledReason: string | null = null;

      if (isAlreadyEnrolled) {
        disabledReason = 'Already enrolled in this class';
      } else if (hasGradeMismatch) {
        disabledReason = `Different grade level (Class grade ${classGradeLevel})`;
      } else if (!studentSection) {
        disabledReason = 'No section assignment';
      } else if (hasSectionMismatch) {
        disabledReason = `Different section (${studentSection.name})`;
      }

      return {
        ...student,
        section: studentSection,
        isEligible: !disabledReason,
        disabledReason,
      };
    });

    const eligibility = filters?.eligibility ?? 'all';
    const filteredByEligibility = data.filter((student) => {
      if (eligibility === 'eligible') return student.isEligible;
      if (eligibility === 'mismatch') return !student.isEligible;
      return true;
    });

    const sortBy = filters?.sortBy ?? 'lastName';
    const sortDirection = filters?.sortDirection ?? 'asc';
    const directionFactor = sortDirection === 'desc' ? -1 : 1;
    const prioritizeEligible = filters?.prioritizeEligible !== false;

    const getSortValue = (student: (typeof filteredByEligibility)[number]) => {
      switch (sortBy) {
        case 'firstName':
          return String(student.firstName ?? '').toLowerCase();
        case 'email':
          return String(student.email ?? '').toLowerCase();
        case 'gradeLevel':
          return String(student.gradeLevel ?? '').toLowerCase();
        case 'lrn':
          return String(student.lrn ?? '').toLowerCase();
        case 'eligibility':
          return student.isEligible ? '0' : '1';
        case 'lastName':
        default:
          return String(student.lastName ?? '').toLowerCase();
      }
    };

    const sorted = [...filteredByEligibility].sort((left, right) => {
      if (prioritizeEligible && left.isEligible !== right.isEligible) {
        return left.isEligible ? -1 : 1;
      }
      const leftValue = getSortValue(left);
      const rightValue = getSortValue(right);
      if (leftValue < rightValue) return -1 * directionFactor;
      if (leftValue > rightValue) return 1 * directionFactor;
      return 0;
    });

    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const paged = sorted.slice(offset, offset + limit);

    return {
      classContext: {
        classId: classRecord.id,
        sectionId: classRecord.sectionId,
        classGradeLevel,
      },
      data: paged,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get candidate students for enrollment in a class
   * Returns students from the same section who are not yet enrolled in this class
   */
  async getCandidates(classId: string) {
    // Get the class to find its section
    const classRecord = await this.findById(classId);

    // IDs of students already enrolled in this specific class
    const classEnrollments = await this.db.query.enrollments.findMany({
      where: and(
        eq(enrollments.classId, classId),
        eq(enrollments.status, 'enrolled'),
      ),
      columns: { studentId: true },
    });
    const enrolledStudentIds = classEnrollments.map((e) => e.studentId);

    // Single query: section students with classId=NULL not yet in this class
    const candidateWhere =
      enrolledStudentIds.length > 0
        ? and(
            eq(enrollments.sectionId, classRecord.sectionId),
            isNull(enrollments.classId),
            eq(enrollments.status, 'enrolled'),
            notInArray(enrollments.studentId, enrolledStudentIds),
          )
        : and(
            eq(enrollments.sectionId, classRecord.sectionId),
            isNull(enrollments.classId),
            eq(enrollments.status, 'enrolled'),
          );

    const candidates = await this.db.query.enrollments.findMany({
      where: candidateWhere,
      with: {
        student: {
          columns: { id: true, firstName: true, lastName: true, email: true },
          with: {
            profile: {
              columns: { gradeLevel: true, lrn: true, profilePicture: true },
            },
          },
        },
      },
    });

    return candidates;
  }

  /**
   * Enroll a student in a class.
   * All reads and the final write are wrapped in a single database transaction
   * to prevent duplicate enrollments under concurrent requests.
   */
  async enrollStudent(classId: string, studentId: string, actorId: string) {
    // Pre-flight checks outside the transaction (cheap, read-only)
    const classRecord = await this.findById(classId);

    const student = await this.db.query.users.findFirst({
      where: eq(users.id, studentId),
    });
    if (!student) {
      throw new BadRequestException(`Student with ID "${studentId}" not found`);
    }

    // Run the duplicate-check + write atomically
    const enrollmentId = await this.db.transaction(async (tx) => {
      // Re-check inside the transaction to close the TOCTOU race window
      const existingEnrollment = await tx.query.enrollments.findFirst({
        where: and(
          eq(enrollments.studentId, studentId),
          eq(enrollments.classId, classId),
        ),
      });
      if (existingEnrollment) {
        throw new ConflictException(
          `Student is already enrolled in this class`,
        );
      }

      const sectionEnrollment = await tx.query.enrollments.findFirst({
        where: and(
          eq(enrollments.studentId, studentId),
          eq(enrollments.sectionId, classRecord.sectionId),
        ),
      });
      if (!sectionEnrollment) {
        throw new BadRequestException(
          `Student is not enrolled in the section for this class`,
        );
      }

      if (sectionEnrollment.classId === null) {
        // Promote the section-only row to a full class enrollment
        await tx
          .update(enrollments)
          .set({ classId, enrolledAt: new Date() })
          .where(eq(enrollments.id, sectionEnrollment.id));
        return sectionEnrollment.id;
      } else {
        // Student already has another class; create a new enrollment row
        const [newEnrollment] = await tx
          .insert(enrollments)
          .values({
            studentId,
            classId,
            sectionId: classRecord.sectionId,
            status: 'enrolled',
          })
          .returning();
        return newEnrollment.id;
      }
    });

    // Read the fully populated enrollment after the transaction is committed
    const enrollment = await this.getEnrollmentById(enrollmentId);
    if (!enrollment) {
      throw new NotFoundException(
        `Enrollment "${enrollmentId}" not found after creation`,
      );
    }
    await this.auditService.log({
      actorId,
      action: 'class.enrollment.added',
      targetType: 'class_enrollment',
      targetId: enrollment.id,
      metadata: {
        classId,
        studentId,
      },
    });

    return enrollment;
  }

  /**
   * Remove a student from a class.
   *
   * Critical safety rule: the first enrollment row a student gets in a section
   * starts as classId=NULL and is *promoted* (not duplicated) when they are
   * added to a class.  Deleting that row would silently remove the student from
   * the section entirely.  Instead:
   *   – If a separate section-only (classId=NULL) row already exists → this  is
   *     an additional class-enrollment row; delete it.
   *   – Otherwise → this IS the (promoted) section row; revert classId to NULL.
   */
  async removeStudent(classId: string, studentId: string, actorId: string) {
    const classRecord = await this.findById(classId);

    const enrollment = await this.db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.classId, classId),
      ),
    });

    if (!enrollment) {
      throw new NotFoundException(`Student is not enrolled in this class`);
    }

    // Determine whether a separate section-only row already exists
    const existingSectionRow = await this.db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.sectionId, classRecord.sectionId),
        isNull(enrollments.classId),
      ),
    });

    if (existingSectionRow) {
      // Additional class-enrollment row — safe to delete
      await this.db
        .delete(enrollments)
        .where(eq(enrollments.id, enrollment.id));
    } else {
      // Promoted section row — revert to section-only instead of deleting
      await this.db
        .update(enrollments)
        .set({ classId: null })
        .where(eq(enrollments.id, enrollment.id));
    }

    await this.auditService.log({
      actorId,
      action: 'class.enrollment.removed',
      targetType: 'class_enrollment',
      targetId: enrollment.id,
      metadata: {
        classId,
        studentId,
      },
    });

    return { id: enrollment.id };
  }

  /**
   * Check for schedule collisions across section, teacher, and room.
   * Throws ConflictException with full conflict detail if any overlap is found.
   *
   * Collision rules:
   *  - A section cannot have two classes on the same day at the same time
   *  - A teacher cannot be in two places at the same time
   *  - A room cannot host two classes at the same time
   */
  private async checkCollisions(params: {
    classId: string;
    sectionId: string;
    teacherId?: string | null;
    room?: string | null;
    slots: ScheduleSlotDto[];
    excludeClassId?: string;
  }, database: any = this.db): Promise<void> {
    const { sectionId, teacherId, room, slots, excludeClassId } = params;
    const conflicts: any[] = [];

    for (const slot of slots) {
      // Validate end > start
      if (timeToMinutes(slot.endTime) <= timeToMinutes(slot.startTime)) {
        throw new BadRequestException(
          `endTime "${slot.endTime}" must be after startTime "${slot.startTime}" for days ${slot.days.join(',')}`,
        );
      }

      // Build a proper ARRAY[...]::text[] expression for the days overlap check.
      // Drizzle cannot cast a bound parameter with ::text[], so we construct
      // the array literal explicitly using sql.join.
      const daysArray = sql`ARRAY[${sql.join(
        slot.days.map((d) => sql`${d}`),
        sql`, `,
      )}]::text[]`;

      const conditions: SQL[] = [
        // Day overlap: stored days array has at least one day in common with incoming days
        sql`${classSchedules.days} && ${daysArray}`,
        // Time overlap: existing.start < new.end AND existing.end > new.start
        sql`${classSchedules.startTime} < ${slot.endTime}`,
        sql`${classSchedules.endTime} > ${slot.startTime}`,
      ];

      if (excludeClassId) {
        conditions.push(ne(classSchedules.classId, excludeClassId));
      }

      const scopeParts: SQL[] = [eq(classes.sectionId, sectionId)];
      if (teacherId) {
        scopeParts.push(eq(classes.teacherId, teacherId));
      }
      if (room) {
        scopeParts.push(
          and(sql`${classes.room} IS NOT NULL`, eq(classes.room, room)) as SQL,
        );
      }

      const conflictRows = await database
        .select({
          slotId: classSchedules.id,
          classId: classSchedules.classId,
          days: classSchedules.days,
          startTime: classSchedules.startTime,
          endTime: classSchedules.endTime,
          subjectName: classes.subjectName,
          classSectionId: classes.sectionId,
          classTeacherId: classes.teacherId,
          classRoom: classes.room,
        })
        .from(classSchedules)
        .innerJoin(classes, eq(classes.id, classSchedules.classId))
        .where(and(...conditions, or(...scopeParts)));

      for (const row of conflictRows) {
        const conflictTypes: string[] = [];
        if (row.classSectionId === sectionId) conflictTypes.push('section');
        if (teacherId && row.classTeacherId === teacherId) {
          conflictTypes.push('teacher');
        }
        if (room && row.classRoom === room) conflictTypes.push('room');

        conflicts.push({
          conflictType: conflictTypes,
          classId: row.classId,
          subjectName: row.subjectName,
          days: row.days,
          startTime: row.startTime,
          endTime: row.endTime,
        });
      }
    }

    if (conflicts.length > 0) {
      throw new ConflictException({
        message: 'Schedule conflicts detected',
        conflicts,
      });
    }
  }

  /**
   * Get enrollment by ID
   */
  private async getEnrollmentById(enrollmentId: string) {
    const enrollment = await this.db.query.enrollments.findFirst({
      where: eq(enrollments.id, enrollmentId),
      with: {
        student: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
          with: {
            profile: {
              columns: {
                gradeLevel: true,
              },
            },
          },
        },
      },
    });

    return enrollment;
  }
}
