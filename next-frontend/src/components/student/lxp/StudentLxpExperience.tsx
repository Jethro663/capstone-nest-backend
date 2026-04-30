'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AiOutageNotice } from '@/components/student/AiOutageNotice';
import {
  resolveStudentCoursePresentation,
  toStudentHeroStyle,
} from '@/components/class/student-course-presentation';
import { lxpService } from '@/services/lxp-service';
import { useAiAvailability } from '@/hooks/use-ai-availability';
import type { EligibleClass, LxpPathSummary } from '@/types/lxp';
import { cn } from '@/utils/cn';

type PrimaryTab = 'all' | 'in_progress' | 'completed';

const PRIMARY_TABS: Array<{ value: PrimaryTab; label: string }> = [
  { value: 'all', label: 'All Paths' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const LEGACY_TAB_MAP: Record<string, string> = {
  roadmap: 'steps',
  assessments: 'replays',
  interventions: 'case',
  overview: 'overview',
  steps: 'steps',
  replays: 'replays',
  case: 'case',
};

function clampPercent(value: number | null | undefined) {
  if (!Number.isFinite(value ?? Number.NaN)) return 0;
  return Math.max(0, Math.min(100, Math.round(value ?? 0)));
}

function encode(value: string) {
  return encodeURIComponent(value);
}

function isCompletedPath(path: LxpPathSummary) {
  return path.status === 'completed' || clampPercent(path.progress.completionPercent) >= 100;
}

function isInteractiveTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest('a, button, input, select, textarea, label, [role="button"]'))
  );
}

function formatSection(path: LxpPathSummary) {
  const grade = path.class.section?.gradeLevel ?? 'TBA';
  const section = path.class.section?.name ?? 'Section TBA';
  return `Grade ${grade} - ${section}`;
}

function toFallbackPath(entry: EligibleClass): LxpPathSummary {
  return {
    classId: entry.classId,
    class: entry.class,
    interventionCaseId: entry.interventionCaseId,
    status: 'active',
    isAtRisk: entry.isAtRisk,
    blendedScore: entry.blendedScore,
    thresholdApplied: entry.thresholdApplied,
    openedAt: entry.openedAt,
    closedAt: null,
    counts: {
      steps: 0,
      replays: 0,
      pending: 0,
      total: 0,
      completed: 0,
    },
    progress: {
      totalCheckpoints: 0,
      completedCheckpoints: 0,
      completionPercent: 0,
    },
  };
}

function PathStatusChip({ path }: { path: LxpPathSummary }) {
  const completed = isCompletedPath(path);
  const label = completed
    ? 'Completed'
    : clampPercent(path.progress.completionPercent) > 0
      ? 'In Progress'
      : 'Ready';

  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.09em]',
        completed
          ? 'border-[#bde9d3] bg-[#effcf4] text-[#047857]'
          : 'border-[#fdd5e1] bg-[#fff1f6] text-[#be123c]',
      )}
    >
      {label}
    </span>
  );
}

interface PathCardProps {
  path: LxpPathSummary;
  heroStyle: CSSProperties;
  buttonTint: string;
  onOpenPath: (classId: string) => void;
}

