"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AdminSectionCard } from "./AdminPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { academicGradingService as grading } from "@/services/academic-grading-service";
import { classRecordService } from "@/services/class-record-service";
import { getApiErrorMessage } from "@/lib/api-error";
import type {
  AcademicAudit,
  AcademicPeriodKey,
  AcademicReadiness,
} from "@/types/academic-grading";
import type { ClassRecord } from "@/types/class-record";

const actions = [
  ["preserve-legacy", "Archive exact legacy grades"],
  ["initialize-policy", "Initialize school-year policy"],
  ["classify-subject", "Classify subject weights"],
  ["repair-workbook-policy", "Repair workbook weights / exams"],
  ["exclude-historical-period", "Preserve incompatible historical record"],
  [
    "repair-assessment-period",
    "Assign an invalid / unassigned assessment period",
  ],
  ["exclude-historical-assessment", "Preserve incompatible assessment period"],
  ["retire-duplicate", "Retire a duplicate learning-area class"],
  ["repair-state", "Reconcile authoritative state"],
] as const;
type Action = (typeof actions)[number][0];
type Issue = AcademicAudit["issues"][number];
const selectClass = "h-10 w-full rounded-md border bg-white px-3 text-sm";

export function AcademicRecoveryPanel({
  schoolYear,
  classes = [],
  onChanged,
}: {
  schoolYear?: string;
  classes?: AcademicReadiness["classReadiness"];
  onChanged: () => Promise<void>;
}) {
  const [audit, setAudit] = useState<AcademicAudit | null>(null);
  const [action, setAction] = useState<Action>("preserve-legacy");
  const [id, setId] = useState("");
  const [year, setYear] = useState(schoolYear ?? "");
  const [canonical, setCanonical] = useState("");
  const [profile, setProfile] = useState<"academic" | "practical">("academic");
  const [period, setPeriod] = useState<AcademicPeriodKey>("Q1");
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [selectedStateId, setSelectedStateId] = useState("");
  const [workbook, setWorkbook] = useState<ClassRecord | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const refresh = useCallback(async () => {
    setError(null);
    try {
      const result = await grading.audit(schoolYear);
      setAudit(result.data);
      setYear(schoolYear ?? result.data.schoolYear ?? "");
      setSelectedStateId((previous) =>
        result.data.states.some((s) => s.id === previous)
          ? previous
          : (result.data.states[0]?.id ?? ""),
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Academic audit could not be loaded."));
    }
  }, [schoolYear]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    setWorkbook(null);
    setMapping({});
    if (action !== "repair-workbook-policy" || !id) return;
    let cancelled = false;
    void classRecordService
      .getById(id)
      .then((result) => {
        if (cancelled) return;
        setWorkbook(result.data);
        const items =
          result.data.categories?.find((c) => c.name === "Quarterly Assessment")
            ?.items ?? [];
        setMapping(
          Object.fromEntries(
            items.map((item) => [item.id, item.examComponent ?? ""]),
          ),
        );
      })
      .catch((err) => {
        if (!cancelled)
          setError(getApiErrorMessage(err, "Workbook could not be loaded."));
      });
    return () => {
      cancelled = true;
    };
  }, [action, id]);
  const choose = (issue: Issue) => {
    const next = actions.find(([key]) => key === issue.repairAction)?.[0];
    setAction(
      next ??
        (issue.code === "duplicate_logical_subject"
          ? "retire-duplicate"
          : "preserve-legacy"),
    );
    setId(issue.classRecordId ?? issue.assessmentId ?? issue.classId ?? "");
    setYear(issue.schoolYear ?? schoolYear ?? "");
    setReviewed(false);
    setExpanded(true);
    setReason("");
  };
  const selectedState = audit?.states.find((s) => s.id === selectedStateId);
  const policy = audit?.policies.find(
    (p) =>
      p.schoolYear ===
      (action === "repair-state" ? selectedState?.schoolYear : year),
  );
  const needsId = ![
    "preserve-legacy",
    "initialize-policy",
    "repair-state",
  ].includes(action);
  const perform = async () => {
    if (!reason.trim() || !reviewed) return;
    setBusy(true);
    setError(null);
    try {
      if (action === "preserve-legacy") await grading.preserveLegacy(reason);
      else if (action === "initialize-policy")
        await grading.initializePolicy(year, reason);
      else if (action === "classify-subject")
        await grading.classifySubject(id, profile, reason);
      else if (action === "exclude-historical-period")
        await grading.excludePeriod(id, reason);
      else if (action === "exclude-historical-assessment")
        await grading.excludeAssessmentPeriod(id, reason);
      else if (action === "retire-duplicate")
        await grading.retireDuplicate(id, canonical, reason);
      else if (action === "repair-assessment-period")
        await grading.repairAssessmentPeriod(id, period, reason);
      else if (action === "repair-workbook-policy")
        await grading.repairWorkbook(
          id,
          reason,
          Object.entries(mapping)
            .filter(([, component]) => component)
            .map(([itemId, component]) => ({
              itemId,
              component: component as "ST1" | "ST2" | "TE",
            })),
        );
      else if (action === "repair-state" && audit && selectedState)
        await grading.repairState({
          selectedStateId,
          expectedStateIds: audit.states.map((s) => s.id),
          expectedVersion: selectedState.version,
          quarter: period,
          currentPassword: password,
          reason,
        });
      else throw new Error("Select the state to preserve.");
      setPassword("");
      setReason("");
      setReviewed(false);
      toast.success("Audited repair completed. Review the refreshed blockers.");
      await onChanged();
      await refresh();
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "Academic repair failed. No repair was committed.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <AdminSectionCard
      title="Academic audit and recovery"
      description="The audit is read-only. Repairs require an explicit choice and reason; old grade evidence is retained."
      action={
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void refresh()}
        >
          Refresh audit
        </Button>
      }
    >
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {audit && (
        <div className="space-y-3">
          <p className="text-sm">
            {audit.counts.blockers} blockers · {audit.counts.review} policy
            reviews · {audit.counts.unarchivedLegacyGrades} legacy grades
            awaiting archival
          </p>
          <div className="max-h-80 overflow-auto rounded-md border">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="p-3">Finding</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {audit.issues.map((issue, index) => (
                  <tr key={`${issue.code}-${index}`} className="border-t">
                    <td className="p-3">
                      <span className="font-medium">{issue.severity}: </span>
                      {issue.message}
                      {issue.classId && (
                        <span className="block text-xs text-slate-500">
                          {classes.find((c) => c.classId === issue.classId)
                            ?.subjectName ?? issue.classId}
                        </span>
                      )}
                    </td>
                    <td className="space-y-2 p-3">
                      {issue.classId && (
                        <Link
                          className="block underline"
                          href={`/dashboard/admin/academic-records/${issue.classId}`}
                        >
                          Review record
                        </Link>
                      )}
                      {issue.severity !== "acknowledged" &&
                        (actions.some(([key]) => key === issue.repairAction) ||
                          issue.code === "duplicate_logical_subject") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => choose(issue)}
                          >
                            Prepare repair
                          </Button>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!audit.issues.length && (
              <p className="p-3 text-sm">
                No audit findings. Year-end readiness still verifies the
                complete academic matrix.
              </p>
            )}
          </div>
        </div>
      )}
      <details
        className="mt-4 rounded-md border p-4"
        open={expanded}
        onToggle={(e) => setExpanded(e.currentTarget.open)}
      >
        <summary className="cursor-pointer font-medium">
          Explicit recovery operation
        </summary>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void perform();
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="repair-action">Repair action</Label>
              <select
                id="repair-action"
                className={selectClass}
                value={action}
                onChange={(e) => {
                  setAction(e.target.value as Action);
                  setReviewed(false);
                }}
              >
                {actions.map(([key, title]) => (
                  <option key={key} value={key}>
                    {title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="repair-year">School year</Label>
              <Input
                id="repair-year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2026-2027"
              />
            </div>
            {needsId && (
              <div className="space-y-1">
                <Label htmlFor="repair-id">
                  {action.includes("workbook") ||
                  action === "exclude-historical-period"
                    ? "Class record ID"
                    : action.includes("assessment")
                      ? "Assessment ID"
                      : "Class ID"}
                </Label>
                <Input
                  id="repair-id"
                  required
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                />
              </div>
            )}
            {action === "retire-duplicate" && (
              <div className="space-y-1">
                <Label htmlFor="canonical-class">Canonical class to keep</Label>
                <select
                  id="canonical-class"
                  className={selectClass}
                  value={canonical}
                  onChange={(e) => setCanonical(e.target.value)}
                  required
                >
                  <option value="">Choose class</option>
                  {classes
                    .filter((c) => c.classId !== id)
                    .map((c) => (
                      <option key={c.classId} value={c.classId}>
                        {c.subjectName} · {c.sectionId} · {c.classId}
                      </option>
                    ))}
                </select>
              </div>
            )}
            {action === "classify-subject" && (
              <div className="space-y-1">
                <Label htmlFor="subject-profile">Subject profile</Label>
                <select
                  id="subject-profile"
                  className={selectClass}
                  value={profile}
                  onChange={(e) => setProfile(e.target.value as typeof profile)}
                >
                  <option value="academic">Academic: 20 / 50 / 30</option>
                  <option value="practical">Practical: 20 / 60 / 20</option>
                </select>
              </div>
            )}
            {action === "repair-state" && (
              <div className="space-y-1">
                <Label htmlFor="state-to-keep">
                  Authoritative state to keep
                </Label>
                <select
                  id="state-to-keep"
                  className={selectClass}
                  value={selectedStateId}
                  onChange={(e) => setSelectedStateId(e.target.value)}
                >
                  {audit?.states.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.schoolYear} · {s.quarter} · version {s.version} ·{" "}
                      {s.id}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {["repair-state", "repair-assessment-period"].includes(action) && (
              <div className="space-y-1">
                <Label htmlFor="repair-period">Verified period</Label>
                <select
                  id="repair-period"
                  className={selectClass}
                  value={period}
                  onChange={(e) =>
                    setPeriod(e.target.value as AcademicPeriodKey)
                  }
                >
                  {policy?.periods.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {action === "repair-state" && (
              <div className="space-y-1">
                <Label htmlFor="repair-password">
                  Admin password for state repair
                </Label>
                <Input
                  id="repair-password"
                  required
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}
          </div>
          {action === "repair-workbook-policy" && (
            <div className="space-y-2">
              <p className="text-sm">
                Reopen the record first. Assign every examination containing
                scores or assessment evidence to ST1, ST2 or TE. Scores are
                unchanged; absent components receive empty slots.
              </p>
              {workbook?.categories
                ?.find((c) => c.name === "Quarterly Assessment")
                ?.items?.map((item) => (
                  <label
                    key={item.id}
                    className="flex flex-wrap items-center gap-3 text-sm"
                  >
                    {item.title} (HPS {item.maxScore})
                    <select
                      className={selectClass + " max-w-xs"}
                      value={mapping[item.id] ?? ""}
                      onChange={(e) =>
                        setMapping((previous) => ({
                          ...previous,
                          [item.id]: e.target.value,
                        }))
                      }
                    >
                      <option value="">Unassigned empty slot</option>
                      {["ST1", "ST2", "TE"].map((key) => (
                        <option key={key}>{key}</option>
                      ))}
                    </select>
                  </label>
                ))}
              {!workbook && (
                <p className="text-sm">
                  Enter a class record ID to load its examination items.
                </p>
              )}
            </div>
          )}
          {action.includes("exclude") && (
            <p className="text-sm text-red-700">
              This preserves the incompatible period outside the current policy
              for the entire class. Required policy periods cannot be excluded,
              and historical scores are never moved into another term.
            </p>
          )}
          {action === "retire-duplicate" && (
            <p className="text-sm">
              Each affected learner must already be enrolled in the canonical
              class. The duplicate is archived, its memberships are completed,
              and its historical sources remain available for explicit annual
              source selection.
            </p>
          )}
          <div className="space-y-1">
            <Label htmlFor="repair-reason">Evidence and repair reason</Label>
            <Input
              id="repair-reason"
              required
              minLength={5}
              maxLength={2000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            I reviewed the selected records and the effect of this repair.
          </label>
          <Button
            type="submit"
            disabled={
              busy ||
              !reviewed ||
              reason.trim().length < 5 ||
              (needsId && !id) ||
              (action === "repair-workbook-policy" && !workbook) ||
              (["repair-state", "repair-assessment-period"].includes(action) &&
                !policy)
            }
          >
            Apply audited repair
          </Button>
        </form>
      </details>
    </AdminSectionCard>
  );
}
