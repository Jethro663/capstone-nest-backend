'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { lxpService } from '@/services/lxp-service';
import type { ClassItem } from '@/types/class';
import type { LxpClassReport, TeacherInterventionQueueResponse } from '@/types/lxp';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

function studentName(entry: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string {
  const first = entry.firstName?.trim() ?? '';
  const last = entry.lastName?.trim() ?? '';
  if (first && last) return `${last}, ${first}`;
  if (last) return last;
  if (first) return first;
  return entry.email ?? 'Unknown student';
}

export default function TeacherInterventionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [queue, setQueue] = useState<TeacherInterventionQueueResponse | null>(null);
  const [report, setReport] = useState<LxpClassReport | null>(null);
  const [resolvingCaseId, setResolvingCaseId] = useState<string | null>(null);

  const selectedClass = useMemo(
    () => classes.find((entry) => entry.id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );
  const thresholdLabel = queue?.threshold ?? report?.threshold ?? null;

  const fetchClassList = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoadingClasses(true);
      const res = await classService.getByTeacher(user.id);
      const rows = res.data ?? [];
      setClasses(rows);
      setSelectedClassId((prev) => prev || searchParams.get('classId') || rows[0]?.id || '');
    } catch {
      toast.error('Failed to load classes');
    } finally {
      setLoadingClasses(false);
    }
  }, [searchParams, user?.id]);

  const fetchInterventionData = useCallback(async () => {
    if (!selectedClassId) {
      setQueue(null);
      setReport(null);
      return;
    }
    try {
      setLoadingData(true);
      const [queueRes, reportRes] = await Promise.all([
        lxpService.getTeacherQueue(selectedClassId),
        lxpService.getClassReport(selectedClassId),
      ]);
      setQueue(queueRes.data);
      setReport(reportRes.data);
    } catch {
      toast.error('Failed to load intervention data');
      setQueue(null);
      setReport(null);
    } finally {
      setLoadingData(false);
    }
  }, [selectedClassId]);

  useEffect(() => {
    fetchClassList();
  }, [fetchClassList]);

  useEffect(() => {
    fetchInterventionData();
  }, [fetchInterventionData]);

  const handleResolve = async (caseId: string) => {
    try {
      setResolvingCaseId(caseId);
      const res = await lxpService.resolveIntervention(caseId, 'Resolved by teacher queue');
      setQueue(res.data);
      toast.success('Intervention case resolved');
      await fetchInterventionData();
    } catch {
      toast.error('Failed to resolve intervention case');
    } finally {
      setResolvingCaseId(null);
    }
  };

  const handleRecommend = (caseId: string) => {
    router.push(`/dashboard/teacher/interventions/${caseId}?classId=${selectedClassId}`);
  };

  if (loadingClasses) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Intervention Management</h1>
          <p className="text-sm text-muted-foreground">
            {thresholdLabel !== null
              ? `Current intervention threshold: ${thresholdLabel}%`
              : 'Current intervention threshold will appear after class data loads.'}
          </p>
        </div>
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm min-w-[260px]"
        >
          <option value="">Select class...</option>
          {classes.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.subjectName} ({entry.subjectCode}) - {entry.section?.name}
            </option>
          ))}
        </select>
      </div>

      {!selectedClassId ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Select a class to view intervention queue and reports.
          </CardContent>
        </Card>
      ) : loadingData ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Class</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold">
                  {selectedClass?.subjectName ?? '--'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedClass?.section?.name ?? '--'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Active Cases</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{report?.summary.activeCases ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Completed Cases</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{report?.summary.completedCases ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Avg Delta</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {report?.summary.averageDelta !== null && report?.summary.averageDelta !== undefined
                    ? `${report.summary.averageDelta.toFixed(2)}%`
                    : '--'}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Active Intervention Queue</CardTitle>
            </CardHeader>
            <CardContent>
              {(queue?.queue.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active intervention cases in this class.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Trigger Score</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>XP</TableHead>
                      <TableHead>Stars</TableHead>
                      <TableHead>Streak</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queue?.queue.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          {studentName(entry.student ?? {})}
                        </TableCell>
                        <TableCell>
                          {entry.triggerScore !== null && entry.triggerScore !== undefined
                            ? `${entry.triggerScore.toFixed(1)}%`
                            : '--'}
                        </TableCell>
                        <TableCell className="min-w-[180px]">
                          <div className="space-y-1">
                            <Progress value={entry.completionPercent} />
                            <p className="text-xs text-muted-foreground">
                              {entry.completedCheckpoints}/{entry.totalCheckpoints} checkpoints
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{entry.progress.xpTotal}</TableCell>
                        <TableCell>{entry.progress.starsTotal.toFixed(2)}</TableCell>
                        <TableCell>{entry.progress.streakDays}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">Active</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleRecommend(entry.id)}
                            >
                              AI Plan
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={resolvingCaseId === entry.id}
                              onClick={() => handleResolve(entry.id)}
                            >
                              {resolvingCaseId === entry.id ? 'Resolving...' : 'Resolve'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Intervention Outcome Rows</CardTitle>
            </CardHeader>
            <CardContent>
              {(report?.rows.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No intervention rows available yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Baseline</TableHead>
                      <TableHead>Current</TableHead>
                      <TableHead>Delta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report?.rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">
                          {studentName(row.student ?? {})}
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.status === 'active' ? 'destructive' : 'secondary'}>
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {row.triggerScore !== null ? `${row.triggerScore.toFixed(1)}%` : '--'}
                        </TableCell>
                        <TableCell>
                          {row.currentBlendedScore !== null
                            ? `${row.currentBlendedScore.toFixed(1)}%`
                            : '--'}
                        </TableCell>
                        <TableCell>
                          {row.improvementDelta !== null
                            ? `${row.improvementDelta > 0 ? '+' : ''}${row.improvementDelta.toFixed(1)}%`
                            : '--'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>XP Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              {(report?.leaderboard.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No XP progress recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>XP</TableHead>
                      <TableHead>Stars</TableHead>
                      <TableHead>Streak</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report?.leaderboard.map((row) => (
                      <TableRow key={row.studentId}>
                        <TableCell className="font-semibold">#{row.rank}</TableCell>
                        <TableCell>{studentName(row.student ?? {})}</TableCell>
                        <TableCell>{row.xpTotal}</TableCell>
                        <TableCell>{row.starsTotal.toFixed(2)}</TableCell>
                        <TableCell>{row.streakDays}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

    </div>
  );
}
