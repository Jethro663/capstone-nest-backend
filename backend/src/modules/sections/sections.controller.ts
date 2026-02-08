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
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { SectionsService } from './sections.service';
import { CreateSectionDto } from './DTO/create-section.dto';
import { UpdateSectionDto } from './DTO/update-section.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth('token')
@Controller('sections')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SectionsController {
  constructor(private sectionsService: SectionsService) {}

  /**
   * Get all sections with optional filters
   * Admin and Teacher can access
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
    const filters: any = {};

    if (gradeLevel) filters.gradeLevel = gradeLevel;
    if (schoolYear) filters.schoolYear = schoolYear;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (search) filters.search = search;
    if (page) filters.page = parseInt(page, 10);
    if (limit) filters.limit = parseInt(limit, 10);

    const sections = await this.sectionsService.findAll(filters);

    return {
      success: true,
      data: sections,
      count: sections.length,
    };
  }

  /**
   * Get sections assigned to the current logged-in teacher
   * Teacher only
   */
  @Get('my')
  @Roles('teacher')
  async getMySections(@Req() req: any) {
    const userId = req?.user?.userId;

    // Ensure the request is authenticated and contains the user id
    if (!userId) {
      throw new UnauthorizedException('You must be logged in to access your sections');
    }

    const sections = await this.sectionsService.findAll({ adviserId: userId });

    return {
      success: true,
      data: sections,
      count: sections.length,
    };
  }

  /**
   * Get a single section by ID
   * Admin and Teacher can access
   */
  @Get(':id')
  @Roles('admin', 'teacher')
  async getSectionById(@Param('id') id: string) {
    const section = await this.sectionsService.findById(id);

    return {
      success: true,
      data: section,
    };
  }

  /**
   * Create a new section
   * Admin only
   */
  @Post('create')
  @Roles('admin')
  async createSection(@Body() createSectionDto: CreateSectionDto) {
    const section = await this.sectionsService.createSection(createSectionDto);

    return {
      success: true,
      message: 'Section created successfully',
      data: section,
    };
  }

  /**
   * Update a section
   * Admin only
   */
  @Put('update/:id')
  @Roles('admin')
  async updateSection(
    @Param('id') id: string,
    @Body() updateSectionDto: UpdateSectionDto,
  ) {
    const updatedSection = await this.sectionsService.updateSection(
      id,
      updateSectionDto,
    );

    return {
      success: true,
      message: 'Section updated successfully',
      data: updatedSection,
    };
  }

  /**
   * Soft delete a section (set isActive to false)
   * Admin only
   */
  @Delete('delete/:id')
  @Roles('admin')
  async deleteSection(@Param('id') id: string) {
    await this.sectionsService.deleteSection(id);

    return {
      success: true,
      message: 'Section deleted successfully (set to inactive)',
    };
  }

  /**
   * Get roster (students) for a section
   * Admin and Teacher can access
   */
  @Get(':id/roster')
  @Roles('admin', 'teacher')
  async getRoster(@Param('id') id: string) {
    const roster = await this.sectionsService.getRoster(id);

    return {
      success: true,
      data: roster,
      count: roster.length,
    };
  }

  /**
   * Get candidate students to add to a section (not currently members)
   * Admin only
   */
  @Get(':id/candidates')
  @Roles('admin')
  async getCandidates(@Param('id') id: string, @Query('gradeLevel') gradeLevel?: string, @Query('search') search?: string) {
    const filters: any = {};
    if (gradeLevel) filters.gradeLevel = gradeLevel;
    if (search) filters.search = search;

    const candidates = await this.sectionsService.getCandidates(id, filters);

    return {
      success: true,
      data: candidates,
      count: candidates.length,
    };
  }

  /**
   * Add students to a section
   * Admin only
   */
  @Post(':id/roster')
  @Roles('admin')
  async addStudentsToSection(@Param('id') id: string, @Body('studentIds') studentIds: string[]) {
    const result = await this.sectionsService.addStudentsToSection(id, studentIds);

    return {
      success: true,
      message: `${result.createdCount} students added to section`,
      data: result,
    };
  }

  /**
   * Remove student from a section
   * Admin only
   */
  @Delete(':id/roster/:studentId')
  @Roles('admin')
  async removeStudentFromSection(@Param('id') id: string, @Param('studentId') studentId: string) {
    const result = await this.sectionsService.removeStudentFromSection(id, studentId);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Permanently delete a section
   * Admin only - Use with extreme caution
   */
  @Delete('permanent/:id')
  @Roles('admin')
  async permanentlyDeleteSection(@Param('id') id: string) {
    await this.sectionsService.permanentlyDeleteSection(id);

    return {
      success: true,
      message: 'Section permanently deleted',
    };
  }
}
