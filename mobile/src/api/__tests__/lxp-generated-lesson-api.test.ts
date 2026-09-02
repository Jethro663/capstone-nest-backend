import { apiClient } from "../client";
import { lxpApi } from "../services/lxp";

jest.mock("../client", () => ({ apiClient: { get: jest.fn() } }));

it("loads a generated remedial lesson from its backend-owned checkpoint", async () => {
  const fixture = { assignmentId: "a", caseId: "case", status: "active", checkpointLabel: "Review", generatedLesson: { id: "g", title: "Fractions", lessonBody: "Body", weakConcepts: ["denominators"] } };
  (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { success: true, data: fixture } });
  await expect(lxpApi.getGeneratedLesson("class", "a")).resolves.toEqual(fixture);
  expect(apiClient.get).toHaveBeenCalledWith("/lxp/me/playlist/class/generated-lessons/a");
});
