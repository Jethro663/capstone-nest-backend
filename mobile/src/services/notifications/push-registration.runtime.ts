import * as Application from "expo-application";
import Constants from "expo-constants";
import { randomUUID } from "expo-crypto";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { notificationsApi } from "../../api/services/notifications";
import { getInstalledNativeVersionInfo } from "../update/version-identity";
import { syncPushRegistration } from "./push-registration.service";

const PUSH_INSTALLATION_ID_KEY = "nexora.mobile.push-installation-id";

function projectId(): string | null {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: unknown } }
    | undefined;
  const configured = extra?.eas?.projectId;
  if (typeof configured === "string" && configured.trim()) {
    return configured.trim();
  }
  const easProjectId = (
    Constants as typeof Constants & {
      easConfig?: { projectId?: unknown };
    }
  ).easConfig?.projectId;
  return typeof easProjectId === "string" && easProjectId.trim()
    ? easProjectId.trim()
    : null;
}

export async function syncCurrentPushRegistration() {
  const identity = getInstalledNativeVersionInfo();
  return syncPushRegistration({
    platform:
      Platform.OS === "android" || Platform.OS === "ios"
        ? Platform.OS
        : "other",
    isPhysicalDevice: Constants.isDevice === true,
    projectId: projectId(),
    appVersion:
      Application.nativeApplicationVersion ?? identity.currentNativeVersion,
    buildNumber: identity.currentVersionCode,
    getStoredInstallationId: () =>
      SecureStore.getItemAsync(PUSH_INSTALLATION_ID_KEY),
    storeInstallationId: (installationId) =>
      SecureStore.setItemAsync(PUSH_INSTALLATION_ID_KEY, installationId),
    createInstallationId: randomUUID,
    getPermissions: Notifications.getPermissionsAsync,
    requestPermissions: Notifications.requestPermissionsAsync,
    getExpoPushToken: async (expoProjectId) =>
      (
        await Notifications.getExpoPushTokenAsync({
          projectId: expoProjectId,
        })
      ).data,
    registerDevice: notificationsApi.registerDevice,
    revokeDevice: notificationsApi.revokeDevice,
  });
}

export async function revokeCurrentPushInstallation(): Promise<void> {
  const installationId = await SecureStore.getItemAsync(
    PUSH_INSTALLATION_ID_KEY,
  );
  if (!installationId) return;
  await notificationsApi.revokeDevice(installationId);
}
