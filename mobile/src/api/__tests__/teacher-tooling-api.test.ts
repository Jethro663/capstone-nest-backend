import { apiClient } from "../client";
import { assessmentsApi } from "../services/assessments";
import { lessonsApi } from "../services/lessons";
import { modulesApi } from "../services/modules";

jest.mock("../client", () => ({ apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() } }));
jest.mock("../services/protected-files", () => ({ downloadProtectedFile: jest.fn(), openLocalFile: jest.fn() }));

describe("teacher lifecycle contract adapters", () => {
  beforeEach(() => jest.clearAllMocks());

  it("uses lesson version, bulk, reorder, and delete endpoints", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ data: { data: [] } });
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { data: [] } });
    (apiClient.put as jest.Mock).mockResolvedValue({ data: { data: [] } });
    (apiClient.delete as jest.Mock).mockResolvedValue({});
    await lessonsApi.getVersions("l");
    await lessonsApi.createVersion("l", { label: "Before edit" });
    await lessonsApi.restoreVersion("l", "v");
    await lessonsApi.bulkDelete("c", { lessonIds: ["l"] });
    await lessonsApi.reorderByClass("c", { lessons: [{ id: "l", order: 1 }] });
    await lessonsApi.delete("l");
    expect(apiClient.post).toHaveBeenCalledWith("/lessons/l/versions/v/restore", {});
    expect(apiClient.delete).toHaveBeenCalledWith("/lessons/l");
  });

  it("uses module configuration and guarded core release endpoints", async () => {
    (apiClient.patch as jest.Mock).mockResolvedValue({ data: { data: {} } });
    (apiClient.put as jest.Mock).mockResolvedValue({ data: { data: [] } });
    await modulesApi.updateSection("s", { title: "Updated" });
    await modulesApi.releaseCoreModule("m", { isVisible: true });
    await modulesApi.releaseCoreItem("i", { isGiven: true });
    await modulesApi.replaceGradingScale("m", { entries: [{ letter: "A", label: "Excellent", minScore: 90, maxScore: 100 }] });
    expect(apiClient.patch).toHaveBeenCalledWith("/modules/m/core-release", { isVisible: true });
    expect(apiClient.put).toHaveBeenCalledWith("/modules/m/grading-scale", expect.any(Object));
  });

  it("uses server bulk return and analytics endpoints", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ data: { data: {} } });
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { data: {} } });
    await assessmentsApi.getStats("a");
    await assessmentsApi.getQuestionAnalytics("a");
    await assessmentsApi.returnAllGrades("a");
    await assessmentsApi.bulkReturnGrades({ attemptIds: ["t"] });
    expect(apiClient.post).toHaveBeenCalledWith("/assessments/a/return-all", { teacherFeedback: undefined });
    expect(apiClient.post).toHaveBeenCalledWith("/assessments/attempts/bulk-return", { attemptIds: ["t"], teacherFeedback: undefined });
  });
});
