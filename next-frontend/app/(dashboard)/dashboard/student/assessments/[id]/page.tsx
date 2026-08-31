"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Clock3, Paperclip, Target } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { RichTextRenderer } from "@/components/shared/rich-text/RichTextRenderer";
import { getMotionProps } from "@/components/student/student-motion";
import { StudentEmptyState } from "@/components/student/student-primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { assessmentService } from "@/services/assessment-service";
import type { Assessment, AssessmentAttempt } from "@/types/assessment";
import { formatDate } from "@/utils/helpers";
import {
  getLatestReturnedAttempt,
  getLatestSubmittedAttempt,
  getSubmittedAttempts,
} from "@/utils/student-assessment-routing";

type StatusTone = "success" | "warning" | "danger" | "neutral" | "info";

function toAssessmentTypeLabel(type: string) {
  return type
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getAttemptStatus(attempt: AssessmentAttempt): {
  tone: StatusTone;
  label: string;
} {
  if (attempt.isReturned === false) {
    return { tone: "warning", label: "Awaiting Review" };
  }

  if (attempt.passed) {
    return {
      tone: "success",
      label: `Passed${attempt.score != null ? ` - ${attempt.score}%` : ""}`,
    };
  }

  return {
    tone: "danger",
    label: `Needs Improvement${attempt.score != null ? ` - ${attempt.score}%` : ""}`,
  };
}

function getToneClasses(tone: StatusTone) {
  if (tone === "success") {
    return "border-[var(--student-success-border)] bg-[var(--student-success-bg)] text-[var(--student-success-text)]";
  }
  if (tone === "warning") {
    return "border-[var(--student-warning-border)] bg-[var(--student-warning-bg)] text-[var(--student-warning-text)]";
  }
  if (tone === "danger") {
    return "border-[var(--student-danger-border)] bg-[var(--student-danger-bg)] text-[var(--student-red-hover)]";
  }
  if (tone === "info") {
    return "border-[var(--student-outline)] bg-[var(--student-surface-soft)] text-[var(--student-navy-soft)]";
  }
  return "border-[var(--student-outline)] bg-white text-[var(--student-text-strong)]";
}

function SummaryMetric({
  label,
  value,
  caption,
}: {
  label: string;
  value: string | number;
  caption?: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--student-text-muted)]">
        {label}
      </p>
      <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
        <strong className="block text-[1.35rem] font-black leading-none text-[var(--student-text-strong)]">
          {value}
        </strong>
        {caption ? (
          <span className="block pb-0.5 text-xs text-[var(--student-text-muted)]">
            {caption}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default function StudentAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const assessmentId = params.id as string;
  const classId = searchParams.get("classId");
  const reduceMotion = useReducedMotion();
  const motionProps = getMotionProps(!!reduceMotion);

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [unsubmittingAttemptId, setUnsubmittingAttemptId] = useState<
    string | null
  >(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [assessmentRes, attemptsRes] = await Promise.all([
        assessmentService.getById(assessmentId),
        assessmentService.getStudentAttempts(assessmentId),
      ]);
      setAssessment(assessmentRes.data);
      setAttempts(attemptsRes.data || []);
    } catch {
      toast.error("Failed to load assessment");
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    const viewMode = searchParams.get("view");
    const hasDraftAttempt = attempts.some(
      (attempt) => attempt.isSubmitted === false,
    );
    if (
      !loading &&
      assessment?.type === "file_upload" &&
      (!assessment.academicCapabilities ||
        (hasDraftAttempt
          ? assessment.academicCapabilities.canContinue
          : assessment.academicCapabilities.canStart)) &&
      viewMode !== "submitted" &&
      !getLatestReturnedAttempt(attempts) &&
      (hasDraftAttempt || attempts.length === 0)
    ) {
      router.replace(`/dashboard/student/assessments/${assessmentId}/take`);
    }
  }, [assessment, assessmentId, attempts, loading, router, searchParams]);

  const submittedAttempts = getSubmittedAttempts(attempts);
  const latestSubmittedFileAttempt =
    assessment?.type === "file_upload"
      ? getLatestSubmittedAttempt(attempts)
      : null;
  const latestReturnedAttempt = getLatestReturnedAttempt(attempts);
  const hasDraftAttempt = attempts.some(
    (attempt) => attempt.isSubmitted === false,
  );
  const maxAttempts = assessment?.maxAttempts ?? 1;
  const attemptsRemaining = Math.max(0, maxAttempts - submittedAttempts.length);
  const isAlreadyGraded = Boolean(latestReturnedAttempt?.isReturned);
  const academicAllowed =
    !assessment?.academicCapabilities ||
    (hasDraftAttempt
      ? assessment.academicCapabilities.canContinue
      : assessment.academicCapabilities.canStart);
  const canStart =
    academicAllowed &&
    !isAlreadyGraded &&
    (hasDraftAttempt || attemptsRemaining > 0);
  const questionCount = assessment?.questions?.length ?? 0;
  const dueDateLabel = assessment?.dueDate
    ? `Due ${formatDate(assessment.dueDate)}`
    : "No due date";
  const backHref = classId
    ? `/dashboard/student/classes/${classId}?view=assignments`
    : "/dashboard/student";
  const primaryActionLabel = starting
    ? "Starting..."
    : isAlreadyGraded
      ? "Already graded"
      : submittedAttempts.length > 0
        ? `Retake (${attemptsRemaining} left)`
        : "Start Assessment";

  const handleStart = async () => {
    if (!canStart) return;
    try {
      setStarting(true);
      const res = await assessmentService.startAttempt(assessmentId);
      const { attempt, timeLimitMinutes } = res.data;
      let url = `/dashboard/student/assessments/${assessmentId}/take?attemptId=${attempt.id}`;
      if (timeLimitMinutes) url += `&timeLimit=${timeLimitMinutes}`;
      router.push(url);
    } catch (err: unknown) {
      const message =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response
          ?.data?.message === "string"
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : "Failed to start assessment";
      toast.error(message);
    } finally {
      setStarting(false);
    }
  };

  const handleUnsubmitFileUpload = async () => {
    if (!latestSubmittedFileAttempt) return;
    try {
      setUnsubmittingAttemptId(latestSubmittedFileAttempt.id);
      const res = await assessmentService.unsubmitFileUpload(assessmentId);
      toast.success(
        "Submission restored. You can continue editing your file upload.",
      );
      await fetchData();
      router.push(
        `/dashboard/student/assessments/${assessmentId}/take?attemptId=${res.data.id}`,
      );
    } catch (err: unknown) {
      const message =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response
          ?.data?.message === "string"
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : "Failed to restore file upload draft";
      toast.error(message);
    } finally {
      setUnsubmittingAttemptId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl space-y-4">
        <Skeleton className="h-10 w-52 rounded-xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  if (!assessment) {
    return (
      <StudentEmptyState
        title="Assessment not found"
        description="This assessment may have been removed or you no longer have access."
        icon={<Target className="h-5 w-5" />}
      />
    );
  }

  const isPastDue = assessment.dueDate
    ? new Date(assessment.dueDate) < new Date()
    : false;
  const workspaceStatusLabel = hasDraftAttempt
    ? "Draft in progress"
    : submittedAttempts.length > 0
      ? "Submitted"
      : "Not turned in";
  const workspaceStatusTone: StatusTone = hasDraftAttempt
    ? "warning"
    : submittedAttempts.length > 0
      ? "success"
      : isPastDue
        ? "danger"
        : "neutral";
  const pageShellClass = "mx-auto w-full max-w-6xl space-y-4 pb-8";
  const heroCardClass =
    "overflow-hidden rounded-[1.1rem] border border-[var(--student-outline)] bg-white shadow-[0_24px_60px_-48px_color-mix(in_srgb,var(--student-navy)_35%,transparent)]";
  const sectionDividerClass = "divide-y divide-[var(--student-outline)]";
  const summaryCardClass =
    "rounded-[1rem] border border-[var(--student-outline)] bg-white px-4 py-3 shadow-[0_10px_24px_-20px_color-mix(in_srgb,var(--student-navy)_22%,transparent)] transition-colors hover:bg-[var(--student-white)]";
  const detailCardClass =
    "rounded-[1rem] border border-[var(--student-outline)] bg-white px-4 py-4 shadow-[0_10px_24px_-20px_color-mix(in_srgb,var(--student-navy)_22%,transparent)]";
  const submittedPillClass =
    "rounded-full border border-[var(--student-outline)] bg-white px-3 py-1 text-sm font-semibold text-[var(--student-text-strong)] shadow-[0_10px_22px_-20px_color-mix(in_srgb,var(--student-navy)_18%,transparent)]";
  const primaryButtonClass =
    "w-full sm:w-auto sm:min-w-[10rem] border border-transparent bg-[var(--student-red)] text-white shadow-none hover:bg-[var(--student-red-hover)]";
  const backButtonClass =
    "inline-flex h-auto items-center gap-2 px-0 py-0 text-[var(--student-text-muted)] hover:bg-transparent hover:text-[var(--student-text-strong)]";
  const submittedMutedTextClass = "text-[var(--student-text-muted)]";
  const submittedStrongTextClass = "text-[var(--student-text-strong)]";
  const submittedChipClass =
    "inline-flex w-fit items-center rounded-full border border-[var(--student-outline)] bg-[var(--student-white)] px-3 py-1 text-sm font-semibold text-[var(--student-text-strong)]";
  const submittedEmptyClass =
    "grid justify-items-center gap-2 rounded-[0.9rem] border border-dashed border-[var(--student-outline)] bg-white px-4 py-8 text-center";
  const submittedEmptyIconClass =
    "grid h-12 w-12 place-items-center rounded-full border border-[var(--student-outline)] bg-[var(--student-white)] text-[var(--student-text-muted)]";
  const submittedListShellClass =
    "overflow-hidden rounded-[0.9rem] border border-[var(--student-outline)] bg-white";
  const submittedListRowClass =
    "bg-white transition-colors hover:bg-[var(--student-white)]";
  const submittedOutlineButtonClass =
    "border-[var(--student-outline)] bg-white text-[var(--student-text-strong)] hover:bg-[var(--student-white)] hover:text-[var(--student-text-strong)]";

  return (
    <div className={pageShellClass}>
      <motion.main {...motionProps.container} className="space-y-4">
        <motion.section {...motionProps.item} className="px-1 py-1">
          <div className="flex flex-col gap-5">
            <div className="min-w-0 space-y-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(backHref)}
                className={backButtonClass}
              >
                <ArrowLeft className="h-4 w-4" />
                {classId ? "Back to class assignments" : "Back to dashboard"}
              </Button>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem_auto] xl:items-start">
                <div className="space-y-2">
                  <h1 className="text-[clamp(1.65rem,2.2vw,2.35rem)] font-black leading-tight tracking-[-0.03em] text-[var(--student-text-strong)]">
                    {assessment.title}
                  </h1>
                  <p className={`text-sm ${submittedMutedTextClass}`}>
                    {dueDateLabel}
                  </p>
                </div>

                <dl className="grid gap-3 text-sm lg:pt-1">
                  <div className="rounded-[1rem] border border-[var(--student-outline)] bg-white px-4 py-3 shadow-[0_10px_24px_-20px_color-mix(in_srgb,var(--student-navy)_22%,transparent)]">
                    <dt
                      className={`text-[11px] font-black uppercase tracking-[0.18em] ${submittedMutedTextClass}`}
                    >
                      Points
                    </dt>
                    <dd
                      className={`mt-1 text-base font-semibold ${submittedStrongTextClass}`}
                    >
                      {assessment.totalPoints ?? 0} points possible
                    </dd>
                  </div>
                  <div
                    className={`rounded-[1rem] border px-4 py-3 shadow-[0_10px_24px_-20px_color-mix(in_srgb,var(--student-navy)_45%,transparent)] ${getToneClasses(workspaceStatusTone)}`}
                  >
                    <dt className="text-[11px] font-black uppercase tracking-[0.18em] opacity-75">
                      Status
                    </dt>
                    <dd className="mt-1 text-base font-semibold">
                      {workspaceStatusLabel}
                    </dd>
                  </div>
                </dl>

                <div className="flex flex-col items-start gap-3 lg:items-end">
                  <div className={submittedPillClass}>
                    {attemptsRemaining} attempt
                    {attemptsRemaining === 1 ? "" : "s"} remaining
                  </div>
                  {canStart ? (
                    <Button
                      onClick={handleStart}
                      disabled={starting}
                      className={primaryButtonClass}
                    >
                      {primaryActionLabel}
                    </Button>
                  ) : (
                    <div className="flex flex-col items-start gap-2 lg:items-end">
                      <Button
                        disabled
                        className="w-full sm:w-auto sm:min-w-[10rem]"
                      >
                        {!academicAllowed
                          ? "Period unavailable"
                          : isAlreadyGraded
                            ? "Already graded"
                            : "No attempts remaining"}
                      </Button>
                      {!academicAllowed && (
                        <p className="max-w-[16rem] text-xs text-[var(--student-text-muted)]">
                          {assessment.academicCapabilities?.readOnlyReason ??
                            "New attempts require the active grading period."}
                        </p>
                      )}
                      {isAlreadyGraded ? (
                        <p className="max-w-[16rem] text-right text-xs text-[var(--student-text-muted)]">
                          Retakes are disabled once your teacher has returned a
                          grade.
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section {...motionProps.item} className={heroCardClass}>
          <div className={sectionDividerClass}>
            <section className="px-4 py-4 md:px-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <div className={summaryCardClass}>
                  <SummaryMetric
                    label="Type"
                    value={toAssessmentTypeLabel(assessment.type)}
                  />
                </div>
                <div className={summaryCardClass}>
                  <SummaryMetric
                    label="Passing Score"
                    value={`${assessment.passingScore ?? 60}%`}
                  />
                </div>
                <div className={summaryCardClass}>
                  <SummaryMetric label="Questions" value={questionCount} />
                </div>
                <div className={summaryCardClass}>
                  <SummaryMetric
                    label="Attempts"
                    value={`${submittedAttempts.length} / ${maxAttempts}`}
                    caption={`${attemptsRemaining} remaining`}
                  />
                </div>
                <div className={summaryCardClass}>
                  <SummaryMetric
                    label="Time Limit"
                    value={
                      assessment.timeLimitMinutes
                        ? assessment.timeLimitMinutes
                        : "No limit"
                    }
                    caption={
                      assessment.timeLimitMinutes ? "minutes" : "untimed"
                    }
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3 px-4 py-4 md:px-5">
              <div>
                <p
                  className={`text-[11px] font-black uppercase tracking-[0.18em] ${submittedMutedTextClass}`}
                >
                  Instructions
                </p>
                <p className={`mt-1 text-sm ${submittedMutedTextClass}`}>
                  Review the task details before you begin your submission.
                </p>
              </div>
              <div className={detailCardClass}>
                {assessment.description ? (
                  <RichTextRenderer
                    html={assessment.description}
                    className="rich-text-renderer text-sm text-[var(--student-text-strong)]"
                  />
                ) : (
                  <p className="text-sm text-[var(--student-text-strong)]">
                    No instructions provided yet.
                  </p>
                )}
              </div>
            </section>

            {assessment.teacherAttachmentFile && (
              <section className="space-y-3 px-4 py-4 md:px-5">
                <div>
                  <p
                    className={`text-[11px] font-black uppercase tracking-[0.18em] ${submittedMutedTextClass}`}
                  >
                    Reference Material
                  </p>
                </div>
                <div className="flex items-center gap-3 rounded-[1rem] border border-[var(--student-outline)] bg-white px-4 py-3 transition-colors hover:bg-[var(--student-white)]">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[0.85rem] bg-[var(--student-white)] text-[var(--student-text-muted)]">
                    <Paperclip className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`truncate font-semibold ${submittedStrongTextClass}`}
                    >
                      {assessment.teacherAttachmentFile.originalName}
                    </p>
                    <p className={`mt-1 text-xs ${submittedMutedTextClass}`}>
                      {assessment.teacherAttachmentFile.mimeType}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {(assessment.rubricCriteria?.length ?? 0) > 0 && (
              <section className="space-y-3 px-4 py-4 md:px-5">
                <div>
                  <h2
                    className={`text-base font-black ${submittedStrongTextClass}`}
                  >
                    Rubric
                  </h2>
                  <p className={`mt-1 text-sm ${submittedMutedTextClass}`}>
                    These are the criteria your teacher will review.
                  </p>
                </div>

                <div className={submittedListShellClass}>
                  {assessment.rubricCriteria?.map((criterion, index) => (
                    <div
                      key={criterion.id}
                      className={`flex flex-col gap-2 px-4 py-3 md:flex-row md:items-start md:justify-between ${submittedListRowClass} ${
                        index > 0
                          ? "border-t border-[var(--student-outline)]"
                          : ""
                      }`}
                    >
                      <div>
                        <strong
                          className={`block text-sm font-bold ${submittedStrongTextClass}`}
                        >
                          {criterion.title}
                        </strong>
                        {criterion.description ? (
                          <p
                            className={`mt-1 text-sm ${submittedMutedTextClass}`}
                          >
                            {criterion.description}
                          </p>
                        ) : null}
                      </div>
                      <span className={submittedChipClass}>
                        {criterion.points} pts
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-3 px-4 py-4 md:px-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2
                    className={`text-base font-black ${submittedStrongTextClass}`}
                  >
                    My Attempts
                  </h2>
                  <p className={`mt-1 text-sm ${submittedMutedTextClass}`}>
                    {submittedAttempts.length > 0
                      ? `${submittedAttempts.length} submitted attempt${submittedAttempts.length === 1 ? "" : "s"}`
                      : "Your submitted work will appear here after you turn it in."}
                  </p>
                </div>
                {isPastDue ? (
                  <p className="text-sm text-[var(--student-danger-text)]">
                    This assessment is already past due.
                  </p>
                ) : null}
              </div>

              {submittedAttempts.length === 0 ? (
                <div className={submittedEmptyClass}>
                  <div className={submittedEmptyIconClass}>
                    <ClipboardAttemptIcon />
                  </div>
                  <strong
                    className={`text-sm font-bold ${submittedStrongTextClass}`}
                  >
                    No attempts yet
                  </strong>
                  <p className={`max-w-md text-sm ${submittedMutedTextClass}`}>
                    Start this assessment when you are ready.
                  </p>
                </div>
              ) : (
                <div className={submittedListShellClass}>
                  {submittedAttempts.map((attempt, index) => {
                    const status = getAttemptStatus(attempt);

                    return (
                      <article
                        key={attempt.id}
                        className={`flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between ${submittedListRowClass} ${
                          index > 0
                            ? "border-t border-[var(--student-outline)]"
                            : ""
                        }`}
                      >
                        <div className="space-y-1">
                          <strong
                            className={`block text-sm font-bold ${submittedStrongTextClass}`}
                          >
                            Attempt #{attempt.attemptNumber ?? "?"}
                          </strong>
                          <span
                            className={`block text-xs ${submittedMutedTextClass}`}
                          >
                            {formatDate(
                              attempt.submittedAt || attempt.createdAt || "",
                            )}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center md:justify-end">
                          <span
                            className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-sm font-semibold ${getToneClasses(status.tone)}`}
                          >
                            {status.label}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className={submittedOutlineButtonClass}
                            onClick={() =>
                              router.push(
                                `/dashboard/student/assessments/${assessmentId}/results/${attempt.id}`,
                              )
                            }
                          >
                            View Results
                          </Button>
                          {assessment.type === "file_upload" &&
                            latestSubmittedFileAttempt?.id === attempt.id &&
                            attempt.isReturned === false && (
                              <Button
                                variant="outline"
                                size="sm"
                                className={submittedOutlineButtonClass}
                                onClick={handleUnsubmitFileUpload}
                                disabled={unsubmittingAttemptId === attempt.id}
                              >
                                {unsubmittingAttemptId === attempt.id
                                  ? "Restoring..."
                                  : "Unsubmit"}
                              </Button>
                            )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </motion.section>
      </motion.main>
    </div>
  );
}

function ClipboardAttemptIcon() {
  return <Clock3 className="h-5 w-5" />;
}
