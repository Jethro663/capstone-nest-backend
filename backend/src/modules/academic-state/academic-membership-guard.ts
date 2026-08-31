import { ConflictException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { DatabaseService } from '../../database/database.service';
import { enrollments } from '../../drizzle/schema';

/** Caller holds the shared academic lock. A profile form cannot perform a
 * promotion or alter the grade level underlying active subject membership. */
export async function assertGradeLevelChangeAllowed(
  db: Pick<DatabaseService['db'], 'query'>,
  userId: string,
  previous: string | null | undefined,
  next: string | null | undefined,
) {
  if (next === undefined || next === previous) return;
  const membership = await db.query.enrollments.findFirst({
    where: and(
      eq(enrollments.studentId, userId),
      eq(enrollments.status, 'enrolled'),
    ),
    columns: { id: true },
  });
  if (membership)
    throw new ConflictException({
      code: 'academic_grade_assignment_locked',
      message:
        'Grade level cannot change while the learner has active membership. Use verified academic transition for promotion, or explicitly reconcile an incorrect section assignment before correcting the profile.',
    });
}
