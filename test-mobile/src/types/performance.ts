export interface StudentOwnClassPerformance {
  classId: string;
  class: {
    id: string;
    subjectName: string;
    subjectCode: string;
    section?: {
      id: string;
      name: string;
      gradeLevel: string;
    } | null;
  } | null;
  assessmentAverage: number | null;
  classRecordAverage: number | null;
  blendedScore: number | null;
  assessmentSampleSize: number;
  classRecordSampleSize: number;
  hasData: boolean;
  isAtRisk: boolean;
  thresholdApplied: number;
  lastComputedAt: string | Date;
}

export interface StudentOwnPerformanceSummary {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  threshold: number;
  classes: StudentOwnClassPerformance[];
  overall: {
    totalClasses: number;
    classesWithData: number;
    atRiskClasses: number;
    averageBlendedScore: number | null;
  };
}
