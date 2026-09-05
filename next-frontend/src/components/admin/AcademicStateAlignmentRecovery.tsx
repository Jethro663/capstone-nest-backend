"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api-error";
import { academicGradingService as grading } from "@/services/academic-grading-service";
import type {
  AcademicAlignmentPreview,
  AcademicPeriodKey,
} from "@/types/academic-grading";

function previousSchoolYear(value: string): string {
  const match = /^(\d{4})-(\d{4})$/.exec(value);
  if (!match) return "";
  const start = Number(match[1]) - 1;
  return `${start}-${start + 1}`;
}

export function AcademicStateAlignmentRecovery({
  schoolYear,
  onChanged,
}: {
  schoolYear?: string;
  onChanged: () => Promise<void>;
}) {
  const [sourceSchoolYear, setSourceSchoolYear] = useState(schoolYear ?? "");
  const [targetSchoolYear, setTargetSchoolYear] = useState(
    previousSchoolYear(schoolYear ?? ""),
  );
  const [targetQuarter, setTargetQuarter] =
    useState<AcademicPeriodKey>("Q1");
  const [candidatePreview, setCandidatePreview] =
    useState<AcademicAlignmentPreview | null>(null);
  const [reviewedPreview, setReviewedPreview] =
    useState<AcademicAlignmentPreview | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmationText, setConfirmationText] = useState<
    Record<string, string>
  >({});
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auditEventId, setAuditEventId] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolYear || sourceSchoolYear) return;
    setSourceSchoolYear(schoolYear);
    setTargetSchoolYear(previousSchoolYear(schoolYear));
  }, [schoolYear, sourceSchoolYear]);

  const requestPreview = useCallback(
    async (classIds: string[], reviewed: boolean) => {
      if (!sourceSchoolYear || !targetSchoolYear) return;
      setBusy(true);
      setError(null);
      try {
        const response = await grading.previewStateAlignment({
          sourceSchoolYear,
          targetSchoolYear,
          targetQuarter,
          classIds,
        });
        setCandidatePreview(response.data);
        if (reviewed) {
          setReviewedPreview(response.data);
          setConfirmationText({});
          setAcknowledged(false);
        }
      } catch (err) {
        setError(
          getApiErrorMessage(err, "Academic alignment preview could not be loaded."),
        );
      } finally {
        setBusy(false);
      }
    },
    [sourceSchoolYear, targetQuarter, targetSchoolYear],
  );

  const candidates = candidatePreview?.candidates ?? [];
  const allSelected =
    candidates.length > 0 && selected.length === candidates.length;
  const confirmationsMatch = useMemo(
    () =>
      Boolean(reviewedPreview) &&
      reviewedPreview!.requiredConfirmations.every(
        (confirmation) =>
          confirmationText[confirmation.code] === confirmation.text,
      ),
    [confirmationText, reviewedPreview],
  );
  const invalidateReviewedPreview = () => {
    setReviewedPreview(null);
    setConfirmationText({});
    setAcknowledged(false);
  };
  const execute = async () => {
    if (
      !reviewedPreview?.safeToApply ||
      !confirmationsMatch ||
      !acknowledged ||
      reason.trim().length < 5 ||
      !password
    )
      return;
    setBusy(true);
    setError(null);
    try {
      const response = await grading.executeStateAlignment({
        ...reviewedPreview.input,
        manifestHash: reviewedPreview.manifestHash,
        confirmations: reviewedPreview.requiredConfirmations.map(
          (confirmation) => ({
            code: confirmation.code,
            text: confirmationText[confirmation.code],
          }),
        ),
        reason: reason.trim(),
        currentPassword: password,
      });
      setAuditEventId(response.data.auditEventId);
      setPassword("");
      setReason("");
      setAcknowledged(false);
      toast.success("Academic state alignment repaired and audited.");
      await onChanged();
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "Academic alignment failed. No changes were committed.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <details className="mt-4 rounded-md border border-red-200 p-4">
      <summary className="cursor-pointer font-medium">
        Correct academic year alignment
      </summary>
      <div className="mt-4 space-y-4">
        <p className="text-sm text-slate-700">
          This reviewed transaction preserves record IDs, moves only the selected
          classes and complete source-year sections, installs the four-quarter
          policies, and records one parent audit receipt.
        </p>
        {!candidatePreview && (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Candidate data is not loaded automatically. Confirm the source and
            target years, then request a read-only preview.
          </p>
        )}
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label htmlFor="alignment-source-year">Source school year</Label>
            <Input
              id="alignment-source-year"
              value={sourceSchoolYear}
              onChange={(event) => {
                setSourceSchoolYear(event.target.value);
                setSelected([]);
                invalidateReviewedPreview();
              }}
            />
          </div>
          <div>
            <Label htmlFor="alignment-target-year">Target school year</Label>
            <Input
              id="alignment-target-year"
              value={targetSchoolYear}
              onChange={(event) => {
                setTargetSchoolYear(event.target.value);
                setSelected([]);
                invalidateReviewedPreview();
              }}
            />
          </div>
          <div>
            <Label htmlFor="alignment-target-quarter">Target quarter</Label>
            <select
              id="alignment-target-quarter"
              className="h-10 w-full rounded-md border bg-white px-3 text-sm"
              value={targetQuarter}
              onChange={(event) => {
                setTargetQuarter(event.target.value as AcademicPeriodKey);
                invalidateReviewedPreview();
              }}
            >
              {(["Q1", "Q2", "Q3", "Q4"] as const).map((quarter, index) => (
                <option key={quarter} value={quarter}>
                  Quarter {index + 1}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => void requestPreview([], false)}
        >
          Preview alignment candidates
        </Button>

        {candidatePreview && (
          <>
            <div className="grid gap-3 rounded-md bg-slate-50 p-3 text-sm md:grid-cols-2">
              <p>
                <span className="font-medium">Before:</span>{" "}
                {candidatePreview.state.schoolYear} · {candidatePreview.state.quarter}
                {" · version "}
                {candidatePreview.state.version}
              </p>
              <p>
                <span className="font-medium">After:</span> {targetSchoolYear} ·{" "}
                {targetQuarter} · Quarter 1–4 policies
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelected(candidates.map((candidate) => candidate.id));
                  invalidateReviewedPreview();
                }}
              >
                Select all reviewed
              </Button>
              <Button
                type="button"
                disabled={busy || !selected.length}
                onClick={() => void requestPreview(selected, true)}
              >
                Preview selected repair
              </Button>
              <span className="self-center text-sm">
                {selected.length} of {candidates.length} selected
              </span>
            </div>
            <div className="max-h-96 overflow-auto rounded-md border">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th className="p-2">Select</th>
                    <th className="p-2">Class</th>
                    <th className="p-2">Teacher</th>
                    <th className="p-2">Dependent records</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((candidate) => (
                    <tr key={candidate.id} className="border-t align-top">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          aria-label={`${candidate.subjectCode} ${candidate.subjectName}`}
                          checked={selected.includes(candidate.id)}
                          onChange={(event) => {
                            setSelected((current) =>
                              event.target.checked
                                ? [...current, candidate.id]
                                : current.filter((id) => id !== candidate.id),
                            );
                            invalidateReviewedPreview();
                          }}
                        />
                      </td>
                      <td className="p-2">
                        <span className="font-medium">
                          {candidate.subjectCode} · {candidate.subjectName}
                        </span>
                        <span className="block text-xs text-slate-600">
                          {candidate.sectionName} · {candidate.sectionSchoolYear} ·{" "}
                          {candidate.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-2">{candidate.teacherName ?? "Unassigned"}</td>
                      <td className="p-2 text-xs">
                        {candidate.counts.enrollments} enrollments ·{" "}
                        {candidate.counts.assessments} assessments ·{" "}
                        {candidate.counts.attempts} attempts ·{" "}
                        {candidate.counts.classRecords} records ·{" "}
                        {candidate.counts.finalizedRecords} finalized ·{" "}
                        {candidate.counts.finalGradeRows} final-grade rows
                        {candidate.counts.legacyEvidenceRows > 0 && (
                          <span className="block font-medium text-red-700">
                            {candidate.counts.legacyEvidenceRows} legacy evidence rows
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!allSelected && (
              <p className="text-sm text-amber-800">
                Every reviewed active source-year class must be selected before
                this correction can be safe to apply.
              </p>
            )}
          </>
        )}

        {reviewedPreview && (
          <div className="space-y-4 rounded-md border p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="font-medium text-red-700">Blockers</p>
                {reviewedPreview.blockers.length ? (
                  <ul className="list-disc pl-5 text-sm">
                    {reviewedPreview.blockers.map((item) => (
                      <li key={`${item.code}-${item.classId ?? item.sectionId ?? ""}`}>
                        {item.message}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm">No blockers in this manifest.</p>
                )}
              </div>
              <div>
                <p className="font-medium text-amber-800">Warnings</p>
                {reviewedPreview.warnings.length ? (
                  <ul className="list-disc pl-5 text-sm">
                    {reviewedPreview.warnings.map((item) => (
                      <li key={item.code}>{item.message}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm">No warnings.</p>
                )}
              </div>
            </div>
            {reviewedPreview.requiredConfirmations.map((confirmation) => (
              <div key={confirmation.code} className="space-y-1">
                <p className="font-mono text-sm">{confirmation.text}</p>
                <Label htmlFor={`alignment-confirm-${confirmation.code}`}>
                  Confirmation {confirmation.code}
                </Label>
                <Input
                  id={`alignment-confirm-${confirmation.code}`}
                  value={confirmationText[confirmation.code] ?? ""}
                  onChange={(event) =>
                    setConfirmationText((current) => ({
                      ...current,
                      [confirmation.code]: event.target.value,
                    }))
                  }
                  autoComplete="off"
                />
              </div>
            ))}
            <div className="space-y-1">
              <Label htmlFor="alignment-reason">Alignment reason</Label>
              <Input
                id="alignment-reason"
                value={reason}
                minLength={5}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="alignment-password">Current admin password</Label>
              <Input
                id="alignment-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
              />
              I reviewed every selected class, linked section, dependent count,
              warning, and exact confirmation.
            </label>
            <Button
              type="button"
              disabled={
                busy ||
                !reviewedPreview.safeToApply ||
                !confirmationsMatch ||
                !acknowledged ||
                reason.trim().length < 5 ||
                !password
              }
              onClick={() => void execute()}
            >
              Apply alignment repair
            </Button>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        {auditEventId && (
          <p className="text-sm font-medium text-green-800">
            Repair committed. Audit event: {auditEventId}
          </p>
        )}
      </div>
    </details>
  );
}
