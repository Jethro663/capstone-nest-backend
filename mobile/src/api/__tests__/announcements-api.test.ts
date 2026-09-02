import { apiClient } from "../client";
import { announcementsApi } from "../services/announcements";

jest.mock("../client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("announcementsApi pagination", () => {
  beforeEach(() => jest.clearAllMocks());

  it("loads all class announcement pages without presenting the first page as complete", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: `announcement-${index + 1}`,
      classId: "class-1",
      authorId: "teacher-1",
      title: `Announcement ${index + 1}`,
      content: "Update",
      isPinned: false,
      isVisible: true,
      createdAt: "2026-09-02T00:00:00.000Z",
    }));
    const secondPage = [{
      id: "announcement-101",
      classId: "class-1",
      authorId: "teacher-1",
      title: "Announcement 101",
      content: "Update",
      isPinned: false,
      isVisible: true,
      createdAt: "2026-09-02T00:00:00.000Z",
    }];
    mockedApiClient.get
      .mockResolvedValueOnce({ data: { success: true, data: firstPage } })
      .mockResolvedValueOnce({ data: { success: true, data: secondPage } });

    const result = await announcementsApi.getAllByClass("class-1");

    expect(result.data).toHaveLength(101);
    expect(result.total).toBe(101);
    expect(mockedApiClient.get).toHaveBeenNthCalledWith(1, "/classes/class-1/announcements", { params: { page: 1, limit: 100 } });
    expect(mockedApiClient.get).toHaveBeenNthCalledWith(2, "/classes/class-1/announcements", { params: { page: 2, limit: 100 } });
  });
});
