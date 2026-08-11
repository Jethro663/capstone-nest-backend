'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  CircleHelp,
  ClipboardCheck,
  Loader2,
  Trash2,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { aiService } from '@/services/ai-service';
import { assessmentService } from '@/services/assessment-service';
import { lessonService } from '@/services/lesson-service';
import { lxpService } from '@/services/lxp-service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/lib/api-error';
import { richTextToPlainText } from '@/lib/rich-text';
import type { AiGenerationJob, ClassAiPolicy, InterventionStructuredOutput } from '@/types/ai';
import type { Assessment } from '@/types/assessment';
import type { Lesson } from '@/types/lesson';
import type { TeacherInterventionQueueItem } from '@/types/lxp';

function studentName(entry: TeacherInterventionQueueItem['student']): string {
  const first = entry?.firstName?.trim() ?? '';
  const last = entry?.lastName?.trim() ?? '';
  if (first && last) return `${last}, ${first}`;
  if (last) return last;
  if (first) return first;
  return entry?.email ?? 'Unknown student';
}

function toPlainTeacherText(value: string | null | undefined, fallback = ''): string {
  const cleaned = richTextToPlainText(value ?? '').replace(/\s+/g, ' ').trim();
  return cleaned || fallback;
}

const JOB_STATUS_FAILURE_THRESHOLD = 3;

type SuggestedAssignmentPayload = InterventionStructuredOutput['suggestedAssignmentPayload'];
type WorkspaceTab = 'plan' | 'generating' | 'assign';
type HelpManualScreen = 'plan' | 'generating' | 'assign' | 'progress';

const helpManualPages: Array<{
  title: string;
  description: string;
  screen: HelpManualScreen;
  steps: string[];
}> = [
  {
    title: 'Start in Plan Creator',
    description:
      'Use this first page to tell the system what kind of help the student needs before you generate or build a path.',
    screen: 'plan',
    steps: [
      'Write a short teacher note if you want the plan to follow a specific concern.',
      'Check the class AI policy if the student should only use class materials or stricter AI rules.',
      'Use the manual selector when you already know a lesson or assessment that should be included.',
      'Press Generate plan when you are ready for the system to draft the intervention path.',
    ],
  },
  {
    title: 'Watch the Generating tab',
    description:
      'This page shows whether the AI plan is still working, finished, or needs you to retry loading the result.',
    screen: 'generating',
    steps: [
      'The progress bar and percent tell you how far the system has gone.',
      'Read the status message before leaving the page; it explains what is happening now.',
      'If the result is complete but not shown, use Retry loading result.',
      'When a result is available, use Review generated plan to move to the final check.',
    ],
  },
  {
    title: 'Clean Out & Assign',
    description:
      'This is the teacher review page. Do not assign until the lessons, assessments, XP, and summary all make sense.',
    screen: 'assign',
    steps: [
      'Review weak concepts so you know why the student is receiving the path.',
      'Remove a lesson or assessment if it does not fit the student.',
      'Adjust XP only when the activity should count more or less.',
      'Use Assign suggested path, or Replace current path, only after checking the whole page.',
    ],
  },
  {
    title: 'Understand replacement protection',
    description:
      'The system protects students from losing work. A new plan can replace an old path only when progress has not started.',
    screen: 'progress',
    steps: [
      'If a student already has an unstarted path, the system warns you before generating another plan.',
      'Generating a plan does not replace the student path immediately.',
      'Replacement happens only when you assign the new plan.',
      'If the student has already started progress, the assign button is blocked so their progress is not reset.',
    ],
  },
];

function HelpManualScreenshot({ screen }: { screen: HelpManualScreen }) {
  return (
    <div
      className={`teacher-intervention-workspace__manual-shot is-${screen}`}
      aria-label={`${screen} workflow example screenshot`}
    >
      <div className="teacher-intervention-workspace__manual-window">
        <span />
        <span />
        <span />
      </div>

      {screen === 'plan' ? (
        <>
          <div className="teacher-intervention-workspace__manual-tabs" aria-hidden="true">
            <b>1 Plan Creator</b>
            <span>2 Generating</span>
            <span>3 Clean Out</span>
          </div>
          <div className="teacher-intervention-workspace__manual-grid-shot">
            <div className="teacher-intervention-workspace__manual-panel-shot">
              <small>Teacher note</small>
              <div className="teacher-intervention-workspace__manual-textarea-shot" />
              <span className="teacher-intervention-workspace__manual-button-shot">Generate plan</span>
              <em className="teacher-intervention-workspace__manual-pin is-generate">Generate plan</em>
            </div>
            <div className="teacher-intervention-workspace__manual-panel-shot">
              <small>Class AI policy</small>
              <div className="teacher-intervention-workspace__manual-toggle-shot" />
              <div className="teacher-intervention-workspace__manual-toggle-shot" />
              <small>Manual selector</small>
              <div className="teacher-intervention-workspace__manual-select-shot">
                <span>Select lesson...</span>
                <b>Add</b>
              </div>
              <em className="teacher-intervention-workspace__manual-pin is-add">Add selected item</em>
            </div>
          </div>
        </>
      ) : null}

      {screen === 'generating' ? (
        <>
          <div className="teacher-intervention-workspace__manual-heading-shot">
            <b>Generating</b>
            <span>completed</span>
          </div>
          <div className="teacher-intervention-workspace__manual-progress-shot">
            <i style={{ width: '72%' }} />
          </div>
          <div className="teacher-intervention-workspace__manual-status-shot">
            <strong>72%</strong>
            <span>Building lesson and assessment recommendations...</span>
          </div>
          <span className="teacher-intervention-workspace__manual-action-shot">
            Retry loading result
          </span>
          <span className="teacher-intervention-workspace__manual-action-shot is-primary">
            Review generated plan
          </span>
          <em className="teacher-intervention-workspace__manual-pin is-progress">Progress and status</em>
          <em className="teacher-intervention-workspace__manual-pin is-retry">Retry button</em>
        </>
      ) : null}

      {screen === 'assign' ? (
        <>
          <div className="teacher-intervention-workspace__manual-heading-shot">
            <b>Clean Out & Assign</b>
            <span className="teacher-intervention-workspace__manual-button-shot">Assign suggested path</span>
          </div>
          <div className="teacher-intervention-workspace__manual-review-shot">
            <section>
              <small>Weak concepts</small>
              <span>Fractions</span>
              <span>Word problems</span>
            </section>
            <section>
              <small>Recommended lessons</small>
              <div>
                <b>Lesson title</b>
                <i>XP 20</i>
                <mark>Remove</mark>
              </div>
            </section>
            <section>
              <small>Teacher-facing summary</small>
              <p />
              <p />
            </section>
          </div>
          <em className="teacher-intervention-workspace__manual-pin is-assign">Assign or replace</em>
          <em className="teacher-intervention-workspace__manual-pin is-remove">Remove item</em>
        </>
      ) : null}

      {screen === 'progress' ? (
        <>
          <div className="teacher-intervention-workspace__manual-notice-shot">
            This case already has assigned checkpoints.
          </div>
          <div className="teacher-intervention-workspace__manual-dialog-shot">
            <b>Generate a new intervention plan?</b>
            <p />
            <div>
              <span className="teacher-intervention-workspace__manual-button-shot">Keep current path</span>
              <span className="teacher-intervention-workspace__manual-button-shot">Generate new AI plan</span>
            </div>
          </div>
          <div className="teacher-intervention-workspace__manual-blocked-shot">
            Progress already started
          </div>
          <em className="teacher-intervention-workspace__manual-pin is-warning">Warning first</em>
          <em className="teacher-intervention-workspace__manual-pin is-blocked">Blocked when started</em>
        </>
      ) : null}
    </div>
  );
}

