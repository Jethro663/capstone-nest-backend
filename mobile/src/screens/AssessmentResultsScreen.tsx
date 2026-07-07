import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";
import { peekAppError, toAppError } from "../api/http";
import { useAssessmentResult } from "../api/hooks";
import { assessmentsApi } from "../api/services/assessments";
import type { RootStackParamList } from "../navigation/types";
import { studentDarkTheme as theme, stripRichText } from "../theme/studentDark";
import { Refreshable, ScreenScroll } from "../components/ui/primitives";

type Props = NativeStackScreenProps<RootStackParamList, "AssessmentResults">;
type Tone = "blue" | "green" | "amber" | "red" | "purple";

function resolveToneStyle(tone: Tone) {
  return {
    blue: { backgroundColor: theme.blueSoft, color: theme.blue },
    green: { backgroundColor: theme.greenSoft, color: theme.green },
    amber: { backgroundColor: theme.amberSoft, color: theme.amber },
    red: { backgroundColor: theme.redSoft, color: theme.red },
    purple: { backgroundColor: theme.purpleSoft, color: theme.purple },
  }[tone];
}

function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(file?: {
  mimeType?: string | null;
  originalName?: string | null;
} | null) {
  const mimeType = (file?.mimeType || "").toLowerCase();
  if (mimeType.startsWith("image/")) {
    return true;
  }

  const extension = (file?.originalName || "").split(".").pop()?.toLowerCase();
  return ["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(extension || "");
}

function DarkPanel({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        paddingHorizontal: 14,
        paddingVertical: 14,
      }}
    >
      {children}
    </View>
  );
}

