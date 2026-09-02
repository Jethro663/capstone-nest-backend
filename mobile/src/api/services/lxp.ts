import { apiClient } from "../client";
import { normalizeArray, normalizeObject, unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type {
  EligibilityResponse,
  EligibleClass,
  LxpCheckpoint,
  LxpOverviewResponse,
  LxpPathSummary,
  PlaylistResponse,
  GuidedAssessmentResultResponse,
  GuidedAssessmentSessionResponse,
  GeneratedLessonResponse,
  StudentInterventionAlert,
  StudentInterventionAlertsResponse,
} from "../../types/lxp";
import type {
  LxpClassReport,
  RegenerateInterventionPathResponse,
  TeacherEvaluationSummaryResponse,
  TeacherInterventionCase,
  TeacherInterventionCaseDetail,
  TeacherInterventionHistoryResponse,
  TeacherInterventionHistoryRow,
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

const emptyInterventionAlerts = (): StudentInterventionAlertsResponse => ({
  alerts: [],
  count: 0,
});

const emptyClassReport = (classId: string): LxpClassReport => ({
  classId,
  threshold: 0,
  summary: {
    totalCases: 0,
    pendingCases: 0,
    activeCases: 0,
    completedCases: 0,
    interventionParticipation: 0,
    averageDelta: null,
  },
  rows: [],
  leaderboard: [],
});

function normalizeStudentName(entry: TeacherInterventionCase): string {
  return (
    entry.studentName ||
    [entry.student?.firstName, entry.student?.lastName]
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean)
      .join(" ") ||
    entry.student?.email ||
    "Student"
  );
}

function normalizeTeacherInterventionQueue(
  payload: TeacherInterventionQueueResponse,
): TeacherInterventionQueueResponse {
  return {
    ...payload,
    queue: normalizeArray<TeacherInterventionCase>(payload.queue).map((entry) => {
      return {
        ...entry,
        caseId: entry.caseId || entry.id,
        studentName: normalizeStudentName(entry),
      };
    }),
  };
}

function normalizeTeacherInterventionHistory(
  payload: TeacherInterventionHistoryResponse,
): TeacherInterventionHistoryResponse {
  return {
    ...payload,
    scoreThreshold: typeof payload.scoreThreshold === "number" ? payload.scoreThreshold : 60,
    history: normalizeArray<TeacherInterventionHistoryRow>(payload.history).map((entry) => ({
      ...entry,
      assignments: normalizeArray(entry.assignments),
      completion: normalizeObject(entry.completion, {
        totalCheckpoints: 0,
        completedCheckpoints: 0,
        completionPercent: 0,
      }),
      canRegenerate: Boolean(entry.canRegenerate),
    })),
  };
}

function normalizeClassReport(payload: LxpClassReport, classId: string): LxpClassReport {
  const fallback = emptyClassReport(classId);
  const normalized = normalizeObject(payload, fallback);
  return {
    ...normalized,
    summary: normalizeObject(normalized.summary, fallback.summary),
    rows: normalizeArray(normalized.rows),
    leaderboard: normalizeArray(normalized.leaderboard),
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

  async getInterventionAlerts() {
    const response = await apiClient.get<ApiEnvelope<StudentInterventionAlertsResponse>>(
      "/lxp/me/intervention-alerts",
    );
    const payload = normalizeObject(unwrapEnvelope(response.data), emptyInterventionAlerts());
    const alerts = normalizeArray<StudentInterventionAlert>(payload.alerts);
    return {
      alerts,
      count: typeof payload.count === "number" ? payload.count : alerts.length,
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

  async getGeneratedLesson(classId: string, assignmentId: string) {
    const response = await apiClient.get<ApiEnvelope<GeneratedLessonResponse>>(
      `/lxp/me/playlist/${classId}/generated-lessons/${assignmentId}`,
    );
    return unwrapEnvelope(response.data);
  },

  async startGuidedAssessment(classId: string, assignmentId: string, forceNewAttempt = false) {
    const response = await apiClient.post<ApiEnvelope<GuidedAssessmentSessionResponse>>(
      `/lxp/me/playlist/${classId}/guided-assessments/${assignmentId}/start`,
      forceNewAttempt ? { forceNewAttempt: true } : {},
    );
    return unwrapEnvelope(response.data);
  },

  async updateGuidedAssessmentProgress(
    classId: string,
    assignmentId: string,
    payload: {
      currentQuestionIndex?: number;
      responses?: GuidedAssessmentSessionResponse["attempt"]["responses"];
      hintedQuestionIds?: string[];
    },
  ) {
    const response = await apiClient.patch<ApiEnvelope<GuidedAssessmentSessionResponse>>(
      `/lxp/me/playlist/${classId}/guided-assessments/${assignmentId}/progress`,
      payload,
    );
    return unwrapEnvelope(response.data);
  },

  async submitGuidedAssessment(
    classId: string,
    assignmentId: string,
    payload: {
      responses: GuidedAssessmentSessionResponse["attempt"]["responses"];
      hintedQuestionIds: string[];
    },
  ) {
    const response = await apiClient.post<ApiEnvelope<GuidedAssessmentResultResponse>>(
      `/lxp/me/playlist/${classId}/guided-assessments/${assignmentId}/submit`,
      payload,
    );
    return unwrapEnvelope(response.data);
  },

  async getGuidedAssessmentResult(classId: string, assignmentId: string) {
    const response = await apiClient.get<ApiEnvelope<GuidedAssessmentResultResponse>>(
      `/lxp/me/playlist/${classId}/guided-assessments/${assignmentId}/result`,
    );
    return unwrapEnvelope(response.data);
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
    const response = await apiClient.get<ApiEnvelope<TeacherInterventionHistoryResponse>>(
      `/lxp/teacher/classes/${classId}/interventions/history`,
    );
    const payload = normalizeObject(unwrapEnvelope(response.data), {
      classId,
      scoreThreshold: 60,
      history: [],
    });
    return normalizeTeacherInterventionHistory(payload as TeacherInterventionHistoryResponse);
  },

  async getClassReport(classId: string) {
    const response = await apiClient.get<ApiEnvelope<LxpClassReport>>(
      `/lxp/teacher/classes/${classId}/reports/summary`,
    );
    return normalizeClassReport(unwrapEnvelope(response.data), classId);
  },

  async getTeacherPendingInterventionCount() {
    const response = await apiClient.get<ApiEnvelope<TeacherPendingInterventionCountResponse>>(
      "/lxp/teacher/interventions/pending-count",
    );
    const payload = normalizeObject(unwrapEnvelope(response.data), { pendingCount: 0, classBreakdown: [] });
    return {
      ...payload,
      classBreakdown: normalizeArray(payload.classBreakdown),
    };
  },

  async getTeacherCase(caseId: string) {
    const response = await apiClient.get<ApiEnvelope<TeacherInterventionQueueResponse["queue"][number]>>(
      `/lxp/teacher/interventions/${caseId}`,
    );
    const payload = unwrapEnvelope(response.data) as TeacherInterventionCase;
    return {
      ...payload,
      caseId: payload.caseId || payload.id,
      studentName: normalizeStudentName(payload),
    };
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

  async resolveIntervention(caseId: string, note?: string) {
    const response = await apiClient.post<ApiEnvelope<TeacherInterventionQueueResponse>>(
      `/lxp/teacher/interventions/${caseId}/resolve`,
      { note },
    );
    return unwrapEnvelope(response.data);
  },

  async regenerateInterventionPath(caseId: string) {
    const response = await apiClient.post<ApiEnvelope<RegenerateInterventionPathResponse>>(
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
    return unwrapEnvelope(response.data);
  },
};
