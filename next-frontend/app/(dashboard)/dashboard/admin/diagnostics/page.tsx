'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, Bot, Database, RefreshCcw, ServerCog } from 'lucide-react';
import { adminService } from '@/services/admin-service';
import {
  AdminPageShell,
  AdminSectionCard,
  AdminStatCard,
} from '@/components/admin/AdminPageShell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type HealthReadiness = Awaited<ReturnType<typeof adminService.getHealthReadiness>>;

function DependencyCard({
  title,
  ok,
  degraded,
  message,
}: {
  title: string;
  ok: boolean;
  degraded?: boolean;
  message?: string;
}) {
  const tone = ok ? (degraded ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-rose-500';
  const label = ok ? (degraded ? 'Degraded' : 'Healthy') : 'Unavailable';

  return (
    <div className="admin-grid-card min-h-[11rem]">
      <div className="admin-grid-card__accent" />
      <div className="relative z-10 space-y-3">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${tone}`} />
          <p className="text-base font-black text-[var(--admin-text-strong)]">{title}</p>
        </div>
        <p className="text-xl font-black text-[var(--admin-text-strong)]">{label}</p>
        <p className="text-sm text-[var(--admin-text-muted)]">{message || 'No issues reported.'}</p>
      </div>
    </div>
  );
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
        <Skeleton className="h-56 rounded-[1.9rem]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-[1.5rem]" />)}
        </div>
        <Skeleton className="h-[24rem] rounded-[1.7rem]" />
      </div>
    );
  }

  const dependencies = readiness?.data?.dependencies;

  return (
    <AdminPageShell
      badge="Admin Diagnostics"
      title="System Diagnostics"
      description="Live backend readiness checks now sit in a clearer admin health console, with stronger service cards and a calmer readiness summary."
      actions={(
        <Button className="admin-button-solid rounded-xl px-4 font-black" onClick={fetchDiagnostics}>
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </Button>
      )}
      stats={(
        <>
          <AdminStatCard label="API" value={live?.status === 'ok' ? 'Live' : 'Check'} caption={live?.timestamp ? new Date(live.timestamp).toLocaleTimeString() : 'No timestamp'} icon={ServerCog} accent="emerald" />
          <AdminStatCard label="Database" value={dependencies?.database?.ok ? 'Healthy' : 'Down'} caption={dependencies?.database?.message || 'Database readiness'} icon={Database} accent="sky" />
          <AdminStatCard label="Redis" value={dependencies?.redis?.ok ? 'Healthy' : 'Down'} caption={dependencies?.redis?.message || 'Cache readiness'} icon={Activity} accent="amber" />
          <AdminStatCard label="AI Service" value={dependencies?.aiService?.ok ? (dependencies?.aiService?.degraded ? 'Degraded' : 'Healthy') : 'Down'} caption={dependencies?.aiService?.message || 'AI provider readiness'} icon={Bot} accent="rose" />
        </>
      )}
    >
      <AdminSectionCard title="Dependency Checks" description="The same diagnostics data, now grouped into richer service panels that are easier to scan at a glance.">
        {error ? <p className="mb-4 text-sm font-semibold text-rose-600">{error}</p> : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DependencyCard title="API Process" ok={live?.status === 'ok'} message={live?.timestamp ? `Live at ${new Date(live.timestamp).toLocaleString()}` : 'No live timestamp returned.'} />
          <DependencyCard title="Database" ok={Boolean(dependencies?.database?.ok)} message={dependencies?.database?.message} />
          <DependencyCard title="Redis" ok={Boolean(dependencies?.redis?.ok)} message={dependencies?.redis?.message} />
          <DependencyCard title="AI Service" ok={Boolean(dependencies?.aiService?.ok)} degraded={dependencies?.aiService?.degraded} message={dependencies?.aiService?.message} />
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Readiness Summary" description="A single place to check whether the platform is ready for admin operations.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="admin-metric">
            <span>Overall Status</span>
            <strong className={readiness?.data?.ready ? 'text-emerald-600' : 'text-rose-600'}>
              {readiness?.data?.ready ? 'Ready' : 'Not Ready'}
            </strong>
          </div>
          <div className="admin-metric">
            <span>Last Readiness Check</span>
            <strong>{readiness?.data?.timestamp ? new Date(readiness.data.timestamp).toLocaleString() : 'Unavailable'}</strong>
          </div>
        </div>
      </AdminSectionCard>
    </AdminPageShell>
  );
}
