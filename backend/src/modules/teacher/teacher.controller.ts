import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { LessonsService } from '../lessons/lessons.service';
import { AssessmentsService } from '../assessments/assessments.service';
import { ClassesService } from '../classes/classes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiBearerAuth('token')
@Controller('teacher')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeacherController {
  constructor(
    private lessonsService: LessonsService,
    private assessmentsService: AssessmentsService,
    private classesService: ClassesService,
  ) {}

  /**
   * Get all lessons for the current teacher
   */
  @Get('lessons')
  @Roles('teacher', 'admin')
  async getLessons(@CurrentUser() user: any) {
    // Get teacher's classes first
    const classes = await this.classesService.getClassesByTeacher(user.userId);
    const classIds = classes.map((c) => c.id);

    // Get all lessons for those classes
    let lessons: any[] = [];
    for (const classId of classIds) {
      const classLessons = await this.lessonsService.getLessonsByClass(classId);
      lessons = lessons.concat(classLessons);
    }

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
  @Roles('teacher', 'admin')
  async getClasses(@CurrentUser() user: any) {
    const classes = await this.classesService.getClassesByTeacher(user.userId);
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
  @Roles('teacher', 'admin')
  async getAssessments(@CurrentUser() user: any) {
    const assessments = await this.assessmentsService.getAssessmentsByTeacher(
      user.userId,
    );
    return {
      success: true,
      data: assessments,
      count: assessments.length,
    };
  }
}
