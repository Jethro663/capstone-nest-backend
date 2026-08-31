import { createHash } from 'node:crypto';
import type * as schema from '../../drizzle/schema';
import {
  AcademicPolicy,
  PeriodKey,
  calculateAnnualGrade,
  classifyAnnualOutcome,
  normalizeSubjectCode,
} from './academic-policy';
import { AnnualSource, selectAnnualSources } from './annual-grade-sources';

type Selected<
  T extends { $inferSelect: unknown },
  K extends keyof T['$inferSelect'],
> = Pick<T['$inferSelect'], K>;
export interface TransitionEvidence {
  policy: AcademicPolicy;
  activePeriod: PeriodKey;
  sections: Selected<
    typeof schema.sections,
    'id' | 'gradeLevel' | 'name' | 'isActive'
  >[];
  classes: Selected<
    typeof schema.classes,
    | 'id'
    | 'sectionId'
    | 'subjectCode'
    | 'subjectGradeLevel'
    | 'subjectName'
    | 'teacherId'
    | 'isActive'
  >[];
  enrollments: Selected<
    typeof schema.enrollments,
    'studentId' | 'sectionId' | 'classId' | 'status'
  >[];
  students: Selected<
    typeof schema.studentProfiles,
    'userId' | 'gradeLevel' | 'graduatedAt'
  >[];
  records: (Selected<
    typeof schema.classRecords,
    | 'id'
    | 'classId'
    | 'gradingPeriod'
    | 'status'
    | 'revision'
    | 'rosterConfirmedAt'
  > & {
    policyExclusionReason?: string | null;
    policyExcludedAt?: Date | null;
  })[];
  participants: Selected<
    typeof schema.classRecordParticipants,
    'classRecordId' | 'studentId' | 'eligibility'
  >[];
  revisions: Selected<
    typeof schema.academicPeriodGradeRevisions,
    | 'id'
    | 'classRecordId'
    | 'classId'
    | 'studentId'
    | 'subjectCode'
    | 'gradeLevel'
    | 'period'
    | 'grade'
    | 'revision'
    | 'trusted'
  >[];
  externals: Selected<
    typeof schema.academicExternalPeriodGrades,
    'id' | 'studentId' | 'subjectCode' | 'gradeLevel' | 'period' | 'grade'
  >[];
  selections: Selected<
    typeof schema.academicAnnualSourceSelections,
    | 'studentId'
    | 'subjectCode'
    | 'gradeLevel'
    | 'period'
    | 'sourceId'
    | 'sourceType'
  >[];
  annuals: Selected<
    typeof schema.subjectAnnualGrades,
    | 'id'
    | 'studentId'
    | 'subjectCode'
    | 'gradeLevel'
    | 'officialGrade'
    | 'components'
    | 'sourceFingerprint'
  >[];
  remediation: Selected<
    typeof schema.academicRemediationResults,
    'id' | 'annualGradeId' | 'remedialClassMark'
  >[];
  backSubjects: Selected<
    typeof schema.academicBackSubjects,
    'id' | 'studentId' | 'annualGradeId' | 'status' | 'sourceSchoolYear'
  >[];
}
export interface TransitionBlocker {
  code: string;
  message: string;
  sectionId?: string;
  classId?: string;
  teacherId?: string | null;
  classRecordId?: string;
  period?: PeriodKey;
  studentId?: string;
  subjectCode?: string;
}
export interface TransitionStudentOutcome {
  studentId: string;
  sourceGradeLevel: string;
  targetGradeLevel: '7' | '8' | '9' | '10' | null;
  outcome: ReturnType<typeof classifyAnnualOutcome>['outcome'];
  annualGradeIds: string[];
  remediationResultIds: string[];
  backSubjectIds: string[];
}
function groupBy<T>(rows: readonly T[], key: (row: T) => string) {
  const result = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    const values = result.get(k) ?? [];
    values.push(row);
    result.set(k, values);
  }
  return result;
}
const identity = (row: {
  studentId: string;
  subjectCode: string;
  gradeLevel: string;
}) =>
  JSON.stringify([
    row.studentId,
    normalizeSubjectCode(row.subjectCode),
    row.gradeLevel,
  ]);

