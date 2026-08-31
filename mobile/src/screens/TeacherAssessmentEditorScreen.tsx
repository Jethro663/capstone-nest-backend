import * as Clipboard from "expo-clipboard";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import {
  queryKeys,
  useAssessmentDetail,
  useTeacherClasses,
} from "../api/hooks";
import { assessmentsApi } from "../api/services/assessments";
import { academicStateService } from "../api/services/academic-state";
import { normalizeApiError } from "../api/errors";
import { useAuth } from "../providers/AuthProvider";
import type { RootStackParamList } from "../navigation/types";
import type {
  EditorQuestionInput,
  SaveAssessmentEditorInput,
} from "../types/assessment";
import {
  teacherTheme as theme,
  stripRichText,
} from "../components/teacher/TeacherMobilePrimitives";
import { RichTextContent } from "../components/ui/RichTextContent";
import { AssessmentRichTextEditor } from "../components/ui/AssessmentRichTextEditor";
import {
  AssessmentSettingsFields,
  Choices,
  Field,
  Toggle,
} from "../features/assessment-editor/SettingsFields";
import {
  assessmentToEditor,
  buildEditorRequest,
  newEditor,
  newQuestion,
  QUESTION_TYPES,
  type EditorDocument,
  type SupportedQuestionType,
} from "../features/assessment-editor/model";
import {
  clearEditorRecovery,
  readEditorRecovery,
  recoveryKey,
  writeEditorRecovery,
} from "../features/assessment-editor/recovery";
import { buildProtectedUrl } from "../api/services/protected-files";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "TeacherAssessmentEditor"
>;
const fingerprint = (document: EditorDocument) => JSON.stringify(document);
const buttonStyle = {
  minHeight: 44,
  padding: 12,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: theme.border,
};
function Action({
  children,
  onPress,
  disabled = false,
}: {
  children: string;
  onPress(): void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={{ ...buttonStyle, opacity: disabled ? 0.45 : 1 }}
    >
      <Text style={{ color: theme.red, fontWeight: "600" }}>{children}</Text>
    </Pressable>
  );
}
function Content({ html }: { html?: string | null }) {
  return html ? (
    <RichTextContent
      html={html}
      color={theme.text}
      mutedColor={theme.muted}
      accentColor={theme.red}
    />
  ) : null;
}
function OptionTextEditor({
  questionType,
  ...props
}: {
  questionType: string;
  label: string;
  value: string;
  disabled?: boolean;
  onChange(value: string): void;
}) {
  // Answer keys are compared as plain text by the grading contract.
  const Editor =
    questionType === "fill_blank" ? Field : AssessmentRichTextEditor;
  return <Editor {...props} />;
}

function QuestionImage({
  url,
  imageZoom = 100,
  imagePositionX = 50,
  imagePositionY = 50,
  imageDisplayMode,
}: {
  url?: string | null;
  imageZoom?: number;
  imagePositionX?: number;
  imagePositionY?: number;
  imageDisplayMode?: string;
}) {
  const [width, setWidth] = useState(0);
  const [ratio, setRatio] = useState(1);
  const height = imageDisplayMode === "expanded" ? 260 : 180;
  const imageWidth = Math.max(width, height * ratio);
  const imageHeight = imageWidth / ratio;
  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));
  return url ? (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ height, width: "100%", overflow: "hidden" }}
    >
      <View
        style={{
          width: "100%",
          height,
          transform: [{ scale: clamp(imageZoom, 50, 200) / 100 }],
        }}
      >
        <Image
          source={{ uri: buildProtectedUrl(url) }}
          accessibilityLabel="Question image"
          onLoad={(event) => {
            const { width: w, height: h } = event.nativeEvent.source;
            if (w > 0 && h > 0) setRatio(w / h);
          }}
          style={{
            position: "absolute",
            width: imageWidth,
            height: imageHeight,
            left: ((width - imageWidth) * clamp(imagePositionX, 0, 100)) / 100,
            top: ((height - imageHeight) * clamp(imagePositionY, 0, 100)) / 100,
          }}
          resizeMode="cover"
        />
      </View>
    </View>
  ) : null;
}

export function TeacherAssessmentEditorScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const userId = user?.userId || user?.id || "";
  const queryClient = useQueryClient();
  const [document, setDocument] = useState<EditorDocument>(() =>
    newEditor(route.params?.classId ?? ""),
  );
  const [assessmentId, setAssessmentId] = useState(route.params?.assessmentId);
  const detail = useAssessmentDetail(assessmentId);
  const classes = useTeacherClasses(userId);
  const [tab, setTab] = useState<"Questions" | "Settings" | "Preview">(
    "Questions",
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const [questionMenu, setQuestionMenu] = useState<string | null>(null);
  const [ready, setReady] = useState(!assessmentId);
  const [saving, setSaving] = useState(false);
  const [savedFingerprint, setSavedFingerprint] = useState(() =>
    fingerprint(document),
  );
  const [status, setStatus] = useState("Not saved");
  const [error, setError] = useState("");
  const [issues, setIssues] = useState<
    Array<{ field: string; message: string }>
  >([]);
  const [conflict, setConflict] = useState(false);
  const [recoveryPending, setRecoveryPending] = useState(true);
  const checkedRecovery = useRef("");
  const leaving = useRef(false);
  const latest = useRef(document);
  latest.current = document;
  const dirty = ready && fingerprint(document) !== savedFingerprint;
  const key = recoveryKey(
    userId,
    document.id ?? assessmentId,
    document.classId,
  );
  const activeClass = classes.data?.find(
    (item) => item.id === document.classId,
  );
  const academic = useQuery({
    queryKey: ["assessment-editor-policy", activeClass?.schoolYear],
    enabled: Boolean(activeClass),
    queryFn: async () => {
      const current = (await academicStateService.getCurrent()).data;
      const policy =
        current.schoolYear === activeClass!.schoolYear
          ? current.policy
          : (await academicStateService.getPolicy(activeClass!.schoolYear))
              .data;
      return { current, policy };
    },
  });
  const capabilities = detail.data?.academicCapabilities;
  const periods = academic.data?.policy.periods ?? capabilities?.periods ?? [];
  const validPeriod = periods.some(
    (period) => period.key === document.settings.quarter,
  );
  const sameYear =
    academic.data?.current.schoolYear === activeClass?.schoolYear;
  const preparableYear =
    activeClass?.isActive !== false &&
    Boolean(
      academic.data &&
      activeClass &&
      Number(activeClass.schoolYear.slice(0, 4)) >=
        Number(academic.data.current.schoolYear.slice(0, 4)),
    );
  const canPrepare = Boolean(
    academic.data &&
    validPeriod &&
    preparableYear &&
    (!assessmentId || capabilities?.canPrepare) &&
    !detail.data?.isCoreTemplateAsset,
  );
  const canRelease =
    canPrepare &&
    sameYear &&
    document.settings.quarter === academic.data?.current.quarter &&
    (!assessmentId ||
      Boolean(
        capabilities?.canRelease &&
        capabilities.period === document.settings.quarter,
      ));
  const readonly =
    !canPrepare || saving || conflict || Boolean(document.pendingSave);
  const questionsReadonly =
    readonly || detail.data?.authoringRestrictions?.canEditQuestions === false;
  const reason = academic.isError
    ? "Academic policy could not load. Retry before editing."
    : !academic.data
      ? "Loading academic policy…"
      : detail.data?.isCoreTemplateAsset
        ? "This is a core template. Create a separate assessment to author your own content."
        : !preparableYear
          ? "This school year is closed or historical. Existing content remains available for review."
          : !validPeriod
            ? "Invalid or unassigned grading period. Ask an administrator to review the assessment in Academic Recovery."
            : assessmentId && !capabilities?.canPrepare
              ? (capabilities?.readOnlyReason ??
                "This assessment is restricted by its academic record.")
              : !canRelease
                ? "Future valid term: you can prepare and save a draft. Ready to give becomes available when the term is active."
                : "";

  useEffect(() => {
    if (!assessmentId && !document.classId && classes.data?.[0])
      setDocument((current) => ({ ...current, classId: classes.data![0].id }));
  }, [assessmentId, classes.data, document.classId]);
  useEffect(() => {
    if (!ready && detail.data) {
      const next = assessmentToEditor(detail.data);
      setDocument(next);
      setSavedFingerprint(fingerprint(next));
      setStatus("Saved");
      setReady(true);
    }
  }, [detail.data, ready]);
  useEffect(() => {
    if (!assessmentId && academic.data && !document.settings.quarter)
      setDocument((current) => ({
        ...current,
        settings: {
          ...current.settings,
          quarter: sameYear
            ? academic.data!.current.quarter
            : academic.data!.policy.periods[0]?.key,
        },
      }));
  }, [assessmentId, academic.data, document.settings.quarter, sameYear]);
  useEffect(() => {
    if (
      !ready ||
      !userId ||
      !document.classId ||
      checkedRecovery.current === key
    )
      return;
    checkedRecovery.current = key;
    setRecoveryPending(true);
    let cancelled = false;
    void readEditorRecovery(key)
      .then((recovered) => {
        if (cancelled) return;
        if (
          !recovered ||
          fingerprint(recovered) === fingerprint(latest.current)
        ) {
          setRecoveryPending(false);
          return;
        }
        Alert.alert(
          "Recover unsaved work?",
          recovered.revision !== latest.current.revision
            ? "The server has a different revision. You can inspect your recovery copy, but it will not overwrite newer server content."
            : "A recovery copy from this account is available on this device.",
          [
            {
              text: "Keep server version",
              onPress: () => {
                setRecoveryPending(false);
                void clearEditorRecovery(key);
              },
            },
            {
              text: "Recover",
              onPress: () => {
                setRecoveryPending(false);
                setDocument(recovered);
                setConflict(
                  Boolean(
                    recovered.id &&
                    recovered.revision !== latest.current.revision,
                  ),
                );
                setStatus("Recovered on this device");
              },
            },
          ],
        );
      })
      .catch(() => {
        setRecoveryPending(false);
        setStatus("Device recovery unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [ready, key, userId, document.classId]);
  useEffect(() => {
    if (!dirty || recoveryPending || !userId || !document.classId) return;
    const timeout = setTimeout(() => {
      void writeEditorRecovery(key, document)
        .then(() => {
          if (!saving) setStatus("Unsaved · recovery copy on device");
        })
        .catch(() => setStatus("Unsaved · recovery unavailable"));
    }, 350);
    return () => clearTimeout(timeout);
  }, [dirty, document, key, userId, saving, recoveryPending]);
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state !== "active" && dirty && !recoveryPending)
        void writeEditorRecovery(key, latest.current).catch(() =>
          setStatus("Recovery unavailable"),
        );
    });
    return () => listener.remove();
  }, [dirty, key, recoveryPending]);
  useEffect(
    () =>
      navigation.addListener("beforeRemove", (event) => {
        if (!dirty || leaving.current) return;
        event.preventDefault();
        Alert.alert(
          "Leave without saving?",
          "Your work is not synchronized. Keep a recovery copy on this device, or stay to save it.",
          [
            { text: "Stay", style: "cancel" },
            {
              text: "Leave with recovery",
              onPress: () => {
                void writeEditorRecovery(key, latest.current)
                  .then(() => {
                    leaving.current = true;
                    navigation.dispatch(event.data.action);
                  })
                  .catch(() =>
                    setError(
                      "Could not store recovery. Save or copy your work before leaving.",
                    ),
                  );
              },
            },
          ],
        );
      }),
    [navigation, dirty, key],
  );

  function changeQuestion(
    clientId: string,
    patch: Partial<EditorQuestionInput>,
  ) {
    setDocument((current) => ({
      ...current,
      questions: current.questions.map((question) =>
        question.clientId === clientId ? { ...question, ...patch } : question,
      ),
    }));
  }
  async function save(action: SaveAssessmentEditorInput["action"]) {
    if (saving || !canPrepare || conflict) return;
    const request =
      document.pendingSave ??
      buildEditorRequest(document, Crypto.randomUUID(), action);
    const pending = { ...document, pendingSave: request };
    setSaving(true);
    setError("");
    setDocument(pending);
    try {
      await writeEditorRecovery(key, pending);
      const result = await assessmentsApi.saveEditor(assessmentId, request);
      const next = assessmentToEditor(result.assessment);
      checkedRecovery.current = recoveryKey(userId, next.id, next.classId);
      setDocument(next);
      setAssessmentId(next.id);
      setSavedFingerprint(fingerprint(next));
      setIssues(result.publicationIssues);
      setStatus("Saved to server");
      queryClient.setQueryData(
        queryKeys.assessmentDetail(next.id!),
        result.assessment,
      );
      try {
        await clearEditorRecovery(key);
        await clearEditorRecovery(checkedRecovery.current);
      } catch {
        // The server has committed; device cleanup must not turn this into a
        // failed save or prevent the assessment list from being refreshed.
        setStatus("Saved to server · device recovery cleanup unavailable");
      }
      void queryClient.invalidateQueries({
        queryKey: queryKeys.assessments(next.classId),
      });
      return result.assessment;
    } catch (cause) {
      const failure = normalizeApiError(cause, { present: false });
      const uncertain =
        failure.isNetworkError || !failure.status || failure.status >= 500;
      if (!uncertain) {
        const resolved = { ...pending, pendingSave: undefined };
        setDocument(resolved);
        await writeEditorRecovery(key, resolved);
      }
      const revisionConflict = failure.code === "ASSESSMENT_REVISION_CONFLICT";
      setConflict(revisionConflict);
      setError(
        revisionConflict
          ? "Another device changed this assessment. Your recovery copy is safe. Compare it with the server before saving again."
          : `${failure.message}${uncertain ? " Your request is kept. Retry save to safely check its result." : ""}`,
      );
      if (failure.fieldErrors)
        setIssues(
          Object.entries(failure.fieldErrors).map(([field, message]) => ({
            field,
            message: Array.isArray(message)
              ? message.join(" ")
              : String(message),
          })),
        );
    } finally {
      setSaving(false);
    }
  }
  async function refresh() {
    await academic.refetch();
    if (assessmentId) {
      const result = await detail.refetch();
      if (result.data && !dirty) {
        const next = assessmentToEditor(result.data);
        setDocument(next);
        setSavedFingerprint(fingerprint(next));
      }
    }
  }
  function reloadServer() {
    Alert.alert(
      "Keep recovery and reopen server version?",
      "Your device recovery copy will remain available. Unsaved changes will not be applied to the server.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open server version",
          onPress: async () => {
            const result = await detail.refetch();
            if (result.data) {
              const next = assessmentToEditor(result.data);
              setDocument(next);
              setSavedFingerprint(fingerprint(next));
              setConflict(false);
              setError("");
              setStatus("Server version loaded · recovery copy kept");
            }
          },
        },
      ],
    );
  }
  async function upload(kind: "teacher-attachment" | "rubric-source") {
    if (dirty || !assessmentId) {
      setError(
        "Save the draft before attaching a file. Your saved questions will stay intact.",
      );
      return;
    }
    const picker = await import("expo-document-picker");
    const picked = await picker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
    });
    if (picked.canceled) return;
    setSaving(true);
    try {
      await assessmentsApi.uploadAuthorFile(
        assessmentId,
        kind,
        picked.assets[0],
      );
      const response = await detail.refetch();
      if (response.data) {
        const next = assessmentToEditor(response.data);
        setDocument(next);
        setSavedFingerprint(fingerprint(next));
      }
    } catch (cause) {
      setError(normalizeApiError(cause, { present: false }).message);
    } finally {
      setSaving(false);
    }
  }
  async function uploadImage(
    question: EditorQuestionInput,
    optionIndex?: number,
  ) {
    const targetId =
      optionIndex === undefined
        ? question.id
        : question.options?.[optionIndex]?.id;
    if (dirty || !targetId || !assessmentId) {
      setError(
        "Save your draft before uploading an image. Images attach to saved questions and choices.",
      );
      return;
    }
    const picker = await import("expo-image-picker");
    const selection = await picker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });
    if (selection.canceled) return;
    setSaving(true);
    try {
      await assessmentsApi.uploadAuthorImage(
        optionIndex === undefined ? "questions" : "options",
        targetId,
        selection.assets[0],
      );
      const response = await detail.refetch();
      if (response.data) {
        const next = assessmentToEditor(response.data);
        setDocument(next);
        setSavedFingerprint(fingerprint(next));
      }
    } catch (cause) {
      setError(normalizeApiError(cause, { present: false }).message);
    } finally {
      setSaving(false);
    }
  }
  const diagnostics = `Class: ${activeClass?.subjectName ?? document.classId}\nSchool year: ${activeClass?.schoolYear ?? "unknown"}\nAssessment: ${assessmentId ?? "new"}\nAssigned period: ${document.settings.quarter ?? "missing"}\nRevision: ${document.revision}\n${reason}`;
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.bg }}
      edges={["bottom", "top"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={{
            padding: 16,
            gap: 6,
            backgroundColor: "white",
            borderBottomWidth: 1,
            borderColor: theme.border,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Action onPress={() => navigation.goBack()}>Back</Action>
            <Text
              numberOfLines={2}
              style={{
                flex: 1,
                fontSize: 20,
                fontWeight: "700",
                color: theme.text,
              }}
            >
              {document.settings.title || "Untitled assessment"}
            </Text>
          </View>
          <Text style={{ color: theme.muted }}>
            {activeClass?.subjectName ?? "Select a class"} ·{" "}
            {activeClass?.schoolYear ?? ""} ·{" "}
            {periods.find((period) => period.key === document.settings.quarter)
              ?.label ?? "Unassigned period"}
          </Text>
          <Text
            accessibilityLiveRegion="polite"
            style={{ color: theme.subtext }}
          >
            {document.isPublished ? "Ready to give" : "Draft"} ·{" "}
            {saving ? "Saving…" : status}
          </Text>
        </View>
        <View style={{ flexDirection: "row", padding: 8, gap: 8 }}>
          {(["Questions", "Settings", "Preview"] as const).map((item) => (
            <Pressable
              key={item}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === item }}
              onPress={() => setTab(item)}
              style={{
                ...buttonStyle,
                flex: 1,
                backgroundColor: tab === item ? theme.redSoft : "white",
              }}
            >
              <Text
                style={{
                  textAlign: "center",
                  color: theme.text,
                  fontWeight: "600",
                }}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 32 }}
        >
          {!ready && <Text>Loading assessment…</Text>}
          {(detail.isError || classes.isError) && (
            <Action
              onPress={() => {
                void detail.refetch();
                void classes.refetch();
              }}
            >
              Could not load assessment. Retry
            </Action>
          )}
          {detail.data?.authoringRestrictions?.reason && (
            <Text style={{ color: theme.muted }}>
              {detail.data.authoringRestrictions.reason}
            </Text>
          )}
          {reason && (
            <View
              style={{
                padding: 14,
                gap: 10,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 10,
              }}
            >
              <Text style={{ color: theme.text }}>{reason}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Action onPress={() => void refresh()}>
                  Refresh after repair
                </Action>
                <Action
                  onPress={() =>
                    void Clipboard.setStringAsync(diagnostics).then(() =>
                      setStatus("Diagnostic details copied"),
                    )
                  }
                >
                  Copy diagnostic details
                </Action>
              </View>
            </View>
          )}
          {error && (
            <Text accessibilityRole="alert" style={{ color: "#b91c1c" }}>
              {error}
            </Text>
          )}
          {conflict && (
            <View style={{ gap: 8 }}>
              <Action
                onPress={() =>
                  void Share.share({
                    message: JSON.stringify(document, null, 2),
                  })
                }
              >
                Export recovery copy
              </Action>
              <Action onPress={reloadServer}>Review server version</Action>
            </View>
          )}
          {issues.length > 0 && (
            <View style={{ gap: 6 }}>
              <Text style={{ color: theme.text, fontWeight: "700" }}>
                Before Ready to give
              </Text>
              {issues.map((issue, index) => (
                <Text
                  key={`${issue.field}-${index}`}
                  style={{ color: "#b91c1c" }}
                >
                  {issue.field}: {issue.message}
                </Text>
              ))}
            </View>
          )}
          {tab === "Settings" && (
            <>
              {!assessmentId && (
                <Choices
                  label="Class"
                  value={document.classId}
                  options={(classes.data ?? []).map((item) => ({
                    value: item.id,
                    label: `${item.subjectName} · ${item.schoolYear}`,
                  }))}
                  onChange={(classId) =>
                    setDocument((current) => ({
                      ...current,
                      classId,
                      settings: {
                        ...current.settings,
                        quarter: undefined,
                        classRecordItemId: null,
                      },
                    }))
                  }
                  disabled={saving || Boolean(document.pendingSave)}
                />
              )}
              {assessmentId && (
                <Text style={{ color: theme.muted }}>
                  Class is fixed after creation. Create a separate assessment to
                  use another class.
                </Text>
              )}
              <AssessmentSettingsFields
                value={document.settings}
                periods={periods}
                classId={document.classId}
                disabled={Boolean(
                  saving ||
                  conflict ||
                  document.pendingSave ||
                  (assessmentId && !canPrepare),
                )}
                onChange={(settings) =>
                  setDocument((current) => ({ ...current, settings }))
                }
              />
              {document.settings.type === "file_upload" && (
                <View style={{ gap: 8 }}>
                  <Text>
                    Teacher attachment:{" "}
                    {document.settings.teacherAttachmentFileId
                      ? (detail.data?.teacherAttachmentFile?.originalName ??
                        document.settings.teacherAttachmentFileId)
                      : "None"}
                  </Text>
                  <Action
                    disabled={readonly}
                    onPress={() => void upload("teacher-attachment")}
                  >
                    Upload teacher attachment
                  </Action>
                  {document.settings.teacherAttachmentFileId && (
                    <Action
                      disabled={readonly}
                      onPress={() =>
                        setDocument((current) => ({
                          ...current,
                          settings: {
                            ...current.settings,
                            teacherAttachmentFileId: null,
                          },
                        }))
                      }
                    >
                      Remove teacher attachment
                    </Action>
                  )}
                  <Text>
                    Rubric source:{" "}
                    {document.settings.rubricSourceFileId
                      ? (detail.data?.rubricSourceFile?.originalName ??
                        document.settings.rubricSourceFileId)
                      : "None"}
                  </Text>
                  <Action
                    disabled={readonly}
                    onPress={() => void upload("rubric-source")}
                  >
                    Upload rubric source
                  </Action>
                  {document.settings.rubricSourceFileId && (
                    <Action
                      disabled={readonly}
                      onPress={() =>
                        setDocument((current) => ({
                          ...current,
                          settings: {
                            ...current.settings,
                            rubricSourceFileId: null,
                          },
                        }))
                      }
                    >
                      Remove rubric source
                    </Action>
                  )}
                </View>
              )}
            </>
          )}
          {tab === "Questions" && (
            <>
              <Text style={{ color: theme.muted }}>
                {document.questions.length} questions ·{" "}
                {document.questions.reduce(
                  (sum, question) => sum + question.points,
                  0,
                )}{" "}
                points
              </Text>
              {document.settings.type === "file_upload" ? (
                <Text style={{ color: theme.text }}>
                  This assessment collects files. Edit instructions, attachments
                  and rubric in Settings.
                </Text>
              ) : (
                <>
                  {document.questions.map((question, index) => (
                    <View
                      key={question.clientId}
                      style={{
                        backgroundColor: "white",
                        borderWidth: 1,
                        borderColor:
                          expanded === question.clientId
                            ? theme.red
                            : theme.border,
                        borderRadius: 12,
                        padding: 14,
                        gap: 12,
                      }}
                    >
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{
                          expanded: expanded === question.clientId,
                        }}
                        onPress={() =>
                          setExpanded(
                            expanded === question.clientId
                              ? null
                              : question.clientId,
                          )
                        }
                        style={{ minHeight: 44, gap: 6 }}
                      >
                        <Text style={{ color: theme.text, fontWeight: "700" }}>
                          {index + 1}.{" "}
                          {stripRichText(question.content) ||
                            "Untitled question"}
                        </Text>
                        <Text style={{ color: theme.muted }}>
                          {QUESTION_TYPES.find(
                            (type) => type.value === question.type,
                          )?.label ?? question.type}{" "}
                          · {question.points} points
                          {question.isRequired ? " · Required" : ""}
                        </Text>
                      </Pressable>
                      {expanded === question.clientId && (
                        <>
                          {!question.id && (
                            <Choices
                              label="Question type"
                              value={question.type}
                              options={QUESTION_TYPES}
                              disabled={questionsReadonly}
                              onChange={(type) =>
                                changeQuestion(question.clientId, {
                                  ...newQuestion(
                                    type as SupportedQuestionType,
                                    question.clientId,
                                  ),
                                  content: question.content,
                                  points: question.points,
                                })
                              }
                            />
                          )}
                          {question.id && (
                            <Text style={{ color: theme.muted }}>
                              Saved question type is fixed. Add a replacement
                              question to change its type.
                            </Text>
                          )}
                          <AssessmentRichTextEditor
                            label={`Question ${index + 1} prompt`}
                            value={question.content}
                            disabled={questionsReadonly}
                            onChange={(content) =>
                              changeQuestion(question.clientId, { content })
                            }
                          />
                          <QuestionImage
                            {...question}
                            url={question.imageUrl}
                          />
                          <Action
                            disabled={questionsReadonly}
                            onPress={() => void uploadImage(question)}
                          >
                            Add / replace question image
                          </Action>
                          {question.imageUrl && (
                            <>
                              <Field
                                label="Question image zoom (%)"
                                numeric
                                disabled={questionsReadonly}
                                value={String(question.imageZoom ?? 100)}
                                onChange={(text) =>
                                  changeQuestion(question.clientId, {
                                    imageZoom: Number(text),
                                  })
                                }
                              />
                              <Field
                                label="Question image horizontal position (%)"
                                numeric
                                disabled={questionsReadonly}
                                value={String(question.imagePositionX ?? 50)}
                                onChange={(text) =>
                                  changeQuestion(question.clientId, {
                                    imagePositionX: Number(text),
                                  })
                                }
                              />
                              <Field
                                label="Question image vertical position (%)"
                                numeric
                                disabled={questionsReadonly}
                                value={String(question.imagePositionY ?? 50)}
                                onChange={(text) =>
                                  changeQuestion(question.clientId, {
                                    imagePositionY: Number(text),
                                  })
                                }
                              />
                              <Toggle
                                label="Expanded question image"
                                value={question.imageDisplayMode === "expanded"}
                                disabled={questionsReadonly}
                                onChange={(expanded) =>
                                  changeQuestion(question.clientId, {
                                    imageDisplayMode: expanded
                                      ? "expanded"
                                      : "default",
                                  })
                                }
                              />
                              <Action
                                disabled={questionsReadonly}
                                onPress={() =>
                                  changeQuestion(question.clientId, {
                                    imageUrl: "",
                                  })
                                }
                              >
                                Remove question image
                              </Action>
                            </>
                          )}
                          {(question.options ?? []).map(
                            (option, optionIndex) => (
                              <View
                                key={option.id ?? optionIndex}
                                style={{ gap: 6 }}
                              >
                                <OptionTextEditor
                                  questionType={question.type}
                                  label={
                                    question.type === "fill_blank"
                                      ? `Accepted answer ${optionIndex + 1}`
                                      : `Choice ${optionIndex + 1}`
                                  }
                                  value={option.text}
                                  disabled={questionsReadonly}
                                  onChange={(text) =>
                                    changeQuestion(question.clientId, {
                                      options: question.options!.map(
                                        (item, i) =>
                                          i === optionIndex
                                            ? { ...item, text }
                                            : item,
                                      ),
                                    })
                                  }
                                />
                                <QuestionImage
                                  {...option}
                                  url={option.imageUrl}
                                />
                                <Action
                                  disabled={questionsReadonly}
                                  onPress={() =>
                                    void uploadImage(question, optionIndex)
                                  }
                                >
                                  Add / replace choice image
                                </Action>
                                <Toggle
                                  label={`Correct answer ${optionIndex + 1}`}
                                  value={option.isCorrect}
                                  disabled={
                                    questionsReadonly ||
                                    question.type === "fill_blank"
                                  }
                                  onChange={(isCorrect) =>
                                    changeQuestion(question.clientId, {
                                      options: question.options!.map(
                                        (item, i) =>
                                          i === optionIndex
                                            ? { ...item, isCorrect }
                                            : question.type !==
                                                  "multiple_select" && isCorrect
                                              ? { ...item, isCorrect: false }
                                              : item,
                                      ),
                                    })
                                  }
                                />
                                {question.type !== "true_false" && (
                                  <Action
                                    disabled={questionsReadonly}
                                    onPress={() =>
                                      changeQuestion(question.clientId, {
                                        options: question.options!.filter(
                                          (_, i) => i !== optionIndex,
                                        ),
                                      })
                                    }
                                  >
                                    Remove choice
                                  </Action>
                                )}
                              </View>
                            ),
                          )}
                          {question.options &&
                            question.type !== "true_false" && (
                              <Action
                                disabled={questionsReadonly}
                                onPress={() =>
                                  changeQuestion(question.clientId, {
                                    options: [
                                      ...question.options!,
                                      {
                                        text: "",
                                        isCorrect:
                                          question.type === "fill_blank",
                                        order: question.options!.length + 1,
                                      },
                                    ],
                                  })
                                }
                              >
                                Add choice / accepted answer
                              </Action>
                            )}
                          <Field
                            label="Points"
                            numeric
                            value={String(question.points)}
                            disabled={questionsReadonly}
                            onChange={(points) =>
                              changeQuestion(question.clientId, {
                                points: Number(points),
                              })
                            }
                          />
                          <Toggle
                            label="Required"
                            value={question.isRequired}
                            disabled={questionsReadonly}
                            onChange={(isRequired) =>
                              changeQuestion(question.clientId, { isRequired })
                            }
                          />
                          <AssessmentRichTextEditor
                            label="Explanation"
                            value={question.explanation ?? ""}
                            disabled={questionsReadonly}
                            onChange={(explanation) =>
                              changeQuestion(question.clientId, { explanation })
                            }
                          />
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Question actions"
                            accessibilityState={{
                              expanded: questionMenu === question.clientId,
                            }}
                            style={buttonStyle}
                            onPress={() =>
                              setQuestionMenu(
                                questionMenu === question.clientId
                                  ? null
                                  : question.clientId,
                              )
                            }
                          >
                            <Text style={{ color: theme.red }}>
                              Question actions ···
                            </Text>
                          </Pressable>
                          {questionMenu === question.clientId && (
                            <View
                              style={{
                                flexDirection: "row",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              <Action
                                disabled={questionsReadonly}
                                onPress={() => {
                                  const copy = {
                                    ...question,
                                    id: undefined,
                                    clientId: Crypto.randomUUID(),
                                    options: question.options?.map(
                                      (option) => ({
                                        ...option,
                                        id: undefined,
                                      }),
                                    ),
                                    deletedOptionIds: [],
                                  };
                                  setDocument((current) => ({
                                    ...current,
                                    questions: [
                                      ...current.questions.slice(0, index + 1),
                                      copy,
                                      ...current.questions.slice(index + 1),
                                    ],
                                  }));
                                  setExpanded(copy.clientId);
                                }}
                              >
                                Duplicate
                              </Action>
                              {[-1, 1].map((direction) => (
                                <Action
                                  key={direction}
                                  disabled={
                                    questionsReadonly ||
                                    index + direction < 0 ||
                                    index + direction >=
                                      document.questions.length
                                  }
                                  onPress={() =>
                                    setDocument((current) => {
                                      const questions = [...current.questions];
                                      [
                                        questions[index],
                                        questions[index + direction],
                                      ] = [
                                        questions[index + direction],
                                        questions[index],
                                      ];
                                      return { ...current, questions };
                                    })
                                  }
                                >
                                  {direction < 0 ? "Move up" : "Move down"}
                                </Action>
                              ))}
                              <Action
                                disabled={questionsReadonly}
                                onPress={() =>
                                  Alert.alert(
                                    "Delete question?",
                                    "This change takes effect when you save.",
                                    [
                                      { text: "Cancel", style: "cancel" },
                                      {
                                        text: "Delete",
                                        style: "destructive",
                                        onPress: () =>
                                          setDocument((current) => ({
                                            ...current,
                                            questions: current.questions.filter(
                                              (item) =>
                                                item.clientId !==
                                                question.clientId,
                                            ),
                                            deletedQuestionIds: question.id
                                              ? [
                                                  ...current.deletedQuestionIds,
                                                  question.id,
                                                ]
                                              : current.deletedQuestionIds,
                                          })),
                                      },
                                    ],
                                  )
                                }
                              >
                                Delete
                              </Action>
                            </View>
                          )}
                        </>
                      )}
                    </View>
                  ))}
                  <Action
                    disabled={questionsReadonly}
                    onPress={() => {
                      const question = newQuestion(
                        "multiple_choice",
                        Crypto.randomUUID(),
                      );
                      setDocument((current) => ({
                        ...current,
                        questions: [...current.questions, question],
                      }));
                      setExpanded(question.clientId);
                    }}
                  >
                    Add question
                  </Action>
                </>
              )}
            </>
          )}
          {tab === "Preview" && (
            <View style={{ gap: 18 }}>
              <Text style={{ color: theme.muted }}>
                Student preview · no attempt will be created
              </Text>
              <Text
                style={{ fontSize: 24, fontWeight: "700", color: theme.text }}
              >
                {document.settings.title || "Untitled assessment"}
              </Text>
              <Content html={document.settings.description} />
              {document.settings.type === "file_upload" ? (
                <>
                  <Content html={document.settings.fileUploadInstructions} />
                  <Text>Upload your file</Text>
                </>
              ) : (
                document.questions.map((question, index) => (
                  <View
                    key={question.clientId}
                    style={{ gap: 12, paddingVertical: 12 }}
                  >
                    <Text style={{ color: theme.muted }}>
                      {index + 1} · {question.points} points
                      {question.isRequired ? " · Required" : ""}
                    </Text>
                    <Content html={question.content} />
                    <QuestionImage {...question} url={question.imageUrl} />
                    {["short_answer", "fill_blank"].includes(question.type) ? (
                      <View style={{ ...buttonStyle }}>
                        <Text style={{ color: theme.muted }}>Your answer</Text>
                      </View>
                    ) : (
                      question.options?.map((option, i) => (
                        <View key={option.id ?? i} style={{ ...buttonStyle }}>
                          <Content html={option.text} />
                          <QuestionImage {...option} url={option.imageUrl} />
                        </View>
                      ))
                    )}
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
        <View
          style={{
            padding: 12,
            borderTopWidth: 1,
            borderColor: theme.border,
            backgroundColor: "white",
            gap: 8,
          }}
        >
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Action
              disabled={!canPrepare || saving || conflict}
              onPress={() => void save("save")}
            >
              {document.pendingSave
                ? "Retry save"
                : document.isPublished
                  ? "Save changes"
                  : "Save draft"}
            </Action>
            {document.isPublished ? (
              <Action
                disabled={readonly}
                onPress={() =>
                  Alert.alert(
                    "Move to draft?",
                    "Students will no longer be able to start this assessment. Changes to protected questions remain restricted once attempts exist.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Move to draft",
                        onPress: () => void save("unpublish"),
                      },
                    ],
                  )
                }
              >
                Move to draft
              </Action>
            ) : (
              <Action
                disabled={!canRelease || readonly}
                onPress={() =>
                  Alert.alert(
                    "Ready to give?",
                    "All questions and settings will be checked before students can access this assessment.",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Publish", onPress: () => void save("publish") },
                    ],
                  )
                }
              >
                Ready to give
              </Action>
            )}
          </View>
          <Text style={{ color: theme.muted, fontSize: 12 }}>
            Saving and publication are separate. Incomplete questions can stay
            in a draft.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
