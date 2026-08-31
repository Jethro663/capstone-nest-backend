"use client";

import { useEffect, useState } from "react";
import { academicStateService } from "@/services/academic-state-service";
import { classRecordService } from "@/services/class-record-service";
import { classService } from "@/services/class-service";
import { RichTextEditor } from "@/components/shared/rich-text/RichTextEditor";
import { RichTextRenderer } from "@/components/shared/rich-text/RichTextRenderer";
import { getApiErrorMessage } from "@/lib/api-error";
import type { AiAssessmentSettings } from "@/types/assessment";
import type { AcademicPeriod } from "@/types/academic-grading";

export const DEFAULT_AI_ASSESSMENT_SETTINGS: AiAssessmentSettings = {
  title: "AI Draft Assessment",
  description: "",
  type: "quiz",
  maxAttempts: 1,
  passingScore: 60,
  feedbackLevel: "standard",
  feedbackDelayHours: 24,
  closeWhenDue: true,
  randomizeQuestions: false,
  timedQuestionsEnabled: false,
  questionTimeLimitSeconds: null,
  timeLimitMinutes: null,
  strictMode: false,
};
export function AiAssessmentSettingsFields({
  classId,
  value,
  onChange,
  disabled = false,
  onReady,
}: {
  classId: string;
  value: AiAssessmentSettings;
  onChange(value: AiAssessmentSettings): void;
  disabled?: boolean;
  onReady?(ready: boolean): void;
}) {
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [context, setContext] = useState("Loading class policy…");
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [placements, setPlacements] = useState<
    Array<{ value: string; label: string; quarter: string }>
  >([]);
  const [defaultPeriod, setDefaultPeriod] =
    useState<AiAssessmentSettings["quarter"]>();
  useEffect(() => {
    let active = true;
    void Promise.all([
      classService.getById(classId),
      academicStateService.getCurrent(),
      classRecordService.getByClass(classId),
    ])
      .then(async ([cls, current, records]) => {
        const policy =
          cls.data.schoolYear === current.data.schoolYear
            ? current.data.policy
            : (await academicStateService.getPolicy(cls.data.schoolYear)).data;
        if (!active) return;
        setPeriods(policy.periods);
        setDefaultPeriod(cls.data.schoolYear === current.data.schoolYear ? current.data.quarter : policy.periods[0]?.key);
        setContext(`${cls.data.subjectName} · ${cls.data.schoolYear}`);
        setError("");
        setPlacements(
          records.data.flatMap((record) =>
            (record.categories ?? []).flatMap((category) =>
              (category.items ?? [])
                .filter(
                  (item) =>
                    !item.assessmentId || item.id === value.classRecordItemId,
                )
                .map((item) => ({
                  value: item.id,
                  label: `${category.name}: ${item.title}`,
                  quarter: record.gradingPeriod,
                })),
            ),
          ),
        );
        onReady?.(cls.data.isActive !== false && Number(cls.data.schoolYear.slice(0, 4)) >= Number(current.data.schoolYear.slice(0, 4)));
      })
      .catch((cause) => {
        if (active) {
          setError(
            getApiErrorMessage(cause, "Could not load academic settings"),
          );
          onReady?.(false);
        }
      });
    return () => {
      active = false;
    };
    // Settings changes must not reload the policy or reset teacher selections.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, reload]);
  useEffect(() => {
    if (
      !value.quarter &&
      defaultPeriod &&
      periods.some((period) => period.key === defaultPeriod)
    )
      onChange({ ...value, quarter: defaultPeriod });
  }, [defaultPeriod, periods, value, onChange]);
  const patch = (updates: Partial<AiAssessmentSettings>) =>
    onChange({ ...value, ...updates });
  const numeric = (
    key: keyof AiAssessmentSettings,
    label: string,
    min: number,
    max: number,
    optional = false,
  ) => (
    <label className="grid gap-1">
      {label}
      <input
        className="rounded-md border p-2"
        type="number"
        min={min}
        max={max}
        value={value[key] == null ? "" : String(value[key])}
        onChange={(event) =>
          patch({
            [key]:
              event.target.value === "" && optional
                ? null
                : Number(event.target.value),
          })
        }
      />
    </label>
  );
  const toggle = (key: keyof AiAssessmentSettings, label: string) => (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={Boolean(value[key])}
        onChange={(event) =>
          patch(
            key === "timedQuestionsEnabled"
              ? {
                  timedQuestionsEnabled: event.target.checked,
                  questionTimeLimitSeconds: event.target.checked
                    ? (value.questionTimeLimitSeconds ?? 30)
                    : null,
                }
              : { [key]: event.target.checked },
          )
        }
      />
      {label}
    </label>
  );
  return (
    <fieldset
      disabled={disabled}
      className="space-y-4 rounded-xl border bg-white p-4"
    >
      <legend className="px-2 font-semibold">Assessment settings</legend>
      <p className="text-sm text-muted-foreground">
        {context}. Settings can change during review without regenerating
        questions.
      </p>
      {error && (
        <div role="alert">
          {error}{" "}
          <button type="button" onClick={() => setReload(reload + 1)}>
            Retry
          </button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1">
          Assessment title
          <input
            className="rounded-md border p-2"
            value={value.title ?? ""}
            onChange={(event) => patch({ title: event.target.value })}
          />
        </label>
        <label className="grid gap-1">
          Assessment type
          <select
            className="rounded-md border p-2"
            value={value.type ?? "quiz"}
            onChange={(event) =>
              patch({
                type: event.target.value as AiAssessmentSettings["type"],
              })
            }
          >
            <option value="quiz">Quiz</option>
            <option value="exam">Exam</option>
            <option value="assignment">Assignment (questions)</option>
          </select>
        </label>
      </div>
      <div>
        <p>Description</p>
        {disabled ? (
          <RichTextRenderer html={value.description ?? ""} />
        ) : (
          <RichTextEditor
            value={value.description ?? ""}
            onChange={(description) => patch({ description })}
            minHeight={80}
          />
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1">
          Grading period
          <select
            className="rounded-md border p-2"
            value={value.quarter ?? ""}
            onChange={(event) =>
              patch({
                quarter: event.target.value as AiAssessmentSettings["quarter"],
                classRecordItemId: null,
              })
            }
          >
            <option value="">Select a valid period</option>
            {periods.map((period) => (
              <option key={period.key} value={period.key}>
                {period.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          Class record category
          <select
            className="rounded-md border p-2"
            value={value.classRecordCategory ?? ""}
            onChange={(event) =>
              patch({
                classRecordCategory:
                  (event.target
                    .value as AiAssessmentSettings["classRecordCategory"]) ||
                  null,
                classRecordItemId: null,
              })
            }
          >
            <option value="">Automatic</option>
            <option value="written_work">Written work</option>
            <option value="performance_task">Performance task</option>
            <option value="quarterly_assessment">Exam</option>
          </select>
        </label>
      </div>
      <label className="grid gap-1">
        Class record placement
        <select
          className="rounded-md border p-2"
          value={value.classRecordItemId ?? ""}
          onChange={(event) =>
            patch({ classRecordItemId: event.target.value || null })
          }
        >
          <option value="">Automatic</option>
          {placements
            .filter((item) => item.quarter === value.quarter)
            .map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
        </select>
      </label>
      <p className="text-sm">
        Resolved grading period:{" "}
        {periods.find((period) => period.key === value.quarter)?.label ??
          "Unassigned — select a valid period"}
      </p>
      <label className="grid gap-1">
        Due date
        <input
          className="rounded-md border p-2"
          type="datetime-local"
          value={value.dueDate ? localDateTime(value.dueDate) : ""}
          onChange={(event) =>
            patch({
              dueDate: event.target.value
                ? new Date(event.target.value).toISOString()
                : null,
            })
          }
        />
      </label>
      <details>
        <summary className="cursor-pointer py-2 font-semibold">
          Advanced: delivery and results
        </summary>
        <div className="grid gap-4 pt-3 sm:grid-cols-2">
          {toggle("closeWhenDue", "Close when due")}
          {numeric("maxAttempts", "Allowed attempts", 1, 100)}
          {numeric(
            "timeLimitMinutes",
            "Assessment timer (minutes, blank for none)",
            1,
            1440,
            true,
          )}
          {toggle("timedQuestionsEnabled", "Question timer")}
          {value.timedQuestionsEnabled &&
            numeric(
              "questionTimeLimitSeconds",
              "Seconds per question",
              5,
              3600,
            )}
          {toggle("randomizeQuestions", "Randomize questions")}
          {toggle("strictMode", "Strict mode")}
          {numeric("passingScore", "Passing score (%)", 1, 100)}
          <label className="grid gap-1">
            Feedback level
            <select
              className="rounded-md border p-2"
              value={value.feedbackLevel ?? "standard"}
              onChange={(event) =>
                patch({
                  feedbackLevel: event.target
                    .value as AiAssessmentSettings["feedbackLevel"],
                })
              }
            >
              <option value="immediate">Immediate</option>
              <option value="standard">Standard</option>
              <option value="detailed">Detailed</option>
            </select>
          </label>
          {numeric("feedbackDelayHours", "Feedback delay (hours)", 0, 8760)}
        </div>
      </details>
    </fieldset>
  );
}
function localDateTime(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
