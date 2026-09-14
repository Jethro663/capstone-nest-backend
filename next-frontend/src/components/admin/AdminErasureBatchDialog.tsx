"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
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
  AdminErasureBatchPreview,
  AdminErasureExecutionResult,
  AdminLifecycleExecutionEvidence,
  AdminPurgeTargetType,
  ExecutePurgeBatchInput,
  PreviewPurgeBatchInput,
} from "@/types/admin-lifecycle";

interface AdminErasureBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: AdminPurgeTargetType;
  targetIds: string[];
  targetLabel: string;
  title?: string;
  preview: (input: PreviewPurgeBatchInput) => Promise<AdminErasureBatchPreview>;
  execute: (
    input: ExecutePurgeBatchInput,
  ) => Promise<AdminErasureExecutionResult>;
  onCompleted?: (result: AdminErasureExecutionResult) => void | Promise<void>;
}

const reasons: Array<{
  value: AdminLifecycleExecutionEvidence["reasonCode"];
  label: string;
}> = [
  { value: "TEST_OR_EMPTY_RECORD", label: "Test or duplicate data" },
  { value: "CURRICULUM_CORRECTION", label: "Curriculum correction" },
  { value: "ERRONEOUS_ENROLLMENT", label: "Enrollment correction" },
  { value: "OTHER", label: "Other documented reason" },
];

