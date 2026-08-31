import { Injectable } from '@nestjs/common';
import { and, eq, inArray, or } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  academicAnnualSourceSelections,
  academicSystemStates,
  academicBackSubjects,
  academicExternalPeriodGrades,
  academicPeriodGradeRevisions,
  academicRemediationResults,
  classRecordParticipants,
  classRecords,
  classes,
  enrollments,
  sections,
  studentProfiles,
  subjectAnnualGrades,
} from '../../drizzle/schema';
import { AcademicPolicyService } from './academic-policy.service';
import { evaluateTransitionReadiness } from './academic-transition-readiness';

@Injectable()
export class AcademicTransitionReadinessService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly policyService: AcademicPolicyService,
  ) {}

  async getReadiness(schoolYear?: string, sectionIds?: string[]) {
    return this.databaseService.academicTransaction(async () => {
      const db = this.databaseService.db;
      const current = await this.policyService.currentState();
      const year = schoolYear ?? current.schoolYear;
      const policy = await this.policyService.forYear(year);
      const sectionRows = await db.query.sections.findMany({
        where: and(
          eq(sections.schoolYear, year),
          sectionIds ? inArray(sections.id, sectionIds) : undefined,
        ),
      });
      const classRows = await db.query.classes.findMany({
        columns: {
          id: true,
          sectionId: true,
          subjectCode: true,
          subjectGradeLevel: true,
          subjectName: true,
          teacherId: true,
          isActive: true,
        },
        where: eq(classes.schoolYear, year),
      });
      const classIds = classRows.map((c) => c.id);
      const scopeSectionIds = sectionRows.map((s) => s.id);
      const scopeClassIds = classRows
        .filter((c) => !sectionIds || scopeSectionIds.includes(c.sectionId))
        .map((c) => c.id);
      const enrollmentRows =
        scopeSectionIds.length || scopeClassIds.length
          ? await db.query.enrollments.findMany({
              where: and(
                eq(enrollments.status, 'enrolled'),
                or(
                  scopeSectionIds.length
                    ? inArray(enrollments.sectionId, scopeSectionIds)
                    : undefined,
                  scopeClassIds.length
                    ? inArray(enrollments.classId, scopeClassIds)
                    : undefined,
                ),
              ),
            })
          : [];
      const studentIds = [...new Set(enrollmentRows.map((e) => e.studentId))];
      const students = studentIds.length
        ? await db.query.studentProfiles.findMany({
            columns: { userId: true, gradeLevel: true, graduatedAt: true },
            where: inArray(studentProfiles.userId, studentIds),
          })
        : [];
      const records = classIds.length
        ? await db.query.classRecords.findMany({
            columns: {
              id: true,
              classId: true,
              gradingPeriod: true,
              status: true,
              revision: true,
              rosterConfirmedAt: true,
              policyExclusionReason: true,
              policyExcludedAt: true,
            },
            where: inArray(classRecords.classId, classIds),
          })
        : [];
      const recordIds = records.map((r) => r.id);
      const participants = recordIds.length
        ? await db.query.classRecordParticipants.findMany({
            columns: {
              classRecordId: true,
              studentId: true,
              eligibility: true,
            },
            where: inArray(classRecordParticipants.classRecordId, recordIds),
          })
        : [];
      const revisions = await db.query.academicPeriodGradeRevisions.findMany({
        columns: {
          id: true,
          classRecordId: true,
          classId: true,
          studentId: true,
          subjectCode: true,
          gradeLevel: true,
          period: true,
          grade: true,
          revision: true,
          trusted: true,
        },
        where: and(
          eq(academicPeriodGradeRevisions.schoolYear, year),
          eq(academicPeriodGradeRevisions.isCurrent, true),
        ),
      });
      const externals = await db.query.academicExternalPeriodGrades.findMany({
        columns: {
          id: true,
          studentId: true,
          subjectCode: true,
          gradeLevel: true,
          period: true,
          grade: true,
        },
        where: and(
          eq(academicExternalPeriodGrades.schoolYear, year),
          eq(academicExternalPeriodGrades.isCurrent, true),
        ),
      });
      const selections = await db.query.academicAnnualSourceSelections.findMany(
        { where: eq(academicAnnualSourceSelections.schoolYear, year) },
      );
      const annuals = await db.query.subjectAnnualGrades.findMany({
        columns: {
          id: true,
          studentId: true,
          subjectCode: true,
          gradeLevel: true,
          officialGrade: true,
          components: true,
          sourceFingerprint: true,
        },
        where: and(
          eq(subjectAnnualGrades.schoolYear, year),
          eq(subjectAnnualGrades.isCurrent, true),
        ),
      });
      const annualIds = annuals.map((a) => a.id);
      const remediation = annualIds.length
        ? await db.query.academicRemediationResults.findMany({
            columns: { id: true, annualGradeId: true, remedialClassMark: true },
            where: and(
              inArray(academicRemediationResults.annualGradeId, annualIds),
              eq(academicRemediationResults.isCurrent, true),
            ),
          })
        : [];
      const backSubjects = studentIds.length
        ? await db.query.academicBackSubjects.findMany({
            columns: {
              id: true,
              studentId: true,
              annualGradeId: true,
              status: true,
              sourceSchoolYear: true,
            },
            where: inArray(academicBackSubjects.studentId, studentIds),
          })
        : [];
      const result = evaluateTransitionReadiness({
        policy,
        activePeriod: current.quarter,
        sections: sectionRows,
        classes: classRows.map((c) => ({
          ...c,
          isActive:
            c.isActive &&
            (!sectionIds || scopeSectionIds.includes(c.sectionId)),
        })),
        enrollments: enrollmentRows,
        students,
        records,
        participants,
        revisions,
        externals,
        selections,
        annuals,
        remediation,
        backSubjects,
      });
      const states = await db.query.academicSystemStates.findMany({
        columns: { id: true },
      });
      if (states.length !== 1) {
        result.blockers.push({
          code: 'ambiguous_academic_state',
          message:
            'Repair duplicate or missing authoritative state before transition.',
        });
        result.transitionBlocked = true;
      }
      if (year !== current.schoolYear) {
        result.blockers.push({
          code: 'inactive_school_year',
          message:
            'Ordinary promotion and transition apply only to the active school year.',
        });
        result.transitionBlocked = true;
      }
      return {
        ...result,
        schoolYear: year,
        activePeriod: current.quarter,
        version: current.version,
      };
    });
  }
}
