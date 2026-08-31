import {
  calculateAnnualGrade,
  calculatePeriodGrade,
  classifyAnnualOutcome,
  getDefaultAcademicPolicy,
  getSubjectWeights,
  normalizeSubjectCode,
} from './academic-policy';

const legacy = () => getDefaultAcademicPolicy('2025-2026');
const modern = () => getDefaultAcademicPolicy('2026-2027');

describe('academic policy', () => {
  it('preserves historic quarters and exposes three modern terms', () => {
    expect(legacy().periods.map((p) => p.key)).toEqual([
      'Q1',
      'Q2',
      'Q3',
      'Q4',
    ]);
    expect(modern().periods).toEqual([
      { key: 'Q1', label: 'Term 1' },
      { key: 'Q2', label: 'Term 2' },
      { key: 'Q3', label: 'Term 3' },
    ]);
    expect(legacy().gradeMethod).toBe('legacy_transmutation');
    expect(modern().gradeMethod).toBe('adjusted_2026');
    expect(getDefaultAcademicPolicy('2027-2028').gradeMethod).toBe(
      'zero_based',
    );
  });
  it.each(['2026', '2026-2028', 'abcd-efgh', '2026-2027extra'])(
    'rejects invalid school year %s',
    (year) => {
      expect(() => getDefaultAcademicPolicy(year)).toThrow('school year');
    },
  );
  it('does not share mutable policy arrays', () => {
    modern().periods.pop();
    expect(modern().periods).toHaveLength(3);
  });
  it.each([
    [0, 60],
    [4.679, 60],
    [4.68, 61],
    [65.339, 73],
    [65.34, 74],
    [69.999, 74],
    [70, 75],
    [71.179, 75],
    [71.18, 76],
    [99.499, 99],
    [99.5, 100],
    [100, 100],
  ])('uses exact adjusted threshold at %s', (raw, expected) => {
    expect(calculatePeriodGrade(raw, modern())).toBe(expected);
  });
  it('uses zero-based grades from 2027 and captured legacy bands', () => {
    expect(calculatePeriodGrade(60, legacy())).toBe(75);
    expect(calculatePeriodGrade(59.99, legacy())).toBe(74);
    expect(
      calculatePeriodGrade(74.5, getDefaultAcademicPolicy('2027-2028')),
    ).toBe(75);
    expect(calculatePeriodGrade(0, getDefaultAcademicPolicy('2027-2028'))).toBe(
      0,
    );
    expect(
      calculatePeriodGrade(70, legacy(), [
        { minInitialGrade: 0, transmutedGrade: 66 },
      ]),
    ).toBe(66);
  });
  it.each([NaN, Infinity, -1, 101])('rejects invalid grade %s', (grade) => {
    expect(() => calculatePeriodGrade(grade, modern())).toThrow('grade');
  });
  it('resolves modern subject weights and flags unknown classification', () => {
    expect(getSubjectWeights(modern(), 'MATH8', 'Mathematics 8')).toEqual({
      writtenWork: 20,
      performanceTask: 50,
      examination: 30,
    });
    expect(
      getSubjectWeights(
        modern(),
        'TLE8',
        'Technology and Livelihood Education',
      ),
    ).toEqual({ writtenWork: 20, performanceTask: 60, examination: 20 });
    expect(getSubjectWeights(modern(), 'MAPEH8', 'MAPEH')).toEqual({
      writtenWork: 20,
      performanceTask: 60,
      examination: 20,
    });
    expect(getSubjectWeights(modern(), 'X99', 'Special Subject')).toBeNull();
    expect(getSubjectWeights(legacy(), 'MATH8', 'Mathematics 8')).toBeNull();
  });
  it('requires each policy period exactly once', () => {
    expect(() =>
      calculateAnnualGrade(legacy(), [{ period: 'Q1', grade: 90 }]),
    ).toThrow('complete');
    expect(() =>
      calculateAnnualGrade(modern(), [
        { period: 'Q1', grade: 90 },
        { period: 'Q1', grade: 90 },
        { period: 'Q3', grade: 90 },
      ]),
    ).toThrow('complete');
    expect(() =>
      calculateAnnualGrade(modern(), [
        { period: 'Q1', grade: 90 },
        { period: 'Q2', grade: 90 },
        { period: 'Q4', grade: 90 },
      ]),
    ).toThrow('complete');
  });
  it('uses complete integer components and official half-up rounding', () => {
    expect(
      calculateAnnualGrade(legacy(), [
        { period: 'Q1', grade: 75 },
        { period: 'Q2', grade: 75 },
        { period: 'Q3', grade: 74 },
        { period: 'Q4', grade: 74 },
      ]),
    ).toEqual({
      sum: 298,
      divisor: 4,
      rawAverage: 74.5,
      officialGrade: 75,
      remarks: 'Passed',
    });
    expect(
      calculateAnnualGrade(modern(), [
        { period: 'Q1', grade: 75 },
        { period: 'Q2', grade: 75 },
        { period: 'Q3', grade: 74 },
      ]),
    ).toEqual({
      sum: 224,
      divisor: 3,
      rawAverage: 74.666667,
      officialGrade: 75,
      remarks: 'Passed',
    });
  });
  it('rejects fractional official period grades', () => {
    expect(() =>
      calculateAnnualGrade(modern(), [
        { period: 'Q1', grade: 74.5 },
        { period: 'Q2', grade: 75 },
        { period: 'Q3', grade: 75 },
      ]),
    ).toThrow('whole');
  });
  it('never promotes an empty subject set', () => {
    expect(classifyAnnualOutcome(modern(), '8', []).outcome).toBe('incomplete');
  });
  it.each(['7', '8', '9'])('promotes all-pass Grade %s', (level) => {
    expect(
      classifyAnnualOutcome(modern(), level, [
        { finalGrade: 75 },
        { finalGrade: 95 },
      ]),
    ).toMatchObject({
      outcome: 'promoted',
      targetGradeLevel: String(Number(level) + 1),
    });
  });
  it('never completes Grade 10 with unresolved deficiencies', () => {
    expect(
      classifyAnnualOutcome(modern(), '10', [{ finalGrade: 75 }]).outcome,
    ).toBe('graduated');
    expect(
      classifyAnnualOutcome(modern(), '10', [{ finalGrade: 70 }]).outcome,
    ).toBe('pending_remediation');
    expect(
      classifyAnnualOutcome(modern(), '10', [
        { finalGrade: 70, remedialClassMark: 70 },
      ]).outcome,
    ).toBe('pending_completion');
  });
  it('requires SRC for one/two failures and retains for three original failures', () => {
    expect(
      classifyAnnualOutcome(modern(), '8', [{ finalGrade: 74 }]).outcome,
    ).toBe('pending_remediation');
    expect(
      classifyAnnualOutcome(modern(), '8', [
        { finalGrade: 74 },
        { finalGrade: 73 },
      ]).outcome,
    ).toBe('pending_remediation');
    expect(
      classifyAnnualOutcome(modern(), '8', [
        { finalGrade: 74 },
        { finalGrade: 73 },
        { finalGrade: 72 },
      ]).outcome,
    ).toBe('retained');
  });
  it('uses SRC evidence without mutating annual grades', () => {
    const subject = { finalGrade: 70, remedialClassMark: 80 };
    expect(classifyAnnualOutcome(modern(), '8', [subject]).outcome).toBe(
      'promoted',
    );
    expect(subject.finalGrade).toBe(70);
    expect(
      classifyAnnualOutcome(legacy(), '8', [
        { finalGrade: 70, remedialClassMark: 70 },
      ]).outcome,
    ).toBe('retained');
    expect(
      classifyAnnualOutcome(modern(), '8', [
        { finalGrade: 70, remedialClassMark: 70 },
      ]),
    ).toMatchObject({
      outcome: 'conditionally_promoted',
      targetGradeLevel: '9',
      deficientSubjectIndexes: [0],
    });
  });
  it('distinguishes zero SRC from missing and rejects unsupported grades', () => {
    expect(
      classifyAnnualOutcome(modern(), '8', [
        { finalGrade: 70, remedialClassMark: 0 },
      ]).outcome,
    ).toBe('conditionally_promoted');
    expect(() =>
      classifyAnnualOutcome(modern(), '12', [{ finalGrade: 90 }]),
    ).toThrow('grade level');
    expect(() =>
      classifyAnnualOutcome(modern(), '8', [
        { finalGrade: 70, remedialClassMark: NaN },
      ]),
    ).toThrow('grade');
  });
});

describe('academic learning-area identity', () => {
  it('uses the same canonical code as class creation, including legacy aliases', () => {
    expect(['math8', 'MATH-8', ' MATH 08 '].map(normalizeSubjectCode)).toEqual([
      'MATH-8',
      'MATH-8',
      'MATH-8',
    ]);
  });
  it('does not allow a classification override to change a prescribed subject', () => {
    expect(
      getSubjectWeights(
        getDefaultAcademicPolicy('2026-2027'),
        'MATH-8',
        'Mathematics',
        'practical',
      )?.performanceTask,
    ).toBe(50);
  });
});
