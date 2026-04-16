export interface PerformanceStudentRow {
  studentId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
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

export interface ClassPerformanceSummary {
  classId: string;
  threshold: number;
  totalStudents: number;
  studentsWithData: number;
  atRiskCount: number;
  atRiskRate: number;
  averages: {
    blended: number | null;
    assessment: number | null;
    classRecord: number | null;
  };
  students: PerformanceStudentRow[];
}

export interface ClassAtRiskResponse {
  classId: string;
  threshold: number;
  count: number;
  students: PerformanceStudentRow[];
}

export interface PerformanceLogEntry {
  id: string;
  studentId: string;
  student?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
  previousIsAtRisk: boolean | null;
  currentIsAtRisk: boolean;
  assessmentAverage: number | null;
  classRecordAverage: number | null;
  blendedScore: number | null;
  thresholdApplied: number | null;
  triggerSource: string;
  createdAt: string | Date;
}

export interface ClassPerformanceLogsResponse {
  classId: string;
  threshold: number;
  count: number;
  logs: PerformanceLogEntry[];
}

export interface PerformanceAnalysisLearningGap {
  concept: string;
  wrongCount: number;
  evidenceCount: number;
  masteryScore: number;
  lessonEvidence: Array<{
    chunkId: string;
    lessonId: string | null;
    excerpt: string;
    sourceType: string;
  }>;
}

export interface PerformanceAnalysisStructuredOutput {
  classId: string;
  studentId: string | null;
  generatedAt: string;
  insufficientEvidence: boolean;
  teacherNote: string | null;
  learningGaps: PerformanceAnalysisLearningGap[];
  scoreBreakdown: Array<{
    assessmentId: string;
    title: string;
    category: string;
    averageScore: number | null;
    attemptCount: number;
  }>;
  evidence: Array<{
    studentId: string | null;
    assessmentId: string | null;
    assessmentTitle: string | null;
    questionId: string;
    questionText: string;
    studentAnswer: string | null;
    submittedAt: string | null;
  }>;
  teacherActions: string[];
  recommendedIntervention: {
    shouldOpenCase: boolean;
    status: 'insufficient_evidence' | 'actionable';
    topConcepts: string[];
  };
}

export interface PerformanceAnalysisJob {
  jobId: string;
  jobType: string;
  status: 'pending' | 'processing' | 'completed' | 'approved' | 'rejected' | 'failed';
  progressPercent: number;
  statusMessage?: string | null;
  errorMessage?: string | null;
  outputId?: string | null;
  updatedAt?: string | null;
}

export interface ClassDiagnosticsResponse {
  classId: string;
  threshold: number;
  lowestAssessments: Array<{
    assessmentId: string;
    title: string;
    category: string;
    averageScore: number | null;
    attemptCount: number;
  }>;
  conceptHotspots: Array<{
    concept: string;
    wrongCount: number;
    masteryScore: number;
    evidenceCount: number;
  }>;
  studentCount: number;
  atRiskCount: number;
  insufficientEvidence: boolean;
}

export interface AdminPerformanceAnalyticsResponse {
  conceptMasterySnapshots: Array<{
    id: string;
    classId: string;
    studentId: string;
    conceptKey: string;
    errorCount: number;
    masteryScore: number;
    updatedAt: string;
  }>;
  recommendationHistory: Array<{
    id: string;
    outputType: string;
    targetClassId: string | null;
    targetTeacherId: string | null;
    createdAt: string;
  }>;
  performanceLogTransitions: {
    total: number;
    summary: {
      riskIncrements: number;
      riskRecoveries: number;
      otherTransitions: number;
    };
    rows: Array<{
      id: string;
      classId: string;
      studentId: string;
      previousIsAtRisk: boolean | null;
      currentIsAtRisk: boolean;
      triggerSource: string;
      createdAt: string;
    }>;
  };
}

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
