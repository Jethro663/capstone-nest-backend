import { useMemo, useState } from "react";
import type { PropsWithChildren, ReactNode } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";
import {
  useAssessmentAttempts,
  useAssessmentDetail,
  useClassDetail,
} from "../api/hooks";
import { peekAppError, toAppError } from "../api/http";
import { assessmentsApi } from "../api/services/assessments";
import { Refreshable, ScreenScroll } from "../components/ui/primitives";
import type { RootStackParamList } from "../navigation/types";
import { studentDarkTheme as theme, stripRichText } from "../theme/studentDark";
import type {
  AssessmentAttempt,
  AssessmentFileRecord,
} from "../types/assessment";
import type { ClassItem } from "../types/class";

type Props = NativeStackScreenProps<RootStackParamList, "AssessmentDetail">;
type Tone = "blue" | "green" | "amber" | "red" | "purple";

function getAttemptTime(attempt: {
  submittedAt?: string;
  startedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}) {
  return new Date(
    attempt.submittedAt ||
      attempt.updatedAt ||
      attempt.startedAt ||
      attempt.createdAt ||
      0,
  ).getTime();
}

function formatDisplayDate(value?: string | null) {
  if (!value) return "No due date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No due date";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAttemptDate(value?: string | null) {
  if (!value) return "Date unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatAssessmentType(value?: string | null) {
  return (value || "assessment")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatTimeLimit(minutes?: number | null) {
  if (!minutes) return "Self-paced";
  return `${minutes} min`;
}

function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(
  file?: Pick<AssessmentFileRecord, "mimeType" | "originalName"> | null,
) {
  const mimeType = (file?.mimeType || "").toLowerCase();
  if (mimeType.startsWith("image/")) {
    return true;
  }

  const extension = (file?.originalName || "").split(".").pop()?.toLowerCase();
  return ["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(extension || "");
}

function getAttemptFiles(
  attempt?: AssessmentAttempt | null,
): AssessmentFileRecord[] {
  if (attempt?.submittedFiles?.length) {
    return attempt.submittedFiles.filter(Boolean);
  }

  return attempt?.submittedFile ? [attempt.submittedFile] : [];
}

function resolveToneStyle(tone: Tone) {
  return {
    blue: { backgroundColor: theme.blueSoft, color: theme.blue },
    green: { backgroundColor: theme.greenSoft, color: theme.green },
    amber: { backgroundColor: theme.amberSoft, color: theme.amber },
    red: { backgroundColor: theme.redSoft, color: theme.red },
    purple: { backgroundColor: theme.purpleSoft, color: theme.purple },
  }[tone];
}

function resolvePassingRequirement(
  totalPoints: number,
  passingScore?: number | null,
) {
  if (!passingScore || totalPoints <= 0) {
    return {
      headline: passingScore ? `${passingScore}%` : "Not set",
      supporting: "Pass target unavailable",
    };
  }

  const rawPoints = (passingScore / 100) * totalPoints;
  const pointsRequired = Math.ceil(rawPoints);
  return {
    headline: `${passingScore}%`,
    supporting: `Need at least ${pointsRequired} / ${totalPoints} pts`,
  };
}

function DarkPanel({ children, style }: PropsWithChildren<{ style?: object }>) {
  return (
    <View
      style={[
        {
          borderRadius: 14,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.surface,
          paddingHorizontal: 14,
          paddingVertical: 14,
        },
        style,
      ]}
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
      <Text style={{ fontSize: 10, fontWeight: "700", color: toneStyle.color }}>
        {label}
      </Text>
    </View>
  );
}

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View>
      <Text style={{ fontSize: 16, fontWeight: "800", color: theme.text }}>
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            marginTop: 4,
            fontSize: 11,
            lineHeight: 17,
            color: theme.muted,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
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
        minWidth: 132,
        flex: 1,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.active,
        paddingHorizontal: 12,
        paddingVertical: 12,
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: "700", color: theme.muted }}>
        {eyebrow}
      </Text>
      <Text
        style={{
          marginTop: 8,
          fontSize: 24,
          lineHeight: 28,
          fontWeight: "900",
          color: toneStyle.color,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          marginTop: 6,
          fontSize: 11,
          lineHeight: 16,
          color: theme.subtext,
        }}
      >
        {caption}
      </Text>
    </View>
  );
}

