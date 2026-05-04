'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  FolderOpen,
  RefreshCcw,
  Sparkles,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AiOutageNotice } from '@/components/student/AiOutageNotice';
import { ClassWorkspaceShell, type ClassWorkspaceTabItem } from '@/components/class/workspace/ClassWorkspaceShell';
import { lxpService } from '@/services/lxp-service';
import { useAiAvailability } from '@/hooks/use-ai-availability';
import type { LxpCheckpoint, LxpOverviewResponse, PlaylistResponse } from '@/types/lxp';
import { cn } from '@/utils/cn';

type DetailTab = 'steps' | 'replays' | 'case' | 'overview';

const TAB_ALIASES: Record<string, DetailTab> = {
  steps: 'steps',
  roadmap: 'steps',
  replays: 'replays',
  assessments: 'replays',
  case: 'case',
  interventions: 'case',
  overview: 'overview',
};

const CHECKPOINT_TONE = ['blue', 'green', 'violet'] as const;

function encode(value: string) {
  return encodeURIComponent(value);
}

function resolveClassId(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value ?? '';
}

function buildLessonHref(classId: string, lessonId?: string | null) {
  if (!lessonId) return null;
  return `/dashboard/student/lessons/${encode(lessonId)}?${new URLSearchParams({
    returnTo: `/dashboard/student/lxp/${classId}`,
  }).toString()}`;
}

function clampPercent(value: number | null | undefined) {
  if (!Number.isFinite(value ?? Number.NaN)) return 0;
  return Math.max(0, Math.min(100, Math.round(value ?? 0)));
}

function formatDate(value?: string | null) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'No score';
  return `${Math.round(Number(value))}%`;
}

function getCheckpointTitle(checkpoint: LxpCheckpoint) {
  return (
    checkpoint.label ||
    checkpoint.generatedLesson?.title ||
    checkpoint.guidedAssessment?.title ||
    checkpoint.lesson?.title ||
    checkpoint.assessment?.title
  );
}

function getTab(value: string | null): DetailTab {
  if (!value) return 'steps';
  return TAB_ALIASES[value] ?? 'steps';
}

function isCompletedCase(overview: LxpOverviewResponse | null, playlist: PlaylistResponse | null) {
  return (
    overview?.interventionStatus.status === 'completed' ||
    playlist?.interventionCase.status === 'completed'
  );
}

function DetailLoading() {
  return (
    <div className="student-class-workspace-loading">
      <Skeleton className="h-44 rounded-xl" />
      <Skeleton className="h-14 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
    </div>
  );
}

