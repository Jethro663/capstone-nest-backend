'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Gamepad2, HeartHandshake, Sparkles, Star, Swords, Trophy } from 'lucide-react';
import { lxpService } from '@/services/lxp-service';
import type { EligibleClass, PlaylistResponse } from '@/types/lxp';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { StudentPageShell, StudentPageStat, StudentSectionCard } from '@/components/student/StudentPageShell';
import { StudentEmptyState } from '@/components/student/student-primitives';
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
        <Skeleton className="h-44 rounded-[1.8rem]" />
        <div className="grid gap-6 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-[1.5rem]" />)}
        </div>
        <Skeleton className="h-[30rem] rounded-[1.8rem]" />
      </div>
    );
  }

  if (eligibleClasses.length === 0) {
    return (
      <StudentPageShell
        badge="LXP Adventure"
        title="LXP"
        description="When you need a little extra support, this space turns recovery work into a guided, game-like challenge."
      >
        <StudentEmptyState
          title="No active LXP classes right now"
          description={`LXP opens when your blended score is below ${threshold !== null ? `${threshold}%` : 'the active threshold'} in a class.`}
          icon={<Gamepad2 className="h-5 w-5" />}
        />
      </StudentPageShell>
 
    );
  }

  return (
    <StudentPageShell
      badge="LXP Adventure"
      title="LXP"
      description={
        threshold !== null
          ? `Your support playlist is unlocked for classes below ${threshold}%. Complete checkpoints, earn XP, build streaks, and recover with less pressure.`
          : 'Complete checkpoints, earn XP, build streaks, and recover your confidence one step at a time.'
      }
      actions={
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="student-input min-w-[260px] rounded-2xl border px-3 py-2 text-sm"
 
        >
          {eligibleClasses.map((entry) => (
            <option key={entry.classId} value={entry.classId}>
              {classLabel(entry)}
            </option>
          ))}
        </select>
      }
      stats={
        <>
          <StudentPageStat
            label="XP"
            value={playlist?.progress.xpTotal ?? 0}
            caption="Current intervention XP"
            icon={Trophy}
            accent="bg-[var(--student-accent-soft)] text-[var(--student-accent)]"
          />
          <StudentPageStat
            label="Stars"
            value={(playlist?.progress.starsTotal ?? 0).toFixed(2)}
            caption="1000 XP = 1 star"
            icon={Star}
            accent="bg-amber-100 text-amber-700"
          />
          <StudentPageStat
            label="Streak"
            value={`${playlist?.progress.streakDays ?? 0} day(s)`}
            caption="Keep the momentum going"
            icon={Sparkles}
            accent="bg-emerald-100 text-emerald-700"
          />
          <StudentPageStat
            label="Complete"
            value={`${playlist?.progress.completionPercent ?? 0}%`}
            caption="Checkpoint progress"
            icon={Swords}
            accent="bg-sky-100 text-sky-700"
          />
        </>
      }
    >
      <StudentSectionCard
        title="Class Snapshot"
        description="Hereâ€™s the class youâ€™re currently working on and the progress youâ€™ve built so far."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.5rem] border border-[var(--student-outline)] bg-[var(--student-surface-soft)] p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--student-text-muted)]">
              Current Class
            </p>
            <p className="mt-3 text-xl font-black text-[var(--student-text-strong)]">
              {selectedClass ? classLabel(selectedClass) : '--'}
            </p>
            <p className="mt-1 text-sm text-[var(--student-text-muted)]">
              {selectedClass?.class.section?.name ?? 'Section unavailable'}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-[var(--student-outline)] bg-[var(--student-elevated)] p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--student-text-muted)]">
                Progress Bar
              </p>
              <Badge className="student-badge">{playlist?.progress.completionPercent ?? 0}% complete</Badge>
            </div>
            <Progress
              value={playlist?.progress.completionPercent ?? 0}
              className="student-progress-track h-3"
              indicatorClassName="student-progress-fill"
            />
          </div>
        </div>
      </StudentSectionCard>

      <StudentSectionCard
        title="Remedial Checkpoints"
        description="These guided steps help you revisit lessons, retry assessments, and earn progress in a more manageable way."
      >
        {loadingPlaylist ? (
          <Skeleton className="h-80 rounded-[1.5rem]" />
        ) : (playlist?.checkpoints ?? []).length === 0 ? (
          <StudentEmptyState
            title="No checkpoints assigned yet"
            description="Ask your teacher to assign intervention tasks for this class."
            icon={<HeartHandshake className="h-5 w-5" />}
          />
        ) : (
          <div className="space-y-4">
            {playlist?.checkpoints.map((checkpoint) => (
              <div
                key={checkpoint.id}
                className="student-panel student-panel-hover rounded-[1.5rem] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-black text-[var(--student-text-strong)]">
                        {checkpoint.label}
                      </p>
                      <Badge
                        className={
                          checkpoint.isCompleted
                            ? 'border-[var(--student-success-border)] bg-[var(--student-success-bg)] text-[var(--student-success-text)]'
                            : 'student-badge'
                        }
 
                      >
                        {checkpoint.isCompleted ? 'Completed' : 'Pending'}
                      </Badge>
                      <Badge className="student-badge">+{checkpoint.xpAwarded} XP</Badge>
                    </div>
                    <p className="text-sm text-[var(--student-text-muted)]">
                      {checkpoint.type === 'lesson_review'
                        ? 'Review lesson checkpoint'
                        : 'Retry assessment checkpoint'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {checkpoint.lesson && (
                      <Link href={`/dashboard/student/lessons/${checkpoint.lesson.id}`}>
                        <Button variant="outline" size="sm" className="student-button-outline rounded-xl">
                          Open Lesson
                        </Button>
                      </Link>
                    )}
                    {checkpoint.assessment && (
                      <Link href={checkpoint.assessment.type === 'file_upload' ? `/dashboard/student/assessments/${checkpoint.assessment.id}/take` : `/dashboard/student/assessments/${checkpoint.assessment.id}`}>
                        <Button variant="outline" size="sm" className="student-button-outline rounded-xl">
                          Open Assessment
                        </Button>
                      </Link>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleComplete(checkpoint.id)}
                      disabled={checkpoint.isCompleted || completingId === checkpoint.id}
                      className="student-button-solid rounded-xl"
                    >
                      {checkpoint.isCompleted
                        ? 'Done'
                        : completingId === checkpoint.id
                          ? 'Completing...'
                          : 'Mark Complete'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </StudentSectionCard>

      <StudentSectionCard
        title="Quick LXP Feedback"
        description="Tell us what felt helpful so this support space can keep getting better for students."
      >
        <div className="space-y-3">
          <textarea
            className="student-input min-h-28 w-full rounded-2xl border p-3 text-sm"
 
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Share what helped you most (optional)"
          />
          <Button size="sm" onClick={submitEvaluation} disabled={submittingEval} className="student-button-solid rounded-xl">
 
            {submittingEval ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>
      </StudentSectionCard>
    </StudentPageShell>
  );
}

