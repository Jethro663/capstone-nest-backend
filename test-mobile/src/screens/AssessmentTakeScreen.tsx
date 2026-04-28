import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as ScreenCapture from "expo-screen-capture";
import {
  Alert,
  AppState,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { assessmentsApi } from "../api/services/assessments";
import { useAssessmentDetail, useAssessmentSubmitMutation } from "../api/hooks";
import { peekAppError, toAppError } from "../api/http";
import { Card, GradientHeader, Pill, ProgressBar, Refreshable, ScreenScroll } from "../components/ui/primitives";
import type { RootStackParamList } from "../navigation/types";
import { colors, gradients } from "../theme/tokens";
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

async function createUploadArtifact(files: UploadFile[], assessmentId: string) {
  if (files.length === 1) {
    const file = files[0];
    return {
      uri: file.uri,
      name: normalizeUploadName(file.name, "submission-file"),
      type: file.mimeType || "application/octet-stream",
    };
  }

  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  await Promise.all(
    files.map(async (file, index) => {
      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      zip.file(normalizeUploadName(file.name, `submission-${index + 1}`), base64, { base64: true });
    }),
  );
  zip.file(
    "manifest.txt",
    files
      .map((file, index) => `${index + 1}. ${file.name} (${file.mimeType || "unknown"}, ${formatBytes(file.size ?? 0)})`)
      .join("\n"),
  );

  const bundleBase64 = await zip.generateAsync({ type: "base64", compression: "DEFLATE" });
  const bundleUri = `${FileSystem.cacheDirectory ?? ""}assessment-${assessmentId}-${Date.now()}.zip`;
  await FileSystem.writeAsStringAsync(bundleUri, bundleBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return {
    uri: bundleUri,
    name: `assessment-${assessmentId}-submission.zip`,
    type: "application/zip",
  };
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

function TimerBadge({ seconds, source }: { seconds: number | null; source: string }) {
  if (seconds === null) return null;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  const warning = seconds <= 60;
  return (
    <View style={{ borderRadius: 999, backgroundColor: warning ? colors.paleRed : "rgba(255,255,255,0.18)", paddingHorizontal: 10, paddingVertical: 6 }}>
      <Text style={{ color: warning ? colors.red : colors.white, fontSize: 12, fontWeight: "900" }}>
        {minutes}:{String(remainder).padStart(2, "0")} {source === "server" ? "" : "local"}
      </Text>
    </View>
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
  const [selectedFiles, setSelectedFiles] = useState<UploadFile[]>([]);
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
  const uploadValidation = useMemo(
    () => validateUploadBundle(selectedFiles, uploadRules),
    [selectedFiles, uploadRules],
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
    if (!attempt?.id) return undefined;
    const timeout = setTimeout(() => {
      void saveProgress();
    }, 900);
    return () => clearTimeout(timeout);
  }, [answers, attempt?.id, currentIndex, saveProgress]);

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

  const pickDocuments = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
      type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    });
    if (result.canceled) return;
    setSelectedFiles((current) => [
      ...current,
      ...result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.name,
        size: asset.size,
        mimeType: asset.mimeType,
      })),
    ]);
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
    setSelectedFiles((current) => [
      ...current,
      ...result.assets.map((asset, index) => ({
        uri: asset.uri,
        name: asset.fileName || `gallery-${Date.now()}-${index + 1}.jpg`,
        size: asset.fileSize,
        mimeType: asset.mimeType || "image/jpeg",
      })),
    ]);
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
    setSelectedFiles((current) => [
      ...current,
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
        setStatus(selectedFiles.length > 1 ? "Bundling files..." : "Preparing file...");
        const uploadArtifact = await createUploadArtifact(selectedFiles, assessmentId);
        setStatus("Uploading submission...");
        await assessmentsApi.uploadSubmissionFile(assessmentId, uploadArtifact);
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

  const renderQuestion = () => {
    if (!currentQuestion) return null;
    const answer = answers[currentQuestion.id];
    const options = currentQuestion.options ?? [];

    return (
      <Card style={{ backgroundColor: "#111827", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pill label={`Q${currentIndex + 1}`} backgroundColor="rgba(96,195,245,0.16)" color={colors.blue} />
          <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.62)" }}>{currentQuestion.points} pts</Text>
        </View>
        <Text style={{ marginTop: 12, fontSize: 18, lineHeight: 25, fontWeight: "900", color: colors.white }}>
          {currentQuestion.content}
        </Text>

        {options.length ? (
          <View style={{ marginTop: 14, gap: 10 }}>
            {options.map((option) => {
              const selected = Array.isArray(answer) ? answer.includes(option.id) : answer === option.id;
              return (
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
                  style={{
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: selected ? colors.amber : "rgba(255,255,255,0.1)",
                    backgroundColor: selected ? "rgba(255,184,48,0.16)" : "rgba(255,255,255,0.05)",
                    padding: 14,
                  }}
                >
                  <Text style={{ color: selected ? colors.amber : "rgba(255,255,255,0.84)", fontWeight: "800" }}>
                    {option.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <TextInput
            multiline
            value={(answer as string | undefined) || ""}
            onChangeText={(value) => setQuestionAnswer(currentQuestion.id, value)}
            placeholder="Write your answer here..."
            placeholderTextColor="rgba(255,255,255,0.35)"
            editable={!paused}
            contextMenuHidden
            style={{
              minHeight: currentQuestion.type === "essay" ? 180 : 130,
              marginTop: 14,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.1)",
              backgroundColor: "rgba(255,255,255,0.05)",
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: colors.white,
              textAlignVertical: "top",
            }}
          />
        )}
      </Card>
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScreenScroll
        backgroundColor="#0F1115"
        refreshControl={
          <Refreshable
            refreshing={detailQuery.isRefetching || submitMutation.isPending || status === "Preparing your attempt..."}
            onRefresh={() => {
              void detailQuery.refetch();
            }}
          />
        }
      >
        <GradientHeader
          colors={gradients.assessments}
          eyebrow="Assessment"
          title={assessment?.title || "Loading..."}
          rightContent={<TimerBadge seconds={timer.secondsRemaining} source={timer.source} />}
        >
          <Text style={{ marginTop: 12, color: "rgba(255,255,255,0.86)", fontSize: 12 }}>
            One question at a time. Drafts sync as you answer, and focus changes are recorded.
          </Text>
          <View style={{ marginTop: 14 }}>
            <ProgressBar value={isFileUploadAssessment ? (selectedFiles.length ? 100 : 20) : progress} color={colors.amber} trackColor="rgba(255,255,255,0.22)" />
          </View>
        </GradientHeader>

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
            <Card>
              <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>Unable to prepare this attempt</Text>
              <Text style={{ marginTop: 8, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
                {error || "The assessment attempt could not be prepared right now."}
              </Text>
            </Card>
          ) : null}

          {paused && !attemptPreparationFailed ? (
            <View style={{ borderRadius: 18, backgroundColor: colors.paleAmber, padding: 12 }}>
              <Text style={{ color: colors.orange, fontSize: 12, fontWeight: "800" }}>
                {timer.secondsRemaining === 0
                  ? "Timer ended. Sync with the backend before continuing."
                  : lockedByViolation
                    ? "This attempt is locked or already submitted."
                    : "Network sync paused. Your local draft is kept until the backend accepts the save."}
              </Text>
            </View>
          ) : null}

          {isFileUploadAssessment ? (
            <Card style={{ backgroundColor: "#111827", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
              <Text style={{ fontSize: 18, fontWeight: "900", color: colors.white }}>Upload your work</Text>
              <Text style={{ marginTop: 8, color: "rgba(255,255,255,0.68)", fontSize: 12, lineHeight: 18 }}>
                {assessment?.fileUploadInstructions || "Attach images, PDFs, or documents. Multiple files are bundled into one submission."}
              </Text>
              <Text style={{ marginTop: 8, color: "rgba(255,255,255,0.52)", fontSize: 11 }}>
                Limit: {formatBytes(uploadRules.maxBytes)} total
              </Text>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
                {[
                  { label: "Camera", icon: "camera-outline" as const, onPress: captureCamera },
                  { label: "Gallery", icon: "image-multiple-outline" as const, onPress: pickGallery },
                  { label: "PDF / Docs", icon: "file-document-outline" as const, onPress: pickDocuments },
                ].map((item) => (
                  <Pressable
                    key={item.label}
                    onPress={() => void item.onPress()}
                    style={{ borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 12, paddingVertical: 11, flexDirection: "row", gap: 7, alignItems: "center" }}
                  >
                    <MaterialCommunityIcons name={item.icon} size={16} color={colors.amber} />
                    <Text style={{ color: colors.white, fontSize: 12, fontWeight: "800" }}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>

              {selectedFiles.length ? (
                <View style={{ marginTop: 14, gap: 8 }}>
                  {selectedFiles.map((file, index) => (
                    <View key={`${file.uri}-${index}`} style={{ flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.05)", padding: 10 }}>
                      <MaterialCommunityIcons name="paperclip" size={16} color={colors.blue} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={{ color: colors.white, fontSize: 12, fontWeight: "800" }}>{file.name}</Text>
                        <Text style={{ marginTop: 2, color: "rgba(255,255,255,0.5)", fontSize: 10 }}>{formatBytes(file.size ?? 0)}</Text>
                      </View>
                      <Pressable onPress={() => setSelectedFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                        <MaterialCommunityIcons name="close" size={16} color="rgba(255,255,255,0.55)" />
                      </Pressable>
                    </View>
                  ))}
                  {!uploadValidation.ok ? (
                    <Text style={{ color: colors.red, fontSize: 12, fontWeight: "800" }}>{uploadValidation.reason}</Text>
                  ) : (
                    <Text style={{ color: colors.green, fontSize: 12, fontWeight: "800" }}>
                      Ready to upload {selectedFiles.length > 1 ? `${selectedFiles.length} files as one ZIP bundle` : "1 file"}.
                    </Text>
                  )}
                </View>
              ) : null}
            </Card>
          ) : (
            renderQuestion()
          )}

          {status ? (
            <View style={{ borderRadius: 16, backgroundColor: "rgba(96,195,245,0.12)", padding: 12 }}>
              <Text style={{ color: colors.blue, fontSize: 12, fontWeight: "800" }}>{status}</Text>
            </View>
          ) : null}

          {!!error && !attemptPreparationFailed ? (
            <View style={{ borderRadius: 16, backgroundColor: colors.paleRed, padding: 12 }}>
              <Text style={{ color: colors.red, fontSize: 12, fontWeight: "800" }}>{peekAppError(error).message}</Text>
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
                  borderColor: "rgba(255,255,255,0.12)",
                  paddingHorizontal: 16,
                  justifyContent: "center",
                  opacity: canGoPrevious ? 1 : 0.45,
                }}
              >
                <MaterialCommunityIcons name="chevron-left" size={22} color={colors.white} />
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
                  backgroundColor: colors.amber,
                  alignItems: "center",
                  paddingVertical: 15,
                  opacity: submitMutation.isPending || !attempt || paused ? 0.65 : 1,
                }}
              >
                <Text style={{ color: "#111827", fontSize: 14, fontWeight: "900" }}>
                  {canGoNext ? "Save & Next" : submitMutation.isPending ? "Submitting..." : "Submit Assessment"}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {isFileUploadAssessment && !attemptPreparationFailed ? (
            <Pressable
              onPress={() => void submitAssessment()}
              disabled={submitMutation.isPending || !attempt || paused || !uploadValidation.ok}
              style={{
                borderRadius: 18,
                backgroundColor: colors.amber,
                alignItems: "center",
                paddingVertical: 15,
                opacity: submitMutation.isPending || !attempt || paused || !uploadValidation.ok ? 0.65 : 1,
              }}
            >
              <Text style={{ color: "#111827", fontSize: 14, fontWeight: "900" }}>
                {submitMutation.isPending ? "Submitting..." : "Upload & Submit"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScreenScroll>
    </KeyboardAvoidingView>
  );
}