function FileRow({
  file,
  accent = "blue",
  actions,
}: {
  file: AssessmentFileRecord;
  accent?: Tone;
  actions?: ReactNode;
}) {
  const accentStyle = resolveToneStyle(accent);

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
            backgroundColor: accentStyle.backgroundColor,
          }}
        >
          <MaterialCommunityIcons
            name="paperclip"
            size={15}
            color={accentStyle.color}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{ fontSize: 12, fontWeight: "700", color: theme.text }}
          >
            {file.originalName || "Attachment"}
          </Text>
          <Text
            numberOfLines={1}
            style={{ marginTop: 2, fontSize: 10, color: theme.muted }}
          >
            {[formatFileSize(file.sizeBytes), file.mimeType || null]
              .filter(Boolean)
              .join(" • ")}
          </Text>
        </View>
      </View>
      {actions ? (
        <View
          style={{
            marginTop: 10,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {actions}
        </View>
      ) : null}
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
        borderColor: ghost
          ? "transparent"
          : primary
            ? "transparent"
            : theme.border,
        backgroundColor: disabled
          ? theme.active
          : primary
            ? theme.red
            : ghost
              ? theme.active
              : theme.surface,
        paddingHorizontal: compact ? 12 : 14,
        paddingVertical: compact ? 9 : 11,
        opacity: disabled ? 0.6 : 1,
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

function resolveLatestState(options: {
  latestAttempt: AssessmentAttempt | null;
  latestSubmittedAttempt: AssessmentAttempt | null;
  isFileUploadAssessment: boolean;
}) {
  const { latestAttempt, latestSubmittedAttempt, isFileUploadAssessment } =
    options;

  if (latestAttempt?.isSubmitted === false) {
    return {
      label: "Draft in progress",
      tone: "blue" as const,
      summary: isFileUploadAssessment
        ? "You already have a draft upload. Add or remove files until you are ready to submit."
        : "You still have an unfinished attempt for this assessment.",
    };
  }

  if (latestSubmittedAttempt?.isReturned) {
    return {
      label: "Reviewed",
      tone: "green" as const,
      summary:
        latestSubmittedAttempt.score === undefined ||
        latestSubmittedAttempt.score === null
          ? "Your teacher has already reviewed the latest attempt."
          : `Your latest score is ${Math.round(latestSubmittedAttempt.score)}%.`,
    };
  }

  if (latestSubmittedAttempt) {
    return {
      label: "Awaiting review",
      tone: "amber" as const,
      summary: isFileUploadAssessment
        ? "Your latest upload is waiting for teacher review."
        : "Your latest attempt is waiting for teacher review.",
    };
  }

  return {
    label: isFileUploadAssessment ? "Not turned in" : "Not started",
    tone: "red" as const,
    summary: isFileUploadAssessment
      ? "Review the instructions, attach your files, then submit when everything is ready."
      : "Review the instructions, then start the assessment when you are ready.",
  };
}

function resolveClassHeading(classItem?: ClassItem) {
  return {
    code:
      classItem?.subjectCode ||
      classItem?.className ||
      classItem?.name ||
      "Assessment",
    name: classItem?.subjectName || "Assessment detail",
  };
}

export function AssessmentDetailScreen({ route, navigation }: Props) {
  const { assessmentId, classId } = route.params;
  const detailQuery = useAssessmentDetail(assessmentId);
  const attemptsQuery = useAssessmentAttempts(assessmentId);
  const classQuery = useClassDetail(classId);
  const assessment = detailQuery.data;
  const classItem = classQuery.data as ClassItem | undefined;
  const [notice, setNotice] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const attempts = useMemo(
    () =>
      [...(attemptsQuery.data ?? [])].sort(
        (left, right) =>
          getAttemptTime(right as never) - getAttemptTime(left as never),
      ),
    [attemptsQuery.data],
  );

  const latestAttempt = attempts[0] ?? null;
  const submittedAttempts = attempts.filter(
    (attempt) => attempt.isSubmitted !== false,
  );
  const latestSubmittedAttempt = submittedAttempts[0] ?? null;
  const isFileUploadAssessment = assessment?.type === "file_upload";
  const latestState = resolveLatestState({
    latestAttempt,
    latestSubmittedAttempt,
    isFileUploadAssessment: Boolean(isFileUploadAssessment),
  });
  const attemptsRemaining = Math.max(
    0,
    (assessment?.maxAttempts ?? 1) - submittedAttempts.length,
  );
  const questionCount = assessment?.questions?.length ?? 0;
  const totalPoints =
    assessment?.totalPoints ??
    (assessment?.questions ?? []).reduce(
      (sum, question) => sum + (question.points ?? 0),
      0,
    );
  const latestAttemptFiles = getAttemptFiles(
    latestAttempt ?? latestSubmittedAttempt,
  );
  const latestFileAttemptId =
    latestAttempt?.id ?? latestSubmittedAttempt?.id ?? null;
  const heading = resolveClassHeading(classItem);
  const instructions = [
    stripRichText(assessment?.description),
    isFileUploadAssessment
      ? stripRichText(assessment?.fileUploadInstructions)
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  const hasQueryError = detailQuery.error || attemptsQuery.error;
  const passingRequirement = resolvePassingRequirement(
    totalPoints,
    assessment?.passingScore,
  );

  const handleRefresh = () => {
    setNotice("");
    void Promise.all([
      detailQuery.refetch(),
      attemptsQuery.refetch(),
      classQuery.refetch(),
    ]);
  };

  const academicAllowed =
    !assessment?.academicCapabilities ||
    (latestAttempt?.isSubmitted === false
      ? assessment.academicCapabilities.canContinue
      : assessment.academicCapabilities.canStart);
  const openAssessment = () => {
    if (!academicAllowed) {
      setNotice(
        assessment?.academicCapabilities?.readOnlyReason ||
          "New attempts require the active grading period.",
      );
      return;
    }
    navigation.navigate("AssessmentTake", { assessmentId });
  };

  const openResults = (attemptId: string) => {
    navigation.navigate("AssessmentResults", {
      attemptId,
      assessmentId,
    } as never);
  };

  const openHistory = () => {
    navigation.navigate("AssessmentHistory", { assessmentId, classId });
  };

  const runFileAction = async (
    key: string,
    action: () => Promise<void>,
    successMessage?: string,
  ) => {
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

  const removeDraftFile = async (fileId: string) => {
    await runFileAction(
      `remove-${fileId}`,
      async () => {
        await assessmentsApi.removeSubmissionFile(assessmentId, fileId);
        await attemptsQuery.refetch();
      },
      "Draft attachment removed.",
    );
  };

  const submitDraftUpload = async () => {
    if (latestAttempt?.isSubmitted !== false) {
      openAssessment();
      return;
    }

    if (latestAttemptFiles.length === 0) {
      setNotice("Attach at least one file before submitting.");
      return;
    }

    await runFileAction(
      "submit-upload",
      async () => {
        await assessmentsApi.submit({
          assessmentId,
          responses: [],
          timeSpentSeconds: 1,
        });
        await Promise.all([detailQuery.refetch(), attemptsQuery.refetch()]);
      },
      "Submission sent for teacher review.",
    );
  };

  const unsubmitUpload = async () => {
    await runFileAction(
      "unsubmit-upload",
      async () => {
        await assessmentsApi.unsubmitFileUploadAssessment(assessmentId);
        await Promise.all([detailQuery.refetch(), attemptsQuery.refetch()]);
      },
      "Submission restored to draft mode.",
    );
  };

  const normalPrimaryLabel = !academicAllowed
    ? null
    : latestAttempt?.isSubmitted === false
      ? "Continue Attempt"
      : attemptsRemaining > 0
        ? latestSubmittedAttempt
          ? "Retake Assessment"
          : "Start Assessment"
        : null;
  const fileWorkspaceLabel = !academicAllowed
    ? null
    : latestAttempt?.isSubmitted === false
      ? "Continue Upload Draft"
      : !latestSubmittedAttempt && attemptsRemaining > 0
        ? "Open Upload Workspace"
        : null;
  const normalHeaderActionLabel = !academicAllowed
    ? null
    : latestAttempt?.isSubmitted === false
      ? "Continue"
      : attemptsRemaining > 0
        ? latestSubmittedAttempt
          ? "Retake"
          : "Take"
        : null;
  const fileHeaderAction =
    latestAttempt?.isSubmitted === false
      ? {
          label: latestAttemptFiles.length > 0 ? "Submit" : "Open",
          onPress:
            latestAttemptFiles.length > 0
              ? () => void submitDraftUpload()
              : openAssessment,
          disabled: busyAction === "submit-upload" || !academicAllowed,
        }
      : latestSubmittedAttempt && !latestSubmittedAttempt.isReturned
        ? {
            label: "Unsubmit",
            onPress: () => void unsubmitUpload(),
            disabled:
              busyAction === "unsubmit-upload" ||
              (assessment?.academicCapabilities
                ? !assessment.academicCapabilities.canContinue &&
                  !assessment.academicCapabilities.canStart
                : false),
          }
        : !latestSubmittedAttempt && attemptsRemaining > 0
          ? {
              label: "Open",
              onPress: openAssessment,
              disabled: false,
            }
          : null;

  if (!assessment && !hasQueryError) {
    return (
      <ScreenScroll
        backgroundColor={theme.bg}
        refreshControl={
          <Refreshable
            refreshing={detailQuery.isRefetching || attemptsQuery.isRefetching}
            onRefresh={handleRefresh}
          />
        }
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 32 }}>
          <DarkPanel>
            <Text
              style={{ color: theme.text, fontSize: 13, fontWeight: "700" }}
            >
              Loading assessment
            </Text>
            <Text
              style={{
                marginTop: 6,
                color: theme.muted,
                fontSize: 12,
                lineHeight: 18,
              }}
            >
              Preparing the assessment details now.
            </Text>
          </DarkPanel>
        </View>
      </ScreenScroll>
    );
  }

  if (!assessment) {
    return (
      <ScreenScroll
        backgroundColor={theme.bg}
        refreshControl={
          <Refreshable
            refreshing={detailQuery.isRefetching || attemptsQuery.isRefetching}
            onRefresh={handleRefresh}
          />
        }
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 32 }}>
          <DarkPanel>
            <Text
              style={{ color: theme.text, fontSize: 13, fontWeight: "700" }}
            >
              Assessment unavailable
            </Text>
            <Text
              style={{
                marginTop: 6,
                color: theme.muted,
                fontSize: 12,
                lineHeight: 18,
              }}
            >
              {peekAppError(hasQueryError).message}
            </Text>
          </DarkPanel>
        </View>
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll
      backgroundColor={theme.bg}
      refreshControl={
        <Refreshable
          refreshing={
            detailQuery.isRefetching ||
            attemptsQuery.isRefetching ||
            classQuery.isRefetching
          }
          onRefresh={handleRefresh}
        />
      }
    >
      <View
        style={{
          backgroundColor: theme.header,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <View
          style={{ paddingHorizontal: 16, paddingTop: 44, paddingBottom: 14 }}
        >
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
              <MaterialCommunityIcons
                name="chevron-left"
                size={20}
                color={theme.text}
              />
            </Pressable>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                numberOfLines={1}
                style={{ color: theme.text, fontSize: 11, fontWeight: "700" }}
              >
                {heading.code}
              </Text>
              <Text
                numberOfLines={1}
                style={{ marginTop: 3, color: theme.muted, fontSize: 11 }}
              >
                {heading.name}
              </Text>
            </View>

            {!isFileUploadAssessment && normalHeaderActionLabel ? (
              <Pressable
                onPress={openAssessment}
                style={{
                  borderRadius: 999,
                  backgroundColor: theme.red,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                <Text
                  style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "800" }}
                >
                  {normalHeaderActionLabel}
                </Text>
              </Pressable>
            ) : null}

            {isFileUploadAssessment && fileHeaderAction ? (
              <Pressable
                disabled={fileHeaderAction.disabled}
                onPress={fileHeaderAction.onPress}
                style={{
                  borderRadius: 999,
                  backgroundColor:
                    fileHeaderAction.label === "Unsubmit"
                      ? theme.active
                      : theme.red,
                  borderWidth: fileHeaderAction.label === "Unsubmit" ? 1 : 0,
                  borderColor:
                    fileHeaderAction.label === "Unsubmit"
                      ? theme.border
                      : "transparent",
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  opacity: fileHeaderAction.disabled ? 0.6 : 1,
                }}
              >
                <Text
                  style={{
                    color:
                      fileHeaderAction.label === "Unsubmit"
                        ? theme.text
                        : "#FFFFFF",
                    fontSize: 11,
                    fontWeight: "800",
                  }}
                >
                  {fileHeaderAction.label}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: theme.border,
            backgroundColor: theme.active,
            paddingHorizontal: 16,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Text
            style={{
              flex: 1,
              color: theme.text,
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            {latestState.label}
          </Text>
          <Text style={{ color: theme.muted, fontSize: 11 }}>
            {formatDisplayDate(assessment.dueDate)}
          </Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 18, gap: 10 }}>
        <View>
          <Text
            style={{
              color: theme.text,
              fontSize: 28,
              lineHeight: 36,
              fontWeight: "800",
            }}
          >
            {assessment.title || "Assessment"}
          </Text>
          <Text
            style={{
              marginTop: 8,
              color: theme.muted,
              fontSize: 12,
              lineHeight: 18,
            }}
          >
            {assessment.dueDate
              ? `Due ${formatDisplayDate(assessment.dueDate)}`
              : "No due date"}
          </Text>
          <View
            style={{
              marginTop: 12,
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <ToneTag
              label={formatAssessmentType(assessment.type)}
              tone="blue"
            />
            <ToneTag
              label={
                isFileUploadAssessment
                  ? "Upload workspace"
                  : `${questionCount} question${questionCount === 1 ? "" : "s"}`
              }
              tone="purple"
            />
            <ToneTag
              label={`${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} left`}
              tone={attemptsRemaining > 0 ? "amber" : "red"}
            />
          </View>
        </View>

        {hasQueryError ? (
          <DarkPanel>
            <Text
              style={{ fontSize: 13, fontWeight: "700", color: theme.text }}
            >
              Some assessment data is unavailable
            </Text>
            <Text
              style={{
                marginTop: 6,
                fontSize: 12,
                lineHeight: 18,
                color: theme.muted,
              }}
            >
              {peekAppError(hasQueryError).message}
            </Text>
          </DarkPanel>
        ) : null}

        {notice ? (
          <DarkPanel style={{ backgroundColor: theme.active }}>
            <Text style={{ fontSize: 12, lineHeight: 18, color: theme.text }}>
              {notice}
            </Text>
          </DarkPanel>
        ) : null}

        <DarkPanel>
          <SectionHeading
            title="Overview"
            subtitle="Instructions, score target, and the rules for this assessment."
          />
          <View
            style={{
              marginTop: 14,
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <MetricTile
              eyebrow="TOTAL POINTS"
              value={totalPoints > 0 ? `${totalPoints}` : "--"}
              caption={
                totalPoints > 0
                  ? "Maximum points available in this assessment."
                  : "Points are not set yet."
              }
              tone="blue"
            />
            <MetricTile
              eyebrow="PASS TARGET"
              value={passingRequirement.headline}
              caption={passingRequirement.supporting}
              tone="amber"
            />
            <MetricTile
              eyebrow="TIME LIMIT"
              value={formatTimeLimit(assessment.timeLimitMinutes)}
              caption={
                assessment.timeLimitMinutes
                  ? "Timed assessment."
                  : "Work at your own pace."
              }
              tone="green"
            />
            <MetricTile
              eyebrow="ATTEMPTS"
              value={`${assessment.maxAttempts ?? 1}`}
              caption={`${attemptsRemaining} remaining right now.`}
              tone={attemptsRemaining > 0 ? "purple" : "red"}
            />
          </View>

          <Text
            style={{
              marginTop: 14,
              fontSize: 13,
              lineHeight: 21,
              color: theme.subtext,
            }}
          >
            {instructions ||
              "No instructions were provided for this assessment."}
          </Text>
        </DarkPanel>

        {isFileUploadAssessment && assessment.teacherAttachmentFile ? (
          <DarkPanel>
            <SectionHeading
              title="Reference material"
              subtitle="Teacher-provided file for this upload task."
            />
            <View style={{ marginTop: 12 }}>
              <FileRow
                file={assessment.teacherAttachmentFile}
                accent="amber"
                actions={
                  <>
                    {isImageFile(assessment.teacherAttachmentFile) ? (
                      <ActionButton
                        label="Open"
                        compact
                        variant="ghost"
                        disabled={busyAction === "open-reference"}
                        onPress={() =>
                          void runFileAction("open-reference", () =>
                            assessmentsApi
                              .openTeacherAttachment(
                                assessmentId,
                                assessment.teacherAttachmentFile
                                  ?.originalName || "teacher-attachment",
                              )
                              .then(() => undefined),
                          )
                        }
                      />
                    ) : null}
                    <ActionButton
                      label="Download"
                      compact
                      variant="secondary"
                      disabled={busyAction === "download-reference"}
                      onPress={() =>
                        void runFileAction(
                          "download-reference",
                          () =>
                            assessmentsApi
                              .downloadTeacherAttachment(
                                assessmentId,
                                assessment.teacherAttachmentFile
                                  ?.originalName || "teacher-attachment",
                              )
                              .then(() => undefined),
                          "Reference material saved to this device.",
                        )
                      }
                    />
                  </>
                }
              />
            </View>
          </DarkPanel>
        ) : null}

        {isFileUploadAssessment ? (
          <DarkPanel>
            <SectionHeading
              title="My work"
              subtitle={
                latestAttemptFiles.length > 0
                  ? `${latestAttemptFiles.length} attachment${latestAttemptFiles.length === 1 ? "" : "s"} currently included.`
                  : "No attachments have been added yet."
              }
            />

            <View
              style={{
                marginTop: 12,
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              {fileWorkspaceLabel ? (
                <ActionButton
                  label={fileWorkspaceLabel}
                  onPress={openAssessment}
                />
              ) : null}
              {!fileWorkspaceLabel && latestSubmittedAttempt ? (
                <ActionButton
                  label="View Results"
                  onPress={() => openResults(latestSubmittedAttempt.id)}
                  variant="secondary"
                />
              ) : null}
            </View>

            {latestAttemptFiles.length > 0 ? (
              <View style={{ marginTop: 14, gap: 8 }}>
                {latestAttemptFiles.map((file, index) => {
                  const canRemove = latestAttempt?.isSubmitted === false;
                  return (
                    <FileRow
                      key={`${file.id || file.originalName || "file"}-${index}`}
                      file={file}
                      actions={
                        latestFileAttemptId ? (
                          <>
                            {isImageFile(file) ? (
                              <ActionButton
                                label="Open"
                                compact
                                variant="ghost"
                                disabled={busyAction === `open-${file.id}`}
                                onPress={() =>
                                  void runFileAction(`open-${file.id}`, () =>
                                    assessmentsApi
                                      .openAttemptSubmissionAttachmentFile(
                                        latestFileAttemptId,
                                        file.id,
                                        file.originalName || "submission-file",
                                      )
                                      .then(() => undefined),
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
                                    assessmentsApi
                                      .downloadAttemptSubmissionAttachmentFile(
                                        latestFileAttemptId,
                                        file.id,
                                        file.originalName || "submission-file",
                                      )
                                      .then(() => undefined),
                                  "Submission file saved to this device.",
                                )
                              }
                            />
                            {canRemove ? (
                              <ActionButton
                                label="Remove"
                                compact
                                variant="secondary"
                                disabled={busyAction === `remove-${file.id}`}
                                onPress={() => void removeDraftFile(file.id)}
                              />
                            ) : null}
                          </>
                        ) : null
                      }
                    />
                  );
                })}
              </View>
            ) : (
              <Text
                style={{
                  marginTop: 14,
                  fontSize: 12,
                  lineHeight: 18,
                  color: theme.muted,
                }}
              >
                Open the upload workspace to attach files from your device,
                review them, or remove them before submitting.
              </Text>
            )}
          </DarkPanel>
        ) : null}

        <DarkPanel>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <SectionHeading
              title="Latest activity"
              subtitle={
                latestAttempt
                  ? `Attempt #${latestAttempt.attemptNumber ?? submittedAttempts.length ?? 1}`
                  : "No attempt has been started yet."
              }
            />
            <ToneTag label={latestState.label} tone={latestState.tone} />
          </View>

          <Text
            style={{
              marginTop: 12,
              fontSize: 13,
              lineHeight: 20,
              color: theme.subtext,
            }}
          >
            {latestState.summary}
          </Text>

          {latestSubmittedAttempt?.submittedAt ? (
            <Text style={{ marginTop: 10, fontSize: 11, color: theme.muted }}>
              Latest submission:{" "}
              {formatAttemptDate(latestSubmittedAttempt.submittedAt)}
            </Text>
          ) : latestAttempt?.startedAt ? (
            <Text style={{ marginTop: 10, fontSize: 11, color: theme.muted }}>
              Started: {formatAttemptDate(latestAttempt.startedAt)}
            </Text>
          ) : null}

          <View
            style={{
              marginTop: 14,
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            {isFileUploadAssessment ? (
              <>
                {fileWorkspaceLabel ? (
                  <ActionButton
                    label={fileWorkspaceLabel}
                    onPress={openAssessment}
                  />
                ) : latestSubmittedAttempt ? (
                  <ActionButton
                    label="View Results"
                    onPress={() => openResults(latestSubmittedAttempt.id)}
                  />
                ) : null}
              </>
            ) : (
              <>
                {normalPrimaryLabel ? (
                  <ActionButton
                    label={normalPrimaryLabel}
                    onPress={openAssessment}
                  />
                ) : null}
                {!fileWorkspaceLabel && latestSubmittedAttempt ? (
                  <ActionButton
                    label="View Results"
                    onPress={() => openResults(latestSubmittedAttempt.id)}
                    variant={normalPrimaryLabel ? "secondary" : "primary"}
                  />
                ) : null}
                <ActionButton
                  label="Open History"
                  onPress={openHistory}
                  variant="secondary"
                />
              </>
            )}
          </View>
        </DarkPanel>

        {!isFileUploadAssessment && submittedAttempts.length > 0 ? (
          <DarkPanel>
            <Pressable
              onPress={() => setHistoryExpanded((current) => !current)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <SectionHeading
                title="Attempt history"
                subtitle={`${submittedAttempts.length} submitted attempt${submittedAttempts.length === 1 ? "" : "s"} recorded.`}
              />
              <MaterialCommunityIcons
                name={historyExpanded ? "chevron-up" : "chevron-down"}
                size={18}
                color={theme.text}
              />
            </Pressable>

            {historyExpanded ? (
              <View style={{ marginTop: 12, gap: 8 }}>
                {submittedAttempts.map((attempt, index) => {
                  const statusTone = attempt.isReturned ? "green" : "amber";
                  const statusLabel = attempt.isReturned
                    ? "Reviewed"
                    : "Awaiting review";

                  return (
                    <View
                      key={attempt.id}
                      style={{
                        borderTopWidth: index === 0 ? 0 : 1,
                        borderTopColor: theme.border,
                        paddingTop: index === 0 ? 0 : 10,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "700",
                              color: theme.text,
                            }}
                          >
                            Attempt #{attempt.attemptNumber ?? index + 1}
                          </Text>
                          <Text
                            style={{
                              marginTop: 3,
                              fontSize: 10,
                              color: theme.muted,
                            }}
                          >
                            {formatAttemptDate(
                              attempt.submittedAt || attempt.createdAt,
                            )}
                          </Text>
                        </View>
                        <ToneTag label={statusLabel} tone={statusTone} />
                      </View>

                      {attempt.score !== undefined && attempt.score !== null ? (
                        <Text
                          style={{
                            marginTop: 8,
                            fontSize: 12,
                            color: theme.subtext,
                          }}
                        >
                          Score:{" "}
                          <Text
                            style={{ color: theme.text, fontWeight: "700" }}
                          >
                            {Math.round(attempt.score)}%
                          </Text>
                        </Text>
                      ) : null}

                      <View
                        style={{
                          marginTop: 10,
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: 10,
                        }}
                      >
                        <ActionButton
                          label="Open Attempt"
                          onPress={() => openResults(attempt.id)}
                          variant="secondary"
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </DarkPanel>
        ) : null}
      </View>
    </ScreenScroll>
  );
}
