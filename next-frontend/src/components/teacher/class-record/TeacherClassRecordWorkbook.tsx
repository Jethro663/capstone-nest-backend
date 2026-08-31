"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
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
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/utils/cn";
import { AcademicAnnualSummary } from "./AcademicAnnualSummary";
import type { TeacherClassRecordState } from "@/hooks/use-teacher-class-record";
import type { PeriodEligibility } from "@/types/academic-grading";
import type {
  SpreadsheetCategory,
  SpreadsheetStudentRow,
} from "@/types/class-record";

type Cell = {
  item: SpreadsheetCategory["items"][number];
  student: SpreadsheetStudentRow;
  status: string;
  reason: string;
};
const number = (value: number | null | undefined, digits = 2) =>
  value == null ? "Incomplete" : Number(value).toFixed(digits);
export function TeacherClassRecordWorkbook({
  state,
  className,
  emptyMessage = "No period workbook exists yet. Choose a policy period to create one.",
}: {
  state: TeacherClassRecordState;
  className?: string;
  emptyMessage?: string;
}) {
  const { role } = useAuth();
  const [tab, setTab] = useState("scores");
  const [dialog, setDialog] = useState<"finalize" | "reopen" | null>(null);
  const [correctionReason, setCorrectionReason] = useState("");
  const [rosterReason, setRosterReason] = useState("");
  const [decisions, setDecisions] = useState<
    Record<string, { eligibility: PeriodEligibility | ""; reason: string }>
  >({});
  const [cell, setCell] = useState<Cell | null>(null);
  const [mode, setMode] = useState<"recorded" | "excused">("recorded");
  const [excuseReason, setExcuseReason] = useState("");
  const [savingCell, setSavingCell] = useState(false);
  const { spreadsheet: sheet, selectedRecord: record, loadAnnual, loadHistory } = state;
  const canGrade =
    Boolean(sheet?.academicCapabilities?.canGrade) &&
    state.spreadsheetStatus === "ready";
  const canPrepare =
    Boolean(sheet?.academicCapabilities?.canPrepare) &&
    state.spreadsheetStatus === "ready";
  const label = (period: string) => state.periodLabel?.(period) ?? period;
  useEffect(() => {
    setDecisions(
      Object.fromEntries(
        (state.roster?.participants ?? []).map((person) => [
          person.studentId,
          {
            eligibility: person.eligibility ?? "",
            reason: person.reason ?? "",
          },
        ]),
      ),
    );
  }, [state.roster]);
  useEffect(() => {
    if (tab === "annual") void loadAnnual();
    if (tab === "history") void loadHistory();
  }, [
    tab,
    record?.id,
    sheet?.classRecord.revision,
    loadAnnual,
    loadHistory,
  ]);
  const openCell = (
    item: Cell["item"],
    student: SpreadsheetStudentRow,
    score: number | null,
    status: string,
    reason: string,
  ) => {
    if (!canGrade || student.eligibility !== "eligible" || !item.hps) return;
    setCell({ item, student, status, reason });
    setMode(status === "excused" ? "excused" : "recorded");
    setExcuseReason(reason);
    if (!item.assessmentId)
      state.handleCellClick(item.id, student.studentId, score, {
        maxScore: item.hps,
      });
  };
  const saveCell = async () => {
    if (!cell) return;
    setSavingCell(true);
    try {
      const saved =
        mode === "excused"
          ? await state.excuseScore(
              cell.item.id,
              cell.student.studentId,
              excuseReason,
            )
          : cell.item.assessmentId && cell.status === "excused"
            ? await state.restoreAssessmentEvidence(
                cell.item.id,
                cell.student.studentId,
                excuseReason,
              )
            : await state.handleCellSave();
      if (saved) {
        setCell(null);
        state.setEditingCell(null);
      }
    } finally {
      setSavingCell(false);
    }
  };
  const learnerName = (id?: string) => {
    const person = state.roster?.participants.find((p) => p.studentId === id);
    return person ? `${person.lastName}, ${person.firstName}` : id;
  };
  const tabs = [
    ["scores", "Scores"],
    ["roster", "Period eligibility"],
    ["readiness", "Readiness"],
    ["annual", "Annual summary"],
    ["history", "Revision history"],
  ];
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {sheet?.header.subject ?? "Class record"}
            {record ? ` · ${label(record.gradingPeriod)}` : ""}
          </h2>
          <p className="text-sm text-slate-600">
            {state.policy?.schoolYear} · {state.policy?.id}
            {record
              ? ` · ${record.status} · revision ${record.revision ?? 0}`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void state.refresh()}>
            Refresh workbook
          </Button>
          <Button
            variant="outline"
            disabled={!sheet || state.spreadsheetStatus === "error"}
            onClick={() => void state.exportSpreadsheet()}
          >
            Export workbook and annual evidence
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Grading periods">
        {state.quarters.map((period) => {
          const existing = state.classRecords.find(
            (r) => r.gradingPeriod === period,
          );
          return (
            <Button
              key={period}
              variant={
                record?.id === existing?.id && existing ? "default" : "outline"
              }
              disabled={state.generating}
              onClick={() =>
                existing
                  ? state.setSelectedRecordId(existing.id)
                  : void state.generateQuarter(period)
              }
            >
              {existing ? label(period) : `Create ${label(period)}`}
            </Button>
          );
        })}
        {state.classRecords
          .filter((r) => !state.quarters.includes(r.gradingPeriod))
          .map((r) => (
            <Button
              key={r.id}
              variant="outline"
              onClick={() => state.setSelectedRecordId(r.id)}
            >
              Historical {r.gradingPeriod}
            </Button>
          ))}
      </div>
      {state.spreadsheetStatus === "error" && (
        <p role="alert" className="text-sm text-red-700">
          Readiness could not be refreshed. The previous view may be stale;
          refresh before editing or finalizing.
        </p>
      )}
      {!record ? (
        <p className="rounded-md border p-4 text-sm">{emptyMessage}</p>
      ) : !sheet ? (
        <p role="status">Loading period evidence…</p>
      ) : (
        <>
          <div className="space-y-2 rounded-md border p-4 text-sm">
            <p>
              {sheet.academicCapabilities?.readOnlyReason ??
                (!canGrade && canPrepare
                  ? "Future draft: preparation is allowed; scores and finalization wait until this period is active."
                  : "Blank scores are missing. Enter zero explicitly; exemptions require a reason.")}
            </p>
            {!sheet.classRecord.rosterConfirmedAt && (
              <p className="text-red-700">
                Period eligibility is unconfirmed. Current enrollment does not
                establish earlier-period eligibility.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={
                  !canGrade ||
                  !state.readiness?.ready ||
                  state.finalizing ||
                  state.spreadsheetStatus !== "ready"
                }
                onClick={() => setDialog("finalize")}
              >
                Finalize {label(record.gradingPeriod)}
              </Button>
              {sheet.canReopen && (
                <Button
                  variant="outline"
                  disabled={state.reopening}
                  onClick={() => {
                    setCorrectionReason("");
                    setDialog("reopen");
                  }}
                >
                  Reopen with reason
                </Button>
              )}
              {!state.readiness?.ready && (
                <Button variant="outline" onClick={() => setTab("readiness")}>
                  Review {state.readiness?.blockers.length ?? 0} blockers
                </Button>
              )}
            </div>
          </div>
          <div
            className="flex flex-wrap gap-2 border-b pb-3"
            role="tablist"
            aria-label="Academic evidence"
          >
            {tabs.map(([key, title]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                className={cn(
                  "rounded-md px-3 py-2 text-sm",
                  tab === key ? "bg-slate-900 text-white" : "border bg-white",
                )}
                onClick={() => setTab(key)}
              >
                {title}
              </button>
            ))}
          </div>
          {tab === "scores" && (
            <div role="tabpanel" aria-label="Scores" className="space-y-3">
              {state.policy?.examComponents.length ? (
                <p className="text-sm">
                  Examination components:{" "}
                  {state.policy.examComponents
                    .map((c) => `${c.key} ${c.weight}%`)
                    .join(" · ")}
                  . The examination PS uses these component weights.
                </p>
              ) : null}
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th rowSpan={2} className="min-w-48 border p-2 text-left">
                        Learner / eligibility
                      </th>
                      {sheet.categories.map((category) => (
                        <th
                          key={category.id}
                          colSpan={category.items.length + 3}
                          className="border p-2"
                        >
                          {category.name === "Quarterly Assessment" &&
                          state.policy?.examComponents.length
                            ? "Examination"
                            : category.name}{" "}
                          · {category.weight}%
                        </th>
                      ))}
                      <th rowSpan={2} className="border p-2">
                        Initial grade
                      </th>
                      <th rowSpan={2} className="border p-2">
                        {record.status === "draft"
                          ? "Provisional"
                          : record.revision
                            ? "Official"
                            : "Legacy unverified"}{" "}
                        period grade
                      </th>
                    </tr>
                    <tr>
                      {sheet.categories.map((category) => (
                        <Fragment key={category.id}>
                          {category.items.map((item) => (
                            <th key={item.id} className="min-w-24 border p-2">
                              <span className="block">{item.title}</span>
                              {item.assessmentId && (
                                <button
                                  className="mt-1 text-xs underline"
                                  disabled={
                                    !canGrade || state.syncingItemId === item.id
                                  }
                                  onClick={() => void state.syncItem(item.id)}
                                >
                                  Sync result
                                </button>
                              )}
                            </th>
                          ))}
                          <th className="border p-2">Total</th>
                          <th className="border p-2">PS</th>
                          <th className="border p-2">WS</th>
                        </Fragment>
                      ))}
                    </tr>
                    <tr>
                      <th className="border p-2 text-left">
                        Highest possible score
                      </th>
                      {sheet.categories.map((category) => (
                        <Fragment key={category.id}>
                          {category.items.map((item) => (
                            <td
                              key={item.id}
                              className="border p-2 text-center"
                            >
                              {state.editingHpsItemId === item.id ? (
                                <Input
                                  aria-label={`HPS for ${item.title}`}
                                  ref={state.hpsEditRef}
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={state.hpsValue}
                                  onChange={(e) =>
                                    state.setHpsValue(e.target.value)
                                  }
                                  onKeyDown={state.handleHpsKeyDown}
                                  onBlur={() => void state.handleHpsSave()}
                                />
                              ) : (
                                <button
                                  type="button"
                                  className="w-full rounded px-2 py-1 disabled:cursor-default enabled:hover:bg-slate-100"
                                  disabled={
                                    !canPrepare || Boolean(item.assessmentId)
                                  }
                                  onClick={() =>
                                    state.handleHpsClick(
                                      item.id,
                                      item.hps,
                                      item.assessmentId,
                                    )
                                  }
                                >
                                  {item.hps ?? "—"}
                                </button>
                              )}
                            </td>
                          ))}
                          <td
                            colSpan={3}
                            className="border p-2 text-center text-xs"
                          >
                            {category.weight}% category weight
                          </td>
                        </Fragment>
                      ))}
                      <td colSpan={2} className="border p-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.students.map((student) => (
                      <tr key={student.studentId}>
                        <th
                          scope="row"
                          className="border p-2 text-left font-normal"
                        >
                          {student.lastName}, {student.firstName}
                          <span className="block text-xs text-slate-500">
                            {student.eligibility ?? "Unconfirmed"}
                            {student.isRemoved
                              ? " · removed from current class"
                              : ""}
                          </span>
                        </th>
                        {sheet.categories.map((category) => {
                          const values = student.categories.find(
                            (c) => c.categoryId === category.id,
                          );
                          return (
                            <Fragment key={category.id}>
                              {category.items.map((item, index) => {
                                const score = values?.scores[index] ?? null;
                                const status =
                                  values?.scoreStatuses?.[index] ??
                                  (score == null ? "missing" : "recorded");
                                const display =
                                  !item.hps ||
                                  (student.eligibility &&
                                    student.eligibility !== "eligible")
                                    ? "—"
                                    : status === "excused"
                                      ? "Excused"
                                      : (score ?? "Missing");
                                return (
                                  <td
                                    key={item.id}
                                    className="border p-1 text-center"
                                  >
                                    <button
                                      type="button"
                                      className="w-full rounded px-2 py-2 text-xs enabled:hover:bg-slate-100 disabled:cursor-default"
                                      disabled={
                                        !canGrade ||
                                        student.eligibility !== "eligible" ||
                                        !item.hps ||
                                        state.spreadsheetStatus !== "ready"
                                      }
                                      aria-label={`${student.firstName} ${student.lastName}, ${item.title}: ${display}`}
                                      onClick={() =>
                                        openCell(
                                          item,
                                          student,
                                          score,
                                          status,
                                          values?.scoreReasons?.[index] ?? "",
                                        )
                                      }
                                    >
                                      {display}
                                    </button>
                                  </td>
                                );
                              })}
                              <td className="border p-2 text-center">
                                {number(values?.total)}
                              </td>
                              <td className="border p-2 text-center">
                                {number(values?.ps)}
                              </td>
                              <td className="border p-2 text-center">
                                {number(values?.ws)}
                              </td>
                            </Fragment>
                          );
                        })}
                        <td className="border p-2 text-center">
                          {number(student.initialGrade)}
                        </td>
                        <td className="border p-2 text-center">
                          <strong>
                            {student.quarterlyGrade ??
                              (student.remarks === "Not graded"
                                ? "Not graded"
                                : "Incomplete")}
                          </strong>
                          <span className="block text-xs">
                            {student.gradeProvenance === "legacy_unverified"
                              ? "Legacy unverified · "
                              : ""}
                            {student.remarks}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!sheet.students.length && (
                  <p className="p-4 text-sm">
                    No participants. Review and confirm an empty eligibility
                    register only if this period had no eligible learners.
                  </p>
                )}
              </div>
            </div>
          )}
          {tab === "roster" && (
            <form
              role="tabpanel"
              aria-label="Period eligibility"
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const saved = await state.confirmRoster({
                  reason: rosterReason,
                  participants: (state.roster?.participants ?? []).map(
                    (person) => ({
                      studentId: person.studentId,
                      eligibility: decisions[person.studentId]
                        .eligibility as PeriodEligibility,
                      reason: decisions[person.studentId].reason || undefined,
                    }),
                  ),
                });
                if (saved) setRosterReason("");
              }}
            >
              <p className="text-sm">
                Confirm each learner’s actual eligibility for{" "}
                {label(record.gradingPeriod)}. Past scores and membership remain
                in history when a learner is excluded.
              </p>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3">Learner</th>
                      <th className="p-3">Period eligibility</th>
                      <th className="p-3">Exclusion evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.roster?.participants.map((person) => (
                      <tr key={person.studentId} className="border-t">
                        <td className="p-3">
                          {person.lastName}, {person.firstName}
                          <span className="block text-xs">
                            {person.currentlyEnrolled
                              ? "Currently enrolled"
                              : "Not currently enrolled"}
                          </span>
                        </td>
                        <td className="p-3">
                          <select
                            aria-label={`Eligibility for ${person.firstName} ${person.lastName}`}
                            required
                            disabled={!canPrepare}
                            className="h-10 rounded-md border bg-white px-2"
                            value={
                              decisions[person.studentId]?.eligibility ?? ""
                            }
                            onChange={(e) =>
                              setDecisions((previous) => ({
                                ...previous,
                                [person.studentId]: {
                                  ...previous[person.studentId],
                                  eligibility: e.target
                                    .value as PeriodEligibility,
                                },
                              }))
                            }
                          >
                            <option value="">Choose explicitly</option>
                            <option value="eligible">Eligible</option>
                            <option value="not_enrolled">
                              Not enrolled in period
                            </option>
                            <option value="transferred">Transferred</option>
                            <option value="withdrawn">Withdrawn</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <Input
                            aria-label={`Eligibility reason for ${person.firstName} ${person.lastName}`}
                            disabled={!canPrepare}
                            required={Boolean(
                              decisions[person.studentId]?.eligibility &&
                              decisions[person.studentId].eligibility !==
                                "eligible",
                            )}
                            value={decisions[person.studentId]?.reason ?? ""}
                            onChange={(e) =>
                              setDecisions((previous) => ({
                                ...previous,
                                [person.studentId]: {
                                  ...previous[person.studentId],
                                  reason: e.target.value,
                                },
                              }))
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Label htmlFor="roster-confirmation-reason">
                Register confirmation reason
              </Label>
              <Input
                id="roster-confirmation-reason"
                required
                minLength={3}
                value={rosterReason}
                onChange={(e) => setRosterReason(e.target.value)}
                disabled={!canPrepare}
              />
              <Button
                type="submit"
                disabled={
                  !canPrepare ||
                  !state.roster ||
                  state.savingRoster ||
                  !rosterReason.trim() ||
                  state.roster.participants.some(
                    (person) => !decisions[person.studentId]?.eligibility,
                  )
                }
              >
                Confirm period eligibility
              </Button>
            </form>
          )}
          {tab === "readiness" && (
            <div role="tabpanel" aria-label="Readiness" className="space-y-3">
              <p className="text-sm">
                {state.readiness?.ready
                  ? "All finalization checks pass."
                  : "Resolve every blocker before finalizing. No missing score is converted to zero."}
              </p>
              <Button
                variant="outline"
                onClick={() => void state.refreshEvidence()}
              >
                Refresh readiness
              </Button>
              <ul className="space-y-2">
                {state.readiness?.blockers.map((blocker, index) => (
                  <li
                    key={`${blocker.code}-${index}`}
                    className="rounded-md border p-3 text-sm"
                  >
                    {blocker.message}
                    {blocker.studentId && (
                      <span className="block text-xs">
                        {learnerName(blocker.studentId)}
                      </span>
                    )}
                    {blocker.itemId && (
                      <span className="block text-xs">
                        {sheet.categories
                          .flatMap((c) => c.items)
                          .find((item) => item.id === blocker.itemId)?.title ??
                          blocker.itemId}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {tab === "annual" && (
            <div role="tabpanel" aria-label="Annual summary">
              {state.annualSummary ? (
                <AcademicAnnualSummary
                  summary={state.annualSummary}
                  refresh={state.loadAnnual}
                />
              ) : (
                <div className="space-y-2">
                  <p>Annual evidence is not loaded.</p>
                  <Button
                    variant="outline"
                    onClick={() => void loadAnnual()}
                  >
                    Load annual evidence
                  </Button>
                </div>
              )}
            </div>
          )}
          {tab === "history" && (
            <div
              role="tabpanel"
              aria-label="Revision history"
              className="space-y-3"
            >
              <Button
                variant="outline"
                onClick={() => void loadHistory()}
              >
                Refresh history
              </Button>
              {state.history && (
                <>
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr>
                        <th className="p-2">Learner</th>
                        <th className="p-2">Revision</th>
                        <th className="p-2">Grade</th>
                        <th className="p-2">Evidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.history.revisions.map((version) => (
                        <tr key={version.id} className="border-t">
                          <td className="p-2">
                            {learnerName(version.studentId)}
                          </td>
                          <td className="p-2">
                            {version.revision} ·{" "}
                            {version.isCurrent ? "current" : "superseded"}
                          </td>
                          <td className="p-2">{version.grade}</td>
                          <td className="p-2">
                            <span className="block break-all text-xs">
                              {version.id}
                            </span>
                            {new Date(version.computedAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {state.history.legacyEvidence.map((legacy) => (
                    <details
                      key={legacy.id}
                      className="rounded-md border p-3 text-sm"
                    >
                      <summary className="cursor-pointer">
                        Unverified legacy evidence ·{" "}
                        {learnerName(legacy.studentId)} · {legacy.period}
                      </summary>
                      <p>
                        This preserved snapshot is not a trusted annual source.
                      </p>
                      <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-xs">
                        {JSON.stringify(legacy.sourceSnapshot, null, 2)}
                      </pre>
                    </details>
                  ))}
                  {!state.history.revisions.length &&
                    !state.history.legacyEvidence.length && (
                      <p className="text-sm">
                        No finalized grade revisions or archived legacy
                        evidence.
                      </p>
                    )}
                </>
              )}
            </div>
          )}
        </>
      )}
      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open && !state.finalizing && !state.reopening) setDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === "reopen"
                ? "Reopen period with a reason"
                : "Finalize verified period"}
            </DialogTitle>
            <DialogDescription>
              {dialog === "reopen"
                ? "Original revisions remain in history. Dependent annual and remediation results are invalidated until the corrected evidence is finalized again."
                : "The server rechecks the eligibility register, every required score, manual grading and synchronization before recording an immutable revision."}
            </DialogDescription>
          </DialogHeader>
          {dialog === "reopen" && (
            <>
              <Label htmlFor="correction-reason">Correction reason</Label>
              <Input
                id="correction-reason"
                minLength={3}
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
              />
            </>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={state.finalizing || state.reopening}
              onClick={() => setDialog(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={
                state.finalizing ||
                state.reopening ||
                (dialog === "reopen"
                  ? !correctionReason.trim()
                  : !state.readiness?.ready)
              }
              onClick={async () => {
                const saved =
                  dialog === "reopen"
                    ? await state.reopenQuarter(correctionReason)
                    : await state.finalizeQuarter();
                if (saved) setDialog(null);
              }}
            >
              {dialog === "reopen"
                ? "Reopen and invalidate dependent results"
                : "Finalize period"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={cell !== null}
        onOpenChange={(open) => {
          if (!open && !savingCell) {
            setCell(null);
            state.setEditingCell(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {cell?.student.firstName} {cell?.student.lastName} ·{" "}
              {cell?.item.title}
            </DialogTitle>
            <DialogDescription>
              Zero is an explicit score. Exemptions exclude this item’s
              denominator for this learner and require evidence.
            </DialogDescription>
          </DialogHeader>
          <Label htmlFor="score-entry-status">Score status</Label>
          <select
            id="score-entry-status"
            className="h-10 rounded-md border bg-white px-3"
            value={mode}
            onChange={(e) => setMode(e.target.value as typeof mode)}
          >
            <option value="recorded">Recorded score</option>
            <option value="excused">Excused with reason</option>
          </select>
          {mode === "excused" ? (
            <>
              <Label htmlFor="score-exemption-reason">Exemption reason</Label>
              <Input
                id="score-exemption-reason"
                value={excuseReason}
                onChange={(e) => setExcuseReason(e.target.value)}
              />
            </>
          ) : cell?.item.assessmentId ? (
            <p className="text-sm">
              This score comes from a completed, graded assessment.{" "}
              {role === "teacher" && (
                <Link
                  className="underline"
                  href={`/dashboard/teacher/assessments/${cell.item.assessmentId}/edit`}
                >
                  Open assessment
                </Link>
              )}
            </p>
          ) : (
            <>
              <Label htmlFor="manual-score">Score / {cell?.item.hps}</Label>
              <Input
                id="manual-score"
                ref={state.editRef}
                type="number"
                min={0}
                max={cell?.item.hps ?? undefined}
                step="0.01"
                value={state.editValue}
                onChange={(e) => state.setEditValue(e.target.value)}
              />
            </>
          )}
          {mode === "recorded" &&
            cell?.item.assessmentId &&
            cell.status === "excused" && (
              <>
                <Label htmlFor="restore-assessment-reason">
                  Correction reason
                </Label>
                <Input
                  id="restore-assessment-reason"
                  value={excuseReason}
                  onChange={(e) => setExcuseReason(e.target.value)}
                />
                <p className="text-sm">
                  Restores completed grading evidence only. An ungraded
                  assessment becomes missing, not zero.
                </p>
              </>
            )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={savingCell}
              onClick={() => {
                setCell(null);
                state.setEditingCell(null);
              }}
            >
              Cancel
            </Button>
            {cell?.item.assessmentId &&
            mode === "recorded" &&
            cell.status !== "excused" ? (
              <Button
                disabled={!!state.syncingItemId}
                onClick={async () => {
                  await state.syncItem(cell.item.id);
                  setCell(null);
                }}
              >
                Synchronize assessment result
              </Button>
            ) : (
              <Button
                disabled={
                  savingCell ||
                  (mode === "excused" || cell?.item.assessmentId
                    ? !excuseReason.trim()
                    : !state.editValue.trim())
                }
                onClick={() => void saveCell()}
              >
                {cell?.item.assessmentId && mode === "recorded"
                  ? "Restore assessment evidence"
                  : "Save score evidence"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
