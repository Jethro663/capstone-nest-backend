import { apiClient } from "../client";
import { normalizeArray, normalizeObject, unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type { EligibilityResponse, EligibleClass, LxpCheckpoint, PlaylistResponse } from "../../types/lxp";

const emptyEligibility = (): EligibilityResponse => ({
  threshold: 0,
  eligibleClasses: [],
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
    streakDays: 0,
    checkpointsCompleted: 0,
    completionPercent: 0,
  },
  checkpoints: [],
});

export const lxpApi = {
  async getEligibility() {
    const response = await apiClient.get<ApiEnvelope<EligibilityResponse>>("/lxp/me/eligibility");
    const payload = normalizeObject(unwrapEnvelope(response.data), emptyEligibility());
    return {
      ...payload,
      eligibleClasses: normalizeArray<EligibleClass>(payload.eligibleClasses),
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
};
