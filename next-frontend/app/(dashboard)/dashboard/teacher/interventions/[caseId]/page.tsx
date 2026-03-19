'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { aiService } from '@/services/ai-service';
import { lxpService } from '@/services/lxp-service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/lib/api-error';
import type { AiGenerationJob, InterventionStructuredOutput } from '@/types/ai';
import type { TeacherInterventionQueueItem } from '@/types/lxp';

function studentName(entry: TeacherInterventionQueueItem['student']): string {
  const first = entry?.firstName?.trim() ?? '';
  const last = entry?.lastName?.trim() ?? '';
  if (first && last) return `${last}, ${first}`;
  if (last) return last;
  if (first) return first;
  return entry?.email ?? 'Unknown student';
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

  const fetchCase = useCallback(async () => {
    if (!classId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const queueRes = await lxpService.getTeacherQueue(classId);
      setQueueEntry(queueRes.data.queue.find((entry) => entry.id === caseId) ?? null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load intervention workspace'));
    } finally {
      setLoading(false);
    }
  }, [caseId, classId]);

  useEffect(() => {
    void fetchCase();
  }, [fetchCase]);

  useEffect(() => {
    if (!job || ['completed', 'approved', 'failed', 'rejected'].includes(job.status)) {
      return;
    }

    const interval = window.setInterval(async () => {
      try {
        const statusRes = await aiService.getTeacherJobStatus(job.jobId);
        setJob(statusRes.data);
        if (['completed', 'approved'].includes(statusRes.data.status)) {
          const resultRes = await aiService.getInterventionJobResult(job.jobId);
          const structured = resultRes.data.result.structuredOutput;
          setResult(structured);
          setLessonXp(
            Object.fromEntries(structured.recommendedLessons.map((lesson) => [lesson.lessonId, 20])),
          );
          setAssessmentXp(
            Object.fromEntries(structured.recommendedAssessments.map((assessment) => [assessment.assessmentId, 30])),
          );
        }
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Failed to refresh intervention plan status'));
        window.clearInterval(interval);
      }
    }, 2500);

    return () => window.clearInterval(interval);
  }, [job]);

  const handleGenerate = async () => {
    try {
      setCreatingJob(true);
      setResult(null);
      const res = await aiService.createInterventionJob(caseId, {
        note: note.trim() || undefined,
      });
      setJob(res.data);
      toast.success('AI intervention planning started.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to start AI intervention planning'));
    } finally {
      setCreatingJob(false);
    }
  };

  const visibleLessons = useMemo(
    () => result?.recommendedLessons ?? [],
    [result],
  );
  const visibleAssessments = useMemo(
    () => result?.recommendedAssessments ?? [],
    [result],
  );

  const handleRemoveLesson = (lessonId: string) => {
    setResult((current) => current
      ? {
          ...current,
          recommendedLessons: current.recommendedLessons.filter((lesson) => lesson.lessonId !== lessonId),
          suggestedAssignmentPayload: {
            ...current.suggestedAssignmentPayload,
            lessonIds: current.suggestedAssignmentPayload.lessonIds.filter((id) => id !== lessonId),
          },
        }
      : current);
  };

  const handleRemoveAssessment = (assessmentId: string) => {
    setResult((current) => current
      ? {
          ...current,
          recommendedAssessments: current.recommendedAssessments.filter((assessment) => assessment.assessmentId !== assessmentId),
          suggestedAssignmentPayload: {
            ...current.suggestedAssignmentPayload,
            assessmentIds: current.suggestedAssignmentPayload.assessmentIds.filter((id) => id !== assessmentId),
          },
        }
      : current);
  };

  const handleAssign = async () => {
    if (!result) return;
    try {
      setAssigning(true);
      await lxpService.assignIntervention(caseId, {
        note: result.suggestedAssignmentPayload.note,
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
      router.push(`/dashboard/teacher/interventions?classId=${classId}`);
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
      <Button variant="ghost" onClick={() => router.push('/dashboard/teacher/interventions')}>
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
            {queueEntry ? `${studentName(queueEntry.student)} • trigger ${queueEntry.triggerScore?.toFixed(1) ?? '--'}%` : 'Select a case from the intervention queue first.'}
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
            <div className="flex gap-2">
              <Button onClick={handleGenerate} disabled={creatingJob || !classId}>
                {creatingJob ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {job ? 'Regenerate plan' : 'Generate plan'}
              </Button>
              {result && (
                <Button variant="outline" onClick={handleAssign} disabled={assigning}>
                  {assigning ? 'Assigning...' : 'Assign suggested path'}
                </Button>
              )}
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
