import { api } from '@/lib/api-client';
import type {
  EligibilityResponse,
  LxpClassReport,
  LxpOverviewResponse,
  PlaylistResponse,
  StudentTeacherEvaluationDashboardResponse,
  SystemEvaluationListResponse,
  RegenerateInterventionPathResponse,
  TeacherEvaluationSummaryResponse,
  TeacherEvaluationType,
  SystemEvaluationTargetModule,
  ApproveGeneratedRemedialPayload,
  GeneratedLessonContent,
  GeneratedArtifactApprovalResponse,
  GuidedAssessmentResultResponse,
  GuidedAssessmentSessionResponse,
  TeacherInterventionCaseDetail,
  TeacherInterventionHistoryResponse,
  TeacherPendingInterventionCountResponse,
  TeacherInterventionQueueResponse,
} from '@/types/lxp';

type Envelope<T> = {
  success?: boolean;
  data: T;
};

function normalizeEnvelope<T>(payload: unknown): Envelope<T> {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload as Envelope<T>;
  }
  return { data: payload as T };
}

export const lxpService = {
  async getEligibility(): Promise<Envelope<EligibilityResponse>> {
    const { data } = await api.get('/lxp/me/eligibility');
    return normalizeEnvelope<EligibilityResponse>(data);
  },

  async getPlaylist(classId: string): Promise<Envelope<PlaylistResponse>> {
    const { data } = await api.get(`/lxp/me/playlist/${classId}`);
    return normalizeEnvelope<PlaylistResponse>(data);
  },

  async getOverview(classId: string): Promise<Envelope<LxpOverviewResponse>> {
    const { data } = await api.get(`/lxp/me/overview/${classId}`);
    return normalizeEnvelope<LxpOverviewResponse>(data);
  },

  async completeCheckpoint(
    classId: string,
    assignmentId: string,
  ): Promise<Envelope<PlaylistResponse>> {
    const { data } = await api.post(
      `/lxp/me/playlist/${classId}/checkpoints/${assignmentId}/complete`,
    );
    return normalizeEnvelope<PlaylistResponse>(data);
  },

  async getTeacherQueue(
    classId: string,
  ): Promise<Envelope<TeacherInterventionQueueResponse>> {
    const { data } = await api.get(`/lxp/teacher/classes/${classId}/interventions`);
    return normalizeEnvelope<TeacherInterventionQueueResponse>(data);
  },

  async getTeacherInterventionHistory(
    classId: string,
  ): Promise<Envelope<TeacherInterventionHistoryResponse>> {
    const { data } = await api.get(
      `/lxp/teacher/classes/${classId}/interventions/history`,
    );
    return normalizeEnvelope<TeacherInterventionHistoryResponse>(data);
  },

  async resolveIntervention(
    caseId: string,
    note?: string,
  ): Promise<Envelope<TeacherInterventionQueueResponse>> {
    const { data } = await api.post(`/lxp/teacher/interventions/${caseId}/resolve`, {
      note,
    });
    return normalizeEnvelope<TeacherInterventionQueueResponse>(data);
  },

  async getTeacherPendingInterventionCount(): Promise<
    Envelope<TeacherPendingInterventionCountResponse>
  > {
    const { data } = await api.get('/lxp/teacher/interventions/pending-count');
    return normalizeEnvelope<TeacherPendingInterventionCountResponse>(data);
  },

  async activateIntervention(
    caseId: string,
  ): Promise<Envelope<TeacherInterventionQueueResponse>> {
    const { data } = await api.post(`/lxp/teacher/interventions/${caseId}/activate`);
    return normalizeEnvelope<TeacherInterventionQueueResponse>(data);
  },

  async assignIntervention(
    caseId: string,
    payload: {
      lessonIds?: string[];
      assessmentIds?: string[];
      lessonAssignments?: { lessonId: string; xpAwarded: number; label?: string }[];
      assessmentAssignments?: { assessmentId: string; xpAwarded: number; label?: string }[];
      note?: string;
    },
  ): Promise<Envelope<TeacherInterventionQueueResponse>> {
    const { data } = await api.post(`/lxp/teacher/interventions/${caseId}/assign`, payload);
    return normalizeEnvelope<TeacherInterventionQueueResponse>(data);
  },

  async getClassReport(classId: string): Promise<Envelope<LxpClassReport>> {
    const { data } = await api.get(`/lxp/teacher/classes/${classId}/reports/summary`);
    return normalizeEnvelope<LxpClassReport>(data);
  },

  async getTeacherCase(caseId: string) {
    const { data } = await api.get(`/lxp/teacher/interventions/${caseId}`);
    return normalizeEnvelope<TeacherInterventionQueueResponse['queue'][number]>(data);
  },

  async getTeacherCaseDetail(
    caseId: string,
  ): Promise<Envelope<TeacherInterventionCaseDetail>> {
    const { data } = await api.get(`/lxp/teacher/interventions/${caseId}/detail`);
    return normalizeEnvelope<TeacherInterventionCaseDetail>(data);
  },

  async regenerateInterventionPath(
    caseId: string,
  ): Promise<Envelope<RegenerateInterventionPathResponse>> {
    const { data } = await api.post(`/lxp/teacher/interventions/${caseId}/regenerate`);
    return normalizeEnvelope<RegenerateInterventionPathResponse>(data);
  },

  async approveGeneratedArtifacts(
    caseId: string,
    payload: ApproveGeneratedRemedialPayload,
  ): Promise<Envelope<GeneratedArtifactApprovalResponse>> {
    const { data } = await api.post(
      `/lxp/teacher/interventions/${caseId}/generated-content/approve`,
      payload,
    );
    return normalizeEnvelope<GeneratedArtifactApprovalResponse>(data);
  },

  async rejectGeneratedArtifacts(
    caseId: string,
    payload: ApproveGeneratedRemedialPayload,
  ): Promise<Envelope<GeneratedArtifactApprovalResponse>> {
    const { data } = await api.post(
      `/lxp/teacher/interventions/${caseId}/generated-content/reject`,
      payload,
    );
    return normalizeEnvelope<GeneratedArtifactApprovalResponse>(data);
  },

  async getGeneratedLesson(
    classId: string,
    assignmentId: string,
  ): Promise<
    Envelope<{
      assignmentId: string;
      caseId: string;
      status: string;
      checkpointLabel: string;
      generatedLesson: GeneratedLessonContent;
    }>
  > {
    const { data } = await api.get(
      `/lxp/me/playlist/${classId}/generated-lessons/${assignmentId}`,
    );
    return normalizeEnvelope(data);
  },

  async startGuidedAssessment(
    classId: string,
    assignmentId: string,
  ): Promise<Envelope<GuidedAssessmentSessionResponse>> {
    const { data } = await api.post(
      `/lxp/me/playlist/${classId}/guided-assessments/${assignmentId}/start`,
    );
    return normalizeEnvelope<GuidedAssessmentSessionResponse>(data);
  },

  async updateGuidedAssessmentProgress(
    classId: string,
    assignmentId: string,
    payload: {
      currentQuestionIndex?: number;
      responses?: GuidedAssessmentSessionResponse['attempt']['responses'];
      hintedQuestionIds?: string[];
    },
  ): Promise<Envelope<GuidedAssessmentSessionResponse>> {
    const { data } = await api.patch(
      `/lxp/me/playlist/${classId}/guided-assessments/${assignmentId}/progress`,
      payload,
    );
    return normalizeEnvelope<GuidedAssessmentSessionResponse>(data);
  },

  async submitGuidedAssessment(
    classId: string,
    assignmentId: string,
    payload: {
      responses: GuidedAssessmentSessionResponse['attempt']['responses'];
      hintedQuestionIds: string[];
    },
  ): Promise<Envelope<GuidedAssessmentResultResponse>> {
    const { data } = await api.post(
      `/lxp/me/playlist/${classId}/guided-assessments/${assignmentId}/submit`,
      payload,
    );
    return normalizeEnvelope<GuidedAssessmentResultResponse>(data);
  },

  async getGuidedAssessmentResult(
    classId: string,
    assignmentId: string,
  ): Promise<Envelope<GuidedAssessmentResultResponse>> {
    const { data } = await api.get(
      `/lxp/me/playlist/${classId}/guided-assessments/${assignmentId}/result`,
    );
    return normalizeEnvelope<GuidedAssessmentResultResponse>(data);
  },

  async getStudentTeacherEvaluationDashboard(): Promise<
    Envelope<StudentTeacherEvaluationDashboardResponse>
  > {
    const { data } = await api.get('/lxp/me/teacher-evaluations');
    return normalizeEnvelope<StudentTeacherEvaluationDashboardResponse>(data);
  },

  async submitTeacherEvaluation(payload: {
    classId: string;
    gradingPeriod: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    evaluationType: TeacherEvaluationType;
    ratings: Record<string, number>;
    comment?: string;
  }) {
    const { data } = await api.post('/lxp/me/teacher-evaluations', payload);
    return normalizeEnvelope(data);
  },

  async getTeacherEvaluationSummary(filters: {
    evaluationType: TeacherEvaluationType;
    classId?: string;
    gradingPeriod?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  }): Promise<Envelope<TeacherEvaluationSummaryResponse>> {
    const { data } = await api.get('/lxp/teacher/evaluations/summary', {
      params: filters,
    });
    return normalizeEnvelope<TeacherEvaluationSummaryResponse>(data);
  },

  async submitEvaluation(payload: {
    targetModule: SystemEvaluationTargetModule;
    usabilityScore: number;
    functionalityScore: number;
    performanceScore: number;
    satisfactionScore: number;
    feedback?: string;
    aiContextMetadata?: {
      sessionType?: 'mentor_chat' | 'mistake_explanation' | 'student_tutor';
      attemptId?: string;
      questionId?: string;
      classId?: string;
      sourceFlow?: string;
    };
  }) {
    const { data } = await api.post('/lxp/evaluations', payload);
    return normalizeEnvelope(data);
  },

  async getEvaluations(
    filters?: {
      targetModule?: SystemEvaluationTargetModule;
      aiClassId?: string;
      aiSessionType?: 'mentor_chat' | 'mistake_explanation' | 'student_tutor';
      aiSourceFlow?: string;
    },
  ): Promise<Envelope<SystemEvaluationListResponse>> {
    const { data } = await api.get('/lxp/evaluations', {
      params: filters && Object.keys(filters).length > 0 ? filters : undefined,
    });
    return normalizeEnvelope<SystemEvaluationListResponse>(data);
  },
};
