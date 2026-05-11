import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as ScreenCapture from "expo-screen-capture";
import {
  Alert,
  AppState,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { API_BASE_URL } from "../api/config";
import { useAssessmentDetail, useAssessmentSubmitMutation } from "../api/hooks";
import { peekAppError, toAppError } from "../api/http";
import { assessmentsApi } from "../api/services/assessments";
import { Card, Refreshable, ScreenScroll } from "../components/ui/primitives";
import type { RootStackParamList } from "../navigation/types";
import { studentDarkTheme as theme, stripRichText } from "../theme/studentDark";
import type { AssessmentAttempt, AssessmentQuestion, OngoingAttemptResult } from "../types/assessment";
import {
  DEFAULT_UPLOAD_MAX_BYTES,
  type AnswerValue,
  type UploadCandidate,
  buildAssessmentResponses,
  formatBytes,
  resolveAttemptTimer,
  resolveViolationState,
  restoreDraftResponses,
  validateUploadBundle,
} from "../utils/assessmentFlow";
import { resolveResponsiveLayout } from "../utils/responsive";

type Props = NativeStackScreenProps<RootStackParamList, "AssessmentTake">;

type UploadFile = UploadCandidate & {
  uri: string;
  mimeType?: string | null;
};

function getAttemptFiles(attempt?: AssessmentAttempt | null) {
  if (attempt?.submittedFiles?.length) {
    return attempt.submittedFiles.filter(Boolean);
  }

  return attempt?.submittedFile ? [attempt.submittedFile] : [];
}

function getAttemptTime(attempt: {
  submittedAt?: string;
  startedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}) {
  return new Date(
    attempt.submittedAt || attempt.updatedAt || attempt.startedAt || attempt.createdAt || 0,
  ).getTime();
}

function normalizeUploadName(name: string, fallback: string) {
  return name.trim().replace(/[^\w.\-() ]+/g, "_") || fallback;
}

function buildUploadRules(assessment?: {
  maxUploadSizeBytes?: number | null;
  allowedUploadExtensions?: string[] | null;
  allowedUploadMimeTypes?: string[] | null;
}) {
  return {
    maxBytes: Math.min(assessment?.maxUploadSizeBytes ?? DEFAULT_UPLOAD_MAX_BYTES, DEFAULT_UPLOAD_MAX_BYTES),
    allowedExtensions: assessment?.allowedUploadExtensions?.length
      ? [...assessment.allowedUploadExtensions, "zip"]
      : ["pdf", "doc", "docx", "png", "jpg", "jpeg", "webp", "zip"],
    allowedMimeTypes: assessment?.allowedUploadMimeTypes?.length
      ? [...assessment.allowedUploadMimeTypes, "application/zip", "application/x-zip-compressed"]
      : [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "image/png",
          "image/jpeg",
          "image/webp",
          "application/zip",
          "application/x-zip-compressed",
        ],
  };
}

function resolveMediaUrl(value?: string | null) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value) || value.startsWith("file://")) {
    return value;
  }

  const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
  return `${apiOrigin}${value.startsWith("/") ? value : `/${value}`}`;
}

