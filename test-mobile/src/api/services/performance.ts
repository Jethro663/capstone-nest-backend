import { apiClient } from "../client";
import { normalizeArray, normalizeObject, unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type { StudentOwnClassPerformance, StudentOwnPerformanceSummary } from "../../types/performance";

const emptyPerformanceSummary = (): StudentOwnPerformanceSummary => ({
  student: {
    id: "",
    firstName: "",
    lastName: "",
    email: "",
  },
  threshold: 0,
  classes: [],
  overall: {
    totalClasses: 0,
    classesWithData: 0,
    atRiskClasses: 0,
    averageBlendedScore: null,
  },
});

export const performanceApi = {
  async getStudentSummary() {
    const response = await apiClient.get<ApiEnvelope<StudentOwnPerformanceSummary>>("/performance/students/me/summary");
    const payload = normalizeObject(unwrapEnvelope(response.data), emptyPerformanceSummary());
    return {
      ...payload,
      student: normalizeObject(payload.student, emptyPerformanceSummary().student),
      classes: normalizeArray<StudentOwnClassPerformance>(payload.classes),
      overall: normalizeObject(payload.overall, emptyPerformanceSummary().overall),
    };
  },
};
