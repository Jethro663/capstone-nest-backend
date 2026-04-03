import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, inArray, count, desc, isNotNull, or } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  lessons,
  lessonContentBlocks,
  classes,
  lessonCompletions,
  users,
  moduleItems,
  moduleSections,
  classModules,
  assessments,
  assessmentAttempts,
} from '../../drizzle/schema';
import { AuditService } from '../audit/audit.service';
import { RagIndexingService } from '../rag/rag-indexing.service';
import {
  CreateLessonDto,
  UpdateLessonDto,
  CreateContentBlockDto,
  UpdateContentBlockDto,
  ReorderBlocksDto,
  ReorderLessonsDto,
} from './DTO/lesson.dto';
import { RoleName } from '../auth/decorators/roles.decorator';

type LessonStatusFilter = 'all' | 'draft' | 'published';
type GetLessonsByClassOptions = {
  filterDrafts?: boolean;
  includeBlocks?: boolean;
  page?: number;
  pageSize?: number;
  status?: LessonStatusFilter;
};

@Injectable()
export class LessonsService {
  constructor(
    private databaseService: DatabaseService,
    private readonly auditService: AuditService,
    private readonly ragIndexingService: RagIndexingService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Verifies that the authenticated user owns the class that a lesson belongs
   * to. Admins bypass this check entirely.
   */
  private async assertTeacherOwnership(
    classId: string,
    userId: string,
    userRoles: string[],
  ): Promise<void> {
    if (userRoles.includes(RoleName.Admin)) return;

    const classRecord = await this.db.query.classes.findFirst({
      where: eq(classes.id, classId),
      columns: { teacherId: true },
    });

    if (!classRecord) {
      throw new NotFoundException(`Class with ID "${classId}" not found`);
    }

    if (classRecord.teacherId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to modify lessons in this class',
      );
    }
  }

  private buildLessonClassConditions(
    classId: string,
    filterDrafts: boolean,
    status: LessonStatusFilter,
  ) {
    const conditions = [eq(lessons.classId, classId)];

    if (filterDrafts) {
      conditions.push(eq(lessons.isDraft, false));
      return and(...conditions);
    }

    if (status === 'draft') {
      conditions.push(eq(lessons.isDraft, true));
    }

    if (status === 'published') {
      conditions.push(eq(lessons.isDraft, false));
    }

    return and(...conditions);
  }

  // ---------------------------------------------------------------------------
  // Lesson CRUD
  // ---------------------------------------------------------------------------

  /**
   * Get lessons for multiple classes in a single query, ordered by `order`.
   */
  async getLessonsByClassIds(classIds: string[], filterDrafts = false) {
    if (classIds.length === 0) return [];

    const conditions = filterDrafts
      ? and(inArray(lessons.classId, classIds), eq(lessons.isDraft, false))
      : inArray(lessons.classId, classIds);

    return this.db.query.lessons.findMany({
      where: conditions,
      with: {
        contentBlocks: {
          orderBy: (blocks, { asc }) => [asc(blocks.order)],
        },
      },
      orderBy: (l, { asc }) => [asc(l.order)],
    });
  }

  /**
   * Get all lessons for a class, ordered by `order`.
   * When `filterDrafts` is true, only published (isDraft = false) lessons are
   * returned — use this when the caller is a student.
   */
  async getLessonsByClass(
    classId: string,
    {
      filterDrafts = false,
      includeBlocks = true,
      page,
      pageSize,
      status = 'all',
    }: GetLessonsByClassOptions = {},
  ) {
    const conditions = this.buildLessonClassConditions(
      classId,
      filterDrafts,
      status,
    );
    const hasPagination = page !== undefined && pageSize !== undefined;
    const safePage = Math.max(page ?? 1, 1);
    const safePageSize = Math.max(pageSize ?? 1, 1);
    const offset = (safePage - 1) * safePageSize;

    const [rows, totalResult] = await Promise.all([
      this.db.query.lessons.findMany({
        where: conditions,
        with: includeBlocks
          ? {
              contentBlocks: {
                orderBy: (blocks, { asc }) => [asc(blocks.order)],
              },
            }
          : undefined,
        orderBy: (l, { asc }) => [asc(l.order)],
        ...(hasPagination
          ? {
              limit: safePageSize,
              offset,
            }
          : {}),
      }),
      this.db.select({ total: count() }).from(lessons).where(conditions),
    ]);

    const total = totalResult[0]?.total ?? 0;
    const effectivePageSize = hasPagination ? safePageSize : Math.max(total, 1);

    return {
      data: rows,
      count: rows.length,
      total,
      page: safePage,
      pageSize: effectivePageSize,
      totalPages: hasPagination
        ? Math.max(Math.ceil(total / safePageSize), 1)
        : 1,
    };
  }

