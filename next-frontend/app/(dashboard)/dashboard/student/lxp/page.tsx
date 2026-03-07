'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { lxpService } from '@/services/lxp-service';
import type { EligibleClass, PlaylistResponse } from '@/types/lxp';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

function classLabel(item: EligibleClass): string {
  return `${item.class.subjectName} (${item.class.subjectCode})`;
}

export default function StudentLxpPage() {
  const [loading, setLoading] = useState(true);
  const [eligibleClasses, setEligibleClasses] = useState<EligibleClass[]>([]);
  const [threshold, setThreshold] = useState(74);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [playlist, setPlaylist] = useState<PlaylistResponse | null>(null);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [submittingEval, setSubmittingEval] = useState(false);

  const selectedClass = useMemo(
    () => eligibleClasses.find((entry) => entry.classId === selectedClassId) ?? null,
    [eligibleClasses, selectedClassId],
  );

  const fetchEligibility = useCallback(async () => {
    try {
      setLoading(true);
      const res = await lxpService.getEligibility();
      setThreshold(res.data.threshold);
      const rows = res.data.eligibleClasses ?? [];
      setEligibleClasses(rows);
      setSelectedClassId((prev) => prev || rows[0]?.classId || '');
    } catch {
      toast.error('Failed to load LXP eligibility');
      setEligibleClasses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPlaylist = useCallback(async () => {
    if (!selectedClassId) {
      setPlaylist(null);
      return;
    }

    try {
      setLoadingPlaylist(true);
      const res = await lxpService.getPlaylist(selectedClassId);
      setPlaylist(res.data);
    } catch {
      toast.error('Failed to load your intervention playlist');
      setPlaylist(null);
    } finally {
      setLoadingPlaylist(false);
    }
  }, [selectedClassId]);

  useEffect(() => {
    fetchEligibility();
  }, [fetchEligibility]);

  useEffect(() => {
    fetchPlaylist();
  }, [fetchPlaylist]);

  const handleComplete = async (assignmentId: string) => {
    if (!selectedClassId) return;
    try {
      setCompletingId(assignmentId);
      const res = await lxpService.completeCheckpoint(selectedClassId, assignmentId);
      setPlaylist(res.data);
      toast.success('Checkpoint completed');
    } catch {
      toast.error('Failed to complete checkpoint');
    } finally {
      setCompletingId(null);
    }
  };

  const submitEvaluation = async () => {
    try {
      setSubmittingEval(true);
      await lxpService.submitEvaluation({
        targetModule: 'lxp',
        usabilityScore: 4,
        functionalityScore: 4,
        performanceScore: 4,
        satisfactionScore: 4,
        feedback: feedback || undefined,
      });
      toast.success('Evaluation submitted');
      setFeedback('');
    } catch {
      toast.error('Failed to submit evaluation');
    } finally {
      setSubmittingEval(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    );
  }

  if (eligibleClasses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>LXP Intervention</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>You currently have no active intervention classes.</p>
          <p>
            LXP access is enabled when your blended score is below {threshold}% in a class.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">LXP Intervention</h1>
          <p className="text-sm text-muted-foreground">
            Threshold: {threshold}% | Complete checkpoints to gain XP and recover faster.
          </p>
        </div>
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm min-w-[260px]"
        >
          {eligibleClasses.map((entry) => (
            <option key={entry.classId} value={entry.classId}>
              {classLabel(entry)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Class</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{selectedClass ? classLabel(selectedClass) : '--'}</p>
            <p className="text-xs text-muted-foreground">
              {selectedClass?.class.section?.name ?? 'Section unavailable'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">XP</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{playlist?.progress.xpTotal ?? 0}</p>
            <p className="text-xs text-muted-foreground">Current intervention XP</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{playlist?.progress.streakDays ?? 0} day(s)</p>
            <p className="text-xs text-muted-foreground">Daily intervention streak</p>
          </CardContent>
        </Card>
      </div>

      {loadingPlaylist ? (
        <Skeleton className="h-96 rounded-lg" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Remedial Checkpoints</span>
              <Badge variant="secondary">
                {playlist?.progress.completionPercent ?? 0}% complete
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={playlist?.progress.completionPercent ?? 0} />
            {(playlist?.checkpoints ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No checkpoints assigned yet. Ask your teacher to assign intervention tasks.
              </p>
            ) : (
              <div className="space-y-3">
                {playlist?.checkpoints.map((checkpoint) => (
                  <div
                    key={checkpoint.id}
                    className="rounded-lg border bg-background p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{checkpoint.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {checkpoint.type === 'lesson_review'
                            ? 'Review lesson checkpoint'
                            : 'Retry assessment checkpoint'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={checkpoint.isCompleted ? 'default' : 'outline'}>
                          {checkpoint.isCompleted ? 'Completed' : 'Pending'}
                        </Badge>
                        <Badge variant="secondary">+{checkpoint.xpAwarded} XP</Badge>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {checkpoint.lesson && (
                        <Link href={`/dashboard/student/lessons/${checkpoint.lesson.id}`}>
                          <Button variant="outline" size="sm">
                            Open Lesson
                          </Button>
                        </Link>
                      )}
                      {checkpoint.assessment && (
                        <Link href={`/dashboard/student/assessments/${checkpoint.assessment.id}`}>
                          <Button variant="outline" size="sm">
                            Open Assessment
                          </Button>
                        </Link>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleComplete(checkpoint.id)}
                        disabled={checkpoint.isCompleted || completingId === checkpoint.id}
                      >
                        {checkpoint.isCompleted
                          ? 'Done'
                          : completingId === checkpoint.id
                            ? 'Completing...'
                            : 'Mark Complete'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick LXP Feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            className="min-h-24 w-full rounded-md border p-2 text-sm"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Share what helped you most (optional)"
          />
          <Button size="sm" onClick={submitEvaluation} disabled={submittingEval}>
            {submittingEval ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
