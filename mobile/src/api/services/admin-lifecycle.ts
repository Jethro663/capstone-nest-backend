import { apiClient } from "../client";
import type {
  AdminLifecycleExecutionResult,
  AdminLifecyclePreview,
  AdminLifecycleResponse,
  ExecuteLifecycleInput,
  PreviewClassLifecycleInput,
  PreviewPurgeLifecycleInput,
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
    post<AdminLifecyclePreview>("/admin/lifecycle/students/preview", input),
  executeStudent: (
    input: ExecuteLifecycleInput<PreviewStudentLifecycleInput>,
  ) =>
    post<AdminLifecycleExecutionResult>(
      "/admin/lifecycle/students/execute",
      input,
    ),
  previewClass: (input: PreviewClassLifecycleInput) =>
    post<AdminLifecyclePreview>("/admin/lifecycle/classes/preview", input),
  executeClass: (input: ExecuteLifecycleInput<PreviewClassLifecycleInput>) =>
    post<AdminLifecycleExecutionResult>(
      "/admin/lifecycle/classes/execute",
      input,
    ),
  previewSection: (input: PreviewSectionLifecycleInput) =>
    post<AdminLifecyclePreview>("/admin/lifecycle/sections/preview", input),
  executeSection: (
    input: ExecuteLifecycleInput<PreviewSectionLifecycleInput>,
  ) =>
    post<AdminLifecycleExecutionResult>(
      "/admin/lifecycle/sections/execute",
      input,
    ),
  previewPurge: (input: PreviewPurgeLifecycleInput) =>
    post<AdminLifecyclePreview>("/admin/lifecycle/purge/preview", input),
  executePurge: (input: ExecuteLifecycleInput<PreviewPurgeLifecycleInput>) =>
    post<AdminLifecycleExecutionResult>(
      "/admin/lifecycle/purge/execute",
      input,
    ),
  async getOperation(operationId: string) {
    const response = await apiClient.get<
      AdminLifecycleResponse<Record<string, unknown>>
    >(`/admin/lifecycle/operations/${operationId}`);
    return response.data;
  },
};