function normalizeSuggestedAssignmentPayload(
  payload: unknown,
  lessonIds: string[],
  assessmentIds: string[],
): SuggestedAssignmentPayload {
  const payloadObject =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>)
      : {};

  const safeLessonIds = Array.isArray(payloadObject.lessonIds)
    ? payloadObject.lessonIds.filter((id): id is string => typeof id === 'string')
    : lessonIds;
  const safeAssessmentIds = Array.isArray(payloadObject.assessmentIds)
    ? payloadObject.assessmentIds.filter((id): id is string => typeof id === 'string')
    : assessmentIds;

  return {
    lessonIds: Array.from(new Set(safeLessonIds)),
    assessmentIds: Array.from(new Set(safeAssessmentIds)),
    lessonAssignments: Array.isArray(payloadObject.lessonAssignments)
      ? (payloadObject.lessonAssignments as SuggestedAssignmentPayload['lessonAssignments'])
      : undefined,
    assessmentAssignments: Array.isArray(payloadObject.assessmentAssignments)
      ? (payloadObject.assessmentAssignments as SuggestedAssignmentPayload['assessmentAssignments'])
      : undefined,
    note:
      typeof payloadObject.note === 'string'
        ? payloadObject.note
        : undefined,
  };
}

function normalizeStringList(payload: unknown): string[] {
  return Array.isArray(payload)
    ? payload.filter((value): value is string => typeof value === 'string')
    : [];
}

function normalizeAiSummary(
  payload: unknown,
): InterventionStructuredOutput['aiSummary'] {
  const payloadObject =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>)
      : {};

  return {
    summary:
      typeof payloadObject.summary === 'string'
        ? payloadObject.summary
        : 'AI intervention result loaded with degraded fields. Review and adjust before assigning.',
    teacherActions: normalizeStringList(payloadObject.teacherActions),
    studentFocus: normalizeStringList(payloadObject.studentFocus),
  };
}

function normalizeStructuredOutput(
  payload: InterventionStructuredOutput,
): InterventionStructuredOutput {
  const recommendedLessons = Array.isArray(payload?.recommendedLessons)
    ? payload.recommendedLessons
    : [];
  const recommendedAssessments = Array.isArray(payload?.recommendedAssessments)
    ? payload.recommendedAssessments
    : [];

  return {
    ...payload,
    weakConcepts: normalizeStringList(payload?.weakConcepts),
    recommendedLessons,
    recommendedAssessments,
    aiSummary: normalizeAiSummary(payload?.aiSummary),
    suggestedAssignmentPayload: normalizeSuggestedAssignmentPayload(
      payload?.suggestedAssignmentPayload,
      recommendedLessons.map((lesson) => lesson.lessonId),
      recommendedAssessments.map((assessment) => assessment.assessmentId),
    ),
    generatedLessonDraft:
      payload?.generatedLessonDraft &&
      typeof payload.generatedLessonDraft === 'object'
        ? {
            ...payload.generatedLessonDraft,
            weakConcepts: normalizeStringList(payload.generatedLessonDraft.weakConcepts),
            sourceLessonIds: normalizeStringList(payload.generatedLessonDraft.sourceLessonIds),
            sourceReferences: Array.isArray(payload.generatedLessonDraft.sourceReferences)
              ? payload.generatedLessonDraft.sourceReferences
              : [],
          }
        : undefined,
    generatedGuidedAssessmentDraft:
      payload?.generatedGuidedAssessmentDraft &&
      typeof payload.generatedGuidedAssessmentDraft === 'object'
        ? {
            ...payload.generatedGuidedAssessmentDraft,
            weakConcepts: normalizeStringList(payload.generatedGuidedAssessmentDraft.weakConcepts),
            sourceReferences: Array.isArray(payload.generatedGuidedAssessmentDraft.sourceReferences)
              ? payload.generatedGuidedAssessmentDraft.sourceReferences
              : [],
            questions: Array.isArray(payload.generatedGuidedAssessmentDraft.questions)
              ? payload.generatedGuidedAssessmentDraft.questions
              : [],
          }
        : undefined,
  };
}

function createManualStructuredOutput(caseId: string): InterventionStructuredOutput {
  return {
    caseId,
    weakConcepts: [],
    recommendedLessons: [],
    recommendedAssessments: [],
    aiSummary: {
      summary:
        'Manual intervention selection mode. You can assign class-scoped lessons and assessments without an AI-generated plan.',
      teacherActions: ['Select intervention checkpoints manually.'],
      studentFocus: [],
    },
    suggestedAssignmentPayload: {
      lessonIds: [],
      assessmentIds: [],
    },
  };
}

