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
   * Get all lessons for a class (ordered).
   * Students only receive published lessons; Admin/Teacher see all (including drafts).
   */
  @Get('class/:classId')
  @Roles(RoleName.Admin, RoleName.Teacher, RoleName.Student)
  async getLessonsByClass(
    @Param('classId') classId: string,
    @CurrentUser() user: any,
  ) {
    const filterDrafts: boolean = user.roles.includes(RoleName.Student);
    const lessonList = await this.lessonsService.getLessonsByClass(
      classId,
      filterDrafts,
    );

    return {
      success: true,
      message: 'Lessons retrieved successfully',
      data: lessonList,
      count: lessonList.length,
    };
  }

  /**
   * Get draft lessons for a class.
   * Teachers can see AI-extracted drafts awaiting review.
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
   * Get a single lesson with all content blocks.
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
   * Create a new lesson (Teacher / Admin).
   */
  @Post()
  @Roles(RoleName.Admin, RoleName.Teacher)
  @HttpCode(HttpStatus.CREATED)
  async createLesson(
    @Body() createLessonDto: CreateLessonDto,
    @CurrentUser() user: any,
  ) {
    const lesson = await this.lessonsService.createLesson(
      createLessonDto,
      user.userId,
      user.roles,
    );

    return {
      success: true,
      message: 'Lesson created successfully',
      data: lesson,
    };
  }

  /**
   * Update a lesson (Teacher / Admin).
   */
  @Put(':id')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async updateLesson(
    @Param('id') id: string,
    @Body() updateLessonDto: UpdateLessonDto,
    @CurrentUser() user: any,
  ) {
    const lesson = await this.lessonsService.updateLesson(
      id,
      updateLessonDto,
      user.userId,
      user.roles,
    );

    return {
      success: true,
      message: 'Lesson updated successfully',
      data: lesson,
    };
  }

  /**
   * Publish a lesson — sets isDraft = false (Teacher / Admin).
   */
  @Put(':id/publish')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async publishLesson(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const lesson = await this.lessonsService.publishLesson(
      id,
      user.userId,
      user.roles,
    );

    return {
      success: true,
      message: 'Lesson published successfully',
      data: lesson,
    };
  }

  /**
   * Delete a lesson and all its content (Teacher / Admin).
   * Returns 200 with a JSON body for consistency with the rest of the API.
   */
  @Delete(':id')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async deleteLesson(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    await this.lessonsService.deleteLesson(id, user.userId, user.roles);

    return {
      success: true,
      message: 'Lesson deleted successfully',
    };
  }

  /**
   * Add a content block to a lesson (Teacher / Admin).
   * The lessonId is always taken from the URL parameter; any lessonId value
   * in the request body is overwritten.
   */
  @Post(':lessonId/blocks')
  @Roles(RoleName.Admin, RoleName.Teacher)
  @HttpCode(HttpStatus.CREATED)
  async addContentBlock(
    @Param('lessonId') lessonId: string,
    @Body() createBlockDto: CreateContentBlockDto,
    @CurrentUser() user: any,
  ) {
    const block = await this.lessonsService.addContentBlock(
      { ...createBlockDto, lessonId },
      user.userId,
      user.roles,
    );

    return {
      success: true,
      message: 'Content block added successfully',
      data: block,
    };
  }

  /**
   * Update a content block (Teacher / Admin).
   */
  @Put('blocks/:blockId')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async updateContentBlock(
    @Param('blockId') blockId: string,
    @Body() updateBlockDto: UpdateContentBlockDto,
    @CurrentUser() user: any,
  ) {
    const block = await this.lessonsService.updateContentBlock(
      blockId,
      updateBlockDto,
      user.userId,
      user.roles,
    );

    return {
      success: true,
      message: 'Content block updated successfully',
      data: block,
    };
  }

  /**
   * Delete a content block (Teacher / Admin).
   * Returns 200 with a JSON body for consistency with the rest of the API.
   */
  @Delete('blocks/:blockId')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async deleteContentBlock(
    @Param('blockId') blockId: string,
    @CurrentUser() user: any,
  ) {
    await this.lessonsService.deleteContentBlock(
      blockId,
      user.userId,
      user.roles,
    );

    return {
      success: true,
      message: 'Content block deleted successfully',
    };
  }

  /**
   * Atomically reorder content blocks within a lesson (Teacher / Admin).
   */
  @Put(':lessonId/reorder-blocks')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async reorderBlocks(
    @Param('lessonId') lessonId: string,
    @Body() reorderDto: ReorderBlocksDto,
    @CurrentUser() user: any,
  ) {
    const lesson = await this.lessonsService.reorderBlocks(
      lessonId,
      reorderDto,
      user.userId,
      user.roles,
    );

    return {
      success: true,
      message: 'Blocks reordered successfully',
      data: lesson,
    };
  }

  /**
   * Mark a lesson as complete for the authenticated student.
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
   * Check if the authenticated student has completed a lesson.
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
   * Get all completed lessons for the authenticated student in a class.
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
