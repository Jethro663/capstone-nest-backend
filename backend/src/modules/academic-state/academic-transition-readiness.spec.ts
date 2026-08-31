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
    activePeriod: 'Q3',
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

describe('expected academic transition matrix', () => {
  it('uses every policy period and a current annual snapshot', () => {
    const result = evaluateTransitionReadiness(completeEvidence());
    expect(result.transitionBlocked).toBe(false);
    expect(result.expectedPeriodRecords).toBe(3);
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
          period: 'Q3',
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
  it('does not use a single high annual grade to hide another missing subject', () => {
    const input = completeEvidence();
    input.classes.push({
      ...input.classes[0],
      id: 'science',
      subjectCode: 'SCIENCE',
    });
    expect(evaluateTransitionReadiness(input).blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing_period_grade',
          studentId: 'student',
          subjectCode: 'SCIENCE',
        }),
      ]),
    );
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
