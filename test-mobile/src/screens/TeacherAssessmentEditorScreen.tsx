import { useEffect, useMemo, useRef, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  queryKeys,
  useAssessmentDetail,
  useTeacherClasses,
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
  | "dropdown";

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
    type === "dropdown"
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
    value === "dropdown"
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
    if (assessmentType === "file_upload") return;
    if (sortedQuestions.length === 0) {
      throw new Error("Add at least one question before saving this assessment type.");
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

  const handleSave = async () => {
    if (saving) return;
    try {
      setSaving(true);
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

      Alert.alert("Assessment saved", "Teacher assessment and questions saved successfully.", [
        {
          text: "Open detail",
          onPress: () =>
            navigation.replace("TeacherAssessmentDetail", {
              assessmentId: targetAssessmentId!,
              classId: targetClassId,
            }),
        },
        { text: "Continue editing", style: "cancel" },
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
            width: 36,
            height: 36,
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
              <TeacherChip label="Published" active={status === "published"} onPress={() => setStatus("published")} />
            </View>

            <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: "700", color: theme.muted, textTransform: "uppercase", letterSpacing: 0.7 }}>
                  Due date
                </Text>
                <TextInput
                  value={dueDateInput}
                  onChangeText={setDueDateInput}
                  placeholder="YYYY-MM-DD HH:mm"
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
              <View style={{ width: 108 }}>
                <Text style={{ fontSize: 10, fontWeight: "700", color: theme.muted, textTransform: "uppercase", letterSpacing: 0.7 }}>
                  Pass %
                </Text>
                <TextInput
                  value={passingScoreInput}
                  onChangeText={setPassingScoreInput}
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
                  onChangeText={setMaxAttemptsInput}
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
                  Time limit (min)
                </Text>
                <TextInput
                  value={timeLimitInput}
                  onChangeText={setTimeLimitInput}
                  keyboardType="number-pad"
                  editable={assessmentType !== "file_upload"}
                  placeholder={assessmentType === "file_upload" ? "Not used" : "Optional"}
                  placeholderTextColor={theme.dim}
                  style={{
                    marginTop: 6,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: assessmentType === "file_upload" ? theme.surface : theme.active,
                    color: theme.text,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                />
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

                {question.type === "short_answer" ? (
                  <View style={{ borderRadius: 10, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.active, paddingHorizontal: 12, paddingVertical: 10 }}>
                    <Text style={{ fontSize: 11, color: "#9D9D9D" }}>
                      Short answer items do not need predefined options.
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
                            borderColor: option.isCorrect ? "rgba(232,41,78,0.55)" : theme.border,
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
            onPress={() => void handleSave()}
          />
          {assessmentId ? (
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
          ) : null}
        </View>
      </TeacherPanel>
    </TeacherScreen>
  );
}
