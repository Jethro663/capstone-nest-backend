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
import { Throttle } from '@nestjs/throttler';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './DTO/create-class.dto';
import { UpdateClassDto } from './DTO/update-class.dto';
import { EnrollStudentDto } from './DTO/enroll-student.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, RoleName } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
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
  @Roles(RoleName.Admin, RoleName.Teacher)
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
   * Get classes by teacher ID.
   * A teacher can only view their own classes; admins may view any.
   */
  @Get('teacher/:teacherId')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getClassesByTeacher(
    @Param('teacherId') teacherId: string,
    @CurrentUser() user: any,
  ) {
    const classes = await this.classesService.getClassesByTeacher(
      teacherId,
      user?.userId,
      user?.roles,
    );

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
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getClassesBySection(@Param('sectionId') sectionId: string) {
    const classes = await this.classesService.getClassesBySection(sectionId);

    return {
      success: true,
      message: 'Classes retrieved successfully',
      data: classes,
    };
  }

  /**
   * Get classes by subject code (e.g. "MATH-7").
   * The param accepts a subject code string, NOT a UUID.
   * Admin and Teacher can access.
   */
  @Get('subject/:subjectCode')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getClassesBySubject(@Param('subjectCode') subjectCode: string) {
    const classes = await this.classesService.getClassesBySubject(subjectCode);

    return {
      success: true,
      message: 'Classes retrieved successfully',
      data: classes,
    };
  }

  /**
   * Get classes enrolled by a student.
   * Students can only access their own records; teachers/admins may access any.
   */
  @Get('student/:studentId')
  @Roles(RoleName.Admin, RoleName.Teacher, RoleName.Student)
  async getClassesByStudent(
    @Param('studentId') studentId: string,
    @CurrentUser() user: any,
  ) {
    const classes = await this.classesService.getClassesByStudent(
      studentId,
      user?.userId,
      user?.roles,
    );

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
  @Roles(RoleName.Admin, RoleName.Teacher, RoleName.Student)
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
  @Roles(RoleName.Admin)
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
  @Roles(RoleName.Admin)
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
  @Roles(RoleName.Admin)
  async toggleClassStatus(@Param('id') id: string) {
    const updatedClass = await this.classesService.toggleActive(id);

    return {
      success: true,
      message: 'Class status toggled successfully',
      data: updatedClass,
    };
  }

  /**
   * Permanently purge an archived class and all related cascade data
   * Admin only
   */
  @Delete(':id/purge')
  @Roles(RoleName.Admin)
  async purgeClass(@Param('id') id: string) {
    await this.classesService.purge(id);

    return {
      success: true,
      message: 'Class permanently deleted',
    };
  }

  /**
   * Delete a class
   * Admin only
   */
  @Delete(':id')
  @Roles(RoleName.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteClass(@Param('id') id: string): Promise<void> {
    await this.classesService.delete(id);
    // 204 No Content — must not return a body
  }

  /**
   * Get all students enrolled in a class
   * Teacher (of the class) and Admin can access
   */
  @Get(':classId/enrollments')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getEnrollments(@Param('classId') classId: string) {
    const enrollments = await this.classesService.getEnrollments(classId);

    return {
      success: true,
      message: 'Enrollments retrieved successfully',
      data: enrollments,
      count: enrollments.length,
    };
  }

  /**
   * Get candidate students for enrollment in a class
   * Returns students from the section who are not yet enrolled in this class
   * Teacher (of the class) and Admin can access
   */
  @Get(':classId/candidates')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getCandidates(@Param('classId') classId: string) {
    const candidates = await this.classesService.getCandidates(classId);

    return {
      success: true,
      message: 'Candidates retrieved successfully',
      data: candidates,
      count: candidates.length,
    };
  }

  /**
   * Enroll a student in a class.
   * Teacher (of the class) and Admin can access.
   * Throttle raised: the UI may fire one request per student when batch-adding.
   */
  @Post(':classId/enrollments')
  @Roles(RoleName.Admin, RoleName.Teacher)
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  async enrollStudent(
    @Param('classId') classId: string,
    @Body() dto: EnrollStudentDto,
  ) {
    const enrollment = await this.classesService.enrollStudent(
      classId,
      dto.studentId,
    );

    return {
      success: true,
      message: 'Student enrolled successfully',
      data: enrollment,
    };
  }

  /**
   * Remove a student from a class
   * Teacher (of the class) and Admin can access
   */
  @Delete(':classId/enrollments/:studentId')
  @Roles(RoleName.Admin, RoleName.Teacher)
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  async removeStudent(
    @Param('classId') classId: string,
    @Param('studentId') studentId: string,
  ) {
    await this.classesService.removeStudent(classId, studentId);

    return {
      success: true,
      message: 'Student removed from class successfully',
    };
  }
}
