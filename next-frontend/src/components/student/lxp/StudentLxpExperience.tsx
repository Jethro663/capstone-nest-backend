'use client';

import Image from 'next/image';
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
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  CircleHelp,
  RefreshCcw,
  Search,
} from 'lucide-react';
import { DashboardStatePanel } from '@/components/layout/DashboardStatePanel';
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
import { AiOutageNotice } from '@/components/student/AiOutageNotice';
import { useAuth } from '@/providers/AuthProvider';
import {
  resolveStudentCoursePresentation,
  toStudentHeroStyle,
} from '@/components/class/student-course-presentation';
import { lxpService } from '@/services/lxp-service';
import { classService } from '@/services/class-service';
import { useAiAvailability } from '@/hooks/use-ai-availability';
import type { StudentClassPresentationPreference } from '@/types/class';
import type { EligibleClass, LxpPathSummary } from '@/types/lxp';
import { cn } from '@/utils/cn';
import './StudentLxpExperience.css';

type PrimaryTab = 'all' | 'in_progress' | 'completed';
type LxpGuideScreen = 'overview' | 'filters' | 'card' | 'actions' | 'support';

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

const lxpGuidePages: Array<{
  title: string;
  description: string;
  screen: LxpGuideScreen;
  reminder: string;
  steps: Array<{
    action: string;
    body: string;
    tone?: 'default' | 'caution';
  }>;
}> = [
  {
    title: 'Start on the page and know what it is for',
    description:
      'This page shows every Learners Path that was opened for you, so you can quickly find where to continue.',
    screen: 'overview',
    reminder:
      'Easy rule: if you want help with a class path, start here and pick the card that matches your subject.',
    steps: [
      {
        action: 'Read',
        body: 'Use the My Paths title to confirm that you are inside your Learners Path page.',
      },
      {
        action: 'Check',
        body: 'Look at the Total, In progress, and Completed summary for a quick count of your paths.',
      },
      {
        action: 'Open',
        body: 'Choose a path card when you are ready to continue work for one subject.',
      },
    ],
  },
  {
    title: 'Find the right path faster',
    description:
      'The top tools help you search, sort, and refresh the list so you can find the path you need without guessing.',
    screen: 'filters',
    reminder:
      'If the page looks empty after searching or switching tabs, clear the filters and check again.',
    steps: [
      {
        action: 'Search',
        body: 'Type a subject, section, or subject code in the search box to narrow the list.',
      },
      {
        action: 'Switch',
        body: 'Use All Paths, In Progress, or Completed to show only the group you want to see.',
      },
      {
        action: 'Refresh',
        body: 'Press Refresh when you want the newest path list from the system.',
      },
      {
        action: 'Reset',
        body: 'If no card matches your filter, use Reset Filters so all available paths appear again.',
        tone: 'caution',
      },
    ],
  },
  {
    title: 'Read a path card',
    description:
      'Each card tells you the class name, the path status, how many tasks are inside, and how far you already are.',
    screen: 'card',
    reminder:
      'A finished path can still be opened again, but it becomes review-only history instead of new work.',
    steps: [
      {
        action: 'Notice',
        body: 'Read the top badge first so you know if the path is ready, in progress, or completed.',
      },
      {
        action: 'Review',
        body: 'Check the subject name, grade, section, and subject code to make sure you picked the right class.',
      },
      {
        action: 'Track',
        body: 'Use the progress bar and steps, replays, and pending counts to see what is left.',
      },
    ],
  },
  {
    title: 'Choose the action you need',
    description:
      'The bottom buttons let you either open the step list first or jump straight back into the path.',
    screen: 'actions',
    reminder:
      'Pick View Steps when you want to look first. Pick Continue Path when you are ready to move right away.',
    steps: [
      {
        action: 'View',
        body: 'Use View Steps to open the list of tasks before you start or continue.',
      },
      {
        action: 'Continue',
        body: 'Use Continue Path to go straight into the path detail page and keep going.',
      },
      {
        action: 'Review',
        body: 'When the path is already finished, the button changes to Review Path so you can look back at your work.',
      },
    ],
  },
  {
    title: 'Know the special notices on this page',
    description:
      'Some cards show finished history, and sometimes JA may be resting for a while. The guide below explains both.',
    screen: 'support',
    reminder:
      'If JA is taking a break, your path list still works. Only the AI-based replay help may need to wait.',
    steps: [
      {
        action: 'Read',
        body: 'A completed card may show Read-only history, which means you can review it without changing finished results.',
      },
      {
        action: 'Understand',
        body: 'If the JA break banner appears, your path list and card navigation still stay available.',
      },
      {
        action: 'Wait',
        body: 'Replay help may pause until JA comes back online, so you may need to try again later.',
      },
    ],
  },
];

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
        'student-lxp-card__status',
        completed
          ? 'student-lxp-card__status--completed'
          : 'student-lxp-card__status--active',
      )}
    >
      {label}
    </span>
  );
}

