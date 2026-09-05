"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BookOpenCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AdminSectionCard } from "@/components/admin/AdminPageShell";
import { AcademicStateView } from "@/components/admin/system-settings/AcademicStateView";
import { SettingHelp } from "@/components/admin/system-settings/SettingHelp";
import { useAcademicStateCurrent } from "@/components/admin/system-settings/useAcademicStateCurrent";
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
import { getApiErrorMessage } from "@/lib/api-error";
import { academicStateService } from "@/services/academic-state-service";
import type { AcademicBlocker } from "@/types/academic-grading";
import type {
  AcademicQuarter,
  AcademicStateImpactPreview,
} from "@/types/academic-state";

function blockerLabel(code: string) {
  const label = code.replaceAll("_", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function groupBlockers(blockers: AcademicBlocker[]) {
  const groups = new Map<
    string,
    { code: string; items: AcademicBlocker[] }
  >();
  for (const blocker of blockers) {
    const group = groups.get(blocker.code) ?? {
      code: blocker.code,
      items: [],
    };
    group.items.push(blocker);
    groups.set(blocker.code, group);
  }
  return Array.from(groups.values()).sort(
    (left, right) => right.items.length - left.items.length,
  );
}

export default function YearTransitionSettingsPage() {
  const { current, loading, error, refresh } = useAcademicStateCurrent();
  const [preview, setPreview] =
    useState<AcademicStateImpactPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"notify" | "transition" | null>(null);
  const [transitionOpen, setTransitionOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [assessmentPeriodMapping, setAssessmentPeriodMapping] = useState<
    Partial<Record<string, AcademicQuarter>>
  >({});

  const loadPreview = useCallback(async () => {
    if (!current) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const start = Number(current.schoolYear.slice(0, 4));
      const response = await academicStateService.getImpactPreview({
        schoolYear: `${start + 1}-${start + 2}`,
      });
      setPreview(response.data);
      setAssessmentPeriodMapping(
        Object.fromEntries(
          (response.data.impact.assessmentPeriodSources ?? [])
            .filter((source) =>
              response.data.impact.destinationPeriods?.some(
                (period) => period.key === source,
              ),
            )
            .map((source) => [source, source as AcademicQuarter]),
        ),
      );
    } catch (requestError) {
      setPreview(null);
      setPreviewError(
        getApiErrorMessage(
          requestError,
          "The next-year transition preview could not be loaded.",
        ),
      );
    } finally {
      setPreviewLoading(false);
    }
  }, [current]);

  useEffect(() => {
    if (current) void loadPreview();
  }, [current, loadPreview]);

  const readiness = preview?.impact.promotionReadiness;
  const groupedBlockers = useMemo(
    () => groupBlockers(readiness?.blockers ?? []),
    [readiness?.blockers],
  );
  const activeLabel =
    current?.periods.find((period) => period.key === current.quarter)?.label ??
    current?.quarter;

  const notifyTeachers = async () => {
    setBusy("notify");
    try {
      const response = await academicStateService.notifyTeachers();
      toast.success(response.data.message);
    } catch (requestError) {
      toast.error(
        getApiErrorMessage(requestError, "Teacher reminders could not be sent."),
      );
    } finally {
      setBusy(null);
    }
  };

  const transition = async () => {
    if (
      !preview ||
      !readiness ||
      readiness.transitionBlocked ||
      !password ||
      confirmation !== preview.transitionConfirmationText
    ) {
      return;
    }

    setBusy("transition");
    try {
      await academicStateService.transition({
        schoolYear: preview.target.schoolYear,
        expectedSchoolYear: preview.current.schoolYear,
        expectedQuarter: preview.current.quarter,
        expectedVersion: preview.current.version,
        currentPassword: password,
        confirmationText: confirmation,
        assessmentPeriodMapping,
      });
      setTransitionOpen(false);
      setPassword("");
      setConfirmation("");
      toast.success(
        "Year transition completed. New class rosters remain empty until explicitly assigned.",
      );
      await refresh();
    } catch (requestError) {
      toast.error(
        getApiErrorMessage(
          requestError,
          "Transition failed. Refresh readiness before trying again.",
        ),
      );
    } finally {
      setBusy(null);
    }
  };

  const missingAssessmentMapping = (preview?.impact.assessmentPeriodSources ?? []).some(
    (source) => !assessmentPeriodMapping[source],
  );

  return (
    <AcademicStateView
      loading={loading}
      error={error}
      onRetry={() => void refresh()}
    >
      {current ? (
        <>
          <section className="rounded-lg border border-[var(--admin-outline)] bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-700">
                  <BookOpenCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-[var(--admin-text-strong)]">
                    Current school year: {current.schoolYear.replace("-", "–")}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--admin-text-muted)]">
                    <span>{`${activeLabel} is still active.`}</span> This page
                    previews the next school year and does not change the current
                    state until the final protected confirmation.
                  </p>
                </div>
              </div>
              <SettingHelp label="Year transition">
                A transition archives the current year, records verified learner
                outcomes, and creates reusable next-year structures. It does not
                silently finalize incomplete workbooks or populate new rosters.
              </SettingHelp>
            </div>
          </section>

          {previewLoading ? (
            <div
              role="status"
              className="rounded-lg border border-[var(--admin-outline)] bg-white p-5 text-sm text-[var(--admin-text-muted)]"
            >
              Loading the next-year transition preview…
            </div>
          ) : null}

          {previewError ? (
            <div
              role="alert"
              aria-label={previewError}
              className="rounded-lg border border-amber-200 bg-amber-50 p-5"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-semibold text-amber-950">
                    Year transition preview unavailable
                  </p>
                  <p className="mt-1 text-sm leading-6 text-amber-900">
                    {previewError} The active academic state above remains valid.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    aria-label="Retry transition preview"
                    className="mt-4 border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                    onClick={() => void loadPreview()}
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Retry preview
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {preview && readiness ? (
            <AdminSectionCard
              title={`Transition to ${preview.target.schoolYear.replace("-", "–")}`}
              description="Readiness is calculated from required period records, annual grades, learner outcomes, and academic evidence."
              density="compact"
            >
              <div className="space-y-5">
                <div
                  role="status"
                  className={
                    readiness.transitionBlocked
                      ? "rounded-md border border-red-200 bg-red-50 p-4 text-red-900"
                      : "rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"
                  }
                >
                  <p className="font-medium">{readiness.message}</p>
                  <p className="mt-1 text-sm">
                    {readiness.finalizedPeriodRecords} of {readiness.expectedPeriodRecords}{" "}
                    required period records finalized · {readiness.expectedAnnualGrades}{" "}
                    annual subject results required
                  </p>
                </div>

                {!readiness.transitionBlocked ? (
                  <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-5">
                    {[
                      ["Promoted", readiness.studentsToPromote ?? 0],
                      ["Retained", readiness.studentsToRetain ?? 0],
                      ["Graduated", readiness.studentsToGraduate ?? 0],
                      [
                        "Conditional",
                        readiness.studentsToConditionallyPromote ?? 0,
                      ],
                      ["Pending", readiness.studentsPendingCompletion ?? 0],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-md border border-[var(--admin-outline)] p-3"
                      >
                        <dt className="text-[var(--admin-text-muted)]">{label}</dt>
                        <dd className="mt-1 text-lg font-semibold text-[var(--admin-text-strong)]">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={!!busy || readiness.transitionBlocked}
                    onClick={() => {
                      setPassword("");
                      setConfirmation("");
                      setTransitionOpen(true);
                    }}
                  >
                    Review year transition
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!!busy}
                    onClick={() => void notifyTeachers()}
                  >
                    Notify teachers of blockers
                  </Button>
                </div>

                {groupedBlockers.length > 0 ? (
                  <div>
                    <h3 className="font-semibold text-[var(--admin-text-strong)]">
                      Blockers grouped by required action
                    </h3>
                    <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
                      Open a group to review affected classes. Learner identifiers
                      are intentionally omitted from this summary.
                    </p>
                    <div className="mt-3 space-y-2">
                      {groupedBlockers.map((group) => (
                        <details
                          key={group.code}
                          className="rounded-md border border-[var(--admin-outline)] bg-white"
                        >
                          <summary className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--admin-accent)]">
                            <span className="font-medium text-[var(--admin-text-strong)]">
                              {blockerLabel(group.code)}
                            </span>
                            <span className="text-sm text-[var(--admin-text-muted)]">
                              {group.items.length} {group.items.length === 1 ? "issue" : "issues"}
                            </span>
                          </summary>
                          <div className="border-t border-[var(--admin-outline)]">
                            {group.items.map((blocker, index) => (
                              <div
                                key={`${group.code}-${blocker.classId ?? "system"}-${blocker.studentId ?? "all"}-${blocker.period ?? "all"}-${index}`}
                                className="flex flex-col gap-2 border-b border-[var(--admin-outline)] px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <p className="text-sm text-[var(--admin-text-strong)]">
                                  {blocker.message}
                                </p>
                                {blocker.classId ? (
                                  <Link
                                    href={`/dashboard/admin/academic-records/${blocker.classId}`}
                                    className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[var(--admin-accent-strong)] underline-offset-4 hover:underline"
                                  >
                                    Open workbook
                                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                  </Link>
                                ) : (
                                  <Link
                                    href="/dashboard/admin/system-settings/audit-recovery"
                                    className="shrink-0 text-sm font-semibold text-[var(--admin-accent-strong)] underline-offset-4 hover:underline"
                                  >
                                    Open audit
                                  </Link>
                                )}
                              </div>
                            ))}
                          </div>
                        </details>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </AdminSectionCard>
          ) : null}

          <Dialog
            open={transitionOpen}
            onOpenChange={(nextOpen) => {
              if (!busy) {
                setTransitionOpen(nextOpen);
                if (!nextOpen) setPassword("");
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm year transition</DialogTitle>
                <DialogDescription>
                  Archive the current year and record verified learner outcomes.
                  New rosters start empty, and incomplete workbooks are not
                  finalized automatically.
                </DialogDescription>
              </DialogHeader>

              {preview ? (
                <>
                  <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900">
                    This is a school-wide operation. {preview.current.schoolYear}{" "}
                    → {preview.target.schoolYear} will archive{" "}
                    {preview.impact.classesToArchive} classes and complete{" "}
                    {preview.impact.enrollmentsToComplete} enrollments.
                  </div>

                  <p className="text-sm leading-6 text-[var(--admin-text-muted)]">
                    Copied assessment drafts keep valid periods. Only unassigned
                    or policy-invalid drafts require a destination choice;
                    historical attempts and results remain unchanged.
                  </p>

                  {(preview.impact.assessmentPeriodSources ?? [])
                    .filter(
                      (source) =>
                        !(preview.impact.destinationPeriods ?? []).some(
                          (period) => period.key === source,
                        ),
                    )
                    .map((source) => (
                      <label key={source} className="grid gap-1.5 text-sm">
                        Destination period for {source}
                        <select
                          aria-label={`Destination period for ${source}`}
                          className="h-10 rounded-md border border-[var(--admin-outline-strong)] bg-white px-3"
                          value={assessmentPeriodMapping[source] ?? ""}
                          onChange={(event) =>
                            setAssessmentPeriodMapping((mapping) => ({
                              ...mapping,
                              [source]: event.target.value as AcademicQuarter,
                            }))
                          }
                        >
                          <option value="">Choose destination period</option>
                          {preview.impact.destinationPeriods?.map((period) => (
                            <option key={period.key} value={period.key}>
                              {period.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}

                  <div className="space-y-1.5">
                    <Label htmlFor="transition-password">Admin password</Label>
                    <Input
                      id="transition-password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="transition-confirmation">
                      Type {preview.transitionConfirmationText}
                    </Label>
                    <Input
                      id="transition-confirmation"
                      autoComplete="off"
                      value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)}
                    />
                  </div>
                </>
              ) : null}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!!busy}
                  onClick={() => {
                    setTransitionOpen(false);
                    setPassword("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={
                    !!busy ||
                    !password ||
                    missingAssessmentMapping ||
                    confirmation !== preview?.transitionConfirmationText ||
                    readiness?.transitionBlocked
                  }
                  onClick={() => void transition()}
                >
                  Confirm year transition
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </AcademicStateView>
  );
}
