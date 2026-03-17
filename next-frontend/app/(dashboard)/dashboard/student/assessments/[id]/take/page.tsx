'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, Clock3, Flag, ListChecks, Download, UploadCloud, FileText } from 'lucide-react';
import { assessmentService } from '@/services/assessment-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { StudentStatusChip } from '@/components/student/student-primitives';
import { toast } from 'sonner';
import type { Assessment, AssessmentQuestion, UpdateAttemptProgressDto } from '@/types/assessment';

export default function StudentAssessmentTakePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const assessmentId = params.id as string;
  const reduceMotion = useReducedMotion();

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [responses, setResponses] = useState<Record<string, string | string[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showMissingFilePrompt, setShowMissingFilePrompt] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedSubmission, setUploadedSubmission] = useState<{
    attemptId: string;
    file: {
      id: string;
      originalName: string;
      mimeType: string;
      sizeBytes: number;
      uploadedAt: string;
    };
  } | null>(null);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [attemptStartedAt, setAttemptStartedAt] = useState<string | null>(null);
  const [attemptExpiresAt, setAttemptExpiresAt] = useState<string | null>(null);
  const [strictMode, setStrictMode] = useState(false);
  const [timedQuestionsEnabled, setTimedQuestionsEnabled] = useState(false);
  const [currentQuestionDeadlineAt, setCurrentQuestionDeadlineAt] = useState<string | null>(null);
  const [violationCount, setViolationCount] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [showViolationDialog, setShowViolationDialog] = useState(false);
  const [violationDialogMessage, setViolationDialogMessage] = useState('');
  const didAutoSubmitRef = useRef(false);
  const handledQuestionDeadlineRef = useRef<string | null>(null);
  const lastViolationAtRef = useRef(0);
  // Stable refs so the fullscreen effect never re-runs due to callback identity changes.
  // They are assigned synchronously in the render body (after the callbacks are defined)
  // so event handlers always call the latest version.
  const handleViolationRef = useRef<((source: 'tab' | 'fullscreen') => void) | null>(null);
  const requestAssessmentFullscreenRef = useRef<(() => void) | null>(null);
  const isFileUploadAssessment = assessment?.type === 'file_upload';

  const timeSpentSeconds = attemptStartedAt
    ? Math.max(0, Math.floor((nowMs - new Date(attemptStartedAt).getTime()) / 1000))
    : 0;

  const applyAttemptState = useCallback(
    (attempt: {
      id: string;
      startedAt?: string;
      expiresAt?: string | null;
      lastQuestionIndex?: number;
      currentQuestionDeadlineAt?: string | null;
      violationCount?: number;
    }, questionCount = questions.length) => {
      setActiveAttemptId(attempt.id);
      setAttemptStartedAt(attempt.startedAt || null);
      setAttemptExpiresAt(attempt.expiresAt || null);
      setCurrentQuestionDeadlineAt(attempt.currentQuestionDeadlineAt || null);
      setViolationCount(attempt.violationCount ?? 0);
      setCurrentIdx(
        Math.min(attempt.lastQuestionIndex ?? 0, Math.max(questionCount - 1, 0)),
      );
    },
    [questions.length],
  );

  const getErrorMessage = useCallback((error: unknown) => {
    const responseMessage = (error as { response?: { data?: { message?: unknown } } })
      ?.response?.data?.message;

    if (Array.isArray(responseMessage)) {
      return responseMessage.join(', ');
    }

    if (typeof responseMessage === 'string') {
      return responseMessage;
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'Failed to sync assessment state';
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [assessmentRes, ongoingRes] = await Promise.all([
        assessmentService.getById(assessmentId),
        assessmentService.getOngoingAttempt(assessmentId),
      ]);

      const assessmentData = assessmentRes.data;
      const ongoing = ongoingRes.data;

      if (!ongoing) {
        toast.info('No active attempt found. Start a new attempt first.');
        router.replace(`/dashboard/student/assessments/${assessmentId}`);
        return;
      }

      const orderMap = new Map(
        (ongoing.attempt.questionOrder || []).map((id, index) => [id, index]),
      );

      const questionList = [...(assessmentData.questions || [])]
        .sort((a, b) => {
          if (orderMap.size > 0) {
            const aIdx = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
            const bIdx = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
            return aIdx - bIdx;
          }

          if (assessmentData.randomizeQuestions) {
            return 0;
          }

          return a.order - b.order;
        });

      const restoredResponses: Record<string, string | string[]> = {};
      for (const response of ongoing.attempt.draftResponses || []) {
        if (response.selectedOptionIds && response.selectedOptionIds.length > 0) {
          restoredResponses[response.questionId] = response.selectedOptionIds;
        } else if (response.selectedOptionId) {
          restoredResponses[response.questionId] = response.selectedOptionId;
        } else if (typeof response.studentAnswer === 'string') {
          restoredResponses[response.questionId] = response.studentAnswer;
        }
      }

      setAssessment(assessmentData);
      setQuestions(questionList);
      setResponses(restoredResponses);
      setStrictMode(Boolean(ongoing.strictMode));
      setTimedQuestionsEnabled(Boolean(ongoing.timedQuestionsEnabled));
      applyAttemptState(
        {
          ...ongoing.attempt,
          expiresAt: ongoing.expiresAt ?? ongoing.attempt.expiresAt ?? null,
        },
        questionList.length,
      );
      handledQuestionDeadlineRef.current = null;
      didAutoSubmitRef.current = false;

      const limitParam = searchParams.get('timeLimit');
      if (limitParam) {
        setTimeLimit(Number(limitParam));
      } else if (ongoing.timeLimitMinutes) {
        setTimeLimit(ongoing.timeLimitMinutes);
      } else if (assessmentData.timeLimitMinutes) {
        setTimeLimit(assessmentData.timeLimitMinutes);
      } else {
        setTimeLimit(null);
      }
    } catch {
      toast.error('Failed to load assessment');
    } finally {
      setLoading(false);
    }
  }, [assessmentId, applyAttemptState, router, searchParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const remainingSeconds = attemptExpiresAt
    ? Math.max(0, Math.ceil((new Date(attemptExpiresAt).getTime() - nowMs) / 1000))
    : timeLimit
      ? Math.max(0, timeLimit * 60 - timeSpentSeconds)
      : null;
  const isTimeLow = remainingSeconds !== null && remainingSeconds <= 60;
  const questionTimerRemaining = timedQuestionsEnabled && currentQuestionDeadlineAt
    ? Math.max(0, Math.ceil((new Date(currentQuestionDeadlineAt).getTime() - nowMs) / 1000))
    : null;

  const isQuestionAnswered = useCallback(
    (question: AssessmentQuestion, answer: string | string[] | undefined) => {
      if (answer === undefined || answer === null) return false;
      if (question.type === 'multiple_select') {
        return Array.isArray(answer) && answer.length > 0;
      }
      if (question.type === 'short_answer' || question.type === 'fill_blank') {
        return typeof answer === 'string' && answer.trim().length > 0;
      }
      return !Array.isArray(answer) && answer !== '';
    },
    [],
  );

  const buildSubmissionResponses = useCallback(() => {
    return questions.map((q) => {
      const answer = responses[q.id];
      const r: {
        questionId: string;
        questionIndex?: number;
        studentAnswer?: string;
        selectedOptionId?: string;
        selectedOptionIds?: string[];
      } = { questionId: q.id, questionIndex: questions.findIndex((question) => question.id === q.id) };
      if (q.type === 'multiple_choice' || q.type === 'true_false' || q.type === 'dropdown') {
        r.selectedOptionId = answer as string;
      } else if (q.type === 'multiple_select') {
        r.selectedOptionIds = (answer as string[]) || [];
      } else {
        r.studentAnswer = answer as string;
      }
      return r;
    });
  }, [questions, responses]);

  const persistProgress = useCallback(
    async (payload: UpdateAttemptProgressDto, options?: { silent?: boolean; violationModalMessage?: string }) => {
      if (!activeAttemptId) return;

      try {
        const response = await assessmentService.updateAttemptProgress(activeAttemptId, payload);
        applyAttemptState(response.data);
        return response.data;
      } catch (error) {
        const message = getErrorMessage(error);
        const wasAutoSubmitted = /auto-submitted/i.test(message);

        if (wasAutoSubmitted) {
          didAutoSubmitRef.current = true;
          setShowViolationDialog(true);
          setViolationDialogMessage(
            options?.violationModalMessage ||
              'Your attempt was auto-submitted because the timer or anti-cheat policy was violated.',
          );
          toast.error(message);
          setTimeout(() => {
            router.replace(`/dashboard/student/assessments/${assessmentId}?view=submitted`);
          }, 1200);
          return null;
        }

        if (!options?.silent) {
          toast.error(message);
        }
      }
    },
    [activeAttemptId, applyAttemptState, assessmentId, getErrorMessage, router],
  );

  const requestAssessmentFullscreen = useCallback(async () => {
    if (typeof document === 'undefined') return;
    if (document.hidden || document.fullscreenElement) return;

    if (document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        // Gesture/permission failures are non-fatal; warnings still apply.
      }
    }
  }, []);

  const handleNavigateToQuestion = useCallback(
    async (targetIndex: number) => {
      if (targetIndex < 0 || targetIndex >= questions.length) return;

      const activeQuestion = questions[currentIdx];

      if ((strictMode || timedQuestionsEnabled) && targetIndex < currentIdx) {
        toast.info('This attempt does not allow moving to a previous question.');
        return;
      }

      if (
        strictMode &&
        targetIndex > currentIdx &&
        activeQuestion &&
        !isQuestionAnswered(activeQuestion, responses[activeQuestion.id])
      ) {
        toast.info('Strict mode requires answering this question before moving forward.');
        return;
      }

      const updatedAttempt = await persistProgress(
        {
          currentQuestionIndex: targetIndex,
          responses: buildSubmissionResponses(),
        },
        { silent: true },
      );

      if (updatedAttempt) {
        setCurrentIdx(
          Math.min(
            updatedAttempt.lastQuestionIndex ?? targetIndex,
            Math.max(questions.length - 1, 0),
          ),
        );
      }
    },
    [
      buildSubmissionResponses,
      currentIdx,
      isQuestionAnswered,
      persistProgress,
      questions.length,
      questions,
      responses,
      strictMode,
      timedQuestionsEnabled,
    ],
  );

  const handleViolation = useCallback(
    async (source: 'tab' | 'fullscreen') => {
      if (!activeAttemptId || didAutoSubmitRef.current) return;

      const now = Date.now();
      if (now - lastViolationAtRef.current < 1500) {
        return;
      }
      lastViolationAtRef.current = now;

      const updatedAttempt = await persistProgress(
        {
          currentQuestionIndex: currentIdx,
          responses: buildSubmissionResponses(),
          registerViolation: true,
        },
        {
          silent: true,
          violationModalMessage:
            'Your attempt was auto-submitted after three anti-cheat violations.',
        },
      );

      if (!updatedAttempt || didAutoSubmitRef.current) {
        return;
      }

      const nextViolationCount = updatedAttempt.violationCount ?? violationCount + 1;
      const warningMessage =
        nextViolationCount >= 2
          ? `Warning ${nextViolationCount} of 3: another violation will auto-submit this assessment.`
          : source === 'tab'
            ? 'Warning 1 of 3: stay on the assessment tab. The timer keeps running.'
            : 'Warning 1 of 3: stay in fullscreen while taking this assessment.';

      toast.error(warningMessage);
      void requestAssessmentFullscreen();
    },
    [
      activeAttemptId,
      buildSubmissionResponses,
      currentIdx,
      persistProgress,
      requestAssessmentFullscreen,
      violationCount,
    ],
  );

  const setResponse = (questionId: string, value: string | string[]) => {
    setResponses((prev) => {
      const next = { ...prev, [questionId]: value };
      const serialized = questions.map((question) => {
        const answer = next[question.id];
        const response: {
          questionId: string;
          studentAnswer?: string;
          selectedOptionId?: string;
          selectedOptionIds?: string[];
        } = { questionId: question.id };

        if (question.type === 'multiple_choice' || question.type === 'true_false' || question.type === 'dropdown') {
          response.selectedOptionId = answer as string;
        } else if (question.type === 'multiple_select') {
          response.selectedOptionIds = (answer as string[]) || [];
        } else {
          response.studentAnswer = answer as string;
        }

        return response;
      });

      void persistProgress({
        currentQuestionIndex: currentIdx,
        responses: serialized,
      }, { silent: true });

      return next;
    });
  };

  const answeredCount = useMemo(
    () =>
      questions.filter((q) => {
        const answer = responses[q.id];
        return isQuestionAnswered(q, answer);
      }).length,
    [questions, responses, isQuestionAnswered],
  );

  const handleSubmit = useCallback(async () => {
    if (!assessment) return;
    try {
      setSubmitting(true);

      await assessmentService.submit({
        assessmentId,
        responses: buildSubmissionResponses(),
        timeSpentSeconds,
      });

      toast.success('Assessment submitted!');
      setTimeout(() => {
        router.replace(`/dashboard/student/assessments/${assessmentId}`);
      }, 900);
    } catch {
      toast.error('Failed to submit assessment');
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  }, [assessment, buildSubmissionResponses, assessmentId, router, timeSpentSeconds]);

  const handleUploadSubmissionFile = useCallback(async (file: File) => {
    if (!assessment) return;

    const allowedExtensions =
      assessment.allowedUploadExtensions && assessment.allowedUploadExtensions.length > 0
        ? assessment.allowedUploadExtensions.map((ext) => ext.toLowerCase())
        : [];
    const maxUploadSize = assessment.maxUploadSizeBytes ?? 100 * 1024 * 1024;
    const extension = file.name.includes('.')
      ? file.name.split('.').pop()?.toLowerCase() || ''
      : '';

    if (!extension || (allowedExtensions.length > 0 && !allowedExtensions.includes(extension))) {
      toast.error(`.${extension || 'unknown'} is not allowed for this assessment`);
      return;
    }

    if (file.size > maxUploadSize) {
      toast.error('File is too large. Maximum allowed size is 100 MB.');
      return;
    }

    try {
      setUploadingFile(true);
      const res = await assessmentService.uploadSubmissionFile(assessmentId, file);
      setUploadedSubmission(res.data);
      toast.success('File uploaded. You can submit when ready.');
    } catch {
      toast.error('Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  }, [assessment, assessmentId]);

  const handleSubmitFileUpload = useCallback(async () => {
    if (!uploadedSubmission?.file?.id) {
      setShowMissingFilePrompt(true);
      return;
    }

    try {
      setSubmitting(true);
      await assessmentService.submit({
        assessmentId,
        responses: [],
        timeSpentSeconds,
      });
      toast.success('File upload assessment submitted!');
      setTimeout(() => {
        router.replace(`/dashboard/student/assessments/${assessmentId}?view=submitted`);
      }, 900);
    } catch {
      toast.error('Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  }, [uploadedSubmission, assessmentId, router, timeSpentSeconds]);

  useEffect(() => {
    if (!activeAttemptId || questions.length === 0) return;

    const interval = setInterval(() => {
      void persistProgress({
        currentQuestionIndex: currentIdx,
        responses: buildSubmissionResponses(),
      }, { silent: true });
    }, 15000);

    return () => clearInterval(interval);
  }, [activeAttemptId, currentIdx, questions.length, persistProgress, buildSubmissionResponses]);

  useEffect(() => {
    if (
      !timedQuestionsEnabled ||
      questionTimerRemaining === null ||
      didAutoSubmitRef.current ||
      !currentQuestionDeadlineAt
    ) {
      return;
    }

    if (questionTimerRemaining > 0) {
      return;
    }

    if (handledQuestionDeadlineRef.current === currentQuestionDeadlineAt) {
      return;
    }

    handledQuestionDeadlineRef.current = currentQuestionDeadlineAt;

    const isLastQuestion = currentIdx >= questions.length - 1;

    if (isLastQuestion) {
      didAutoSubmitRef.current = true;
      toast.warning('Question time ended. Submitting now.');
      void handleSubmit();
      return;
    }

    toast.warning('Question time ended. Moving to the next question.');
    void handleNavigateToQuestion(currentIdx + 1);
  }, [
    currentIdx,
    currentQuestionDeadlineAt,
    handleNavigateToQuestion,
    handleSubmit,
    questionTimerRemaining,
    questions.length,
    timedQuestionsEnabled,
  ]);

  useEffect(() => {
    const onBeforeUnload = () => {
      void persistProgress({
        currentQuestionIndex: currentIdx,
        responses: buildSubmissionResponses(),
      }, { silent: true });
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [currentIdx, buildSubmissionResponses, persistProgress]);

  // Keep stable refs current every render so the fullscreen effect's
  // event handlers always call the latest version without needing to be
  // in the dependency array (which would cause spurious effect re-runs).
  handleViolationRef.current = handleViolation;
  requestAssessmentFullscreenRef.current = requestAssessmentFullscreen;

  useEffect(() => {
    if (!activeAttemptId || isFileUploadAssessment) {
      return;
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        void handleViolationRef.current?.('tab');
      } else {
        void requestAssessmentFullscreenRef.current?.();
      }
    };

    const onFullscreenChange = () => {
      if (!document.fullscreenElement && !document.hidden) {
        void handleViolationRef.current?.('fullscreen');
      }
    };

    void requestAssessmentFullscreenRef.current?.();

    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {
          // ignore cleanup errors
        });
      }
    };
  // Only re-run when the attempt itself changes — NOT when callback identities
  // change (currentIdx, violationCount, etc.), which was causing a cleanup→exit
  // fullscreen→new listener→false violation cycle on every question navigation
  // and on initial page load.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAttemptId, isFileUploadAssessment]);

  useEffect(() => {
    if (!timeLimit || remainingSeconds === null || didAutoSubmitRef.current) return;
    if (remainingSeconds <= 0) {
      didAutoSubmitRef.current = true;
      toast.warning('Time is up. Submitting now.');
      void handleSubmit();
    }
  }, [timeLimit, remainingSeconds, handleSubmit]);

  if (loading) {
    return (
      <div className="max-w-5xl space-y-6">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (!assessment || (!isFileUploadAssessment && questions.length === 0)) {
    return <p className="text-[var(--student-text-muted)]">No questions available.</p>;
  }

  if (isFileUploadAssessment && assessment) {
    const allowedExtensions = assessment.allowedUploadExtensions || [];
    const maxUploadSize = assessment.maxUploadSizeBytes ?? 100 * 1024 * 1024;

    return (
      <div className="student-page rounded-3xl p-1">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="max-w-4xl mx-auto space-y-4"
        >
          <Card className="student-card overflow-hidden border-[var(--student-outline)]">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-[var(--student-text-strong)]">{assessment.title}</p>
                  <p className="text-sm student-muted-text">File Upload Assessment</p>
                </div>
                <StudentStatusChip tone="warning">
                  <Clock3 className="mr-1 h-3.5 w-3.5" />
                  {remainingSeconds !== null ? formatTime(remainingSeconds) : formatTime(timeSpentSeconds)}
                </StudentStatusChip>
              </div>

              <div className="rounded-xl border border-[var(--student-outline)] bg-[var(--student-surface-soft)] p-4">
                <p className="text-xs uppercase tracking-wide text-[var(--student-text-muted)] mb-2">Instruction</p>
                <p className="text-sm leading-relaxed text-[var(--student-text-strong)] whitespace-pre-wrap">
                  {assessment.fileUploadInstructions || 'No additional instruction provided.'}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--student-outline)] p-4 space-y-2">
                <p className="text-xs uppercase tracking-wide text-[var(--student-text-muted)]">Allowed Formats</p>
                <div className="flex flex-wrap gap-2">
                  {allowedExtensions.length > 0 ? allowedExtensions.map((ext) => (
                    <Badge key={ext} className="student-badge text-xs uppercase">.{ext}</Badge>
                  )) : <span className="text-xs text-[var(--student-text-muted)]">No format restrictions configured</span>}
                </div>
                <p className="text-xs text-[var(--student-text-muted)]">
                  Maximum upload size: {(maxUploadSize / (1024 * 1024)).toFixed(0)} MB
                </p>
              </div>

              {assessment.teacherAttachmentFile && (
                <div className="rounded-xl border border-[var(--student-outline)] p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--student-text-strong)] truncate">{assessment.teacherAttachmentFile.originalName}</p>
                    <p className="text-xs text-[var(--student-text-muted)]">
                      {(assessment.teacherAttachmentFile.sizeBytes / (1024 * 1024)).toFixed(2)} MB • {assessment.teacherAttachmentFile.mimeType}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => window.open(assessmentService.getTeacherAttachmentDownloadUrl(assessmentId), '_blank')}
                  >
                    <Download className="h-4 w-4 mr-1" /> Download
                  </Button>
                </div>
              )}

              <div className="rounded-xl border border-[var(--student-outline)] p-4 space-y-3">
                <p className="text-sm font-medium text-[var(--student-text-strong)]">Your Submission</p>
                <label className="inline-flex items-center gap-2 rounded-md border border-[var(--student-outline)] px-3 py-2 text-sm cursor-pointer hover:bg-[var(--student-surface-soft)] transition-colors text-[var(--student-text-strong)]">
                  <UploadCloud className="h-4 w-4" />
                  {uploadingFile ? 'Uploading...' : 'Upload file'}
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleUploadSubmissionFile(file);
                      e.target.value = '';
                    }}
                    disabled={uploadingFile}
                  />
                </label>

                {uploadedSubmission?.file && (
                  <div className="rounded-md border border-[var(--student-outline)] bg-[var(--student-surface-soft)] p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate text-[var(--student-text-strong)]">{uploadedSubmission.file.originalName}</p>
                      <p className="text-xs text-[var(--student-text-muted)]">
                        {(uploadedSubmission.file.sizeBytes / (1024 * 1024)).toFixed(2)} MB • {uploadedSubmission.file.mimeType}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(assessmentService.getAttemptSubmissionDownloadUrl(uploadedSubmission.attemptId), '_blank')}
                    >
                      <FileText className="h-4 w-4 mr-1" /> View
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button className="student-button-solid" onClick={handleSubmitFileUpload} disabled={submitting || uploadingFile}>
                  {submitting ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Dialog open={showMissingFilePrompt} onOpenChange={setShowMissingFilePrompt}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload required</DialogTitle>
              <DialogDescription>
                Please upload your file before submitting this assessment.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setShowMissingFilePrompt(false)}>Okay</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const current = questions[currentIdx];
  const currentAnswer = current ? responses[current.id] : undefined;
  const isCurrentAnswered = current ? isQuestionAnswered(current, currentAnswer) : false;
  const canAdvanceInStrictMode = !strictMode || isCurrentAnswered;
  const isSequentialNavigationLocked = strictMode || timedQuestionsEnabled;
  const progressValue = Math.round((answeredCount / questions.length) * 100);

  return (
    <div className="student-page rounded-3xl p-1">
      <div className="sticky top-0 z-30 rounded-2xl border border-[var(--student-outline)] bg-[var(--student-glass)] p-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[var(--student-text-strong)]">{assessment.title}</p>
            <p className="text-xs student-muted-text">Question {currentIdx + 1} of {questions.length}</p>
          </div>
          <div className="flex items-center gap-2">
            <StudentStatusChip tone="info">
              <ListChecks className="mr-1 h-3.5 w-3.5" />
              {answeredCount}/{questions.length} answered
            </StudentStatusChip>
            {timedQuestionsEnabled && questionTimerRemaining !== null && (
              <StudentStatusChip tone={questionTimerRemaining <= 10 ? 'danger' : 'warning'}>
                <Clock3 className="mr-1 h-3.5 w-3.5" />
                Q: {formatTime(questionTimerRemaining)}
              </StudentStatusChip>
            )}
            <StudentStatusChip tone={isTimeLow ? 'danger' : 'warning'}>
              <Clock3 className="mr-1 h-3.5 w-3.5" />
              {remainingSeconds !== null ? formatTime(remainingSeconds) : formatTime(timeSpentSeconds)}
            </StudentStatusChip>
          </div>
        </div>
        <Progress value={progressValue} className="mt-2 h-2" />
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_250px]">
        <Card className="student-card overflow-hidden">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">{current.type.replace('_', ' ')}</Badge>
              <Badge variant="secondary">{current.points} pts</Badge>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
                exit={reduceMotion ? {} : { opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-lg font-semibold leading-relaxed text-[var(--student-text-strong)]">{current.content}</h2>
                <div className="mt-4">
                  <AnswerInput question={current} value={responses[current.id]} onChange={(val) => setResponse(current.id, val)} />
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-between border-t pt-4">
              <Button
                variant="outline"
                disabled={currentIdx === 0 || isSequentialNavigationLocked}
                onClick={() => {
                  void handleNavigateToQuestion(Math.max(0, currentIdx - 1));
                }}
              >
                Previous
              </Button>
              {currentIdx < questions.length - 1 ? (
                <Button
                  className="student-button-solid"
                  disabled={!canAdvanceInStrictMode}
                  onClick={() => {
                    if (!canAdvanceInStrictMode) {
                      toast.info('Strict mode requires answering this question before moving forward.');
                      return;
                    }
                    void handleNavigateToQuestion(currentIdx + 1);
                  }}
                >
                  Next
                </Button>
              ) : (
                <Button className="student-button-solid" onClick={() => setShowConfirm(true)}>
                  Submit Assessment
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="student-card h-fit">
          <CardContent className="p-4">
            <p className="mb-3 text-sm font-semibold text-[var(--student-text-strong)]">Question Navigator</p>
            <div className="grid grid-cols-4 gap-2">
              {questions.map((q, i) => {
                const answered = isQuestionAnswered(q, responses[q.id]);
                return (
                  <Button
                    key={q.id}
                    variant="outline"
                    size="sm"
                    disabled={isSequentialNavigationLocked && i !== currentIdx}
                    onClick={() => {
                      if (isSequentialNavigationLocked && i !== currentIdx) return;
                      void handleNavigateToQuestion(i);
                    }}
                    className={
                      i === currentIdx
                        ? 'border-[var(--student-accent)] bg-[var(--student-accent)] text-[var(--student-accent-contrast)] hover:opacity-90'
                        : answered
                          ? 'border-[var(--student-success-border)] bg-[var(--student-success-bg)] text-[var(--student-success-text)]'
                          : ''
                    }
                  >
                    {i + 1}
                  </Button>
                );
              })}
            </div>
            <div className="mt-3 space-y-1 text-xs student-muted-text">
              <p className="flex items-center gap-1"><Flag className="h-3.5 w-3.5 text-[var(--student-accent)]" /> Current</p>
              <p className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-[var(--student-success-text)]" /> Answered</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Assessment?</DialogTitle>
            <DialogDescription>
              You answered {answeredCount} of {questions.length} questions. You can still go back to review answers before submitting.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Keep Working</Button>
            <Button className="student-button-solid" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showViolationDialog} onOpenChange={setShowViolationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assessment Auto-Submitted</DialogTitle>
            <DialogDescription>
              {violationDialogMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className="student-button-solid"
              onClick={() => router.replace(`/dashboard/student/assessments/${assessmentId}?view=submitted`)}
            >
              Return to Assessment Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnswerInput({
  question,
  value,
  onChange,
}: {
  question: AssessmentQuestion;
  value: string | string[] | undefined;
  onChange: (val: string | string[]) => void;
}) {
  const options = question.options || [];

  switch (question.type) {
    case 'multiple_choice':
      return (
        <div className="space-y-2">
          {options.map((opt) => (
            <label
              key={opt.id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                value === opt.id ? 'border-[var(--student-accent-soft-strong)] bg-[var(--student-accent-soft)]' : 'border-[var(--student-outline)] hover:bg-[var(--student-surface-soft)]'
              }`}
            >
              <input
                type="radio"
                name={question.id}
                checked={value === opt.id}
                onChange={() => onChange(opt.id)}
                className="accent-[var(--student-accent)]"
              />
              <span>{opt.text}</span>
            </label>
          ))}
        </div>
      );

    case 'multiple_select':
      return (
        <div className="space-y-2">
          {options.map((opt) => {
            const selected = Array.isArray(value) ? value.includes(opt.id) : false;
            return (
              <label
                key={opt.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                  selected ? 'border-[var(--student-accent-soft-strong)] bg-[var(--student-accent-soft)]' : 'border-[var(--student-outline)] hover:bg-[var(--student-surface-soft)]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => {
                    const current = Array.isArray(value) ? value : [];
                    onChange(selected ? current.filter((id) => id !== opt.id) : [...current, opt.id]);
                  }}
                  className="accent-[var(--student-accent)]"
                />
                <span>{opt.text}</span>
              </label>
            );
          })}
        </div>
      );

    case 'true_false':
      return (
        <div className="grid grid-cols-2 gap-3">
          {['True', 'False'].map((label) => {
            const opt = options.find((o) => o.text.toLowerCase() === label.toLowerCase());
            const optId = opt?.id || label.toLowerCase();
            return (
              <Button
                key={label}
                variant={value === optId ? 'default' : 'outline'}
                className={value === optId ? 'student-button-solid' : ''}
                onClick={() => onChange(optId)}
              >
                {label}
              </Button>
            );
          })}
        </div>
      );

    case 'short_answer':
    case 'fill_blank':
      return (
        <textarea
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer..."
          className="min-h-[120px] w-full resize-y rounded-xl border border-[var(--student-outline)] bg-[var(--student-elevated)] text-[var(--student-text-strong)] p-3 focus:border-[var(--student-accent)] focus:outline-none"
        />
      );

    case 'dropdown':
      return (
        <select
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-[var(--student-outline)] bg-[var(--student-elevated)] text-[var(--student-text-strong)] p-3 focus:border-[var(--student-accent)] focus:outline-none"
        >
          <option value="">Select an answer...</option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.text}</option>
          ))}
        </select>
      );

    default:
      return <p className="text-[var(--student-text-muted)]">Unsupported question type</p>;
  }
}
