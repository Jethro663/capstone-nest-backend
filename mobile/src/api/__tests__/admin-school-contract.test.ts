import { apiClient } from "../client";
import { adminApi } from "../services/admin";
import { classesApi } from "../services/classes";
import { sectionsApi } from "../services/sections";

jest.mock("../client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe("administrator school-setup service parity", () => {
  beforeEach(() => jest.clearAllMocks());

  it("exposes user monitoring, export, bulk lifecycle, and purge contracts", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { success: true, data: { data: [] } },
    });
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { success: true, data: {} },
    });
    (apiClient.delete as jest.Mock).mockResolvedValue({
      data: { success: true },
    });
    await adminApi.getMonitoringPage({ page: 2, limit: 25, search: "Juan" });
    await adminApi.exportUser("user-1");
    await adminApi.bulkUserLifecycle({
      action: "suspend",
      userIds: ["user-1"],
    });
    await adminApi.purgeUser("user-1");
    expect(apiClient.get).toHaveBeenNthCalledWith(
      1,
      "/users/reports/monitoring",
      { params: { page: 2, limit: 25, search: "Juan" } },
    );
    expect(apiClient.get).toHaveBeenNthCalledWith(2, "/users/user-1/export");
    expect(apiClient.post).toHaveBeenCalledWith("/users/bulk/lifecycle", {
      action: "suspend",
      userIds: ["user-1"],
    });
    expect(apiClient.delete).toHaveBeenCalledWith("/users/user-1/purge");
  });

  it("exposes class bulk and visibility actions", async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { success: true, data: {} },
    });
    (apiClient.patch as jest.Mock).mockResolvedValue({
      data: { success: true, data: {} },
    });
    await classesApi.bulkLifecycle({
      action: "restore",
      classIds: ["class-1"],
    });
    await classesApi.hide("class-1");
    await classesApi.unhide("class-1");
    expect(apiClient.post).toHaveBeenCalledWith("/classes/bulk/lifecycle", {
      action: "restore",
      classIds: ["class-1"],
    });
    expect(apiClient.patch).toHaveBeenNthCalledWith(1, "/classes/class-1/hide");
    expect(apiClient.patch).toHaveBeenNthCalledWith(
      2,
      "/classes/class-1/unhide",
    );
  });

  it("exposes section restore, bulk, visibility, and compatibility actions", async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { success: true, data: {} },
    });
    (apiClient.put as jest.Mock).mockResolvedValue({
      data: { success: true, data: {} },
    });
    (apiClient.patch as jest.Mock).mockResolvedValue({
      data: { success: true, data: {} },
    });
    await sectionsApi.restore("section-1");
    await sectionsApi.bulkLifecycle({
      action: "restore",
      sectionIds: ["section-1"],
    });
    await sectionsApi.hide("section-1");
    await sectionsApi.unhide("section-1");
    expect(apiClient.put).toHaveBeenCalledWith("/sections/section-1/restore");
    expect(apiClient.post).toHaveBeenCalledWith("/sections/bulk/lifecycle", {
      action: "restore",
      sectionIds: ["section-1"],
    });
    expect(apiClient.patch).toHaveBeenNthCalledWith(
      1,
      "/sections/section-1/hide",
    );
    expect(apiClient.patch).toHaveBeenNthCalledWith(
      2,
      "/sections/section-1/unhide",
    );
  });
});
