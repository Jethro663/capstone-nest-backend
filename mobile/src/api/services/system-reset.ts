import { apiClient, publicClient } from "../client";
import type {
  ExecuteReset,
  ResetAccepted,
  ResetCapability,
  ResetMaintenance,
  ResetOperation,
  ResetPolicy,
  ResetPreview,
  ResetResponse,
  ResetTarget,
} from "../../types/system-reset";

async function data<T>(
  request: Promise<{ data: ResetResponse<T> }>,
): Promise<T> {
  return (await request).data.data;
}

export const systemResetApi = {
  capability: () =>
    data(apiClient.get<ResetResponse<ResetCapability>>("/admin/system-reset")),
  policy: (schoolYear: string) =>
    data(
      apiClient.get<ResetResponse<{ policy: ResetPolicy }>>(
        "/admin/system-reset/policy",
        { params: { schoolYear } },
      ),
    ),
  preview: (target: ResetTarget) =>
    data(
      apiClient.post<ResetResponse<ResetPreview>>(
        "/admin/system-reset/preview",
        target,
      ),
    ),
  execute: (input: ExecuteReset) =>
    data(
      apiClient.post<ResetResponse<ResetAccepted>>(
        "/admin/system-reset/execute",
        input,
      ),
    ),
  operation: (id: string) =>
    data(
      apiClient.get<ResetResponse<ResetOperation>>(
        `/admin/system-reset/operations/${encodeURIComponent(id)}`,
      ),
    ),
  maintenance: () =>
    data(
      publicClient.get<ResetResponse<ResetMaintenance>>("/system-maintenance"),
    ),
};
