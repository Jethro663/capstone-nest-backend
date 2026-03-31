'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Sparkles, Target, Trophy } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { lxpService } from '@/services/lxp-service';
import type { ClassItem } from '@/types/class';
import type { LxpClassReport, TeacherInterventionQueueResponse } from '@/types/lxp';
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
import {
  TeacherEmptyState,
  TeacherPageShell,
  TeacherSectionCard,
  TeacherStatCard,
} from '@/components/teacher/TeacherPageShell';
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
  const { user } = useAuth();
  const router = useRouter();
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
  const thresholdLabel = report?.threshold ?? queue?.threshold ?? null;

  const fetchClassList = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoadingClasses(true);
      const response = await classService.getByTeacher(user.id);
      const rows = response.data ?? [];
      setClasses(rows);
      setSelectedClassId((current) => current || rows[0]?.id || '');
    } catch {
      toast.error('Failed to load classes');
    } finally {
      setLoadingClasses(false);
    }
  }, [user?.id]);

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
      await lxpService.resolveIntervention(caseId, 'Resolved by teacher queue');
      toast.success('Intervention case resolved');
      await fetchInterventionData();
    } catch {
      toast.error('Failed to resolve intervention case');
    } finally {
      setResolvingCaseId(null);
    }
  };

  const handleRecommend = (caseId: string) => {
    router.push(`/dashboard/teacher/interventions/${caseId}`);
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
      badge="Interventions"
      title="Intervention Queue"
      description={
        thresholdLabel !== null
          ? `AI-assisted student support queue (threshold ${thresholdLabel}%).`
          : 'AI-assisted student support queue'
      }
      actions={
        <select
          value={selectedClassId}
          onChange={(event) => setSelectedClassId(event.target.value)}
          className="teacher-select min-w-[260px] text-sm"
        >
          <option value="">Select class...</option>
          {classes.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.subjectName} ({entry.subjectCode}) - {entry.section?.name}
            </option>
          ))}
        </select>
      }
      stats={
        <>
          <TeacherStatCard
            label="Active Cases"
            value={report?.summary.activeCases ?? 0}
            caption={selectedClass?.subjectCode ? `${selectedClass.subjectCode} intervention load` : 'Select a class'}
            icon={Target}
            accent="rose"
          />
          <TeacherStatCard
            label="Completed Cases"
            value={report?.summary.completedCases ?? 0}
            caption="Resolved intervention cases"
            icon={Sparkles}
            accent="teal"
          />
          <TeacherStatCard
            label="Average Delta"
            value={
              report?.summary.averageDelta !== null &&
              report?.summary.averageDelta !== undefined
                ? `${report.summary.averageDelta.toFixed(2)}%`
                : '--'
            }
            caption="Average score lift after intervention"
            icon={Trophy}
            accent="amber"
          />
          <TeacherStatCard
            label="Top XP"
            value={report?.leaderboard[0]?.xpTotal ?? 0}
            caption="Highest XP in selected class"
            icon={Bot}
            accent="sky"
          />
        </>
      }
    >
      {!selectedClassId ? (
        <TeacherSectionCard
          title="Pick a class first"
          description="Select a class to load queue and intervention outcomes."
          className="teacher-figma-stagger"
        >
          <TeacherEmptyState
            title="No class selected yet"
            description="Choose one class from the selector to review intervention queues."
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
              title="Active Intervention Queue"
              description="Prioritize cases, launch AI plans, and resolve completed interventions."
            >
              {(queue?.queue.length ?? 0) === 0 ? (
                <TeacherEmptyState
                  title="No active intervention cases"
                  description="New at-risk learners will appear here when trigger thresholds are crossed."
                />
              ) : (
                <div className="teacher-table-shell">
                  <Table>
                    <TableHeader className="teacher-table-head [&_tr]:border-white/15">
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead>Student</TableHead>
                        <TableHead>Trigger</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>XP</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="[&_tr:last-child]:border-0">
                      {(queue?.queue ?? []).map((entry) => (
                        <TableRow key={entry.id} className="teacher-table-row border-white/10">
                          <TableCell className="font-semibold text-[var(--teacher-text-strong)]">
                            {studentName(entry.student ?? {})}
                          </TableCell>
                          <TableCell className="text-[var(--teacher-text-strong)]">
                            {entry.triggerScore !== null && entry.triggerScore !== undefined
                              ? `${entry.triggerScore.toFixed(1)}%`
                              : '--'}
                          </TableCell>
                          <TableCell className="min-w-[220px]">
                            <div className="space-y-2">
                              <Progress
                                value={entry.completionPercent}
                                className="teacher-progress-track h-2.5"
                                indicatorClassName="teacher-progress-fill"
                              />
                              <p className="text-xs text-[var(--teacher-text-muted)]">
                                {entry.completedCheckpoints}/{entry.totalCheckpoints} checkpoints
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-[var(--teacher-text-strong)]">{entry.progress.xpTotal}</TableCell>
                          <TableCell>
                            <Badge className="teacher-badge-danger border-0">Active</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="teacher"
                                className="rounded-lg"
                                onClick={() => handleRecommend(entry.id)}
                              >
                                AI Plan
                              </Button>
                              <Button
                                size="sm"
                                variant="teacherOutline"
                                className="rounded-lg"
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
                </div>
              )}
            </TeacherSectionCard>

            <div className="space-y-4">
              <TeacherSectionCard title="Queue Summary">
                <div className="space-y-3 text-sm">
                  <div className="teacher-figma-kv">
                    <span>Threshold</span>
                    <strong>{thresholdLabel !== null ? `${thresholdLabel}%` : '--'}</strong>
                  </div>
                  <div className="teacher-figma-kv">
                    <span>Total Cases</span>
                    <strong>{report?.summary.totalCases ?? 0}</strong>
                  </div>
                  <div className="teacher-figma-kv">
                    <span>Participation</span>
                    <strong>{report?.summary.interventionParticipation ?? 0}</strong>
                  </div>
                </div>
              </TeacherSectionCard>

              <TeacherSectionCard
                title="XP Leaderboard"
                description="Top learners responding to intervention checkpoints."
              >
                {(report?.leaderboard.length ?? 0) === 0 ? (
                  <TeacherEmptyState
                    title="No XP records yet"
                    description="Leaderboard appears after learners complete assigned activities."
                  />
                ) : (
                  <div className="space-y-2">
                    {(report?.leaderboard ?? []).slice(0, 5).map((row) => (
                      <div key={row.studentId} className="teacher-figma-list-row">
                        <span className="teacher-figma-list-row__rank">#{row.rank}</span>
                        <span className="teacher-figma-list-row__name">{studentName(row.student ?? {})}</span>
                        <span className="teacher-figma-list-row__value">{row.xpTotal} XP</span>
                      </div>
                    ))}
                  </div>
                )}
              </TeacherSectionCard>
            </div>
          </div>

          <TeacherSectionCard
            title="Intervention Outcomes"
            description="Compare baseline and current blended scores for all intervention cases."
            className="teacher-figma-stagger"
          >
            {(report?.rows.length ?? 0) === 0 ? (
              <TeacherEmptyState
                title="No intervention outcomes yet"
                description="Outcome rows will appear once intervention progress has been recorded."
              />
            ) : (
              <div className="teacher-table-shell">
                <Table>
                  <TableHeader className="teacher-table-head [&_tr]:border-white/15">
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead>Student</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Baseline</TableHead>
                      <TableHead>Current</TableHead>
                      <TableHead>Delta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="[&_tr:last-child]:border-0">
                    {(report?.rows ?? []).map((row) => (
                      <TableRow key={row.id} className="teacher-table-row border-white/10">
                        <TableCell className="font-semibold text-[var(--teacher-text-strong)]">
                          {studentName(row.student ?? {})}
                        </TableCell>
                        <TableCell>
                          <Badge className={row.status === 'active' ? 'teacher-badge-danger border-0' : 'teacher-badge-success border-0'}>
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[var(--teacher-text-strong)]">
                          {row.triggerScore !== null ? `${row.triggerScore.toFixed(1)}%` : '--'}
                        </TableCell>
                        <TableCell className="text-[var(--teacher-text-strong)]">
                          {row.currentBlendedScore !== null ? `${row.currentBlendedScore.toFixed(1)}%` : '--'}
                        </TableCell>
                        <TableCell className="font-semibold text-[var(--teacher-text-strong)]">
                          {row.improvementDelta !== null
                            ? `${row.improvementDelta > 0 ? '+' : ''}${row.improvementDelta.toFixed(1)}%`
                            : '--'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TeacherSectionCard>
        </>
      ) : null}
    </TeacherPageShell>
  );
}

