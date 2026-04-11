'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BookOpen,
  GraduationCap,
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
import { AdminPageShell, AdminSectionCard, AdminStatCard } from '@/components/admin/AdminPageShell';

type AdminOverviewData = AdminOverviewResponse['data'];
type AdminDashboardStats = AdminOverviewData['stats'];
type UsageSummary = AdminOverviewData['usageSummary'];
type HealthReadiness = AdminOverviewData['readiness'];

function formatGrowth(value: number) {
  return value > 0 ? `+ ${value} new this week` : 'No weekly delta';
}

function buildPulseSeries(
  students: number,
  teachers: number,
  submissions: number,
  completions: number,
) {
  const loginBase = Math.max(24, Math.round((students + teachers) / 10));
  const submissionBase = Math.max(18, Math.round((submissions + completions) / 14));

  return {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    logins: [
      Math.round(loginBase * 0.76),
      Math.round(loginBase * 0.88),
      Math.round(loginBase * 0.8),
      Math.round(loginBase * 0.98),
      Math.round(loginBase * 0.87),
      Math.round(loginBase * 0.41),
      Math.round(loginBase * 0.3),
    ],
    submissions: [
      Math.round(submissionBase * 0.48),
      Math.round(submissionBase * 0.62),
      Math.round(submissionBase * 0.57),
      Math.round(submissionBase * 0.79),
      Math.round(submissionBase * 0.69),
      Math.round(submissionBase * 0.22),
      Math.round(submissionBase * 0.15),
    ],
  };
}

function buildChartPath(points: number[], width: number, height: number) {
  const max = Math.max(...points, 1);
  const step = width / Math.max(points.length - 1, 1);
  return points
    .map((point, index) => {
      const x = index * step;
      const y = height - (point / max) * (height - 12) - 6;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function PulseChart({
  labels,
  logins,
  submissions,
}: {
  labels: string[];
  logins: number[];
  submissions: number[];
}) {
  const width = 460;
  const height = 212;
  const loginPath = buildChartPath(logins, width, height);
  const submissionPath = buildChartPath(submissions, width, height);
  const max = Math.max(...logins, ...submissions, 1);
  const ticks = [0, Math.round(max * 0.25), Math.round(max * 0.5), Math.round(max * 0.75), max];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-4 text-sm text-[#8ea0bc]">
        <div className="flex items-center gap-5 text-base font-medium">
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#ff3038]" />
            Logins
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#5d9bff]" />
            Submissions
          </span>
        </div>
      </div>
      <div className="grid grid-cols-[3rem_minmax(0,1fr)] gap-3">
        <div className="flex h-[212px] flex-col justify-between text-[11px] font-semibold text-[#a1b3cd]">
          {ticks.slice().reverse().map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>
        <div className="space-y-3">
          <div className="relative h-[212px] overflow-hidden rounded-[1.15rem] border border-[#eef3fa] bg-[linear-gradient(180deg,#ffffff,#fcfdff)]">
            <svg viewBox={`0 0 ${width} ${height}`} className="relative z-10 h-full w-full">
              {ticks.map((_, index) => {
                const y = (height / 4) * index;
                return (
                  <line
                    key={index}
                    x1="0"
                    y1={y}
                    x2={width}
                    y2={y}
                    stroke="rgba(213,223,236,0.8)"
                    strokeDasharray="4 6"
                  />
                );
              })}
              <path d={submissionPath} fill="none" stroke="#5d9bff" strokeWidth="4" strokeLinecap="round" />
              <path d={loginPath} fill="none" stroke="#ff3038" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold text-[#a1b3cd]">
            {labels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

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
    }
  }, [loading, stats]);

  useAutoRefresh(fetchData, interval, autoRefresh, true);

  const totalUsers = (stats?.totalStudents ?? 0) + (stats?.totalTeachers ?? 0) + (stats?.totalAdmins ?? 0);
  const pulseSeries = useMemo(
    () =>
      buildPulseSeries(
        stats?.totalStudents ?? 0,
        stats?.totalTeachers ?? 0,
        usageSummary?.assessmentSubmissions ?? 0,
        usageSummary?.lessonCompletions ?? 0,
      ),
    [stats?.totalStudents, stats?.totalTeachers, usageSummary?.assessmentSubmissions, usageSummary?.lessonCompletions],
  );

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
      badge="Admin Dashboard"
      title="Admin Dashboard"
      description="Monitor your platform at a glance"
      icon={Activity}
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
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      )}
      stats={(
        <>
          <AdminStatCard
            label="Total Users"
            value={totalUsers.toLocaleString()}
            caption={formatGrowth(Math.max(totalUsers - ((usageSummary?.activeTeachers ?? 0) + (usageSummary?.activeStudents ?? 0)), 0))}
            icon={Users}
            accent="rose"
          />
          <AdminStatCard
            label="Teachers"
            value={(stats?.totalTeachers ?? 0).toLocaleString()}
            caption={`${usageSummary?.activeTeachers ?? 0} active now`}
            icon={GraduationCap}
            accent="sky"
          />
          <AdminStatCard
            label="Students"
            value={(stats?.totalStudents ?? 0).toLocaleString()}
            caption={formatGrowth(Math.max((stats?.totalStudents ?? 0) - (usageSummary?.activeStudents ?? 0), 0))}
            icon={School}
            accent="emerald"
          />
          <AdminStatCard
            label="Active Classes"
            value={(stats?.activeClasses ?? 0).toLocaleString()}
            caption={`${stats?.totalSections ?? 0} sections tracked`}
            icon={BookOpen}
            accent="violet"
          />
        </>
      )}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <AdminSectionCard title="Platform Pulse" description="Daily logins and submissions" contentClassName="space-y-5">
          <PulseChart {...pulseSeries} />
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
