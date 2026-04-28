import { apiClient } from "../client";
import { unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type {
  Assessment,
  AssessmentAttempt,
  AttemptResult,
  OngoingAttemptResult,
  SubmitAssessmentDto,
  UpdateAttemptProgressDto,
  UploadedAssessmentFile,
} from "../../types/assessment";
import type {
  AssessmentHistoryQuery,
  AssessmentHistoryResponse,
} from "../../types/report";

export type AssessmentAttemptList = AssessmentAttempt[];
export type AssessmentAttemptDetail = AttemptResult;
export type AssessmentHistoryList = AssessmentHistoryResponse;

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

  async updateAttemptProgress(attemptId: string, payload: UpdateAttemptProgressDto) {
    const response = await apiClient.patch<ApiEnvelope<AssessmentAttempt>>(
      `/assessments/attempts/${attemptId}/progress`,
      payload,
    );
    return unwrapEnvelope(response.data);
  },

  async uploadSubmissionFile(
    assessmentId: string,
    file: { uri: string; name: string; type?: string | null },
  ) {
    const formData = new FormData();
    formData.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.type || "application/octet-stream",
    } as unknown as Blob);

    const response = await apiClient.post<ApiEnvelope<UploadedAssessmentFile>>(
      `/assessments/${assessmentId}/submission-file`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return unwrapEnvelope(response.data);
  },

  async unsubmitFileUploadAssessment(assessmentId: string) {
    const response = await apiClient.post<ApiEnvelope<AssessmentAttempt>>(
      `/assessments/${assessmentId}/unsubmit-file-upload`,
      {},
    );
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
