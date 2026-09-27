'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BookOpen,
  RefreshCcw,
  School,
  Shield,
  Users,
  Zap,
} from 'lucide-react';
import { adminService, type AdminOverviewResponse } from '@/services/admin-service';
import { performanceService } from '@/services/performance-service';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminPageShell, AdminSectionCard } from '@/components/admin/AdminPageShell';

type AdminOverviewData = AdminOverviewResponse['data'];
type AdminDashboardStats = AdminOverviewData['stats'];
type UsageSummary = AdminOverviewData['usageSummary'];
type HealthReadiness = AdminOverviewData['readiness'];

function UserMixChart({
  students,
  teachers,
  admins,
}: {
  students: number;
  teachers: number;
  admins: number;
}) {
  const total = Math.max(students + teachers + admins, 1);
  const studentPct = (students / total) * 100;
  const teacherPct = (teachers / total) * 100;
  const donutStyle = {
    background: `conic-gradient(#e92d32 0 ${studentPct}%, #3b82f6 ${studentPct}% ${studentPct + teacherPct}%, #9333ea ${studentPct + teacherPct}% 100%)`,
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[190px_minmax(0,1fr)] lg:items-center">
      <div className="mx-auto flex h-[160px] w-[160px] items-center justify-center rounded-full" style={donutStyle}>
        <div className="h-[106px] w-[106px] rounded-full bg-white" />
      </div>
      <div className="space-y-4">
        {[
          { label: 'Students', value: students, tone: 'bg-[#e92d32]' },
          { label: 'Teachers', value: teachers, tone: 'bg-[#3b82f6]' },
          { label: 'Admins', value: admins, tone: 'bg-[#9333ea]' },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-3 text-[1.05rem] font-medium text-[#617595]">
              <span className={`h-3.5 w-3.5 rounded-full ${item.tone}`} />
              {item.label}
            </span>
            <span className="text-[1.05rem] font-black text-[var(--admin-text-strong)]">
              {item.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [healthReadiness, setHealthReadiness] = useState<HealthReadiness | null>(null);
  const [performanceAnalytics, setPerformanceAnalytics] = useState<{
    conceptMasterySnapshots: Array<{
      id: string;
      classId: string;
      studentId: string;
      conceptKey: string;
      errorCount: number;
      masteryScore: number;
      updatedAt: string;
    }>;
    recommendationHistory: Array<{
      id: string;
      outputType: string;
      targetClassId: string | null;
      targetTeacherId: string | null;
      createdAt: string;
    }>;
    performanceLogTransitions: {
      total: number;
      summary: {
        riskIncrements: number;
        riskRecoveries: number;
        otherTransitions: number;
      };
      rows: Array<{
        id: string;
        classId: string;
        studentId: string;
        previousIsAtRisk: boolean | null;
        currentIsAtRisk: boolean;
        triggerSource: string;
        createdAt: string;
      }>;
    };
  } | null>(null);
  const interval = 60000;

  const fetchData = useCallback(async (options?: { force?: boolean }) => {
    const isInitialLoad = loading && !stats;
    if (isInitialLoad) {
      setLoading(true);
    } else if (options?.force) {
      setRefreshing(true);
    }

    setError(null);

    try {
      const [overview, perfAnalytics] = await Promise.allSettled([
        adminService.getOverview({ force: options?.force }),
        performanceService.getAdminAnalytics(),
      ]);
      if (overview.status === 'fulfilled') {
        setStats(overview.value.data.stats);
        setUsageSummary(overview.value.data.usageSummary);
        setHealthReadiness(overview.value.data.readiness);
      }
      if (perfAnalytics.status === 'fulfilled') {
        setPerformanceAnalytics(perfAnalytics.value.data);
      } else {
        setPerformanceAnalytics(null);
      }
      if (overview.status === 'rejected') {
        throw new Error('overview_failed');
      }
      setLastUpdated(new Date());
    } catch {
      setError('Dashboard services are temporarily unavailable.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loading, stats]);

  useAutoRefresh(fetchData, interval, autoRefresh, true);

  const totalUsers = (stats?.totalStudents ?? 0) + (stats?.totalTeachers ?? 0) + (stats?.totalAdmins ?? 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-none" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-36 rounded-[1.35rem]" />)}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Skeleton className="h-[22rem] rounded-[1.7rem]" />
          <Skeleton className="h-[22rem] rounded-[1.7rem]" />
        </div>
        <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
          <Skeleton className="h-[15rem] rounded-[1.7rem]" />
          <Skeleton className="h-[15rem] rounded-[1.7rem]" />
        </div>
      </div>
    );
  }

  const services = [
    {
      label: 'API Server',
      status: healthReadiness?.ready ? 'Healthy' : 'Check',
      icon: Shield,
    },
    {
      label: 'Database',
      status: healthReadiness?.dependencies?.database?.ok ? 'Healthy' : 'Issue',
      icon: Activity,
    },
    {
      label: 'Redis Cache',
      status: healthReadiness?.dependencies?.redis?.ok ? 'Healthy' : 'Issue',
      icon: Zap,
    },
    {
      label: 'AI Service',
      status: healthReadiness?.dependencies?.aiService?.ok ? 'Healthy' : 'Offline',
      icon: BookOpen,
    },
  ];

  return (
    <AdminPageShell
      title="Admin Dashboard"
      description="Monitor your platform at a glance"
      actions={(
        <div className="admin-controls">
          <label className="inline-flex items-center gap-3 text-base font-semibold text-white">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(event) => setAutoRefresh(event.target.checked)}
              className="h-4 w-4 rounded border-white/30 bg-transparent"
            />
            Auto-refresh
          </label>
          <Button
            className="rounded-[1rem] border-0 bg-[#364152] px-4 font-bold text-white shadow-none hover:bg-[#465164]"
            onClick={() => void fetchData({ force: true })}
            disabled={refreshing}
          >
            <RefreshCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing' : 'Refresh'}
          </Button>
        </div>
      )}
      meta={(
        <>
          <DashboardMeta label="Total users" value={totalUsers.toLocaleString()} />
          <DashboardMeta label="Students" value={(stats?.totalStudents ?? 0).toLocaleString()} />
          <DashboardMeta label="Teachers" value={(stats?.totalTeachers ?? 0).toLocaleString()} />
          <DashboardMeta label="Active classes" value={(stats?.activeClasses ?? 0).toLocaleString()} />
        </>
      )}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <AdminSectionCard
          title="Current Activity"
          description="Observed usage totals returned by the admin overview service."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Active teachers', value: usageSummary?.activeTeachers ?? 0 },
              { label: 'Active students', value: usageSummary?.activeStudents ?? 0 },
              { label: 'Assessment submissions', value: usageSummary?.assessmentSubmissions ?? 0 },
              { label: 'Lesson completions', value: usageSummary?.lessonCompletions ?? 0 },
              { label: 'Intervention opens', value: usageSummary?.interventionOpens ?? 0 },
              { label: 'Intervention closures', value: usageSummary?.interventionClosures ?? 0 },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-4 border-b border-[var(--admin-outline)] px-1 py-3 last:border-b-0">
                <span className="text-sm font-semibold text-[var(--admin-text-muted)]">{item.label}</span>
                <strong className="text-base text-[var(--admin-text-strong)]">{item.value.toLocaleString()}</strong>
              </div>
            ))}
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="User Mix" contentClassName="space-y-5">
          <UserMixChart
            students={stats?.totalStudents ?? 0}
            teachers={stats?.totalTeachers ?? 0}
            admins={stats?.totalAdmins ?? 0}
          />
        </AdminSectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)]">
        <AdminSectionCard title="Quick Routes">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                href: '/dashboard/admin/users',
                label: 'Manage Users',
                copy: `${totalUsers.toLocaleString()} accounts`,
                icon: Users,
              },
              {
                href: '/dashboard/admin/sections',
                label: 'View Sections',
                copy: `${(stats?.totalSections ?? 0).toLocaleString()} sections`,
                icon: School,
              },
              {
                href: '/dashboard/admin/classes',
                label: 'All Classes',
                copy: `${(stats?.activeClasses ?? 0).toLocaleString()} active`,
                icon: BookOpen,
              },
              {
                href: '/dashboard/admin/diagnostics',
                label: 'Diagnostics',
                copy: error ? 'Needs attention' : 'All systems OK',
                icon: Shield,
              },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="admin-quick-link rounded-[1.25rem] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[#f5f8fe] text-[#8aa0c2]">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-base font-black text-[var(--admin-text-strong)]">{item.label}</p>
                      <p className="text-sm text-[#8da0bf]">{item.copy}</p>
                    </div>
                  </div>
                  <span className="admin-quick-link__cta">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="System Health">
          <div className="grid gap-3 sm:grid-cols-2">
            {services.map((item) => (
              <div key={item.label} className="rounded-[1rem] bg-[#f5f8fe] px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-[0.9rem] bg-white text-[#8fa3c2]">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#7083a4]">{item.label}</p>
                    <p className="text-base font-black text-[var(--admin-text-strong)]">{item.status}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[#7f93b4]">
            {lastUpdated ? <span className="admin-chip">Last updated {lastUpdated.toLocaleTimeString()}</span> : null}
            {error ? <span className="admin-chip">{error}</span> : null}
          </div>
        </AdminSectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSectionCard title="Concept Mastery Snapshots">
          {performanceAnalytics?.conceptMasterySnapshots?.length ? (
            <div className="space-y-2 text-sm">
              {performanceAnalytics.conceptMasterySnapshots.slice(0, 8).map((row) => (
                <div key={row.id} className="flex items-center justify-between rounded-[0.9rem] bg-[#f5f8fe] px-3 py-2">
                  <span className="text-[#617595]">{row.conceptKey}</span>
                  <span className="font-bold text-[var(--admin-text-strong)]">
                    {row.masteryScore}% ({row.errorCount} errors)
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#8da0bf]">No concept mastery snapshots available yet.</p>
          )}
        </AdminSectionCard>

        <AdminSectionCard title="Performance Transitions">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[0.9rem] bg-[#f5f8fe] px-3 py-3">
              <p className="text-xs uppercase tracking-[0.08em] text-[#7b8ead]">Risk Increments</p>
              <p className="text-xl font-black text-[var(--admin-text-strong)]">
                {performanceAnalytics?.performanceLogTransitions.summary.riskIncrements ?? 0}
              </p>
            </div>
            <div className="rounded-[0.9rem] bg-[#f5f8fe] px-3 py-3">
              <p className="text-xs uppercase tracking-[0.08em] text-[#7b8ead]">Risk Recoveries</p>
              <p className="text-xl font-black text-[var(--admin-text-strong)]">
                {performanceAnalytics?.performanceLogTransitions.summary.riskRecoveries ?? 0}
              </p>
            </div>
            <div className="rounded-[0.9rem] bg-[#f5f8fe] px-3 py-3">
              <p className="text-xs uppercase tracking-[0.08em] text-[#7b8ead]">AI Outputs</p>
              <p className="text-xl font-black text-[var(--admin-text-strong)]">
                {performanceAnalytics?.recommendationHistory.length ?? 0}
              </p>
            </div>
          </div>
        </AdminSectionCard>
      </div>
    </AdminPageShell>
  );
}

function DashboardMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-compact-meta__item">
      <span className="admin-compact-meta__label">{label}</span>
      <span>{value}</span>
    </div>
  );
}
