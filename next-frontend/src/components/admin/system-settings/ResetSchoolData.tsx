"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminSectionCard } from "@/components/admin/AdminPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingHelp } from "./SettingHelp";
import { systemResetService } from "@/services/system-reset-service";
import { returnFromReset } from "@/lib/system-reset-navigation";
import {
  clearResetOperationId,
  openResetProgress,
  readResetOperationId,
  rememberResetOperationId,
} from "@/lib/system-reset-session";
import type {
  ExecuteSystemReset,
  ResetAcademicPolicy,
  ResetCapability,
  ResetPeriodKey,
  ResetPreview,
} from "@/types/system-reset";

const REQUIRED_ACKNOWLEDGEMENTS = [
  "OTHER_ACCOUNTS_REMOVED",
  "SCHOOL_CONTENT_REMOVED",
  "FILES_AND_INDEXES_REMOVED",
  "AUDIT_AND_SETTINGS_RETAINED",
  "SIGN_IN_AGAIN",
];
const fieldClass =
  "h-11 w-full rounded-md border border-[var(--admin-outline-strong)] bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] disabled:opacity-60";

function errorMessage(error: unknown, fallback: string) {
  const response = (
    error as { response?: { data?: { message?: string | string[] } } }
  )?.response?.data?.message;
  return typeof response === "string"
    ? response
    : Array.isArray(response)
      ? response.join(" ")
      : fallback;
}

