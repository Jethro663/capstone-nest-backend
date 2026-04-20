'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Award,
  CalendarDays,
  Crown,
  ExternalLink,
  Flame,
  Sparkles,
  Star,
  Target,
  Trophy,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { lxpService } from '@/services/lxp-service';
import type { ClassItem } from '@/types/class';
import type { LxpClassReport, TeacherInterventionQueueResponse } from '@/types/lxp';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  TeacherEmptyState,
  TeacherPageShell,
  TeacherSectionCard,
  TeacherStatCard,
} from '@/components/teacher/TeacherPageShell';
import { toast } from 'sonner';

const LEADERBOARD_SCOPE_OPTIONS = [
  { key: 'xp', label: 'XP', icon: Flame, suffix: 'XP', description: 'XP earned from interventions' },
  { key: 'streak', label: 'Streak', icon: Star, suffix: 'day streak', description: 'Consecutive activity streak' },
  {
    key: 'checkpoints',
    label: 'Checkpoints',
    icon: Trophy,
    suffix: 'checkpoints',
    description: 'Completed learning checkpoints',
  },
] as const;

const LEADERBOARD_TIER_ICONS = {
  champion: Crown,
  challenger: Award,
  riser: TrendingUp,
  contender: Target,
} as const;

type LeaderboardScope = (typeof LEADERBOARD_SCOPE_OPTIONS)[number]['key'];
type LeaderboardTier = keyof typeof LEADERBOARD_TIER_ICONS;

function studentName(entry: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string {
  const first = entry.firstName?.trim() ?? '';
  const last = entry.lastName?.trim() ?? '';
  if (first && last) return `${last}, ${first}`;
  if (last) return last;
  if (first) return first;
  return entry.email ?? 'Unknown student';
}

function studentInitials(entry?: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
} | null): string {
  const first = entry?.firstName?.trim()?.[0] ?? '';
  const last = entry?.lastName?.trim()?.[0] ?? '';
  if (first || last) return `${first}${last}`.toUpperCase();
  if (entry?.email?.trim()) return entry.email.trim().slice(0, 2).toUpperCase();
  return 'ST';
}