function PathCard({ path, heroStyle, buttonTint, onOpenPath }: PathCardProps) {
  const progress = clampPercent(path.progress.completionPercent);
  const subjectName = path.class.subjectName || 'Learners Path';
  const sectionLabel = formatSection(path);
  const completed = isCompletedPath(path);
  const detailHref = `/dashboard/student/lxp/${encode(path.classId)}`;
  const stepsHref = `${detailHref}?tab=steps`;

  const openPath = useCallback(() => onOpenPath(path.classId), [onOpenPath, path.classId]);

  const handleBodyClick = (event: MouseEvent<HTMLElement>) => {
    if (isInteractiveTarget(event.target)) return;
    openPath();
  };

  const handleBodyKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (isInteractiveTarget(event.target)) return;
    event.preventDefault();
    openPath();
  };

  return (
    <article
      className={cn(
        'group overflow-hidden rounded-[1.55rem] border border-[#e2dfeb] bg-white shadow-[0_22px_38px_-30px_rgba(17,25,47,0.55),inset_0_1px_0_rgba(255,255,255,0.9)] transition',
        'hover:-translate-y-1 hover:border-[#d2cddf] hover:shadow-[0_28px_42px_-30px_rgba(17,25,47,0.55)]',
      )}
    >
      <div className="relative min-h-[8.65rem] overflow-hidden px-5 pb-5 pt-4" style={heroStyle}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.16)_1px,transparent_0)] [background-size:16px_16px]" />
        <div className="relative flex items-start justify-between gap-3">
          <PathStatusChip path={path} />
          <span
            className="grid h-8 w-8 place-items-center rounded-full border border-white/30 text-white"
            style={{ background: buttonTint }}
          >
            <Target className="h-4 w-4" />
          </span>
        </div>

        <div className="relative mt-5 text-white">
          <h3 className="line-clamp-2 text-[2rem] font-semibold leading-[1.05] tracking-tight">
            {subjectName}
          </h3>
          <p className="mt-2 text-[0.92rem] font-medium text-white/92">{sectionLabel}</p>
          <p className="mt-0.5 text-sm text-white/80">{path.class.subjectCode}</p>
        </div>
      </div>

      <div
        role="link"
        tabIndex={0}
        aria-label={`Open ${subjectName}`}
        onClick={handleBodyClick}
        onKeyDown={handleBodyKeyDown}
        className="space-y-4 px-5 pb-5 pt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d81b50]/40 focus-visible:ring-inset"
      >
        <div className="grid grid-cols-3 gap-2">
          <PathStat value={path.counts.steps} label="Steps" />
          <PathStat value={path.counts.replays} label="Replays" />
          <PathStat value={path.counts.pending} label="Pending" />
        </div>

        <div className="rounded-2xl border border-[#e9e4ef] bg-[#fbf9fd] px-3 py-2.5">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 text-[#55617d]">
              <Sparkles className="h-3.5 w-3.5 text-[#d81b50]" />
              Path progress
            </span>
            <span className="text-[#d81b50]">{progress}%</span>
          </div>
          <Progress
            value={progress}
            className="h-2.5 bg-[#f2d7e1]"
            indicatorClassName="bg-gradient-to-r from-[#d81b50] to-[#ef476f]"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1 rounded-full bg-[#f2f0f8] px-2.5 py-1 text-xs font-semibold text-[#4b5875]">
            <BookOpen className="h-3.5 w-3.5" />
            {path.counts.total} tasks
          </div>

          <div className="inline-flex items-center gap-1 rounded-full bg-[#eef4ff] px-2.5 py-1 text-xs font-semibold text-[#31518a]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {completed ? 'Read-only history' : sectionLabel}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link
            href={stepsHref}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[#d9d6e7] bg-[#f2f0f9] text-sm font-semibold text-[#2f3f5d] transition hover:bg-[#ebe8f5]"
          >
            <ClipboardCheck className="h-4 w-4" />
            View Steps
          </Link>

          <button
            type="button"
            onClick={openPath}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#d81b50] px-4 text-sm font-semibold text-white shadow-[0_14px_26px_-20px_rgba(216,27,80,0.95)] transition hover:bg-[#c51647]"
          >
            {completed ? 'Review Path' : 'Continue Path'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function PathStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-[#e8e4ef] bg-[#faf9fc] px-2 py-2.5 text-center">
      <p className="text-2xl font-semibold leading-none text-[#11192f]">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.09em] text-[#727d97]">
        {label}
      </p>
    </div>
  );
}

function PathListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[0, 1, 2, 3].map((item) => (
        <Skeleton key={item} className="h-[25rem] rounded-[1.55rem]" />
      ))}
    </div>
  );
}

