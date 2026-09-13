import { api } from "@/lib/api-client";
import { adminLifecycleService } from "./admin-lifecycle-service";

jest.mock("@/lib/api-client", () => ({
  api: { post: jest.fn(), get: jest.fn() },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe("adminLifecycleService", () => {
  beforeEach(() => jest.resetAllMocks());

  it.each([
    ["previewStudent", "/admin/maintenance/students/preview"],
    ["executeStudent", "/admin/maintenance/students/execute"],
    ["previewClass", "/admin/maintenance/classes/preview"],
    ["executeClass", "/admin/maintenance/classes/execute"],
    ["previewSection", "/admin/maintenance/sections/preview"],
    ["executeSection", "/admin/maintenance/sections/execute"],
    ["previewPurge", "/admin/maintenance/purge/preview"],
    ["executePurge", "/admin/maintenance/purge/execute"],
  ] as const)("posts %s to the governed endpoint", async (method, path) => {
    mockedApi.post.mockResolvedValue({ data: { success: true, data: {} } });
    const payload = { targetId: "target" };
    await (
      adminLifecycleService[method] as (input: unknown) => Promise<unknown>
    )(payload);
    expect(mockedApi.post).toHaveBeenCalledWith(path, payload);
  });

  it("retrieves a redacted operation result", async () => {
    mockedApi.get.mockResolvedValue({ data: { success: true, data: {} } });
    await adminLifecycleService.getOperation("operation-id");
    expect(mockedApi.get).toHaveBeenCalledWith(
      "/admin/maintenance/operations/operation-id",
    );
  });
});
