const OPERATION_KEY = "nexora.systemReset.operationId";
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Only the opaque operation ID may survive reload. Never store a review or credentials.
export function rememberResetOperationId(id: string): void {
  if (!UUID.test(id)) throw new Error("Invalid reset operation ID");
  const saved = window.localStorage.getItem(OPERATION_KEY);
  if (saved && UUID.test(saved) && saved !== id)
    throw new Error("Another reset request is already saved");
  if (saved && !UUID.test(saved)) {
    window.localStorage.removeItem(OPERATION_KEY);
    if (window.localStorage.getItem(OPERATION_KEY) !== null)
      throw new Error("Invalid reset operation could not be cleared");
  }
  window.localStorage.setItem(OPERATION_KEY, id);
  if (window.localStorage.getItem(OPERATION_KEY) !== id)
    throw new Error("Reset operation could not be saved");
}
export function readResetOperationId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const id = window.localStorage.getItem(OPERATION_KEY);
    if (!id) return null;
    if (UUID.test(id)) return id;
    window.localStorage.removeItem(OPERATION_KEY);
    return null;
  } catch {
    return null;
  }
}
export function readResetUrlOperationId(): string | null {
  if (typeof window === "undefined") return null;
  const id = new URLSearchParams(window.location.search).get("operation");
  return id && UUID.test(id) ? id : null;
}
export function clearResetOperationId(): void {
  window.localStorage.removeItem(OPERATION_KEY);
  if (window.localStorage.getItem(OPERATION_KEY))
    throw new Error("Reset tracking could not be cleared");
  if (window.location.pathname === "/system-maintenance") {
    window.history.replaceState(
      window.history.state,
      "",
      "/system-maintenance",
    );
  }
}
export function openResetProgress(id: string): void {
  if (!UUID.test(id)) throw new Error("Invalid reset operation ID");
  // Only a previously persisted/owned request may be followed as this tab's operation.
  if (readResetOperationId() !== id) rememberResetOperationId(id);
  // A full navigation unloads protected polling and pending auth redirects.
  window.location.assign(
    `/system-maintenance?operation=${encodeURIComponent(id)}`,
  );
}
