import { apiClient } from "../client";
import { fileUploadApi } from "../services/file-upload";

jest.mock("../services/protected-files", () => ({ downloadProtectedFile: jest.fn() }));
jest.mock("../client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("fileUploadApi contract parity", () => {
  beforeEach(() => jest.clearAllMocks());

  it("preserves file pagination and loads all pages for existing consumers", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: `file-${index + 1}`,
      originalName: `File ${index + 1}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: 100,
    }));
    const secondPage = [{ id: "file-101", originalName: "File 101.pdf", mimeType: "application/pdf", sizeBytes: 100 }];
    mockedApiClient.get
      .mockResolvedValueOnce({ data: { success: true, data: firstPage, total: 101, page: 1, limit: 100, totalPages: 2 } })
      .mockResolvedValueOnce({ data: { success: true, data: secondPage, total: 101, page: 2, limit: 100, totalPages: 2 } });

    const result = await fileUploadApi.getAllPage({ classId: "class-1", search: "File" });

    expect(result.data).toHaveLength(101);
    expect(result.total).toBe(101);
    expect(mockedApiClient.get).toHaveBeenNthCalledWith(1, "/files", { params: { classId: "class-1", search: "File", page: 1, limit: 100 } });
    expect(mockedApiClient.get).toHaveBeenNthCalledWith(2, "/files", { params: { classId: "class-1", search: "File", page: 2, limit: 100 } });
  });

  it("exposes folder, storage-summary, and retry-index contracts", async () => {
    mockedApiClient.get
      .mockResolvedValueOnce({ data: { success: true, data: [{ id: "folder-1", name: "Quarter 1", ownerId: "teacher-1", scope: "private" }] } })
      .mockResolvedValueOnce({ data: { success: true, data: { totalFiles: 4, totalBytes: 1024, totalMB: 0.001, totalGB: 0 } } });
    mockedApiClient.post.mockResolvedValue({ data: { success: true, data: { id: "file-1", originalName: "Quiz.pdf", mimeType: "application/pdf", sizeBytes: 100, indexStatus: "pending" } } });

    const folders = await fileUploadApi.getFolders({ scope: "private" });
    const storage = await fileUploadApi.getStorageSummary();
    const retried = await fileUploadApi.retryIndex("file-1");

    expect(folders[0].name).toBe("Quarter 1");
    expect(storage.totalFiles).toBe(4);
    expect(retried.indexStatus).toBe("pending");
    expect(mockedApiClient.post).toHaveBeenCalledWith("/files/file-1/index/retry");
  });
});
