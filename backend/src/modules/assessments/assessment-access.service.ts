import { ForbiddenException, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { enrollments } from '../../drizzle/schema';

export type AssessmentActor = {
  userId?: string | null;
  id?: string | null;
  roles?: string[] | null;
};

export type AssessmentActorRole = 'admin' | 'teacher' | 'student';

@Injectable()
export class AssessmentAccessService {
  constructor(private readonly databaseService: DatabaseService) {}

  resolveActor(currentUser: AssessmentActor | undefined): {
    userId: string | undefined;
    role: AssessmentActorRole;
  } {
    const userId = currentUser?.userId ?? currentUser?.id ?? undefined;
    const roles = Array.isArray(currentUser?.roles) ? currentUser.roles : [];
    const role: AssessmentActorRole = roles.includes('admin')
      ? 'admin'
      : roles.includes('teacher')
        ? 'teacher'
        : 'student';
    return { userId, role };
  }

  assertTeacherClassOwnership(
    classTeacherId: string | null | undefined,
    currentUser: AssessmentActor | undefined,
    message: string,
  ): { userId: string; role: AssessmentActorRole } {
    const { userId, role } = this.resolveActor(currentUser);
    if (!userId) {
      throw new ForbiddenException('Invalid user context');
    }
    if (role === 'teacher' && classTeacherId && classTeacherId !== userId) {
      throw new ForbiddenException(message);
    }
    return { userId, role };
  }

  async ensureStudentEnrolled(
    classId: string,
    studentId: string,
  ): Promise<void> {
    const enrollment =
      await this.databaseService.db.query.enrollments.findFirst({
        where: and(
          eq(enrollments.classId, classId),
          eq(enrollments.studentId, studentId),
        ),
        columns: { classId: true, studentId: true },
      });
    if (!enrollment) {
      throw new ForbiddenException(
        'You are not enrolled in this class for this assessment',
      );
    }
  }
}
