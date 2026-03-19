'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { AlertTriangle, RefreshCw, ShieldAlert, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { performanceService } from '@/services/performance-service';
import { Button } from '@/components/ui/button';
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
import {
  TeacherEmptyState,
  TeacherPageShell,
  TeacherSectionCard,
  TeacherStatCard,
} from '@/components/teacher/TeacherPageShell';
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
  const threshold = summary?.threshold ?? atRisk?.threshold ?? null;

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
        <Skeleton className="h-44 rounded-[1.8rem]" />
        <Skeleton className="h-24 rounded-[1.5rem]" />
        <Skeleton className="h-[34rem] rounded-[1.8rem]" />
      </div>
    );
  }

  return (
    <TeacherPageShell
      badge="Performance Command Center"
      title="Performance Tracking"
      description={
        threshold !== null
          ? `Current at-risk threshold: ${threshold}%. Track class health, monitor risk changes, and recompute snapshots when fresh scores arrive.`
          : 'Review blended score health, recent risk transitions, and intervention readiness from one livelier teacher performance view.'
      }
      actions={
 
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
            className="teacher-select min-w-[260px] text-sm"
          >
            <option value="">Select class...</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.subjectName} ({item.subjectCode}) - {item.section?.name}
              </option>
            ))}
          </select>
          <Button
            variant="teacherOutline"
            onClick={handleRecompute}
            disabled={!selectedClassId || recomputing}
            className="rounded-2xl px-5"
          >
            <RefreshCw className={`h-4 w-4 ${recomputing ? 'animate-spin' : ''}`} />
            Recompute
          </Button>
        </div>
      }
      stats={
        <>
          <TeacherStatCard
            label="Students"
            value={summary?.totalStudents ?? 0}
            caption={`${summary?.studentsWithData ?? 0} with data snapshots`}
            icon={Users}
            accent="sky"
          />
          <TeacherStatCard
            label="At Risk"
            value={summary?.atRiskCount ?? 0}
            caption={`${(summary?.atRiskRate ?? 0).toFixed(1)}% of selected class`}
            icon={ShieldAlert}
            accent="rose"
          />
          <TeacherStatCard
            label="Average Blend"
            value={toPercent(summary?.averages.blended ?? null)}
            caption={selectedClass?.subjectCode ? `${selectedClass.subjectCode} blended score` : 'No class selected'}
            icon={TrendingUp}
            accent="teal"
          />
          <TeacherStatCard
            label="Threshold"
            value={threshold !== null ? `${threshold}%` : '--'}
            caption="Current class risk threshold"
            icon={AlertTriangle}
            accent="amber"
          />
        </>
      }
    >
      {!selectedClassId ? (
        <TeacherSectionCard
          title="Waiting for a class"
          description="Select a class above to reveal the at-risk list and recent performance transitions."
        >
          <TeacherEmptyState
            title="No class selected yet"
            description="Choose one of your classes to load summary metrics, learner risk states, and change logs."
          />
        </TeacherSectionCard>
      ) : loadingData ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-[1.5rem]" />
          <Skeleton className="h-[24rem] rounded-[1.8rem]" />
          <Skeleton className="h-[24rem] rounded-[1.8rem]" />
        </div>
      ) : (
        <>
          <TeacherSectionCard
            title="At-Risk Students"
            description="Spot who needs immediate attention using assessment, class record, and blended performance together."
          >
            {(atRisk?.students.length ?? 0) === 0 ? (
              <TeacherEmptyState
                title="No at-risk students found"
                description="This class is currently stable based on the latest blended scores and thresholds."
              />
            ) : (
              <div className="teacher-table-shell">
 
                <Table>
                  <TableHeader className="teacher-table-head [&_tr]:border-white/15">
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                        Student
                      </TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                        Assessment Avg
                      </TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                        Class Record Avg
                      </TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                        Blended Score
                      </TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                        Status
                      </TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                        Last Computed
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="[&_tr:last-child]:border-0">
                    {(atRisk?.students ?? []).map((student) => (
                      <TableRow
                        key={student.studentId}
                        className="teacher-table-row border-white/10"
                      >
                        <TableCell className="font-semibold text-[var(--teacher-text-strong)]">
                          {formatStudentName(student)}
                        </TableCell>
                        <TableCell className="text-[var(--teacher-text-strong)]">
                          {toPercent(student.assessmentAverage)}
                        </TableCell>
                        <TableCell className="text-[var(--teacher-text-strong)]">
                          {toPercent(student.classRecordAverage)}
                        </TableCell>
                        <TableCell className="font-semibold text-[var(--teacher-text-strong)]">
                          {toPercent(student.blendedScore)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={student.isAtRisk ? 'teacher-badge-danger border-0' : 'teacher-badge-success border-0'}
                          >
                            {student.isAtRisk ? 'At Risk' : 'Stable'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[var(--teacher-text-strong)]">
                          {formatDateTime(student.lastComputedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TeacherSectionCard>

          <TeacherSectionCard
            title="Recent Performance Logs"
            description="Follow risk-state transitions over time to understand how learners are moving."
          >
            {(logs?.logs.length ?? 0) === 0 ? (
              <TeacherEmptyState
                title="No risk transitions recorded"
                description="When learner risk states change, the latest transitions will be listed here."
              />
            ) : (
              <div className="teacher-table-shell">
                <Table>
                  <TableHeader className="teacher-table-head [&_tr]:border-white/15">
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                        When
                      </TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                        Student
                      </TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                        Transition
                      </TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                        Blended
                      </TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                        Trigger
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="[&_tr:last-child]:border-0">
                    {(logs?.logs ?? []).map((entry) => (
                      <TableRow key={entry.id} className="teacher-table-row border-white/10">
                        <TableCell className="text-[var(--teacher-text-strong)]">
                          {formatDateTime(entry.createdAt)}
                        </TableCell>
                        <TableCell className="text-[var(--teacher-text-strong)]">
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
                                thresholdApplied:
                                  entry.thresholdApplied ?? atRisk?.threshold ?? 0,
                                lastComputedAt: entry.createdAt,
                              })
                            : entry.studentId}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              className={entry.previousIsAtRisk ? 'teacher-badge-danger border-0' : 'teacher-badge-success border-0'}
                            >
                              {entry.previousIsAtRisk ? 'At Risk' : 'Stable'}
                            </Badge>
                            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teacher-text-muted)]">
                              to
                            </span>
                            <Badge
                              className={entry.currentIsAtRisk ? 'teacher-badge-danger border-0' : 'teacher-badge-success border-0'}
                            >
                              {entry.currentIsAtRisk ? 'At Risk' : 'Stable'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-[var(--teacher-text-strong)]">
                          {toPercent(entry.blendedScore)}
                        </TableCell>
                        <TableCell className="text-[var(--teacher-text-strong)]">
                          {formatTriggerSource(entry.triggerSource)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TeacherSectionCard>

          {selectedClassId && (summary?.atRiskCount ?? 0) > 0 ? (
            <div className="teacher-soft-panel flex items-start gap-3 rounded-[1.5rem] px-5 py-4">
              <div className="rounded-2xl bg-amber-400/15 p-3 text-amber-600 dark:text-amber-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-[var(--teacher-text-strong)]">
                  Intervention-ready list generated
                </p>
                <p className="mt-1 text-sm text-[var(--teacher-text-muted)]">
                  This class currently has students who can flow directly into intervention planning based on the latest risk snapshot.
                </p>
              </div>
            </div>
          ) : null}
        </>
      )}
    </TeacherPageShell>
  );
}

