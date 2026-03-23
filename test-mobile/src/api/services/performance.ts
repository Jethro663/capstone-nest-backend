import { apiClient } from "../client";
import { unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type { StudentOwnPerformanceSummary } from "../../types/performance";

export const performanceApi = {
  async getStudentSummary() {
    const response = await apiClient.get<ApiEnvelope<StudentOwnPerformanceSummary>>("/performance/students/me/summary");
    return unwrapEnvelope(response.data);
  },
};
