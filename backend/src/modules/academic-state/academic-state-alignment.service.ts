import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  academicLegacyGradeEvidence,
  academicSystemStates,
  academicYearPolicies,
  classRecords,
  classes,
  sections,
  users,
} from '../../drizzle/schema';
import { AuditService } from '../audit/audit.service';
import {
  ExecuteAcademicStateAlignmentDto,
  PreviewAcademicStateAlignmentDto,
} from './DTO/academic-maintenance.dto';
import {
  type AcademicAlignmentCandidate,
  type AcademicAlignmentSnapshot,
  buildAcademicAlignmentManifest,
} from './academic-state-alignment';
import { getDefaultAcademicPolicy } from './academic-policy';

type AcademicDb = DatabaseService['db'];

function resultRows<T>(result: unknown): T[] {
  return (result as { rows?: T[] }).rows ?? [];
}

function numberValue(value: unknown): number {
  return Number(value ?? 0);
}

async function runSequential<T>(
  queries: Array<() => Promise<T>>,
): Promise<T[]> {
  const results: T[] = [];
  for (const query of queries) results.push(await query());
  return results;
}

@Injectable()
export class AcademicStateAlignmentService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  async preview(dto: PreviewAcademicStateAlignmentDto) {
    return this.db.transaction(async (transaction) => {
      await transaction.execute(
        sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`,
      );
      const snapshot = await this.collectSnapshot(
        transaction as unknown as AcademicDb,
        dto,
      );
      return buildAcademicAlignmentManifest(snapshot, dto);
    });
  }

  async execute(
    dto: ExecuteAcademicStateAlignmentDto,
    actorId: string,
    roles: string[],
  ) {
    if (!roles.includes('admin'))
      throw new ForbiddenException(
        'Academic alignment is restricted to administrators',
      );
    if (!dto.reason?.trim() || dto.reason.trim().length < 5)
      throw new BadRequestException('A specific alignment reason is required');
    const actor = await this.db.query.users.findFirst({
      where: eq(users.id, actorId),
      columns: { password: true },
    });
    // bcrypt's CommonJS declaration is not resolved by the repository's ESLint type graph.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    if (!actor || !(await bcrypt.compare(dto.currentPassword, actor.password)))
      throw new ForbiddenException('Step-up authentication failed');

    return this.databaseService.academicTransaction(async () => {
      const snapshot = await this.collectSnapshot(this.db, dto);
      const manifest = buildAcademicAlignmentManifest(snapshot, dto);
      if (manifest.manifestHash !== dto.manifestHash)
        throw new ConflictException(
          'Academic alignment data changed; refresh and review the preview',
        );
      if (!manifest.safeToApply)
        throw new ConflictException({
          message: 'Academic alignment preview contains blockers',
          blockers: manifest.blockers,
        });
      const expectedConfirmations = [...manifest.requiredConfirmations].sort(
        (left, right) => left.code.localeCompare(right.code),
      );
      const receivedConfirmations = [...(dto.confirmations ?? [])].sort(
        (left, right) => left.code.localeCompare(right.code),
      );
      if (
        JSON.stringify(expectedConfirmations) !==
        JSON.stringify(receivedConfirmations)
      )
        throw new BadRequestException(
          'Every reviewed alignment confirmation must match exactly',
        );

      const applied = await this.applyAlignment(manifest, actorId);
      const auditEntry = await this.audit.log({
        actorId,
        action: 'academic.state_alignment.repaired',
        targetType: 'academic_state',
        targetId: manifest.state.id,
        metadata: {
          reason: dto.reason.trim(),
          manifestHash: manifest.manifestHash,
          before: {
            state: manifest.state,
            policies: manifest.policies,
            classes: manifest.selectedClasses,
            sections: manifest.sections.filter((section) =>
              manifest.movedSectionIds.includes(section.id),
            ),
            evidence: manifest.legacyEvidence,
          },
          after: applied,
          confirmations: expectedConfirmations.map(({ code }) => code),
          identitiesPreserved: true,
        },
      });

      return { ...applied, auditEventId: auditEntry.id };
    });
  }

  private async collectSnapshot(
    db: AcademicDb,
    dto: PreviewAcademicStateAlignmentDto,
  ): Promise<AcademicAlignmentSnapshot> {
    const [
      stateResult,
      policyResult,
      candidateResult,
      sectionResult,
      targetClassResult,
      targetSectionResult,
      ambiguousResult,
      evidenceResult,
    ] = await runSequential([
      () =>
        db.execute(sql`
        SELECT id::text AS id, school_year AS "schoolYear", quarter,
          version
        FROM academic_system_states
        ORDER BY updated_at DESC, id
      `),
      () =>
        db.execute(sql`
        SELECT school_year AS "schoolYear", policy_id AS "policyId", policy
        FROM academic_year_policies
        WHERE school_year IN (${dto.sourceSchoolYear}, ${dto.targetSchoolYear})
        ORDER BY school_year
      `),
      () =>
        db.execute(sql`
        SELECT c.id::text AS id, c.subject_code AS "subjectCode",
          c.subject_name AS "subjectName", c.section_id::text AS "sectionId",
          s.name AS "sectionName", s.school_year AS "sectionSchoolYear",
          c.teacher_id::text AS "teacherId",
          NULLIF(concat_ws(' ', u.first_name, u.last_name), '') AS "teacherName",
          c.is_active AS "isActive",
          (SELECT count(*) FROM enrollments e WHERE e.class_id = c.id) AS enrollments,
          (SELECT count(*) FROM assessments a WHERE a.class_id = c.id) AS assessments,
          (SELECT count(*) FROM assessment_attempts aa JOIN assessments a ON a.id = aa.assessment_id WHERE a.class_id = c.id) AS attempts,
          (SELECT count(*) FROM class_records cr WHERE cr.class_id = c.id) AS "classRecords",
          (SELECT count(*) FROM class_records cr WHERE cr.class_id = c.id AND cr.status = ${'finalized'}) AS "finalizedRecords",
          (SELECT count(*) FROM class_record_final_grades fg JOIN class_records cr ON cr.id = fg.gradebook_id WHERE cr.class_id = c.id) AS "finalGradeRows",
          (SELECT count(*) FROM academic_legacy_grade_evidence le JOIN class_records cr ON cr.id = le.class_record_id WHERE cr.class_id = c.id) AS "legacyEvidenceRows",
          (SELECT count(*) FROM academic_period_grade_revisions pr WHERE pr.class_id = c.id) AS "periodRevisionRows"
        FROM classes c
        JOIN sections s ON s.id = c.section_id
        LEFT JOIN users u ON u.id = c.teacher_id
        WHERE c.school_year = ${dto.sourceSchoolYear} AND c.is_active = true
        ORDER BY c.id
      `),
      () =>
        db.execute(sql`
        SELECT s.id::text AS id, s.name, s.grade_level AS "gradeLevel",
          s.school_year AS "schoolYear",
          json_agg(c.id::text ORDER BY c.id) AS "classIds"
        FROM sections s
        JOIN classes c ON c.section_id = s.id
        WHERE s.id IN (
          SELECT section_id FROM classes
          WHERE school_year = ${dto.sourceSchoolYear} AND is_active = true
        )
        GROUP BY s.id, s.name, s.grade_level, s.school_year
        ORDER BY s.id
      `),
      () =>
        db.execute(sql`
        SELECT id::text AS id, subject_code AS "subjectCode",
          section_id::text AS "sectionId"
        FROM classes
        WHERE school_year = ${dto.targetSchoolYear}
        ORDER BY id
      `),
      () =>
        db.execute(sql`
        SELECT id::text AS id, name, grade_level AS "gradeLevel"
        FROM sections
        WHERE school_year = ${dto.targetSchoolYear}
        ORDER BY id
      `),
      () =>
        db.execute(sql`
        SELECT
          (SELECT count(*) FROM academic_period_grade_revisions WHERE school_year IN (${dto.sourceSchoolYear}, ${dto.targetSchoolYear})) AS "periodRevisions",
          (SELECT count(*) FROM academic_external_period_grades WHERE school_year IN (${dto.sourceSchoolYear}, ${dto.targetSchoolYear})) AS "externalGrades",
          (SELECT count(*) FROM academic_annual_source_selections WHERE school_year IN (${dto.sourceSchoolYear}, ${dto.targetSchoolYear})) AS "annualSelections",
          (SELECT count(*) FROM subject_annual_grades WHERE school_year IN (${dto.sourceSchoolYear}, ${dto.targetSchoolYear})) AS "annualGrades",
          (SELECT count(*) FROM academic_student_year_outcomes WHERE school_year IN (${dto.sourceSchoolYear}, ${dto.targetSchoolYear})) AS "yearOutcomes"
      `),
      () =>
        db.execute(sql`
        SELECT le.id::text AS id,
          le.source_final_grade_id::text AS "sourceFinalGradeId",
          le.class_record_id::text AS "classRecordId",
          cr.class_id::text AS "classId",
          le.student_id::text AS "studentId",
          le.school_year AS "schoolYear", le.period,
          le.source_snapshot AS "sourceSnapshot",
          le.archived_at::text AS "archivedAt"
        FROM academic_legacy_grade_evidence le
        JOIN class_records cr ON cr.id = le.class_record_id
        JOIN classes c ON c.id = cr.class_id
        WHERE c.school_year = ${dto.sourceSchoolYear} AND c.is_active = true
        ORDER BY le.id
      `),
    ]);

    const candidates = resultRows<
      Omit<AcademicAlignmentCandidate, 'counts'> &
        Record<keyof AcademicAlignmentCandidate['counts'], unknown>
    >(candidateResult).map((row) => ({
      id: row.id,
      subjectCode: row.subjectCode,
      subjectName: row.subjectName,
      sectionId: row.sectionId,
      sectionName: row.sectionName,
      sectionSchoolYear: row.sectionSchoolYear,
      teacherId: row.teacherId,
      teacherName: row.teacherName,
      isActive: row.isActive,
      counts: {
        enrollments: numberValue(row.enrollments),
        assessments: numberValue(row.assessments),
        attempts: numberValue(row.attempts),
        classRecords: numberValue(row.classRecords),
        finalizedRecords: numberValue(row.finalizedRecords),
        finalGradeRows: numberValue(row.finalGradeRows),
        legacyEvidenceRows: numberValue(row.legacyEvidenceRows),
        periodRevisionRows: numberValue(row.periodRevisionRows),
      },
    }));
    const ambiguous =
      resultRows<Record<string, unknown>>(ambiguousResult)[0] ?? {};

    return {
      states: resultRows(stateResult),
      policies: resultRows(policyResult),
      candidates,
      sections: resultRows(sectionResult),
      targetClasses: resultRows(targetClassResult),
      targetSections: resultRows(targetSectionResult),
      legacyEvidence: resultRows(evidenceResult),
      ambiguousCounts: {
        periodRevisions: numberValue(ambiguous.periodRevisions),
        externalGrades: numberValue(ambiguous.externalGrades),
        annualSelections: numberValue(ambiguous.annualSelections),
        annualGrades: numberValue(ambiguous.annualGrades),
        yearOutcomes: numberValue(ambiguous.yearOutcomes),
      },
    };
  }

  private async applyAlignment(
    manifest: ReturnType<typeof buildAcademicAlignmentManifest>,
    actorId: string,
  ) {
    const targetPolicy = getDefaultAcademicPolicy(
      manifest.input.targetSchoolYear,
    );
    const sourcePolicy = getDefaultAcademicPolicy(
      manifest.input.sourceSchoolYear,
    );
    for (const policy of [targetPolicy, sourcePolicy]) {
      await this.db
        .insert(academicYearPolicies)
        .values({
          schoolYear: policy.schoolYear,
          policyId: policy.id,
          policy,
        })
        .onConflictDoUpdate({
          target: academicYearPolicies.schoolYear,
          set: { policyId: policy.id, policy },
        });
    }

    const [state] = await this.db
      .update(academicSystemStates)
      .set({
        schoolYear: manifest.input.targetSchoolYear,
        quarter: manifest.input.targetQuarter,
        version: manifest.state.version + 1,
        updatedBy: actorId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(academicSystemStates.id, manifest.state.id),
          eq(academicSystemStates.version, manifest.state.version),
        ),
      )
      .returning();
    if (!state)
      throw new ConflictException('Authoritative academic state changed');

    await this.db
      .update(classes)
      .set({
        schoolYear: manifest.input.targetSchoolYear,
        updatedAt: new Date(),
      })
      .where(inArray(classes.id, manifest.selectedClassIds));
    if (manifest.movedSectionIds.length)
      await this.db
        .update(sections)
        .set({ schoolYear: manifest.input.targetSchoolYear })
        .where(inArray(sections.id, manifest.movedSectionIds));

    const selectedRecords = await this.db.query.classRecords.findMany({
      where: inArray(classRecords.classId, manifest.selectedClassIds),
      columns: { id: true },
    });
    const updatedEvidence = selectedRecords.length
      ? await this.db
          .update(academicLegacyGradeEvidence)
          .set({ schoolYear: manifest.input.targetSchoolYear })
          .where(
            and(
              inArray(
                academicLegacyGradeEvidence.classRecordId,
                selectedRecords.map((record) => record.id),
              ),
              eq(
                academicLegacyGradeEvidence.schoolYear,
                manifest.input.sourceSchoolYear,
              ),
            ),
          )
          .returning({ id: academicLegacyGradeEvidence.id })
      : [];

    return {
      state,
      policy: targetPolicy,
      sourcePolicy,
      movedClassIds: manifest.selectedClassIds,
      movedSectionIds: manifest.movedSectionIds,
      updatedLegacyEvidenceRows: updatedEvidence.length,
      evidence: manifest.legacyEvidence.map((entry) => ({
        ...entry,
        schoolYear: manifest.input.targetSchoolYear,
      })),
      counts: {
        classes: manifest.selectedClassIds.length,
        sections: manifest.movedSectionIds.length,
        legacyEvidenceRows: updatedEvidence.length,
      },
    };
  }
}
