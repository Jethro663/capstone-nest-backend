import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  classes,
  classModules,
  classVisibilityPreferences,
  enrollments,
  lessons,
  moduleItems,
  moduleSections,
} from '../../drizzle/schema';

export interface StudentLessonAccessContext {
  lessonId: string;
  classId: string;
  moduleId: string;
}

export interface StudentRecentLesson {
  id: string;
  title: string;
  classId: string;
  moduleId: string;
  order: number;
  updatedAt: string;
}

@Injectable()
export class StudentLessonAccessService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  private buildEligibilityConditions(studentId: string) {
    return and(
      eq(enrollments.studentId, studentId),
      eq(enrollments.status, 'enrolled'),
      eq(classes.isActive, true),
      eq(lessons.isDraft, false),
      eq(classModules.isVisible, true),
      eq(classModules.isLocked, false),
      eq(moduleItems.itemType, 'lesson'),
      eq(moduleItems.isVisible, true),
      eq(classModules.classId, lessons.classId),
    );
  }

  async assertLessonAccessible(
    studentId: string,
    lessonId: string,
  ): Promise<StudentLessonAccessContext> {
    const rows = await this.db
      .select({
        lessonId: lessons.id,
        classId: lessons.classId,
        moduleId: classModules.id,
      })
      .from(lessons)
      .innerJoin(moduleItems, eq(moduleItems.lessonId, lessons.id))
      .innerJoin(
        moduleSections,
        eq(moduleSections.id, moduleItems.moduleSectionId),
      )
      .innerJoin(classModules, eq(classModules.id, moduleSections.moduleId))
      .innerJoin(classes, eq(classes.id, lessons.classId))
      .innerJoin(
        enrollments,
        and(
          eq(enrollments.classId, classes.id),
          eq(enrollments.studentId, studentId),
        ),
      )
      .where(
        and(
          eq(lessons.id, lessonId),
          this.buildEligibilityConditions(studentId),
        ),
      )
      .limit(1);

    const context = rows[0];
    if (!context) {
      throw new NotFoundException('Lesson not found');
    }

    return context;
  }

  async getAccessibleLessonIdsForClass(
    studentId: string,
    classId: string,
  ): Promise<string[]> {
    const rows = await this.db
      .select({ lessonId: lessons.id })
      .from(lessons)
      .innerJoin(moduleItems, eq(moduleItems.lessonId, lessons.id))
      .innerJoin(
        moduleSections,
        eq(moduleSections.id, moduleItems.moduleSectionId),
      )
      .innerJoin(classModules, eq(classModules.id, moduleSections.moduleId))
      .innerJoin(classes, eq(classes.id, lessons.classId))
      .innerJoin(
        enrollments,
        and(
          eq(enrollments.classId, classes.id),
          eq(enrollments.studentId, studentId),
        ),
      )
      .where(
        and(
          eq(lessons.classId, classId),
          this.buildEligibilityConditions(studentId),
        ),
      )
      .orderBy(asc(lessons.id));

    return rows.map((row) => row.lessonId);
  }

  async getRecentLessons(
    studentId: string,
    limit: number,
  ): Promise<StudentRecentLesson[]> {
    const rows = await this.db
      .select({
        id: lessons.id,
        title: lessons.title,
        classId: lessons.classId,
        moduleId: classModules.id,
        order: lessons.order,
        updatedAt: lessons.updatedAt,
      })
      .from(lessons)
      .innerJoin(moduleItems, eq(moduleItems.lessonId, lessons.id))
      .innerJoin(
        moduleSections,
        eq(moduleSections.id, moduleItems.moduleSectionId),
      )
      .innerJoin(classModules, eq(classModules.id, moduleSections.moduleId))
      .innerJoin(classes, eq(classes.id, lessons.classId))
      .innerJoin(
        enrollments,
        and(
          eq(enrollments.classId, classes.id),
          eq(enrollments.studentId, studentId),
        ),
      )
      .leftJoin(
        classVisibilityPreferences,
        and(
          eq(classVisibilityPreferences.classId, classes.id),
          eq(classVisibilityPreferences.userId, studentId),
          eq(classVisibilityPreferences.isHidden, true),
        ),
      )
      .where(
        and(
          this.buildEligibilityConditions(studentId),
          isNull(classVisibilityPreferences.id),
        ),
      )
      .orderBy(desc(lessons.updatedAt), desc(lessons.createdAt), asc(lessons.id))
      .limit(limit);

    return rows.map((row) => ({
      ...row,
      updatedAt: row.updatedAt.toISOString(),
    }));
  }
}