export default function TeacherInterventionWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseId = params.caseId as string;
  const classId = searchParams.get('classId') ?? '';

  const [loading, setLoading] = useState(true);
  const [creatingJob, setCreatingJob] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [job, setJob] = useState<AiGenerationJob | null>(null);
  const [queueEntry, setQueueEntry] = useState<TeacherInterventionQueueItem | null>(null);
  const [note, setNote] = useState('');
  const [result, setResult] = useState<InterventionStructuredOutput | null>(null);
  const [lessonXp, setLessonXp] = useState<Record<string, number>>({});
  const [assessmentXp, setAssessmentXp] = useState<Record<string, number>>({});
  const [statusWarning, setStatusWarning] = useState<string | null>(null);
  const [loadingResult, setLoadingResult] = useState(false);
  const [classPolicy, setClassPolicy] = useState<ClassAiPolicy | null>(null);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policySaving, setPolicySaving] = useState(false);
  const [manualLessons, setManualLessons] = useState<Lesson[]>([]);
  const [manualAssessments, setManualAssessments] = useState<Assessment[]>([]);
  const [loadingManualSources, setLoadingManualSources] = useState(false);
  const [selectedManualLessonId, setSelectedManualLessonId] = useState('');
  const [selectedManualAssessmentId, setSelectedManualAssessmentId] = useState('');
  const [replacePlanWarningOpen, setReplacePlanWarningOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpPage, setHelpPage] = useState(0);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('plan');
  const [approvedGeneratedContent, setApprovedGeneratedContent] = useState<{
    generatedLessonApproved: boolean;
    guidedAssessmentApproved: boolean;
  } | null>(null);
  const [artifactActionLoading, setArtifactActionLoading] = useState(false);
  const statusFailuresRef = useRef(0);
  const fetchedJobResultIdRef = useRef<string | null>(null);
  const activeClassId = classId || queueEntry?.classId || '';
  const interventionsRoute = useMemo(() => {
    return activeClassId
      ? `/dashboard/teacher/interventions?classId=${activeClassId}`
      : '/dashboard/teacher/interventions';
  }, [activeClassId]);

  const fetchCase = useCallback(async () => {
    try {
      setLoading(true);
      if (classId) {
        const queueRes = await lxpService.getTeacherQueue(classId);
        const queueEntry = queueRes.data.queue.find((entry) => entry.id === caseId);
        if (queueEntry) {
          setQueueEntry(queueEntry);
        } else {
          const caseRes = await lxpService.getTeacherCase(caseId);
          setQueueEntry(caseRes.data ?? null);
        }
      } else {
        const caseRes = await lxpService.getTeacherCase(caseId);
        setQueueEntry(caseRes.data ?? null);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load intervention workspace'));
    } finally {
      setLoading(false);
    }
  }, [caseId, classId]);

  useEffect(() => {
    void fetchCase();
  }, [fetchCase]);

  const loadInterventionJobResult = useCallback(async (jobId: string): Promise<boolean> => {
    try {
      setLoadingResult(true);
      fetchedJobResultIdRef.current = jobId;
      const resultRes = await aiService.getInterventionJobResult(jobId);
      const rawStructured = resultRes?.data?.result?.structuredOutput;
      const structured = normalizeStructuredOutput(rawStructured ?? ({} as InterventionStructuredOutput));
      setResult(structured);
      setApprovedGeneratedContent(null);
      setStatusWarning(null);
      setLessonXp(
        Object.fromEntries((structured.recommendedLessons ?? []).map((lesson) => [lesson.lessonId, 20])),
      );
      setAssessmentXp(
        Object.fromEntries((structured.recommendedAssessments ?? []).map((assessment) => [assessment.assessmentId, 30])),
      );
      setActiveTab('assign');
      return true;
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        'Intervention plan is ready but result details are temporarily unavailable.',
      );
      setStatusWarning(message);
      toast.error(message);
      return false;
    } finally {
      setLoadingResult(false);
    }
  }, []);

  const fetchManualSources = useCallback(async () => {
    if (!activeClassId) {
      setManualLessons([]);
      setManualAssessments([]);
      return;
    }
    try {
      setLoadingManualSources(true);
      const [lessonsRes, assessmentsRes] = await Promise.all([
        lessonService.getByClass(activeClassId, {
          page: 1,
          pageSize: 200,
          status: 'all',
        }),
        assessmentService.getByClass(activeClassId, {
          page: 1,
          limit: 200,
          status: 'all',
        }),
      ]);
      setManualLessons((lessonsRes.data ?? []).filter((lesson) => !lesson.isDraft));
      setManualAssessments((assessmentsRes.data ?? []).filter((assessment) => assessment.isPublished));
    } catch {
      setManualLessons([]);
      setManualAssessments([]);
      toast.error('Failed to load class-scoped manual intervention options');
    } finally {
      setLoadingManualSources(false);
    }
  }, [activeClassId]);

  useEffect(() => {
    void fetchManualSources();
  }, [fetchManualSources]);

  const fetchClassPolicy = useCallback(async () => {
    if (!activeClassId) {
      setClassPolicy(null);
      return;
    }
    try {
      setPolicyLoading(true);
      const response = await aiService.getTeacherClassPolicy(activeClassId);
      setClassPolicy(response.data);
    } catch (error) {
      setClassPolicy(null);
      toast.error(getApiErrorMessage(error, 'Failed to load class AI policy'));
    } finally {
      setPolicyLoading(false);
    }
  }, [activeClassId]);

  useEffect(() => {
    void fetchClassPolicy();
  }, [fetchClassPolicy]);

  const updateClassPolicy = useCallback(
    async (patch: Partial<ClassAiPolicy>) => {
      if (!activeClassId || !classPolicy) return;
      try {
        setPolicySaving(true);
        const payload = {
          mentorExplainEnabled:
            patch.mentorExplainEnabled ?? classPolicy.mentorExplainEnabled,
          maxFollowUpTurns: patch.maxFollowUpTurns ?? classPolicy.maxFollowUpTurns,
          sourceScope: patch.sourceScope ?? classPolicy.sourceScope,
          strictGrounding: patch.strictGrounding ?? classPolicy.strictGrounding,
        };
        const response = await aiService.updateTeacherClassPolicy(activeClassId, payload);
        setClassPolicy(response.data);
        toast.success('Class AI policy updated.');
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Failed to update class AI policy'));
      } finally {
        setPolicySaving(false);
      }
    },
    [activeClassId, classPolicy],
  );

  useEffect(() => {
    if (!job) return;

    if (['completed', 'approved'].includes(job.status)) {
      if (!result && fetchedJobResultIdRef.current !== job.jobId) {
        void loadInterventionJobResult(job.jobId);
      }
      return;
    }

    if (['failed', 'rejected'].includes(job.status)) {
      return;
    }

    const interval = window.setInterval(async () => {
      try {
        const statusRes = await aiService.getTeacherJobStatus(job.jobId);
        statusFailuresRef.current = 0;
        setStatusWarning(null);
        setJob(statusRes.data);
        if (['completed', 'approved'].includes(statusRes.data.status)) {
          window.clearInterval(interval);
          if (fetchedJobResultIdRef.current !== statusRes.data.jobId) {
            await loadInterventionJobResult(statusRes.data.jobId);
          }
        } else if (['failed', 'rejected'].includes(statusRes.data.status)) {
          window.clearInterval(interval);
          setStatusWarning(
            statusRes.data.errorMessage?.trim() ||
              'The latest AI plan attempt failed. No new AI-generated intervention path was produced.',
          );
        }
      } catch (error) {
        statusFailuresRef.current += 1;
        if (statusFailuresRef.current >= JOB_STATUS_FAILURE_THRESHOLD) {
          const message = getApiErrorMessage(error, 'Failed to refresh intervention plan status');
          setStatusWarning(message);
          toast.error(message);
          window.clearInterval(interval);
        }
      }
    }, 10_000);

    return () => window.clearInterval(interval);
  }, [job, result, loadInterventionJobResult]);

  const hasCaseContext = Boolean(queueEntry && queueEntry.aiPlanEligible !== false);
  const existingCheckpointCount = queueEntry?.totalCheckpoints ?? 0;
  const completedCheckpointCount = queueEntry?.completedCheckpoints ?? 0;
  const hasExistingInterventionPath = existingCheckpointCount > 0;
  const hasStartedCheckpointProgress = completedCheckpointCount > 0;
  const hasUnstartedExistingInterventionPath =
    hasExistingInterventionPath && !hasStartedCheckpointProgress;

  const runGenerate = async () => {
    const hasCaseContext = Boolean(queueEntry);
    if (!hasCaseContext) {
      toast.error('Select a valid intervention case from the queue before generating a plan.');
      return;
    }
    try {
      setCreatingJob(true);
      setResult(null);
      fetchedJobResultIdRef.current = null;
      statusFailuresRef.current = 0;
      setStatusWarning(null);
      const res = await aiService.createInterventionJob(caseId, {
        note: note.trim() || undefined,
      });
      setJob(res.data);
      setActiveTab('generating');
      toast.success('AI intervention planning started.');
      if (['completed', 'approved'].includes(res.data.status)) {
        await loadInterventionJobResult(res.data.jobId);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to start AI intervention planning'));
    } finally {
      setCreatingJob(false);
    }
  };

  const handleGenerate = async () => {
    if (!hasCaseContext) {
      toast.error('Select a valid intervention case from the queue before generating a plan.');
      return;
    }
    if (hasUnstartedExistingInterventionPath) {
      setReplacePlanWarningOpen(true);
      return;
    }
    await runGenerate();
  };

  const handleRetryResultLoad = async () => {
    if (!job) return;
    await loadInterventionJobResult(job.jobId);
  };

  const visibleLessons = useMemo(
    () => result?.recommendedLessons ?? [],
    [result],
  );
  const visibleAssessments = useMemo(
    () => result?.recommendedAssessments ?? [],
    [result],
  );
  const hasGeneratedLessonDraft = Boolean(result?.generatedLessonDraft);
  const hasGeneratedGuidedAssessmentDraft = Boolean(result?.generatedGuidedAssessmentDraft);
  const hasGeneratedDrafts = hasGeneratedLessonDraft || hasGeneratedGuidedAssessmentDraft;
  const generatedLessonApproved =
    !hasGeneratedLessonDraft || Boolean(approvedGeneratedContent?.generatedLessonApproved);
  const guidedAssessmentApproved =
    !hasGeneratedGuidedAssessmentDraft || Boolean(approvedGeneratedContent?.guidedAssessmentApproved);
  const generatedDraftsApproved = generatedLessonApproved && guidedAssessmentApproved;
  const hasAssignableItems = visibleLessons.length > 0 || visibleAssessments.length > 0;
  const latestPlanAttemptFailed = Boolean(
    job && ['failed', 'rejected'].includes(job.status),
  );
  const failedPlanWithoutLoadedResult = latestPlanAttemptFailed && !result;
  const isCaseActive = queueEntry?.status === 'active';
  const assignDisabled =
    assigning ||
    !hasCaseContext ||
    !hasAssignableItems ||
    !isCaseActive ||
    failedPlanWithoutLoadedResult ||
    (hasGeneratedDrafts && !generatedDraftsApproved) ||
    hasStartedCheckpointProgress;
  const assignButtonLabel = assigning
    ? 'Assigning...'
    : hasStartedCheckpointProgress
      ? 'Progress already started'
      : failedPlanWithoutLoadedResult
        ? 'Latest AI plan failed'
      : hasGeneratedDrafts && !generatedDraftsApproved
        ? 'Approve generated content first'
      : hasUnstartedExistingInterventionPath
        ? 'Replace current path'
        : 'Assign suggested path';
  const workspaceTabs: Array<{
    key: WorkspaceTab;
    label: string;
    hint: string;
    icon: typeof Wand2;
  }> = [
    {
      key: 'plan',
      label: 'Plan Creator',
      hint: 'Set teacher guidance and pick manual fallbacks.',
      icon: Wand2,
    },
    {
      key: 'generating',
      label: 'Generating',
      hint: 'Watch the AI job state and recover result loading.',
      icon: Loader2,
    },
    {
      key: 'assign',
      label: 'Clean Out & Assign',
      hint: 'Trim weak concepts, resources, and summary before assignment.',
      icon: ClipboardCheck,
    },
  ];
  const caseStatusLabel = queueEntry
    ? queueEntry.aiPlanEligible === false
      ? `${studentName(queueEntry.student)} is no longer at-risk, so AI planning is disabled for this case.`
      : `${studentName(queueEntry.student)} - trigger ${queueEntry.triggerScore?.toFixed(1) ?? '--'}%`
    : 'Select a case from the intervention queue first.';
  const policySummary = [
    `Source scope: ${classPolicy?.sourceScope === 'recommended_only' ? 'recommended content only' : 'class materials'}`,
    `Strict grounding: ${classPolicy?.strictGrounding ? 'on' : 'off'}`,
    `AI mentor explanations: ${classPolicy?.mentorExplainEnabled ? 'enabled' : 'disabled'}${classPolicy ? `, follow-up cap ${classPolicy.maxFollowUpTurns}` : ''}`,
  ];

  const handleRemoveLesson = (lessonId: string) => {
    setResult((current) => current
      ? {
          ...current,
          recommendedLessons: current.recommendedLessons.filter((lesson) => lesson.lessonId !== lessonId),
          suggestedAssignmentPayload: normalizeSuggestedAssignmentPayload(
            current.suggestedAssignmentPayload,
            current.recommendedLessons
              .filter((lesson) => lesson.lessonId !== lessonId)
              .map((lesson) => lesson.lessonId),
            current.recommendedAssessments.map((assessment) => assessment.assessmentId),
          ),
        }
      : current);
  };

  const handleRemoveAssessment = (assessmentId: string) => {
    setResult((current) => current
      ? {
          ...current,
          recommendedAssessments: current.recommendedAssessments.filter((assessment) => assessment.assessmentId !== assessmentId),
          suggestedAssignmentPayload: normalizeSuggestedAssignmentPayload(
            current.suggestedAssignmentPayload,
            current.recommendedLessons.map((lesson) => lesson.lessonId),
            current.recommendedAssessments
              .filter((assessment) => assessment.assessmentId !== assessmentId)
              .map((assessment) => assessment.assessmentId),
          ),
        }
      : current);
  };

  const handleAddManualLesson = () => {
    if (!selectedManualLessonId) return;
    const lesson = manualLessons.find((entry) => entry.id === selectedManualLessonId);
    if (!lesson) return;
    setResult((current) => {
      const base = current ?? createManualStructuredOutput(caseId);
      if (base.recommendedLessons.some((entry) => entry.lessonId === lesson.id)) {
        return base;
      }
      const nextLessons = [
        ...base.recommendedLessons,
        {
          lessonId: lesson.id,
          title: lesson.title,
          reason: 'Manually selected from class lesson library.',
          chunkId: `manual-lesson-${lesson.id}`,
        },
      ];
      return {
        ...base,
        recommendedLessons: nextLessons,
        suggestedAssignmentPayload: normalizeSuggestedAssignmentPayload(
          base.suggestedAssignmentPayload,
          nextLessons.map((entry) => entry.lessonId),
          base.recommendedAssessments.map((entry) => entry.assessmentId),
        ),
      };
    });
    setSelectedManualLessonId('');
  };

  const handleAddManualAssessment = () => {
    if (!selectedManualAssessmentId) return;
    const assessment = manualAssessments.find(
      (entry) => entry.id === selectedManualAssessmentId,
    );
    if (!assessment) return;
    setResult((current) => {
      const base = current ?? createManualStructuredOutput(caseId);
      if (base.recommendedAssessments.some((entry) => entry.assessmentId === assessment.id)) {
        return base;
      }
      const nextAssessments = [
        ...base.recommendedAssessments,
        {
          assessmentId: assessment.id,
          title: assessment.title,
          reason: 'Manually selected from class assessment list.',
        },
      ];
      return {
        ...base,
        recommendedAssessments: nextAssessments,
        suggestedAssignmentPayload: normalizeSuggestedAssignmentPayload(
          base.suggestedAssignmentPayload,
          base.recommendedLessons.map((entry) => entry.lessonId),
          nextAssessments.map((entry) => entry.assessmentId),
        ),
      };
    });
    setSelectedManualAssessmentId('');
  };

  const handleAssign = async () => {
    if (!hasCaseContext || !hasAssignableItems) {
      if (hasCaseContext && !hasAssignableItems) {
        toast.error('Add at least one lesson or assessment before assigning this intervention plan.');
      }
      return;
    }
    if (failedPlanWithoutLoadedResult) {
      toast.error(
        'The latest AI plan attempt failed. Generate a successful plan or build a manual fallback before assigning.',
      );
      return;
    }
    if (!isCaseActive) {
      toast.error('Activate this intervention case first before assigning a plan.');
      return;
    }
    if (hasStartedCheckpointProgress) {
      toast.error('Progress has already started. Resolve this case or create a new intervention cycle instead.');
      return;
    }
    const safeResult = result ?? createManualStructuredOutput(caseId);
    const safePayload = normalizeSuggestedAssignmentPayload(
      safeResult.suggestedAssignmentPayload,
      visibleLessons.map((lesson) => lesson.lessonId),
      visibleAssessments.map((assessment) => assessment.assessmentId),
    );
    const teacherNote = note.trim();
    const aiSuggestedNote = safePayload.note?.trim();
    const assignmentNote =
      aiSuggestedNote && teacherNote && !aiSuggestedNote.includes(teacherNote)
        ? `${teacherNote}\n${aiSuggestedNote}`
        : aiSuggestedNote || teacherNote || undefined;
    try {
      setAssigning(true);
      await lxpService.assignIntervention(caseId, {
        note: assignmentNote,
        lessonAssignments: visibleLessons.map((lesson) => ({
          lessonId: lesson.lessonId,
          xpAwarded: lessonXp[lesson.lessonId] ?? 20,
          label: `AI plan: ${lesson.title}`,
        })),
        assessmentAssignments: visibleAssessments.map((assessment) => ({
          assessmentId: assessment.assessmentId,
          xpAwarded: assessmentXp[assessment.assessmentId] ?? 30,
          label: `AI plan: ${assessment.title}`,
        })),
      });
      toast.success('AI intervention plan assigned.');
      router.push(interventionsRoute);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to assign intervention plan'));
    } finally {
      setAssigning(false);
    }
  };

  const handleApproveGeneratedContent = async () => {
    if (!result) return;
    try {
      setArtifactActionLoading(true);
      const response = await lxpService.approveGeneratedArtifacts(caseId, {
        generatedLessonDraft: result.generatedLessonDraft,
        generatedGuidedAssessmentDraft: result.generatedGuidedAssessmentDraft,
      });
      setApprovedGeneratedContent({
        generatedLessonApproved: Boolean(response.data.generatedLesson),
        guidedAssessmentApproved: Boolean(response.data.guidedAssessment),
      });
      toast.success('Generated remedial content approved for assignment.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to approve generated remedial content'));
    } finally {
      setArtifactActionLoading(false);
    }
  };

  const handleRejectGeneratedContent = async () => {
    if (!result) return;
    try {
      setArtifactActionLoading(true);
      await lxpService.rejectGeneratedArtifacts(caseId, {
        generatedLessonDraft: result.generatedLessonDraft,
        generatedGuidedAssessmentDraft: result.generatedGuidedAssessmentDraft,
      });
      setApprovedGeneratedContent(null);
      toast.success('Generated remedial content rejected. You can regenerate the plan.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to reject generated remedial content'));
    } finally {
      setArtifactActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="teacher-intervention-workspace space-y-4">
        <Skeleton className="h-10 w-40 rounded-md" />
        <Skeleton className="h-24 rounded-md" />
        <Skeleton className="h-96 rounded-md" />
      </div>
    );
  }

  return (
    <div className="teacher-intervention-workspace">
      <header className="teacher-intervention-workspace__header">
        <Button
          variant="ghost"
          className="teacher-intervention-workspace__back"
          onClick={() => router.push(interventionsRoute)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to interventions
        </Button>
        <button
          type="button"
          className="teacher-intervention-workspace__help"
          onClick={() => {
            setHelpPage(0);
            setHelpOpen(true);
          }}
          aria-label="Module help"
        >
          <CircleHelp className="h-4 w-4" />
        </button>
      </header>

      <section className="teacher-intervention-workspace__intro">
        <div>
          <p className="teacher-intervention-workspace__eyebrow">AI-assisted intervention workflow</p>
          <h1>Intervention Plan Workspace</h1>
          <p>{caseStatusLabel}</p>
        </div>
        <dl className="teacher-intervention-workspace__summary" aria-label="Intervention case summary">
          <div>
            <dt>Status</dt>
            <dd>{queueEntry?.status ?? '--'}</dd>
          </div>
          <div>
            <dt>Checkpoints</dt>
            <dd>{completedCheckpointCount}/{existingCheckpointCount}</dd>
          </div>
          <div>
            <dt>Progress</dt>
            <dd>{queueEntry?.completionPercent ?? 0}%</dd>
          </div>
        </dl>
      </section>

      <nav className="teacher-intervention-workspace__tabs" aria-label="Intervention plan steps">
        {workspaceTabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              className={isActive ? 'is-active' : undefined}
              onClick={() => setActiveTab(tab.key)}
              aria-current={isActive ? 'step' : undefined}
            >
              <span className="teacher-intervention-workspace__tab-index">{index + 1}</span>
              <Icon className={tab.key === 'generating' && creatingJob ? 'animate-spin' : undefined} />
              <span>
                <strong>{tab.label}</strong>
                <small>{tab.hint}</small>
              </span>
            </button>
          );
        })}
      </nav>

      {hasUnstartedExistingInterventionPath ? (
        <div className="teacher-intervention-workspace__notice is-warning">
          This case already has {existingCheckpointCount} assigned checkpoint{existingCheckpointCount === 1 ? '' : 's'}.
          A new AI plan can replace the current unstarted path only after you confirm and assign it.
        </div>
      ) : null}
      {hasStartedCheckpointProgress ? (
        <div className="teacher-intervention-workspace__notice is-warning">
          This student has already started this intervention path. You can generate guidance for review,
          but replacing the assigned path is blocked to preserve progress.
        </div>
      ) : null}
      {failedPlanWithoutLoadedResult ? (
        <div className="teacher-intervention-workspace__notice is-warning">
          The latest AI intervention plan attempt failed, so no new AI-generated path was produced.
          {hasExistingInterventionPath
            ? ' Any assigned Learners Path shown here is an older path that remains active until you replace it with a valid plan.'
            : ' Generate a valid plan or add manual fallback checkpoints before assigning anything new.'}
        </div>
      ) : null}

      {activeTab === 'plan' ? (
        <section className="teacher-intervention-workspace__panel">
          <div className="teacher-intervention-workspace__section-head">
            <div>
              <p>Step 1</p>
              <h2>Plan Creator</h2>
            </div>
            <Button onClick={handleGenerate} disabled={creatingJob || !hasCaseContext}>
              {creatingJob ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              {job ? 'Regenerate plan' : 'Generate plan'}
            </Button>
          </div>

          <section className="rounded-2xl border border-[#eadde3] bg-[#fff9fb] p-4">
            <div className="teacher-intervention-workspace__subhead">
              <div>
                <h3>Intervention Basis</h3>
                <p>Use the weakness signals below to keep this targeted intervention grounded on class-scoped materials before assigning any review or assessment retry.</p>
              </div>
            </div>
            <div className="teacher-intervention-workspace__chips">
              <Badge variant="secondary">
                {queueEntry?.isCurrentlyAtRisk ? 'Currently at risk' : 'Recovered above threshold'}
              </Badge>
              <Badge variant="outline">
                Trigger {queueEntry?.triggerScore?.toFixed(1) ?? '--'}% vs threshold {queueEntry?.thresholdApplied?.toFixed(1) ?? '--'}%
              </Badge>
              <Badge variant="outline">
                Current blended score {queueEntry?.latestBlendedScore?.toFixed(1) ?? '--'}%
              </Badge>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
              <div className="rounded-xl border border-[#f0e5ea] bg-white p-3">
                <strong className="block text-sm text-[#1f2937]">Teacher note</strong>
                <p className="mt-2 text-sm text-[#5f6b84]">
                  {note.trim() || 'No teacher note added yet. Add context if you want the remedial plan to follow a specific weakness or pacing concern.'}
                </p>
              </div>
              <div className="rounded-xl border border-[#f0e5ea] bg-white p-3">
                <strong className="block text-sm text-[#1f2937]">Grounding policy</strong>
                <ul className="mt-2 space-y-1 text-sm text-[#5f6b84]">
                  {policySummary.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs font-medium text-[#7a5160]">
                  Recommended lessons and assessment retries stay grounded on class-scoped materials.
                </p>
              </div>
            </div>
          </section>

          <div className="teacher-intervention-workspace__creator-grid">
            <div className="teacher-intervention-workspace__field-group is-wide">
              <label>Teacher note</label>
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={7}
                placeholder="Add specific weak areas, pacing guidance, or constraints for the intervention plan"
              />
            </div>

            <div className="teacher-intervention-workspace__field-group">
              <div className="teacher-intervention-workspace__subhead">
                <h3>Class AI policy</h3>
                {policySaving ? <span>Saving...</span> : null}
              </div>
              {policyLoading ? (
                <p className="teacher-intervention-workspace__empty">Loading class policy...</p>
              ) : classPolicy ? (
                <div className="teacher-intervention-workspace__policy-grid">
                  <label className="teacher-intervention-workspace__toggle-row">
                    <span>Enable AI mentor explanations</span>
                    <input
                      type="checkbox"
                      checked={classPolicy.mentorExplainEnabled}
                      disabled={policySaving}
                      onChange={(event) =>
                        updateClassPolicy({
                          mentorExplainEnabled: event.target.checked,
                        })
                      }
                    />
                  </label>
                  <label className="teacher-intervention-workspace__toggle-row">
                    <span>Strict grounding mode</span>
                    <input
                      type="checkbox"
                      checked={classPolicy.strictGrounding}
                      disabled={policySaving}
                      onChange={(event) =>
                        updateClassPolicy({
                          strictGrounding: event.target.checked,
                        })
                      }
                    />
                  </label>
                  <label className="teacher-intervention-workspace__mini-field">
                    <span>Follow-up turn cap</span>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={classPolicy.maxFollowUpTurns}
                      disabled={policySaving}
                      onChange={(event) =>
                        setClassPolicy((current) =>
                          current
                            ? {
                                ...current,
                                maxFollowUpTurns: Number(event.target.value) || 0,
                              }
                            : current,
                        )
                      }
                      onBlur={() =>
                        updateClassPolicy({
                          maxFollowUpTurns: classPolicy.maxFollowUpTurns,
                        })
                      }
                    />
                  </label>
                  <label className="teacher-intervention-workspace__mini-field">
                    <span>Source scope</span>
                    <select
                      value={classPolicy.sourceScope}
                      disabled={policySaving}
                      onChange={(event) =>
                        updateClassPolicy({
                          sourceScope: event.target.value as ClassAiPolicy['sourceScope'],
                        })
                      }
                      className="teacher-select text-sm"
                    >
                      <option value="class_materials">Class materials</option>
                      <option value="recommended_only">Recommended content only</option>
                    </select>
                  </label>
                </div>
              ) : (
                <p className="teacher-intervention-workspace__empty">Select a class to load policy controls.</p>
              )}
            </div>
          </div>

          <div className="teacher-intervention-workspace__manual">
            <div className="teacher-intervention-workspace__subhead">
              <div>
                <h3>Manual selector</h3>
                <p>Add class-scoped lessons and assessments when AI suggestions are insufficient.</p>
              </div>
              {loadingManualSources ? <span>Loading options...</span> : null}
            </div>
            <div className="teacher-intervention-workspace__manual-grid">
              <label>
                <span>Lessons</span>
                <div>
                  <select
                    value={selectedManualLessonId}
                    onChange={(event) => setSelectedManualLessonId(event.target.value)}
                    className="teacher-select text-sm"
                    disabled={loadingManualSources || manualLessons.length === 0}
                  >
                    <option value="">Select lesson...</option>
                    {manualLessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {lesson.title}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddManualLesson}
                    disabled={!selectedManualLessonId}
                  >
                    Add
                  </Button>
                </div>
              </label>
              <label>
                <span>Assessments</span>
                <div>
                  <select
                    value={selectedManualAssessmentId}
                    onChange={(event) => setSelectedManualAssessmentId(event.target.value)}
                    className="teacher-select text-sm"
                    disabled={loadingManualSources || manualAssessments.length === 0}
                  >
                    <option value="">Select assessment...</option>
                    {manualAssessments.map((assessment) => (
                      <option key={assessment.id} value={assessment.id}>
                        {assessment.title}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddManualAssessment}
                    disabled={!selectedManualAssessmentId}
                  >
                    Add
                  </Button>
                </div>
              </label>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === 'generating' ? (
        <section className="teacher-intervention-workspace__panel">
          <div className="teacher-intervention-workspace__section-head">
            <div>
              <p>Step 2</p>
              <h2>Generating</h2>
            </div>
            <Badge variant={job?.status === 'failed' ? 'destructive' : 'secondary'}>
              {job?.status || 'idle'}
            </Badge>
          </div>

          <div className="teacher-intervention-workspace__generation">
            <Progress value={job?.progressPercent ?? 0} />
            <div>
              <strong>{job?.progressPercent ?? 0}%</strong>
              <span>{job?.statusMessage || 'Start planning to generate an AI intervention path.'}</span>
            </div>
            {job?.errorMessage ? <p className="is-error">{job.errorMessage}</p> : null}
            {statusWarning ? <p className="is-warning">{statusWarning}</p> : null}
            {job && ['completed', 'approved'].includes(job.status) && !result ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryResultLoad}
                disabled={loadingResult}
              >
                {loadingResult ? 'Retrying result...' : 'Retry loading result'}
              </Button>
            ) : null}
            {result ? (
              <Button type="button" onClick={() => setActiveTab('assign')}>
                Review generated plan
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}

      {activeTab === 'assign' ? (
        <section className="teacher-intervention-workspace__panel">
          <div className="teacher-intervention-workspace__section-head">
            <div>
              <p>Step 3</p>
              <h2>Clean Out & Assign</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasGeneratedDrafts ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleRejectGeneratedContent}
                    disabled={artifactActionLoading}
                  >
                    {artifactActionLoading ? 'Saving...' : 'Reject generated content'}
                  </Button>
                  <Button
                    onClick={handleApproveGeneratedContent}
                    disabled={artifactActionLoading}
                  >
                    {artifactActionLoading ? 'Saving...' : 'Approve generated content'}
                  </Button>
                </>
              ) : null}
              <Button
                variant="outline"
                onClick={handleAssign}
                disabled={assignDisabled}
              >
                {assignButtonLabel}
              </Button>
            </div>
          </div>

          <div className="teacher-intervention-workspace__assign-grid">
            <section className="teacher-intervention-workspace__assign-block">
              <h3>Weakness detected</h3>
              <div className="teacher-intervention-workspace__chips">
                {result?.weakConcepts?.length ? result.weakConcepts.map((concept) => (
                  <Badge key={concept} variant="secondary">{concept}</Badge>
                )) : (
                  <p className="teacher-intervention-workspace__empty">No concepts generated yet.</p>
                )}
              </div>
            </section>

            {result?.generatedLessonDraft ? (
              <section className="teacher-intervention-workspace__assign-block">
                <h3>Generated remedial lesson preview</h3>
                <p className="mb-3 text-sm text-[#5f6b84]">
                  This simplified lesson is grounded on the recommended class lesson evidence and tailored to the student&apos;s weak concepts.
                </p>
                <div className="rounded-xl border border-[#eadde3] bg-[#fff9fb] p-4">
                  <strong className="block text-base text-[#1f2937]">
                    {result.generatedLessonDraft.title}
                  </strong>
                  <p className="mt-2 text-sm text-[#5f6b84]">
                    {result.generatedLessonDraft.summary || 'No summary provided.'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {result.generatedLessonDraft.weakConcepts.map((concept) => (
                      <Badge key={concept} variant="outline">{concept}</Badge>
                    ))}
                  </div>
                  <div className="mt-4 rounded-lg bg-white p-3 text-sm leading-6 text-[#30415d]">
                    <pre className="whitespace-pre-wrap font-sans">
                      {result.generatedLessonDraft.lessonBody}
                    </pre>
                  </div>
                  <p className="mt-3 text-xs font-medium text-[#7a5160]">
                    Approval status: {approvedGeneratedContent?.generatedLessonApproved ? 'Approved for assignment' : 'Waiting for teacher approval'}
                  </p>
                </div>
              </section>
            ) : null}

            <section className="teacher-intervention-workspace__assign-block">
              <h3>Recommended lesson review</h3>
              <p className="mb-3 text-sm text-[#5f6b84]">
                These lesson reviews were chosen to reinforce the weak concepts before the student reopens an assessment retry.
              </p>
              {visibleLessons.length === 0 ? (
                <p className="teacher-intervention-workspace__empty">No lessons selected yet.</p>
              ) : visibleLessons.map((lesson) => (
                <div key={lesson.lessonId} className="teacher-intervention-workspace__resource-row">
                  <div>
                    <strong>{lesson.title}</strong>
                    <span>Why it was chosen: {lesson.reason}</span>
                  </div>
                  <label>
                    <span>XP</span>
                    <Input
                      type="number"
                      min={0}
                      value={lessonXp[lesson.lessonId] ?? 20}
                      onChange={(event) => setLessonXp((current) => ({
                        ...current,
                        [lesson.lessonId]: Number(event.target.value) || 0,
                      }))}
                    />
                  </label>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveLesson(lesson.lessonId)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </section>

            {result?.generatedGuidedAssessmentDraft ? (
              <section className="teacher-intervention-workspace__assign-block">
                <h3>Generated guided assessment preview</h3>
                <p className="mb-3 text-sm text-[#5f6b84]">
                  This LXP-only remedial assessment uses the failed class assessment as a basis, then adds optional hints and post-answer explanations.
                </p>
                <div className="rounded-xl border border-[#eadde3] bg-[#fff9fb] p-4">
                  <strong className="block text-base text-[#1f2937]">
                    {result.generatedGuidedAssessmentDraft.title}
                  </strong>
                  <p className="mt-2 text-sm text-[#5f6b84]">
                    {result.generatedGuidedAssessmentDraft.description || 'No description provided.'}
                  </p>
                  <div className="mt-3 grid gap-3">
                    {result.generatedGuidedAssessmentDraft.questions.slice(0, 3).map((question, index) => (
                      <div key={question.id} className="rounded-lg border border-[#f0e5ea] bg-white p-3">
                        <strong className="block text-sm text-[#1f2937]">
                          Q{index + 1}. {question.stem}
                        </strong>
                        {question.hint ? (
                          <p className="mt-2 text-xs font-medium text-[#7a5160]">
                            Hint: {question.hint}
                          </p>
                        ) : null}
                        <p className="mt-2 text-xs text-[#5f6b84]">
                          Explanation: {question.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs font-medium text-[#7a5160]">
                    Approval status: {approvedGeneratedContent?.guidedAssessmentApproved ? 'Approved for assignment' : 'Waiting for teacher approval'}
                  </p>
                </div>
              </section>
            ) : null}

            <section className="teacher-intervention-workspace__assign-block">
              <h3>Recommended assessment retry</h3>
              <p className="mb-3 text-sm text-[#5f6b84]">
                These assessment retries should validate improvement after guided review while staying inside the original class scope.
              </p>
              {visibleAssessments.length === 0 ? (
                <p className="teacher-intervention-workspace__empty">No assessments selected yet.</p>
              ) : visibleAssessments.map((assessment) => (
                <div key={assessment.assessmentId} className="teacher-intervention-workspace__resource-row">
                  <div>
                    <strong>{assessment.title}</strong>
                    <span>Why it was chosen: {assessment.reason}</span>
                  </div>
                  <label>
                    <span>XP</span>
                    <Input
                      type="number"
                      min={0}
                      value={assessmentXp[assessment.assessmentId] ?? 30}
                      onChange={(event) => setAssessmentXp((current) => ({
                        ...current,
                        [assessment.assessmentId]: Number(event.target.value) || 0,
                      }))}
                    />
                  </label>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveAssessment(assessment.assessmentId)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </section>

            <section className="teacher-intervention-workspace__assign-block is-summary">
              <h3>Teacher review before assignment</h3>
              {result?.aiSummary ? (
                <>
                  <p>{toPlainTeacherText(result.aiSummary.summary)}</p>
                  <div>
                    <strong>Teacher actions</strong>
                    <ul>
                      {result.aiSummary.teacherActions.map((action) => (
                        <li key={action}>{toPlainTeacherText(action)}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <strong>Student focus</strong>
                    <div className="teacher-intervention-workspace__chips">
                      {result.aiSummary.studentFocus.map((focus) => (
                        <Badge key={focus} variant="outline">{toPlainTeacherText(focus)}</Badge>
                      ))}
                    </div>
                  </div>
                  <p className="rounded-xl border border-[#f0d7df] bg-[#fff7f9] px-3 py-2 text-sm font-medium text-[#6a4f5b]">
                    Formative support only: intervention checkpoints support remediation and teacher reference. They do not automatically alter official class records.
                  </p>
                  {hasGeneratedDrafts ? (
                    <p className="rounded-xl border border-[#e4d8ff] bg-[#faf7ff] px-3 py-2 text-sm font-medium text-[#5e4b89]">
                      Generated remedial content is teacher-reviewed and stays inside LXP. It does not create a new official LMS lesson or official assessment attempt.
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="teacher-intervention-workspace__empty">
                  Generate an intervention plan or add manual selections to review the assignable path.
                </p>
              )}
            </section>
          </div>
        </section>
      ) : null}
      <Dialog open={replacePlanWarningOpen} onOpenChange={setReplacePlanWarningOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate a new intervention plan?</DialogTitle>
            <DialogDescription>
              This student already has an assigned intervention path. Generating a new AI plan will not change
              the student path yet, but assigning the new plan will replace the current unstarted checkpoints.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setReplacePlanWarningOpen(false)}
            >
              Keep current path
            </Button>
            <Button
              type="button"
              onClick={() => {
                setReplacePlanWarningOpen(false);
                void runGenerate();
              }}
            >
              Generate new AI plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={helpOpen}
        onOpenChange={(open) => {
          setHelpOpen(open);
          if (open) setHelpPage(0);
        }}
      >
        <DialogContent className="teacher-intervention-workspace__manual-dialog">
          <DialogHeader>
            <DialogTitle>Teacher guide: Intervention Plan Workspace</DialogTitle>
            <DialogDescription>
              Read this one page at a time. Each example shows the part of the system being explained.
            </DialogDescription>
          </DialogHeader>

          <div className="teacher-intervention-workspace__manual-progress" aria-live="polite">
            <span>Page {helpPage + 1} of {helpManualPages.length}</span>
            <div>
              {helpManualPages.map((page, index) => (
                <button
                  key={page.title}
                  type="button"
                  className={index === helpPage ? 'is-active' : undefined}
                  onClick={() => setHelpPage(index)}
                  aria-label={`Open guide page ${index + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="teacher-intervention-workspace__manual-layout">
            <HelpManualScreenshot screen={helpManualPages[helpPage].screen} />
            <section className="teacher-intervention-workspace__manual-copy">
              <p className="teacher-intervention-workspace__manual-kicker">Teacher instruction manual</p>
              <h3>{helpManualPages[helpPage].title}</h3>
              <p>{helpManualPages[helpPage].description}</p>
              <ol>
                {helpManualPages[helpPage].steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p className="teacher-intervention-workspace__manual-reminder">
                Simple rule: move from left to right, review before assigning, and stop if the page says progress already started.
              </p>
            </section>
          </div>

          <DialogFooter>
            <div className="teacher-intervention-workspace__manual-actions">
              <Button
                type="button"
                variant="outline"
                onClick={() => setHelpPage((current) => Math.max(current - 1, 0))}
                disabled={helpPage === 0}
              >
                Previous page
              </Button>
              {helpPage < helpManualPages.length - 1 ? (
                <Button
                  type="button"
                  onClick={() =>
                    setHelpPage((current) => Math.min(current + 1, helpManualPages.length - 1))
                  }
                >
                  Next page
                </Button>
              ) : (
                <Button type="button" onClick={() => setHelpOpen(false)}>
                  Close guide
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
