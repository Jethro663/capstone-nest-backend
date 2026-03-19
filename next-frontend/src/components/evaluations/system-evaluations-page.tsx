'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Gauge, MessageSquareQuote, SlidersHorizontal, Star } from 'lucide-react';
import { lxpService } from '@/services/lxp-service';
import type {
  SystemEvaluationRow,
  SystemEvaluationTargetModule,
} from '@/types/lxp';
import { Skeleton } from '@/components/ui/skeleton';
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

const MODULE_OPTIONS: Array<{
  label: string;
  value: '' | SystemEvaluationTargetModule;
}> = [
  { label: 'All modules', value: '' },
  { label: 'LMS', value: 'lms' },
  { label: 'LXP', value: 'lxp' },
  { label: 'AI Mentor', value: 'ai_mentor' },
  { label: 'Intervention', value: 'intervention' },
  { label: 'Overall', value: 'overall' },
];

function formatSubmitter(row: SystemEvaluationRow): string {
  const first = row.submitter?.firstName?.trim() ?? '';
  const last = row.submitter?.lastName?.trim() ?? '';
  if (first && last) return `${last}, ${first}`;
  if (last) return last;
  if (first) return first;
  return row.submitter?.email ?? row.submittedBy;
}

function formatModuleName(value: string): string {
  return value
    .split('_')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

interface SystemEvaluationsPageProps {
  heading: string;
  description: string;
}

export function SystemEvaluationsPage({
  heading,
  description,
}: SystemEvaluationsPageProps) {
  const [targetModule, setTargetModule] = useState<'' | SystemEvaluationTargetModule>(
    '',
  );
  const [rows, setRows] = useState<SystemEvaluationRow[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchEvaluations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await lxpService.getEvaluations(targetModule || undefined);
      setRows(res.data.rows ?? []);
      setCount(res.data.count ?? 0);
    } catch {
      toast.error('Failed to load system evaluations');
      setRows([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [targetModule]);

  useEffect(() => {
    fetchEvaluations();
  }, [fetchEvaluations]);

  const averageScores = useMemo(() => {
    if (rows.length === 0) {
      return {
        satisfaction: '--',
        usability: '--',
        feedback: 0,
      };
    }

    const totals = rows.reduce(
      (accumulator, row) => {
        accumulator.satisfaction += row.satisfactionScore;
        accumulator.usability += row.usabilityScore;
        accumulator.feedback += row.feedback?.trim() ? 1 : 0;
        return accumulator;
      },
      { satisfaction: 0, usability: 0, feedback: 0 },
    );

    return {
      satisfaction: (totals.satisfaction / rows.length).toFixed(1),
      usability: (totals.usability / rows.length).toFixed(1),
      feedback: totals.feedback,
    };
  }, [rows]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-44 rounded-[1.8rem]" />
        <Skeleton className="h-20 rounded-[1.5rem]" />
        <Skeleton className="h-[34rem] rounded-[1.8rem]" />
      </div>
    );
  }

  return (
    <TeacherPageShell
      badge="Feedback Intelligence"
      title={heading}
      description={description}
      stats={
        <>
          <TeacherStatCard
            label="Responses"
            value={count}
            caption="Captured evaluation entries"
            icon={MessageSquareQuote}
            accent="sky"
          />
          <TeacherStatCard
            label="Avg Satisfaction"
            value={averageScores.satisfaction}
            caption="Overall sentiment score"
            icon={Star}
            accent="amber"
          />
          <TeacherStatCard
            label="Avg Usability"
            value={averageScores.usability}
            caption="Ease-of-use pulse"
            icon={Gauge}
            accent="teal"
          />
          <TeacherStatCard
            label="Detailed Feedback"
            value={averageScores.feedback}
            caption="Written comments included"
            icon={SlidersHorizontal}
            accent="rose"
          />
        </>
      }
    >
      <TeacherSectionCard
        title="Evaluation Filters"
        description="Narrow responses by module to compare experience quality across systems."
      >
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={targetModule}
            onChange={(event) =>
              setTargetModule(event.target.value as '' | SystemEvaluationTargetModule)
            }
            className="teacher-select min-w-[240px] text-sm"
          >
            {MODULE_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="teacher-soft-panel rounded-full px-4 py-2 text-sm font-semibold text-[var(--teacher-text-strong)]">
            {count} evaluation{count === 1 ? '' : 's'}
          </div>
        </div>
      </TeacherSectionCard>

      <TeacherSectionCard
        title="Evaluation Results"
        description="A richer view of what learners and staff are saying about each platform area."
      >
        {rows.length === 0 ? (
          <TeacherEmptyState
            title="No evaluation responses found"
            description="Try another module filter or wait for new responses to come in."
          />
        ) : (
          <div className="teacher-table-shell">
            <Table>
              <TableHeader className="teacher-table-head [&_tr]:border-white/15">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                    Module
                  </TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                    Submitter
                  </TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                    Usability
                  </TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                    Functionality
                  </TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                    Performance
                  </TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                    Satisfaction
                  </TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                    Feedback
                  </TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                    Created
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="[&_tr:last-child]:border-0">
                {rows.map((row) => (
                  <TableRow key={row.id} className="teacher-table-row border-white/10">
                    <TableCell className="text-[13px] font-semibold text-[var(--teacher-text-strong)]">
                      {formatModuleName(row.targetModule)}
                    </TableCell>
                    <TableCell className="text-[13px] font-medium text-[var(--teacher-text-strong)]">
                      {formatSubmitter(row)}
                    </TableCell>
                    <TableCell className="text-[13px] text-[var(--teacher-text-strong)]">
                      {row.usabilityScore}
                    </TableCell>
                    <TableCell className="text-[13px] text-[var(--teacher-text-strong)]">
                      {row.functionalityScore}
                    </TableCell>
                    <TableCell className="text-[13px] text-[var(--teacher-text-strong)]">
                      {row.performanceScore}
                    </TableCell>
                    <TableCell className="text-[13px] text-[var(--teacher-text-strong)]">
                      {row.satisfactionScore}
                    </TableCell>
                    <TableCell className="max-w-[280px] text-[13px] text-[var(--teacher-text-strong)]">
                      <span className="line-clamp-2">
                        {row.feedback?.trim() || 'No written feedback'}
                      </span>
                    </TableCell>
                    <TableCell className="text-[13px] text-[var(--teacher-text-strong)]">
                      {new Date(row.createdAt).toLocaleString('en-US')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TeacherSectionCard>
    </TeacherPageShell>
  );
}
