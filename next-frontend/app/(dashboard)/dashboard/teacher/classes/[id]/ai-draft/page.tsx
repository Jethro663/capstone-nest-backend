'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bot,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  ConfirmationDialog,
  type ConfirmationDialogConfig,
} from '@/components/shared/ConfirmationDialog';
import { RichTextRenderer } from '@/components/shared/rich-text/RichTextRenderer';
import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';
import { extractionService } from '@/services/extraction-service';
import { aiService } from '@/services/ai-service';
import { assessmentService } from '@/services/assessment-service';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  isAiDraftTerminalStatus,
  mergeTrackedAiDraftJobFromStatus,
  readTrackedAiDraftJobs,
  removeTrackedAiDraftJob,
  type TrackedAiDraftJobEntry,
} from '@/lib/ai-draft-job-tracker';
import type {
  AiClassIndexStatus,
  AiGenerationJob,
  QuizDraftApplyPreview,
  QuizDraftReviewIssue,
  QuizDraftStructuredOutput,
} from '@/types/ai';
import type { ClassItem } from '@/types/class';
import type { Extraction } from '@/types/extraction';
import type { Lesson } from '@/types/lesson';
import type { QuestionType } from '@/utils/constants';
import '../workspace.css';
import './workspace.css';

const QUESTION_TYPES: Array<{ value: QuestionType; label: string }> = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'multiple_select', label: 'Multiple Select' },
];

const JOB_POLL_INTERVAL_MS = 2500;

type DraftWorkflowTab = 'sources' | 'setup' | 'generation' | 'preview';

const WORKFLOW_TABS: Array<{
  value: DraftWorkflowTab;
  step: string;
  label: string;
  description: string;
}> = [
  {
    value: 'sources',
    step: '01',
    label: 'Sources',
    description: 'Pick lessons and extracted files',
  },
  {
    value: 'setup',
    step: '02',
    label: 'Quiz setup',
    description: 'Set question count and guidance',
  },
  {
    value: 'generation',
    step: '03',
    label: 'Generation',
    description: 'Track the AI draft job',
  },
  {
    value: 'preview',
    step: '04',
    label: 'Preview',
    description: 'Review the generated draft',
  },
];

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getQuizJobErrorMessage(errorMessage?: string | null): string | null {
  if (!errorMessage) return null;
  const normalized = errorMessage.toLowerCase();
  if (normalized.includes('blueprint')) {
    return 'Blueprint planning failed. Narrow the source set or shorten the teacher note, then try again.';
  }
  if (normalized.includes('duplicates')) {
    return 'The generated questions repeated existing items. Narrow the source selection or adjust the note, then retry.';
  }
  if (normalized.includes('no indexed source content')) {
    return 'No indexed class source content is ready yet. Reindex the class sources before generating.';
  }
  if (normalized.includes('selected lessons are not indexed')) {
    return errorMessage;
  }
  if (normalized.includes('selected extractions are not indexed')) {
    return errorMessage;
  }
  return errorMessage;
}