interface PathCardProps {
  path: LxpPathSummary;
  heroStyle: CSSProperties;
  onOpenPath: (classId: string) => void;
}

function PathCard({ path, heroStyle, onOpenPath }: PathCardProps) {
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
    <article className="student-lxp-card">
      <div className="student-lxp-card__hero" style={heroStyle}>
        <div className="student-lxp-card__status-row">
          <PathStatusChip path={path} />
        </div>

        <div className="student-lxp-card__course">
          <h3>{subjectName}</h3>
          <p>{sectionLabel}</p>
          <span>{path.class.subjectCode}</span>
        </div>
      </div>

      <div
        role="link"
        tabIndex={0}
        aria-label={`Open ${subjectName}`}
        onClick={handleBodyClick}
        onKeyDown={handleBodyKeyDown}
        className="student-lxp-card__body"
      >
        <dl className="student-lxp-card__stats" aria-label={`${subjectName} path summary`}>
          <PathStat value={path.counts.steps} label="Guided Review" />
          <PathStat value={path.counts.replays} label="Assessment Retry" />
          <PathStat value={path.counts.pending} label="Pending" />
        </dl>

        <div className="student-lxp-card__progress">
          <div className="student-lxp-card__progress-label">
            <span>Path progress</span>
            <strong>{progress}%</strong>
          </div>
          <Progress
            value={progress}
            className="student-lxp-card__progress-track"
            indicatorClassName="student-lxp-card__progress-indicator"
          />
        </div>

        <div className="student-lxp-card__meta">
          <span>{path.counts.total} tasks</span>
          <span>{completed ? 'Read-only history' : sectionLabel}</span>
        </div>

        <div className="student-lxp-card__actions">
          <Link
            href={stepsHref}
            className="student-lxp-card__secondary-action"
          >
            <ClipboardCheck className="h-4 w-4" />
            View Steps
          </Link>

          <button
            type="button"
            onClick={openPath}
            className="student-lxp-card__primary-action"
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
    <div className="student-lxp-card__stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function PathListSkeleton() {
  return (
    <div className="student-lxp-grid" aria-label="Loading Learners Paths">
      {[0, 1, 2, 3].map((item) => (
        <Skeleton key={item} className="student-lxp-card-skeleton" />
      ))}
    </div>
  );
}

function PathGrid({
  paths,
  presentationByClass,
  onOpenPath,
}: {
  paths: LxpPathSummary[];
  presentationByClass: Record<string, StudentClassPresentationPreference>;
  onOpenPath: (classId: string) => void;
}) {
  return (
    <section className="student-lxp-grid">
      {paths.map((path) => {
        const presentation = presentationByClass[path.classId];
        const choice = resolveStudentCoursePresentation(
          presentation?.styleMode,
          presentation?.styleToken,
        );
        return (
          <PathCard
            key={`${path.classId}-${path.interventionCaseId ?? 'path'}`}
            path={path}
            heroStyle={toStudentHeroStyle(choice)}
            onOpenPath={onOpenPath}
          />
        );
      })}
    </section>
  );
}

