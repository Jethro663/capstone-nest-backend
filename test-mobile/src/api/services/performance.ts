import { apiClient } from "../client";
import { normalizeArray, normalizeObject, unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type {
  StudentOwnClassPerformance,
  StudentOwnPerformanceSummary,
  TeacherClassAtRiskResponse,
  TeacherClassPerformanceSummary,
  TeacherInterventionQuizComparisonResponse,
} from "../../types/performance";

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

  async getClassSummary(classId: string) {
    const response = await apiClient.get<ApiEnvelope<TeacherClassPerformanceSummary>>(
      `/performance/classes/${classId}/summary`,
    );
    return normalizeObject<TeacherClassPerformanceSummary>(unwrapEnvelope(response.data), {
      classId,
      totalStudents: 0,
      atRiskCount: 0,
      averageBlendedScore: null,
      thresholdApplied: 0,
    });
  },

  async getClassAtRisk(classId: string) {
    const response = await apiClient.get<ApiEnvelope<TeacherClassAtRiskResponse>>(
      `/performance/classes/${classId}/at-risk`,
    );
    const payload = normalizeObject(unwrapEnvelope(response.data), { classId, students: [] });
    return {
      ...payload,
      students: normalizeArray(payload.students),
    } as TeacherClassAtRiskResponse;
  },

  async getInterventionQuizComparison(classId: string) {
    const response = await apiClient.get<ApiEnvelope<TeacherInterventionQuizComparisonResponse>>(
      `/performance/classes/${classId}/intervention-quiz-comparison`,
    );
    const payload = normalizeObject(unwrapEnvelope(response.data), {
      classId,
      count: 0,
      improvedCount: 0,
      declinedCount: 0,
      unchangedCount: 0,
      awaitingRetryCount: 0,
      comparisons: [],
    } as TeacherInterventionQuizComparisonResponse);

    return {
      ...payload,
      comparisons: normalizeArray(payload.comparisons),
    } as TeacherInterventionQuizComparisonResponse;
  },
};
