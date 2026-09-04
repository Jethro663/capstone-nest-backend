import type { LoginServerStatusKind } from "../../services/system-status/login-server-status";
import type { UpdateState } from "../../services/update/update.types";

export type LoginVersionStatusKind =
  | "checking"
  | "current"
  | "supported"
  | "available"
  | "required"
  | "unverified";

export type LoginVersionStatus = {
  kind: LoginVersionStatusKind;
  headline: string;
  detail: string;
  installedLabel: string;
};

export type LoginStatusTone = "neutral" | "green" | "amber" | "red";

export function resolveLoginVersionStatus(
  state: UpdateState,
  installed: { currentNativeVersion: string; currentVersionCode: number },
): LoginVersionStatus {
  const installedLabel = `Installed v${installed.currentNativeVersion} (build ${installed.currentVersionCode})`;

  if (state.status === "checking") {
    return {
      kind: "checking",
      headline: "Checking version",
      detail: "Confirming the latest registered Nexora build.",
      installedLabel,
    };
  }

  if (state.failureStage === "check" && state.errorMessage) {
    return {
      kind: "unverified",
      headline: "Could not verify latest version",
      detail:
        "The installed build is identified, but the latest APK policy could not be checked.",
      installedLabel,
    };
  }

  const decision = state.decision;
  if (decision?.updateType === "apk_forced") {
    return {
      kind: "required",
      headline: "Update required",
      detail: `Available v${decision.latestNativeVersion} (build ${decision.latestVersionCode}) must be installed before continuing.`,
      installedLabel,
    };
  }

  if (decision?.updateType === "apk_optional") {
    return {
      kind: "available",
      headline: "Update available",
      detail: `Available v${decision.latestNativeVersion} (build ${decision.latestVersionCode}) can be installed now.`,
      installedLabel,
    };
  }

  if (decision?.updateType === "none") {
    if (installed.currentVersionCode >= decision.latestVersionCode) {
      return {
        kind: "current",
        headline: "Up to date",
        detail: "This APK matches the latest registered Nexora build.",
        installedLabel,
      };
    }

    return {
      kind: "supported",
      headline: "Supported version",
      detail: `A newer build (${decision.latestVersionCode}) is registered, but this APK is currently supported.`,
      installedLabel,
    };
  }

  return {
    kind: "unverified",
    headline: "Could not verify latest version",
    detail:
      "The installed build is identified, but the latest APK policy has not been checked yet.",
    installedLabel,
  };
}

export function resolveLoginStatusTone(
  serverKind: LoginServerStatusKind,
  versionKind: LoginVersionStatusKind,
): LoginStatusTone {
  if (serverKind === "checking" || versionKind === "checking") {
    return "neutral";
  }
  if (
    serverKind === "offline" ||
    serverKind === "unexpected" ||
    versionKind === "required"
  ) {
    return "red";
  }
  if (
    serverKind === "limited" ||
    versionKind === "available" ||
    versionKind === "unverified"
  ) {
    return "amber";
  }
  return "green";
}
