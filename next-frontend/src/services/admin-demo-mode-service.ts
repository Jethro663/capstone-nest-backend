import { api } from "@/lib/api-client";
import type {
  ActivateAdminDemoMode,
  AdminDemoModeStatus,
  ApiEnvelope,
  DeactivateAdminDemoMode,
} from "@/types/admin-demo-mode";

async function statusRequest(
  request: Promise<{ data: ApiEnvelope<AdminDemoModeStatus> }>,
) {
  const response = await request;
  return response.data.data;
}

export const adminDemoModeService = {
  getStatus: () =>
    statusRequest(
      api.get<ApiEnvelope<AdminDemoModeStatus>>("/admin/demo-mode"),
    ),
  activate: (payload: ActivateAdminDemoMode) =>
    statusRequest(
      api.post<ApiEnvelope<AdminDemoModeStatus>>(
        "/admin/demo-mode/activate",
        payload,
      ),
    ),
  deactivate: (payload: DeactivateAdminDemoMode) =>
    statusRequest(
      api.post<ApiEnvelope<AdminDemoModeStatus>>(
        "/admin/demo-mode/deactivate",
        payload,
      ),
    ),
};
