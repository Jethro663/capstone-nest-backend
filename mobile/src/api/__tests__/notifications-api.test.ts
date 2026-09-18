import { apiClient } from "../client";
import { notificationsApi } from "../services/notifications";

jest.mock("../client", () => ({
  apiClient: { patch: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

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
  expect(apiClient.delete).toHaveBeenCalledWith(
    "/notifications/notification-1",
  );
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

it("registers and revokes the current installation through user-scoped routes", async () => {
  (apiClient.put as jest.Mock).mockResolvedValueOnce({
    data: { success: true, data: { notificationsEnabled: true } },
  });
  (apiClient.delete as jest.Mock).mockResolvedValueOnce({
    data: { success: true, data: { notificationsEnabled: false } },
  });
  const input = {
    platform: "android" as const,
    provider: "expo" as const,
    pushToken: "ExponentPushToken[abcdefghijklmnopqrstuvwxyz123456]",
    notificationsEnabled: true,
    appVersion: "0.1.45",
    buildNumber: 46,
  };

  await notificationsApi.registerDevice("installation-1", input);
  await notificationsApi.revokeDevice("installation-1");

  expect(apiClient.put).toHaveBeenCalledWith(
    "/notifications/devices/installation-1",
    input,
  );
  expect(apiClient.delete).toHaveBeenCalledWith(
    "/notifications/devices/installation-1",
  );
});
