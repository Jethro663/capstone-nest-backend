'use client';

import { useState, useEffect, useMemo, type Dispatch, type SetStateAction } from 'react';
import Image from 'next/image';
import { assessmentService } from '@/services/assessment-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { RichTextRenderer } from '@/components/shared/rich-text/RichTextRenderer';
import type {
  ManualResponseScore,
  RubricCriterion,
  RubricScore,
  SubmissionTimelineEntry,
  SubmissionsResponse,
  StudentSubmission,
  SubmissionStatus,
  StudentAttemptSummary,
} from '@/types/assessment';

interface ReviewTabProps {
  assessmentId: string;
  submissions: SubmissionsResponse | null;
  onGradeReturned: () => void;
}

interface AttemptOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface AttemptQuestion {
  type?: string;
  content?: string;
  points?: number;
  explanation?: string;
  imageUrl?: string;
  options?: AttemptOption[];
}

interface AttemptResponse {
  id?: string;
  questionId?: string;
  studentAnswer?: string;
  selectedOptionId?: string;
  selectedOptionIds?: string[];
  isCorrect?: boolean | null;
  pointsEarned?: number;
  question?: AttemptQuestion;
}

interface AttemptResultData {
  score?: number;
  directScore?: number | null;
  rubricScores?: RubricScore[];
  isReturned?: boolean;
  teacherFeedback?: string;
  assessment?: {
    type?: string;
    totalPoints?: number;
    rubricCriteria?: RubricCriterion[];
  };
  responses?: AttemptResponse[];
  submittedFile?: {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt: string;
  } | null;
  submittedFiles?: Array<{
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt: string;
  }>;
}

function canPreviewSubmissionFile(mimeType?: string | null) {
  if (!mimeType) return false;
  return (
    mimeType.startsWith('image/')
    || mimeType === 'application/pdf'
    || mimeType.startsWith('text/')
  );
}

function normalizeScoreTextInput(value: string, max: number) {
  const digits = value.replace(/\D+/g, '');
  if (!digits) return '';

  const numericValue = Number(digits);
  if (!Number.isFinite(numericValue)) return '';

  return String(Math.min(numericValue, max));
}

function formatTimelineAction(entry: SubmissionTimelineEntry, attempts: StudentAttemptSummary[]) {
  const attempt = attempts.find((current) => current.id === entry.attemptId);
  const attemptLabel = attempt?.attemptNumber ? `Attempt ${attempt.attemptNumber}` : 'Attempt';
  const fileLabel = typeof entry.metadata?.originalName === 'string' ? entry.metadata.originalName : null;

  switch (entry.action) {
    case 'assessment.submission.file_uploaded':
      return `${attemptLabel}: attached ${fileLabel ?? 'a file'}`;
    case 'assessment.submission.file_removed':
      return `${attemptLabel}: removed ${fileLabel ?? 'a file'}`;
    case 'assessment.submission.submitted':
      return `${attemptLabel}: submitted for review`;
    case 'assessment.submission.unsubmitted':
      return `${attemptLabel}: restored to draft`;
    case 'assessment.submission.auto_submitted':
      return `${attemptLabel}: auto-submitted`;
    case 'assessment.grade.returned':
      return `${attemptLabel}: grade posted`;
    case 'assessment.grade.unreturned':
      return `${attemptLabel}: posted grade withdrawn`;
    default:
      return `${attemptLabel}: ${entry.action}`;
  }
}

const STATUS_COLORS: Record<SubmissionStatus, string> = {
  not_started: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  turned_in: 'bg-amber-100 text-amber-700',
  returned: 'bg-emerald-100 text-emerald-700',
};

const STATUS_LABELS: Record<SubmissionStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  turned_in: 'Pending Score',
  returned: 'Posted',
};

