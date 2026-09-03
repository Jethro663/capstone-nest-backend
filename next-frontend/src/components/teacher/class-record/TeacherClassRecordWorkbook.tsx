"use client";

import { useEffect, useState } from "react";
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
import { TeacherClassRecordGradeGrid } from "./TeacherClassRecordGradeGrid";
import { getSurnameBand, getSurnameInitial } from "./class-record-visuals";
import styles from "./TeacherClassRecordWorkbook.module.css";
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

type WorkbookTab = "scores" | "roster" | "readiness" | "annual" | "history";

export function TeacherClassRecordWorkbook({
  state,
  className,
  emptyMessage = "No period workbook exists yet. Choose a policy period to create one.",
  presentation = "full",
}: {
  state: TeacherClassRecordState;
  className?: string;
  emptyMessage?: string;
  presentation?: "full" | "content-only";
}) {
  const { role } = useAuth();
  const [tab, setTab] = useState<WorkbookTab>("scores");
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
  const tabs: Array<{ key: WorkbookTab; label: string }> = [
    { key: "scores", label: "Grades" },
    { key: "roster", label: "Eligibility" },
    { key: "readiness", label: "Review & Finalize" },
    { key: "annual", label: "Annual" },
    { key: "history", label: "History" },
  ];
  const historicalRecords = state.classRecords.filter(
    (candidate) => !state.quarters.includes(candidate.gradingPeriod),
  );
  const readinessGroups = Array.from(
    (state.readiness?.blockers ?? []).reduce(
      (groups, blocker) => {
        const key = blocker.studentId ?? "record";
        const existing = groups.get(key) ?? [];
        existing.push(blocker);
        groups.set(key, existing);
        return groups;
      },
      new Map<
        string,
        NonNullable<TeacherClassRecordState["readiness"]>["blockers"]
      >(),
    ),
  );
  const recordStatus = record?.status
    ? `${record.status.charAt(0).toUpperCase()}${record.status.slice(1)}`
    : "Waiting";
  return (
    <section className={cn(styles.workbook, className)}>
      {presentation === "full" && (
        <header className={styles.workbookHeader}>
          <div className={styles.titleBlock}>
            <h2>{sheet?.header.subject ?? "Class record"}</h2>
            <div className={styles.headerMeta}>
              {record && (
                <span className={styles.periodLabel}>
                  {label(record.gradingPeriod)}
                </span>
              )}
              {state.policy?.schoolYear && (
                <span>School year {state.policy.schoolYear}</span>
              )}
              <span className={styles.statusBadge} data-status={record?.status}>
                {recordStatus}
              </span>
              {record && (
                <span className={styles.revisionBadge}>
                  Revision {record.revision ?? 0}
                </span>
              )}
            </div>
            {state.policy && (
              <details className={styles.recordDetails}>
                <summary>Record details</summary>
                <p>Policy {state.policy.id}</p>
              </details>
            )}
          </div>
          <div className={styles.headerActions}>
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
        </header>
      )}
      <div className={styles.workbookContent}>
        {presentation === "full" && (
          <div className={styles.periodNavigation} aria-label="Grading periods">
            {state.quarters.map((period) => {
              const existing = state.classRecords.find(
                (candidate) => candidate.gradingPeriod === period,
              );
              const selected = Boolean(
                existing && record?.id === existing.id,
              );
              return (
                <button
                  key={period}
                  type="button"
                  className={styles.periodButton}
                  aria-pressed={selected}
                  disabled={state.generating}
                  onClick={() =>
                    existing
                      ? state.setSelectedRecordId(existing.id)
                      : void state.generateQuarter(period)
                  }
                >
                  {existing ? label(period) : `Create ${label(period)}`}
                </button>
              );
            })}
            {historicalRecords.length > 0 && (
              <label className={styles.archivedLabel}>
                Archived periods
                <select
                  className={styles.archivedSelect}
                  aria-label="Archived periods"
                  value={
                    historicalRecords.some(
                      (candidate) => candidate.id === record?.id,
                    )
                      ? record?.id
                      : ""
                  }
                  onChange={(event) => {
                    if (event.target.value)
                      state.setSelectedRecordId(event.target.value);
                  }}
                >
                  <option value="">Choose a historical record</option>
                  {historicalRecords.map((historicalRecord) => (
                    <option key={historicalRecord.id} value={historicalRecord.id}>
                      {label(historicalRecord.gradingPeriod)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}
      {state.spreadsheetStatus === "error" && (
        <p role="alert" className={styles.alert}>
          Readiness could not be refreshed. The previous view may be stale;
          refresh before editing or finalizing.
        </p>
      )}
      {!record ? (
        <p className={styles.emptyState}>{emptyMessage}</p>
      ) : !sheet ? (
        <p role="status" className={styles.loadingState}>
          Loading period evidence…
        </p>
      ) : (
        <>
          <div className={styles.statusPanel}>
            <div className={styles.statusCopy}>
              <p>
              {sheet.academicCapabilities?.readOnlyReason ??
                (!canGrade && canPrepare
                  ? "Future draft: preparation is allowed; scores and finalization wait until this period is active."
                  : "Blank scores are missing. Enter zero explicitly; exemptions require a reason.")}
              </p>
              {!sheet.classRecord.rosterConfirmedAt && (
                <p data-status="warning">
                  Period eligibility is unconfirmed. Current enrollment does not
                  establish earlier-period eligibility.
                </p>
              )}
            </div>
            <div className={styles.statusActions}>
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
            className={styles.tabs}
            role="tablist"
            aria-label="Academic evidence"
          >
            {tabs.map(({ key, label: tabLabel }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                aria-controls={`class-record-panel-${key}`}
                id={`class-record-tab-${key}`}
                className={styles.tab}
                onClick={() => setTab(key)}
              >
                {tabLabel}
                {key === "readiness" &&
                  Boolean(state.readiness?.blockers.length) && (
                    <span className={styles.tabCount}>
                      ({state.readiness?.blockers.length})
                    </span>
                  )}
              </button>
            ))}
          </div>
          {tab === "scores" && (
            <div
              role="tabpanel"
              id="class-record-panel-scores"
              aria-labelledby="class-record-tab-scores"
              className={styles.panel}
            >
              {state.policy?.examComponents.length ? (
                <p className={styles.panelIntro}>
                  Examination components:{" "}
                  {state.policy.examComponents
                    .map((c) => `${c.key} ${c.weight}%`)
                    .join(" · ")}
                  . The examination PS uses these component weights.
                </p>
              ) : null}
              <TeacherClassRecordGradeGrid
                key={sheet.classRecord.id}
                state={state}
                sheet={sheet}
                canGrade={canGrade}
                canPrepare={canPrepare}
                onOpenCell={({ item, student, score, status, reason }) =>
                  openCell(item, student, score, status, reason)
                }
              />
            </div>
          )}
          {tab === "roster" && (
            <form
              role="tabpanel"
              id="class-record-panel-roster"
              aria-labelledby="class-record-tab-roster"
              className={styles.panel}
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
              <p className={styles.panelIntro}>
                Confirm each learner’s actual eligibility for{" "}
                {label(record.gradingPeriod)}. Past scores and membership remain
                in history when a learner is excluded.
              </p>
              <div className={styles.tableShell}>
                <table className={styles.secondaryTable}>
                  <thead>
                    <tr>
                      <th className="p-3">Learner</th>
                      <th className="p-3">Period eligibility</th>
                      <th className="p-3">Exclusion evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.roster?.participants.map((person) => (
                      <tr key={person.studentId}>
                        <th
                          scope="row"
                          className={styles.secondaryNameCell}
                          data-surname-band={getSurnameBand(
                            person.lastName ?? "",
                          )}
                        >
                          <span className={styles.annualLearner}>
                            <span
                              className={styles.surnameBadge}
                              aria-hidden="true"
                            >
                              {getSurnameInitial(person.lastName)}
                            </span>
                            <span className={styles.learnerIdentity}>
                              <span>
                                <strong>{person.lastName ?? "Unknown"}</strong>,{" "}
                                {person.firstName ?? "Unknown"}
                              </span>
                              <small>
                                {person.currentlyEnrolled
                                  ? "Currently enrolled"
                                  : "Not currently enrolled"}
                              </small>
                            </span>
                          </span>
                        </th>
                        <td className="p-3">
                          <select
                            aria-label={`Eligibility for ${person.firstName} ${person.lastName}`}
                            required
                            disabled={!canPrepare}
                            className={styles.eligibilitySelect}
                            data-eligibility-status={
                              decisions[person.studentId]?.eligibility ||
                              "unconfirmed"
                            }
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
            <div
              role="tabpanel"
              id="class-record-panel-readiness"
              aria-labelledby="class-record-tab-readiness"
              className={styles.panel}
            >
              <p
                className={
                  state.readiness?.ready
                    ? styles.readyMessage
                    : styles.panelIntro
                }
              >
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
              <div className={styles.blockerGroups}>
                {readinessGroups.map(([groupKey, blockers]) => (
                  <section className={styles.blockerGroup} key={groupKey}>
                    <h3>
                      {groupKey === "record"
                        ? "Record checks"
                        : learnerName(groupKey)}
                    </h3>
                    <ul className={styles.blockerList}>
                      {blockers.map((blocker, index) => (
                        <li
                          key={`${blocker.code}-${index}`}
                          className={styles.blocker}
                        >
                          {blocker.message}
                          {blocker.itemId && (
                            <small>
                              Assessment:{" "}
                              {sheet.categories
                                .flatMap((category) => category.items)
                                .find((item) => item.id === blocker.itemId)
                                ?.title ?? blocker.itemId}
                            </small>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
          )}
          {tab === "annual" && (
            <div
              role="tabpanel"
              id="class-record-panel-annual"
              aria-labelledby="class-record-tab-annual"
              className={styles.panel}
            >
              {state.annualSummary ? (
                <AcademicAnnualSummary
                  summary={state.annualSummary}
                  refresh={state.loadAnnual}
                />
              ) : (
                <div className={styles.panel}>
                  <p className={styles.panelIntro}>
                    Annual evidence is not loaded.
                  </p>
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
              id="class-record-panel-history"
              aria-labelledby="class-record-tab-history"
              className={styles.panel}
            >
              <Button
                variant="outline"
                onClick={() => void loadHistory()}
              >
                Refresh history
              </Button>
              {state.history && (
                <>
                  <div className={styles.tableShell}>
                    <table className={styles.secondaryTable}>
                      <thead>
                        <tr>
                          <th>Learner</th>
                          <th>Revision</th>
                          <th>Grade</th>
                          <th>Evidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.history.revisions.map((version) => {
                          const participant = state.roster?.participants.find(
                            (person) => person.studentId === version.studentId,
                          );
                          return (
                            <tr key={version.id}>
                              <th
                                scope="row"
                                className={styles.secondaryNameCell}
                                data-surname-band={getSurnameBand(
                                  participant?.lastName ?? "",
                                )}
                              >
                                <span className={styles.annualLearner}>
                                  <span
                                    className={styles.surnameBadge}
                                    aria-hidden="true"
                                  >
                                    {getSurnameInitial(participant?.lastName)}
                                  </span>
                                  <span className={styles.learnerIdentity}>
                                    <span>
                                      {learnerName(version.studentId)}
                                    </span>
                                    <small>Recorded learner</small>
                                  </span>
                                </span>
                              </th>
                              <td>
                                {version.revision} ·{" "}
                                {version.isCurrent ? "current" : "superseded"}
                              </td>
                              <td>{version.grade}</td>
                              <td>
                                <span className={styles.evidenceId}>
                                  {version.id}
                                </span>
                                {new Date(version.computedAt).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {state.history.legacyEvidence.map((legacy) => (
                    <details
                      key={legacy.id}
                      className={styles.historyEvidence}
                    >
                      <summary>
                        Unverified legacy evidence ·{" "}
                        {learnerName(legacy.studentId)} · {legacy.period}
                      </summary>
                      <p>
                        This preserved snapshot is not a trusted annual source.
                      </p>
                      <pre>
                        {JSON.stringify(legacy.sourceSnapshot, null, 2)}
                      </pre>
                    </details>
                  ))}
                  {!state.history.revisions.length &&
                    !state.history.legacyEvidence.length && (
                      <p className={styles.panelIntro}>
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
      </div>
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
    </section>
  );
}
