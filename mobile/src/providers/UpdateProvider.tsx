import type { PropsWithChildren } from "react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  AppState,
  Platform,
  Modal,
  Pressable,
  Text,
  View,
  ActivityIndicator,
  ScrollView,
} from "react-native";
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
import {
  setAndroidAdmission,
  subscribeUpdatePolicyFailure,
} from "../services/update/update-admission";
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
  access: "checking",
  status: "idle",
  decision: null,
  downloadProgress: 0,
  downloadedBytes: 0,
  totalBytes: 0,
  errorMessage: null,
  failureStage: null,
  verifiedApkUri: null,
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
  return reason === "missing_file" ||
    reason === "size_mismatch" ||
    reason === "checksum_mismatch"
    ? reason
    : null;
}

function installationFailureReason(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("reason" in error)) {
    return null;
  }
  const reason = (error as { reason?: unknown }).reason;
  return reason === "cancelled_or_blocked" ? reason : null;
}

const noUpdateValue: UpdateContextValue = {
  state: { ...initialState, access: "allowed" },
  checkForUpdates: async () => {},
  startApkDownload: async () => {},
  installDownloadedApk: async () => {},
  dismissOptionalUpdate: () => {},
  openSettingsForPermission: async () => {},
};

export function UpdateProvider({ children }: PropsWithChildren) {
  if (Platform.OS !== "android") {
    return (
      <UpdateContext.Provider value={noUpdateValue}>
        {children}
      </UpdateContext.Provider>
    );
  }
  return <AndroidUpdateProvider>{children}</AndroidUpdateProvider>;
}

function AndroidUpdateProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<UpdateState>(initialState);
  const [hasAdmitted, setHasAdmitted] = useState(false);
  const checkPromise = useRef<Promise<void> | null>(null);
  const operationBusy = useRef(false);
  const checkedDecision = useRef<UpdateState["decision"]>(null);
  const otaAttempted = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const checkForUpdates = useCallback((): Promise<void> => {
    if (checkPromise.current) return checkPromise.current;
    if (operationBusy.current) return Promise.resolve();
    const previousState = stateRef.current;
    const run = async () => {
      try {
        checkedDecision.current = null;
        setAndroidAdmission("checking");
        setState((prev) => ({
          ...prev,
          access: "checking",
          status: "checking",
          errorMessage: null,
          failureStage: null,
        }));

        const { currentVersionCode } = getClientVersionInfo();
        await cleanOldApkFiles(currentVersionCode);

        const decision = await checkUpdatePolicy();
        checkedDecision.current = decision;

        if (decision.updateType === "none") {
          if (!otaAttempted.current) {
            otaAttempted.current = true;
            if (await triggerOtaUpdate()) return;
          }
          // The policy service validates installed identity before approving access.
          setAndroidAdmission("allowed");
          setHasAdmitted(true);
          setState((prev) => ({
            ...prev,
            access: "allowed",
            status: "idle",
            decision,
            failureStage: null,
            verifiedApkUri: null,
          }));
          return;
        }

        if (
          decision.updateType === "apk_optional" ||
          decision.updateType === "apk_forced"
        ) {
          const mandatory =
            decision.isForceUpdate || decision.updateType === "apk_forced";
          setAndroidAdmission(mandatory ? "blocked" : "allowed");
          if (!mandatory) setHasAdmitted(true);
          const samePackage =
            previousState.decision?.latestVersionCode ===
              decision.latestVersionCode &&
            previousState.decision?.apkSha256 === decision.apkSha256 &&
            previousState.decision?.apkSizeBytes === decision.apkSizeBytes &&
            previousState.decision?.apkDownloadUrl === decision.apkDownloadUrl;
          const retainedUri = samePackage ? previousState.verifiedApkUri : null;
          setState((prev) => ({
            ...prev,
            access: mandatory ? "blocked" : "allowed",
            status: retainedUri
              ? previousState.status === "permission_denied"
                ? "permission_denied"
                : "ready_to_install"
              : "apk_required",
            decision,
            verifiedApkUri: retainedUri,
            failureStage: null,
          }));
        }
      } catch (err: unknown) {
        setAndroidAdmission("blocked");
        setState((prev) => ({
          ...prev,
          access: "blocked",
          status: "error",
          errorMessage: errorMessage(err, "Failed to check for updates."),
          failureStage: "check",
        }));
      }
    };
    const pending = run().finally(() => {
      checkPromise.current = null;
    });
    checkPromise.current = pending;
    return pending;
  }, []);

  const downloadDecision = useCallback(
    async (decision: NonNullable<UpdateState["decision"]>) => {
      if (operationBusy.current) return;
      operationBusy.current = true;
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
          verifiedApkUri: null,
        }));

        let localUri: string;
        try {
          localUri = await downloadApk(
            decision.apkDownloadUrl,
            decision.latestVersionCode,
            (downloaded, total, pct) => {
              setState((prev) => ({
                ...prev,
                downloadedBytes: downloaded,
                totalBytes: total > 0 ? total : prev.totalBytes,
                downloadProgress: pct,
              }));
            },
          );
        } catch (err: unknown) {
          setState((prev) => ({
            ...prev,
            status: "error",
            errorMessage: errorMessage(err, "APK download failed."),
            failureStage: "download",
            verifiedApkUri: null,
          }));
          return;
        }

        setState((prev) => ({ ...prev, status: "verifying_apk" }));

        try {
          await verifyApkIntegrity(
            localUri,
            decision.apkSizeBytes,
            decision.apkSha256,
          );
        } catch (err: unknown) {
          setState((prev) => ({
            ...prev,
            status: "error",
            errorMessage: errorMessage(
              err,
              "APK package verification failed. Download it again.",
            ),
            failureStage: "verification",
            verifiedApkUri: null,
          }));
          return;
        }

        // Stop at ready_to_install; do NOT auto-launch installer to prevent duplicate launch race conditions.
        setState((prev) => ({
          ...prev,
          status: "ready_to_install",
          failureStage: null,
          verifiedApkUri: localUri,
        }));
      } catch (err: unknown) {
        setState((prev) => ({
          ...prev,
          status: "error",
          errorMessage: errorMessage(err, "Unexpected update error."),
          failureStage: "download",
          verifiedApkUri: null,
        }));
      } finally {
        operationBusy.current = false;
      }
    },
    [],
  );

  const startApkDownload = useCallback(async () => {
    if (!state.decision?.apkDownloadUrl) return;
    await downloadDecision(state.decision);
  }, [downloadDecision, state.decision]);

  const retryApkDownload = useCallback(async () => {
    await checkForUpdates();
    const decision = checkedDecision.current;
    if (decision && decision.updateType !== "none")
      await downloadDecision(decision);
  }, [checkForUpdates, downloadDecision]);

  const installDownloadedApk = useCallback(async () => {
    const verifiedApkUri = state.verifiedApkUri;
    if (!verifiedApkUri || operationBusy.current) return;
    operationBusy.current = true;
    try {
      setState((prev) => ({
        ...prev,
        status: "installing",
        errorMessage: null,
        failureStage: null,
      }));
      await verifyApkIntegrity(
        verifiedApkUri,
        state.decision?.apkSizeBytes ?? null,
        state.decision?.apkSha256,
      );
      await installApk(verifiedApkUri);
      operationBusy.current = false;
      await checkForUpdates();
    } catch (err: unknown) {
      const message = errorMessage(err, "Installation failed.");
      if (verificationFailureReason(err)) {
        setState((prev) => ({
          ...prev,
          status: "error",
          errorMessage: message,
          failureStage: "verification",
          verifiedApkUri: null,
        }));
        return;
      }
      const installerWasCancelledOrBlocked = Boolean(
        installationFailureReason(err),
      );
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
          failureStage: "installation",
        }));
      } else {
        setState((prev) => ({
          ...prev,
          status: "error",
          errorMessage: `Installation failed: ${message}`,
          failureStage: "installation",
        }));
      }
    } finally {
      operationBusy.current = false;
    }
  }, [checkForUpdates, state.verifiedApkUri, state.decision]);

  const dismissOptionalUpdate = useCallback(() => {
    if (
      state.access === "allowed" &&
      state.decision &&
      !state.decision.isForceUpdate &&
      state.decision.updateType !== "apk_forced"
    ) {
      setState((prev) => ({ ...prev, status: "idle" }));
    }
  }, [state.access, state.decision]);

  const openSettingsForPermission = useCallback(async () => {
    try {
      await openUnknownSourcesSettings();
    } catch {
      // Ignore errors opening settings
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeUpdatePolicyFailure(() => {
      setState((prev) => ({ ...prev, access: "blocked" }));
      void checkForUpdates();
    });
    void checkForUpdates();
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active" && previous !== "active") void checkForUpdates();
      previous = next;
    });
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void checkForUpdates();
    }, 60_000);
    return () => {
      subscription.remove();
      clearInterval(timer);
      unsubscribe();
      setAndroidAdmission("checking");
    };
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
    [
      state,
      checkForUpdates,
      startApkDownload,
      installDownloadedApk,
      dismissOptionalUpdate,
      openSettingsForPermission,
    ],
  );

  const shouldShowModal =
    state.access !== "allowed" ||
    state.status === "apk_required" ||
    state.status === "downloading_apk" ||
    state.status === "verifying_apk" ||
    state.status === "ready_to_install" ||
    state.status === "installing" ||
    state.status === "permission_denied" ||
    (state.status === "error" &&
      (state.decision?.updateType === "apk_optional" ||
        state.decision?.updateType === "apk_forced"));

  const isForce =
    state.access !== "allowed" ||
    state.decision?.isForceUpdate ||
    state.decision?.updateType === "apk_forced";
  const isCheckScreen =
    state.status === "checking" ||
    state.status === "idle" ||
    state.failureStage === "check";
  const clientVersionInfo = getClientVersionInfo();
  const installedVersionLabel = `Installed v${clientVersionInfo.currentNativeVersion} (build ${clientVersionInfo.currentVersionCode})`;
  const availableVersionLabel = state.decision
    ? `Available v${state.decision.latestNativeVersion} (build ${state.decision.latestVersionCode})`
    : "";

  return (
    <UpdateContext.Provider value={value}>
      {hasAdmitted && (
        <View
          testID="update-gated-content"
          style={{ flex: 1 }}
          pointerEvents={state.access === "allowed" ? "auto" : "none"}
          accessibilityElementsHidden={state.access !== "allowed"}
          importantForAccessibility={
            state.access === "allowed" ? "auto" : "no-hide-descendants"
          }
        >
          {children}
        </View>
      )}
      <Modal
        animationType="fade"
        presentationStyle="fullScreen"
        visible={shouldShowModal}
        onRequestClose={() => {
          if (!isForce) {
            dismissOptionalUpdate();
          }
        }}
      >
        <View className="flex-1 items-center justify-center bg-white px-6">
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
            {isCheckScreen ? (
              <View accessibilityLiveRegion="polite">
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "700",
                    color: colors.text,
                  }}
                >
                  {state.failureStage === "check"
                    ? "Connect to verify your app version"
                    : "Checking app version"}
                </Text>
                <Text style={{ marginTop: 12, color: colors.textSecondary }}>
                  {state.failureStage === "check"
                    ? "Nexora needs to verify that your installed app is supported. Check your connection and try again."
                    : "Please wait while Nexora checks for required updates."}
                </Text>
                {state.failureStage === "check" ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={checkForUpdates}
                    style={{
                      marginTop: 20,
                      padding: 16,
                      backgroundColor: colors.primary,
                      borderRadius: radii.md,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.white,
                        textAlign: "center",
                        fontWeight: "700",
                      }}
                    >
                      Retry Check
                    </Text>
                  </Pressable>
                ) : (
                  <ActivityIndicator
                    style={{ marginTop: 20 }}
                    color={colors.primary}
                  />
                )}
              </View>
            ) : (
              <>
                {/* Header / Badge */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      backgroundColor: isForce
                        ? colors.paleRed
                        : colors.paleBlue,
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
                      {isForce ? "Update Required" : "Update Available"}
                    </Text>
                  </View>
                  {state.decision?.latestNativeVersion && (
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: colors.textSecondary,
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
                      paddingVertical: 9,
                    }}
                  >
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      {installedVersionLabel}
                    </Text>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 12,
                        fontWeight: "700",
                        marginTop: 3,
                      }}
                    >
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
                    color: colors.text,
                  }}
                >
                  {state.status === "apk_required" &&
                    (isForce
                      ? "Mandatory App Update"
                      : "New Version Available")}
                  {state.status === "downloading_apk" &&
                    "Downloading Update..."}
                  {state.status === "verifying_apk" && "Verifying Package..."}
                  {state.status === "ready_to_install" && "Ready to Install"}
                  {state.status === "installing" && "Installing Update..."}
                  {state.status === "permission_denied" &&
                    "Installation Blocked"}
                  {state.status === "error" && "Update Error"}
                </Text>

                {/* Content per status */}
                {state.status === "apk_required" && (
                  <View style={{ marginTop: 12 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        lineHeight: 22,
                        color: colors.textSecondary,
                      }}
                    >
                      A newer version of Nexora is ready for your device. Please
                      update to continue accessing new features and
                      improvements.
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
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: colors.text,
                            marginBottom: 4,
                          }}
                        >
                          Release Notes:
                        </Text>
                        <ScrollView nestedScrollEnabled>
                          <Text
                            style={{
                              fontSize: 13,
                              color: colors.textSecondary,
                              lineHeight: 18,
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
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginTop: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: colors.text,
                        }}
                      >
                        {state.downloadProgress}%
                      </Text>
                      <Text
                        style={{ fontSize: 13, color: colors.textSecondary }}
                      >
                        {formatBytes(state.downloadedBytes)} /{" "}
                        {formatBytes(state.totalBytes)}
                      </Text>
                    </View>
                    <Text
                      style={{
                        marginTop: 12,
                        fontSize: 12,
                        color: colors.muted,
                        textAlign: "center",
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
                      paddingVertical: 12,
                    }}
                  >
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text
                      style={{
                        marginTop: 12,
                        fontSize: 14,
                        color: colors.textSecondary,
                        textAlign: "center",
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
                        color: colors.textSecondary,
                      }}
                    >
                      The update package is downloaded and verified. Tap
                      "Install Now" to continue with Android package
                      installation.
                    </Text>
                    <Text
                      style={{
                        marginTop: 10,
                        fontSize: 12,
                        color: colors.muted,
                      }}
                    >
                      Note: If prompted, please allow installation from "Unknown
                      Sources" in your device settings.
                    </Text>
                  </View>
                )}

                {state.status === "installing" && (
                  <View
                    style={{
                      marginTop: 20,
                      alignItems: "center",
                      paddingVertical: 12,
                    }}
                  >
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text
                      style={{
                        fontSize: 14,
                        lineHeight: 22,
                        color: colors.textSecondary,
                      }}
                    >
                      Launching the Android package installer now... Please
                      complete the installation dialog on your screen.
                    </Text>
                  </View>
                )}

                {state.status === "permission_denied" && (
                  <View style={{ marginTop: 14 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        lineHeight: 22,
                        color: colors.red,
                      }}
                    >
                      {state.errorMessage ??
                        "Android did not complete the installation. The installer may have been cancelled, or installation from Nexora may be blocked."}
                    </Text>
                    <Text
                      style={{
                        marginTop: 10,
                        fontSize: 13,
                        color: colors.textSecondary,
                        lineHeight: 20,
                      }}
                    >
                      If installation is blocked, tap "Open Settings (Unknown
                      Apps)" and enable "Allow from this source" for Nexora.
                      Then return here and retry.
                    </Text>
                  </View>
                )}

                {state.status === "error" && (
                  <View style={{ marginTop: 14 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        lineHeight: 22,
                        color: colors.red,
                      }}
                    >
                      {state.errorMessage ??
                        "An error occurred during the update download or verification process."}
                    </Text>
                    <Text
                      style={{
                        marginTop: 10,
                        fontSize: 13,
                        color: colors.textSecondary,
                        lineHeight: 20,
                      }}
                    >
                      {(state.failureStage === "check" ||
                        state.failureStage === "download") &&
                        "Please check your connection and try the download again."}
                      {state.failureStage === "verification" &&
                        "The downloaded package could not be verified. Download a fresh copy before installing."}
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
                        paddingVertical: 14,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "800",
                          color: colors.white,
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
                        paddingVertical: 14,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "800",
                          color: colors.white,
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
                          paddingVertical: 14,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "800",
                            color: colors.white,
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
                          paddingVertical: 14,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "800",
                            color: colors.white,
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
                          paddingVertical: 14,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "800",
                            color: colors.white,
                          }}
                        >
                          Retry Download
                        </Text>
                      </Pressable>
                      {state.failureStage === "installation" &&
                        state.verifiedApkUri && (
                          <Pressable
                            onPress={installDownloadedApk}
                            style={{
                              alignItems: "center",
                              borderRadius: radii.md,
                              backgroundColor: colors.containerLow,
                              paddingVertical: 12,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 13,
                                fontWeight: "700",
                                color: colors.textSecondary,
                              }}
                            >
                              Retry Installation
                            </Text>
                          </Pressable>
                        )}
                    </>
                  )}

                  {!isForce &&
                    state.status !== "downloading_apk" &&
                    state.status !== "verifying_apk" &&
                    state.status !== "installing" && (
                      <Pressable
                        onPress={dismissOptionalUpdate}
                        style={{
                          alignItems: "center",
                          borderRadius: radii.md,
                          backgroundColor: colors.containerLow,
                          paddingVertical: 12,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "700",
                            color: colors.textSecondary,
                          }}
                        >
                          Not Now
                        </Text>
                      </Pressable>
                    )}
                </View>
              </>
            )}
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
