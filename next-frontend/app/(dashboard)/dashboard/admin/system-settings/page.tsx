"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AdminPageShell,
  AdminSectionCard,
} from "@/components/admin/AdminPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AcademicBackSubjectsPanel } from "@/components/admin/AcademicBackSubjectsPanel";
import { AcademicRecoveryPanel } from "@/components/admin/AcademicRecoveryPanel";
import { academicStateService } from "@/services/academic-state-service";
import { getApiErrorMessage } from "@/lib/api-error";
import type {
  AcademicStateCurrent,
  AcademicStateImpactPreview,
  AcademicActivationPreview,
  AcademicQuarter,
} from "@/types/academic-state";

export default function AdminSystemSettingsPage() {
  const [current, setCurrent] = useState<AcademicStateCurrent | null>(null);
  const [preview, setPreview] = useState<AcademicStateImpactPreview | null>(
    null,
  );
  const [activation, setActivation] =
    useState<AcademicActivationPreview | null>(null);
  const [targetPeriod, setTargetPeriod] = useState<AcademicQuarter>("Q1");
  const [activationPassword, setActivationPassword] = useState("");
  const [reason, setReason] = useState("");
  const [override, setOverride] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transitionOpen, setTransitionOpen] = useState(false);
  const [transitionPassword, setTransitionPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [assessmentPeriodMapping, setAssessmentPeriodMapping] = useState<Partial<Record<string, AcademicQuarter>>>({});
  const request = useRef<{ signature: string; id: string } | null>(null);
  const load = useCallback(async () => {
    setError(null);
    try {
      const { data: state } = await academicStateService.getCurrent();
      setCurrent(state);
      const index = state.periods.findIndex((p) => p.key === state.quarter);
      setTargetPeriod(
        state.periods[Math.min(index + 1, state.periods.length - 1)].key,
      );
      const start = Number(state.schoolYear.slice(0, 4));
      const { data: next } = await academicStateService.getImpactPreview({
        schoolYear: `${start + 1}-${start + 2}`,
      });
      setPreview(next);
    } catch (err) {
      setPreview(null);
      setError(getApiErrorMessage(err, "Academic state could not be loaded."));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const readiness = preview?.impact.promotionReadiness;
  const activeLabel =
    current?.periods.find((p) => p.key === current.quarter)?.label ??
    current?.quarter;
  const changePeriod = async () => {
    if (!activation || !activationPassword || activation.alreadyActive) return;
    const payload = {
      expectedSchoolYear: activation.state.schoolYear,
      expectedQuarter: activation.state.quarter,
      expectedVersion: activation.state.version,
      targetQuarter: activation.target.key,
      override: activation.overrideRequired && override,
      reason: reason.trim() || undefined,
    };
    const signature = JSON.stringify(payload);
    if (request.current?.signature !== signature)
      request.current = { signature, id: crypto.randomUUID() };
    setBusy("activate");
    try {
      await academicStateService.activatePeriod({
        ...payload,
        requestId: request.current.id,
        currentPassword: activationPassword,
      });
      setActivationPassword("");
      setActivation(null);
      setOverride(false);
      setReason("");
      toast.success(
        `${activation.target.label} is active. Existing records were not finalized or reopened.`,
      );
      await load();
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          "Period activation failed. Refresh if the state changed.",
        ),
      );
    } finally {
      setBusy(null);
    }
  };
  const transition = async () => {
    if (
      !preview ||
      readiness?.transitionBlocked ||
      !transitionPassword ||
      confirmation !== preview.transitionConfirmationText
    )
      return;
    setBusy("transition");
    try {
      await academicStateService.transition({
        schoolYear: preview.target.schoolYear,
        expectedSchoolYear: preview.current.schoolYear,
        expectedQuarter: preview.current.quarter,
        expectedVersion: preview.current.version,
        currentPassword: transitionPassword,
        confirmationText: confirmation,
        assessmentPeriodMapping,
      });
      setTransitionOpen(false);
      setTransitionPassword("");
      setConfirmation("");
      setActivation(null);
      toast.success(
        "Year transition completed. New class rosters remain empty until explicitly assigned.",
      );
      await load();
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          "Transition failed. Refresh readiness before trying again.",
        ),
      );
    } finally {
      setBusy(null);
    }
  };
  return (
    <AdminPageShell
      title="System Settings"
      description="Manage active periods and verified year-end transitions."
      actions={
        <Button
          variant="outline"
          disabled={!!busy}
          onClick={() => {
            setActivation(null);
            void load();
          }}
        >
          Refresh academic state
        </Button>
      }
    >
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {!current ? (
        <p role="status">Loading academic state…</p>
      ) : (
        <>
          <AdminSectionCard
            title={`${current.schoolYear} · ${activeLabel}`}
            description={`Policy ${current.policy.id}. State version ${current.version}. Last updated ${new Date(current.updatedAt).toLocaleString()}.`}
          >
            <p className="text-sm text-slate-600">
              The active period controls release and new student attempts.
              Teachers may prepare future drafts and finish grading earlier
              periods in the active school year.
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor="target-period">Target period</Label>
                <select
                  id="target-period"
                  className="h-10 rounded-md border bg-white px-3 text-sm"
                  value={targetPeriod}
                  disabled={!!busy}
                  onChange={(e) => {
                    setTargetPeriod(e.target.value as AcademicQuarter);
                    setActivation(null);
                    setActivationPassword("");
                    setOverride(false);
                  }}
                >
                  {current.periods.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                variant="outline"
                disabled={!!busy}
                onClick={async () => {
                  setBusy("preview");
                  setActivation(null);
                  try {
                    setActivation(
                      (
                        await academicStateService.previewActivation(
                          targetPeriod,
                        )
                      ).data,
                    );
                  } catch (err) {
                    toast.error(
                      getApiErrorMessage(err, "Period preview failed."),
                    );
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                Preview period change
              </Button>
            </div>
            {activation && (
              <div className="mt-4 space-y-3 border-t pt-4">
                <p>{activation.message}</p>
                <p className="text-sm text-slate-600">
                  {activation.currentOpenRecords} open or missing current
                  records · {activation.targetMissingRecords} missing target
                  records · {activation.ongoingAttempts} unfinished attempts
                </p>
                {activation.alreadyActive ? (
                  <p>This period is already active.</p>
                ) : (
                  <>
                    {activation.overrideRequired && (
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={override}
                            onChange={(e) => setOverride(e.target.checked)}
                          />
                          I authorize this backward or skipped-period
                          correction.
                        </label>
                        <Label htmlFor="activation-reason">
                          Correction reason
                        </Label>
                        <Input
                          id="activation-reason"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          maxLength={2000}
                        />
                      </div>
                    )}
                    <div className="max-w-sm space-y-1">
                      <Label htmlFor="activation-password">
                        Password for period activation
                      </Label>
                      <Input
                        id="activation-password"
                        type="password"
                        autoComplete="current-password"
                        value={activationPassword}
                        onChange={(e) => setActivationPassword(e.target.value)}
                      />
                    </div>
                    <Button
                      disabled={
                        !!busy ||
                        !activationPassword ||
                        (activation.overrideRequired &&
                          (!override || !reason.trim()))
                      }
                      onClick={() => void changePeriod()}
                    >
                      Activate {activation.target.label}
                    </Button>
                  </>
                )}
              </div>
            )}
          </AdminSectionCard>
          <AdminSectionCard
            title={`Year transition${preview ? ` to ${preview.target.schoolYear}` : ""}`}
            description="The server verifies all required periods, annual learning-area grades, remediation and current state before committing."
          >
            {readiness ? (
              <div className="space-y-4">
                <p
                  role="status"
                  className={
                    readiness.transitionBlocked
                      ? "text-red-700"
                      : "text-slate-800"
                  }
                >
                  {readiness.message}
                </p>
                <p className="text-sm">
                  {readiness.finalizedPeriodRecords} of{" "}
                  {readiness.expectedPeriodRecords} required period records
                  finalized; {readiness.expectedAnnualGrades} annual subject
                  results required.
                </p>
                {!readiness.transitionBlocked && (
                  <p className="text-sm">
                    {readiness.studentsToPromote} promoted ·{" "}
                    {readiness.studentsToRetain} retained ·{" "}
                    {readiness.studentsToGraduate} graduated ·{" "}
                    {readiness.studentsToConditionallyPromote} conditionally
                    promoted · {readiness.studentsPendingCompletion} pending
                    completion
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={!!busy || readiness.transitionBlocked}
                    onClick={() => {
                      setTransitionPassword("");
                      setConfirmation("");
                      setTransitionOpen(true);
                    }}
                  >
                    Review year transition
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!!busy}
                    onClick={async () => {
                      setBusy("notify");
                      try {
                        const response =
                          await academicStateService.notifyTeachers();
                        toast.success(response.data.message);
                      } catch (err) {
                        toast.error(
                          getApiErrorMessage(err, "Teacher reminders failed."),
                        );
                      } finally {
                        setBusy(null);
                      }
                    }}
                  >
                    Notify teachers of blockers
                  </Button>
                </div>
                {readiness.blockers.length > 0 && (
                  <div className="max-h-96 overflow-auto rounded-md border">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-slate-50">
                        <tr>
                          <th className="p-3">Issue</th>
                          <th className="p-3">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {readiness.blockers.map((blocker, index) => (
                          <tr
                            key={`${blocker.code}-${index}`}
                            className="border-t"
                          >
                            <td className="p-3">
                              {blocker.message}
                              {blocker.studentId && (
                                <span className="block text-xs text-slate-500">
                                  Learner {blocker.studentId}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              {blocker.classId ? (
                                <Link
                                  className="underline"
                                  href={`/dashboard/admin/academic-records/${blocker.classId}`}
                                >
                                  Open workbook
                                </Link>
                              ) : (
                                <span>See academic audit below</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <p>Transition preview is unavailable. Refresh academic state.</p>
            )}
          </AdminSectionCard>
        </>
      )}
      {current && (
        <AcademicBackSubjectsPanel current={current} onChanged={load} />
      )}
      <AcademicRecoveryPanel
        schoolYear={current?.schoolYear}
        classes={readiness?.classReadiness}
        onChanged={load}
      />
      <Dialog
        open={transitionOpen}
        onOpenChange={(open) => {
          if (!busy) {
            setTransitionOpen(open);
            if (!open) setTransitionPassword("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm year transition</DialogTitle>
            <DialogDescription>
              Archive the current year and record the verified student outcomes.
              New rosters start empty. This does not automatically finalize any
              workbook.
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <p className="text-sm">
              {preview.current.schoolYear} → {preview.target.schoolYear}.
              Archive {preview.impact.classesToArchive} classes and{" "}
              {preview.impact.sectionsToArchive} sections; complete{" "}
              {preview.impact.enrollmentsToComplete} enrollments. Clone{" "}
              {preview.impact.reusableClassesToCreate} classes and{" "}
              {preview.impact.reusableSectionsToCreate} sections.
            </p>
          )}
          <div className="space-y-2"><p className="text-sm">Map copied assessment drafts to the destination year. Historical assessments and student results remain unchanged.</p>
            {(preview?.impact.assessmentPeriodSources ?? []).map(source => <label key={source} className="grid gap-1 text-sm">Source {source}<select aria-label={`Destination period for ${source}`} className="rounded border p-2" value={assessmentPeriodMapping[source] ?? ''} onChange={event => setAssessmentPeriodMapping(current => ({ ...current, [source]: event.target.value as AcademicQuarter }))}><option value="">Choose destination period</option>{preview?.impact.destinationPeriods?.map(period => <option key={period.key} value={period.key}>{period.label}</option>)}</select></label>)}
          </div>
          <Label htmlFor="transition-password">Admin password</Label>
          <Input
            id="transition-password"
            type="password"
            autoComplete="current-password"
            value={transitionPassword}
            onChange={(e) => setTransitionPassword(e.target.value)}
          />
          <Label htmlFor="transition-confirmation">
            Type {preview?.transitionConfirmationText}
          </Label>
          <Input
            id="transition-confirmation"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="off"
          />
          <DialogFooter>
            <Button
              variant="outline"
              disabled={!!busy}
              onClick={() => {
                setTransitionOpen(false);
                setTransitionPassword("");
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={
                !!busy ||
                !transitionPassword ||
                (preview?.impact.assessmentPeriodSources ?? []).some(source => !assessmentPeriodMapping[source]) ||
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
    </AdminPageShell>
  );
}
