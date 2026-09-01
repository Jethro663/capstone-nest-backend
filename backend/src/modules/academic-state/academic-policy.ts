/** Grade 7–10 policy snapshots. Sources and decisions: docs/academic-quarter-lifecycle-and-annual-grading-analysis.md. */
export type PeriodKey = 'Q1' | 'Q2' | 'Q3' | 'Q4';
export type GradeMethod =
  | 'legacy_transmutation'
  | 'adjusted_2026'
  | 'zero_based';
export interface GradeBand {
  minInitialGrade: number;
  transmutedGrade: number;
}
export interface AcademicPolicy {
  id: 'deped-2015-v1' | 'deped-2026-q4-v2' | 'deped-2027-q4-v2';
  schoolYear: string;
  periods: Array<{ key: PeriodKey; label: string }>;
  gradeMethod: GradeMethod;
  conditionalPromotion: boolean;
  passingGrade: number;
  annualRounding: 'half_up';
  examComponents: Array<{ key: 'ST1' | 'ST2' | 'TE'; weight: number }>;
  transmutationBands: GradeBand[];
}
export interface SubjectWeights {
  writtenWork: number;
  performanceTask: number;
  examination: number;
}

// Lower bounds transcribed from DO 015 s. 2026 Annex D, Table 4 (PDF page 40).
export const ADJUSTED_2026_BANDS: readonly GradeBand[] = [
  [99.5, 100],
  [98.32, 99],
  [97.14, 98],
  [95.96, 97],
  [94.78, 96],
  [93.6, 95],
  [92.42, 94],
  [91.24, 93],
  [90.06, 92],
  [88.88, 91],
  [87.7, 90],
  [86.52, 89],
  [85.34, 88],
  [84.16, 87],
  [82.98, 86],
  [81.8, 85],
  [80.62, 84],
  [79.44, 83],
  [78.26, 82],
  [77.08, 81],
  [75.9, 80],
  [74.72, 79],
  [73.54, 78],
  [72.36, 77],
  [71.18, 76],
  [70, 75],
  [65.34, 74],
  [60.67, 73],
  [56.01, 72],
  [51.34, 71],
  [46.67, 70],
  [42.01, 69],
  [37.34, 68],
  [32.68, 67],
  [28.01, 66],
  [23.35, 65],
  [18.68, 64],
  [14.01, 63],
  [9.35, 62],
  [4.68, 61],
  [0, 60],
].map(([minInitialGrade, transmutedGrade]) => ({
  minInitialGrade,
  transmutedGrade,
}));

export const LEGACY_BANDS: readonly GradeBand[] = Array.from(
  { length: 41 },
  (_, index) => {
    const grade = 100 - index;
    const minimum = grade >= 75 ? 60 + (grade - 75) * 1.6 : (grade - 60) * 4;
    return {
      minInitialGrade: Math.round(minimum * 100) / 100,
      transmutedGrade: grade,
    };
  },
);

export function getDefaultAcademicPolicy(schoolYear: string): AcademicPolicy {
  const match = /^(\d{4})-(\d{4})$/.exec(schoolYear);
  if (!match || Number(match[2]) !== Number(match[1]) + 1) {
    throw new Error('Invalid school year; use consecutive YYYY-YYYY');
  }
  const start = Number(match[1]);
  const modern = start >= 2026;
  const gradeMethod: GradeMethod =
    start < 2026
      ? 'legacy_transmutation'
      : start === 2026
        ? 'adjusted_2026'
        : 'zero_based';
  const keys: PeriodKey[] = ['Q1', 'Q2', 'Q3', 'Q4'];
  return {
    id:
      start < 2026
        ? 'deped-2015-v1'
        : start === 2026
          ? 'deped-2026-q4-v2'
          : 'deped-2027-q4-v2',
    schoolYear,
    periods: keys.map((key, i) => ({
      key,
      label: `Quarter ${i + 1}`,
    })),
    gradeMethod,
    conditionalPromotion: modern,
    passingGrade: 75,
    annualRounding: 'half_up',
    examComponents: modern
      ? [
          { key: 'ST1', weight: 30 },
          { key: 'ST2', weight: 30 },
          { key: 'TE', weight: 40 },
        ]
      : [],
    transmutationBands: (gradeMethod === 'legacy_transmutation'
      ? LEGACY_BANDS
      : gradeMethod === 'adjusted_2026'
        ? ADJUSTED_2026_BANDS
        : []
    ).map((band) => ({ ...band })),
  };
}

export { normalizeSubjectCode } from '../../common/utils/subject-code.util';

/** Null deliberately means classification needs review (or historical class weights apply). */
export function getSubjectWeights(
  policy: AcademicPolicy,
  subjectCode: string,
  subjectName: string,
  classification?: 'academic' | 'practical' | null,
): SubjectWeights | null {
  if (policy.gradeMethod === 'legacy_transmutation') return null;
  const text = `${subjectCode} ${subjectName}`.toUpperCase();
  if (
    /\b(TLE|EPP|MAPEH)\d*\b|TECHNOLOGY AND LIVELIHOOD|EDUKASYONG PANTAHANAN|MUSIC.*ARTS.*PHYSICAL/.test(
      text,
    )
  ) {
    return { writtenWork: 20, performanceTask: 60, examination: 20 };
  }
  if (
    /\b(MATH|MATHEMATICS|SCI|SCIENCE|ENG|ENGLISH|FIL|FILIPINO|AP|GMRC|VE|ESP)\d*\b|ARALING PANLIPUNAN|VALUES EDUCATION|EDUKASYON SA PAGPAPAKATAO/.test(
      text,
    )
  ) {
    return { writtenWork: 20, performanceTask: 50, examination: 30 };
  }
  if (classification === 'practical')
    return { writtenWork: 20, performanceTask: 60, examination: 20 };
  if (classification === 'academic')
    return { writtenWork: 20, performanceTask: 50, examination: 30 };
  return null;
}

