import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { systemResetApi } from "../api/services/system-reset";
import { clearAuthSession } from "../api/client";
import { queryClient } from "../api/queryClient";
import { clearAllSchoolDataRecovery } from "../features/assessment-editor/recovery";
import { resetProgress } from "../features/system-reset/model";
import { useAdminNetworkStatus } from "../hooks/useAdminNetworkStatus";
import type { ResetMaintenance } from "../types/system-reset";
import { useAuth } from "./AuthProvider";

const STORAGE_KEY = "nexora.system-reset.operation";
type ResetContextValue = {
  operationId: string | null;
  visible: boolean;
  status: ResetMaintenance | null;
  progress: ReturnType<typeof resetProgress>;
  error: string | null;
  storageError: string | null;
  ready: boolean;
  clearing: boolean;
  signedOut: boolean;
  begin: (operationId: string) => Promise<void>;
  checkOwnedOperation: () => Promise<void>;
  forget: () => Promise<void>;
  hide: () => void;
  show: () => void;
  refresh: () => void;
};
const ResetContext = createContext<ResetContextValue | null>(null);

/** This provider sits above navigation: no JWT or protected query is needed for progress. */
export function SystemResetProvider({ children }: PropsWithChildren) {
  const [operationId, setOperationId] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<ResetMaintenance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const clearedOperation = useRef<string | null>(null);
  const trackedId = useRef<string | null>(null);
  const terminalReceipt = useRef<ResetMaintenance | null>(null);
  const { updateLocalUser, loading: authLoading } = useAuth();
  const { isOffline } = useAdminNetworkStatus();
  const progress = operationId ? resetProgress(operationId, status) : "unknown";

  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(STORAGE_KEY)
      .then((id) => {
        if (!mounted) return;
        if (id) {
          trackedId.current = id;
          setOperationId(id);
          setVisible(true);
        }
      })
      .catch(() => {
        if (mounted)
          setStorageError(
            "Saved reset progress could not be read. Reopen the app before starting another reset.",
          );
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const begin = useCallback(async (id: string) => {
    if (trackedId.current && trackedId.current !== id)
      throw new Error(
        "Resolve the saved reset before starting a different operation.",
      );
    // Only the backend-defined operation UUID is persisted, never the reviewed payload.
    await AsyncStorage.setItem(STORAGE_KEY, id);
    if (trackedId.current !== id) {
      terminalReceipt.current = null;
      setSignedOut(false);
      setStatus(null);
    }
    trackedId.current = id;
    setStorageError(null);
    setOperationId(id);
    setError(null);
    setVisible(true);
  }, []);
  const forget = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    trackedId.current = null;
    terminalReceipt.current = null;
    setOperationId(null);
    setStatus(null);
    setVisible(false);
    setSignedOut(false);
    setError(null);
  }, []);
  const refresh = useCallback(
    () => setRefreshVersion((value) => value + 1),
    [],
  );
  const checkOwnedOperation = useCallback(async () => {
    const id = trackedId.current;
    if (!id || isOffline)
      throw new Error("Reconnect to check the saved operation.");
    // This authenticated endpoint verifies ownership server-side. A 404 is
    // ambiguous (including an original POST still in preflight) and is never
    // permission to forget the saved UUID or replace it.
    const receipt = await systemResetApi.operation(id);
    if (trackedId.current !== id || receipt.operationId !== id)
      throw new Error("The server receipt did not match the saved operation.");
    const next: ResetMaintenance = {
      active: receipt.status === "running",
      operationId: id,
      phase: receipt.phase,
      status: receipt.status,
      retrying: receipt.retrying,
    };
    if (next.status === "completed" || next.status === "aborted")
      terminalReceipt.current = next;
    setStatus(
      terminalReceipt.current?.operationId === id
        ? terminalReceipt.current
        : next,
    );
    setError(null);
    setVisible(true);
  }, [isOffline]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  useEffect(() => {
    if (!operationId || isOffline) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      let terminal = false;
      try {
        // A verified terminal receipt is immutable for this operation. A later
        // reset must not replace it while this screen remains open.
        let next =
          terminalReceipt.current?.operationId === operationId
            ? terminalReceipt.current
            : await systemResetApi.maintenance();
        if (stopped) return;
        if (terminalReceipt.current?.operationId === operationId)
          next = terminalReceipt.current;
        setStatus(next);
        setError(null);
        const nextProgress = resetProgress(operationId, next);
        terminal = nextProgress === "completed" || nextProgress === "aborted";
        if (terminal) {
          terminalReceipt.current = next;
          setVisible(true);
        }
      } catch {
        if (!stopped)
          setError(
            "Progress is temporarily unavailable. Reconnect to check this operation; leaving does not cancel server work.",
          );
      }
      if (!stopped && !terminal) timer = setTimeout(() => void poll(), 3_000);
    };
    void poll();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [operationId, isOffline, refreshVersion]);

  useEffect(() => {
    if (
      progress !== "completed" ||
      !operationId ||
      authLoading ||
      clearedOperation.current === operationId
    )
      return;
    clearedOperation.current = operationId;
    setClearing(true);
    void (async () => {
      try {
        await queryClient.cancelQueries();
        await clearAuthSession();
        await updateLocalUser(null);
        await clearAllSchoolDataRecovery();
        queryClient.clear();
        setSignedOut(true);
      } catch {
        clearedOperation.current = null;
        setError(
          "The reset completed, but local sign-out could not finish. Tap Check progress to retry before signing in.",
        );
      } finally {
        setClearing(false);
      }
    })();
  }, [progress, operationId, authLoading, updateLocalUser, refreshVersion]);

  return (
    <ResetContext.Provider
      value={{
        operationId,
        visible,
        status,
        progress,
        error,
        storageError,
        ready,
        clearing,
        signedOut,
        begin,
        checkOwnedOperation,
        forget,
        hide: () => setVisible(false),
        show: () => setVisible(true),
        refresh,
      }}
    >
      {children}
    </ResetContext.Provider>
  );
}

export function useSystemReset() {
  const context = useContext(ResetContext);
  if (!context) throw new Error("useSystemReset requires SystemResetProvider");
  return context;
}
