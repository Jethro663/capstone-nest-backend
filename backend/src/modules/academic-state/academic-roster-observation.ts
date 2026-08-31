import { inArray, sql } from 'drizzle-orm';
import type { DatabaseService } from '../../database/database.service';
import { classRecords } from '../../drizzle/schema';
import type { PeriodKey } from './academic-policy';

/** Call only inside the shared academic transaction. Observation never confirms
 * eligibility and never mutates an already finalized period register. */
export async function captureObservedPeriodParticipants(
  db: DatabaseService['db'],
  input: {
    schoolYear: string;
    period: PeriodKey;
    actorId: string;
    source: 'period_activation' | 'record_creation';
    classRecordId?: string;
  },
) {
  const result = await db.execute<{ class_record_id: string }>(sql`
    INSERT INTO class_record_participants (class_record_id, student_id, eligibility, source, updated_by)
    SELECT DISTINCT r.id, e.student_id, 'eligible', ${input.source}, ${input.actorId}::uuid
    FROM class_records r
    JOIN classes c ON c.id = r.class_id
    JOIN enrollments e ON e.class_id = c.id AND e.status = 'enrolled'
    WHERE c.school_year = ${input.schoolYear} AND c.is_active = true
      AND r.grading_period = ${input.period} AND r.status = 'draft'
      ${input.classRecordId ? sql`AND r.id = ${input.classRecordId}::uuid` : sql``}
    ON CONFLICT (class_record_id, student_id) DO NOTHING
    RETURNING class_record_id
  `);
  const ids = [...new Set(result.rows.map((r) => r.class_record_id))];
  if (ids.length)
    await db
      .update(classRecords)
      .set({
        rosterConfirmedAt: null,
        rosterConfirmedBy: null,
        updatedAt: new Date(),
      })
      .where(inArray(classRecords.id, ids));
  return {
    observedParticipants: result.rowCount ?? result.rows.length,
    affectedRecordIds: ids,
  };
}
