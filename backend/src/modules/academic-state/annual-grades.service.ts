import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { AcademicMutation } from '../../database/academic-transaction';
import {
  academicBackSubjects,
  academicStudentYearOutcomes,
  academicStudentCompletions,
  studentProfiles,
  academicBackSubjectEvents,
  classRecordParticipants,
  classRecords,
  academicAnnualSourceSelections,
  academicExternalPeriodGrades,
  academicPeriodGradeRevisions,
  academicRemediationResults,
  enrollments,
  subjectAnnualGrades,
  users,
} from '../../drizzle/schema';
import { AuditService } from '../audit/audit.service';
import { AcademicPolicyService } from './academic-policy.service';
import {
  calculateAnnualGrade,
  normalizeSubjectCode,
  roundOfficialGrade,
} from './academic-policy';
import {
  ClearBackSubjectDto,
  ReferencedEvidenceDto,
  ExternalPeriodGradeDto,
  RecordRemediationDto,
  ScheduleBackSubjectDto,
  SelectAnnualSourceDto,
} from './DTO/academic-grade-repair.dto';
import { selectAnnualSources } from './annual-grade-sources';
import type { AnnualSource } from './annual-grade-sources';

interface SubjectIdentity {
  schoolYear: string;
  subjectCode: string;
  gradeLevel: string;
}

