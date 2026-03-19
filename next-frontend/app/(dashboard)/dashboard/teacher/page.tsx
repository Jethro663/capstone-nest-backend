'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  BookOpen,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  RefreshCcw,
  Sparkles,
  TimerReset,
  Zap,
} from 'lucide-react';
import { analyticsService } from '@/services/analytics-service';
import { dashboardService } from '@/services/dashboard-service';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useAuth } from '@/providers/AuthProvider';
 
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TeacherEmptyState,
  TeacherPageShell,
  TeacherSectionCard,
  TeacherStatCard,
} from '@/components/teacher/TeacherPageShell';
import { formatDate } from '@/utils/helpers';
import type { Assessment } from '@/types/assessment';
import type { ClassItem } from '@/types/class';
import type { Lesson } from '@/types/lesson';

function formatRefreshInterval(value: number) {
  if (value < 60000) {
    return `${value / 1000}s`;
  }

  return `${value / 60000}m`;
}

export default function TeacherDashboardPage() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [interval, setInterval] = useState(30000);
  const [workloadAction, setWorkloadAction] = useState<string | null>(null);
  const [improvementAction, setImprovementAction] = useState<string | null>(null);
  const [pendingClassRecords, setPendingClassRecords] = useState(0);
  const [activeInterventions, setActiveInterventions] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const [lessonsRes, classesRes, assessmentsRes] = await Promise.all([
        dashboardService.getTeacherLessons(),
        dashboardService.getTeacherClasses(),
        dashboardService.getTeacherAssessments(),
      ]);
      const nextLessons = lessonsRes.data || [];
      const nextClasses = classesRes.data || [];
      const nextAssessments = assessmentsRes.data || [];

      setLessons(nextLessons);
      setClasses(nextClasses);
      setAssessments(nextAssessments);

      if (user?.id) {
        const workloadRes = await analyticsService.getTeacherWorkload(user.id);
        setWorkloadAction(workloadRes.data.action);
        setPendingClassRecords(workloadRes.data.pendingClassRecords);
        setActiveInterventions(workloadRes.data.activeInterventions);
      }

      if (nextClasses[0]?.id) {
        const interventionRes = await analyticsService.getInterventionOutcomes(nextClasses[0].id);
        setImprovementAction(interventionRes.data.summary.action);
      } else {
        setImprovementAction(null);
      }

 
      setLastUpdated(new Date());
    } catch {
      // Keep the dashboard usable even when one insight feed fails.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useAutoRefresh(fetchData, interval, autoRefresh);

  const publishedAssessments = useMemo(
    () => assessments.filter((assessment) => assessment.isPublished),
    [assessments],
  );

  const insightTone = activeInterventions > 0 || pendingClassRecords > 0
    ? 'Focused momentum'
    : 'Steady rhythm';

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-56 rounded-[1.9rem]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-32 rounded-[1.5rem]" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <Skeleton className="h-56 rounded-[1.7rem]" />
          <Skeleton className="h-56 rounded-[1.7rem]" />
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <Skeleton className="h-80 rounded-[1.7rem]" />
          <Skeleton className="h-80 rounded-[1.7rem]" />
        </div>
      </div>
    );
  }

  return (
    <TeacherPageShell
      badge="Teacher Dashboard"
      title={`Welcome back${user?.firstName ? `, ${user.firstName}` : ''}.`}
      description="Keep your classes, assessments, and intervention signals in one polished workspace so it is easier to see what needs attention and what is moving well."
      actions={(
        <>
          <div className="teacher-dashboard-controls">
            <label className="teacher-dashboard-toggle">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(event) => setAutoRefresh(event.target.checked)}
              />
              <span>Auto-refresh</span>
            </label>

            <select
              value={interval}
              onChange={(event) => setInterval(Number(event.target.value))}
              className="teacher-select min-w-[5.75rem] text-sm font-semibold"
            >
              <option value={15000}>15s</option>
              <option value={30000}>30s</option>
              <option value={60000}>1m</option>
              <option value={300000}>5m</option>
            </select>

            <Button className="teacher-button-solid rounded-xl px-4 font-black" onClick={fetchData}>
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </>
      )}
      stats={(
        <>
          <TeacherStatCard
            label="My Classes"
            value={classes.length}
            caption={classes.length > 0 ? 'Active teaching spaces' : 'Waiting for assigned classes'}
            icon={GraduationCap}
            accent="sky"
          />
          <TeacherStatCard
            label="Lessons"
            value={lessons.length}
            caption={lessons.length > 0 ? 'Content ready to deliver' : 'No lessons created yet'}
            icon={BookOpen}
            accent="teal"
          />
          <TeacherStatCard
            label="Assessments"
            value={publishedAssessments.length}
            caption={publishedAssessments.length > 0 ? 'Published and visible to learners' : 'Nothing published yet'}
            icon={ClipboardCheck}
            accent="amber"
          />
          <TeacherStatCard
            label="Active Interventions"
            value={activeInterventions}
            caption={activeInterventions > 0 ? 'Students currently being supported' : 'No active interventions right now'}
            icon={Zap}
            accent="rose"
          />
        </>
      )}
    >
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <TeacherSectionCard
          title="Teaching Pulse"
          description="A calmer snapshot of the current teaching rhythm, pending work, and refresh status."
        >
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="teacher-dashboard-spotlight">
              <div className="flex flex-wrap items-center gap-2">
                <span className="teacher-dashboard-chip">
                  <Sparkles className="h-4 w-4" />
                  {insightTone}
                </span>
                <span className="teacher-dashboard-chip">
                  <TimerReset className="h-4 w-4" />
                  {autoRefresh ? `Every ${formatRefreshInterval(interval)}` : 'Manual refresh'}
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--teacher-text-muted)]">
                  Current Focus
                </p>
                <p className="text-2xl font-black tracking-tight text-[var(--teacher-text-strong)]">
                  {pendingClassRecords > 0
                    ? `${pendingClassRecords} class record${pendingClassRecords === 1 ? '' : 's'} still need attention`
                    : 'Your records look caught up'}
                </p>
                <p className="text-sm leading-6 text-[var(--teacher-text-muted)]">
                  {workloadAction ?? 'Workload analytics will appear here once enough teacher activity is available.'}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="teacher-dashboard-metric">
                  <span>Last Updated</span>
                  <strong>{lastUpdated ? lastUpdated.toLocaleTimeString() : 'Not yet synced'}</strong>
                </div>
                <div className="teacher-dashboard-metric">
                  <span>Pending Records</span>
                  <strong>{pendingClassRecords}</strong>
                </div>
                <div className="teacher-dashboard-metric">
                  <span>Interventions</span>
                  <strong>{activeInterventions}</strong>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <Link href="/dashboard/teacher/performance" className="teacher-dashboard-mini-panel">
                <div className="teacher-dashboard-mini-panel__icon bg-sky-100 text-sky-700">
                  <Activity className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--teacher-text-muted)]">
                    Performance Signal
                  </p>
                  <p className="text-sm font-bold text-[var(--teacher-text-strong)]">
                    {improvementAction ?? 'Open performance insights for trend guidance.'}
                  </p>
                </div>
              </Link>

              <Link href="/dashboard/teacher/reports" className="teacher-dashboard-mini-panel">
                <div className="teacher-dashboard-mini-panel__icon bg-amber-100 text-amber-700">
                  <Clock3 className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--teacher-text-muted)]">
                    Reporting Queue
                  </p>
                  <p className="text-sm font-bold text-[var(--teacher-text-strong)]">
                    {pendingClassRecords > 0
                      ? 'Finalize records and reporting next'
                      : 'Reporting tasks are under control'}
                  </p>
                </div>
              </Link>

              <Link href="/dashboard/teacher/interventions" className="teacher-dashboard-mini-panel">
                <div className="teacher-dashboard-mini-panel__icon bg-rose-100 text-rose-700">
                  <Zap className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--teacher-text-muted)]">
                    Student Support
                  </p>
                  <p className="text-sm font-bold text-[var(--teacher-text-strong)]">
                    {activeInterventions > 0
                      ? `${activeInterventions} support case${activeInterventions === 1 ? '' : 's'} are active`
                      : 'No active intervention cases at the moment'}
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </TeacherSectionCard>

        <TeacherSectionCard
          title="Quick Routes"
          description="Jump straight into the teacher tools that typically need the fastest decisions."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                href: '/dashboard/teacher/classes',
                label: 'Classes',
                copy: 'Review class cards, schedules, and student counts.',
              },
              {
                href: '/dashboard/teacher/announcements',
                label: 'Announcements',
                copy: 'Post a message and keep classes aligned quickly.',
              },
              {
                href: '/dashboard/library',
                label: 'Nexora Library',
                copy: 'Open modules, resources, and shared teaching files.',
              },
              {
                href: '/dashboard/teacher/sections',
                label: 'Sections',
                copy: 'Move into roster and advisory work with less friction.',
              },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="teacher-dashboard-quick-link">
                <div>
                  <p className="text-sm font-black text-[var(--teacher-text-strong)]">{item.label}</p>
                  <p className="mt-1 text-sm text-[var(--teacher-text-muted)]">{item.copy}</p>
                </div>
                <span className="teacher-dashboard-quick-link__cta">Open</span>
              </Link>
            ))}
          </div>
        </TeacherSectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <TeacherSectionCard
          title="Recent Lessons"
          description="A more readable lesson queue so the newest materials are easier to revisit."
          action={(
            <Link href="/dashboard/teacher/lessons">
              <Button variant="outline" className="teacher-button-outline rounded-xl text-xs font-black">
                View lessons
              </Button>
            </Link>
          )}
        >
 
          {lessons.length === 0 ? (
            <TeacherEmptyState
              title="No lessons created yet"
              description="Once you start publishing lessons, the newest ones will appear here with quick date and class context."
            />
          ) : (
            <div className="teacher-dashboard-list">
              {lessons.slice(0, 5).map((lesson) => (
                <div key={lesson.id} className="teacher-dashboard-list-row">
                  <div className="teacher-dashboard-list-row__icon">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-[var(--teacher-text-strong)]">{lesson.title}</p>
                    <p className="text-xs text-[var(--teacher-text-muted)]">
                      Class {lesson.classId.slice(0, 8)} â€¢ {formatDate(lesson.createdAt || '')}
                    </p>
                  </div>
                  <Link href={`/dashboard/teacher/lessons/${lesson.id}/edit`}>
                    <Button variant="outline" size="sm" className="teacher-button-outline rounded-xl px-3 font-black">
                      Open
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </TeacherSectionCard>

        <TeacherSectionCard
          title="Recent Assessments"
          description="See the latest published work without digging through a flat table."
          action={(
            <Link href="/dashboard/teacher/assessments">
              <Button variant="outline" className="teacher-button-outline rounded-xl text-xs font-black">
                View assessments
              </Button>
            </Link>
          )}
        >
          {assessments.length === 0 ? (
            <TeacherEmptyState
              title="No assessments created yet"
              description="When assessments are ready, this panel will surface their type and due date at a glance."
            />
          ) : (
            <div className="teacher-dashboard-list">
              {assessments.slice(0, 5).map((assessment) => (
                <div key={assessment.id} className="teacher-dashboard-list-row">
                  <div className="teacher-dashboard-list-row__icon teacher-dashboard-list-row__icon--warm">
                    <ClipboardCheck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-[var(--teacher-text-strong)]">{assessment.title}</p>
                    <p className="text-xs uppercase text-[var(--teacher-text-muted)]">
                      {assessment.type.replace('_', ' ')} â€¢ {assessment.dueDate ? formatDate(assessment.dueDate) : 'No due date'}
                    </p>
                  </div>
                  <Link href={`/dashboard/teacher/assessments/${assessment.id}`}>
                    <Button variant="outline" size="sm" className="teacher-button-outline rounded-xl px-3 font-black">
                      Review
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </TeacherSectionCard>
      </div>
    </TeacherPageShell>
  );
}