export default function StudentLxpExperience() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const aiAvailability = useAiAvailability();
  const aiUnavailable = aiAvailability.status === 'degraded';
  const [paths, setPaths] = useState<LxpPathSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<PrimaryTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const legacyTab = searchParams.get('tab');
    const classId = searchParams.get('classId');

    if (legacyTab === 'ja') {
      const params = new URLSearchParams();
      const mode = searchParams.get('mode');
      if (mode) params.set('mode', mode);
      if (classId) params.set('classId', classId);
      params.set('entry', 'lxp');
      params.set('returnTo', '/dashboard/student/lxp');
      router.replace(`/dashboard/student/ja${params.toString() ? `?${params.toString()}` : ''}`);
      return;
    }

    if (classId) {
      const mappedTab = legacyTab ? LEGACY_TAB_MAP[legacyTab] : undefined;
      const params = new URLSearchParams();
      if (mappedTab) params.set('tab', mappedTab);
      router.replace(
        `/dashboard/student/lxp/${encode(classId)}${params.toString() ? `?${params.toString()}` : ''}`,
      );
    }
  }, [router, searchParams]);

  const fetchPaths = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await lxpService.getEligibility();
      const nextPaths =
        response.data.paths?.length
          ? response.data.paths
          : response.data.eligibleClasses.map(toFallbackPath);
      setPaths(nextPaths);
    } catch (err) {
      console.error('Failed to load Learners Paths', err);
      setError('Learners Paths could not be loaded right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPaths();
  }, [fetchPaths]);

  const filteredPaths = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return paths.filter((path) => {
      const completed = isCompletedPath(path);
      if (tab === 'completed' && !completed) return false;
      if (tab === 'in_progress' && completed) return false;

      if (!term) return true;
      const haystack = [
        path.class.subjectName,
        path.class.subjectCode,
        path.class.section?.name,
        path.class.section?.gradeLevel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [paths, searchQuery, tab]);

  const totalCompleted = paths.filter(isCompletedPath).length;
  const totalInProgress = paths.length - totalCompleted;

  const openPath = useCallback(
    (classId: string) => {
      router.push(`/dashboard/student/lxp/${encode(classId)}`);
    },
    [router],
  );

  return (
    <main className="space-y-5 bg-[var(--student-elevated)] p-4 md:p-6">
      <section className="rounded-[1.35rem] border border-[#e1ddec] bg-white p-4 shadow-[0_18px_38px_-34px_rgba(17,25,47,0.45)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#d81b50]">
              Learners Path
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#11192f] md:text-4xl">
              My Paths
            </h1>
            <p className="mt-1 max-w-2xl text-sm font-medium text-[#6d7891]">
              Continue assigned steps, review replays, and reopen completed support paths.
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <Skeleton className="h-10 w-full rounded-xl lg:w-[21rem]" />
              <Skeleton className="h-10 w-64 rounded-2xl" />
              <Skeleton className="h-10 w-28 rounded-xl" />
            </div>
          ) : (
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <label className="relative block min-w-0 lg:w-[21rem]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a859c]" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search path, section, or subject code"
                  className="h-10 rounded-xl border-[#ded9e9] bg-[#fbf9fd] pl-9 text-sm font-medium"
                />
              </label>

              <div className="inline-flex rounded-2xl border border-[#ded9e9] bg-[#f1eef8] p-1">
                {PRIMARY_TABS.map((entry) => (
                  <button
                    key={entry.value}
                    type="button"
                    data-active={tab === entry.value}
                    className={cn(
                      'rounded-xl px-3 py-2 text-xs font-semibold text-[#5e6880] transition',
                      tab === entry.value && 'bg-white text-[#11192f] shadow-sm',
                    )}
                    onClick={() => setTab(entry.value)}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>

              <Button
                type="button"
                className="h-10 rounded-xl bg-[#d81b50] px-4 text-sm font-semibold text-white hover:bg-[#c51647]"
                onClick={() => void fetchPaths()}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[#59657d]">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#eef4ff] px-3 py-1.5">
            <Target className="h-3.5 w-3.5" />
            {paths.length} total paths
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#fff1f6] px-3 py-1.5 text-[#be123c]">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {totalInProgress} in progress
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#effcf4] px-3 py-1.5 text-[#047857]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {totalCompleted} completed
          </span>
        </div>
      </section>

      {aiUnavailable ? (
        <AiOutageNotice
          mode="lxp"
          message={aiAvailability.message}
          className="border-[#f4d192] bg-[#fff8e8]"
        />
      ) : null}

      {error ? (
        <section className="rounded-[1.25rem] border border-[#f5c8d6] bg-[#fff1f6] p-4">
          <p className="text-sm font-semibold text-[#9f1c44]">{error}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 border-[#e9a9be] text-[#9f1c44] hover:bg-[#ffe8ef]"
            onClick={() => void fetchPaths()}
          >
            Try Again
          </Button>
        </section>
      ) : loading ? (
        <PathListSkeleton />
      ) : filteredPaths.length === 0 ? (
        <div className="grid min-h-[18rem] place-items-center rounded-[1.45rem] border border-dashed border-[#d5d1e2] bg-white p-6 text-center">
          <div>
            <p className="text-xl font-semibold text-[#1e2944]">No paths match this filter.</p>
            <p className="mt-1 text-sm text-[#667390]">
              Try another search term or switch to a different path status.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 border-[#ddd8e8] bg-[#faf8fd] text-[#3b4865] hover:bg-[#f4f0fa]"
              onClick={() => {
                setSearchQuery('');
                setTab('all');
              }}
            >
              Reset Filters
            </Button>
          </div>
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2">
          {filteredPaths.map((path, index) => {
            const choice = resolveStudentCoursePresentation(undefined, undefined, index);
            return (
              <PathCard
                key={`${path.classId}-${path.interventionCaseId ?? 'path'}`}
                path={path}
                heroStyle={toStudentHeroStyle(choice)}
                buttonTint={choice.buttonTint}
                onOpenPath={openPath}
              />
            );
          })}
        </section>
      )}
    </main>
  );
}