function formatShortDate(value?: string | null): string {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getCaseSeverity(triggerScore: number | null, threshold: number | null) {
  if (triggerScore === null || triggerScore === undefined) {
    return { label: 'Monitoring', tone: 'monitoring' as const };
  }
  if (threshold === null || threshold === undefined) {
    if (triggerScore <= 45) return { label: 'Critical', tone: 'critical' as const };
    if (triggerScore <= 65) return { label: 'Needs Focus', tone: 'focus' as const };
    return { label: 'Monitoring', tone: 'monitoring' as const };
  }
  const gap = threshold - triggerScore;
  if (gap >= 15) return { label: 'Critical', tone: 'critical' as const };
  if (gap >= 5) return { label: 'Needs Focus', tone: 'focus' as const };
  return { label: 'Monitoring', tone: 'monitoring' as const };
}

type LeaderboardScoreRow = LxpClassReport['leaderboard'][number] & {
  score: number;
  scoreLabel: string;
  scoreHint: string;
  scorePercent: number;
  leaderDistanceLabel: string;
  tier: LeaderboardTier;
};

export default function TeacherInterventionsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [queue, setQueue] = useState<TeacherInterventionQueueResponse | null>(null);
  const [report, setReport] = useState<LxpClassReport | null>(null);
  const [resolvingCaseId, setResolvingCaseId] = useState<string | null>(null);
  const [activatingCaseId, setActivatingCaseId] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedCaseDetail, setSelectedCaseDetail] = useState<
    Awaited<ReturnType<typeof lxpService.getTeacherCaseDetail>>['data'] | null
  >(null);
  const [leaderboardScope, setLeaderboardScope] = useState<LeaderboardScope>('xp');
  const [leaderboardExpanded, setLeaderboardExpanded] = useState(false);
  const [highlightedLeaderboardStudentId, setHighlightedLeaderboardStudentId] = useState<string | null>(null);

  const selectedClass = useMemo(
    () => classes.find((entry) => entry.id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );
  const thresholdLabel = report?.threshold ?? queue?.threshold ?? null;
  const queueEntries = useMemo(() => queue?.queue ?? [], [queue]);
  const leaderboardRows = useMemo(() => report?.leaderboard ?? [], [report]);
  const leaderboardRowsByScope = useMemo(() => {
    const activeScope = leaderboardScope;
    const mapped = leaderboardRows.map((entry) => {
      const score =
        activeScope === 'streak'
          ? entry.streakDays
          : activeScope === 'checkpoints'
            ? entry.checkpointsCompleted
            : entry.xpTotal;
      const scoreHint =
        activeScope === 'xp'
          ? `${entry.starsTotal} stars`
          : activeScope === 'streak'
            ? `${entry.xpTotal} XP total`
            : `${entry.xpTotal} XP total`;
      const scoreLabel =
        activeScope === 'streak'
          ? `${entry.streakDays} day streak`
          : activeScope === 'checkpoints'
            ? `${entry.checkpointsCompleted} checkpoints`
            : `${entry.xpTotal} XP`;
      return {
        ...entry,
        score,
        scoreLabel,
        scoreHint,
      };
    });
    const sortedRows = mapped
      .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
    const maxScore = sortedRows.reduce((top, entry) => Math.max(top, entry.score ?? 0), 0);
    return sortedRows.map((entry) => {
      const isLeader = entry.rank === 1;
      const distance = maxScore > 0 ? Math.max(Math.max(0, maxScore - entry.score), 0) : 0;
      const leaderDistanceLabel = isLeader
        ? 'Top learner for selected metric'
        : `${distance} ${activeScope === 'xp' ? 'XP' : activeScope === 'streak' ? 'days' : 'checkpoints'} behind #1`;
      const tier: LeaderboardTier = isLeader
        ? 'champion'
        : entry.rank === 2
          ? 'challenger'
          : entry.rank === 3
            ? 'riser'
            : 'contender';
      return {
        ...entry,
        scorePercent: maxScore > 0 ? Math.round((entry.score / maxScore) * 100) : 0,
        leaderDistanceLabel,
        tier,
      };
    });
  }, [leaderboardRows, leaderboardScope]);
  const activeLeaderboardRows = leaderboardExpanded
    ? leaderboardRowsByScope
    : leaderboardRowsByScope.slice(0, 5);
  const leaderboardMode = useMemo(() => {
    return LEADERBOARD_SCOPE_OPTIONS.find((entry) => entry.key === leaderboardScope) ?? LEADERBOARD_SCOPE_OPTIONS[0];
  }, [leaderboardScope]);
  const queueCaseByStudent = useMemo(() => {
    const map = new Map<string, string>();
    queueEntries.forEach((entry) => {
      map.set(entry.student?.id ?? entry.studentId, entry.id);
    });
    return map;
  }, [queueEntries]);
  const highestPriorityCase = useMemo(() => {
    return queueEntries.reduce<(typeof queueEntries)[number] | null>((current, entry) => {
      if (!current) return entry;
      const currentScore = current.triggerScore ?? 100;
      const nextScore = entry.triggerScore ?? 100;
      return nextScore < currentScore ? entry : current;
    }, null);
  }, [queueEntries]);
  const highestDeltaCase = useMemo(() => {
    const rows = (report?.rows ?? []).filter(
      (row) => row.improvementDelta !== null && row.improvementDelta !== undefined,
    );
    if (rows.length === 0) return null;
    return [...rows].sort(
      (left, right) => (right.improvementDelta ?? -Infinity) - (left.improvementDelta ?? -Infinity),
    )[0];
  }, [report?.rows]);
  const handleScrollToArchives = () => {
    if (typeof window === 'undefined') return;
    const target = window.document.getElementById('intervention-archives');
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const fetchClassList = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoadingClasses(true);
      const response = await classService.getByTeacher(user.id);
      const rows = response.data ?? [];
      setClasses(rows);
      setSelectedClassId((current) => current || rows[0]?.id || '');
    } catch {
      toast.error('Failed to load classes');
    } finally {
      setLoadingClasses(false);
    }
  }, [user?.id]);

  const fetchInterventionData = useCallback(async () => {
    if (!selectedClassId) {
      setQueue(null);
      setReport(null);
      return;
    }
    try {
      setLoadingData(true);
      const [queueRes, reportRes] = await Promise.all([
        lxpService.getTeacherQueue(selectedClassId),
        lxpService.getClassReport(selectedClassId),
      ]);
      setQueue(queueRes.data);
      setReport(reportRes.data);
    } catch {
      toast.error('Failed to load intervention data');
      setQueue(null);
      setReport(null);
    } finally {
      setLoadingData(false);
    }
  }, [selectedClassId]);

  useEffect(() => {
    fetchClassList();
  }, [fetchClassList]);

  useEffect(() => {
    fetchInterventionData();
  }, [fetchInterventionData]);

  const handleResolve = async (caseId: string) => {
    try {
      setResolvingCaseId(caseId);
      await lxpService.resolveIntervention(caseId, 'Resolved by teacher queue');
      toast.success('Intervention case resolved');
      await fetchInterventionData();
    } catch {
      toast.error('Failed to resolve intervention case');
    } finally {
      setResolvingCaseId(null);
    }
  };

  const handleRecommend = (caseId: string) => {
    const target = selectedClassId
      ? `/dashboard/teacher/interventions/${caseId}?classId=${selectedClassId}`
      : `/dashboard/teacher/interventions/${caseId}`;
    router.push(target);
  };

  const handleOpenDetail = async (caseId: string) => {
    setDetailOpen(true);
    setSelectedCaseId(caseId);
    setLoadingDetail(true);
    try {
      const detailRes = await lxpService.getTeacherCaseDetail(caseId);
      setSelectedCaseDetail(detailRes.data);
    } catch {
      toast.error('Failed to load intervention case detail');
      setSelectedCaseDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOpenPerformance = () => {
    if (!selectedCaseDetail?.links.performancePage) return;
    router.push(selectedCaseDetail.links.performancePage);
  };

  const handleActivate = async (caseId: string) => {
    try {
      setActivatingCaseId(caseId);
      await lxpService.activateIntervention(caseId);
      toast.success('Intervention case activated');
      await fetchInterventionData();
    } catch {
      toast.error('Failed to activate intervention case');
    } finally {
      setActivatingCaseId(null);
    }
  };

  const handleLeaderboardProfile = (row: LeaderboardScoreRow) => {
    const queueCaseId = queueCaseByStudent.get(row.studentId);
    setHighlightedLeaderboardStudentId(row.studentId);
    if (!queueCaseId) {
      toast.info(`${studentName(row.student ?? {})} has no active intervention case to open.`);
      return;
    }
    void handleOpenDetail(queueCaseId);
  };

  if (loadingClasses) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-[15px]" />
        <Skeleton className="h-24 rounded-[15px]" />
        <Skeleton className="h-[34rem] rounded-[15px]" />
      </div>
    );
  }

  return (
    <TeacherPageShell
      badge="Scholastic Oversight"
      title="Interventions"
      description={
        thresholdLabel !== null
          ? `AI-assisted support for active cohorts. Current trigger threshold: ${thresholdLabel}%.`
          : 'AI-assisted management of student development paths across active cohorts.'
      }
      className="teacher-interventions-page"
      actions={
        <select
          value={selectedClassId}
          onChange={(event) => setSelectedClassId(event.target.value)}
          className="teacher-select teacher-interventions-page__class-select min-w-[260px] text-sm"
        >
          <option value="">Select class...</option>
          {classes.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.subjectName} ({entry.subjectCode}) - {entry.section?.name}
            </option>
          ))}
        </select>
      }
      stats={
        <>
          <TeacherStatCard
            label="Active Cases"
            value={report?.summary.activeCases ?? 0}
            caption={
              selectedClass?.subjectCode
                ? `${selectedClass.subjectCode} students currently in focus`
                : 'Select a class to load live queues'
            }
            icon={Target}
            accent="rose"
          />
          <TeacherStatCard
            label="Completed Cases"
            value={report?.summary.completedCases ?? 0}
            caption="Resolved support pathways this cycle"
            icon={Sparkles}
            accent="teal"
          />
          <TeacherStatCard
            label="Average Delta"
            value={
              report?.summary.averageDelta !== null &&
              report?.summary.averageDelta !== undefined
                ? `${report.summary.averageDelta.toFixed(2)}%`
                : '--'
            }
            caption="Average blended-score lift after intervention"
            icon={Trophy}
            accent="amber"
          />
          <TeacherStatCard
            label="Top XP"
            value={leaderboardRows[0]?.xpTotal ?? 0}
            caption="Highest intervention engagement XP"
            icon={Flame}
            accent="sky"
          />
        </>
      }
    >
      {!selectedClassId ? (
        <TeacherSectionCard
          title="Pick a class first"
          description="Select a class to load queue and intervention outcomes."
          className="teacher-figma-stagger"
        >
          <TeacherEmptyState
            title="No class selected yet"
            description="Choose one class from the selector to review intervention queues."
          />
        </TeacherSectionCard>
      ) : null}

      {selectedClassId && loadingData ? (
        <div className="space-y-4">
          <Skeleton className="h-[20rem] rounded-[15px]" />
          <Skeleton className="h-[20rem] rounded-[15px]" />
        </div>
      ) : null}

      {selectedClassId && !loadingData ? (
        <>
          <div className="teacher-interventions-page__layout teacher-figma-stagger">
            <TeacherSectionCard
              title="Priority Intervention Queue"
              description="Take action on at-risk learners without leaving the queue."
              className="teacher-interventions-page__queue-card"
              contentClassName="teacher-interventions-page__queue-content"
              action={
                <button
                  type="button"
                  className="teacher-interventions-page__queue-link"
                  onClick={handleScrollToArchives}
                >
                  View All Archives
                </button>
              }
            >
              {queueEntries.length === 0 ? (
                <TeacherEmptyState
                  title="No active intervention cases"
                  description="New at-risk learners will appear here when trigger thresholds are crossed."
                />
              ) : (
                <div className="teacher-interventions-queue">
                  {queueEntries.map((entry) => {
                    const severity = getCaseSeverity(entry.triggerScore, thresholdLabel);
                    return (
                      <article
                        key={entry.id}
                        className={`teacher-interventions-case teacher-panel-hover ${entry.status === 'active' ? 'is-active' : ''}`}
                      >
                        <div className="teacher-interventions-case__head">
                          <div className="teacher-interventions-case__identity">
                            <div className="teacher-interventions-case__avatar">
                              {studentInitials(entry.student)}
                            </div>
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => void handleOpenDetail(entry.id)}
                                className="teacher-interventions-case__name"
                              >
                                {studentName(entry.student ?? {})}
                              </button>
                              <div className="teacher-interventions-case__chips">
                                <span className={`teacher-interventions-case__risk is-${severity.tone}`}>
                                  {severity.label}
                                </span>
                                <Badge
                                  className={
                                    entry.status === 'pending'
                                      ? 'teacher-badge-success border-0'
                                      : 'teacher-badge-danger border-0'
                                  }
                                >
                                  {entry.status}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div className="teacher-interventions-case__actions">
                            {entry.aiPlanEligible ? (
                              <Button
                                size="sm"
                                variant="teacher"
                                className="rounded-lg"
                                onClick={() => handleRecommend(entry.id)}
                              >
                                AI Plan
                              </Button>
                            ) : null}
                            {entry.status === 'pending' ? (
                              <Button
                                size="sm"
                                variant="teacherOutline"
                                className="rounded-lg"
                                disabled={activatingCaseId === entry.id}
                                onClick={() => handleActivate(entry.id)}
                              >
                                {activatingCaseId === entry.id ? 'Activating...' : 'Activate'}
                              </Button>
                            ) : null}
                            <Button
                              size="sm"
                              variant="teacherOutline"
                              className="rounded-lg"
                              onClick={() => void handleOpenDetail(entry.id)}
                            >
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="teacherOutline"
                              className="rounded-lg"
                              disabled={resolvingCaseId === entry.id}
                              onClick={() => handleResolve(entry.id)}
                            >
                              {resolvingCaseId === entry.id ? 'Resolving...' : 'Resolve'}
                            </Button>
                          </div>
                        </div>

                        <p className="teacher-interventions-case__summary">
                          Trigger {entry.triggerScore !== null ? `${entry.triggerScore.toFixed(1)}%` : '--'} vs
                          threshold {entry.thresholdApplied.toFixed(1)}%. Latest blended score:{' '}
                          {entry.latestBlendedScore !== null ? `${entry.latestBlendedScore.toFixed(1)}%` : '--'}.
                        </p>

                        <div className="teacher-interventions-case__progress">
                          <Progress
                            value={entry.completionPercent}
                            className="teacher-progress-track h-2.5"
                            indicatorClassName="teacher-progress-fill"
                          />
                          <div className="teacher-interventions-case__meta">
                            <span>
                              <CalendarDays className="h-3.5 w-3.5" />
                              {formatShortDate(entry.openedAt)}
                            </span>
                            <span>
                              {entry.completedCheckpoints}/{entry.totalCheckpoints} checkpoints
                            </span>
                            <span>{entry.progress.xpTotal} XP</span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </TeacherSectionCard>

            <div className="teacher-interventions-page__side-rail">
              <TeacherSectionCard title="Queue Snapshot" className="teacher-interventions-page__side-card">
                <div className="teacher-interventions-summary">
                  <div className="teacher-interventions-summary__row">
                    <span>Threshold</span>
                    <strong>{thresholdLabel !== null ? `${thresholdLabel}%` : '--'}</strong>
                  </div>
                  <div className="teacher-interventions-summary__row">
                    <span>Total Cases</span>
                    <strong>{report?.summary.totalCases ?? 0}</strong>
                  </div>
                  <div className="teacher-interventions-summary__row">
                    <span>Pending Cases</span>
                    <strong>{report?.summary.pendingCases ?? 0}</strong>
                  </div>
                  <div className="teacher-interventions-summary__row">
                    <span>Participation</span>
                    <strong>{report?.summary.interventionParticipation ?? 0}</strong>
                  </div>
                </div>
              </TeacherSectionCard>

              <TeacherSectionCard
                title="XP Leaderboard"
                description="Track learner momentum and jump into active intervention cases."
                className="teacher-interventions-page__side-card"
              >
                {leaderboardRows.length === 0 ? (
                  <TeacherEmptyState
                    title="No XP records yet"
                    description="Leaderboard appears after learners complete assigned activities."
                  />
                ) : (
                  <>
                    <div className="teacher-interventions-leaderboard__toolbar">
                      {LEADERBOARD_SCOPE_OPTIONS.map((mode) => {
                        const Icon = mode.icon;
                        return (
                          <button
                            key={mode.key}
                            type="button"
                            className={`teacher-interventions-leaderboard__toggle ${leaderboardScope === mode.key ? 'is-active' : ''}`}
                            onClick={() => setLeaderboardScope(mode.key)}
                          >
                            <Icon className="teacher-interventions-leaderboard__toggle-icon" />
                            <span>{mode.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="teacher-interventions-leaderboard__mode-copy">{leaderboardMode.description}</p>
                      <div className="teacher-interventions-leaderboard">
                      {activeLeaderboardRows.map((row) => {
                        const caseInQueue = queueCaseByStudent.get(row.studentId);
                        const TierIcon = LEADERBOARD_TIER_ICONS[row.tier];
                        const isTopTier = row.rank === 1;
                        const isHighlighted = row.studentId === highlightedLeaderboardStudentId;
                        const isActiveInQueue = Boolean(caseInQueue);
                        const tierClass = row.tier === 'champion'
                          ? 'is-champion'
                          : row.tier === 'challenger'
                            ? 'is-challenger'
                            : row.tier === 'riser'
                              ? 'is-riser'
                              : 'is-contender';
                        return (
                          <button
                            key={row.studentId}
                            type="button"
                            className={`teacher-interventions-leaderboard__row ${tierClass} ${isActiveInQueue ? 'is-active' : 'is-idle'} ${isHighlighted ? 'is-highlighted' : ''}`}
                            onClick={() => handleLeaderboardProfile(row)}
                            title={isActiveInQueue ? 'Open intervention case' : 'No active intervention case'}
                          >
                            <span className={`teacher-interventions-leaderboard__rank ${isTopTier ? 'is-leading' : ''}`}>
                              <TierIcon className="teacher-interventions-leaderboard__rank-icon" />
                              <span>{row.rank}</span>
                            </span>
                            <div className="teacher-interventions-leaderboard__name-wrap">
                              <span className="teacher-interventions-leaderboard__name">
                                {studentName(row.student ?? {})}
                              </span>
                              <span className="teacher-interventions-leaderboard__meta">
                                {isActiveInQueue ? 'Active intervention case' : 'No active case'} •{' '}
                                {row.lastActivityAt ? formatShortDate(row.lastActivityAt) : 'No activity yet'}
                              </span>
                            </div>
                            <div className="teacher-interventions-leaderboard__value-wrap">
                              <div className="teacher-interventions-leaderboard__value-row">
                                <span className="teacher-interventions-leaderboard__value">{row.scoreLabel}</span>
                                <span className="teacher-interventions-leaderboard__value-meta">{row.scoreHint}</span>
                              </div>
                              <Progress
                                value={row.scorePercent}
                                className="teacher-leaderboard-progress-track h-1.8"
                                indicatorClassName="teacher-leaderboard-progress-fill"
                              />
                              <span className="teacher-interventions-leaderboard__meta">{row.leaderDistanceLabel}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {leaderboardRowsByScope.length > 5 ? (
                      <button
                        type="button"
                        className="teacher-interventions-leaderboard__show-more"
                        onClick={() => setLeaderboardExpanded((previous) => !previous)}
                      >
                        {leaderboardExpanded ? 'Show top 5 only' : 'Show more movers'}
                      </button>
                    ) : null}
                  </>
                )}
              </TeacherSectionCard>

              <TeacherSectionCard
                title="Insight of the Week"
                description="A quick coaching signal based on live intervention data."
                className="teacher-interventions-page__side-card"
              >
                <div className="teacher-interventions-insight">
                  <p>
                    {highestPriorityCase
                      ? `${studentName(highestPriorityCase.student ?? {})} currently has the strongest priority signal (${highestPriorityCase.triggerScore?.toFixed(1) ?? '--'}%).`
                      : 'No high-priority case detected yet for this class.'}
                  </p>
                  <p>
                    {highestDeltaCase
                      ? `${studentName(highestDeltaCase.student ?? {})} has the highest improvement trend (${highestDeltaCase.improvementDelta?.toFixed(1) ?? '--'}%).`
                      : 'Outcome trends will appear once completed interventions are recorded.'}
                  </p>
                </div>
              </TeacherSectionCard>
            </div>
          </div>

          <section id="intervention-archives" className="teacher-figma-stagger">
            <TeacherSectionCard
              title="Intervention Outcomes"
              description="Archived and ongoing outcomes across intervention cycles."
              className="teacher-interventions-page__archive-card"
            >
              {(report?.rows.length ?? 0) === 0 ? (
                <TeacherEmptyState
                  title="No intervention outcomes yet"
                  description="Outcome rows will appear once intervention progress has been recorded."
                />
              ) : (
                <div className="teacher-table-shell">
                  <Table>
                    <TableHeader className="teacher-table-head [&_tr]:border-white/15">
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead>Student</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Baseline</TableHead>
                        <TableHead>Current</TableHead>
                        <TableHead>Delta</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="[&_tr:last-child]:border-0">
                      {(report?.rows ?? []).map((row) => (
                        <TableRow key={row.id} className="teacher-table-row border-white/10">
                          <TableCell className="font-semibold text-[var(--teacher-text-strong)]">
                            {studentName(row.student ?? {})}
                          </TableCell>
                          <TableCell>
                            <Badge className={row.status === 'active' ? 'teacher-badge-danger border-0' : 'teacher-badge-success border-0'}>
                              {row.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[var(--teacher-text-strong)]">
                            {row.triggerScore !== null ? `${row.triggerScore.toFixed(1)}%` : '--'}
                          </TableCell>
                          <TableCell className="text-[var(--teacher-text-strong)]">
                            {row.currentBlendedScore !== null ? `${row.currentBlendedScore.toFixed(1)}%` : '--'}
                          </TableCell>
                          <TableCell className="font-semibold text-[var(--teacher-text-strong)]">
                            {row.improvementDelta !== null
                              ? `${row.improvementDelta > 0 ? '+' : ''}${row.improvementDelta.toFixed(1)}%`
                              : '--'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TeacherSectionCard>
          </section>
        </>
      ) : null}

      <Sheet
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setSelectedCaseId(null);
            setSelectedCaseDetail(null);
          }
        }}
      >
        <SheetContent
          side="right"
          className="teacher-interventions-detail-sheet w-full max-w-[36rem] overflow-y-auto text-white sm:max-w-[36rem]"
        >
          <SheetHeader>
            <SheetTitle className="text-white">Intervention Student Detail</SheetTitle>
            <SheetDescription className="text-[#8ea0bc]">
              {selectedCaseDetail?.student
                ? `${studentName(selectedCaseDetail.student)} • ${selectedCaseDetail.status}`
                : selectedCaseId
                  ? `Case ${selectedCaseId}`
                  : 'Select an intervention case'}
            </SheetDescription>
          </SheetHeader>

          {loadingDetail ? (
            <div className="mt-6 space-y-3">
              <Skeleton className="h-24 rounded-lg bg-white/10" />
              <Skeleton className="h-32 rounded-lg bg-white/10" />
              <Skeleton className="h-32 rounded-lg bg-white/10" />
            </div>
          ) : !selectedCaseDetail ? (
            <div className="mt-6 rounded-lg border border-white/10 p-4 text-sm text-[#8ea0bc]">
              No case detail available.
            </div>
          ) : (
            <div className="mt-6 space-y-4 text-sm">
              <div className="rounded-lg border border-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-[#8ea0bc]">Current Status</p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[#8ea0bc]">Case status</p>
                    <p className="font-semibold">{selectedCaseDetail.status}</p>
                  </div>
                  <div>
                    <p className="text-[#8ea0bc]">Completion</p>
                    <p className="font-semibold">{selectedCaseDetail.completion.completionPercent}%</p>
                  </div>
                  <div>
                    <p className="text-[#8ea0bc]">Trigger</p>
                    <p className="font-semibold">
                      {selectedCaseDetail.triggerScore !== null
                        ? `${selectedCaseDetail.triggerScore.toFixed(1)}%`
                        : '--'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#8ea0bc]">Latest blended</p>
                    <p className="font-semibold">
                      {selectedCaseDetail.latestSnapshot?.blendedScore !== null &&
                      selectedCaseDetail.latestSnapshot?.blendedScore !== undefined
                        ? `${selectedCaseDetail.latestSnapshot.blendedScore.toFixed(1)}%`
                        : '--'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-[#8ea0bc]">Checkpoints</p>
                <div className="mt-2 space-y-2">
                  {selectedCaseDetail.assignments.length === 0 ? (
                    <p className="text-[#8ea0bc]">No assigned checkpoints yet.</p>
                  ) : (
                    selectedCaseDetail.assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between rounded-md bg-white/5 px-3 py-2"
                      >
                        <div>
                          <p className="font-medium">{assignment.label}</p>
                          <p className="text-xs text-[#8ea0bc]">
                            {assignment.type === 'lesson_review' ? 'Lesson Review' : 'Assessment Retry'}
                          </p>
                        </div>
                        <Badge
                          className={
                            assignment.isCompleted
                              ? 'teacher-badge-success border-0'
                              : 'teacher-badge-danger border-0'
                          }
                        >
                          {assignment.isCompleted ? 'Done' : 'Pending'}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-[#8ea0bc]">Weak Concepts</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedCaseDetail.weakConcepts.length === 0 ? (
                    <p className="text-[#8ea0bc]">No concept evidence captured yet.</p>
                  ) : (
                    selectedCaseDetail.weakConcepts.map((concept) => (
                      <Badge key={concept.concept} variant="secondary">
                        {concept.concept} ({concept.masteryScore}%)
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-[#8ea0bc]">Latest Evidence Snippets</p>
                <div className="mt-2 space-y-2">
                  {selectedCaseDetail.recentRiskTransitions.length === 0 ? (
                    <p className="text-[#8ea0bc]">No recent risk transition logs.</p>
                  ) : (
                    selectedCaseDetail.recentRiskTransitions.map((log) => (
                      <div key={log.id} className="rounded-md bg-white/5 px-3 py-2">
                        <p className="font-medium">{log.triggerSource}</p>
                        <p className="text-xs text-[#8ea0bc]">
                          {log.blendedScore !== null ? `${log.blendedScore.toFixed(1)}%` : '--'} against threshold{' '}
                          {log.thresholdApplied !== null ? `${log.thresholdApplied.toFixed(1)}%` : '--'}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <Button
                variant="teacherOutline"
                className="w-full rounded-lg"
                onClick={handleOpenPerformance}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Full Performance Analysis
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </TeacherPageShell>
  );
}