function ToneTag({ label, tone }: { label: string; tone: Tone }) {
  const toneStyle = resolveToneStyle(tone);

  return (
    <View
      style={{
        borderRadius: 999,
        backgroundColor: toneStyle.backgroundColor,
        paddingHorizontal: 10,
        paddingVertical: 5,
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: "700", color: toneStyle.color }}>{label}</Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  compact = false,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  compact?: boolean;
}) {
  const primary = variant === "primary";
  const ghost = variant === "ghost";

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        borderRadius: 12,
        borderWidth: primary || ghost ? 0 : 1,
        borderColor: ghost ? "transparent" : primary ? "transparent" : theme.border,
        backgroundColor: disabled
          ? theme.active
          : primary
            ? theme.red
            : ghost
              ? theme.active
              : theme.surface,
        paddingHorizontal: compact ? 12 : 14,
        paddingVertical: compact ? 9 : 11,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <Text
        style={{
          fontSize: compact ? 11 : 12,
          fontWeight: "800",
          color: disabled ? theme.muted : primary ? "#FFFFFF" : theme.text,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function MetricTile({
  eyebrow,
  value,
  caption,
  tone = "blue",
}: {
  eyebrow: string;
  value: string;
  caption: string;
  tone?: Tone;
}) {
  const toneStyle = resolveToneStyle(tone);

  return (
    <View
      style={{
        minWidth: 130,
        flex: 1,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.active,
        paddingHorizontal: 12,
        paddingVertical: 12,
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: "700", color: theme.muted }}>{eyebrow}</Text>
      <Text style={{ marginTop: 8, fontSize: 24, lineHeight: 28, fontWeight: "900", color: toneStyle.color }}>
        {value}
      </Text>
      <Text style={{ marginTop: 6, fontSize: 11, lineHeight: 16, color: theme.subtext }}>{caption}</Text>
    </View>
  );
}

function FileRow({
  file,
  actions,
}: {
  file: {
    id: string;
    originalName?: string | null;
    mimeType?: string | null;
    sizeBytes?: number | null;
  };
  actions?: ReactNode;
}) {
  return (
    <View
      style={{
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.active,
        paddingHorizontal: 12,
        paddingVertical: 11,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.blueSoft,
          }}
        >
          <MaterialCommunityIcons name="paperclip" size={15} color={theme.blue} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "700", color: theme.text }}>
            {file.originalName || "Attachment"}
          </Text>
          <Text numberOfLines={1} style={{ marginTop: 2, fontSize: 10, color: theme.muted }}>
            {[formatFileSize(file.sizeBytes), file.mimeType || null].filter(Boolean).join(" • ")}
          </Text>
        </View>
      </View>
      {actions ? <View style={{ marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{actions}</View> : null}
    </View>
  );
}

function formatAnswer(response: {
  studentAnswer?: string;
  selectedOptionId?: string;
  selectedOptionIds?: string[];
  question?: {
    options?: Array<{ id: string; text: string; isCorrect?: boolean }>;
  };
}) {
  const options = response.question?.options ?? [];

  if (response.selectedOptionId) {
    return options.find((option) => option.id === response.selectedOptionId)?.text || response.selectedOptionId;
  }

  if (response.selectedOptionIds?.length) {
    return response.selectedOptionIds
      .map((optionId) => options.find((option) => option.id === optionId)?.text || optionId)
      .join(", ");
  }

  if (response.studentAnswer?.trim()) {
    return stripRichText(response.studentAnswer);
  }

  return "No recorded response";
}

export function AssessmentResultsScreen({ route, navigation }: Props) {
  const resultQuery = useAssessmentResult(route.params.attemptId);
  const result = resultQuery.data;
  const assessmentId =
    (route.params as { assessmentId?: string }).assessmentId ||
    result?.attempt?.assessmentId;
  const [notice, setNotice] = useState("");
  const [busyAction, setBusyAction] = useState("");

  const submittedFiles = useMemo(
    () => (result?.submittedFiles?.length ? result.submittedFiles : result?.submittedFile ? [result.submittedFile] : []),
    [result?.submittedFile, result?.submittedFiles],
  );
  const isFileUploadAssessment = result?.assessment?.type === "file_upload";

  const openAssessment = () => {
    if (!assessmentId) {
      navigation.goBack();
      return;
    }

    navigation.navigate("AssessmentDetail", {
      assessmentId,
    } as never);
  };

  const openHistory = () => {
    navigation.navigate("AssessmentHistory", assessmentId ? { assessmentId } : undefined);
  };

  const runFileAction = async (key: string, action: () => Promise<void>, successMessage?: string) => {
    try {
      setBusyAction(key);
      setNotice("");
      await action();
      if (successMessage) {
        setNotice(successMessage);
      }
    } catch (rawError) {
      setNotice(toAppError(rawError).message);
    } finally {
      setBusyAction("");
    }
  };

  return (
    <ScreenScroll
      backgroundColor={theme.bg}
      refreshControl={
        <Refreshable
          refreshing={resultQuery.isRefetching}
          onRefresh={() => {
            void resultQuery.refetch();
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
                width: 44,
                height: 44,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.active,
              }}
            >
              <MaterialCommunityIcons name="chevron-left" size={20} color={theme.text} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontSize: 12, fontWeight: "700" }}>Assessment Result</Text>
              <Text style={{ marginTop: 4, color: theme.text, fontSize: 28, fontWeight: "800" }}>
                {result ? `Attempt #${result.attemptNumber ?? result.attempt?.attemptNumber ?? "?"}` : "Loading..."}
              </Text>
            </View>
            {result ? (
              <ToneTag
                label={result.isReturned === false ? "Pending" : result.passed ? "Passed" : "Needs Work"}
                tone={result.isReturned === false ? "amber" : result.passed ? "green" : "red"}
              />
            ) : null}
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 18, gap: 10 }}>
        {resultQuery.error ? (
          <DarkPanel>
            <Text style={{ fontSize: 14, fontWeight: "800", color: theme.text }}>
              Unable to load this attempt
            </Text>
            <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: theme.muted }}>
              {peekAppError(resultQuery.error).message}
            </Text>
          </DarkPanel>
        ) : null}

        {notice ? (
          <DarkPanel>
            <Text style={{ fontSize: 12, lineHeight: 18, color: theme.text }}>{notice}</Text>
          </DarkPanel>
        ) : null}

        {!result ? (
          <DarkPanel>
            <Text style={{ color: theme.muted }}>Loading attempt result...</Text>
          </DarkPanel>
        ) : result.isReturned === false ? (
          <>
            <DarkPanel>
              <Text style={{ fontSize: 12, color: theme.muted }}>Submission Status</Text>
              <Text style={{ marginTop: 6, fontSize: 26, lineHeight: 32, fontWeight: "900", color: theme.text }}>
                Awaiting Teacher Review
              </Text>
              <Text style={{ marginTop: 10, fontSize: 13, lineHeight: 20, color: theme.subtext }}>
                Your submission is recorded. Results and teacher feedback will appear here once they are returned.
              </Text>
              <View style={{ marginTop: 14, flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                <ActionButton label="Back to Assessment" onPress={openAssessment} />
                {!isFileUploadAssessment ? (
                  <ActionButton label="Open History" onPress={openHistory} variant="secondary" />
                ) : null}
              </View>
            </DarkPanel>

            {isFileUploadAssessment && submittedFiles.length > 0 ? (
              <DarkPanel>
                <Text style={{ fontSize: 16, fontWeight: "800", color: theme.text }}>Your submission files</Text>
                <Text style={{ marginTop: 4, fontSize: 11, lineHeight: 17, color: theme.muted }}>
                  Review the files currently included in this upload.
                </Text>
                <View style={{ marginTop: 12, gap: 8 }}>
                  {submittedFiles.map((file) => (
                    <FileRow
                      key={file.id}
                      file={file}
                      actions={
                        <>
                          {isImageFile(file) ? (
                            <ActionButton
                              label="Open"
                              compact
                              variant="ghost"
                              disabled={busyAction === `open-${file.id}`}
                              onPress={() =>
                                void runFileAction(
                                  `open-${file.id}`,
                                  () =>
                                    assessmentsApi.openAttemptSubmissionAttachmentFile(
                                      route.params.attemptId,
                                      file.id,
                                      file.originalName || "submission-file",
                                    ).then(() => undefined),
                                )
                              }
                            />
                          ) : null}
                          <ActionButton
                            label="Download"
                            compact
                            variant="secondary"
                            disabled={busyAction === `download-${file.id}`}
                            onPress={() =>
                              void runFileAction(
                                `download-${file.id}`,
                                () =>
                                  assessmentsApi.downloadAttemptSubmissionAttachmentFile(
                                    route.params.attemptId,
                                    file.id,
                                    file.originalName || "submission-file",
                                  ).then(() => undefined),
                                "Submission file saved to this device.",
                              )
                            }
                          />
                        </>
                      }
                    />
                  ))}
                </View>
              </DarkPanel>
            ) : null}
          </>
        ) : (
          <>
            <DarkPanel>
              <Text style={{ fontSize: 11, fontWeight: "700", color: theme.muted }}>Assessment Result</Text>
              <Text style={{ marginTop: 6, fontSize: 26, lineHeight: 32, fontWeight: "900", color: theme.text }}>
                {result.assessment?.title || "Assessment"}
              </Text>
              <Text style={{ marginTop: 8, fontSize: 13, lineHeight: 20, color: theme.subtext }}>
                Review your score, teacher feedback, and the files or answers attached to this attempt.
              </Text>

              <View style={{ marginTop: 14, flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                <MetricTile
                  eyebrow="SCORE"
                  value={`${Math.round(result.score ?? 0)}%`}
                  caption={result.passed ? "You met the passing requirement." : "You still need improvement."}
                  tone={result.passed ? "green" : "amber"}
                />
                <MetricTile
                  eyebrow="STATUS"
                  value={result.passed ? "Pass" : "Review"}
                  caption={result.isReturned ? "Teacher has already returned this attempt." : "Recorded in the system."}
                  tone={result.passed ? "green" : "red"}
                />
                <MetricTile
                  eyebrow="ATTEMPT"
                  value={`#${result.attemptNumber ?? result.attempt?.attemptNumber ?? "?"}`}
                  caption="This is the attempt number for the returned result."
                  tone="purple"
                />
              </View>

              {result.teacherFeedback ? (
                <Text style={{ marginTop: 14, fontSize: 13, lineHeight: 20, color: theme.subtext }}>
                  Teacher feedback: <Text style={{ color: theme.text }}>{result.teacherFeedback}</Text>
                </Text>
              ) : null}

              <View style={{ marginTop: 14, flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                <ActionButton label="Back to Assessment" onPress={openAssessment} />
                {!isFileUploadAssessment ? (
                  <ActionButton label="Open History" onPress={openHistory} variant="secondary" />
                ) : null}
              </View>
            </DarkPanel>

            {isFileUploadAssessment ? (
              <DarkPanel>
                <Text style={{ fontSize: 16, fontWeight: "800", color: theme.text }}>Submitted files</Text>
                <Text style={{ marginTop: 4, fontSize: 11, lineHeight: 17, color: theme.muted }}>
                  Files that were included when this upload was reviewed.
                </Text>
                <View style={{ marginTop: 12, gap: 8 }}>
                  {submittedFiles.length > 0 ? (
                    submittedFiles.map((file) => (
                      <FileRow
                        key={file.id}
                        file={file}
                        actions={
                          <>
                            {isImageFile(file) ? (
                              <ActionButton
                                label="Open"
                                compact
                                variant="ghost"
                                disabled={busyAction === `open-${file.id}`}
                                onPress={() =>
                                  void runFileAction(
                                    `open-${file.id}`,
                                    () =>
                                      assessmentsApi.openAttemptSubmissionAttachmentFile(
                                        route.params.attemptId,
                                        file.id,
                                        file.originalName || "submission-file",
                                      ).then(() => undefined),
                                  )
                                }
                              />
                            ) : null}
                            <ActionButton
                              label="Download"
                              compact
                              variant="secondary"
                              disabled={busyAction === `download-${file.id}`}
                              onPress={() =>
                                void runFileAction(
                                  `download-${file.id}`,
                                  () =>
                                    assessmentsApi.downloadAttemptSubmissionAttachmentFile(
                                      route.params.attemptId,
                                      file.id,
                                      file.originalName || "submission-file",
                                    ).then(() => undefined),
                                  "Submission file saved to this device.",
                                )
                              }
                            />
                          </>
                        }
                      />
                    ))
                  ) : (
                    <Text style={{ fontSize: 12, lineHeight: 18, color: theme.muted }}>
                      No submission files were attached to this result.
                    </Text>
                  )}
                </View>
              </DarkPanel>
            ) : (
              result.responses.map((response, index) => {
                const correctAnswer = response.question?.options
                  ?.filter((option) => option.isCorrect)
                  .map((option) => option.text)
                  .join(", ");

                return (
                  <DarkPanel key={`${response.questionId}-${index}`}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <Text style={{ fontSize: 12, color: theme.muted }}>Question {index + 1}</Text>
                      <ToneTag
                        label={response.isCorrect ? "Correct enough" : "Needs correction"}
                        tone={response.isCorrect ? "green" : "red"}
                      />
                    </View>
                    <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 21, fontWeight: "800", color: theme.text }}>
                      {stripRichText(response.question?.content || "Question content unavailable")}
                    </Text>
                    <Text style={{ marginTop: 10, fontSize: 12, lineHeight: 18, color: theme.subtext }}>
                      Your previous answer: <Text style={{ color: theme.text }}>{formatAnswer(response)}</Text>
                    </Text>
                    {correctAnswer ? (
                      <Text style={{ marginTop: 8, fontSize: 12, lineHeight: 18, color: theme.muted }}>
                        Correct answer: <Text style={{ color: theme.green, fontWeight: "900" }}>{correctAnswer}</Text>
                      </Text>
                    ) : null}
                    {response.question?.explanation ? (
                      <Text style={{ marginTop: 8, fontSize: 12, lineHeight: 18, color: theme.muted }}>
                        Explanation: <Text style={{ color: theme.text }}>{stripRichText(response.question.explanation)}</Text>
                      </Text>
                    ) : null}
                  </DarkPanel>
                );
              })
            )}
          </>
        )}
      </View>
    </ScreenScroll>
  );
}
