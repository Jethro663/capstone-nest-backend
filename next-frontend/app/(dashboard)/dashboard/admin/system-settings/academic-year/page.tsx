"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarRange, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { AdminSectionCard } from "@/components/admin/AdminPageShell";
import { AcademicStateView } from "@/components/admin/system-settings/AcademicStateView";
import { SettingHelp } from "@/components/admin/system-settings/SettingHelp";
import { useAcademicStateCurrent } from "@/components/admin/system-settings/useAcademicStateCurrent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api-error";
import { academicStateService } from "@/services/academic-state-service";
import type {
  AcademicActivationPreview,
  AcademicQuarter,
} from "@/types/academic-state";

export default function AcademicYearSettingsPage() {
  const { current, loading, error, refresh } = useAcademicStateCurrent();
  const [targetPeriod, setTargetPeriod] = useState<AcademicQuarter>("Q1");
  const [activation, setActivation] =
    useState<AcademicActivationPreview | null>(null);
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [override, setOverride] = useState(false);
  const [busy, setBusy] = useState<"preview" | "activate" | null>(null);
  const request = useRef<{ signature: string; id: string } | null>(null);

  useEffect(() => {
    if (!current || current.periods.length === 0) return;
    const activeIndex = current.periods.findIndex(
      (period) => period.key === current.quarter,
    );
    const nextIndex = Math.min(
      Math.max(activeIndex, 0) + 1,
      current.periods.length - 1,
    );
    setTargetPeriod(current.periods[nextIndex].key);
  }, [current]);

  const activeLabel =
    current?.periods.find((period) => period.key === current.quarter)?.label ??
    current?.quarter;

  const previewPeriod = async () => {
    setBusy("preview");
    setActivation(null);
    setPassword("");
    setOverride(false);
    setReason("");
    try {
      const response = await academicStateService.previewActivation(targetPeriod);
      setActivation(response.data);
    } catch (requestError) {
      toast.error(
        getApiErrorMessage(requestError, "The period preview could not be loaded."),
      );
    } finally {
      setBusy(null);
    }
  };

  const activatePeriod = async () => {
    if (!activation || !password || activation.alreadyActive) return;
    const payload = {
      expectedSchoolYear: activation.state.schoolYear,
      expectedQuarter: activation.state.quarter,
      expectedVersion: activation.state.version,
      targetQuarter: activation.target.key,
      override: activation.overrideRequired && override,
      reason: reason.trim() || undefined,
    };
    const signature = JSON.stringify(payload);
    if (request.current?.signature !== signature) {
      request.current = { signature, id: crypto.randomUUID() };
    }

    setBusy("activate");
    try {
      await academicStateService.activatePeriod({
        ...payload,
        requestId: request.current.id,
        currentPassword: password,
      });
      toast.success(
        `${activation.target.label} is active. Existing records were not finalized or reopened.`,
      );
      setActivation(null);
      setPassword("");
      setOverride(false);
      setReason("");
      await refresh();
    } catch (requestError) {
      toast.error(
        getApiErrorMessage(
          requestError,
          "Period activation failed. Refresh if the academic state changed.",
        ),
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <AcademicStateView
      loading={loading}
      error={error}
      onRetry={() => void refresh()}
    >
      {current ? (
        <>
          <section className="rounded-lg border border-[var(--admin-outline)] bg-white p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-700">
                <CalendarRange className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--admin-text-muted)]">
                  Academic year {current.schoolYear.replace("-", "–")}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--admin-text-strong)]">
                  Active period: {activeLabel}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--admin-text-muted)]">
                  This period controls which assessments can be released and
                  which new student attempts can begin. A preview never changes
                  school data.
                </p>
              </div>
            </div>
          </section>

          <AdminSectionCard
            title="Change the active grading period"
            description="Preview the impact first. Activation remains protected by your current password and the observed state version."
            action={
              <SettingHelp label="Active grading period">
                Choose the period that matches the official school calendar.
                Moving backward or skipping a period requires explicit
                authorization and a written reason for the audit trail.
              </SettingHelp>
            }
            density="compact"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Label htmlFor="target-period">Target period</Label>
                <select
                  id="target-period"
                  className="h-10 w-full rounded-md border border-[var(--admin-outline-strong)] bg-white px-3 text-sm"
                  value={targetPeriod}
                  disabled={!!busy}
                  onChange={(event) => {
                    setTargetPeriod(event.target.value as AcademicQuarter);
                    setActivation(null);
                    setPassword("");
                    setOverride(false);
                    setReason("");
                  }}
                >
                  {current.periods.map((period) => (
                    <option key={period.key} value={period.key}>
                      {period.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={!!busy}
                onClick={() => void previewPeriod()}
              >
                Preview period change
              </Button>
            </div>

            {activation ? (
              <div className="mt-5 space-y-4 border-t border-[var(--admin-outline)] pt-5">
                <div className="rounded-md border border-blue-100 bg-blue-50 p-4">
                  <p className="font-medium text-blue-950">{activation.message}</p>
                  <dl className="mt-3 grid gap-3 text-sm text-blue-900 sm:grid-cols-3">
                    <div>
                      <dt className="text-blue-700">Open or missing current records</dt>
                      <dd className="mt-1 text-lg font-semibold">
                        {activation.currentOpenRecords}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-blue-700">Missing target records</dt>
                      <dd className="mt-1 text-lg font-semibold">
                        {activation.targetMissingRecords}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-blue-700">Unfinished attempts</dt>
                      <dd className="mt-1 text-lg font-semibold">
                        {activation.ongoingAttempts}
                      </dd>
                    </div>
                  </dl>
                </div>

                {activation.alreadyActive ? (
                  <p className="text-sm text-[var(--admin-text-muted)]">
                    This period is already active. No activation is needed.
                  </p>
                ) : (
                  <>
                    {activation.overrideRequired ? (
                      <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-4">
                        <label className="flex items-start gap-2 text-sm text-amber-950">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={override}
                            onChange={(event) => setOverride(event.target.checked)}
                          />
                          I authorize this backward or skipped-period correction.
                        </label>
                        <div className="space-y-1.5">
                          <Label htmlFor="activation-reason">Correction reason</Label>
                          <Input
                            id="activation-reason"
                            value={reason}
                            maxLength={2000}
                            onChange={(event) => setReason(event.target.value)}
                          />
                        </div>
                      </div>
                    ) : null}

                    <div className="max-w-sm space-y-1.5">
                      <Label htmlFor="activation-password">
                        Password for period activation
                      </Label>
                      <Input
                        id="activation-password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                      />
                    </div>

                    <Button
                      type="button"
                      disabled={
                        !!busy ||
                        !password ||
                        (activation.overrideRequired &&
                          (!override || !reason.trim()))
                      }
                      onClick={() => void activatePeriod()}
                    >
                      <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                      Activate {activation.target.label}
                    </Button>
                  </>
                )}
              </div>
            ) : null}
          </AdminSectionCard>

          <details className="rounded-lg border border-[var(--admin-outline)] bg-white px-5 py-4 text-sm">
            <summary className="cursor-pointer font-medium text-[var(--admin-text-strong)]">
              Technical state details
            </summary>
            <p className="mt-3 text-[var(--admin-text-muted)]">
              Policy {current.policy.id} · State version {current.version} ·
              Last updated {new Date(current.updatedAt).toLocaleString()}
            </p>
          </details>
        </>
      ) : null}
    </AcademicStateView>
  );
}
