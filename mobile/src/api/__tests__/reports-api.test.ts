import { apiClient } from "../client";
import { reportsApi } from "../services/reports";

jest.mock("../client", () => ({ apiClient: { get: jest.fn() } }));

it("requests the protected server-generated CSV rather than flattening visible rows", async () => {
  (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: "student,score\nAna,90", headers: { "content-disposition": 'attachment; filename="student-performance.csv"' } });
  await expect(reportsApi.exportCsv("student-performance", { classId: "c", page: 2, limit: 20 })).resolves.toEqual({ csv: "student,score\nAna,90", fileName: "student-performance.csv" });
  expect(apiClient.get).toHaveBeenCalledWith("/reports/student-performance", { params: { classId: "c", page: undefined, limit: undefined, export: "csv" }, responseType: "text" });
});
