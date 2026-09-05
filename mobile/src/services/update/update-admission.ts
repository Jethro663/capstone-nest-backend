import type { UpdateState } from "./update.types";

// Kept independent of HTTP/native modules to avoid a policy-client import cycle.
let androidAdmission: UpdateState["access"] = "checking";
const listeners = new Set<() => void>();

export function setAndroidAdmission(access: UpdateState["access"]) {
  androidAdmission = access;
}

export function getAndroidAdmission() {
  return androidAdmission;
}

export function subscribeUpdatePolicyFailure(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function reportUpdatePolicyFailure() {
  androidAdmission = "blocked";
  listeners.forEach((listener) => listener());
}

export function isAppUpdateError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as {
    code?: unknown;
    response?: { data?: { code?: unknown } };
  };
  const code = value.response?.data?.code ?? value.code;
  return (
    code === "APP_UPDATE_REQUIRED" ||
    code === "APP_UPDATE_CHECK_FAILED" ||
    code === "APP_UPDATE_CHECK_PENDING"
  );
}
