import { api } from "@/lib/api-client";
import type {
  AdminMaintenanceStatus,
  ApiEnvelope,
  OpenAdminMaintenanceSession,
} from "@/types/admin-maintenance";

async function statusRequest(
  request: Promise<{ data: ApiEnvelope<AdminMaintenanceStatus> }>,
) {
  const response = await request;
  return response.data.data;
}

export const adminMaintenanceService = {
  getStatus: () =>
    statusRequest(
      api.get<ApiEnvelope<AdminMaintenanceStatus>>(
        "/admin/maintenance/session",
      ),
    ),
  open: (payload: OpenAdminMaintenanceSession) =>
    statusRequest(
      api.post<ApiEnvelope<AdminMaintenanceStatus>>(
        "/admin/maintenance/session",
        payload,
      ),
    ),
  close: () =>
    statusRequest(
      api.delete<ApiEnvelope<AdminMaintenanceStatus>>(
        "/admin/maintenance/session",
      ),
    ),
};
