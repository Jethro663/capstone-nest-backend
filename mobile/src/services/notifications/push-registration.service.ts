import type { RegisterNotificationDeviceInput } from "../../api/services/notifications";

type PermissionResult = {
  status: string;
  canAskAgain?: boolean;
};

export type PushRegistrationDependencies = {
  platform: "android" | "ios" | "other";
  isPhysicalDevice: boolean;
  projectId: string | null;
  appVersion: string;
  buildNumber: number;
  getStoredInstallationId: () => Promise<string | null>;
  storeInstallationId: (installationId: string) => Promise<void>;
  createInstallationId: () => string;
  getPermissions: () => Promise<PermissionResult>;
  requestPermissions: () => Promise<PermissionResult>;
  getExpoPushToken: (projectId: string) => Promise<string>;
  registerDevice: (
    installationId: string,
    input: RegisterNotificationDeviceInput,
  ) => Promise<unknown>;
  revokeDevice: (installationId: string) => Promise<unknown>;
};

export type PushRegistrationResult = {
  status:
    | "registered"
    | "permission_denied"
    | "unsupported"
    | "retryable_error";
  installationId: string | null;
};

export async function syncPushRegistration(
  dependencies: PushRegistrationDependencies,
): Promise<PushRegistrationResult> {
  if (
    !dependencies.isPhysicalDevice ||
    !["android", "ios"].includes(dependencies.platform) ||
    !dependencies.projectId
  ) {
    return { status: "unsupported", installationId: null };
  }

  let installationId = await dependencies.getStoredInstallationId();
  try {
    let permission = await dependencies.getPermissions();
    if (permission.status !== "granted" && permission.canAskAgain !== false) {
      permission = await dependencies.requestPermissions();
    }
    if (permission.status !== "granted") {
      if (installationId) {
        await dependencies.revokeDevice(installationId).catch(() => undefined);
      }
      return { status: "permission_denied", installationId };
    }

    if (!installationId) {
      installationId = dependencies.createInstallationId();
      await dependencies.storeInstallationId(installationId);
    }
    const pushToken = await dependencies.getExpoPushToken(
      dependencies.projectId,
    );
    await dependencies.registerDevice(installationId, {
      platform: dependencies.platform as "android" | "ios",
      provider: "expo",
      pushToken,
      notificationsEnabled: true,
      appVersion: dependencies.appVersion,
      buildNumber: dependencies.buildNumber,
    });
    return { status: "registered", installationId };
  } catch {
    return { status: "retryable_error", installationId };
  }
}
