'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Flame,
  Map,
  MessageSquareText,
  RefreshCw,
  Sparkles,
  Star,
  Target,
  Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { StudentPageShell, StudentPageStat, StudentSectionCard } from '@/components/student/StudentPageShell';
import { StudentEmptyState, StudentStatusChip } from '@/components/student/student-primitives';
import { lxpService } from '@/services/lxp-service';
import type {
  EligibleClass,
  LxpCheckpoint,
  LxpOverviewAssessmentItem,
  LxpOverviewResponse,
  LxpOverviewSubjectMasteryRow,
  LxpOverviewWeakFocusItem,
  PlaylistResponse,
} from '@/types/lxp';
import { cn } from '@/utils/cn';

type LxpTabKey = 'overview' | 'roadmap' | 'assessments' | 'interventions' | 'ai-tutor';

const TABS: Array<{ value: LxpTabKey; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'roadmap', label: 'Roadmap' },
  { value: 'assessments', label: 'Assessments' },
  { value: 'interventions', label: 'Interventions' },
  { value: 'ai-tutor', label: 'AI Tutor' },
];

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '--';
  return `${Math.round(value)}%`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'No date set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date set';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function timeAgo(value: string | null | undefined): string {
  if (!value) return 'Just now';
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return 'Just now';
  const diffHours = Math.floor((Date.now() - timestamp) / 3_600_000);
  if (diffHours <= 0) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function classLabel(item: EligibleClass): string {
  return `${item.class.subjectName} (${item.class.subjectCode})`;
}

function checkpointHref(checkpoint: LxpCheckpoint): string {
  if (checkpoint.lesson?.id) return `/dashboard/student/lessons/${checkpoint.lesson.id}`;
  if (checkpoint.assessment?.id) return `/dashboard/student/assessments/${checkpoint.assessment.id}`;
  return '/dashboard/student/lxp';
}

function checkpointSummary(checkpoint: LxpCheckpoint): string {
  if (checkpoint.lesson?.description) return checkpoint.lesson.description;
  if (checkpoint.assessment?.description) return checkpoint.assessment.description;
  return checkpoint.type === 'lesson_review'
    ? 'Review the lesson material connected to this intervention checkpoint.'
    : 'Retry the linked assessment checkpoint and recover your standing.';
}

function checkpointTone(status: LxpOverviewResponse['interventionStatus']['code']) {
  if (status === 'on_track') return 'success' as const;
  if (status === 'improving') return 'warning' as const;
  return 'danger' as const;
}

function masteryTone(status: LxpOverviewSubjectMasteryRow['status']) {
  if (status === 'on_track') return 'success' as const;
  if (status === 'improving') return 'warning' as const;
  return 'danger' as const;
}

function weakFocusLabel(item: LxpOverviewWeakFocusItem): string {
  return item.source === 'performance' ? 'Performance signal' : 'Checkpoint signal';
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-48 rounded-[1.8rem]" />
      <div className="grid gap-6 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-[1.5rem]" />
        ))}
      </div>
      <Skeleton className="h-16 rounded-[1.4rem]" />
      <Skeleton className="h-[36rem] rounded-[1.8rem]" />
    </div>
  );
}

function MiniInsightCard({
  icon,
  label,
  value,
  caption,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  caption: string;
}) {
  return (
    <div className="student-dashboard-mini-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="student-dashboard-mini-card__icon flex items-center justify-center rounded-2xl bg-[var(--student-accent-soft)] text-[var(--student-accent)]">
          {icon}
        </div>
        <div className="text-right">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--student-text-muted)]">
            {label}
          </p>
          <p className="mt-2 text-xl font-black text-[var(--student-text-strong)]">
            {value}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm text-[var(--student-text-muted)]">{caption}</p>
    </div>
  );
}

function AssessmentRow({ item }: { item: LxpOverviewAssessmentItem }) {
  return (
    <Link href={item.href} className="student-dashboard-list-card group">
      <div className="student-dashboard-list-card__icon flex items-center justify-center rounded-2xl text-[var(--student-accent)]">
        <ClipboardList className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-[var(--student-text-strong)]">
          {item.title}
        </p>
        <p className="mt-1 text-xs text-[var(--student-text-muted)]">
          Due {formatDate(item.dueDate)} · Passing {item.passingScore ?? '--'}%
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Badge className="student-badge">+{item.xpAwarded} XP</Badge>
        <ChevronRight className="h-4 w-4 text-[var(--student-text-muted)] transition group-hover:text-[var(--student-accent)]" />
      </div>
    </Link>
  );
}

function CompactEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="student-dashboard-empty student-dashboard-empty--compact">
      <div className="rounded-2xl bg-[var(--student-accent-soft)] p-3 text-[var(--student-accent)]">
        <Sparkles className="h-5 w-5" />
      </div>
      <div>
        <p className="text-base font-black text-[var(--student-text-strong)]">{title}</p>
        <p className="mt-2 text-sm text-[var(--student-text-muted)]">{description}</p>
      </div>
    </div>
  );
}

export default function StudentLxpExperience() {
  const [tab, setTab] = useState<LxpTabKey>('overview');
  const [loadingEligibility, setLoadingEligibility] = useState(true);
  const [loadingExperience, setLoadingExperience] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [eligibleClasses, setEligibleClasses] = useState<EligibleClass[]>([]);
  const [threshold, setThreshold] = useState(74);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [overview, setOverview] = useState<LxpOverviewResponse | null>(null);
  const [playlist, setPlaylist] = useState<PlaylistResponse | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [submittingEval, setSubmittingEval] = useState(false);

  const selectedClass = useMemo(
    () => eligibleClasses.find((entry) => entry.classId === selectedClassId) ?? null,
    [eligibleClasses, selectedClassId],
  );

  const fetchEligibility = useCallback(async (silent = false) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoadingEligibility(true);
      }

      const res = await lxpService.getEligibility();
      const rows = res.data.eligibleClasses ?? [];
      setThreshold(res.data.threshold);
      setEligibleClasses(rows);
      setSelectedClassId((prev) => {
        if (prev && rows.some((item) => item.classId === prev)) return prev;
        return rows[0]?.classId ?? '';
      });
    } catch {
      toast.error('Failed to load your LXP classes.');
      setEligibleClasses([]);
      setSelectedClassId('');
    } finally {
      setLoadingEligibility(false);
      setRefreshing(false);
    }
  }, []);

  const fetchExperience = useCallback(async (classId: string) => {
    if (!classId) {
      setOverview(null);
      setPlaylist(null);
      return;
    }

    try {
      setLoadingExperience(true);
      const [overviewRes, playlistRes] = await Promise.all([
        lxpService.getOverview(classId),
        lxpService.getPlaylist(classId),
      ]);
      setOverview(overviewRes.data);
      setPlaylist(playlistRes.data);
    } catch {
      toast.error('Failed to load the LXP module for this class.');
      setOverview(null);
      setPlaylist(null);
    } finally {
      setLoadingExperience(false);
    }
  }, []);

  useEffect(() => {
    fetchEligibility();
  }, [fetchEligibility]);

  useEffect(() => {
    if (selectedClassId) {
      fetchExperience(selectedClassId);
    }
  }, [fetchExperience, selectedClassId]);

  const handleRefresh = async () => {
    await fetchEligibility(true);
    if (selectedClassId) {
      await fetchExperience(selectedClassId);
    }
  };

  const handleCompleteCheckpoint = async (assignmentId: string) => {
    if (!selectedClassId) return;

    try {
      setCompletingId(assignmentId);
      const res = await lxpService.completeCheckpoint(selectedClassId, assignmentId);
      setPlaylist(res.data);
      const overviewRes = await lxpService.getOverview(selectedClassId);
      setOverview(overviewRes.data);
      toast.success('Checkpoint completed.');
    } catch {
      toast.error('Failed to complete the checkpoint.');
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
      toast.success('LXP feedback submitted.');
      setFeedback('');
    } catch {
      toast.error('Failed to submit LXP feedback.');
    } finally {
      setSubmittingEval(false);
    }
  };

  const assessmentCheckpoints = useMemo(
    () =>
      (playlist?.checkpoints ?? []).filter(
        (checkpoint) => checkpoint.type === 'assessment_retry',
      ),
    [playlist?.checkpoints],
  );

  const lessonCheckpoints = useMemo(
    () =>
      (playlist?.checkpoints ?? []).filter(
        (checkpoint) => checkpoint.type === 'lesson_review',
      ),
    [playlist?.checkpoints],
  );

  if (loadingEligibility || (selectedClassId && loadingExperience && !overview && !playlist)) {
    return <PageSkeleton />;
  }

  if (eligibleClasses.length === 0) {
    return (
      <StudentPageShell
        badge="LXP Mission Control"
        title="LXP"
        description="When a class needs recovery support, this space turns that work into a guided, theme-aware intervention journey."
      >
        <StudentEmptyState
          title="No active LXP classes right now"
          description={`LXP opens when your blended score drops below ${threshold}%. Once a class needs support, your dashboard will surface it here.`}
          icon={<Sparkles className="h-5 w-5" />}
        />
      </StudentPageShell>
    );
  }

  if (!overview || !playlist) {
    return (
      <StudentPageShell
        badge="LXP Mission Control"
        title="LXP"
        description="We could not load the guided intervention view for the selected class."
      >
        <StudentEmptyState
          title="LXP data is temporarily unavailable"
          description="Try refreshing this page. If the problem persists, the selected class may still be synchronizing its latest performance data."
          icon={<AlertTriangle className="h-5 w-5" />}
        />
      </StudentPageShell>
    );
  }

  const statusTone = checkpointTone(overview.interventionStatus.code);

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as LxpTabKey)}>
      <StudentPageShell
        badge="LXP Mission Control"
        title="LXP"
        description={overview.interventionStatus.message}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <TabsList className="student-tab-list h-auto flex-wrap justify-start">
              {TABS.map((entry) => (
                <TabsTrigger
                  key={entry.value}
                  value={entry.value}
                  className="student-tab px-4 py-2.5 text-sm font-bold"
                >
                  {entry.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <select
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
              className="student-input min-w-[240px] rounded-2xl border border-[var(--student-outline)] bg-[var(--student-elevated)] px-3 py-2 text-sm text-[var(--student-text-strong)]"
            >
              {eligibleClasses.map((entry) => (
                <option key={entry.classId} value={entry.classId}>
                  {classLabel(entry)}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl border-[var(--student-outline)] bg-[var(--student-elevated)] text-[var(--student-text-strong)]"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        }
        stats={
          <>
            <StudentPageStat
              label="XP"
              value={overview.progress.xpTotal}
              caption="Recovery points earned"
              icon={Trophy}
              accent="bg-[var(--student-accent-soft)] text-[var(--student-accent)]"
            />
            <StudentPageStat
              label="Stars"
              value={overview.progress.starsTotal.toFixed(2)}
              caption="Converted from XP"
              icon={Star}
              accent="bg-[var(--student-surface-soft)] text-[var(--student-text-strong)]"
            />
            <StudentPageStat
              label="Streak"
              value={`${overview.progress.streakDays} day(s)`}
              caption="Recent consistent activity"
              icon={Flame}
              accent="bg-[var(--student-accent-soft)] text-[var(--student-accent)]"
            />
            <StudentPageStat
              label="Complete"
              value={`${overview.progress.completionPercent}%`}
              caption={`${overview.progress.checkpointsCompleted}/${overview.progress.totalCheckpoints} checkpoints done`}
              icon={Target}
              accent="bg-[var(--student-surface-soft)] text-[var(--student-text-strong)]"
            />
          </>
        }
      >
        <TabsContent value="overview" className="mt-0 space-y-6">
          <StudentSectionCard
            title={`${overview.selectedClass.subjectName} Recovery Snapshot`}
            description="A themed overview of your current intervention status, where you are strongest, and what should happen next."
            action={
              <StudentStatusChip tone={statusTone}>
                {overview.interventionStatus.label}
              </StudentStatusChip>
            }
          >
            <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
              <div className="student-dashboard-progress-card rounded-[1.7rem] p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="student-dashboard-hero-chip">
                      <Sparkles className="h-3.5 w-3.5" />
                      {overview.selectedClass.subjectCode}
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--student-text-muted)]">
                        Selected Class
                      </p>
                      <h3 className="mt-2 text-3xl font-black tracking-tight text-[var(--student-text-strong)]">
                        {overview.selectedClass.subjectName}
                      </h3>
                      <p className="mt-2 text-sm text-[var(--student-text-muted)]">
                        {selectedClass?.class.section?.name ?? overview.selectedClass.section?.name ?? 'Section unavailable'}
                        {' · '}
                        Threshold {overview.interventionStatus.thresholdApplied}%
                      </p>
                    </div>
                  </div>
                  <div className="rounded-[1.4rem] border border-[var(--student-outline)] bg-[var(--student-elevated)] px-4 py-3 text-right">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--student-text-muted)]">
                      Blended Score
                    </p>
                    <p className="mt-2 text-2xl font-black text-[var(--student-text-strong)]">
                      {formatPercent(overview.selectedClass.blendedScore)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--student-text-muted)]">
                      Last sync {formatDateTime(overview.selectedClass.lastComputedAt)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  <div className="flex items-center justify-between text-sm font-semibold text-[var(--student-text-muted)]">
                    <span>Checkpoint completion</span>
                    <span>{overview.progress.completionPercent}%</span>
                  </div>
                  <Progress
                    value={overview.progress.completionPercent}
                    className="student-progress-track h-3"
                    indicatorClassName="student-progress-fill"
                  />
                  <p className="text-sm text-[var(--student-text-muted)]">
                    {overview.interventionStatus.message}
                  </p>
                </div>

                {overview.recommendedAction ? (
                  <div className="mt-6 student-dashboard-task-card rounded-[1.5rem]">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--student-accent)]">
                          Recommended Next Action
                        </p>
                        <h4 className="text-lg font-black text-[var(--student-text-strong)]">
                          {overview.recommendedAction.title}
                        </h4>
                        <p className="text-sm text-[var(--student-text-muted)]">
                          {overview.recommendedAction.subtitle}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Badge className="student-badge">+{overview.recommendedAction.xpAwarded} XP</Badge>
                        {overview.recommendedAction.href ? (
                          <Button asChild className="rounded-2xl">
                            <Link href={overview.recommendedAction.href}>
                              Open
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4">
                <MiniInsightCard
                  icon={<Clock3 className="h-4 w-4" />}
                  label="Opened"
                  value={formatDate(overview.interventionStatus.openedAt)}
                  caption="When this intervention track started"
                />
                <MiniInsightCard
                  icon={<Trophy className="h-4 w-4" />}
                  label="Trigger Score"
                  value={formatPercent(overview.interventionStatus.triggerScore)}
                  caption="The blended score that opened recovery"
                />
                <MiniInsightCard
                  icon={<Flame className="h-4 w-4" />}
                  label="Last Activity"
                  value={timeAgo(overview.progress.lastActivityAt)}
                  caption="Most recent LXP activity"
                />
              </div>
            </div>
          </StudentSectionCard>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <StudentSectionCard
              title="Subject Mastery"
              description="Closest available performance signals across your enrolled classes."
            >
              <div className="space-y-3">
                {overview.subjectMastery.map((row) => (
                  <div key={row.classId} className="student-dashboard-list-card">
                    <div className="student-dashboard-list-card__icon flex items-center justify-center rounded-2xl text-[var(--student-accent)]">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-black text-[var(--student-text-strong)]">
                          {row.subjectName}
                        </p>
                        <StudentStatusChip tone={masteryTone(row.status)}>
                          {row.status === 'on_track'
                            ? 'On track'
                            : row.status === 'improving'
                              ? 'Improving'
                              : 'Needs support'}
                        </StudentStatusChip>
                      </div>
                      <p className="mt-1 text-xs text-[var(--student-text-muted)]">
                        {row.subjectCode} · Threshold {row.thresholdApplied}%
                      </p>
                      <div className="mt-3">
                        <div className="student-dashboard-meter student-dashboard-meter--compact">
                          <div
                            className="student-dashboard-meter__fill"
                            style={{ width: `${Math.max(8, row.masteryPercent ?? 0)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-[var(--student-text-strong)]">
                        {formatPercent(row.masteryPercent)}
                      </p>
                      <p className="text-xs text-[var(--student-text-muted)]">
                        {row.isSelected ? 'Selected' : 'Class'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </StudentSectionCard>

            <StudentSectionCard
              title="Topics To Level Up"
              description="Placeholder focus items derived from the closest backend signals we already have."
            >
              <div className="space-y-3">
                {overview.weakFocusItems.length === 0 ? (
                  <CompactEmptyState
                    title="No weak-focus items right now"
                    description="Once your performance sync finds a subject or checkpoint below the target, it will appear here."
                  />
                ) : (
                  overview.weakFocusItems.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="student-dashboard-list-card group"
                    >
                      <div className="student-dashboard-list-card__icon flex items-center justify-center rounded-2xl text-[var(--student-accent)]">
                        <Target className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-[var(--student-text-strong)]">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs text-[var(--student-text-muted)]">
                          {item.subtitle}
                        </p>
                        <p className="mt-2 text-[11px] font-black uppercase tracking-[0.24em] text-[var(--student-accent)]">
                          {weakFocusLabel(item)}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[var(--student-text-muted)] transition group-hover:text-[var(--student-accent)]" />
                    </Link>
                  ))
                )}
              </div>
            </StudentSectionCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <StudentSectionCard
              title="Upcoming Assessments"
              description="Assessment retry checkpoints surfaced from your current intervention playlist."
            >
              <div className="space-y-3">
                {overview.upcomingAssessments.length === 0 ? (
                  <CompactEmptyState
                    title="No retry assessments queued"
                    description="Your current intervention work is focused on lesson review or already completed retries."
                  />
                ) : (
                  overview.upcomingAssessments.map((item) => (
                    <AssessmentRow key={item.assignmentId} item={item} />
                  ))
                )}
              </div>
            </StudentSectionCard>

            <StudentSectionCard
              title="Recent Activity"
              description="The latest intervention events and completed checkpoints tied to this class."
            >
              <div className="space-y-3">
                {overview.recentActivity.length === 0 ? (
                  <CompactEmptyState
                    title="No recent activity yet"
                    description="Your intervention timeline will start filling in as soon as you complete checkpoints."
                  />
                ) : (
                  overview.recentActivity.map((item) => (
                    <div key={item.id} className="student-dashboard-list-card">
                      <div className="student-dashboard-list-card__icon flex items-center justify-center rounded-2xl text-[var(--student-accent)]">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-[var(--student-text-strong)]">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs text-[var(--student-text-muted)]">
                          {item.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-[var(--student-text-muted)]">
                          {timeAgo(item.occurredAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </StudentSectionCard>
          </div>
        </TabsContent>
        <TabsContent value="roadmap" className="mt-0">
          <StudentSectionCard
            title="Recovery Roadmap"
            description="A step-by-step view of the lesson reviews and assessment retries assigned to your current intervention case."
            action={
              <Badge className="student-badge">
                {playlist.progress.checkpointsCompleted}/{playlist.checkpoints.length} completed
              </Badge>
            }
          >
            <div className="space-y-4">
              {playlist.checkpoints.length === 0 ? (
                <StudentEmptyState
                  title="No checkpoints assigned yet"
                  description="Your teacher has not assigned intervention checkpoints for this class yet."
                  icon={<Map className="h-5 w-5" />}
                />
              ) : (
                playlist.checkpoints.map((checkpoint, index) => (
                  <div
                    key={checkpoint.id}
                    className="student-panel student-panel-hover rounded-[1.6rem] border border-[var(--student-outline)] bg-[var(--student-elevated)] p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="student-badge">Step {index + 1}</Badge>
                          <StudentStatusChip tone={checkpoint.isCompleted ? 'success' : 'warning'}>
                            {checkpoint.isCompleted ? 'Completed' : 'In progress'}
                          </StudentStatusChip>
                        </div>
                        <h3 className="text-lg font-black text-[var(--student-text-strong)]">
                          {checkpoint.label}
                        </h3>
                        <p className="max-w-3xl text-sm text-[var(--student-text-muted)]">
                          {checkpointSummary(checkpoint)}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Badge className="student-badge">
                            {checkpoint.type === 'lesson_review' ? 'Lesson Review' : 'Assessment Retry'}
                          </Badge>
                          <Badge className="student-badge">+{checkpoint.xpAwarded} XP</Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button asChild variant="outline" className="rounded-2xl">
                          <Link href={checkpointHref(checkpoint)}>Open</Link>
                        </Button>
                        <Button
                          type="button"
                          className="rounded-2xl"
                          onClick={() => handleCompleteCheckpoint(checkpoint.id)}
                          disabled={checkpoint.isCompleted || completingId === checkpoint.id}
                        >
                          {checkpoint.isCompleted
                            ? 'Completed'
                            : completingId === checkpoint.id
                              ? 'Saving...'
                              : 'Mark Complete'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </StudentSectionCard>
        </TabsContent>

        <TabsContent value="assessments" className="mt-0">
          <StudentSectionCard
            title="Assessment Retry Queue"
            description="Assessment checkpoints pulled from your active intervention playlist, with due dates when the backend has them."
          >
            <div className="space-y-4">
              {assessmentCheckpoints.length === 0 ? (
                <StudentEmptyState
                  title="No assessment retries right now"
                  description="Your current recovery plan is focused on lessons, or you have already finished the required retry checkpoints."
                  icon={<ClipboardList className="h-5 w-5" />}
                />
              ) : (
                assessmentCheckpoints.map((checkpoint) => (
                  <div
                    key={checkpoint.id}
                    className="student-dashboard-task-card rounded-[1.5rem]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <Badge className="student-badge">
                            {checkpoint.assessment?.type ?? 'assessment'}
                          </Badge>
                          <Badge className="student-badge">+{checkpoint.xpAwarded} XP</Badge>
                        </div>
                        <h3 className="text-lg font-black text-[var(--student-text-strong)]">
                          {checkpoint.assessment?.title ?? checkpoint.label}
                        </h3>
                        <p className="text-sm text-[var(--student-text-muted)]">
                          {checkpointSummary(checkpoint)}
                        </p>
                        <div className="flex flex-wrap gap-3 text-xs font-semibold text-[var(--student-text-muted)]">
                          <span className="student-dashboard-task-date">
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatDate(checkpoint.assessment?.dueDate ?? null)}
                          </span>
                          <span className="student-dashboard-task-date">
                            Passing {checkpoint.assessment?.passingScore ?? '--'}%
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button asChild variant="outline" className="rounded-2xl">
                          <Link href={checkpointHref(checkpoint)}>Open Assessment</Link>
                        </Button>
                        <Button
                          type="button"
                          className="rounded-2xl"
                          onClick={() => handleCompleteCheckpoint(checkpoint.id)}
                          disabled={checkpoint.isCompleted || completingId === checkpoint.id}
                        >
                          {checkpoint.isCompleted
                            ? 'Completed'
                            : completingId === checkpoint.id
                              ? 'Saving...'
                              : 'Mark Complete'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </StudentSectionCard>
        </TabsContent>

        <TabsContent value="interventions" className="mt-0">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <StudentSectionCard
              title="Intervention Status"
              description="This tab keeps the operational details of your current recovery case visible without leaving the LXP page."
            >
              <div className="space-y-4">
                <div className="student-dashboard-task-card rounded-[1.5rem]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--student-accent)]">
                        Current Case
                      </p>
                      <h3 className="mt-2 text-xl font-black text-[var(--student-text-strong)]">
                        {overview.interventionStatus.label}
                      </h3>
                      <p className="mt-2 text-sm text-[var(--student-text-muted)]">
                        Trigger score {formatPercent(overview.interventionStatus.triggerScore)} · Opened{' '}
                        {formatDateTime(overview.interventionStatus.openedAt)}
                      </p>
                    </div>
                    <StudentStatusChip tone={statusTone}>
                      {overview.interventionStatus.status}
                    </StudentStatusChip>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <MiniInsightCard
                    icon={<Target className="h-4 w-4" />}
                    label="Threshold"
                    value={`${overview.interventionStatus.thresholdApplied}%`}
                    caption="Target to exit intervention"
                  />
                  <MiniInsightCard
                    icon={<BookOpen className="h-4 w-4" />}
                    label="Lesson Reviews"
                    value={lessonCheckpoints.length}
                    caption="Recovery lessons assigned"
                  />
                  <MiniInsightCard
                    icon={<ClipboardList className="h-4 w-4" />}
                    label="Assessment Retries"
                    value={assessmentCheckpoints.length}
                    caption="Assessment retries assigned"
                  />
                </div>

                <div className="rounded-[1.5rem] border border-[var(--student-outline)] bg-[var(--student-surface-soft)] p-5">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--student-text-muted)]">
                    Why this looks different from the Figma
                  </p>
                  <p className="mt-3 text-sm leading-6 text-[var(--student-text-muted)]">
                    Topic-level mastery is not stored in the backend yet, so this view uses your blended performance and assigned checkpoints as the closest support signal. That keeps the page honest to the live data your system already owns.
                  </p>
                </div>
              </div>
            </StudentSectionCard>

            <StudentSectionCard
              title="Focus Queue"
              description="The strongest signals that still need attention in this class."
            >
              <div className="space-y-3">
                {overview.weakFocusItems.length === 0 ? (
                  <CompactEmptyState
                    title="Nothing queued"
                    description="You have no weak-focus placeholders for this class right now."
                  />
                ) : (
                  overview.weakFocusItems.map((item) => (
                    <Link key={item.id} href={item.href} className="student-dashboard-list-card">
                      <div className="student-dashboard-list-card__icon flex items-center justify-center rounded-2xl text-[var(--student-accent)]">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-[var(--student-text-strong)]">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs text-[var(--student-text-muted)]">
                          {item.subtitle}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[var(--student-text-muted)]" />
                    </Link>
                  ))
                )}
              </div>
            </StudentSectionCard>
          </div>
        </TabsContent>

        <TabsContent value="ai-tutor" className="mt-0">
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <StudentSectionCard
              title="AI Tutor Gateway"
              description="The AI Tutor stays on its existing route. This tab gives LXP students a themed jump-off point into that experience."
            >
              <div className="student-dashboard-progress-card rounded-[1.7rem] p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="student-dashboard-hero-chip">
                      <Bot className="h-3.5 w-3.5" />
                      JAKIPIR Support
                    </div>
                    <h3 className="text-3xl font-black tracking-tight text-[var(--student-text-strong)]">
                      Ask for guided help without leaving your recovery flow
                    </h3>
                    <p className="max-w-2xl text-sm leading-6 text-[var(--student-text-muted)]">
                      Use the chatbot when you want a simplified explanation, a study walkthrough, or a confidence check before returning to your next checkpoint.
                    </p>
                  </div>
                  <Button asChild className="rounded-2xl">
                    <Link href="/dashboard/student/chatbot">
                      Open AI Tutor
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <MiniInsightCard
                    icon={<BrainCircuit className="h-4 w-4" />}
                    label="Use It For"
                    value="Explanations"
                    caption="Clarify the checkpoint you are on"
                  />
                  <MiniInsightCard
                    icon={<BookOpen className="h-4 w-4" />}
                    label="Best Paired With"
                    value="Roadmap"
                    caption="Ask after opening a lesson checkpoint"
                  />
                  <MiniInsightCard
                    icon={<Sparkles className="h-4 w-4" />}
                    label="Theme Aware"
                    value="Yes"
                    caption="Matches your current student theme"
                  />
                </div>
              </div>
            </StudentSectionCard>

            <StudentSectionCard
              title="LXP Feedback"
              description="The previous page allowed direct LXP feedback submission. That behavior stays here so the redesign does not remove it."
            >
              <div className="space-y-4">
                <div className="rounded-[1.5rem] border border-[var(--student-outline)] bg-[var(--student-elevated)] p-5">
                  <p className="text-sm font-semibold text-[var(--student-text-strong)]">
                    What is working well in this LXP experience?
                  </p>
                  <p className="mt-1 text-sm text-[var(--student-text-muted)]">
                    Share friction points, missing data, or parts of the intervention flow that still feel unclear.
                  </p>
                </div>
                <Textarea
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                  placeholder="Example: the roadmap looks good, but I still need more context on why a specific checkpoint was assigned."
                  className="min-h-40 rounded-[1.4rem] border-[var(--student-outline)] bg-[var(--student-elevated)] text-[var(--student-text-strong)]"
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    className="rounded-2xl"
                    onClick={submitEvaluation}
                    disabled={submittingEval}
                  >
                    <MessageSquareText className="mr-2 h-4 w-4" />
                    {submittingEval ? 'Submitting...' : 'Submit Feedback'}
                  </Button>
                </div>
              </div>
            </StudentSectionCard>
          </div>
        </TabsContent>
      </StudentPageShell>
    </Tabs>
  );
}
