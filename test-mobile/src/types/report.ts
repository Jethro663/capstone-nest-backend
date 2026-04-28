export interface TranscriptQuery {
  page?: number;
  limit?: number;
  status?: "all" | "enrolled" | "dropped" | "completed";
  search?: string;
}

export interface TranscriptRow {
  id: string;
  studentId: string;
  classId: string | null;
  sectionId: string;
  status: string;
  enrolledAt: string;
  class: {
    id: string;
    subjectName: string;
    subjectCode: string;
    schoolYear: string;
  } | null;
  section: {
    id: string;
    name: string;
    gradeLevel: string;
    schoolYear: string;
  } | null;
}

export interface TranscriptResponse {
  success: boolean;
  data: TranscriptRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AssessmentHistoryQuery {
  page?: number;
  limit?: number;
  submission?: "all" | "submitted" | "in_progress";
  search?: string;
}

export interface AssessmentHistoryRow {
  id: string;
  assessmentId: string;
  attemptNumber: number;
  score: number | null;
  isSubmitted: boolean;
  submittedAt?: string | null;
  startedAt?: string | null;
  returnedAt?: string | null;
  passed?: boolean | null;
  assessment: {
    id: string;
    title: string;
    classId: string;
    dueDate?: string | null;
    quarter?: string | null;
    type: string;
    totalPoints: number;
    class: {
      id: string;
      subjectName: string;
      subjectCode: string;
    } | null;
  } | null;
}

export interface AssessmentHistoryResponse {
  success: boolean;
  data: AssessmentHistoryRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