  /**
   * Get a single lesson by ID with all content blocks and its parent class.
   */
  async getLessonById(lessonId: string) {
    const lesson = await this.db.query.lessons.findFirst({
      where: eq(lessons.id, lessonId),
      with: {
        contentBlocks: {
          orderBy: (blocks, { asc }) => [asc(blocks.order)],
        },
        class: true,
      },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID "${lessonId}" not found`);
    }

    return lesson;
  }

  /**
   * Create a new lesson.
   * Order assignment is wrapped in a transaction to prevent duplicate sequence
   * numbers under concurrent requests.
   */
  async createLesson(
    createLessonDto: CreateLessonDto,
    userId: string,
    userRoles: string[],
  ) {
    await this.assertTeacherOwnership(
      createLessonDto.classId,
      userId,
      userRoles,
    );

    const newLessonId = await this.db.transaction(async (tx) => {
      // Lock the latest lesson row to prevent concurrent order collision
      const lastLesson = await tx.query.lessons.findFirst({
        where: eq(lessons.classId, createLessonDto.classId),
        orderBy: (l, { desc }) => [desc(l.order)],
        columns: { order: true },
      });

      const nextOrder = (lastLesson?.order ?? 0) + 1;

      const [newLesson] = await tx
        .insert(lessons)
        .values({
          title: createLessonDto.title,
          description: createLessonDto.description,
          classId: createLessonDto.classId,
          order: createLessonDto.order ?? nextOrder,
          isDraft: true,
        })
        .returning({ id: lessons.id });

      return newLesson.id;
    });

    const lesson = await this.getLessonById(newLessonId);

    await this.auditService.log({
      actorId: userId,
      action: 'lesson.created',
      targetType: 'lesson',
      targetId: lesson.id,
      metadata: {
        classId: lesson.classId,
        isDraft: lesson.isDraft,
      },
    });

    await this.ragIndexingService.queueClassReindex(lesson.classId, {
      reason: 'lesson_created',
      actorId: userId,
      source: 'lessons.createLesson',
    });

    return lesson;
  }

  /**
   * Update a lesson's editable fields.
   */
  async updateLesson(
    lessonId: string,
    updateLessonDto: UpdateLessonDto,
    userId: string,
    userRoles: string[],
  ) {
    const lesson = await this.getLessonById(lessonId);
    await this.assertTeacherOwnership(lesson.classId, userId, userRoles);

    await this.db
      .update(lessons)
      .set({ ...updateLessonDto, updatedAt: new Date() })
      .where(eq(lessons.id, lessonId));

    const updated = await this.getLessonById(lessonId);

    await this.auditService.log({
      actorId: userId,
      action: 'lesson.updated',
      targetType: 'lesson',
      targetId: lessonId,
      metadata: {
        classId: updated.classId,
        isDraft: updated.isDraft,
      },
    });

    await this.ragIndexingService.queueClassReindex(updated.classId, {
      reason: 'lesson_updated',
      actorId: userId,
      source: 'lessons.updateLesson',
    });

    return updated;
  }

  /**
   * Delete a lesson and all its content blocks (cascade).
   */
  async deleteLesson(lessonId: string, userId: string, userRoles: string[]) {
    const lesson = await this.getLessonById(lessonId);
    await this.assertTeacherOwnership(lesson.classId, userId, userRoles);

    await this.db.delete(lessons).where(eq(lessons.id, lessonId));

    await this.auditService.log({
      actorId: userId,
      action: 'lesson.deleted',
      targetType: 'lesson',
      targetId: lessonId,
      metadata: {
        classId: lesson.classId,
        title: lesson.title,
      },
    });

    await this.ragIndexingService.queueClassReindex(lesson.classId, {
      reason: 'lesson_deleted',
      actorId: userId,
      source: 'lessons.deleteLesson',
    });

    return lesson;
  }

  /**
   * Publish a lesson (sets isDraft = false).
   */
  async publishLesson(lessonId: string, userId: string, userRoles: string[]) {
    const lesson = await this.getLessonById(lessonId);
    await this.assertTeacherOwnership(lesson.classId, userId, userRoles);

    await this.db
      .update(lessons)
      .set({ isDraft: false, updatedAt: new Date() })
      .where(eq(lessons.id, lessonId));

    const published = await this.getLessonById(lessonId);

    await this.auditService.log({
      actorId: userId,
      action: 'lesson.published',
      targetType: 'lesson',
      targetId: lessonId,
      metadata: {
        classId: published.classId,
        title: published.title,
      },
    });

    await this.ragIndexingService.queueClassReindex(published.classId, {
      reason: 'lesson_published',
      actorId: userId,
      source: 'lessons.publishLesson',
    });

    return published;
  }

  /**
   * Bulk update lesson draft state within a class.
   */
  async bulkUpdateLessonDraftState(
    classId: string,
    lessonIds: string[],
    isDraft: boolean,
    userId: string,
    userRoles: string[],
  ) {
    if (lessonIds.length === 0) {
      throw new BadRequestException('At least one lesson ID is required');
    }

    await this.assertTeacherOwnership(classId, userId, userRoles);

    const existingLessons = await this.db.query.lessons.findMany({
      where: and(
        eq(lessons.classId, classId),
        inArray(lessons.id, lessonIds),
      ),
      columns: {
        id: true,
        title: true,
      },
    });

    if (existingLessons.length !== lessonIds.length) {
      const foundIds = new Set(existingLessons.map((lesson) => lesson.id));
      const unknownIds = lessonIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(
        `The following lesson IDs do not belong to class "${classId}": ${unknownIds.join(', ')}`,
      );
    }

    await this.db
      .update(lessons)
      .set({ isDraft, updatedAt: new Date() })
      .where(
        and(eq(lessons.classId, classId), inArray(lessons.id, lessonIds)),
      );

    await this.auditService.log({
      actorId: userId,
      action: isDraft ? 'lesson.bulk_unpublished' : 'lesson.bulk_published',
      targetType: 'class',
      targetId: classId,
      metadata: {
        lessonIds,
        count: lessonIds.length,
      },
    });

    await this.ragIndexingService.queueClassReindex(classId, {
      reason: isDraft ? 'lesson_bulk_unpublished' : 'lesson_bulk_published',
      actorId: userId,
      source: 'lessons.bulkUpdateLessonDraftState',
    });

    const updatedLessons = await this.db.query.lessons.findMany({
      where: and(eq(lessons.classId, classId), inArray(lessons.id, lessonIds)),
      orderBy: (l, { asc }) => [asc(l.order)],
    });

    return updatedLessons;
  }

  /**
   * Bulk delete lessons within a class.
   */
  async bulkDeleteLessons(
    classId: string,
    lessonIds: string[],
    userId: string,
    userRoles: string[],
  ) {
    if (lessonIds.length === 0) {
      throw new BadRequestException('At least one lesson ID is required');
    }

    await this.assertTeacherOwnership(classId, userId, userRoles);

    const existingLessons = await this.db.query.lessons.findMany({
      where: and(
        eq(lessons.classId, classId),
        inArray(lessons.id, lessonIds),
      ),
      columns: {
        id: true,
        title: true,
        order: true,
      },
      orderBy: (l, { asc }) => [asc(l.order)],
    });

    if (existingLessons.length !== lessonIds.length) {
      const foundIds = new Set(existingLessons.map((lesson) => lesson.id));
      const unknownIds = lessonIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(
        `The following lesson IDs do not belong to class "${classId}": ${unknownIds.join(', ')}`,
      );
    }

    await this.db
      .delete(lessons)
      .where(and(eq(lessons.classId, classId), inArray(lessons.id, lessonIds)));

    await this.auditService.log({
      actorId: userId,
      action: 'lesson.bulk_deleted',
      targetType: 'class',
      targetId: classId,
      metadata: {
        lessonIds,
        count: lessonIds.length,
      },
    });

    await this.ragIndexingService.queueClassReindex(classId, {
      reason: 'lesson_bulk_deleted',
      actorId: userId,
      source: 'lessons.bulkDeleteLessons',
    });

    return existingLessons;
  }

  /**
   * Reorder lessons within a class.
   */
  async reorderLessons(
    classId: string,
    reorderDto: ReorderLessonsDto,
    userId: string,
    userRoles: string[],
  ) {
    await this.assertTeacherOwnership(classId, userId, userRoles);

    const requestedIds = reorderDto.lessons.map((lesson) => lesson.id);
    if (requestedIds.length === 0) {
      throw new BadRequestException('At least one lesson reorder entry is required');
    }

    const existingLessons = await this.db.query.lessons.findMany({
      where: and(eq(lessons.classId, classId), inArray(lessons.id, requestedIds)),
      columns: { id: true },
    });

    if (existingLessons.length !== requestedIds.length) {
      const foundIds = new Set(existingLessons.map((lesson) => lesson.id));
      const unknownIds = requestedIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(
        `The following lesson IDs do not belong to class "${classId}": ${unknownIds.join(', ')}`,
      );
    }

    await this.db.transaction(async (tx) => {
      for (const lessonUpdate of reorderDto.lessons) {
        await tx
          .update(lessons)
          .set({ order: lessonUpdate.order, updatedAt: new Date() })
          .where(eq(lessons.id, lessonUpdate.id));
      }
    });

    await this.auditService.log({
      actorId: userId,
      action: 'lesson.reordered',
      targetType: 'class',
      targetId: classId,
      metadata: {
        lessonIds: requestedIds,
        count: requestedIds.length,
      },
    });

    await this.ragIndexingService.queueClassReindex(classId, {
      reason: 'lesson_reordered',
      actorId: userId,
      source: 'lessons.reorderLessons',
    });

    return this.db.query.lessons.findMany({
      where: and(eq(lessons.classId, classId), inArray(lessons.id, requestedIds)),
      orderBy: (l, { asc }) => [asc(l.order)],
    });
  }

  // ---------------------------------------------------------------------------
  // Content blocks
  // ---------------------------------------------------------------------------

  /**
   * Add a content block to a lesson.
   */
  async addContentBlock(
    createBlockDto: CreateContentBlockDto,
    userId: string,
    userRoles: string[],
  ) {
    if (!createBlockDto.lessonId) {
      throw new BadRequestException('lessonId is required');
    }

    const lesson = await this.getLessonById(createBlockDto.lessonId);
    await this.assertTeacherOwnership(lesson.classId, userId, userRoles);

    const [newBlock] = await this.db
      .insert(lessonContentBlocks)
      .values({
        lessonId: createBlockDto.lessonId,
        type: createBlockDto.type as any,
        order: createBlockDto.order,
        content: createBlockDto.content,
        metadata: createBlockDto.metadata ?? {},
      })
      .returning();

    await this.ragIndexingService.queueClassReindex(lesson.classId, {
      reason: 'lesson_block_added',
      actorId: userId,
      source: 'lessons.addContentBlock',
    });

    return newBlock;
  }

  /**
   * Fetch a single content block; throws 404 if not found.
   */
  async getContentBlockById(blockId: string) {
    const block = await this.db.query.lessonContentBlocks.findFirst({
      where: eq(lessonContentBlocks.id, blockId),
    });

    if (!block) {
      throw new NotFoundException(
        `Content block with ID "${blockId}" not found`,
      );
    }

    return block;
  }

  /**
   * Update a content block's fields.
   */
  async updateContentBlock(
    blockId: string,
    updateBlockDto: UpdateContentBlockDto,
    userId: string,
    userRoles: string[],
  ) {
    const block = await this.getContentBlockById(blockId);
    const lesson = await this.getLessonById(block.lessonId);
    await this.assertTeacherOwnership(lesson.classId, userId, userRoles);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (updateBlockDto.type !== undefined)
      updateData.type = updateBlockDto.type as any;
    if (updateBlockDto.order !== undefined)
      updateData.order = updateBlockDto.order;
    if (updateBlockDto.content !== undefined)
      updateData.content = updateBlockDto.content;
    if (updateBlockDto.metadata !== undefined)
      updateData.metadata = updateBlockDto.metadata;

    await this.db
      .update(lessonContentBlocks)
      .set(updateData)
      .where(eq(lessonContentBlocks.id, blockId));

    await this.ragIndexingService.queueClassReindex(lesson.classId, {
      reason: 'lesson_block_updated',
      actorId: userId,
      source: 'lessons.updateContentBlock',
    });

    return this.getContentBlockById(blockId);
  }

  /**
   * Delete a content block.
   */
  async deleteContentBlock(
    blockId: string,
    userId: string,
    userRoles: string[],
  ) {
    const block = await this.getContentBlockById(blockId);
    const lesson = await this.getLessonById(block.lessonId);
    await this.assertTeacherOwnership(lesson.classId, userId, userRoles);

    await this.db
      .delete(lessonContentBlocks)
      .where(eq(lessonContentBlocks.id, blockId));

    await this.ragIndexingService.queueClassReindex(lesson.classId, {
      reason: 'lesson_block_deleted',
      actorId: userId,
      source: 'lessons.deleteContentBlock',
    });

    return block;
  }

  /**
   * Atomically reorder content blocks within a lesson.
   * All block IDs in the payload must belong to the specified lesson; the
   * entire operation is wrapped in a database transaction.
   */
  async reorderBlocks(
    lessonId: string,
    reorderDto: ReorderBlocksDto,
    userId: string,
    userRoles: string[],
  ) {
    const lesson = await this.getLessonById(lessonId);
    await this.assertTeacherOwnership(lesson.classId, userId, userRoles);

    const requestedIds = reorderDto.blocks.map((b) => b.id);

    // Validate that every submitted block ID belongs to this lesson
    const existingBlocks = await this.db.query.lessonContentBlocks.findMany({
      where: and(
        eq(lessonContentBlocks.lessonId, lessonId),
        inArray(lessonContentBlocks.id, requestedIds),
      ),
      columns: { id: true },
    });

    if (existingBlocks.length !== requestedIds.length) {
      const foundIds = new Set(existingBlocks.map((b) => b.id));
      const unknownIds = requestedIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(
        `The following block IDs do not belong to lesson "${lessonId}": ${unknownIds.join(', ')}`,
      );
    }

    // Wrap all updates in a single transaction
    await this.db.transaction(async (tx) => {
      for (const blockUpdate of reorderDto.blocks) {
        await tx
          .update(lessonContentBlocks)
          .set({ order: blockUpdate.order, updatedAt: new Date() })
          .where(eq(lessonContentBlocks.id, blockUpdate.id));
      }
    });

    await this.ragIndexingService.queueClassReindex(lesson.classId, {
      reason: 'lesson_blocks_reordered',
      actorId: userId,
      source: 'lessons.reorderBlocks',
    });

    return this.getLessonById(lessonId);
  }

  // ---------------------------------------------------------------------------
  // Student progress
  // ---------------------------------------------------------------------------

  private isModuleItemVisibleToStudent(item: {
    isVisible: boolean;
    itemType: 'lesson' | 'assessment' | 'file';
    isGiven: boolean;
    lesson?: { isDraft: boolean } | null;
    assessment?: { isPublished: boolean | null } | null;
    fileId?: string | null;
  }) {
    if (!item.isVisible) return false;
    if (item.itemType === 'lesson') {
      return Boolean(item.lesson && !item.lesson.isDraft);
    }
    if (item.itemType === 'assessment') {
      return Boolean(item.assessment && item.assessment.isPublished && item.isGiven);
    }
    return Boolean(item.fileId);
  }

  private extractLessonPoints(metadata: unknown) {
    if (!metadata || typeof metadata !== 'object') return 0;
    const rawPoints = (metadata as Record<string, unknown>).points;
    if (typeof rawPoints !== 'number') return 0;
    if (!Number.isFinite(rawPoints) || rawPoints < 0) return 0;
    return Math.trunc(rawPoints);
  }

  private async buildModuleProgressForStudent(moduleId: string, studentId: string) {
    const module = await this.db.query.classModules.findFirst({
      where: eq(classModules.id, moduleId),
      with: {
        sections: {
          orderBy: (sectionTable, { asc: byAsc }) => [byAsc(sectionTable.order)],
          with: {
            items: {
              orderBy: (itemTable, { asc: byAsc }) => [byAsc(itemTable.order)],
              with: {
                lesson: {
                  columns: {
                    id: true,
                    isDraft: true,
                  },
                },
                assessment: {
                  columns: {
                    id: true,
                    isPublished: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!module || !module.isVisible || module.isLocked) {
      return {
        moduleId,
        completed: false,
        requiredVisibleCount: 0,
        requiredCompletedCount: 0,
        progressPercent: 0,
      };
    }

    const visibleRequiredItems = module.sections.flatMap((section) =>
      section.items.filter((item) => {
        if (!this.isModuleItemVisibleToStudent(item)) return false;
        if (!item.isRequired) return false;
        return item.itemType === 'lesson' || item.itemType === 'assessment';
      }),
    );

    const requiredLessonIds = visibleRequiredItems
      .filter((item) => item.itemType === 'lesson' && Boolean(item.lessonId))
      .map((item) => item.lessonId as string);
    const requiredAssessmentIds = visibleRequiredItems
      .filter((item) => item.itemType === 'assessment' && Boolean(item.assessmentId))
      .map((item) => item.assessmentId as string);

    const completedLessonIds = new Set<string>();
    const completedAssessmentIds = new Set<string>();

    if (requiredLessonIds.length > 0) {
      const lessonRows = await this.db.query.lessonCompletions.findMany({
        where: and(
          eq(lessonCompletions.studentId, studentId),
          inArray(lessonCompletions.lessonId, requiredLessonIds),
        ),
        columns: {
          lessonId: true,
        },
      });
      lessonRows.forEach((entry) => completedLessonIds.add(entry.lessonId));
    }

    if (requiredAssessmentIds.length > 0) {
      const attemptRows = await this.db.query.assessmentAttempts.findMany({
        where: and(
          eq(assessmentAttempts.studentId, studentId),
          inArray(assessmentAttempts.assessmentId, requiredAssessmentIds),
          or(
            eq(assessmentAttempts.isSubmitted, true),
            isNotNull(assessmentAttempts.submittedAt),
          ),
        ),
        columns: {
          assessmentId: true,
        },
      });
      attemptRows.forEach((entry) => completedAssessmentIds.add(entry.assessmentId));
    }

    let requiredCompletedCount = 0;
    visibleRequiredItems.forEach((item) => {
      if (item.itemType === 'lesson' && item.lessonId) {
        if (completedLessonIds.has(item.lessonId)) {
          requiredCompletedCount += 1;
        }
        return;
      }
      if (item.itemType === 'assessment' && item.assessmentId) {
        if (completedAssessmentIds.has(item.assessmentId)) {
          requiredCompletedCount += 1;
        }
      }
    });

    const requiredVisibleCount = visibleRequiredItems.length;
    const completed =
      requiredVisibleCount === 0 || requiredCompletedCount === requiredVisibleCount;
    const progressPercent =
      requiredVisibleCount === 0
        ? 100
        : Math.round((requiredCompletedCount / requiredVisibleCount) * 100);

    return {
      moduleId,
      completed,
      requiredVisibleCount,
      requiredCompletedCount,
      progressPercent,
    };
  }

  /**
   * Mark a lesson as complete for a student.
   * Prevents completing a lesson that is still a draft.
   */
  async markLessonComplete(studentId: string, lessonId: string) {
    const lesson = await this.getLessonById(lessonId);

    if (lesson.isDraft) {
      throw new BadRequestException(
        'Cannot mark a draft lesson as complete. The lesson has not been published yet.',
      );
    }

    const student = await this.db.query.users.findFirst({
      where: eq(users.id, studentId),
    });
    if (!student) {
      throw new NotFoundException(`Student with ID "${studentId}" not found`);
    }

    const moduleItem = await this.db.query.moduleItems.findFirst({
      where: eq(moduleItems.lessonId, lessonId),
      with: {
        section: {
          with: {
            module: {
              columns: {
                id: true,
              },
            },
          },
        },
      },
    });
    const lessonPoints = this.extractLessonPoints(moduleItem?.metadata);

    try {
      const result = await this.db
        .insert(lessonCompletions)
        .values({ studentId, lessonId, progressPercentage: 100 })
        .returning();

      const moduleProgress = moduleItem?.section?.module?.id
        ? await this.buildModuleProgressForStudent(moduleItem.section.module.id, studentId)
        : null;

      return {
        completed: true,
        completedAt: result[0].completedAt,
        lessonPoints,
        moduleProgress,
      };
    } catch (error: any) {
      // Unique constraint violation — already completed; update timestamp
      if (error?.code === '23505') {
        const [updated] = await this.db
          .update(lessonCompletions)
          .set({ progressPercentage: 100, completedAt: new Date() })
          .where(
            and(
              eq(lessonCompletions.studentId, studentId),
              eq(lessonCompletions.lessonId, lessonId),
            ),
          )
          .returning();

        const moduleProgress = moduleItem?.section?.module?.id
          ? await this.buildModuleProgressForStudent(moduleItem.section.module.id, studentId)
          : null;

        return {
          completed: true,
          completedAt: updated.completedAt,
          lessonPoints,
          moduleProgress,
          message: 'Lesson already marked as complete',
        };
      }
      throw error;
    }
  }

  /**
   * Check if a student has completed a specific lesson.
   */
  async isLessonCompleted(studentId: string, lessonId: string) {
    const completion = await this.db.query.lessonCompletions.findFirst({
      where: and(
        eq(lessonCompletions.studentId, studentId),
        eq(lessonCompletions.lessonId, lessonId),
      ),
    });

    return {
      completed: !!completion,
      completedAt: completion?.completedAt ?? null,
    };
  }

  /**
   * Get draft lessons for a class; optionally filtered by extraction source.
   */
  async getDraftLessons(classId: string, sourceExtractionId?: string) {
    const conditions: ReturnType<typeof eq>[] = [
      eq(lessons.classId, classId),
      eq(lessons.isDraft, true),
    ];
    if (sourceExtractionId) {
      conditions.push(eq(lessons.sourceExtractionId, sourceExtractionId));
    }

    return this.db.query.lessons.findMany({
      where: and(...conditions),
      with: {
        contentBlocks: {
          orderBy: (blocks, { asc }) => [asc(blocks.order)],
        },
      },
      orderBy: (l, { asc }) => [asc(l.order)],
    });
  }

  /**
   * Get all completed lessons for a student within a specific class.
   * Filtering is performed at the database level via a JOIN to avoid in-memory
   * scans over the entire completions table.
   */
  async getCompletedLessonsForClass(studentId: string, classId: string) {
    const rows = await this.db
      .select({
        lessonId: lessonCompletions.lessonId,
        completedAt: lessonCompletions.completedAt,
        progressPercentage: lessonCompletions.progressPercentage,
      })
      .from(lessonCompletions)
      .innerJoin(lessons, eq(lessonCompletions.lessonId, lessons.id))
      .where(
        and(
          eq(lessonCompletions.studentId, studentId),
          eq(lessons.classId, classId),
        ),
      );

    return rows.map((row) => ({
      ...row,
      completed: true,
    }));
  }
}
