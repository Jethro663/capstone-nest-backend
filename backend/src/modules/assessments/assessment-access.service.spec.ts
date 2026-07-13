import { ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AssessmentAccessService } from './assessment-access.service';

describe('AssessmentAccessService', () => {
  it('preserves admin, teacher, and student role precedence', () => {
    const service = new AssessmentAccessService({} as DatabaseService);

    expect(
      service.resolveActor({ id: 'admin-1', roles: ['teacher', 'admin'] }),
    ).toEqual({
      userId: 'admin-1',
      role: 'admin',
    });
    expect(
      service.resolveActor({ userId: 'teacher-1', roles: ['teacher'] }),
    ).toEqual({
      userId: 'teacher-1',
      role: 'teacher',
    });
    expect(service.resolveActor({ id: 'student-1', roles: [] })).toEqual({
      userId: 'student-1',
      role: 'student',
    });
  });

  it('rejects a teacher who does not own the class', () => {
    const service = new AssessmentAccessService({} as DatabaseService);

    expect(() =>
      service.assertTeacherClassOwnership(
        'owner-1',
        { id: 'teacher-2', roles: ['teacher'] },
        'Access denied',
      ),
    ).toThrow(new ForbiddenException('Access denied'));
  });

  it('requires an enrollment row for student access', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const service = new AssessmentAccessService({
      db: { query: { enrollments: { findFirst } } },
    } as unknown as DatabaseService);

    await expect(
      service.ensureStudentEnrolled('class-1', 'student-1'),
    ).rejects.toThrow('You are not enrolled in this class for this assessment');
    expect(findFirst).toHaveBeenCalledTimes(1);
  });
});
