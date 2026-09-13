"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorEvidence, getApiErrorMessage } from "@/lib/api-error";
import { useOptionalAdminMaintenance } from "@/providers/AdminMaintenanceProvider";
import type {
  AdminLifecycleExecutionEvidence,
  AdminLifecycleExecutionResult,
  AdminLifecyclePreview,
  AdminMaintenanceNextAction,
} from "@/types/admin-lifecycle";

export interface LifecycleIntentOption {
  value: string;
  label: string;
  description: string;
}

interface AdminLifecycleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  targetLabel: string;
  intents: LifecycleIntentOption[];
  initialIntent?: string;
  preview: (intent: string) => Promise<AdminLifecyclePreview>;
  execute: (
    intent: string,
    evidence: AdminLifecycleExecutionEvidence,
  ) => Promise<AdminLifecycleExecutionResult>;
  renderIntentFields?: (intent: string) => React.ReactNode;
  canPreview?: (intent: string) => boolean;
  previewInputKey?: string;
  onNextAction?: (
    action: AdminMaintenanceNextAction,
  ) => boolean | Promise<boolean>;
  onCompleted?: (result: AdminLifecycleExecutionResult) => void | Promise<void>;
  permanent?: boolean;
}

const reasons: Array<{
  value: AdminLifecycleExecutionEvidence["reasonCode"];
  label: string;
}> = [
  { value: "ERRONEOUS_ENROLLMENT", label: "Enrollment correction" },
  { value: "TRANSFERRED_SECTION", label: "Section transfer" },
  { value: "TRANSFERRED_CLASS", label: "Class transfer" },
  { value: "TRANSFERRED_SCHOOL", label: "Transferred school" },
  { value: "WITHDREW", label: "Learner withdrawal" },
  { value: "COMPLETED", label: "Academic completion" },
  { value: "DUPLICATE_CLASS", label: "Duplicate class" },
  { value: "CURRICULUM_CORRECTION", label: "Curriculum correction" },
  { value: "TEST_OR_EMPTY_RECORD", label: "Empty or test record" },
  { value: "OTHER", label: "Other documented reason" },
];

function newIdempotencyKey() {
  return globalThis.crypto.randomUUID();
}

