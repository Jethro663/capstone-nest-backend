import { useState } from "react";
import { Pressable, Switch, Text, TextInput, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useQuery } from "@tanstack/react-query";
import { classRecordApi } from "../../api/services/class-record";
import type { SaveAssessmentEditorInput } from "../../types/assessment";
import type { AcademicPeriod } from "../../types/academic-grading";
import { AssessmentRichTextEditor } from "../../components/ui/AssessmentRichTextEditor";
import { teacherTheme as theme } from "../../components/teacher/TeacherMobilePrimitives";

type Settings = SaveAssessmentEditorInput["settings"];
export function Field({
  label,
  value,
  onChange,
  numeric = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  numeric?: boolean;
  disabled?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: theme.text, fontWeight: "600" }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        editable={!disabled}
        keyboardType={numeric ? "numeric" : "default"}
        style={{
          minHeight: 48,
          padding: 12,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 8,
          color: theme.text,
          backgroundColor: "white",
        }}
      />
    </View>
  );
}
export function Choices({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value?: string | null;
  options: readonly { value: string; label: string }[];
  onChange(value: string): void;
  disabled?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: theme.text, fontWeight: "600" }}>{label}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === option.value, disabled }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={{
              minHeight: 44,
              padding: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: value === option.value ? theme.red : theme.border,
              backgroundColor: value === option.value ? theme.active : "white",
            }}
          >
            <Text style={{ color: theme.text }}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export function Toggle({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value?: boolean;
  onChange(value: boolean): void;
  disabled?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: 48,
        gap: 12,
      }}
    >
      <Text style={{ color: theme.text, flex: 1 }}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        disabled={disabled}
        value={Boolean(value)}
        onValueChange={onChange}
      />
    </View>
  );
}
export function AssessmentSettingsFields({
  value,
  onChange,
  periods,
  classId,
  ai = false,
  disabled = false,
}: {
  value: Settings;
  onChange(value: Settings): void;
  periods: AcademicPeriod[];
  classId?: string;
  ai?: boolean;
  disabled?: boolean;
}) {
  const [advanced, setAdvanced] = useState(false);
  const [dateMode, setDateMode] = useState<"date" | "time" | null>(null);
  const records = useQuery({
    queryKey: ["assessment-placement-options", classId],
    queryFn: () => classRecordApi.getByClass(classId!),
    enabled: Boolean(classId),
  });
  const record = records.data?.find(
    (item) => item.gradingPeriod === value.quarter,
  );
  const patch = (updates: Partial<Settings>) =>
    onChange({ ...value, ...updates });
  const number = (key: keyof Settings, label: string, optional = false) => (
    <Field
      label={label}
      value={value[key] == null ? "" : String(value[key])}
      numeric
      disabled={disabled}
      onChange={(text) =>
        patch({ [key]: text === "" && optional ? null : Number(text) })
      }
    />
  );
  const categoryOptions = [
    { value: "", label: "Automatic" },
    { value: "written_work", label: "Written work" },
    { value: "performance_task", label: "Performance task" },
    { value: "quarterly_assessment", label: "Exam" },
  ];
  return (
    <View style={{ gap: 18 }}>
      <Field
        label="Title"
        value={value.title ?? ""}
        onChange={(title) => patch({ title })}
        disabled={disabled}
      />
      <AssessmentRichTextEditor
        label="Description"
        value={value.description ?? ""}
        onChange={(description) => patch({ description })}
        disabled={disabled}
      />
      <Choices
        label="Assessment type"
        value={value.type}
        disabled={disabled}
        options={[
          { value: "quiz", label: "Quiz" },
          { value: "exam", label: "Exam" },
          { value: "assignment", label: "Assignment" },
          ...(!ai ? [{ value: "file_upload", label: "File upload" }] : []),
        ]}
        onChange={(type) => patch({ type: type as Settings["type"] })}
      />
      <Choices
        label="Grading period"
        value={value.quarter}
        disabled={disabled}
        options={periods.map((period) => ({
          value: period.key,
          label: period.label,
        }))}
        onChange={(quarter) =>
          patch({
            quarter: quarter as Settings["quarter"],
            classRecordItemId: null,
          })
        }
      />
      {!value.quarter && (
        <Text style={{ color: theme.red }}>
          Select a valid grading period before saving or generating.
        </Text>
      )}
      <Choices
        label="Class record category"
        value={value.classRecordCategory ?? ""}
        disabled={disabled}
        options={categoryOptions}
        onChange={(category) =>
          patch({
            classRecordCategory: category
              ? (category as Settings["classRecordCategory"])
              : null,
            classRecordItemId: null,
          })
        }
      />
      {records.isError && (
        <Pressable onPress={() => records.refetch()}>
          <Text style={{ color: theme.red }}>
            Class record placement could not load. Tap to retry.
          </Text>
        </Pressable>
      )}
      {record && (
        <Choices
          label="Class record placement"
          value={value.classRecordItemId ?? ""}
          disabled={disabled}
          options={[
            { value: "", label: "Automatic" },
            ...(record.categories ?? []).flatMap((category) =>
              (category.items ?? [])
                .filter(
                  (item) =>
                    !item.assessmentId || item.id === value.classRecordItemId,
                )
                .map((item) => ({
                  value: item.id,
                  label: `${category.name}: ${item.title}`,
                })),
            ),
          ]}
          onChange={(classRecordItemId) =>
            patch({ classRecordItemId: classRecordItemId || null })
          }
        />
      )}
      <View style={{ gap: 8 }}>
        <Text style={{ color: theme.text, fontWeight: "600" }}>Due date</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Pressable
            disabled={disabled}
            onPress={() => setDateMode("date")}
            style={{
              padding: 12,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: theme.text }}>
              {value.dueDate
                ? new Date(value.dueDate).toLocaleString()
                : "No due date · Set date"}
            </Text>
          </Pressable>
          {value.dueDate && (
            <>
              <Pressable
                disabled={disabled}
                onPress={() => setDateMode("time")}
                style={{ padding: 12 }}
              >
                <Text style={{ color: theme.red }}>Time</Text>
              </Pressable>
              <Pressable
                disabled={disabled}
                onPress={() => patch({ dueDate: null })}
                style={{ padding: 12 }}
              >
                <Text style={{ color: theme.red }}>Clear</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
      {dateMode && (
        <DateTimePicker
          value={value.dueDate ? new Date(value.dueDate) : new Date()}
          mode={dateMode}
          onChange={(event, date) => {
            setDateMode(null);
            if (event.type !== "dismissed" && date)
              patch({ dueDate: date.toISOString() });
          }}
        />
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: advanced }}
        onPress={() => setAdvanced(!advanced)}
        style={{
          paddingVertical: 14,
          borderTopWidth: 1,
          borderColor: theme.border,
        }}
      >
        <Text style={{ color: theme.red, fontWeight: "700" }}>
          {advanced
            ? "Hide advanced settings"
            : "Advanced settings · delivery and results"}
        </Text>
      </Pressable>
      {advanced && (
        <View style={{ gap: 16 }}>
          <Toggle
            label="Close when due"
            value={value.closeWhenDue}
            onChange={(closeWhenDue) => patch({ closeWhenDue })}
            disabled={disabled}
          />
          {number("maxAttempts", "Allowed attempts")}
          {number(
            "timeLimitMinutes",
            "Assessment timer (minutes, blank for none)",
            true,
          )}
          <Toggle
            label="Question timer"
            value={value.timedQuestionsEnabled}
            onChange={(timedQuestionsEnabled) =>
              patch({
                timedQuestionsEnabled,
                questionTimeLimitSeconds: timedQuestionsEnabled
                  ? (value.questionTimeLimitSeconds ?? 30)
                  : null,
              })
            }
            disabled={disabled}
          />
          {value.timedQuestionsEnabled &&
            number("questionTimeLimitSeconds", "Seconds per question")}
          <Toggle
            label="Randomize questions"
            value={value.randomizeQuestions}
            onChange={(randomizeQuestions) => patch({ randomizeQuestions })}
            disabled={disabled}
          />
          <Toggle
            label="Strict mode"
            value={value.strictMode}
            onChange={(strictMode) => patch({ strictMode })}
            disabled={disabled}
          />
          {number("passingScore", "Passing score (%)")}
          <Choices
            label="Feedback level"
            value={value.feedbackLevel}
            disabled={disabled}
            options={[
              { value: "immediate", label: "Immediate" },
              { value: "standard", label: "Standard" },
              { value: "detailed", label: "Detailed" },
            ]}
            onChange={(feedbackLevel) =>
              patch({
                feedbackLevel: feedbackLevel as Settings["feedbackLevel"],
              })
            }
          />
          {number("feedbackDelayHours", "Feedback delay (hours)")}
        </View>
      )}
      {!ai && value.type === "file_upload" && (
        <View style={{ gap: 16 }}>
          <AssessmentRichTextEditor
            label="File upload instructions"
            value={value.fileUploadInstructions ?? ""}
            onChange={(fileUploadInstructions) =>
              patch({ fileUploadInstructions })
            }
            disabled={disabled}
          />
          <Field
            label="Allowed extensions (comma separated)"
            value={(value.allowedUploadExtensions ?? []).join(", ")}
            onChange={(text) =>
              patch({
                allowedUploadExtensions: text
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
            disabled={disabled}
          />
          <Field
            label="Allowed MIME types (comma separated)"
            value={(value.allowedUploadMimeTypes ?? []).join(", ")}
            onChange={(text) =>
              patch({
                allowedUploadMimeTypes: text
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
            disabled={disabled}
          />
          <Field
            label="Maximum upload size (MB)"
            numeric
            value={String((value.maxUploadSizeBytes ?? 10485760) / 1048576)}
            onChange={(text) =>
              patch({ maxUploadSizeBytes: Number(text) * 1048576 })
            }
            disabled={disabled}
          />
          <Text style={{ color: theme.text, fontWeight: "700" }}>Rubric</Text>
          {(value.rubricCriteria ?? []).map((criterion, index) => (
            <View key={criterion.id} style={{ gap: 8 }}>
              <Field
                label={`Criterion ${index + 1}`}
                value={criterion.title}
                disabled={disabled}
                onChange={(title) =>
                  patch({
                    rubricCriteria: value.rubricCriteria!.map((item, i) =>
                      i === index ? { ...item, title } : item,
                    ),
                  })
                }
              />
              <Field
                label={`Criterion ${index + 1} description`}
                value={criterion.description ?? ""}
                disabled={disabled}
                onChange={(description) =>
                  patch({
                    rubricCriteria: value.rubricCriteria!.map((item, i) =>
                      i === index ? { ...item, description } : item,
                    ),
                  })
                }
              />
              <Field
                label={`Criterion ${index + 1} points`}
                numeric
                value={String(criterion.points)}
                disabled={disabled}
                onChange={(points) =>
                  patch({
                    rubricCriteria: value.rubricCriteria!.map((item, i) =>
                      i === index ? { ...item, points: Number(points) } : item,
                    ),
                  })
                }
              />
              <Pressable
                disabled={disabled}
                onPress={() =>
                  patch({
                    rubricCriteria: value.rubricCriteria!.filter(
                      (_, i) => i !== index,
                    ),
                  })
                }
                style={{ padding: 12 }}
              >
                <Text style={{ color: theme.red }}>Remove criterion</Text>
              </Pressable>
            </View>
          ))}
          <Pressable
            disabled={disabled}
            onPress={() =>
              patch({
                rubricCriteria: [
                  ...(value.rubricCriteria ?? []),
                  {
                    id: `criterion-${Date.now()}`,
                    title: "",
                    description: "",
                    points: 1,
                  },
                ],
              })
            }
            style={{ padding: 12 }}
          >
            <Text style={{ color: theme.red }}>Add rubric criterion</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
