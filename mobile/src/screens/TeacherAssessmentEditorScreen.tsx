import { useEffect, useMemo, useRef, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Modal, Pressable, Text, TextInput, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  queryKeys,
  useAssessmentDetail,
  useTeacherClasses,
  useTeacherDeleteAssessmentMutation,
} from "../api/hooks";
import { toAppError } from "../api/http";
import { assessmentsApi } from "../api/services/assessments";
import type { RootStackParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import type {
  Assessment,
  AssessmentQuestion,
  AssessmentType,
  CreateAssessmentDto,
  CreateQuestionDto,
  QuestionType,
  QuestionOptionInput,
  UpdateAssessmentDto,
  UpdateQuestionDto,
} from "../types/assessment";
import {
  TeacherActionButton,
  TeacherChip,
  TeacherEmpty,
  TeacherPanel,
  TeacherScreen,
  TeacherStats,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";

type Props = NativeStackScreenProps<RootStackParamList, "TeacherAssessmentEditor">;

type SupportedQuestionType =
  | "multiple_choice"
  | "multiple_select"
  | "true_false"
  | "short_answer"
  | "fill_blank"
  | "dropdown"
  | "matching"
  | "essay";

type SupportedAssessmentType = "quiz" | "exam" | "assignment" | "file_upload";

type DraftOption = {
  localId: string;
  text: string;
  isCorrect: boolean;
};

type DraftQuestion = {
  localId: string;
  id?: string;
  type: SupportedQuestionType;
  content: string;
  points: string;
  explanation: string;
  isRequired: boolean;
  options: DraftOption[];
};

const ASSESSMENT_TYPE_OPTIONS: Array<{ value: SupportedAssessmentType; label: string }> = [
  { value: "quiz", label: "Quiz" },
  { value: "exam", label: "Exam" },
  { value: "assignment", label: "Assignment" },
  { value: "file_upload", label: "File Upload" },
];

const QUESTION_TYPE_OPTIONS: Array<{ value: SupportedQuestionType; label: string }> = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "multiple_select", label: "Multiple Select" },
  { value: "true_false", label: "True/False" },
  { value: "short_answer", label: "Short Answer" },
  { value: "essay", label: "Essay" },
  { value: "matching", label: "Matching" },
  { value: "fill_blank", label: "Fill in Blank" },
  { value: "dropdown", label: "Dropdown" },
];

const DEFAULT_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/rtf",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/vnd.oasis.opendocument.spreadsheet",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/zip",
  "application/x-zip-compressed",
];

const DEFAULT_UPLOAD_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "txt",
  "rtf",
  "odt",
  "ppt",
  "pptx",
  "odp",
  "xls",
  "xlsx",
  "csv",
  "ods",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "zip",
];

function createLocalId() {
  return `draft-${Math.random().toString(36).slice(2, 10)}`;
}

function isOptionQuestion(type: SupportedQuestionType) {
  return (
    type === "multiple_choice" ||
    type === "multiple_select" ||
    type === "true_false" ||
    type === "dropdown" ||
    type === "matching"
  );
}

function createDefaultOptions(type: SupportedQuestionType): DraftOption[] {
  if (type === "true_false") {
    return [
      { localId: createLocalId(), text: "True", isCorrect: true },
      { localId: createLocalId(), text: "False", isCorrect: false },
    ];
  }

  if (type === "fill_blank") {
    return [{ localId: createLocalId(), text: "", isCorrect: true }];
  }

  if (type === "matching") {
    return [
      { localId: createLocalId(), text: "Premise 1 -> Option A", isCorrect: true },
      { localId: createLocalId(), text: "Premise 2 -> Option B", isCorrect: true },
    ];
  }

  if (isOptionQuestion(type)) {
    return [
      { localId: createLocalId(), text: "", isCorrect: true },
      { localId: createLocalId(), text: "", isCorrect: false },
    ];
  }

  return [];
}

function normalizeQuestionType(value?: string | null): SupportedQuestionType {
  if (!value) return "multiple_choice";
  if (
    value === "multiple_choice" ||
    value === "multiple_select" ||
    value === "true_false" ||
    value === "short_answer" ||
    value === "fill_blank" ||
    value === "dropdown" ||
    value === "matching" ||
    value === "essay"
  ) {
    return value;
  }
  return "multiple_choice";
}

function normalizeAssessmentType(value?: string | null): SupportedAssessmentType {
  if (value === "quiz" || value === "exam" || value === "assignment" || value === "file_upload") {
    return value;
  }
  return "quiz";
}

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function parseDateInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const normalized = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Use due date format YYYY-MM-DD HH:mm");
  }
  if (date.getTime() < Date.now()) {
    throw new Error("Assessment due date cannot be earlier than the present date and time.");
  }
  return date.toISOString();
}

