import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { TeacherService } from './teacher.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, RoleName } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiBearerAuth('token')
@Controller('teacher')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeacherController {
  constructor(private teacherService: TeacherService) {}

  /**
   * Get all lessons for the current teacher
   */
  @Get('lessons')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async getLessons(@CurrentUser() user: any) {
    const lessons = await this.teacherService.getTeacherLessons(
      user.userId,
      user.roles,
    );
    return {
      success: true,
      data: lessons,
      count: lessons.length,
    };
  }

  /**
   * Get all classes for the current teacher
   */
  @Get('classes')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async getClasses(@CurrentUser() user: any) {
    const classes = await this.teacherService.getTeacherClasses(
      user.userId,
      user.roles,
    );
    return {
      success: true,
      data: classes,
      count: classes.length,
    };
  }

  /**
   * Get all assessments for the current teacher
   */
  @Get('assessments')
  @Roles(RoleName.Teacher, RoleName.Admin)
  async getAssessments(@CurrentUser() user: any) {
    const assessments = await this.teacherService.getTeacherAssessments(
      user.userId,
    );
    return {
      success: true,
      data: assessments,
      count: assessments.length,
    };
  }
}
