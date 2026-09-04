"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import type { TeacherClassRecordState } from "@/hooks/use-teacher-class-record";
import type {
  SpreadsheetCategory,
  SpreadsheetData,
  SpreadsheetStudentRow,
} from "@/types/class-record";
import {
  CLASS_RECORD_DENSITY_STORAGE_KEY,
  filterClassRecordStudents,
  getCategoryTone,
  getSurnameBand,
  getSurnameInitial,
  type ClassRecordDensity,
  type ClassRecordFilter,
} from "./class-record-visuals";
import styles from "./TeacherClassRecordWorkbook.module.css";

type GradeCell = {
  item: SpreadsheetCategory["items"][number];
  student: SpreadsheetStudentRow;
  score: number | null;
  status: string;
  reason: string;
  bonusPoints: number;
  bonusReason: string;
};

type TeacherClassRecordGradeGridProps = {
  state: TeacherClassRecordState;
  sheet: SpreadsheetData;
  canGrade: boolean;
  canPrepare: boolean;
  onOpenCell: (cell: GradeCell) => void;
};

const number = (value: number | null | undefined, digits = 2) =>
  value == null ? "Incomplete" : Number(value).toFixed(digits);

const eligibilityLabel = (
  eligibility: SpreadsheetStudentRow["eligibility"],
) => {
  if (eligibility === "eligible") return "Eligible";
  if (eligibility === "not_enrolled") return "Not enrolled in period";
  if (eligibility === "transferred") return "Transferred";
  if (eligibility === "withdrawn") return "Withdrawn";
  return "Unconfirmed";
};

