"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { clearAccessToken } from "@/lib/api-client";
import { clearSystemResetClientState } from "@/lib/system-reset-client-state";
import {
  clearResetOperationId,
  readResetOperationId,
  readResetUrlOperationId,
  rememberResetOperationId,
} from "@/lib/system-reset-session";
import { systemResetService } from "@/services/system-reset-service";
import { Button } from "@/components/ui/button";
import type { ResetPublicStatus } from "@/types/system-reset";

const PHASES: Record<string, string> = {
  draining: "Pausing school activity and finishing active work",
  cleanup: "Clearing school data, files, indexes and jobs",
  verifying: "Checking the empty workspace",
  restoring: "Restoring access with the selected calendar",
  complete: "Reset complete",
  aborted: "Reset stopped before school data was cleared",
};

export function SystemMaintenance() {
  const queryClient = useQueryClient();
  const { setUser } = useAuth();
  const [operationId, setOperationId] = useState<string | null | undefined>(
    undefined,
  );
  const [status, setStatus] = useState<ResetPublicStatus | null>(null);
  const [urlOperationId, setUrlOperationId] = useState<string | null>(null);
  const [checkingReceipt, setCheckingReceipt] = useState(false);
  const [cleanupError, setCleanupError] = useState("");
  const [cleanupAttempt, setCleanupAttempt] = useState(0);
  const [cleanupDone, setCleanupDone] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [online, setOnline] = useState(true);
  const settled = useRef(false);
  const lastCleanupAttempt = useRef(-1);
  const terminalReceipt = useRef<ResetPublicStatus | null>(null);
  const matches = !!operationId && status?.operationId === operationId;
  const completed = matches && status?.status === "completed";
  const aborted = matches && status?.status === "aborted";

  useEffect(() => {
    setOperationId(readResetOperationId());
    setUrlOperationId(readResetUrlOperationId());
  }, []);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    if (operationId === undefined) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      if (terminalReceipt.current?.operationId === operationId) return;
      try {
        const response = await systemResetService.getPublicStatus();
        if (cancelled || terminalReceipt.current?.operationId === operationId)
          return;
        if (!response.success) throw new Error("Status unavailable");
        setStatus(response.data);
        setError("");
        if (
          operationId &&
          response.data.operationId === operationId &&
          ["completed", "aborted"].includes(response.data.status)
        ) {
          terminalReceipt.current = response.data;
          return;
        }
      } catch {
        if (!cancelled)
          setError(
            "The latest status could not be verified. The reset may still be running. This page will check again.",
          );
      }
      if (!cancelled) timer = setTimeout(() => void poll(), 3000);
    }
    if (online) void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [operationId, retry, online]);
  useEffect(() => {
    if (
      (!completed && !aborted) ||
      settled.current ||
      lastCleanupAttempt.current === cleanupAttempt
    )
      return;
    lastCleanupAttempt.current = cleanupAttempt;
    // Run every local cleanup even if optional browser storage is denied.
    // Mark settled only after all steps succeeded so the visible retry works.
    let failed = false;
    const steps = completed
      ? [
          clearAccessToken,
          () => queryClient.clear(),
          () => setUser(null),
          clearSystemResetClientState,
        ]
      : [];
    for (const step of steps) {
      try {
        step();
      } catch {
        failed = true;
      }
    }
    // Keep recovery identity across reloads until every local cleanup succeeds.
    if (!failed) {
      try {
        clearResetOperationId();
      } catch {
        failed = true;
      }
    }
    settled.current = !failed;
    setCleanupDone(!failed);
    setCleanupError(
      failed
        ? "The server outcome is verified, but local cleanup could not finish. Allow browser storage and retry local cleanup."
        : "",
    );
  }, [completed, aborted, queryClient, setUser, cleanupAttempt]);

  async function checkOwnedReceipt() {
    const target = operationId ?? urlOperationId;
    if (!target || checkingReceipt || !online) return;
    setCheckingReceipt(true);
    setError("");
    try {
      const response = await systemResetService.getOperation(target);
      if (!response.success || response.data.operationId !== target)
        throw new Error("Unverified receipt");
      // A URL alone is untrusted until this explicit authenticated ownership check.
      if (!operationId) {
        rememberResetOperationId(target);
        setOperationId(target);
      }
      const next: ResetPublicStatus = {
        active: response.data.status === "running",
        operationId: target,
        phase: response.data.phase,
        status: response.data.status,
        retrying: response.data.retrying,
      };
      if (next.status === "completed" || next.status === "aborted")
        terminalReceipt.current = next;
      setStatus(next);
    } catch {
      setError(
        "The owned receipt could not be verified. Sign in as the requesting administrator and check again. A missing receipt does not prove rejection; the saved operation ID is kept.",
      );
    } finally {
      setCheckingReceipt(false);
    }
  }

  return (
    <main className="min-h-screen bg-white px-4 py-10 text-gray-950 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <p className="text-sm font-semibold text-red-800">
          Nexora · System maintenance
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {completed
            ? "School data reset complete"
            : aborted
              ? "Reset stopped safely"
              : "School data reset status"}
        </h1>
        {!online && (
          <p
            role="alert"
            className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm"
          >
            You are offline. Reconnect to check the actual server status.
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm"
          >
            {error}
          </p>
        )}
        {urlOperationId && operationId && urlOperationId !== operationId && (
          <p
            role="alert"
            className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm"
          >
            This link identifies a different operation. Your saved request
            remains authoritative; the linked operation will not replace it.
          </p>
        )}
        {!operationId && urlOperationId && (
          <p className="text-sm">
            This URL is not a saved reviewed request. Verify ownership with an
            administrator session before recovering its outcome.
          </p>
        )}
        {cleanupError && (
          <p
            role="alert"
            className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm"
          >
            {cleanupError}
          </p>
        )}
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-gray-200 p-5 text-sm leading-6"
        >
          {!status ? (
            "Checking the server…"
          ) : completed ? (
            <>
              <p>
                Your empty workspace and selected calendar are ready. Only the
                retained administrator account can sign in.
              </p>
              <p className="mt-2">
                Your previous session has ended. Sign in with the same
                administrator credentials.
              </p>
            </>
          ) : aborted ? (
            <p>
              School data was preserved. Return to settings to review
              availability before trying again.
            </p>
          ) : status.active ? (
            <>
              <p className="font-medium">
                {PHASES[status.phase ?? ""] ?? "Maintenance is in progress"}
              </p>
              {status.retrying && (
                <p className="mt-2">
                  The server is retrying a required cleanup step. Keep this page
                  open for updates.
                </p>
              )}
              {operationId && !matches && (
                <p className="mt-2">
                  The visible operation does not match your saved request. This
                  is the current public maintenance status; completion of your
                  request has not been verified.
                </p>
              )}
            </>
          ) : operationId ? (
            <p>
              The visible status does not match an accepted reset for your saved
              request. Acceptance is not confirmed. Return to the original tab
              to retry the same request, or sign in to investigate. Do not start
              another reset until its status is resolved.
            </p>
          ) : (
            <p>
              No active maintenance is reported. Without a saved operation ID,
              this page cannot verify the outcome of an earlier reset.
            </p>
          )}
        </div>
        {!completed && !aborted && (
          <p className="text-sm leading-6 text-gray-600">
            Closing this page does not cancel server work. Updates show the
            server’s actual phase; some steps may take longer while dependencies
            recover.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-4">
          {cleanupError && (
            <Button
              variant="outline"
              onClick={() => setCleanupAttempt((value) => value + 1)}
            >
              Retry local cleanup
            </Button>
          )}
          {completed && cleanupDone ? (
            <a
              href="/login"
              className="inline-flex min-h-11 items-center rounded-md bg-red-700 px-4 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            >
              Sign in again
            </a>
          ) : aborted && cleanupDone ? (
            <a
              href="/dashboard/admin/system-settings"
              className="text-sm font-semibold text-red-800 underline underline-offset-4"
            >
              Return to system settings
            </a>
          ) : (
            <>
              <Button
                variant="outline"
                disabled={!online}
                onClick={() => setRetry((value) => value + 1)}
              >
                Check again
              </Button>
              {(operationId || urlOperationId) && !completed && !aborted && (
                <Button
                  variant="outline"
                  className="h-auto min-h-10 whitespace-normal"
                  disabled={!online || checkingReceipt}
                  onClick={() => void checkOwnedReceipt()}
                >
                  {checkingReceipt
                    ? "Checking owned receipt…"
                    : operationId
                      ? "Check authenticated receipt"
                      : "Verify linked request with administrator session"}
                </Button>
              )}
              {!status?.active && !completed && !aborted && (
                <a
                  href={
                    operationId
                      ? "/dashboard/admin/system-settings/reset-school-data"
                      : "/login"
                  }
                  className="text-sm font-semibold text-red-800 underline underline-offset-4"
                >
                  {operationId ? "Check request in settings" : "Sign in"}
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
