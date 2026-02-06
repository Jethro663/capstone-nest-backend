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
