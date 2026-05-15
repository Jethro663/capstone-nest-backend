import { apiClient } from "../client";
import { normalizeArray, normalizeObject, unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type { EligibilityResponse, EligibleClass, LxpCheckpoint, LxpOverviewResponse, LxpPathSummary, PlaylistResponse } from "../../types/lxp";
import type {
  TeacherEvaluationSummaryResponse,
  TeacherInterventionCase,
  TeacherInterventionCaseDetail,
  TeacherEvaluationType,
  TeacherInterventionQueueResponse,
  TeacherPendingInterventionCountResponse,
  ApproveGeneratedRemedialPayload,
  GeneratedArtifactApprovalResponse,
} from "../../types/teacher";

const emptyEligibility = (): EligibilityResponse => ({
  threshold: 0,
  eligibleClasses: [],
  paths: [],
});

const emptyPlaylist = (): PlaylistResponse => ({
  interventionCase: {
    id: "",
    status: "inactive",
    openedAt: "",
    thresholdApplied: 0,
    triggerScore: null,
  },
  progress: {
    xpTotal: 0,
    starsTotal: 0,
    streakDays: 0,
    checkpointsCompleted: 0,
    completionPercent: 0,
  },
  checkpoints: [],
});

function normalizeTeacherInterventionQueue(
  payload: TeacherInterventionQueueResponse,
): TeacherInterventionQueueResponse {
  return {
    ...payload,
    queue: normalizeArray<TeacherInterventionCase>(payload.queue).map((entry) => {
      const studentName =
        entry.studentName ||
        [entry.student?.firstName, entry.student?.lastName]
          .map((value) => (typeof value === "string" ? value.trim() : ""))
          .filter(Boolean)
          .join(" ") ||
        entry.student?.email ||
        "Student";

      return {
        ...entry,
        studentName,
      };
    }),
  };
}

export const lxpApi = {
  async getEligibility() {
    const response = await apiClient.get<ApiEnvelope<EligibilityResponse>>("/lxp/me/eligibility");
    const payload = normalizeObject(unwrapEnvelope(response.data), emptyEligibility());
    return {
      ...payload,
      eligibleClasses: normalizeArray<EligibleClass>(payload.eligibleClasses),
      paths: normalizeArray<LxpPathSummary>(payload.paths),
    };
  },

  async getPlaylist(classId: string) {
    const response = await apiClient.get<ApiEnvelope<PlaylistResponse>>(`/lxp/me/playlist/${classId}`);
    const payload = normalizeObject(unwrapEnvelope(response.data), emptyPlaylist());
    return {
      ...payload,
      interventionCase: normalizeObject(payload.interventionCase, emptyPlaylist().interventionCase),
      progress: normalizeObject(payload.progress, emptyPlaylist().progress),
      checkpoints: normalizeArray<LxpCheckpoint>(payload.checkpoints),
    };
  },

  async completeCheckpoint(classId: string, assignmentId: string) {
    const response = await apiClient.post<ApiEnvelope<PlaylistResponse>>(
      `/lxp/me/playlist/${classId}/checkpoints/${assignmentId}/complete`,
      {},
    );
    const payload = normalizeObject(unwrapEnvelope(response.data), emptyPlaylist());
    return {
      ...payload,
      interventionCase: normalizeObject(payload.interventionCase, emptyPlaylist().interventionCase),
      progress: normalizeObject(payload.progress, emptyPlaylist().progress),
      checkpoints: normalizeArray<LxpCheckpoint>(payload.checkpoints),
    };
  },

  async getOverview(classId: string) {
    const response = await apiClient.get<ApiEnvelope<LxpOverviewResponse>>(`/lxp/me/overview/${classId}`);
    return unwrapEnvelope(response.data);
  },

  async getTeacherQueue(classId: string) {
    const response = await apiClient.get<ApiEnvelope<TeacherInterventionQueueResponse>>(
      `/lxp/teacher/classes/${classId}/interventions`,
    );
    const payload = normalizeObject(unwrapEnvelope(response.data), { queue: [] });
    return normalizeTeacherInterventionQueue(payload as TeacherInterventionQueueResponse);
  },

  async getTeacherInterventionHistory(classId: string) {
    const response = await apiClient.get<ApiEnvelope<TeacherInterventionQueueResponse>>(
      `/lxp/teacher/classes/${classId}/interventions/history`,
    );
    const payload = normalizeObject(unwrapEnvelope(response.data), { queue: [] });
    return normalizeTeacherInterventionQueue(payload as TeacherInterventionQueueResponse);
  },

  async getTeacherPendingInterventionCount() {
    const response = await apiClient.get<ApiEnvelope<TeacherPendingInterventionCountResponse>>(
      "/lxp/teacher/interventions/pending-count",
    );
    return normalizeObject(unwrapEnvelope(response.data), { pendingCount: 0 });
  },

  async getTeacherCase(caseId: string) {
    const response = await apiClient.get<ApiEnvelope<TeacherInterventionQueueResponse["queue"][number]>>(
      `/lxp/teacher/interventions/${caseId}`,
    );
    return unwrapEnvelope(response.data);
  },

  async getTeacherCaseDetail(caseId: string) {
    const response = await apiClient.get<ApiEnvelope<TeacherInterventionCaseDetail>>(
      `/lxp/teacher/interventions/${caseId}/detail`,
    );
    return unwrapEnvelope(response.data);
  },

  async activateIntervention(caseId: string) {
    const response = await apiClient.post<ApiEnvelope<TeacherInterventionQueueResponse>>(
      `/lxp/teacher/interventions/${caseId}/activate`,
    );
    return unwrapEnvelope(response.data);
  },

  async regenerateInterventionPath(caseId: string) {
    const response = await apiClient.post<ApiEnvelope<Record<string, unknown>>>(
      `/lxp/teacher/interventions/${caseId}/regenerate`,
    );
    return unwrapEnvelope(response.data);
  },

  async assignIntervention(
    caseId: string,
    payload: {
      lessonIds?: string[];
      assessmentIds?: string[];
      lessonAssignments?: Array<{ lessonId: string; xpAwarded: number; label?: string }>;
      assessmentAssignments?: Array<{ assessmentId: string; xpAwarded: number; label?: string }>;
      note?: string;
    },
  ) {
    const response = await apiClient.post<ApiEnvelope<TeacherInterventionQueueResponse>>(
      `/lxp/teacher/interventions/${caseId}/assign`,
      payload,
    );
    return unwrapEnvelope(response.data);
  },

  async approveGeneratedArtifacts(caseId: string, payload: ApproveGeneratedRemedialPayload) {
    const response = await apiClient.post<ApiEnvelope<GeneratedArtifactApprovalResponse>>(
      `/lxp/teacher/interventions/${caseId}/generated-content/approve`,
      payload,
    );
    return unwrapEnvelope(response.data);
  },

  async rejectGeneratedArtifacts(caseId: string, payload: ApproveGeneratedRemedialPayload) {
    const response = await apiClient.post<ApiEnvelope<GeneratedArtifactApprovalResponse>>(
      `/lxp/teacher/interventions/${caseId}/generated-content/reject`,
      payload,
    );
    return unwrapEnvelope(response.data);
  },
  async getTeacherEvaluationSummary(
    filters: {
      evaluationType: TeacherEvaluationType;
      classId?: string;
      gradingPeriod?: "Q1" | "Q2" | "Q3" | "Q4";
    },
  ) {
    const response = await apiClient.get<ApiEnvelope<TeacherEvaluationSummaryResponse>>(
      "/lxp/teacher/evaluations/summary",
      { params: filters },
    );
    return normalizeObject<TeacherEvaluationSummaryResponse>(unwrapEnvelope(response.data), {
      evaluationType: filters.evaluationType,
      overallAverage: null,
      responseCount: 0,
      classAverages: [] as TeacherEvaluationSummaryResponse["classAverages"],
      gradingPeriodBreakdown: [] as TeacherEvaluationSummaryResponse["gradingPeriodBreakdown"],
    });
  },
};
