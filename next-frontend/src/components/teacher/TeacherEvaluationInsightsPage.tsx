'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ClipboardCheck,
  Filter,
  ListChecks,
  MessageSquareQuote,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import {
  TeacherEmptyState,
  TeacherHeaderMetric,
  TeacherPageShell,
  TeacherSectionCard,
} from '@/components/teacher/TeacherPageShell';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { lxpService } from '@/services/lxp-service';
import type { TeacherEvaluationSummaryResponse, TeacherEvaluationType } from '@/types/lxp';
import { cn } from '@/utils/cn';
import { toast } from 'sonner';

const TABS: Array<{ value: TeacherEvaluationType; label: string; icon: LucideIcon }> = [
  { value: 'teacher_class', label: 'My Teaching', icon: MessageSquareQuote },
  { value: 'ja_hub', label: 'JA Hub in My Classes', icon: Sparkles },
  { value: 'learners_path', label: 'Learners Path in My Classes', icon: ListChecks },
];

export function TeacherEvaluationInsightsPage() {
  const [evaluationType, setEvaluationType] = useState<TeacherEvaluationType>('teacher_class');
  const [classId, setClassId] = useState('');
  const [gradingPeriod, setGradingPeriod] = useState<
    TeacherEvaluationSummaryResponse['periods'][number] | ''
  >('');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<TeacherEvaluationSummaryResponse | null>(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        const response = await lxpService.getTeacherEvaluationSummary({
          evaluationType,
          classId: classId || undefined,
          gradingPeriod: gradingPeriod || undefined,
        });
        if (!mounted) return;
        setSummary(response.data);
      } catch {
        if (!mounted) return;
        toast.error('Failed to load teacher evaluation insights');
        setSummary(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [classId, evaluationType, gradingPeriod]);

  const stats = useMemo(() => {
    if (!summary) {
      return {
        responses: 0,
        eligible: 0,
        responseRate: 0,
        averageOverall: '--',
        latestResponse: '--',
      };
    }

    return {
      responses: summary.overview.responseCount,
      eligible: summary.overview.eligibleCount,
      responseRate: summary.overview.responseRate,
      averageOverall:
        summary.overview.responseCount > 0
          ? summary.overview.averageOverall.toFixed(2)
          : '--',
      latestResponse: summary.overview.latestSubmittedAt
        ? new Date(summary.overview.latestSubmittedAt).toLocaleDateString('en-US')
        : '--',
    };
  }, [summary]);

  if (loading && !summary) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-36 rounded-[1.5rem]" />
        <Skeleton className="h-24 rounded-[1.25rem]" />
        <Skeleton className="h-[28rem] rounded-[1.5rem]" />
      </div>
    );
  }

  return (
    <TeacherPageShell
      badge="Teacher Evaluations"
      title="Evaluations"
      description="Review anonymous class-scoped feedback about your teaching, JA Hub use, and Learners Path support."
      headerStats={
        <>
          <TeacherHeaderMetric
            label="Response Rate"
            value={`${stats.responseRate}%`}
            caption="Anonymous submissions over eligible learners"
            accent="sky"
          />
          <TeacherHeaderMetric
            label="Eligible Learners"
            value={stats.eligible}
            caption="Qualified learners in the current filter scope"
            accent="teal"
          />
          <TeacherHeaderMetric
            label="Average Rating"
            value={stats.averageOverall}
            caption={summary?.tabTitle ?? 'Averages across all rating categories'}
            accent="amber"
          />
          <TeacherHeaderMetric
            label="Latest Response"
            value={stats.latestResponse}
            caption="Teacher view stays anonymous"
            accent="rose"
          />
        </>
      }
    >
      <TeacherSectionCard
        title="Evaluation Scope"
        description="Switch tabs to focus on one teacher-facing evaluation surface at a time."
        className="teacher-figma-stagger"
      >
        <div className="teacher-figma-segment">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setEvaluationType(tab.value)}
              className={cn(
                'teacher-figma-segment__item',
                evaluationType === tab.value && 'is-active',
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </TeacherSectionCard>

      <TeacherSectionCard
        title="Filters"
        description={summary?.tabDescription ?? 'Filter evaluation insight by class and grading period.'}
        className="teacher-figma-stagger"
      >
        <div className="teacher-figma-toolbar">
          <div className="teacher-figma-toolbar__left">
            <Button
              type="button"
              variant="teacherOutline"
              className="rounded-xl px-3"
              disabled
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            <select
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              className="teacher-select min-w-[210px] text-sm"
            >
              <option value="">All classes</option>
              {(summary?.classes ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.subjectName} ({item.subjectCode})
                </option>
              ))}
            </select>
            <select
              value={gradingPeriod}
              onChange={(event) =>
                setGradingPeriod(
                  (event.target.value as TeacherEvaluationSummaryResponse['periods'][number]) || '',
                )
              }
              className="teacher-select min-w-[190px] text-sm"
            >
              <option value="">All periods</option>
              {(summary?.periods ?? []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="teacher-figma-toolbar__right">
            <TeacherHeaderMetric
              label="Responses"
              value={stats.responses}
              caption="Submitted in this scope"
              accent="neutral"
            />
          </div>
        </div>
      </TeacherSectionCard>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_22rem]">
        <TeacherSectionCard
          title="Category Snapshot"
          description={summary?.tabTitle ?? 'Anonymous averages by evaluation category.'}
          className="teacher-figma-stagger"
        >
          {!summary || summary.categoryAverages.length === 0 ? (
            <TeacherEmptyState
              title="No evaluation responses found"
              description="Responses will appear here once learners submit feedback for the selected scope."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {summary.categoryAverages.map((item) => (
                <div
                  key={item.key}
                  className="teacher-soft-panel rounded-[14px] border border-[#edf2f7] px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--teacher-text-muted)]">
                        {item.label}
                      </p>
                      <p className="mt-2 text-3xl font-bold tracking-tight text-[var(--teacher-text-strong)]">
                        {summary.overview.responseCount > 0 ? item.average.toFixed(2) : '--'}
                      </p>
                    </div>
                    <div className="rounded-[10px] border border-[#e2e8f0] bg-white p-2.5 text-[var(--teacher-accent)]">
                      <BookOpen className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[var(--teacher-text-muted)]">
                    Average learner rating for this category in the current class and period scope.
                  </p>
                </div>
              ))}
            </div>
          )}
        </TeacherSectionCard>

        <div className="space-y-5">
          <TeacherSectionCard
            title="Response Windows"
            description="Track how many eligible learners responded per class and period."
            className="teacher-figma-stagger"
          >
            {!summary || summary.trends.length === 0 ? (
              <TeacherEmptyState
                title="No active evaluation windows"
                description="A class will appear here once it has an eligible evaluation window and qualifying learner activity."
              />
            ) : (
              <div className="space-y-3">
                {summary.trends.map((trend) => (
                  <div
                    key={`${trend.classId}-${trend.gradingPeriod}`}
                    className="rounded-[14px] border border-[#edf2f7] bg-white px-4 py-4"
                  >
                    <p className="text-sm font-semibold text-[var(--teacher-text-strong)]">
                      {trend.classLabel}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--teacher-text-muted)]">
                      {trend.gradingPeriod}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-sm text-[var(--teacher-text-muted)]">
                      <span>{trend.responseCount} responses</span>
                      <span>{trend.eligibleCount} eligible</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TeacherSectionCard>

          <TeacherSectionCard
            title="Anonymous Comments"
            description="Free-text comments are shown without student identity."
            className="teacher-figma-stagger"
          >
            {!summary || summary.comments.length === 0 ? (
              <TeacherEmptyState
                title="No written comments yet"
                description="Comments will appear here once learners leave optional written feedback."
              />
            ) : (
              <div className="space-y-3">
                {summary.comments.map((comment) => (
                  <article
                    key={comment.id}
                    className="rounded-[14px] border border-[#edf2f7] bg-white px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--teacher-text-muted)]">
                      <span>{comment.classLabel}</span>
                      <span>{comment.gradingPeriod}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--teacher-text-strong)]">
                      {comment.comment}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </TeacherSectionCard>
        </div>
      </div>

      <TeacherSectionCard
        title="Evaluation Notes"
        description="Teacher-facing results stay limited to teaching, JA Hub, and Learners Path in your own classes."
        className="teacher-figma-stagger"
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="teacher-soft-panel rounded-[14px] border border-[#edf2f7] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--teacher-text-muted)]">
              Scope Boundary
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--teacher-text-strong)]">
              Teacher pages no longer mix in LMS-wide, overall, or admin-only evaluation analytics.
            </p>
          </div>
          <div className="teacher-soft-panel rounded-[14px] border border-[#edf2f7] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--teacher-text-muted)]">
              Identity Protection
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--teacher-text-strong)]">
              Comments and category averages are shown without exposing individual learner identities.
            </p>
          </div>
          <div className="teacher-soft-panel rounded-[14px] border border-[#edf2f7] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--teacher-text-muted)]">
              Activation Rule
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--teacher-text-strong)]">
              Learners only appear in response windows after finalized periods and real JA or Learners Path usage.
            </p>
          </div>
        </div>
      </TeacherSectionCard>
    </TeacherPageShell>
  );
}
