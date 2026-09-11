import { apiClient } from "../client";
import type {
  ActivateAdminDemoMode,
  AdminDemoModeResponse,
  AdminDemoModeStatus,
  DeactivateAdminDemoMode,
} from "../../types/admin-demo-mode";

async function statusRequest(
  request: Promise<{ data: AdminDemoModeResponse<AdminDemoModeStatus> }>,
) {
  return (await request).data.data;
}

export const adminDemoModeApi = {
  getStatus: () =>
    statusRequest(
      apiClient.get<AdminDemoModeResponse<AdminDemoModeStatus>>(
        "/admin/demo-mode",
      ),
    ),
  activate: (payload: ActivateAdminDemoMode) =>
    statusRequest(
      apiClient.post<AdminDemoModeResponse<AdminDemoModeStatus>>(
        "/admin/demo-mode/activate",
        payload,
      ),
    ),
  deactivate: (payload: DeactivateAdminDemoMode) =>
    statusRequest(
      apiClient.post<AdminDemoModeResponse<AdminDemoModeStatus>>(
        "/admin/demo-mode/deactivate",
        payload,
      ),
    ),
};
