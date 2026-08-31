"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminSectionCard } from "./AdminPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { academicGradingService as grading } from "@/services/academic-grading-service";
import { academicStateService } from "@/services/academic-state-service";
import { getApiErrorMessage } from "@/lib/api-error";
import type {
  AcademicPolicy,
  AcademicPeriodKey,
  BackSubject,
  Grade10Completion,
} from "@/types/academic-grading";
import type { AcademicStateCurrent } from "@/types/academic-state";

export function AcademicBackSubjectsPanel({
  current,
  onChanged,
}: {
  current: AcademicStateCurrent;
  onChanged: () => Promise<void>;
}) {
  const [obligations, setObligations] = useState<BackSubject[]>([]);
  const [completions, setCompletions] = useState<Grade10Completion[]>([]);
  const [selected, setSelected] = useState<{
    type: "schedule" | "clear" | "complete";
    id: string;
    label: string;
  } | null>(null);
  const [year, setYear] = useState(current.schoolYear);
  const [policy, setPolicy] = useState<AcademicPolicy | null>(current.policy);
  const [period, setPeriod] = useState<AcademicPeriodKey>(current.quarter);
  const [mark, setMark] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const [back, completion] = await Promise.all([
        grading.backSubjects(),
        grading.grade10Completions(),
      ]);
      setObligations(back.data);
      setCompletions(completion.data);
      setError(null);
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Back-subject evidence could not be loaded."),
      );
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load, current.version]);
  useEffect(() => {
    setPolicy(null);
    let cancelled = false;
    void academicStateService
      .getPolicy(year)
      .then((response) => {
        if (!cancelled) {
          setPolicy(response.data);
          setPeriod(
            year === current.schoolYear
              ? current.quarter
              : response.data.periods[0].key,
          );
        }
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            getApiErrorMessage(err, "Schedule policy could not be loaded."),
          );
      });
    return () => {
      cancelled = true;
    };
  }, [year, current.schoolYear, current.quarter]);
  const learner = (row: {
    studentId: string;
    student?: { firstName: string | null; lastName: string | null } | null;
  }) =>
    row.student
      ? `${row.student.lastName ?? ""}, ${row.student.firstName ?? ""}`
      : row.studentId;
  const open = (
    type: "schedule" | "clear" | "complete",
    id: string,
    label: string,
  ) => {
    setSelected({ type, id, label });
    setReason("");
    setReference("");
    setMark("");
    setError(null);
  };
  const submit = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      if (selected.type === "schedule")
        await grading.scheduleBackSubject(selected.id, {
          schoolYear: year,
          period,
          reason,
        });
      else if (selected.type === "clear")
        await grading.clearBackSubject(selected.id, {
          grade: Number(mark),
          reason,
          sourceReference: reference,
        });
      else
        await grading.completeGrade10(selected.id, {
          reason,
          sourceReference: reference,
        });
      setSelected(null);
      toast.success("Academic evidence recorded.");
      await load();
      await onChanged();
    } catch (err) {
      setError(getApiErrorMessage(err, "The academic operation was rejected."));
    } finally {
      setBusy(false);
    }
  };
  const start = Number(current.schoolYear.slice(0, 4));
  const years = [current.schoolYear, `${start + 1}-${start + 2}`];
  const visible = obligations.filter((row) =>
    `${learner(row)} ${row.subjectCode} ${row.sourceSchoolYear}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <AdminSectionCard
      title="Back subjects and Grade 10 completion"
      description="One back subject may be scheduled per learner per term. Clearance and completion preserve the original annual result."
      action={
        <Button variant="outline" disabled={busy} onClick={() => void load()}>
          Refresh obligations
        </Button>
      }
    >
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="mb-3 max-w-md">
        <Label htmlFor="back-subject-search">Find learner or subject</Label>
        <Input
          id="back-subject-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="max-h-80 overflow-auto rounded-md border">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              <th className="p-3">Learner / subject</th>
              <th className="p-3">Status and schedule</th>
              <th className="p-3">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-3">
                  {learner(row)}
                  <span className="block text-xs">
                    {row.subjectCode} · {row.sourceSchoolYear}
                  </span>
                </td>
                <td className="space-y-2 p-3">
                  <p>
                    {row.status}
                    {row.scheduledSchoolYear
                      ? ` · ${row.scheduledSchoolYear} ${row.scheduledPeriod}`
                      : ""}
                    {row.clearedGrade != null
                      ? ` · grade ${row.clearedGrade}`
                      : ""}
                  </p>
                  {["pending", "scheduled"].includes(row.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        open(
                          "schedule",
                          row.id,
                          `${learner(row)} · ${row.subjectCode}`,
                        )
                      }
                    >
                      Schedule
                    </Button>
                  )}
                  {row.status === "scheduled" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        open(
                          "clear",
                          row.id,
                          `${learner(row)} · ${row.subjectCode}`,
                        )
                      }
                    >
                      Record clearance
                    </Button>
                  )}
                </td>
                <td className="p-3">
                  <details>
                    <summary className="cursor-pointer">History</summary>
                    <ul className="mt-2 space-y-2">
                      {row.history.map((event) => (
                        <li key={event.id}>
                          {event.action} ·{" "}
                          {new Date(event.createdAt).toLocaleDateString()}
                          <p className="text-xs">
                            {String(event.evidence.reason ?? "")}{" "}
                            {String(event.evidence.sourceReference ?? "")}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && (
          <p className="p-3 text-sm">No matching back-subject obligations.</p>
        )}
      </div>
      <div className="mt-5 space-y-2">
        <h3 className="font-medium">Grade 10 pending-completion decisions</h3>
        {!completions.length && (
          <p className="text-sm text-slate-600">
            No pending-completion year-end decisions.
          </p>
        )}
        {completions.map((row) => (
          <div
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm"
          >
            <span>
              {learner(row)} · {row.schoolYear} ·{" "}
              {row.completion
                ? `completed ${new Date(row.completion.recordedAt).toLocaleDateString()}`
                : "pending completion"}
            </span>
            {!row.completion && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => open("complete", row.studentId, learner(row))}
              >
                Verify Grade 10 completion
              </Button>
            )}
          </div>
        ))}
      </div>
      {selected && (
        <form
          className="mt-5 space-y-3 rounded-md border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <h3 className="font-medium">
            {selected.type === "schedule"
              ? "Schedule support"
              : selected.type === "clear"
                ? "Record passing clearance"
                : "Verify Grade 10 completion"}
            : {selected.label}
          </h3>
          {selected.type === "schedule" && (
            <div className="flex flex-wrap gap-3">
              <div>
                <Label htmlFor="support-year">Support school year</Label>
                <select
                  id="support-year"
                  className="block h-10 rounded-md border bg-white px-3"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                >
                  {years.map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="support-period">Support period</Label>
                <select
                  id="support-period"
                  className="block h-10 rounded-md border bg-white px-3"
                  value={period}
                  onChange={(e) =>
                    setPeriod(e.target.value as AcademicPeriodKey)
                  }
                >
                  {policy?.periods.map((p, index) => (
                    <option
                      key={p.key}
                      value={p.key}
                      disabled={
                        year === current.schoolYear &&
                        index <
                          policy.periods.findIndex(
                            (p) => p.key === current.quarter,
                          )
                      }
                    >
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {selected.type === "clear" && (
            <div>
              <Label htmlFor="clearance-mark">
                Official clearance grade (75–100)
              </Label>
              <Input
                id="clearance-mark"
                type="number"
                min={75}
                max={100}
                step={1}
                required
                value={mark}
                onChange={(e) => setMark(e.target.value)}
              />
            </div>
          )}
          {selected.type !== "schedule" && (
            <div>
              <Label htmlFor="clearance-reference">Evidence reference</Label>
              <Input
                id="clearance-reference"
                required
                minLength={3}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          )}
          <div>
            <Label htmlFor="clearance-reason">
              Reason / verification notes
            </Label>
            <Input
              id="clearance-reason"
              required
              minLength={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          {selected.type === "complete" && (
            <p className="text-sm">
              The server verifies the latest Grade 10 year-end decision, every
              required source and clearance, and the absence of active
              enrollment. The original pending-completion outcome remains in
              history.
            </p>
          )}
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={busy || (selected.type === "schedule" && !policy)}
            >
              Record evidence
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setSelected(null)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </AdminSectionCard>
  );
}
