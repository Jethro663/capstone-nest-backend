'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
      const res = await classService.getByTeacher(user.id);
      const rows = res.data ?? [];
      setClasses(rows);
      setSelectedClassId((prev) => prev || rows[0]?.id || '');
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
    router.push(`/dashboard/teacher/interventions/${caseId}`);
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
      badge="Intervention Studio"
      title="Intervention Management"
      description={
        thresholdLabel !== null
          ? `Current intervention threshold: ${thresholdLabel}%. Use the queue below to assign AI plans, monitor progress, and close resolved cases faster.`
          : 'Review active support cases, generated recommendations, and progression signals in one more interactive teacher queue.'
      }
      actions={
 
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="teacher-select min-w-[280px] text-sm"
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
            caption="Successfully resolved support runs"
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
            caption="Score lift after interventions"
            icon={Trophy}
            accent="amber"
          />
          <TeacherStatCard
            label="XP Momentum"
            value={report?.leaderboard[0]?.xpTotal ?? 0}
            caption="Top learner XP in this class"
            icon={Bot}
            accent="sky"
          />
        </>
      }
    >
      {!selectedClassId ? (
        <TeacherSectionCard
          title="Pick a class first"
          description="Once a class is selected, the intervention queue, outcome rows, and leaderboard will load here."
        >
          <TeacherEmptyState
            title="No class selected yet"
            description="Choose one of your classes from the selector above to start reviewing active support cases."
          />
        </TeacherSectionCard>
      ) : loadingData ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-[1.5rem]" />
          <Skeleton className="h-[25rem] rounded-[1.8rem]" />
          <Skeleton className="h-[20rem] rounded-[1.8rem]" />
        </div>
      ) : (
        <>
          <TeacherSectionCard
            title="Active Intervention Queue"
            description="Prioritize students, jump into AI-generated plans, and resolve finished support tracks without leaving the page."
          >
            {(queue?.queue.length ?? 0) === 0 ? (
              <TeacherEmptyState
                title="No active intervention cases"
                description="This class is currently clear. New at-risk learners will appear here once intervention triggers fire."
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
                        Trigger Score
                      </TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                        Progress
                      </TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                        XP
                      </TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                        Stars
                      </TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                        Streak
                      </TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                        Status
                      </TableHead>
                      <TableHead className="text-right text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                        Action
                      </TableHead>
 
                    </TableRow>
                  </TableHeader>
                  <TableBody className="[&_tr:last-child]:border-0">
                    {queue?.queue.map((entry) => (
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
                              className="teacher-progress-track h-3"
                              indicatorClassName="teacher-progress-fill"
                            />
                            <p className="text-xs font-medium text-[var(--teacher-text-muted)]">
                              {entry.completedCheckpoints}/{entry.totalCheckpoints} checkpoints completed
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-[var(--teacher-text-strong)]">
                          {entry.progress.xpTotal}
                        </TableCell>
                        <TableCell className="text-[var(--teacher-text-strong)]">
                          {entry.progress.starsTotal.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-[var(--teacher-text-strong)]">
                          {entry.progress.streakDays}
                        </TableCell>
 
                        <TableCell>
                          <Badge className="teacher-badge-danger border-0">Active</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="teacher"
                              className="rounded-xl"
                              onClick={() => handleRecommend(entry.id)}
                            >
                              AI Plan
                            </Button>
                            <Button
                              size="sm"
                              variant="teacherOutline"
                              className="rounded-xl"
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

          <TeacherSectionCard
            title="Intervention Outcomes"
            description="Compare baseline, current blended scores, and learner recovery deltas."
          >
            {(report?.rows.length ?? 0) === 0 ? (
              <TeacherEmptyState
                title="No intervention rows yet"
                description="Outcome data will appear here after interventions begin collecting learner progress."
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
                        Status
                      </TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                        Baseline
                      </TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                        Current
                      </TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                        Delta
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="[&_tr:last-child]:border-0">
                    {report?.rows.map((row) => (
                      <TableRow key={row.id} className="teacher-table-row border-white/10">
                        <TableCell className="font-semibold text-[var(--teacher-text-strong)]">
                          {studentName(row.student ?? {})}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={row.status === 'active' ? 'teacher-badge-danger border-0' : 'teacher-badge-success border-0'}
                          >
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[var(--teacher-text-strong)]">
                          {row.triggerScore !== null ? `${row.triggerScore.toFixed(1)}%` : '--'}
                        </TableCell>
                        <TableCell className="text-[var(--teacher-text-strong)]">
                          {row.currentBlendedScore !== null
                            ? `${row.currentBlendedScore.toFixed(1)}%`
                            : '--'}
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

          <TeacherSectionCard
            title="XP Leaderboard"
            description="Celebrate momentum and identify who is responding best to intervention activities."
          >
            {(report?.leaderboard.length ?? 0) === 0 ? (
              <TeacherEmptyState
                title="No XP progress recorded"
                description="Leaderboard rankings will appear as soon as students begin earning XP in their intervention track."
              />
            ) : (
              <div className="teacher-table-shell">
                <Table>
                  <TableHeader className="teacher-table-head [&_tr]:border-white/15">
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                        Rank
                      </TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                        Student
                      </TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                        XP
                      </TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                        Stars
                      </TableHead>
                      <TableHead className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--teacher-text-muted)]">
                        Streak
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="[&_tr:last-child]:border-0">
                    {report?.leaderboard.map((row) => (
                      <TableRow key={row.studentId} className="teacher-table-row border-white/10">
                        <TableCell className="font-black text-[var(--teacher-text-strong)]">
                          #{row.rank}
                        </TableCell>
                        <TableCell className="font-semibold text-[var(--teacher-text-strong)]">
                          {studentName(row.student ?? {})}
                        </TableCell>
                        <TableCell className="text-[var(--teacher-text-strong)]">
                          {row.xpTotal}
                        </TableCell>
                        <TableCell className="text-[var(--teacher-text-strong)]">
                          {row.starsTotal.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-[var(--teacher-text-strong)]">
                          {row.streakDays}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TeacherSectionCard>
        </>
      )}
    </TeacherPageShell>
 
  );
}

