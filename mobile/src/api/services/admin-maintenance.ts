import { apiClient } from "../client";
import type {
  AdminMaintenanceResponse,
  AdminMaintenanceStatus,
  OpenAdminMaintenanceSession,
} from "../../types/admin-maintenance";

async function statusRequest(
  request: Promise<{
    data: AdminMaintenanceResponse<AdminMaintenanceStatus>;
  }>,
) {
  return (await request).data.data;
}

export const adminMaintenanceApi = {
  getStatus: () =>
    statusRequest(
      apiClient.get<AdminMaintenanceResponse<AdminMaintenanceStatus>>(
        "/admin/maintenance/session",
      ),
    ),
  open: (payload: OpenAdminMaintenanceSession) =>
    statusRequest(
      apiClient.post<AdminMaintenanceResponse<AdminMaintenanceStatus>>(
        "/admin/maintenance/session",
        payload,
      ),
    ),
  close: () =>
    statusRequest(
      apiClient.delete<AdminMaintenanceResponse<AdminMaintenanceStatus>>(
        "/admin/maintenance/session",
      ),
    ),
};
