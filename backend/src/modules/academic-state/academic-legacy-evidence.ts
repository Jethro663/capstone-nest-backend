import { sql } from 'drizzle-orm';
import type { DatabaseService } from '../../database/database.service';

/** Preserve exact old projections before a correction replaces them. New trusted
 * revisions already retain their own evidence and are not relabeled as legacy. */
export async function preserveLegacyGradeEvidence(
  db: DatabaseService['db'],
  classRecordId?: string,
) {
  const result = await db.execute(sql`
    INSERT INTO academic_legacy_grade_evidence (source_final_grade_id, class_record_id, student_id, school_year, period, source_snapshot)
    SELECT f.id, f.gradebook_id, f.student_id, c.school_year, r.grading_period,
      jsonb_build_object('finalGrade', to_jsonb(f), 'record', to_jsonb(r), 'class', jsonb_build_object('id', c.id, 'subjectCode', c.subject_code, 'subjectName', c.subject_name, 'gradeLevel', c.subject_grade_level, 'sectionId', c.section_id, 'writtenWorkWeight', c.written_work_grading_weight, 'performanceTaskWeight', c.performance_task_grading_weight, 'examinationWeight', c.quarterly_assessment_grading_weight), 'trusted', false, 'policyProvenance', 'unknown_legacy')
    FROM class_record_final_grades f JOIN class_records r ON r.id=f.gradebook_id JOIN classes c ON c.id=r.class_id
    WHERE NOT EXISTS (SELECT 1 FROM academic_period_grade_revisions p WHERE p.class_record_id=r.id AND p.student_id=f.student_id AND p.revision=f.revision)
      ${classRecordId ? sql`AND r.id=${classRecordId}::uuid` : sql``}
    ON CONFLICT (source_final_grade_id) DO NOTHING
  `);
  return result.rowCount ?? 0;
}
