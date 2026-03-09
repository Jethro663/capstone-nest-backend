import { apiClient } from '@/api/client';
import { unwrapEnvelope } from '@/api/http';
import type { ApiEnvelope } from '@/types/api';
import type { Assessment, AssessmentAttempt, AttemptResult, SubmitAssessmentDto } from '@/types/assessment';

export const assessmentsApi = {
  async getByClass(classId: string) {
    const response = await apiClient.get<ApiEnvelope<Assessment[]>>(`/assessments/class/${classId}`);
    return unwrapEnvelope(response.data);
  },

  async getById(assessmentId: string) {
    const response = await apiClient.get<ApiEnvelope<Assessment>>(`/assessments/${assessmentId}`);
    return unwrapEnvelope(response.data);
  },

  async startAttempt(assessmentId: string) {
    const response = await apiClient.post<
      ApiEnvelope<{ attempt: AssessmentAttempt; timeLimitMinutes: number | null }>
    >(`/assessments/${assessmentId}/start`, {});
    return unwrapEnvelope(response.data);
  },

  async submit(payload: SubmitAssessmentDto) {
    const response = await apiClient.post<ApiEnvelope<unknown>>('/assessments/submit', payload);
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
