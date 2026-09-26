'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { lxpService } from '@/services/lxp-service';
import type {
  AssignedSystemEvaluationItem,
  StudentTeacherEvaluationCompletedItem,
  StudentTeacherEvaluationDashboardResponse,
  StudentTeacherEvaluationItem,
  TeacherEvaluationType,
} from '@/types/lxp';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';

type EvaluationFilter = 'all' | 'system' | 'ja_hub' | 'teacher';

type UnifiedPendingEvaluation =
  | {
      kind: 'system';
      filter: 'system' | 'ja_hub';
      id: string;
      title: string;
      description: string;
      subtitle: string;
      questions: Array<{ key: string; label: string }>;
      source: AssignedSystemEvaluationItem;
    }
  | {
      kind: 'teacher';
      filter: 'teacher';
      id: string;
      title: string;
      description: string;
      subtitle: string;
      questions: Array<{ key: string; label: string }>;
      source: StudentTeacherEvaluationItem;
    };

type UnifiedCompletedEvaluation = {
  id: string;
  filter: EvaluationFilter;
  title: string;
  subtitle: string;
  submittedAt?: string | null;
};

const FILTERS: Array<{ value: EvaluationFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'system', label: 'System' },
  { value: 'ja_hub', label: 'JA Hub' },
  { value: 'teacher', label: 'Teachers' },
];

export const EVALUATION_RATING_SCALE = [
  {
    value: 0,
    label: 'Not observed',
    description: 'The behavior or result was not demonstrated.',
  },
  {
    value: 1,
    label: 'Rarely',
    description: 'It was demonstrated only in a few instances.',
  },
  {
    value: 2,
    label: 'Sometimes',
    description: 'It was demonstrated in some instances, but not regularly.',
  },
  {
    value: 3,
    label: 'Usually',
    description: 'It was demonstrated in most instances.',
  },
  {
    value: 4,
    label: 'Consistently',
    description: 'It was demonstrated reliably across the experience.',
  },
  {
    value: 5,
    label: 'Excellent',
    description: 'It was demonstrated at an exceptional level throughout.',
  },
] as const;

function classLabel(item: StudentTeacherEvaluationItem | StudentTeacherEvaluationCompletedItem) {
  if (!item.class) return 'Class not available';
  const section = item.class.section
    ? `Grade ${item.class.section.gradeLevel} - ${item.class.section.name}`
    : 'Section unavailable';
  return `${item.class.subjectCode} | ${item.class.subjectName} | ${section}`;
}

function systemSubtitle(item: AssignedSystemEvaluationItem) {
  const classPart = item.class
    ? `${item.class.subjectCode} | ${item.class.subjectName}`
    : item.audienceRole === 'teacher'
      ? 'Teacher system evaluation'
      : 'Student system evaluation';
  return `${classPart} | due ${new Date(item.endsAt).toLocaleDateString('en-US')}`;
}

function formatTeacherType(type: TeacherEvaluationType) {
  if (type === 'ja_hub') return 'JA Hub';
  if (type === 'learners_path') return 'Learners Path';
  return 'Teachers';
}

function filterLabel(value: EvaluationFilter) {
  if (value === 'ja_hub') return 'JA Hub';
  if (value === 'teacher') return 'Teachers';
  if (value === 'system') return 'System';
  return 'All';
}

