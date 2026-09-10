import { api } from "@/lib/api-client";
import { adminLifecycleService } from "./admin-lifecycle-service";

jest.mock("@/lib/api-client", () => ({
  api: { post: jest.fn(), get: jest.fn() },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe("adminLifecycleService", () => {
  beforeEach(() => jest.resetAllMocks());

  it.each([
    ["previewStudent", "/admin/lifecycle/students/preview"],
    ["executeStudent", "/admin/lifecycle/students/execute"],
    ["previewClass", "/admin/lifecycle/classes/preview"],
    ["executeClass", "/admin/lifecycle/classes/execute"],
    ["previewSection", "/admin/lifecycle/sections/preview"],
    ["executeSection", "/admin/lifecycle/sections/execute"],
    ["previewPurge", "/admin/lifecycle/purge/preview"],
    ["executePurge", "/admin/lifecycle/purge/execute"],
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
      "/admin/lifecycle/operations/operation-id",
    );
  });
});
