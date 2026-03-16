export interface InterventionOutcomeStudent {
  caseId: string;
  studentId: string;
  student: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  status: string;
  openedAt: string;
  closedAt: string | null;
  beforeScore: number | null;
  afterScore: number | null;
  improved: boolean | null;
  assignmentsTotal: number;
  assignmentsCompleted: number;
  completionRate: number;
  currentIsAtRisk: boolean | null;
  lastComputedAt: string | null;
}

export interface InterventionOutcomesResponse {
  classId: string;
  summary: {
    totalCases: number;
    improvedCount: number;
    completionRate: number;
    action: string;
  };
  students: InterventionOutcomeStudent[];
}

export interface ClassTrendRow {
  gradingPeriod: string;
  status: string;
  average: number | null;
  studentCount: number;
  interventionCount: number;
}

export interface ClassTrendsResponse {
  classId: string;
  trends: ClassTrendRow[];
}

export interface TeacherWorkloadResponse {
  teacherId: string;
  classCount: number;
  activeClassCount: number;
  activeInterventions: number;
  pendingClassRecords: number;
  assessmentCount: number;
  action: string;
}

export interface AdminOverviewResponse {
  totals: {
    teachers: number;
    students: number;
    classes: number;
    activeInterventions: number;
    atRiskStudents: number;
  };
  action: string;
}