function CheckpointCard({
  checkpoint,
  classId,
  index,
  readOnly,
  completing,
  onComplete,
}: {
  checkpoint: LxpCheckpoint;
  classId: string;
  index: number;
  readOnly: boolean;
  completing: boolean;
  onComplete: (checkpointId: string) => void;
}) {
  const router = useRouter();
  const title = getCheckpointTitle(checkpoint);
  const isReplay = checkpoint.type === 'assessment_retry';
  const isGuidedAssessment = checkpoint.type === 'guided_assessment';
  const isGeneratedLesson = checkpoint.type === 'generated_lesson_review';
  const lessonHref = buildLessonHref(classId, checkpoint.lesson?.id);
  const generatedLessonHref = checkpoint.generatedLesson
    ? `/dashboard/student/lxp/${encode(classId)}/generated-lessons/${encode(checkpoint.id)}`
    : null;
  const guidedAssessmentHref = checkpoint.guidedAssessment
    ? `/dashboard/student/lxp/${encode(classId)}/guided-assessment/${encode(checkpoint.id)}`
    : null;
  const jaHref = `/dashboard/student/ja?${new URLSearchParams({
    mode: 'review',
    classId,
    entry: 'lxp',
    returnTo: `/dashboard/student/lxp/${classId}?tab=replays`,
  }).toString()}`;
  const primaryHref = isReplay
    ? jaHref
    : isGuidedAssessment
      ? guidedAssessmentHref
      : isGeneratedLesson
        ? generatedLessonHref
        : lessonHref;

  const isNestedInteractiveTarget = (target: EventTarget | null, currentTarget: HTMLElement) => {
    if (!(target instanceof Element)) return false;
    const interactiveAncestor = target.closest('button, a, [role="button"]');
    return Boolean(interactiveAncestor && interactiveAncestor !== currentTarget);
  };

  const handleCardClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (!primaryHref || isNestedInteractiveTarget(event.target, event.currentTarget)) return;
    router.push(primaryHref);
  };

  const handleCardKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (!primaryHref || (event.key !== 'Enter' && event.key !== ' ')) return;
    if (isNestedInteractiveTarget(event.target, event.currentTarget)) return;
    event.preventDefault();
    router.push(primaryHref);
  };

  return (
    <article
      className={cn(
        'student-class-module-card',
        primaryHref ? 'student-class-module-card--interactive' : null,
      )}
      data-tone={CHECKPOINT_TONE[index % CHECKPOINT_TONE.length]}
      data-view="wide"
      role={primaryHref ? 'link' : undefined}
      tabIndex={primaryHref ? 0 : undefined}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
    >
      <div className="student-class-module-card__body-link">
        <header>
          <span className="student-class-module-card__index">{index + 1}</span>
          <div>
            <h3>{title}</h3>
          </div>
        </header>

        <div className="student-class-module-card__stats">
          <article>
            <strong>{checkpoint.xpAwarded}</strong>
            <span>XP</span>
          </article>
          <article>
            <strong>{checkpoint.isCompleted ? 'Done' : readOnly ? 'Closed' : 'Open'}</strong>
            <span>Status</span>
          </article>
          <article>
            <strong>{isGuidedAssessment ? 'Guided' : isReplay ? 'Replay' : 'Step'}</strong>
            <span>Type</span>
          </article>
        </div>
      </div>

      <footer>
        <span
          className={cn(
            'student-class-chip',
            checkpoint.isCompleted ? 'student-class-chip--open' : 'student-class-chip--locked',
          )}
        >
          {checkpoint.isCompleted ? 'Completed' : readOnly ? 'Closed' : 'Available'}
        </span>
        {isReplay ? (
          <Link
            href={jaHref}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-[#e70012] transition hover:bg-[#fff1f4]"
          >
            Open JA Hub
          </Link>
        ) : isGuidedAssessment && guidedAssessmentHref ? (
          <Link
            href={guidedAssessmentHref}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-[#e70012] transition hover:bg-[#fff1f4]"
          >
            Open Guided Assessment
          </Link>
        ) : isGeneratedLesson && generatedLessonHref ? (
          <Link
            href={generatedLessonHref}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-[#e70012] transition hover:bg-[#fff1f4]"
          >
            Open Remedial Lesson
          </Link>
        ) : lessonHref ? (
          <Link
            href={lessonHref}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-[#e70012] transition hover:bg-[#fff1f4]"
          >
            Open Lesson
          </Link>
        ) : null}
        {!readOnly && !checkpoint.isCompleted && !isReplay && !isGuidedAssessment ? (
          <Button
            type="button"
            size="sm"
            disabled={completing}
            className="bg-[#e70012] text-white hover:bg-[#c90010]"
            onClick={() => onComplete(checkpoint.id)}
          >
            Mark Complete
          </Button>
        ) : null}
      </footer>
    </article>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return <div className="teacher-class-workspace__empty">{message}</div>;
}

export default function StudentLxpDetailExperience() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const aiAvailability = useAiAvailability();
  const aiUnavailable = aiAvailability.status === 'degraded';
  const classId = resolveClassId(params.classId);
  const currentTab = getTab(searchParams.get('tab'));
  const [overview, setOverview] = useState<LxpOverviewResponse | null>(null);
  const [playlist, setPlaylist] = useState<PlaylistResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  useEffect(() => {
    const rawTab = searchParams.get('tab');
    if (rawTab && TAB_ALIASES[rawTab] && TAB_ALIASES[rawTab] !== rawTab) {
      router.replace(`/dashboard/student/lxp/${encode(classId)}?tab=${TAB_ALIASES[rawTab]}`);
    }
  }, [classId, router, searchParams]);

  const fetchDetail = useCallback(async () => {
    if (!classId) return;
    try {
      setLoading(true);
      setError(null);
      const [overviewRes, playlistRes] = await Promise.all([
        lxpService.getOverview(classId),
        lxpService.getPlaylist(classId),
      ]);
      setOverview(overviewRes.data);
      setPlaylist(playlistRes.data);
    } catch (err) {
      console.error('Failed to load Learners Path detail', err);
      setError('Learners Path detail could not be loaded right now.');
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  const readOnly = isCompletedCase(overview, playlist);
  const checkpoints = useMemo(
    () => [...(playlist?.checkpoints ?? [])].sort((left, right) => left.order - right.order),
    [playlist?.checkpoints],
  );
  const replays = checkpoints.filter(
    (checkpoint) =>
      checkpoint.type === 'assessment_retry' || checkpoint.type === 'guided_assessment',
  );
  const steps = checkpoints;
  const progressPercent = clampPercent(
    overview?.progress.completionPercent ?? playlist?.progress.completionPercent,
  );
  const subjectName = overview?.selectedClass.subjectName ?? 'Learners Path';
  const section = overview?.selectedClass.section;
  const subtitle = section
    ? `Grade ${section.gradeLevel} - ${section.name}`
    : overview?.selectedClass.subjectCode ?? 'Assigned support path';
  const detailHref = `/dashboard/student/lxp/${encode(classId)}`;

  const tabs: ClassWorkspaceTabItem[] = [
    {
      key: 'steps',
      label: 'Guided Review',
      href: detailHref,
      icon: FolderOpen,
      active: currentTab === 'steps',
    },
    {
      key: 'replays',
      label: 'Assessment Retry Support',
      href: `${detailHref}?tab=replays`,
      icon: ClipboardCheck,
      active: currentTab === 'replays',
    },
    {
      key: 'case',
      label: 'Why This Path Opened',
      href: `${detailHref}?tab=case`,
      icon: FileText,
      active: currentTab === 'case',
    },
    {
      key: 'overview',
      label: 'Progress & Support Status',
      href: `${detailHref}?tab=overview`,
      icon: BarChart3,
      active: currentTab === 'overview',
    },
  ];

  const handleComplete = async (checkpointId: string) => {
    if (readOnly) return;
    try {
      setCompletingId(checkpointId);
      const response = await lxpService.completeCheckpoint(classId, checkpointId);
      setPlaylist(response.data);
      const overviewRes = await lxpService.getOverview(classId);
      setOverview(overviewRes.data);
    } catch (err) {
      console.error('Failed to complete checkpoint', err);
      setError('That step could not be marked complete right now.');
    } finally {
      setCompletingId(null);
    }
  };

  if (loading) return <DetailLoading />;

  if (error || !overview || !playlist) {
    return (
      <section className="teacher-class-workspace__not-found">
        <p>{error || 'Learners Path not found.'}</p>
        <Link href="/dashboard/student/lxp">Back to Learners Path</Link>
      </section>
    );
  }

  return (
    <ClassWorkspaceShell
      className="student-class-workspace"
      backHref="/dashboard/student/lxp"
      backLabel={
        <>
          <ArrowLeft className="h-4 w-4" />
          Back to Paths
        </>
      }
      icon={<Target className="h-5 w-5" />}
      title={subjectName}
      subtitle={subtitle}
      metaItems={[
        {
          key: 'progress',
          icon: <Sparkles className="h-3.5 w-3.5" />,
          label: `${progressPercent}% progress`,
        },
        {
          key: 'status',
          icon: readOnly ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />,
          label: readOnly ? 'Completed' : overview.interventionStatus.label,
        },
        {
          key: 'steps',
          icon: <BookOpen className="h-3.5 w-3.5" />,
          label: `${checkpoints.length} assigned ${checkpoints.length === 1 ? 'task' : 'tasks'}`,
        },
      ]}
      tabs={tabs}
    >
      {aiUnavailable ? (
        <AiOutageNotice
          mode="lxp"
          message={aiAvailability.message}
          className="mb-4 border-[#f4d192] bg-[#fff8e8]"
        />
      ) : null}

      {currentTab === 'steps' ? (
        <section className="student-class-panel">
          <header className="student-class-panel__head student-class-panel__head--modules">
            <div>
              <h2 aria-label="Guided Review">Guided Review</h2>
              <p>
                {readOnly
                  ? 'Read-only history'
                  : `${steps.length} guided review ${steps.length === 1 ? 'step is' : 'steps are'} available before assessment retry support.`}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-[#d9e3f0] bg-white text-[#2f3f5d]"
              onClick={() => void fetchDetail()}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </header>

          <div className="rounded-xl border border-[#d9e3f0] bg-white p-4">
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-[#41516f]">
              <span>Path progress</span>
              <span>{progressPercent}%</span>
            </div>
            <Progress
              value={progressPercent}
              className="h-2.5 bg-[#edf2fb]"
              indicatorClassName="bg-gradient-to-r from-[#315fdf] to-[#e70012]"
            />
          </div>

          <div className="rounded-xl border border-[#f3d8df] bg-[#fff7f9] p-4 text-sm font-medium text-[#5a6175]">
            These guided review steps help you close the target concept gap before retrying the related assessment.
          </div>

          {steps.length === 0 ? (
            <EmptyPanel message="No assigned steps are available for this path yet." />
          ) : (
            <div className="student-class-modules-grid" data-view="wide">
              {steps.map((checkpoint, index) => (
                <CheckpointCard
                  key={checkpoint.id}
                  checkpoint={checkpoint}
                  classId={classId}
                  index={index}
                  readOnly={readOnly}
                  completing={completingId === checkpoint.id}
                  onComplete={handleComplete}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {currentTab === 'replays' ? (
        <section className="student-class-panel">
          <header className="student-class-panel__head">
            <h2>Assessment Retry Support</h2>
            <p>Complete guided review first, then open JA for the assessment retry.</p>
          </header>

          <div className="rounded-xl border border-[#d9e3f0] bg-[#f8fbff] p-4 text-sm font-medium text-[#4f5d78]">
            JA provides guided support, not a new official summative attempt. Use this space to review the failed assessment context with hints and explanations.
          </div>

          {replays.length === 0 ? (
            <EmptyPanel message="No assessment replays are assigned for this path." />
          ) : (
            <div className="student-class-modules-grid" data-view="wide">
              {replays.map((checkpoint, index) => (
                <CheckpointCard
                  key={checkpoint.id}
                  checkpoint={checkpoint}
                  classId={classId}
                  index={index}
                  readOnly={readOnly}
                  completing={false}
                  onComplete={handleComplete}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {currentTab === 'case' ? (
        <section className="student-class-panel">
          <header className="student-class-panel__head">
            <h2>Why This Path Opened</h2>
            <p>This support path opened because your class performance dropped below the threshold for targeted intervention.</p>
          </header>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <CaseMetric label="Status" value={readOnly ? 'Completed' : overview.interventionStatus.label} />
            <CaseMetric label="Trigger score" value={formatPercent(overview.interventionStatus.triggerScore)} />
            <CaseMetric label="Threshold" value={formatPercent(overview.interventionStatus.thresholdApplied)} />
            <CaseMetric label="Opened" value={formatDate(overview.interventionStatus.openedAt)} />
            <CaseMetric label="Closed" value={formatDate(overview.interventionStatus.closedAt)} />
            <CaseMetric label="Current score" value={formatPercent(overview.selectedClass.blendedScore)} />
          </div>
        </section>
      ) : null}

      {currentTab === 'overview' ? (
        <section className="student-class-panel">
          <header className="student-class-panel__head">
            <h2>Progress & Support Status</h2>
            <p>{overview.interventionStatus.message}</p>
          </header>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="rounded-xl border border-[#d9e3f0] bg-white p-4">
              <h3 className="text-base font-semibold text-[#102744]">Focus Items</h3>
              <div className="mt-3 grid gap-2">
                {overview.weakFocusItems.length === 0 ? (
                  <p className="text-sm font-medium text-[#7b8aa5]">No weak focus items are listed.</p>
                ) : (
                  overview.weakFocusItems.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="rounded-lg border border-[#e2e9f3] bg-[#f8fbff] p-3 transition hover:bg-[#f2f7ff]"
                    >
                      <strong className="block text-sm text-[#102744]">{item.title}</strong>
                      <span className="mt-1 block text-xs font-medium text-[#7b8aa5]">{item.subtitle}</span>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-[#d9e3f0] bg-white p-4">
              <h3 className="text-base font-semibold text-[#102744]">Path Summary</h3>
              <dl className="mt-3 grid gap-2 text-sm">
                <SummaryRow label="XP" value={playlist.progress.xpTotal} />
                <SummaryRow label="Stars" value={playlist.progress.starsTotal} />
                <SummaryRow label="Streak" value={`${playlist.progress.streakDays} days`} />
                <SummaryRow
                  label="Completed"
                  value={`${overview.progress.checkpointsCompleted}/${overview.progress.totalCheckpoints}`}
                />
              </dl>
            </div>
          </div>
        </section>
      ) : null}
    </ClassWorkspaceShell>
  );
}

function CaseMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-xl border border-[#d9e3f0] bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8198b8]">{label}</p>
      <strong className="mt-2 block text-lg font-semibold text-[#102744]">{value}</strong>
    </article>
  );
}

function SummaryRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-[#f8fbff] px-3 py-2">
      <dt className="font-semibold text-[#6c7d98]">{label}</dt>
      <dd className="font-semibold text-[#102744]">{value}</dd>
    </div>
  );
}
