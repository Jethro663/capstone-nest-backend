import { api, type ApiRequestConfig } from "@/lib/api-client";
import type {
  ExecuteSystemReset,
  ResetAcademicPolicy,
  ResetCapability,
  ResetEnvelope,
  ResetOperation,
  ResetPeriodKey,
  ResetPreview,
  ResetPublicStatus,
} from "@/types/system-reset";

const noSessionRefresh: ApiRequestConfig = {
  skipAuthRefresh: true,
  skipSessionExpiredRedirect: true,
};

export const systemResetService = {
  async getCapability() {
    return (
      await api.get<ResetEnvelope<ResetCapability>>("/admin/system-reset")
    ).data;
  },
  async getPolicy(schoolYear: string) {
    return (
      await api.get<ResetEnvelope<{ policy: ResetAcademicPolicy }>>(
        "/admin/system-reset/policy",
        { params: { schoolYear } },
      )
    ).data;
  },
  async preview(target: { schoolYear: string; period: ResetPeriodKey }) {
    return (
      await api.post<ResetEnvelope<ResetPreview>>(
        "/admin/system-reset/preview",
        target,
      )
    ).data;
  },
  async execute(payload: ExecuteSystemReset) {
    return (
      await api.post<
        ResetEnvelope<{
          operationId: string;
          phase: string;
          status: "running";
          acceptedAt: string;
        }>
      >("/admin/system-reset/execute", payload, noSessionRefresh)
    ).data;
  },
  async getOperation(id: string) {
    return (
      await api.get<ResetEnvelope<ResetOperation>>(
        `/admin/system-reset/operations/${encodeURIComponent(id)}`,
        { skipSessionExpiredRedirect: true } as ApiRequestConfig,
      )
    ).data;
  },
  async getPublicStatus() {
    return (
      await api.get<ResetEnvelope<ResetPublicStatus>>("/system-maintenance", {
        ...noSessionRefresh,
        headers: { "Cache-Control": "no-cache" },
      })
    ).data;
  },
};
