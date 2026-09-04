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
  getClientVersionInfo
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
  failureStage: null,
  verifiedApkUri: null
};

const UpdateContext = createContext<UpdateContextValue | undefined>(undefined);

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "Unknown size";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function verificationFailureReason(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("reason" in error)) {
    return null;
  }
  const reason = (error as { reason?: unknown }).reason;
  return reason === "missing_file" || reason === "size_mismatch" ? reason : null;
}

function installationFailureReason(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("reason" in error)) {
    return null;
  }
  const reason = (error as { reason?: unknown }).reason;
  return reason === "cancelled_or_blocked" ? reason : null;
}

export function UpdateProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<UpdateState>(initialState);

  const checkForUpdates = useCallback(async () => {
    try {
      setState((prev) => ({
        ...prev,
        status: "checking",
        errorMessage: null,
        failureStage: null,
        verifiedApkUri: null
      }));

      const { currentVersionCode } = getClientVersionInfo();
      await cleanOldApkFiles(currentVersionCode);

      const decision = await checkUpdatePolicy();

      if (decision.updateType === "none") {
        const reloaded = await triggerOtaUpdate();
        if (!reloaded) {
          setState((prev) => ({
            ...prev,
            status: "idle",
            decision,
            failureStage: null
          }));
        }
        return;
      }

      if (decision.updateType === "apk_optional" || decision.updateType === "apk_forced") {
        setState((prev) => ({
          ...prev,
          status: "apk_required",
          decision,
          failureStage: null
        }));
      }
    } catch (err: unknown) {
      setState((prev) => ({
        ...prev,
        status: "idle",
        errorMessage: errorMessage(err, "Failed to check for updates."),
        failureStage: "check",
        verifiedApkUri: null
      }));
    }
  }, []);

  const downloadDecision = useCallback(async (decision: NonNullable<UpdateState["decision"]>) => {
    try {
      setState((prev) => ({
        ...prev,
        decision,
        status: "downloading_apk",
        downloadProgress: 0,
        downloadedBytes: 0,
        totalBytes: decision.apkSizeBytes ?? 0,
        errorMessage: null,
        failureStage: null,
        verifiedApkUri: null
      }));

      let localUri: string;
      try {
        localUri = await downloadApk(decision.apkDownloadUrl, decision.latestVersionCode, (downloaded, total, pct) => {
          setState((prev) => ({
            ...prev,
            downloadedBytes: downloaded,
            totalBytes: total > 0 ? total : prev.totalBytes,
            downloadProgress: pct
          }));
        });
      } catch (err: unknown) {
        setState((prev) => ({
          ...prev,
          status: "error",
          errorMessage: errorMessage(err, "APK download failed."),
          failureStage: "download",
          verifiedApkUri: null
        }));
        return;
      }

      setState((prev) => ({ ...prev, status: "verifying_apk" }));

      try {
        await verifyApkIntegrity(localUri, decision.apkSizeBytes);
      } catch (err: unknown) {
        setState((prev) => ({
          ...prev,
          status: "error",
          errorMessage: errorMessage(err, "APK package verification failed. Download it again."),
          failureStage: "verification",
          verifiedApkUri: null
        }));
        return;
      }

      // Stop at ready_to_install; do NOT auto-launch installer to prevent duplicate launch race conditions.
      setState((prev) => ({
        ...prev,
        status: "ready_to_install",
        failureStage: null,
        verifiedApkUri: localUri
      }));
    } catch (err: unknown) {
      setState((prev) => ({
        ...prev,
        status: "error",
        errorMessage: errorMessage(err, "Unexpected update error."),
        failureStage: "download",
        verifiedApkUri: null
      }));
    }
  }, []);

  const startApkDownload = useCallback(async () => {
    if (!state.decision?.apkDownloadUrl) return;
    await downloadDecision(state.decision);
  }, [downloadDecision, state.decision]);

  const retryApkDownload = useCallback(async () => {
    try {
      setState((prev) => ({
        ...prev,
        status: "checking",
        errorMessage: null,
        failureStage: null,
        verifiedApkUri: null
      }));

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

      await downloadDecision(decision);
    } catch (err: unknown) {
      setState((prev) => ({
        ...prev,
        status: "error",
        errorMessage: errorMessage(err, "Failed to refresh update details."),
        failureStage: "check",
        verifiedApkUri: null
      }));
    }
  }, [downloadDecision]);

  const installDownloadedApk = useCallback(async () => {
    const verifiedApkUri = state.verifiedApkUri;
    if (!verifiedApkUri) return;
    try {
      setState((prev) => ({
        ...prev,
        status: "installing",
        errorMessage: null,
        failureStage: null
      }));
      await installApk(verifiedApkUri);
      setState((prev) => ({
        ...prev,
        status: "idle",
        errorMessage: null,
        failureStage: null,
        verifiedApkUri: null
      }));
    } catch (err: unknown) {
      const message = errorMessage(err, "Installation failed.");
      if (verificationFailureReason(err)) {
        setState((prev) => ({
          ...prev,
          status: "error",
          errorMessage: message,
          failureStage: "verification",
          verifiedApkUri: null
        }));
        return;
      }
      const installerWasCancelledOrBlocked = Boolean(installationFailureReason(err));
      const lower = message.toLowerCase();
      const isPermissionDenial =
        lower.includes("permission") ||
        lower.includes("security") ||
        lower.includes("unknown") ||
        lower.includes("blocked") ||
        lower.includes("restricted") ||
        lower.includes("source");

      if (installerWasCancelledOrBlocked || isPermissionDenial) {
        setState((prev) => ({
          ...prev,
          status: "permission_denied",
          errorMessage:
            "Android did not complete the installation. The installer may have been cancelled, or installation from Nexora may be blocked.",
          failureStage: "installation"
        }));
      } else {
        setState((prev) => ({
          ...prev,
          status: "error",
          errorMessage: `Installation failed: ${message}`,
          failureStage: "installation"
        }));
      }
    }
  }, [state.verifiedApkUri]);

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
      openSettingsForPermission
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
  const clientVersionInfo = getClientVersionInfo();
  const installedVersionLabel = `Installed v${clientVersionInfo.currentNativeVersion} (build ${clientVersionInfo.currentVersionCode})`;
  const availableVersionLabel = state.decision
    ? `Available v${state.decision.latestNativeVersion} (build ${state.decision.latestVersionCode})`
    : "";

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
                padding: 24
              },
              shadow.card
            ]}
          >
            {/* Header / Badge */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <View
                style={{
                  backgroundColor: isForce ? colors.paleRed : colors.paleBlue,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: radii.sm
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "800",
                    color: isForce ? colors.red : colors.blueDeep,
                    textTransform: "uppercase"
                  }}
                >
                  {isForce ? "Critical Update" : "Update Available"}
                </Text>
              </View>
              {state.decision?.latestNativeVersion && (
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: colors.textSecondary
                  }}
                >
                  {formatBytes(state.decision.apkSizeBytes)}
                </Text>
              )}
            </View>

            {state.decision ? (
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radii.md,
                  marginTop: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 9
                }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {installedVersionLabel}
                </Text>
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: "700", marginTop: 3 }}>
                  {availableVersionLabel}
                </Text>
              </View>
            ) : null}

            {/* Title & Status */}
            <Text
              style={{
                marginTop: 14,
                fontSize: 22,
                fontWeight: "900",
                color: colors.text
              }}
            >
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
                <Text
                  style={{
                    fontSize: 14,
                    lineHeight: 22,
                    color: colors.textSecondary
                  }}
                >
                  A newer version of Nexora is ready for your device. Please update to continue accessing new features and improvements.
                </Text>
                {state.decision?.releaseNotes ? (
                  <View
                    style={{
                      marginTop: 14,
                      backgroundColor: colors.surface,
                      padding: 14,
                      borderRadius: radii.md,
                      maxHeight: 120
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: colors.text,
                        marginBottom: 4
                      }}
                    >
                      Release Notes:
                    </Text>
                    <ScrollView nestedScrollEnabled>
                      <Text
                        style={{
                          fontSize: 13,
                          color: colors.textSecondary,
                          lineHeight: 18
                        }}
                      >
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
                    overflow: "hidden"
                  }}
                >
                  <View
                    style={{
                      height: "100%",
                      width: `${state.downloadProgress}%`,
                      backgroundColor: colors.primary,
                      borderRadius: 4
                    }}
                  />
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginTop: 8
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: colors.text
                    }}
                  >
                    {state.downloadProgress}%
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                    {formatBytes(state.downloadedBytes)} / {formatBytes(state.totalBytes)}
                  </Text>
                </View>
                <Text
                  style={{
                    marginTop: 12,
                    fontSize: 12,
                    color: colors.muted,
                    textAlign: "center"
                  }}
                >
                  Please do not close or minimize the app while downloading.
                </Text>
              </View>
            )}

            {state.status === "verifying_apk" && (
              <View
                style={{
                  marginTop: 20,
                  alignItems: "center",
                  paddingVertical: 12
                }}
              >
                <ActivityIndicator size="large" color={colors.primary} />
                <Text
                  style={{
                    marginTop: 12,
                    fontSize: 14,
                    color: colors.textSecondary,
                    textAlign: "center"
                  }}
                >
                  Verifying update package size and integrity...
                </Text>
              </View>
            )}

            {state.status === "ready_to_install" && (
              <View style={{ marginTop: 14 }}>
                <Text
                  style={{
                    fontSize: 14,
                    lineHeight: 22,
                    color: colors.textSecondary
                  }}
                >
                  The update package is downloaded and verified. Tap "Install Now" to continue with Android package installation.
                </Text>
                <Text style={{ marginTop: 10, fontSize: 12, color: colors.muted }}>
                  Note: If prompted, please allow installation from "Unknown Sources" in your device settings.
                </Text>
              </View>
            )}

            {state.status === "installing" && (
              <View
                style={{
                  marginTop: 20,
                  alignItems: "center",
                  paddingVertical: 12
                }}
              >
                <ActivityIndicator size="large" color={colors.primary} />
                <Text
                  style={{
                    fontSize: 14,
                    lineHeight: 22,
                    color: colors.textSecondary
                  }}
                >
                  Launching the Android package installer now... Please complete the installation dialog on your screen.
                </Text>
              </View>
            )}

            {state.status === "permission_denied" && (
              <View style={{ marginTop: 14 }}>
                <Text style={{ fontSize: 14, lineHeight: 22, color: colors.red }}>
                  {state.errorMessage ??
                    "Android did not complete the installation. The installer may have been cancelled, or installation from Nexora may be blocked."}
                </Text>
                <Text
                  style={{
                    marginTop: 10,
                    fontSize: 13,
                    color: colors.textSecondary,
                    lineHeight: 20
                  }}
                >
                  If installation is blocked, tap "Open Settings (Unknown Apps)" and enable "Allow from this source" for Nexora. Then return here and retry.
                </Text>
              </View>
            )}

            {state.status === "error" && (
              <View style={{ marginTop: 14 }}>
                <Text style={{ fontSize: 14, lineHeight: 22, color: colors.red }}>
                  {state.errorMessage ?? "An error occurred during the update download or verification process."}
                </Text>
                <Text
                  style={{
                    marginTop: 10,
                    fontSize: 13,
                    color: colors.textSecondary,
                    lineHeight: 20
                  }}
                >
                  {(state.failureStage === "check" || state.failureStage === "download") && "Please check your connection and try the download again."}
                  {state.failureStage === "verification" && "The downloaded package could not be verified. Download a fresh copy before installing."}
                  {state.failureStage === "installation" &&
                    "The package was verified, but Android could not start the installation. You can retry without downloading it again."}
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
                    paddingVertical: 14
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "800",
                      color: colors.white
                    }}
                  >
                    Download & Install Update
                  </Text>
                </Pressable>
              )}

              {state.status === "ready_to_install" && (
                <Pressable
                  onPress={installDownloadedApk}
                  style={{
                    alignItems: "center",
                    borderRadius: radii.md,
                    backgroundColor: colors.primary,
                    paddingVertical: 14
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "800",
                      color: colors.white
                    }}
                  >
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
                      paddingVertical: 14
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "800",
                        color: colors.white
                      }}
                    >
                      Open Settings (Unknown Apps)
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={installDownloadedApk}
                    style={{
                      alignItems: "center",
                      borderRadius: radii.md,
                      backgroundColor: colors.primary,
                      paddingVertical: 14
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "800",
                        color: colors.white
                      }}
                    >
                      Retry Installation
                    </Text>
                  </Pressable>
                </>
              )}

              {state.status === "error" && (
                <>
                  <Pressable
                    onPress={retryApkDownload}
                    style={{
                      alignItems: "center",
                      borderRadius: radii.md,
                      backgroundColor: colors.primary,
                      paddingVertical: 14
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "800",
                        color: colors.white
                      }}
                    >
                      Retry Download
                    </Text>
                  </Pressable>
                  {state.failureStage === "installation" && state.verifiedApkUri && (
                    <Pressable
                      onPress={installDownloadedApk}
                      style={{
                        alignItems: "center",
                        borderRadius: radii.md,
                        backgroundColor: colors.containerLow,
                        paddingVertical: 12
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: colors.textSecondary
                        }}
                      >
                        Retry Installation
                      </Text>
                    </Pressable>
                  )}
                </>
              )}

              {!isForce && state.status !== "downloading_apk" && state.status !== "verifying_apk" && state.status !== "installing" && (
                <Pressable
                  onPress={dismissOptionalUpdate}
                  style={{
                    alignItems: "center",
                    borderRadius: radii.md,
                    backgroundColor: colors.containerLow,
                    paddingVertical: 12
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: colors.textSecondary
                    }}
                  >
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
