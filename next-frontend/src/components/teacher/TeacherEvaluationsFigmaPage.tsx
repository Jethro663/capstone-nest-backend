'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Gauge, Search, Star, Users } from 'lucide-react';
import { lxpService } from '@/services/lxp-service';
import type {
  SystemEvaluationRow,
  SystemEvaluationTargetModule,
} from '@/types/lxp';
import {
  TeacherEmptyState,
  TeacherPageShell,
  TeacherSectionCard,
  TeacherStatCard,
} from '@/components/teacher/TeacherPageShell';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
    .map((token) => token[0].toUpperCase() + token.slice(1))
    .join(' ');
}

function toScore(value: number | string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function TeacherEvaluationsFigmaPage() {
  const [targetModule, setTargetModule] = useState<'' | SystemEvaluationTargetModule>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [rows, setRows] = useState<SystemEvaluationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvaluations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await lxpService.getEvaluations(
        targetModule ? { targetModule } : undefined,
      );
      setRows(response.data.rows ?? []);
    } catch {
      toast.error('Failed to load evaluations');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [targetModule]);

  useEffect(() => {
    fetchEvaluations();
  }, [fetchEvaluations]);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => {
      const submitter = formatSubmitter(row).toLowerCase();
      const moduleText = formatModuleName(row.targetModule).toLowerCase();
      const feedback = row.feedback?.toLowerCase() ?? '';
      return submitter.includes(query) || moduleText.includes(query) || feedback.includes(query);
    });
  }, [rows, searchQuery]);

  const stats = useMemo(() => {
    if (filteredRows.length === 0) {
      return {
        content: '--',
        delivery: '--',
        engagement: '--',
      };
    }

    const totals = filteredRows.reduce(
      (acc, row) => {
        acc.content += toScore(row.functionalityScore);
        acc.delivery += toScore(row.performanceScore);
        acc.engagement += toScore(row.satisfactionScore);
        return acc;
      },
      { content: 0, delivery: 0, engagement: 0 },
    );

    return {
      content: `${(totals.content / filteredRows.length).toFixed(1)}/5`,
      delivery: `${(totals.delivery / filteredRows.length).toFixed(1)}/5`,
      engagement: `${(totals.engagement / filteredRows.length).toFixed(1)}/5`,
    };
  }, [filteredRows]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-[15px]" />
        <Skeleton className="h-28 rounded-[15px]" />
        <Skeleton className="h-[28rem] rounded-[15px]" />
      </div>
    );
  }

  return (
    <TeacherPageShell
      badge="Teacher Evaluations"
      title="Evaluations"
      description="Student and peer feedback on your classes"
      stats={
        <>
          <TeacherStatCard
            label="Responses"
            value={filteredRows.length}
            caption="Submitted evaluation entries"
            icon={Users}
            accent="sky"
          />
          <TeacherStatCard
            label="Content Score"
            value={stats.content}
            caption="Average functionality rating"
            icon={Star}
            accent="teal"
          />
          <TeacherStatCard
            label="Delivery Score"
            value={stats.delivery}
            caption="Average performance rating"
            icon={Gauge}
            accent="amber"
          />
          <TeacherStatCard
            label="Engagement Score"
            value={stats.engagement}
            caption="Average satisfaction rating"
            icon={Star}
            accent="rose"
          />
        </>
      }
    >
      <TeacherSectionCard title="Filters" className="teacher-figma-stagger">
        <div className="teacher-figma-toolbar">
          <div className="teacher-figma-toolbar__left">
            <select
              value={targetModule}
              onChange={(event) => setTargetModule(event.target.value as '' | SystemEvaluationTargetModule)}
              className="teacher-select min-w-[220px] text-sm"
            >
              {MODULE_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="teacher-figma-toolbar__right">
            <div className="relative w-full md:w-[320px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--teacher-text-muted)]" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by student or module..."
                className="teacher-input h-10 pl-9"
              />
            </div>
          </div>
        </div>
      </TeacherSectionCard>

      <TeacherSectionCard
        title="Evaluation Responses"
        description="Detailed teacher-facing view of submitted ratings and comments."
        className="teacher-figma-stagger"
      >
        {filteredRows.length === 0 ? (
          <TeacherEmptyState
            title="No evaluation responses found"
            description="Try another module filter or clear the search query."
          />
        ) : (
          <div className="teacher-table-shell">
            <Table>
              <TableHeader className="teacher-table-head [&_tr]:border-white/15">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead>Module</TableHead>
                  <TableHead>Respondent</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead>Comments</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="[&_tr:last-child]:border-0">
                {filteredRows.map((row) => (
                  <TableRow key={row.id} className="teacher-table-row border-white/10">
                    <TableCell className="font-medium text-[var(--teacher-text-strong)]">
                      {formatModuleName(row.targetModule)}
                    </TableCell>
                    <TableCell className="text-[var(--teacher-text-strong)]">{formatSubmitter(row)}</TableCell>
                    <TableCell className="text-[var(--teacher-text-strong)]">Teacher</TableCell>
                    <TableCell className="text-[var(--teacher-text-strong)]">{toScore(row.functionalityScore).toFixed(1)}</TableCell>
                    <TableCell className="text-[var(--teacher-text-strong)]">{toScore(row.performanceScore).toFixed(1)}</TableCell>
                    <TableCell className="text-[var(--teacher-text-strong)]">{toScore(row.satisfactionScore).toFixed(1)}</TableCell>
                    <TableCell className="max-w-[260px] text-[var(--teacher-text-strong)]">
                      <span className="line-clamp-2">{row.feedback?.trim() || 'No written feedback'}</span>
                    </TableCell>
                    <TableCell className="text-[var(--teacher-text-strong)]">
                      {new Date(row.createdAt).toLocaleDateString('en-US')}
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
