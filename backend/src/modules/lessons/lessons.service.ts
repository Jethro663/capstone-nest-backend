import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, inArray } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  lessons,
  lessonContentBlocks,
  classes,
  lessonCompletions,
  users,
} from '../../drizzle/schema';
import {
  CreateLessonDto,
  UpdateLessonDto,
  CreateContentBlockDto,
  UpdateContentBlockDto,
  ReorderBlocksDto,
} from './DTO/lesson.dto';
import { RoleName } from '../auth/decorators/roles.decorator';

@Injectable()
export class LessonsService {
  constructor(private databaseService: DatabaseService) {}

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
  async getLessonsByClass(classId: string, filterDrafts = false) {
    const conditions = filterDrafts
      ? and(eq(lessons.classId, classId), eq(lessons.isDraft, false))
      : eq(lessons.classId, classId);

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

    return this.getLessonById(newLessonId);
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

    return this.getLessonById(lessonId);
  }

  /**
   * Delete a lesson and all its content blocks (cascade).
   */
  async deleteLesson(
    lessonId: string,
    userId: string,
    userRoles: string[],
  ) {
    const lesson = await this.getLessonById(lessonId);
    await this.assertTeacherOwnership(lesson.classId, userId, userRoles);

    await this.db.delete(lessons).where(eq(lessons.id, lessonId));

    return lesson;
  }

  /**
   * Publish a lesson (sets isDraft = false).
   */
  async publishLesson(
    lessonId: string,
    userId: string,
    userRoles: string[],
  ) {
    const lesson = await this.getLessonById(lessonId);
    await this.assertTeacherOwnership(lesson.classId, userId, userRoles);

    await this.db
      .update(lessons)
      .set({ isDraft: false, updatedAt: new Date() })
      .where(eq(lessons.id, lessonId));

    return this.getLessonById(lessonId);
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

    if (updateBlockDto.type !== undefined) updateData.type = updateBlockDto.type as any;
    if (updateBlockDto.order !== undefined) updateData.order = updateBlockDto.order;
    if (updateBlockDto.content !== undefined) updateData.content = updateBlockDto.content;
    if (updateBlockDto.metadata !== undefined) updateData.metadata = updateBlockDto.metadata;

    await this.db
      .update(lessonContentBlocks)
      .set(updateData)
      .where(eq(lessonContentBlocks.id, blockId));

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

    return this.getLessonById(lessonId);
  }

  // ---------------------------------------------------------------------------
  // Student progress
  // ---------------------------------------------------------------------------

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

    try {
      const result = await this.db
        .insert(lessonCompletions)
        .values({ studentId, lessonId, progressPercentage: 100 })
        .returning();

      return { isCompleted: true, completedAt: result[0].completedAt };
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

        return {
          isCompleted: true,
          completedAt: updated.completedAt,
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
      isCompleted: !!completion,
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

    return rows;
  }
}

