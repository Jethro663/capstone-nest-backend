import { apiClient } from "../client";
import type {
  AdminLifecycleExecutionResult,
  AdminErasureBatchPreview,
  AdminErasureExecutionResult,
  AdminLifecyclePreview,
  AdminLifecycleResponse,
  ExecuteLifecycleInput,
  PreviewClassLifecycleInput,
  PreviewPurgeLifecycleInput,
  PreviewPurgeBatchInput,
  PreviewSectionLifecycleInput,
  PreviewStudentLifecycleInput,
} from "../../types/admin-lifecycle";

async function post<T>(path: string, payload: unknown) {
  const response = await apiClient.post<AdminLifecycleResponse<T>>(
    path,
    payload,
  );
  return response.data;
}

export const adminLifecycleApi = {
  previewStudent: (input: PreviewStudentLifecycleInput) =>
    post<AdminLifecyclePreview>("/admin/maintenance/students/preview", input),
  executeStudent: (
    input: ExecuteLifecycleInput<PreviewStudentLifecycleInput>,
  ) =>
    post<AdminLifecycleExecutionResult>(
      "/admin/maintenance/students/execute",
      input,
    ),
  previewClass: (input: PreviewClassLifecycleInput) =>
    post<AdminLifecyclePreview>("/admin/maintenance/classes/preview", input),
  executeClass: (input: ExecuteLifecycleInput<PreviewClassLifecycleInput>) =>
    post<AdminLifecycleExecutionResult>(
      "/admin/maintenance/classes/execute",
      input,
    ),
  previewSection: (input: PreviewSectionLifecycleInput) =>
    post<AdminLifecyclePreview>("/admin/maintenance/sections/preview", input),
  executeSection: (
    input: ExecuteLifecycleInput<PreviewSectionLifecycleInput>,
  ) =>
    post<AdminLifecycleExecutionResult>(
      "/admin/maintenance/sections/execute",
      input,
    ),
  previewPurge: (input: PreviewPurgeLifecycleInput) =>
    post<AdminLifecyclePreview>("/admin/maintenance/purge/preview", input),
  executePurge: (input: ExecuteLifecycleInput<PreviewPurgeLifecycleInput>) =>
    post<AdminLifecycleExecutionResult>(
      "/admin/maintenance/purge/execute",
      input,
    ),
  previewPurgeBatch: (input: PreviewPurgeBatchInput) =>
    post<AdminErasureBatchPreview>(
      "/admin/maintenance/purge/batch/preview",
      input,
    ),
  // CASCADE_ERASE is intentionally web-admin-only in this release.
  // Mobile accepts the additive contract for compatibility and status display.
  getErasureOperation: async (operationId: string) => {
    const response = await apiClient.get<
      AdminLifecycleResponse<AdminErasureExecutionResult>
    >(`/admin/maintenance/operations/${operationId}`);
    return response.data;
  },
  async getOperation(operationId: string) {
    const response = await apiClient.get<
      AdminLifecycleResponse<Record<string, unknown>>
    >(`/admin/maintenance/operations/${operationId}`);
    return response.data;
  },
};
