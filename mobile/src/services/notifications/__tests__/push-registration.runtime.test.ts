import * as SecureStore from "expo-secure-store";
import { notificationsApi } from "../../../api/services/notifications";
import { revokeCurrentPushInstallation } from "../push-registration.runtime";

jest.mock("expo-application", () => ({}));
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: {}, isDevice: true },
}));
jest.mock("expo-crypto", () => ({ randomUUID: jest.fn() }));
jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
}));
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));
jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));
jest.mock("../../../api/services/notifications", () => ({
  notificationsApi: {
    registerDevice: jest.fn(),
    revokeDevice: jest.fn(),
  },
}));
jest.mock("../../update/version-identity", () => ({
  getInstalledNativeVersionInfo: () => ({
    currentNativeVersion: "0.1.55",
    currentVersionCode: 56,
  }),
}));

it("forwards the captured access token when revoking the current installation", async () => {
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue("installation-1");
  jest.mocked(notificationsApi.revokeDevice).mockResolvedValue({});

  await revokeCurrentPushInstallation("captured-access-token");

  expect(notificationsApi.revokeDevice).toHaveBeenCalledWith(
    "installation-1",
    "captured-access-token",
  );
});
