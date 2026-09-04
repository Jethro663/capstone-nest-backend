import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';

export interface GradeInvariantAuditReport {
  duplicateResponseGroups: number;
  invalidAttemptDenominators: number;
  outOfRangeAttempts: number;
  invalidClassRecordScores: number;
  outOfRangeFinalGrades: number;
  outOfRangePerformanceSnapshots: number;
  outOfRangePerformanceLogs: number;
  ambiguousLegacyAttempts: number;
  totalViolations: number;
}

/** Read-only preflight/post-deploy audit for persisted grade invariants. */
@Injectable()
export class GradeInvariantAuditService {
  constructor(private readonly databaseService: DatabaseService) {}

  async report(): Promise<GradeInvariantAuditReport> {
    const result = await this.databaseService.db.execute(sql`
      SELECT
        (SELECT count(*) FROM (
          SELECT attempt_id, question_id
          FROM assessment_responses
          GROUP BY attempt_id, question_id
          HAVING count(*) > 1
        ) duplicates)::int AS "duplicateResponseGroups",
        (SELECT count(*) FROM assessment_attempts
          WHERE score IS NOT NULL AND (
            possible_points_snapshot IS NULL OR
            possible_points_snapshot <= 0 OR
            base_points_earned IS NULL OR
            base_points_earned < 0 OR
            base_points_earned > possible_points_snapshot
          ))::int AS "invalidAttemptDenominators",
        (SELECT count(*) FROM assessment_attempts
          WHERE score NOT BETWEEN 0 AND 100
             OR direct_score NOT BETWEEN 0 AND 100
             OR bonus_points < 0
             OR (bonus_points > 0 AND nullif(trim(bonus_reason), '') IS NULL)
        )::int AS "outOfRangeAttempts",
        (SELECT count(*) FROM class_record_scores score
          JOIN class_record_items item ON item.id = score.gradebook_item_id
          WHERE (score.status = 'recorded' AND (
              score.score IS NULL OR score.score < 0 OR score.score > item.max_score OR
              score.bonus_points < 0 OR
              (score.bonus_points > 0 AND nullif(trim(score.bonus_reason), '') IS NULL)
            )) OR (score.status = 'excused' AND (
              score.score IS NOT NULL OR score.bonus_points <> 0 OR
              nullif(trim(score.reason), '') IS NULL
            ))
        )::int AS "invalidClassRecordScores",
        (SELECT count(*) FROM class_record_final_grades
          WHERE final_percentage NOT BETWEEN 0 AND 100
        )::int AS "outOfRangeFinalGrades",
        (SELECT count(*) FROM performance_snapshots
          WHERE assessment_average NOT BETWEEN 0 AND 100
             OR class_record_average NOT BETWEEN 0 AND 100
             OR blended_score NOT BETWEEN 0 AND 100
             OR threshold_applied NOT BETWEEN 0 AND 100
        )::int AS "outOfRangePerformanceSnapshots",
        (SELECT count(*) FROM performance_logs
          WHERE assessment_average NOT BETWEEN 0 AND 100
             OR class_record_average NOT BETWEEN 0 AND 100
             OR blended_score NOT BETWEEN 0 AND 100
             OR threshold_applied NOT BETWEEN 0 AND 100
        )::int AS "outOfRangePerformanceLogs",
        (SELECT count(*) FROM assessment_attempts
          WHERE score IS NOT NULL AND (
            base_points_earned IS NULL OR possible_points_snapshot IS NULL
          )
        )::int AS "ambiguousLegacyAttempts"
    `);
    const source = (result.rows?.[0] ?? {}) as Record<string, unknown>;
    const number = (
      key: keyof Omit<GradeInvariantAuditReport, 'totalViolations'>,
    ) => Number(source[key] ?? 0);
    const report = {
      duplicateResponseGroups: number('duplicateResponseGroups'),
      invalidAttemptDenominators: number('invalidAttemptDenominators'),
      outOfRangeAttempts: number('outOfRangeAttempts'),
      invalidClassRecordScores: number('invalidClassRecordScores'),
      outOfRangeFinalGrades: number('outOfRangeFinalGrades'),
      outOfRangePerformanceSnapshots: number('outOfRangePerformanceSnapshots'),
      outOfRangePerformanceLogs: number('outOfRangePerformanceLogs'),
      ambiguousLegacyAttempts: number('ambiguousLegacyAttempts'),
    };
    return {
      ...report,
      totalViolations: Object.values(report).reduce(
        (total, value) => total + value,
        0,
      ),
    };
  }
}
