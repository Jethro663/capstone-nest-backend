import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../../database/database.service';
import { AcademicMutation } from '../../database/academic-transaction';
import {
  academicSystemStates,
  assessments,
  assessmentAttempts,
  classRecordItems,
  classRecordCategories,
  enrollments,
  classRecords,
  classes,
  users,
} from '../../drizzle/schema';
import {
  ACADEMIC_STATE_ID,
  AcademicPolicyService,
} from './academic-policy.service';
import { AuditService } from '../audit/audit.service';
import { AnnualGradesService } from './annual-grades.service';
import { preserveLegacyGradeEvidence } from './academic-legacy-evidence';
import { getSubjectWeights, normalizeSubjectCode } from './academic-policy';
import {
  ClassifyAcademicSubjectDto,
  RepairAcademicStateDto,
  RepairAssessmentPeriodDto,
  RepairWorkbookPolicyDto,
  RetireDuplicateClassDto,
} from './DTO/academic-maintenance.dto';

@Injectable()
export class AcademicRepairService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly policyService: AcademicPolicyService,
    private readonly audit: AuditService,
    private readonly annual: AnnualGradesService,
  ) {}
  private get db() {
    return this.databaseService.db;
  }
  private assertAdmin(roles: string[], reason: string) {
    if (!roles.includes('admin'))
      throw new ForbiddenException('Academic repair is restricted to admins');
    if (!reason || reason.trim().length < 5)
      throw new BadRequestException('A specific repair reason is required');
  }

  @AcademicMutation()
  async preserveLegacy(reason: string, actorId: string, roles: string[]) {
    this.assertAdmin(roles, reason);
    const preservedCount = await preserveLegacyGradeEvidence(this.db);
    await this.audit.log({
      actorId,
      action: 'academic.legacy.preserved',
      targetType: 'academic_state',
      targetId: ACADEMIC_STATE_ID,
      metadata: { reason: reason.trim(), preservedCount, trusted: false },
    });
    return { preservedCount, trusted: false };
  }

  @AcademicMutation()
  async initializePolicy(
    schoolYear: string,
    reason: string,
    actorId: string,
    roles: string[],
  ) {
    this.assertAdmin(roles, reason);
    const policy = await this.policyService.forYear(schoolYear);
    await this.audit.log({
      actorId,
      action: 'academic.policy.initialized',
      targetType: 'academic_year_policy',
      targetId: ACADEMIC_STATE_ID,
      metadata: { reason: reason.trim(), schoolYear, policyId: policy.id },
    });
    return policy;
  }

  @AcademicMutation()
  async classifySubject(
    classId: string,
    dto: ClassifyAcademicSubjectDto,
    actorId: string,
    roles: string[],
  ) {
    this.assertAdmin(roles, dto.reason);
    const { cls, policy } = await this.policyService.forClass(classId);
    const state = await this.policyService.currentState();
    if (cls.schoolYear < state.schoolYear || !cls.isActive)
      throw new ConflictException(
        'Closed-year subject profiles are historical evidence',
      );
    if (policy.gradeMethod === 'legacy_transmutation')
      throw new BadRequestException(
        'Historical class weights are preserved; modern subject profiles do not apply',
      );
    const inferred = getSubjectWeights(
      policy,
      cls.subjectCode,
      cls.subjectName,
    );
    const inferredProfile =
      inferred?.performanceTask === 60
        ? 'practical'
        : inferred
          ? 'academic'
          : null;
    if (inferredProfile && inferredProfile !== dto.profile)
      throw new BadRequestException(
        'This recognized learning area must use its prescribed policy weights',
      );
    const weights = getSubjectWeights(
      policy,
      cls.subjectCode,
      cls.subjectName,
      dto.profile,
    )!;
    const [updated] = await this.db
      .update(classes)
      .set({
        academicWeightProfile: dto.profile,
        writtenWorkGradingWeight: weights.writtenWork,
        performanceTaskGradingWeight: weights.performanceTask,
        quarterlyAssessmentGradingWeight: weights.examination,
        updatedAt: new Date(),
      })
      .where(eq(classes.id, classId))
      .returning();
    await this.audit.log({
      actorId,
      action: 'academic.subject.classified',
      targetType: 'class',
      targetId: classId,
      metadata: {
        reason: dto.reason.trim(),
        previousProfile: cls.academicWeightProfile,
        profile: dto.profile,
        weights,
        existingWorkbooksUnchanged: true,
      },
    });
    return { class: updated, existingWorkbooksUnchanged: true };
  }

  @AcademicMutation()
  async excludeHistoricalPeriod(
    classRecordId: string,
    reason: string,
    actorId: string,
    roles: string[],
  ) {
    this.assertAdmin(roles, reason);
    const record = await this.db.query.classRecords.findFirst({
      where: eq(classRecords.id, classRecordId),
    });
    if (!record) throw new NotFoundException('Class record not found');
    const { policy } = await this.policyService.forClass(record.classId);
    if (policy.periods.some((p) => p.key === record.gradingPeriod))
      throw new BadRequestException(
        'A required policy period cannot be excluded from year-end readiness',
      );
    await preserveLegacyGradeEvidence(this.db, classRecordId);
    await this.annual.invalidateRecordSources(classRecordId, actorId, reason);
    const [updated] = await this.db
      .update(classRecords)
      .set({
        status: 'locked',
        policyExcludedAt: new Date(),
        policyExcludedBy: actorId,
        policyExclusionReason: reason.trim(),
        updatedAt: new Date(),
      })
      .where(eq(classRecords.id, classRecordId))
      .returning();
    await this.audit.log({
      actorId,
      action: 'academic.legacy_period.excluded',
      targetType: 'class_record',
      targetId: classRecordId,
      metadata: {
        previous: record,
        reason: reason.trim(),
        policyId: policy.id,
        preservedPeriod: record.gradingPeriod,
        gradeValuesUnchanged: true,
      },
    });
    return updated;
  }

  @AcademicMutation()
  async retireDuplicateClass(
    classId: string,
    dto: RetireDuplicateClassDto,
    actorId: string,
    roles: string[],
  ) {
    this.assertAdmin(roles, dto.reason);
    const { cls } = await this.policyService.forClass(classId);
    const { cls: canonical } = await this.policyService.forClass(
      dto.canonicalClassId,
    );
    const current = await this.policyService.currentState();
    if (
      cls.id === canonical.id ||
      !cls.isActive ||
      !canonical.isActive ||
      cls.schoolYear !== current.schoolYear ||
      cls.schoolYear !== canonical.schoolYear ||
      cls.sectionId !== canonical.sectionId ||
      normalizeSubjectCode(cls.subjectCode) !==
        normalizeSubjectCode(canonical.subjectCode) ||
      (cls.subjectGradeLevel ?? cls.section?.gradeLevel) !==
        (canonical.subjectGradeLevel ?? canonical.section?.gradeLevel)
    )
      throw new ConflictException(
        'Choose two active duplicate learning-area classes in the same current-year section',
      );
    const memberships = await this.db.query.enrollments.findMany({
      where: and(
        inArray(enrollments.classId, [classId, canonical.id]),
        eq(enrollments.status, 'enrolled'),
      ),
    });
    const retiring = memberships.filter((e) => e.classId === classId);
    if (
      retiring.some(
        (e) =>
          !memberships.some(
            (other) =>
              other.classId === canonical.id && other.studentId === e.studentId,
          ),
      )
    )
      throw new ConflictException(
        'Enroll each affected learner in the canonical class first; confirm or reopen its current roster as needed',
      );
    await preserveLegacyGradeEvidence(this.db);
    if (retiring.length)
      await this.db
        .update(enrollments)
        .set({ status: 'completed' })
        .where(
          inArray(
            enrollments.id,
            retiring.map((e) => e.id),
          ),
        );
    await this.db
      .update(classes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(classes.id, classId));
    await this.audit.log({
      actorId,
      action: 'academic.duplicate_class.retired',
      targetType: 'class',
      targetId: classId,
      metadata: {
        canonicalClassId: canonical.id,
        reason: dto.reason.trim(),
        completedEnrollmentIds: retiring.map((e) => e.id),
        previousClass: cls,
        gradeEvidenceUnchanged: true,
        sourceSelectionStillRequired: true,
      },
    });
    return {
      classId,
      canonicalClassId: canonical.id,
      gradeEvidenceUnchanged: true,
      sourceSelectionStillRequired: true,
    };
  }

  @AcademicMutation()
  async repairWorkbookPolicy(
    classRecordId: string,
    dto: RepairWorkbookPolicyDto,
    actorId: string,
    roles: string[],
  ) {
    this.assertAdmin(roles, dto.reason);
    const record = await this.db.query.classRecords.findFirst({
      where: eq(classRecords.id, classRecordId),
    });
    if (!record) throw new NotFoundException('Class record not found');
    if (record.status !== 'draft')
      throw new ConflictException(
        'Reopen this record with a reason before repairing its policy configuration',
      );
    const { policy, cls } = await this.policyService.assertAssessmentAction(
      { classId: record.classId, quarter: record.gradingPeriod },
      'prepare',
    );
    const weights = getSubjectWeights(
      policy,
      cls.subjectCode,
      cls.subjectName,
      cls.academicWeightProfile,
    );
    if (!weights)
      throw new BadRequestException(
        'This repair requires a classified modern school-year subject',
      );
    const categories = await this.db.query.classRecordCategories.findMany({
      where: eq(classRecordCategories.classRecordId, classRecordId),
      with: { items: { with: { scores: true } } },
    });
    const expected = {
      'Written Works': weights.writtenWork,
      'Performance Tasks': weights.performanceTask,
      'Quarterly Assessment': weights.examination,
    };
    if (
      categories.length !== 3 ||
      new Set(categories.map((c) => c.name)).size !== 3 ||
      categories.some((c) => !(c.name in expected))
    )
      throw new ConflictException(
        'Unexpected categories require source reconciliation; this repair does not delete or merge grading categories',
      );
    const exam = categories.find((c) => c.name === 'Quarterly Assessment')!;
    const mapping = new Map(
      dto.examinations.map((e) => [e.itemId, e.component]),
    );
    if (
      mapping.size !== dto.examinations.length ||
      new Set(mapping.values()).size !== mapping.size ||
      [...mapping.keys()].some((id) => !exam.items.some((i) => i.id === id))
    )
      throw new BadRequestException(
        'Map distinct examination items to distinct ST1, ST2 and TE components',
      );
    if (
      exam.items.some(
        (i) =>
          (i.assessmentId || i.scores.length || Number(i.maxScore) > 0) &&
          !mapping.has(i.id),
      )
    )
      throw new ConflictException(
        'Explicitly classify every examination item containing assessment or score evidence',
      );
    await preserveLegacyGradeEvidence(this.db, classRecordId);
    for (const category of categories) {
      await this.db
        .update(classRecordCategories)
        .set({
          weightPercentage: String(
            expected[category.name as keyof typeof expected],
          ),
        })
        .where(eq(classRecordCategories.id, category.id));
    }
    for (const item of exam.items) {
      await this.db
        .update(classRecordItems)
        .set({ examComponent: mapping.get(item.id) ?? null })
        .where(eq(classRecordItems.id, item.id));
    }
    let order = Math.max(0, ...exam.items.map((i) => i.itemOrder));
    for (const component of policy.examComponents) {
      if ([...mapping.values()].includes(component.key)) continue;
      await this.db
        .insert(classRecordItems)
        .values({
          classRecordId,
          categoryId: exam.id,
          title: component.key,
          examComponent: component.key,
          maxScore: '0',
          itemOrder: ++order,
        });
    }
    await this.audit.log({
      actorId,
      action: 'academic.workbook.policy_repaired',
      targetType: 'class_record',
      targetId: classRecordId,
      metadata: {
        reason: dto.reason.trim(),
        policyId: policy.id,
        previous: categories,
        examinations: dto.examinations,
        scoreValuesUnchanged: true,
      },
    });
    return { classRecordId, policyId: policy.id, scoreValuesUnchanged: true };
  }

  @AcademicMutation()
  async excludeHistoricalAssessment(
    assessmentId: string,
    reason: string,
    actorId: string,
    roles: string[],
  ) {
    this.assertAdmin(roles, reason);
    const assessment = await this.db.query.assessments.findFirst({
      where: eq(assessments.id, assessmentId),
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    const { cls, policy } = await this.policyService.forClass(
      assessment.classId,
    );
    if (
      !assessment.quarter ||
      policy.periods.some((p) => p.key === assessment.quarter)
    )
      throw new BadRequestException(
        'Only an incompatible historical period can be preserved outside policy',
      );
    let record = await this.db.query.classRecords.findFirst({
      where: and(
        eq(classRecords.classId, cls.id),
        eq(classRecords.gradingPeriod, assessment.quarter),
      ),
    });
    if (!record)
      [record] = await this.db
        .insert(classRecords)
        .values({
          classId: cls.id,
          teacherId: cls.teacherId,
          gradingPeriod: assessment.quarter,
          status: 'locked',
        })
        .returning();
    const preserved = await this.excludeHistoricalPeriod(
      record.id,
      reason,
      actorId,
      roles,
    );
    await this.audit.log({
      actorId,
      action: 'academic.assessment.historical_period_preserved',
      targetType: 'assessment',
      targetId: assessmentId,
      metadata: {
        reason: reason.trim(),
        classRecordId: record.id,
        period: assessment.quarter,
        scope: 'all assessments in this class and historical period',
        attemptsUnchanged: true,
      },
    });
    return preserved;
  }

  @AcademicMutation()
  async repairAssessmentPeriod(
    assessmentId: string,
    dto: RepairAssessmentPeriodDto,
    actorId: string,
    roles: string[],
  ) {
    this.assertAdmin(roles, dto.reason);
    const assessment = await this.db.query.assessments.findFirst({
      where: eq(assessments.id, assessmentId),
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    const { policy } = await this.policyService.forClass(assessment.classId);
    if (policy.periods.some((p) => p.key === assessment.quarter))
      throw new BadRequestException(
        'Use the normal editor for an assessment that already has a valid period',
      );
    const attempt = await this.db.query.assessmentAttempts.findFirst({
      where: eq(assessmentAttempts.assessmentId, assessmentId),
      columns: { id: true },
    });
    if (attempt && assessment.quarter !== null)
      throw new ConflictException(
        'Result-bearing historical periods must be preserved, not reassigned to another term',
      );
    await this.policyService.assertAssessmentAction(
      { classId: assessment.classId, quarter: dto.quarter },
      attempt ? 'grade' : 'prepare',
    );
    const placement = await this.db.query.classRecordItems.findMany({
      where: eq(classRecordItems.assessmentId, assessmentId),
      with: { classRecord: true },
    });
    if (placement.some((p) => p.classRecord.gradingPeriod !== dto.quarter))
      throw new ConflictException(
        'Existing period placement must be preserved; do not move historical evidence into a different term',
      );
    const [updated] = await this.db
      .update(assessments)
      .set({ quarter: dto.quarter, updatedAt: new Date() })
      .where(eq(assessments.id, assessmentId))
      .returning();
    await this.audit.log({
      actorId,
      action: 'academic.assessment.period_repaired',
      targetType: 'assessment',
      targetId: assessmentId,
      metadata: {
        reason: dto.reason.trim(),
        previousQuarter: assessment.quarter,
        quarter: dto.quarter,
        hadAttempts: Boolean(attempt),
        placementIds: placement.map((p) => p.id),
      },
    });
    return updated;
  }

  async repairState(
    dto: RepairAcademicStateDto,
    actorId: string,
    roles: string[],
  ) {
    this.assertAdmin(roles, dto.reason);
    const actor = await this.db.query.users.findFirst({
      where: eq(users.id, actorId),
      columns: { password: true },
    });
    if (!actor || !(await bcrypt.compare(dto.currentPassword, actor.password)))
      throw new ForbiddenException('Step-up authentication failed');
    return this.databaseService.academicTransaction(async () => {
      const states = await this.db.query.academicSystemStates.findMany();
      const expected = [...new Set(dto.expectedStateIds)].sort();
      if (
        JSON.stringify(expected) !==
        JSON.stringify(states.map((s) => s.id).sort())
      )
        throw new ConflictException(
          'Academic state rows changed; refresh the audit before repair',
        );
      const selected = states.find((s) => s.id === dto.selectedStateId);
      if (!selected || selected.version !== dto.expectedVersion)
        throw new ConflictException('Selected academic state changed');
      const policy = await this.policyService.forYear(selected.schoolYear);
      if (!policy.periods.some((p) => p.key === dto.quarter))
        throw new BadRequestException(
          'Choose a period supported by the selected school year',
        );
      const removed = states
        .filter((s) => s.id !== selected.id)
        .map((s) => s.id);
      if (removed.length)
        await this.db
          .delete(academicSystemStates)
          .where(inArray(academicSystemStates.id, removed));
      const [updated] = await this.db
        .update(academicSystemStates)
        .set({
          quarter: dto.quarter,
          version: Math.max(...states.map((s) => s.version)) + 1,
          updatedBy: actorId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(academicSystemStates.id, selected.id),
            eq(academicSystemStates.version, selected.version),
          ),
        )
        .returning();
      await this.audit.log({
        actorId,
        action: 'academic.state.repaired',
        targetType: 'academic_state',
        targetId: selected.id,
        metadata: {
          reason: dto.reason.trim(),
          previousStates: states,
          selectedState: updated,
          academicRecordsUnchanged: true,
        },
      });
      return { ...updated, policy, periods: policy.periods };
    });
  }
}
