'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, BarChart3 } from 'lucide-react';
import { performanceService } from '@/services/performance-service';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  StudentActionCard,
  StudentEmptyState,
  StudentSectionHeader,
  StudentStatCard,
} from '@/components/student/student-primitives';
import { getMotionProps } from '@/components/student/student-motion';
import type { StudentOwnClassPerformance, StudentOwnPerformanceSummary } from '@/types/performance';

function toPercent(value: number | null): string {
  if (value === null) return '--';
  return `${value.toFixed(1)}%`;
}

function formatDateTime(value: string | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function classLabel(entry: StudentOwnClassPerformance): string {
  if (!entry.class) return entry.classId;
  return `${entry.class.subjectName} (${entry.class.subjectCode})`;
}

function classSubtitle(entry: StudentOwnClassPerformance): string {
  if (!entry.class?.section) return 'Section unavailable';
  return `${entry.class.section.name} - Grade ${entry.class.section.gradeLevel}`;
}

export default function StudentPerformancePage() {
  const reduceMotion = useReducedMotion();
  const motionProps = getMotionProps(!!reduceMotion);

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
    fetchSummary();
  }, [fetchSummary]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-56 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  const classes = summary?.classes ?? [];
  const threshold = summary?.threshold ?? 74;

  return (
    <div className="student-page space-y-6 rounded-3xl p-1">
      <StudentSectionHeader
        title="Performance Tracking"
        subtitle={`At-risk threshold: ${threshold}%`}
      />

      <motion.div {...motionProps.container} className="grid gap-4 md:grid-cols-3">
        <StudentStatCard
          label="Enrolled Classes"
          value={summary?.overall.totalClasses ?? 0}
          accent="bg-red-500"
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <StudentStatCard
          label="Classes With Data"
          value={summary?.overall.classesWithData ?? 0}
          accent="bg-blue-500"
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <StudentStatCard
          label="At Risk Classes"
          value={summary?.overall.atRiskClasses ?? 0}
          accent="bg-amber-500"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </motion.div>

      <StudentActionCard>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-700">
            Overall blended average:{' '}
            <span className="font-semibold text-slate-900">
              {toPercent(summary?.overall.averageBlendedScore ?? null)}
            </span>
          </p>
          <Badge variant="outline">Threshold {threshold}%</Badge>
        </div>
      </StudentActionCard>

      {classes.length === 0 ? (
        <StudentEmptyState
          title="No performance data yet"
          description="Your teacher has not posted enough assessment or class-record scores yet."
          icon={<BarChart3 className="h-5 w-5" />}
        />
      ) : (
        <motion.div {...motionProps.container} className="space-y-3">
          {classes.map((entry) => (
            <motion.div key={entry.classId} {...motionProps.item}>
              <StudentActionCard>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{classLabel(entry)}</p>
                    <p className="text-sm student-muted-text">{classSubtitle(entry)}</p>
                  </div>
                  <Badge variant={entry.isAtRisk ? 'destructive' : 'secondary'}>
                    {entry.isAtRisk ? 'At Risk' : 'Stable'}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                  <div className="rounded-lg border border-red-100 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-red-600">Assessment</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {toPercent(entry.assessmentAverage)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-red-100 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-red-600">Class Record</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {toPercent(entry.classRecordAverage)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-red-100 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-red-600">Blended</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {toPercent(entry.blendedScore)}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-xs student-muted-text">
                  Last computed: {formatDateTime(entry.lastComputedAt)}
                </p>
              </StudentActionCard>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
