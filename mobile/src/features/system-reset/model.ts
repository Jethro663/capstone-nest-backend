import type {
  ResetConfirmation,
  ResetMaintenance,
} from "../../types/system-reset";

export function canExecuteReset({
  preview,
  input,
  required,
  now,
  online,
  busy,
}: {
  preview: { expiresAt: string; confirmation: string } | null;
  input: ResetConfirmation;
  required: readonly string[];
  now: number;
  online: boolean;
  busy: boolean;
}): boolean {
  return Boolean(
    preview &&
    Date.parse(preview.expiresAt) > now &&
    online &&
    !busy &&
    input.currentPassword &&
    input.reason.trim().length >= 10 &&
    input.reason.trim().length <= 500 &&
    input.confirmation === preview.confirmation &&
    required.length &&
    required.every((code) => input.acknowledgements.includes(code)),
  );
}

export function resetProgress(
  operationId: string,
  status?: ResetMaintenance | null,
) {
  if (!status || status.operationId !== operationId || status.status === "idle")
    return "unknown";
  return status.status;
}

export function resetBack(navigation: {
  canGoBack: () => boolean;
  goBack: () => void;
  navigate: (name: "MainTabs", params: { screen: "AdminSettings" }) => void;
}) {
  if (navigation.canGoBack()) navigation.goBack();
  else navigation.navigate("MainTabs", { screen: "AdminSettings" });
}

export function resetRequestIsUncertain(error: unknown) {
  const status = (error as { response?: { status?: number } })?.response
    ?.status;
  // A conflict can refer to an older accepted request with this same key.
  // Never discard the known operation ID based on a 409, even on first submit.
  return !status || status >= 500 || status === 408 || status === 409;
}

export const RESET_PHASE_LABELS: Record<string, string> = {
  draining: "Finishing active work",
  cleanup: "Clearing school data and files",
  verifying: "Verifying the reset",
  restoring: "Preparing the new school year",
  complete: "Reset complete",
  aborted: "Reset stopped before clearing records",
};
