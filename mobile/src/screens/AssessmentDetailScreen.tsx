import { useMemo, useState } from "react";
import type { ReactNode } from "react";
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
import {
  StudentBottomActionBar,
  StudentContextStrip,
  StudentFlatSection,
  StudentInlineNotice,
  StudentScreen,
} from "../components/student/StudentWorkspacePrimitives";
import type { RootStackParamList } from "../navigation/types";
import { navigateStudentDetailBack } from "../navigation/student-detail-back";
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

function AssessmentFactsLedger({
  dueDate,
  totalPoints,
  passingRequirement,
  timeLimitMinutes,
  maxAttempts,
  attemptsRemaining,
}: {
  dueDate?: string | null;
  totalPoints: number;
  passingRequirement: { headline: string; supporting: string };
  timeLimitMinutes?: number | null;
  maxAttempts: number;
  attemptsRemaining: number;
}) {
  const facts = [
    {
      label: "Due",
      value: formatDisplayDate(dueDate),
      supporting: dueDate ? "Submit before the deadline" : "No deadline set",
    },
    {
      label: "Points",
      value: totalPoints > 0 ? `${totalPoints} pts` : "Not set",
      supporting: passingRequirement.supporting,
    },
    {
      label: "Time",
      value: formatTimeLimit(timeLimitMinutes),
      supporting: timeLimitMinutes ? "Timer starts when you begin" : "Work at your own pace",
    },
    {
      label: "Attempts",
      value: `${attemptsRemaining} left`,
      supporting: `${maxAttempts} total attempt${maxAttempts === 1 ? "" : "s"}`,
    },
  ];

  return (
    <View
      testID="assessment-facts-ledger"
      style={{ flexDirection: "row", flexWrap: "wrap", borderTopWidth: 1, borderTopColor: theme.border }}
    >
      {facts.map((fact, index) => (
        <View
          key={fact.label}
          style={{
            width: "50%",
            minHeight: 82,
            borderRightWidth: index % 2 === 0 ? 1 : 0,
            borderBottomWidth: 1,
            borderColor: theme.border,
            paddingHorizontal: 14,
            paddingVertical: 11,
          }}
        >
          <Text style={{ color: theme.muted, fontSize: 9, fontWeight: "900", letterSpacing: 0.7, textTransform: "uppercase" }}>
            {fact.label}
          </Text>
          <Text numberOfLines={2} style={{ marginTop: 5, color: theme.text, fontSize: 15, lineHeight: 19, fontWeight: "900" }}>
            {fact.value}
          </Text>
          <Text numberOfLines={2} style={{ marginTop: 3, color: theme.muted, fontSize: 9, lineHeight: 13 }}>
            {fact.supporting}
          </Text>
        </View>
      ))}
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
        borderTopWidth: 1,
        borderTopColor: theme.border,
        backgroundColor: theme.surface,
        paddingHorizontal: 16,
        paddingVertical: 12,
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
  const { assessmentId, classId, source } = route.params;
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
  const handleBack = () =>
    navigateStudentDetailBack(navigation, "AssessmentDetail", {
      assessmentId,
      classId,
      source,
    });

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

  const refreshing =
    detailQuery.isRefetching || attemptsQuery.isRefetching || classQuery.isRefetching;

  if (!assessment && !hasQueryError) {
    return (
      <StudentScreen title="Assessment" showBackButton onBackPress={handleBack} refreshing={refreshing} onRefresh={handleRefresh}>
        <StudentInlineNotice
          title="Loading assessment"
          description="Preparing the assessment details now."
          icon="progress-clock"
          tone="blue"
        />
      </StudentScreen>
    );
  }

  if (!assessment) {
    return (
      <StudentScreen title="Assessment" showBackButton onBackPress={handleBack} refreshing={refreshing} onRefresh={handleRefresh}>
        <StudentInlineNotice
          title="Assessment unavailable"
          description={peekAppError(hasQueryError).message}
          icon="alert-circle-outline"
          tone="amber"
        />
      </StudentScreen>
    );
  }

  const bottomAction = isFileUploadAssessment
    ? fileHeaderAction
      ? (
          <StudentBottomActionBar
            primaryLabel={fileHeaderAction.label}
            onPrimary={fileHeaderAction.onPress}
            primaryIcon={fileHeaderAction.label === "Unsubmit" ? "undo-variant" : "arrow-right"}
            disabled={fileHeaderAction.disabled}
          />
        )
      : null
    : normalPrimaryLabel
      ? <StudentBottomActionBar primaryLabel={normalPrimaryLabel} onPrimary={openAssessment} />
      : latestSubmittedAttempt
        ? (
            <StudentBottomActionBar
              primaryLabel="View Results"
              primaryIcon="chart-box-outline"
              onPrimary={() => openResults(latestSubmittedAttempt.id)}
            />
          )
        : null;

  return (
    <StudentScreen
      title="Assessment"
      showBackButton
      onBackPress={handleBack}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      bottomAction={bottomAction}
    >
      <StudentContextStrip
        title={heading.code}
        subtitle={heading.name}
        status={latestState.label}
        icon="clipboard-text-outline"
      />

      <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10, backgroundColor: theme.surface }}>
        <Text style={{ color: theme.text, fontSize: 26, lineHeight: 33, fontWeight: "900" }}>
          {assessment.title || "Assessment"}
        </Text>
        <Text style={{ marginTop: 6, color: theme.muted, fontSize: 12, lineHeight: 18 }}>
          {assessment.dueDate ? `Due ${formatDisplayDate(assessment.dueDate)}` : "No due date"}
        </Text>
        <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <ToneTag label={formatAssessmentType(assessment.type)} tone="blue" />
          <ToneTag
            label={isFileUploadAssessment ? "Upload workspace" : `${questionCount} question${questionCount === 1 ? "" : "s"}`}
            tone="purple"
          />
          <ToneTag
            label={`${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} left`}
            tone={attemptsRemaining > 0 ? "amber" : "red"}
          />
        </View>
      </View>

      {hasQueryError ? (
        <StudentInlineNotice
          title="Some assessment data is unavailable"
          description={peekAppError(hasQueryError).message}
          icon="cloud-alert-outline"
          tone="amber"
        />
      ) : null}

      {notice ? (
        <StudentInlineNotice title="Assessment update" description={notice} icon="information-outline" tone="blue" />
      ) : null}

      <StudentFlatSection title="Assessment details" subtitle="What you need to know before you begin.">
        <AssessmentFactsLedger
          dueDate={assessment.dueDate}
          totalPoints={totalPoints}
          passingRequirement={passingRequirement}
          timeLimitMinutes={assessment.timeLimitMinutes}
          maxAttempts={assessment.maxAttempts ?? 1}
          attemptsRemaining={attemptsRemaining}
        />
        <View style={{ paddingHorizontal: 16, paddingVertical: 15 }}>
          <Text style={{ color: theme.text, fontSize: 12, fontWeight: "900" }}>Instructions</Text>
          <Text style={{ marginTop: 6, color: theme.subtext, fontSize: 13, lineHeight: 21 }}>
            {instructions || "No instructions were provided for this assessment."}
          </Text>
          <Text style={{ marginTop: 8, color: theme.muted, fontSize: 10, lineHeight: 15 }}>
            Pass target: {passingRequirement.headline}
          </Text>
        </View>
      </StudentFlatSection>

      {isFileUploadAssessment && assessment.teacherAttachmentFile ? (
        <StudentFlatSection title="Reference material" subtitle="Teacher-provided file for this upload task.">
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
                        assessmentsApi.openTeacherAttachment(
                          assessmentId,
                          assessment.teacherAttachmentFile?.originalName || "teacher-attachment",
                        ).then(() => undefined),
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
                      () => assessmentsApi.downloadTeacherAttachment(
                        assessmentId,
                        assessment.teacherAttachmentFile?.originalName || "teacher-attachment",
                      ).then(() => undefined),
                      "Reference material saved to this device.",
                    )
                  }
                />
              </>
            }
          />
        </StudentFlatSection>
      ) : null}

      {isFileUploadAssessment ? (
        <StudentFlatSection
          title="My work"
          subtitle={latestAttemptFiles.length > 0
            ? `${latestAttemptFiles.length} attachment${latestAttemptFiles.length === 1 ? "" : "s"} currently included.`
            : "No attachments have been added yet."}
        >
          {fileWorkspaceLabel ? (
            <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
              <ActionButton label={fileWorkspaceLabel} onPress={openAssessment} />
            </View>
          ) : !fileWorkspaceLabel && latestSubmittedAttempt ? (
            <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
              <ActionButton label="View Results" onPress={() => openResults(latestSubmittedAttempt.id)} variant="secondary" />
            </View>
          ) : null}

          {latestAttemptFiles.length > 0 ? latestAttemptFiles.map((file, index) => {
            const canRemove = latestAttempt?.isSubmitted === false;
            return (
              <FileRow
                key={`${file.id || file.originalName || "file"}-${index}`}
                file={file}
                actions={latestFileAttemptId ? (
                  <>
                    {isImageFile(file) ? (
                      <ActionButton
                        label="Open"
                        compact
                        variant="ghost"
                        disabled={busyAction === `open-${file.id}`}
                        onPress={() => void runFileAction(`open-${file.id}`, () =>
                          assessmentsApi.openAttemptSubmissionAttachmentFile(
                            latestFileAttemptId,
                            file.id,
                            file.originalName || "submission-file",
                          ).then(() => undefined),
                        )}
                      />
                    ) : null}
                    <ActionButton
                      label="Download"
                      compact
                      variant="secondary"
                      disabled={busyAction === `download-${file.id}`}
                      onPress={() => void runFileAction(
                        `download-${file.id}`,
                        () => assessmentsApi.downloadAttemptSubmissionAttachmentFile(
                          latestFileAttemptId,
                          file.id,
                          file.originalName || "submission-file",
                        ).then(() => undefined),
                        "Submission file saved to this device.",
                      )}
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
                ) : null}
              />
            );
          }) : (
            <Text style={{ paddingHorizontal: 16, paddingBottom: 15, fontSize: 12, lineHeight: 18, color: theme.muted }}>
              Open the upload workspace to attach files from your device, review them, or remove them before submitting.
            </Text>
          )}
        </StudentFlatSection>
      ) : null}

      <StudentFlatSection
        title="Latest activity"
        subtitle={latestAttempt
          ? `Attempt #${latestAttempt.attemptNumber ?? submittedAttempts.length ?? 1}`
          : "No attempt has been started yet."}
        action={<ToneTag label={latestState.label} tone={latestState.tone} />}
      >
        <View style={{ paddingHorizontal: 16, paddingBottom: 15 }}>
          <Text style={{ fontSize: 13, lineHeight: 20, color: theme.subtext }}>{latestState.summary}</Text>
          {latestSubmittedAttempt?.submittedAt ? (
            <Text style={{ marginTop: 9, fontSize: 11, color: theme.muted }}>
              Latest submission: {formatAttemptDate(latestSubmittedAttempt.submittedAt)}
            </Text>
          ) : latestAttempt?.startedAt ? (
            <Text style={{ marginTop: 9, fontSize: 11, color: theme.muted }}>
              Started: {formatAttemptDate(latestAttempt.startedAt)}
            </Text>
          ) : null}
          <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {isFileUploadAssessment ? (
              latestSubmittedAttempt ? (
                <ActionButton label="View Results" onPress={() => openResults(latestSubmittedAttempt.id)} variant="secondary" />
              ) : null
            ) : (
              <>
                {latestSubmittedAttempt ? (
                  <ActionButton label="View Results" onPress={() => openResults(latestSubmittedAttempt.id)} variant="secondary" />
                ) : null}
                <ActionButton label="Open History" onPress={openHistory} variant="secondary" />
              </>
            )}
          </View>
        </View>
      </StudentFlatSection>

      {!isFileUploadAssessment && submittedAttempts.length > 0 ? (
        <StudentFlatSection
          title="Attempt history"
          subtitle={`${submittedAttempts.length} submitted attempt${submittedAttempts.length === 1 ? "" : "s"} recorded.`}
          action={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Attempt history"
              accessibilityState={{ expanded: historyExpanded }}
              onPress={() => setHistoryExpanded((current) => !current)}
              style={{ width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: theme.active }}
            >
              <MaterialCommunityIcons name={historyExpanded ? "chevron-up" : "chevron-down"} size={18} color={theme.text} />
            </Pressable>
          }
        >
          {historyExpanded ? submittedAttempts.map((attempt, index) => {
            const statusTone = attempt.isReturned ? "green" : "amber";
            const statusLabel = attempt.isReturned ? "Reviewed" : "Awaiting review";
            return (
              <View key={attempt.id} style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingHorizontal: 16, paddingVertical: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: theme.text }}>
                      Attempt #{attempt.attemptNumber ?? index + 1}
                    </Text>
                    <Text style={{ marginTop: 3, fontSize: 10, color: theme.muted }}>
                      {formatAttemptDate(attempt.submittedAt || attempt.createdAt)}
                    </Text>
                  </View>
                  <ToneTag label={statusLabel} tone={statusTone} />
                </View>
                {attempt.score !== undefined && attempt.score !== null ? (
                  <Text style={{ marginTop: 8, fontSize: 12, color: theme.subtext }}>
                    Score: <Text style={{ color: theme.text, fontWeight: "800" }}>{Math.round(attempt.score)}%</Text>
                  </Text>
                ) : null}
                <View style={{ marginTop: 10, flexDirection: "row" }}>
                  <ActionButton label="Open Attempt" onPress={() => openResults(attempt.id)} variant="secondary" />
                </View>
              </View>
            );
          }) : null}
        </StudentFlatSection>
      ) : null}

      <View style={{ height: 24 }} />
    </StudentScreen>
  );
}
