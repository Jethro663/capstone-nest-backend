import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LessonsService } from './lessons.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, RoleName } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateLessonDto,
  UpdateLessonDto,
  CreateContentBlockDto,
  UpdateContentBlockDto,
  ReorderBlocksDto,
} from './DTO/lesson.dto';

@ApiTags('Lessons')
@ApiBearerAuth('token')
@Controller('lessons')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LessonsController {
  constructor(private lessonsService: LessonsService) {}

  /**
   * Get all lessons for a class (ordered)
   * Admin, Teacher, and Student can access
   */
  @Get('class/:classId')
  @Roles(RoleName.Admin, RoleName.Teacher, RoleName.Student)
  async getLessonsByClass(@Param('classId') classId: string) {
    const lessonList = await this.lessonsService.getLessonsByClass(classId);

    return {
      success: true,
      message: 'Lessons retrieved successfully',
      data: lessonList,
      count: lessonList.length,
    };
  }

  /**
   * Get draft lessons for a class
   * Teachers can see AI-extracted drafts awaiting review
   */
  @Get('class/:classId/drafts')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getDraftLessons(@Param('classId') classId: string) {
    const drafts = await this.lessonsService.getDraftLessons(classId);

    return {
      success: true,
      message: `Found ${drafts.length} draft lesson(s)`,
      data: drafts,
      count: drafts.length,
    };
  }

  /**
   * Get a single lesson with all content blocks
   * Teacher and Admin can access
   */
  @Get(':id')
  @Roles(RoleName.Admin, RoleName.Teacher, RoleName.Student)
  async getLessonById(@Param('id') id: string) {
    const lesson = await this.lessonsService.getLessonById(id);

    return {
      success: true,
      message: 'Lesson retrieved successfully',
      data: lesson,
    };
  }

  /**
   * Create a new lesson
   * Teacher and Admin can access
   */
  @Post()
  @Roles(RoleName.Admin, RoleName.Teacher)
  @HttpCode(HttpStatus.CREATED)
  async createLesson(@Body() createLessonDto: CreateLessonDto) {
    const lesson = await this.lessonsService.createLesson(createLessonDto);

    return {
      success: true,
      message: 'Lesson created successfully',
      data: lesson,
    };
  }

  /**
   * Update a lesson
   * Teacher and Admin can access
   */
  @Put(':id')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async updateLesson(
    @Param('id') id: string,
    @Body() updateLessonDto: UpdateLessonDto,
  ) {
    const lesson = await this.lessonsService.updateLesson(id, updateLessonDto);

    return {
      success: true,
      message: 'Lesson updated successfully',
      data: lesson,
    };
  }

  /**
   * Publish a lesson
   * Teacher and Admin can access
   */
  @Put(':id/publish')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async publishLesson(@Param('id') id: string) {
    const lesson = await this.lessonsService.publishLesson(id);

    return {
      success: true,
      message: 'Lesson published successfully',
      data: lesson,
    };
  }

  /**
   * Delete a lesson
   * Teacher and Admin can access
   */
  @Delete(':id')
  @Roles(RoleName.Admin, RoleName.Teacher)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLesson(@Param('id') id: string) {
    await this.lessonsService.deleteLesson(id);

    return {
      success: true,
      message: 'Lesson deleted successfully',
    };
  }

  /**
   * Add a content block to a lesson
   * Teacher and Admin can access
   */
  @Post(':lessonId/blocks')
  @Roles(RoleName.Admin, RoleName.Teacher)
  @HttpCode(HttpStatus.CREATED)
  async addContentBlock(
    @Param('lessonId') lessonId: string,
    @Body() createBlockDto: CreateContentBlockDto,
  ) {
    const block = await this.lessonsService.addContentBlock({
      ...createBlockDto,
      lessonId,
    });

    return {
      success: true,
      message: 'Content block added successfully',
      data: block,
    };
  }

  /**
   * Update a content block
   * Teacher and Admin can access
   */
  @Put('blocks/:blockId')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async updateContentBlock(
    @Param('blockId') blockId: string,
    @Body() updateBlockDto: UpdateContentBlockDto,
  ) {
    const block = await this.lessonsService.updateContentBlock(
      blockId,
      updateBlockDto,
    );

    return {
      success: true,
      message: 'Content block updated successfully',
      data: block,
    };
  }

  /**
   * Delete a content block
   * Teacher and Admin can access
   */
  @Delete('blocks/:blockId')
  @Roles(RoleName.Admin, RoleName.Teacher)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteContentBlock(@Param('blockId') blockId: string) {
    await this.lessonsService.deleteContentBlock(blockId);

    return {
      success: true,
      message: 'Content block deleted successfully',
    };
  }

  /**
   * Reorder content blocks within a lesson
   * Teacher and Admin can access
   */
  @Put(':lessonId/reorder-blocks')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async reorderBlocks(
    @Param('lessonId') lessonId: string,
    @Body() reorderDto: ReorderBlocksDto,
  ) {
    const lesson = await this.lessonsService.reorderBlocks(
      lessonId,
      reorderDto,
    );

    return {
      success: true,
      message: 'Blocks reordered successfully',
      data: lesson,
    };
  }

  /**
   * Mark a lesson as complete for the current student
   * Students can mark their own lessons as complete
   */
  @Post(':lessonId/complete')
  @Roles(RoleName.Student)
  async markLessonComplete(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.lessonsService.markLessonComplete(
      user.userId,
      lessonId,
    );

    return {
      success: true,
      message: 'Lesson marked as complete',
      data: result,
    };
  }

  /**
   * Check if a student has completed a lesson
   * Students can check their own progress
   */
  @Get(':lessonId/completion-status')
  @Roles(RoleName.Student)
  async getCompletionStatus(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.lessonsService.isLessonCompleted(
      user.userId,
      lessonId,
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get all completed lessons for a student in a class
   * Students can view their own progress per class
   */
  @Get('class/:classId/completed')
  @Roles(RoleName.Student)
  async getCompletedLessons(
    @Param('classId') classId: string,
    @CurrentUser() user: any,
  ) {
    const completions = await this.lessonsService.getCompletedLessonsForClass(
      user.userId,
      classId,
    );

    return {
      success: true,
      data: completions,
      count: completions.length,
    };
  }
}

