import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { Modal, Pressable, Text, View, ActivityIndicator, ScrollView } from "react-native";
import {
  checkUpdatePolicy,
  triggerOtaUpdate,
  downloadApk,
  verifyApkIntegrity,
  installApk,
  openUnknownSourcesSettings,
  cleanOldApkFiles,
  getClientVersionInfo,
} from "../services/update/update.service";
import type { UpdateState } from "../services/update/update.types";
import { colors, radii, shadow } from "../theme/tokens";

type UpdateContextValue = {
  state: UpdateState;
  checkForUpdates: () => Promise<void>;
  startApkDownload: () => Promise<void>;
  installDownloadedApk: () => Promise<void>;
  dismissOptionalUpdate: () => void;
  openSettingsForPermission: () => Promise<void>;
};

const initialState: UpdateState = {
  status: "idle",
  decision: null,
  downloadProgress: 0,
  downloadedBytes: 0,
  totalBytes: 0,
  errorMessage: null,
  localApkUri: null,
};

const UpdateContext = createContext<UpdateContextValue | undefined>(undefined);

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "Unknown size";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function UpdateProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<UpdateState>(initialState);

  const checkForUpdates = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, status: "checking", errorMessage: null }));

      const { currentVersionCode } = getClientVersionInfo();
      await cleanOldApkFiles(currentVersionCode);

      const decision = await checkUpdatePolicy();

      if (decision.updateType === "none") {
        const reloaded = await triggerOtaUpdate();
        if (!reloaded) {
          setState((prev) => ({ ...prev, status: "idle", decision }));
        }
        return;
      }

      if (decision.updateType === "apk_optional" || decision.updateType === "apk_forced") {
        setState((prev) => ({ ...prev, status: "apk_required", decision }));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to check for updates.";
      setState((prev) => ({ ...prev, status: "idle", errorMessage: message }));
    }
  }, []);

  const startApkDownload = useCallback(async () => {
    const { decision } = state;
    if (!decision || !decision.apkDownloadUrl) return;

    try {
      setState((prev) => ({
        ...prev,
        status: "downloading_apk",
        downloadProgress: 0,
        downloadedBytes: 0,
        totalBytes: decision.apkSizeBytes ?? 0,
        errorMessage: null,
      }));

      const localUri = await downloadApk(
        decision.apkDownloadUrl,
        decision.latestVersionCode,
        (downloaded, total, pct) => {
          setState((prev) => ({
            ...prev,
            downloadedBytes: downloaded,
            totalBytes: total > 0 ? total : prev.totalBytes,
            downloadProgress: pct,
          }));
        }
      );

      setState((prev) => ({ ...prev, status: "verifying_apk", localApkUri: localUri }));

      await verifyApkIntegrity(localUri, decision.apkSizeBytes, decision.apkSha256);

      // Stop at ready_to_install; do NOT auto-launch installer to prevent duplicate launch race conditions.
      setState((prev) => ({ ...prev, status: "ready_to_install" }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "APK download or size verification failed.";
      setState((prev) => ({ ...prev, status: "error", errorMessage: message }));
    }
  }, [state]);

  const installDownloadedApk = useCallback(async () => {
    if (!state.localApkUri) return;
    try {
      setState((prev) => ({ ...prev, status: "installing", errorMessage: null }));
      await installApk(state.localApkUri);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Installation failed.";
      const lower = message.toLowerCase();
      const isPermissionDenial =
        lower.includes("permission") ||
        lower.includes("security") ||
        lower.includes("unknown") ||
        lower.includes("blocked") ||
        lower.includes("restricted") ||
        lower.includes("source");

      if (isPermissionDenial) {
        setState((prev) => ({
          ...prev,
          status: "permission_denied",
          errorMessage: "Android blocked the installation because installing unknown apps is restricted for Nexora LMS.",
        }));
      } else {
        setState((prev) => ({
          ...prev,
          status: "error",
          errorMessage: `Installation failed: ${message}`,
        }));
      }
    }
  }, [state.localApkUri]);

  const dismissOptionalUpdate = useCallback(() => {
    if (state.decision && !state.decision.isForceUpdate && state.decision.updateType !== "apk_forced") {
      setState((prev) => ({ ...prev, status: "idle" }));
    }
  }, [state.decision]);

  const openSettingsForPermission = useCallback(async () => {
    try {
      await openUnknownSourcesSettings();
    } catch {
      // Ignore errors opening settings
    }
  }, []);

  useEffect(() => {
    checkForUpdates();
  }, [checkForUpdates]);

  const value = useMemo(
    () => ({
      state,
      checkForUpdates,
      startApkDownload,
      installDownloadedApk,
      dismissOptionalUpdate,
      openSettingsForPermission,
    }),
    [state, checkForUpdates, startApkDownload, installDownloadedApk, dismissOptionalUpdate, openSettingsForPermission]
  );

  const shouldShowModal =
    state.status === "apk_required" ||
    state.status === "downloading_apk" ||
    state.status === "verifying_apk" ||
    state.status === "ready_to_install" ||
    state.status === "installing" ||
    state.status === "permission_denied" ||
    (state.status === "error" && (state.decision?.updateType === "apk_optional" || state.decision?.updateType === "apk_forced"));

  const isForce = state.decision?.isForceUpdate || state.decision?.updateType === "apk_forced";

  return (
    <UpdateContext.Provider value={value}>
      {children}
      <Modal
        animationType="fade"
        transparent
        visible={shouldShowModal}
        onRequestClose={() => {
          if (!isForce) {
            dismissOptionalUpdate();
          }
        }}
      >
        <View className="flex-1 items-center justify-center bg-slate-950/70 px-6">
          <View
            style={[
              {
                width: "100%",
                maxWidth: 380,
                borderRadius: radii.xxl,
                backgroundColor: colors.white,
                padding: 24,
              },
              shadow.card,
            ]}
          >
            {/* Header / Badge */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View
                style={{
                  backgroundColor: isForce ? colors.paleRed : colors.paleBlue,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: radii.sm,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "800",
                    color: isForce ? colors.red : colors.blueDeep,
                    textTransform: "uppercase",
                  }}
                >
                  {isForce ? "Critical Update" : "Update Available"}
                </Text>
              </View>
              {state.decision?.latestNativeVersion && (
                <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textSecondary }}>
                  v{state.decision.latestNativeVersion} • {formatBytes(state.decision.apkSizeBytes)}
                </Text>
              )}
            </View>

            {/* Title & Status */}
            <Text style={{ marginTop: 14, fontSize: 22, fontWeight: "900", color: colors.text }}>
              {state.status === "apk_required" && (isForce ? "Mandatory App Update" : "New Version Available")}
              {state.status === "downloading_apk" && "Downloading Update..."}
              {state.status === "verifying_apk" && "Verifying Package..."}
              {state.status === "ready_to_install" && "Ready to Install"}
              {state.status === "installing" && "Installing Update..."}
              {state.status === "permission_denied" && "Installation Blocked"}
              {state.status === "error" && "Update Error"}
            </Text>

            {/* Content per status */}
            {state.status === "apk_required" && (
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 14, lineHeight: 22, color: colors.textSecondary }}>
                  A newer version of Nexora is ready for your device. Please update to continue accessing new features and improvements.
                </Text>
                {state.decision?.releaseNotes ? (
                  <View
                    style={{
                      marginTop: 14,
                      backgroundColor: colors.surface,
                      padding: 14,
                      borderRadius: radii.md,
                      maxHeight: 120,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "700", color: colors.text, marginBottom: 4 }}>
                      Release Notes:
                    </Text>
                    <ScrollView nestedScrollEnabled>
                      <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
                        {state.decision.releaseNotes}
                      </Text>
                    </ScrollView>
                  </View>
                ) : null}
              </View>
            )}

            {state.status === "downloading_apk" && (
              <View style={{ marginTop: 16 }}>
                <View
                  style={{
                    height: 8,
                    width: "100%",
                    backgroundColor: colors.containerLow,
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      height: "100%",
                      width: `${state.downloadProgress}%`,
                      backgroundColor: colors.primary,
                      borderRadius: 4,
                    }}
                  />
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>
                    {state.downloadProgress}%
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                    {formatBytes(state.downloadedBytes)} / {formatBytes(state.totalBytes)}
                  </Text>
                </View>
                <Text style={{ marginTop: 12, fontSize: 12, color: colors.muted, textAlign: "center" }}>
                  Please do not close or minimize the app while downloading.
                </Text>
              </View>
            )}

            {state.status === "verifying_apk" && (
              <View style={{ marginTop: 20, alignItems: "center", paddingVertical: 12 }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 12, fontSize: 14, color: colors.textSecondary, textAlign: "center" }}>
                  Verifying update package size and integrity...
                </Text>
              </View>
            )}

            {state.status === "ready_to_install" && (
              <View style={{ marginTop: 14 }}>
                <Text style={{ fontSize: 14, lineHeight: 22, color: colors.textSecondary }}>
                  The update package is downloaded and verified. Tap "Install Now" to continue with Android package installation.
                </Text>
                <Text style={{ marginTop: 10, fontSize: 12, color: colors.muted }}>
                  Note: If prompted, please allow installation from "Unknown Sources" in your device settings.
                </Text>
              </View>
            )}

            {state.status === "installing" && (
              <View style={{ marginTop: 14 }}>
                <Text style={{ fontSize: 14, lineHeight: 22, color: colors.textSecondary }}>
                  Launching the Android package installer now... Please complete the installation dialog on your screen.
                </Text>
              </View>
            )}

            {state.status === "permission_denied" && (
              <View style={{ marginTop: 14 }}>
                <Text style={{ fontSize: 14, lineHeight: 22, color: colors.red }}>
                  {state.errorMessage ?? "Android blocked the installation because installing unknown apps is restricted for Nexora LMS."}
                </Text>
                <Text style={{ marginTop: 10, fontSize: 13, color: colors.textSecondary, lineHeight: 20 }}>
                  To complete the update, tap "Open Settings (Unknown Apps)" below and enable "Allow from this source" for Nexora.
                </Text>
              </View>
            )}

            {state.status === "error" && (
              <View style={{ marginTop: 14 }}>
                <Text style={{ fontSize: 14, lineHeight: 22, color: colors.red }}>
                  {state.errorMessage ?? "An error occurred during the update download or verification process."}
                </Text>
                <Text style={{ marginTop: 10, fontSize: 13, color: colors.textSecondary, lineHeight: 20 }}>
                  Please check your connection and try again.
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={{ marginTop: 24, gap: 10 }}>
              {state.status === "apk_required" && (
                <Pressable
                  onPress={startApkDownload}
                  style={{
                    alignItems: "center",
                    borderRadius: radii.md,
                    backgroundColor: colors.primary,
                    paddingVertical: 14,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "800", color: colors.white }}>
                    Download & Install Update
                  </Text>
                </Pressable>
              )}

              {(state.status === "ready_to_install" || state.status === "installing") && (
                <Pressable
                  onPress={installDownloadedApk}
                  style={{
                    alignItems: "center",
                    borderRadius: radii.md,
                    backgroundColor: colors.primary,
                    paddingVertical: 14,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "800", color: colors.white }}>
                    Install Now
                  </Text>
                </Pressable>
              )}

              {state.status === "permission_denied" && (
                <>
                  <Pressable
                    onPress={openSettingsForPermission}
                    style={{
                      alignItems: "center",
                      borderRadius: radii.md,
                      backgroundColor: colors.text,
                      paddingVertical: 14,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "800", color: colors.white }}>
                      Open Settings (Unknown Apps)
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={installDownloadedApk}
                    style={{
                      alignItems: "center",
                      borderRadius: radii.md,
                      backgroundColor: colors.primary,
                      paddingVertical: 14,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "800", color: colors.white }}>
                      Retry Installation
                    </Text>
                  </Pressable>
                </>
              )}

              {state.status === "error" && (
                <>
                  <Pressable
                    onPress={startApkDownload}
                    style={{
                      alignItems: "center",
                      borderRadius: radii.md,
                      backgroundColor: colors.primary,
                      paddingVertical: 14,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "800", color: colors.white }}>
                      Retry Download
                    </Text>
                  </Pressable>
                  {state.localApkUri && (
                    <Pressable
                      onPress={installDownloadedApk}
                      style={{
                        alignItems: "center",
                        borderRadius: radii.md,
                        backgroundColor: colors.containerLow,
                        paddingVertical: 12,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textSecondary }}>
                        Retry Installation
                      </Text>
                    </Pressable>
                  )}
                </>
              )}

              {!isForce && state.status !== "downloading_apk" && state.status !== "verifying_apk" && (
                <Pressable
                  onPress={dismissOptionalUpdate}
                  style={{
                    alignItems: "center",
                    borderRadius: radii.md,
                    backgroundColor: colors.containerLow,
                    paddingVertical: 12,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textSecondary }}>
                    Not Now
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </UpdateContext.Provider>
  );
}

export function useUpdate() {
  const context = useContext(UpdateContext);
  if (!context) {
    throw new Error("useUpdate must be used within UpdateProvider");
  }
  return context;
}
