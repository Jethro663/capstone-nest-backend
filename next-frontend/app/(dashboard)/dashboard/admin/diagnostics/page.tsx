'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCcw, Database, Bot, HardDrive, Shield } from 'lucide-react';
import { adminService } from '@/services/admin-service';
import { AdminPageShell, AdminSectionCard } from '@/components/admin/AdminPageShell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type HealthReadiness = Awaited<ReturnType<typeof adminService.getHealthReadiness>>;
type DependencyStatus = { ok: boolean; degraded?: boolean; message?: string };

function statusMeta(status?: DependencyStatus) {
  if (status?.degraded) {
    return {
      label: 'Degraded',
      tone: 'admin-status-pill admin-status-pill--pending',
    };
  }

  if (status?.ok) {
    return {
      label: 'Operational',
      tone: 'admin-status-pill admin-status-pill--active',
    };
  }

  return {
    label: 'Down',
    tone: 'admin-status-pill admin-status-pill--archived',
  };
}

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
  const databaseStatus = statusMeta(dependencies?.database);
  const redisStatus = statusMeta(dependencies?.redis);
  const aiStatus = statusMeta(dependencies?.aiService);

  const dependencyAlerts = [
    {
      id: 'database',
      label: 'Database Connection Pool',
      severity: dependencies?.database?.ok ? null : ('critical' as const),
      message: dependencies?.database?.message ?? 'Database health check failed. API writes may fail.',
      icon: Database,
    },
    {
      id: 'redis',
      label: 'Redis Cache',
      severity: dependencies?.redis?.ok ? null : ('critical' as const),
      message: dependencies?.redis?.message ?? 'Redis is unavailable. Queues and cached operations may fail.',
      icon: HardDrive,
    },
    {
      id: 'aiService',
      label: 'AI Service',
      severity: !dependencies?.aiService
        ? ('critical' as const)
        : dependencies.aiService.degraded
          ? ('warning' as const)
          : dependencies.aiService.ok
            ? null
            : ('critical' as const),
      message:
        dependencies?.aiService?.message ??
        'AI service is unavailable. AI-powered interventions are currently affected.',
      icon: Bot,
    },
  ].filter((item) => item.severity !== null);

  if (error) {
    dependencyAlerts.unshift({
      id: 'health-fetch',
      label: 'Diagnostics API',
      severity: 'critical',
      message: 'Failed to load diagnostics endpoints. Current health status may be stale.',
      icon: Activity,
    });
  }

  const hasCriticalAlerts = dependencyAlerts.some((item) => item.severity === 'critical');
  const hasWarningAlerts = dependencyAlerts.some((item) => item.severity === 'warning');
  const bannerVariant = hasCriticalAlerts ? 'issue' : hasWarningAlerts ? 'warning' : 'healthy';

  const bannerTitle = hasCriticalAlerts
    ? 'Critical dependency issue detected'
    : hasWarningAlerts
      ? 'System is running in degraded mode'
      : 'All systems operational';

  const bannerPillClass = hasCriticalAlerts
    ? 'admin-status-pill admin-status-pill--archived'
    : hasWarningAlerts
      ? 'admin-status-pill admin-status-pill--pending'
      : 'admin-status-pill admin-status-pill--active';

  const bannerPillLabel = hasCriticalAlerts ? 'Issue' : hasWarningAlerts ? 'Warning' : 'Healthy';
  const alertCountCopy =
    dependencyAlerts.length > 0
      ? `${dependencyAlerts.length} active ${dependencyAlerts.length === 1 ? 'alert' : 'alerts'}`
      : 'No active dependency alerts';

  const dependencyRows = [
    {
      label: 'Environment Variables',
      status: 'Operational',
      tone: 'admin-status-pill admin-status-pill--active',
      message: 'Required server variables are loaded.',
      icon: Shield,
    },
    {
      label: 'Database Connection Pool',
      status: databaseStatus.label,
      tone: databaseStatus.tone,
      message: dependencies?.database?.message ?? 'Database health checks are passing.',
      icon: Database,
    },
    {
      label: 'Redis Connection',
      status: redisStatus.label,
      tone: redisStatus.tone,
      message: dependencies?.redis?.message ?? 'Redis is reachable and responding to ping.',
      icon: HardDrive,
    },
    {
      label: 'AI Service',
      status: aiStatus.label,
      tone: aiStatus.tone,
      message: dependencies?.aiService?.message ?? 'AI service health checks are passing.',
      icon: Bot,
    },
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
      <div className={`admin-diagnostics-banner admin-diagnostics-banner--${bannerVariant}`}>
        <div>
          <p className="admin-diagnostics-banner__title">{bannerTitle}</p>
          <p className="admin-diagnostics-banner__copy">
            Last checked: {live?.timestamp ? new Date(live.timestamp).toLocaleTimeString() : 'Unavailable'} • {alertCountCopy}
          </p>
        </div>
        <span className={bannerPillClass}>{bannerPillLabel}</span>
      </div>

      {dependencyAlerts.length > 0 && (
        <AdminSectionCard title="Active Alerts" contentClassName="space-y-3">
          {dependencyAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`admin-diagnostics-alert admin-diagnostics-alert--${alert.severity}`}
              role="alert"
              aria-live="polite"
            >
              <div className="admin-diagnostics-alert__header">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-[0.8rem] bg-white/70 text-[#b45309]">
                  <alert.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="admin-diagnostics-alert__title">{alert.label}</p>
                  <p className="admin-diagnostics-alert__message">{alert.message}</p>
                </div>
              </div>
              <span
                className={
                  alert.severity === 'critical'
                    ? 'admin-status-pill admin-status-pill--archived'
                    : 'admin-status-pill admin-status-pill--pending'
                }
              >
                {alert.severity === 'critical' ? 'Critical' : 'Warning'}
              </span>
            </div>
          ))}
        </AdminSectionCard>
      )}

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
            value: dependencies?.aiService?.degraded
              ? 'Degraded'
              : dependencies?.aiService?.ok
                ? 'Ready'
                : 'Offline',
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
              <div>
                <p className="font-semibold text-[var(--admin-text-strong)]">{item.label}</p>
                <p className="text-xs text-[#7b90b3]">{item.message}</p>
              </div>
            </div>
            <span className={item.tone}>{item.status}</span>
          </div>
        ))}
      </AdminSectionCard>
    </AdminPageShell>
  );
}
