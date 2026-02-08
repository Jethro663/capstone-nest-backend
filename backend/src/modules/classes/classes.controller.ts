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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './DTO/create-class.dto';
import { UpdateClassDto } from './DTO/update-class.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Classes')
@ApiBearerAuth('token')
@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassesController {
  constructor(private classesService: ClassesService) {}

  /**
   * Get all classes with optional filters
   * Admin and Teacher can access
   */
  @Get('all')
  @Roles('admin', 'teacher')
  async getAllClasses(
    @Query('subjectId') subjectId?: string,
    @Query('sectionId') sectionId?: string,
    @Query('teacherId') teacherId?: string,
    @Query('schoolYear') schoolYear?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: any = {};

    if (subjectId) {
      // Backwards compatible: treat subjectId as subjectCode when subjects were removed
      filters.subjectCode = subjectId;
    }
    if (sectionId) filters.sectionId = sectionId;
    if (teacherId) filters.teacherId = teacherId;
    if (schoolYear) filters.schoolYear = schoolYear;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (search) filters.search = search;
    if (page) filters.page = parseInt(page, 10);
    if (limit) filters.limit = parseInt(limit, 10);

    const classes = await this.classesService.findAll(filters);

    return {
      success: true,
      message: 'Classes retrieved successfully',
      data: classes,
    };
  }

  /**
   * Get classes by teacher ID
   * Admin and Teacher can access
   */
  @Get('teacher/:teacherId')
  @Roles('admin', 'teacher')
  async getClassesByTeacher(@Param('teacherId') teacherId: string) {
    const classes = await this.classesService.getClassesByTeacher(teacherId);

    return {
      success: true,
      message: 'Classes retrieved successfully',
      data: classes,
    };
  }

  /**
   * Get classes by section ID
   * Admin and Teacher can access
   */
  @Get('section/:sectionId')
  @Roles('admin', 'teacher')
  async getClassesBySection(@Param('sectionId') sectionId: string) {
    const classes = await this.classesService.getClassesBySection(sectionId);

    return {
      success: true,
      message: 'Classes retrieved successfully',
      data: classes,
    };
  }

  /**
   * Get classes by subject ID
   * Admin and Teacher can access
   */
  @Get('subject/:subjectId')
  @Roles('admin', 'teacher')
  async getClassesBySubject(@Param('subjectId') subjectId: string) {
    const classes = await this.classesService.getClassesBySubject(subjectId);

    return {
      success: true,
      message: 'Classes retrieved successfully',
      data: classes,
    };
  }

  /**
   * Get a specific class by ID
   */
  @Get(':id')
  @Roles('admin', 'teacher', 'student')
  async getClassById(@Param('id') id: string) {
    const classRecord = await this.classesService.findById(id);

    return {
      success: true,
      message: 'Class retrieved successfully',
      data: classRecord,
    };
  }

  /**
   * Create a new class
   * Admin only
   */
  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async createClass(@Body() createClassDto: CreateClassDto) {
    const newClass = await this.classesService.create(createClassDto);

    return {
      success: true,
      message: 'Class created successfully',
      data: newClass,
    };
  }

  /**
   * Update a class
   * Admin only
   */
  @Put(':id')
  @Roles('admin')
  async updateClass(
    @Param('id') id: string,
    @Body() updateClassDto: UpdateClassDto,
  ) {
    const updatedClass = await this.classesService.update(id, updateClassDto);

    return {
      success: true,
      message: 'Class updated successfully',
      data: updatedClass,
    };
  }

  /**
   * Toggle class active status
   * Admin only
   */
  @Put(':id/toggle-status')
  @Roles('admin')
  async toggleClassStatus(@Param('id') id: string) {
    const updatedClass = await this.classesService.toggleActive(id);

    return {
      success: true,
      message: 'Class status toggled successfully',
      data: updatedClass,
    };
  }

  /**
   * Delete a class
   * Admin only
   */
  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteClass(@Param('id') id: string) {
    await this.classesService.delete(id);

    return {
      success: true,
      message: 'Class deleted successfully',
    };
  }}