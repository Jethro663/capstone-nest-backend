import { api } from '@/lib/api-client';
import type {
  AdminOverviewResponse,
  ClassTrendsResponse,
  InterventionOutcomesResponse,
  TeacherWorkloadResponse,
} from '@/types/analytics';

export const analyticsService = {
  async getInterventionOutcomes(classId: string): Promise<{
    success: boolean;
    data: InterventionOutcomesResponse;
  }> {
    const { data } = await api.get(
      `/analytics/classes/${classId}/intervention-outcomes`,
    );
    return data;
  },

  async getClassTrends(classId: string): Promise<{
    success: boolean;
    data: ClassTrendsResponse;
  }> {
    const { data } = await api.get(`/analytics/classes/${classId}/trends`);
    return data;
  },

  async getTeacherWorkload(teacherId: string): Promise<{
    success: boolean;
    data: TeacherWorkloadResponse;
  }> {
    const { data } = await api.get(`/analytics/teachers/${teacherId}/workload`);
    return data;
  },

  async getAdminOverview(): Promise<{
    success: boolean;
    data: AdminOverviewResponse;
  }> {
    const { data } = await api.get('/analytics/admin/overview');
    return data;
  },
};