export function ResetSchoolData() {
  const router = useRouter();
  const search = useSearchParams();
  const [pendingOperationId, setPendingOperationId] = useState<
    string | null | undefined
  >(undefined);
  const [recovering, setRecovering] = useState(false);
  const [capability, setCapability] = useState<ResetCapability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [schoolYear, setSchoolYear] = useState("");
  const [period, setPeriod] = useState<ResetPeriodKey | "">("");
  const [policy, setPolicy] = useState<ResetAcademicPolicy | null>(null);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policyError, setPolicyError] = useState("");
  const [policyRetry, setPolicyRetry] = useState(0);
  const [preview, setPreview] = useState<ResetPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [acknowledgements, setAcknowledgements] = useState<string[]>([]);
  const [uncertain, setUncertain] = useState(false);
  const [checking, setChecking] = useState(false);
  const execution = useRef<ExecuteSystemReset | null>(null);
  const submitting = useRef(false);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const yearInput = useRef<HTMLInputElement>(null);
  const targetValid =
    /^\d{4}-\d{4}$/.test(schoolYear) &&
    Number(schoolYear.slice(5)) === Number(schoolYear.slice(0, 4)) + 1;
  const expired =
    !!preview &&
    (!Number.isFinite(Date.parse(preview.expiresAt)) ||
      Date.parse(preview.expiresAt) <= now);
  const required = capability?.acknowledgements ?? [];
  const completeAcknowledgements =
    REQUIRED_ACKNOWLEDGEMENTS.every((code) =>
      required.some((item) => item.code === code),
    ) && required.every((item) => acknowledgements.includes(item.code));
  const canExecute =
    !!preview &&
    !expired &&
    online &&
    !busy &&
    reason.trim().length >= 10 &&
    reason.trim().length <= 500 &&
    !!password &&
    confirmation === preview.confirmation &&
    completeAcknowledgements;

  async function loadCapability() {
    setLoading(true);
    setError("");
    try {
      const response = await systemResetService.getCapability();
      if (!response.success) throw new Error(response.message);
      setCapability(response.data);
    } catch (cause) {
      setError(
        errorMessage(
          cause,
          "Unable to load reset availability. Try again when connected.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    setPendingOperationId(readResetOperationId());
  }, []);
  useEffect(() => {
    if (pendingOperationId === null || recovering) void loadCapability();
  }, [pendingOperationId, recovering]);
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
    if (!preview) return;
    reviewHeading.current?.focus();
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [preview]);
  useEffect(() => {
    let cancelled = false;
    setPolicy(null);
    setPeriod("");
    setPolicyError("");
    if (!targetValid || !capability?.available || capability.active) {
      setPolicyLoading(false);
      return;
    }
    setPolicyLoading(true);
    void systemResetService
      .getPolicy(schoolYear)
      .then((response) => {
        if (cancelled) return;
        if (!response.success) throw new Error(response.message);
        setPolicy(response.data.policy);
      })
      .catch((cause) => {
        if (!cancelled)
          setPolicyError(
            errorMessage(
              cause,
              "Unable to load the grading periods for this school year.",
            ),
          );
      })
      .finally(() => {
        if (!cancelled) setPolicyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    schoolYear,
    targetValid,
    capability?.available,
    capability?.active,
    policyRetry,
  ]);

  function clearReview() {
    setPreview(null);
    setReason("");
    setPassword("");
    setConfirmation("");
    setAcknowledgements([]);
    setUncertain(false);
    execution.current = null;
    setError("");
  }
  function goBack() {
    clearReview();
    returnFromReset(router, search.get("from"));
  }
  async function generatePreview() {
    if (!targetValid || !period || !online || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await systemResetService.preview({ schoolYear, period });
      if (!response.success) throw new Error(response.message);
      clearReview();
      setNow(Date.now());
      setPreview(response.data);
    } catch (cause) {
      setError(
        errorMessage(
          cause,
          "Preview could not be generated. No reset has been requested.",
        ),
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  async function checkAcceptance() {
    if (!execution.current || checking) return;
    setChecking(true);
    try {
      const response = await systemResetService.getPublicStatus();
      if (
        response.success &&
        response.data.operationId === execution.current.idempotencyKey &&
        response.data.status !== "idle"
      ) {
        openResetProgress(execution.current.idempotencyKey);
      } else
        setError(
          "Acceptance is not confirmed. No matching operation is visible yet. Retry the same request or check again; do not start a new reset.",
        );
    } catch {
      setError(
        "Acceptance is not confirmed. The status service could not be reached. Reconnect and check again.",
      );
    } finally {
      setChecking(false);
    }
  }
  async function checkSavedRequest() {
    if (!pendingOperationId || checking || !online) return;
    setChecking(true);
    setError("");
    try {
      const response =
        await systemResetService.getOperation(pendingOperationId);
      if (response.success && response.data.operationId === pendingOperationId)
        openResetProgress(pendingOperationId);
      else
        setError(
          "The server could not verify the saved request. Keep its operation ID and check again.",
        );
    } catch {
      setError(
        "The server could not verify the saved request. A missing receipt does not prove it was rejected. Keep this operation ID when reviewing again.",
      );
    } finally {
      setChecking(false);
    }
  }
  async function execute() {
    if (
      submitting.current ||
      !online ||
      !navigator.onLine ||
      (!uncertain && !canExecute)
    )
      return;
    if (
      !uncertain &&
      (!preview || Date.parse(preview.expiresAt) <= Date.now())
    ) {
      setNow(Date.now());
      return;
    }
    const payload = execution.current ?? {
      previewToken: preview!.previewToken,
      idempotencyKey: pendingOperationId ?? crypto.randomUUID(),
      reason: reason.trim(),
      currentPassword: password,
      confirmation,
      acknowledgements,
    };
    try {
      rememberResetOperationId(payload.idempotencyKey);
    } catch {
      setError(
        "The operation ID could not be saved. No reset request was sent. Allow browser storage and retry.",
      );
      return;
    }
    execution.current = payload;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await systemResetService.execute(payload);
      if (
        !response.success ||
        response.data.operationId !== payload.idempotencyKey
      )
        throw new Error("Unconfirmed acceptance");
      setPassword("");
      setReason("");
      setConfirmation("");
      setAcknowledgements([]);
      setPreview(null);
      openResetProgress(response.data.operationId);
    } catch (cause) {
      const status = (cause as { response?: { status?: number } })?.response
        ?.status;
      if (status === 409) {
        setUncertain(true);
        setError(
          "The server reported a conflict. The saved operation ID is retained; check its original progress.",
        );
        openResetProgress(payload.idempotencyKey);
      } else if (
        status &&
        [400, 401, 403, 422].includes(status) &&
        !uncertain &&
        !pendingOperationId
      ) {
        try {
          clearResetOperationId();
        } catch {
          setPendingOperationId(payload.idempotencyKey);
        }
        execution.current = null;
        setPassword("");
        setError(
          errorMessage(
            cause,
            "The reset request was rejected. Review the details and generate a new preview.",
          ),
        );
        if (status === 400) {
          setPreview(null);
          setConfirmation("");
          setAcknowledgements([]);
          setReason("");
        }
      } else {
        setUncertain(true);
        setError(
          "Acceptance is not confirmed. Check progress or retry the same request. The server may already be working.",
        );
        void checkAcceptance();
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  if (pendingOperationId === undefined)
    return <p role="status">Checking previous requests…</p>;
  if (pendingOperationId && !recovering)
    return (
      <AdminSectionCard title="Check your previous reset" density="compact">
        <p className="text-sm leading-6">
          A previous reset request still needs its outcome checked. Resume
          public progress before starting another reset.
        </p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-800">
            {error}
          </p>
        )}
        {!online && (
          <p role="alert" className="mt-3 text-sm">
            You are offline. Reconnect to check the saved request.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={() => openResetProgress(pendingOperationId)}>
            Resume public progress
          </Button>
          <Button
            variant="outline"
            disabled={!online || checking}
            onClick={() => void checkSavedRequest()}
          >
            {checking ? "Checking saved request…" : "Check saved request"}
          </Button>
        </div>
        {
          <div className="mt-4 space-y-3">
            <p className="text-sm">
              If the reviewed form was lost, generate a fresh preview and
              reenter your confirmation using this same operation ID. An earlier
              request may still be accepted; keeping its ID prevents a second
              operation.
            </p>
            <Button
              className="h-auto min-h-10 whitespace-normal text-left"
              variant="outline"
              onClick={() => {
                clearReview();
                setRecovering(true);
              }}
            >
              Review again with the same operation ID
            </Button>
          </div>
        }
      </AdminSectionCard>
    );

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--admin-text-strong)]">
            Reset school data
          </h2>
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
            Prepare an empty school workspace for another testing run.
          </p>
        </div>
        <SettingHelp label="Reset school data">
          <p>
            Choose a calendar, generate a five-minute preview, then review every
            consequence before confirming. Accepted work continues if you close
            this page. Progress remains available after your session ends.
          </p>
        </SettingHelp>
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={busy || uncertain}
        onClick={goBack}
      >
        Back to settings
      </Button>
      {!online && (
        <p
          role="alert"
          className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
        >
          You are offline. Reconnect before generating a preview or submitting a
          reset.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="break-words rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900"
        >
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Checking reset availability…</p>
      ) : !capability ? (
        <Button onClick={() => void loadCapability()}>
          Retry availability check
        </Button>
      ) : (
        <>
          <p className="text-sm text-[var(--admin-text-muted)]">
            Environment: <strong>{capability.environment}</strong>
          </p>
          {!capability.available || capability.active ? (
            <AdminSectionCard
              title={
                capability.active
                  ? "A reset is already in progress"
                  : "Reset is unavailable"
              }
              density="compact"
            >
              {capability.blockers.map((blocker) => (
                <p key={blocker.code} className="mb-2 text-sm">
                  {blocker.message}
                </p>
              ))}
              {!capability.blockers.length && (
                <p className="text-sm">
                  The server has not enabled reset for this environment.
                </p>
              )}
              {capability.active && (
                <a
                  href="/system-maintenance"
                  className="mt-3 inline-block text-sm font-semibold underline"
                >
                  View public maintenance status
                </a>
              )}
              <Button
                className="mt-3"
                variant="outline"
                onClick={() => void loadCapability()}
              >
                Check availability again
              </Button>
            </AdminSectionCard>
          ) : (
            <>
              <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-950">
                This permanently clears school content and all other accounts.
                Your administrator account stays. This is a testing tool, not a
                school-year transition. There is no undo.
              </p>
              {!preview ? (
                <AdminSectionCard
                  title="1. Choose the new calendar"
                  description="The selected school year and period will be initialized after the reset."
                  density="compact"
                >
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="reset-year">School year</Label>
                      <Input
                        ref={yearInput}
                        id="reset-year"
                        value={schoolYear}
                        placeholder="2026-2027"
                        maxLength={9}
                        disabled={busy}
                        aria-describedby="reset-year-help"
                        onChange={(event) => {
                          clearReview();
                          setSchoolYear(event.target.value);
                        }}
                      />
                      <p
                        id="reset-year-help"
                        className="mt-1 text-xs text-[var(--admin-text-muted)]"
                      >
                        Use consecutive years, for example 2026-2027.
                      </p>
                    </div>
                    {schoolYear && !targetValid && (
                      <p role="status" className="text-sm text-red-800">
                        Enter two consecutive four-digit years.
                      </p>
                    )}
                    <div>
                      <Label htmlFor="reset-period">
                        Starting grading period
                      </Label>
                      <select
                        id="reset-period"
                        className={fieldClass}
                        value={period}
                        disabled={busy || !policy || policyLoading}
                        onChange={(event) => {
                          clearReview();
                          setPeriod(event.target.value as ResetPeriodKey);
                        }}
                      >
                        <option value="">
                          {policyLoading
                            ? "Loading grading periods…"
                            : "Choose a grading period"}
                        </option>
                        {policy?.periods.map((item) => (
                          <option key={item.key} value={item.key}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {policyError && (
                      <div role="alert">
                        <p className="text-sm text-red-800">{policyError}</p>
                        <Button
                          variant="outline"
                          onClick={() => setPolicyRetry((value) => value + 1)}
                        >
                          Retry grading periods
                        </Button>
                      </div>
                    )}
                    <Button
                      onClick={() => void generatePreview()}
                      disabled={
                        busy ||
                        !targetValid ||
                        !period ||
                        !online ||
                        policyLoading
                      }
                    >
                      {busy ? "Generating preview…" : "Generate preview"}
                    </Button>
                  </div>
                </AdminSectionCard>
              ) : (
                <>
                  <AdminSectionCard
                    title="2. Review what will happen"
                    density="compact"
                  >
                    <h3
                      ref={reviewHeading}
                      tabIndex={-1}
                      className="font-semibold focus:outline-none"
                    >
                      {preview.schoolYear} ·{" "}
                      {preview.policy.periods.find(
                        (item) => item.key === preview.period,
                      )?.label ?? preview.period}
                    </h3>
                    <p className="mt-2 text-sm">
                      Preview expires at{" "}
                      {new Date(preview.expiresAt).toLocaleTimeString()} (five
                      minutes after generation).
                    </p>
                    {expired && (
                      <p role="alert" className="mt-2 font-medium text-red-800">
                        Preview expired. Generate a new preview before starting
                        a reset.
                      </p>
                    )}
                    <div className="mt-4 grid gap-5 sm:grid-cols-2">
                      <div>
                        <h4 className="font-semibold">Cleared</h4>
                        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6">
                          <li>
                            {Math.max(0, (preview.counts.users ?? 1) - 1)} other
                            accounts
                          </li>
                          <li>
                            All school content, classes, assessments, grades,
                            messages and chats, including your own content
                          </li>
                          <li>
                            Uploaded files, search vectors and indexes, and
                            queued jobs
                          </li>
                          <li>All login sessions; you will sign in again</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold">Kept</h4>
                        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6">
                          <li>
                            1 administrator account:{" "}
                            <span className="break-all">
                              {preview.actor.displayName} ({preview.actor.email}
                              )
                            </span>
                          </li>
                          <li>
                            System settings, role definitions, APK update
                            settings and policies
                          </li>
                          <li>
                            Audit and repair history, plus reset receipts
                            containing legacy evidence
                          </li>
                        </ul>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-6">
                      This does not erase all historical evidence. Audit records
                      and reset receipts can retain names and academic values.
                    </p>
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-medium">
                        Table inventory (technical details)
                      </summary>
                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <caption className="sr-only">
                            Server preview inventory
                          </caption>
                          <thead>
                            <tr>
                              <th className="p-2">Table</th>
                              <th className="p-2">Action</th>
                              <th className="p-2">Rows</th>
                            </tr>
                          </thead>
                          <tbody>
                            {preview.tables.map((table) => (
                              <tr
                                key={table.name}
                                className="border-t border-[var(--admin-outline)]"
                              >
                                <td className="p-2 break-all">{table.name}</td>
                                <td className="p-2">{table.action}</td>
                                <td className="p-2">
                                  {table.count.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="mt-2 text-xs">
                        Archive means exact legacy evidence is kept in reset
                        receipts before its live rows are cleared.
                      </p>
                    </details>
                  </AdminSectionCard>
                  <AdminSectionCard
                    title="3. Confirm the irreversible reset"
                    density="compact"
                  >
                    <form
                      className="space-y-4"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void execute();
                      }}
                    >
                      <fieldset
                        disabled={busy || uncertain}
                        className="space-y-4"
                      >
                        <legend className="sr-only">Reset confirmation</legend>
                        <div>
                          <Label htmlFor="reset-reason">Reason for reset</Label>
                          <textarea
                            id="reset-reason"
                            className={`${fieldClass} min-h-24 py-2`}
                            minLength={10}
                            maxLength={500}
                            value={reason}
                            onChange={(event) => {
                              execution.current = null;
                              setReason(event.target.value);
                            }}
                            required
                          />
                          <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                            10–500 characters. Saved with the reset audit
                            record.
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="reset-password">
                            Current password
                          </Label>
                          <Input
                            id="reset-password"
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(event) => {
                              execution.current = null;
                              setPassword(event.target.value);
                            }}
                            required
                          />
                        </div>
                        <div className="space-y-3">
                          {required.map((item) => (
                            <label
                              key={item.code}
                              className="flex items-start gap-3 text-sm leading-6"
                            >
                              <input
                                type="checkbox"
                                className="mt-1 h-4 w-4 shrink-0 accent-red-700"
                                checked={acknowledgements.includes(item.code)}
                                onChange={(event) => {
                                  execution.current = null;
                                  setAcknowledgements((value) =>
                                    event.target.checked
                                      ? [...value, item.code]
                                      : value.filter(
                                          (code) => code !== item.code,
                                        ),
                                  );
                                }}
                              />
                              {item.label}
                            </label>
                          ))}
                        </div>
                        <div>
                          <Label htmlFor="reset-confirmation">
                            Type the confirmation phrase
                          </Label>
                          <p className="my-2 break-words rounded-md bg-[var(--admin-surface-soft)] p-3 font-mono text-sm select-text">
                            {preview.confirmation}
                          </p>
                          <Input
                            id="reset-confirmation"
                            autoComplete="off"
                            spellCheck={false}
                            value={confirmation}
                            onChange={(event) => {
                              execution.current = null;
                              setConfirmation(event.target.value);
                            }}
                            required
                          />
                        </div>
                      </fieldset>
                      {uncertain ? (
                        <div className="space-y-3">
                          <p className="text-sm">
                            Your reviewed request is locked while acceptance is
                            uncertain. Retrying uses the same operation ID.
                            Leaving this page does not cancel server work.
                          </p>
                          <div className="flex flex-wrap gap-3">
                            <Button
                              type="button"
                              variant="outline"
                              disabled={!online || checking || busy}
                              onClick={() => void checkAcceptance()}
                            >
                              {checking
                                ? "Checking progress…"
                                : "Check acceptance and progress"}
                            </Button>
                            <Button
                              type="button"
                              disabled={!online || busy}
                              onClick={() => void execute()}
                            >
                              {busy ? "Submitting…" : "Retry the same request"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-3">
                          <Button
                            type="submit"
                            variant="destructive"
                            disabled={!canExecute}
                          >
                            {busy
                              ? "Submitting reset…"
                              : "Reset school data permanently"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={busy}
                            onClick={() => {
                              clearReview();
                              window.setTimeout(
                                () => yearInput.current?.focus(),
                                0,
                              );
                            }}
                          >
                            Change calendar / cancel preview
                          </Button>
                        </div>
                      )}
                    </form>
                  </AdminSectionCard>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
