import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './DTO/create-subject.dto';
import { UpdateSubjectDto } from './DTO/update-subject.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth('token')
@Controller('subjects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubjectsController {
  constructor(private subjectsService: SubjectsService) {}

  /**
   * Get all subjects with optional filters
   * Admin only
   */
  @Get('all')
  @Roles('admin', 'teacher')
  async getAllSubjects(
    @Query('gradeLevel') gradeLevel?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: any = {};

    if (gradeLevel) filters.gradeLevel = gradeLevel;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (search) filters.search = search;
    if (page) filters.page = parseInt(page, 10);
    if (limit) filters.limit = parseInt(limit, 10);

    const subjects = await this.subjectsService.findAll(filters);

    return {
      success: true,
      data: subjects,
      count: subjects.length,
    };
  }

  /**
   * Get a single subject by ID
   * Admin and Teacher can access
   */
  @Get(':id')
  @Roles('admin', 'teacher')
  async getSubjectById(@Param('id') id: string) {
    const subject = await this.subjectsService.findById(id);

    return {
      success: true,
      data: subject,
    };
  }

  /**
   * Create a new subject
   * Admin only
   */
  @Post('create')
  @Roles('admin')
  async createSubject(@Body() createSubjectDto: CreateSubjectDto) {
    const subject = await this.subjectsService.createSubject(createSubjectDto);

    return {
      success: true,
      message: 'Subject created successfully',
      data: subject,
    };
  }

  /**
   * Update a subject
   * Admin only
   */
  @Put('update/:id')
  @Roles('admin')
  async updateSubject(
    @Param('id') id: string,
    @Body() updateSubjectDto: UpdateSubjectDto,
  ) {
    const updatedSubject = await this.subjectsService.updateSubject(
      id,
      updateSubjectDto,
    );

    return {
      success: true,
      message: 'Subject updated successfully',
      data: updatedSubject,
    };
  }

  /**
   * Soft delete a subject (set isActive to false)
   * Admin only
   */
  @Delete('delete/:id')
  @Roles('admin')
  async deleteSubject(@Param('id') id: string) {
    await this.subjectsService.deleteSubject(id);

    return {
      success: true,
      message: 'Subject deleted successfully (set to inactive)',
    };
  }

  /**
   * Permanently delete a subject
   * Admin only - Use with extreme caution
   */
  @Delete('permanent/:id')
  @Roles('admin')
  async permanentlyDeleteSubject(@Param('id') id: string) {
    await this.subjectsService.permanentlyDeleteSubject(id);

    return {
      success: true,
      message: 'Subject permanently deleted',
    };
  }
}
