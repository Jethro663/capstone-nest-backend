'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { performanceService } from '@/services/performance-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import type { ClassItem } from '@/types/class';
import type {
  ClassAtRiskResponse,
  ClassPerformanceLogsResponse,
  ClassPerformanceSummary,
  PerformanceStudentRow,
} from '@/types/performance';

function toPercent(value: number | null): string {
  if (value === null) return '--';
  return `${value.toFixed(1)}%`;
}

function formatStudentName(student: PerformanceStudentRow): string {
  const firstName = student.firstName?.trim() ?? '';
  const lastName = student.lastName?.trim() ?? '';

  if (firstName && lastName) return `${lastName}, ${firstName}`;
  if (lastName) return lastName;
  if (firstName) return firstName;
  return student.email ?? 'Unknown student';
}

function formatDateTime(value: string | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTriggerSource(triggerSource: string): string {
  return triggerSource
    .split('_')
    .map((token) => token[0].toUpperCase() + token.slice(1))
    .join(' ');
}

export default function TeacherPerformancePage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [summary, setSummary] = useState<ClassPerformanceSummary | null>(null);
  const [atRisk, setAtRisk] = useState<ClassAtRiskResponse | null>(null);
  const [logs, setLogs] = useState<ClassPerformanceLogsResponse | null>(null);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [recomputing, setRecomputing] = useState(false);

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );

  const fetchClassList = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoadingClasses(true);
      const response = await classService.getByTeacher(user.id);
      const nextClasses = response.data ?? [];
      setClasses(nextClasses);
      setSelectedClassId((current) => current || nextClasses[0]?.id || '');
    } catch {
      toast.error('Failed to load classes');
    } finally {
      setLoadingClasses(false);
    }
  }, [user?.id]);

  const fetchPerformance = useCallback(async () => {
    if (!selectedClassId) {
      setSummary(null);
      setAtRisk(null);
      setLogs(null);
      return;
    }

    try {
      setLoadingData(true);
      const [summaryRes, atRiskRes, logsRes] = await Promise.all([
        performanceService.getClassSummary(selectedClassId),
        performanceService.getAtRiskStudents(selectedClassId),
        performanceService.getClassLogs(selectedClassId, { limit: 25 }),
      ]);

      setSummary(summaryRes.data);
      setAtRisk(atRiskRes.data);
      setLogs(logsRes.data);
    } catch {
      toast.error('Failed to load performance summary');
    } finally {
      setLoadingData(false);
    }
  }, [selectedClassId]);

  useEffect(() => {
    fetchClassList();
  }, [fetchClassList]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  const handleRecompute = async () => {
    if (!selectedClassId) return;

    try {
      setRecomputing(true);
      const result = await performanceService.recomputeClass(selectedClassId);
      toast.success(
        `Recomputed ${result.data.recomputed} student snapshot(s) for this class`,
      );
      await fetchPerformance();
    } catch {
      toast.error('Recompute failed');
    } finally {
      setRecomputing(false);
    }
  };

  if (loadingClasses) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Performance Tracking</h1>
          <p className="text-sm text-muted-foreground">
            At-risk threshold is fixed at 74%.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
            className="rounded-md border px-3 py-2 text-sm min-w-[240px]"
          >
            <option value="">Select class...</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.subjectName} ({item.subjectCode}) - {item.section?.name}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            onClick={handleRecompute}
            disabled={!selectedClassId || recomputing}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${recomputing ? 'animate-spin' : ''}`}
            />
            Recompute
          </Button>
        </div>
      </div>

      {!selectedClassId ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Select a class to view performance summaries.
          </CardContent>
        </Card>
      ) : loadingData ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-72 rounded-lg" />
          <Skeleton className="h-72 rounded-lg" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Class</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base font-semibold">
                  {selectedClass?.subjectName ?? '--'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedClass?.section?.name ?? '--'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Students</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summary?.totalStudents ?? 0}</p>
                <p className="text-xs text-muted-foreground">
                  {summary?.studentsWithData ?? 0} with data
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">At Risk</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-rose-600">
                  {summary?.atRiskCount ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(summary?.atRiskRate ?? 0).toFixed(1)}% of class
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Average (Blended)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {toPercent(summary?.averages.blended ?? null)}
                </p>
                <p className="text-xs text-muted-foreground">Threshold 74%</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">At-Risk Students</CardTitle>
            </CardHeader>
            <CardContent>
              {(atRisk?.students.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No at-risk students found for this class.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Assessment Avg</TableHead>
                      <TableHead>Class Record Avg</TableHead>
                      <TableHead>Blended Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Computed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(atRisk?.students ?? []).map((student) => (
                      <TableRow key={student.studentId}>
                        <TableCell className="font-medium">
                          {formatStudentName(student)}
                        </TableCell>
                        <TableCell>{toPercent(student.assessmentAverage)}</TableCell>
                        <TableCell>{toPercent(student.classRecordAverage)}</TableCell>
                        <TableCell>{toPercent(student.blendedScore)}</TableCell>
                        <TableCell>
                          <Badge variant={student.isAtRisk ? 'destructive' : 'secondary'}>
                            {student.isAtRisk ? 'At Risk' : 'Stable'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDateTime(student.lastComputedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Recent Performance Logs</CardTitle>
            </CardHeader>
            <CardContent>
              {(logs?.logs.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No risk status transitions recorded yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Transition</TableHead>
                      <TableHead>Blended</TableHead>
                      <TableHead>Trigger</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(logs?.logs ?? []).map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{formatDateTime(entry.createdAt)}</TableCell>
                        <TableCell>
                          {entry.student
                            ? formatStudentName({
                                studentId: entry.student.id,
                                firstName: entry.student.firstName ?? null,
                                lastName: entry.student.lastName ?? null,
                                email: entry.student.email ?? null,
                                assessmentAverage: null,
                                classRecordAverage: null,
                                blendedScore: null,
                                assessmentSampleSize: 0,
                                classRecordSampleSize: 0,
                                hasData: false,
                                isAtRisk: false,
                                thresholdApplied: 74,
                                lastComputedAt: entry.createdAt,
                              })
                            : entry.studentId}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={entry.previousIsAtRisk ? 'destructive' : 'secondary'}
                            >
                              {entry.previousIsAtRisk ? 'At Risk' : 'Stable'}
                            </Badge>
                            <span className="text-muted-foreground">to</span>
                            <Badge
                              variant={entry.currentIsAtRisk ? 'destructive' : 'secondary'}
                            >
                              {entry.currentIsAtRisk ? 'At Risk' : 'Stable'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{toPercent(entry.blendedScore)}</TableCell>
                        <TableCell>{formatTriggerSource(entry.triggerSource)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {selectedClassId && (summary?.atRiskCount ?? 0) > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4" />
            Intervention-ready list generated
          </div>
          <p className="mt-1 text-xs">
            This output can feed later LXP intervention flows once those modules
            are available.
          </p>
        </div>
      )}
    </div>
  );
}
