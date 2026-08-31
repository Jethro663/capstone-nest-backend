import { BadRequestException, Injectable } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  academicLegacyGradeEvidence,
  academicPeriodGradeRevisions,
  academicSystemStates,
  academicYearPolicies,
  assessments,
  classRecordFinalGrades,
  classRecordCategories,
  classRecords,
  classes,
} from '../../drizzle/schema';
import {
  getDefaultAcademicPolicy,
  getSubjectWeights,
  normalizeSubjectCode,
} from './academic-policy';

export interface AcademicAuditIssue {
  code: string;
  severity: 'blocker' | 'review' | 'acknowledged';
  message: string;
  schoolYear?: string;
  classId?: string;
  classRecordId?: string;
  assessmentId?: string;
  teacherId?: string | null;
  repairAction?: string;
}

/** This report deliberately does not call policy.currentState/forYear: those
 * initialize rows. PostgreSQL enforces that the entire audit is read-only. */
@Injectable()
export class AcademicAuditService {
  constructor(private readonly databaseService: DatabaseService) {}

  async report(schoolYear?: string) {
    if (schoolYear) {
      try {
        getDefaultAcademicPolicy(schoolYear);
      } catch {
        throw new BadRequestException('Invalid consecutive school year');
      }
    }
    return this.databaseService.db.transaction(async (db) => {
      await db.execute(
        sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`,
      );
      const states = await db.query.academicSystemStates.findMany();
      const year =
        schoolYear ??
        states.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0]
          ?.schoolYear;
      const issues: AcademicAuditIssue[] = [];
      if (states.length !== 1)
        issues.push({
          code: 'academic_state_count',
          severity: 'blocker',
          message: `Expected one academic state; found ${states.length}.`,
          repairAction: 'repair-state',
        });
      const policies = await db.query.academicYearPolicies.findMany({
        where: year ? eq(academicYearPolicies.schoolYear, year) : undefined,
      });
      const classRows = await db.query.classes.findMany({
        where: year ? eq(classes.schoolYear, year) : undefined,
      });
      const years = new Set(
        [
          ...classRows.map((c) => c.schoolYear),
          ...states.map((s) => s.schoolYear),
        ].filter((y) => !year || y === year),
      );
      const policyByYear = new Map(
        policies.map((p) => [p.schoolYear, p.policy]),
      );
      for (const schoolYear of years) {
        if (!policyByYear.has(schoolYear)) {
          issues.push({
            schoolYear,
            code: 'policy_snapshot_missing',
            severity: 'review',
            message:
              'A policy has not yet been frozen for this school year. Audit uses its documented default without writing it.',
            repairAction: 'initialize-policy',
          });
          try {
            policyByYear.set(schoolYear, getDefaultAcademicPolicy(schoolYear));
          } catch {
            issues.push({
              schoolYear,
              code: 'invalid_school_year',
              severity: 'blocker',
              message:
                'School-year identity is not consecutive YYYY-YYYY; explicit data repair is required.',
            });
          }
        }
      }
      for (const state of states) {
        const policy = policyByYear.get(state.schoolYear);
        if (policy && !policy.periods.some((p) => p.key === state.quarter))
          issues.push({
            schoolYear: state.schoolYear,
            code: 'invalid_active_period',
            severity: 'blocker',
            message: `${state.quarter} is outside the active year policy.`,
            repairAction: 'activate-period-override',
          });
      }
      const classIds = classRows.map((c) => c.id);
      const recordRows = classIds.length
        ? await db.query.classRecords.findMany({
            where: inArray(classRecords.classId, classIds),
          })
        : [];
      const records = new Map(recordRows.map((r) => [r.id, r]));
      const recordIds = [...records.keys()];
      const categoryRows = recordIds.length
        ? await db.query.classRecordCategories.findMany({
            where: inArray(classRecordCategories.classRecordId, recordIds),
            with: { items: true },
          })
        : [];
      const categoriesByRecord = new Map<string, typeof categoryRows>();
      for (const category of categoryRows) {
        const group = categoriesByRecord.get(category.classRecordId) ?? [];
        group.push(category);
        categoriesByRecord.set(category.classRecordId, group);
      }
      const projections = recordIds.length
        ? await db.query.classRecordFinalGrades.findMany({
            where: inArray(classRecordFinalGrades.classRecordId, recordIds),
          })
        : [];
      const legacy = recordIds.length
        ? await db.query.academicLegacyGradeEvidence.findMany({
            where: inArray(
              academicLegacyGradeEvidence.classRecordId,
              recordIds,
            ),
            columns: { sourceFinalGradeId: true, classRecordId: true },
          })
        : [];
      const revisions = recordIds.length
        ? await db.query.academicPeriodGradeRevisions.findMany({
            where: and(
              inArray(academicPeriodGradeRevisions.classRecordId, recordIds),
              eq(academicPeriodGradeRevisions.isCurrent, true),
            ),
            columns: {
              classRecordId: true,
              studentId: true,
              revision: true,
              trusted: true,
            },
          })
        : [];
      const revisionKeys = new Set(
        revisions
          .filter((r) => r.trusted)
          .map((r) => `${r.classRecordId}:${r.studentId}:${r.revision}`),
      );
      const archivedIds = new Set(legacy.map((l) => l.sourceFinalGradeId));
      const legacyRecords = new Set<string>();
      let unarchivedLegacyGrades = 0;
      for (const projection of projections) {
        if (
          !revisionKeys.has(
            `${projection.classRecordId}:${projection.studentId}:${projection.revision}`,
          )
        ) {
          legacyRecords.add(projection.classRecordId);
          if (!archivedIds.has(projection.id)) unarchivedLegacyGrades++;
        }
      }
      const classById = new Map(classRows.map((c) => [c.id, c]));
      for (const record of recordRows) {
        const cls = classById.get(record.classId)!;
        const policy = policyByYear.get(cls.schoolYear);
        const context = {
          classId: cls.id,
          classRecordId: record.id,
          teacherId: cls.teacherId,
          schoolYear: cls.schoolYear,
        };
        if (
          policy &&
          !policy.periods.some((p) => p.key === record.gradingPeriod)
        ) {
          const acknowledged = Boolean(
            record.policyExcludedAt && record.policyExclusionReason,
          );
          issues.push({
            ...context,
            code: 'incompatible_period_record',
            severity: acknowledged ? 'acknowledged' : 'blocker',
            message: acknowledged
              ? `Historical ${record.gradingPeriod} is preserved outside the policy: ${record.policyExclusionReason}`
              : `${record.gradingPeriod} is outside this year policy. Preserve the historical evidence and explicitly acknowledge its exclusion; never fold it into another term.`,
            repairAction: acknowledged
              ? undefined
              : 'exclude-historical-period',
          });
        }
        if (
          policy &&
          policy.gradeMethod !== 'legacy_transmutation' &&
          !record.policyExcludedAt
        ) {
          const categories = categoriesByRecord.get(record.id) ?? [];
          const weights = getSubjectWeights(
            policy,
            cls.subjectCode,
            cls.subjectName,
            cls.academicWeightProfile,
          );
          const expected = weights
            ? {
                'Written Works': weights.writtenWork,
                'Performance Tasks': weights.performanceTask,
                'Quarterly Assessment': weights.examination,
              }
            : null;
          const exams =
            categories.find((c) => c.name === 'Quarterly Assessment')?.items ??
            [];
          if (
            expected &&
            (categories.length !== 3 ||
              categories.some(
                (c) =>
                  expected[c.name as keyof typeof expected] !==
                  Number(c.weightPercentage),
              ))
          )
            issues.push({
              ...context,
              code: 'workbook_policy_weights',
              severity: 'blocker',
              message:
                'Workbook weights do not match the frozen subject policy.',
              repairAction: 'repair-workbook-policy',
            });
          if (
            policy.examComponents.some(
              (c) =>
                exams.filter((i) => i.examComponent === c.key).length !== 1,
            ) ||
            exams.some(
              (i) =>
                Number(i.maxScore) > 0 &&
                !policy.examComponents.some((c) => c.key === i.examComponent),
            )
          )
            issues.push({
              ...context,
              code: 'workbook_exam_components',
              severity: 'blocker',
              message:
                'Explicitly identify ST1, ST2 and TE; legacy examination evidence is not assigned automatically.',
              repairAction: 'repair-workbook-policy',
            });
        }
        if (!record.rosterConfirmedAt && !record.policyExcludedAt)
          issues.push({
            ...context,
            code: 'unconfirmed_period_roster',
            severity: 'blocker',
            message:
              'Historical eligibility requires confirmation; current enrollment is not proof of past eligibility.',
            repairAction: 'reopen-and-confirm-roster',
          });
        if (legacyRecords.has(record.id))
          issues.push({
            ...context,
            code: 'unverified_legacy_grades',
            severity: record.policyExcludedAt ? 'acknowledged' : 'blocker',
            message:
              'Legacy final values are preserved but are not trusted annual sources. Reopen and reconcile evidence, or record verified external transfer evidence.',
            repairAction: 'reconcile-grade-evidence',
          });
      }
      const logicalClasses = new Set<string>();
      for (const cls of classRows.filter((c) => c.isActive)) {
        const context = {
          classId: cls.id,
          teacherId: cls.teacherId,
          schoolYear: cls.schoolYear,
        };
        const key = JSON.stringify([
          cls.schoolYear,
          cls.sectionId,
          normalizeSubjectCode(cls.subjectCode),
          cls.subjectGradeLevel,
        ]);
        if (logicalClasses.has(key))
          issues.push({
            ...context,
            code: 'duplicate_logical_subject',
            severity: 'blocker',
            message:
              'Current section has more than one class for the same normalized learning area. Resolve curriculum/source ambiguity.',
          });
        logicalClasses.add(key);
        const policy = policyByYear.get(cls.schoolYear);
        if (
          policy &&
          policy.gradeMethod !== 'legacy_transmutation' &&
          !getSubjectWeights(
            policy,
            cls.subjectCode,
            cls.subjectName,
            cls.academicWeightProfile,
          )
        )
          issues.push({
            ...context,
            code: 'subject_profile_unknown',
            severity: 'blocker',
            message:
              'Admin must classify this learning area before a policy-compliant workbook can be generated.',
            repairAction: 'classify-subject',
          });
      }
      const assessmentRows = classIds.length
        ? await db.query.assessments.findMany({
            where: inArray(assessments.classId, classIds),
            columns: { id: true, classId: true, quarter: true },
          })
        : [];
      for (const assessment of assessmentRows) {
        const cls = classById.get(assessment.classId)!;
        const policy = policyByYear.get(cls.schoolYear);
        if (
          policy &&
          !policy.periods.some((p) => p.key === assessment.quarter)
        ) {
          const excluded = recordRows.some(
            (r) =>
              r.classId === assessment.classId &&
              r.gradingPeriod === assessment.quarter &&
              r.policyExcludedAt &&
              r.policyExclusionReason,
          );
          issues.push({
            classId: cls.id,
            assessmentId: assessment.id,
            teacherId: cls.teacherId,
            schoolYear: cls.schoolYear,
            code: 'assessment_period_invalid',
            severity: excluded ? 'acknowledged' : 'blocker',
            message: excluded
              ? 'Assessment is retained with its explicitly excluded historical period; execution remains disabled.'
              : 'Assessment requires an explicit policy-valid period repair; existing attempts and placement must be preserved.',
            repairAction: excluded ? undefined : 'repair-assessment-period',
          });
        }
      }
      return {
        schoolYear: year ?? null,
        generatedAt: new Date(),
        readOnly: true,
        states,
        policies: [...policyByYear.values()],
        counts: {
          classes: classRows.length,
          records: recordRows.length,
          legacyEvidenceRows: legacy.length,
          unarchivedLegacyGrades,
          blockers: issues.filter((i) => i.severity === 'blocker').length,
          review: issues.filter((i) => i.severity === 'review').length,
        },
        issues,
      };
    });
  }
}
