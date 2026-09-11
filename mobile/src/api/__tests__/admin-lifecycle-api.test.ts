import { apiClient } from "../client";
import { adminLifecycleApi } from "../services/admin-lifecycle";
import type {
  AdminLifecycleExecutionEvidence,
  PreviewClassLifecycleInput,
} from "../../types/admin-lifecycle";

jest.mock("../client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

describe("administrator governed lifecycle API", () => {
  beforeEach(() => jest.clearAllMocks());

  it("uses the same class preview and execute contracts as web", async () => {
    const input: PreviewClassLifecycleInput = {
      classId: "00000000-0000-4000-8000-000000000001",
      resolution: "COMPLETE",
      effectivePeriod: "Q3",
    };
    const evidence: AdminLifecycleExecutionEvidence = {
      manifestHash: "a".repeat(64),
      manifestExpiresAt: "2026-09-11T14:00:00.000Z",
      currentPassword: "Current@123",
      reasonCode: "COMPLETED",
      notes: "Annual class completion reviewed.",
      confirmations: ["PRESERVE_OFFICIAL_RECORDS"],
      idempotencyKey: "00000000-0000-4000-8000-000000000002",
    };
    (apiClient.post as jest.Mock)
      .mockResolvedValueOnce({
        data: { success: true, data: { manifest: {} } },
      })
      .mockResolvedValueOnce({
        data: { success: true, data: { operationId: "op" } },
      });

    await adminLifecycleApi.previewClass(input);
    await adminLifecycleApi.executeClass({ ...input, ...evidence });

    expect(apiClient.post).toHaveBeenNthCalledWith(
      1,
      "/admin/lifecycle/classes/preview",
      input,
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(
      2,
      "/admin/lifecycle/classes/execute",
      { ...input, ...evidence },
    );
  });

  it("supports section, student, purge, and receipt retrieval endpoints", async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { success: true, data: {} },
    });
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { success: true, data: {} },
    });

    await adminLifecycleApi.previewStudent({
      studentId: "00000000-0000-4000-8000-000000000001",
      sectionId: "00000000-0000-4000-8000-000000000002",
      resolution: "WITHDRAW",
      effectivePeriod: "Q3",
    });
    await adminLifecycleApi.previewSection({
      sectionId: "00000000-0000-4000-8000-000000000002",
      effectivePeriod: "Q3",
      studentResolutions: [],
    });
    await adminLifecycleApi.previewPurge({
      targetType: "SECTION",
      targetId: "00000000-0000-4000-8000-000000000002",
    });
    await adminLifecycleApi.getOperation(
      "00000000-0000-4000-8000-000000000003",
    );

    expect(apiClient.post).toHaveBeenNthCalledWith(
      1,
      "/admin/lifecycle/students/preview",
      expect.any(Object),
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(
      2,
      "/admin/lifecycle/sections/preview",
      expect.any(Object),
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(
      3,
      "/admin/lifecycle/purge/preview",
      expect.any(Object),
    );
    expect(apiClient.get).toHaveBeenCalledWith(
      "/admin/lifecycle/operations/00000000-0000-4000-8000-000000000003",
    );
  });
});
