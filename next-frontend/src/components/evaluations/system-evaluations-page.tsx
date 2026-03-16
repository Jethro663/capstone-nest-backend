'use client';

import { useCallback, useEffect, useState } from 'react';
import { lxpService } from '@/services/lxp-service';
import type {
  SystemEvaluationRow,
  SystemEvaluationTargetModule,
} from '@/types/lxp';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{heading}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={targetModule}
          onChange={(event) =>
            setTargetModule(event.target.value as '' | SystemEvaluationTargetModule)
          }
          className="min-w-[220px] rounded-md border px-3 py-2 text-sm"
        >
          {MODULE_OPTIONS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-sm text-muted-foreground">{count} evaluation(s)</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evaluation Results</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No evaluation responses found for the selected module.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead>Submitter</TableHead>
                  <TableHead>Usability</TableHead>
                  <TableHead>Functionality</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Satisfaction</TableHead>
                  <TableHead>Feedback</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.targetModule}</TableCell>
                    <TableCell className="font-medium">
                      {formatSubmitter(row)}
                    </TableCell>
                    <TableCell>{row.usabilityScore}</TableCell>
                    <TableCell>{row.functionalityScore}</TableCell>
                    <TableCell>{row.performanceScore}</TableCell>
                    <TableCell>{row.satisfactionScore}</TableCell>
                    <TableCell className="max-w-[280px] truncate">
                      {row.feedback || 'No feedback'}
                    </TableCell>
                    <TableCell>
                      {new Date(row.createdAt).toLocaleString('en-US')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
