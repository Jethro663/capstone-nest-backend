import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, inArray, isNotNull, max, or } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  assessmentAttempts,
  assessments,
  classModules,
  classes,
  enrollments,
  lessonCompletions,
  lessons,
  moduleGradingScaleEntries,
  moduleItems,
  moduleSections,
  uploadedFiles,
} from '../../drizzle/schema';
import { AuditService } from '../audit/audit.service';
import { RoleName } from '../auth/decorators/roles.decorator';
import {
  AttachModuleItemDto,
  CreateModuleDto,
  CreateModuleSectionDto,
  ModuleItemType,
  ReplaceModuleGradingScaleDto,
  ReorderModuleItemsDto,
  ReorderModulesDto,
  ReorderModuleSectionsDto,
  UpdateModuleDto,
  UpdateModuleItemDto,
  UpdateModuleSectionDto,
} from './DTO/module.dto';

@Injectable()
export class ContentModulesService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  private hasRole(userRoles: string[], role: RoleName) {
    return Array.isArray(userRoles) && userRoles.includes(role);
  }

  private async assertClassReadAccess(
    classId: string,
    userId: string,
    userRoles: string[],
  ) {
    const classRecord = await this.db.query.classes.findFirst({
      where: eq(classes.id, classId),
      columns: {
        id: true,
        teacherId: true,
      },
    });

    if (!classRecord) {
      throw new NotFoundException(`Class with ID "${classId}" not found`);
    }

    if (this.hasRole(userRoles, RoleName.Admin)) return classRecord;

    if (this.hasRole(userRoles, RoleName.Teacher)) {
      if (classRecord.teacherId !== userId) {
        throw new ForbiddenException('You can only access your own classes');
      }
      return classRecord;
    }

    if (!this.hasRole(userRoles, RoleName.Student)) {
      throw new ForbiddenException('You are not allowed to access class modules');
    }

    const enrollment = await this.db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.classId, classId),
        eq(enrollments.studentId, userId),
      ),
      columns: {
        id: true,
      },
    });

    if (!enrollment) {
      throw new ForbiddenException('You are not enrolled in this class');
    }

    return classRecord;
  }

  private async assertClassWriteAccess(
    classId: string,
    userId: string,
    userRoles: string[],
  ) {
    const classRecord = await this.assertClassReadAccess(classId, userId, userRoles);

    if (this.hasRole(userRoles, RoleName.Student)) {
      throw new ForbiddenException('Students cannot modify modules');
    }

    return classRecord;
  }

  private async getModuleByIdOrThrow(moduleId: string) {
    const module = await this.db.query.classModules.findFirst({
      where: eq(classModules.id, moduleId),
      with: {
        sections: {
          orderBy: (sectionTable, { asc: byAsc }) => [byAsc(sectionTable.order)],
          with: {
            items: {
              orderBy: (itemTable, { asc: byAsc }) => [byAsc(itemTable.order)],
              with: {
                lesson: true,
                assessment: true,
              },
            },
          },
        },
        gradingScaleEntries: {
          orderBy: (scaleTable, { asc: byAsc }) => [byAsc(scaleTable.order)],
        },
      },
    });

    if (!module) {
      throw new NotFoundException(`Module with ID "${moduleId}" not found`);
    }

    return module;
  }

  private async hydrateFileRefs<T extends { sections: Array<{ items: Array<{ fileId: string | null }> }> }>(
    modulesList: T[],
  ) {
    const fileIds = modulesList
      .flatMap((module) =>
        module.sections.flatMap((section) =>
          section.items.map((item) => item.fileId).filter((id): id is string => Boolean(id)),
        ),
      )
      .filter((value, index, array) => array.indexOf(value) === index);

    if (fileIds.length === 0) {
      return modulesList.map((module) => ({
        ...module,
        sections: module.sections.map((section) => ({
          ...section,
          items: section.items.map((item) => ({
            ...item,
            file: null,
          })),
        })),
      }));
    }

    const files = await this.db.query.uploadedFiles.findMany({
      where: inArray(uploadedFiles.id, fileIds),
      columns: {
        id: true,
        classId: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        scope: true,
      },
    });

    const fileMap = new Map(files.map((file) => [file.id, file]));

    return modulesList.map((module) => ({
      ...module,
      sections: module.sections.map((section) => ({
        ...section,
        items: section.items.map((item) => ({
          ...item,
          file: item.fileId ? fileMap.get(item.fileId) ?? null : null,
        })),
      })),
    }));
  }

  private async getModuleContextFromSection(sectionId: string) {
    const section = await this.db.query.moduleSections.findFirst({
      where: eq(moduleSections.id, sectionId),
      with: {
        module: {
          columns: {
            id: true,
            classId: true,
          },
        },
      },
    });

    if (!section) {
      throw new NotFoundException(`Module section with ID "${sectionId}" not found`);
    }

    return section;
  }

  private async getModuleContextFromItem(itemId: string) {
    const item = await this.db.query.moduleItems.findFirst({
      where: eq(moduleItems.id, itemId),
      with: {
        section: {
          with: {
            module: {
              columns: {
                id: true,
                classId: true,
              },
            },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Module item with ID "${itemId}" not found`);
    }

    return item;
  }

  private ensureSingleTargetForType(dto: AttachModuleItemDto) {
    const providedTargets = [dto.lessonId, dto.assessmentId, dto.fileId].filter(Boolean).length;
    if (providedTargets !== 1) {
      throw new BadRequestException(
        'Exactly one of lessonId, assessmentId, or fileId must be provided',
      );
    }

    if (dto.itemType === ModuleItemType.Lesson && !dto.lessonId) {
      throw new BadRequestException('lessonId is required when itemType is "lesson"');
    }

    if (dto.itemType === ModuleItemType.Assessment && !dto.assessmentId) {
      throw new BadRequestException('assessmentId is required when itemType is "assessment"');
    }

    if (dto.itemType === ModuleItemType.File && !dto.fileId) {
      throw new BadRequestException('fileId is required when itemType is "file"');
    }
  }

  private normalizeItemMetadataForAttach(dto: AttachModuleItemDto) {
    if (dto.points !== undefined && dto.itemType !== ModuleItemType.Lesson) {
      throw new BadRequestException('points is only supported for lesson module items');
    }

    if (dto.itemType === ModuleItemType.File) {
      return {
        ...(dto.metadata ?? {}),
        fileSubtype:
          (dto.metadata as Record<string, unknown> | undefined)?.fileSubtype ??
          'pdf',
      };
    }

    if (dto.itemType !== ModuleItemType.Lesson) {
      return dto.metadata ?? null;
    }

    const merged = {
      ...(dto.metadata ?? {}),
      ...(dto.points !== undefined ? { points: dto.points } : {}),
    };
    return Object.keys(merged).length > 0 ? merged : null;
  }

  private normalizeItemMetadataForUpdate(
    currentItem: { itemType: 'lesson' | 'assessment' | 'file'; metadata: unknown },
    dto: UpdateModuleItemDto,
  ) {
    if (dto.points !== undefined && currentItem.itemType !== ModuleItemType.Lesson) {
      throw new BadRequestException('points is only supported for lesson module items');
    }

    if (dto.metadata === undefined && dto.points === undefined) {
      return undefined;
    }

    const existingMetadata =
      currentItem.metadata && typeof currentItem.metadata === 'object'
        ? (currentItem.metadata as Record<string, unknown>)
        : {};

    if (currentItem.itemType === ModuleItemType.File) {
      const merged = {
        ...existingMetadata,
        ...(dto.metadata ?? {}),
      };
      if (!('fileSubtype' in merged)) {
        merged.fileSubtype = 'pdf';
      }
      return merged;
    }

    const merged = {
      ...existingMetadata,
      ...(dto.metadata ?? {}),
      ...(dto.points !== undefined ? { points: dto.points } : {}),
    };
    return Object.keys(merged).length > 0 ? merged : null;
  }

  private isItemVisibleToStudent(item: {
    isVisible: boolean;
    itemType: 'lesson' | 'assessment' | 'file';
    isGiven: boolean;
    lesson?: { isDraft: boolean } | null;
    assessment?: { isPublished: boolean | null } | null;
    fileId?: string | null;
  }) {
    if (!item.isVisible) return false;
    if (item.itemType === ModuleItemType.Lesson) {
      return Boolean(item.lesson && !item.lesson.isDraft);
    }
    if (item.itemType === ModuleItemType.Assessment) {
      return Boolean(item.assessment && item.assessment.isPublished && item.isGiven);
    }
    return Boolean(item.fileId);
  }

  private async getStudentCompletionSets(
    studentId: string,
    lessonIds: string[],
    assessmentIds: string[],
  ) {
    const completedLessonIds = new Set<string>();
    const completedAssessmentIds = new Set<string>();

    if (lessonIds.length > 0) {
      const completions = await this.db.query.lessonCompletions.findMany({
        where: and(
          eq(lessonCompletions.studentId, studentId),
          inArray(lessonCompletions.lessonId, lessonIds),
        ),
        columns: {
          lessonId: true,
        },
      });
      completions.forEach((entry) => completedLessonIds.add(entry.lessonId));
    }

    if (assessmentIds.length > 0) {
      const attempts = await this.db.query.assessmentAttempts.findMany({
        where: and(
          eq(assessmentAttempts.studentId, studentId),
          inArray(assessmentAttempts.assessmentId, assessmentIds),
          or(
            eq(assessmentAttempts.isSubmitted, true),
            isNotNull(assessmentAttempts.submittedAt),
          ),
        ),
        columns: {
          assessmentId: true,
        },
      });
      attempts.forEach((entry) => completedAssessmentIds.add(entry.assessmentId));
    }

    return { completedLessonIds, completedAssessmentIds };
  }

  private decorateStudentModule(
    module: any,
    completedLessonIds: Set<string>,
    completedAssessmentIds: Set<string>,
  ) {
    if (module.isLocked) {
      return {
        ...module,
        completed: false,
        requiredVisibleCount: 0,
        requiredCompletedCount: 0,
        progressPercent: 0,
        sections: [],
      };
    }

    let requiredVisibleCount = 0;
    let requiredCompletedCount = 0;

    const sections = module.sections.map((section: any) => {
      const items = section.items
        .filter((item: any) => this.isItemVisibleToStudent(item))
        .map((item: any) => {
          const completed =
            item.itemType === ModuleItemType.Lesson && item.lessonId
              ? completedLessonIds.has(item.lessonId)
              : item.itemType === ModuleItemType.Assessment && item.assessmentId
                ? completedAssessmentIds.has(item.assessmentId)
                : false;

          const countsTowardRequirement =
            item.isRequired &&
            (item.itemType === ModuleItemType.Lesson ||
              item.itemType === ModuleItemType.Assessment);

          if (countsTowardRequirement) {
            requiredVisibleCount += 1;
            if (completed) {
              requiredCompletedCount += 1;
            }
          }

          return {
            ...item,
            accessible: true,
            completed,
            lessonPoints:
              item.itemType === ModuleItemType.Lesson &&
              item.metadata &&
              typeof item.metadata === 'object' &&
              typeof (item.metadata as Record<string, unknown>).points === 'number'
                ? Number((item.metadata as Record<string, unknown>).points)
                : 0,
          };
        });

      return {
        ...section,
        items,
      };
    });

    const completed =
      requiredVisibleCount === 0 || requiredVisibleCount === requiredCompletedCount;
    const progressPercent =
      requiredVisibleCount === 0
        ? 100
        : Math.round((requiredCompletedCount / requiredVisibleCount) * 100);

    return {
      ...module,
      sections,
      completed,
      requiredVisibleCount,
      requiredCompletedCount,
      progressPercent,
    };
  }

  async getModulesByClass(classId: string, userId: string, userRoles: string[]) {
    const classRecord = await this.assertClassReadAccess(classId, userId, userRoles);
    const studentMode = this.hasRole(userRoles, RoleName.Student);

    const modulesList = await this.db.query.classModules.findMany({
      where: eq(classModules.classId, classRecord.id),
      with: {
        sections: {
          orderBy: (sectionTable, { asc: byAsc }) => [byAsc(sectionTable.order)],
          with: {
            items: {
              orderBy: (itemTable, { asc: byAsc }) => [byAsc(itemTable.order)],
              with: {
                lesson: true,
                assessment: true,
              },
            },
          },
        },
        gradingScaleEntries: {
          orderBy: (scaleTable, { asc: byAsc }) => [byAsc(scaleTable.order)],
        },
      },
      orderBy: (moduleTable, { asc: byAsc }) => [byAsc(moduleTable.order)],
    });

    const hydratedModules = await this.hydrateFileRefs(modulesList);

    if (!studentMode) return hydratedModules;

    const visibleModules = hydratedModules.filter((module) => module.isVisible);

    const lessonIds = visibleModules.flatMap((module) =>
      module.isLocked
        ? []
        : module.sections.flatMap((section) =>
            section.items
              .filter((item) => this.isItemVisibleToStudent(item))
              .filter((item) => item.itemType === ModuleItemType.Lesson && Boolean(item.lessonId))
              .map((item) => item.lessonId as string),
          ),
    );
    const assessmentIds = visibleModules.flatMap((module) =>
      module.isLocked
        ? []
        : module.sections.flatMap((section) =>
            section.items
              .filter((item) => this.isItemVisibleToStudent(item))
              .filter(
                (item) =>
                  item.itemType === ModuleItemType.Assessment &&
                  Boolean(item.assessmentId),
              )
              .map((item) => item.assessmentId as string),
          ),
    );

    const { completedLessonIds, completedAssessmentIds } =
      await this.getStudentCompletionSets(
        userId,
        Array.from(new Set(lessonIds)),
        Array.from(new Set(assessmentIds)),
      );

    return visibleModules.map((module) =>
      this.decorateStudentModule(module, completedLessonIds, completedAssessmentIds),
    );
  }

  async getModuleByClass(
    classId: string,
    moduleId: string,
    userId: string,
    userRoles: string[],
  ) {
    const modules = await this.getModulesByClass(classId, userId, userRoles);
    const module = modules.find((entry) => entry.id === moduleId);
    if (!module) {
      throw new NotFoundException(`Module with ID "${moduleId}" not found`);
    }
    return module;
  }

  async createModule(dto: CreateModuleDto, userId: string, userRoles: string[]) {
    await this.assertClassWriteAccess(dto.classId, userId, userRoles);

    const maxOrderResult = await this.db
      .select({ maxOrder: max(classModules.order) })
      .from(classModules)
      .where(eq(classModules.classId, dto.classId));
    const nextOrder = (maxOrderResult[0]?.maxOrder ?? 0) + 1;

    const [created] = await this.db
      .insert(classModules)
      .values({
        classId: dto.classId,
        title: dto.title.trim(),
        description: dto.description,
        order: dto.order ?? nextOrder,
      })
      .returning();

    await this.db.insert(moduleSections).values({
      moduleId: created.id,
      title: 'Section 1',
      description: 'Start adding your content here.',
      order: 1,
    });

    await this.auditService.log({
      actorId: userId,
      action: 'module.created',
      targetType: 'module',
      targetId: created.id,
      metadata: {
        classId: dto.classId,
      },
    });

    return this.getModuleByIdOrThrow(created.id);
  }

  async updateModule(moduleId: string, dto: UpdateModuleDto, userId: string, userRoles: string[]) {
    const module = await this.getModuleByIdOrThrow(moduleId);
    await this.assertClassWriteAccess(module.classId, userId, userRoles);

    await this.db
      .update(classModules)
      .set({
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.isVisible !== undefined ? { isVisible: dto.isVisible } : {}),
        ...(dto.isLocked !== undefined ? { isLocked: dto.isLocked } : {}),
        ...(dto.teacherNotes !== undefined ? { teacherNotes: dto.teacherNotes } : {}),
        ...(dto.themeKind !== undefined ? { themeKind: dto.themeKind } : {}),
        ...(dto.gradientId !== undefined ? { gradientId: dto.gradientId } : {}),
        ...(dto.coverImageUrl !== undefined ? { coverImageUrl: dto.coverImageUrl } : {}),
        ...(dto.imagePositionX !== undefined
          ? { imagePositionX: dto.imagePositionX }
          : {}),
        ...(dto.imagePositionY !== undefined
          ? { imagePositionY: dto.imagePositionY }
          : {}),
        ...(dto.imageScale !== undefined ? { imageScale: dto.imageScale } : {}),
        updatedAt: new Date(),
      })
      .where(eq(classModules.id, moduleId));

    await this.auditService.log({
      actorId: userId,
      action: 'module.updated',
      targetType: 'module',
      targetId: moduleId,
      metadata: {
        classId: module.classId,
      },
    });

    return this.getModuleByIdOrThrow(moduleId);
  }

  async deleteModule(moduleId: string, userId: string, userRoles: string[]) {
    const module = await this.getModuleByIdOrThrow(moduleId);
    await this.assertClassWriteAccess(module.classId, userId, userRoles);

    await this.db.delete(classModules).where(eq(classModules.id, moduleId));

    await this.auditService.log({
      actorId: userId,
      action: 'module.deleted',
      targetType: 'module',
      targetId: moduleId,
      metadata: {
        classId: module.classId,
      },
    });

    return module;
  }

  async reorderModules(classId: string, dto: ReorderModulesDto, userId: string, userRoles: string[]) {
    await this.assertClassWriteAccess(classId, userId, userRoles);

    if (dto.modules.length === 0) {
      throw new BadRequestException('At least one module reorder entry is required');
    }

    const requestedIds = dto.modules.map((item) => item.id);
    const existing = await this.db.query.classModules.findMany({
      where: and(eq(classModules.classId, classId), inArray(classModules.id, requestedIds)),
      columns: { id: true },
    });

    if (existing.length !== requestedIds.length) {
      throw new BadRequestException('One or more modules do not belong to the class');
    }

    await this.db.transaction(async (tx) => {
      for (const item of dto.modules) {
        await tx
          .update(classModules)
          .set({
            order: item.order,
            updatedAt: new Date(),
          })
          .where(eq(classModules.id, item.id));
      }
    });

    await this.auditService.log({
      actorId: userId,
      action: 'module.reordered',
      targetType: 'class',
      targetId: classId,
      metadata: {
        moduleIds: requestedIds,
      },
    });

    return this.getModulesByClass(classId, userId, userRoles);
  }

  async createSection(moduleId: string, dto: CreateModuleSectionDto, userId: string, userRoles: string[]) {
    const module = await this.getModuleByIdOrThrow(moduleId);
    await this.assertClassWriteAccess(module.classId, userId, userRoles);

    const maxOrderResult = await this.db
      .select({ maxOrder: max(moduleSections.order) })
      .from(moduleSections)
      .where(eq(moduleSections.moduleId, moduleId));
    const nextOrder = (maxOrderResult[0]?.maxOrder ?? 0) + 1;

    const [section] = await this.db
      .insert(moduleSections)
      .values({
        moduleId,
        title: dto.title.trim(),
        description: dto.description,
        order: dto.order ?? nextOrder,
      })
      .returning();

    await this.auditService.log({
      actorId: userId,
      action: 'module.section_created',
      targetType: 'module',
      targetId: moduleId,
      metadata: {
        sectionId: section.id,
      },
    });

    return section;
  }

  async updateSection(
    sectionId: string,
    dto: UpdateModuleSectionDto,
    userId: string,
    userRoles: string[],
  ) {
    const section = await this.getModuleContextFromSection(sectionId);
    await this.assertClassWriteAccess(section.module.classId, userId, userRoles);

    await this.db
      .update(moduleSections)
      .set({
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        updatedAt: new Date(),
      })
      .where(eq(moduleSections.id, sectionId));

    await this.auditService.log({
      actorId: userId,
      action: 'module.section_updated',
      targetType: 'module_section',
      targetId: sectionId,
      metadata: {
        moduleId: section.module.id,
      },
    });

    return this.db.query.moduleSections.findFirst({
      where: eq(moduleSections.id, sectionId),
    });
  }

  async deleteSection(sectionId: string, userId: string, userRoles: string[]) {
    const section = await this.getModuleContextFromSection(sectionId);
    await this.assertClassWriteAccess(section.module.classId, userId, userRoles);

    await this.db.delete(moduleSections).where(eq(moduleSections.id, sectionId));

    await this.auditService.log({
      actorId: userId,
      action: 'module.section_deleted',
      targetType: 'module_section',
      targetId: sectionId,
      metadata: {
        moduleId: section.module.id,
      },
    });

    return section;
  }

  async reorderSections(
    moduleId: string,
    dto: ReorderModuleSectionsDto,
    userId: string,
    userRoles: string[],
  ) {
    const module = await this.getModuleByIdOrThrow(moduleId);
    await this.assertClassWriteAccess(module.classId, userId, userRoles);

    if (dto.sections.length === 0) {
      throw new BadRequestException('At least one section reorder entry is required');
    }

    const requestedIds = dto.sections.map((item) => item.id);
    const existing = await this.db.query.moduleSections.findMany({
      where: and(
        eq(moduleSections.moduleId, moduleId),
        inArray(moduleSections.id, requestedIds),
      ),
      columns: { id: true },
    });

    if (existing.length !== requestedIds.length) {
      throw new BadRequestException('One or more sections do not belong to the module');
    }

    await this.db.transaction(async (tx) => {
      for (const item of dto.sections) {
        await tx
          .update(moduleSections)
          .set({
            order: item.order,
            updatedAt: new Date(),
          })
          .where(eq(moduleSections.id, item.id));
      }
    });

    await this.auditService.log({
      actorId: userId,
      action: 'module.sections_reordered',
      targetType: 'module',
      targetId: moduleId,
      metadata: {
        sectionIds: requestedIds,
      },
    });

    return this.db.query.moduleSections.findMany({
      where: eq(moduleSections.moduleId, moduleId),
      orderBy: (table, { asc: byAsc }) => [byAsc(table.order)],
    });
  }

  async attachItem(
    sectionId: string,
    dto: AttachModuleItemDto,
    userId: string,
    userRoles: string[],
  ) {
    this.ensureSingleTargetForType(dto);

    const section = await this.getModuleContextFromSection(sectionId);
    await this.assertClassWriteAccess(section.module.classId, userId, userRoles);

    if (dto.lessonId) {
      const lesson = await this.db.query.lessons.findFirst({
        where: eq(lessons.id, dto.lessonId),
        columns: {
          id: true,
          classId: true,
        },
      });
      if (!lesson) throw new NotFoundException(`Lesson with ID "${dto.lessonId}" not found`);
      if (lesson.classId !== section.module.classId) {
        throw new BadRequestException('Lesson must belong to the same class as the module');
      }
    }

    if (dto.assessmentId) {
      const assessment = await this.db.query.assessments.findFirst({
        where: eq(assessments.id, dto.assessmentId),
        columns: {
          id: true,
          classId: true,
        },
      });
      if (!assessment) {
        throw new NotFoundException(`Assessment with ID "${dto.assessmentId}" not found`);
      }
      if (assessment.classId !== section.module.classId) {
        throw new BadRequestException('Assessment must belong to the same class as the module');
      }
    }

    if (dto.fileId) {
      const file = await this.db.query.uploadedFiles.findFirst({
        where: eq(uploadedFiles.id, dto.fileId),
        columns: {
          id: true,
          classId: true,
        },
      });
      if (!file) throw new NotFoundException(`File with ID "${dto.fileId}" not found`);
      if (file.classId && file.classId !== section.module.classId) {
        throw new BadRequestException(
          'Class-scoped file must belong to the same class as the module',
        );
      }
    }

    const maxOrderResult = await this.db
      .select({ maxOrder: max(moduleItems.order) })
      .from(moduleItems)
      .where(eq(moduleItems.moduleSectionId, sectionId));
    const nextOrder = (maxOrderResult[0]?.maxOrder ?? 0) + 1;
    const normalizedMetadata = this.normalizeItemMetadataForAttach(dto);

    const [item] = await this.db
      .insert(moduleItems)
      .values({
        moduleSectionId: sectionId,
        itemType: dto.itemType,
        lessonId: dto.lessonId ?? null,
        assessmentId: dto.assessmentId ?? null,
        fileId: dto.fileId ?? null,
        order: dto.order ?? nextOrder,
        isVisible: dto.isVisible ?? true,
        isRequired: dto.isRequired ?? false,
        isGiven:
          dto.isGiven ??
          (dto.itemType === ModuleItemType.Assessment ? false : true),
        metadata: normalizedMetadata,
      })
      .returning();

    await this.auditService.log({
      actorId: userId,
      action: 'module.item_attached',
      targetType: 'module_item',
      targetId: item.id,
      metadata: {
        moduleId: section.module.id,
        sectionId,
      },
    });

    return item;
  }

  async updateItem(itemId: string, dto: UpdateModuleItemDto, userId: string, userRoles: string[]) {
    const item = await this.getModuleContextFromItem(itemId);
    await this.assertClassWriteAccess(item.section.module.classId, userId, userRoles);

    const normalizedMetadata = this.normalizeItemMetadataForUpdate(item, dto);

    await this.db
      .update(moduleItems)
      .set({
        ...(dto.order !== undefined ? { order: dto.order } : {}),
        ...(dto.isVisible !== undefined ? { isVisible: dto.isVisible } : {}),
        ...(dto.isRequired !== undefined ? { isRequired: dto.isRequired } : {}),
        ...(dto.isGiven !== undefined ? { isGiven: dto.isGiven } : {}),
        ...(normalizedMetadata !== undefined ? { metadata: normalizedMetadata } : {}),
        updatedAt: new Date(),
      })
      .where(eq(moduleItems.id, itemId));

    await this.auditService.log({
      actorId: userId,
      action: 'module.item_updated',
      targetType: 'module_item',
      targetId: itemId,
      metadata: {
        moduleId: item.section.module.id,
      },
    });

    return this.db.query.moduleItems.findFirst({
      where: eq(moduleItems.id, itemId),
    });
  }

  async deleteItem(itemId: string, userId: string, userRoles: string[]) {
    const item = await this.getModuleContextFromItem(itemId);
    await this.assertClassWriteAccess(item.section.module.classId, userId, userRoles);

    await this.db.delete(moduleItems).where(eq(moduleItems.id, itemId));

    await this.auditService.log({
      actorId: userId,
      action: 'module.item_detached',
      targetType: 'module_item',
      targetId: itemId,
      metadata: {
        moduleId: item.section.module.id,
      },
    });

    return item;
  }

  async reorderItems(
    sectionId: string,
    dto: ReorderModuleItemsDto,
    userId: string,
    userRoles: string[],
  ) {
    const section = await this.getModuleContextFromSection(sectionId);
    await this.assertClassWriteAccess(section.module.classId, userId, userRoles);

    if (dto.items.length === 0) {
      throw new BadRequestException('At least one item reorder entry is required');
    }

    const requestedIds = dto.items.map((item) => item.id);
    const existing = await this.db.query.moduleItems.findMany({
      where: and(
        eq(moduleItems.moduleSectionId, sectionId),
        inArray(moduleItems.id, requestedIds),
      ),
      columns: { id: true },
    });

    if (existing.length !== requestedIds.length) {
      throw new BadRequestException('One or more items do not belong to the section');
    }

    await this.db.transaction(async (tx) => {
      for (const item of dto.items) {
        await tx
          .update(moduleItems)
          .set({
            order: item.order,
            updatedAt: new Date(),
          })
          .where(eq(moduleItems.id, item.id));
      }
    });

    await this.auditService.log({
      actorId: userId,
      action: 'module.items_reordered',
      targetType: 'module_section',
      targetId: sectionId,
      metadata: {
        moduleId: section.module.id,
        itemIds: requestedIds,
      },
    });

    return this.db.query.moduleItems.findMany({
      where: eq(moduleItems.moduleSectionId, sectionId),
      orderBy: (table, { asc: byAsc }) => [byAsc(table.order)],
    });
  }

  async replaceGradingScale(
    moduleId: string,
    dto: ReplaceModuleGradingScaleDto,
    userId: string,
    userRoles: string[],
  ) {
    const module = await this.getModuleByIdOrThrow(moduleId);
    await this.assertClassWriteAccess(module.classId, userId, userRoles);

    for (const [index, entry] of dto.entries.entries()) {
      if (entry.minScore > entry.maxScore) {
        throw new BadRequestException(
          `Invalid score range at entry ${index + 1}: minScore cannot be greater than maxScore`,
        );
      }
    }

    await this.db.transaction(async (tx) => {
      await tx
        .delete(moduleGradingScaleEntries)
        .where(eq(moduleGradingScaleEntries.moduleId, moduleId));

      if (dto.entries.length === 0) return;

      await tx.insert(moduleGradingScaleEntries).values(
        dto.entries.map((entry, index) => ({
          moduleId,
          letter: entry.letter.trim(),
          label: entry.label.trim(),
          minScore: entry.minScore,
          maxScore: entry.maxScore,
          description: entry.description,
          order: entry.order ?? index + 1,
        })),
      );
    });

    await this.auditService.log({
      actorId: userId,
      action: 'module.grading_scale_replaced',
      targetType: 'module',
      targetId: moduleId,
      metadata: {
        classId: module.classId,
        entryCount: dto.entries.length,
      },
    });

    return this.db.query.moduleGradingScaleEntries.findMany({
      where: eq(moduleGradingScaleEntries.moduleId, moduleId),
      orderBy: [asc(moduleGradingScaleEntries.order)],
    });
  }
}
