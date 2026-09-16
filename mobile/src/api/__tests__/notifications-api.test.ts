import { apiClient } from "../client";
import { notificationsApi } from "../services/notifications";

jest.mock("../client", () => ({ apiClient: { patch: jest.fn(), delete: jest.fn() } }));

it("uses the backend read-all mutation and never converts failure into success", async () => {
  (apiClient.patch as jest.Mock).mockRejectedValueOnce(new Error("offline"));
  await expect(notificationsApi.markAllRead()).rejects.toThrow("offline");
  expect(apiClient.patch).toHaveBeenCalledWith("/notifications/read-all");
});

it("deletes one current-user notification by persisted row id", async () => {
  (apiClient.delete as jest.Mock).mockResolvedValueOnce({
    data: { success: true, data: { dismissedCount: 1 } },
  });

  await expect(notificationsApi.dismissOne("notification-1")).resolves.toEqual({
    success: true,
    data: { dismissedCount: 1 },
  });
  expect(apiClient.delete).toHaveBeenCalledWith("/notifications/notification-1");
});

it("clears only the signed-in user's notification inbox", async () => {
  (apiClient.delete as jest.Mock).mockResolvedValueOnce({
    data: { success: true, data: { dismissedCount: 3 } },
  });

  await expect(notificationsApi.dismissAll()).resolves.toEqual({
    success: true,
    data: { dismissedCount: 3 },
  });
  expect(apiClient.delete).toHaveBeenCalledWith("/notifications");
});