export function AdminErasureBatchDialog({
  open,
  onOpenChange,
  targetType,
  targetIds,
  targetLabel,
  title,
  preview,
  execute,
  onCompleted,
}: AdminErasureBatchDialogProps) {
  const maintenance = useOptionalAdminMaintenance();
  const [prepared, setPrepared] = useState<AdminErasureBatchPreview | null>(
    null,
  );
  const [reasonCode, setReasonCode] =
    useState<AdminLifecycleExecutionEvidence["reasonCode"]>("OTHER");
  const [notes, setNotes] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    globalThis.crypto.randomUUID(),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdminErasureExecutionResult | null>(
    null,
  );
  const targetIdsKey = targetIds.join("|");

  useEffect(() => {
    if (!open) return;
    setPrepared(null);
    setReasonCode("OTHER");
    setNotes("");
    setConfirmation("");
    setError(null);
    setResult(null);
    setIdempotencyKey(globalThis.crypto.randomUUID());
  }, [open, targetType, targetIdsKey]);

  const loadPreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await preview({
        targetType,
        targetIds,
        purgeMode: "CASCADE_ERASE",
      });
      setPrepared(next);
      setConfirmation("");
      return next;
    } catch (nextError) {
      setError(
        getApiErrorMessage(nextError, "Unable to review permanent deletion"),
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
      const completed = await execute({
        targetType,
        targetIds: prepared.targetIds,
        purgeMode: "CASCADE_ERASE",
        manifestHash: prepared.manifestHash,
        manifestExpiresAt: prepared.manifestExpiresAt,
        reasonCode,
        notes: notes.trim(),
        confirmation,
        idempotencyKey,
      });
      setResult(completed);
      await onCompleted?.(completed);
    } catch (nextError) {
      const evidence = getApiErrorEvidence(
        nextError,
        "Permanent deletion failed",
      );
      if (
        evidence.code === "MAINTENANCE_SESSION_REQUIRED" ||
        evidence.code === "MAINTENANCE_SCOPE_REQUIRED"
      ) {
        setPrepared(null);
        setConfirmation("");
        await maintenance?.refresh();
        setError(
          "Maintenance Access is OFF or lacks the required scope. Turn it ON, then review this batch again.",
        );
      } else if (evidence.statusCode === 409) {
        setIdempotencyKey(globalThis.crypto.randomUUID());
        const refreshed = await loadPreview();
        if (refreshed) {
          setError(
            "The selection, evidence, or schema changed. Review the refreshed totals and type the new confirmation.",
          );
        }
      } else {
        setError(evidence.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const maintenanceActive = maintenance?.status?.active === true;
  const canExecute =
    Boolean(prepared?.canExecute) &&
    maintenanceActive &&
    notes.trim().length >= 5 &&
    confirmation === prepared?.confirmationText;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        variant="admin"
        className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-[1.4rem] border-[var(--admin-outline)] bg-white"
      >
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <DialogTitle>
            {title ?? `Permanently delete ${targetLabel}`}
          </DialogTitle>
          <DialogDescription>
            The whole reviewed batch is deleted atomically. Academic history and
            content listed below will also be erased.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
              <p className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="h-5 w-5" />
                {result.deletedCount} record
                {result.deletedCount === 1 ? "" : "s"} deleted
              </p>
              <p className="mt-2 text-sm">
                {result.status === "cleanup_pending"
                  ? "Database deletion is complete; file cleanup is continuing safely in the background."
                  : "Database and file cleanup are complete."}
              </p>
              <p className="mt-1 text-xs font-mono">{result.operationId}</p>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-xl border border-[var(--admin-outline)] bg-[#fbfcfe] p-4">
              <p className="font-bold text-[var(--admin-text-strong)]">
                {targetIds.length} records selected
              </p>
              <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
                {targetLabel}
              </p>
            </div>

            {!prepared ? (
              <Button
                className="admin-button-solid w-full"
                disabled={loading}
                onClick={() => void loadPreview()}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Review deletion impact
              </Button>
            ) : (
              <>
                {prepared.globalBlockers.length > 0 ? (
                  <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
                    <h3 className="font-bold">Cannot continue yet</h3>
                    <ul className="mt-2 space-y-2 text-sm">
                      {prepared.globalBlockers.map((blocker) => (
                        <li key={`${blocker.code}-${blocker.message}`}>
                          {blocker.message}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {prepared.warnings.length > 0 ? (
                  <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                    <h3 className="font-bold">
                      This data will be permanently erased
                    </h3>
                    <ul className="mt-2 space-y-1 text-sm">
                      {prepared.warnings.map((warning) => (
                        <li key={`${warning.code}-${warning.message}`}>
                          {warning.message}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                <section className="space-y-3">
                  {prepared.targets.map((target) => (
                    <div
                      key={target.id}
                      className="rounded-xl border border-[var(--admin-outline)] p-4"
                    >
                      <p className="font-bold">{target.displayName}</p>
                      <p className="text-xs text-[var(--admin-text-muted)]">
                        {target.lifecycleState}
                      </p>
                      {target.blockers.length > 0 ? (
                        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                          <p className="font-bold">
                            This record cannot be deleted yet
                          </p>
                          <ul className="mt-1 space-y-1">
                            {target.blockers.map((blocker) => (
                              <li key={`${blocker.code}-${blocker.message}`}>
                                {blocker.message}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {target.warnings.length > 0 ? (
                        <ul className="mt-3 space-y-1 text-sm text-amber-800">
                          {target.warnings.map((warning) => (
                            <li key={`${warning.code}-${warning.message}`}>
                              {warning.message}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {target.impactGroups.length ? (
                        <ul className="mt-2 grid gap-1 text-sm text-[var(--admin-text-muted)] sm:grid-cols-2">
                          {target.impactGroups.map((impact) => (
                            <li key={impact.code}>
                              {impact.label}: {impact.rowCount} ·{" "}
                              {impact.action.toLowerCase()}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-[var(--admin-text-muted)]">
                          No linked academic rows found.
                        </p>
                      )}
                    </div>
                  ))}
                </section>

                {!maintenanceActive ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                    <p className="font-bold">Maintenance Access is required.</p>
                    <Button className="mt-3" variant="outline" asChild>
                      <a href="/dashboard/admin/system-settings/maintenance-access/">
                        Turn on Maintenance Access
                      </a>
                    </Button>
                  </div>
                ) : null}

                {prepared.canExecute ? (
                  <section className="space-y-4 border-t border-[var(--admin-outline)] pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="erasure-reason">Reason</Label>
                      <select
                        id="erasure-reason"
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
                      <Label htmlFor="erasure-notes">
                        Administrative notes
                      </Label>
                      <textarea
                        id="erasure-notes"
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        className="admin-input min-h-24 w-full resize-y"
                        placeholder="Record why this permanent deletion was approved."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="erasure-confirmation">
                        Type {prepared.confirmationText}
                      </Label>
                      <Input
                        id="erasure-confirmation"
                        value={confirmation}
                        onChange={(event) =>
                          setConfirmation(event.target.value)
                        }
                        autoComplete="off"
                        className="admin-input font-mono"
                      />
                    </div>
                    <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                      Reauthentication is covered while Maintenance Access is
                      ON. No password is requested again.
                    </p>
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

            {prepared?.canExecute ? (
              <DialogFooter>
                <Button
                  variant="destructive"
                  disabled={!canExecute || loading}
                  onClick={() => void handleExecute()}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Permanently delete {targetIds.length}
                </Button>
              </DialogFooter>
            ) : prepared ? (
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
