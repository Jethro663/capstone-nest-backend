'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { Clock3, ListChecks, Download, UploadCloud, FileText, CheckCircle2, CircleDashed } from 'lucide-react';
import { assessmentService } from '@/services/assessment-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { RichTextRenderer } from '@/components/shared/rich-text/RichTextRenderer';
import type { SharedQuestionType } from '@/components/assessment/shared-answer-input';
import { StudentObjectiveAssessmentSurface } from '@/components/student/assessment/StudentObjectiveAssessmentSurface';
import { toast } from 'sonner';
import {
  getLatestReturnedAttempt,
  getSubmittedAttempts,
} from '@/utils/student-assessment-routing';
import type { Assessment, AssessmentQuestion, UpdateAttemptProgressDto } from '@/types/assessment';
import './take-page.css';

const StudentStatusChip = dynamic(
  () =>
    import('@/components/student/student-primitives').then(
      (mod) => mod.StudentStatusChip,
    ),
  {
    loading: () => <Skeleton className="h-6 w-24 rounded-full" />,
  },
);

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
  const [submittedFiles, setSubmittedFiles] = useState<Array<{
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt?: string | null;
  }>>([]);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [isAttemptSubmitted, setIsAttemptSubmitted] = useState(false);
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

  const normalizeAttemptSubmittedFiles = useCallback((attempt: {
    submittedFiles?: Array<{
      id: string;
      originalName: string;
      mimeType: string;
      sizeBytes: number;
      uploadedAt?: string | null;
    }> | null;
    submittedFileId?: string | null;
    submittedFileOriginalName?: string | null;
    submittedFileMimeType?: string | null;
    submittedFileSizeBytes?: number | null;
    updatedAt?: string;
    createdAt?: string;
  }) => {
    if (attempt.submittedFiles && attempt.submittedFiles.length > 0) {
      return attempt.submittedFiles;
    }

    if (!attempt.submittedFileId) {
      return [];
    }

    return [
      {
        id: attempt.submittedFileId,
        originalName: attempt.submittedFileOriginalName || 'Uploaded file',
        mimeType: attempt.submittedFileMimeType || 'application/octet-stream',
        sizeBytes: attempt.submittedFileSizeBytes || 0,
        uploadedAt: attempt.updatedAt || attempt.createdAt || null,
      },
    ];
  }, []);

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

  const isAutoSubmittedMessage = useCallback((message: string) => {
    const normalized = message.toLowerCase();
    return (
      normalized.includes('auto-submitted') ||
      normalized.includes('time is up') ||
      normalized.includes('attempt already expired')
    );
  }, []);

  const redirectToSubmittedState = useCallback(() => {
    setShowViolationDialog(true);
    setViolationDialogMessage(
      'Your assessment session already ended, so the attempt was submitted automatically.',
    );
    setTimeout(() => {
      router.replace(`/dashboard/student/assessments/${assessmentId}?view=submitted`);
    }, 1000);
  }, [assessmentId, router]);

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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const assessmentRes = await assessmentService.getById(assessmentId);
      const assessmentData = assessmentRes.data;
      let ongoing = (await assessmentService.getOngoingAttempt(assessmentId)).data;

      if (!ongoing && assessmentData.type === 'file_upload') {
        const attemptsRes = await assessmentService.getStudentAttempts(assessmentId);
        const attempts = attemptsRes.data || [];
        const submittedAttempts = getSubmittedAttempts(attempts);
        const latestReturnedAttempt = getLatestReturnedAttempt(attempts);
        const maxAttempts = assessmentData.maxAttempts ?? 1;

        if (submittedAttempts.length >= maxAttempts) {
          if (latestReturnedAttempt) {
            router.replace(
              `/dashboard/student/assessments/${assessmentId}/results/${latestReturnedAttempt.id}`,
            );
          } else {
            router.replace(`/dashboard/student/assessments/${assessmentId}?view=submitted`);
          }
          return;
        }

        ongoing = (await assessmentService.startAttempt(assessmentId)).data;
      }

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
      setIsAttemptSubmitted(Boolean(ongoing.attempt.isSubmitted));
      setStrictMode(Boolean(ongoing.strictMode));
      setTimedQuestionsEnabled(Boolean(ongoing.timedQuestionsEnabled));
      setSubmittedFiles(normalizeAttemptSubmittedFiles(ongoing.attempt));
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
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Failed to load assessment');
    } finally {
      setLoading(false);
    }
  }, [assessmentId, applyAttemptState, getErrorMessage, normalizeAttemptSubmittedFiles, router, searchParams]);

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
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      if (isAutoSubmittedMessage(errorMessage)) {
        redirectToSubmittedState();
        return;
      }
      toast.error(errorMessage || 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  }, [
    assessment,
    buildSubmissionResponses,
    assessmentId,
    getErrorMessage,
    isAutoSubmittedMessage,
    redirectToSubmittedState,
    router,
    timeSpentSeconds,
  ]);

  const handleUploadSubmissionFiles = useCallback(async (files: FileList | File[]) => {
    if (!assessment) return;

    const allowedExtensions =
      assessment.allowedUploadExtensions && assessment.allowedUploadExtensions.length > 0
        ? assessment.allowedUploadExtensions.map((ext) => ext.toLowerCase())
        : [];
    const maxUploadSize = assessment.maxUploadSizeBytes ?? 100 * 1024 * 1024;
    const queue = Array.from(files);
    if (queue.length === 0) return;

    try {
      setUploadingFile(true);

      for (const file of queue) {
        const extension = file.name.includes('.')
          ? file.name.split('.').pop()?.toLowerCase() || ''
          : '';

        if (!extension || (allowedExtensions.length > 0 && !allowedExtensions.includes(extension))) {
          toast.error(`.${extension || 'unknown'} is not allowed for this assessment`);
          continue;
        }

        if (file.size > maxUploadSize) {
          toast.error('File is too large. Maximum allowed size is 100 MB.');
          continue;
        }

        const res = await assessmentService.uploadSubmissionFile(assessmentId, file);
        setSubmittedFiles((current) => res.data.files ?? [...current, res.data.file]);
      }

      toast.success('File attachments updated.');
    } catch {
      toast.error('Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  }, [assessment, assessmentId]);

  const handleRemoveSubmissionFile = useCallback(async (fileId: string) => {
    try {
      const res = await assessmentService.removeSubmissionFile(assessmentId, fileId);
      setSubmittedFiles(res.data.files);
      toast.success('Attachment removed.');
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || 'Failed to remove file');
    }
  }, [assessmentId, getErrorMessage]);

  const handleSubmitFileUpload = useCallback(async () => {
    if (submittedFiles.length === 0) {
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
      setIsAttemptSubmitted(true);
      toast.success('File upload assessment submitted!');
      setTimeout(() => {
        router.replace(`/dashboard/student/assessments/${assessmentId}?view=submitted`);
      }, 900);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      if (isAutoSubmittedMessage(errorMessage)) {
        redirectToSubmittedState();
        return;
      }
      toast.error(errorMessage || 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  }, [
    submittedFiles,
    assessmentId,
    getErrorMessage,
    isAutoSubmittedMessage,
    redirectToSubmittedState,
    router,
    timeSpentSeconds,
  ]);

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
      <div className="student-assessment-take-theme max-w-5xl space-y-6">
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
    const fileAttached = submittedFiles.length > 0;
    const submissionStatusLabel = isAttemptSubmitted ? 'Turned in' : 'Not turned in';
    const attachmentCountLabel =
      submittedFiles.length === 1
        ? '1 attachment'
        : `${submittedFiles.length} attachments`;

    return (
      <div className="student-assessment-take-theme space-y-4">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mx-auto max-w-6xl space-y-4 px-3 pb-4 sm:px-4"
        >
          <Card className="overflow-hidden rounded-[28px] border border-[var(--student-outline)] bg-white shadow-[0_28px_64px_-48px_color-mix(in_srgb,var(--student-navy)_35%,transparent)]">
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="sticky top-0 z-20 -mx-4 -mt-4 border-b border-[var(--student-outline)] bg-white/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:-mt-6 sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-[var(--student-text-strong)]">{assessment.title}</p>
                    <p className="text-sm text-[var(--student-text-muted)]">File Upload Assessment</p>
                  </div>
                  <div className="flex flex-wrap items-stretch gap-2 lg:justify-end">
                    <StudentStatusChip tone={isAttemptSubmitted ? 'success' : 'neutral'} className="border-[var(--student-outline)] bg-white text-[var(--student-text-strong)]">
                      {isAttemptSubmitted ? (
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      ) : (
                        <CircleDashed className="mr-1 h-3.5 w-3.5" />
                      )}
                      {submissionStatusLabel}
                    </StudentStatusChip>
                    {fileAttached ? (
                      <StudentStatusChip tone="neutral" className="border-[var(--student-outline)] bg-white text-[var(--student-text-strong)]">
                        <FileText className="mr-1 h-3.5 w-3.5" />
                        {attachmentCountLabel}
                      </StudentStatusChip>
                    ) : null}
                    <StudentStatusChip tone="neutral" className="border-[var(--student-outline)] bg-white text-[var(--student-text-strong)]">
                      <Clock3 className="mr-1 h-3.5 w-3.5" />
                      {remainingSeconds !== null ? formatTime(remainingSeconds) : formatTime(timeSpentSeconds)}
                    </StudentStatusChip>
                    <Button
                      className="w-full border border-transparent bg-[var(--student-red)] text-white shadow-none hover:bg-[var(--student-red-hover)] sm:w-auto sm:min-w-[170px]"
                      onClick={handleSubmitFileUpload}
                      disabled={submitting || uploadingFile || isAttemptSubmitted}
                      aria-label="Submit assessment"
                    >
                      {submitting ? 'Submitting...' : isAttemptSubmitted ? 'Submitted' : 'Submit assessment'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-5 min-w-0">
              <div className="rounded-xl border border-[var(--student-outline)] bg-[var(--student-white)] p-4 shadow-[0_12px_32px_-28px_color-mix(in_srgb,var(--student-navy)_22%,transparent)]">
                <p className="mb-2 text-xs uppercase tracking-wide text-[var(--student-text-muted)]">Instruction</p>
                {assessment.fileUploadInstructions ? (
                  <RichTextRenderer
                    html={assessment.fileUploadInstructions}
                    className="text-sm leading-relaxed text-[var(--student-text-strong)]"
                  />
                ) : (
                  <p className="text-sm leading-relaxed text-[var(--student-text-strong)]">
                    No additional instruction provided.
                  </p>
                )}
              </div>

              {(assessment.rubricCriteria?.length ?? 0) > 0 && (
                <div className="rounded-xl border border-[var(--student-outline)] bg-white p-4 shadow-[0_12px_32px_-28px_color-mix(in_srgb,var(--student-navy)_35%,transparent)] space-y-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--student-text-muted)]">Rubric</p>
                  {assessment.rubricCriteria?.map((criterion) => (
                    <div key={criterion.id} className="flex items-start justify-between gap-3 rounded-lg bg-[var(--student-white)] px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--student-text-strong)]">{criterion.title}</p>
                        {criterion.description && (
                          <p className="text-xs text-[var(--student-text-muted)]">{criterion.description}</p>
                        )}
                      </div>
                      <span className="inline-flex items-center rounded-full bg-[var(--student-navy)] px-3 py-1 text-xs font-semibold text-white">{criterion.points} pts</span>
                    </div>
                  ))}
                </div>
              )}

                </div>

                <div className="space-y-5 min-w-0">
              <div className="rounded-xl border border-[var(--student-outline)] bg-white p-4 shadow-[0_12px_32px_-28px_color-mix(in_srgb,var(--student-navy)_35%,transparent)] space-y-3">
                <p className="text-xs uppercase tracking-wide text-[var(--student-text-muted)]">Submission Rules</p>
                <div className="space-y-3 text-sm text-[var(--student-text-strong)]">
                  <div>
                    <p className="font-medium">Allowed formats</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {allowedExtensions.length > 0 ? allowedExtensions.map((ext) => (
                        <span key={ext} className="inline-flex items-center rounded-full border border-[var(--student-outline)] bg-white px-3 py-1 text-xs font-semibold uppercase text-[var(--student-text-strong)]">.{ext}</span>
                      )) : <span className="text-xs text-[var(--student-text-muted)]">No format restrictions configured</span>}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium">Maximum upload size</p>
                    <p className="text-xs text-[var(--student-text-muted)]">
                      {(maxUploadSize / (1024 * 1024)).toFixed(0)} MB per attachment
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Submission mode</p>
                    <p className="text-xs text-[var(--student-text-muted)]">
                      You can attach multiple files before submitting. Your latest turned-in state is what the teacher reviews.
                    </p>
                  </div>
                </div>
              </div>

              {assessment.teacherAttachmentFile && (
                <div className="rounded-xl border border-[var(--student-outline)] bg-white p-4 shadow-[0_12px_32px_-28px_color-mix(in_srgb,var(--student-navy)_35%,transparent)] space-y-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--student-text-muted)]">Teacher Reference File</p>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--student-text-strong)]">{assessment.teacherAttachmentFile.originalName}</p>
                    <p className="text-xs text-[var(--student-text-muted)]">
                      {(assessment.teacherAttachmentFile.sizeBytes / (1024 * 1024)).toFixed(2)} MB • {assessment.teacherAttachmentFile.mimeType}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-fit border-[var(--student-outline)] bg-white text-[var(--student-text-strong)] hover:bg-[var(--student-white)] hover:text-[var(--student-text-strong)]"
                    onClick={() => void assessmentService.downloadTeacherAttachment(
                      assessmentId,
                      assessment.teacherAttachmentFile?.originalName || 'teacher-attachment',
                    )}
                  >
                    <Download className="h-4 w-4 mr-1" /> Download
                  </Button>
                </div>
              )}

                </div>
              </div>

              <div className="rounded-xl border border-[var(--student-outline)] bg-white p-4 shadow-[0_12px_32px_-28px_color-mix(in_srgb,var(--student-navy)_35%,transparent)] space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--student-text-strong)]">Your Submission</p>
                    <p className="text-xs text-[var(--student-text-muted)]">
                      Add one or more files here. You can remove draft attachments until you submit this assessment.
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-[var(--student-outline)] bg-white px-3 py-1 text-xs font-semibold text-[var(--student-text-strong)]">{attachmentCountLabel}</span>
                </div>
                <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--student-outline)] bg-[var(--student-white)] px-4 py-5 text-sm font-medium text-[var(--student-text-strong)] transition-colors hover:bg-[var(--student-white)]">
                  <UploadCloud className="h-4 w-4" />
                  {uploadingFile ? 'Uploading...' : fileAttached ? 'Add more files' : 'Attach files'}
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.length) void handleUploadSubmissionFiles(e.target.files);
                      e.target.value = '';
                    }}
                    disabled={uploadingFile || isAttemptSubmitted}
                  />
                </label>

                {submittedFiles.length > 0 ? (
                  <div className="space-y-3">
                    {submittedFiles.map((file, index) => (
                      <div key={file.id} className="flex flex-col gap-3 rounded-xl border border-[var(--student-outline)] bg-[var(--student-white)] px-4 py-4 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-wide text-[var(--student-text-muted)]">Attachment {index + 1}</p>
                          <p className="truncate text-sm font-medium text-[var(--student-text-strong)]">{file.originalName}</p>
                          <p className="text-xs text-[var(--student-text-muted)]">
                            {(file.sizeBytes / (1024 * 1024)).toFixed(2)} MB | {file.mimeType}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => activeAttemptId
                              ? void assessmentService.downloadAttemptSubmissionAttachmentFile(
                                  activeAttemptId,
                                  file.id,
                                  file.originalName,
                                )
                              : undefined}
                          >
                            <FileText className="mr-1 h-4 w-4" /> View file
                          </Button>
                          {!isAttemptSubmitted ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-[var(--student-outline)] bg-white text-[var(--student-text-strong)] hover:bg-[var(--student-white)] hover:text-[var(--student-text-strong)]"
                              onClick={() => void handleRemoveSubmissionFile(file.id)}
                            >
                              Remove
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[var(--student-outline)] px-4 py-6 text-sm text-[var(--student-text-muted)]">
                    No files attached yet.
                  </div>
                )}
              </div>
            </div>
            </CardContent>
          </Card>
        </motion.div>

        <Dialog open={showMissingFilePrompt} onOpenChange={setShowMissingFilePrompt}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload required</DialogTitle>
              <DialogDescription>
                Please upload at least one file before submitting this assessment.
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
    <div className="student-assessment-take-theme">
      <StudentObjectiveAssessmentSurface
        title={assessment.title}
        questionLabel={`Question ${currentIdx + 1} of ${questions.length}`}
        progressValue={progressValue}
        statusChips={
          <>
            <StudentStatusChip tone="info">
              <ListChecks className="mr-1 h-3.5 w-3.5" />
              {answeredCount}/{questions.length} answered
            </StudentStatusChip>
            {timedQuestionsEnabled && questionTimerRemaining !== null ? (
              <StudentStatusChip tone={questionTimerRemaining <= 10 ? 'danger' : 'warning'}>
                <Clock3 className="mr-1 h-3.5 w-3.5" />
                Q: {formatTime(questionTimerRemaining)}
              </StudentStatusChip>
            ) : null}
            <StudentStatusChip tone={isTimeLow ? 'danger' : 'warning'}>
              <Clock3 className="mr-1 h-3.5 w-3.5" />
              {remainingSeconds !== null ? formatTime(remainingSeconds) : formatTime(timeSpentSeconds)}
            </StudentStatusChip>
          </>
        }
        question={{
          id: current.id,
          type: current.type as SharedQuestionType,
          points: current.points,
          promptHtml: current.content ?? '<p></p>',
          imageUrl: current.imageUrl,
          imageDisplayMode: current.imageDisplayMode,
          imageZoom: current.imageZoom,
          imagePositionX: current.imagePositionX,
          imagePositionY: current.imagePositionY,
          options: (current.options || []).map((opt) => ({
            id: opt.id,
            text: opt.text,
            imageUrl: opt.imageUrl,
            imageDisplayMode: opt.imageDisplayMode,
            imageZoom: opt.imageZoom,
            imagePositionX: opt.imagePositionX,
            imagePositionY: opt.imagePositionY,
          })),
        }}
        currentIdx={currentIdx}
        questionIds={questions.map((question) => question.id)}
        answeredById={Object.fromEntries(
          questions.map((question) => [question.id, isQuestionAnswered(question, responses[question.id])]),
        )}
        navigationLocked={isSequentialNavigationLocked}
        value={responses[current.id]}
        onChange={(val) => setResponse(current.id, val)}
        onNavigate={(index) => {
          void handleNavigateToQuestion(index);
        }}
        protectContent
        onSurfaceKeyDown={(event) => {
          const tagName = (event.target as HTMLElement)?.tagName;
          const isEditable = tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
          if (!isEditable && (event.ctrlKey || event.metaKey) && ['c', 'x'].includes(event.key.toLowerCase())) {
            event.preventDefault();
          }
        }}
        footerLeft={
          <Button
            variant="outline"
            disabled={currentIdx === 0 || isSequentialNavigationLocked}
            onClick={() => {
              void handleNavigateToQuestion(Math.max(0, currentIdx - 1));
            }}
          >
            Previous
          </Button>
        }
        footerRight={
          currentIdx < questions.length - 1 ? (
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
          )
        }
      />

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
