import { apiClient } from '@/api/client';
import { unwrapEnvelope } from '@/api/http';
import type { ApiEnvelope } from '@/types/api';
import type { StudentOwnPerformanceSummary } from '@/types/performance';

export const performanceApi = {
  async getStudentSummary() {
    const response = await apiClient.get<ApiEnvelope<StudentOwnPerformanceSummary>>('/performance/students/me/summary');
    return unwrapEnvelope(response.data);
  },
};