@Injectable()
export class AnnualGradesService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly academicPolicyService: AcademicPolicyService,
    private readonly auditService: AuditService,
  ) {}
  private get db() {
    return this.databaseService.db;
  }

  private async classIdentity(classId: string) {
    const { cls, policy } = await this.academicPolicyService.forClass(classId);
    const gradeLevel = cls.subjectGradeLevel ?? cls.section?.gradeLevel;
    if (!gradeLevel || !['7', '8', '9', '10'].includes(gradeLevel))
      throw new BadRequestException('Class grade level must be 7 to 10');
    return {
      cls,
      policy,
      identity: {
        schoolYear: cls.schoolYear,
        subjectCode: normalizeSubjectCode(cls.subjectCode),
        gradeLevel,
      },
    };
  }

  private async loadSources(identity: SubjectIdentity) {
    const periods = await this.db.query.academicPeriodGradeRevisions.findMany({
      where: and(
        eq(academicPeriodGradeRevisions.schoolYear, identity.schoolYear),
        eq(academicPeriodGradeRevisions.subjectCode, identity.subjectCode),
        eq(academicPeriodGradeRevisions.gradeLevel, identity.gradeLevel),
        eq(academicPeriodGradeRevisions.isCurrent, true),
      ),
    });
    const external = await this.db.query.academicExternalPeriodGrades.findMany({
      where: and(
        eq(academicExternalPeriodGrades.schoolYear, identity.schoolYear),
        eq(academicExternalPeriodGrades.subjectCode, identity.subjectCode),
        eq(academicExternalPeriodGrades.gradeLevel, identity.gradeLevel),
        eq(academicExternalPeriodGrades.isCurrent, true),
      ),
    });
    const selections =
      await this.db.query.academicAnnualSourceSelections.findMany({
        where: and(
          eq(academicAnnualSourceSelections.schoolYear, identity.schoolYear),
          eq(academicAnnualSourceSelections.subjectCode, identity.subjectCode),
          eq(academicAnnualSourceSelections.gradeLevel, identity.gradeLevel),
        ),
      });
    const annuals = await this.db.query.subjectAnnualGrades.findMany({
      where: and(
        eq(subjectAnnualGrades.schoolYear, identity.schoolYear),
        eq(subjectAnnualGrades.subjectCode, identity.subjectCode),
        eq(subjectAnnualGrades.gradeLevel, identity.gradeLevel),
      ),
      orderBy: [desc(subjectAnnualGrades.computedAt)],
    });
    const sources: (AnnualSource & { studentId: string })[] = [
      ...periods.map((row) => ({
        id: row.id,
        studentId: row.studentId,
        period: row.period,
        grade: row.grade,
        sourceType: 'period_revision' as const,
        classId: row.classId,
        trusted: row.trusted,
      })),
      ...external.map((row) => ({
        id: row.id,
        studentId: row.studentId,
        period: row.period,
        grade: row.grade,
        sourceType: 'external' as const,
        classId: null,
        trusted: true,
      })),
    ];
    return { sources, selections, annuals };
  }

  @AcademicMutation()
  async refreshForClass(classId: string, actorId: string) {
    const { identity, policy } = await this.classIdentity(classId);
    const { sources, selections, annuals } = await this.loadSources(identity);
    const studentIds = [
      ...new Set([...sources, ...annuals].map((source) => source.studentId)),
    ];
    const results: Array<{
      studentId: string;
      annualGradeId: string | null;
      blockers: ReturnType<typeof selectAnnualSources>['blockers'];
    }> = [];
    for (const studentId of studentIds) {
      const selected = selectAnnualSources(
        policy,
        sources.filter((source) => source.studentId === studentId),
        selections.filter((selection) => selection.studentId === studentId),
      );
      const current = annuals.find(
        (row) => row.studentId === studentId && row.isCurrent,
      );
      if (selected.blockers.length) {
        if (current)
          await this.invalidateAnnualIds(
            [current.id],
            'Required period sources changed',
            actorId,
          );
        results.push({
          studentId,
          annualGradeId: null,
          blockers: selected.blockers,
        });
        continue;
      }
      const fingerprint = createHash('sha256')
        .update(JSON.stringify({ policy, components: selected.components }))
        .digest('hex');
      if (current?.sourceFingerprint === fingerprint) {
        results.push({ studentId, annualGradeId: current.id, blockers: [] });
        continue;
      }
      if (current)
        await this.invalidateAnnualIds(
          [current.id],
          'Superseded by newly finalized period sources',
          actorId,
        );
      const calculation = calculateAnnualGrade(policy, selected.components);
      const [created] = await this.db
        .insert(subjectAnnualGrades)
        .values({
          ...identity,
          studentId,
          components: selected.components,
          policy,
          sourceFingerprint: fingerprint,
          sum: calculation.sum,
          divisor: calculation.divisor,
          rawAverage: String(calculation.rawAverage),
          officialGrade: calculation.officialGrade,
          remarks: calculation.remarks,
          computedBy: actorId,
        })
        .returning();
      await this.auditService.log({
        actorId,
        action: 'academic.annual_grade.computed',
        targetType: 'subject_annual_grade',
        targetId: created.id,
        metadata: {
          ...identity,
          studentId,
          sourceFingerprint: fingerprint,
          officialGrade: created.officialGrade,
        },
      });
      results.push({ studentId, annualGradeId: created.id, blockers: [] });
    }
    return results;
  }

  private async invalidateAnnualIds(
    ids: string[],
    reason: string,
    actorId: string,
  ) {
    if (!ids.length) return;
    await this.db
      .update(subjectAnnualGrades)
      .set({
        isCurrent: false,
        invalidatedAt: new Date(),
        invalidationReason: reason,
      })
      .where(inArray(subjectAnnualGrades.id, ids));
    const obligations = await this.db.query.academicBackSubjects.findMany({
      where: inArray(academicBackSubjects.annualGradeId, ids),
    });
    for (const obligation of obligations) {
      if (obligation.status === 'invalidated') continue;
      await this.db
        .update(academicBackSubjects)
        .set({ status: 'invalidated', updatedAt: new Date() })
        .where(eq(academicBackSubjects.id, obligation.id));
      await this.db.insert(academicBackSubjectEvents).values({
        backSubjectId: obligation.id,
        action: 'invalidated',
        evidence: { reason, previous: obligation },
        actorId,
      });
    }
    await this.db
      .update(academicRemediationResults)
      .set({ isCurrent: false })
      .where(inArray(academicRemediationResults.annualGradeId, ids));
  }

  @AcademicMutation()
  async invalidateRecordSources(
    classRecordId: string,
    actorId: string,
    reason: string,
  ) {
    if (!reason.trim())
      throw new BadRequestException(
        'A reason is required to invalidate official grades',
      );
    const sources = await this.db.query.academicPeriodGradeRevisions.findMany({
      where: and(
        eq(academicPeriodGradeRevisions.classRecordId, classRecordId),
        eq(academicPeriodGradeRevisions.isCurrent, true),
      ),
    });
    if (!sources.length) return;
    await this.db
      .update(academicPeriodGradeRevisions)
      .set({ isCurrent: false, invalidatedAt: new Date() })
      .where(
        inArray(
          academicPeriodGradeRevisions.id,
          sources.map((row) => row.id),
        ),
      );
    const sourceIds = new Set(sources.map((row) => row.id));
    const annuals = await this.db.query.subjectAnnualGrades.findMany({
      where: and(
        inArray(subjectAnnualGrades.schoolYear, [
          ...new Set(sources.map((row) => row.schoolYear)),
        ]),
        inArray(subjectAnnualGrades.studentId, [
          ...new Set(sources.map((row) => row.studentId)),
        ]),
        eq(subjectAnnualGrades.isCurrent, true),
      ),
    });
    const affectedIds = annuals
      .filter((row) =>
        row.components.some((component) => sourceIds.has(component.sourceId)),
      )
      .map((row) => row.id);
    await this.invalidateAnnualIds(affectedIds, reason, actorId);
    await this.auditService.log({
      actorId,
      action: 'academic.annual_grade.invalidated',
      targetType: 'class_record',
      targetId: classRecordId,
      metadata: {
        reason,
        annualGradeIds: affectedIds,
        periodRevisionIds: [...sourceIds],
      },
    });
  }

  private assertAdmin(roles: string[]) {
    if (!roles.includes('admin'))
      throw new ForbiddenException(
        'Admin authorization is required for official grade repair',
      );
  }
  private assertEvidence(
    dto: { reason: string; sourceReference?: string },
    reference = false,
  ) {
    if (!dto.reason?.trim())
      throw new BadRequestException('A reason is required');
    if (reference && !dto.sourceReference?.trim())
      throw new BadRequestException('A verified source reference is required');
  }
  private assertWholeGrade(grade: number) {
    if (!Number.isInteger(grade) || grade < 0 || grade > 100)
      throw new BadRequestException(
        'Official grade must be a whole number from 0 to 100',
      );
  }
  private async assertOpenYear(schoolYear: string) {
    const state = await this.academicPolicyService.currentState();
    if (schoolYear !== state.schoolYear)
      throw new ConflictException(
        'Closed school-year grades cannot be changed through the active-year repair workflow',
      );
    return state;
  }
  private async assertClassParticipant(classId: string, studentId: string) {
    const membership = await this.db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.classId, classId),
        eq(enrollments.studentId, studentId),
      ),
    });
    if (membership) return;
    const participants = await this.db
      .select({ id: classRecordParticipants.id })
      .from(classRecordParticipants)
      .innerJoin(
        classRecords,
        eq(classRecords.id, classRecordParticipants.classRecordId),
      )
      .where(
        and(
          eq(classRecords.classId, classId),
          eq(classRecordParticipants.studentId, studentId),
        ),
      );
    if (!participants.length)
      throw new BadRequestException(
        'Student must belong to this class or its historical period register',
      );
  }

  @AcademicMutation()
  async recordExternalGrade(
    classId: string,
    dto: ExternalPeriodGradeDto,
    actorId: string,
    roles: string[],
  ) {
    this.assertAdmin(roles);
    this.assertEvidence(dto, true);
    this.assertWholeGrade(dto.grade);
    const { identity, policy } = await this.classIdentity(classId);
    const state = await this.assertOpenYear(identity.schoolYear);
    const index = policy.periods.findIndex((p) => p.key === dto.period);
    if (
      index < 0 ||
      index > policy.periods.findIndex((p) => p.key === state.quarter)
    )
      throw new BadRequestException(
        'External grades require a valid current or past period',
      );
    await this.assertClassParticipant(classId, dto.studentId);
    const matching = and(
      eq(academicExternalPeriodGrades.schoolYear, identity.schoolYear),
      eq(academicExternalPeriodGrades.subjectCode, identity.subjectCode),
      eq(academicExternalPeriodGrades.gradeLevel, identity.gradeLevel),
      eq(academicExternalPeriodGrades.studentId, dto.studentId),
      eq(academicExternalPeriodGrades.period, dto.period),
      eq(academicExternalPeriodGrades.isCurrent, true),
    );
    const previous = await this.db.query.academicExternalPeriodGrades.findFirst(
      { where: matching },
    );
    if (
      previous?.grade === dto.grade &&
      previous.sourceReference === dto.sourceReference.trim() &&
      previous.reason === dto.reason.trim()
    )
      return previous;
    await this.db
      .update(academicExternalPeriodGrades)
      .set({ isCurrent: false, supersededAt: new Date() })
      .where(matching);
    const [created] = await this.db
      .insert(academicExternalPeriodGrades)
      .values({
        ...identity,
        studentId: dto.studentId,
        period: dto.period,
        grade: dto.grade,
        sourceReference: dto.sourceReference.trim(),
        reason: dto.reason.trim(),
        recordedBy: actorId,
      })
      .returning();
    await this.auditService.log({
      actorId,
      action: 'academic.external_grade.recorded',
      targetType: 'external_period_grade',
      targetId: created.id,
      metadata: { classId, previous, created },
    });
    await this.refreshForClass(classId, actorId);
    return created;
  }

  @AcademicMutation()
  async selectSource(
    classId: string,
    dto: SelectAnnualSourceDto,
    actorId: string,
    roles: string[],
  ) {
    this.assertAdmin(roles);
    this.assertEvidence(dto);
    const { identity, policy } = await this.classIdentity(classId);
    await this.assertOpenYear(identity.schoolYear);
    await this.assertClassParticipant(classId, dto.studentId);
    if (!policy.periods.some((p) => p.key === dto.period))
      throw new BadRequestException('Invalid policy period');
    const { sources } = await this.loadSources(identity);
    const source = sources.find(
      (source) =>
        source.id === dto.sourceId &&
        source.studentId === dto.studentId &&
        source.period === dto.period &&
        source.sourceType === dto.sourceType &&
        source.trusted,
    );
    if (!source)
      throw new BadRequestException(
        'Selected source must be current, verified, and match this student, subject, year and period',
      );
    const values = {
      ...identity,
      ...dto,
      reason: dto.reason.trim(),
      selectedBy: actorId,
      selectedAt: new Date(),
    };
    const [selected] = await this.db
      .insert(academicAnnualSourceSelections)
      .values(values)
      .onConflictDoUpdate({
        target: [
          academicAnnualSourceSelections.schoolYear,
          academicAnnualSourceSelections.studentId,
          academicAnnualSourceSelections.subjectCode,
          academicAnnualSourceSelections.gradeLevel,
          academicAnnualSourceSelections.period,
        ],
        set: values,
      })
      .returning();
    await this.auditService.log({
      actorId,
      action: 'academic.annual_source.selected',
      targetType: 'annual_source_selection',
      targetId: selected.id,
      metadata: values,
    });
    await this.refreshForClass(classId, actorId);
    return selected;
  }

  @AcademicMutation()
  async recordRemediation(
    annualGradeId: string,
    dto: RecordRemediationDto,
    actorId: string,
    roles: string[],
  ) {
    this.assertAdmin(roles);
    this.assertEvidence(dto, true);
    this.assertWholeGrade(dto.remedialClassMark);
    const annual = await this.db.query.subjectAnnualGrades.findFirst({
      where: eq(subjectAnnualGrades.id, annualGradeId),
    });
    if (!annual?.isCurrent)
      throw new ConflictException(
        'A current complete annual grade is required for remediation',
      );
    const state = await this.assertOpenYear(annual.schoolYear);
    if (state.quarter !== annual.policy.periods.at(-1)!.key)
      throw new BadRequestException(
        'Record SRC results only after the final grading period has opened',
      );
    if (annual.officialGrade >= annual.policy.passingGrade)
      throw new BadRequestException(
        'A passing annual grade does not require SRC',
      );
    const otherAnnuals = await this.db.query.subjectAnnualGrades.findMany({
      where: and(
        eq(subjectAnnualGrades.schoolYear, annual.schoolYear),
        eq(subjectAnnualGrades.studentId, annual.studentId),
        eq(subjectAnnualGrades.gradeLevel, annual.gradeLevel),
        eq(subjectAnnualGrades.isCurrent, true),
      ),
    });
    if (
      otherAnnuals.filter(
        (row) => row.officialGrade < annual.policy.passingGrade,
      ).length > 2
    )
      throw new BadRequestException(
        'More than two failed subjects require retention, not the one-or-two-subject SRC route',
      );
    const previous = await this.db.query.academicRemediationResults.findFirst({
      where: and(
        eq(academicRemediationResults.annualGradeId, annualGradeId),
        eq(academicRemediationResults.isCurrent, true),
      ),
    });
    if (
      previous?.remedialClassMark === dto.remedialClassMark &&
      previous.sourceReference === dto.sourceReference.trim() &&
      previous.reason === dto.reason.trim()
    )
      return previous;
    const obligation = await this.db.query.academicBackSubjects.findFirst({
      where: eq(academicBackSubjects.annualGradeId, annualGradeId),
    });
    if (obligation?.status === 'cleared')
      throw new ConflictException(
        'A cleared back subject requires a separate academic review before changing its SRC evidence',
      );
    await this.db
      .update(academicRemediationResults)
      .set({ isCurrent: false })
      .where(eq(academicRemediationResults.annualGradeId, annualGradeId));
    const rawRecomputedGrade =
      (annual.officialGrade + dto.remedialClassMark) / 2;
    const [created] = await this.db
      .insert(academicRemediationResults)
      .values({
        annualGradeId,
        remedialClassMark: dto.remedialClassMark,
        rawRecomputedGrade: String(rawRecomputedGrade),
        recomputedGrade: roundOfficialGrade(rawRecomputedGrade),
        sourceReference: dto.sourceReference.trim(),
        reason: dto.reason.trim(),
        recordedBy: actorId,
      })
      .returning();
    if (
      created.recomputedGrade < annual.policy.passingGrade &&
      annual.policy.conditionalPromotion
    ) {
      const values = {
        annualGradeId,
        remediationResultId: created.id,
        studentId: annual.studentId,
        subjectCode: annual.subjectCode,
        sourceSchoolYear: annual.schoolYear,
        gradeLevel: annual.gradeLevel,
        status: 'pending' as const,
        scheduledSchoolYear: null,
        scheduledPeriod: null,
        clearedGrade: null,
        updatedAt: new Date(),
      };
      const [backSubject] = await this.db
        .insert(academicBackSubjects)
        .values(values)
        .onConflictDoUpdate({
          target: academicBackSubjects.annualGradeId,
          set: values,
        })
        .returning();
      await this.db.insert(academicBackSubjectEvents).values({
        backSubjectId: backSubject.id,
        action: obligation ? 'revised' : 'created',
        actorId,
        evidence: {
          reason: dto.reason,
          remediationResult: created,
          previous: obligation ?? null,
        },
      });
    } else if (obligation && obligation.status !== 'invalidated') {
      await this.db
        .update(academicBackSubjects)
        .set({ status: 'invalidated', updatedAt: new Date() })
        .where(eq(academicBackSubjects.id, obligation.id));
      await this.db.insert(academicBackSubjectEvents).values({
        backSubjectId: obligation.id,
        action: 'invalidated',
        actorId,
        evidence: {
          reason: 'Revised SRC no longer requires a back subject',
          remediationResultId: created.id,
          previous: obligation,
        },
      });
    }
    await this.auditService.log({
      actorId,
      action: 'academic.remediation.recorded',
      targetType: 'remediation_result',
      targetId: created.id,
      metadata: { annualGradeId, previous, created },
    });
    return created;
  }

  @AcademicMutation()
  async scheduleBackSubject(
    id: string,
    dto: ScheduleBackSubjectDto,
    actorId: string,
    roles: string[],
  ) {
    this.assertAdmin(roles);
    this.assertEvidence(dto);
    const obligation = await this.db.query.academicBackSubjects.findFirst({
      where: eq(academicBackSubjects.id, id),
    });
    if (!obligation) throw new NotFoundException('Back subject not found');
    if (!['pending', 'scheduled'].includes(obligation.status))
      throw new ConflictException(
        'Only an unresolved valid back subject can be scheduled',
      );
    const state = await this.academicPolicyService.currentState();
    const policy = await this.academicPolicyService.forYear(dto.schoolYear);
    const year = Number(dto.schoolYear.slice(0, 4));
    const currentYear = Number(state.schoolYear.slice(0, 4));
    const periodIndex = policy.periods.findIndex((p) => p.key === dto.period);
    if (
      year < currentYear ||
      year > currentYear + 1 ||
      periodIndex < 0 ||
      (year === currentYear &&
        periodIndex <
          state.policy.periods.findIndex((p) => p.key === state.quarter))
    )
      throw new BadRequestException(
        'Choose a current or future period in this or the immediately following school year',
      );
    const conflict = await this.db.query.academicBackSubjects.findFirst({
      where: and(
        eq(academicBackSubjects.studentId, obligation.studentId),
        eq(academicBackSubjects.scheduledSchoolYear, dto.schoolYear),
        eq(academicBackSubjects.scheduledPeriod, dto.period),
        inArray(academicBackSubjects.status, ['scheduled', 'cleared']),
      ),
    });
    if (conflict && conflict.id !== id)
      throw new ConflictException(
        'Only one back subject per learner may be scheduled in a grading period',
      );
    if (
      obligation.status === 'scheduled' &&
      obligation.scheduledSchoolYear === dto.schoolYear &&
      obligation.scheduledPeriod === dto.period
    )
      return obligation;
    const [updated] = await this.db
      .update(academicBackSubjects)
      .set({
        status: 'scheduled',
        scheduledSchoolYear: dto.schoolYear,
        scheduledPeriod: dto.period,
        updatedAt: new Date(),
      })
      .where(eq(academicBackSubjects.id, id))
      .returning();
    await this.db.insert(academicBackSubjectEvents).values({
      backSubjectId: id,
      action: 'scheduled',
      actorId,
      evidence: { reason: dto.reason, previous: obligation, schedule: dto },
    });
    await this.auditService.log({
      actorId,
      action: 'academic.back_subject.scheduled',
      targetType: 'back_subject',
      targetId: id,
      metadata: { previous: obligation, schedule: dto },
    });
    return updated;
  }

  @AcademicMutation()
  async clearBackSubject(
    id: string,
    dto: ClearBackSubjectDto,
    actorId: string,
    roles: string[],
  ) {
    this.assertAdmin(roles);
    this.assertEvidence(dto, true);
    this.assertWholeGrade(dto.grade);
    if (dto.grade < 75)
      throw new BadRequestException('Clearance requires a passing grade');
    const obligation = await this.db.query.academicBackSubjects.findFirst({
      where: eq(academicBackSubjects.id, id),
    });
    if (!obligation) throw new NotFoundException('Back subject not found');
    if (obligation.status !== 'scheduled')
      throw new ConflictException(
        'Only a scheduled back subject can be cleared',
      );
    const state = await this.academicPolicyService.currentState();
    const policy = await this.academicPolicyService.forYear(
      obligation.scheduledSchoolYear!,
    );
    if (
      obligation.scheduledSchoolYear! > state.schoolYear ||
      (obligation.scheduledSchoolYear === state.schoolYear &&
        policy.periods.findIndex((p) => p.key === obligation.scheduledPeriod) >
          policy.periods.findIndex((p) => p.key === state.quarter))
    )
      throw new BadRequestException(
        'A future scheduled back subject cannot be cleared',
      );
    const [updated] = await this.db
      .update(academicBackSubjects)
      .set({
        status: 'cleared',
        clearedGrade: dto.grade,
        updatedAt: new Date(),
      })
      .where(eq(academicBackSubjects.id, id))
      .returning();
    await this.db.insert(academicBackSubjectEvents).values({
      backSubjectId: id,
      action: 'cleared',
      actorId,
      evidence: { ...dto, previous: obligation },
    });
    await this.auditService.log({
      actorId,
      action: 'academic.back_subject.cleared',
      targetType: 'back_subject',
      targetId: id,
      metadata: { ...dto, previous: obligation },
    });
    return updated;
  }

  @AcademicMutation()
  async completeGrade10(
    studentId: string,
    dto: ReferencedEvidenceDto,
    actorId: string,
    roles: string[],
  ) {
    this.assertAdmin(roles);
    this.assertEvidence(dto, true);
    const outcome = await this.db.query.academicStudentYearOutcomes.findFirst({
      where: and(
        eq(academicStudentYearOutcomes.studentId, studentId),
        eq(academicStudentYearOutcomes.sourceGradeLevel, '10'),
      ),
      orderBy: [desc(academicStudentYearOutcomes.schoolYear)],
    });
    if (!outcome || outcome.outcome !== 'pending_completion')
      throw new ConflictException(
        'Only a verified Grade 10 pending-completion outcome can be completed',
      );
    const existing = await this.db.query.academicStudentCompletions.findFirst({
      where: eq(academicStudentCompletions.outcomeId, outcome.id),
    });
    if (existing) return existing;
    const obligations = await this.db.query.academicBackSubjects.findMany({
      where: eq(academicBackSubjects.studentId, studentId),
    });
    const requiredObligationIds = outcome.evidence.backSubjectIds as
      | string[]
      | undefined;
    if (
      obligations.some(
        (o) => o.status === 'pending' || o.status === 'scheduled',
      ) ||
      !Array.isArray(requiredObligationIds) ||
      requiredObligationIds.some(
        (id) => !obligations.some((o) => o.id === id && o.status === 'cleared'),
      )
    )
      throw new ConflictException(
        'Uncleared back subjects prevent Grade 10 completion',
      );
    const annualIds = outcome.evidence.annualGradeIds as string[] | undefined;
    if (!annualIds?.length)
      throw new ConflictException('Year-end annual evidence is missing');
    const annuals = await this.db.query.subjectAnnualGrades.findMany({
      where: inArray(subjectAnnualGrades.id, annualIds),
    });
    if (
      annuals.length !== new Set(annualIds).size ||
      annuals.some(
        (a) =>
          !a.isCurrent ||
          a.studentId !== studentId ||
          a.schoolYear !== outcome.schoolYear ||
          a.gradeLevel !== '10',
      )
    )
      throw new ConflictException(
        'Year-end annual evidence is no longer authoritative',
      );
    const remediation = await this.db.query.academicRemediationResults.findMany(
      {
        where: and(
          inArray(academicRemediationResults.annualGradeId, annualIds),
          eq(academicRemediationResults.isCurrent, true),
        ),
      },
    );
    if (
      annuals.some(
        (a) =>
          a.officialGrade < 75 &&
          !remediation.some(
            (r) => r.annualGradeId === a.id && r.recomputedGrade >= 75,
          ) &&
          !obligations.some(
            (o) =>
              o.annualGradeId === a.id &&
              o.status === 'cleared' &&
              (o.clearedGrade ?? 0) >= 75,
          ),
      )
    )
      throw new ConflictException(
        'A failed learning area is missing passing SRC or clearance evidence',
      );
    const membership = await this.db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.status, 'enrolled'),
      ),
    });
    if (membership)
      throw new ConflictException(
        'Resolve active enrollment before completing Grade 10',
      );
    const profile = await this.db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.userId, studentId),
    });
    if (!profile || profile.gradeLevel !== '10' || profile.graduatedAt)
      throw new ConflictException(
        'Student profile must be an ungraduated Grade 10 learner',
      );
    const [completion] = await this.db
      .insert(academicStudentCompletions)
      .values({
        outcomeId: outcome.id,
        studentId,
        recordedBy: actorId,
        evidence: {
          ...dto,
          annualGradeIds: annualIds,
          remediationResultIds: remediation.map((r) => r.id),
          clearedBackSubjectIds: obligations
            .filter((o) => o.status === 'cleared')
            .map((o) => o.id),
          originalOutcome: outcome.outcome,
        },
      })
      .returning();
    await this.db
      .update(studentProfiles)
      .set({ graduatedAt: completion.recordedAt, updatedAt: new Date() })
      .where(eq(studentProfiles.userId, studentId));
    await this.auditService.log({
      actorId,
      action: 'academic.grade10.completed',
      targetType: 'student',
      targetId: studentId,
      metadata: {
        completionId: completion.id,
        outcomeId: outcome.id,
        ...dto,
        originalGradesUnchanged: true,
      },
    });
    return completion;
  }

  async listGrade10Completions(actorId: string, roles: string[]) {
    this.assertAdmin(roles);
    const outcomes = await this.db.query.academicStudentYearOutcomes.findMany({
      where: and(
        eq(academicStudentYearOutcomes.sourceGradeLevel, '10'),
        eq(academicStudentYearOutcomes.outcome, 'pending_completion'),
      ),
      orderBy: [desc(academicStudentYearOutcomes.schoolYear)],
    });
    const ids = outcomes.map((o) => o.studentId);
    if (!ids.length) return [];
    const people = await this.db.query.users.findMany({
      where: inArray(users.id, ids),
      columns: { id: true, firstName: true, lastName: true },
    });
    const completions = await this.db.query.academicStudentCompletions.findMany(
      { where: inArray(academicStudentCompletions.studentId, ids) },
    );
    return outcomes.map((outcome) => ({
      ...outcome,
      student: people.find((p) => p.id === outcome.studentId),
      completion: completions.find((c) => c.outcomeId === outcome.id) ?? null,
    }));
  }

  async listBackSubjects(actorId: string, roles: string[], studentId?: string) {
    this.assertAdmin(roles);
    const obligations = await this.db.query.academicBackSubjects.findMany({
      where: studentId
        ? eq(academicBackSubjects.studentId, studentId)
        : undefined,
      orderBy: [desc(academicBackSubjects.createdAt)],
    });
    const ids = obligations.map((row) => row.id);
    const events = ids.length
      ? await this.db.query.academicBackSubjectEvents.findMany({
          where: inArray(academicBackSubjectEvents.backSubjectId, ids),
          orderBy: [desc(academicBackSubjectEvents.createdAt)],
        })
      : [];
    const studentIds = [...new Set(obligations.map((row) => row.studentId))];
    const people = studentIds.length
      ? await this.db.query.users.findMany({
          where: inArray(users.id, studentIds),
          columns: { id: true, firstName: true, lastName: true },
        })
      : [];
    const peopleById = new Map(people.map((person) => [person.id, person]));
    return obligations.map((row) => ({
      ...row,
      student: peopleById.get(row.studentId) ?? null,
      history: events.filter((event) => event.backSubjectId === row.id),
    }));
  }

  async getSummary(classId: string, actorId: string, roles: string[]) {
    const { cls, identity, policy } = await this.classIdentity(classId);
    if (!roles.includes('admin') && cls.teacherId !== actorId)
      throw new ForbiddenException(
        'You can only view annual grades for your own classes',
      );
    const { sources, selections, annuals } = await this.loadSources(identity);
    const enrolled = await this.db.query.enrollments.findMany({
      where: and(
        eq(enrollments.classId, classId),
        eq(enrollments.status, 'enrolled'),
      ),
    });
    const roster = await this.db
      .select({ studentId: classRecordParticipants.studentId })
      .from(classRecordParticipants)
      .innerJoin(
        classRecords,
        eq(classRecords.id, classRecordParticipants.classRecordId),
      )
      .where(eq(classRecords.classId, classId));
    // An owning teacher sees only participants of this class, even though their sources may span sections.
    const participantIds = [
      ...new Set([
        ...roster.map((row) => row.studentId),
        ...enrolled.map((row) => row.studentId),
        ...sources
          .filter((row) => row.classId === classId)
          .map((row) => row.studentId),
      ]),
    ];
    const people = participantIds.length
      ? await this.db.query.users.findMany({
          where: inArray(users.id, participantIds),
          columns: { id: true, firstName: true, lastName: true },
        })
      : [];
    const annualIds = annuals
      .filter((row) => participantIds.includes(row.studentId))
      .map((row) => row.id);
    const remediation = annualIds.length
      ? await this.db.query.academicRemediationResults.findMany({
          where: inArray(academicRemediationResults.annualGradeId, annualIds),
          orderBy: [desc(academicRemediationResults.recordedAt)],
        })
      : [];
    return {
      classId,
      ...identity,
      policy,
      periods: policy.periods,
      students: people.map((student) => {
        const selected = selectAnnualSources(
          policy,
          sources.filter((row) => row.studentId === student.id),
          selections.filter((row) => row.studentId === student.id),
        );
        const history = annuals.filter((row) => row.studentId === student.id);
        const current = history.find((row) => row.isCurrent) ?? null;
        return {
          studentId: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          components: selected.components,
          candidates: sources.filter((row) => row.studentId === student.id),
          selections: selections.filter((row) => row.studentId === student.id),
          blockers: selected.blockers,
          current,
          history,
          remediation: remediation.filter((row) =>
            history.some((annual) => annual.id === row.annualGradeId),
          ),
        };
      }),
    };
  }
}
