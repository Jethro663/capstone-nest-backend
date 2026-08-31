import { classRecordApi } from "../services/class-record";
import { apiClient } from "../client";

jest.mock("../client", () => ({ apiClient: { get: jest.fn() } }));

it("retains readiness and preview evidence instead of treating the response as an array", async () => {
  const evidence = {
    classRecordId: "record",
    readiness: { ready: true, blockers: [], eligibleStudentIds: ["student"] },
    preview: [{ studentId: "student", initialGrade: 0, quarterlyGrade: 60 }],
    interventionCount: 1,
  };
  (apiClient.get as jest.Mock).mockResolvedValue({
    data: { success: true, data: evidence },
  });
  expect(await classRecordApi.previewGrades("record")).toEqual(evidence);
});
