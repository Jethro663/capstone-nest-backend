import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Patch,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './DTO/create-class.dto';
import { UpdateClassDto } from './DTO/update-class.dto';
import { UpdateClassPresentationDto } from './DTO/update-class-presentation.dto';
import { UpdateStudentClassPresentationDto } from './DTO/update-student-class-presentation.dto';
import { UpdateStudentCourseViewDto } from './DTO/update-student-course-view.dto';
import { EnrollStudentDto } from './DTO/enroll-student.dto';
import { BulkClassLifecycleDto } from './DTO/bulk-class-lifecycle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, RoleName } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { parsePositiveIntQuery } from '../../common/utils/parse-positive-int-query.util';
import { Public } from '../auth/decorators/public.decorator';

const CLASS_BANNER_UPLOAD_DEST = './uploads/class-banners';

const bannerMulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(CLASS_BANNER_UPLOAD_DEST, { recursive: true });
      cb(null, CLASS_BANNER_UPLOAD_DEST);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.png';
      cb(null, `${uuidv4()}_${Date.now()}${ext}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    cb(null, file.mimetype.startsWith('image/'));
  },
};

@ApiTags('Classes')
@ApiBearerAuth('token')
@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassesController {
  constructor(private classesService: ClassesService) {}

  /**
   * Backward-compatible classes listing endpoint.
   * Some legacy clients still call GET /classes.
   */
  @Get()
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getAllClassesLegacy(
    @Query('subjectId') subjectId?: string,
    @Query('sectionId') sectionId?: string,
    @Query('teacherId') teacherId?: string,
    @Query('schoolYear') schoolYear?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.getAllClasses(
      subjectId,
      sectionId,
      teacherId,
      schoolYear,
      isActive,
      search,
      page,
      limit,
    );
  }

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
    filters.page = parsePositiveIntQuery(page, 'page');
    filters.limit = parsePositiveIntQuery(limit, 'limit');

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
    @Query('status')
    statusQuery: 'active' | 'archived' | 'hidden' | 'all' | undefined,
    @CurrentUser() user: any,
  ) {
    const classes = await this.classesService.getClassesByTeacher(
      teacherId,
      user?.userId,
      user?.roles,
      statusQuery === 'active' ||
        statusQuery === 'archived' ||
        statusQuery === 'hidden'
        ? statusQuery
        : 'all',
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
    @Query('status')
    statusQuery: 'active' | 'archived' | 'hidden' | 'all' | undefined,
    @CurrentUser() user: any,
  ) {
    const classes = await this.classesService.getClassesByStudent(
      studentId,
      user?.userId,
      user?.roles,
      statusQuery === 'active' ||
        statusQuery === 'archived' ||
        statusQuery === 'hidden'
        ? statusQuery
        : 'all',
    );

    return {
      success: true,
      message: 'Classes retrieved successfully',
      data: classes,
    };
  }

  @Get('student/:studentId/preferences/presentation')
  @Roles(RoleName.Admin, RoleName.Student)
  async getStudentClassPresentationPreferences(
    @Param('studentId') studentId: string,
    @CurrentUser() user: any,
  ) {
    const preferences =
      await this.classesService.getStudentClassPresentationPreferences(
        studentId,
        user?.userId,
        user?.roles,
      );

    return {
      success: true,
      message: 'Student class presentation preferences retrieved successfully',
      data: preferences,
    };
  }

  @Put(':id/student-presentation')
  @Roles(RoleName.Student)
  async updateStudentClassPresentation(
    @Param('id') id: string,
    @Body() dto: UpdateStudentClassPresentationDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.classesService.updateStudentClassPresentationPreference(
      id,
      user?.userId,
      user?.roles ?? [],
      dto,
    );

    return {
      success: true,
      message: 'Student class presentation updated successfully',
      data,
    };
  }

  @Get('student/:studentId/preferences/view')
  @Roles(RoleName.Admin, RoleName.Student)
  async getStudentCourseViewPreference(
    @Param('studentId') studentId: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.classesService.getStudentCourseViewPreference(
      studentId,
      user?.userId,
      user?.roles,
    );

    return {
      success: true,
      message: 'Student course view preference retrieved successfully',
      data,
    };
  }

  @Put('student/:studentId/preferences/view')
  @Roles(RoleName.Admin, RoleName.Student)
  async setStudentCourseViewPreference(
    @Param('studentId') studentId: string,
    @Body() dto: UpdateStudentCourseViewDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.classesService.setStudentCourseViewPreference(
      studentId,
      user?.userId,
      user?.roles,
      dto.viewMode,
    );

    return {
      success: true,
      message: 'Student course view preference updated successfully',
      data,
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
  async createClass(
    @Body() createClassDto: CreateClassDto,
    @CurrentUser() user: any,
  ) {
    const newClass = await this.classesService.create(
      createClassDto,
      user?.userId,
      user?.roles ?? [],
    );

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
    @CurrentUser() user: any,
  ) {
    const updatedClass = await this.classesService.update(
      id,
      updateClassDto,
      user?.userId,
      user?.roles ?? [],
    );

    return {
      success: true,
      message: 'Class updated successfully',
      data: updatedClass,
    };
  }

  @Patch(':id/presentation')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async updateClassPresentation(
    @Param('id') id: string,
    @Body() dto: UpdateClassPresentationDto,
    @CurrentUser() user: any,
  ) {
    const updatedClass = await this.classesService.updatePresentation(
      id,
      dto,
      user?.userId,
      user?.roles,
    );

    return {
      success: true,
      message: 'Class presentation updated successfully',
      data: updatedClass,
    };
  }

  @Post(':id/banner')
  @Roles(RoleName.Admin, RoleName.Teacher)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('image', bannerMulterOptions))
  async uploadClassBanner(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      return {
        success: false,
        message: 'Image upload is required',
      };
    }

    const cardBannerUrl = `/api/classes/banners/${file.filename}`;
    const updatedClass = await this.classesService.updatePresentation(
      id,
      { cardBannerUrl },
      user?.userId,
      user?.roles,
    );

    return {
      success: true,
      message: 'Class banner uploaded successfully',
      data: {
        cardBannerUrl,
        class: updatedClass,
      },
    };
  }

  /**
   * Toggle class active status
   * Admin only
   */
  @Put(':id/toggle-status')
  @Roles(RoleName.Admin)
  async toggleClassStatus(@Param('id') id: string, @CurrentUser() user: any) {
    const updatedClass = await this.classesService.toggleActive(
      id,
      user?.userId,
      user?.roles ?? [],
    );

    return {
      success: true,
      message: 'Class status toggled successfully',
      data: updatedClass,
    };
  }

  @Post('bulk/lifecycle')
  @Roles(RoleName.Admin)
  async bulkLifecycle(
    @Body() dto: BulkClassLifecycleDto,
    @CurrentUser() user: any,
  ) {
    const result = await this.classesService.bulkLifecycleAction(
      dto,
      user?.userId,
      user?.roles ?? [],
    );

    return {
      success: true,
      message: result.message,
      data: result.data,
    };
  }

  /**
   * Permanently purge an archived class and all related cascade data
   * Admin only
   */
  @Delete(':id/purge')
  @Roles(RoleName.Admin)
  async purgeClass(@Param('id') id: string, @CurrentUser() user: any) {
    await this.classesService.purge(id, user?.userId, user?.roles ?? []);

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
  async deleteClass(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<void> {
    await this.classesService.delete(id, user?.userId, user?.roles ?? []);
    // 204 No Content — must not return a body
  }

  /**
   * Get all students enrolled in a class
   * Teacher (of the class) and Admin can access
   */
  @Patch(':id/hide')
  @Roles(RoleName.Admin, RoleName.Teacher, RoleName.Student)
  async hideClass(@Param('id') id: string, @CurrentUser() user: any) {
    const data = await this.classesService.setClassHiddenState(
      id,
      user?.userId,
      user?.roles ?? [],
      true,
    );

    return {
      success: true,
      message: 'Class hidden successfully',
      data,
    };
  }

  @Patch(':id/unhide')
  @Roles(RoleName.Admin, RoleName.Teacher, RoleName.Student)
  async unhideClass(@Param('id') id: string, @CurrentUser() user: any) {
    const data = await this.classesService.setClassHiddenState(
      id,
      user?.userId,
      user?.roles ?? [],
      false,
    );

    return {
      success: true,
      message: 'Class restored successfully',
      data,
    };
  }

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
   * Get a student profile in class context.
   * Teacher (owner of class) and Admin can access.
   */
  @Get(':classId/students/:studentId/profile')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getStudentProfileForClass(
    @Param('classId') classId: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.classesService.getStudentProfileForClass(
      classId,
      studentId,
      user?.userId,
      user?.roles,
    );

    return {
      success: true,
      message: 'Student profile retrieved successfully',
      data,
    };
  }

  /**
   * Get a student overview in class context.
   * Teacher (owner of class) and Admin can access.
   */
  @Get(':classId/students/:studentId/overview')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getStudentOverviewForClass(
    @Param('classId') classId: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.classesService.getStudentOverviewForClass(
      classId,
      studentId,
      user?.userId,
      user?.roles,
    );

    return {
      success: true,
      message: 'Student overview retrieved successfully',
      data,
    };
  }

  /**
   * Get paginated student masterlist for class enrollment.
   * Teacher (owner of class) and Admin can access.
   */
  @Get(':classId/students/masterlist')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getStudentsMasterlistForClass(
    @Param('classId') classId: string,
    @CurrentUser() user: any,
    @Query('gradeLevel') gradeLevel?: string,
    @Query('sectionId') sectionId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.classesService.getStudentsMasterlistForClass(
      classId,
      user?.userId,
      user?.roles,
      {
        gradeLevel,
        sectionId,
        search,
        page: parsePositiveIntQuery(page, 'page'),
        limit: parsePositiveIntQuery(limit, 'limit'),
      },
    );

    return {
      success: true,
      message: 'Student masterlist retrieved successfully',
      ...result,
      count: result.data.length,
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
    @CurrentUser() user: any,
  ) {
    const enrollment = await this.classesService.enrollStudent(
      classId,
      dto.studentId,
      user?.userId,
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
    @CurrentUser() user: any,
  ) {
    await this.classesService.removeStudent(classId, studentId, user?.userId);

    return {
      success: true,
      message: 'Student removed from class successfully',
    };
  }
}

@ApiTags('Classes')
@Controller('classes')
export class ClassesPublicController {
  @Public()
  @Get('banners/:filename')
  async serveClassBanner(
    @Param('filename') filename: string,
    @Res() res: any,
  ) {
    const sanitized = path.basename(filename);
    const filePath = path.join(CLASS_BANNER_UPLOAD_DEST, sanitized);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        success: false,
        message: 'Banner not found',
      });
      return;
    }

    return res.sendFile(path.resolve(filePath));
  }
}
