import { api } from '@/lib/api-client';
import type {
  EligibilityResponse,
  LxpClassReport,
  PlaylistResponse,
  SystemEvaluationListResponse,
  SystemEvaluationTargetModule,
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

  async resolveIntervention(
    caseId: string,
    note?: string,
  ): Promise<Envelope<TeacherInterventionQueueResponse>> {
    const { data } = await api.post(`/lxp/teacher/interventions/${caseId}/resolve`, {
      note,
    });
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

  async submitEvaluation(payload: {
    targetModule: SystemEvaluationTargetModule;
    usabilityScore: number;
    functionalityScore: number;
    performanceScore: number;
    satisfactionScore: number;
    feedback?: string;
  }) {
    const { data } = await api.post('/lxp/evaluations', payload);
    return normalizeEnvelope(data);
  },

  async getEvaluations(
    targetModule?: SystemEvaluationTargetModule,
  ): Promise<Envelope<SystemEvaluationListResponse>> {
    const { data } = await api.get('/lxp/evaluations', {
      params: targetModule ? { targetModule } : undefined,
    });
    return normalizeEnvelope<SystemEvaluationListResponse>(data);
  },
};
