import { apiClient, publicClient } from "../client";
import { systemResetApi } from "../services/system-reset";

jest.mock("../client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
  publicClient: { get: jest.fn() },
}));

it("uses authenticated reset contracts and public maintenance after session invalidation", async () => {
  const envelope = {
    data: { success: true, message: "OK", data: { operationId: "one" } },
  };
  (apiClient.get as jest.Mock).mockResolvedValue(envelope);
  (apiClient.post as jest.Mock).mockResolvedValue(envelope);
  (publicClient.get as jest.Mock).mockResolvedValue(envelope);
  expect(await systemResetApi.capability()).toEqual({ operationId: "one" });
  await systemResetApi.policy("2026-2027");
  await systemResetApi.preview({ schoolYear: "2026-2027", period: "T1" });
  const payload = {
    previewToken: "preview",
    idempotencyKey: "id",
    reason: "Reviewed removal",
    currentPassword: "secret",
    confirmation: "exact",
    acknowledgements: ["A"],
  };
  await systemResetApi.execute(payload);
  await systemResetApi.operation("one");
  await systemResetApi.maintenance();
  expect(apiClient.get).toHaveBeenCalledWith("/admin/system-reset");
  expect(apiClient.get).toHaveBeenCalledWith("/admin/system-reset/policy", {
    params: { schoolYear: "2026-2027" },
  });
  expect(apiClient.post).toHaveBeenCalledWith("/admin/system-reset/preview", {
    schoolYear: "2026-2027",
    period: "T1",
  });
  expect(apiClient.post).toHaveBeenCalledWith(
    "/admin/system-reset/execute",
    payload,
  );
  expect(apiClient.get).toHaveBeenCalledWith(
    "/admin/system-reset/operations/one",
  );
  expect(publicClient.get).toHaveBeenCalledWith("/system-maintenance");
  expect(apiClient.get).not.toHaveBeenCalledWith("/system-maintenance");
});