export function AdminLifecycleDialog({
  open,
  onOpenChange,
  title,
  description,
  targetLabel,
  intents,
  initialIntent,
  preview,
  execute,
  renderIntentFields,
  canPreview,
  previewInputKey,
  onNextAction,
  onCompleted,
  permanent = false,
}: AdminLifecycleDialogProps) {
  const maintenance = useOptionalAdminMaintenance();
  const defaultIntent = initialIntent ?? intents[0]?.value ?? "";
  const [intent, setIntent] = useState(defaultIntent);
  const [prepared, setPrepared] = useState<AdminLifecyclePreview | null>(null);
  const [confirmations, setConfirmations] = useState<string[]>([]);
  const [reasonCode, setReasonCode] =
    useState<AdminLifecycleExecutionEvidence["reasonCode"]>("OTHER");
  const [notes, setNotes] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdminLifecycleExecutionResult | null>(
    null,
  );
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

  useEffect(() => {
    if (!open) return;
    setIntent(defaultIntent);
    setPrepared(null);
    setConfirmations([]);
    setReasonCode("OTHER");
    setNotes("");
    setPassword("");
    setError(null);
    setResult(null);
    setIdempotencyKey(newIdempotencyKey());
  }, [defaultIntent, open]);

  useEffect(() => {
    if (!open || previewInputKey === undefined) return;
    setPrepared(null);
    setConfirmations([]);
    setPassword("");
    setError(null);
    setIdempotencyKey(newIdempotencyKey());
  }, [open, previewInputKey]);

  const required = useMemo(
    () => prepared?.manifest.requiredConfirmations ?? [],
    [prepared],
  );
  const allConfirmed = useMemo(
    () => required.every((entry) => confirmations.includes(entry)),
    [confirmations, required],
  );

  const loadPreview = async (selectedIntent = intent) => {
    setLoading(true);
    setError(null);
    try {
      const next = await preview(selectedIntent);
      setPrepared(next);
      setConfirmations([]);
      return next;
    } catch (nextError) {
      setError(
        getApiErrorMessage(nextError, "Unable to prepare lifecycle review"),
      );
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!prepared) return;
    setLoading(true);
    setError(null);
    try {
      const completed = await execute(intent, {
        manifestHash: prepared.manifest.manifestHash,
        manifestExpiresAt: prepared.manifest.expiresAt,
        ...(passwordRequired ? { currentPassword: password } : {}),
        reasonCode,
        notes: notes.trim(),
        confirmations,
        idempotencyKey,
      });
      setResult(completed);
      await onCompleted?.(completed);
    } catch (nextError) {
      const evidence = getApiErrorEvidence(
        nextError,
        "Lifecycle operation failed",
      );
      if (evidence.code === "MAINTENANCE_SESSION_REQUIRED") {
        setPrepared(null);
        setConfirmations([]);
        setPassword("");
        setIdempotencyKey(newIdempotencyKey());
        await maintenance?.refresh();
        setError(
          "Maintenance Access expired or changed. Reauthenticate, then review the impact again. Your selected outcome, reason, and notes were kept.",
        );
      } else if (evidence.statusCode === 409) {
        setIdempotencyKey(newIdempotencyKey());
        const refreshed = await loadPreview(intent);
        if (refreshed) {
          setError(
            "The data changed or the review expired. Your selected outcome was kept; review the refreshed effects before confirming again.",
          );
        }
      } else {
        setError(evidence.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const manifest = prepared?.manifest;
  const decision = manifest?.decision ?? {
    state: manifest?.safeToExecute
      ? ("READY" as const)
      : ("IMMUTABLE" as const),
    code: manifest?.safeToExecute ? "READY" : "BLOCKED",
    message: manifest?.safeToExecute
      ? "This maintenance action is ready to execute."
      : "The backend did not provide an executable path.",
    nextActions: [],
  };
  const blocked = Boolean(manifest && !manifest.safeToExecute);
  const disposition =
    decision.disposition ??
    (decision.state === "IMMUTABLE"
      ? "REPAIR_REQUIRED"
      : decision.state === "NEEDS_CHOICE"
        ? "CHOICE_REQUIRED"
        : "EXECUTABLE");
  const retainRequired = disposition === "RETAIN_REQUIRED";
  const singleIntent = intents.length <= 1;
  const maintenanceActive = maintenance?.status?.active === true;
  const passwordRequired = permanent;
  const readyToExecute =
    Boolean(manifest) &&
    maintenanceActive &&
    !blocked &&
    allConfirmed &&
    notes.trim().length >= 5 &&
    (!passwordRequired || password.length > 0);

  const handleNextAction = async (action: AdminMaintenanceNextAction) => {
    setPrepared(null);
    setConfirmations([]);
    setPassword("");
    setError(null);
    setIdempotencyKey(newIdempotencyKey());
    if (onNextAction) {
      setLoading(true);
      try {
        if (await onNextAction(action)) return;
      } catch (nextError) {
        setError(
          getApiErrorMessage(nextError, "Unable to refresh lifecycle inputs"),
        );
        return;
      } finally {
        setLoading(false);
      }
    }
    if (!action.intent) return;
    setIntent(action.intent);
    await loadPreview(action.intent);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        variant="admin"
        className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-[1.4rem] border-[var(--admin-outline)] bg-white"
      >
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-700">
            {permanent ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <ShieldCheck className="h-5 w-5" />
            )}
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="h-5 w-5" />
                Operation completed
              </div>
              <p className="mt-2 text-sm">
                {result.changed.length} change
                {result.changed.length === 1 ? "" : "s"} recorded. Operation ID:{" "}
                <span className="font-mono">{result.operationId}</span>
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-xl border border-[var(--admin-outline)] bg-[#fbfcfe] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--admin-text-muted)]">
                Target
              </p>
              <p className="mt-1 font-bold text-[var(--admin-text-strong)]">
                {targetLabel}
              </p>
            </div>

            <div className="space-y-2">
              {!singleIntent ? (
                <>
                  <Label htmlFor="lifecycle-intent">Outcome</Label>
                  <select
                    id="lifecycle-intent"
                    value={intent}
                    onChange={(event) => {
                      setIntent(event.target.value);
                      setPrepared(null);
                      setError(null);
                    }}
                    className="admin-select w-full"
                  >
                    {intents.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </>
              ) : null}
              <p className="text-sm text-[var(--admin-text-muted)]">
                {intents.find((option) => option.value === intent)?.description}
              </p>
              {renderIntentFields?.(intent)}
            </div>

            {!manifest ? (
              <Button
                className="admin-button-solid w-full"
                disabled={loading || (canPreview ? !canPreview(intent) : false)}
                onClick={() => void loadPreview()}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Review impact
              </Button>
            ) : (
              <>
                {manifest.blockers.length > 0 ? (
                  <section className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <h3 className="font-bold text-red-900">
                      {retainRequired
                        ? "Why this record must be kept"
                        : "What needs attention"}
                    </h3>
                    <ul className="mt-2 space-y-2 text-sm text-red-800">
                      {manifest.blockers.map((entry) => (
                        <li key={`${entry.code}-${entry.message}`}>
                          {entry.message}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {!blocked && manifest.warnings.length > 0 ? (
                  <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <h3 className="font-bold text-amber-900">
                      Warnings to acknowledge
                    </h3>
                    <ul className="mt-2 space-y-2 text-sm text-amber-900">
                      {manifest.warnings.map((entry) => (
                        <li key={`${entry.code}-${entry.message}`}>
                          {entry.message}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                <section
                  className={`rounded-xl border p-4 ${
                    retainRequired
                      ? "border-blue-200 bg-blue-50 text-blue-950"
                      : decision.state === "IMMUTABLE"
                        ? "border-red-200 bg-red-50"
                        : "border-blue-200 bg-blue-50"
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-[0.12em]">
                    {retainRequired
                      ? "Record must be kept"
                      : decision.state.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-sm">{decision.message}</p>
                  {decision.nextActions.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {decision.nextActions.map((action) =>
                        action.kind === "NAVIGATE_REPAIR" && action.href ? (
                          <Button key={action.id} variant="outline" asChild>
                            <a href={action.href}>{action.label}</a>
                          </Button>
                        ) : action.kind === "CANCEL" ? (
                          <Button
                            key={action.id}
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                          >
                            {action.label}
                          </Button>
                        ) : action.kind === "REPREVIEW" && action.intent ? (
                          <Button
                            key={action.id}
                            variant="outline"
                            disabled={loading}
                            onClick={() =>
                              void handleNextAction(action)
                            }
                          >
                            {action.label}
                          </Button>
                        ) : null,
                      )}
                    </div>
                  ) : null}
                </section>

                <div className="grid gap-4 md:grid-cols-2">
                  {!retainRequired && manifest.effects.length > 0 ? (
                    <section>
                      <h3 className="text-sm font-bold text-[var(--admin-text-strong)]">
                        Will change
                      </h3>
                      <ul className="mt-2 space-y-2 text-sm text-[var(--admin-text-muted)]">
                        {manifest.effects.map((entry) => (
                          <li
                            key={`${entry.entityType}-${entry.entityId}-${entry.summary}`}
                          >
                            {entry.summary}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                  {manifest.preserved.length > 0 ? (
                    <section>
                      <h3 className="text-sm font-bold text-[var(--admin-text-strong)]">
                        Will be preserved
                      </h3>
                      <ul className="mt-2 space-y-2 text-sm text-[var(--admin-text-muted)]">
                        {manifest.preserved.map((entry) => (
                          <li key={entry}>{entry}</li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>

                {!blocked ? (
                  <section className="space-y-4 border-t border-[var(--admin-outline)] pt-4">
                    {!maintenanceActive ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                        <p className="font-bold">
                          Maintenance Access is required to apply this reviewed
                          change.
                        </p>
                        <p className="mt-1">
                          Open a 15-minute session, then return and review the
                          impact again.
                        </p>
                        <Button className="mt-3" variant="outline" asChild>
                          <a href="/dashboard/admin/system-settings/maintenance-access/">
                            Open Maintenance Access
                          </a>
                        </Button>
                      </div>
                    ) : null}
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-[var(--admin-text-strong)]">
                        Confirm reviewed effects
                      </p>
                      {required.map((entry) => (
                        <label
                          key={entry}
                          className="flex items-start gap-3 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={confirmations.includes(entry)}
                            onChange={(event) =>
                              setConfirmations((current) =>
                                event.target.checked
                                  ? [...current, entry]
                                  : current.filter((value) => value !== entry),
                              )
                            }
                            className="mt-1"
                          />
                          <span>
                            {entry.replaceAll("_", " ").toLowerCase()}
                          </span>
                        </label>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lifecycle-reason">Reason</Label>
                      <select
                        id="lifecycle-reason"
                        value={reasonCode}
                        onChange={(event) =>
                          setReasonCode(
                            event.target
                              .value as AdminLifecycleExecutionEvidence["reasonCode"],
                          )
                        }
                        className="admin-select w-full"
                      >
                        {reasons.map((reason) => (
                          <option key={reason.value} value={reason.value}>
                            {reason.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lifecycle-notes">
                        Administrative notes
                      </Label>
                      <textarea
                        id="lifecycle-notes"
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        className="admin-input min-h-24 w-full resize-y"
                        placeholder="Record the request, evidence checked, and effective date."
                      />
                    </div>
                    {passwordRequired ? (
                      <div className="space-y-2">
                        <Label htmlFor="lifecycle-password">
                          Current password
                        </Label>
                        <Input
                          id="lifecycle-password"
                          type="password"
                          autoComplete="current-password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          className="admin-input"
                        />
                      </div>
                    ) : maintenanceActive ? (
                      <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                        Reauthentication is already covered by your active
                        Maintenance Access window.
                      </p>
                    ) : null}
                  </section>
                ) : null}
              </>
            )}

            {error ? (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              >
                {error}
              </p>
            ) : null}

            {manifest && !blocked ? (
              <DialogFooter>
                {!singleIntent ? (
                  <Button
                    variant="outline"
                    onClick={() => setPrepared(null)}
                    disabled={loading}
                  >
                    Change outcome
                  </Button>
                ) : null}
                <Button
                  variant={permanent ? "destructive" : "default"}
                  disabled={!readyToExecute || loading}
                  onClick={() => void handleExecute()}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  {permanent ? "Permanently delete" : "Confirm and apply"}
                </Button>
              </DialogFooter>
            ) : manifest && decision.nextActions.length === 0 ? (
              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close review
                </Button>
              </DialogFooter>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
