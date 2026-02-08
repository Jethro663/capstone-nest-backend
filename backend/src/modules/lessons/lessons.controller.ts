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
import { Roles } from '../auth/decorators/roles.decorator';
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
  @Roles('admin', 'teacher', 'student')
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
   * Get a single lesson with all content blocks
   * Teacher and Admin can access
   */
  @Get(':id')
  @Roles('admin', 'teacher', 'student')
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
  @Roles('admin', 'teacher')
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
  @Roles('admin', 'teacher')
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
  @Roles('admin', 'teacher')
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
  @Roles('admin', 'teacher')
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
  @Roles('admin', 'teacher')
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
  @Roles('admin', 'teacher')
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
  @Roles('admin', 'teacher')
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
  @Roles('admin', 'teacher')
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
}
