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
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { SectionsService } from './sections.service';
import { CreateSectionDto } from './DTO/create-section.dto';
import { UpdateSectionDto } from './DTO/update-section.dto';
import { UpdateSectionPresentationDto } from './DTO/update-section-presentation.dto';
import { BulkStudentsDto } from './DTO/bulk-students.dto';
import { BulkSectionLifecycleDto } from './DTO/bulk-section-lifecycle.dto';
import { Throttle } from '@nestjs/throttler';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, RoleName } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { parsePositiveIntQuery } from '../../common/utils/parse-positive-int-query.util';
import { Public } from '../auth/decorators/public.decorator';

const SECTION_BANNER_UPLOAD_DEST = './uploads/section-banners';

const sectionBannerMulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(SECTION_BANNER_UPLOAD_DEST, { recursive: true });
      cb(null, SECTION_BANNER_UPLOAD_DEST);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.png';
      cb(null, `${uuidv4()}_${Date.now()}${ext}`);
    },
  }),
  limits: {
    fileSize: 12 * 1024 * 1024,
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

// JwtAuthGuard is already registered globally in AppModule via APP_GUARD.
// Only RolesGuard is applied at controller level to avoid double JWT verification.
@ApiTags('Sections')
@ApiBearerAuth('token')
@Controller('sections')
@UseGuards(RolesGuard)
export class SectionsController {
  constructor(private sectionsService: SectionsService) {}

  /**
   * Get all sections with optional filters and pagination metadata.
   * Admin and Teacher can access.
   */
  @Get('all')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getAllSections(
    @Query('gradeLevel') gradeLevel?: string,
    @Query('schoolYear') schoolYear?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: {
      gradeLevel?: string;
      schoolYear?: string;
      isActive?: boolean;
      search?: string;
      page?: number;
      limit?: number;
    } = {};

    if (gradeLevel) filters.gradeLevel = gradeLevel;
    if (schoolYear) filters.schoolYear = schoolYear;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (search) filters.search = search;
    filters.page = parsePositiveIntQuery(page, 'page');
    filters.limit = parsePositiveIntQuery(limit, 'limit');

    const result = await this.sectionsService.findAll(filters);

    return { success: true, ...result };
  }

  /**
   * Get sections where the current user is the assigned adviser.
   * Admin and Teacher can access (admins without an advisory section get an empty list).
   */
  @Get('my')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getMySections(
    @Query('status')
    statusQuery:
      | 'active'
      | 'archived'
      | 'hidden'
      | 'all'
      | undefined,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const normalizedStatus = statusQuery ?? 'all';
    const result = await this.sectionsService.findAll({
      adviserId: user.userId,
      requesterId: user.userId,
      status: normalizedStatus,
    });

    return { success: true, ...result };
  }

  /**
   * Get a single section by ID.
   * Teachers can only access sections they advise; admins can access all.
   */
  @Get(':id')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getSectionById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const section = await this.sectionsService.findById(id, user);

    return { success: true, data: section };
  }

  /**
   * Create a new section.
   * Admin only.
   */
  @Post('create')
  @Roles(RoleName.Admin)
  async createSection(
    @Body() createSectionDto: CreateSectionDto,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const section = await this.sectionsService.createSection(
      createSectionDto,
      user?.userId,
      user?.roles ?? [],
    );

    return {
      success: true,
      message: 'Section created successfully',
      data: section,
    };
  }

  /**
   * Update a section.
   * Admin only.
   */
  @Put('update/:id')
  @Roles(RoleName.Admin)
  async updateSection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSectionDto: UpdateSectionDto,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const updatedSection = await this.sectionsService.updateSection(
      id,
      updateSectionDto,
      user?.userId,
      user?.roles ?? [],
    );

    return {
      success: true,
      message: 'Section updated successfully',
      data: updatedSection,
    };
  }

  @Patch(':id/presentation')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async updateSectionPresentation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSectionPresentationDto,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const updatedSection = await this.sectionsService.updatePresentation(
      id,
      dto,
      user?.userId,
      user?.roles,
    );

    return {
      success: true,
      message: 'Section presentation updated successfully',
      data: updatedSection,
    };
  }

  @Post(':id/banner')
  @Roles(RoleName.Admin, RoleName.Teacher)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('image', sectionBannerMulterOptions))
  async uploadSectionBanner(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    if (!file) {
      return {
        success: false,
        message: 'Image upload is required',
      };
    }

    const cardBannerUrl = `/api/sections/banners/${file.filename}`;
    const updatedSection = await this.sectionsService.updatePresentation(
      id,
      { cardBannerUrl },
      user?.userId,
      user?.roles,
    );

    return {
      success: true,
      message: 'Section banner uploaded successfully',
      data: {
        cardBannerUrl,
        section: updatedSection,
      },
    };
  }

  /**
   * Soft-delete a section (sets isActive to false).
   * Admin only.
   */
  @Delete('delete/:id')
  @Roles(RoleName.Admin)
  async deleteSection(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    await this.sectionsService.archiveSection(id, user?.userId, user?.roles ?? []);

    return {
      success: true,
      message: 'Section archived successfully',
    };
  }

  @Post('bulk/lifecycle')
  @Roles(RoleName.Admin)
  async bulkLifecycle(
    @Body() dto: BulkSectionLifecycleDto,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const result = await this.sectionsService.bulkLifecycleAction(
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

  @Patch(':id/hide')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async hideSection(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.sectionsService.setSectionHiddenState(
      id,
      user?.userId,
      user?.roles ?? [],
      true,
    );

    return {
      success: true,
      message: 'Section hidden successfully',
      data,
    };
  }

  @Patch(':id/unhide')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async unhideSection(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.sectionsService.setSectionHiddenState(
      id,
      user?.userId,
      user?.roles ?? [],
      false,
    );

    return {
      success: true,
      message: 'Section restored successfully',
      data,
    };
  }

  /**
   * Restore an archived section (sets isActive to true).
   * Admin only.
   */
  @Put(':id/restore')
  @Roles(RoleName.Admin)
  async restoreSection(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    await this.sectionsService.restoreSection(id, user?.userId, user?.roles ?? []);

    return {
      success: true,
      message: 'Section restored successfully',
    };
  }

  /**
   * Get the roster (enrolled students) for a section.
   * Teachers can only view the roster of their own advised section.
   */
  @Get(':id/roster')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getRoster(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const roster = await this.sectionsService.getRoster(id, user);

    return { success: true, data: roster, count: roster.length };
  }

  /**
   * Get candidate students who are not yet enrolled in the section.
   * Admin only.
   */
  @Get(':id/candidates')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getCandidates(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
    @Query('gradeLevel') gradeLevel?: string,
    @Query('search') search?: string,
    @Query('assignedSectionId') assignedSectionId?: string,
    @Query('eligibility') eligibility?: 'all' | 'eligible' | 'mismatch',
    @Query('sortBy')
    sortBy?:
      | 'lastName'
      | 'firstName'
      | 'email'
      | 'gradeLevel'
      | 'lrn'
      | 'eligibility',
    @Query('sortDirection') sortDirection?: 'asc' | 'desc',
    @Query('prioritizeEligible') prioritizeEligible?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: {
      gradeLevel?: string;
      search?: string;
      assignedSectionId?: string;
      eligibility?: 'all' | 'eligible' | 'mismatch';
      sortBy?:
        | 'lastName'
        | 'firstName'
        | 'email'
        | 'gradeLevel'
        | 'lrn'
        | 'eligibility';
      sortDirection?: 'asc' | 'desc';
      prioritizeEligible?: boolean;
      page?: number;
      limit?: number;
    } = {};
    if (gradeLevel) filters.gradeLevel = gradeLevel;
    if (search) filters.search = search;
    if (assignedSectionId) filters.assignedSectionId = assignedSectionId;
    if (eligibility) filters.eligibility = eligibility;
    if (sortBy) filters.sortBy = sortBy;
    if (sortDirection) filters.sortDirection = sortDirection;
    if (prioritizeEligible !== undefined) {
      filters.prioritizeEligible = prioritizeEligible !== 'false';
    }
    filters.page = parsePositiveIntQuery(page, 'page');
    filters.limit = parsePositiveIntQuery(limit, 'limit');

    const result = await this.sectionsService.getCandidates(
      id,
      filters,
      user,
    );

    if (Array.isArray(result)) {
      return { success: true, data: result, count: result.length };
    }

    return { ...result, success: true, data: result.data, count: result.data.length };
  }

  /**
   * Add students to a section in bulk via a validated DTO.
   * Admin only.
   */
  @Post(':id/roster')
  @Roles(RoleName.Admin, RoleName.Teacher)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async addStudentsToSection(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
    @Body() dto: BulkStudentsDto,
  ) {
    const result = await this.sectionsService.addStudentsToSection(
      id,
      dto,
      user,
    );

    return {
      success: true,
      message: `${result.createdCount} student(s) added to section`,
      data: result,
    };
  }

  /**
   * Remove a student from a section (only if not enrolled in a class within it).
   * Admin only.
   */
  @Delete(':id/roster/:studentId')
  @Roles(RoleName.Admin, RoleName.Teacher)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async removeStudentFromSection(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const result = await this.sectionsService.removeStudentFromSection(
      id,
      studentId,
      user,
    );

    return { success: true, data: result };
  }

  /**
   * Hard-delete a section and all its cascade data.
   * Admin only — blocked if active classes or enrolled students exist.
   */
  @Delete('permanent/:id')
  @Roles(RoleName.Admin)
  async permanentlyDeleteSection(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    await this.sectionsService.permanentlyDeleteSection(
      id,
      user?.userId,
      user?.roles ?? [],
    );

    return { success: true, message: 'Section permanently deleted' };
  }

  /**
   * Get a student profile in section context.
   * Teacher (owner of section) and Admin can access.
   */
  @Get(':id/students/:studentId/profile')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getStudentProfileForSection(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.sectionsService.getStudentProfileForSection(
      id,
      studentId,
      user,
    );

    return {
      success: true,
      message: 'Student profile retrieved successfully',
      data,
    };
  }

  /**
   * Get the weekly calendar schedule for all classes in a section.
   * Returns structured slot data (daysExpanded, startHour, startMinute, etc.)
   * so the frontend can directly position blocks on a calendar — no parsing needed.
   * Accessible by admins, teachers (own section), and students enrolled in the section.
   */
  @Get(':id/schedule')
  @Roles(RoleName.Admin, RoleName.Teacher, RoleName.Student)
  async getSectionSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.sectionsService.getSectionSchedule(id, user);

    return { success: true, data };
  }
}

@ApiTags('Sections')
@Controller('sections')
export class SectionsPublicController {
  @Public()
  @Get('banners/:filename')
  async serveSectionBanner(
    @Param('filename') filename: string,
    @Res() res: any,
  ) {
    const sanitized = path.basename(filename);
    const filePath = path.join(SECTION_BANNER_UPLOAD_DEST, sanitized);

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