function clampInt(raw: string, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(raw.replace(/\D/g, ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function mapQuestionFromAssessment(question: AssessmentQuestion): DraftQuestion {
  const type = normalizeQuestionType(question.type);
  const options = (question.options ?? []).map((entry) => ({
    localId: createLocalId(),
    text: entry.text ?? "",
    isCorrect: Boolean(entry.isCorrect),
  }));

  return {
    localId: createLocalId(),
    id: question.id,
    type,
    content: question.content ?? "",
    points: `${question.points ?? 1}`,
    explanation: question.explanation ?? "",
    isRequired: question.isRequired ?? true,
    options: options.length > 0 ? options : createDefaultOptions(type),
  };
}

function ensureRichText(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "<p></p>";
  const escaped = trimmed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
  return `<p>${escaped}</p>`;
}

function formatAssessmentTypeLabel(value: SupportedAssessmentType) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function DatePickerModal({
  visible,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  value: string;
  onSelect: (dateStr: string) => void;
  onClose: () => void;
}) {
  const initialDate = useMemo(() => {
    if (!value) return new Date();
    const parsed = new Date(value.includes("T") ? value : value.replace(" ", "T"));
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [value]);

  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [selectedDay, setSelectedDay] = useState(initialDate.getDate());
  const [selectedHour, setSelectedHour] = useState(`${initialDate.getHours()}`.padStart(2, "0"));
  const [selectedMinute, setSelectedMinute] = useState(`${initialDate.getMinutes()}`.padStart(2, "0"));

  useEffect(() => {
    if (visible) {
      const d = !value ? new Date() : new Date(value.includes("T") ? value : value.replace(" ", "T"));
      const valid = !Number.isNaN(d.getTime()) ? d : new Date();
      setCurrentMonth(valid.getMonth());
      setCurrentYear(valid.getFullYear());
      setSelectedDay(valid.getDate());
      setSelectedHour(`${valid.getHours()}`.padStart(2, "0"));
      setSelectedMinute(`${valid.getMinutes()}`.padStart(2, "0"));
    }
  }, [visible, value]);

  const daysInMonth = useMemo(() => new Date(currentYear, currentMonth + 1, 0).getDate(), [currentYear, currentMonth]);
  const startDayOfWeek = useMemo(() => new Date(currentYear, currentMonth, 1).getDay(), [currentYear, currentMonth]);
  const monthName = useMemo(() => new Date(currentYear, currentMonth, 1).toLocaleDateString("en-US", { month: "long" }), [currentYear, currentMonth]);

  const handleApply = () => {
    const y = currentYear;
    const m = `${currentMonth + 1}`.padStart(2, "0");
    const d = `${selectedDay}`.padStart(2, "0");
    const formatted = `${y}-${m}-${d} ${selectedHour}:${selectedMinute}`;
    const parsedDate = new Date(`${y}-${m}-${d}T${selectedHour}:${selectedMinute}`);
    if (!Number.isNaN(parsedDate.getTime()) && parsedDate.getTime() < Date.now()) {
      Alert.alert(
        "Invalid Due Date",
        "Assessment due date cannot be earlier than the present date and time.",
      );
      return;
    }
    onSelect(formatted);
    onClose();
  };

  const handleQuickPreset = (daysOffset: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysOffset);
    setCurrentYear(target.getFullYear());
    setCurrentMonth(target.getMonth());
    setSelectedDay(target.getDate());
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 }}>
        <View style={{ width: "100%", maxWidth: 380, backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 18, gap: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: theme.text }}>Select Due Date</Text>
            <Pressable onPress={onClose} style={{ padding: 4 }}>
              <MaterialCommunityIcons name="close" size={20} color={theme.muted} />
            </Pressable>
          </View>

          {/* Quick Presets */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            <TeacherChip label="Today" active={false} onPress={() => handleQuickPreset(0)} />
            <TeacherChip label="Tomorrow" active={false} onPress={() => handleQuickPreset(1)} />
            <TeacherChip label="+7 Days" active={false} onPress={() => handleQuickPreset(7)} />
            <TeacherChip label="+30 Days" active={false} onPress={() => handleQuickPreset(30)} />
            <TeacherChip label="Clear" active={false} onPress={() => { onSelect(""); onClose(); }} />
          </View>

          {/* Month Header */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: theme.active, padding: 10, borderRadius: 10 }}>
            <Pressable onPress={() => {
              if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
              else { setCurrentMonth((m) => m - 1); }
            }}>
              <MaterialCommunityIcons name="chevron-left" size={22} color={theme.text} />
            </Pressable>
            <Text style={{ fontSize: 14, fontWeight: "700", color: theme.text }}>
              {monthName} {currentYear}
            </Text>
            <Pressable onPress={() => {
              if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
              else { setCurrentMonth((m) => m + 1); }
            }}>
              <MaterialCommunityIcons name="chevron-right" size={22} color={theme.text} />
            </Pressable>
          </View>

          {/* Day Grid Header */}
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
              <Text key={idx} style={{ width: 36, textAlign: "center", fontSize: 11, fontWeight: "700", color: theme.muted }}>
                {day}
              </Text>
            ))}
          </View>

          {/* Calendar Days */}
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {Array.from({ length: startDayOfWeek }).map((_, idx) => (
              <View key={`blank-${idx}`} style={{ width: "14.28%", height: 36 }} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const isSelected = dayNum === selectedDay;
              return (
                <Pressable
                  key={`day-${dayNum}`}
                  onPress={() => setSelectedDay(dayNum)}
                  style={{
                    width: "14.28%",
                    height: 36,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: isSelected ? theme.blue : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: isSelected ? "800" : "600", color: isSelected ? "#ffffff" : theme.text }}>
                      {dayNum}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Time Selector */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.border }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: theme.text }}>Time (HH:mm)</Text>
            <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
              <TextInput
                value={selectedHour}
                onChangeText={(val) => {
                  const cleaned = val.replace(/[^0-9]/g, "");
                  if (cleaned.length <= 2) {
                    const num = parseInt(cleaned || "0", 10);
                    setSelectedHour(`${Math.min(23, num)}`.padStart(2, "0"));
                  }
                }}
                keyboardType="number-pad"
                maxLength={2}
                style={{ width: 44, height: 36, borderRadius: 8, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.active, color: theme.text, textAlign: "center", fontSize: 13, fontWeight: "700" }}
              />
              <Text style={{ fontSize: 14, fontWeight: "800", color: theme.text }}>:</Text>
              <TextInput
                value={selectedMinute}
                onChangeText={(val) => {
                  const cleaned = val.replace(/[^0-9]/g, "");
                  if (cleaned.length <= 2) {
                    const num = parseInt(cleaned || "0", 10);
                    setSelectedMinute(`${Math.min(59, num)}`.padStart(2, "0"));
                  }
                }}
                keyboardType="number-pad"
                maxLength={2}
                style={{ width: 44, height: 36, borderRadius: 8, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.active, color: theme.text, textAlign: "center", fontSize: 13, fontWeight: "700" }}
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
            <TeacherActionButton label="Cancel" tone="neutral" onPress={onClose} />
            <TeacherActionButton label="Apply Date" tone="blue" onPress={handleApply} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function TimeLimitDropdownModal({
  visible,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  value: string;
  onSelect: (val: string) => void;
  onClose: () => void;
}) {
  const [customMode, setCustomMode] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(value);

  const OPTIONS = [
    { label: "No time limit", value: "" },
    { label: "15 minutes", value: "15" },
    { label: "30 minutes", value: "30" },
    { label: "45 minutes", value: "45" },
    { label: "60 minutes (1 hour)", value: "60" },
    { label: "90 minutes (1.5 hours)", value: "90" },
    { label: "120 minutes (2 hours)", value: "120" },
  ];

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 }}>
        <View style={{ width: "100%", maxWidth: 360, backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 18, gap: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: theme.text }}>Select Time Limit</Text>
            <Pressable onPress={onClose} style={{ padding: 4 }}>
              <MaterialCommunityIcons name="close" size={20} color={theme.muted} />
            </Pressable>
          </View>

          {!customMode ? (
            <View style={{ gap: 6 }}>
              {OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value || "none"}
                  onPress={() => {
                    onSelect(opt.value);
                    onClose();
                  }}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderRadius: 10,
                    backgroundColor: value === opt.value ? theme.blueSoft : theme.active,
                    borderWidth: 1,
                    borderColor: value === opt.value ? theme.blue : theme.border,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: value === opt.value ? theme.blue : theme.text }}>
                    {opt.label}
                  </Text>
                  {value === opt.value ? (
                    <MaterialCommunityIcons name="check" size={16} color={theme.blue} />
                  ) : null}
                </Pressable>
              ))}

              <Pressable
                onPress={() => setCustomMode(true)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: theme.active,
                  borderWidth: 1,
                  borderColor: theme.border,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text }}>
                  Custom minutes...
                </Text>
                <MaterialCommunityIcons name="pencil-outline" size={16} color={theme.muted} />
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: theme.muted }}>
                Enter custom duration in minutes (numbers only):
              </Text>
              <TextInput
                value={customMinutes}
                onChangeText={(val) => setCustomMinutes(val.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                placeholder="e.g. 25"
                placeholderTextColor={theme.dim}
                style={{
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.active,
                  color: theme.text,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 14,
                  fontWeight: "700",
                }}
              />
              <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10 }}>
                <TeacherActionButton label="Back" tone="neutral" onPress={() => setCustomMode(false)} />
                <TeacherActionButton
                  label="Set Minutes"
                  tone="blue"
                  onPress={() => {
                    onSelect(customMinutes.replace(/[^0-9]/g, ""));
                    onClose();
                  }}
                />
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function SaveConfirmModal({
  visible,
  title,
  className,
  type,
  questionCount,
  dueDate,
  passScore,
  maxAttempts,
  timeLimit,
  saving,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  className: string;
  type: string;
  questionCount: number;
  dueDate: string;
  passScore: string;
  maxAttempts: string;
  timeLimit: string;
  saving: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", alignItems: "center", padding: 20 }}>
        <View style={{ width: "100%", maxWidth: 380, backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 20, gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.greenSoft, alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons name="content-save-check-outline" size={22} color={theme.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: theme.text }}>Confirm Save Assessment</Text>
              <Text style={{ fontSize: 11, color: theme.muted }}>Review changes before saving</Text>
            </View>
          </View>

          <View style={{ backgroundColor: theme.active, borderRadius: 12, padding: 12, gap: 8, borderWidth: 1, borderColor: theme.border }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 12, color: theme.muted }}>Title:</Text>
              <Text style={{ fontSize: 12, fontWeight: "800", color: theme.text, flex: 1, textAlign: "right" }} numberOfLines={1}>
                {title || "Untitled Assessment"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 12, color: theme.muted }}>Class:</Text>
              <Text style={{ fontSize: 12, fontWeight: "700", color: theme.text }}>{className || "Selected Class"}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 12, color: theme.muted }}>Type:</Text>
              <Text style={{ fontSize: 12, fontWeight: "700", color: theme.text, textTransform: "capitalize" }}>{type.replace("_", " ")}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 12, color: theme.muted }}>Questions:</Text>
              <Text style={{ fontSize: 12, fontWeight: "800", color: theme.blue }}>{questionCount} question(s)</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 12, color: theme.muted }}>Due Date:</Text>
              <Text style={{ fontSize: 12, fontWeight: "700", color: theme.text }}>{dueDate || "No due date"}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 12, color: theme.muted }}>Pass % / Max Attempts:</Text>
              <Text style={{ fontSize: 12, fontWeight: "700", color: theme.text }}>{passScore}% / {maxAttempts} attempt(s)</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 12, color: theme.muted }}>Time Limit:</Text>
              <Text style={{ fontSize: 12, fontWeight: "700", color: theme.text }}>{timeLimit ? `${timeLimit} mins` : "No limit"}</Text>
            </View>
          </View>

          <Text style={{ fontSize: 11, color: theme.muted, textAlign: "center" }}>
            Saving will sync changes immediately across Web & Mobile.
          </Text>

          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
            <TeacherActionButton label="Cancel" tone="neutral" disabled={saving} onPress={onClose} />
            <TeacherActionButton
              label={saving ? "Saving..." : "Confirm & Save"}
              icon="check"
              tone="green"
              disabled={saving}
              onPress={onConfirm}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DeleteConfirmModal({
  visible,
  title,
  deleting,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  deleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", alignItems: "center", padding: 20 }}>
        <View style={{ width: "100%", maxWidth: 380, backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 20, gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.redSoft, alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons name="trash-can-outline" size={22} color={theme.red} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: theme.text }}>Delete Assessment?</Text>
              <Text style={{ fontSize: 11, color: theme.muted }}>This action cannot be undone</Text>
            </View>
          </View>

          <Text style={{ fontSize: 13, color: theme.text, lineHeight: 18 }}>
            Are you sure you want to delete <Text style={{ fontWeight: "800" }}>"{title || "this assessment"}"</Text>? All student responses, attempts, and grades linked to this assessment will be permanently removed.
          </Text>

          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
            <TeacherActionButton label="Cancel" tone="neutral" disabled={deleting} onPress={onClose} />
            <TeacherActionButton
              label={deleting ? "Deleting..." : "Delete Assessment"}
              icon="trash-can-outline"
              tone="red"
              disabled={deleting}
              onPress={onConfirm}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function TeacherAssessmentEditorScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const teacherId = user?.userId || user?.id;
  const queryClient = useQueryClient();
  const initialAssessmentId = route.params?.assessmentId;
  const initialClassId = route.params?.classId;

  const classesQuery = useTeacherClasses(teacherId);
  const [assessmentId, setAssessmentId] = useState<string | undefined>(initialAssessmentId);
  const assessmentQuery = useAssessmentDetail(assessmentId);
  const hydratedAssessmentIdRef = useRef<string | null>(null);

  const [selectedClassId, setSelectedClassId] = useState(initialClassId ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assessmentType, setAssessmentType] = useState<SupportedAssessmentType>("quiz");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [dueDateInput, setDueDateInput] = useState("");
  const [passingScoreInput, setPassingScoreInput] = useState("60");
  const [maxAttemptsInput, setMaxAttemptsInput] = useState("1");
  const [timeLimitInput, setTimeLimitInput] = useState("");
  const [fileUploadInstructions, setFileUploadInstructions] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [removedQuestionIds, setRemovedQuestionIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [showTimeLimitModal, setShowTimeLimitModal] = useState(false);
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const deleteMutation = useTeacherDeleteAssessmentMutation(assessmentId);

  const handleDeleteAssessmentConfirm = async () => {
    if (!assessmentId) return;
    try {
      await deleteMutation.mutateAsync();
      setShowDeleteConfirmModal(false);
      Alert.alert("Assessment Deleted", "The assessment has been deleted successfully.", [
        {
          text: "OK",
          onPress: () => {
            if (selectedClassId) {
              navigation.navigate("TeacherClassDetail", {
                classId: selectedClassId,
                initialTab: "assessments",
              });
            } else {
              navigation.goBack();
            }
          },
        },
      ]);
    } catch (error) {
      Alert.alert("Unable to delete assessment", toAppError(error).message);
    }
  };

  useEffect(() => {
    if (!selectedClassId && classesQuery.data?.[0]?.id) {
      setSelectedClassId(classesQuery.data[0].id);
    }
  }, [classesQuery.data, selectedClassId]);

  useEffect(() => {
    if (!assessmentId) return;
    const assessment = assessmentQuery.data;
    if (!assessment) return;
    if (hydratedAssessmentIdRef.current === assessment.id) return;

    hydratedAssessmentIdRef.current = assessment.id;
    setSelectedClassId(assessment.classId || initialClassId || "");
    setTitle(assessment.title ?? "");
    setDescription(assessment.description ?? "");
    setAssessmentType(normalizeAssessmentType(assessment.type));
    setStatus(assessment.isPublished ? "published" : "draft");
    setDueDateInput(toDateInputValue(assessment.dueDate));
    setPassingScoreInput(`${assessment.passingScore ?? 60}`);
    setMaxAttemptsInput(`${assessment.maxAttempts ?? 1}`);
    setTimeLimitInput(assessment.timeLimitMinutes ? `${assessment.timeLimitMinutes}` : "");
    setFileUploadInstructions(assessment.fileUploadInstructions ?? "");
    setQuestions(
      (assessment.questions ?? [])
        .slice()
        .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
        .map(mapQuestionFromAssessment),
    );
    setRemovedQuestionIds([]);
  }, [assessmentQuery.data, assessmentId, initialClassId]);

  const classOptions = classesQuery.data ?? [];
  const activeClass = classOptions.find((entry) => entry.id === selectedClassId);

  const totalPoints = useMemo(
    () =>
      questions.reduce((total, question) => total + clampInt(question.points, 1, 1, 999), 0),
    [questions],
  );

  const sortedQuestions = useMemo(() => questions, [questions]);

  const patchQuestion = (localId: string, updater: (current: DraftQuestion) => DraftQuestion) => {
    setQuestions((current) =>
      current.map((entry) => (entry.localId === localId ? updater(entry) : entry)),
    );
  };

  const addQuestion = (type: SupportedQuestionType) => {
    setQuestions((current) => [
      ...current,
      {
        localId: createLocalId(),
        type,
        content: "",
        points: "1",
        explanation: "",
        isRequired: true,
        options: createDefaultOptions(type),
      },
    ]);
  };

  const removeQuestion = (localId: string) => {
    setQuestions((current) => {
      const target = current.find((entry) => entry.localId === localId);
      if (target?.id) {
        setRemovedQuestionIds((existing) => (existing.includes(target.id!) ? existing : [...existing, target.id!]));
      }
      return current.filter((entry) => entry.localId !== localId);
    });
  };

  const moveQuestion = (localId: string, direction: -1 | 1) => {
    setQuestions((current) => {
      const currentIndex = current.findIndex((entry) => entry.localId === localId);
      if (currentIndex < 0) return current;
      const targetIndex = currentIndex + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const next = current.slice();
      const [item] = next.splice(currentIndex, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
  };

  const validateQuestionPayload = () => {
    if (assessmentType === "file_upload") {
      if (!fileUploadInstructions.trim()) {
        throw new Error("File upload instructions are required for file upload assessments.");
      }
      return;
    }
    if (sortedQuestions.length === 0) {
      throw new Error("No questions entered. Please add at least 1 question to the assessment before saving.");
    }

    sortedQuestions.forEach((question, index) => {
      if (!question.content.trim()) {
        throw new Error(`Question ${index + 1} content is required.`);
      }

      const points = clampInt(question.points, 1, 1, 999);
      if (!Number.isFinite(points) || points < 1) {
        throw new Error(`Question ${index + 1} points must be at least 1.`);
      }

      if (question.type === "fill_blank") {
        const answers = question.options
          .map((entry) => entry.text.trim())
          .filter((entry) => entry.length > 0);
        if (answers.length === 0) {
          throw new Error(`Question ${index + 1} needs at least one accepted answer.`);
        }
        return;
      }

      if (!isOptionQuestion(question.type)) return;
      if (question.options.length < 2) {
        throw new Error(`Question ${index + 1} requires at least 2 options.`);
      }
      if (question.options.some((entry) => !entry.text.trim())) {
        throw new Error(`Question ${index + 1} has blank answer options.`);
      }
      if (!question.options.some((entry) => entry.isCorrect)) {
        throw new Error(`Question ${index + 1} needs at least one correct answer.`);
      }
    });
  };

  const buildOptionPayload = (
    questionType: SupportedQuestionType,
    options: DraftOption[],
  ): QuestionOptionInput[] | undefined => {
    if (questionType === "short_answer") return undefined;

    if (questionType === "fill_blank") {
      const answerKeys = options
        .map((option, index) => ({
          text: option.text.trim(),
          isCorrect: true,
          order: index + 1,
        }))
        .filter((entry) => entry.text.length > 0);

      return answerKeys.length > 0 ? answerKeys : undefined;
    }

    if (!isOptionQuestion(questionType)) return undefined;

    return options.map((option, index) => ({
      text: option.text.trim(),
      isCorrect: option.isCorrect,
      order: index + 1,
    }));
  };

  const buildQuestionPayload = (
    question: DraftQuestion,
    order: number,
  ): Omit<CreateQuestionDto, "assessmentId"> & UpdateQuestionDto => {
    const type = question.type as QuestionType;
    const options = buildOptionPayload(question.type, question.options);
    return {
      type,
      content: ensureRichText(question.content),
      points: clampInt(question.points, 1, 1, 999),
      order,
      isRequired: question.isRequired,
      explanation: question.explanation.trim() ? ensureRichText(question.explanation) : undefined,
      options,
    };
  };

  const invalidateAssessmentCaches = async (targetClassId: string, targetAssessmentId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.assessments(targetClassId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.assessmentDetail(targetAssessmentId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.teacherAssessmentSubmissions(targetAssessmentId) }),
    ]);
  };

  const syncQuestions = async (targetAssessmentId: string) => {
    for (const deletedId of removedQuestionIds) {
      await assessmentsApi.deleteQuestion(deletedId);
    }

    const nextDrafts: DraftQuestion[] = [];

    for (let index = 0; index < sortedQuestions.length; index += 1) {
      const question = sortedQuestions[index];
      const questionPayload = buildQuestionPayload(question, index + 1);

      if (question.id) {
        await assessmentsApi.updateQuestion(question.id, questionPayload);
        nextDrafts.push(question);
      } else {
        const created = await assessmentsApi.createQuestion({
          assessmentId: targetAssessmentId,
          ...questionPayload,
        });
        nextDrafts.push(mapQuestionFromAssessment(created));
      }
    }

    setQuestions(nextDrafts);
    setRemovedQuestionIds([]);
  };

  const getAssessmentPayload = () => {
    const classId = selectedClassId.trim();
    if (!classId) {
      throw new Error("Select a class first.");
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      throw new Error("Assessment title is required.");
    }

    const parsedDueDate = parseDateInput(dueDateInput);
    const nextType = assessmentType as AssessmentType;

    if (nextType === "file_upload" && !fileUploadInstructions.trim()) {
      throw new Error("File upload instructions are required for file upload assessments.");
    }

    const basePayload: CreateAssessmentDto = {
      classId,
      title: trimmedTitle,
      description: description.trim() ? ensureRichText(description) : undefined,
      type: nextType,
      dueDate: parsedDueDate,
      passingScore: clampInt(passingScoreInput, 60, 1, 100),
      maxAttempts: clampInt(maxAttemptsInput, 1, 1, 99),
      timeLimitMinutes:
        nextType === "file_upload"
          ? null
          : (timeLimitInput.trim()
              ? clampInt(timeLimitInput, 30, 1, 999)
              : null),
      closeWhenDue: true,
      randomizeQuestions: false,
      timedQuestionsEnabled: false,
      questionTimeLimitSeconds: null,
      strictMode: false,
    };

    if (nextType === "file_upload") {
      basePayload.fileUploadInstructions = ensureRichText(fileUploadInstructions);
      basePayload.allowedUploadMimeTypes = DEFAULT_UPLOAD_MIME_TYPES;
      basePayload.allowedUploadExtensions = DEFAULT_UPLOAD_EXTENSIONS;
      basePayload.maxUploadSizeBytes = 100 * 1024 * 1024;
    } else {
      basePayload.fileUploadInstructions = undefined;
      basePayload.allowedUploadMimeTypes = undefined;
      basePayload.allowedUploadExtensions = undefined;
      basePayload.maxUploadSizeBytes = undefined;
    }

    return {
      payload: basePayload,
      publishAfterSave: status === "published",
    };
  };

  const handleCreateDraftAndOpenEditor = async () => {
    if (creatingDraft || saving) return;
    try {
      setCreatingDraft(true);
      const { payload } = getAssessmentPayload();
      const created = await assessmentsApi.create({
        ...payload,
        title: payload.title || "Untitled Assessment",
      });
      setAssessmentId(created.id);
      hydratedAssessmentIdRef.current = created.id;
      await invalidateAssessmentCaches(created.classId, created.id);
      Alert.alert("Draft created", "Draft assessment is ready. Continue editing, then save questions.");
    } catch (error) {
      Alert.alert("Unable to create draft", toAppError(error).message);
    } finally {
      setCreatingDraft(false);
    }
  };

  const handleSavePress = () => {
    try {
      validateQuestionPayload();
      getAssessmentPayload();
      setShowSaveConfirmModal(true);
    } catch (error) {
      Alert.alert("Cannot save assessment", toAppError(error).message);
    }
  };

  const executeSave = async () => {
    if (saving) return;
    try {
      setSaving(true);
      setShowSaveConfirmModal(false);
      validateQuestionPayload();
      const { payload, publishAfterSave } = getAssessmentPayload();

      let targetAssessmentId = assessmentId;
      let targetClassId = payload.classId;

      if (!targetAssessmentId) {
        const created = await assessmentsApi.create(payload);
        targetAssessmentId = created.id;
        targetClassId = created.classId;
        setAssessmentId(created.id);
        hydratedAssessmentIdRef.current = created.id;
      } else {
        const updatePayload: UpdateAssessmentDto = {
          title: payload.title,
          description: payload.description,
          type: payload.type,
          dueDate: payload.dueDate,
          closeWhenDue: payload.closeWhenDue,
          randomizeQuestions: payload.randomizeQuestions,
          timedQuestionsEnabled: payload.timedQuestionsEnabled,
          questionTimeLimitSeconds: payload.questionTimeLimitSeconds,
          strictMode: payload.strictMode,
          fileUploadInstructions: payload.fileUploadInstructions,
          allowedUploadMimeTypes: payload.allowedUploadMimeTypes,
          allowedUploadExtensions: payload.allowedUploadExtensions,
          maxUploadSizeBytes: payload.maxUploadSizeBytes,
          passingScore: payload.passingScore,
          maxAttempts: payload.maxAttempts,
          timeLimitMinutes: payload.timeLimitMinutes ?? null,
        };
        await assessmentsApi.update(targetAssessmentId, updatePayload);
      }

      if (!targetAssessmentId) {
        throw new Error("Assessment ID is missing after save.");
      }

      await syncQuestions(targetAssessmentId);
      await assessmentsApi.update(targetAssessmentId, {
        isPublished: publishAfterSave,
      });
      await invalidateAssessmentCaches(targetClassId, targetAssessmentId);

      if (targetClassId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.classDetail(targetClassId) });
      }

      Alert.alert("Assessment Saved", "Your assessment changes have been saved successfully.", [
        {
          text: "OK",
          onPress: () => {
            if (targetClassId) {
              navigation.navigate("TeacherClassDetail", {
                classId: targetClassId,
                initialTab: "assessments",
              });
            } else {
              navigation.goBack();
            }
          },
        },
      ]);
    } catch (error) {
      Alert.alert("Unable to save assessment", toAppError(error).message);
    } finally {
      setSaving(false);
    }
  };

  const refreshing = classesQuery.isRefetching || assessmentQuery.isRefetching;

  return (
    <TeacherScreen
      title={assessmentId ? "Edit Assessment" : "Create Assessment"}
      subtitle="Mobile teacher editor for creating and updating assessments with question controls, publish state, and class assignment."
      icon="clipboard-edit-outline"
      rightAction={
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.redSoft,
          }}
        >
          <MaterialCommunityIcons name="arrow-left" size={18} color={theme.red} />
        </Pressable>
      }
      refreshing={refreshing}
      onRefresh={() => {
        const tasks: Array<Promise<unknown>> = [classesQuery.refetch()];
        if (assessmentId) {
          tasks.push(assessmentQuery.refetch());
        }
        void Promise.all(tasks);
      }}
    >
      <TeacherStats
        items={[
          { label: "Questions", value: sortedQuestions.length, tone: "red" },
          { label: "Total Points", value: totalPoints, tone: "blue" },
          { label: "Status", value: status === "published" ? "Published" : "Draft", tone: status === "published" ? "green" : "amber" },
          { label: "Type", value: formatAssessmentTypeLabel(assessmentType), tone: "purple" },
        ]}
      />

      <TeacherPanel
        title="Assessment setup"
        subtitle="Match the web flow: set class, title, type, and grading rules before publishing."
      >
        {classOptions.length === 0 ? (
          <TeacherEmpty
            title="No teacher classes"
            subtitle="You need at least one assigned class to create or edit assessments."
            icon="book-alert-outline"
          />
        ) : (
          <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
            <Text style={{ fontSize: 10, fontWeight: "700", color: theme.muted, textTransform: "uppercase", letterSpacing: 0.7 }}>
              Class
            </Text>
            <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {classOptions.map((entry) => (
                <TeacherChip
                  key={entry.id}
                  label={entry.subjectCode}
                  active={selectedClassId === entry.id}
                  onPress={() => setSelectedClassId(entry.id)}
                />
              ))}
            </View>
            {activeClass ? (
              <Text style={{ marginTop: 8, fontSize: 11, color: "#9D9D9D" }}>
                {activeClass.subjectName} - {activeClass.section?.name || "Section pending"}
              </Text>
            ) : null}

            <Text style={{ marginTop: 12, fontSize: 10, fontWeight: "700", color: theme.muted, textTransform: "uppercase", letterSpacing: 0.7 }}>
              Title
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Assessment title"
              placeholderTextColor={theme.dim}
              style={{
                marginTop: 6,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.active,
                color: theme.text,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            />

            <Text style={{ marginTop: 12, fontSize: 10, fontWeight: "700", color: theme.muted, textTransform: "uppercase", letterSpacing: 0.7 }}>
              Description
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Short description for students"
              multiline
              placeholderTextColor={theme.dim}
              style={{
                marginTop: 6,
                minHeight: 88,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.active,
                color: theme.text,
                paddingHorizontal: 12,
                paddingVertical: 12,
                textAlignVertical: "top",
              }}
            />

            <Text style={{ marginTop: 12, fontSize: 10, fontWeight: "700", color: theme.muted, textTransform: "uppercase", letterSpacing: 0.7 }}>
              Assessment type
            </Text>
            <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {ASSESSMENT_TYPE_OPTIONS.map((entry) => (
                <TeacherChip
                  key={entry.value}
                  label={entry.label}
                  active={assessmentType === entry.value}
                  onPress={() => setAssessmentType(entry.value)}
                />
              ))}
            </View>

            <Text style={{ marginTop: 12, fontSize: 10, fontWeight: "700", color: theme.muted, textTransform: "uppercase", letterSpacing: 0.7 }}>
              Status
            </Text>
            <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              <TeacherChip label="Draft" active={status === "draft"} onPress={() => setStatus("draft")} />
              <TeacherChip
                label="Published"
                active={status === "published"}
                onPress={() => {
                  if (assessmentType !== "file_upload" && sortedQuestions.length === 0) {
                    Alert.alert(
                      "Cannot Publish Assessment",
                      "No questions entered. Please add at least 1 question before publishing.",
                    );
                    return;
                  }
                  setStatus("published");
                }}
              />
            </View>

            <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: "700", color: theme.muted, textTransform: "uppercase", letterSpacing: 0.7 }}>
                  Due date
                </Text>
                <Pressable
                  onPress={() => setShowDatePickerModal(true)}
                  style={{
                    marginTop: 6,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.active,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ fontSize: 13, color: dueDateInput ? theme.text : theme.dim }} numberOfLines={1}>
                    {dueDateInput ? dueDateInput : "No due date (Tap to set)"}
                  </Text>
                  <MaterialCommunityIcons name="calendar-month-outline" size={16} color={theme.blue} />
                </Pressable>
              </View>
              <View style={{ width: 108 }}>
                <Text style={{ fontSize: 10, fontWeight: "700", color: theme.muted, textTransform: "uppercase", letterSpacing: 0.7 }}>
                  Pass %
                </Text>
                <TextInput
                  value={passingScoreInput}
                  onChangeText={(val) => {
                    const cleaned = val.replace(/[^0-9]/g, "");
                    if (!cleaned) {
                      setPassingScoreInput("");
                      return;
                    }
                    const num = Math.min(100, Math.max(1, parseInt(cleaned, 10)));
                    setPassingScoreInput(String(num));
                  }}
                  onBlur={() => {
                    if (!passingScoreInput.trim()) setPassingScoreInput("60");
                  }}
                  keyboardType="number-pad"
                  placeholder="60"
                  placeholderTextColor={theme.dim}
                  style={{
                    marginTop: 6,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.active,
                    color: theme.text,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                />
              </View>
            </View>

            <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: "700", color: theme.muted, textTransform: "uppercase", letterSpacing: 0.7 }}>
                  Max attempts
                </Text>
                <TextInput
                  value={maxAttemptsInput}
                  onChangeText={(val) => setMaxAttemptsInput(val.replace(/[^0-9]/g, ""))}
                  onBlur={() => {
                    if (!maxAttemptsInput.trim() || parseInt(maxAttemptsInput, 10) < 1) setMaxAttemptsInput("1");
                  }}
                  keyboardType="number-pad"
                  placeholder="1"
                  placeholderTextColor={theme.dim}
                  style={{
                    marginTop: 6,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.active,
                    color: theme.text,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: "700", color: theme.muted, textTransform: "uppercase", letterSpacing: 0.7 }}>
                  Time limit
                </Text>
                <Pressable
                  disabled={assessmentType === "file_upload"}
                  onPress={() => setShowTimeLimitModal(true)}
                  style={{
                    marginTop: 6,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: assessmentType === "file_upload" ? theme.surface : theme.active,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ fontSize: 13, color: timeLimitInput ? theme.text : theme.dim }} numberOfLines={1}>
                    {assessmentType === "file_upload"
                      ? "Not used"
                      : timeLimitInput
                        ? `${timeLimitInput} minutes`
                        : "No limit (Tap to set)"}
                  </Text>
                  <MaterialCommunityIcons name="clock-outline" size={16} color={theme.blue} />
                </Pressable>
              </View>
            </View>

            {assessmentType === "file_upload" ? (
              <>
                <Text style={{ marginTop: 12, fontSize: 10, fontWeight: "700", color: theme.muted, textTransform: "uppercase", letterSpacing: 0.7 }}>
                  File upload instructions
                </Text>
                <TextInput
                  value={fileUploadInstructions}
                  onChangeText={setFileUploadInstructions}
                  multiline
                  placeholder="Explain what students need to upload."
                  placeholderTextColor={theme.dim}
                  style={{
                    marginTop: 6,
                    minHeight: 88,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.active,
                    color: theme.text,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    textAlignVertical: "top",
                  }}
                />
              </>
            ) : null}
          </View>
        )}
      </TeacherPanel>

      {assessmentType !== "file_upload" ? (
        <TeacherPanel
          title="Questions"
          subtitle="Add, edit, reorder, and delete questions in the same save cycle."
          action={
            <TeacherActionButton
              label="Add"
              icon="plus"
              tone="green"
              onPress={() => addQuestion("multiple_choice")}
            />
          }
        >
          {sortedQuestions.length === 0 ? (
            <TeacherEmpty
              title="No questions yet"
              subtitle="Use Add to create the first question before publishing."
              icon="help-circle-outline"
            />
          ) : (
            sortedQuestions.map((question, index) => (
              <View
                key={question.localId}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderTopWidth: 1,
                  borderTopColor: theme.border,
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: theme.text }}>
                    Question {index + 1}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Pressable
                      onPress={() => moveQuestion(question.localId, -1)}
                      style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.active }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "700", color: theme.text }}>Up</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => moveQuestion(question.localId, 1)}
                      style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.active }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "700", color: theme.text }}>Down</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => removeQuestion(question.localId)}
                      style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.redSoft }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "700", color: theme.red }}>Delete</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {QUESTION_TYPE_OPTIONS.map((entry) => (
                    <TeacherChip
                      key={`${question.localId}-${entry.value}`}
                      label={entry.label}
                      active={question.type === entry.value}
                      onPress={() =>
                        patchQuestion(question.localId, (current) => {
                          const nextType = entry.value;
                          const nextOptions =
                            nextType === "true_false"
                              ? createDefaultOptions("true_false")
                              : isOptionQuestion(nextType) || nextType === "fill_blank"
                                ? current.options.length > 0
                                  ? current.options
                                  : createDefaultOptions(nextType)
                                : [];
                          return {
                            ...current,
                            type: nextType,
                            options: nextOptions,
                          };
                        })
                      }
                    />
                  ))}
                </View>

                <TextInput
                  value={question.content}
                  onChangeText={(value) =>
                    patchQuestion(question.localId, (current) => ({ ...current, content: value }))
                  }
                  multiline
                  placeholder="Question prompt"
                  placeholderTextColor={theme.dim}
                  style={{
                    minHeight: 72,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.active,
                    color: theme.text,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    textAlignVertical: "top",
                  }}
                />

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ width: 96 }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: theme.muted, textTransform: "uppercase", letterSpacing: 0.7 }}>
                      Points
                    </Text>
                    <TextInput
                      value={question.points}
                      onChangeText={(value) =>
                        patchQuestion(question.localId, (current) => ({ ...current, points: value }))
                      }
                      keyboardType="number-pad"
                      placeholder="1"
                      placeholderTextColor={theme.dim}
                      style={{
                        marginTop: 6,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: theme.border,
                        backgroundColor: theme.active,
                        color: theme.text,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: theme.muted, textTransform: "uppercase", letterSpacing: 0.7 }}>
                      Explanation (optional)
                    </Text>
                    <TextInput
                      value={question.explanation}
                      onChangeText={(value) =>
                        patchQuestion(question.localId, (current) => ({ ...current, explanation: value }))
                      }
                      placeholder="Teacher explanation shown in review"
                      placeholderTextColor={theme.dim}
                      style={{
                        marginTop: 6,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: theme.border,
                        backgroundColor: theme.active,
                        color: theme.text,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                      }}
                    />
                  </View>
                </View>

                {question.type === "short_answer" || question.type === "essay" ? (
                  <View style={{ borderRadius: 10, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.active, paddingHorizontal: 12, paddingVertical: 10 }}>
                    <Text style={{ fontSize: 11, color: "#9D9D9D" }}>
                      {question.type === "essay"
                        ? "Essay questions accept long-form text responses and require manual teacher scoring."
                        : "Short answer items do not need predefined options."}
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    {question.options.map((option, optionIndex) => (
                      <View key={option.localId} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                        <Pressable
                          onPress={() =>
                            patchQuestion(question.localId, (current) => {
                              const next = current.options.map((entry, entryIndex) => {
                                if (entryIndex !== optionIndex) {
                                  if (current.type === "multiple_choice" || current.type === "true_false" || current.type === "dropdown") {
                                    return { ...entry, isCorrect: false };
                                  }
                                  return entry;
                                }

                                if (current.type === "multiple_select") {
                                  return { ...entry, isCorrect: !entry.isCorrect };
                                }

                                return { ...entry, isCorrect: true };
                              });
                              return { ...current, options: next };
                            })
                          }
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: option.isCorrect ? theme.redLine : theme.border,
                            backgroundColor: option.isCorrect ? theme.redSoft : theme.surface,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {option.isCorrect ? (
                            <MaterialCommunityIcons name="check" size={14} color={theme.red} />
                          ) : null}
                        </Pressable>
                        <TextInput
                          value={option.text}
                          editable={question.type !== "true_false"}
                          onChangeText={(value) =>
                            patchQuestion(question.localId, (current) => ({
                              ...current,
                              options: current.options.map((entry, entryIndex) =>
                                entryIndex === optionIndex ? { ...entry, text: value } : entry,
                              ),
                            }))
                          }
                          placeholder={
                            question.type === "fill_blank"
                              ? `Accepted answer ${optionIndex + 1}`
                              : `Option ${optionIndex + 1}`
                          }
                          placeholderTextColor={theme.dim}
                          style={{
                            flex: 1,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: theme.border,
                            backgroundColor: question.type === "true_false" ? theme.surface : theme.active,
                            color: theme.text,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                          }}
                        />
                        {question.type !== "true_false" ? (
                          <Pressable
                            onPress={() =>
                              patchQuestion(question.localId, (current) => {
                                const canRemove = current.options.length > (current.type === "fill_blank" ? 1 : 2);
                                if (!canRemove) return current;
                                return {
                                  ...current,
                                  options: current.options.filter((_, entryIndex) => entryIndex !== optionIndex),
                                };
                              })
                            }
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 14,
                              backgroundColor: theme.active,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <MaterialCommunityIcons name="close" size={14} color={theme.text} />
                          </Pressable>
                        ) : null}
                      </View>
                    ))}

                    {question.type !== "true_false" ? (
                      <TeacherActionButton
                        label={question.type === "fill_blank" ? "Add answer key" : "Add option"}
                        icon="plus"
                        tone="neutral"
                        onPress={() =>
                          patchQuestion(question.localId, (current) => ({
                            ...current,
                            options: [...current.options, { localId: createLocalId(), text: "", isCorrect: current.type === "fill_blank" }],
                          }))
                        }
                      />
                    ) : null}
                  </View>
                )}
              </View>
            ))
          )}

          <View style={{ paddingHorizontal: 14, paddingBottom: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {QUESTION_TYPE_OPTIONS.map((entry) => (
              <TeacherActionButton
                key={`add-${entry.value}`}
                label={entry.label}
                tone="blue"
                onPress={() => addQuestion(entry.value)}
              />
            ))}
          </View>
        </TeacherPanel>
      ) : null}

      <TeacherPanel
        title="Save and open"
        subtitle="Keep this editor error-free by saving metadata and question updates in one pass."
      >
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {!assessmentId ? (
            <TeacherActionButton
              label={creatingDraft ? "Creating draft..." : "Create draft now"}
              icon="file-plus-outline"
              tone="amber"
              disabled={creatingDraft || saving}
              onPress={() => void handleCreateDraftAndOpenEditor()}
            />
          ) : null}
          <TeacherActionButton
            label={saving ? "Saving..." : "Save assessment"}
            icon="content-save-outline"
            tone="green"
            disabled={saving || creatingDraft || classOptions.length === 0}
            onPress={() => void handleSavePress()}
          />
          {assessmentId ? (
            <>
              <TeacherActionButton
                label="Open assessment detail"
                icon="open-in-new"
                tone="blue"
                onPress={() =>
                  navigation.navigate("TeacherAssessmentDetail", {
                    assessmentId,
                    classId: selectedClassId || undefined,
                  })
                }
              />
              <TeacherActionButton
                label="Delete assessment"
                icon="trash-can-outline"
                tone="red"
                disabled={saving || deleteMutation.isPending}
                onPress={() => setShowDeleteConfirmModal(true)}
              />
            </>
          ) : null}
        </View>
      </TeacherPanel>

      <DatePickerModal
        visible={showDatePickerModal}
        value={dueDateInput}
        onSelect={(dateStr) => setDueDateInput(dateStr)}
        onClose={() => setShowDatePickerModal(false)}
      />

      <TimeLimitDropdownModal
        visible={showTimeLimitModal}
        value={timeLimitInput}
        onSelect={(val) => setTimeLimitInput(val)}
        onClose={() => setShowTimeLimitModal(false)}
      />

      <SaveConfirmModal
        visible={showSaveConfirmModal}
        title={title}
        className={classOptions.find((c) => c.id === selectedClassId)?.subjectName || selectedClassId}
        type={assessmentType}
        questionCount={sortedQuestions.length}
        dueDate={dueDateInput}
        passScore={passingScoreInput}
        maxAttempts={maxAttemptsInput}
        timeLimit={timeLimitInput}
        saving={saving}
        onConfirm={() => void executeSave()}
        onClose={() => setShowSaveConfirmModal(false)}
      />

      <DeleteConfirmModal
        visible={showDeleteConfirmModal}
        title={title || "this assessment"}
        deleting={deleteMutation.isPending}
        onConfirm={() => void handleDeleteAssessmentConfirm()}
        onClose={() => setShowDeleteConfirmModal(false)}
      />
    </TeacherScreen>
  );
}
