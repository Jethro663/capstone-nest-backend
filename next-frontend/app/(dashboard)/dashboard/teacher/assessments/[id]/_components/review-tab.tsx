'use client';

import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import { assessmentService } from '@/services/assessment-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import type {
  RubricCriterion,
  RubricScore,
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
}

function canPreviewSubmissionFile(mimeType?: string | null) {
  if (!mimeType) return false;
  return (
    mimeType.startsWith('image/')
    || mimeType === 'application/pdf'
    || mimeType.startsWith('text/')
  );
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
  turned_in: 'Graded',
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
  const [search, setSearch] = useState('');
  const [directScore, setDirectScore] = useState<number | ''>('');
  const [rubricScores, setRubricScores] = useState<RubricScore[]>([]);

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
          setDirectScore(payload.directScore ?? payload.score ?? '');
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
      await assessmentService.returnGrade(selectedAttempt.id, {
        teacherFeedback: feedback || undefined,
        directScore:
          (attemptData?.assessment?.rubricCriteria?.length ?? 0) === 0 && directScore !== ''
            ? Number(directScore)
            : undefined,
        rubricScores:
          (attemptData?.assessment?.rubricCriteria?.length ?? 0) > 0
            ? rubricScores
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
    <div className="flex gap-4 min-h-[500px]">
      {/* Left Sidebar — Student List */}
      <div className="w-72 shrink-0 space-y-2">
        <input
          type="text"
          placeholder="Search students…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="space-y-1 max-h-[460px] overflow-y-auto pr-1">
          {filteredStudents.map((student, i) => (
            <motion.button
              key={student.studentId}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setSelectedStudentId(student.studentId)}
              className={cn(
                'w-full text-left rounded-lg px-3 py-2.5 transition-colors text-sm',
                selectedStudentId === student.studentId
                  ? 'bg-primary/10 border border-primary/20'
                  : 'hover:bg-muted',
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
                rubricScores={rubricScores}
                setRubricScores={setRubricScores}
                onReturn={handleReturnGrade}
                returning={returning}
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
  rubricScores,
  setRubricScores,
  onReturn,
  returning,
}: {
  student: StudentSubmission;
  selectedAttempt: StudentAttemptSummary | null;
  attempts: StudentAttemptSummary[];
  onSelectAttempt: (attemptId: string) => void;
  data: AttemptResultData;
  feedback: string;
  setFeedback: (v: string) => void;
  directScore: number | '';
  setDirectScore: (value: number | '') => void;
  rubricScores: RubricScore[];
  setRubricScores: Dispatch<SetStateAction<RubricScore[]>>;
  onReturn: () => void;
  returning: boolean;
}) {
  const score = data.score ?? selectedAttempt?.score ?? student.attempt?.score ?? 0;
  const totalPoints = data.assessment?.totalPoints ?? 0;
  const responses = data.responses ?? [];
  const submittedFile = data.submittedFile;
  const hasSubmissionFile = Boolean(submittedFile && selectedAttempt?.id);
  const canPreviewFile = canPreviewSubmissionFile(submittedFile?.mimeType);
  const timeSpent = selectedAttempt?.timeSpentSeconds ?? student.attempt?.timeSpentSeconds;
  const submittedAt = selectedAttempt?.submittedAt;
  const isReturned = Boolean(selectedAttempt?.isReturned ?? data?.isReturned ?? student.status === 'returned');
  const rubricCriteria = data.assessment?.rubricCriteria ?? [];
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

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
    setPreviewUrl((currentUrl) => {
      if (currentUrl) {
        window.URL.revokeObjectURL(currentUrl);
      }
      return null;
    });
  }, [selectedAttempt?.id, submittedFile?.id]);

  const handlePreviewFile = async () => {
    if (!selectedAttempt?.id || !submittedFile) return;

    if (!canPreviewFile) {
      await assessmentService.openAttemptSubmissionFile(
        selectedAttempt.id,
        submittedFile.originalName,
      );
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const { blob } = await assessmentService.getAttemptSubmissionFileBlob(
        selectedAttempt.id,
        submittedFile.originalName,
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

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-lg">
                {student.firstName} {student.lastName}
              </h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {student.email && <p className="text-sm text-muted-foreground">{student.email}</p>}
                {submittedAt && (
                  <Badge variant="outline" className="text-[11px]">
                    Submitted: {formatDateTime(submittedAt)}
                  </Badge>
                )}
                {selectedAttempt?.isLate ? (
                  <Badge variant="destructive" className="text-[11px]">
                    Late{selectedAttempt.lateByMinutes ? ` (${selectedAttempt.lateByMinutes} min)` : ''}
                  </Badge>
                ) : submittedAt ? (
                  <Badge variant="secondary" className="text-[11px]">On Time</Badge>
                ) : null}
              </div>
              <p className="text-base font-semibold mt-2">
                Time done: {timeSpent ? `${Math.floor(timeSpent / 60)}m ${timeSpent % 60}s` : '-'}
              </p>
            </div>
            <div className="text-right">
              <p className={cn('text-3xl font-bold', score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-600' : 'text-red-500')}>
                {score}%
              </p>
              {totalPoints > 0 && (
                <p className="text-xs text-muted-foreground">
                  {Math.round((score / 100) * totalPoints)} / {totalPoints} pts
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {hasSubmissionFile && submittedFile && selectedAttempt?.id && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Submitted File
                </p>
                <p className="text-sm font-medium truncate">{submittedFile.originalName}</p>
                <p className="text-xs text-muted-foreground">
                  {(submittedFile.sizeBytes / (1024 * 1024)).toFixed(2)} MB | {submittedFile.mimeType}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handlePreviewFile()}
                  disabled={previewLoading}
                >
                  {canPreviewFile ? (previewLoading ? 'Loading Preview...' : 'Preview in LMS') : 'Open File'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void assessmentService.downloadAttemptSubmissionFile(
                    selectedAttempt.id,
                    submittedFile.originalName,
                  )}
                >
                  Download
                </Button>
              </div>
            </div>

            {previewError && (
              <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {previewError}
              </div>
            )}

            {canPreviewFile && previewUrl && (
              <div className="overflow-hidden rounded-lg border bg-muted/20">
                {submittedFile.mimeType.startsWith('image/') ? (
                  <img
                    src={previewUrl}
                    alt={submittedFile.originalName}
                    className="max-h-[32rem] w-full object-contain bg-background"
                  />
                ) : (
                  <iframe
                    title={`Preview of ${submittedFile.originalName}`}
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
            <ResponseCard key={r.id || r.questionId || i} response={r} index={i} />
          ))
        ) : hasSubmissionFile ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
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

      {!isReturned && (
        <Card>
          <CardContent className="space-y-4 p-4">
            <div>
              <p className="text-sm font-semibold">Scoring</p>
              <p className="text-xs text-muted-foreground">
                {rubricCriteria.length > 0
                  ? 'Score each rubric criterion before returning the grade.'
                  : 'No rubric is attached, so return a direct score from 0 to 100.'}
              </p>
            </div>

            {rubricCriteria.length > 0 ? (
              <div className="space-y-3">
                {rubricCriteria.map((criterion) => {
                  const currentScore = rubricScores.find((score) => score.criterionId === criterion.id);
                  return (
                    <div key={criterion.id} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1.3fr_140px]">
                      <div className="space-y-1">
                        <p className="font-medium">{criterion.title}</p>
                        {criterion.description && (
                          <p className="text-xs text-muted-foreground">{criterion.description}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Points earned / {criterion.points}</p>
                        <input
                          type="number"
                          min={0}
                          max={criterion.points}
                          value={currentScore?.pointsEarned ?? 0}
                          onChange={(event) => {
                            const nextPoints = Number(event.target.value);
                            setRubricScores((current) => current.map((score) => (
                              score.criterionId === criterion.id
                                ? { ...score, pointsEarned: nextPoints }
                                : score
                            )));
                          }}
                          className="w-full rounded-md border px-3 py-2 text-sm"
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
                  type="number"
                  min={0}
                  max={100}
                  value={directScore}
                  onChange={(event) => setDirectScore(event.target.value === '' ? '' : Number(event.target.value))}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!isReturned && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Textarea
              placeholder="Add feedback for this student (optional)"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
            />
            <Button onClick={onReturn} disabled={returning} className="w-full">
              {returning
                ? 'Returning...'
                : `Return Grade${selectedAttempt?.attemptNumber ? ` (Attempt ${selectedAttempt.attemptNumber})` : ''}`}
            </Button>
          </CardContent>
        </Card>
      )}

      {isReturned && (
        <div className="py-2 text-center text-sm font-medium text-emerald-600">
          Grade has been returned to this student
        </div>
      )}
    </div>
  );
}
function ResponseCard({ response: r, index }: { response: AttemptResponse; index: number }) {
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
            <p className="text-sm font-medium">{question.content}</p>
          </div>
          <div className="text-right shrink-0">
            <span className={cn(
              'text-sm font-bold',
              isCorrect ? 'text-emerald-600' : isWrong ? 'text-red-500' : 'text-muted-foreground',
            )}>
              {r.pointsEarned ?? 0} / {question.points}
            </span>
          </div>
        </div>

        {question.imageUrl && (
          <div className="overflow-hidden rounded-xl border">
            <img src={question.imageUrl} alt="Question" className="max-h-56 w-full object-contain" />
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
          <p className="text-xs text-muted-foreground italic mt-1">
            💡 {question.explanation}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
