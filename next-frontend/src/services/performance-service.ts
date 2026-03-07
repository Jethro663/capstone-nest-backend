import { api } from '@/lib/api-client';
import type {
  ClassAtRiskResponse,
  ClassPerformanceLogsResponse,
  ClassPerformanceSummary,
  StudentOwnPerformanceSummary,
} from '@/types/performance';

export interface PerformanceLogsQuery {
  studentId?: string;
  limit?: number;
}

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

export const performanceService = {
  /** POST /performance/classes/:classId/recompute */
  async recomputeClass(classId: string): Promise<Envelope<{
    classId: string;
    recomputed: number;
    atRiskCount: number;
    totalStudents: number;
  }>> {
    const { data } = await api.post(`/performance/classes/${classId}/recompute`);
    return normalizeEnvelope(data);
  },

  /** GET /performance/classes/:classId/summary */
  async getClassSummary(classId: string): Promise<Envelope<ClassPerformanceSummary>> {
    const { data } = await api.get(`/performance/classes/${classId}/summary`);
    return normalizeEnvelope<ClassPerformanceSummary>(data);
  },

  /** GET /performance/classes/:classId/at-risk */
  async getAtRiskStudents(classId: string): Promise<Envelope<ClassAtRiskResponse>> {
    const { data } = await api.get(`/performance/classes/${classId}/at-risk`);
    return normalizeEnvelope<ClassAtRiskResponse>(data);
  },

  /** GET /performance/classes/:classId/logs */
  async getClassLogs(
    classId: string,
    query?: PerformanceLogsQuery,
  ): Promise<Envelope<ClassPerformanceLogsResponse>> {
    const { data } = await api.get(`/performance/classes/${classId}/logs`, {
      params: query,
    });
    return normalizeEnvelope<ClassPerformanceLogsResponse>(data);
  },

  /** GET /performance/students/me/summary */
  async getStudentOwnSummary(): Promise<Envelope<StudentOwnPerformanceSummary>> {
    const { data } = await api.get('/performance/students/me/summary');
    return normalizeEnvelope<StudentOwnPerformanceSummary>(data);
  },
};

