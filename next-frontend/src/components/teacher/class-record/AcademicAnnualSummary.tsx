"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/providers/AuthProvider";
import { academicGradingService } from "@/services/academic-grading-service";
import { getApiErrorMessage } from "@/lib/api-error";
import type {
  AnnualSummary,
  AnnualStudent,
  AcademicPeriodKey,
} from "@/types/academic-grading";

export function AcademicAnnualSummary({
  summary,
  refresh,
}: {
  summary: AnnualSummary;
  refresh: () => Promise<void>;
}) {
  const { role } = useAuth();
  const admin = role === "admin";
  const [student, setStudent] = useState<AnnualStudent | null>(null);
  const [action, setAction] = useState<"external" | "source" | "src">(
    "external",
  );
  const [period, setPeriod] = useState<AcademicPeriodKey>(
    summary.periods[0].key,
  );
  const [sourceId, setSourceId] = useState("");
  const [grade, setGrade] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = (person: AnnualStudent, nextAction: typeof action) => {
    setStudent(person);
    setAction(nextAction);
    setGrade("");
    setSourceId("");
    setReason("");
    setReference("");
    setError(null);
  };
  const submit = async () => {
    if (
      !student ||
      !reason.trim() ||
      (action !== "source" && (!grade.trim() || !reference.trim()))
    )
      return;
    setBusy(true);
    setError(null);
    try {
      if (action === "external")
        await academicGradingService.externalGrade(summary.classId, {
          studentId: student.studentId,
          period,
          grade: Number(grade),
          reason,
          sourceReference: reference,
        });
      else if (action === "source") {
        const source = student.candidates.find(
          (c) => c.id === sourceId && c.period === period,
        );
        if (!source) throw new Error("Select an authoritative period source.");
        await academicGradingService.selectSource(summary.classId, {
          studentId: student.studentId,
          period,
          sourceId: source.id,
          sourceType: source.sourceType,
          reason,
        });
      } else {
        if (!student.current)
          throw new Error("A complete current annual grade is required.");
        await academicGradingService.recordRemediation(student.current.id, {
          remedialClassMark: Number(grade),
          reason,
          sourceReference: reference,
        });
      }
      await refresh();
      setStudent(null);
      toast.success("Academic evidence recorded and annual sources refreshed.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Academic evidence was rejected."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        {summary.schoolYear} · {summary.subjectCode} · {summary.policy.id}.
        Annual grades require all {summary.periods.length} periods. Missing or
        conflicting sources remain incomplete.
      </p>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3">Learner</th>
              {summary.periods.map((p) => (
                <th key={p.key} className="p-3">
                  {p.label}
                </th>
              ))}
              <th className="p-3">Official annual</th>
              <th className="p-3">SRC / evidence</th>
              {admin && <th className="p-3">Admin actions</th>}
            </tr>
          </thead>
          <tbody>
            {summary.students.map((person) => {
              const src = person.remediation.find(
                (r) => r.isCurrent && r.annualGradeId === person.current?.id,
              );
              return (
                <tr key={person.studentId} className="border-t align-top">
                  <td className="p-3">
                    {person.lastName}, {person.firstName}
                  </td>
                  {summary.periods.map((p) => (
                    <td key={p.key} className="p-3">
                      {person.components.find((c) => c.period === p.key)
                        ?.grade ?? "Missing"}
                    </td>
                  ))}
                  <td className="p-3">
                    {person.current ? (
                      <>
                        <strong>{person.current.officialGrade}</strong> ·{" "}
                        {person.current.remarks}
                        <span className="block text-xs text-slate-500">
                          {person.current.sum} ÷ {person.current.divisor} ={" "}
                          {Number(person.current.rawAverage).toFixed(3)} before
                          official rounding
                        </span>
                      </>
                    ) : (
                      <span>Incomplete</span>
                    )}
                    {person.blockers.map((b, index) => (
                      <p
                        key={`${b.code}-${index}`}
                        className="mt-1 text-xs text-red-700"
                      >
                        {b.message}
                      </p>
                    ))}
                  </td>
                  <td className="space-y-2 p-3">
                    {src ? (
                      <p>
                        RCM {src.remedialClassMark} · RFG {src.recomputedGrade}
                        <span className="block text-xs">
                          {src.sourceReference}
                        </span>
                      </p>
                    ) : (
                      <span>No SRC result</span>
                    )}
                    <details>
                      <summary className="cursor-pointer underline">
                        Sources and history
                      </summary>
                      <ul className="mt-2 space-y-2 text-xs">
                        {person.components.map((c) => (
                          <li key={c.period}>
                            {
                              summary.periods.find((p) => p.key === c.period)
                                ?.label
                            }
                            : {c.sourceType}
                            <span className="block break-all">
                              {c.sourceId}
                            </span>
                          </li>
                        ))}
                        {person.history.map((version) => (
                          <li key={version.id}>
                            {version.isCurrent ? "Current" : "Superseded"}{" "}
                            annual: {version.officialGrade} ·{" "}
                            {new Date(version.computedAt).toLocaleDateString()}
                            <span className="block break-all">
                              {version.id}
                            </span>
                            {version.invalidationReason}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </td>
                  {admin && (
                    <td className="space-y-2 p-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => open(person, "external")}
                      >
                        External grade
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => open(person, "source")}
                      >
                        Choose source
                      </Button>
                      {person.current &&
                        person.current.officialGrade <
                          summary.policy.passingGrade && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => open(person, "src")}
                          >
                            Record SRC
                          </Button>
                        )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {!summary.students.length && (
          <p className="p-3 text-sm">
            No class participants or annual source evidence.
          </p>
        )}
      </div>
      {!admin && (
        <p className="text-sm">
          Ask an administrator to verify external grades, resolve source
          conflicts, or record SRC evidence.
        </p>
      )}
      {admin && (
        <Link
          href="/dashboard/admin/system-settings"
          className="text-sm underline"
        >
          Manage back subjects and Grade 10 completion
        </Link>
      )}
      {student && (
        <form
          className="space-y-3 rounded-md border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <h3 className="font-medium">
            {action === "external"
              ? "Verified external period grade"
              : action === "source"
                ? "Authoritative period source"
                : "Evidenced SRC result"}
            : {student.lastName}, {student.firstName}
          </h3>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          {action !== "src" && (
            <div>
              <Label htmlFor="annual-evidence-period">Period</Label>
              <select
                id="annual-evidence-period"
                className="ml-3 h-10 rounded-md border bg-white px-3"
                value={period}
                onChange={(e) => {
                  setPeriod(e.target.value as AcademicPeriodKey);
                  setSourceId("");
                }}
              >
                {summary.periods.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {action === "source" ? (
            <div>
              <Label htmlFor="annual-source">Verified source</Label>
              <select
                id="annual-source"
                required
                className="block h-10 w-full rounded-md border bg-white px-3 text-sm"
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
              >
                <option value="">
                  Choose source after checking its evidence
                </option>
                {student.candidates
                  .filter((c) => c.period === period)
                  .map((c) => (
                    <option key={c.id} value={c.id} disabled={!c.trusted}>
                      {c.grade} · {c.sourceType} · {c.id}
                      {!c.trusted ? " · untrusted" : ""}
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="annual-evidence-mark">
                  {action === "src"
                    ? "Remedial class mark (RCM)"
                    : "Official period grade"}{" "}
                  (0–100)
                </Label>
                <Input
                  id="annual-evidence-mark"
                  required
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="annual-evidence-reference">
                  Verified source / register reference
                </Label>
                <Input
                  id="annual-evidence-reference"
                  required
                  minLength={3}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>
            </>
          )}
          <div>
            <Label htmlFor="annual-evidence-reason">
              Reason and verification notes
            </Label>
            <Input
              id="annual-evidence-reason"
              required
              minLength={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <p className="text-sm text-slate-600">
            {action === "src"
              ? "The server computes the recomputed final grade from the original annual grade and RCM. The original grade remains unchanged."
              : "This action is audited. Conflicting local and external evidence requires an explicit source choice; nothing is averaged together."}
          </p>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              Record verified evidence
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setStudent(null)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