function toRelativeTime(value?: string | null) {
  if (!value) return 'Unknown';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Unknown';
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${Math.floor(diffHour / 24)}d ago`;
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Unknown';
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return 'Unknown';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
}

function getJobBadgeVariant(status?: string | null) {
  if (status === 'failed') return 'destructive' as const;
  if (status === 'completed' || status === 'approved') return 'secondary' as const;
  return 'outline' as const;
}

function getReadinessBadge(indexStatus: AiClassIndexStatus | null) {
  if (!indexStatus) {
    return {
      label: 'Checking sources',
      tone: 'pending',
      detail: 'Loading class indexing status.',
    };
  }
  if (indexStatus.chunksIndexed > 0 && !indexStatus.needsReindex) {
    return {
      label: 'Sources indexed',
      tone: 'ready',
      detail: `${indexStatus.chunksIndexed} class chunk(s) ready for quiz generation.`,
    };
  }
  if (indexStatus.chunksIndexed > 0 && indexStatus.needsReindex) {
    return {
      label: 'Reindex recommended',
      tone: 'warning',
      detail:
        indexStatus.reason ||
        'Some class sources changed after the last index. Run reindex before generating.',
    };
  }
  return {
    label: 'Index required',
    tone: 'warning',
    detail:
      indexStatus.reason ||
      'This class needs indexed source content before quiz generation can start.',
  };
}

function buildTrackedJobSnapshot(entry: TrackedAiDraftJobEntry): AiGenerationJob {
  return {
    jobId: entry.jobId,
    jobType: entry.jobType,
    status: entry.lastKnownStatus,
    progressPercent: entry.lastKnownProgress,
    statusMessage: null,
    errorMessage: null,
    outputId: null,
    assessmentId: entry.assessmentId ?? null,
    updatedAt: entry.updatedAt ?? entry.createdAt,
  };
}

function buildUnavailableIndexStatus(classId: string): AiClassIndexStatus {
  return {
    classId,
    chunksIndexed: 0,
    lessonChunks: 0,
    extractionChunks: 0,
    questionChunks: 0,
    lastIndexedAt: null,
    latestSourceUpdateAt: null,
    isStale: false,
    needsReindex: false,
    reason:
      'AI source readiness is temporarily unavailable. Refresh the page or run reindex when the AI service is ready.',
    readyLessons: [],
    lessonBlockers: [],
    readyExtractions: [],
    extractionBlockers: [],
    sourceSummary: {
      lessons: { total: 0, ready: 0, blocked: 0 },
      extractions: { total: 0, ready: 0, blocked: 0 },
      questions: {
        assessments: 0,
        assessmentsWithQuestions: 0,
        questionCount: 0,
        needsIndex: 0,
      },
    },
  };
}

function recomputeReviewState(draft: QuizDraftStructuredOutput): QuizDraftStructuredOutput {
  const issues = draft.reviewIssues ?? [];
  const unresolvedBlocking = issues.some(
    (issue) => issue.severity === 'blocking' && !issue.resolved,
  );
  const unresolvedWarnings = issues.some(
    (issue) => issue.severity === 'warning' && !issue.resolved,
  );
  return {
    ...draft,
    qualityGate: unresolvedBlocking
      ? 'fail'
      : issues.length > 0
        ? 'warn'
        : draft.qualityGate ?? 'pass',
    reviewRequired: unresolvedBlocking || unresolvedWarnings,
    reviewState:
      unresolvedBlocking || unresolvedWarnings ? 'needs_review' : 'ready',
  };
}

function resolveQuestionIssues(
  issues: QuizDraftReviewIssue[] | undefined,
  questionIndex: number,
  resolution: string,
) {
  return (issues ?? []).map((issue) =>
    issue.questionIndex === questionIndex
      ? { ...issue, resolved: true, resolution }
      : issue,
  );
}

export default function TeacherAiDraftQuizPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [applyingDraft, setApplyingDraft] = useState(false);
  const [applyPreview, setApplyPreview] = useState<QuizDraftApplyPreview | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<ConfirmationDialogConfig | null>(null);

  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [indexStatus, setIndexStatus] = useState<AiClassIndexStatus | null>(null);

  const [title, setTitle] = useState('');
  const [teacherNote, setTeacherNote] = useState('');
  const [questionCount, setQuestionCount] = useState('5');
  const [questionType, setQuestionType] = useState<QuestionType>('multiple_choice');
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
  const [selectedExtractionIds, setSelectedExtractionIds] = useState<string[]>([]);
  const [useAllSourcesWhenNoneSelected, setUseAllSourcesWhenNoneSelected] = useState(true);
  const [draftSourceAcknowledged, setDraftSourceAcknowledged] = useState(false);

  const [job, setJob] = useState<AiGenerationJob | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [result, setResult] = useState<QuizDraftStructuredOutput | null>(null);
  const [trackedJobs, setTrackedJobs] = useState<TrackedAiDraftJobEntry[]>([]);

  const [lessonSearch, setLessonSearch] = useState('');
  const [extractionSearch, setExtractionSearch] = useState('');
  const [activeTab, setActiveTab] = useState<DraftWorkflowTab>('sources');

  const syncTrackedJobs = useCallback(
    (entries?: TrackedAiDraftJobEntry[]) => {
      const nextEntries = entries ?? readTrackedAiDraftJobs(classId);
      setTrackedJobs(nextEntries);
      return nextEntries;
    },
    [classId],
  );

  const fetchWorkspace = useCallback(
    async (options?: { retry?: boolean }) => {
      const loadWorkspaceOnce = async () => {
        const [classRes, lessonRes] = await Promise.all([
          classService.getById(classId),
          lessonService.getByClass(classId, { status: 'all', pageSize: 100 }),
        ]);
        setClassItem(classRes.data);
        setLessons(lessonRes.data ?? []);
      };
      try {
        await loadWorkspaceOnce();
      } catch (error) {
        if (options?.retry === false) {
          throw error;
        }
        await wait(900);
        await loadWorkspaceOnce();
      }
    },
    [classId],
  );

  const fetchExtractions = useCallback(
    async (options?: { retry?: boolean }) => {
      const loadExtractionsOnce = async () => {
        const extractionRes = await extractionService.listByClass(classId);
        setExtractions(extractionRes.data ?? []);
      };
      try {
        await loadExtractionsOnce();
      } catch (error) {
        if (options?.retry === false) {
          throw error;
        }
        await wait(900);
        await loadExtractionsOnce();
      }
    },
    [classId],
  );

  const fetchReadiness = useCallback(
    async (options?: { silent?: boolean; retry?: boolean }) => {
      const loadReadinessOnce = async () => {
        const response = await aiService.getClassIndexStatus(classId);
        setIndexStatus(response.data);
        return response.data;
      };
      if (!options?.silent) {
        setReadinessLoading(true);
      }
      try {
        return await loadReadinessOnce();
      } catch (error) {
        if (options?.retry === false) {
          throw error;
        }
        await wait(900);
        return await loadReadinessOnce();
      } finally {
        if (!options?.silent) {
          setReadinessLoading(false);
        }
      }
    },
    [classId],
  );

  const refreshCurrentJob = useCallback(
    async (
      targetJobId?: string | null,
      options?: { silent?: boolean; loadResult?: boolean },
    ) => {
      const jobIdToLoad = targetJobId ?? currentJobId;
      if (!jobIdToLoad) {
        return null;
      }
      try {
        const statusRes = await aiService.getTeacherJobStatus(jobIdToLoad);
        setJob(statusRes.data);
        mergeTrackedAiDraftJobFromStatus(classId, statusRes.data);
        syncTrackedJobs();

        if (
          options?.loadResult !== false &&
          (statusRes.data.status === 'completed' || statusRes.data.status === 'approved')
        ) {
          const resultRes = await aiService.getQuizDraftJobResult(jobIdToLoad);
          setResult(resultRes.data.result.structuredOutput);
          setActiveTab('preview');
          void fetchReadiness({ silent: true });
        } else if (statusRes.data.status === 'cancelled') {
          setResult(null);
          void fetchReadiness({ silent: true });
        }

        return statusRes.data;
      } catch (error) {
        if (!options?.silent) {
          toast.error(getApiErrorMessage(error, 'Failed to refresh AI draft status'));
        }
        return null;
      }
    },
    [classId, currentJobId, fetchReadiness, syncTrackedJobs],
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        await fetchWorkspace();
      } catch (error) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(error, 'Failed to load the AI draft workspace'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
      try {
        await fetchExtractions();
      } catch (error) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(error, 'Failed to load class extractions'));
        }
      }
      try {
        await fetchReadiness();
      } catch (error) {
        if (!cancelled) {
          setIndexStatus(buildUnavailableIndexStatus(classId));
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [classId, fetchExtractions, fetchReadiness, fetchWorkspace]);

  useEffect(() => {
    const cached = syncTrackedJobs();
    if (cached.length > 0) {
      setCurrentJobId((current) => current ?? cached[0].jobId);
    } else {
      setCurrentJobId(null);
      setJob(null);
      setResult(null);
    }
  }, [classId, syncTrackedJobs]);

  useEffect(() => {
    if (!currentJobId) {
      setJob(null);
      setResult(null);
      return;
    }
    void refreshCurrentJob(currentJobId, { silent: true });
  }, [currentJobId, refreshCurrentJob]);

  useEffect(() => {
    if (result) {
      setActiveTab('preview');
    }
  }, [result]);

  const currentTrackedJob = useMemo(
    () => trackedJobs.find((entry) => entry.jobId === currentJobId) ?? null,
    [currentJobId, trackedJobs],
  );

  const displayJob = useMemo<AiGenerationJob | null>(() => {
    if (job && (!currentJobId || job.jobId === currentJobId)) {
      return job;
    }
    if (currentTrackedJob) {
      return buildTrackedJobSnapshot(currentTrackedJob);
    }
    return job;
  }, [currentJobId, currentTrackedJob, job]);

  const shouldPollCurrentJob = Boolean(
    currentJobId &&
      displayJob &&
      !isAiDraftTerminalStatus(displayJob.status),
  );

  useEffect(() => {
    if (!currentJobId || !shouldPollCurrentJob) {
      return undefined;
    }
    const interval = window.setInterval(() => {
      void refreshCurrentJob(currentJobId, { silent: true });
    }, JOB_POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [currentJobId, refreshCurrentJob, shouldPollCurrentJob]);

  const readyLessonMap = useMemo(
    () => new Map((indexStatus?.readyLessons ?? []).map((entry) => [entry.lessonId, entry])),
    [indexStatus],
  );
  const lessonBlockerMap = useMemo(
    () => new Map((indexStatus?.lessonBlockers ?? []).map((entry) => [entry.lessonId, entry])),
    [indexStatus],
  );
  const readyExtractionMap = useMemo(
    () =>
      new Map((indexStatus?.readyExtractions ?? []).map((entry) => [entry.extractionId, entry])),
    [indexStatus],
  );
  const extractionBlockerMap = useMemo(
    () =>
      new Map((indexStatus?.extractionBlockers ?? []).map((entry) => [entry.extractionId, entry])),
    [indexStatus],
  );

  const lessonRows = useMemo(() => {
    return lessons.map((lesson) => {
      const ready = readyLessonMap.get(lesson.id);
      const blocker = lessonBlockerMap.get(lesson.id);
      const isDraftSource =
        Boolean(lesson.isDraft) ||
        String(blocker?.reason || '').toLowerCase().includes('draft');
      const selectable = !blocker || isDraftSource;
      let stateLabel = 'Status unavailable';
      let tone: 'ready' | 'index' | 'blocked' = 'index';
      if (ready?.status === 'indexed') {
        tone = 'ready';
        stateLabel = `${ready.chunkCount} indexed chunk(s)`;
      } else if (ready?.status === 'ready_to_index') {
        tone = 'index';
        stateLabel = 'Ready to index';
      } else if (blocker) {
        tone = isDraftSource ? 'index' : 'blocked';
        stateLabel = blocker.reason;
      } else if (lesson.isDraft) {
        tone = 'index';
        stateLabel = 'Lesson is still a draft.';
      }
      return {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description || '',
        selectable,
        selected: selectedLessonIds.includes(lesson.id),
        tone,
        stateLabel,
        updatedAt: ready?.updatedAt ?? blocker?.updatedAt ?? lesson.updatedAt ?? null,
        isDraftSource,
      };
    });
  }, [lessonBlockerMap, lessons, readyLessonMap, selectedLessonIds]);

  const extractionRows = useMemo(() => {
    return extractions.map((extraction) => {
      const ready = readyExtractionMap.get(extraction.id);
      const blocker = extractionBlockerMap.get(extraction.id);
      const selectable = !blocker;
      let stateLabel = 'Status unavailable';
      let tone: 'ready' | 'index' | 'blocked' = 'index';
      if (ready?.status === 'indexed') {
        tone = 'ready';
        stateLabel = `${ready.chunkCount} indexed chunk(s)`;
      } else if (ready?.status === 'ready_to_index') {
        tone = 'index';
        stateLabel = 'Ready to index';
      } else if (blocker) {
        tone = 'blocked';
        stateLabel = blocker.reason;
      } else if (extraction.extractionStatus === 'processing' || extraction.extractionStatus === 'pending') {
        tone = 'blocked';
        stateLabel = 'Extraction is still processing.';
      }
      return {
        id: extraction.id,
        title:
          extraction.structuredContent?.title ||
          extraction.originalName ||
          'Extraction',
        description: extraction.originalName || extraction.id,
        selectable,
        selected: selectedExtractionIds.includes(extraction.id),
        tone,
        stateLabel,
        updatedAt:
          ready?.updatedAt ?? blocker?.updatedAt ?? extraction.updatedAt ?? null,
      };
    });
  }, [extractionBlockerMap, extractions, readyExtractionMap, selectedExtractionIds]);

  const visibleLessonRows = useMemo(() => {
    const needle = lessonSearch.trim().toLowerCase();
    if (!needle) return lessonRows;
    return lessonRows.filter((lesson) =>
      `${lesson.title} ${lesson.description} ${lesson.stateLabel}`
        .toLowerCase()
        .includes(needle),
    );
  }, [lessonRows, lessonSearch]);

  const visibleExtractionRows = useMemo(() => {
    const needle = extractionSearch.trim().toLowerCase();
    if (!needle) return extractionRows;
    return extractionRows.filter((extraction) =>
      `${extraction.title} ${extraction.description} ${extraction.stateLabel}`
        .toLowerCase()
        .includes(needle),
    );
  }, [extractionRows, extractionSearch]);

  const selectedLessons = useMemo(
    () => lessons.filter((lesson) => selectedLessonIds.includes(lesson.id)),
    [lessons, selectedLessonIds],
  );
  const selectedExtractions = useMemo(
    () => extractions.filter((extraction) => selectedExtractionIds.includes(extraction.id)),
    [extractions, selectedExtractionIds],
  );

  const parsedQuestionCount = Number(questionCount);
  const isQuestionCountValid =
    Number.isInteger(parsedQuestionCount) &&
    parsedQuestionCount >= 1 &&
    parsedQuestionCount <= 15;
  const hasAnySource = lessons.length + extractions.length > 0;
  const hasManualSelection =
    selectedLessonIds.length + selectedExtractionIds.length > 0;
  const selectedDraftSourceCount = selectedLessons.filter((lesson) => lesson.isDraft).length;
  const hasDraftSourceSelection = selectedDraftSourceCount > 0;
  const hasRunningJob = Boolean(
    displayJob && !isAiDraftTerminalStatus(displayJob.status),
  );
  const readinessUnavailable = Boolean(
    indexStatus?.reason?.includes('AI source readiness is temporarily unavailable'),
  );
  const generationReady = Boolean(
    indexStatus &&
      indexStatus.chunksIndexed > 0 &&
      !indexStatus.needsReindex &&
      !readinessUnavailable,
  );
  const canGenerate =
    !submitting &&
    !hasRunningJob &&
    generationReady &&
    hasAnySource &&
    isQuestionCountValid &&
    (useAllSourcesWhenNoneSelected || hasManualSelection) &&
    (!hasDraftSourceSelection || draftSourceAcknowledged);

  const readinessBadge = getReadinessBadge(indexStatus);
  const assessmentId =
    result?.assessmentId ||
    result?.runtime?.assessmentId ||
    displayJob?.assessmentId ||
    null;
  const canDeleteCurrentDraft = Boolean(displayJob?.jobId || assessmentId);
  const recentTrackedJobs = trackedJobs.slice(0, 6);
  const selectedSourceCount = selectedLessonIds.length + selectedExtractionIds.length;
  const reviewIssues = result?.reviewIssues ?? [];
  const unresolvedBlockingIssues = reviewIssues.filter(
    (issue) => issue.severity === 'blocking' && !issue.resolved,
  );
  const unresolvedWarningIssues = reviewIssues.filter(
    (issue) => issue.severity === 'warning' && !issue.resolved,
  );
  const applyBlockedReasons = [
    savingDraft ? 'Wait for draft edits to finish saving.' : null,
    result?.qualityGate === 'fail' ? 'Repair failed-quality questions first.' : null,
    !result?.questions?.length ? 'Keep at least one question in the draft.' : null,
    unresolvedBlockingIssues.length > 0 ? 'Resolve blocking review issues.' : null,
    result?.reviewRequired ? 'Finish the review queue before applying.' : null,
  ].filter(Boolean) as string[];
  const canApplyDraft = Boolean(
    currentJobId &&
      result &&
      !savingDraft &&
      !applyingDraft &&
      applyBlockedReasons.length === 0,
  );
  const sourceStepComplete =
    hasAnySource && (useAllSourcesWhenNoneSelected || hasManualSelection);
  const setupStepComplete = isQuestionCountValid;
  const generationStepComplete = Boolean(result);

  const getWorkflowTabStatus = (tab: DraftWorkflowTab) => {
    if (tab === 'sources') {
      if (!hasAnySource) return 'Waiting for sources';
      return hasManualSelection
        ? `${selectedSourceCount} selected`
        : useAllSourcesWhenNoneSelected
          ? 'All ready sources'
          : 'Needs selection';
    }
    if (tab === 'setup') {
      return setupStepComplete
        ? `${parsedQuestionCount} question${parsedQuestionCount === 1 ? '' : 's'}`
        : 'Needs count';
    }
    if (tab === 'generation') {
      return displayJob?.status || 'Idle';
    }
    return result?.questions?.length
      ? `${result.questions.length} question${result.questions.length === 1 ? '' : 's'}`
      : 'No preview';
  };

  const getWorkflowTabState = (tab: DraftWorkflowTab) => {
    if (tab === activeTab) return 'active';
    if (tab === 'sources' && sourceStepComplete && activeTab !== 'sources') return 'done';
    if (
      tab === 'setup' &&
      setupStepComplete &&
      (Boolean(displayJob) || activeTab === 'generation' || activeTab === 'preview')
    ) {
      return 'done';
    }
    if (tab === 'generation' && generationStepComplete) return 'done';
    if (tab === 'preview' && result) return 'done';
    return 'idle';
  };

  const toggleSelection = (
    id: string,
    currentIds: string[],
    setIds: (value: string[]) => void,
  ) => {
    setIds(
      currentIds.includes(id)
        ? currentIds.filter((value) => value !== id)
        : [...currentIds, id],
    );
  };

  const setVisibleLessonSelection = (checked: boolean) => {
    const selectableVisibleIds = visibleLessonRows
      .filter((row) => row.selectable)
      .map((row) => row.id);
    if (checked) {
      const next = new Set(selectedLessonIds);
      selectableVisibleIds.forEach((id) => next.add(id));
      setSelectedLessonIds(Array.from(next));
      return;
    }
    const visibleIdSet = new Set(selectableVisibleIds);
    setSelectedLessonIds((current) =>
      current.filter((id) => !visibleIdSet.has(id)),
    );
  };

  const setVisibleExtractionSelection = (checked: boolean) => {
    const selectableVisibleIds = visibleExtractionRows
      .filter((row) => row.selectable)
      .map((row) => row.id);
    if (checked) {
      const next = new Set(selectedExtractionIds);
      selectableVisibleIds.forEach((id) => next.add(id));
      setSelectedExtractionIds(Array.from(next));
      return;
    }
    const visibleIdSet = new Set(selectableVisibleIds);
    setSelectedExtractionIds((current) =>
      current.filter((id) => !visibleIdSet.has(id)),
    );
  };

  const handleGenerate = async () => {
    if (!isQuestionCountValid) {
      toast.error('Question count must be between 1 and 15.');
      return;
    }
    if (!hasAnySource) {
      toast.error('No source lessons or extractions are available for this class yet.');
      return;
    }
    if (!useAllSourcesWhenNoneSelected && !hasManualSelection) {
      toast.error('Select at least one lesson or extraction, or enable the fallback option.');
      return;
    }
    if (hasDraftSourceSelection && !draftSourceAcknowledged) {
      toast.error('Acknowledge selected draft sources before generating.');
      return;
    }

    try {
      setActiveTab('generation');
      setSubmitting(true);
      setResult(null);
      const lessonIds =
        selectedLessonIds.length > 0
          ? selectedLessonIds
          : useAllSourcesWhenNoneSelected
            ? undefined
            : [];
      const extractionIds =
        selectedExtractionIds.length > 0
          ? selectedExtractionIds
          : useAllSourcesWhenNoneSelected
            ? undefined
            : [];
      const response = await aiService.createQuizDraftJob({
        classId,
        title: title.trim() || undefined,
        teacherNote: teacherNote.trim() || undefined,
        questionCount: parsedQuestionCount,
        questionType,
        assessmentType: 'quiz',
        passingScore: 60,
        feedbackLevel: 'standard',
        classRecordCategory: 'written_work',
        lessonIds,
        extractionIds,
        sourcePolicy: 'published_default',
        allowDraftSources: hasDraftSourceSelection && draftSourceAcknowledged,
      });
      setCurrentJobId(response.data.jobId);
      setJob(response.data);
      mergeTrackedAiDraftJobFromStatus(classId, response.data, new Date().toISOString());
      syncTrackedJobs();
      toast.success('Quiz draft generation started.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to start AI draft generation'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResumeJob = async (jobIdToLoad: string) => {
    setActiveTab('generation');
    setCurrentJobId(jobIdToLoad);
    const status = await refreshCurrentJob(jobIdToLoad, {
      silent: false,
      loadResult: true,
    });
    if (!status) {
      return;
    }
    if (status.status === 'cancelled') {
      setResult(null);
    }
    if (status.status === 'completed' || status.status === 'approved') {
      setActiveTab('preview');
    }
  };

  const handleReindex = async () => {
    try {
      setReindexing(true);
      const response = await aiService.reindexClass(classId);
      await fetchReadiness();
      if (response.data.degraded) {
        toast.success(
          `Indexed with degraded retrieval (${response.data.chunksIndexed} class chunk(s)).`,
        );
      } else {
        toast.success(
          `Indexed ${response.data.chunksIndexed} class chunk(s) for quiz generation.`,
        );
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to reindex class sources'));
    } finally {
      setReindexing(false);
    }
  };

  const runDeleteDraft = useCallback(async () => {
    const targetJobId = displayJob?.jobId ?? null;
    if (!targetJobId && !assessmentId) {
      toast.error('No draft or AI job is selected to remove.');
      return;
    }

    try {
      setDeleting(true);
      if (assessmentId) {
        await assessmentService.delete(assessmentId);
      }
      if (targetJobId) {
        await aiService.deleteTeacherJob(targetJobId);
      }
      const nextTracked = targetJobId
        ? removeTrackedAiDraftJob(classId, targetJobId)
        : readTrackedAiDraftJobs(classId);
      syncTrackedJobs(nextTracked);
      setResult(null);
      setJob(null);
      const nextJobId = nextTracked[0]?.jobId ?? null;
      setCurrentJobId(nextJobId);
      setActiveTab(nextJobId ? 'generation' : 'sources');
      if (nextJobId) {
        void refreshCurrentJob(nextJobId, { silent: true });
      }
      await fetchReadiness();
      toast.success(assessmentId ? 'Draft deleted.' : 'AI job removed.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to delete the current AI draft'));
    } finally {
      setDeleting(false);
    }
  }, [
    assessmentId,
    classId,
    displayJob?.jobId,
    fetchReadiness,
    refreshCurrentJob,
    syncTrackedJobs,
  ]);

  const handleDeleteDraft = () => {
    const targetJobId = displayJob?.jobId ?? null;
    if (!targetJobId && !assessmentId) {
      toast.error('No draft or AI job is selected to remove.');
      return;
    }

    setDeleteDialog({
      title: assessmentId ? 'Delete AI draft assessment?' : 'Remove AI draft job?',
      description: assessmentId
        ? 'This removes the draft assessment and clears the linked AI job from this workspace.'
        : 'This cancels the selected AI generation job and removes it from this workspace.',
      confirmLabel: assessmentId ? 'Delete draft' : 'Remove job',
      cancelLabel: 'Keep draft',
      tone: 'danger',
      onConfirm: runDeleteDraft,
    });
  };

  const persistQuizDraft = useCallback(
    async (
      nextDraft: QuizDraftStructuredOutput,
      previousDraft: QuizDraftStructuredOutput,
    ) => {
      if (!currentJobId) {
        return;
      }
      try {
        setSavingDraft(true);
        await aiService.updateQuizDraft(currentJobId, {
          structuredOutput: nextDraft,
        });
      } catch (error) {
        setResult(previousDraft);
        toast.error(getApiErrorMessage(error, 'Failed to save quiz draft edits'));
      } finally {
        setSavingDraft(false);
      }
    },
    [currentJobId],
  );

  const updatePreviewDraft = useCallback(
    (updater: (draft: QuizDraftStructuredOutput) => QuizDraftStructuredOutput | null) => {
      setResult((current) => {
        if (!current) {
          return current;
        }
        const nextDraft = updater(current);
        if (!nextDraft) {
          return current;
        }
        void persistQuizDraft(nextDraft, current);
        return nextDraft;
      });
    },
    [persistQuizDraft],
  );

  const handleRemoveQuestion = (questionIndex: number) => {
    updatePreviewDraft((draft) => {
      const nextQuestions = draft.questions.filter((_, index) => index !== questionIndex);
      if (nextQuestions.length === draft.questions.length) {
        return null;
      }
      return {
        ...draft,
        questions: nextQuestions,
      };
    });
  };

  const handleMoveQuestion = (questionIndex: number, direction: -1 | 1) => {
    updatePreviewDraft((draft) => {
      const targetIndex = questionIndex + direction;
      if (targetIndex < 0 || targetIndex >= draft.questions.length) {
        return null;
      }
      const nextQuestions = [...draft.questions];
      const [moved] = nextQuestions.splice(questionIndex, 1);
      nextQuestions.splice(targetIndex, 0, moved);
      return {
        ...draft,
        questions: nextQuestions,
      };
    });
  };

  const handleMarkQuestionReviewed = (questionIndex: number) => {
    updatePreviewDraft((draft) => {
      const questions = draft.questions.map((question, index) =>
        index === questionIndex ? { ...question, reviewed: true } : question,
      );
      return recomputeReviewState({
        ...draft,
        questions,
        reviewIssues: resolveQuestionIssues(
          draft.reviewIssues,
          questionIndex,
          'teacher_reviewed',
        ),
      });
    });
  };

  const handleAcceptWarning = (issueId: string) => {
    updatePreviewDraft((draft) =>
      recomputeReviewState({
        ...draft,
        reviewIssues: (draft.reviewIssues ?? []).map((issue) =>
          issue.id === issueId
            ? { ...issue, resolved: true, resolution: 'teacher_accepted_warning' }
            : issue,
        ),
      }),
    );
  };

  const runApplyDraft = useCallback(async () => {
    if (!currentJobId) {
      toast.error('No quiz draft job is selected to apply.');
      return;
    }
    try {
      setApplyingDraft(true);
      const response = await aiService.applyQuizDraft(currentJobId);
      const applyResult = response.data.applyResult;
      setResult((current) =>
        current
          ? {
              ...current,
              assessmentId: applyResult.assessmentId,
              audit: {
                ...(current.audit ?? {}),
                applyResult,
              },
            }
          : current,
      );
      setJob((current) =>
        current
          ? {
              ...current,
              status: 'approved',
              assessmentId: applyResult.assessmentId,
              progressPercent: 100,
              statusMessage: response.data.alreadyApplied
                ? 'Draft already applied'
                : 'Draft applied',
            }
          : current,
      );
      toast.success(response.data.alreadyApplied ? 'Draft already applied.' : 'Draft applied.');
      setDeleteDialog(null);
      setApplyPreview(response.data.preview ?? null);
      void fetchReadiness({ silent: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to apply quiz draft'));
    } finally {
      setApplyingDraft(false);
    }
  }, [currentJobId, fetchReadiness]);

  const handleApplyPreview = async () => {
    if (!currentJobId) {
      toast.error('No quiz draft job is selected to apply.');
      return;
    }
    if (!canApplyDraft) {
      toast.error(applyBlockedReasons[0] || 'Resolve review issues before applying.');
      return;
    }
    try {
      setApplyingDraft(true);
      const response = await aiService.previewQuizDraftApply(currentJobId);
      setApplyPreview(response.data);
      if (!response.data.canApply) {
        toast.error(response.data.blockedReasons[0] || 'Quiz draft is not ready to apply.');
        return;
      }
      setDeleteDialog({
        title: response.data.alreadyApplied ? 'Draft already applied' : 'Apply quiz draft?',
        description: `${response.data.assessment.title} - ${response.data.assessment.questionCount} question(s), ${response.data.assessment.totalPoints} point(s). This creates an unpublished assessment draft.`,
        confirmLabel: response.data.alreadyApplied ? 'Open applied draft' : 'Apply draft',
        cancelLabel: 'Keep reviewing',
        tone: 'default',
        onConfirm: runApplyDraft,
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to preview quiz draft apply'));
    } finally {
      setApplyingDraft(false);
    }
  };

  const handleRetryDraft = async (jobIdToRetry: string) => {
    try {
      const response = await aiService.retryQuizDraftJob(jobIdToRetry);
      setCurrentJobId(response.data.jobId);
      setJob(response.data);
      setResult(null);
      setActiveTab('generation');
      mergeTrackedAiDraftJobFromStatus(classId, response.data, new Date().toISOString());
      syncTrackedJobs();
      toast.success('Quiz draft retry started.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to retry quiz draft'));
    }
  };

  const handleCancelDraftJob = async (jobIdToCancel: string) => {
    try {
      const response = await aiService.cancelQuizDraftJob(jobIdToCancel);
      setJob(response.data);
      mergeTrackedAiDraftJobFromStatus(classId, response.data);
      syncTrackedJobs();
      toast.success('Quiz draft job cancelled.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to cancel quiz draft job'));
    }
  };

  if (loading) {
    return (
      <div className="teacher-ai-draft">
        <div className="teacher-ai-draft__skeleton">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-ai-draft">
      <header className="teacher-ai-draft__header">
        <div className="teacher-ai-draft__header-main">
          <button
            type="button"
            className="teacher-ai-draft__back"
            onClick={() =>
              router.push(`/dashboard/teacher/classes/${classId}?view=assignments`)
            }
          >
            <ArrowLeft size={16} />
            Back to assignments
          </button>

          <div className="teacher-ai-draft__headline">
            <div className="teacher-ai-draft__headline-icon">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="teacher-ai-draft__eyebrow">AI Draft Quiz Generator</p>
              <h1>Generate a draft quiz from your class sources</h1>
              <p className="teacher-ai-draft__subtitle">
                Select ready lessons or completed extractions, let Nexora prepare the
                draft, then continue directly in the assessment editor.
              </p>
            </div>
          </div>
        </div>

        <div className="teacher-ai-draft__header-actions">
          <div
            className={`teacher-ai-draft__readiness teacher-ai-draft__readiness--${readinessBadge.tone}`}
          >
            <span className="teacher-ai-draft__readiness-label">
              {readinessLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {readinessBadge.label}
            </span>
            <p>{readinessBadge.detail}</p>
          </div>

          <div className="teacher-ai-draft__header-buttons">
            <Button
              type="button"
              className="teacher-class-workspace__outline"
              onClick={() => void handleReindex()}
              disabled={reindexing || deleting || hasRunningJob}
            >
              {reindexing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Reindex Sources
            </Button>
            <Button
              type="button"
              className="teacher-ai-draft__danger"
              onClick={handleDeleteDraft}
              disabled={!canDeleteCurrentDraft || deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete Draft
            </Button>
          </div>
        </div>

        <nav
          className="teacher-ai-draft__tabs"
          role="tablist"
          aria-label="AI draft workflow"
        >
          {WORKFLOW_TABS.map((tab) => {
            const state = getWorkflowTabState(tab.value);
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.value}
                className={`teacher-ai-draft__tab teacher-ai-draft__tab--${state}`}
                onClick={() => setActiveTab(tab.value)}
              >
                <span className="teacher-ai-draft__tab-step">{tab.step}</span>
                <span className="teacher-ai-draft__tab-copy">
                  <strong>{tab.label}</strong>
                  <small>{tab.description}</small>
                </span>
                <span className="teacher-ai-draft__tab-state">
                  {state === 'done' ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                  {getWorkflowTabStatus(tab.value)}
                </span>
              </button>
            );
          })}
        </nav>
      </header>

      <div className="teacher-ai-draft__layout teacher-ai-draft__layout--tabs">
        <section
          className={`teacher-ai-draft__card teacher-ai-draft__card--sources ${activeTab === 'sources' ? 'is-active' : 'is-hidden'}`}
          hidden={activeTab !== 'sources'}
        >
          <div className="teacher-ai-draft__section-head">
            <div>
              <span className="teacher-ai-draft__step">Step 1</span>
              <h2>Choose the class sources</h2>
              <p>
                Green sources are ready now. Amber sources can be indexed during
                generation. Red sources need attention first.
              </p>
            </div>
            <div className="teacher-ai-draft__summary-grid">
              <div className="teacher-ai-draft__summary-tile">
                <strong>{indexStatus?.sourceSummary.lessons.ready ?? 0}</strong>
                <span>Ready lessons</span>
              </div>
              <div className="teacher-ai-draft__summary-tile">
                <strong>
                  {(indexStatus?.sourceSummary.lessons.blocked ?? 0) +
                    (indexStatus?.sourceSummary.extractions.blocked ?? 0)}
                </strong>
                <span>Blocked sources</span>
              </div>
              <div className="teacher-ai-draft__summary-tile">
                <strong>{indexStatus?.chunksIndexed ?? 0}</strong>
                <span>Indexed chunks</span>
              </div>
              <div className="teacher-ai-draft__summary-tile">
                <strong>{indexStatus?.questionChunks ?? 0}</strong>
                <span>Question chunks</span>
              </div>
            </div>
          </div>

          {indexStatus?.reason ? (
            <div className="teacher-ai-draft__notice">
              <AlertTriangle className="h-4 w-4" />
              <div>
                <strong>What needs attention</strong>
                <p>{indexStatus.reason}</p>
              </div>
            </div>
          ) : (
            <div className="teacher-ai-draft__notice teacher-ai-draft__notice--quiet">
              <CheckCircle2 className="h-4 w-4" />
              <div>
                <strong>Source status looks good</strong>
                <p>
                  Last indexed {toRelativeTime(indexStatus?.lastIndexedAt)}. Latest source
                  update {toRelativeTime(indexStatus?.latestSourceUpdateAt)}.
                </p>
              </div>
            </div>
          )}

          <div className="teacher-ai-draft__source-columns">
            <article className="teacher-ai-draft__source-panel">
              <div className="teacher-ai-draft__source-head">
                <div>
                  <h3>Lessons</h3>
                  <p>
                    {indexStatus?.sourceSummary.lessons.total ?? lessons.length} lesson(s) in
                    this class
                  </p>
                </div>
                <Badge variant="outline">
                  {selectedLessonIds.length} selected
                </Badge>
              </div>

              <div className="teacher-ai-draft__search-row">
                <Search size={14} />
                <Input
                  value={lessonSearch}
                  onChange={(event) => setLessonSearch(event.target.value)}
                  placeholder="Search lesson title or blocker reason"
                />
              </div>

              <div className="teacher-ai-draft__mini-actions">
                <Button
                  type="button"
                  className="teacher-class-workspace__outline"
                  onClick={() => setVisibleLessonSelection(true)}
                >
                  Select visible
                </Button>
                <Button
                  type="button"
                  className="teacher-class-workspace__outline"
                  onClick={() => setVisibleLessonSelection(false)}
                >
                  Clear visible
                </Button>
              </div>

              <div className="teacher-ai-draft__list">
                {visibleLessonRows.length === 0 ? (
                  <p className="teacher-ai-draft__empty">
                    No lessons match the current filter.
                  </p>
                ) : (
                  visibleLessonRows.map((lessonRow) => (
                    <label
                      key={lessonRow.id}
                      className={`teacher-ai-draft__source-item teacher-ai-draft__source-item--${lessonRow.tone}`}
                    >
                      <input
                        type="checkbox"
                        checked={lessonRow.selected}
                        disabled={!lessonRow.selectable}
                        onChange={() =>
                          toggleSelection(
                            lessonRow.id,
                            selectedLessonIds,
                            setSelectedLessonIds,
                          )
                        }
                      />
                      <div className="teacher-ai-draft__source-copy">
                        <div className="teacher-ai-draft__source-title-row">
                          <strong>{lessonRow.title}</strong>
                          <span>{lessonRow.tone === 'ready' ? 'Indexed' : lessonRow.tone === 'index' ? 'Needs index' : 'Blocked'}</span>
                        </div>
                        <p>{lessonRow.stateLabel}</p>
                        <small>Updated {toRelativeTime(lessonRow.updatedAt)}</small>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </article>

            <article className="teacher-ai-draft__source-panel">
              <div className="teacher-ai-draft__source-head">
                <div>
                  <h3>Extractions</h3>
                  <p>
                    {indexStatus?.sourceSummary.extractions.total ?? extractions.length}{' '}
                    extraction(s) in this class
                  </p>
                </div>
                <Badge variant="outline">
                  {selectedExtractionIds.length} selected
                </Badge>
              </div>

              <div className="teacher-ai-draft__search-row">
                <Search size={14} />
                <Input
                  value={extractionSearch}
                  onChange={(event) => setExtractionSearch(event.target.value)}
                  placeholder="Search extraction title or blocker reason"
                />
              </div>

              <div className="teacher-ai-draft__mini-actions">
                <Button
                  type="button"
                  className="teacher-class-workspace__outline"
                  onClick={() => setVisibleExtractionSelection(true)}
                >
                  Select visible
                </Button>
                <Button
                  type="button"
                  className="teacher-class-workspace__outline"
                  onClick={() => setVisibleExtractionSelection(false)}
                >
                  Clear visible
                </Button>
              </div>

              <div className="teacher-ai-draft__list">
                {visibleExtractionRows.length === 0 ? (
                  <p className="teacher-ai-draft__empty">
                    No extractions match the current filter.
                  </p>
                ) : (
                  visibleExtractionRows.map((extractionRow) => (
                    <label
                      key={extractionRow.id}
                      className={`teacher-ai-draft__source-item teacher-ai-draft__source-item--${extractionRow.tone}`}
                    >
                      <input
                        type="checkbox"
                        checked={extractionRow.selected}
                        disabled={!extractionRow.selectable}
                        onChange={() =>
                          toggleSelection(
                            extractionRow.id,
                            selectedExtractionIds,
                            setSelectedExtractionIds,
                          )
                        }
                      />
                      <div className="teacher-ai-draft__source-copy">
                        <div className="teacher-ai-draft__source-title-row">
                          <strong>{extractionRow.title}</strong>
                          <span>{extractionRow.tone === 'ready' ? 'Indexed' : extractionRow.tone === 'index' ? 'Needs index' : 'Blocked'}</span>
                        </div>
                        <p>{extractionRow.stateLabel}</p>
                        <small>Updated {toRelativeTime(extractionRow.updatedAt)}</small>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </article>
          </div>

          <div className="teacher-ai-draft__step-actions">
            <Button
              type="button"
              className="teacher-class-workspace__outline"
              onClick={() =>
                router.push(`/dashboard/teacher/classes/${classId}?view=assignments`)
              }
            >
              Open Assignments Tracker
            </Button>
            <Button
              type="button"
              className="teacher-class-workspace__solid"
              onClick={() => setActiveTab('setup')}
              disabled={!sourceStepComplete}
            >
              Continue to quiz setup
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>

        <div
          className={`teacher-ai-draft__sidebar ${activeTab === 'setup' || activeTab === 'generation' ? 'is-active' : 'is-hidden'}`}
          hidden={activeTab !== 'setup' && activeTab !== 'generation'}
        >
          <section
            className={`teacher-ai-draft__card ${activeTab === 'setup' ? 'is-active' : 'is-hidden'}`}
            hidden={activeTab !== 'setup'}
          >
            <div className="teacher-ai-draft__section-head">
              <div>
                <span className="teacher-ai-draft__step">Step 2</span>
                <h2>Set up the quiz draft</h2>
                <p>Define the quiz shape before the AI starts writing questions.</p>
              </div>
            </div>

            <div className="teacher-ai-draft__form-grid">
              <label className="teacher-ai-draft__field teacher-ai-draft__field--full">
                <span>Draft title</span>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Optional title for this draft"
                />
              </label>

              <label className="teacher-ai-draft__field">
                <span>Question count</span>
                <Input
                  value={questionCount}
                  onChange={(event) => {
                    const raw = event.target.value.replace(/[^\d]/g, '');
                    if (!raw) {
                      setQuestionCount('');
                      return;
                    }
                    setQuestionCount(String(Math.min(15, Math.max(1, Number(raw)))));
                  }}
                  inputMode="numeric"
                />
                <small>1-15 questions</small>
              </label>

              <label className="teacher-ai-draft__field">
                <span>Question type</span>
                <select
                  value={questionType}
                  onChange={(event) => setQuestionType(event.target.value as QuestionType)}
                  className="teacher-ai-draft__select"
                >
                  {QUESTION_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="teacher-ai-draft__field teacher-ai-draft__field--full">
                <span>Teacher note</span>
                <Textarea
                  value={teacherNote}
                  onChange={(event) => setTeacherNote(event.target.value)}
                  placeholder="Focus on specific lessons, difficulty, misconceptions, or grading reminders"
                  rows={4}
                />
              </label>
            </div>

            <label className="teacher-ai-draft__checkbox">
              <input
                type="checkbox"
                checked={useAllSourcesWhenNoneSelected}
                onChange={(event) => setUseAllSourcesWhenNoneSelected(event.target.checked)}
              />
              <span>Use every ready class source when nothing is selected manually</span>
            </label>

            {hasDraftSourceSelection ? (
              <label className="teacher-ai-draft__checkbox teacher-ai-draft__checkbox--warning">
                <input
                  type="checkbox"
                  checked={draftSourceAcknowledged}
                  onChange={(event) => setDraftSourceAcknowledged(event.target.checked)}
                />
                <span>
                  I understand {selectedDraftSourceCount} selected draft source(s) may be less final than published material.
                </span>
              </label>
            ) : null}

            <div className="teacher-ai-draft__selection-summary">
              <Badge variant="secondary">{selectedLessonIds.length} lesson(s)</Badge>
              <Badge variant="outline">
                {selectedExtractionIds.length} extraction(s)
              </Badge>
              <Badge variant="outline">
                {parsedQuestionCount || 0} question target
              </Badge>
            </div>

            {!canGenerate ? (
              <p className="teacher-ai-draft__hint">
                {hasRunningJob
                  ? 'Wait for the current AI generation to finish before starting another draft.'
                  : readinessUnavailable
                    ? 'AI source readiness is temporarily unavailable. Refresh the page or run reindex when the AI service is ready.'
                  : hasAnySource
                    ? hasDraftSourceSelection && !draftSourceAcknowledged
                      ? 'Acknowledge selected draft sources before generating.'
                      : generationReady
                        ? 'Choose at least one valid source or keep the fallback option enabled. Question count must be valid.'
                        : 'Finish source indexing before generating. Reindex the class once the selected materials are ready.'
                    : 'No source lessons or extractions are available for this class yet.'}
              </p>
            ) : null}

            <div className="teacher-ai-draft__actions">
              <Button
                type="button"
                className="teacher-class-workspace__outline"
                onClick={() => setActiveTab('sources')}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sources
              </Button>
              <Button
                type="button"
                className="teacher-class-workspace__solid"
                onClick={() => void handleGenerate()}
                disabled={!canGenerate}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
                {displayJob ? 'Generate another draft' : 'Generate draft'}
              </Button>
              <Button
                type="button"
                className="teacher-class-workspace__outline"
                onClick={() =>
                  router.push(`/dashboard/teacher/classes/${classId}?view=assignments`)
                }
              >
                Open Assignments Tracker
              </Button>
            </div>
          </section>

          <section
            className={`teacher-ai-draft__card ${activeTab === 'generation' ? 'is-active' : 'is-hidden'}`}
            hidden={activeTab !== 'generation'}
          >
            <div className="teacher-ai-draft__section-head">
              <div>
                <span className="teacher-ai-draft__step">Step 3</span>
                <h2>Track generation progress</h2>
                <p>Watch the AI stages, reopen previous runs, or jump into the editor.</p>
              </div>
            </div>

            <div className="teacher-ai-draft__job-panel">
              <div className="teacher-ai-draft__job-head">
                <div>
                  <strong>
                    {displayJob?.statusMessage ||
                      'Ready to start a new AI draft run'}
                  </strong>
                  <p>
                    Last update {toRelativeTime(displayJob?.updatedAt)} -{' '}
                    {formatDateTime(displayJob?.updatedAt)}
                  </p>
                </div>
                <Badge variant={getJobBadgeVariant(displayJob?.status)}>
                  {displayJob?.status || 'idle'}
                </Badge>
              </div>
              <Progress value={displayJob?.progressPercent ?? 0} />
              {displayJob?.errorMessage ? (
                <div className="teacher-ai-draft__job-error">
                  <XCircle className="h-4 w-4" />
                  <p>{getQuizJobErrorMessage(displayJob.errorMessage)}</p>
                </div>
              ) : null}

              <div className="teacher-ai-draft__job-actions">
                {assessmentId ? (
                  <Button
                    type="button"
                    className="teacher-class-workspace__outline"
                    onClick={() =>
                      router.push(`/dashboard/teacher/assessments/${assessmentId}/edit`)
                    }
                  >
                    <FileText className="h-4 w-4" />
                    Open Assessment Editor
                  </Button>
                ) : null}
                {displayJob?.jobId ? (
                  <Button
                    type="button"
                    className="teacher-class-workspace__outline"
                    onClick={() => void handleResumeJob(displayJob.jobId)}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh this job
                  </Button>
                ) : null}
                {displayJob?.jobId && displayJob.status === 'failed' ? (
                  <Button
                    type="button"
                    className="teacher-class-workspace__outline"
                    onClick={() => void handleRetryDraft(displayJob.jobId)}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </Button>
                ) : null}
                {displayJob?.jobId && !isAiDraftTerminalStatus(displayJob.status) ? (
                  <Button
                    type="button"
                    className="teacher-ai-draft__danger"
                    onClick={() => void handleCancelDraftJob(displayJob.jobId)}
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="teacher-ai-draft__recent">
              <div className="teacher-ai-draft__recent-head">
                <h3>Recent runs</h3>
                <span>{recentTrackedJobs.length} saved locally</span>
              </div>

              {recentTrackedJobs.length === 0 ? (
                <p className="teacher-ai-draft__empty">
                  No AI draft runs are tracked yet.
                </p>
              ) : (
                <div className="teacher-ai-draft__recent-list">
                  {recentTrackedJobs.map((entry) => (
                    <article
                      key={entry.jobId}
                      className={`teacher-ai-draft__recent-item${entry.jobId === currentJobId ? ' is-current' : ''}`}
                    >
                      <div className="teacher-ai-draft__recent-item-head">
                        <div>
                          <strong>{entry.jobId}</strong>
                          <p>
                            {Math.round(entry.lastKnownProgress)}% - Updated{' '}
                            {toRelativeTime(entry.updatedAt || entry.createdAt)}
                          </p>
                        </div>
                        <Badge variant={getJobBadgeVariant(entry.lastKnownStatus)}>
                          {entry.lastKnownStatus}
                        </Badge>
                      </div>
                      <div className="teacher-ai-draft__mini-actions">
                        <Button
                          type="button"
                          className="teacher-class-workspace__outline"
                          onClick={() => void handleResumeJob(entry.jobId)}
                        >
                          Resume
                        </Button>
                        {entry.assessmentId ? (
                          <Button
                            type="button"
                            className="teacher-class-workspace__outline"
                            onClick={() =>
                              router.push(
                                `/dashboard/teacher/assessments/${entry.assessmentId}/edit`,
                              )
                            }
                          >
                            Open editor
                          </Button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="teacher-ai-draft__step-actions">
              <Button
                type="button"
                className="teacher-class-workspace__outline"
                onClick={() => setActiveTab('setup')}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to setup
              </Button>
              <Button
                type="button"
                className="teacher-class-workspace__solid"
                onClick={() => setActiveTab('preview')}
                disabled={!result}
              >
                Review draft preview
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </section>
        </div>

        <section
          className={`teacher-ai-draft__card teacher-ai-draft__card--preview ${activeTab === 'preview' ? 'is-active' : 'is-hidden'}`}
          hidden={activeTab !== 'preview'}
        >
          <div className="teacher-ai-draft__section-head">
            <div>
              <h2>Draft preview</h2>
              <p>
                Review the generated draft before opening the full assessment editor.
              </p>
            </div>
            <Badge variant="secondary">
              {result?.questions?.length ?? 0} question(s)
            </Badge>
          </div>

          {result ? (
            <div className="teacher-ai-draft__preview-body">
              <div className="teacher-ai-draft__preview-copy">
                <h3>{result.title}</h3>
                <RichTextRenderer
                  html={result.description || '<p>No description provided.</p>'}
                />
              </div>

              <div className="teacher-ai-draft__selection-summary">
                {selectedLessons.map((lesson) => (
                  <Badge key={lesson.id} variant="secondary">
                    {lesson.title}
                  </Badge>
                ))}
                {selectedExtractions.map((extraction) => (
                  <Badge key={extraction.id} variant="outline">
                    {extraction.originalName || extraction.id}
                  </Badge>
                ))}
              </div>

              <div className="teacher-ai-draft__preview-toolbar">
                <p>
                  Resolve review issues, remove weak questions, then apply the reviewed draft
                  to create an unpublished assessment.
                </p>
                <Badge variant={savingDraft ? 'outline' : 'secondary'}>
                  {savingDraft
                    ? 'Saving draft...'
                    : result.reviewRequired
                      ? 'Review required'
                      : result.qualityGate === 'fail'
                        ? 'Quality failed'
                        : 'Ready for teacher review'}
                </Badge>
              </div>

              {reviewIssues.length > 0 || applyBlockedReasons.length > 0 ? (
                <div className="teacher-ai-draft__review-queue">
                  <div className="teacher-ai-draft__review-head">
                    <div>
                      <strong>Review queue</strong>
                      <p>
                        {unresolvedBlockingIssues.length} blocking,{' '}
                        {unresolvedWarningIssues.length} warning issue(s)
                      </p>
                    </div>
                    <Badge variant={result.qualityGate === 'fail' ? 'destructive' : 'outline'}>
                      {result.qualityGate || 'unchecked'}
                    </Badge>
                  </div>
                  {applyBlockedReasons.length > 0 ? (
                    <ul className="teacher-ai-draft__blocked-list">
                      {applyBlockedReasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="teacher-ai-draft__issue-list">
                    {reviewIssues.map((issue) => (
                      <article
                        key={issue.id}
                        className={`teacher-ai-draft__issue teacher-ai-draft__issue--${issue.severity}`}
                      >
                        <div>
                          <strong>{issue.code.replace(/_/g, ' ')}</strong>
                          <p>{issue.message}</p>
                        </div>
                        <div className="teacher-ai-draft__issue-actions">
                          {typeof issue.questionIndex === 'number' ? (
                            <Button
                              type="button"
                              className="teacher-class-workspace__outline"
                              onClick={() =>
                                document
                                  .getElementById(`quiz-question-${issue.questionIndex}`)
                                  ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                              }
                            >
                              Jump
                            </Button>
                          ) : null}
                          {issue.severity === 'warning' && !issue.resolved ? (
                            <Button
                              type="button"
                              className="teacher-class-workspace__outline"
                              onClick={() => handleAcceptWarning(issue.id)}
                            >
                              Accept warning
                            </Button>
                          ) : null}
                          {issue.resolved ? <Badge variant="secondary">Resolved</Badge> : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}

              {applyPreview ? (
                <div className="teacher-ai-draft__apply-preview">
                  <strong>Apply preview</strong>
                  <p>
                    {applyPreview.assessment.title} - {applyPreview.assessment.questionCount}{' '}
                    question(s), {applyPreview.assessment.totalPoints} point(s)
                  </p>
                </div>
              ) : null}

              <div className="teacher-ai-draft__question-list">
                {result.questions.map((question, index) => (
                  <article
                    key={`${question.content}-${index}`}
                    id={`quiz-question-${index}`}
                    className="teacher-ai-draft__question"
                  >
                    <div className="teacher-ai-draft__question-head">
                      <div>
                        <span>Question {index + 1}</span>
                        <Badge variant="outline">{question.type}</Badge>
                      </div>
                      <div className="teacher-ai-draft__question-actions">
                        <Button
                          type="button"
                          className="teacher-class-workspace__outline"
                          onClick={() => handleMoveQuestion(index, -1)}
                          disabled={savingDraft || index === 0}
                          aria-label={`Move question ${index + 1} up`}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          className="teacher-class-workspace__outline"
                          onClick={() => handleMoveQuestion(index, 1)}
                          disabled={savingDraft || index === result.questions.length - 1}
                          aria-label={`Move question ${index + 1} down`}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          className="teacher-ai-draft__danger teacher-ai-draft__danger--question"
                          onClick={() => handleRemoveQuestion(index)}
                          disabled={savingDraft || result.questions.length <= 1}
                          aria-label={`Remove question ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          className="teacher-class-workspace__outline"
                          onClick={() => handleMarkQuestionReviewed(index)}
                          disabled={savingDraft}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Reviewed
                        </Button>
                      </div>
                    </div>
                    <RichTextRenderer
                      html={question.content || '<p>Untitled question</p>'}
                    />
                    {question.provenance?.sourceSnippet ? (
                      <div className="teacher-ai-draft__provenance">
                        <strong>{question.provenance.sourceTitle || 'Source'}</strong>
                        <p>{question.provenance.sourceSnippet}</p>
                      </div>
                    ) : null}
                    {question.options && question.options.length > 0 ? (
                      <ul>
                        {question.options.map((option, optionIndex) => (
                          <li key={`${option.text}-${optionIndex}`}>
                            {option.isCorrect ? 'Correct' : 'Option'}: {option.text}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="teacher-ai-draft__empty-state">
              <Clock3 className="h-6 w-6" />
              <div>
                <strong>No draft preview yet</strong>
                <p>
                  Start generation to see the draft preview here. Completed runs can
                  be resumed from the recent list.
                </p>
              </div>
            </div>
          )}

          <div className="teacher-ai-draft__step-actions">
            <Button
              type="button"
              className="teacher-class-workspace__outline"
              onClick={() => setActiveTab('generation')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to generation
            </Button>
            {assessmentId ? (
              <Button
                type="button"
                className="teacher-class-workspace__solid"
                onClick={() =>
                  router.push(`/dashboard/teacher/assessments/${assessmentId}/edit`)
                }
              >
                <FileText className="h-4 w-4" />
                Open Assessment Editor
              </Button>
            ) : null}
            {!assessmentId && result ? (
              <Button
                type="button"
                className="teacher-class-workspace__solid"
                onClick={() => void handleApplyPreview()}
                disabled={!canApplyDraft}
              >
                {applyingDraft ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Apply reviewed draft
              </Button>
            ) : null}
          </div>
        </section>
      </div>
      <ConfirmationDialog
        config={deleteDialog}
        onClose={() => setDeleteDialog(null)}
      />
    </div>
  );
}
