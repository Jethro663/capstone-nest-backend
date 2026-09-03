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
import { getSurnameBand, getSurnameInitial } from "./class-record-visuals";
import styles from "./TeacherClassRecordWorkbook.module.css";
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
    <div className={styles.annualSummary}>
      <p className={styles.panelIntro}>
        School year {summary.schoolYear} · {summary.subjectCode}. Annual grades
        require all {summary.periods.length} policy periods. Missing or
        conflicting evidence remains visibly incomplete.
      </p>
      <div className={styles.tableShell}>
        <table className={styles.secondaryTable}>
          <thead>
            <tr>
              <th>Learner</th>
              {summary.periods.map((p) => (
                <th key={p.key}>
                  {p.label}
                </th>
              ))}
              <th>Official annual</th>
              <th>SRC / evidence</th>
              {admin && <th>Admin actions</th>}
            </tr>
          </thead>
          <tbody>
            {summary.students.map((person) => {
              const src = person.remediation.find(
                (r) => r.isCurrent && r.annualGradeId === person.current?.id,
              );
              return (
                <tr key={person.studentId}>
                  <th
                    scope="row"
                    className={styles.secondaryNameCell}
                    data-surname-band={getSurnameBand(person.lastName)}
                  >
                    <span className={styles.annualLearner}>
                      <span className={styles.surnameBadge} aria-hidden="true">
                        {getSurnameInitial(person.lastName)}
                      </span>
                      <span className={styles.learnerIdentity}>
                        <span>
                          <strong>{person.lastName || "Unnamed learner"}</strong>
                          {person.firstName ? `, ${person.firstName}` : ""}
                        </span>
                        <small>Annual academic record</small>
                      </span>
                    </span>
                  </th>
                  {summary.periods.map((p) => {
                    const component = person.components.find(
                      (candidate) => candidate.period === p.key,
                    );
                    return (
                      <td
                        key={p.key}
                        className={styles.annualPeriodCell}
                        data-score-status={component ? "verified" : "missing"}
                      >
                        {component ? (
                          <>
                            <strong>{component.grade}</strong>
                            <small>Verified</small>
                          </>
                        ) : (
                          <span>Missing</span>
                        )}
                      </td>
                    );
                  })}
                  <td
                    className={styles.annualGradeCell}
                    data-grade-status={
                      !person.current
                        ? "unavailable"
                        : person.current.remarks === "Failed"
                          ? "intervention"
                          : "verified"
                    }
                  >
                    {person.current ? (
                      <>
                        <strong>{person.current.officialGrade}</strong>
                        <span
                          data-grade-status={
                            person.current.remarks === "Failed"
                              ? "intervention"
                              : "verified"
                          }
                        >
                          {person.current.remarks === "Failed"
                            ? "For intervention"
                            : "Verified · Passed"}
                        </span>
                        <small>
                          {person.current.sum} ÷ {person.current.divisor} ={" "}
                          {Number(person.current.rawAverage).toFixed(3)} before
                          official rounding
                        </small>
                      </>
                    ) : (
                      <span>Incomplete annual grade</span>
                    )}
                    {!!person.blockers.length && (
                      <ul className={styles.annualBlockers}>
                        {person.blockers.map((b, index) => (
                          <li key={`${b.code}-${index}`}>
                            {b.message}
                            {(b.period || b.itemId) && (
                              <small>
                                {[b.period, b.itemId].filter(Boolean).join(" · ")}
                              </small>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className={styles.annualEvidenceCell}>
                    {src ? (
                      <p data-score-status="verified">
                        <strong>
                          RCM {src.remedialClassMark} · RFG {src.recomputedGrade}
                        </strong>
                        <small>
                          {src.sourceReference}
                        </small>
                      </p>
                    ) : (
                      <span data-score-status="unavailable">No SRC result</span>
                    )}
                    <details className={styles.historyEvidence}>
                      <summary>Sources and history</summary>
                      <ul>
                        {person.components.map((c) => (
                          <li key={c.period}>
                            {
                              summary.periods.find((p) => p.key === c.period)
                                ?.label
                            }
                            : {c.sourceType}
                            <small>{c.sourceId}</small>
                          </li>
                        ))}
                        {person.history.map((version) => (
                          <li key={version.id}>
                            {version.isCurrent ? "Current" : "Superseded"}{" "}
                            annual: {version.officialGrade} ·{" "}
                            {new Date(version.computedAt).toLocaleDateString()}
                            <small>{version.id}</small>
                            {version.invalidationReason}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </td>
                  {admin && (
                    <td className={styles.annualActions}>
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
          <p className={styles.emptyGrid}>
            No class participants or annual source evidence.
          </p>
        )}
      </div>
      {!admin && (
        <p className={styles.readOnlyNotice}>
          Ask an administrator to verify external grades, resolve source
          conflicts, or record SRC evidence.
        </p>
      )}
      {admin && (
        <Link
          href="/dashboard/admin/system-settings"
          className={styles.settingsLink}
        >
          Manage back subjects and Grade 10 completion
        </Link>
      )}
      {student && (
        <form
          className={styles.annualEvidenceForm}
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <h3>
            {action === "external"
              ? "Verified external period grade"
              : action === "source"
                ? "Authoritative period source"
                : "Evidenced SRC result"}
            : {student.lastName}, {student.firstName}
          </h3>
          {error && (
            <p role="alert" className={styles.alert}>
              {error}
            </p>
          )}
          {action !== "src" && (
            <div className={styles.formField}>
              <Label htmlFor="annual-evidence-period">Period</Label>
              <select
                id="annual-evidence-period"
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
            <div className={styles.formField}>
              <Label htmlFor="annual-source">Verified source</Label>
              <select
                id="annual-source"
                required
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
              <div className={styles.formField}>
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
              <div className={styles.formField}>
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
          <div className={styles.formField}>
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
          <p className={styles.panelIntro}>
            {action === "src"
              ? "The server computes the recomputed final grade from the original annual grade and RCM. The original grade remains unchanged."
              : "This action is audited. Conflicting local and external evidence requires an explicit source choice; nothing is averaged together."}
          </p>
          <div className={styles.formActions}>
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
