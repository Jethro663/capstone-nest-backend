import { api } from "@/lib/api-client";
import { assessmentService } from "./assessment-service";
jest.mock("@/lib/api-client", () => ({ api: { post: jest.fn() } }));
const request = {
  mutationId: "mutation",
  classId: "class",
  action: "save" as const,
  settings: {
    title: "Portfolio",
    type: "file_upload" as const,
    quarter: "Q1" as const,
  },
  questions: [],
};

describe("assignment creation recovery", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });
  it("persists exact uncertain request and retries with the same identity", async () => {
    jest.mocked(api.post).mockRejectedValueOnce(new Error("Network lost"));
    await expect(
      assessmentService.createFromSetup("teacher", request),
    ).rejects.toThrow("Network lost");
    expect(assessmentService.getPendingCreation("teacher", "class")).toEqual(
      request,
    );
    expect(assessmentService.getPendingCreation("other", "class")).toBeNull();
    jest
      .mocked(api.post)
      .mockResolvedValueOnce({
        data: { success: true, data: { assessment: { id: "saved" } } },
      });
    await assessmentService.createFromSetup("teacher", request);
    expect(api.post).toHaveBeenLastCalledWith("/assessments/editor", request);
    expect(assessmentService.getPendingCreation("teacher", "class")).toBeNull();
  });
  it("does not silently submit different inputs over an uncertain request", async () => {
    jest.mocked(api.post).mockRejectedValueOnce(new Error("Network lost"));
    await expect(
      assessmentService.createFromSetup("teacher", request),
    ).rejects.toThrow();
    await expect(
      assessmentService.createFromSetup("teacher", {
        ...request,
        mutationId: "other",
      }),
    ).rejects.toThrow("previous");
    expect(api.post).toHaveBeenCalledTimes(1);
  });
  it("clears a definitely rejected request so the teacher can fix placement", async () => {
    jest.mocked(api.post).mockRejectedValueOnce({ response: { status: 409 } });
    await expect(
      assessmentService.createFromSetup("teacher", request),
    ).rejects.toBeDefined();
    expect(assessmentService.getPendingCreation("teacher", "class")).toBeNull();
  });
});
