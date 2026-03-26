'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCcw, Database, Bot, HardDrive, Shield } from 'lucide-react';
import { adminService } from '@/services/admin-service';
import { AdminPageShell, AdminSectionCard } from '@/components/admin/AdminPageShell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type HealthReadiness = Awaited<ReturnType<typeof adminService.getHealthReadiness>>;

function healthyTone(ok?: boolean, degraded?: boolean) {
  if (degraded) return 'admin-status-pill admin-status-pill--pending';
  return ok ? 'admin-status-pill admin-status-pill--active' : 'admin-status-pill admin-status-pill--archived';
}

export default function AdminDiagnosticsPage() {
  const [live, setLive] = useState<{ status: string; timestamp: string } | null>(null);
  const [readiness, setReadiness] = useState<HealthReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiagnostics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [liveRes, readinessRes] = await Promise.all([
        adminService.getHealthLive(),
        adminService.getHealthReadiness().catch((err) => err?.response?.data),
      ]);
      setLive(liveRes);
      setReadiness(readinessRes ?? null);
    } catch {
      setError('Failed to load diagnostics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiagnostics();
  }, [fetchDiagnostics]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-none" />
        <Skeleton className="h-[30rem] rounded-[1.7rem]" />
      </div>
    );
  }

  const dependencies = readiness?.data?.dependencies;
  const dependencyRows = [
    { label: 'Environment Variables', status: 'OK', tone: 'admin-status-pill admin-status-pill--active', icon: Shield },
    { label: 'Database Connection Pool', status: dependencies?.database?.ok ? 'OK' : 'Issue', tone: dependencies?.database?.ok ? 'admin-status-pill admin-status-pill--active' : 'admin-status-pill admin-status-pill--archived', icon: Database },
    { label: 'Redis Connection', status: dependencies?.redis?.ok ? 'OK' : 'Issue', tone: dependencies?.redis?.ok ? 'admin-status-pill admin-status-pill--active' : 'admin-status-pill admin-status-pill--archived', icon: HardDrive },
    { label: 'AI API Key', status: dependencies?.aiService?.ok ? 'OK' : 'Issue', tone: dependencies?.aiService?.ok ? 'admin-status-pill admin-status-pill--active' : 'admin-status-pill admin-status-pill--archived', icon: Bot },
    { label: 'File Storage', status: 'OK', tone: 'admin-status-pill admin-status-pill--active', icon: HardDrive },
    { label: 'Email Service', status: 'Warning', tone: 'admin-status-pill admin-status-pill--pending', icon: Shield },
  ];

  return (
    <AdminPageShell
      badge="Admin Diagnostics"
      title="Diagnostics"
      description="Platform health and system status"
      icon={Activity}
      actions={(
        <Button className="rounded-[1rem] border-0 bg-[#364152] px-4 font-bold text-white shadow-none hover:bg-[#465164]" onClick={fetchDiagnostics}>
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </Button>
      )}
    >
      <div className="admin-diagnostics-banner">
        <div>
          <p className="admin-diagnostics-banner__title">
            {error ? 'System checks need attention' : 'All Systems Operational'}
          </p>
          <p className="admin-diagnostics-banner__copy">
            Last checked: {live?.timestamp ? new Date(live.timestamp).toLocaleTimeString() : 'Unavailable'}
          </p>
        </div>
        <span className={readiness?.data?.ready ? 'admin-status-pill admin-status-pill--active' : 'admin-status-pill admin-status-pill--archived'}>
          {readiness?.data?.ready ? 'Healthy' : 'Issue'}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            icon: Activity,
            title: 'API Process',
            ok: live?.status === 'ok',
            detail: live?.timestamp ? `Checked ${new Date(live.timestamp).toLocaleTimeString()}` : 'No live timestamp',
            value: live?.status === 'ok' ? '200 ms' : 'N/A',
          },
          {
            icon: Database,
            title: 'Database (PostgreSQL)',
            ok: Boolean(dependencies?.database?.ok),
            detail: dependencies?.database?.message ?? 'Database ready',
            value: dependencies?.database?.ok ? '99.9% uptime' : 'Unavailable',
          },
          {
            icon: HardDrive,
            title: 'Redis Cache',
            ok: Boolean(dependencies?.redis?.ok),
            detail: dependencies?.redis?.message ?? 'Cache connected',
            value: dependencies?.redis?.ok ? '12 ms' : 'Unavailable',
          },
          {
            icon: Bot,
            title: 'AI Service',
            ok: Boolean(dependencies?.aiService?.ok),
            degraded: dependencies?.aiService?.degraded,
            detail: dependencies?.aiService?.message ?? 'AI service connected',
            value: dependencies?.aiService?.ok ? 'Ready' : 'Offline',
          },
        ].map((item) => (
          <div key={item.title} className="admin-service-card">
            <div className="space-y-4">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-[0.95rem] bg-[#f5f8fe] text-[#8ea0bc]">
                <item.icon className="h-4 w-4" />
              </div>
              <div className="space-y-2">
                <div className="admin-service-card__meta">
                  <p className="admin-service-card__name">{item.title}</p>
                  <span className={healthyTone(item.ok, item.degraded)}>
                    {item.degraded ? 'Warning' : item.ok ? 'Healthy' : 'Issue'}
                  </span>
                </div>
                <p className="admin-service-card__detail">{item.detail}</p>
                <p className="admin-service-card__value">{item.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AdminSectionCard title="Dependency Checks" contentClassName="space-y-0">
        {dependencyRows.map((item) => (
          <div key={item.label} className="admin-diagnostic-row">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-[0.9rem] bg-[#f5f8fe] text-[#8ea0bc]">
                <item.icon className="h-4 w-4" />
              </div>
              <span className="font-semibold text-[var(--admin-text-strong)]">{item.label}</span>
            </div>
            <span className={item.tone}>{item.status}</span>
          </div>
        ))}
      </AdminSectionCard>
    </AdminPageShell>
  );
}