function isImageFile(file?: { mimeType?: string | null; originalName?: string | null } | null) {
  const mimeType = (file?.mimeType || "").toLowerCase();
  if (mimeType.startsWith("image/")) {
    return true;
  }

  const extension = (file?.originalName || "").split(".").pop()?.toLowerCase();
  return ["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(extension || "");
}

function TimerBadge({ seconds, source }: { seconds: number | null; source: string }) {
  if (seconds === null) return null;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  const warning = seconds <= 60;
  return (
    <View
      style={{
        borderRadius: 999,
        backgroundColor: warning ? theme.redSoft : theme.active,
        borderWidth: 1,
        borderColor: warning ? "transparent" : theme.border,
        paddingHorizontal: 10,
        paddingVertical: 6,
      }}
    >
      <Text style={{ color: warning ? theme.red : theme.text, fontSize: 12, fontWeight: "900" }}>
        {minutes}:{String(remainder).padStart(2, "0")} {source === "server" ? "" : "local"}
      </Text>
    </View>
  );
}

function HeaderActionButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}) {
  const isSecondary = variant === "secondary";

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        borderRadius: 999,
        backgroundColor: isSecondary ? theme.active : theme.red,
        borderWidth: isSecondary ? 1 : 0,
        borderColor: isSecondary ? theme.border : "transparent",
        paddingHorizontal: 14,
        paddingVertical: 10,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <Text style={{ color: isSecondary ? theme.text : "#FFFFFF", fontSize: 11, fontWeight: "800" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function InlineActionButton({
  label,
  onPress,
  variant = "secondary",
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
}) {
  const isPrimary = variant === "primary";
  const isGhost = variant === "ghost";

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        borderRadius: 12,
        backgroundColor: isPrimary ? theme.red : isGhost ? theme.header : theme.active,
        borderWidth: isPrimary || isGhost ? 0 : 1,
        borderColor: theme.border,
        paddingHorizontal: 12,
        paddingVertical: 10,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <Text style={{ color: isPrimary ? "#FFFFFF" : theme.text, fontSize: 12, fontWeight: "800" }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function AssessmentTakeScreen({ route, navigation }: Props) {
  const { assessmentId } = route.params;
  const detailQuery = useAssessmentDetail(assessmentId);
  const submitMutation = useAssessmentSubmitMutation(assessmentId);
  const { width } = useWindowDimensions();
  const layout = resolveResponsiveLayout(width);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [attemptResult, setAttemptResult] = useState<OngoingAttemptResult | null>(null);
  const [attemptPreparationFailed, setAttemptPreparationFailed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expandedDropdownId, setExpandedDropdownId] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [timerNow, setTimerNow] = useState(Date.now());
  const [syncPaused, setSyncPaused] = useState(false);
  const leavingRef = useRef(false);
  const violationInFlightRef = useRef(false);
  const latestAnswersRef = useRef(answers);

  useEffect(() => {
    latestAnswersRef.current = answers;
  }, [answers]);

  const assessment = detailQuery.data;
  const questions = assessment?.questions ?? [];
  const assessmentType = String(assessment?.type || "");
  const isFileUploadAssessment = assessmentType === "file_upload";
  const attempt = attemptResult?.attempt;
  const strictMode = Boolean(attemptResult?.strictMode || assessment?.strictMode || attemptResult?.timedQuestionsEnabled);
  const timer = resolveAttemptTimer(
    {
      expiresAt: attemptResult?.expiresAt ?? attempt?.expiresAt,
      timeLimitMinutes: attemptResult?.timeLimitMinutes ?? assessment?.timeLimitMinutes,
      startedAt: attempt?.startedAt,
      createdAt: attempt?.createdAt,
    },
    timerNow,
  );
  const uploadRules = useMemo(() => buildUploadRules(assessment), [assessment]);
  const uploadedFiles = useMemo(() => getAttemptFiles(attempt), [attempt]);
  const uploadValidation = useMemo(
    () =>
      validateUploadBundle(
        uploadedFiles.map((file) => ({
          name: file.originalName || "submission-file",
          size: file.sizeBytes ?? 0,
          mimeType: file.mimeType ?? "application/octet-stream",
        })),
        uploadRules,
      ),
    [uploadedFiles, uploadRules],
  );

  const payload = useMemo(
    () => ({
      assessmentId,
      responses: buildAssessmentResponses(questions, answers),
      timeSpentSeconds: startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 1000)) : 1,
    }),
    [answers, assessmentId, questions, startedAt],
  );

  const saveProgress = useCallback(
    async (options?: { registerViolation?: boolean; questionIndex?: number }) => {
      if (!attempt?.id) return null;
      const nextResponses = buildAssessmentResponses(questions, latestAnswersRef.current);
      try {
        const updated = await assessmentsApi.updateAttemptProgress(attempt.id, {
          currentQuestionIndex: options?.questionIndex ?? currentIndex,
          responses: nextResponses,
          registerViolation: options?.registerViolation,
        });
        setAttemptResult((current) => (current ? { ...current, attempt: updated } : current));
        setSyncPaused(false);
        return updated;
      } catch (rawError) {
        setSyncPaused(true);
        setError(toAppError(rawError).message);
        return null;
      }
    },
    [attempt?.id, currentIndex, questions],
  );

  const registerViolation = useCallback(
    async (reason: string) => {
      if (!attempt?.id || violationInFlightRef.current || submitMutation.isPending) return;
      violationInFlightRef.current = true;
      const nextState = resolveViolationState(attempt.violationCount ?? 0);
      setStatus(
        nextState.locked
          ? "Third anti-cheat violation recorded. Backend may auto-submit this attempt."
          : `Anti-cheat violation ${nextState.nextCount}/3 recorded: ${reason}`,
      );
      const updated = await saveProgress({ registerViolation: true });
      if (updated?.isSubmitted || nextState.locked) {
        setError("This attempt was locked after repeated anti-cheat violations.");
      }
      violationInFlightRef.current = false;
    },
    [attempt?.id, attempt?.violationCount, saveProgress, submitMutation.isPending],
  );

  useEffect(() => {
    let active = true;
    const prepareAttempt = async () => {
      try {
        setAttemptPreparationFailed(false);
        setError("");
        setStatus("Preparing your attempt...");
        const ongoingAttempt = await assessmentsApi.getOngoingAttempt(assessmentId);
        const currentAttempt = ongoingAttempt ?? (await assessmentsApi.startAttempt(assessmentId));
        if (!active) return;
        setAttemptResult(currentAttempt);
        setStartedAt(
          currentAttempt?.attempt?.startedAt
            ? new Date(currentAttempt.attempt.startedAt).getTime()
            : Date.now(),
        );
        setAnswers(restoreDraftResponses(currentAttempt?.attempt?.draftResponses));
        setCurrentIndex(Math.max(0, currentAttempt?.attempt?.lastQuestionIndex ?? 0));
        setStatus("");
      } catch (rawError) {
        if (!active) return;
        setAttemptPreparationFailed(true);
        setError(toAppError(rawError).message);
        setStatus("");
      }
    };

    void prepareAttempt();

    return () => {
      active = false;
    };
  }, [assessmentId]);

  useEffect(() => {
    if (process.env.NODE_ENV === "test") {
      return undefined;
    }
    const interval = setInterval(() => setTimerNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "test" || !attempt?.id) return undefined;
    const timeout = setTimeout(() => {
      void saveProgress();
    }, 900);
    return () => clearTimeout(timeout);
  }, [answers, attempt?.id, currentIndex, saveProgress]);

  useEffect(() => {
    setExpandedDropdownId(null);
  }, [currentIndex]);

  useEffect(() => {
    void ScreenCapture.preventScreenCaptureAsync();
    const screenshotSubscription =
      typeof ScreenCapture.addScreenshotListener === "function"
        ? ScreenCapture.addScreenshotListener(() => {
            void registerViolation("screenshot attempt");
          })
        : null;

    return () => {
      screenshotSubscription?.remove();
      void ScreenCapture.allowScreenCaptureAsync();
    };
  }, [registerViolation]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") {
        void registerViolation("app left assessment screen");
      }
    });
    return () => subscription.remove();
  }, [registerViolation]);

  useEffect(() => {
    const beforeRemove =
      typeof navigation.addListener === "function"
        ? navigation.addListener("beforeRemove", (event) => {
            if (leavingRef.current) return;
            event.preventDefault();
            leavingRef.current = true;
            void saveProgress().finally(() => navigation.dispatch(event.data.action));
          })
        : () => undefined;
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (leavingRef.current) return false;
      leavingRef.current = true;
      void saveProgress().finally(() => navigation.goBack());
      return true;
    });
    return () => {
      beforeRemove();
      backHandler.remove();
    };
  }, [navigation, saveProgress]);

  const currentQuestion = questions[currentIndex] as AssessmentQuestion | undefined;
  const canGoPrevious = currentIndex > 0 && !strictMode;
  const canGoNext = currentIndex < questions.length - 1;
  const progress = questions.length ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const lockedByViolation = (attempt?.violationCount ?? 0) >= 3 || Boolean(attempt?.isSubmitted && !submitMutation.isPending);
  const paused = syncPaused || timer.secondsRemaining === 0 || lockedByViolation;

  const setQuestionAnswer = (questionId: string, value: AnswerValue) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const updateAttemptFiles = useCallback(
    (files: Array<{ id: string; originalName: string; mimeType: string; sizeBytes: number; uploadedAt?: string }>) => {
      setAttemptResult((current) => {
        if (!current?.attempt) return current;
        const latestFile = files[files.length - 1] ?? null;
        return {
          ...current,
          attempt: {
            ...current.attempt,
            submittedFiles: files,
            submittedFile: latestFile
              ? {
                  id: latestFile.id,
                  originalName: latestFile.originalName,
                  mimeType: latestFile.mimeType,
                  sizeBytes: latestFile.sizeBytes,
                  uploadedAt: latestFile.uploadedAt,
                }
              : null,
            submittedFileId: latestFile?.id ?? null,
            submittedFileOriginalName: latestFile?.originalName ?? null,
            submittedFileMimeType: latestFile?.mimeType ?? null,
            submittedFileSizeBytes: latestFile?.sizeBytes ?? null,
          },
        };
      });
    },
    [],
  );

  const uploadSubmissionFiles = useCallback(
    async (files: UploadFile[]) => {
      if (!files.length || !attempt?.id) return;

      try {
        setError("");
        setUploadingFiles(true);

        for (const file of files) {
          setStatus(`Uploading ${file.name}...`);
          const uploaded = await assessmentsApi.uploadSubmissionFile(assessmentId, {
            uri: file.uri,
            name: normalizeUploadName(file.name, "submission-file"),
            type: file.mimeType || "application/octet-stream",
          });
          updateAttemptFiles(uploaded.files ?? (uploaded.file ? [uploaded.file] : []));
        }

        setStatus(`${files.length} file${files.length === 1 ? "" : "s"} ready for submission.`);
      } catch (rawError) {
        setError(toAppError(rawError).message);
        setStatus("");
      } finally {
        setUploadingFiles(false);
      }
    },
    [assessmentId, attempt?.id, updateAttemptFiles],
  );

  const removeUploadedFile = useCallback(
    async (fileId: string) => {
      try {
        setError("");
        setStatus("Removing file...");
        const updated = await assessmentsApi.removeSubmissionFile(assessmentId, fileId);
        updateAttemptFiles(updated.files ?? []);
        setStatus("File removed from this draft.");
      } catch (rawError) {
        setError(toAppError(rawError).message);
        setStatus("");
      }
    },
    [assessmentId, updateAttemptFiles],
  );

  const pickDocuments = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
      type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    });
    if (result.canceled) return;
    await uploadSubmissionFiles(
      result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.name,
        size: asset.size,
        mimeType: asset.mimeType,
      })),
    );
  };

  const pickGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Gallery permission is required to attach images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (result.canceled) return;
    await uploadSubmissionFiles(
      result.assets.map((asset, index) => ({
        uri: asset.uri,
        name: asset.fileName || `gallery-${Date.now()}-${index + 1}.jpg`,
        size: asset.fileSize,
        mimeType: asset.mimeType || "image/jpeg",
      })),
    );
  };

  const captureCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Camera permission is required to capture a submission image.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    await uploadSubmissionFiles([
      {
        uri: asset.uri,
        name: asset.fileName || `camera-${Date.now()}.jpg`,
        size: asset.fileSize,
        mimeType: asset.mimeType || "image/jpeg",
      },
    ]);
  };

  const submitAssessment = async () => {
    if (!attempt?.id) {
      setError("This attempt is not ready yet.");
      return;
    }
    if (paused) {
      setError("The attempt is paused until the timer, network sync, or lock state is resolved.");
      return;
    }

    try {
      setError("");
      setStatus("Saving progress...");
      await saveProgress();

      if (isFileUploadAssessment) {
        if (!uploadValidation.ok) {
          setError(uploadValidation.reason);
          return;
        }
        if (uploadedFiles.length === 0) {
          setError("Please upload at least one file before submitting.");
          return;
        }
      }

      setStatus("Submitting assessment...");
      await submitMutation.mutateAsync(payload);
      const attempts = await assessmentsApi.getStudentAttempts(assessmentId);
      const latestAttempt = [...attempts]
        .filter((entry) => entry.isSubmitted !== false)
        .sort((left, right) => getAttemptTime(right) - getAttemptTime(left))[0];

      leavingRef.current = true;
      if (latestAttempt) {
        navigation.replace("AssessmentResults", { attemptId: latestAttempt.id, assessmentId } as never);
      } else {
        navigation.goBack();
      }
    } catch (rawError) {
      setError(toAppError(rawError).message);
      setStatus("");
    }
  };

  const unsubmitUpload = async () => {
    try {
      setError("");
      setStatus("Restoring submission to draft...");
      const updatedAttempt = await assessmentsApi.unsubmitFileUploadAssessment(assessmentId);
      setAttemptResult((current) =>
        current
          ? {
              ...current,
              attempt: {
                ...current.attempt,
                ...updatedAttempt,
              },
            }
          : current,
      );
      await detailQuery.refetch();
      setStatus("Submission restored to draft mode.");
    } catch (rawError) {
      setError(toAppError(rawError).message);
      setStatus("");
    }
  };

  const renderQuestionOptionCard = (
    question: AssessmentQuestion,
    option: NonNullable<AssessmentQuestion["options"]>[number],
    answer: AnswerValue | undefined,
  ) => {
    const selected = Array.isArray(answer) ? answer.includes(option.id) : answer === option.id;
    const optionImageUri = resolveMediaUrl(option.imageUrl);
    return (
      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: selected ? theme.amber : theme.border,
          backgroundColor: selected ? theme.amberSoft : theme.active,
          padding: 14,
        }}
      >
        <Text style={{ color: theme.text, fontSize: 13, fontWeight: "800", lineHeight: 19 }}>
          {stripRichText(option.text) || "Untitled option"}
        </Text>
        {optionImageUri ? (
          <Image
            source={{ uri: optionImageUri }}
            style={{ marginTop: 10, width: "100%", height: 168, borderRadius: 12, backgroundColor: theme.header }}
            resizeMode="cover"
          />
        ) : null}
      </View>
    );
  };

  const renderQuestion = () => {
    if (!currentQuestion) return null;
    const answer = answers[currentQuestion.id];
    const options = currentQuestion.options ?? [];
    const questionImageUri = resolveMediaUrl(currentQuestion.imageUrl);
    const prompt = stripRichText(currentQuestion.content || "Question content unavailable");
    const selectedDropdownOption = options.find((option) => option.id === answer);

    return (
      <Card style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, padding: 0 }}>
        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <View
              style={{
                borderRadius: 999,
                backgroundColor: theme.blueSoft,
                paddingHorizontal: 10,
                paddingVertical: 5,
              }}
            >
              <Text style={{ color: theme.blue, fontSize: 11, fontWeight: "800" }}>Q{currentIndex + 1}</Text>
            </View>
            <Text style={{ fontSize: 11, color: theme.muted, fontWeight: "700" }}>
              {String(currentQuestion.type || "question").replace(/_/g, " ")}
            </Text>
            <Text style={{ fontSize: 11, color: theme.muted }}>{currentQuestion.points} pts</Text>
          </View>

          <Text style={{ marginTop: 12, fontSize: 20, lineHeight: 29, fontWeight: "900", color: theme.text }}>
            {prompt}
          </Text>

          {questionImageUri ? (
            <Image
              source={{ uri: questionImageUri }}
              style={{ marginTop: 14, width: "100%", height: 220, borderRadius: 16, backgroundColor: theme.header }}
              resizeMode="cover"
            />
          ) : null}

          {currentQuestion.type === "dropdown" ? (
            <View style={{ marginTop: 16, gap: 10 }}>
              <Pressable
                disabled={paused}
                onPress={() => setExpandedDropdownId((current) => (current === currentQuestion.id ? null : currentQuestion.id))}
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.active,
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  opacity: paused ? 0.6 : 1,
                }}
              >
                <Text style={{ flex: 1, color: selectedDropdownOption ? theme.text : theme.muted, fontSize: 13, fontWeight: "700" }}>
                  {selectedDropdownOption ? stripRichText(selectedDropdownOption.text) : "Select an answer"}
                </Text>
                <MaterialCommunityIcons
                  name={expandedDropdownId === currentQuestion.id ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={theme.text}
                />
              </Pressable>

              {expandedDropdownId === currentQuestion.id ? (
                <View style={{ gap: 10 }}>
                  {options.map((option) => (
                    <Pressable
                      key={option.id}
                      disabled={paused}
                      onPress={() => {
                        setQuestionAnswer(currentQuestion.id, option.id);
                        setExpandedDropdownId(null);
                      }}
                    >
                      {renderQuestionOptionCard(currentQuestion, option, answer)}
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ) : options.length ? (
            <View style={{ marginTop: 16, gap: 10 }}>
              {options.map((option) => (
                <Pressable
                  key={option.id}
                  disabled={paused}
                  onPress={() => {
                    if (currentQuestion.type === "multiple_select") {
                      const activeSelections = new Set((answers[currentQuestion.id] as string[] | undefined) ?? []);
                      if (activeSelections.has(option.id)) activeSelections.delete(option.id);
                      else activeSelections.add(option.id);
                      setQuestionAnswer(currentQuestion.id, [...activeSelections]);
                      return;
                    }
                    setQuestionAnswer(currentQuestion.id, option.id);
                  }}
                  style={{ opacity: paused ? 0.65 : 1 }}
                >
                  {renderQuestionOptionCard(currentQuestion, option, answer)}
                </Pressable>
              ))}
            </View>
          ) : (
            <TextInput
              multiline
              value={(answer as string | undefined) || ""}
              onChangeText={(value) => setQuestionAnswer(currentQuestion.id, value)}
              placeholder="Write your answer here..."
              placeholderTextColor={theme.muted}
              editable={!paused}
              contextMenuHidden
              style={{
                minHeight: currentQuestion.type === "essay" ? 180 : 130,
                marginTop: 16,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.active,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: theme.text,
                textAlignVertical: "top",
              }}
            />
          )}
        </View>
      </Card>
    );
  };

  const headerUploadActionLabel = attempt?.isSubmitted && !attempt?.isReturned
    ? "Unsubmit"
    : submitMutation.isPending
      ? "Submitting"
      : "Submit";
  const headerUploadActionVariant = attempt?.isSubmitted && !attempt?.isReturned ? "secondary" : "primary";
  const headerUploadActionDisabled =
    submitMutation.isPending ||
    !attempt ||
    paused ||
    (attempt.isSubmitted ? Boolean(attempt.isReturned) : !uploadValidation.ok);
  const questionProgressValue = isFileUploadAssessment
    ? attempt?.isSubmitted
      ? 100
      : uploadedFiles.length > 0
        ? 72
        : 18
    : progress;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScreenScroll
        backgroundColor={theme.bg}
        refreshControl={
          <Refreshable
            refreshing={detailQuery.isRefetching || submitMutation.isPending || status === "Preparing your attempt..."}
            onRefresh={() => {
              void detailQuery.refetch();
            }}
          />
        }
      >
        <View style={{ backgroundColor: theme.header, borderBottomWidth: 1, borderBottomColor: theme.border }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 44, paddingBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Pressable
                onPress={() => navigation.goBack()}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: theme.active,
                }}
              >
                <MaterialCommunityIcons name="chevron-left" size={20} color={theme.text} />
              </Pressable>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: theme.text, fontSize: 12, fontWeight: "700" }}>
                  {isFileUploadAssessment ? "Upload workspace" : "Assessment taker"}
                </Text>
                <Text numberOfLines={2} style={{ marginTop: 4, color: theme.text, fontSize: 26, lineHeight: 32, fontWeight: "800" }}>
                  {assessment?.title || "Loading..."}
                </Text>
              </View>

              {isFileUploadAssessment ? (
                <HeaderActionButton
                  label={headerUploadActionLabel}
                  variant={headerUploadActionVariant}
                  disabled={headerUploadActionDisabled}
                  onPress={() =>
                    void (attempt?.isSubmitted && !attempt?.isReturned ? unsubmitUpload() : submitAssessment())
                  }
                />
              ) : (
                <TimerBadge seconds={timer.secondsRemaining} source={timer.source} />
              )}
            </View>

            <Text style={{ marginTop: 12, color: theme.muted, fontSize: 12, lineHeight: 18 }}>
              {isFileUploadAssessment
                ? "Attach your work, review every file, then submit when everything is complete."
                : "One question at a time. Drafts sync as you answer, and focus changes are recorded."}
            </Text>

            <View style={{ marginTop: 14, height: 8, borderRadius: 999, backgroundColor: theme.active, overflow: "hidden" }}>
              <View
                style={{
                  width: `${Math.max(0, Math.min(100, questionProgressValue))}%`,
                  height: "100%",
                  borderRadius: 999,
                  backgroundColor: theme.amber,
                }}
              />
            </View>
          </View>
        </View>

        <View
          style={{
            width: "100%",
            maxWidth: layout.contentMaxWidth,
            alignSelf: "center",
            paddingHorizontal: layout.horizontalPadding,
            marginTop: 18,
            gap: layout.cardGap,
          }}
        >
          {attemptPreparationFailed ? (
            <Card style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}>
              <Text style={{ fontSize: 14, fontWeight: "800", color: theme.text }}>Unable to prepare this attempt</Text>
              <Text style={{ marginTop: 8, fontSize: 12, lineHeight: 18, color: theme.muted }}>
                {error || "The assessment attempt could not be prepared right now."}
              </Text>
            </Card>
          ) : null}

          {paused && !attemptPreparationFailed ? (
            <View style={{ borderRadius: 18, backgroundColor: theme.amberSoft, padding: 12 }}>
              <Text style={{ color: theme.amber, fontSize: 12, fontWeight: "800" }}>
                {timer.secondsRemaining === 0
                  ? "Timer ended. Sync with the backend before continuing."
                  : lockedByViolation
                    ? "This attempt is locked or already submitted."
                    : "Network sync paused. Your local draft is kept until the backend accepts the save."}
              </Text>
            </View>
          ) : null}

          {isFileUploadAssessment ? (
            <Card style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}>
              <Text style={{ fontSize: 18, fontWeight: "900", color: theme.text }}>Upload your work</Text>
              <Text style={{ marginTop: 8, color: theme.subtext, fontSize: 12, lineHeight: 18 }}>
                {stripRichText(assessment?.fileUploadInstructions) ||
                  "Attach images, PDFs, or documents. You can add or remove files before you submit."}
              </Text>
              <Text style={{ marginTop: 8, color: theme.muted, fontSize: 11 }}>
                Limit: {formatBytes(uploadRules.maxBytes)} total
              </Text>

              {assessment?.teacherAttachmentFile ? (
                <View style={{ marginTop: 14, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.active, padding: 12 }}>
                  <Text style={{ color: theme.muted, fontSize: 11, fontWeight: "800" }}>REFERENCE MATERIAL</Text>
                  <Text style={{ marginTop: 8, color: theme.text, fontSize: 13, fontWeight: "800" }}>
                    {assessment.teacherAttachmentFile.originalName || "Teacher attachment"}
                  </Text>
                  <Text style={{ marginTop: 2, color: theme.muted, fontSize: 11 }}>
                    {formatBytes(assessment.teacherAttachmentFile.sizeBytes ?? 0)} • {assessment.teacherAttachmentFile.mimeType || "file"}
                  </Text>
                  <View style={{ marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {isImageFile(assessment.teacherAttachmentFile) ? (
                      <InlineActionButton
                        label="Open"
                        variant="ghost"
                        onPress={() =>
                          void assessmentsApi.openTeacherAttachment(
                            assessmentId,
                            assessment.teacherAttachmentFile?.originalName || "teacher-attachment",
                          ).catch((rawError) => setError(toAppError(rawError).message))
                        }
                      />
                    ) : null}
                    <InlineActionButton
                      label="Download"
                      onPress={() =>
                        void assessmentsApi.downloadTeacherAttachment(
                          assessmentId,
                          assessment.teacherAttachmentFile?.originalName || "teacher-attachment",
                        ).catch((rawError) => setError(toAppError(rawError).message))
                      }
                    />
                  </View>
                </View>
              ) : null}

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
                {[
                  { label: "Camera", icon: "camera-outline" as const, onPress: captureCamera },
                  { label: "Gallery", icon: "image-multiple-outline" as const, onPress: pickGallery },
                  { label: "PDF / Docs", icon: "file-document-outline" as const, onPress: pickDocuments },
                ].map((item) => (
                  <Pressable
                    key={item.label}
                    disabled={uploadingFiles || paused}
                    onPress={() => void item.onPress()}
                    style={{
                      borderRadius: 14,
                      backgroundColor: theme.active,
                      paddingHorizontal: 12,
                      paddingVertical: 11,
                      flexDirection: "row",
                      gap: 7,
                      alignItems: "center",
                      opacity: uploadingFiles || paused ? 0.55 : 1,
                    }}
                  >
                    <MaterialCommunityIcons name={item.icon} size={16} color={theme.amber} />
                    <Text style={{ color: theme.text, fontSize: 12, fontWeight: "800" }}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>

              {uploadedFiles.length ? (
                <View style={{ marginTop: 14, gap: 8 }}>
                  {uploadedFiles.map((file, index) => (
                    <View
                      key={`${file.id}-${index}`}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        borderRadius: 12,
                        backgroundColor: theme.active,
                        padding: 10,
                      }}
                    >
                      <MaterialCommunityIcons name="paperclip" size={16} color={theme.blue} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={{ color: theme.text, fontSize: 12, fontWeight: "800" }}>
                          {file.originalName || "Attachment"}
                        </Text>
                        <Text style={{ marginTop: 2, color: theme.muted, fontSize: 10 }}>
                          {formatBytes(file.sizeBytes ?? 0)}
                        </Text>
                      </View>
                      {attempt?.id ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          {isImageFile(file) ? (
                            <Pressable
                              onPress={() =>
                                void assessmentsApi.openAttemptSubmissionAttachmentFile(
                                  attempt.id,
                                  file.id,
                                  file.originalName || "submission-file",
                                ).catch((rawError) => setError(toAppError(rawError).message))
                              }
                            >
                              <MaterialCommunityIcons name="open-in-new" size={16} color={theme.text} />
                            </Pressable>
                          ) : null}
                          <Pressable
                            onPress={() =>
                              void assessmentsApi.downloadAttemptSubmissionAttachmentFile(
                                attempt.id,
                                file.id,
                                file.originalName || "submission-file",
                              ).catch((rawError) => setError(toAppError(rawError).message))
                            }
                          >
                            <MaterialCommunityIcons name="download" size={16} color={theme.text} />
                          </Pressable>
                          {!attempt.isSubmitted ? (
                            <Pressable onPress={() => void removeUploadedFile(file.id)}>
                              <MaterialCommunityIcons name="close" size={16} color={theme.muted} />
                            </Pressable>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  ))}
                  {!uploadValidation.ok ? (
                    <Text style={{ color: theme.red, fontSize: 12, fontWeight: "800" }}>{uploadValidation.reason}</Text>
                  ) : (
                    <Text style={{ color: theme.green, fontSize: 12, fontWeight: "800" }}>
                      Ready to submit {uploadedFiles.length === 1 ? "1 file" : `${uploadedFiles.length} files`}.
                    </Text>
                  )}
                </View>
              ) : null}
            </Card>
          ) : (
            renderQuestion()
          )}

          {status ? (
            <View style={{ borderRadius: 16, backgroundColor: theme.blueSoft, padding: 12 }}>
              <Text style={{ color: theme.blue, fontSize: 12, fontWeight: "800" }}>{status}</Text>
            </View>
          ) : null}

          {!!error && !attemptPreparationFailed ? (
            <View style={{ borderRadius: 16, backgroundColor: theme.redSoft, padding: 12 }}>
              <Text style={{ color: theme.red, fontSize: 12, fontWeight: "800" }}>{peekAppError(error).message}</Text>
            </View>
          ) : null}

          {!isFileUploadAssessment && !attemptPreparationFailed ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                disabled={!canGoPrevious}
                onPress={() => {
                  if (!canGoPrevious) {
                    Alert.alert("Locked", "This attempt cannot move backward while strict or timed mode is active.");
                    return;
                  }
                  const nextIndex = Math.max(0, currentIndex - 1);
                  setCurrentIndex(nextIndex);
                  void saveProgress({ questionIndex: nextIndex });
                }}
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.active,
                  paddingHorizontal: 16,
                  justifyContent: "center",
                  opacity: canGoPrevious ? 1 : 0.45,
                }}
              >
                <MaterialCommunityIcons name="chevron-left" size={22} color={theme.text} />
              </Pressable>
              <Pressable
                onPress={() => {
                  if (canGoNext) {
                    const nextIndex = currentIndex + 1;
                    setCurrentIndex(nextIndex);
                    void saveProgress({ questionIndex: nextIndex });
                    return;
                  }
                  void submitAssessment();
                }}
                disabled={submitMutation.isPending || !attempt || paused}
                style={{
                  flex: 1,
                  borderRadius: 18,
                  backgroundColor: theme.red,
                  alignItems: "center",
                  paddingVertical: 15,
                  opacity: submitMutation.isPending || !attempt || paused ? 0.65 : 1,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "900" }}>
                  {canGoNext ? "Save & Next" : submitMutation.isPending ? "Submitting..." : "Submit Assessment"}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {isFileUploadAssessment && !attemptPreparationFailed ? (
            <Pressable
              onPress={() =>
                void (attempt?.isSubmitted && !attempt?.isReturned ? unsubmitUpload() : submitAssessment())
              }
              disabled={headerUploadActionDisabled}
              style={{
                borderRadius: 18,
                backgroundColor: headerUploadActionVariant === "secondary" ? theme.active : theme.red,
                borderWidth: headerUploadActionVariant === "secondary" ? 1 : 0,
                borderColor: headerUploadActionVariant === "secondary" ? theme.border : "transparent",
                alignItems: "center",
                paddingVertical: 15,
                opacity: headerUploadActionDisabled ? 0.65 : 1,
              }}
            >
              <Text
                style={{
                  color: headerUploadActionVariant === "secondary" ? theme.text : "#FFFFFF",
                  fontSize: 14,
                  fontWeight: "900",
                }}
              >
                {attempt?.isSubmitted && !attempt?.isReturned
                  ? "Unsubmit"
                  : submitMutation.isPending
                    ? "Submitting..."
                    : "Upload & Submit"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScreenScroll>
    </KeyboardAvoidingView>
  );
}
