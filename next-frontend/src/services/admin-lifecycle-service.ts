import { api } from "@/lib/api-client";
import type {
  AdminLifecycleExecutionEvidence,
  AdminLifecycleExecutionResult,
  AdminErasureBatchPreview,
  AdminErasureExecutionResult,
  AdminLifecyclePreview,
  AdminLifecycleResponse,
  PreviewClassLifecycleInput,
  PreviewPurgeLifecycleInput,
  PreviewPurgeBatchInput,
  ExecutePurgeBatchInput,
  PreviewSectionLifecycleInput,
  PreviewStudentLifecycleInput,
} from "@/types/admin-lifecycle";

type Execute<T> = T & AdminLifecycleExecutionEvidence;

async function post<T>(path: string, payload: unknown) {
  const { data } = await api.post<AdminLifecycleResponse<T>>(path, payload);
  return data;
}

export const adminLifecycleService = {
  previewStudent: (input: PreviewStudentLifecycleInput) =>
    post<AdminLifecyclePreview>("/admin/maintenance/students/preview", input),
  executeStudent: (input: Execute<PreviewStudentLifecycleInput>) =>
    post<AdminLifecycleExecutionResult>(
      "/admin/maintenance/students/execute",
      input,
    ),
  previewClass: (input: PreviewClassLifecycleInput) =>
    post<AdminLifecyclePreview>("/admin/maintenance/classes/preview", input),
  executeClass: (input: Execute<PreviewClassLifecycleInput>) =>
    post<AdminLifecycleExecutionResult>(
      "/admin/maintenance/classes/execute",
      input,
    ),
  previewSection: (input: PreviewSectionLifecycleInput) =>
    post<AdminLifecyclePreview>("/admin/maintenance/sections/preview", input),
  executeSection: (input: Execute<PreviewSectionLifecycleInput>) =>
    post<AdminLifecycleExecutionResult>(
      "/admin/maintenance/sections/execute",
      input,
    ),
  previewPurge: (input: PreviewPurgeLifecycleInput) =>
    post<AdminLifecyclePreview>("/admin/maintenance/purge/preview", input),
  executePurge: (input: Execute<PreviewPurgeLifecycleInput>) =>
    post<AdminLifecycleExecutionResult>(
      "/admin/maintenance/purge/execute",
      input,
    ),
  previewPurgeBatch: (input: PreviewPurgeBatchInput) =>
    post<AdminErasureBatchPreview>(
      "/admin/maintenance/purge/batch/preview",
      input,
    ),
  executePurgeBatch: (input: ExecutePurgeBatchInput) =>
    post<AdminErasureExecutionResult>(
      "/admin/maintenance/purge/batch/execute",
      input,
    ),
  retryErasureCleanup: (operationId: string) =>
    post<Record<string, unknown>>(
      `/admin/maintenance/operations/${operationId}/retry-cleanup`,
      {},
    ),
  async getOperation(operationId: string) {
    const { data } = await api.get<
      AdminLifecycleResponse<Record<string, unknown>>
    >(`/admin/maintenance/operations/${operationId}`);
    return data;
  },
};