export function ReviewTab({ assessmentId, submissions, onGradeReturned }: ReviewTabProps) {
  const hasAssessmentId = Boolean(assessmentId);

  const studentsWithAttempts = (submissions?.submissions ?? []).filter(
    (s) => (s.attempts?.some((a) => a.isSubmitted) ?? false) || s.attempt?.isSubmitted,
  );

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    studentsWithAttempts[0]?.studentId ?? null,
  );
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [attemptData, setAttemptData] = useState<AttemptResultData | null>(null);
  const [loadingAttempt, setLoadingAttempt] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [returning, setReturning] = useState(false);
  const [unreturning, setUnreturning] = useState(false);
  const [search, setSearch] = useState('');
  const [directScore, setDirectScore] = useState<string>('');
  const [rubricScores, setRubricScores] = useState<RubricScore[]>([]);
  const [manualScoreInputs, setManualScoreInputs] = useState<Record<string, string>>({});

  const selectedStudent = studentsWithAttempts.find((s) => s.studentId === selectedStudentId);

  const selectedStudentAttempts = (selectedStudent?.attempts ?? [])
    .filter((attempt) => attempt.isSubmitted)
    .sort((a, b) => {
      const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return bTime - aTime;
    });

  const fallbackLatestAttempt = selectedStudent?.attempt?.isSubmitted
    ? selectedStudent.attempt
    : null;
  const reviewableAttempts = selectedStudentAttempts.length > 0
    ? selectedStudentAttempts
    : (fallbackLatestAttempt ? [fallbackLatestAttempt] : []);
  const selectedAttempt = reviewableAttempts.find((attempt) => attempt.id === selectedAttemptId)
    ?? reviewableAttempts[0]
    ?? null;

  const firstReviewableAttemptId = reviewableAttempts[0]?.id ?? null;

  useEffect(() => {
    setSelectedAttemptId(firstReviewableAttemptId);
  }, [selectedStudentId, firstReviewableAttemptId]);

  useEffect(() => {
    if (!selectedAttempt?.id) {
      setAttemptData(null);
      setFeedback('');
      setManualScoreInputs({});
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoadingAttempt(true);
      try {
        const res = await assessmentService.getAttemptResults(selectedAttempt.id);
        if (!cancelled) {
          const payload = res.data as unknown as AttemptResultData;
          setAttemptData(payload);
          setFeedback(payload.teacherFeedback ?? '');
          const criteria = payload.assessment?.rubricCriteria ?? [];
          setRubricScores(
            criteria.length > 0
              ? criteria.map((criterion) => {
                  const existing = payload.rubricScores?.find((score) => score.criterionId === criterion.id);
                  return {
                    criterionId: criterion.id,
                    pointsEarned: existing?.pointsEarned ?? 0,
                    feedback: existing?.feedback ?? '',
                  };
                })
              : [],
          );
          setDirectScore(
            payload.directScore === null || payload.directScore === undefined
              ? (payload.score === null || payload.score === undefined ? '' : String(payload.score))
              : String(payload.directScore),
          );
          setManualScoreInputs(
            Object.fromEntries(
              (payload.responses ?? [])
                .filter((response) => Boolean(response.questionId))
                .map((response) => [response.questionId as string, String(response.pointsEarned ?? 0)]),
            ),
          );
        }
      } catch {
        if (!cancelled) toast.error('Failed to load student attempt');
      } finally {
        if (!cancelled) setLoadingAttempt(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [selectedAttempt?.id]);

  const handleReturnGrade = async () => {
    if (!selectedStudent || !selectedAttempt?.id) return;
    try {
      setReturning(true);
      const isFileUploadAssessment = attemptData?.assessment?.type === 'file_upload';
      const normalizedManualResponseScores: ManualResponseScore[] = !isFileUploadAssessment
        ? (attemptData?.responses ?? [])
          .filter((response): response is AttemptResponse & { questionId: string; question: AttemptQuestion } => (
            Boolean(response.questionId) && Boolean(response.question)
          ))
          .map((response) => ({
            questionId: response.questionId,
            pointsEarned: Number(
              normalizeScoreTextInput(
                manualScoreInputs[response.questionId] ?? String(response.pointsEarned ?? 0),
                response.question.points ?? 0,
              ) || '0',
            ),
          }))
        : [];

      await assessmentService.returnGrade(selectedAttempt.id, {
        teacherFeedback: feedback || undefined,
        directScore:
          isFileUploadAssessment && (attemptData?.assessment?.rubricCriteria?.length ?? 0) === 0 && directScore !== ''
            ? Number(directScore)
            : undefined,
        rubricScores:
          isFileUploadAssessment && (attemptData?.assessment?.rubricCriteria?.length ?? 0) > 0
            ? rubricScores
            : undefined,
        manualResponseScores:
          !isFileUploadAssessment && normalizedManualResponseScores.length > 0
            ? normalizedManualResponseScores
            : undefined,
      });
      toast.success(
        `Grade returned to ${selectedStudent.firstName} ${selectedStudent.lastName} (Attempt ${selectedAttempt.attemptNumber ?? '?'})`,
      );
      onGradeReturned();
    } catch (err: unknown) {
      const errorMessage =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to return grade';
      toast.error(errorMessage);
    } finally {
      setReturning(false);
    }
  };

  const handleUnreturnGrade = async () => {
    if (!selectedStudent || !selectedAttempt?.id) return;
    try {
      setUnreturning(true);
      await assessmentService.unreturnGrade(selectedAttempt.id);
      toast.success(
        `Posted grade restored to pending review for ${selectedStudent.firstName} ${selectedStudent.lastName}`,
      );
      onGradeReturned();
    } catch (err: unknown) {
      const errorMessage =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to restore the posted grade';
      toast.error(errorMessage);
    } finally {
      setUnreturning(false);
    }
  };

  const filteredStudents = studentsWithAttempts.filter((s) => {
    if (!search) return true;
    const name = `${s.firstName} ${s.lastName}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  if (!hasAssessmentId || studentsWithAttempts.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          <p className="text-lg font-medium mb-1">No submissions to review</p>
          <p className="text-sm">Student answers will appear here once they submit the assessment.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex min-h-[500px] gap-4 rounded-[1.15rem] bg-slate-50/70 p-3">
      {/* Left Sidebar — Student List */}
      <div className="w-72 shrink-0 space-y-3">
        <input
          type="text"
          placeholder="Search students…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.3)] focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
        <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
          {filteredStudents.map((student, i) => (
            <motion.button
              key={student.studentId}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setSelectedStudentId(student.studentId)}
              className={cn(
                'w-full rounded-xl border px-3 py-3 text-left text-sm shadow-[0_10px_24px_-24px_rgba(15,23,42,0.35)] transition-colors',
                selectedStudentId === student.studentId
                  ? 'border-slate-300 bg-white'
                  : 'border-slate-200 bg-white hover:bg-slate-50',
              )}
            >
              <p className="font-medium truncate">
                {student.lastName}, {student.firstName}
              </p>
              <div className="flex items-center justify-between mt-1">
                <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium', STATUS_COLORS[student.status])}>
                  {STATUS_LABELS[student.status]}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">
                    {student.totalAttempts ?? student.attempts?.length ?? (student.attempt ? 1 : 0)} att.
                  </span>
                {student.attempt?.score != null && (
                  <span className="text-xs font-semibold">{student.attempt.score}%</span>
                )}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Right Panel — Student Attempt Detail */}
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          {loadingAttempt ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-40 rounded-lg" />
              <Skeleton className="h-40 rounded-lg" />
            </motion.div>
          ) : attemptData && selectedStudent ? (
            <motion.div key={selectedStudent.studentId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <AttemptDetailPanel
                student={selectedStudent}
                selectedAttempt={selectedAttempt}
                attempts={reviewableAttempts}
                onSelectAttempt={setSelectedAttemptId}
                data={attemptData}
                feedback={feedback}
                setFeedback={setFeedback}
                directScore={directScore}
                setDirectScore={setDirectScore}
                manualScoreInputs={manualScoreInputs}
                setManualScoreInputs={setManualScoreInputs}
                rubricScores={rubricScores}
                setRubricScores={setRubricScores}
                onReturn={handleReturnGrade}
                onUndoReturn={handleUnreturnGrade}
                returning={returning}
                unreturning={unreturning}
              />
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground">
                  Select a student to review their answers.
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function AttemptDetailPanel({
  student,
  selectedAttempt,
  attempts,
  onSelectAttempt,
  data,
  feedback,
  setFeedback,
  directScore,
  setDirectScore,
  manualScoreInputs,
  setManualScoreInputs,
  rubricScores,
  setRubricScores,
  onReturn,
  onUndoReturn,
  returning,
  unreturning,
}: {
  student: StudentSubmission;
  selectedAttempt: StudentAttemptSummary | null;
  attempts: StudentAttemptSummary[];
  onSelectAttempt: (attemptId: string) => void;
  data: AttemptResultData;
  feedback: string;
  setFeedback: (v: string) => void;
  directScore: string;
  setDirectScore: (value: string) => void;
  manualScoreInputs: Record<string, string>;
  setManualScoreInputs: Dispatch<SetStateAction<Record<string, string>>>;
  rubricScores: RubricScore[];
  setRubricScores: Dispatch<SetStateAction<RubricScore[]>>;
  onReturn: () => void;
  onUndoReturn: () => void;
  returning: boolean;
  unreturning: boolean;
}) {
  const totalPoints = data.assessment?.totalPoints ?? 0;
  const responses = useMemo(() => data.responses ?? [], [data.responses]);
  const isFileUploadAssessment = data.assessment?.type === 'file_upload';
  const submittedFiles = data.submittedFiles?.length
    ? data.submittedFiles
    : (data.submittedFile ? [data.submittedFile] : []);
  const hasSubmissionFile = Boolean(submittedFiles.length > 0 && selectedAttempt?.id);
  const timeSpent = selectedAttempt?.timeSpentSeconds ?? student.attempt?.timeSpentSeconds;
  const submittedAt = selectedAttempt?.submittedAt;
  const isReturned = Boolean(selectedAttempt?.isReturned ?? data?.isReturned ?? student.status === 'returned');
  const latestAttemptId = attempts[0]?.id ?? null;
  const isLatestAttempt = !latestAttemptId || selectedAttempt?.id === latestAttemptId;
  const timeline = student.timeline ?? [];
  const rubricCriteria = useMemo(
    () => data.assessment?.rubricCriteria ?? [],
    [data.assessment?.rubricCriteria],
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<(typeof submittedFiles)[number] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [rubricInputValues, setRubricInputValues] = useState<Record<string, string>>({});
  const score = useMemo(() => {
    if (!isReturned && !isFileUploadAssessment && responses.length > 0) {
      const earnedPoints = responses.reduce((total, response) => {
        const questionMaxPoints = response.question?.points ?? 0;
        const normalizedValue = normalizeScoreTextInput(
          manualScoreInputs[response.questionId ?? ''] ?? String(response.pointsEarned ?? 0),
          questionMaxPoints,
        );

        return total + Number(normalizedValue || '0');
      }, 0);

      return Math.round((earnedPoints / Math.max(totalPoints, 1)) * 100);
    }

    return data.score ?? selectedAttempt?.score ?? student.attempt?.score ?? 0;
  }, [
    data.score,
    isFileUploadAssessment,
    isReturned,
    manualScoreInputs,
    responses,
    selectedAttempt?.score,
    student.attempt?.score,
    totalPoints,
  ]);

  const formatDateTime = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? '-'
      : date.toLocaleString([], {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    setPreviewError(null);
    setPreviewLoading(false);
    setPreviewFile(null);
    setPreviewUrl((currentUrl) => {
      if (currentUrl) {
        window.URL.revokeObjectURL(currentUrl);
      }
      return null;
    });
  }, [selectedAttempt?.id]);

  useEffect(() => {
    if (rubricCriteria.length === 0) {
      setRubricInputValues({});
      return;
    }

    setRubricInputValues(
      Object.fromEntries(
        rubricCriteria.map((criterion) => {
          const currentScore = rubricScores.find((score) => score.criterionId === criterion.id);
          return [criterion.id, String(currentScore?.pointsEarned ?? 0)];
        }),
      ),
    );
  }, [rubricCriteria, rubricScores]);

  const handlePreviewFile = async (file: (typeof submittedFiles)[number]) => {
    if (!selectedAttempt?.id) return;
    const canPreviewFile = canPreviewSubmissionFile(file.mimeType);

    if (!canPreviewFile) {
      await assessmentService.openAttemptSubmissionFile(
        selectedAttempt.id,
        file.originalName,
        file.id,
      );
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewFile(file);
    try {
      const { blob } = await assessmentService.getAttemptSubmissionFileBlob(
        selectedAttempt.id,
        file.originalName,
        file.id,
      );
      setPreviewUrl((currentUrl) => {
        if (currentUrl) {
          window.URL.revokeObjectURL(currentUrl);
        }
        return window.URL.createObjectURL(blob);
      });
    } catch {
      setPreviewError('Failed to load the submitted file preview.');
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {attempts.length > 1 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Attempts</p>
            <div className="flex flex-wrap gap-2">
              {attempts.map((attempt) => (
                <button
                  key={attempt.id}
                  type="button"
                  onClick={() => onSelectAttempt(attempt.id)}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-left transition-colors',
                    selectedAttempt?.id === attempt.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Attempt {attempt.attemptNumber ?? '?'}</span>
                    {attempt.isReturned ? (
                      <Badge className="h-5 px-1.5 text-[10px]" variant="default">Posted</Badge>
                    ) : (
                      <Badge className="h-5 px-1.5 text-[10px]" variant="secondary">Pending</Badge>
                    )}
                    {attempt.id === latestAttemptId && (
                      <Badge className="h-5 px-1.5 text-[10px]" variant="outline">Latest</Badge>
                    )}
                    {attempt.isLate && (
                      <Badge className="h-5 px-1.5 text-[10px]" variant="destructive">Late</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDateTime(attempt.submittedAt)}
                    {attempt.score != null ? ` | ${attempt.score}%` : ''}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isFileUploadAssessment && timeline.length > 0 && (
        <Card className="border-slate-200 bg-white shadow-[0_18px_36px_-30px_rgba(15,23,42,0.35)]">
          <CardContent className="p-0">
            <button
              type="button"
              onClick={() => setTimelineOpen((current) => !current)}
              className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Submission Timeline
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Full history of uploads, submits, reversals, and score posting.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="border-slate-200 bg-white text-[11px] text-slate-600">
                  {timeline.length} events
                </Badge>
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {timelineOpen ? 'Hide' : 'Show'}
                </span>
              </div>
            </button>
            {timelineOpen ? (
              <div className="space-y-2 border-t border-slate-200 px-4 py-4">
              {timeline.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 md:flex-row md:items-start md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {formatTimelineAction(entry, attempts)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {entry.actorName ? `${entry.actorName} • ` : ''}{formatDateTime(entry.createdAt)}
                    </p>
                  </div>
                  {entry.attemptId === selectedAttempt?.id ? (
                    <Badge variant="outline" className="border-slate-200 bg-white text-[11px] text-slate-600">
                      Current attempt
                    </Badge>
                  ) : null}
                </div>
              ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200 bg-white shadow-[0_18px_36px_-30px_rgba(15,23,42,0.35)]">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">
                {student.firstName} {student.lastName}
              </h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {student.email && <p className="text-sm text-slate-600">{student.email}</p>}
                {submittedAt && (
                  <Badge variant="outline" className="border-slate-200 bg-white text-[11px] text-slate-700">
                    Submitted: {formatDateTime(submittedAt)}
                  </Badge>
                )}
                {selectedAttempt?.isLate ? (
                  <Badge variant="destructive" className="text-[11px]">
                    Late{selectedAttempt.lateByMinutes ? ` (${selectedAttempt.lateByMinutes} min)` : ''}
                  </Badge>
                ) : submittedAt ? (
                  <Badge className="border-0 bg-slate-700 text-[11px] text-white hover:bg-slate-700">On Time</Badge>
                ) : null}
              </div>
              <p className="mt-2 text-base font-medium text-slate-900">
                Time done: {timeSpent ? `${Math.floor(timeSpent / 60)}m ${timeSpent % 60}s` : '-'}
              </p>
            </div>
            <div className="text-right">
              <p className={cn('text-3xl font-bold', score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-600' : 'text-rose-500')}>
                {score}%
              </p>
              {totalPoints > 0 && (
                <p className="text-xs text-slate-500">
                  {Math.round((score / 100) * totalPoints)} / {totalPoints} pts
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {hasSubmissionFile && selectedAttempt?.id && (
        <Card className="border-slate-200 bg-white shadow-[0_18px_36px_-30px_rgba(15,23,42,0.35)]">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {submittedFiles.length > 1 ? 'Submitted Files' : 'Submitted File'}
                </p>
                <p className="text-xs text-slate-600">
                  {submittedFiles.length > 1
                    ? `${submittedFiles.length} attachments were submitted with this attempt.`
                    : 'Review the uploaded file below.'}
                </p>
              </div>
              {submittedFiles.length > 1 ? (
                <Badge variant="outline" className="border-slate-200 bg-white text-[11px] text-slate-600">
                  {submittedFiles.length} attachments
                </Badge>
              ) : null}
            </div>

            <div className="space-y-3">
              {submittedFiles.map((file, index) => {
                const canPreviewFile = canPreviewSubmissionFile(file.mimeType);
                const isPreviewingCurrentFile = previewFile?.id === file.id;
                return (
                  <div
                    key={file.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Attachment {index + 1}
                      </p>
                      <p className="text-sm font-semibold text-slate-900 truncate">{file.originalName}</p>
                      <p className="text-xs text-slate-500">
                        {(file.sizeBytes / (1024 * 1024)).toFixed(2)} MB | {file.mimeType}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handlePreviewFile(file)}
                        disabled={previewLoading && isPreviewingCurrentFile}
                        aria-label={`Preview ${file.originalName}`}
                      >
                        {canPreviewFile
                          ? (
                              previewLoading && isPreviewingCurrentFile
                                ? 'Loading Preview...'
                                : 'Preview in LMS'
                            )
                          : 'Open File'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void assessmentService.downloadAttemptSubmissionAttachmentFile(
                          selectedAttempt.id,
                          file.id,
                          file.originalName,
                        )}
                        aria-label={`Download ${file.originalName}`}
                      >
                        Download
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {previewError && (
              <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {previewError}
              </div>
            )}

            {previewFile && canPreviewSubmissionFile(previewFile.mimeType) && previewUrl && (
              <div className="overflow-hidden rounded-lg border bg-muted/20">
                {previewFile.mimeType.startsWith('image/') ? (
                  <Image
                    src={previewUrl}
                    alt={previewFile.originalName}
                    width={1400}
                    height={1000}
                    unoptimized
                    className="max-h-[32rem] h-auto w-full object-contain bg-background"
                  />
                ) : (
                  <iframe
                    title={`Preview of ${previewFile.originalName}`}
                    src={previewUrl}
                    className="h-[32rem] w-full bg-background"
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {responses.length > 0 ? (
          responses.map((r: AttemptResponse, i: number) => (
            <ResponseCard
              key={r.id || r.questionId || i}
              response={r}
              index={i}
              showManualScoring={!isFileUploadAssessment}
              manualScoreInputValue={r.questionId ? (manualScoreInputs[r.questionId] ?? String(r.pointsEarned ?? 0)) : String(r.pointsEarned ?? 0)}
              manualScoreDisabled={!isLatestAttempt || isReturned}
              onManualScoreChange={(value) => {
                if (!r.questionId) return;
                setManualScoreInputs((current) => ({
                  ...current,
                  [r.questionId as string]: normalizeScoreTextInput(value, r.question?.points ?? 0),
                }));
              }}
              onManualScoreBlur={() => {
                if (!r.questionId) return;
                const normalizedValue = normalizeScoreTextInput(
                  manualScoreInputs[r.questionId] ?? String(r.pointsEarned ?? 0),
                  r.question?.points ?? 0,
                );
                setManualScoreInputs((current) => ({
                  ...current,
                  [r.questionId as string]: normalizedValue === '' ? '0' : normalizedValue,
                }));
              }}
            />
          ))
        ) : hasSubmissionFile ? (
          <Card className="border-slate-200 bg-white shadow-[0_18px_36px_-30px_rgba(15,23,42,0.35)]">
            <CardContent className="py-8 text-center text-sm text-slate-500">
              This attempt was submitted as an uploaded file. Use the preview or download actions above to review it.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No answer data was recorded for this attempt.
            </CardContent>
          </Card>
        )}
      </div>

      {isFileUploadAssessment ? (
      <Card className="border-slate-200 bg-white shadow-[0_18px_36px_-30px_rgba(15,23,42,0.35)]">
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-sm font-semibold text-slate-900">Scoring</p>
              <p className="text-xs text-slate-500">
                {rubricCriteria.length > 0
                  ? 'Score each rubric criterion before returning the grade.'
                  : 'No rubric is attached, so return a direct score from 0 to 100.'}
              </p>
              {isReturned ? (
                <p className="mt-2 text-xs font-medium text-slate-600">
                  Undo the posted grade first if you need to make a correction.
                </p>
              ) : null}
            </div>

            {rubricCriteria.length > 0 ? (
              <div className="space-y-3">
                {rubricCriteria.map((criterion) => {
                  const currentScore = rubricScores.find((score) => score.criterionId === criterion.id);
                  return (
                    <div key={criterion.id} className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 md:grid-cols-[1.3fr_160px]">
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900">{criterion.title}</p>
                        {criterion.description && (
                          <p className="text-xs text-slate-500">{criterion.description}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500">Points earned / {criterion.points}</p>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={rubricInputValues[criterion.id] ?? String(currentScore?.pointsEarned ?? 0)}
                          onChange={(event) => {
                            const nextValue = normalizeScoreTextInput(event.target.value, criterion.points);
                            setRubricInputValues((current) => ({
                              ...current,
                              [criterion.id]: nextValue,
                            }));
                            setRubricScores((current) => current.map((score) => (
                              score.criterionId === criterion.id
                                ? { ...score, pointsEarned: nextValue === '' ? 0 : Number(nextValue) }
                                : score
                            )));
                          }}
                          onBlur={() => {
                            const normalizedValue = normalizeScoreTextInput(
                              rubricInputValues[criterion.id] ?? String(currentScore?.pointsEarned ?? 0),
                              criterion.points,
                            );
                            const finalValue = normalizedValue === '' ? '0' : normalizedValue;
                            setRubricInputValues((current) => ({
                              ...current,
                              [criterion.id]: finalValue,
                            }));
                            setRubricScores((current) => current.map((score) => (
                              score.criterionId === criterion.id
                                ? { ...score, pointsEarned: Number(finalValue) }
                                : score
                            )));
                          }}
                          disabled={!isLatestAttempt || isReturned}
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                          aria-label={`${criterion.title} points`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Direct score</p>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={directScore}
                  onChange={(event) => {
                    setDirectScore(normalizeScoreTextInput(event.target.value, 100));
                  }}
                  onBlur={() => {
                    const normalizedValue = normalizeScoreTextInput(directScore, 100);
                    setDirectScore(normalizedValue === '' ? '0' : normalizedValue);
                  }}
                  disabled={!isLatestAttempt || isReturned}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  aria-label="Direct score"
                />
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-slate-200 bg-white shadow-[0_18px_36px_-30px_rgba(15,23,42,0.35)]">
          <CardContent className="space-y-4 p-5">
            {!isLatestAttempt ? (
              <p className="text-xs font-medium text-amber-700">
                Grades can only be returned for the latest submission. Earlier uploads stay visible for history only.
              </p>
            ) : null}
            <Textarea
              placeholder="Add feedback for this student (optional)"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              disabled={!isLatestAttempt || isReturned}
            />
            {isReturned ? (
              <Button
                variant="outline"
                onClick={onUndoReturn}
                disabled={unreturning || !isLatestAttempt}
                className="w-full border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              >
                {unreturning
                  ? 'Restoring...'
                  : `Undo Posted Grade${selectedAttempt?.attemptNumber ? ` (Attempt ${selectedAttempt.attemptNumber})` : ''}`}
              </Button>
            ) : (
              <Button onClick={onReturn} disabled={returning || !isLatestAttempt} className="w-full bg-slate-900 text-white hover:bg-slate-800">
                {returning
                  ? 'Returning...'
                  : `Return Grade${selectedAttempt?.attemptNumber ? ` (Attempt ${selectedAttempt.attemptNumber})` : ''}`}
              </Button>
            )}
          </CardContent>
        </Card>

      {isReturned && (
        <div className="py-2 text-center text-sm font-medium text-emerald-600">
          Grade has been returned to this student
        </div>
      )}
    </div>
  );
}
function ResponseCard({
  response: r,
  index,
  showManualScoring,
  manualScoreInputValue,
  manualScoreDisabled,
  onManualScoreChange,
  onManualScoreBlur,
}: {
  response: AttemptResponse;
  index: number;
  showManualScoring: boolean;
  manualScoreInputValue: string;
  manualScoreDisabled: boolean;
  onManualScoreChange: (value: string) => void;
  onManualScoreBlur: () => void;
}) {
  const question = r.question;
  if (!question) {
    return (
      <Card className="border-l-4 border-l-gray-300">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Q{index + 1}</span>
            <span className="text-xs text-muted-foreground">Question data unavailable</span>
          </div>
          {r.studentAnswer ? (
            <p className="text-sm bg-muted/50 rounded px-3 py-1.5">{r.studentAnswer}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No captured answer text.</p>
          )}
        </CardContent>
      </Card>
    );
  }

  const isCorrect = r.isCorrect === true;
  const isWrong = r.isCorrect === false;

  return (
    <Card className={cn(
      'border-l-4',
      isCorrect ? 'border-l-emerald-500' : isWrong ? 'border-l-red-400' : 'border-l-gray-300',
    )}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-muted-foreground">Q{index + 1}</span>
              <Badge variant="outline" className="text-[10px] capitalize">
                {question.type?.replace('_', ' ')}
              </Badge>
            </div>
            <RichTextRenderer html={question.content ?? '<p>No question content.</p>'} className="text-sm font-medium" />
          </div>
          <div className="text-right shrink-0">
            {showManualScoring ? (
              <div className="min-w-[132px]">
                <div className="flex items-center justify-end gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={manualScoreInputValue}
                    onChange={(event) => onManualScoreChange(event.target.value)}
                    onBlur={onManualScoreBlur}
                    disabled={manualScoreDisabled}
                    className="w-16 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-right text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                    aria-label={`Score for question ${index + 1}`}
                  />
                  <span className="text-sm text-slate-600">
                    / {question.points} pt{question.points === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {r.isCorrect === null || r.isCorrect === undefined ? 'Teacher-scored' : 'Auto-graded'}
                </p>
              </div>
            ) : (
              <span className={cn(
                'text-sm font-bold',
                isCorrect ? 'text-emerald-600' : isWrong ? 'text-red-500' : 'text-muted-foreground',
              )}>
                {r.pointsEarned ?? 0} / {question.points}
              </span>
            )}
          </div>
        </div>

        {question.imageUrl && (
          <div className="overflow-hidden rounded-xl border">
            <Image
              src={question.imageUrl}
              alt="Question"
              width={1024}
              height={576}
              unoptimized
              className="max-h-56 h-auto w-full object-contain"
            />
          </div>
        )}

        {/* Show options with student's selection */}
        {question.options && question.options.length > 0 && (
          <div className="space-y-1 ml-1">
            {question.options.map((opt: AttemptOption) => {
              const isSelected = opt.id === r.selectedOptionId || (r.selectedOptionIds ?? []).includes(opt.id);
              return (
                <div
                  key={opt.id}
                  className={cn(
                    'flex items-center gap-2 rounded px-2.5 py-1 text-sm',
                    isSelected && opt.isCorrect && 'bg-emerald-50 text-emerald-800',
                    isSelected && !opt.isCorrect && 'bg-red-50 text-red-800',
                    !isSelected && opt.isCorrect && 'bg-emerald-50/50 text-emerald-700',
                    !isSelected && !opt.isCorrect && '',
                  )}
                >
                  <span className="w-4 text-center">
                    {isSelected && opt.isCorrect && '✓'}
                    {isSelected && !opt.isCorrect && '✗'}
                    {!isSelected && opt.isCorrect && '✓'}
                    {!isSelected && !opt.isCorrect && '○'}
                  </span>
                  <span>{opt.text}</span>
                </div>
              );
            })}
          </div>
        )}

        {((r.selectedOptionId && question.options?.length) ||
          ((r.selectedOptionIds?.length ?? 0) > 0 && question.options?.length)) && (
          <div className="mt-1">
            <p className="text-xs text-muted-foreground mb-0.5">Captured answer:</p>
            <p className="text-sm bg-muted/50 rounded px-3 py-1.5">
              {r.selectedOptionId
                ? question.options?.find((opt) => opt.id === r.selectedOptionId)?.text || r.selectedOptionId
                : (r.selectedOptionIds ?? [])
                    .map((optionId) => question.options?.find((opt) => opt.id === optionId)?.text || optionId)
                    .join(', ')}
            </p>
          </div>
        )}

        {!r.studentAnswer && (!question.options || question.options.length === 0) && (
          <div className="mt-1">
            <p className="text-xs text-muted-foreground mb-0.5">Student answer:</p>
            <p className="text-sm text-muted-foreground bg-muted/30 rounded px-3 py-1.5">No answer submitted.</p>
          </div>
        )}

        {/* Text answer */}
        {r.studentAnswer && (
          <div className="mt-1">
            <p className="text-xs text-muted-foreground mb-0.5">Student answer:</p>
            <p className="text-sm bg-muted/50 rounded px-3 py-1.5">{r.studentAnswer}</p>
          </div>
        )}

        {/* Explanation */}
        {question.explanation && (
          <div className="text-xs text-muted-foreground italic mt-1">
            <span className="mr-1">💡</span>
            <RichTextRenderer html={question.explanation} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