function assertGrade(grade: number): void {
  if (!Number.isFinite(grade) || grade < 0 || grade > 100)
    throw new Error('Invalid grade; expected 0 to 100');
}
export function roundOfficialGrade(grade: number): number {
  assertGrade(grade);
  return Math.floor(grade + 0.5);
}
export function calculatePeriodGrade(
  initialGrade: number,
  policy: AcademicPolicy,
  legacyBands?: readonly GradeBand[],
): number {
  assertGrade(initialGrade);
  if (policy.gradeMethod === 'zero_based')
    return roundOfficialGrade(initialGrade);
  const bands =
    policy.gradeMethod === 'legacy_transmutation' && legacyBands?.length
      ? legacyBands
      : policy.transmutationBands;
  const band = [...bands]
    .sort((a, b) => b.minInitialGrade - a.minInitialGrade)
    .find((entry) => initialGrade >= entry.minInitialGrade);
  if (!band) throw new Error('No policy grade band covers the initial grade');
  return band.transmutedGrade;
}

export interface PeriodContribution {
  period: PeriodKey;
  grade: number;
}
export function calculateAnnualGrade(
  policy: AcademicPolicy,
  components: readonly PeriodContribution[],
) {
  const expected = policy.periods.map((p) => p.key);
  const actual = new Set(components.map((c) => c.period));
  if (
    components.length !== expected.length ||
    actual.size !== expected.length ||
    expected.some((p) => !actual.has(p))
  ) {
    throw new Error(
      'A complete, unique set of policy period grades is required',
    );
  }
  for (const component of components) {
    assertGrade(component.grade);
    if (!Number.isInteger(component.grade))
      throw new Error('Official period grades must be whole numbers');
  }
  const sum = components.reduce(
    (total, component) => total + component.grade,
    0,
  );
  const divisor = expected.length;
  const officialGrade = roundOfficialGrade(sum / divisor);
  return {
    sum,
    divisor,
    rawAverage: Number((sum / divisor).toFixed(6)),
    officialGrade,
    remarks:
      officialGrade >= policy.passingGrade
        ? ('Passed' as const)
        : ('Failed' as const),
  };
}

export type AcademicOutcome =
  | 'incomplete'
  | 'pending_remediation'
  | 'promoted'
  | 'retained'
  | 'graduated'
  | 'conditionally_promoted'
  | 'pending_completion';
export interface AnnualSubjectResult {
  finalGrade: number;
  remedialClassMark?: number | null;
}
export function classifyAnnualOutcome(
  policy: AcademicPolicy,
  gradeLevel: string,
  subjects: readonly AnnualSubjectResult[],
): {
  outcome: AcademicOutcome;
  targetGradeLevel: '7' | '8' | '9' | '10' | null;
  deficientSubjectIndexes: number[];
} {
  if (!['7', '8', '9', '10'].includes(gradeLevel))
    throw new Error('Unsupported grade level');
  subjects.forEach((subject) => {
    assertGrade(subject.finalGrade);
    if (subject.remedialClassMark != null)
      assertGrade(subject.remedialClassMark);
  });
  const sameGrade = gradeLevel as '7' | '8' | '9' | '10';
  const failed = subjects
    .map((s, i) => (s.finalGrade < policy.passingGrade ? i : -1))
    .filter((i) => i >= 0);
  if (!subjects.length)
    return {
      outcome: 'incomplete',
      targetGradeLevel: sameGrade,
      deficientSubjectIndexes: [],
    };
  if (failed.length > 2)
    return {
      outcome: 'retained',
      targetGradeLevel: sameGrade,
      deficientSubjectIndexes: failed,
    };
  if (failed.some((i) => subjects[i].remedialClassMark == null))
    return {
      outcome: 'pending_remediation',
      targetGradeLevel: sameGrade,
      deficientSubjectIndexes: failed,
    };
  const deficient = failed.filter(
    (i) =>
      roundOfficialGrade(
        (subjects[i].finalGrade + subjects[i].remedialClassMark!) / 2,
      ) < policy.passingGrade,
  );
  if (deficient.length && !policy.conditionalPromotion)
    return {
      outcome: 'retained',
      targetGradeLevel: sameGrade,
      deficientSubjectIndexes: deficient,
    };
  if (gradeLevel === '10')
    return {
      outcome: deficient.length ? 'pending_completion' : 'graduated',
      targetGradeLevel: null,
      deficientSubjectIndexes: deficient,
    };
  return {
    outcome: deficient.length ? 'conditionally_promoted' : 'promoted',
    targetGradeLevel: String(Number(gradeLevel) + 1) as '8' | '9' | '10',
    deficientSubjectIndexes: deficient,
  };
}
