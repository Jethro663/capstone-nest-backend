import { apiClient } from '@/api/client';
import { unwrapEnvelope } from '@/api/http';
import type { ApiEnvelope } from '@/types/api';
import type { EligibilityResponse, PlaylistResponse } from '@/types/lxp';

export const lxpApi = {
  async getEligibility() {
    const response = await apiClient.get<ApiEnvelope<EligibilityResponse>>('/lxp/me/eligibility');
    return unwrapEnvelope(response.data);
  },

  async getPlaylist(classId: string) {
    const response = await apiClient.get<ApiEnvelope<PlaylistResponse>>(`/lxp/me/playlist/${classId}`);
    return unwrapEnvelope(response.data);
  },

  async completeCheckpoint(classId: string, assignmentId: string) {
    const response = await apiClient.post<ApiEnvelope<PlaylistResponse>>(
      `/lxp/me/playlist/${classId}/checkpoints/${assignmentId}/complete`,
      {},
    );
    return unwrapEnvelope(response.data);
  },

  async submitFeedback(payload: {
    targetModule: 'lxp';
    usabilityScore: number;
    functionalityScore: number;
    performanceScore: number;
    satisfactionScore: number;
    feedback?: string;
  }) {
    const response = await apiClient.post<ApiEnvelope<unknown>>('/lxp/evaluations', payload);
    return unwrapEnvelope(response.data);
  },
};