export default function StudentLxpExperience() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const aiAvailability = useAiAvailability();
  const aiUnavailable = aiAvailability.status === 'degraded';
  const [paths, setPaths] = useState<LxpPathSummary[]>([]);
  const [presentationByClass, setPresentationByClass] = useState<
    Record<string, StudentClassPresentationPreference>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<PrimaryTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpPage, setHelpPage] = useState(0);

  const activeGuidePage = lxpGuidePages[helpPage];

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
      setError(false);
      const [response, presentationResponse] = await Promise.all([
        lxpService.getEligibility(),
        user?.id
          ? classService
              .getStudentPresentationPreferences(user.id)
              .catch(() => ({ data: [] as StudentClassPresentationPreference[] }))
          : Promise.resolve({ data: [] as StudentClassPresentationPreference[] }),
      ]);
      const nextPaths =
        response.data.paths?.length
          ? response.data.paths
          : response.data.eligibleClasses.map(toFallbackPath);
      const nextPresentations = Object.fromEntries(
        (presentationResponse.data ?? []).map((preference) => [
          preference.classId,
          preference,
        ]),
      );
      setPaths(nextPaths);
      setPresentationByClass(nextPresentations);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

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

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setTab('all');
  }, []);

  const openPath = useCallback(
    (classId: string) => {
      router.push(`/dashboard/student/lxp/${encode(classId)}`);
    },
    [router],
  );

  return (
    <main className="student-lxp">
      <header className="student-lxp__header">
        <div className="student-lxp__title">
          <h1>My Paths</h1>
          <p>
            Continue targeted support through guided review, assessment retries, and completed
            history.
          </p>
        </div>

        {loading ? (
          <div className="student-lxp__controls" aria-label="Loading path controls">
            <Skeleton className="student-lxp__search-skeleton" />
            <Skeleton className="student-lxp__tabs-skeleton" />
            <Skeleton className="student-lxp__button-skeleton" />
          </div>
        ) : (
          <div className="student-lxp__controls">
            <label className="student-lxp__search">
              <span className="sr-only">Search Learners Paths</span>
              <Search aria-hidden="true" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search path, section, or subject code"
              />
            </label>

            <div
              className="student-lxp__tabs"
              role="group"
              aria-label="Filter paths by status"
            >
              {PRIMARY_TABS.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  data-active={tab === entry.value}
                  onClick={() => setTab(entry.value)}
                >
                  {entry.label}
                </button>
              ))}
            </div>

            <div className="student-lxp__header-actions">
              <Button
                type="button"
                className="student-lxp__refresh"
                onClick={() => void fetchPaths()}
              >
                <RefreshCcw aria-hidden="true" />
                Refresh
              </Button>

              <Button
                type="button"
                variant="outline"
                className="student-lxp-help-button student-lxp__help"
                aria-label="Learners Path help"
                onClick={() => {
                  setHelpPage(0);
                  setHelpOpen(true);
                }}
              >
                <CircleHelp aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}

        <dl className="student-lxp__counts" aria-label="Path counts">
          <div>
            <dt>Total</dt>
            <dd>{paths.length}</dd>
          </div>
          <div>
            <dt>In progress</dt>
            <dd>{totalInProgress}</dd>
          </div>
          <div>
            <dt>Completed</dt>
            <dd>{totalCompleted}</dd>
          </div>
        </dl>
      </header>

      {aiUnavailable ? (
        <AiOutageNotice
          mode="lxp"
          message={aiAvailability.message}
          className="student-lxp__ai-notice"
        />
      ) : null}

      {error ? (
        <DashboardStatePanel
          kind="error"
          title="Learners Paths couldn't be loaded"
          description="Try again to load your current support paths."
          primaryAction={{ label: 'Try again', onClick: () => void fetchPaths() }}
        />
      ) : loading ? (
        <PathListSkeleton />
      ) : paths.length === 0 ? (
        <DashboardStatePanel
          kind="empty"
          title="No Learners Paths yet"
          description="Your support paths will appear here when they become available."
        />
      ) : filteredPaths.length === 0 ? (
        <DashboardStatePanel
          kind="empty"
          title="No paths match these filters"
          description="Clear the search or choose another path status."
          primaryAction={{ label: 'Reset filters', onClick: resetFilters }}
        />
      ) : (
        <PathGrid
          paths={filteredPaths}
          presentationByClass={presentationByClass}
          onOpenPath={openPath}
        />
      )}

      <Dialog
        open={helpOpen}
        onOpenChange={(open) => {
          setHelpOpen(open);
          if (!open) setHelpPage(0);
        }}
      >
        <DialogContent className="teacher-intervention-workspace__manual-dialog student-lxp-guide-dialog">
          <DialogHeader>
            <DialogTitle>Student guide: Learners Path</DialogTitle>
            <DialogDescription>
              This guide shows what each part of the page does, in simple steps you can follow one page at a time.
            </DialogDescription>
          </DialogHeader>

          <div className="teacher-intervention-workspace__manual-progress" aria-label="Learners Path guide pages">
            <span>{`Page ${helpPage + 1} of ${lxpGuidePages.length}`}</span>
            <div className="teacher-intervention-workspace__manual-dots">
              {lxpGuidePages.map((page, index) => (
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
            <div className="teacher-intervention-workspace__manual-copy">
              <span className="teacher-intervention-workspace__manual-kicker">Learners Path tour</span>
              <h3>{activeGuidePage.title}</h3>
              <p>{activeGuidePage.description}</p>

              <div className="route-guide-steps">
                {activeGuidePage.steps.map((step, index) => (
                  <div
                    key={`${activeGuidePage.title}-${step.action}`}
                    className={cn('route-guide-step', step.tone ? `is-${step.tone}` : undefined)}
                  >
                    <span className="route-guide-step__index">{index + 1}</span>
                    <div>
                      <strong>{step.action}</strong>
                      <p>{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="teacher-intervention-workspace__manual-reminder">{activeGuidePage.reminder}</div>
            </div>

            <StudentLxpGuideScreenshot screen={activeGuidePage.screen} />
          </div>

          <DialogFooter className="teacher-intervention-workspace__manual-footer">
            <Button
              type="button"
              variant="outline"
              onClick={() => setHelpPage((current) => Math.max(0, current - 1))}
              disabled={helpPage === 0}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous page
            </Button>
            <Button type="button" variant="ghost" aria-label="Close guide" onClick={() => setHelpOpen(false)}>
              Close guide
            </Button>
            <Button
              type="button"
              onClick={() =>
                setHelpPage((current) => Math.min(lxpGuidePages.length - 1, current + 1))
              }
              disabled={helpPage === lxpGuidePages.length - 1}
            >
              Next page
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function StudentLxpGuideScreenshot({ screen }: { screen: LxpGuideScreen }) {
  if (screen === 'overview') {
    return (
      <div className="teacher-intervention-workspace__manual-shot student-lxp-guide-shot">
        <div className="student-lxp-guide-shell">
          <div className="student-lxp-guide-shell__top">
            <div className="student-lxp-guide-shell__header-copy">
              <small>Learners Path</small>
              <strong>My Paths</strong>
              <p>Find your path cards here.</p>
            </div>
            <div className="student-lxp-guide-shell__help">?</div>
          </div>

          <div className="student-lxp-guide-shell__toolbar">
            <span>Search path</span>
            <b>All Paths</b>
            <span>In Progress</span>
            <span>Completed</span>
            <i>Refresh</i>
          </div>

          <div className="student-lxp-guide-shell__chips">
            <span>2 total paths</span>
            <span>1 in progress</span>
            <span>1 completed</span>
          </div>

          <div className="student-lxp-guide-shell__card-grid">
            <article>
              <header>
                <b>Ready</b>
                <span>Math 7</span>
              </header>
              <p />
              <p />
              <footer>
                <span>View Steps</span>
                <span>Continue</span>
              </footer>
            </article>
            <article>
              <header className="is-green">
                <b>Completed</b>
                <span>Science 7</span>
              </header>
              <p />
              <p />
              <footer>
                <span>View Steps</span>
                <span>Review</span>
              </footer>
            </article>
          </div>

          <div className="student-lxp-guide-shell__ja-buddy">
            <div className="student-lxp-guide-shell__ja-image">
              <Image src="/images/JA/ja_wave.png" alt="JA waving" fill sizes="72px" className="object-contain" />
            </div>
            <div>
              <small>JA says</small>
              <strong>Pick the subject card you need.</strong>
            </div>
          </div>
        </div>

        <em className="teacher-intervention-workspace__manual-pin student-lxp-guide-pin is-student-lxp-guide-help">
          Help button
        </em>
        <em className="teacher-intervention-workspace__manual-pin student-lxp-guide-pin is-student-lxp-guide-search">
          Search and tabs
        </em>
        <em className="teacher-intervention-workspace__manual-pin student-lxp-guide-pin is-student-lxp-guide-cards">
          Path cards
        </em>
      </div>
    );
  }

  if (screen === 'filters') {
    return (
      <div className="teacher-intervention-workspace__manual-shot student-lxp-guide-shot">
        <div className="student-lxp-guide-shell">
          <div className="student-lxp-guide-shell__toolbar is-focused">
            <span className="is-long">Search path, section, or subject code</span>
            <b>All Paths</b>
            <span>In Progress</span>
            <span>Completed</span>
            <i>Refresh</i>
          </div>

          <div className="student-lxp-guide-shell__chips">
            <span>2 total paths</span>
            <span>1 in progress</span>
            <span>1 completed</span>
          </div>

          <div className="student-lxp-guide-shell__empty-card">
            <div className="student-lxp-guide-shell__ja-image is-small">
              <Image
                src="/images/JA/ja_thinking.png"
                alt="JA thinking"
                fill
                sizes="64px"
                className="object-contain"
              />
            </div>
            <strong>No paths match this filter.</strong>
            <p>Try another search or tap Reset Filters.</p>
            <b>Reset Filters</b>
          </div>
        </div>

        <em className="teacher-intervention-workspace__manual-pin student-lxp-guide-pin is-student-lxp-guide-counts">
          Count chips
        </em>
        <em className="teacher-intervention-workspace__manual-pin student-lxp-guide-pin is-student-lxp-guide-reset">
          Reset Filters
        </em>
      </div>
    );
  }

  if (screen === 'card') {
    return (
      <div className="teacher-intervention-workspace__manual-shot student-lxp-guide-shot">
        <div className="student-lxp-guide-shell">
          <article className="student-lxp-guide-shell__path-card">
            <header>
              <div>
                <b>In Progress</b>
                <strong>Mathematics 7</strong>
                <small>Grade 7 - Section A</small>
              </div>
              <span>Target</span>
            </header>

            <div className="student-lxp-guide-shell__stats">
              <span>
                <strong>1</strong>
                <small>Steps</small>
              </span>
              <span>
                <strong>1</strong>
                <small>Replays</small>
              </span>
              <span>
                <strong>2</strong>
                <small>Pending</small>
              </span>
            </div>

            <div className="student-lxp-guide-shell__meter">
              <div className="student-lxp-guide-shell__meter-head">
                <small>Path progress</small>
                <b>50%</b>
              </div>
              <p />
            </div>
          </article>

          <div className="student-lxp-guide-shell__ja-buddy">
            <div className="student-lxp-guide-shell__ja-image">
              <Image src="/images/JA/ja_cheer.png" alt="JA cheering" fill sizes="72px" className="object-contain" />
            </div>
            <div>
              <small>JA says</small>
              <strong>Watch the progress bar and task counts.</strong>
            </div>
          </div>
        </div>

        <em className="teacher-intervention-workspace__manual-pin student-lxp-guide-pin is-student-lxp-guide-status">
          Status badge
        </em>
        <em className="teacher-intervention-workspace__manual-pin student-lxp-guide-pin is-student-lxp-guide-progress">
          Progress
        </em>
      </div>
    );
  }

  if (screen === 'actions') {
    return (
      <div className="teacher-intervention-workspace__manual-shot student-lxp-guide-shot">
        <div className="student-lxp-guide-shell">
          <article className="student-lxp-guide-shell__path-card is-soft">
            <div className="student-lxp-guide-shell__action-badges">
              <span>2 tasks</span>
              <span>Grade 7 - Section A</span>
            </div>
            <div className="student-lxp-guide-shell__buttons">
              <b className="is-ghost">View Steps</b>
              <b className="is-solid">Continue Path</b>
            </div>
          </article>

          <article className="student-lxp-guide-shell__path-card is-soft">
            <div className="student-lxp-guide-shell__action-badges">
              <span>2 tasks</span>
              <span>Read-only history</span>
            </div>
            <div className="student-lxp-guide-shell__buttons">
              <b className="is-ghost">View Steps</b>
              <b className="is-solid">Review Path</b>
            </div>
          </article>

          <div className="student-lxp-guide-shell__ja-buddy">
            <div className="student-lxp-guide-shell__ja-image">
              <Image
                src="/images/JA/ja_wave.png"
                alt="JA waving beside the path buttons"
                fill
                sizes="72px"
                className="object-contain"
              />
            </div>
            <div>
              <small>Quick tip</small>
              <strong>Look first with View Steps, then continue when ready.</strong>
            </div>
          </div>
        </div>

        <em className="teacher-intervention-workspace__manual-pin student-lxp-guide-pin is-student-lxp-guide-steps">
          View Steps
        </em>
        <em className="teacher-intervention-workspace__manual-pin student-lxp-guide-pin is-student-lxp-guide-continue">
          Continue or Review
        </em>
      </div>
    );
  }

  return (
    <div className="teacher-intervention-workspace__manual-shot student-lxp-guide-shot">
      <div className="student-lxp-guide-shell">
        <div className="student-lxp-guide-shell__outage">
          <div className="student-lxp-guide-shell__ja-image">
            <Image src="/images/JA/ja_sad.png" alt="JA resting" fill sizes="72px" className="object-contain" />
          </div>
          <div>
            <small>JA break notice</small>
            <strong>JA is taking a break.</strong>
            <p>Your path list still works. Replay help may wait a little.</p>
          </div>
        </div>

        <article className="student-lxp-guide-shell__path-card is-complete">
          <header className="is-green">
            <div>
              <b>Completed</b>
              <strong>Science 7</strong>
              <small>Grade 7 - Section A</small>
            </div>
            <span>Target</span>
          </header>
          <div className="student-lxp-guide-shell__action-badges">
            <span>2 tasks</span>
            <span>Read-only history</span>
          </div>
        </article>
      </div>

      <em className="teacher-intervention-workspace__manual-pin student-lxp-guide-pin is-student-lxp-guide-outage">
        JA break banner
      </em>
      <em className="teacher-intervention-workspace__manual-pin student-lxp-guide-pin is-student-lxp-guide-history">
        Read-only history
      </em>
    </div>
  );
}
