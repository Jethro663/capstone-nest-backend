'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, BarChart3, Inbox, ShieldCheck, Target } from 'lucide-react';
import { performanceService } from '@/services/performance-service';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StudentStatusChip } from '@/components/student/student-primitives';
import { StudentPageShell, StudentPageStat, StudentSectionCard } from '@/components/student/StudentPageShell';
import { containerReveal, itemReveal } from '@/components/student/student-motion';
import type { StudentOwnPerformanceSummary } from '@/types/performance';

 
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

function LocalEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-[var(--student-outline)] bg-[var(--student-surface-soft)]/30 p-16 text-center">
      <div className="mb-6 rounded-3xl bg-[var(--student-elevated)] p-6 text-[var(--student-text-muted)] shadow-sm">
        <Inbox className="h-10 w-10" />
      </div>
      <h3 className="text-xl font-black text-[var(--student-text-strong)]">{title}</h3>
      <p className="mt-2 max-w-sm text-sm font-medium leading-relaxed text-[var(--student-text-muted)]">
 
        {description}
      </p>
    </div>
  );
}

export default function StudentPerformancePage() {
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
      <div className="mx-auto max-w-7xl space-y-8 p-8">
        <Skeleton className="h-44 rounded-[1.8rem]" />
        <div className="grid gap-6 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-[1.5rem]" />)}
        </div>
        <Skeleton className="h-[32rem] rounded-[1.8rem]" />
      </div>
    );
  }

  const classes = summary?.classes ?? [];
  const threshold = summary?.threshold ?? 74;

  return (
    <StudentPageShell
      badge="Progress Tracker"
      title="Performance"
      description={
        threshold !== null
          ? `Youâ€™re aiming to stay above ${threshold}% in each class. This page helps you see whatâ€™s going well and where a little extra effort will help most.`
          : 'Track how your classes are going, celebrate strong progress, and spot where to focus next.'
      }
      stats={
        <>
          <StudentPageStat
            label="Classes"
            value={summary?.overall.totalClasses ?? 0}
            caption="Subjects currently enrolled"
            icon={BarChart3}
            accent="bg-[var(--student-text-strong)] text-white"
 
          />
          <StudentPageStat
            label="Graded"
            value={summary?.overall.classesWithData ?? 0}
            caption="Classes with score data"
            icon={Target}
            accent="bg-[var(--student-accent-soft)] text-[var(--student-accent)]"
 
          />
          <StudentPageStat
            label="Average"
            value={toPercent(summary?.overall.averageBlendedScore ?? null)}
            caption="Blended overall score"
            icon={ShieldCheck}
            accent="bg-emerald-100 text-emerald-700"
          />
          <StudentPageStat
            label="Needs Attention"
            value={summary?.overall.atRiskClasses ?? 0}
            caption="Classes below the threshold"
            icon={AlertTriangle}
            accent="bg-amber-100 text-amber-700"
          />
        </>
      }
    >
      <StudentSectionCard
        title="Subject Breakdown"
        description="Each class shows your blended standing, the latest sync time, and whether you are safely on track."
        action={
          <Badge variant="outline" className="student-badge text-[10px] font-black uppercase">
            {threshold !== null ? `Threshold ${threshold}%` : 'Threshold --'}
 
          </Badge>
        }
      >
        {classes.length === 0 ? (
          <LocalEmptyState 
            title="No performance data yet"
            description="Your assessments have not been graded yet. Once your teacher enters scores, your analytics will appear here."
          />
        ) : (
          <motion.div
            variants={containerReveal}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            {classes.map((entry) => (
              <motion.div
                key={entry.classId}
                variants={itemReveal}
                className="student-panel student-panel-hover rounded-[1.5rem] p-6"
              >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-black text-[var(--student-text-strong)]">
 
                        {entry.class?.subjectName || entry.classId}
                      </h3>
                      <StudentStatusChip tone={entry.isAtRisk ? 'warning' : 'success'}>
                        {entry.isAtRisk ? 'Needs a little help' : 'On track'}
                      </StudentStatusChip>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--student-text-muted)]">
 
                      {entry.class?.section?.name || 'Academic Section'} â€¢ Grade {entry.class?.section?.gradeLevel || '-'}
                    </p>
                    <p className="text-xs text-[var(--student-text-muted)]">
                      Last sync: {formatDateTime(entry.lastComputedAt)}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[380px]">
                    <ScorePill label="Assessment" value={toPercent(entry.assessmentAverage)} />
                    <ScorePill label="Class Record" value={toPercent(entry.classRecordAverage)} />
                    <ScorePill
                      label="Blended"
                      value={toPercent(entry.blendedScore)}
                      accent
                    />
                  </div>
                </div>
 
              </motion.div>
            ))}
          </motion.div>
        )}
      </StudentSectionCard>
    </StudentPageShell>
  );
}

function ScorePill({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={
        accent
          ? 'rounded-2xl border border-[var(--student-accent-soft-strong)] bg-[var(--student-accent-soft)] px-4 py-4 text-center'
          : 'rounded-2xl border border-[var(--student-outline)] bg-[var(--student-surface-soft)] px-4 py-4 text-center'
      }
    >
      <p
        className={
          accent
            ? 'text-[10px] font-black uppercase tracking-[0.18em] text-[var(--student-accent)]'
            : 'text-[10px] font-black uppercase tracking-[0.18em] text-[var(--student-text-muted)]'
        }
      >
        {label}
      </p>
      <p
        className={
          accent
            ? 'mt-2 text-lg font-black text-[var(--student-accent)]'
            : 'mt-2 text-lg font-black text-[var(--student-text-strong)]'
        }
      >
        {value}
      </p>
    </div>
  );
}

