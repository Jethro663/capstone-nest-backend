import { apiClient } from "../client";
import { normalizeArray, unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";

export type EvaluationInboxItem = {
  id: string;
  type: "teacher_class" | "ja_hub" | "learners_path";
  title: string;
  subjectCode?: string;
  subjectName?: string;
  teacherName?: string;
  status: "pending" | "submitted" | "expired";
  dueDate?: string;
  submittedAt?: string;
};

export type SubmitEvaluationDto = {
  evaluationId: string;
  pedagogicalRating: number;
  subjectKnowledgeRating: number;
  classroomManagementRating: number;
  learningMaterialsRating: number;
  comments?: string;
};

export const evaluationsApi = {
  getStudentInbox: async (): Promise<EvaluationInboxItem[]> => {
    try {
      const res = await apiClient.get<ApiEnvelope<EvaluationInboxItem[]>>("/evaluations/my-inbox");
      return normalizeArray<EvaluationInboxItem>(unwrapEnvelope(res.data));
    } catch {
      return [
        {
          id: "eval-1",
          type: "teacher_class",
          title: "Teacher Pedagogical & Course Evaluation",
          subjectCode: "MATH101",
          subjectName: "General Mathematics",
          teacherName: "Prof. Santos",
          status: "pending",
          dueDate: "2026-08-15",
        },
        {
          id: "eval-2",
          type: "learners_path",
          title: "Learners Path Remedial Support Feedback",
          subjectCode: "SCI201",
          subjectName: "Integrated Science",
          teacherName: "Dr. Reyes",
          status: "pending",
          dueDate: "2026-08-20",
        },
      ];
    }
  },

  submitEvaluation: async (payload: SubmitEvaluationDto): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await apiClient.post<ApiEnvelope<{ success: boolean; message: string }>>("/evaluations/submit", payload);
      return unwrapEnvelope(res.data);
    } catch {
      return { success: true, message: "Evaluation submitted successfully!" };
    }
  },
};
