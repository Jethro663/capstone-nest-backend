import { Injectable } from '@nestjs/common';
import { LessonsService } from '../lessons/lessons.service';
import { AssessmentsService } from '../assessments/assessments.service';
import { ClassesService } from '../classes/classes.service';

@Injectable()
export class TeacherService {
  constructor(
    private lessonsService: LessonsService,
    private assessmentsService: AssessmentsService,
    private classesService: ClassesService,
  ) {}

  async getTeacherClasses(userId: string, roles: string[]) {
    return this.classesService.getClassesByTeacher(userId, userId, roles);
  }

  async getTeacherLessons(userId: string, roles: string[]) {
    const classes = await this.getTeacherClasses(userId, roles);
    const classIds = classes.map((c) => c.id);
    return this.lessonsService.getLessonsByClassIds(classIds);
  }

  async getTeacherAssessments(userId: string) {
    return this.assessmentsService.getAssessmentsByTeacher(userId);
  }
}