function RatingScale({
  questionKey,
  questionLabel,
  value,
  onChange,
}: {
  questionKey: string;
  questionLabel: string;
  value: number | null;
  onChange: (value: number) => void;
}) {
  const [explainedRating, setExplainedRating] = useState<number | null>(null);
  const selectedOption = EVALUATION_RATING_SCALE.find(
    (option) => option.value === value,
  );

  return (
    <div>
      <div
        role="radiogroup"
        aria-label={`Rating for ${questionLabel}`}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-6"
      >
        {EVALUATION_RATING_SCALE.map((option) => {
          const tooltipId = `${questionKey}-${option.value}-meaning`;
          const buttonId = `${questionKey}-${option.value}-rating`;
          const selected = value === option.value;
          const explained = explainedRating === option.value;

          return (
            <div key={option.value} className="relative min-w-0">
              <button
                id={buttonId}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={value === null ? (option.value === 0 ? 0 : -1) : selected ? 0 : -1}
                aria-describedby={explained ? tooltipId : undefined}
                aria-label={`${option.value} stars, ${option.label}. ${option.description}`}
                onClick={() => onChange(option.value)}
                onMouseEnter={() => setExplainedRating(option.value)}
                onMouseLeave={() => setExplainedRating(null)}
                onFocus={() => setExplainedRating(option.value)}
                onBlur={() => setExplainedRating(null)}
                onKeyDown={(event) => {
                  const currentIndex = EVALUATION_RATING_SCALE.findIndex(
                    (candidate) => candidate.value === option.value,
                  );
                  let nextIndex: number | null = null;
                  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                    nextIndex = (currentIndex + 1) % EVALUATION_RATING_SCALE.length;
                  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                    nextIndex =
                      (currentIndex - 1 + EVALUATION_RATING_SCALE.length) %
                      EVALUATION_RATING_SCALE.length;
                  } else if (event.key === 'Home') {
                    nextIndex = 0;
                  } else if (event.key === 'End') {
                    nextIndex = EVALUATION_RATING_SCALE.length - 1;
                  }
                  if (nextIndex === null) return;
                  event.preventDefault();
                  const nextOption = EVALUATION_RATING_SCALE[nextIndex];
                  onChange(nextOption.value);
                  document
                    .getElementById(`${questionKey}-${nextOption.value}-rating`)
                    ?.focus();
                }}
                className={cn(
                  'flex min-h-12 w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--student-navy)] focus-visible:ring-offset-2',
                  selected
                    ? 'border-[var(--student-navy)] bg-[var(--student-navy)] text-white'
                    : 'border-[var(--student-outline)] bg-white text-[var(--student-text-strong)] hover:border-[var(--student-navy)] hover:bg-[var(--student-white)]',
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-7 min-w-7 items-center justify-center rounded-md text-xs font-bold',
                    selected
                      ? 'bg-white/15 text-white'
                      : 'bg-[var(--student-white)] text-[var(--student-navy)]',
                  )}
                >
                  {option.value}
                  {option.value > 0 ? <Star className="ml-0.5 h-3 w-3" /> : null}
                </span>
                <span className="min-w-0 text-xs font-semibold leading-4">
                  {option.label}
                </span>
              </button>
              {explained ? (
                <div
                  id={tooltipId}
                  role="tooltip"
                  className="absolute bottom-[calc(100%+0.5rem)] left-1/2 z-30 w-56 -translate-x-1/2 rounded-lg bg-[var(--student-navy)] px-3 py-2 text-xs leading-5 text-white shadow-lg"
                >
                  <span className="font-bold">
                    {option.value} · {option.label}
                  </span>
                  <span className="mt-0.5 block text-white/80">
                    {option.description}
                  </span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div
        aria-live="polite"
        className={cn(
          'mt-3 min-h-14 rounded-lg border px-3 py-2 text-sm',
          selectedOption
            ? 'border-[var(--student-outline)] bg-[var(--student-white)] text-[var(--student-text-strong)]'
            : 'border-dashed border-[var(--student-outline)] text-[var(--student-text-muted)]',
        )}
      >
        {selectedOption ? (
          <>
            <span className="font-bold">
              {selectedOption.value} · {selectedOption.label}
            </span>
            <span className="ml-2">{selectedOption.description}</span>
          </>
        ) : (
          'Choose a rating. Hover or focus an option to read what it means.'
        )}
      </div>
    </div>
  );
}

export function StudentTeacherEvaluationsPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [systemDashboard, setSystemDashboard] = useState<{
    pending: AssignedSystemEvaluationItem[];
    completed: AssignedSystemEvaluationItem[];
  } | null>(null);
  const [teacherDashboard, setTeacherDashboard] =
    useState<StudentTeacherEvaluationDashboardResponse | null>(null);
  const [filter, setFilter] = useState<EvaluationFilter>('all');
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, number | null>>({});
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [systemResponse, teacherResponse] = await Promise.all([
        lxpService.getMySystemEvaluations(),
        lxpService.getStudentTeacherEvaluationDashboard(),
      ]);
      setSystemDashboard(systemResponse.data);
      setTeacherDashboard(teacherResponse.data);
    } catch {
      toast.error('Failed to load evaluation dashboard');
      setLoadError(
        "We couldn't load your assigned evaluations. Check your connection and try again.",
      );
      setSystemDashboard(null);
      setTeacherDashboard(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchDashboard();
  }, []);

  const pendingItems = useMemo<UnifiedPendingEvaluation[]>(() => {
    const systemItems =
      systemDashboard?.pending.map((item) => ({
        kind: 'system' as const,
        filter: item.formType,
        id: item.id,
        title: item.title,
        description: item.description,
        subtitle: systemSubtitle(item),
        questions: item.questions,
        source: item,
      })) ?? [];

    const teacherItems =
      teacherDashboard?.pending.map((item) => ({
        kind: 'teacher' as const,
        filter: 'teacher' as const,
        id: `${item.classId}:${item.gradingPeriod}:${item.evaluationType}`,
        title: formatTeacherType(item.evaluationType),
        description: item.description,
        subtitle: `${classLabel(item)} | ${item.gradingPeriod}`,
        questions: item.questions,
        source: item,
      })) ?? [];

    const combined = [...systemItems, ...teacherItems];
    return filter === 'all'
      ? combined
      : combined.filter((item) => item.filter === filter);
  }, [filter, systemDashboard, teacherDashboard]);

  const completedItems = useMemo<UnifiedCompletedEvaluation[]>(() => {
    const systemItems =
      systemDashboard?.completed.map((item) => ({
        id: item.id,
        filter: item.formType,
        title: item.title,
        subtitle: systemSubtitle(item),
        submittedAt: item.submittedAt,
      })) ?? [];
    const teacherItems =
      teacherDashboard?.completed.map((item) => ({
        id: item.id,
        filter: 'teacher' as const,
        title: item.title,
        subtitle: classLabel(item),
        submittedAt: item.submittedAt,
      })) ?? [];
    const combined = [...systemItems, ...teacherItems];
    return filter === 'all'
      ? combined
      : combined.filter((item) => item.filter === filter);
  }, [filter, systemDashboard, teacherDashboard]);

  const activeItem = useMemo(() => {
    if (!activeKey) return null;
    return pendingItems.find((item) => item.id === activeKey) ?? null;
  }, [activeKey, pendingItems]);
  const hasMissingRating = activeItem
    ? activeItem.questions.some(
        (question) => ratings[question.key] === null || ratings[question.key] === undefined,
      )
    : true;
  const answeredCount = activeItem
    ? activeItem.questions.filter(
        (question) =>
          ratings[question.key] !== null && ratings[question.key] !== undefined,
      ).length
    : 0;

  useEffect(() => {
    if (!activeItem) {
      setRatings({});
      setComment('');
      return;
    }
    setRatings(
      Object.fromEntries(activeItem.questions.map((question) => [question.key, null])),
    );
    setComment('');
  }, [activeItem]);

  const handleSubmit = async () => {
    if (!activeItem) return;
    const hasMissing = activeItem.questions.some(
      (question) => ratings[question.key] === null || ratings[question.key] === undefined,
    );
    if (hasMissing) {
      toast.error('Complete every rating before submitting.');
      return;
    }

    const questionRatings = Object.fromEntries(
      Object.entries(ratings).map(([key, value]) => [key, Number(value)]),
    );

    try {
      setSubmitting(true);
      if (activeItem.kind === 'system') {
        await lxpService.submitAssignedSystemEvaluation(activeItem.source.id, {
          questionRatings,
          feedback: comment.trim() || undefined,
        });
      } else {
        await lxpService.submitTeacherEvaluation({
          classId: activeItem.source.classId,
          gradingPeriod: activeItem.source.gradingPeriod,
          evaluationType: activeItem.source.evaluationType,
          ratings: questionRatings,
          comment: comment.trim() || undefined,
        });
      }
      toast.success('Evaluation submitted.');
      setActiveKey(null);
      await fetchDashboard();
    } catch {
      toast.error('Failed to submit evaluation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-[1600px] space-y-6 px-4 pb-10 pt-3 text-[var(--student-text-strong)] sm:px-6">
      <header className="flex flex-col gap-4 border-b border-[var(--student-outline)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--student-text-muted)]">
            Evaluation Inbox
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--student-text-strong)]">Evaluations</h1>
          <p className="mt-1 text-sm text-[var(--student-text-muted)]">
            Answer assigned forms for the system, JA Hub, and teachers.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          {teacherDashboard ? (
            <span className="inline-flex w-fit rounded-full border border-[var(--student-outline)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--student-text-strong)]">
              Current quarter {teacherDashboard.currentAcademicState.quarter}
            </span>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={filter === item.value}
                onClick={() => {
                  setFilter(item.value);
                  setActiveKey(null);
                }}
                className={
                  filter === item.value
                    ? 'rounded-full bg-[var(--student-navy)] px-4 py-2 text-sm font-semibold text-white shadow-sm'
                    : 'rounded-full border border-[var(--student-outline)] bg-white px-4 py-2 text-sm font-semibold text-[var(--student-text-strong)] hover:border-[var(--student-outline)] hover:bg-[var(--student-white)]'
                }
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {loadError ? (
        <section
          role="alert"
          className="rounded-2xl border border-[var(--student-red)] bg-white px-6 py-10 text-center shadow-sm"
        >
          <h2 className="text-lg font-bold text-[var(--student-text-strong)]">
            Evaluations unavailable
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--student-text-muted)]">
            {loadError}
          </p>
          <Button
            type="button"
            onClick={() => void fetchDashboard()}
            className="mt-5 bg-[var(--student-navy)] text-white hover:bg-[var(--student-navy)]/90"
          >
            Retry loading evaluations
          </Button>
        </section>
      ) : (
      <div className="grid items-start gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="space-y-5 lg:sticky lg:top-4">
          <section>
            <div className="mb-3">
              <h2 className="text-base font-bold text-[var(--student-text-strong)]">Pending Evaluations</h2>
              <p className="mt-1 text-sm text-[var(--student-text-muted)]">
                Filters only show assigned forms. They do not create new forms.
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[var(--student-outline)] bg-white shadow-sm">
              {loading ? (
                <p className="px-4 py-5 text-sm text-[var(--student-text-muted)]">Loading pending evaluations...</p>
              ) : pendingItems.length === 0 ? (
                <div className="px-4 py-8 text-sm text-[var(--student-text-muted)]">
                  No assigned forms for the selected filter.
                </div>
              ) : (
                pendingItems.map((item) => {
                  const selected = item.id === activeKey;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveKey(item.id)}
                      className={cn(
                        'block w-full border-b border-[var(--student-outline)] px-4 py-4 text-left last:border-b-0',
                        selected ? 'bg-[var(--student-navy)] text-white' : 'bg-white hover:bg-[var(--student-white)]',
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em]',
                            selected
                              ? 'bg-white/10 text-white'
                              : 'bg-[var(--student-white)] text-[var(--student-text-muted)]',
                          )}
                        >
                          {filterLabel(item.filter)}
                        </span>
                        <span
                          className={cn(
                            'text-[11px] font-semibold',
                            selected ? 'text-white/75' : 'text-[var(--student-text-muted)]',
                          )}
                        >
                          Open
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-semibold">{item.title}</p>
                      <p className={cn('mt-1 text-xs', selected ? 'text-white/75' : 'text-[var(--student-text-muted)]')}>
                        {item.subtitle}
                      </p>
                      <p className={cn('mt-2 line-clamp-2 text-sm', selected ? 'text-white/75' : 'text-[var(--student-text-muted)]')}>
                        {item.description}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section>
            <div className="mb-3">
              <h2 className="text-base font-bold text-[var(--student-text-strong)]">Completed Evaluations</h2>
              <p className="mt-1 text-sm text-[var(--student-text-muted)]">
                Submitted forms remain visible for your history.
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[var(--student-outline)] bg-white shadow-sm">
              {completedItems.length === 0 ? (
                <p className="px-4 py-5 text-sm text-[var(--student-text-muted)]">No completed evaluations yet.</p>
              ) : (
                completedItems.map((item) => (
                  <div
                    key={item.id}
                    className="border-b border-[var(--student-outline)] px-4 py-4 last:border-b-0"
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-[var(--student-success-text)]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Submitted
                    </div>
                    <p className="mt-2 text-sm font-semibold text-[var(--student-text-strong)]">{item.title}</p>
                    <p className="mt-1 text-xs text-[var(--student-text-muted)]">{item.subtitle}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>

        <section className="w-full overflow-visible rounded-2xl border border-[var(--student-outline)] bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-[var(--student-outline)] px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--student-text-strong)]">
                {activeItem ? activeItem.title : 'Choose an Evaluation'}
              </h2>
              <p className="mt-1 text-sm text-[var(--student-text-muted)]">
                {activeItem ? activeItem.subtitle : 'Select a pending form to start rating.'}
              </p>
            </div>
            {activeItem ? (
              <span className="w-fit rounded-full bg-[var(--student-white)] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--student-text-muted)]">
                {filterLabel(activeItem.filter)}
              </span>
            ) : null}
          </div>
          {!activeItem ? (
            <div className="flex min-h-[26rem] items-center justify-center px-6 py-10">
              <div className="max-w-sm rounded-2xl border border-dashed border-[var(--student-outline)] bg-[var(--student-white)] px-6 py-8 text-center">
                <p className="text-base font-semibold text-[var(--student-text-strong)]">No evaluation selected</p>
                <p className="mt-2 text-sm text-[var(--student-text-muted)]">
                  Select one assigned evaluation on the left to open the form.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex flex-col gap-3 border-b border-[var(--student-outline)] bg-[var(--student-white)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--student-text-strong)]">
                    Choose one rating for every question
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--student-text-muted)]">
                    Hover or focus a choice for its meaning. Zero is a valid answer;
                    unanswered questions stay blank.
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-[var(--student-navy)]">
                  {answeredCount} of {activeItem.questions.length} answered
                </span>
              </div>

              <div>
                {activeItem.questions.map((question, index) => (
                  <fieldset
                    key={question.key}
                    className="border-b border-[var(--student-outline)] px-5 py-5 last:border-b-0 sm:px-6"
                  >
                    <legend className="flex w-full gap-3 pb-4">
                      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--student-navy)] text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <span className="text-sm font-semibold leading-6 text-[var(--student-text-strong)] sm:text-base">
                        {question.label}
                      </span>
                    </legend>
                    <RatingScale
                      questionKey={question.key}
                      questionLabel={question.label}
                      value={ratings[question.key] ?? null}
                      onChange={(value) =>
                        setRatings((current) => ({ ...current, [question.key]: value }))
                      }
                    />
                  </fieldset>
                ))}
              </div>

              <div className="border-t border-[var(--student-outline)] px-5 py-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                  <div>
                    <p className="text-sm font-semibold text-[var(--student-text-strong)]">Optional comment</p>
                    <Textarea
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      rows={4}
                      className="mt-2 border-[var(--student-outline)] bg-[var(--student-white)] focus-visible:ring-[var(--student-outline)]"
                      placeholder="Share a short comment about this evaluation."
                    />
                  </div>
                  <Button
                    onClick={() => void handleSubmit()}
                    disabled={submitting || hasMissingRating}
                    className="min-w-[11rem] bg-[var(--student-red)] text-white hover:bg-[var(--student-red-hover)]"
                  >
                    {submitting ? 'Submitting...' : 'Submit Evaluation'}
                  </Button>
                </div>
                {hasMissingRating ? (
                  <p className="mt-3 text-xs text-[var(--student-text-muted)]">
                    Rate every question before submitting. A 0-star answer is allowed.
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </section>
      </div>
      )}
    </main>
  );
}
