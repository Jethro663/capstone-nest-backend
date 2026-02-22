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
  ParseUUIDPipe,
} from '@nestjs/common';
import { SectionsService } from './sections.service';
import { CreateSectionDto } from './DTO/create-section.dto';
import { UpdateSectionDto } from './DTO/update-section.dto';
import { BulkStudentsDto } from './DTO/bulk-students.dto';
import { Throttle } from '@nestjs/throttler';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';

// JwtAuthGuard is already registered globally in AppModule via APP_GUARD.
// Only RolesGuard is applied at controller level to avoid double JWT verification.
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
  @Roles('admin', 'teacher')
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
    if (page) filters.page = parseInt(page, 10);
    if (limit) filters.limit = parseInt(limit, 10);

    const result = await this.sectionsService.findAll(filters);

    return { success: true, ...result };
  }

  /**
   * Get sections where the current user is the assigned adviser.
   * Admin and Teacher can access (admins without an advisory section get an empty list).
   */
  @Get('my')
  @Roles('admin', 'teacher')
  async getMySections(@CurrentUser() user: { userId: string; roles: string[] }) {
    const result = await this.sectionsService.findAll({ adviserId: user.userId });

    return { success: true, ...result };
  }

  /**
   * Get a single section by ID.
   * Teachers can only access sections they advise; admins can access all.
   */
  @Get(':id')
  @Roles('admin', 'teacher')
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
  @Roles('admin')
  async createSection(@Body() createSectionDto: CreateSectionDto) {
    const section = await this.sectionsService.createSection(createSectionDto);

    return { success: true, message: 'Section created successfully', data: section };
  }

  /**
   * Update a section.
   * Admin only.
   */
  @Put('update/:id')
  @Roles('admin')
  async updateSection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSectionDto: UpdateSectionDto,
  ) {
    const updatedSection = await this.sectionsService.updateSection(id, updateSectionDto);

    return { success: true, message: 'Section updated successfully', data: updatedSection };
  }

  /**
   * Soft-delete a section (sets isActive to false).
   * Admin only.
   */
  @Delete('delete/:id')
  @Roles('admin')
  async deleteSection(@Param('id', ParseUUIDPipe) id: string) {
    await this.sectionsService.deleteSection(id);

    return { success: true, message: 'Section deleted successfully (set to inactive)' };
  }

  /**
   * Get the roster (enrolled students) for a section.
   * Teachers can only view the roster of their own advised section.
   */
  @Get(':id/roster')
  @Roles('admin', 'teacher')
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
  @Roles('admin')
  async getCandidates(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('gradeLevel') gradeLevel?: string,
    @Query('search') search?: string,
  ) {
    const filters: { gradeLevel?: string; search?: string } = {};
    if (gradeLevel) filters.gradeLevel = gradeLevel;
    if (search) filters.search = search;

    const candidates = await this.sectionsService.getCandidates(id, filters);

    return { success: true, data: candidates, count: candidates.length };
  }

  /**
   * Add students to a section in bulk via a validated DTO.
   * Admin only.
   */
  @Post(':id/roster')
  @Roles('admin')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async addStudentsToSection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BulkStudentsDto,
  ) {
    const result = await this.sectionsService.addStudentsToSection(id, dto);

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
  @Roles('admin')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async removeStudentFromSection(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    const result = await this.sectionsService.removeStudentFromSection(id, studentId);

    return { success: true, data: result };
  }

  /**
   * Hard-delete a section and all its cascade data.
   * Admin only — blocked if active classes or enrolled students exist.
   */
  @Delete('permanent/:id')
  @Roles('admin')
  async permanentlyDeleteSection(@Param('id', ParseUUIDPipe) id: string) {
    await this.sectionsService.permanentlyDeleteSection(id);

    return { success: true, message: 'Section permanently deleted' };
  }

  /**
   * Get the weekly calendar schedule for all classes in a section.
   * Returns structured slot data (daysExpanded, startHour, startMinute, etc.)
   * so the frontend can directly position blocks on a calendar — no parsing needed.
   * Accessible by admins, teachers (own section), and students enrolled in the section.
   */
  @Get(':id/schedule')
  @Roles('admin', 'teacher', 'student')
  async getSectionSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const data = await this.sectionsService.getSectionSchedule(id, user);

    return { success: true, data };
  }
}
