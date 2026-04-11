'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { aiService } from '@/services/ai-service';
import { assessmentService } from '@/services/assessment-service';
import { lessonService } from '@/services/lesson-service';
import { lxpService } from '@/services/lxp-service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/lib/api-error';
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

const JOB_STATUS_FAILURE_THRESHOLD = 3;

type SuggestedAssignmentPayload = InterventionStructuredOutput['suggestedAssignmentPayload'];

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
    weakConcepts: Array.isArray(payload?.weakConcepts) ? payload.weakConcepts : [],
    recommendedLessons,
    recommendedAssessments,
    aiSummary: payload?.aiSummary ?? {
      summary:
        'AI intervention result loaded with degraded fields. Review and adjust before assigning.',
      teacherActions: [],
      studentFocus: [],
    },
    suggestedAssignmentPayload: normalizeSuggestedAssignmentPayload(
      payload?.suggestedAssignmentPayload,
      recommendedLessons.map((lesson) => lesson.lessonId),
      recommendedAssessments.map((assessment) => assessment.assessmentId),
    ),
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
  const statusFailuresRef = useRef(0);
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
        setQueueEntry(queueRes.data.queue.find((entry) => entry.id === caseId) ?? null);
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
      const resultRes = await aiService.getInterventionJobResult(jobId);
      const structured = normalizeStructuredOutput(
        resultRes.data.result.structuredOutput,
      );
      setResult(structured);
      setStatusWarning(null);
      setLessonXp(
        Object.fromEntries(structured.recommendedLessons.map((lesson) => [lesson.lessonId, 20])),
      );
      setAssessmentXp(
        Object.fromEntries(structured.recommendedAssessments.map((assessment) => [assessment.assessmentId, 30])),
      );
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
    if (!job || ['completed', 'approved', 'failed', 'rejected'].includes(job.status)) {
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
          await loadInterventionJobResult(statusRes.data.jobId);
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
    }, 2500);

    return () => window.clearInterval(interval);
  }, [job, loadInterventionJobResult]);

  const handleGenerate = async () => {
    const hasCaseContext = Boolean(classId && queueEntry);
    if (!hasCaseContext) {
      toast.error('Select a valid intervention case from the queue before generating a plan.');
      return;
    }
    try {
      setCreatingJob(true);
      setResult(null);
      statusFailuresRef.current = 0;
      setStatusWarning(null);
      const res = await aiService.createInterventionJob(caseId, {
        note: note.trim() || undefined,
      });
      setJob(res.data);
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
  const hasCaseContext = Boolean(queueEntry && queueEntry.aiPlanEligible !== false);
  const hasAssignableItems = visibleLessons.length > 0 || visibleAssessments.length > 0;

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

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.push(interventionsRoute)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to interventions
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Intervention Workspace
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {queueEntry
              ? queueEntry.aiPlanEligible === false
                ? `${studentName(queueEntry.student)} is no longer at-risk, so AI planning is disabled for this case.`
                : `${studentName(queueEntry.student)} - trigger ${queueEntry.triggerScore?.toFixed(1) ?? '--'}%`
              : 'Select a case from the intervention queue first.'}
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="rounded-lg border p-4 text-sm text-muted-foreground">
              Use this page to generate, inspect, trim, and assign an intervention path without losing visibility into the AI job state.
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Teacher note</label>
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={6}
                placeholder="Add specific weak areas, pacing guidance, or constraints for the intervention plan"
              />
            </div>
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-sm font-medium">Class AI policy</p>
              {policyLoading ? (
                <p className="text-xs text-muted-foreground">Loading class policy...</p>
              ) : classPolicy ? (
                <div className="grid gap-3">
                  <label className="flex items-center justify-between rounded-md border p-2 text-xs">
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
                  <label className="flex items-center justify-between rounded-md border p-2 text-xs">
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
                  <div className="grid gap-1">
                    <label className="text-xs font-medium uppercase text-muted-foreground">
                      Follow-up turn cap
                    </label>
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
                  </div>
                  <div className="grid gap-1">
                    <label className="text-xs font-medium uppercase text-muted-foreground">
                      Source scope
                    </label>
                    <select
                      value={classPolicy.sourceScope}
                      disabled={policySaving}
                      onChange={(event) =>
                        updateClassPolicy({
                          sourceScope: event.target.value as ClassAiPolicy['sourceScope'],
                        })
                      }
                      className="teacher-select w-full text-sm"
                    >
                      <option value="class_materials">Class materials</option>
                      <option value="recommended_only">Recommended content only</option>
                    </select>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Select a class to load policy controls.
                </p>
              )}
            </div>

            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-sm font-medium">Manual selector</p>
              <p className="text-xs text-muted-foreground">
                Add class-scoped lessons and assessments when AI suggestions are insufficient.
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase text-muted-foreground">Lessons</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedManualLessonId}
                      onChange={(event) => setSelectedManualLessonId(event.target.value)}
                      className="teacher-select w-full text-sm"
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
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase text-muted-foreground">Assessments</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedManualAssessmentId}
                      onChange={(event) => setSelectedManualAssessmentId(event.target.value)}
                      className="teacher-select w-full text-sm"
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
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleGenerate} disabled={creatingJob || !hasCaseContext}>
                {creatingJob ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {job ? 'Regenerate plan' : 'Generate plan'}
              </Button>
              <Button
                variant="outline"
                onClick={handleAssign}
                disabled={assigning || !hasCaseContext || !hasAssignableItems}
              >
                {assigning ? 'Assigning...' : 'Assign suggested path'}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Generation progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={job?.progressPercent ?? 0} />
                <div className="flex items-center justify-between text-sm">
                  <span>{job?.statusMessage || 'Start planning to generate an AI intervention path.'}</span>
                  <Badge variant={job?.status === 'failed' ? 'destructive' : 'secondary'}>
                    {job?.status || 'idle'}
                  </Badge>
                </div>
                {job?.errorMessage && <p className="text-sm text-destructive">{job.errorMessage}</p>}
                {statusWarning && (
                  <p className="text-sm text-yellow-700">{statusWarning}</p>
                )}
                {job && ['completed', 'approved'].includes(job.status) && !result && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetryResultLoad}
                    disabled={loadingResult}
                  >
                    {loadingResult ? 'Retrying result...' : 'Retry loading result'}
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Weak concepts</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {result?.weakConcepts?.length ? result.weakConcepts.map((concept) => (
                  <Badge key={concept} variant="secondary">{concept}</Badge>
                )) : (
                  <p className="text-sm text-muted-foreground">No concepts generated yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recommended lessons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {visibleLessons.length === 0 ? (
              <p className="text-sm text-muted-foreground">No lessons selected yet.</p>
            ) : visibleLessons.map((lesson) => (
              <div key={lesson.lessonId} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{lesson.title}</p>
                    <p className="text-sm text-muted-foreground">{lesson.reason}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveLesson(lesson.lessonId)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">XP award</label>
                  <Input
                    type="number"
                    min={0}
                    value={lessonXp[lesson.lessonId] ?? 20}
                    onChange={(event) => setLessonXp((current) => ({
                      ...current,
                      [lesson.lessonId]: Number(event.target.value) || 0,
                    }))}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommended assessments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {visibleAssessments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assessments selected yet.</p>
            ) : visibleAssessments.map((assessment) => (
              <div key={assessment.assessmentId} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{assessment.title}</p>
                    <p className="text-sm text-muted-foreground">{assessment.reason}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveAssessment(assessment.assessmentId)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">XP award</label>
                  <Input
                    type="number"
                    min={0}
                    value={assessmentXp[assessment.assessmentId] ?? 30}
                    onChange={(event) => setAssessmentXp((current) => ({
                      ...current,
                      [assessment.assessmentId]: Number(event.target.value) || 0,
                    }))}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Teacher-facing summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {result?.aiSummary ? (
            <>
              <p className="text-sm">{result.aiSummary.summary}</p>
              <div>
                <p className="text-sm font-medium">Teacher actions</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {result.aiSummary.teacherActions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-medium">Student focus</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {result.aiSummary.studentFocus.map((focus) => (
                    <Badge key={focus} variant="outline">{focus}</Badge>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Generate an intervention plan to review the AI summary and assignable path.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
