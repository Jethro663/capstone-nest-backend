import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { lessons, lessonContentBlocks, classes } from '../../drizzle/schema';
import { CreateLessonDto, UpdateLessonDto, CreateContentBlockDto, UpdateContentBlockDto, ReorderBlocksDto } from './DTO/lesson.dto';

@Injectable()
export class LessonsService {
  constructor(private databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  /**
   * Get all lessons for a class
   */
  async getLessonsByClass(classId: string) {
    const lessonList = await this.db.query.lessons.findMany({
      where: eq(lessons.classId, classId),
      with: {
        contentBlocks: {
          orderBy: (blocks, { asc }) => [asc(blocks.order)],
        },
      },
      orderBy: (lessons, { asc }) => [asc(lessons.order)],
    });

    return lessonList;
  }

  /**
   * Get a single lesson by ID with all content blocks
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
   * Create a new lesson
   */
  async createLesson(createLessonDto: CreateLessonDto) {
    // Verify class exists
    const classRecord = await this.db.query.classes.findFirst({
      where: eq(classes.id, createLessonDto.classId),
    });

    if (!classRecord) {
      throw new BadRequestException(
        `Class with ID "${createLessonDto.classId}" not found`,
      );
    }

    // Get the highest order number for this class
    const lastLesson = await this.db.query.lessons.findFirst({
      where: eq(lessons.classId, createLessonDto.classId),
      orderBy: (lessons, { desc }) => [desc(lessons.order)],
    });

    const nextOrder = (lastLesson?.order || 0) + 1;

    const [newLesson] = await this.db
      .insert(lessons)
      .values({
        title: createLessonDto.title,
        description: createLessonDto.description,
        classId: createLessonDto.classId,
        order: createLessonDto.order || nextOrder,
        isDraft: true,
      })
      .returning();

    return this.getLessonById(newLesson.id);
  }

  /**
   * Update a lesson
   */
  async updateLesson(lessonId: string, updateLessonDto: UpdateLessonDto) {
    // Verify lesson exists
    await this.getLessonById(lessonId);

    await this.db
      .update(lessons)
      .set({
        ...updateLessonDto,
        updatedAt: new Date(),
      })
      .where(eq(lessons.id, lessonId));

    return this.getLessonById(lessonId);
  }

  /**
   * Delete a lesson (cascades to content blocks)
   */
  async deleteLesson(lessonId: string) {
    const lesson = await this.getLessonById(lessonId);

    await this.db.delete(lessons).where(eq(lessons.id, lessonId));

    return lesson;
  }

  /**
   * Publish a lesson (toggle isDraft to false)
   */
  async publishLesson(lessonId: string) {
    const lesson = await this.getLessonById(lessonId);

    await this.db
      .update(lessons)
      .set({
        isDraft: false,
        updatedAt: new Date(),
      })
      .where(eq(lessons.id, lessonId));

    return this.getLessonById(lessonId);
  }

  /**
   * Add a content block to a lesson
   */
  async addContentBlock(createBlockDto: CreateContentBlockDto) {
    // Ensure lessonId was provided (controller should merge lessonId param)
    if (!createBlockDto.lessonId) {
      throw new BadRequestException('lessonId is required');
    }

    // Verify lesson exists
    const lesson = await this.getLessonById(createBlockDto.lessonId);

    const [newBlock] = await this.db
      .insert(lessonContentBlocks)
      .values({
        lessonId: createBlockDto.lessonId,
        type: createBlockDto.type as any,
        order: createBlockDto.order,
        content: createBlockDto.content,
        metadata: createBlockDto.metadata || {},
      })
      .returning();

    return newBlock;
  }

  /**
   * Get a single content block
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
   * Update a content block
   */
  async updateContentBlock(
    blockId: string,
    updateBlockDto: UpdateContentBlockDto,
  ) {
    // Verify block exists
    await this.getContentBlockById(blockId);

    const updateData: any = { updatedAt: new Date() };
    
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
   * Delete a content block
   */
  async deleteContentBlock(blockId: string) {
    const block = await this.getContentBlockById(blockId);

    await this.db
      .delete(lessonContentBlocks)
      .where(eq(lessonContentBlocks.id, blockId));

    return block;
  }

  /**
   * Reorder content blocks within a lesson
   */
  async reorderBlocks(lessonId: string, reorderDto: ReorderBlocksDto) {
    // Verify lesson exists
    await this.getLessonById(lessonId);

    // Update order for each block
    for (const blockUpdate of reorderDto.blocks) {
      await this.db
        .update(lessonContentBlocks)
        .set({
          order: blockUpdate.order,
          updatedAt: new Date(),
        })
        .where(eq(lessonContentBlocks.id, blockUpdate.id));
    }

    // Return updated lesson
    return this.getLessonById(lessonId);
  }
}
