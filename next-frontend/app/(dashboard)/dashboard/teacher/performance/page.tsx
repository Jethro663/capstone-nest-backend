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
  ClassDiagnosticsResponse,
  ClassAtRiskResponse,
  ClassPerformanceLogsResponse,
  ClassPerformanceSummary,
  PerformanceAnalysisJob,
  PerformanceAnalysisStructuredOutput,
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

function formatLogStudent(entry: {
  student?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
  studentId: string;
}): string {
  const first = entry.student?.firstName?.trim() ?? '';
  const last = entry.student?.lastName?.trim() ?? '';
  if (first && last) return `${last}, ${first}`;
  if (last) return last;
  if (first) return first;
  return entry.student?.email ?? entry.studentId;
}

export default function TeacherPerformancePage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [summary, setSummary] = useState<ClassPerformanceSummary | null>(null);
  const [atRisk, setAtRisk] = useState<ClassAtRiskResponse | null>(null);
  const [logs, setLogs] = useState<ClassPerformanceLogsResponse | null>(null);
  const [diagnostics, setDiagnostics] = useState<ClassDiagnosticsResponse | null>(null);
  const [analysisJob, setAnalysisJob] = useState<PerformanceAnalysisJob | null>(null);
  const [analysisResult, setAnalysisResult] = useState<PerformanceAnalysisStructuredOutput | null>(null);
  const [analysisTargetStudentId, setAnalysisTargetStudentId] = useState<string | null>(null);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

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
      setDiagnostics(null);
      return;
    }

    try {
      setLoadingData(true);
      const [summaryRes, atRiskRes, logsRes, diagnosticsRes] = await Promise.allSettled([
        performanceService.getClassSummary(selectedClassId),
        performanceService.getAtRiskStudents(selectedClassId),
        performanceService.getClassLogs(selectedClassId, { limit: 25 }),
        performanceService.getClassDiagnostics(selectedClassId),
      ]);
      if (summaryRes.status === 'fulfilled') {
        setSummary(summaryRes.value.data);
      } else {
        setSummary(null);
      }
      if (atRiskRes.status === 'fulfilled') {
        setAtRisk(atRiskRes.value.data);
      } else {
        setAtRisk(null);
      }
      if (logsRes.status === 'fulfilled') {
        setLogs(logsRes.value.data);
      } else {
        setLogs(null);
      }
      if (diagnosticsRes.status === 'fulfilled') {
        setDiagnostics(diagnosticsRes.value.data);
      } else {
        setDiagnostics(null);
      }
      if (
        summaryRes.status === 'rejected' &&
        atRiskRes.status === 'rejected' &&
        logsRes.status === 'rejected' &&
        diagnosticsRes.status === 'rejected'
      ) {
        toast.error('Failed to load performance summary');
      } else if (
        summaryRes.status === 'rejected' ||
        atRiskRes.status === 'rejected' ||
        logsRes.status === 'rejected' ||
        diagnosticsRes.status === 'rejected'
      ) {
        toast.warning('Some performance panels are temporarily unavailable.');
      }
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
      toast.success(`Recomputed ${result.data.recomputed} student snapshot(s)`);
      await fetchPerformance();
    } catch {
      toast.error('Recompute failed');
    } finally {
      setRecomputing(false);
    }
  };

  useEffect(() => {
    if (!analysisJob || !['pending', 'processing'].includes(analysisJob.status)) {
      return;
    }

    const interval = window.setInterval(async () => {
      try {
        const statusRes = await performanceService.getAnalysisJobStatus(analysisJob.jobId);
        setAnalysisJob(statusRes.data);
        if (['completed', 'approved'].includes(statusRes.data.status)) {
          const resultRes = await performanceService.getAnalysisJobResult(statusRes.data.jobId);
          setAnalysisResult(resultRes.data.result.structuredOutput);
          setAnalyzing(false);
          window.clearInterval(interval);
        }
        if (statusRes.data.status === 'failed') {
          setAnalyzing(false);
          toast.error(statusRes.data.errorMessage || 'Performance analysis failed.');
          window.clearInterval(interval);
        }
      } catch {
        setAnalyzing(false);
        toast.error('Failed to refresh analysis job status.');
        window.clearInterval(interval);
      }
    }, 2500);

    return () => window.clearInterval(interval);
  }, [analysisJob]);

  const handleAnalyze = async (studentId?: string) => {
    if (!selectedClassId) return;
    try {
      setAnalyzing(true);
      setAnalysisResult(null);
      setAnalysisTargetStudentId(studentId ?? null);
      const jobRes = await performanceService.createAnalysisJob(selectedClassId, {
        studentId,
      });
      setAnalysisJob(jobRes.data);
      if (['completed', 'approved'].includes(jobRes.data.status)) {
        const resultRes = await performanceService.getAnalysisJobResult(jobRes.data.jobId);
        setAnalysisResult(resultRes.data.result.structuredOutput);
        setAnalyzing(false);
      }
    } catch {
      setAnalyzing(false);
      toast.error('Failed to start performance analysis.');
    }
  };

  if (loadingClasses) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-[15px]" />
        <Skeleton className="h-24 rounded-[15px]" />
        <Skeleton className="h-[34rem] rounded-[15px]" />
      </div>
    );
  }

  return (
    <TeacherPageShell
      badge="Performance"
      title="Performance Monitoring"
      description={
        threshold !== null
          ? `Student performance monitoring with at-risk threshold ${threshold}%.`
          : 'Student performance monitoring'
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
            className="teacher-select min-w-[240px] text-sm"
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
            className="rounded-xl px-4"
          >
            <RefreshCw className={`h-4 w-4 ${recomputing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      }
      stats={
        <>
          <TeacherStatCard
            label="Total Students"
            value={summary?.totalStudents ?? 0}
            caption={`${summary?.studentsWithData ?? 0} with data snapshots`}
            icon={Users}
            accent="sky"
          />
          <TeacherStatCard
            label="Passing"
            value={
              summary && summary.totalStudents > 0
                ? summary.totalStudents - summary.atRiskCount
                : 0
            }
            caption="Students currently above risk threshold"
            icon={TrendingUp}
            accent="teal"
          />
          <TeacherStatCard
            label="At Risk"
            value={summary?.atRiskCount ?? 0}
            caption={`${(summary?.atRiskRate ?? 0).toFixed(1)}% of selected class`}
            icon={ShieldAlert}
            accent="rose"
          />
          <TeacherStatCard
            label="Class Average"
            value={toPercent(summary?.averages.blended ?? null)}
            caption={selectedClass?.subjectCode ? `${selectedClass.subjectCode} blended average` : 'No class selected'}
            icon={AlertTriangle}
            accent="amber"
          />
        </>
      }
    >
      {!selectedClassId ? (
        <TeacherSectionCard
          title="Waiting for class selection"
          description="Choose a class to load at-risk learners and performance logs."
          className="teacher-figma-stagger"
        >
          <TeacherEmptyState
            title="No class selected"
            description="Select one of your classes to load this performance dashboard."
          />
        </TeacherSectionCard>
      ) : null}

      {selectedClassId && loadingData ? (
        <div className="space-y-4">
          <Skeleton className="h-[20rem] rounded-[15px]" />
          <Skeleton className="h-[20rem] rounded-[15px]" />
        </div>
      ) : null}

      {selectedClassId && !loadingData ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr] teacher-figma-stagger">
            <TeacherSectionCard
              title="At-Risk Students"
              description="Latest blended score flags for intervention prioritization."
            >
              {(atRisk?.students.length ?? 0) === 0 ? (
                <TeacherEmptyState
                  title="No at-risk students found"
                  description="This class is currently stable based on latest computed scores."
                />
              ) : (
                <div className="teacher-table-shell">
                  <Table>
                    <TableHeader className="teacher-table-head [&_tr]:border-white/15">
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead>Student</TableHead>
                        <TableHead>Assessment</TableHead>
                        <TableHead>Class Record</TableHead>
                        <TableHead>Blended</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">AI</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="[&_tr:last-child]:border-0">
                      {(atRisk?.students ?? []).map((student) => (
                        <TableRow key={student.studentId} className="teacher-table-row border-white/10">
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
                            <Badge className="teacher-badge-danger border-0">At Risk</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="teacherOutline"
                              className="rounded-lg"
                              disabled={analyzing}
                              onClick={() => handleAnalyze(student.studentId)}
                            >
                              Analyze
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TeacherSectionCard>

            <div className="space-y-4">
              <TeacherSectionCard title="Class Snapshot">
                <div className="space-y-3 text-sm">
                  <div className="teacher-figma-kv">
                    <span>Threshold</span>
                    <strong>{threshold !== null ? `${threshold}%` : '--'}</strong>
                  </div>
                  <div className="teacher-figma-kv">
                    <span>Students With Data</span>
                    <strong>{summary?.studentsWithData ?? 0}</strong>
                  </div>
                  <div className="teacher-figma-kv">
                    <span>Average Assessment</span>
                    <strong>{toPercent(summary?.averages.assessment ?? null)}</strong>
                  </div>
                  <div className="teacher-figma-kv">
                    <span>Average Class Record</span>
                    <strong>{toPercent(summary?.averages.classRecord ?? null)}</strong>
                  </div>
                </div>
              </TeacherSectionCard>

              <TeacherSectionCard title="Risk Readiness">
                {(summary?.atRiskCount ?? 0) > 0 ? (
                  <div className="teacher-soft-panel rounded-[12px] border border-[#fecaca] px-3 py-3 text-sm text-[var(--teacher-text-strong)]">
                    <p className="font-semibold text-[#b91c1c]">
                      Intervention-ready list generated
                    </p>
                    <p className="mt-1 text-[var(--teacher-text-muted)]">
                      This class has learners ready for immediate intervention planning.
                    </p>
                  </div>
                ) : (
                  <TeacherEmptyState
                    title="No intervention-ready learners"
                    description="No learners currently require intervention at this threshold."
                  />
                )}
              </TeacherSectionCard>

              <TeacherSectionCard
                title="Score Diagnostics"
                description="Lowest-performing assessments and concept hotspots."
              >
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-semibold text-[var(--teacher-text-strong)]">Lowest Assessments</p>
                    {(diagnostics?.lowestAssessments.length ?? 0) === 0 ? (
                      <p className="text-[var(--teacher-text-muted)]">No assessment diagnostics yet.</p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {diagnostics?.lowestAssessments.slice(0, 3).map((assessment) => (
                          <div key={assessment.assessmentId} className="teacher-figma-kv">
                            <span>{assessment.title}</span>
                            <strong>
                              {assessment.averageScore !== null
                                ? `${assessment.averageScore.toFixed(1)}%`
                                : '--'}
                            </strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--teacher-text-strong)]">Top Concept Hotspots</p>
                    {(diagnostics?.conceptHotspots.length ?? 0) === 0 ? (
                      <p className="text-[var(--teacher-text-muted)]">No concept hotspots yet.</p>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {diagnostics?.conceptHotspots.slice(0, 4).map((concept) => (
                          <Badge key={concept.concept} variant="outline">
                            {concept.concept}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TeacherSectionCard>
            </div>
          </div>

          <TeacherSectionCard
            title="Recent Performance Logs"
            description="Risk state transitions from latest performance recomputations."
            className="teacher-figma-stagger"
          >
            {(logs?.logs.length ?? 0) === 0 ? (
              <TeacherEmptyState
                title="No risk transitions recorded"
                description="Risk transition logs will appear once state changes are detected."
              />
            ) : (
              <div className="teacher-table-shell">
                <Table>
                  <TableHeader className="teacher-table-head [&_tr]:border-white/15">
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead>When</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Transition</TableHead>
                      <TableHead>Blended</TableHead>
                      <TableHead>Trigger</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="[&_tr:last-child]:border-0">
                    {(logs?.logs ?? []).map((entry) => (
                      <TableRow key={entry.id} className="teacher-table-row border-white/10">
                        <TableCell className="text-[var(--teacher-text-strong)]">
                          {formatDateTime(entry.createdAt)}
                        </TableCell>
                        <TableCell className="text-[var(--teacher-text-strong)]">
                          {formatLogStudent(entry)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={entry.previousIsAtRisk ? 'teacher-badge-danger border-0' : 'teacher-badge-success border-0'}>
                              {entry.previousIsAtRisk ? 'At Risk' : 'Stable'}
                            </Badge>
                            <span className="text-xs uppercase tracking-[0.12em] text-[var(--teacher-text-muted)]">to</span>
                            <Badge className={entry.currentIsAtRisk ? 'teacher-badge-danger border-0' : 'teacher-badge-success border-0'}>
                              {entry.currentIsAtRisk ? 'At Risk' : 'Stable'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-[var(--teacher-text-strong)]">{toPercent(entry.blendedScore)}</TableCell>
                        <TableCell className="text-[var(--teacher-text-strong)]">{formatTriggerSource(entry.triggerSource)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TeacherSectionCard>

          <TeacherSectionCard
            title="AI Learning Gap Analysis"
            description="Class or student-level AI diagnostics powered by mistakes and lesson evidence."
            className="teacher-figma-stagger"
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Button
                variant="teacher"
                className="rounded-lg"
                disabled={!selectedClassId || analyzing}
                onClick={() => handleAnalyze()}
              >
                {analyzing ? 'Analyzing...' : 'Analyze Whole Class'}
              </Button>
              {analysisTargetStudentId ? (
                <Badge variant="secondary">Student scope</Badge>
              ) : (
                <Badge variant="secondary">Class scope</Badge>
              )}
              {analysisJob ? (
                <Badge variant="outline">
                  {analysisJob.status} ({analysisJob.progressPercent}%)
                </Badge>
              ) : null}
            </div>

            {!analysisResult ? (
              <TeacherEmptyState
                title="No AI analysis yet"
                description="Run an AI analysis to identify learning gaps and evidence-backed interventions."
              />
            ) : (
              <div className="space-y-4">
                <div className="teacher-soft-panel rounded-[12px] border border-white/15 px-3 py-3 text-sm">
                  <p className="font-semibold text-[var(--teacher-text-strong)]">
                    {analysisResult.recommendedIntervention.status === 'insufficient_evidence'
                      ? 'Insufficient evidence'
                      : 'Actionable analysis ready'}
                  </p>
                  <p className="text-[var(--teacher-text-muted)]">
                    {analysisResult.teacherActions[0] ?? 'No teacher action provided.'}
                  </p>
                </div>
                <div className="grid gap-2">
                  {analysisResult.learningGaps.slice(0, 6).map((gap) => (
                    <div key={gap.concept} className="teacher-figma-kv">
                      <span>{gap.concept}</span>
                      <strong>
                        {gap.masteryScore}% mastery · {gap.wrongCount} misses
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TeacherSectionCard>
        </>
      ) : null}
    </TeacherPageShell>
  );
}