/** Pure, batch-fed matrix. Official grades are validated against persisted sources,
 * never generated from whatever period rows happen to exist. */
export function evaluateTransitionReadiness(input: TransitionEvidence) {
  const { policy } = input;
  const blockers: TransitionBlocker[] = [];
  const studentOutcomes: TransitionStudentOutcome[] = [];
  const activeClasses = input.classes.filter((c) => c.isActive);
  const classById = new Map(input.classes.map((c) => [c.id, c]));
  const sectionById = new Map(input.sections.map((s) => [s.id, s]));
  const recordsByClass = groupBy(input.records, (r) => r.classId);
  const recordById = new Map(input.records.map((r) => [r.id, r]));
  const participantsByRecord = groupBy(
    input.participants,
    (p) => p.classRecordId,
  );
  const revisionsByRecord = groupBy(input.revisions, (r) => r.classRecordId);
  const classesBySection = groupBy(activeClasses, (c) => c.sectionId);
  const profiles = new Map(input.students.map((s) => [s.userId, s]));
  const validRevisions = new Set<string>();
  const invalidRecordIds = new Set<string>();
  let finalizedPeriodRecords = 0;
  if (input.activePeriod !== policy.periods.at(-1)!.key)
    blockers.push({
      code: 'not_final_period',
      message: `Activate ${policy.periods.at(-1)!.label} before year-end transition.`,
    });
  for (const enrollment of input.enrollments.filter(
    (e) => e.status === 'enrolled',
  )) {
    const cls = enrollment.classId
      ? classById.get(enrollment.classId)
      : undefined;
    const sectionId = enrollment.sectionId ?? cls?.sectionId;
    if (
      !sectionId ||
      !sectionById.get(sectionId)?.isActive ||
      (enrollment.classId && !cls?.isActive)
    )
      blockers.push({
        code: 'inactive_enrollment_target',
        studentId: enrollment.studentId,
        sectionId: sectionId ?? undefined,
        classId: enrollment.classId ?? undefined,
        message:
          'Active enrollment points to an inactive or missing class or section. Resolve the membership explicitly.',
      });
  }
  for (const cls of activeClasses) {
    const context = {
      classId: cls.id,
      sectionId: cls.sectionId,
      teacherId: cls.teacherId,
      subjectCode: normalizeSubjectCode(cls.subjectCode),
    };
    if (!sectionById.get(cls.sectionId)?.isActive)
      blockers.push({
        ...context,
        code: 'inactive_class_section',
        message:
          'Active class must belong to an active section in the same school year.',
      });
    const sectionGrade = sectionById.get(cls.sectionId)?.gradeLevel;
    if (
      cls.subjectGradeLevel &&
      sectionGrade &&
      cls.subjectGradeLevel !== sectionGrade
    )
      blockers.push({
        ...context,
        code: 'class_grade_mismatch',
        message: 'Subject grade level must match its section.',
      });
    if (
      activeClasses.some(
        (other) =>
          other.id !== cls.id &&
          other.sectionId === cls.sectionId &&
          normalizeSubjectCode(other.subjectCode) === context.subjectCode,
      )
    )
      blockers.push({
        ...context,
        code: 'duplicate_learning_area',
        message:
          'Resolve duplicate learning-area classes in this section before transition.',
      });
    for (const period of policy.periods) {
      const matches = (recordsByClass.get(cls.id) ?? []).filter(
        (r) => r.gradingPeriod === period.key,
      );
      if (matches.length !== 1) {
        blockers.push({
          ...context,
          period: period.key,
          code: matches.length
            ? 'duplicate_period_record'
            : 'missing_period_record',
          message: `${cls.subjectName}: ${period.label} requires one class record.`,
        });
        continue;
      }
      const record = matches[0];
      const ctx = { ...context, period: period.key, classRecordId: record.id };
      const recordBlockers: TransitionBlocker[] = [];
      if (record.policyExcludedAt || record.policyExclusionReason)
        recordBlockers.push({
          ...ctx,
          code: 'required_period_excluded',
          message:
            'A required policy period cannot be excluded; restore its valid eligibility and grade evidence.',
        });
      if (!['finalized', 'locked'].includes(record.status))
        recordBlockers.push({
          ...ctx,
          code: 'period_not_finalized',
          message: `${period.label}: resolve workbook readiness and finalize.`,
        });
      if (!record.rosterConfirmedAt)
        recordBlockers.push({
          ...ctx,
          code: 'roster_unconfirmed',
          message: `${period.label}: confirm historical eligibility before using official grades.`,
        });
      const snapshots = revisionsByRecord.get(record.id) ?? [];
      const participants = participantsByRecord.get(record.id) ?? [];
      for (const participant of participants.filter(
        (p) => p.eligibility === 'eligible',
      )) {
        const snapshot = snapshots.find(
          (s) =>
            s.studentId === participant.studentId &&
            s.revision === record.revision &&
            s.trusted,
        );
        if (!snapshot)
          recordBlockers.push({
            ...ctx,
            studentId: participant.studentId,
            code: 'missing_period_snapshot',
            message: `${period.label}: eligible learner needs a trusted current period revision.`,
          });
      }
      if (
        snapshots.some(
          (s) =>
            s.revision !== record.revision ||
            !s.trusted ||
            !participants.some(
              (p) =>
                p.studentId === s.studentId && p.eligibility === 'eligible',
            ),
        )
      )
        recordBlockers.push({
          ...ctx,
          code: 'inconsistent_period_snapshot',
          message: `${period.label}: grade revisions and confirmed roster disagree; repair is required.`,
        });
      if (recordBlockers.length) invalidRecordIds.add(record.id);
      else finalizedPeriodRecords++;
      blockers.push(...recordBlockers);
    }
    for (const record of recordsByClass.get(cls.id) ?? [])
      if (
        !policy.periods.some((p) => p.key === record.gradingPeriod) &&
        !(record.policyExcludedAt && record.policyExclusionReason)
      )
        blockers.push({
          ...context,
          classRecordId: record.id,
          period: record.gradingPeriod,
          code: 'incompatible_period_record',
          message:
            'This record uses a period outside the school-year policy; explicit repair is required.',
        });
  }
  // Historical transfer records may come from an archived class. They still need
  // an intact finalized roster and matching current revision to be a source.
  for (const revision of input.revisions) {
    const record = recordById.get(revision.classRecordId);
    const cls = classById.get(revision.classId);
    if (
      record &&
      cls &&
      record.classId === cls.id &&
      !invalidRecordIds.has(record.id) &&
      ['finalized', 'locked'].includes(record.status) &&
      record.rosterConfirmedAt &&
      revision.trusted &&
      revision.revision === record.revision &&
      revision.period === record.gradingPeriod &&
      normalizeSubjectCode(revision.subjectCode) ===
        normalizeSubjectCode(cls.subjectCode) &&
      revision.gradeLevel ===
        (cls.subjectGradeLevel ?? sectionById.get(cls.sectionId)?.gradeLevel) &&
      (participantsByRecord.get(record.id) ?? []).some(
        (p) =>
          p.studentId === revision.studentId && p.eligibility === 'eligible',
      )
    )
      validRevisions.add(revision.id);
  }
  const sources = groupBy<
    AnnualSource & {
      studentId: string;
      subjectCode: string;
      gradeLevel: string;
    }
  >(
    [
      ...input.revisions.map((r) => ({
        ...r,
        sourceType: 'period_revision' as const,
        trusted: validRevisions.has(r.id),
      })),
      ...input.externals.map((r) => ({
        ...r,
        sourceType: 'external' as const,
        classId: null,
        trusted: true,
      })),
    ],
    identity,
  );
  const selections = groupBy(input.selections, (row) => identity(row));
  const annuals = groupBy(input.annuals, (row) => identity(row));
  const remediation = new Map(
    input.remediation.map((r) => [r.annualGradeId, r]),
  );
  const obligations = groupBy(
    input.backSubjects.filter((b) => b.status !== 'invalidated'),
    (b) => b.studentId,
  );
  const activeEnrollments = input.enrollments.filter(
    (e) =>
      e.status === 'enrolled' &&
      (sectionById.has(e.sectionId ?? '') || classById.has(e.classId ?? '')),
  );
  const enrollmentByStudent = groupBy(activeEnrollments, (e) => e.studentId);
  const missingStudents = new Set<string>();
  let expectedAnnualGrades = 0;
  for (const [studentId, memberships] of enrollmentByStudent) {
    const before = blockers.length;
    const studentSections = new Set(
      memberships
        .map((e) => e.sectionId ?? classById.get(e.classId ?? '')?.sectionId)
        .filter((id): id is string => Boolean(id)),
    );
    const section = sectionById.get([...studentSections][0]);
    const gradeLevel = section?.gradeLevel;
    const profile = profiles.get(studentId);
    if (
      studentSections.size !== 1 ||
      !gradeLevel ||
      !['7', '8', '9', '10'].includes(gradeLevel) ||
      !profile ||
      profile.gradeLevel !== gradeLevel ||
      profile.graduatedAt
    ) {
      blockers.push({
        studentId,
        code: 'ambiguous_student_membership',
        message:
          'Resolve active section, grade level, and student profile before determining an outcome.',
      });
      missingStudents.add(studentId);
      continue;
    }
    const expected = new Map<string, TransitionEvidence['classes'][number]>();
    for (const sectionId of studentSections)
      for (const cls of classesBySection.get(sectionId) ?? []) {
        const key = normalizeSubjectCode(cls.subjectCode);
        if (expected.has(key))
          blockers.push({
            studentId,
            sectionId,
            classId: cls.id,
            teacherId: cls.teacherId,
            subjectCode: key,
            code: 'duplicate_subject_class',
            message:
              'Multiple current classes have the same learning-area identity; resolve the curriculum assignment.',
          });
        expected.set(key, cls);
      }
    for (const membership of memberships) {
      const cls = classById.get(membership.classId ?? '');
      if (cls) expected.set(normalizeSubjectCode(cls.subjectCode), cls);
    }
    if (!expected.size)
      blockers.push({
        studentId,
        sectionId: section?.id,
        code: 'missing_subject_classes',
        message:
          'Active learner has no subject classes defining the annual curriculum.',
      });
    expectedAnnualGrades += expected.size;
    const annualGradeIds: string[] = [];
    const remediationResultIds: string[] = [];
    const subjectResults: Array<{
      finalGrade: number;
      remedialClassMark?: number;
    }> = [];
    for (const [subjectCode, cls] of expected) {
      const ctx = {
        studentId,
        subjectCode,
        classId: cls.id,
        teacherId: cls.teacherId,
        sectionId: cls.sectionId,
      };
      if (
        (cls.subjectGradeLevel ??
          sectionById.get(cls.sectionId)?.gradeLevel) !== gradeLevel
      ) {
        blockers.push({
          ...ctx,
          code: 'subject_grade_level_mismatch',
          message: 'Class and learner grade levels disagree.',
        });
        continue;
      }
      const key = identity({ studentId, subjectCode, gradeLevel });
      const selected = selectAnnualSources(
        policy,
        sources.get(key) ?? [],
        selections.get(key) ?? [],
      );
      blockers.push(
        ...selected.blockers.map((b) => ({
          ...ctx,
          code: b.code,
          message: b.message,
          period: b.period,
        })),
      );
      const snapshots = annuals.get(key) ?? [];
      if (selected.blockers.length) continue;
      const fingerprint = createHash('sha256')
        .update(JSON.stringify({ policy, components: selected.components }))
        .digest('hex');
      const annual = snapshots.length === 1 ? snapshots[0] : undefined;
      const componentsMatch =
        annual?.components.length === selected.components.length &&
        annual.components.every((c, i) => {
          const expected = selected.components[i];
          return (
            c.period === expected.period &&
            c.grade === expected.grade &&
            c.sourceId === expected.sourceId &&
            c.sourceType === expected.sourceType &&
            c.classId === expected.classId
          );
        });
      if (
        !annual ||
        annual.sourceFingerprint !== fingerprint ||
        !componentsMatch ||
        annual.officialGrade !==
          calculateAnnualGrade(policy, selected.components).officialGrade
      ) {
        blockers.push({
          ...ctx,
          code: 'missing_current_annual',
          message:
            'Generate the complete annual snapshot from the current verified sources.',
        });
        continue;
      }
      annualGradeIds.push(annual.id);
      const src = remediation.get(annual.id);
      if (src) remediationResultIds.push(src.id);
      const cleared = (obligations.get(studentId) ?? []).some(
        (b) => b.annualGradeId === annual.id && b.status === 'cleared',
      );
      subjectResults.push({
        finalGrade: cleared ? policy.passingGrade : annual.officialGrade,
        remedialClassMark: src?.remedialClassMark,
      });
    }
    if (blockers.length !== before) {
      missingStudents.add(studentId);
      continue;
    }
    const result = classifyAnnualOutcome(policy, gradeLevel, subjectResults);
    const backSubjects = (obligations.get(studentId) ?? []).filter(
      (b) => b.status !== 'cleared',
    );
    if (
      result.outcome === 'pending_remediation' ||
      result.outcome === 'incomplete'
    ) {
      blockers.push({
        studentId,
        sectionId: section?.id,
        code: result.outcome,
        message:
          'Record evidenced SRC results for each of the one or two failed learning areas.',
      });
      missingStudents.add(studentId);
      continue;
    }
    if (
      result.outcome === 'conditionally_promoted' ||
      result.outcome === 'pending_completion'
    ) {
      for (const index of result.deficientSubjectIndexes)
        if (
          !backSubjects.some((b) => b.annualGradeId === annualGradeIds[index])
        )
          blockers.push({
            studentId,
            code: 'missing_back_subject_obligation',
            message:
              'Persistent failure requires a durable back-subject obligation linked to its SRC result.',
          });
    }
    if (blockers.length !== before) {
      missingStudents.add(studentId);
      continue;
    }
    if (backSubjects.length && result.outcome === 'graduated')
      result.outcome = 'pending_completion';
    if (backSubjects.length && result.outcome === 'promoted')
      result.outcome = 'conditionally_promoted';
    studentOutcomes.push({
      studentId,
      sourceGradeLevel: gradeLevel,
      targetGradeLevel: result.targetGradeLevel,
      outcome: result.outcome,
      annualGradeIds,
      remediationResultIds,
      backSubjectIds: backSubjects.map((b) => b.id),
    });
  }
  return {
    policy,
    classReadiness: activeClasses.map((cls) => ({
      classId: cls.id,
      sectionId: cls.sectionId,
      teacherId: cls.teacherId,
      subjectCode: normalizeSubjectCode(cls.subjectCode),
      subjectName: cls.subjectName,
      expectedPeriodRecords: policy.periods.length,
      finalizedPeriodRecords: (recordsByClass.get(cls.id) ?? []).filter(
        (r) =>
          policy.periods.some((p) => p.key === r.gradingPeriod) &&
          !invalidRecordIds.has(r.id) &&
          ['finalized', 'locked'].includes(r.status) &&
          r.rosterConfirmedAt,
      ).length,
    })),
    expectedPeriodRecords: activeClasses.length * policy.periods.length,
    finalizedPeriodRecords,
    expectedAnnualGrades,
    activeStudentsInCurrentYear: enrollmentByStudent.size,
    studentsMissingFinalizedGrades: missingStudents.size,
    studentsToPromote: studentOutcomes.filter((s) => s.outcome === 'promoted')
      .length,
    studentsToRetain: studentOutcomes.filter((s) => s.outcome === 'retained')
      .length,
    studentsToGraduate: studentOutcomes.filter((s) => s.outcome === 'graduated')
      .length,
    studentsToConditionallyPromote: studentOutcomes.filter(
      (s) => s.outcome === 'conditionally_promoted',
    ).length,
    studentsPendingCompletion: studentOutcomes.filter(
      (s) => s.outcome === 'pending_completion',
    ).length,
    transitionBlocked: blockers.length > 0,
    message: blockers.length
      ? `${blockers.length} academic readiness issue(s) require resolution before transition.`
      : 'All expected period records, annual grades, and student outcomes are ready.',
    blockers,
    studentOutcomes,
  };
}
