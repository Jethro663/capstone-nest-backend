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
import './student-performance.css';

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
const TREND_COLORS = ['var(--sp-trend-1)', 'var(--sp-trend-2)', 'var(--sp-trend-3)'];

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
  if (tier === 'danger') return 'sp-tier-fill-danger';
  if (tier === 'warning') return 'sp-tier-fill-warning';
  if (tier === 'success') return 'sp-tier-fill-success';
  return 'sp-tier-fill-neutral';
}

function deltaClass(delta: number | null): string {
  if (delta === null) return 'sp-delta-neutral';
  if (delta > 0) return 'sp-delta-positive';
  if (delta < 0) return 'sp-delta-negative';
  return 'sp-delta-neutral';
}

function scoreClass(tier: string): string {
  if (tier === 'danger') return 'sp-score-danger';
  if (tier === 'warning') return 'sp-score-warning';
  if (tier === 'success') return 'sp-score-success';
  return 'sp-score-neutral';
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
          : { duration: 0.16, delay: index * 0.025, ease: 'easeOut' }
      }
    >
      {children}
    </motion.div>
  );
}

function LocalEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="sp-empty-state">
      <div className="sp-empty-state__icon">
        <Inbox className="h-8 w-8" />
      </div>
      <h3 className="sp-empty-state__title">{title}</h3>
      <p className="sp-empty-state__description">{description}</p>
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
    <div className="sp-radar-wrap">
      <motion.svg
        viewBox={`0 0 ${size} ${size}`}
        className="sp-radar-svg"
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
              stroke="var(--sp-grid-line)"
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
              stroke="var(--sp-grid-line)"
              strokeWidth={1}
            />
          );
        })}

        <polygon
          points={dataPoints.join(' ')}
          fill="var(--sp-radar-fill)"
          stroke="var(--sp-radar-stroke)"
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
            className="sp-radar-label"
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
    <div className="sp-trend">
      <div className="sp-trend__chart">
        <div className="sp-trend__ticks">
          {yTicks.map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>

        <div className="sp-trend__grid">
          {yTicks.map((tick) => (
            <div
              key={`grid-${tick}`}
              className="sp-trend__grid-line"
              style={{ bottom: toHeight(tick) }}
            />
          ))}
        </div>

        <div className="sp-trend__columns">
          {quarters.map((quarter, quarterIndex) => (
            <div key={quarter.label} className="sp-trend__quarter">
              <div className="sp-trend__bars">
                {subjects.map((subject, subjectIndex) => (
                  <motion.div
                    key={`${quarter.label}-${subject.key}`}
                    className="sp-trend__bar"
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
                            duration: 0.24,
                            ease: 'easeOut',
                            delay: 0.06 + quarterIndex * 0.045 + subjectIndex * 0.03,
                          }
                    }
                  />
                ))}
              </div>
              <span className="sp-trend__quarter-label">{quarter.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sp-trend__legend">
        {subjects.map((subject, index) => (
          <div key={subject.key} className="sp-trend__legend-item">
            <span
              className="sp-trend__legend-dot"
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
      <div className="student-performance-page student-performance-loading">
        <Skeleton className="h-24 rounded-lg" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-20 rounded-lg" />
        <div className="grid gap-3 lg:grid-cols-2">
          <Skeleton className="h-[340px] rounded-lg" />
          <Skeleton className="h-[340px] rounded-lg" />
        </div>
        <Skeleton className="h-[280px] rounded-lg" />
      </div>
    );
  }

  return (
    <motion.div
      className="student-performance-page"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? undefined : { duration: 0.16, ease: 'easeOut' }}
    >
      <MotionCard
        index={0}
        reducedMotion={Boolean(reduceMotion)}
        className="sp-hero"
      >
        <div className="sp-hero__row">
          <div className="sp-hero__icon">
            <LineChart className="h-5 w-5" />
          </div>
          <div>
            <h1 className="sp-hero__title">Performance</h1>
            <p className="sp-hero__subtitle">
              Track your academic standing
            </p>
          </div>
        </div>
      </MotionCard>

      <div className="sp-kpi-grid">
        <MotionCard index={1} reducedMotion={Boolean(reduceMotion)}>
          <div className="sp-kpi-card">
            <div className="sp-kpi-card__head">
              <div>
                <p className="sp-kpi-card__label">Blended Average</p>
                <p className="sp-kpi-card__value sp-kpi-card__value--info">
                  {toPercent(averageBlendedScore)}
                </p>
              </div>
              <div className="sp-kpi-card__icon sp-kpi-card__icon--info">
                <ChartNoAxesCombined className="h-5 w-5" />
              </div>
            </div>
          </div>
        </MotionCard>

        <MotionCard index={2} reducedMotion={Boolean(reduceMotion)}>
          <div className="sp-kpi-card">
            <div className="sp-kpi-card__head">
              <div>
                <p className="sp-kpi-card__label">Status</p>
                <p
                  className={`sp-kpi-card__value ${
                    statusSafe ? 'sp-kpi-card__value--success' : 'sp-kpi-card__value--danger'
                  }`}
                >
                  {statusSafe ? 'Safe' : 'Needs Attention'}
                </p>
              </div>
              <div
                className={`sp-kpi-card__icon ${
                  statusSafe ? 'sp-kpi-card__icon--success' : 'sp-kpi-card__icon--danger'
                }`}
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
          <div className="sp-kpi-card">
            <div className="sp-kpi-card__head">
              <div>
                <p className="sp-kpi-card__label">At-Risk Subjects</p>
                <p className="sp-kpi-card__value sp-kpi-card__value--warning">
                  {atRiskCount}
                </p>
              </div>
              <div className="sp-kpi-card__icon sp-kpi-card__icon--warning">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
          </div>
        </MotionCard>

        <MotionCard index={4} reducedMotion={Boolean(reduceMotion)}>
          <div className="sp-kpi-card">
            <div className="sp-kpi-card__head">
              <div>
                <p className="sp-kpi-card__label">Last Synced</p>
                <p className="sp-kpi-card__value sp-kpi-card__value--accent">
                  {lastSyncedLabel}
                </p>
              </div>
              <div className="sp-kpi-card__icon sp-kpi-card__icon--accent">
                <Clock3 className="h-5 w-5" />
              </div>
            </div>
          </div>
        </MotionCard>
      </div>

      {atRiskCount > 0 && (
        <MotionCard index={5} reducedMotion={Boolean(reduceMotion)}>
          <div className="sp-alert">
            <div className="sp-alert__row">
              <AlertCircle className="sp-alert__icon" />
              <div>
                <p className="sp-alert__title">
                  You have {atRiskCount} subject(s) that need attention
                </p>
                <p className="sp-alert__body">
                  {firstAtRisk ? `${getSubjectLabel(firstAtRisk)} - ` : ''}
                  Consider reviewing your lessons or reaching out to your teacher.
                </p>
              </div>
            </div>
          </div>
        </MotionCard>
      )}

      <div className="sp-section-grid">
        <MotionCard index={6} reducedMotion={Boolean(reduceMotion)}>
          <section className="sp-section">
            <h2 className="sp-section__title">Subject Overview</h2>
            <SubjectOverviewRadar subjects={radarSubjects} reducedMotion={Boolean(reduceMotion)} />
          </section>
        </MotionCard>

        <MotionCard index={7} reducedMotion={Boolean(reduceMotion)}>
          <section className="sp-section">
            <h2 className="sp-section__title">Quarterly Trend</h2>
            <QuarterlyTrendChart subjects={trendSubjects} reducedMotion={Boolean(reduceMotion)} />
          </section>
        </MotionCard>
      </div>

      <MotionCard index={8} reducedMotion={Boolean(reduceMotion)}>
        <section className="sp-section">
          <h2 className="sp-section__title">Subject Breakdown</h2>

          {subjectRows.length === 0 ? (
            <div className="mt-3">
              <LocalEmptyState
                title="No performance data yet"
                description="Your assessments have not been graded yet. Once your teacher enters scores, your analytics will appear here."
              />
            </div>
          ) : (
            <div className="sp-breakdown-list">
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
                    className="sp-breakdown-row"
                    initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={
                      reduceMotion
                        ? undefined
                        : {
                            duration: 0.16,
                            delay: 0.04 + index * 0.02,
                            ease: 'easeOut',
                          }
                    }
                  >
                    <div className="sp-breakdown-row__top">
                      <div className="sp-breakdown-row__head">
                        <h3 className="sp-breakdown-row__title">{row.label}</h3>
                        {row.isAtRisk ? (
                          <span className="sp-status-pill sp-status-pill--danger">
                            At Risk
                          </span>
                        ) : null}
                        {showFailing ? (
                          <span className="sp-status-pill sp-status-pill--warning">
                            Failing
                          </span>
                        ) : null}
                      </div>
                      <div className="sp-breakdown-row__values">
                        <p className={`sp-breakdown-row__delta ${deltaClass(row.delta)}`}>{deltaText}</p>
                        <p className={`sp-breakdown-row__score ${scoreClass(tier)}`}>{scoreValue}</p>
                      </div>
                    </div>

                    <div className="sp-breakdown-row__track">
                      <motion.div
                        className={`sp-breakdown-row__fill ${tierFillClass(tier)}`}
                        initial={reduceMotion ? false : { width: 0 }}
                        animate={{ width: progressWidth }}
                        transition={
                          reduceMotion
                            ? undefined
                            : {
                                duration: 0.24,
                                ease: 'easeOut',
                                delay: 0.06 + index * 0.02,
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
        <p className="sp-meta-text">Last sync detail: {formatDateTime(latestSyncDate)}</p>
      ) : null}

      <p className="sp-meta-text">Threshold target: {threshold}%</p>
    </motion.div>
  );
}
