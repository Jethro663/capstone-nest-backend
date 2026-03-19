'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity,
  BookOpen,
  GraduationCap,
  RefreshCcw,
  School,
  Shield,
  Users,
  Zap,
} from 'lucide-react';
import { analyticsService } from '@/services/analytics-service';
import { adminService } from '@/services/admin-service';
import { dashboardService, type AdminDashboardStats } from '@/services/dashboard-service';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AdminEmptyState,
  AdminPageShell,
  AdminSectionCard,
  AdminStatCard,
} from '@/components/admin/AdminPageShell';

function formatRefreshInterval(value: number) {
  if (value < 60000) return `${value / 1000}s`;
  return `${value / 60000}m`;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [interval, setInterval] = useState(30000);
  const [error, setError] = useState<string | null>(null);
  const [overviewAction, setOverviewAction] = useState<string | null>(null);
  const [usageSummary, setUsageSummary] = useState<{
    activeTeachers: number;
    activeStudents: number;
    assessmentSubmissions: number;
    lessonCompletions: number;
  } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [statsRes, overviewRes, usageRes] = await Promise.all([
        dashboardService.getAdminStats(),
        analyticsService.getAdminOverview(),
        adminService.getUsageSummary(),
      ]);
      setStats(statsRes.data);
      setOverviewAction(overviewRes.data.action);
      setUsageSummary({
        activeTeachers: usageRes.data.activeTeachers,
        activeStudents: usageRes.data.activeStudents,
        assessmentSubmissions: usageRes.data.assessmentSubmissions,
        lessonCompletions: usageRes.data.lessonCompletions,
      });
 
      setLastUpdated(new Date());
    } catch {
      setError('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useAutoRefresh(fetchData, interval, autoRefresh);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-56 rounded-[1.9rem]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-[1.5rem]" />)}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <Skeleton className="h-72 rounded-[1.7rem]" />
          <Skeleton className="h-72 rounded-[1.7rem]" />
        </div>
      </div>
    );
  }

  const totalUsers = (stats?.totalStudents ?? 0) + (stats?.totalTeachers ?? 0) + (stats?.totalAdmins ?? 0);
  const teacherPct = totalUsers > 0 ? ((stats?.totalTeachers ?? 0) / totalUsers * 100).toFixed(1) : '0';
  const studentPct = totalUsers > 0 ? ((stats?.totalStudents ?? 0) / totalUsers * 100).toFixed(1) : '0';

  return (
    <AdminPageShell
      badge="Admin Dashboard"
      title="Command Center"
      description="The admin side now reads like a single control surface, with clearer focus areas, richer system status panels, and faster routes into the parts of the platform that need oversight."
      actions={(
        <div className="admin-controls">
          <label className="admin-chip">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <select
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
            className="admin-select min-w-[5.75rem] text-sm font-semibold"
          >
            <option value={15000}>15s</option>
            <option value={30000}>30s</option>
            <option value={60000}>1m</option>
            <option value={300000}>5m</option>
          </select>
          <Button className="admin-button-solid rounded-xl px-4 font-black" onClick={fetchData}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      )}
      stats={(
        <>
          <AdminStatCard label="Total Users" value={totalUsers} caption="Active platform accounts" icon={Users} accent="emerald" />
          <AdminStatCard label="Teachers" value={stats?.totalTeachers ?? 0} caption={`${teacherPct}% of total users`} icon={GraduationCap} accent="sky" />
          <AdminStatCard label="Students" value={stats?.totalStudents ?? 0} caption={`${studentPct}% of total users`} icon={School} accent="amber" />
          <AdminStatCard label="Active Classes" value={stats?.activeClasses ?? 0} caption={`${stats?.totalSections ?? 0} total sections available`} icon={BookOpen} accent="rose" />
        </>
      )}
    >
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <AdminSectionCard
          title="Platform Pulse"
          description="A calmer administrative snapshot with usage movement, readiness context, and the current operational focus."
        >
          <div className="space-y-4">
            <div className="admin-surface-card rounded-[1.5rem] p-5">
              <div className="flex flex-wrap gap-2">
                <span className="admin-chip"><Activity className="h-4 w-4" /> {autoRefresh ? `Auto-sync every ${formatRefreshInterval(interval)}` : 'Manual refresh only'}</span>
                <span className="admin-chip"><Shield className="h-4 w-4" /> {error ? 'Needs attention' : 'Monitoring live'}</span>
 
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--admin-text-muted)]">Operational Focus</p>
                <p className="text-2xl font-black tracking-tight text-[var(--admin-text-strong)]">
                  {overviewAction ?? 'No admin overview analytics available yet.'}
                </p>
                <p className="text-sm text-[var(--admin-text-muted)]">
                  Last updated: {lastUpdated ? lastUpdated.toLocaleString() : 'Not yet synced'}
                </p>
                {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="admin-metric">
                <span>Admins</span>
                <strong>{stats?.totalAdmins ?? 0}</strong>
              </div>
              <div className="admin-metric">
                <span>Sections</span>
                <strong>{stats?.totalSections ?? 0}</strong>
              </div>
              <div className="admin-metric">
                <span>Submissions</span>
                <strong>{usageSummary?.assessmentSubmissions ?? 0}</strong>
              </div>
              <div className="admin-metric">
                <span>Completions</span>
                <strong>{usageSummary?.lessonCompletions ?? 0}</strong>
              </div>
            </div>
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title="Quick Routes"
          description="Move into the most important admin surfaces without hunting through plain menus."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { href: '/dashboard/admin/users', label: 'Users', copy: 'Create, suspend, and review accounts faster.' },
              { href: '/dashboard/admin/sections', label: 'Sections', copy: 'Manage section structure and roster flow.' },
              { href: '/dashboard/admin/classes', label: 'Classes', copy: 'Oversee class setup, scheduling, and state.' },
              { href: '/dashboard/admin/diagnostics', label: 'Diagnostics', copy: 'Check backend, Redis, and AI service health.' },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="admin-quick-link">
                <div>
                  <p className="text-sm font-black text-[var(--admin-text-strong)]">{item.label}</p>
                  <p className="mt-1 text-sm text-[var(--admin-text-muted)]">{item.copy}</p>
                </div>
                <span className="admin-quick-link__cta">Open</span>
              </Link>
            ))}
          </div>
        </AdminSectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSectionCard
          title="User Activity Mix"
          description="A clearer breakdown of who is active and how platform activity is moving."
        >
          {usageSummary ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="admin-list-row">
                <div className="admin-list-row__icon"><Users className="h-4 w-4" /></div>
                <div>
                  <p className="text-sm font-black text-[var(--admin-text-strong)]">{usageSummary.activeTeachers} active teachers</p>
                  <p className="text-xs text-[var(--admin-text-muted)]">Current teacher footprint across the platform</p>
                </div>
              </div>
              <div className="admin-list-row">
                <div className="admin-list-row__icon"><School className="h-4 w-4" /></div>
                <div>
                  <p className="text-sm font-black text-[var(--admin-text-strong)]">{usageSummary.activeStudents} active students</p>
                  <p className="text-xs text-[var(--admin-text-muted)]">Learners presently engaging with the system</p>
                </div>
              </div>
              <div className="admin-list-row">
                <div className="admin-list-row__icon"><BookOpen className="h-4 w-4" /></div>
                <div>
                  <p className="text-sm font-black text-[var(--admin-text-strong)]">{usageSummary.assessmentSubmissions} assessment submissions</p>
                  <p className="text-xs text-[var(--admin-text-muted)]">Recent usage signal for submitted work</p>
                </div>
              </div>
              <div className="admin-list-row">
                <div className="admin-list-row__icon"><Zap className="h-4 w-4" /></div>
                <div>
                  <p className="text-sm font-black text-[var(--admin-text-strong)]">{usageSummary.lessonCompletions} lesson completions</p>
                  <p className="text-xs text-[var(--admin-text-muted)]">Recent learning progress moving through the app</p>
                </div>
              </div>
            </div>
          ) : (
            <AdminEmptyState title="Usage data is not available yet" description="Once the analytics summary is available, the activity mix will show here." />
          )}
        </AdminSectionCard>

        <AdminSectionCard
          title="System Health"
          description="A richer presentation of the same monitoring state, without changing the actual admin checks."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="admin-grid-card min-h-[8rem]">
              <div className="admin-grid-card__accent" />
              <div className="relative z-10 space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--admin-text-muted)]">API Status</p>
                <p className="text-xl font-black text-[var(--admin-text-strong)]">{error ? 'Attention Needed' : 'Connected'}</p>
                <p className="text-sm text-[var(--admin-text-muted)]">
                  {lastUpdated ? `Last sync ${lastUpdated.toLocaleTimeString()}` : 'No sync timestamp yet'}
                </p>
              </div>
            </div>
            <div className="admin-grid-card min-h-[8rem]">
              <div className="admin-grid-card__accent" />
              <div className="relative z-10 space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--admin-text-muted)]">Refresh Mode</p>
                <p className="text-xl font-black text-[var(--admin-text-strong)]">{autoRefresh ? 'Automatic' : 'Manual'}</p>
                <p className="text-sm text-[var(--admin-text-muted)]">
                  {autoRefresh ? `Running every ${formatRefreshInterval(interval)}` : 'Use refresh when needed'}
                </p>
              </div>
            </div>
          </div>
        </AdminSectionCard>
      </div>
    </AdminPageShell>
 
  );
}

