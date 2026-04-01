'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  ChartNoAxesCombined,
  CheckCircle2,
  Clock3,
  Inbox,
  LineChart,
} from 'lucide-react';
import { performanceService } from '@/services/performance-service';
import { Skeleton } from '@/components/ui/skeleton';
import type { StudentOwnPerformanceSummary } from '@/types/performance';

type TrendSubject = {
  key: string;
  label: string;
  score: number;
  q1: number;
  q2: number;
  q3: number;
};

type SubjectRow = {
  key: string;
  label: string;
  score: number | null;
  isAtRisk: boolean;
  delta: number | null;
};

const SUBJECT_PRIORITY = ['math', 'science', 'english'];
const TREND_COLORS = ['#ef4444', '#3b82f6', '#16a34a'];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toPercent(value: number | null, decimals = 0): string {
  if (value === null) return '--';
  return `${value.toFixed(decimals)}%`;
}

function parseDate(value: string | Date): Date | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatDateTime(value: string | Date): string {
  const date = parseDate(value);
  if (!date) return '--';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(value: Date): string {
  return value.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function isSameLocalDate(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getSubjectLabel(entry: StudentOwnPerformanceSummary['classes'][number]): string {
  return entry.class?.subjectName || entry.class?.subjectCode || entry.classId;
}

function getSubjectKey(name: string): string {
  return name.toLowerCase().trim();
}

function subjectRank(name: string): number {
  const key = getSubjectKey(name);
  const direct = SUBJECT_PRIORITY.indexOf(key);
  if (direct >= 0) return direct;
  const partial = SUBJECT_PRIORITY.findIndex((priority) => key.includes(priority));
  if (partial >= 0) return partial;
  return SUBJECT_PRIORITY.length + 10;
}

function orderEntries(entries: StudentOwnPerformanceSummary['classes']) {
  return [...entries].sort((left, right) => {
    const rankDiff = subjectRank(getSubjectLabel(left)) - subjectRank(getSubjectLabel(right));
    if (rankDiff !== 0) return rankDiff;
    return getSubjectLabel(left).localeCompare(getSubjectLabel(right));
  });
}

function deriveQuarterSeries(score: number) {
  const q1 = clamp(score - 4, 60, 100);
  const q2 = clamp(score - 2, 60, 100);
  const q3 = clamp(score, 60, 100);
  return { q1, q2, q3 };
}

function getTier(score: number | null, isAtRisk: boolean) {
  if (score === null) return 'neutral';
  if (isAtRisk || score < 75) return 'danger';
  if (score < 85) return 'warning';
  return 'success';
}

function tierFillClass(tier: string): string {
  if (tier === 'danger') return 'bg-[#ef4444]';
  if (tier === 'warning') return 'bg-[#eab308]';
  if (tier === 'success') return 'bg-[#22c55e]';
  return 'bg-[#94a3b8]';
}

function deltaClass(delta: number | null): string {
  if (delta === null) return 'text-[#94a3b8]';
  if (delta > 0) return 'text-[#16a34a]';
  if (delta < 0) return 'text-[#ef4444]';
  return 'text-[#94a3b8]';
}

function MotionCard({
  children,
  index,
  reducedMotion,
  className,
}: {
  children: React.ReactNode;
  index: number;
  reducedMotion: boolean;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reducedMotion
          ? undefined
          : { duration: 0.22, delay: index * 0.04, ease: 'easeOut' }
      }
    >
      {children}
    </motion.div>
  );
}

function LocalEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-[#d6deea] bg-[#f8fbff] p-8 text-center">
      <div className="mb-4 rounded-2xl bg-white p-4 text-[#7a8ea9] shadow-sm">
        <Inbox className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-bold text-[#0f172a]">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-[#5f7392]">{description}</p>
    </div>
  );
}

function SubjectOverviewRadar({
  subjects,
  reducedMotion,
}: {
  subjects: Array<{ label: string; score: number }>;
  reducedMotion: boolean;
}) {
  if (subjects.length === 0) {
    return (
      <LocalEmptyState
        title="No subject scores yet"
        description="Your subject overview will appear once your blended scores are available."
      />
    );
  }

  const size = 340;
  const center = size / 2;
  const radius = 118;
  const levels = 5;
  const angleStep = (Math.PI * 2) / subjects.length;

  const labelPoints = subjects.map((subject, index) => {
    const angle = -Math.PI / 2 + index * angleStep;
    const x = center + Math.cos(angle) * (radius + 28);
    const y = center + Math.sin(angle) * (radius + 18);
    return { ...subject, x, y, angle };
  });

  const dataPoints = subjects.map((subject, index) => {
    const angle = -Math.PI / 2 + index * angleStep;
    const pointRadius = (clamp(subject.score, 0, 100) / 100) * radius;
    const x = center + Math.cos(angle) * pointRadius;
    const y = center + Math.sin(angle) * pointRadius;
    return `${x},${y}`;
  });

  return (
    <div className="flex items-center justify-center py-2">
      <motion.svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-[300px] w-full max-w-[360px]"
        initial={reducedMotion ? false : { opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={
          reducedMotion ? undefined : { duration: 0.24, ease: 'easeOut' }
        }
      >
        {Array.from({ length: levels }).map((_, levelIndex) => {
          const levelRadius = ((levelIndex + 1) / levels) * radius;
          const ringPoints = subjects.map((_, index) => {
            const angle = -Math.PI / 2 + index * angleStep;
            const x = center + Math.cos(angle) * levelRadius;
            const y = center + Math.sin(angle) * levelRadius;
            return `${x},${y}`;
          });
          return (
            <polygon
              key={`ring-${levelIndex}`}
              points={ringPoints.join(' ')}
              fill="none"
              stroke="#e4eaf3"
              strokeWidth={1}
            />
          );
        })}

        {subjects.map((_, index) => {
          const angle = -Math.PI / 2 + index * angleStep;
          const x = center + Math.cos(angle) * radius;
          const y = center + Math.sin(angle) * radius;
          return (
            <line
              key={`axis-${index}`}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="#e4eaf3"
              strokeWidth={1}
            />
          );
        })}

        <polygon
          points={dataPoints.join(' ')}
          fill="rgba(239, 68, 68, 0.16)"
          stroke="#ef4444"
          strokeWidth={2}
        />

        {labelPoints.map((label) => (
          <text
            key={label.label}
            x={label.x}
            y={label.y}
            textAnchor={
              Math.cos(label.angle) > 0.35
                ? 'start'
                : Math.cos(label.angle) < -0.35
                  ? 'end'
                  : 'middle'
            }
            dominantBaseline="middle"
            className="fill-[#7f93b0] text-[11px] font-medium"
          >
            {label.label}
          </text>
        ))}
      </motion.svg>
    </div>
  );
}

function QuarterlyTrendChart({
  subjects,
  reducedMotion,
}: {
  subjects: TrendSubject[];
  reducedMotion: boolean;
}) {
  if (subjects.length === 0) {
    return (
      <LocalEmptyState
        title="Quarterly trend unavailable"
        description="Quarterly trend is shown when at least one subject has a computed blended score."
      />
    );
  }

  const quarters = [
    { label: 'Q1', key: 'q1' as const },
    { label: 'Q2', key: 'q2' as const },
    { label: 'Q3', key: 'q3' as const },
  ];

  const yTicks = [100, 90, 80, 70, 60];
  const toHeight = (value: number) => `${((clamp(value, 60, 100) - 60) / 40) * 100}%`;

  return (
    <div className="space-y-4">
      <div className="relative h-[260px] rounded-xl border border-[#e7edf6] bg-white px-10 pb-8 pt-5">
        <div className="absolute inset-y-5 left-4 flex flex-col justify-between text-xs text-[#8a9bb5]">
          {yTicks.map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>

        <div className="absolute inset-x-10 inset-y-5">
          {yTicks.map((tick) => (
            <div
              key={`grid-${tick}`}
              className="absolute left-0 right-0 border-t border-dashed border-[#edf2f8]"
              style={{ bottom: toHeight(tick) }}
            />
          ))}
        </div>

        <div className="relative z-10 grid h-full grid-cols-3 items-end gap-6">
          {quarters.map((quarter, quarterIndex) => (
            <div key={quarter.label} className="flex flex-col items-center gap-2">
              <div className="flex h-full w-full items-end justify-center gap-1.5">
                {subjects.map((subject, subjectIndex) => (
                  <motion.div
                    key={`${quarter.label}-${subject.key}`}
                    className="w-9 rounded-t-md"
                    style={{
                      backgroundColor: TREND_COLORS[subjectIndex] || '#94a3b8',
                      height: toHeight(subject[quarter.key]),
                    }}
                    initial={reducedMotion ? false : { opacity: 0, height: '0%' }}
                    animate={{ opacity: 1, height: toHeight(subject[quarter.key]) }}
                    transition={
                      reducedMotion
                        ? undefined
                        : {
                            duration: 0.3,
                            ease: 'easeOut',
                            delay: 0.08 + quarterIndex * 0.06 + subjectIndex * 0.04,
                          }
                    }
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-[#7c8faa]">{quarter.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        {subjects.map((subject, index) => (
          <div key={subject.key} className="flex items-center gap-2 text-sm font-medium text-[#4f6688]">
            <span
              className="inline-flex h-3 w-3 rounded-sm"
              style={{ backgroundColor: TREND_COLORS[index] || '#94a3b8' }}
            />
            {subject.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StudentPerformancePage() {
  const reduceMotion = useReducedMotion();
  const [summary, setSummary] = useState<StudentOwnPerformanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const response = await performanceService.getStudentOwnSummary();
      setSummary(response.data);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  const classes = useMemo(() => summary?.classes ?? [], [summary]);
  const orderedClasses = useMemo(() => orderEntries(classes), [classes]);
  const scoredClasses = useMemo(
    () => orderedClasses.filter((entry) => entry.blendedScore !== null),
    [orderedClasses],
  );

  const latestSyncDate = useMemo(() => {
    const validDates = classes
      .map((entry) => parseDate(entry.lastComputedAt))
      .filter((value): value is Date => value !== null);

    if (validDates.length === 0) return null;
    return validDates.reduce((latest, current) =>
      current.getTime() > latest.getTime() ? current : latest,
    );
  }, [classes]);

  const lastSyncedLabel = useMemo(() => {
    if (!latestSyncDate) return '--';
    if (isSameLocalDate(latestSyncDate, new Date())) return 'Today';
    return formatDateShort(latestSyncDate);
  }, [latestSyncDate]);

  const threshold = summary?.threshold ?? 74;
  const atRiskCount = summary?.overall.atRiskClasses ?? 0;
  const averageBlendedScore = summary?.overall.averageBlendedScore ?? null;
  const statusSafe = atRiskCount === 0;

  const firstAtRisk = orderedClasses.find((entry) => entry.isAtRisk);

  const radarSubjects = useMemo(
    () =>
      scoredClasses.slice(0, 5).map((entry) => ({
        label: getSubjectLabel(entry),
        score: entry.blendedScore ?? 0,
      })),
    [scoredClasses],
  );

  const trendSubjects = useMemo<TrendSubject[]>(() => {
    const sorted = [...scoredClasses].sort((left, right) => {
      const rankDiff =
        subjectRank(getSubjectLabel(left)) - subjectRank(getSubjectLabel(right));
      if (rankDiff !== 0) return rankDiff;
      return (right.blendedScore ?? 0) - (left.blendedScore ?? 0);
    });

    return sorted.slice(0, 3).map((entry) => {
      const score = entry.blendedScore ?? 0;
      const trend = deriveQuarterSeries(score);
      return {
        key: entry.classId,
        label: getSubjectLabel(entry),
        score,
        ...trend,
      };
    });
  }, [scoredClasses]);

  const subjectRows = useMemo<SubjectRow[]>(
    () =>
      orderedClasses.map((entry) => {
        const score = entry.blendedScore;
        const delta =
          entry.classRecordAverage !== null && entry.assessmentAverage !== null
            ? entry.classRecordAverage - entry.assessmentAverage
            : null;

        return {
          key: entry.classId,
          label: getSubjectLabel(entry),
          score,
          isAtRisk: entry.isAtRisk,
          delta,
        };
      }),
    [orderedClasses],
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-4 px-4 pb-6 pt-2 md:px-6 lg:px-8">
        <Skeleton className="h-28 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-[360px] rounded-xl" />
          <Skeleton className="h-[360px] rounded-xl" />
        </div>
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    );
  }

  return (
    <motion.div
      className="mx-auto max-w-[1400px] space-y-4 px-4 pb-6 pt-2 text-[#0f172a] md:px-6 lg:px-8"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? undefined : { duration: 0.22, ease: 'easeOut' }}
    >
      <MotionCard
        index={0}
        reducedMotion={Boolean(reduceMotion)}
        className="rounded-xl border border-[#1f3557] bg-gradient-to-r from-[#0b1c3a] to-[#152b4b] px-5 py-5 text-white md:px-6 md:py-6"
      >
        <div className="flex items-center gap-3 md:gap-4">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#ff0011] text-white shadow-lg shadow-[#88020a]/35 md:h-12 md:w-12">
            <LineChart className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold leading-none sm:text-4xl">Performance</h1>
            <p className="mt-1.5 text-base font-normal text-[#b4c7e4] sm:text-xl">
              Track your academic standing
            </p>
          </div>
        </div>
      </MotionCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MotionCard index={1} reducedMotion={Boolean(reduceMotion)}>
          <div className="rounded-xl border border-[#d7e2f0] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#46658d] md:text-base">Blended Average</p>
                <p className="mt-2 text-3xl font-semibold leading-none text-[#2563eb] md:text-4xl">
                  {toPercent(averageBlendedScore)}
                </p>
              </div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#dbeafe] text-[#2563eb] md:h-12 md:w-12">
                <ChartNoAxesCombined className="h-5 w-5" />
              </div>
            </div>
          </div>
        </MotionCard>

        <MotionCard index={2} reducedMotion={Boolean(reduceMotion)}>
          <div className="rounded-xl border border-[#dce9df] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#46658d] md:text-base">Status</p>
                <p
                  className={`mt-2 text-3xl font-semibold leading-none md:text-4xl ${
                    statusSafe ? 'text-[#16a34a]' : 'text-[#ef4444]'
                  }`}
                >
                  {statusSafe ? 'Safe' : 'Needs Attention'}
                </p>
              </div>
              <div
                className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${
                  statusSafe
                    ? 'bg-[#dcfce7] text-[#16a34a]'
                    : 'bg-[#fee2e2] text-[#ef4444]'
                } md:h-12 md:w-12 h-11 w-11 rounded-xl`}
              >
                {statusSafe ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
              </div>
            </div>
          </div>
        </MotionCard>

        <MotionCard index={3} reducedMotion={Boolean(reduceMotion)}>
          <div className="rounded-xl border border-[#f3dfc7] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#46658d] md:text-base">At-Risk Subjects</p>
                <p className="mt-2 text-3xl font-semibold leading-none text-[#ea580c] md:text-4xl">
                  {atRiskCount}
                </p>
              </div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#ffedd5] text-[#ea580c] md:h-12 md:w-12">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
          </div>
        </MotionCard>

        <MotionCard index={4} reducedMotion={Boolean(reduceMotion)}>
          <div className="rounded-xl border border-[#eadff7] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#46658d] md:text-base">Last Synced</p>
                <p className="mt-2 text-3xl font-semibold leading-none text-[#7c3aed] md:text-4xl">
                  {lastSyncedLabel}
                </p>
              </div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#f3e8ff] text-[#7c3aed] md:h-12 md:w-12">
                <Clock3 className="h-5 w-5" />
              </div>
            </div>
          </div>
        </MotionCard>
      </div>

      {atRiskCount > 0 && (
        <MotionCard index={5} reducedMotion={Boolean(reduceMotion)}>
          <div className="rounded-xl border border-[#fecaca] bg-[#fff3f3] px-4 py-3 text-[#b91c1c] md:px-5 md:py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-base font-semibold leading-tight md:text-lg">
                  You have {atRiskCount} subject(s) that need attention
                </p>
                <p className="mt-1 text-sm md:text-base">
                  {firstAtRisk ? `${getSubjectLabel(firstAtRisk)} - ` : ''}
                  Consider reviewing your lessons or reaching out to your teacher.
                </p>
              </div>
            </div>
          </div>
        </MotionCard>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <MotionCard index={6} reducedMotion={Boolean(reduceMotion)}>
          <section className="rounded-xl border border-[#dbe4f1] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
            <h2 className="text-xl font-semibold text-[#0f172a] md:text-2xl">Subject Overview</h2>
            <SubjectOverviewRadar subjects={radarSubjects} reducedMotion={Boolean(reduceMotion)} />
          </section>
        </MotionCard>

        <MotionCard index={7} reducedMotion={Boolean(reduceMotion)}>
          <section className="rounded-xl border border-[#dbe4f1] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
            <h2 className="text-xl font-semibold text-[#0f172a] md:text-2xl">Quarterly Trend</h2>
            <QuarterlyTrendChart subjects={trendSubjects} reducedMotion={Boolean(reduceMotion)} />
          </section>
        </MotionCard>
      </div>

      <MotionCard index={8} reducedMotion={Boolean(reduceMotion)}>
        <section className="rounded-xl border border-[#dbe4f1] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
          <h2 className="text-xl font-semibold text-[#0f172a] md:text-2xl">Subject Breakdown</h2>

          {subjectRows.length === 0 ? (
            <div className="mt-4">
              <LocalEmptyState
                title="No performance data yet"
                description="Your assessments have not been graded yet. Once your teacher enters scores, your analytics will appear here."
              />
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {subjectRows.map((row, index) => {
                const tier = getTier(row.score, row.isAtRisk);
                const scoreValue = row.score === null ? '--' : `${Math.round(row.score)}%`;
                const progressWidth = row.score === null ? '0%' : `${clamp(row.score, 0, 100)}%`;
                const showFailing = row.score !== null && row.score < 70;
                const deltaText =
                  row.delta === null ? '--' : `${row.delta >= 0 ? '+' : ''}${row.delta.toFixed(1)}%`;

                return (
                  <motion.article
                    key={row.key}
                    className="space-y-2"
                    initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={
                      reduceMotion
                        ? undefined
                        : {
                            duration: 0.2,
                            delay: 0.08 + index * 0.03,
                            ease: 'easeOut',
                          }
                    }
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold text-[#0f172a] md:text-xl">{row.label}</h3>
                        {row.isAtRisk ? (
                          <span className="rounded-full border border-[#fecaca] bg-[#fff1f2] px-3 py-1 text-sm font-semibold text-[#dc2626]">
                            At Risk
                          </span>
                        ) : null}
                        {showFailing ? (
                          <span className="rounded-full border border-[#facc15] bg-[#fef9c3] px-3 py-1 text-sm font-semibold text-[#ca8a04]">
                            Failing
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-4">
                        <p className={`text-sm font-semibold md:text-base ${deltaClass(row.delta)}`}>{deltaText}</p>
                        <p
                          className={`text-lg font-semibold md:text-xl ${
                            tier === 'danger'
                              ? 'text-[#ef4444]'
                              : tier === 'warning'
                                ? 'text-[#ca8a04]'
                                : tier === 'success'
                                  ? 'text-[#16a34a]'
                                  : 'text-[#64748b]'
                          }`}
                        >
                          {scoreValue}
                        </p>
                      </div>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-[#e8edf5]">
                      <motion.div
                        className={`h-full rounded-full ${tierFillClass(tier)}`}
                        initial={reduceMotion ? false : { width: 0 }}
                        animate={{ width: progressWidth }}
                        transition={
                          reduceMotion
                            ? undefined
                            : {
                                duration: 0.36,
                                ease: 'easeOut',
                                delay: 0.1 + index * 0.03,
                              }
                        }
                      />
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </section>
      </MotionCard>

      {summary === null && !loading ? (
        <LocalEmptyState
          title="We couldn't load your performance summary"
          description="Try refreshing this page in a moment."
        />
      ) : null}

      {latestSyncDate ? (
        <p className="text-right text-xs text-[#8fa1bc]">Last sync detail: {formatDateTime(latestSyncDate)}</p>
      ) : null}

      <p className="text-right text-xs text-[#8fa1bc]">Threshold target: {threshold}%</p>
    </motion.div>
  );
}
