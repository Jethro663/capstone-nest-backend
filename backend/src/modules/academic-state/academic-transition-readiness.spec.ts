import { createHash } from 'node:crypto';
import { getDefaultAcademicPolicy } from './academic-policy';
import {
  evaluateTransitionReadiness,
  TransitionEvidence,
} from './academic-transition-readiness';

function completeEvidence(): TransitionEvidence {
  const policy = getDefaultAcademicPolicy('2026-2027');
  const components = policy.periods.map(({ key }) => ({
    period: key,
    grade: 80,
    sourceType: 'period_revision' as const,
    sourceId: `grade-${key}`,
    classId: 'class',
  }));
  return {
    policy,
    activePeriod: 'Q4',
    sections: [{ id: 'section', gradeLevel: '7', name: 'A', isActive: true }],
    classes: [
      {
        id: 'class',
        sectionId: 'section',
        subjectCode: 'MATH',
        subjectGradeLevel: '7',
        subjectName: 'Math',
        teacherId: 'teacher',
        isActive: true,
      },
    ],
    enrollments: [
      {
        studentId: 'student',
        sectionId: 'section',
        classId: 'class',
        status: 'enrolled',
      },
    ],
    students: [{ userId: 'student', gradeLevel: '7', graduatedAt: null }],
    records: policy.periods.map(({ key }) => ({
      id: `record-${key}`,
      classId: 'class',
      gradingPeriod: key,
      status: 'finalized',
      revision: 1,
      rosterConfirmedAt: new Date(),
    })),
    participants: policy.periods.map(({ key }) => ({
      classRecordId: `record-${key}`,
      studentId: 'student',
      eligibility: 'eligible',
    })),
    revisions: components.map((c) => ({
      id: c.sourceId,
      classRecordId: `record-${c.period}`,
      classId: 'class',
      studentId: 'student',
      subjectCode: 'MATH',
      gradeLevel: '7',
      period: c.period,
      grade: 80,
      revision: 1,
      trusted: true,
    })),
    externals: [],
    selections: [],
    remediation: [],
    backSubjects: [],
    annuals: [
      {
        id: 'annual',
        studentId: 'student',
        subjectCode: 'MATH',
        gradeLevel: '7',
        officialGrade: 80,
        components,
        sourceFingerprint: createHash('sha256')
          .update(JSON.stringify({ policy, components }))
          .digest('hex'),
      },
    ],
  };
}

function addFinalizedSubjectWithoutAnnual(
  input: TransitionEvidence,
  subject: { id: string; code: string; name: string },
) {
  const components = input.policy.periods.map(({ key }) => ({
    period: key,
    grade: 80,
    sourceType: 'period_revision' as const,
    sourceId: `${subject.id}-grade-${key}`,
    classId: subject.id,
  }));
  input.classes.push({
    id: subject.id,
    sectionId: 'section',
    subjectCode: subject.code,
    subjectGradeLevel: '7',
    subjectName: subject.name,
    teacherId: 'teacher',
    isActive: true,
  });
  input.records.push(
    ...input.policy.periods.map(({ key }) => ({
      id: `${subject.id}-record-${key}`,
      classId: subject.id,
      gradingPeriod: key,
      status: 'finalized',
      revision: 1,
      rosterConfirmedAt: new Date(),
    })),
  );
  input.participants.push(
    ...input.policy.periods.map(({ key }) => ({
      classRecordId: `${subject.id}-record-${key}`,
      studentId: 'student',
      eligibility: 'eligible',
    })),
  );
  input.revisions.push(
    ...components.map((component) => ({
      id: component.sourceId,
      classRecordId: `${subject.id}-record-${component.period}`,
      classId: subject.id,
      studentId: 'student',
      subjectCode: subject.code,
      gradeLevel: '7',
      period: component.period,
      grade: component.grade,
      revision: 1,
      trusted: true,
    })),
  );
}

function setOnlyAnnualGrade(input: TransitionEvidence, grade: number) {
  const components = input.annuals[0].components.map((component) => ({
    ...component,
    grade,
  }));
  input.revisions.forEach((revision) => (revision.grade = grade));
  input.annuals[0] = {
    ...input.annuals[0],
    officialGrade: grade,
    components,
    sourceFingerprint: createHash('sha256')
      .update(JSON.stringify({ policy: input.policy, components }))
      .digest('hex'),
  };
}