export function TeacherClassRecordGradeGrid({
  state,
  sheet,
  canGrade,
  canPrepare,
  onOpenCell,
}: TeacherClassRecordGradeGridProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ClassRecordFilter>("all");
  const [density, setDensity] = useState<ClassRecordDensity>("comfortable");
  const [activeCell, setActiveCell] = useState<{
    studentId: string;
    itemId: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      try {
        const saved = window.localStorage.getItem(
          CLASS_RECORD_DENSITY_STORAGE_KEY,
        );
        if (saved === "comfortable" || saved === "compact") setDensity(saved);
      } catch {
        setDensity("comfortable");
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const students = useMemo(
    () =>
      filterClassRecordStudents(
        sheet.students,
        sheet.categories,
        query,
        filter,
      ),
    [filter, query, sheet.categories, sheet.students],
  );

  const updateDensity = (nextDensity: ClassRecordDensity) => {
    setDensity(nextDensity);
    try {
      window.localStorage.setItem(
        CLASS_RECORD_DENSITY_STORAGE_KEY,
        nextDensity,
      );
    } catch {
      // The display preference is optional; keep the in-memory choice.
    }
  };

  return (
    <div
      className={styles.gradeGrid}
      data-density={density}
      data-testid="class-record-grade-grid"
    >
      <div className={styles.gridToolbar}>
        <div className={styles.gridFields}>
          <label className={styles.searchField}>
            <span>Find a learner</span>
            <Input
              type="search"
              aria-label="Search learners"
              placeholder="Name or LRN"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className={styles.filterField}>
            <span>Show</span>
            <select
              aria-label="Filter learners"
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as ClassRecordFilter)
              }
            >
              <option value="all">All learners</option>
              <option value="needs_attention">Needs attention</option>
              <option value="missing">Missing scores</option>
              <option value="excused">Excused scores</option>
              <option value="eligibility">Eligibility issues</option>
              <option value="intervention">For intervention</option>
            </select>
          </label>
        </div>
        <div className={styles.gridSummary}>
          <span aria-live="polite">
            {students.length} of {sheet.students.length} learners
          </span>
          <button
            type="button"
            className={styles.densityButton}
            aria-label={
              density === "comfortable"
                ? "Use compact rows"
                : "Use comfortable rows"
            }
            aria-pressed={density === "compact"}
            onClick={() =>
              updateDensity(
                density === "comfortable" ? "compact" : "comfortable",
              )
            }
          >
            {density === "comfortable" ? "Compact rows" : "Comfortable rows"}
          </button>
        </div>
      </div>

      <div className={styles.legend} aria-label="Score status legend">
        <span data-status="missing">Missing</span>
        <span data-status="excused">Excused</span>
        <span data-status="unavailable">Unavailable</span>
        <span data-status="intervention">For intervention</span>
        <span data-status="verified">Verified</span>
      </div>

      <div
        className={styles.tableScroll}
        data-testid="class-record-grid-scroll"
      >
        <table className={styles.gradeTable}>
          <thead>
            <tr>
              <th rowSpan={2} className={styles.learnerHeader}>
                Learner / eligibility
              </th>
              {sheet.categories.map((category) => {
                const tone = getCategoryTone(category.name);
                return (
                  <th
                    key={category.id}
                    colSpan={category.items.length + 3}
                    className={styles.categoryHeader}
                    data-category-tone={tone}
                  >
                    {category.name === "Quarterly Assessment" &&
                    state.policy?.examComponents.length
                      ? "Examination"
                      : category.name}{" "}
                    · {category.weight}%
                  </th>
                );
              })}
              <th
                rowSpan={2}
                className={styles.computedHeader}
                data-category-tone="computed"
              >
                Initial grade
              </th>
              <th
                rowSpan={2}
                className={styles.finalGradeHeader}
                data-category-tone="computed"
              >
                {sheet.classRecord.status === "draft"
                  ? "Provisional"
                  : sheet.classRecord.revision
                    ? "Official"
                    : "Legacy unverified"}{" "}
                period grade
              </th>
            </tr>
            <tr>
              {sheet.categories.map((category) => {
                const tone = getCategoryTone(category.name);
                return (
                  <Fragment key={category.id}>
                    {category.items.map((item) => (
                      <th
                        key={item.id}
                        className={styles.itemHeader}
                        data-category-tone={tone}
                        data-active-column={
                          activeCell?.itemId === item.id ? "true" : undefined
                        }
                      >
                        <span>{item.title}</span>
                        {item.assessmentId && (
                          <button
                            type="button"
                            className={styles.syncButton}
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
                    <th className={styles.computedHeader}>Total</th>
                    <th className={styles.computedHeader}>PS</th>
                    <th className={styles.computedHeader}>WS</th>
                  </Fragment>
                );
              })}
            </tr>
            <tr className={styles.hpsRow}>
              <th className={styles.learnerHeader}>Highest possible score</th>
              {sheet.categories.map((category) => (
                <Fragment key={category.id}>
                  {category.items.map((item) => (
                    <td
                      key={item.id}
                      data-active-column={
                        activeCell?.itemId === item.id ? "true" : undefined
                      }
                    >
                      {state.editingHpsItemId === item.id ? (
                        <Input
                          aria-label={`HPS for ${item.title}`}
                          ref={state.hpsEditRef}
                          type="number"
                          min={0}
                          step="0.01"
                          value={state.hpsValue}
                          onChange={(event) =>
                            state.setHpsValue(event.target.value)
                          }
                          onKeyDown={state.handleHpsKeyDown}
                          onBlur={() => void state.handleHpsSave()}
                        />
                      ) : (
                        <button
                          type="button"
                          className={styles.hpsButton}
                          disabled={!canPrepare || Boolean(item.assessmentId)}
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
                  <td colSpan={3} className={styles.categoryWeight}>
                    {category.weight}% category weight
                  </td>
                </Fragment>
              ))}
              <td colSpan={2} className={styles.computedCell} />
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const band = getSurnameBand(student.lastName);
              const activeRow = activeCell?.studentId === student.studentId;
              const eligibility = eligibilityLabel(student.eligibility);
              const gradeStatus =
                student.remarks === "For Intervention"
                  ? "intervention"
                  : student.gradeProvenance === "legacy_unverified"
                    ? "legacy"
                    : student.provisional ||
                        sheet.classRecord.status === "draft"
                      ? "provisional"
                      : student.quarterlyGrade == null
                        ? "unavailable"
                        : "verified";
              return (
                <tr
                  key={student.studentId}
                  data-active-row={activeRow ? "true" : undefined}
                >
                  <th
                    scope="row"
                    className={styles.learnerCell}
                    data-surname-band={band}
                  >
                    <span className={styles.learnerCard} data-learner-card>
                      <span className={styles.surnameBadge} aria-hidden="true">
                        {getSurnameInitial(student.lastName)}
                      </span>
                      <span className={styles.learnerIdentity}>
                        <span>
                          <strong>{student.lastName}</strong>,{" "}
                          {student.firstName}
                        </span>
                        <small>
                          {eligibility}
                          {student.isRemoved
                            ? " · Removed from current class"
                            : ""}
                        </small>
                      </span>
                    </span>
                  </th>
                  {sheet.categories.map((category) => {
                    const values = student.categories.find(
                      (entry) => entry.categoryId === category.id,
                    );
                    return (
                      <Fragment key={category.id}>
                        {category.items.map((item, index) => {
                          const score = values?.scores[index] ?? null;
                          const bonusPoints = values?.bonusPoints?.[index] ?? 0;
                          const bonusReason =
                            values?.bonusReasons?.[index] ?? "";
                          const effectiveScore =
                            values?.effectiveScores?.[index] ?? score;
                          const status =
                            values?.scoreStatuses?.[index] ??
                            (score == null ? "missing" : "recorded");
                          const unavailable =
                            !item.hps || student.eligibility !== "eligible";
                          const display = unavailable
                            ? "Unavailable"
                            : status === "excused"
                              ? "Excused"
                              : bonusPoints > 0
                                ? `${effectiveScore ?? score} (+${bonusPoints})`
                                : (score ?? "Missing");
                          const visualStatus = unavailable
                            ? "unavailable"
                            : status;
                          const active =
                            activeCell?.studentId === student.studentId &&
                            activeCell.itemId === item.id;
                          return (
                            <td
                              key={item.id}
                              className={styles.scoreCell}
                              data-score-status={visualStatus}
                              data-active-column={
                                activeCell?.itemId === item.id
                                  ? "true"
                                  : undefined
                              }
                            >
                              <button
                                type="button"
                                className={styles.scoreButton}
                                data-score-status={visualStatus}
                                data-active={active ? "true" : undefined}
                                disabled={
                                  !canGrade ||
                                  student.eligibility !== "eligible" ||
                                  !item.hps ||
                                  state.spreadsheetStatus !== "ready"
                                }
                                aria-label={`${student.firstName} ${student.lastName}, ${item.title}: ${display}`}
                                onFocus={() =>
                                  setActiveCell({
                                    studentId: student.studentId,
                                    itemId: item.id,
                                  })
                                }
                                onClick={() =>
                                  onOpenCell({
                                    item,
                                    student,
                                    score,
                                    status,
                                    reason: values?.scoreReasons?.[index] ?? "",
                                    bonusPoints,
                                    bonusReason,
                                  })
                                }
                              >
                                {display}
                              </button>
                            </td>
                          );
                        })}
                        <td className={styles.computedCell}>
                          {number(values?.total)}
                        </td>
                        <td className={styles.computedCell}>
                          {number(values?.ps)}
                        </td>
                        <td className={styles.computedCell}>
                          {number(values?.ws)}
                        </td>
                      </Fragment>
                    );
                  })}
                  <td className={styles.computedCell}>
                    {number(student.initialGrade)}
                  </td>
                  <td
                    className={styles.finalGradeCell}
                    data-grade-status={gradeStatus}
                  >
                    <strong>
                      {student.quarterlyGrade ??
                        (student.remarks === "Not graded"
                          ? "Not graded"
                          : "Incomplete")}
                    </strong>
                    <small>
                      {student.gradeProvenance === "legacy_unverified"
                        ? "Legacy unverified · "
                        : student.provisional
                          ? "Provisional · "
                          : sheet.classRecord.status === "finalized" &&
                              Boolean(sheet.classRecord.revision)
                            ? "Finalized · "
                            : ""}
                      {student.remarks}
                    </small>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!students.length && (
          <p className={styles.emptyGrid}>
            {sheet.students.length
              ? "No learners match the current search and filter."
              : "No participants. Review and confirm an empty eligibility register only if this period had no eligible learners."}
          </p>
        )}
      </div>
    </div>
  );
}
