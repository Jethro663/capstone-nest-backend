import { apiClient } from "../client";
import { notificationsApi } from "../services/notifications";

jest.mock("../client", () => ({ apiClient: { patch: jest.fn() } }));

it("uses the backend read-all mutation and never converts failure into success", async () => {
  (apiClient.patch as jest.Mock).mockRejectedValueOnce(new Error("offline"));
  await expect(notificationsApi.markAllRead()).rejects.toThrow("offline");
  expect(apiClient.patch).toHaveBeenCalledWith("/notifications/read-all");
});
