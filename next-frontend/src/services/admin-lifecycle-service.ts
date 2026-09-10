import { api } from "@/lib/api-client";
import type {
  AdminLifecycleExecutionEvidence,
  AdminLifecycleExecutionResult,
  AdminLifecyclePreview,
  AdminLifecycleResponse,
  PreviewClassLifecycleInput,
  PreviewPurgeLifecycleInput,
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
    post<AdminLifecyclePreview>("/admin/lifecycle/students/preview", input),
  executeStudent: (input: Execute<PreviewStudentLifecycleInput>) =>
    post<AdminLifecycleExecutionResult>(
      "/admin/lifecycle/students/execute",
      input,
    ),
  previewClass: (input: PreviewClassLifecycleInput) =>
    post<AdminLifecyclePreview>("/admin/lifecycle/classes/preview", input),
  executeClass: (input: Execute<PreviewClassLifecycleInput>) =>
    post<AdminLifecycleExecutionResult>(
      "/admin/lifecycle/classes/execute",
      input,
    ),
  previewSection: (input: PreviewSectionLifecycleInput) =>
    post<AdminLifecyclePreview>("/admin/lifecycle/sections/preview", input),
  executeSection: (input: Execute<PreviewSectionLifecycleInput>) =>
    post<AdminLifecycleExecutionResult>(
      "/admin/lifecycle/sections/execute",
      input,
    ),
  previewPurge: (input: PreviewPurgeLifecycleInput) =>
    post<AdminLifecyclePreview>("/admin/lifecycle/purge/preview", input),
  executePurge: (input: Execute<PreviewPurgeLifecycleInput>) =>
    post<AdminLifecycleExecutionResult>(
      "/admin/lifecycle/purge/execute",
      input,
    ),
  async getOperation(operationId: string) {
    const { data } = await api.get<
      AdminLifecycleResponse<Record<string, unknown>>
    >(`/admin/lifecycle/operations/${operationId}`);
    return data;
  },
};
