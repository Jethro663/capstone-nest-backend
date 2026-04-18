import { apiClient } from "../client";
import { unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type {
  Assessment,
  AssessmentAttempt,
  AttemptResult,
  SubmitAssessmentDto,
} from "../../types/assessment";
import type {
  AssessmentHistoryQuery,
  AssessmentHistoryResponse,
} from "../../types/report";

export type AssessmentAttemptList = AssessmentAttempt[];
export type AssessmentAttemptDetail = AttemptResult;
export type AssessmentHistoryList = AssessmentHistoryResponse;

type OngoingAttemptResult = {
  attempt: AssessmentAttempt;
  timeLimitMinutes: number | null;
  expiresAt?: string | null;
  strictMode?: boolean;
  timedQuestionsEnabled?: boolean;
  questionTimeLimitSeconds?: number | null;
};

export const assessmentsApi = {
  async getByClass(classId: string) {
    const response = await apiClient.get<ApiEnvelope<Assessment[]>>(`/assessments/class/${classId}`);
    return unwrapEnvelope(response.data);
  },

  async getById(assessmentId: string) {
    const response = await apiClient.get<ApiEnvelope<Assessment>>(`/assessments/${assessmentId}`);
    return unwrapEnvelope(response.data);
  },

  async getAssessmentHistory(query?: AssessmentHistoryQuery) {
    const response = await apiClient.get<AssessmentHistoryResponse>(
      "/profiles/me/assessment-history",
      { params: query },
    );
    return response.data;
  },

  async startAttempt(assessmentId: string) {
    const response = await apiClient.post<
      ApiEnvelope<OngoingAttemptResult>
    >(`/assessments/${assessmentId}/start`, {});
    return unwrapEnvelope(response.data);
  },

  async getOngoingAttempt(assessmentId: string) {
    const response = await apiClient.get<ApiEnvelope<OngoingAttemptResult | null>>(
      `/assessments/${assessmentId}/ongoing-attempt`,
    );
    return unwrapEnvelope(response.data);
  },

  async submit(payload: SubmitAssessmentDto) {
    const response = await apiClient.post<ApiEnvelope<unknown>>("/assessments/submit", payload);
    return unwrapEnvelope(response.data);
  },

  async getStudentAttempts(assessmentId: string) {
    const response = await apiClient.get<ApiEnvelope<AssessmentAttempt[]>>(
      `/assessments/${assessmentId}/student-attempts`,
    );
    return unwrapEnvelope(response.data);
  },

  async getAttemptResults(attemptId: string) {
    const response = await apiClient.get<ApiEnvelope<AttemptResult>>(`/assessments/attempts/${attemptId}/results`);
    return unwrapEnvelope(response.data);
  },
};
