import { apiClient } from "../client";
import { classesApi } from "../services/classes";
import { sectionsApi } from "../services/sections";

jest.mock("../client", () => ({
  apiClient: { get: jest.fn() },
}));

const getMock = apiClient.get as jest.Mock;

describe("admin list pagination adapters", () => {
  beforeEach(() => getMock.mockReset());

  it("loads every class page instead of treating the first 100 as complete", async () => {
    getMock
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: { data: Array.from({ length: 100 }, (_, index) => ({ id: `class-${index}` })), total: 101, page: 1, limit: 100 },
        },
      })
      .mockResolvedValueOnce({
        data: { success: true, data: { data: [{ id: "class-100" }], total: 101, page: 2, limit: 100 } },
      });

    const result = await classesApi.getAll();

    expect(result).toHaveLength(101);
    expect(getMock).toHaveBeenNthCalledWith(2, "/classes/all", { params: { page: 2, limit: 100 } });
  });

  it("loads every section page using the controller pagination envelope", async () => {
    getMock
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: Array.from({ length: 100 }, (_, index) => ({ id: `section-${index}` })),
          pagination: { page: 1, limit: 100, total: 101, totalPages: 2 },
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: [{ id: "section-100" }],
          pagination: { page: 2, limit: 100, total: 101, totalPages: 2 },
        },
      });

    const result = await sectionsApi.getAll();

    expect(result.data).toHaveLength(101);
    expect(result.pagination?.total).toBe(101);
    expect(getMock).toHaveBeenNthCalledWith(2, "/sections/all", { params: { page: 2, limit: 100 } });
  });
});