describe('expected academic transition matrix', () => {
  it('uses every policy period and a current annual snapshot', () => {
    const result = evaluateTransitionReadiness(completeEvidence());
    expect(result.transitionBlocked).toBe(false);
    expect(result.expectedPeriodRecords).toBe(4);
    expect(result.studentOutcomes[0]).toMatchObject({
      outcome: 'promoted',
      targetGradeLevel: '8',
      annualGradeIds: ['annual'],
    });
  });
  it('finds absent periods even when every existing record is finalized', () => {
    const input = completeEvidence();
    input.records.pop();
    expect(evaluateTransitionReadiness(input).blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing_period_record',
          period: 'Q4',
          teacherId: 'teacher',
        }),
      ]),
    );
  });
  it('compares JSONB component values independently of object key order', () => {
    const input = completeEvidence();
    input.annuals[0].components = input.annuals[0].components.map((c) => ({
      grade: c.grade,
      period: c.period,
      classId: c.classId,
      sourceId: c.sourceId,
      sourceType: c.sourceType,
    }));
    expect(evaluateTransitionReadiness(input).transitionBlocked).toBe(false);
  });
  it('does not accept a stale annual after a period is reopened', () => {
    const input = completeEvidence();
    input.records[0].status = 'draft';
    expect(evaluateTransitionReadiness(input).transitionBlocked).toBe(true);
    expect(evaluateTransitionReadiness(input).studentOutcomes).toHaveLength(0);
  });
  it('blocks unknown eligibility and a finalized record without its eligible student snapshot', () => {
    const input = completeEvidence();
    input.records[0].rosterConfirmedAt = null;
    input.revisions.pop();
    expect(
      evaluateTransitionReadiness(input).blockers.map((b) => b.code),
    ).toEqual(
      expect.arrayContaining(['roster_unconfirmed', 'missing_period_snapshot']),
    );
  });
  it('accepts documented empty rosters but never silently omits active students', () => {
    const input = completeEvidence();
    input.participants = [];
    input.revisions = [];
    input.annuals = [];
    expect(evaluateTransitionReadiness(input).transitionBlocked).toBe(true);
    input.enrollments = [];
    expect(evaluateTransitionReadiness(input).transitionBlocked).toBe(false);
  });
  it('blocks an active learner with zero current annual subject results', () => {
    const input = completeEvidence();
    input.annuals = [];

    const result = evaluateTransitionReadiness(input);

    expect(result.transitionBlocked).toBe(true);
    expect(result.studentOutcomes).toHaveLength(0);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing_current_annual',
          studentId: 'student',
          subjectCode: 'MATH',
        }),
      ]),
    );
  });
  it('blocks a section student with no expected learning areas', () => {
    const input = completeEvidence();
    input.classes = [];
    input.enrollments[0].classId = null;
    expect(
      evaluateTransitionReadiness(input).blockers.map((b) => b.code),
    ).toContain('missing_subject_classes');
  });
  it('requires the last period even when grades already exist', () => {
    const input = completeEvidence();
    input.activePeriod = 'Q2';
    expect(
      evaluateTransitionReadiness(input).blockers.map((b) => b.code),
    ).toContain('not_final_period');
  });
  it('accepts one current annual result after every required period record is finalized', () => {
    const input = completeEvidence();
    addFinalizedSubjectWithoutAnnual(input, {
      id: 'science',
      code: 'SCIENCE',
      name: 'Science',
    });

    const result = evaluateTransitionReadiness(input);

    expect(result.transitionBlocked).toBe(false);
    expect(result.expectedAnnualGrades).toBe(2);
    expect(result.studentOutcomes[0]).toMatchObject({
      outcome: 'promoted',
      annualGradeIds: ['annual'],
    });
    expect(result.message).toBe(
      'Good to go. Required period records are finalized and every active learner has at least one current annual subject result.',
    );
  });
  it('still blocks a missing required period record when another annual result is valid', () => {
    const input = completeEvidence();
    input.classes.push({
      ...input.classes[0],
      id: 'science',
      subjectCode: 'SCIENCE',
    });
    expect(evaluateTransitionReadiness(input).blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing_period_record',
          classId: 'science',
        }),
      ]),
    );
  });
  it('retains a learner with a finalized failing annual result and no SRC', () => {
    const input = completeEvidence();
    setOnlyAnnualGrade(input, 70);

    const result = evaluateTransitionReadiness(input);

    expect(result.transitionBlocked).toBe(false);
    expect(result.studentsToRetain).toBe(1);
    expect(result.studentOutcomes[0]).toMatchObject({
      outcome: 'retained',
      targetGradeLevel: '7',
      annualGradeIds: ['annual'],
      remediationResultIds: [],
    });
  });
  it('blocks conflicting same-period transfer evidence instead of trusting an old annual', () => {
    const input = completeEvidence();
    input.externals.push({
      id: 'external',
      studentId: 'student',
      subjectCode: 'MATH',
      gradeLevel: '7',
      period: 'Q1',
      grade: 90,
    });
    expect(
      evaluateTransitionReadiness(input).blockers.map((b) => b.code),
    ).toContain('conflicting_period_sources');
  });
  it('retains a pending completion for Grade 10 with an uncleared prior back subject', () => {
    const input = completeEvidence();
    input.sections[0].gradeLevel = '10';
    input.classes[0].subjectGradeLevel = '10';
    input.students[0].gradeLevel = '10';
    input.revisions.forEach((r) => (r.gradeLevel = '10'));
    input.annuals[0].gradeLevel = '10';
    input.backSubjects.push({
      id: 'old-obligation',
      studentId: 'student',
      annualGradeId: 'old-annual',
      status: 'pending',
      sourceSchoolYear: '2025-2026',
    });
    const result = evaluateTransitionReadiness(input);
    expect(result.transitionBlocked).toBe(false);
    expect(result.studentOutcomes[0]).toMatchObject({
      outcome: 'pending_completion',
      backSubjectIds: ['old-obligation'],
    });
    expect(result.studentsToGraduate).toBe(0);
  });
});
